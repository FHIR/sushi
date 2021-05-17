import { importSingleText } from '../testhelpers/importSingleText';
import {
  assertCaretValueRule,
  assertConceptRule,
  assertInsertRule,
  assertCodeCaretRule
} from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { Rule, CaretValueRule, InsertRule, ConceptRule } from '../../src/fshtypes/rules';

describe('FSHImporter', () => {
  describe('CodeSystem', () => {
    beforeEach(() => {
      loggerSpy.reset();
    });

    describe('#csMetadata', () => {
      it('should parse the simplest possible code system', () => {
        const input = `
        CodeSystem: ZOO
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.id).toBe('ZOO');
        expect(codeSystem.rules).toEqual([]);
        expect(codeSystem.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 2,
          endColumn: 23
        });
        expect(codeSystem.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should parse a code system with additional metadata', () => {
        const input = `
        CodeSystem: ZOO
        Id: zoo-codes
        Title: "Zoo Animals"
        Description: "Animals and cryptids that may be at a zoo."
        `;
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
          startColumn: 9,
          endLine: 5,
          endColumn: 65
        });
      });

      it('should parse numeric code system name and id', () => {
        // NOT recommended, but possible
        const input = `
        CodeSystem: 123
        Id: 456
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('123');
        expect(codeSystem.name).toBe('123');
        expect(codeSystem.id).toBe('456');
      });

      it('should parse a code system with a multi-line description', () => {
        const input = `
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
        `;
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
        const input = `
        CodeSystem: ZOO
        Id: zoo-codes
        Title: "Zoo Animals"
        Description: "Animals and cryptids that may be at a zoo."
        Title: "Duplicate Animals"
        Id: zoo-codes-again
        Description: "Lions and tigers and bears!"
        `;
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
          startColumn: 9,
          endLine: 8,
          endColumn: 50
        });
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = `
        CodeSystem: ZOO
        Id: zoo-codes
        Title: "Zoo Animals"
        Description: "Animals and cryptids that may be at a zoo."
        Title: "Duplicate Animals"
        Id: zoo-codes-again
        Description: "Lions and tigers and bears!"
        `;
        importSingleText(input, 'Zoo.fsh');
        expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(/File: Zoo\.fsh.*Line: 6\D*/s);
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Zoo\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 8\D*/s);
      });

      it('should log an error and skip the code system when encountering a code system with a name used by another code system', () => {
        const input = `
        CodeSystem: BREAD
        Title: "Known Bread"

        CodeSystem: BREAD
        Title: "Unknown Bread"
        `;
        const result = importSingleText(input, 'Bread.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('BREAD');
        expect(codeSystem.title).toBe('Known Bread');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /code system named BREAD already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bread\.fsh.*Line: 5 - 6\D*/s);
      });
    });

    describe('#concept', () => {
      it('should parse a code system with one concept', () => {
        const input = `
        CodeSystem: ZOO
        * #lion
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        assertConceptRule(codeSystem.rules[0], 'lion', undefined, undefined, []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 15
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system with one concept with a display string', () => {
        const input = `
        CodeSystem: ZOO
        * #tiger "Tiger"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        assertConceptRule(codeSystem.rules[0], 'tiger', 'Tiger', undefined, []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 24
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system with one concept with display and definition strings', () => {
        const input = `
        CodeSystem: ZOO
        * #bear "Bear" "A member of family Ursidae."
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        assertConceptRule(codeSystem.rules[0], 'bear', 'Bear', 'A member of family Ursidae.', []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 52
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a concept with a multi-line definition string', () => {
        const input = `
        CodeSystem: ZOO
        * #gorilla "Gorilla" """
        Let there be no mistake
        about the greatest ape of all.
        """
        `;
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
          startColumn: 9,
          endLine: 3,
          endColumn: 115
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system with more than one concept', () => {
        const input = `
        CodeSystem: ZOO
        * #lion
        * #tiger "Tiger"
        * #bear "Bear" "A member of family Ursidae."
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(3);
        assertConceptRule(codeSystem.rules[0], 'lion', undefined, undefined, []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 15
        });
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertConceptRule(codeSystem.rules[1], 'tiger', 'Tiger', undefined, []);
        expect(codeSystem.rules[1].sourceInfo.location).toEqual({
          startLine: 4,
          startColumn: 9,
          endLine: 4,
          endColumn: 24
        });
        expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
        assertConceptRule(codeSystem.rules[2], 'bear', 'Bear', 'A member of family Ursidae.', []);
        expect(codeSystem.rules[2].sourceInfo.location).toEqual({
          startLine: 5,
          startColumn: 9,
          endLine: 5,
          endColumn: 52
        });
        expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system with hierarchical codes', () => {
        const input = `
        CodeSystem: ZOO
        * #bear "Bear" "A member of family Ursidae."
        * #bear #sunbear "Sun bear" "Helarctos malayanus"
        * #bear #sunbear #ursula "Ursula the sun bear"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(3);
        assertConceptRule(codeSystem.rules[0], 'bear', 'Bear', 'A member of family Ursidae.', []);
        expect(codeSystem.rules[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 52
        });
        assertConceptRule(codeSystem.rules[1], 'sunbear', 'Sun bear', 'Helarctos malayanus', [
          'bear'
        ]);
        expect(codeSystem.rules[1].sourceInfo.location).toEqual({
          startLine: 4,
          startColumn: 9,
          endLine: 4,
          endColumn: 57
        });
        assertConceptRule(codeSystem.rules[2], 'ursula', 'Ursula the sun bear', undefined, [
          'bear',
          'sunbear'
        ]);
        expect(codeSystem.rules[2].sourceInfo.location).toEqual({
          startLine: 5,
          startColumn: 9,
          endLine: 5,
          endColumn: 54
        });
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should log an error when encountering a duplicate code', () => {
        const input = `
        CodeSystem: ZOO
        * #goat "A goat"
        * #goat "Another goat?"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 4\D*/s);
      });

      it('should not log an error when encountering a duplicate code if the new code has no display or definition', () => {
        const input = `
        CodeSystem: ZOO
        * #goat "A goat"
        * #goat
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should log an error when encountering a code with an incorrectly defined hierarchy', () => {
        const input = `
        CodeSystem: ZOO
        * #bear "Bear" "A member of family Ursidae."
        * #bear #sunbear #ursula "Ursula the sun bear"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.rules.length).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 4\D*/s);
      });

      it('should log an error when a concept includes a system declaration', () => {
        const input = `
        CodeSystem: ZOO
        * #goat
        * ZOO#bat
        * CRYPTID#jackalope
        * ZOO#goat #mountaingoat
        `;
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
      it('should parse a code system that uses a CaretValueRule', () => {
        const input = `
          CodeSystem: ZOO
          * ^publisher = "Matt"
          `;
        const result = importSingleText(input);
        const codeSystem = result.codeSystems.get('ZOO');
        assertCaretValueRule(codeSystem.rules[0] as Rule, '', 'publisher', 'Matt', false);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system that uses CaretValueRules alongside rules', () => {
        const input = `
        CodeSystem: ZOO
        * #lion
        * ^publisher = "Damon"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        assertConceptRule(codeSystem.rules[0], 'lion', undefined, undefined, []);
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertCaretValueRule(
          codeSystem.rules[1] as CaretValueRule,
          '',
          'publisher',
          'Damon',
          false
        );
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should log an error when a CaretValueRule contains a path before ^', () => {
        const input = `
        CodeSystem: ZOO
        * somepath ^publisher = "Marky Mark"
        `;
        const result = importSingleText(input, 'Simple.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.rules).toHaveLength(0);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Simple\.fsh.*Line: 3\D*/s);
      });
    });

    describe('#codeCaretValueRule', () => {
      it('should parse a code system that uses a CodeCaretValueRule on a top-level concept', () => {
        const input = `
        CodeSystem: ZOO
        * #anteater "Anteater"
        * #anteater ^property[0].valueString = "Their threat pose is really cute."
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertCodeCaretRule(
          codeSystem.rules[1],
          ['anteater'],
          'property[0].valueString',
          'Their threat pose is really cute.'
        );
        expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      it('should parse a code system that uses a CodeCaretValueRule on a nested concept', () => {
        const input = `
        CodeSystem: ZOO
        * #anteater "Anteater"
        * #anteater #northern "Northern tamandua"
        * #anteater #northern ^property[0].valueString = "They are strong climbers."
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
        expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
        assertConceptRule(codeSystem.rules[1], 'northern', 'Northern tamandua', undefined, [
          'anteater'
        ]);
        expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
        assertCodeCaretRule(
          codeSystem.rules[2],
          ['anteater', 'northern'],
          'property[0].valueString',
          'They are strong climbers.'
        );
        expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });

    describe('#insertRule', () => {
      it('should parse an insert rule with a single RuleSet', () => {
        const input = `
        CodeSystem: MyCS
        * insert MyRuleSet
        `;
        const result = importSingleText(input, 'Insert.fsh');
        const cs = result.codeSystems.get('MyCS');
        expect(cs.rules).toHaveLength(1);
        assertInsertRule(cs.rules[0] as InsertRule, 'MyRuleSet');
      });
    });
  });
});
