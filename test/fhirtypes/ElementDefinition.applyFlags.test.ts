import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { InvalidMustSupportError, MultipleStandardsStatusError } from '../../src/errors';
import { TestFisher } from '../testhelpers';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let obsResource: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('us-core-observation-lab');
    obsResource = fisher.fishForStructureDefinition('Observation');
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

    it('should throw an error when applying mustSupport to an element in a resource', () => {
      const note = obsResource.elements.find(e => e.id === 'Observation.note');
      expect(() =>
        note.applyFlags(true, undefined, undefined, undefined, undefined, undefined)
      ).toThrow(InvalidMustSupportError);
    });

    it('should set the mustSupport flag on connected elements', () => {
      // MS only gets applied to connected elements that are not themselves slices
      // first, let's slice component
      const component = observation.findElement('Observation.component');
      component.sliceIt('pattern', 'interpretation');
      component.addSlice('Lab');
      // then apply MS to Observation.component.interpretation, which implies Observation.component:Lab.interpretation MS
      const componentInterpretation = observation.findElement(
        'Observation.component.interpretation'
      );
      componentInterpretation.applyFlags(
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      const labInterpretation = observation.findElementByPath(
        'component[Lab].interpretation',
        fisher
      );
      expect(labInterpretation.mustSupport).toBeTrue();
    });

    it('should not set the mustSupport flag on an element with the same path as the rule, but where the rule path ends with a slice and the other element does not', () => {
      // first, let's slice component
      const component = observation.findElement('Observation.component');
      component.sliceIt('pattern', 'interpretation');
      component.addSlice('Lab');
      // then, let's slice component.extension
      const componentExtension = observation.findElement('Observation.component.extension');
      componentExtension.sliceIt('value', 'url');
      componentExtension.addSlice('Sequel');
      // find the elements now to force unfolding, so they will exist when applying the flags
      const sequel = observation.findElementByPath('component.extension[Sequel]', fisher);
      const labSequel = observation.findElementByPath('component[Lab].extension[Sequel]', fisher);
      const labExtension = observation.findElementByPath('component[Lab].extension', fisher);
      sequel.applyFlags(true, undefined, undefined, undefined, undefined, undefined);
      // this should set mustSupport on component[Lab].extension[Sequel]
      expect(labSequel.mustSupport).toBeTrue();
      // but it should _not_ set mustSupport on component[Lab].extension
      expect(labExtension.mustSupport).toBeUndefined();
    });
  });
});
