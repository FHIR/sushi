import path from 'path';
import { cloneDeep } from 'lodash';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let location: StructureDefinition;
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
    location = fisher.fishForStructureDefinition('Location');
  });

  describe('#fixBoolean', () => {
    it('should fix a boolean to a boolean', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.fixValue(true);
      expect(hoursOfOperationAllDay.patternBoolean).toBe(true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBeUndefined();
    });

    it('should fix a boolean to a boolean (exactly)', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.fixValue(true, true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      expect(hoursOfOperationAllDay.patternBoolean).toBeUndefined();
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(true);
      }).toThrow(
        'Cannot fix boolean value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.fixValue(true, true);
      }).toThrow(
        'Cannot fix boolean value on this element since this element does not have a single type'
      );
      expect(valueX.patternBoolean).toBeUndefined();
      expect(valueX.fixedBoolean).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value by pattern[x]', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.fixValue(true);
      expect(hoursOfOperationAllDay.patternBoolean).toBe(true);
      hoursOfOperationAllDay.fixValue(true);
      expect(hoursOfOperationAllDay.patternBoolean).toBe(true);
      expect(() => {
        hoursOfOperationAllDay.fixValue(false);
      }).toThrow('Cannot fix false to this element; a different boolean is already fixed: true.');
      expect(() => {
        hoursOfOperationAllDay.fixValue(false, true);
      }).toThrow('Cannot fix false to this element; a different boolean is already fixed: true.');
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value by fixed[x]', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.fixValue(true, true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      hoursOfOperationAllDay.fixValue(true, true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      expect(() => {
        hoursOfOperationAllDay.fixValue(false, true);
      }).toThrow('Cannot fix false to this element; a different boolean is already fixed: true.');
    });

    it('should throw ValueAlreadyFixedError when fixing a boolean to a different value set in a parent by pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.patternCodeableConcept = { coding: [{ userSelected: false }] };
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const userSelected = observation.elements.find(
        e => e.id === 'Observation.code.coding.userSelected'
      );
      const clone = cloneDeep(userSelected);
      expect(() => {
        userSelected.fixValue(true);
      }).toThrow('Cannot fix true to this element; a different boolean is already fixed: false.');
      expect(() => {
        userSelected.fixValue(true, true);
      }).toThrow('Cannot fix true to this element; a different boolean is already fixed: false.');
      expect(clone).toEqual(userSelected);
    });

    it('should throw ValueAlreadyFixedError when fixing a boolean to a different value set in a parent by fixed[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.fixedCodeableConcept = { coding: [{ userSelected: false }] };
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const userSelected = observation.elements.find(
        e => e.id === 'Observation.code.coding.userSelected'
      );
      const clone = cloneDeep(userSelected);
      expect(() => {
        userSelected.fixValue(true, true);
      }).toThrow('Cannot fix true to this element; a different boolean is already fixed: false.');
      expect(clone).toEqual(userSelected);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.fixValue(true, true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      expect(() => {
        hoursOfOperationAllDay.fixValue(true);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedBoolean.'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-boolean', () => {
      const status = location.elements.find(e => e.id === 'Location.status');
      expect(() => {
        status.fixValue(true);
      }).toThrow('Cannot fix boolean value: true. Value does not match element type: code');
      expect(() => {
        status.fixValue(true, true);
      }).toThrow('Cannot fix boolean value: true. Value does not match element type: code');
    });
  });
});
