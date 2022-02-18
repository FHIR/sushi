import path from 'path';
import { cloneDeep } from 'lodash';
import { loadFromPath } from 'fhir-package-loader';
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
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    location = fisher.fishForStructureDefinition('Location');
  });

  describe('#assignBoolean', () => {
    it('should assign a boolean to a boolean', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.assignValue(true);
      expect(hoursOfOperationAllDay.patternBoolean).toBe(true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBeUndefined();
    });

    it('should assign a boolean to a boolean (exactly)', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.assignValue(true, true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      expect(hoursOfOperationAllDay.patternBoolean).toBeUndefined();
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.assignValue(true);
      }).toThrow(
        'Cannot assign boolean value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.assignValue(true, true);
      }).toThrow(
        'Cannot assign boolean value on this element since this element does not have a single type'
      );
      expect(valueX.patternBoolean).toBeUndefined();
      expect(valueX.fixedBoolean).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value by pattern[x]', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.assignValue(true);
      expect(hoursOfOperationAllDay.patternBoolean).toBe(true);
      hoursOfOperationAllDay.assignValue(true);
      expect(hoursOfOperationAllDay.patternBoolean).toBe(true);
      expect(() => {
        hoursOfOperationAllDay.assignValue(false);
      }).toThrow(
        'Cannot assign false to this element; a different boolean is already assigned: true.'
      );
      expect(() => {
        hoursOfOperationAllDay.assignValue(false, true);
      }).toThrow(
        'Cannot assign false to this element; a different boolean is already assigned: true.'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value by fixed[x]', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.assignValue(true, true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      hoursOfOperationAllDay.assignValue(true, true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      expect(() => {
        hoursOfOperationAllDay.assignValue(false, true);
      }).toThrow(
        'Cannot assign false to this element; a different boolean is already assigned: true.'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a boolean to a different value set in a parent by pattern[x]', () => {
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
        userSelected.assignValue(true);
      }).toThrow(
        'Cannot assign true to this element; a different boolean is already assigned: false.'
      );
      expect(() => {
        userSelected.assignValue(true, true);
      }).toThrow(
        'Cannot assign true to this element; a different boolean is already assigned: false.'
      );
      expect(clone).toEqual(userSelected);
    });

    it('should throw ValueAlreadyAssignedError when assigning a boolean to a different value set in a parent by fixed[x]', () => {
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
        userSelected.assignValue(true, true);
      }).toThrow(
        'Cannot assign true to this element; a different boolean is already assigned: false.'
      );
      expect(clone).toEqual(userSelected);
    });

    it('should throw AssignedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.assignValue(true, true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      expect(() => {
        hoursOfOperationAllDay.assignValue(true);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedBoolean.'
      );
    });

    it('should throw MismatchedTypeError when the value is assigned to a non-boolean', () => {
      const status = location.elements.find(e => e.id === 'Location.status');
      expect(() => {
        status.assignValue(true);
      }).toThrow('Cannot assign boolean value: true. Value does not match element type: code');
      expect(() => {
        status.assignValue(true, true);
      }).toThrow('Cannot assign boolean value: true. Value does not match element type: code');
    });
  });
});
