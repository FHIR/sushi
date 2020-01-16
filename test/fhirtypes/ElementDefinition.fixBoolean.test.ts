import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';
import path from 'path';

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
    fisher = new TestFisher(defs);
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
      hoursOfOperationAllDay.fixBoolean(true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixBoolean(true);
      }).toThrow(
        'Cannot fix boolean value on this element since this element does not have a single type'
      );
      expect(valueX.fixedBoolean).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value', () => {
      const hoursOfOperationAllDay = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.allDay'
      );
      hoursOfOperationAllDay.fixBoolean(true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      hoursOfOperationAllDay.fixBoolean(true);
      expect(hoursOfOperationAllDay.fixedBoolean).toBe(true);
      expect(() => {
        hoursOfOperationAllDay.fixBoolean(false);
      }).toThrow('Cannot fix false to this element; a different boolean is already fixed: true.');
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-boolean', () => {
      const status = location.elements.find(e => e.id === 'Location.status');
      expect(() => {
        status.fixBoolean(true);
      }).toThrow('Cannot fix boolean value: true. Value does not match element type: code');
    });
  });
});
