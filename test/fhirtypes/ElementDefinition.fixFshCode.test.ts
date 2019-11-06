import cloneDeep from 'lodash/cloneDeep';
import { getResolver } from '../utils/getResolver';
import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { Code } from '../../src/fshtypes/Code';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  let fooBarCode: Code;
  let barFooCode: Code;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    fooBarCode = { code: 'bar', system: 'http://foo.com' };
    barFooCode = { code: 'foo', system: 'http://bar.com' };
  });

  describe('#fixFshCode()', () => {
    it('should fix a code to a CodeableConcept', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.fixFshCode(fooBarCode);
      expect(concept.patternCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com' }]
      });
    });

    it('should throw CodeAlreadyFixedError when fixing a code to a CodeableConcept fixed to a different code', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      // Setup original fixed code
      concept.fixFshCode(fooBarCode);
      const clone = cloneDeep(concept);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*http:\/\/foo.com#bar/);
      expect(clone).toEqual(concept);
    });

    it('should fix a code to a Coding', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(getResolver(defs));
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.fixFshCode(fooBarCode);
      expect(coding.patternCoding).toEqual({ code: 'bar', system: 'http://foo.com' });
    });

    it('should throw CodeAlreadyFixedError when fixing a code to a Coding fixed to a different code', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(getResolver(defs));
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      // Setup original fixed code
      coding.fixFshCode(fooBarCode);
      const clone = cloneDeep(coding);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*http:\/\/foo.com#bar/);
      expect(clone).toEqual(coding);
    });

    it('should fix a code to a code', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      code.fixFshCode(fooBarCode);
      expect(code.fixedCode).toBe('bar');
    });

    it('should throw CodeAlreadyFixedError when fixing a code to a code fixed to a different code', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      // Setup original fixed code
      code.fixFshCode(fooBarCode);
      const clone = cloneDeep(code);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(clone).toEqual(code);
    });

    it('should fix a code to a Quantity', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.fixFshCode(fooBarCode);
      expect(quantity.patternQuantity).toEqual({ code: 'bar', system: 'http://foo.com' });
    });

    it('should throw CodeAlreadyFixedError when fixing a code to a Quantity fixed to a different code', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      // Setup original fixed code
      quantity.fixFshCode(fooBarCode);
      const clone = cloneDeep(quantity);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*http:\/\/foo.com#bar/);
      expect(clone).toEqual(quantity);
    });

    it('should fix a code to a string', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      string.fixFshCode(fooBarCode);
      expect(string.fixedString).toBe('bar');
    });

    it('should throw CodeAlreadyFixedError when fixing a code to a string fixed to a different string', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      // Setup original fixed code
      string.fixFshCode(fooBarCode);
      const clone = cloneDeep(string);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(clone).toEqual(string);
    });

    it('should fix a code to a uri', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      uri.fixFshCode(fooBarCode);
      expect(uri.fixedUri).toBe('bar');
    });

    it('should throw CodeAlreadyFixedError when fixing a code to a uri fixed to a different uri', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      // Setup original fixed code
      uri.fixFshCode(fooBarCode);
      const clone = cloneDeep(uri);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(clone).toEqual(uri);
    });

    it('should throw CodedTypeNotFoundError when binding to an unsupported type', () => {
      const instant = observation.elements.find(e => e.id === 'Observation.issued');
      const clone = cloneDeep(instant);
      expect(() => {
        clone.fixFshCode(fooBarCode);
      }).toThrow(/instant/);
      expect(clone).toEqual(instant);
    });
  });
});
