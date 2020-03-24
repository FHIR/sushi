import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { MultipleStandardsStatusError } from '../../src/errors';
import { TestFisher } from '../testhelpers';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
  });

  describe('#applyFlags()', () => {
    it('should allow all the flags to change from falsy to true', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.isSummary).toBeFalsy();
      expect(note.isModifier).toBeFalsy();
      expect(note.mustSupport).toBeFalsy();
      note.applyFlags(true, true, true, undefined, undefined, undefined);
      expect(note.isSummary).toBe(true);
      expect(note.isModifier).toBe(true);
      expect(note.mustSupport).toBe(true);
    });

    it('should not change a flag that gets false as its argument', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(status.isModifier).toBe(true);
      status.applyFlags(undefined, undefined, false, undefined, undefined, undefined);
      expect(status.isModifier).toBe(true);
    });

    it('should not change a flag that gets undefined as its argument', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(status.isSummary).toBe(true);
      expect(status.isModifier).toBe(true);
      status.applyFlags(undefined, undefined, undefined, undefined, undefined, undefined);
      expect(status.isSummary).toBe(true);
      expect(status.isModifier).toBe(true);
    });

    it('should add a standards status of trial use to an element with no standards status', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.extension).toBeUndefined();
      note.applyFlags(undefined, undefined, undefined, true, undefined, undefined);
      expect(note.extension).toContainEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'trial-use'
      });
    });

    it('should add a standards status of normative to an element with no standards status', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.extension).toBeUndefined();
      note.applyFlags(undefined, undefined, undefined, undefined, true, undefined);
      expect(note.extension).toContainEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'normative'
      });
    });

    it('should add a standards status of draft to an element with no standards status', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.extension).toBeUndefined();
      note.applyFlags(undefined, undefined, undefined, undefined, undefined, true);
      expect(note.extension).toContainEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'draft'
      });
    });

    it('should change the standards status when applying a standards status to an element that already has a standards status', () => {
      const focus = observation.elements.find(e => e.id === 'Observation.focus');
      expect(focus.extension).toContainEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'trial-use'
      });
      focus.applyFlags(undefined, undefined, undefined, undefined, true, undefined);
      expect(focus.extension).not.toContainEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'trial-use'
      });
      expect(focus.extension).toContainEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'normative'
      });
    });

    it('should throw an error when applying more than one standards status to an element', () => {
      const note = observation.elements.find(e => e.id === 'Observation.note');
      expect(note.extension).toBeUndefined();
      expect(() => note.applyFlags(undefined, undefined, undefined, undefined, true, true)).toThrow(
        MultipleStandardsStatusError
      );
      expect(note.extension).toBeUndefined();
    });
  });
});
