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
    it('should allow all the flags to change from falsy to true', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.isSummary).toBeFalsy();
      expect(note.isModifier).toBeFalsy();
      expect(note.mustSupport).toBeFalsy();
      note.applyFlags(true, true, true);
      expect(note.isSummary).toBe(true);
      expect(note.isModifier).toBe(true);
      expect(note.mustSupport).toBe(true);
    });

    it('should allow a flag to change from falsy to explicitly false', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      expect(code.mustSupport).toBeFalsy();
      expect(code.mustSupport).not.toBe(false);
      code.applyFlags(false, undefined, undefined);
      expect(code.mustSupport).toBe(false);
    });

    it('should not change a flag that gets undefined as its argument', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(status.isSummary).toBe(true);
      expect(status.isModifier).toBe(true);
      status.applyFlags(undefined, undefined, undefined);
      expect(status.isSummary).toBe(true);
      expect(status.isModifier).toBe(true);
    });

    it('should allow isSummary to change from true to false', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      expect(code.isSummary).toBe(true);
      code.applyFlags(undefined, false, undefined);
      expect(code.isSummary).toBe(false);
    });

    it('should throw an error when changing mustSupport from true to false', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.mustSupport).toBeFalsy();
      note.applyFlags(true, undefined, undefined);
      expect(note.mustSupport).toBe(true);
      expect(() => {
        note.applyFlags(false, undefined, undefined);
      }).toThrow(DisableFlagError);
    });

    it('should throw an error when changing isModifier from true to false', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.isModifier).toBeFalsy();
      note.applyFlags(undefined, undefined, true);
      expect(note.isModifier).toBe(true);
      expect(() => {
        note.applyFlags(undefined, undefined, false);
      }).toThrow(DisableFlagError);
    });
  });
});
