import cloneDeep from 'lodash/cloneDeep';
import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let jsonRespRate: any;
  let observation: StructureDefinition;
  let respRate: StructureDefinition;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
    jsonRespRate = defs.findResource('resprate');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    respRate = StructureDefinition.fromJSON(jsonRespRate);
  });

  describe('#constrainCardinality()', () => {
    it('should allow cardinality to be constrained to same cardinality', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      identifier.constrainCardinality(0, '*');
      expect(identifier.min).toBe(0);
      expect(identifier.max).toBe('*');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.constrainCardinality(0, '1');
      expect(issued.min).toBe(0);
      expect(issued.max).toBe('1');
    });

    it('should allow cardinality to be constrained to higher min', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to 1..*
      identifier.constrainCardinality(1, '*');
      expect(identifier.min).toBe(1);
      expect(identifier.max).toBe('*');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      // constrain 0..1 to 1..1
      issued.constrainCardinality(1, '1');
      expect(issued.min).toBe(1);
      expect(issued.max).toBe('1');
    });

    it('should allow cardinality to be constrained to lower max', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to 0..5
      identifier.constrainCardinality(0, '5');
      expect(identifier.min).toBe(0);
      expect(identifier.max).toBe('5');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      // constrain 0..1 to 0..0
      issued.constrainCardinality(0, '0');
      expect(issued.min).toBe(0);
      expect(issued.max).toBe('0');
    });

    it('should allow cardinality to be constrained to higher min and lower max at same time', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to 1..2
      identifier.constrainCardinality(1, '2');
      expect(identifier.min).toBe(1);
      expect(identifier.max).toBe('2');
    });

    it('should throw InvalidCardinalityError when min > max', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      const clone = cloneDeep(identifier);
      expect(() => {
        clone.constrainCardinality(2, '1');
      }).toThrow(/min 2 is > max 1\./);
      expect(clone).toEqual(identifier);
    });

    it('should throw WideningCardinalityError when min < original min', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = cloneDeep(status);
      expect(() => {
        // constrain 1..1 to 0..1
        clone.constrainCardinality(0, '1');
      }).toThrow(/0..1 is wider than 1..1\./);
      expect(clone).toEqual(status);
    });

    it('should throw WideningCardinalityError when max > original max', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = cloneDeep(status);
      expect(() => {
        // constrain 1..1 to 1..2
        clone.constrainCardinality(1, '2');
      }).toThrow(/1..2 is wider than 1..1\./);
      expect(clone).toEqual(status);
    });

    it('should throw WideningCardinalityError when min < original min and max > original max at the same time', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = cloneDeep(status);
      expect(() => {
        // constrain 1..1 to 0..2
        clone.constrainCardinality(0, '2');
      }).toThrow(/0..2 is wider than 1..1\./);
      expect(clone).toEqual(status);
    });

    // Slice Handling
    it('should update sliced element min when sum of slice mins is constrainted greater than it', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const fooSlice = category.addSlice('FooSlice');
      fooSlice.constrainCardinality(2, '2');
      expect(fooSlice.min).toBe(2);
      expect(fooSlice.max).toBe('2');
      expect(category.min).toBe(3);
    });

    it('should throw InvalidSumOfSliceMinsError when sliced element max is constrained less than sum of slice mins', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const fooSlice = category.addSlice('FooSlice');
      fooSlice.min = 1;
      const clone = cloneDeep(category);
      expect(() => {
        category.constrainCardinality(1, '1');
      }).toThrow(/2 > max 1 of Observation.category\./);
      expect(clone).toEqual(category);
    });

    it('should throw InvalidMaxOfSliceError when sliced element max is constrained less than any individual slice max', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const fooSlice = category.addSlice('FooSlice');
      fooSlice.max = '2';
      const clone = cloneDeep(category);
      expect(() => {
        category.constrainCardinality(1, '1');
      }).toThrow(/max 2 of slice FooSlice > max of sliced element 1\./);
      expect(clone).toEqual(category);
    });

    it('should throw InvalidSumOfSliceMinsError when sum of slice mins is constrained greater than sliced element max', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const fooSlice = category.addSlice('FooSlice');
      category.max = '2';
      const clone = cloneDeep(fooSlice);
      expect(() => {
        fooSlice.constrainCardinality(2, '2');
      }).toThrow(/3 > max 2 of Observation.category\./);
      expect(clone).toEqual(fooSlice);
    });
  });
});
