import { importSingleText } from '../testhelpers/importSingleText';
import { assertMappingRule } from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FshCode } from '../../src/fshtypes';

describe('FSHImporter', () => {
  beforeAll(() => {
    loggerSpy.reset();
  });

  describe('Mapping', () => {
    it('should parse the simplest possible Mapping', () => {
      const input = `
        Mapping: MyMapping
        `;
      const result = importSingleText(input, 'Mapping.fsh');
      expect(result.mappings.size).toBe(1);
      const mapping = result.mappings.get('MyMapping');
      expect(mapping.name).toBe('MyMapping');
      expect(mapping.id).toBe('MyMapping');
      expect(mapping.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 2,
        endColumn: 26
      });
      expect(mapping.sourceInfo.file).toBe('Mapping.fsh');
    });

    it('should parse a Mapping with additional metadata properties', () => {
      const input = `
        Mapping: MyMapping
        Id: my-map
        Source: Patient
        Target: "http://some.com/mappedTo"
        Description: "This is a description"
        `;
      const result = importSingleText(input, 'Mapping.fsh');
      expect(result.mappings.size).toBe(1);
      const mapping = result.mappings.get('MyMapping');
      expect(mapping.name).toBe('MyMapping');
      expect(mapping.id).toBe('my-map');
      expect(mapping.source).toBe('Patient');
      expect(mapping.target).toBe('http://some.com/mappedTo');
      expect(mapping.description).toBe('This is a description');
      expect(mapping.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 6,
        endColumn: 44
      });
      expect(mapping.sourceInfo.file).toBe('Mapping.fsh');
    });

    it('should only apply each metadata attribute the first time it is declared', () => {
      const input = `
        Mapping: MyMapping
        Id: my-map
        Source: Patient
        Target: "http://some.com/mappedTo"
        Description: "This is a description"
        Id: my-map-2
        Source: Patient2
        Target: "http://some.com/mappedTo2"
        Description: "This is a description 2"
        `;
      const result = importSingleText(input, 'Mapping.fsh');
      expect(result.mappings.size).toBe(1);
      const mapping = result.mappings.get('MyMapping');
      expect(mapping.name).toBe('MyMapping');
      expect(mapping.id).toBe('my-map');
      expect(mapping.source).toBe('Patient');
      expect(mapping.target).toBe('http://some.com/mappedTo');
      expect(mapping.description).toBe('This is a description');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /This is a description.*File: Mapping\.fsh.*Line: 10\D*/s
      );
    });

    it('should only apply each metadata attribute the first time it is declared', () => {
      const input = `
        Mapping: MyMapping
        Id: my-map
        Source: Patient
        Target: "http://some.com/mappedTo"
        Description: "This is a description"
        Id: my-map-2
        Source: Patient2
        Target: "http://some.com/mappedTo2"
        Description: "This is a description 2"
        `;
      const result = importSingleText(input, 'Mapping.fsh');
      expect(result.mappings.size).toBe(1);
      const mapping = result.mappings.get('MyMapping');
      expect(mapping.name).toBe('MyMapping');
      expect(mapping.id).toBe('my-map');
      expect(mapping.source).toBe('Patient');
      expect(mapping.target).toBe('http://some.com/mappedTo');
      expect(mapping.description).toBe('This is a description');
    });

    describe('#mappingRule', () => {
      it('should parse a simple mapping rule', () => {
        const input = `
          Mapping: MyMapping
          * identifier -> "Patient.identifier"
          `;
        const result = importSingleText(input);
        const mapping = result.mappings.get('MyMapping');
        expect(mapping.rules).toHaveLength(1);
        assertMappingRule(
          mapping.rules[0],
          'identifier',
          'Patient.identifier',
          undefined,
          undefined
        );
      });

      it('should parse a mapping rule with no path', () => {
        const input = `
          Mapping: MyMapping
          * -> "Patient"
          `;
        const result = importSingleText(input);
        const mapping = result.mappings.get('MyMapping');
        expect(mapping.rules).toHaveLength(1);
        assertMappingRule(mapping.rules[0], '', 'Patient', undefined, undefined);
      });

      it('should parse a mapping rule with a comment', () => {
        const input = `
          Mapping: MyMapping
          * identifier -> "Patient.identifier" "some comment"
          `;
        const result = importSingleText(input);
        const mapping = result.mappings.get('MyMapping');
        expect(mapping.rules).toHaveLength(1);
        assertMappingRule(
          mapping.rules[0],
          'identifier',
          'Patient.identifier',
          'some comment',
          undefined
        );
      });

      it('should parse a mapping rule with a language', () => {
        const input = `
          Mapping: MyMapping
          * identifier -> "Patient.identifier" #lang
          `;
        const result = importSingleText(input);
        const mapping = result.mappings.get('MyMapping');
        expect(mapping.rules).toHaveLength(1);
        assertMappingRule(
          mapping.rules[0],
          'identifier',
          'Patient.identifier',
          undefined,
          new FshCode('lang').withLocation([3, 48, 3, 52]).withFile('')
        );
      });

      it('should parse a mapping rule with comment and language', () => {
        const input = `
          Mapping: MyMapping
          * identifier -> "Patient.identifier" "some comment" #lang
          `;
        const result = importSingleText(input);
        const mapping = result.mappings.get('MyMapping');
        expect(mapping.rules).toHaveLength(1);
        assertMappingRule(
          mapping.rules[0],
          'identifier',
          'Patient.identifier',
          'some comment',
          new FshCode('lang').withLocation([3, 63, 3, 67]).withFile('')
        );
      });

      it('should log an error when a language has a system', () => {
        const input = `
          Mapping: MyMapping
          * identifier -> "Patient.identifier" sys#lang
          `;
        const result = importSingleText(input, 'Mapping.fsh');
        const mapping = result.mappings.get('MyMapping');
        expect(mapping.rules).toHaveLength(1);
        assertMappingRule(
          mapping.rules[0],
          'identifier',
          'Patient.identifier',
          undefined,
          new FshCode('lang', 'sys').withLocation([3, 48, 3, 55]).withFile('Mapping.fsh')
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /Do not specify a system for mapping language.*File: Mapping\.fsh.*Line: 3\D*/s
        );
      });
    });
  });
});
