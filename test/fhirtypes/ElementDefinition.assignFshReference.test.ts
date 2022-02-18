import path from 'path';
import { loadFromPath } from 'fhir-package-loader';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshReference } from '../../src/fshtypes';
import { TestFisher } from '../testhelpers';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fshReference1: FshReference;
  let fshReference2: FshReference;
  let fisher: TestFisher;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    fshReference1 = new FshReference('foo', 'bar');
    fshReference2 = new FshReference('otherFoo', 'otherBar');
  });

  describe('#assignFshReference', () => {
    it('should assign a FshReference to a Reference', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(fshReference1);
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      expect(subject.fixedReference).toBeUndefined();
    });

    it('should assign a FshReference to a Reference (exactly)', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(fshReference1, true);
      expect(subject.fixedReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      expect(subject.patternReference).toBeUndefined();
    });

    it('should assign a FshReference to a Reference allowing a more specific display', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(new FshReference('foo'));
      expect(subject.patternReference).toEqual({
        reference: 'foo'
      });
      subject.assignValue(new FshReference('foo', 'bar'));
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      expect(subject.fixedReference).toBeUndefined();
    });

    it('should assign a FshReference to a Reference allowing a more specific display (exactly)', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(new FshReference('foo'), true);
      expect(subject.fixedReference).toEqual({
        reference: 'foo'
      });
      subject.assignValue(new FshReference('foo', 'bar'), true);
      expect(subject.fixedReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      expect(subject.patternReference).toBeUndefined();
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.assignValue(fshReference1);
      }).toThrow(
        'Cannot assign Reference value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.assignValue(fshReference1, true);
      }).toThrow(
        'Cannot assign Reference value on this element since this element does not have a single type'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value by pattern[x]', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(fshReference1);
      // should be able to assign a Reference twice in the same way without issue
      subject.assignValue(fshReference1);
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      // different value
      expect(() => {
        subject.assignValue(fshReference2);
      }).toThrow(
        'Cannot assign Reference(otherFoo) "otherBar" to this element; a different Reference is already assigned: {"reference":"foo","display":"bar"}.'
      );
      expect(() => {
        subject.assignValue(fshReference2, true);
      }).toThrow(
        'Cannot assign Reference(otherFoo) "otherBar" to this element; a different Reference is already assigned: {"reference":"foo","display":"bar"}.'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value by fixed[x]', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(fshReference1, true);
      // should be able to assign a Reference twice in the same way without issue
      subject.assignValue(fshReference1, true);
      expect(subject.fixedReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      // different value
      expect(() => {
        subject.assignValue(fshReference2, true);
      }).toThrow(
        'Cannot assign Reference(otherFoo) "otherBar" to this element; a different Reference is already assigned: {"reference":"foo","display":"bar"}.'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value and a display is added', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(new FshReference('foo'));
      expect(subject.patternReference).toEqual({
        reference: 'foo'
      });
      expect(() => subject.assignValue(new FshReference('bar', 'bar'))).toThrow(
        'Cannot assign Reference(bar) "bar" to this element; a different Reference is already assigned: {"reference":"foo"}.'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value, no display', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(new FshReference('foo'));
      // should be able to assign a Reference twice in the same way without issue
      subject.assignValue(new FshReference('foo'));
      expect(subject.patternReference).toEqual({
        reference: 'foo'
      });
      // different value
      expect(() => {
        subject.assignValue(new FshReference('bar'));
      }).toThrow(
        'Cannot assign Reference(bar) to this element; a different Reference is already assigned: {"reference":"foo"}.'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.assignValue(fshReference1, true);
      // different value
      expect(() => {
        subject.assignValue(fshReference2);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedReference.'
      );
    });

    it('should throw MismatchedTypeError when the value is assigned to a non-Reference', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with display
      expect(() => {
        status.assignValue(fshReference1);
      }).toThrow(
        'Cannot assign Reference value: Reference(foo) "bar". Value does not match element type: code'
      );
      expect(() => {
        status.assignValue(fshReference1, true);
      }).toThrow(
        'Cannot assign Reference value: Reference(foo) "bar". Value does not match element type: code'
      );
      // without display
      expect(() => {
        status.assignValue(new FshReference('foo'));
      }).toThrow(
        'Cannot assign Reference value: Reference(foo). Value does not match element type: code'
      );
      expect(() => {
        status.assignValue(new FshReference('foo'), true);
      }).toThrow(
        'Cannot assign Reference value: Reference(foo). Value does not match element type: code'
      );
    });
  });
});
