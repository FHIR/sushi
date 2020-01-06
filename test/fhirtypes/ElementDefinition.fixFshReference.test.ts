import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshReference } from '../../src/fshtypes';
import { getResolver } from '../testhelpers/getResolver';
import { ResolveFn } from '../../src/fhirtypes';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fshReference1: FshReference;
  let fshReference2: FshReference;
  let resolve: ResolveFn;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    resolve = getResolver(defs);
  });
  beforeEach(() => {
    observation = resolve('Observation');
    fshReference1 = new FshReference('foo', 'bar');
    fshReference2 = new FshReference('otherFoo', 'otherBar');
  });

  describe('#fixFshReference', () => {
    it('should fix a FshReference to a Reference', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixFshReference(fshReference1);
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixFshReference(fshReference1);
      }).toThrow(
        'Cannot fix Reference value on this element since this element does not have a single type'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixFshReference(fshReference1);
      // should be able to fix a Quantity twice in the same way without issue
      subject.fixFshReference(fshReference1);
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
      // different value
      expect(() => {
        subject.fixFshReference(fshReference2);
      }).toThrow(
        'Cannot fix Reference(otherFoo) "otherBar" to this element; a different Reference is already fixed: Reference(foo) "bar"'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value, no display', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.fixFshReference(new FshReference('foo'));
      // should be able to fix a Quantity twice in the same way without issue
      subject.fixFshReference(new FshReference('foo'));
      expect(subject.patternReference).toEqual({
        reference: 'foo'
      });
      // different value
      expect(() => {
        subject.fixFshReference(new FshReference('bar'));
      }).toThrow(
        'Cannot fix Reference(bar) to this element; a different Reference is already fixed: Reference(foo).'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Reference', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with units
      expect(() => {
        status.fixFshReference(fshReference1);
      }).toThrow(
        'Cannot fix Reference value: Reference(foo) "bar". Value does not match element type: code'
      );
      // without units
      expect(() => {
        status.fixFshReference(new FshReference('foo'));
      }).toThrow(
        'Cannot fix Reference value: Reference(foo). Value does not match element type: code'
      );
    });
  });
});
