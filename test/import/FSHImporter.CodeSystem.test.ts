import { importSingleText } from '../testhelpers/importSingleText';
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
        expect(loggerSpy.getMessageAtIndex(-3)).toMatch(/File: Zoo\.fsh.*Line: 6\D/s);
        expect(loggerSpy.getMessageAtIndex(-2)).toMatch(/File: Zoo\.fsh.*Line: 7\D/s);
        expect(loggerSpy.getLastMessage()).toMatch(/File: Zoo\.fsh.*Line: 8\D/s);
      });
    });
    describe('#concept', () => {
      it.todo('should parse a code system with one concept');
      it.todo('should parse a code system with one concept with a display string');
      it.todo('should parse a code system with one concept with display and definition strings');
      it.todo('should parse a code system with more than one concept');
      it.todo('should log an error when encountering a duplicate code');
    });
  });
});
