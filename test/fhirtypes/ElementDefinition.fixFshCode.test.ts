import { TestFisher } from '../testhelpers';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshCode } from '../../src/fshtypes/FshCode';
import cloneDeep from 'lodash/cloneDeep';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fooBarCode: FshCode;
  let barFooCode: FshCode;
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
    fooBarCode = new FshCode('bar', 'http://foo.com');
    barFooCode = new FshCode('foo', 'http://bar.com');
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

    it('should throw CodeAlreadyFixedError when fixing a code to a CodeableConcept fixed to a different code by a parent', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore
      rr.patternBackboneElement = { type: { coding: [{ system: 'http://foo.com', code: 'bar' }] } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      const clone = cloneDeep(rrType);
      expect(() => {
        rrType.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*http:\/\/foo.com#bar/);
      expect(clone).toEqual(rrType);
    });

    it('should fix a code to a Coding', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.fixFshCode(fooBarCode);
      expect(coding.patternCoding).toEqual({ code: 'bar', system: 'http://foo.com' });
    });

    it('should throw CodeAlreadyFixedError when fixing a code to a Coding fixed to a different code', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      // Setup original fixed code
      coding.fixFshCode(fooBarCode);
      const clone = cloneDeep(coding);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*http:\/\/foo.com#bar/);
      expect(clone).toEqual(coding);
    });

    it('should throw CodeAlreadyFixedError when fixing a code to a Coding fixed to a different code by a parent', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore
      rr.patternBackboneElement = { type: { coding: { system: 'http://foo.com', code: 'bar' } } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      rrType.unfold(fisher);
      const rrTypeCoding = observation.elements.find(
        e => e.id === 'Observation.referenceRange.type.coding'
      );
      const clone = cloneDeep(rrTypeCoding);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*http:\/\/foo.com#bar/);
      expect(clone).toEqual(rrTypeCoding);
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

    it('should throw CodeAlreadyFixedError when fixing a code to a code fixed to a different code by a parent', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const codeCodingCode = observation.elements.find(
        e => e.id === 'Observation.code.coding.code'
      );
      // Setup original fixed code
      code.fixFshCode(fooBarCode);
      const clone = cloneDeep(codeCodingCode);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(clone).toEqual(codeCodingCode);
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

    it('should throw CodeAlreadyFixedError when fixing a code to a Quantity fixed to a different code by a parent', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore
      rr.patternBackboneElement = { low: { system: 'http://foo.com', code: 'bar' } };
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      const clone = cloneDeep(rrLow);
      expect(() => {
        clone.fixFshCode(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*http:\/\/foo.com#bar/);
      expect(clone).toEqual(rrLow);
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

    it('should throw CodeAlreadyFixedError when fixing a code to a string fixed to a different string by a parent', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.patternCodeableConcept = { text: 'http://foo.com#bar' };
      code.unfold(fisher);
      const string = observation.elements.find(e => e.id === 'Observation.code.text');
      // Setup original fixed code
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

    it('should throw CodeAlreadyFixedError when fixing a code to a uri fixed to a different uri by a parent', () => {
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      rrLow.patternQuantity = { system: 'http://foo.com#bar' };
      rrLow.unfold(fisher);
      const uri = observation.elements.find(e => e.id === 'Observation.referenceRange.low.system');
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

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixFshCode(fooBarCode);
      }).toThrow(
        'Cannot fix Code value on this element since this element does not have a single type'
      );
    });
  });
});
