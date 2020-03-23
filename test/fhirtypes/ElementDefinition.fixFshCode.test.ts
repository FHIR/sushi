import path from 'path';
import cloneDeep from 'lodash/cloneDeep';
import { TestFisher } from '../testhelpers';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshCode } from '../../src/fshtypes/FshCode';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fooBarCode: FshCode;
  let barFooCode: FshCode;
  let versionedCode: FshCode;
  let codeWithDisplay: FshCode;
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
    versionedCode = new FshCode('versioned', 'http://versioned.com|7.6.5');
    codeWithDisplay = new FshCode('bar', 'http://foo.com', 'Foo Bar');
  });

  describe('#fixFshCode()', () => {
    it('should fix a code to a CodeableConcept', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.fixValue(fooBarCode);
      expect(concept.patternCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com' }]
      });
      expect(concept.fixedCodeableConcept).toBeUndefined();
    });

    it('should fix a code to a CodeableConcept (exacty)', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.fixValue(fooBarCode, true);
      expect(concept.fixedCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com' }]
      });
      expect(concept.patternCodeableConcept).toBeUndefined();
    });

    it('should fix a code with a version to a CodeableConcept', () => {
      const concept = observation.findElementByPath('code', fisher);
      concept.fixValue(versionedCode);
      expect(concept.patternCodeableConcept).toEqual({
        coding: [
          {
            code: 'versioned',
            system: 'http://versioned.com',
            version: '7.6.5'
          }
        ]
      });
      expect(concept.fixedCodeableConcept).toBeUndefined();
    });

    it('should fix a code with a version to a CodeableConcept (exactly)', () => {
      const concept = observation.findElementByPath('code', fisher);
      concept.fixValue(versionedCode, true);
      expect(concept.fixedCodeableConcept).toEqual({
        coding: [
          {
            code: 'versioned',
            system: 'http://versioned.com',
            version: '7.6.5'
          }
        ]
      });
      expect(concept.patternCodeableConcept).toBeUndefined();
    });

    it('should fix a code with a display to a CodeableConcept', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.fixValue(codeWithDisplay);
      expect(concept.patternCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com', display: 'Foo Bar' }]
      });
      expect(concept.fixedCodeableConcept).toBeUndefined();
    });

    it('should fix a code with a display to a CodeableConcept (exacty)', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.fixValue(codeWithDisplay, true);
      expect(concept.fixedCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com', display: 'Foo Bar' }]
      });
      expect(concept.patternCodeableConcept).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a CodeableConcept fixed to a different code by pattern[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      // Setup original fixed code
      concept.fixValue(fooBarCode);
      const clone = cloneDeep(concept);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(clone).toEqual(concept);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a CodeableConcept fixed to a different code by fixed[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      // Setup original fixed code
      concept.fixValue(fooBarCode, true);
      const clone = cloneDeep(concept);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(clone).toEqual(concept);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a CodeableConcept fixed to a different code by a parent by pattern[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically pattern[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.patternBackboneElement = { type: { coding: [{ system: 'http://foo.com', code: 'bar' }] } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      const clone = cloneDeep(rrType);
      expect(() => {
        rrType.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(() => {
        rrType.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(clone).toEqual(rrType);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a CodeableConcept fixed to a different code by a parent by fixed[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically fixed[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.fixedBackboneElement = { type: { coding: [{ system: 'http://foo.com', code: 'bar' }] } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      const clone = cloneDeep(rrType);
      expect(() => {
        rrType.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(() => {
        rrType.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(clone).toEqual(rrType);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      // Setup original fixed code
      concept.fixValue(fooBarCode, true);
      const clone = cloneDeep(concept);
      expect(() => {
        clone.fixValue(fooBarCode);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedCodeableConcept.'
      );
      expect(clone).toEqual(concept);
    });

    it('should throw InvalidUriError when binding with a non-URI value', () => {
      const category = observation.elements.find(e => e.id === 'Observation.category');
      const clone = cloneDeep(category);
      expect(() => {
        clone.fixValue(new FshCode('code', 'notAUri'));
      }).toThrow(/notAUri/);
      expect(() => {
        clone.fixValue(new FshCode('code', 'notAUri'), true);
      }).toThrow(/notAUri/);
    });

    it('should fix a code to a Coding', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.fixValue(fooBarCode);
      expect(coding.patternCoding).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(coding.fixedCoding).toBeUndefined();
    });

    it('should fix a code to a Coding (exactly)', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.fixValue(fooBarCode, true);
      expect(coding.fixedCoding).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(coding.patternCoding).toBeUndefined();
    });

    it('should fix a code with a version to a Coding', () => {
      const coding = observation.findElementByPath('code.coding', fisher);
      coding.fixValue(versionedCode);
      expect(coding.patternCoding).toEqual({
        code: 'versioned',
        system: 'http://versioned.com',
        version: '7.6.5'
      });
      expect(coding.fixedCoding).toBeUndefined();
    });

    it('should fix a code with a version to a Coding (exactly)', () => {
      const coding = observation.findElementByPath('code.coding', fisher);
      coding.fixValue(versionedCode, true);
      expect(coding.fixedCoding).toEqual({
        code: 'versioned',
        system: 'http://versioned.com',
        version: '7.6.5'
      });
      expect(coding.patternCoding).toBeUndefined();
    });

    it('should fix a code with a display to a Coding', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.fixValue(codeWithDisplay);
      expect(coding.patternCoding).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        display: 'Foo Bar'
      });
      expect(coding.fixedCoding).toBeUndefined();
    });

    it('should fix a code with a display to a Coding (exactly)', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.fixValue(codeWithDisplay, true);
      expect(coding.fixedCoding).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        display: 'Foo Bar'
      });
      expect(coding.patternCoding).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a Coding fixed to a different code by pattern[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      // Setup original fixed code
      coding.fixValue(fooBarCode);
      const clone = cloneDeep(coding);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(clone).toEqual(coding);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a Coding fixed to a different code by fixed[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      // Setup original fixed code
      coding.fixValue(fooBarCode, true);
      const clone = cloneDeep(coding);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(clone).toEqual(coding);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a Coding fixed to a different code by a parent by pattern[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically pattern[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.patternBackboneElement = { type: { coding: { system: 'http://foo.com', code: 'bar' } } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      rrType.unfold(fisher);
      const rrTypeCoding = observation.elements.find(
        e => e.id === 'Observation.referenceRange.type.coding'
      );
      const clone = cloneDeep(rrTypeCoding);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(clone).toEqual(rrTypeCoding);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a Coding fixed to a different code by a parent by fixed[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically fixed[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.fixedBackboneElement = { type: { coding: { system: 'http://foo.com', code: 'bar' } } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      rrType.unfold(fisher);
      const rrTypeCoding = observation.elements.find(
        e => e.id === 'Observation.referenceRange.type.coding'
      );
      const clone = cloneDeep(rrTypeCoding);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(clone).toEqual(rrTypeCoding);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      // Setup original fixed code
      coding.fixValue(fooBarCode, true);
      const clone = cloneDeep(coding);
      expect(() => {
        clone.fixValue(fooBarCode);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedCoding.'
      );
      expect(clone).toEqual(coding);
    });

    it('should fix a code to a code', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      code.fixValue(fooBarCode);
      expect(code.patternCode).toBe('bar');
      expect(code.fixedCode).toBeUndefined();
    });

    it('should fix a code to a code (exactly)', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      code.fixValue(fooBarCode, true);
      expect(code.fixedCode).toBe('bar');
      expect(code.patternCode).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a code fixed to a different code by pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      // Setup original fixed code
      code.fixValue(fooBarCode);
      const clone = cloneDeep(code);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(clone).toEqual(code);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a code fixed to a different code by fixed[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      // Setup original fixed code
      code.fixValue(fooBarCode, true);
      const clone = cloneDeep(code);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(clone).toEqual(code);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a code fixed to a different code by a parent by pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const codeCodingCode = observation.elements.find(
        e => e.id === 'Observation.code.coding.code'
      );
      // Setup original fixed code
      code.fixValue(fooBarCode);
      const clone = cloneDeep(codeCodingCode);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(clone).toEqual(codeCodingCode);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a code fixed to a different code by a parent by fixed[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const codeCodingCode = observation.elements.find(
        e => e.id === 'Observation.code.coding.code'
      );
      // Setup original fixed code
      code.fixValue(fooBarCode, true);
      const clone = cloneDeep(codeCodingCode);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(clone).toEqual(codeCodingCode);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const codeCodingCode = observation.elements.find(
        e => e.id === 'Observation.code.coding.code'
      );
      // Setup original fixed code
      codeCodingCode.fixValue(fooBarCode, true);
      const clone = cloneDeep(codeCodingCode);
      expect(() => {
        clone.fixValue(fooBarCode);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedCode.'
      );
      expect(clone).toEqual(codeCodingCode);
    });

    it('should fix a code to a Quantity', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.fixValue(fooBarCode);
      expect(quantity.patternQuantity).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(quantity.fixedQuantity).toBeUndefined();
    });

    it('should fix a code to a Quantity (exactly)', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.fixValue(fooBarCode, true);
      expect(quantity.fixedQuantity).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(quantity.patternQuantity).toBeUndefined();
    });

    it('should fix a code with a display to a Quantity', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.fixValue(codeWithDisplay);
      expect(quantity.patternQuantity).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        unit: 'Foo Bar'
      });
      expect(quantity.fixedQuantity).toBeUndefined();
    });

    it('should fix a code with a display to a Quantity (exactly)', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.fixValue(codeWithDisplay, true);
      expect(quantity.fixedQuantity).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        unit: 'Foo Bar'
      });
      expect(quantity.patternQuantity).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a Quantity fixed to a different code by pattern[x]', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      // Setup original fixed code
      quantity.fixValue(fooBarCode);
      const clone = cloneDeep(quantity);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(clone).toEqual(quantity);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a Quantity fixed to a different code by fixed[x]', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      // Setup original fixed code
      quantity.fixValue(fooBarCode, true);
      const clone = cloneDeep(quantity);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(clone).toEqual(quantity);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a Quantity fixed to a different code by a parent be pattern[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically pattern[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.patternBackboneElement = { low: { system: 'http://foo.com', code: 'bar' } };
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      const clone = cloneDeep(rrLow);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(clone).toEqual(rrLow);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a Quantity fixed to a different code by a parent be fixed[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically fixed[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.fixedBackboneElement = { low: { system: 'http://foo.com', code: 'bar' } };
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      const clone = cloneDeep(rrLow);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(clone).toEqual(rrLow);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      // Setup original fixed code
      quantity.fixValue(fooBarCode, true);
      const clone = cloneDeep(quantity);
      expect(() => {
        clone.fixValue(fooBarCode);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedQuantity.'
      );
      expect(clone).toEqual(quantity);
    });

    it('should fix a code to a string', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      string.fixValue(fooBarCode);
      expect(string.patternString).toBe('bar');
      expect(string.fixedString).toBeUndefined();
    });

    it('should fix a code to a string (exactly)', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      string.fixValue(fooBarCode, true);
      expect(string.fixedString).toBe('bar');
      expect(string.patternString).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a string fixed to a different string by pattern[x]', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      // Setup original fixed code
      string.fixValue(fooBarCode);
      const clone = cloneDeep(string);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(clone).toEqual(string);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a string fixed to a different string by fixed[x]', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      // Setup original fixed code
      string.fixValue(fooBarCode, true);
      const clone = cloneDeep(string);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(clone).toEqual(string);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a string fixed to a different string by a parent by pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.patternCodeableConcept = { text: 'http://foo.com#bar' };
      code.unfold(fisher);
      const string = observation.elements.find(e => e.id === 'Observation.code.text');
      // Setup original fixed code
      const clone = cloneDeep(string);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(clone).toEqual(string);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a string fixed to a different string by a parent by fixed[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.fixedCodeableConcept = { text: 'http://foo.com#bar' };
      code.unfold(fisher);
      const string = observation.elements.find(e => e.id === 'Observation.code.text');
      // Setup original fixed code
      const clone = cloneDeep(string);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(clone).toEqual(string);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      // Setup original fixed code
      string.fixValue(fooBarCode, true);
      const clone = cloneDeep(string);
      expect(() => {
        clone.fixValue(fooBarCode);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedString.'
      );
      expect(clone).toEqual(string);
    });

    it('should fix a code to a uri', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      uri.fixValue(fooBarCode);
      expect(uri.patternUri).toBe('bar');
      expect(uri.fixedUri).toBeUndefined();
    });

    it('should fix a code to a uri (exactly)', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      uri.fixValue(fooBarCode, true);
      expect(uri.fixedUri).toBe('bar');
      expect(uri.patternUri).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a uri fixed to a different uri by pattern[x]', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      // Setup original fixed code
      uri.fixValue(fooBarCode);
      const clone = cloneDeep(uri);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(clone).toEqual(uri);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a uri fixed to a different uri by fixed[x]', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      // Setup original fixed code
      uri.fixValue(fooBarCode, true);
      const clone = cloneDeep(uri);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(clone).toEqual(uri);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a uri fixed to a different uri by a parent by pattern[x]', () => {
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      rrLow.patternQuantity = { system: 'http://foo.com#bar' };
      rrLow.unfold(fisher);
      const uri = observation.elements.find(e => e.id === 'Observation.referenceRange.low.system');
      const clone = cloneDeep(uri);
      expect(() => {
        clone.fixValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(clone).toEqual(uri);
    });

    it('should throw ValueAlreadyFixedError when fixing a code to a uri fixed to a different uri by a parent by fixed[x]', () => {
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      rrLow.patternQuantity = { system: 'http://foo.com#bar' };
      rrLow.unfold(fisher);
      const uri = observation.elements.find(e => e.id === 'Observation.referenceRange.low.system');
      const clone = cloneDeep(uri);
      expect(() => {
        clone.fixValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(clone).toEqual(uri);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      // Setup original fixed code
      uri.fixValue(fooBarCode, true);
      const clone = cloneDeep(uri);
      expect(() => {
        clone.fixValue(fooBarCode);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedUri.'
      );
      expect(clone).toEqual(uri);
    });

    it('should throw CodedTypeNotFoundError when binding to an unsupported type', () => {
      const instant = observation.elements.find(e => e.id === 'Observation.issued');
      const clone = cloneDeep(instant);
      expect(() => {
        clone.fixValue(fooBarCode);
      }).toThrow(/instant/);
      expect(() => {
        clone.fixValue(fooBarCode, true);
      }).toThrow(/instant/);
      expect(clone).toEqual(instant);
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(fooBarCode);
      }).toThrow(
        'Cannot fix Code value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.fixValue(fooBarCode, true);
      }).toThrow(
        'Cannot fix Code value on this element since this element does not have a single type'
      );
    });
  });
});
