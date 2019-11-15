import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let jsonMedication: any;
  let jsonPatient: any;
  let jsonRiskEvidenceSynthesis: any;
  let jsonLocation: any;
  let observation: StructureDefinition;
  let medication: StructureDefinition;
  let patient: StructureDefinition;
  let riskEvidenceSynthesis: StructureDefinition;
  let location: StructureDefinition;

  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
    jsonMedication = defs.findResource('Medication');
    jsonPatient = defs.findResource('Patient');
    jsonRiskEvidenceSynthesis = defs.findResource('RiskEvidenceSynthesis');
    jsonLocation = defs.findResource('Location');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    patient = StructureDefinition.fromJSON(jsonPatient);
    medication = StructureDefinition.fromJSON(jsonMedication);
    riskEvidenceSynthesis = StructureDefinition.fromJSON(jsonRiskEvidenceSynthesis);
    location = StructureDefinition.fromJSON(jsonLocation);
  });
  describe('#fixString', () => {
    // Fixing a string
    it('should fix a string to a string', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.fixString('foo bar');
      expect(batchLotNumber.fixedString).toBe('foo bar');
    });

    it('should throw PrimitiveValueAlreadyFixedError when fixing an already fixed string', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.fixString('foo bar');
      expect(batchLotNumber.fixedString).toBe('foo bar');
      expect(() => {
        batchLotNumber.fixString('bar foo');
      }).toThrow(
        'Cannot fix bar foo to this element; a different string is already fixed: foo bar'
      );
    });

    // Fixing a URI
    it('should fix a string to a uri', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.fixString('http://example.org');
      expect(url.fixedUri).toBe('http://example.org');
    });

    it('should throw PrimitiveValueAlreadyFixedError when fixing an already fixed uri', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.fixString('http://example.org');
      expect(url.fixedUri).toBe('http://example.org');
      expect(() => {
        url.fixString('http://newexample.com');
      }).toThrow(
        'Cannot fix http://newexample.com to this element; a different uri is already fixed: http://example.org'
      );
    });

    it('should throw MismatchedTypeError when fixing a uri to an incorrect value', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      expect(() => {
        url.fixString(' ');
      }).toThrow('Cannot fix string value   on element of type uri; types do not match');
    });

    // Fixing an instant
    it('should fix a string to an instant', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.fixString('2015-02-07T13:28:17.239+02:00');
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
    });

    it('should throw PrimitiveValueAlreadyFixedError when fixing an already fixed instant', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.fixString('2015-02-07T13:28:17.239+02:00');
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(() => {
        issued.fixString('2016-02-07T13:28:17.239+02:00');
      }).toThrow(
        'Cannot fix 2016-02-07T13:28:17.239+02:00 to this element; a different instant is already fixed: 2015-02-07T13:28:17.239+02:00'
      );
    });

    it('should throw MismatchedTypeError when fixing an instant to an incorrect value', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      expect(() => {
        issued.fixString('2015-02-07');
      }).toThrow(
        'Cannot fix string value 2015-02-07 on element of type instant; types do not match'
      );
    });

    // Fixing a date
    it('should fix a string to a date', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.fixString('1905-08-23');
      expect(birthDate.fixedDate).toBe('1905-08-23');
    });

    it('should throw PrimitiveValueAlreadyFixedError when fixing an already fixed date', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.fixString('1905-08-23');
      expect(birthDate.fixedDate).toBe('1905-08-23');
      expect(() => {
        birthDate.fixString('1905-08-24');
      }).toThrow(
        'Cannot fix 1905-08-24 to this element; a different date is already fixed: 1905-08-23'
      );
    });

    it('should throw MismatchedTypeError when fixing a date to an incorrect value', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      expect(() => {
        birthDate.fixString('2016-02-07T13:28:17.239+02:00');
      }).toThrow(
        'Cannot fix string value 2016-02-07T13:28:17.239+02:00 on element of type date; types do not match'
      );
    });

    // Fixing a dateTime
    it('should fix a string to a dateTime', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.fixString('2015-02-07T13:28:17-05:00');
      expect(date.fixedDateTime).toBe('2015-02-07T13:28:17-05:00');
    });

    it('should throw PrimitiveValueAlreadyFixedError when fixing an already fixed dateTime', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.fixString('1905-08-23');
      expect(date.fixedDateTime).toBe('1905-08-23');
      expect(() => {
        date.fixString('1905-08-24');
      }).toThrow(
        'Cannot fix 1905-08-24 to this element; a different dateTime is already fixed: 1905-08-23'
      );
    });

    it('should throw MismatchedTypeError when fixing a dateTime to an incorrect value', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      expect(() => {
        date.fixString('hello there');
      }).toThrow(
        'Cannot fix string value hello there on element of type dateTime; types do not match'
      );
    });

    // Fixing a time
    it('should fix a string to a time', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.fixString('12:34:56');
      expect(hoursOfOperationClosingTime.fixedTime).toBe('12:34:56');
    });

    it('should throw PrimitiveValueAlreadyFixedError when fixing an already fixed time', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.fixString('12:34:56');
      expect(hoursOfOperationClosingTime.fixedTime).toBe('12:34:56');
      expect(() => {
        hoursOfOperationClosingTime.fixString('12:34:57');
      }).toThrow(
        'Cannot fix 12:34:57 to this element; a different time is already fixed: 12:34:56'
      );
    });

    it('should throw MismatchedTypeError when fixing a time to an incorrect value', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      expect(() => {
        hoursOfOperationClosingTime.fixString('hello there');
      }).toThrow('Cannot fix string value hello there on element of type time; types do not match');
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixString('hello');
      }).toThrow(
        'Cannot fix string value on this element since this element does not have a single type'
      );
      expect(valueX.fixedString).toBeUndefined();
    });
  });
});
