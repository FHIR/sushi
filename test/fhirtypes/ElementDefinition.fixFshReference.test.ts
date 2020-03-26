import path from 'path';
import { loadFromPath } from '../../src/fhirdefs/load';
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
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    fshReference1 = new FshReference('foo', 'bar');
    fshReference2 = new FshReference('otherFoo', 'otherBar');
  });

  describe('#fixFshReference', () => {
    it('should fix a FshReference to a Reference', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(fshReference1);
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      expect(subject.fixedReference).toBeUndefined();
    });

    it('should fix a FshReference to a Reference (exactly)', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(fshReference1, true);
      expect(subject.fixedReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      expect(subject.patternReference).toBeUndefined();
    });

    it('should fix a FshReference to a Reference allowing a more specific display', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(new FshReference('foo'));
      expect(subject.patternReference).toEqual({
        reference: 'foo'
      });
      subject.fixValue(new FshReference('foo', 'bar'));
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      expect(subject.fixedReference).toBeUndefined();
    });

    it('should fix a FshReference to a Reference allowing a more specific display (exactly)', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(new FshReference('foo'), true);
      expect(subject.fixedReference).toEqual({
        reference: 'foo'
      });
      subject.fixValue(new FshReference('foo', 'bar'), true);
      expect(subject.fixedReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      expect(subject.patternReference).toBeUndefined();
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(fshReference1);
      }).toThrow(
        'Cannot fix Reference value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.fixValue(fshReference1, true);
      }).toThrow(
        'Cannot fix Reference value on this element since this element does not have a single type'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value by pattern[x]', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(fshReference1);
      // should be able to fix a Reference twice in the same way without issue
      subject.fixValue(fshReference1);
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      // different value
      expect(() => {
        subject.fixValue(fshReference2);
      }).toThrow(
        'Cannot fix Reference(otherFoo) "otherBar" to this element; a different Reference is already fixed: {"reference":"foo","display":"bar"}.'
      );
      expect(() => {
        subject.fixValue(fshReference2, true);
      }).toThrow(
        'Cannot fix Reference(otherFoo) "otherBar" to this element; a different Reference is already fixed: {"reference":"foo","display":"bar"}.'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value by fixed[x]', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(fshReference1, true);
      // should be able to fix a Reference twice in the same way without issue
      subject.fixValue(fshReference1, true);
      expect(subject.fixedReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      // different value
      expect(() => {
        subject.fixValue(fshReference2, true);
      }).toThrow(
        'Cannot fix Reference(otherFoo) "otherBar" to this element; a different Reference is already fixed: {"reference":"foo","display":"bar"}.'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value and a display is added', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(new FshReference('foo'));
      expect(subject.patternReference).toEqual({
        reference: 'foo'
      });
      expect(() => subject.fixValue(new FshReference('bar', 'bar'))).toThrow(
        'Cannot fix Reference(bar) "bar" to this element; a different Reference is already fixed: {"reference":"foo"}.'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value, no display', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(new FshReference('foo'));
      // should be able to fix a Reference twice in the same way without issue
      subject.fixValue(new FshReference('foo'));
      expect(subject.patternReference).toEqual({
        reference: 'foo'
      });
      // different value
      expect(() => {
        subject.fixValue(new FshReference('bar'));
      }).toThrow(
        'Cannot fix Reference(bar) to this element; a different Reference is already fixed: {"reference":"foo"}.'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(fshReference1, true);
      // different value
      expect(() => {
        subject.fixValue(fshReference2);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedReference.'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Reference', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with display
      expect(() => {
        status.fixValue(fshReference1);
      }).toThrow(
        'Cannot fix Reference value: Reference(foo) "bar". Value does not match element type: code'
      );
      expect(() => {
        status.fixValue(fshReference1, true);
      }).toThrow(
        'Cannot fix Reference value: Reference(foo) "bar". Value does not match element type: code'
      );
      // without display
      expect(() => {
        status.fixValue(new FshReference('foo'));
      }).toThrow(
        'Cannot fix Reference value: Reference(foo). Value does not match element type: code'
      );
      expect(() => {
        status.fixValue(new FshReference('foo'), true);
      }).toThrow(
        'Cannot fix Reference value: Reference(foo). Value does not match element type: code'
      );
    });
  });
});
