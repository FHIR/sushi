import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { DisableFlagError } from '../../src/errors';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
  });

  describe('#applyFlags()', () => {
    it('should allow all the flags to change from false to true', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.isSummary).toBeFalsy();
      expect(note.isModifier).toBeFalsy();
      expect(note.mustSupport).toBeFalsy();
      note.applyFlags(true, true, true);
      expect(note.isSummary).toBe(true);
      expect(note.isModifier).toBe(true);
      expect(note.mustSupport).toBe(true);
    });

    it('should allow isSummary to change from true to false', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      expect(code.isSummary).toBe(true);
      code.applyFlags(code.mustSupport, false, code.isModifier);
      expect(code.isSummary).toBe(false);
    });

    it('should throw an error when changing mustSupport from true to false', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.mustSupport).toBeFalsy();
      note.applyFlags(true, note.isSummary, note.isModifier);
      expect(note.mustSupport).toBe(true);
      expect(() => {
        note.applyFlags(false, note.isSummary, note.isModifier);
      }).toThrow(DisableFlagError);
    });

    it('should throw an error when changing isModifier from true to false', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.isModifier).toBeFalsy();
      note.applyFlags(note.mustSupport, note.isSummary, true);
      expect(note.isModifier).toBe(true);
      expect(() => {
        note.applyFlags(note.mustSupport, note.isSummary, false);
      }).toThrow(DisableFlagError);
    });
  });
});
