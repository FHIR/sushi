import { importSingleText } from '../testhelpers/importSingleText';
import { FshCode } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { importText, RawFSH } from '../../src/import';
import { assertAssignmentRule, assertInsertRule, assertPathRule } from '../testhelpers/asserts';

describe('FSHImporter', () => {
  describe('Invariant', () => {
    describe('#invariantMetadata', () => {
      it('should parse the simplest possible invariant', () => {
        const input = `
        Invariant: emp-1
        Severity: #error
        Description: "This does not actually require anything."
        `;
        const result = importSingleText(input, 'Empty.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('emp-1');
        expect(invariant.name).toBe('emp-1');
        const severityCode = new FshCode('error')
          .withLocation([3, 19, 3, 24])
          .withFile('Empty.fsh');
        expect(invariant.severity).toEqual(severityCode);
        expect(invariant.description).toBe('This does not actually require anything.');
        expect(invariant.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 4,
          endColumn: 63
        });
        expect(invariant.sourceInfo.file).toBe('Empty.fsh');
      });

      it('should parse numeric invariant name', () => {
        // NOT recommended, but possible
        const input = `
        Invariant: 123
        Severity: #error
        Description: "This does not actually require anything."
        `;
        const result = importSingleText(input, 'Empty.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('123');
        expect(invariant.name).toBe('123');
      });

      it('should parse an invariant with additional metadata', () => {
        const input = `
        Invariant: full-1
        Description: "This resource must define a cage and aquarium."
        Expression: "cage.exists() and aquarium.exists()"
        XPath: "exists(f:cage) and exists(f:aquarium)"
        Severity: #error
        `;
        const result = importSingleText(input, 'Full.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('full-1');
        expect(invariant.name).toBe('full-1');
        expect(invariant.description).toBe('This resource must define a cage and aquarium.');
        expect(invariant.expression).toBe('cage.exists() and aquarium.exists()');
        expect(invariant.xpath).toBe('exists(f:cage) and exists(f:aquarium)');
        const severityCode = new FshCode('error').withLocation([6, 19, 6, 24]).withFile('Full.fsh');
        expect(invariant.severity).toEqual(severityCode);
        expect(invariant.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 6,
          endColumn: 24
        });
        expect(invariant.sourceInfo.file).toBe('Full.fsh');
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        Invariant: twice-1
        Description: "This resource is described."
        Expression: "description.exists()"
        XPath: "exists(f:description)"
        Severity: #error
        Description: "This resource is not described."
        Expression: "not(description.exists())"
        XPath: "not(exists(f:description))"
        Severity: #warning
        `;
        const result = importSingleText(input, 'Twice.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('twice-1');
        expect(invariant.name).toBe('twice-1');
        expect(invariant.description).toBe('This resource is described.');
        expect(invariant.expression).toBe('description.exists()');
        expect(invariant.xpath).toBe('exists(f:description)');
        const severityCode = new FshCode('error')
          .withLocation([6, 19, 6, 24])
          .withFile('Twice.fsh');
        expect(invariant.severity).toEqual(severityCode);
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = `
        Invariant: twice-1
        Description: "This resource is described."
        Expression: "description.exists()"
        XPath: "exists(f:description)"
        Severity: #error
        Description: "This resource is not described."
        Expression: "not(description.exists())"
        XPath: "not(exists(f:description))"
        Severity: #warning
        `;
        importSingleText(input, 'Twice.fsh');
        expect(loggerSpy.getMessageAtIndex(-4, 'error')).toMatch(/File: Twice\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(/File: Twice\.fsh.*Line: 8\D*/s);
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Twice\.fsh.*Line: 9\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Twice\.fsh.*Line: 10\D*/s);
      });

      it('should log an error when there is no severity metadata', () => {
        const input = `
        Invariant: what-1
        Description: "I don't know how important this is."
        `;
        importSingleText(input, 'What.fsh');
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: What\.fsh.*Line: 2\D+3\D*/s);
      });

      it('should log an error when there is no description metadata', () => {
        const input = `
        Invariant: bad-1
        Severity: #warning
        `;
        importSingleText(input, 'Bad.fsh');
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bad\.fsh.*Line: 2\D+3\D*/s);
      });

      it('should log a warning when the severity code includes a system', () => {
        const input = `
        Invariant: un-1
        Severity: https://unnecessary.org#error
        Description: "You don't need that system."
        `;
        const result = importSingleText(input, 'Unnecessary.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('un-1');
        const severityCode = new FshCode('error', 'https://unnecessary.org')
          .withLocation([3, 19, 3, 47])
          .withFile('Unnecessary.fsh');
        expect(invariant.severity).toEqual(severityCode);
        expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Unnecessary\.fsh.*Line: 3\D*/s);
      });

      it('should log an error when the severity code is invalid', () => {
        const input = `
        Invariant: nope-3
        Severity: #nope
        Description: "Nope is not a real severity."
        `;
        const result = importSingleText(input, 'Nope.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('nope-3');
        const severityCode = new FshCode('nope').withLocation([3, 19, 3, 23]).withFile('Nope.fsh');
        expect(invariant.severity).toEqual(severityCode);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Nope\.fsh.*Line: 3\D*/s);
      });

      it('should log an error and skip the invariant when encountering a invariant with a name used by another invariant', () => {
        const input = `
        Invariant: same-1
        Severity: #error
        Description: "First description."

        Invariant: same-1
        Severity: #error
        Description: "Second description."
        `;
        const result = importSingleText(input, 'SameName.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('same-1');
        expect(invariant.description).toBe('First description.');
        expect(loggerSpy.getLastMessage('error')).toMatch(/Invariant named same-1 already exists/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: SameName\.fsh.*Line: 6 - 8\D*/s);
      });

      it('should log an error and skip the invariant when encountering an invariant with a name used by another invariant in another file', () => {
        const input1 = `
          Invariant: same-1
          Severity: #error
          Description: "First description."
        `;

        const input2 = `
          Invariant: same-1
          Severity: #error
          Description: "Second description."
        `;

        const result = importText([
          new RawFSH(input1, 'File1.fsh'),
          new RawFSH(input2, 'File2.fsh')
        ]);
        expect(result.reduce((sum, d2) => sum + d2.invariants.size, 0)).toBe(1);
        const invariant = result[0].invariants.get('same-1');
        expect(invariant.description).toBe('First description.');
        expect(loggerSpy.getLastMessage('error')).toMatch(/Invariant named same-1 already exists/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: File2\.fsh.*Line: 2 - 4\D*/s);
      });
    });

    describe('#assignmentRule', () => {
      it('should parse an invariant with assigned value rules', () => {
        const input = `
        Invariant: rules-1
        Severity: #error
        Description: "This has some rules."
        * requirements = "This invariant exists because I willed it so."
        * expression = "name.exists()"
        `;

        const result = importSingleText(input, 'InvariantRules.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('rules-1');
        expect(invariant.name).toBe('rules-1');
        const severityCode = new FshCode('error')
          .withLocation([3, 19, 3, 24])
          .withFile('InvariantRules.fsh');
        expect(invariant.severity).toEqual(severityCode);
        expect(invariant.description).toBe('This has some rules.');
        expect(invariant.rules.length).toBe(2);
        assertAssignmentRule(
          invariant.rules[0],
          'requirements',
          'This invariant exists because I willed it so.'
        );
        assertAssignmentRule(invariant.rules[1], 'expression', 'name.exists()');
      });

      it('should parse an instance with assigned values that are an alias', () => {
        const input = `
        Alias: SOURCE = http://example.org/something

        Invariant: rules-2
        Severity: #error
        Description: "This has a rule."
        * source = SOURCE
        `;

        const result = importSingleText(input, 'InvariantRules.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('rules-2');
        expect(invariant.rules).toHaveLength(1);
        assertAssignmentRule(invariant.rules[0], 'source', 'http://example.org/something');
      });
    });

    describe('#pathRule', () => {
      it('should parse a pathRule', () => {
        const input = `
        Invariant: rules-3
        Severity: #error
        Description: "This has a rule."
        * requirements
        `;
        const result = importSingleText(input, 'InvariantRules.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('rules-3');
        expect(invariant.rules).toHaveLength(1);
        assertPathRule(invariant.rules[0], 'requirements');
      });
    });

    describe('#insertRule', () => {
      it('should parse an insert rule', () => {
        const input = `
        Invariant: rules-4
        Severity: #error
        Description: "This has a rule."
        * insert MyRuleSet
        `;
        const result = importSingleText(input, 'InvariantRules.fsh');
        expect(result.invariants.size).toBe(1);
        const invariant = result.invariants.get('rules-4');
        expect(invariant.rules).toHaveLength(1);
        assertInsertRule(invariant.rules[0], '', 'MyRuleSet');
      });
    });
  });
});
