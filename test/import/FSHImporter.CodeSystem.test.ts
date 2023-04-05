import { importSingleText } from '../testhelpers/importSingleText';
import { assertConceptRule, assertInsertRule, assertCaretValueRule } from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { Rule, CaretValueRule, InsertRule, ConceptRule } from '../../src/fshtypes/rules';
import { leftAlign } from '../utils/leftAlign';
import { importText, RawFSH } from '../../src/import';

describe('FSHImporter', () => {
  describe('CodeSystem', () => {
    beforeEach(() => {
      loggerSpy.reset();
    });

    describe('#csMetadata', () => {
      it('should parse the simplest possible code system', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.id).toBe('ZOO');
        expect(codeSystem.rules).toEqual([]);
        expect(codeSystem.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 1,
          endLine: 2,
          endColumn: 15
        });
        expect(codeSystem.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should parse a code system with additional metadata', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        Id: zoo-codes
        Title: "Zoo Animals"
        Description: "Animals and cryptids that may be at a zoo."
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.id).toBe('zoo-codes');
        expect(codeSystem.title).toBe('Zoo Animals');
        expect(codeSystem.description).toBe('Animals and cryptids that may be at a zoo.');
        expect(codeSystem.rules).toEqual([]);
        expect(codeSystem.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 1,
          endLine: 5,
          endColumn: 57
        });
      });

      it('should parse numeric code system name and id', () => {
        // NOT recommended, but possible
        const input = leftAlign(`
        CodeSystem: 123
        Id: 456
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('123');
        expect(codeSystem.name).toBe('123');
        expect(codeSystem.id).toBe('456');
      });

      it('should parse a code system with a multi-line description', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        Id: zoo-codes
        Title: "Zoo Animals"
        Description: """
        Animals that may be present at the zoo. This includes
        animals that have been classified by biologists, as
        well as certain cryptids, such as:
        * quadrapedal cryptids
          * jackalope
          * hodag
        * bipedal cryptids
          * swamp ape
          * hopkinsville goblin
        """
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        const expectedDescription = [
          'Animals that may be present at the zoo. This includes',
          'animals that have been classified by biologists, as',
          'well as certain cryptids, such as:',
          '* quadrapedal cryptids',
          '  * jackalope',
          '  * hodag',
          '* bipedal cryptids',
          '  * swamp ape',
          '  * hopkinsville goblin'
        ].join('\n');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.id).toBe('zoo-codes');
        expect(codeSystem.title).toBe('Zoo Animals');
        expect(codeSystem.description).toBe(expectedDescription);
        expect(codeSystem.rules).toEqual([]);
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        Id: zoo-codes
        Title: "Zoo Animals"
        Description: "Animals and cryptids that may be at a zoo."
        Title: "Duplicate Animals"
        Id: zoo-codes-again
        Description: "Lions and tigers and bears!"
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.id).toBe('zoo-codes');
        expect(codeSystem.title).toBe('Zoo Animals');
        expect(codeSystem.description).toBe('Animals and cryptids that may be at a zoo.');
        expect(codeSystem.rules).toEqual([]);
        expect(codeSystem.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 1,
          endLine: 8,
          endColumn: 42
        });
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        Id: zoo-codes
        Title: "Zoo Animals"
        Description: "Animals and cryptids that may be at a zoo."
        Title: "Duplicate Animals"
        Id: zoo-codes-again
        Description: "Lions and tigers and bears!"
        `);
        importSingleText(input, 'Zoo.fsh');
        expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(/File: Zoo\.fsh.*Line: 6\D*/s);
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Zoo\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 8\D*/s);
      });

      it('should log an error and skip the code system when encountering a code system with a name used by another code system', () => {
        const input = leftAlign(`
        CodeSystem: BREAD
        Title: "Known Bread"

        CodeSystem: BREAD
        Title: "Unknown Bread"
        `);
        const result = importSingleText(input, 'Bread.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('BREAD');
        expect(codeSystem.title).toBe('Known Bread');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /code system named BREAD already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bread\.fsh.*Line: 5 - 6\D*/s);
      });

      it('should log an error and skip the code system when encountering an code system with a name used by another code system in another file', () => {
        const input1 = `
          CodeSystem: SomeCodeSystem
          Title: "This CodeSystem"
        `;

        const input2 = `
          CodeSystem: SomeCodeSystem
          Title: "That CodeSystem"
        `;

        const result = importText([
          new RawFSH(input1, 'File1.fsh'),
          new RawFSH(input2, 'File2.fsh')
        ]);
        expect(result.reduce((sum, d2) => sum + d2.codeSystems.size, 0)).toBe(1);
        const codesystem = result[0].codeSystems.get('SomeCodeSystem');
        expect(codesystem.title).toBe('This CodeSystem');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /code system named SomeCodeSystem already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: File2\.fsh.*Line: 2 - 3\D*/s);
      });
    });

    describe('#concept', () => {
      it('should parse a code system with one concept', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #lion
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        assertConceptRule(codeSystem.rules[0], 'lion', undefined, undefined, []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 7
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system with one concept with a display string', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #tiger "Tiger"
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        assertConceptRule(codeSystem.rules[0], 'tiger', 'Tiger', undefined, []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 16
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system with one concept with display and definition strings', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #bear "Bear" "A member of family Ursidae."
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        assertConceptRule(codeSystem.rules[0], 'bear', 'Bear', 'A member of family Ursidae.', []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 44
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a concept with a multi-line definition string', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #gorilla "Gorilla" """
        Let there be no mistake
        about the greatest ape of all.
        """
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        const expectedDefinition = [
          'Let there be no mistake',
          'about the greatest ape of all.'
        ].join('\n');
        assertConceptRule(codeSystem.rules[0], 'gorilla', 'Gorilla', expectedDefinition, []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 83
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system with more than one concept', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #lion
        * #tiger "Tiger"
        * #bear "Bear" "A member of family Ursidae."
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(3);
        assertConceptRule(codeSystem.rules[0], 'lion', undefined, undefined, []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 7
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertConceptRule(codeSystem.rules[1], 'tiger', 'Tiger', undefined, []);
        expect(codeSystem.rules[1].sourceInfo.location).toEqual({
          startLine: 4,
          startColumn: 1,
          endLine: 4,
          endColumn: 16
        });
        expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
        assertConceptRule(codeSystem.rules[2], 'bear', 'Bear', 'A member of family Ursidae.', []);
        expect(codeSystem.rules[2].sourceInfo.location).toEqual({
          startLine: 5,
          startColumn: 1,
          endLine: 5,
          endColumn: 44
        });
        expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system with hierarchical codes', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #bear "Bear" "A member of family Ursidae."
        * #bear #sunbear "Sun bear" "Helarctos malayanus"
        * #bear #sunbear #ursula "Ursula the sun bear"
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(3);
        assertConceptRule(codeSystem.rules[0], 'bear', 'Bear', 'A member of family Ursidae.', []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 44
        });
        assertConceptRule(codeSystem.rules[1], 'sunbear', 'Sun bear', 'Helarctos malayanus', [
          'bear'
        ]);
        expect(codeSystem.rules[1].sourceInfo.location).toEqual({
          startLine: 4,
          startColumn: 1,
          endLine: 4,
          endColumn: 49
        });
        assertConceptRule(codeSystem.rules[2], 'ursula', 'Ursula the sun bear', undefined, [
          'bear',
          'sunbear'
        ]);
        expect(codeSystem.rules[2].sourceInfo.location).toEqual({
          startLine: 5,
          startColumn: 1,
          endLine: 5,
          endColumn: 46
        });
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should log an error when a concept includes a system declaration', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #goat
        * ZOO#bat
        * CRYPTID#jackalope
        * ZOO#goat #mountaingoat
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(4);
        expect((codeSystem.rules[0] as ConceptRule).code).toBe('goat');
        expect((codeSystem.rules[1] as ConceptRule).code).toBe('bat');
        expect((codeSystem.rules[2] as ConceptRule).code).toBe('jackalope');
        expect((codeSystem.rules[3] as ConceptRule).code).toBe('mountaingoat');
        expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(/File: Zoo\.fsh.*Line: 4\D*/s);
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Zoo\.fsh.*Line: 5\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 6\D*/s);
      });
    });

    describe('#CaretValueRule', () => {
      it('should parse a code system that uses a CaretValueRule with no codes', () => {
        const input = leftAlign(`
          CodeSystem: ZOO
          * ^publisher = "Matt"
          `);
        const result = importSingleText(input);
        const codeSystem = result.codeSystems.get('ZOO');
        assertCaretValueRule(codeSystem.rules[0] as Rule, '', 'publisher', 'Matt', false, []);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system that uses CaretValueRules with no codes alongside rules', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #lion
        * ^publisher = "Damon"
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        assertConceptRule(codeSystem.rules[0], 'lion', undefined, undefined, []);
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertCaretValueRule(
          codeSystem.rules[1] as CaretValueRule,
          '',
          'publisher',
          'Damon',
          false,
          []
        );
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system that uses a CaretValueRule on a top-level concept', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #anteater "Anteater"
        * #anteater ^property[0].valueString = "Their threat pose is really cute."
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertCaretValueRule(
          codeSystem.rules[1],
          '',
          'property[0].valueString',
          'Their threat pose is really cute.',
          false,
          ['anteater']
        );
        expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system that uses a CaretValueRule on a nested concept', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #anteater "Anteater"
        * #anteater #northern "Northern tamandua"
        * #anteater #northern ^property[0].valueString = "They are strong climbers."
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertConceptRule(codeSystem.rules[1], 'northern', 'Northern tamandua', undefined, [
          'anteater'
        ]);
        expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
        assertCaretValueRule(
          codeSystem.rules[2],
          '',
          'property[0].valueString',
          'They are strong climbers.',
          false,
          ['anteater', 'northern']
        );
        expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should keep the raw value of a code caret value rule when the value is a number or boolean', () => {
        const input = leftAlign(`
        CodeSystem: ZOO
        * #anteater "Anteater"
        * #anteater ^extension[0].valueInteger = 0.4500
        * #anteater ^extension[1].valueBoolean = true
        `);
        const result = importSingleText(input, 'Zoo.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertCaretValueRule(
          codeSystem.rules[1],
          '',
          'extension[0].valueInteger',
          0.45,
          false,
          ['anteater'],
          '0.4500'
        );
        expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
        assertCaretValueRule(
          codeSystem.rules[2],
          '',
          'extension[1].valueBoolean',
          true,
          false,
          ['anteater'],
          'true'
        );
        expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });

    describe('#insertRule', () => {
      it('should parse an insert rule with a single RuleSet', () => {
        const input = leftAlign(`
        CodeSystem: MyCS
        * insert MyRuleSet
        `);
        const result = importSingleText(input, 'Insert.fsh');
        const cs = result.codeSystems.get('MyCS');
        expect(cs.rules).toHaveLength(1);
        assertInsertRule(cs.rules[0] as InsertRule, '', 'MyRuleSet');
      });

      it('should parse an insert rule with a single RuleSet and a code path', () => {
        const input = leftAlign(`
        CodeSystem: MyCS
        * #cookie "Cookie"
        * #cookie insert MyRuleSet
        `);
        const result = importSingleText(input, 'Insert.fsh');
        const cs = result.codeSystems.get('MyCS');
        expect(cs.rules).toHaveLength(2);
        assertInsertRule(cs.rules[1] as InsertRule, '', 'MyRuleSet', [], ['cookie']);
      });
    });
  });
});
