import cloneDeep from 'lodash/cloneDeep';
import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
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
  });
});
