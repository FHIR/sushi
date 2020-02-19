import { importSingleText } from '../testhelpers/importSingleText';
import { FshCode } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';

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
    });
  });
});
