import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshReference } from '../../src/fshtypes';
import { TestFisher } from '../testhelpers';
import path from 'path';

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
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(fshReference1);
      }).toThrow(
        'Cannot fix Reference value on this element since this element does not have a single type'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value', () => {
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
        'Cannot fix Reference(otherFoo) "otherBar" to this element; a different Reference is already fixed: Reference(foo) "bar"'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value and a display is added', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixValue(new FshReference('foo'));
      expect(subject.patternReference).toEqual({
        reference: 'foo'
      });
      expect(() => subject.fixValue(new FshReference('bar', 'bar'))).toThrow(
        'Cannot fix Reference(bar) "bar" to this element; a different Reference is already fixed: Reference(foo)'
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
        'Cannot fix Reference(bar) to this element; a different Reference is already fixed: Reference(foo).'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Reference', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with units
      expect(() => {
        status.fixValue(fshReference1);
      }).toThrow(
        'Cannot fix Reference value: Reference(foo) "bar". Value does not match element type: code'
      );
      // without units
      expect(() => {
        status.fixValue(new FshReference('foo'));
      }).toThrow(
        'Cannot fix Reference value: Reference(foo). Value does not match element type: code'
      );
    });
  });
});
