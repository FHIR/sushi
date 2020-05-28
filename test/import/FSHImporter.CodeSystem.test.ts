import { importSingleText } from '../testhelpers/importSingleText';
import { assertCaretValueRule } from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';

describe('FSHImporter', () => {
  describe('CodeSystem', () => {
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
        expect(codeSystem.concepts).toEqual([]);
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
        expect(codeSystem.concepts).toEqual([]);
        expect(codeSystem.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 5,
          endColumn: 65
        });
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
        expect(codeSystem.concepts).toEqual([]);
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
        expect(codeSystem.concepts).toEqual([]);
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
        expect(codeSystem.concepts.length).toBe(1);
        expect(codeSystem.concepts[0].code).toBe('lion');
        expect(codeSystem.concepts[0].display).toBeUndefined();
        expect(codeSystem.concepts[0].definition).toBeUndefined();
        expect(codeSystem.concepts[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 15
        });
        expect(codeSystem.concepts[0].sourceInfo.file).toBe('Zoo.fsh');
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
        expect(codeSystem.concepts.length).toBe(1);
        expect(codeSystem.concepts[0].code).toBe('tiger');
        expect(codeSystem.concepts[0].display).toBe('Tiger');
        expect(codeSystem.concepts[0].definition).toBeUndefined();
        expect(codeSystem.concepts[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 24
        });
        expect(codeSystem.concepts[0].sourceInfo.file).toBe('Zoo.fsh');
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
        expect(codeSystem.concepts.length).toBe(1);
        expect(codeSystem.concepts[0].code).toBe('bear');
        expect(codeSystem.concepts[0].display).toBe('Bear');
        expect(codeSystem.concepts[0].definition).toBe('A member of family Ursidae.');
        expect(codeSystem.concepts[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 52
        });
        expect(codeSystem.concepts[0].sourceInfo.file).toBe('Zoo.fsh');
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
        expect(codeSystem.concepts.length).toBe(1);
        expect(codeSystem.concepts[0].code).toBe('gorilla');
        expect(codeSystem.concepts[0].display).toBe('Gorilla');
        const expectedDefinition = [
          'Let there be no mistake',
          'about the greatest ape of all.'
        ].join('\n');
        expect(codeSystem.concepts[0].definition).toBe(expectedDefinition);
        expect(codeSystem.concepts[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 115
        });
        expect(codeSystem.concepts[0].sourceInfo.file).toBe('Zoo.fsh');
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
        expect(codeSystem.concepts.length).toBe(3);
        expect(codeSystem.concepts[0].code).toBe('lion');
        expect(codeSystem.concepts[0].display).toBeUndefined();
        expect(codeSystem.concepts[0].definition).toBeUndefined();
        expect(codeSystem.concepts[0].sourceInfo.location).toEqual({
          startLine: 3,
          startColumn: 9,
          endLine: 3,
          endColumn: 15
        });
        expect(codeSystem.concepts[0].sourceInfo.file).toBe('Zoo.fsh');
        expect(codeSystem.concepts[1].code).toBe('tiger');
        expect(codeSystem.concepts[1].display).toBe('Tiger');
        expect(codeSystem.concepts[1].definition).toBeUndefined();
        expect(codeSystem.concepts[1].sourceInfo.location).toEqual({
          startLine: 4,
          startColumn: 9,
          endLine: 4,
          endColumn: 24
        });
        expect(codeSystem.concepts[1].sourceInfo.file).toBe('Zoo.fsh');
        expect(codeSystem.concepts[2].code).toBe('bear');
        expect(codeSystem.concepts[2].display).toBe('Bear');
        expect(codeSystem.concepts[2].definition).toBe('A member of family Ursidae.');
        expect(codeSystem.concepts[2].sourceInfo.location).toEqual({
          startLine: 5,
          startColumn: 9,
          endLine: 5,
          endColumn: 52
        });
        expect(codeSystem.concepts[2].sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should log an error when encountering a duplicate code', () => {
        const input = `
        CodeSystem: ZOO
        * #goat
        * #goat
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.concepts.length).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 4\D*/s);
      });

      it('should log an error when a concept includes a system declaration', () => {
        const input = `
        CodeSystem: ZOO
        * #goat
        * ZOO#bat
        * CRYPTID#jackalope
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.codeSystems.size).toBe(1);
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.name).toBe('ZOO');
        expect(codeSystem.concepts.length).toBe(3);
        expect(codeSystem.concepts[0].code).toBe('goat');
        expect(codeSystem.concepts[1].code).toBe('bat');
        expect(codeSystem.concepts[2].code).toBe('jackalope');
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Zoo\.fsh.*Line: 4\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 5\D*/s);
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
        assertCaretValueRule(codeSystem.rules[0], '', 'publisher', 'Matt');
      });

      it('should parse a code system that uses CaretValueRules alongside concepts', () => {
        const input = `
        CodeSystem: ZOO
        * #lion
        * ^publisher = "Damon"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        const codeSystem = result.codeSystems.get('ZOO');
        expect(codeSystem.concepts[0].code).toBe('lion');
        expect(codeSystem.concepts[0].sourceInfo.file).toBe('Zoo.fsh');
        assertCaretValueRule(codeSystem.rules[0], '', 'publisher', 'Damon');
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
  });
});
