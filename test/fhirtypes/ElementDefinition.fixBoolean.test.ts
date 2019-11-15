import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let jsonLocation: any;
  let observation: StructureDefinition;
  let location: StructureDefinition;

  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
    jsonLocation = defs.findResource('Location');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    location = StructureDefinition.fromJSON(jsonLocation);
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

    it('should throw PrimitiveValueAlreadyFixedError when the value is fixed to a different value', () => {
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
      }).toThrow('Cannot fix boolean value true on element of type code; types do not match.');
    });
  });
});
