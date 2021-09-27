import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';
import path from 'path';
import { FshCode } from '../../src/fshtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
  });

  describe('#applyMapping', () => {
    it('should apply a simple mapping', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalLength = status.mapping.length;
      status.applyMapping('myId', 'myMap', 'myComment', new FshCode('myLanguageCode'));
      expect(status.mapping.length).toBe(originalLength + 1);
      const mapping = status.mapping[status.mapping.length - 1];
      expect(mapping.identity).toBe('myId');
      expect(mapping.map).toBe('myMap');
      expect(mapping.comment).toBe('myComment');
      expect(mapping.language).toBe('myLanguageCode');
    });

    it('should apply a mapping on an element which does not have one', () => {
      const id = observation.elements.find(e => e.id === 'Observation.id');
      expect(id.mapping).toBeUndefined();
      id.applyMapping('myId', 'myMap', 'myComment', new FshCode('myLanguageCode'));
      expect(id.mapping.length).toBe(1);
      const mapping = id.mapping[0];
      expect(mapping.identity).toBe('myId');
      expect(mapping.map).toBe('myMap');
      expect(mapping.comment).toBe('myComment');
      expect(mapping.language).toBe('myLanguageCode');
    });

    it('should apply a mapping without a comment and language', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalLength = status.mapping.length;
      status.applyMapping('myId', 'myMap', undefined, undefined);
      expect(status.mapping.length).toBe(originalLength + 1);
      const mapping = status.mapping[status.mapping.length - 1];
      expect(mapping.identity).toBe('myId');
      expect(mapping.map).toBe('myMap');
      expect(mapping.comment).toBeUndefined();
      expect(mapping.language).toBeUndefined();
    });

    it('should throw InvalidMappingError when applying a mapping with no identity', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalLength = status.mapping.length;
      expect(() => {
        status.applyMapping(undefined, 'myMap', 'myComment', new FshCode('myLanguageCode'));
      }).toThrow('Invalid mapping, mapping.identity and mapping.map are 1..1 and must be set.');
      expect(status.mapping.length).toBe(originalLength);
    });

    it('should throw InvalidFHIRIdError when applying a mapping with an invalid id', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalLength = status.mapping.length;
      expect(() => {
        status.applyMapping('invalid!', 'myMap', 'myComment', new FshCode('myLanguageCode'));
      }).toThrow('The string "invalid!" does not represent a valid FHIR id.');
      expect(status.mapping.length).toBe(originalLength);
    });
  });
});
