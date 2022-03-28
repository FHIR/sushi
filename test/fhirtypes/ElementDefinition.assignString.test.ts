import path from 'path';
import fs from 'fs-extra';
import { cloneDeep } from 'lodash';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition, ElementDefinition } from '../../src/fhirtypes';
import { TestFisher } from '../testhelpers';
import { loggerSpy } from '../testhelpers/loggerSpy';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let medication: StructureDefinition;
  let patient: StructureDefinition;
  let riskEvidenceSynthesis: StructureDefinition;
  let location: StructureDefinition;
  let capabilityStatement: StructureDefinition;
  let imagingStudy: StructureDefinition;
  let device: StructureDefinition;
  let task: StructureDefinition;
  let binary: StructureDefinition;
  let fisher: TestFisher;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    medication = fisher.fishForStructureDefinition('Medication');
    patient = fisher.fishForStructureDefinition('Patient');
    riskEvidenceSynthesis = fisher.fishForStructureDefinition('RiskEvidenceSynthesis');
    location = fisher.fishForStructureDefinition('Location');
    capabilityStatement = fisher.fishForStructureDefinition('CapabilityStatement');
    imagingStudy = fisher.fishForStructureDefinition('ImagingStudy');
    device = fisher.fishForStructureDefinition('Device');
    task = fisher.fishForStructureDefinition('Task');
    binary = fisher.fishForStructureDefinition('Binary');
  });
  describe('#assignString', () => {
    // Assigning a string
    it('should assign a string to a string', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.assignValue('foo bar');
      expect(batchLotNumber.patternString).toBe('foo bar');
      expect(batchLotNumber.fixedString).toBeUndefined();
    });

    it('should assign a string to a string (exactly)', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.assignValue('foo bar', true);
      expect(batchLotNumber.fixedString).toBe('foo bar');
      expect(batchLotNumber.patternString).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned string by pattern[x]', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.assignValue('foo bar');
      expect(batchLotNumber.patternString).toBe('foo bar');
      expect(() => {
        batchLotNumber.assignValue('bar foo');
      }).toThrow(
        'Cannot assign "bar foo" to this element; a different string is already assigned: "foo bar".'
      );
      expect(() => {
        batchLotNumber.assignValue('bar foo', true);
      }).toThrow(
        'Cannot assign "bar foo" to this element; a different string is already assigned: "foo bar".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned string by fixed[x]', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.assignValue('foo bar', true);
      expect(batchLotNumber.fixedString).toBe('foo bar');
      expect(() => {
        batchLotNumber.assignValue('bar foo', true);
      }).toThrow(
        'Cannot assign "bar foo" to this element; a different string is already assigned: "foo bar".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a decimal to a different value set in a parent by pattern[x]', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // @ts-ignore
      identifier.patternIdentifier = { value: 'Foo' };
      identifier.unfold(fisher);
      const identifierValue = observation.elements.find(
        e => e.id === 'Observation.identifier.value'
      );
      const clone = cloneDeep(identifierValue);
      expect(() => {
        identifierValue.assignValue('Bar');
      }).toThrow(
        'Cannot assign "Bar" to this element; a different string is already assigned: "Foo".'
      );
      expect(() => {
        identifierValue.assignValue('Bar', true);
      }).toThrow(
        'Cannot assign "Bar" to this element; a different string is already assigned: "Foo".'
      );
      expect(clone).toEqual(identifierValue);
    });

    it('should throw ValueAlreadyAssignedError when assigning a decimal to a different value set in a parent by fixed[x]', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // @ts-ignore
      identifier.fixedIdentifier = { value: 'Foo' };
      identifier.unfold(fisher);
      const identifierValue = observation.elements.find(
        e => e.id === 'Observation.identifier.value'
      );
      const clone = cloneDeep(identifierValue);
      expect(() => {
        identifierValue.assignValue('Bar');
      }).toThrow(
        'Cannot assign "Bar" to this element; a different string is already assigned: "Foo".'
      );
      expect(() => {
        identifierValue.assignValue('Bar', true);
      }).toThrow(
        'Cannot assign "Bar" to this element; a different string is already assigned: "Foo".'
      );
      expect(clone).toEqual(identifierValue);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.assignValue('foo bar', true);
      expect(batchLotNumber.fixedString).toBe('foo bar');
      expect(() => {
        batchLotNumber.assignValue('foo bar');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedString.'
      );
    });

    // Assigning a URI
    it('should assign a string to a uri', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.assignValue('http://example.org');
      expect(url.patternUri).toBe('http://example.org');
      expect(url.fixedUri).toBeUndefined();
    });

    it('should assign a string to a uri (exactly)', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.assignValue('http://example.org', true);
      expect(url.fixedUri).toBe('http://example.org');
      expect(url.patternUri).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned uri by pattern[x]', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.assignValue('http://example.org');
      expect(url.patternUri).toBe('http://example.org');
      expect(() => {
        url.assignValue('http://newexample.com');
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different uri is already assigned: "http://example.org".'
      );
      expect(() => {
        url.assignValue('http://newexample.com', true);
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different uri is already assigned: "http://example.org".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned uri by fixed[x]', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.assignValue('http://example.org', true);
      expect(url.fixedUri).toBe('http://example.org');
      expect(() => {
        url.assignValue('http://newexample.com', true);
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different uri is already assigned: "http://example.org".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.assignValue('http://example.org', true);
      expect(url.fixedUri).toBe('http://example.org');
      expect(() => {
        url.assignValue('http://example.com');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedUri.'
      );
    });

    it('should throw MismatchedTypeError when assigning a uri to an incorrect value', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      expect(() => {
        url.assignValue(' ');
      }).toThrow('Cannot assign string value:  . Value does not match element type: uri');
      expect(() => {
        url.assignValue(' ', true);
      }).toThrow('Cannot assign string value:  . Value does not match element type: uri');
    });

    // Assigning a URL
    it('should assign a string to a url', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.assignValue('http://example.org');
      expect(url.patternUrl).toBe('http://example.org');
      expect(url.fixedUrl).toBeUndefined();
    });

    it('should assign a string to a url (exactly)', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.assignValue('http://example.org', true);
      expect(url.fixedUrl).toBe('http://example.org');
      expect(url.patternUrl).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned URL by pattern[x]', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.assignValue('http://example.org');
      expect(url.patternUrl).toBe('http://example.org');
      expect(() => {
        url.assignValue('http://newexample.com');
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different url is already assigned: "http://example.org".'
      );
      expect(() => {
        url.assignValue('http://newexample.com', true);
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different url is already assigned: "http://example.org".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned URL by fixed[x]', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.assignValue('http://example.org', true);
      expect(url.fixedUrl).toBe('http://example.org');
      expect(() => {
        url.assignValue('http://newexample.com', true);
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different url is already assigned: "http://example.org".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.assignValue('http://example.org', true);
      expect(url.fixedUrl).toBe('http://example.org');
      expect(() => {
        url.assignValue('http://newexample.com');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedUrl.'
      );
    });

    it('should throw MismatchedTypeError when assigning a url to an incorrect value', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      expect(() => {
        url.assignValue(' ');
      }).toThrow('Cannot assign string value:  . Value does not match element type: url');
      expect(() => {
        url.assignValue(' ', true);
      }).toThrow('Cannot assign string value:  . Value does not match element type: url');
    });

    // Assigning a canonical
    it('should assign a string to a canonical', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.assignValue('http://example.org');
      expect(instantiates.patternCanonical).toBe('http://example.org');
      expect(instantiates.fixedCanonical).toBeUndefined();
    });

    it('should assign a string to a canonical (exactly)', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.assignValue('http://example.org', true);
      expect(instantiates.fixedCanonical).toBe('http://example.org');
      expect(instantiates.patternCanonical).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned canonical by pattern[x]', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.assignValue('http://example.org');
      expect(instantiates.patternCanonical).toBe('http://example.org');
      expect(() => {
        instantiates.assignValue('http://newexample.com');
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different canonical is already assigned: "http://example.org".'
      );
      expect(() => {
        instantiates.assignValue('http://newexample.com', true);
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different canonical is already assigned: "http://example.org".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned canonical by fixed[x]', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.assignValue('http://example.org', true);
      expect(instantiates.fixedCanonical).toBe('http://example.org');
      expect(() => {
        instantiates.assignValue('http://newexample.com', true);
      }).toThrow(
        'Cannot assign "http://newexample.com" to this element; a different canonical is already assigned: "http://example.org".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.assignValue('http://example.org', true);
      expect(instantiates.fixedCanonical).toBe('http://example.org');
      expect(() => {
        instantiates.assignValue('http://example.com');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedCanonical.'
      );
    });

    it('should throw MismatchedTypeError when assigning a canonical to an incorrect value', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      expect(() => {
        instantiates.assignValue(' ');
      }).toThrow('Cannot assign string value:  . Value does not match element type: canonical');
      expect(() => {
        instantiates.assignValue(' ', true);
      }).toThrow('Cannot assign string value:  . Value does not match element type: canonical');
    });

    // Assigning a base64Binary
    it('should assign a string to a base64Binary', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.assignValue('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=');
      expect(udiCarrierCarrierAIDC.patternBase64Binary).toBe('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=');
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBeUndefined();
    });

    it('should assign a string to a base64Binary (exactly)', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.assignValue('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=', true);
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBe('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=');
      expect(udiCarrierCarrierAIDC.patternBase64Binary).toBeUndefined();
    });

    it('should assign a string utilizing binary adjunct to a base64Binary', () => {
      const dataElement = binary.elements.find(e => e.id === 'Binary.data');
      dataElement.assignValue('ig-loader-ExampleFile.txt');
      expect(dataElement.patternBase64Binary).toBe('ig-loader-ExampleFile.txt');
      expect(dataElement.fixedBase64Binary).toBeUndefined();
    });

    it('should assign a string utilizing binary adjunct to a base64Binary (exactly)', () => {
      const dataElement = binary.elements.find(e => e.id === 'Binary.data');
      dataElement.assignValue('ig-loader-ExampleFile.txt', true);
      expect(dataElement.fixedBase64Binary).toBe('ig-loader-ExampleFile.txt');
      expect(dataElement.patternBase64Binary).toBeUndefined();
    });

    it('should assign a very long string to a base64Binary', () => {
      const dataElement = binary.elements.find(e => e.id === 'Binary.data');
      const longValue = fs.readFileSync(path.join(__dirname, 'fixtures', 'imgdata.txt'), {
        encoding: 'base64'
      });
      dataElement.assignValue(longValue);
      expect(dataElement.patternBase64Binary).toBe(longValue);
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned base64Binary by pattern[x]', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.assignValue('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=');
      expect(udiCarrierCarrierAIDC.patternBase64Binary).toBe('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=');
      expect(() => {
        udiCarrierCarrierAIDC.assignValue('dGhpcyB0b28=');
      }).toThrow(
        'Cannot assign "dGhpcyB0b28=" to this element; a different base64Binary is already assigned: "QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=".'
      );
      expect(() => {
        udiCarrierCarrierAIDC.assignValue('dGhpcyB0b28=', true);
      }).toThrow(
        'Cannot assign "dGhpcyB0b28=" to this element; a different base64Binary is already assigned: "QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned base64Binary by fixed[x]', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.assignValue('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=', true);
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBe('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=');
      expect(() => {
        udiCarrierCarrierAIDC.assignValue('dGhpcyB0b28=', true);
      }).toThrow(
        'Cannot assign "dGhpcyB0b28=" to this element; a different base64Binary is already assigned: "QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.assignValue('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=', true);
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBe('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=');
      expect(() => {
        udiCarrierCarrierAIDC.assignValue('QXJlIHdlIHRoZSBzdWJqZWN0cz8/P+w=');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedBase64Binary.'
      );
    });

    it('should throw MismatchedTypeError when assigning a base64Binary to an incorrect value', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      expect(() => {
        udiCarrierCarrierAIDC.assignValue('Not valid');
      }).toThrow(
        'Cannot assign string value: Not valid. Value does not match element type: base64Binary'
      );
      expect(() => {
        udiCarrierCarrierAIDC.assignValue('Not valid', true);
      }).toThrow(
        'Cannot assign string value: Not valid. Value does not match element type: base64Binary'
      );
    });

    // Assigning an instant
    it('should assign a string to an instant', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.assignValue('2015-02-07T13:28:17.239+02:00');
      expect(issued.patternInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(issued.fixedInstant).toBeUndefined();
    });

    it('should assign a string to an instant (exactly)', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.assignValue('2015-02-07T13:28:17.239+02:00', true);
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(issued.patternInstant).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned instant by pattern[x]', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.assignValue('2015-02-07T13:28:17.239+02:00');
      expect(issued.patternInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(() => {
        issued.assignValue('2016-02-07T13:28:17.239+02:00');
      }).toThrow(
        'Cannot assign "2016-02-07T13:28:17.239+02:00" to this element; a different instant is already assigned: "2015-02-07T13:28:17.239+02:00".'
      );
      expect(() => {
        issued.assignValue('2016-02-07T13:28:17.239+02:00', true);
      }).toThrow(
        'Cannot assign "2016-02-07T13:28:17.239+02:00" to this element; a different instant is already assigned: "2015-02-07T13:28:17.239+02:00".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned instant by fixed[x]', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.assignValue('2015-02-07T13:28:17.239+02:00', true);
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(() => {
        issued.assignValue('2016-02-07T13:28:17.239+02:00', true);
      }).toThrow(
        'Cannot assign "2016-02-07T13:28:17.239+02:00" to this element; a different instant is already assigned: "2015-02-07T13:28:17.239+02:00".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.assignValue('2015-02-07T13:28:17.239+02:00', true);
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(() => {
        issued.assignValue('2015-02-07T13:28:17.239+02:00');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedInstant.'
      );
    });

    it('should throw MismatchedTypeError when assigning an instant to an incorrect value', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      expect(() => {
        issued.assignValue('2015-02-07');
      }).toThrow(
        'Cannot assign string value: 2015-02-07. Value does not match element type: instant'
      );
      expect(() => {
        issued.assignValue('2015-02-07', true);
      }).toThrow(
        'Cannot assign string value: 2015-02-07. Value does not match element type: instant'
      );
    });

    // Assigning a date
    it('should assign a string to a date', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.assignValue('1905-08-23');
      expect(birthDate.patternDate).toBe('1905-08-23');
      expect(birthDate.fixedDate).toBeUndefined();
    });

    it('should assign a string to a date (exactly)', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.assignValue('1905-08-23', true);
      expect(birthDate.fixedDate).toBe('1905-08-23');
      expect(birthDate.patternDate).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned date by pattern[x]', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.assignValue('1905-08-23');
      expect(birthDate.patternDate).toBe('1905-08-23');
      expect(() => {
        birthDate.assignValue('1905-08-24');
      }).toThrow(
        'Cannot assign "1905-08-24" to this element; a different date is already assigned: "1905-08-23".'
      );
      expect(() => {
        birthDate.assignValue('1905-08-24', true);
      }).toThrow(
        'Cannot assign "1905-08-24" to this element; a different date is already assigned: "1905-08-23".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned date by fixed[x]', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.assignValue('1905-08-23', true);
      expect(birthDate.fixedDate).toBe('1905-08-23');
      expect(() => {
        birthDate.assignValue('1905-08-24', true);
      }).toThrow(
        'Cannot assign "1905-08-24" to this element; a different date is already assigned: "1905-08-23".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.assignValue('1905-08-23', true);
      expect(birthDate.fixedDate).toBe('1905-08-23');
      expect(() => {
        birthDate.assignValue('1905-08-23');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedDate.'
      );
    });

    it('should throw MismatchedTypeError when assigning a date to an incorrect value', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      expect(() => {
        birthDate.assignValue('2016-02-07T13:28:17.239+02:00');
      }).toThrow(
        'Cannot assign string value: 2016-02-07T13:28:17.239+02:00. Value does not match element type: date'
      );
      expect(() => {
        birthDate.assignValue('2016-02-07T13:28:17.239+02:00', true);
      }).toThrow(
        'Cannot assign string value: 2016-02-07T13:28:17.239+02:00. Value does not match element type: date'
      );
    });

    // Assigning a dateTime
    it('should assign a string to a dateTime', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.assignValue('2015-02-07T13:28:17-05:00');
      expect(date.patternDateTime).toBe('2015-02-07T13:28:17-05:00');
      expect(date.fixedDateTime).toBeUndefined();
    });

    it('should assign a string to a dateTime (exactly)', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.assignValue('2015-02-07T13:28:17-05:00', true);
      expect(date.fixedDateTime).toBe('2015-02-07T13:28:17-05:00');
      expect(date.patternDateTime).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned dateTime by pattern[x]', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.assignValue('1905-08-23');
      expect(date.patternDateTime).toBe('1905-08-23');
      expect(() => {
        date.assignValue('1905-08-24');
      }).toThrow(
        'Cannot assign "1905-08-24" to this element; a different dateTime is already assigned: "1905-08-23".'
      );
      expect(() => {
        date.assignValue('1905-08-24', true);
      }).toThrow(
        'Cannot assign "1905-08-24" to this element; a different dateTime is already assigned: "1905-08-23".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned dateTime by fixed[x]', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.assignValue('1905-08-23', true);
      expect(date.fixedDateTime).toBe('1905-08-23');
      expect(() => {
        date.assignValue('1905-08-24', true);
      }).toThrow(
        'Cannot assign "1905-08-24" to this element; a different dateTime is already assigned: "1905-08-23".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.assignValue('1905-08-23', true);
      expect(date.fixedDateTime).toBe('1905-08-23');
      expect(() => {
        date.assignValue('1905-08-23');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedDateTime.'
      );
    });

    it('should throw MismatchedTypeError when assigning a dateTime to an incorrect value', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      expect(() => {
        date.assignValue('hello there');
      }).toThrow(
        'Cannot assign string value: hello there. Value does not match element type: dateTime'
      );
      expect(() => {
        date.assignValue('hello there', true);
      }).toThrow(
        'Cannot assign string value: hello there. Value does not match element type: dateTime'
      );
    });

    // Assigning a time
    it('should assign a string to a time', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.assignValue('12:34:56');
      expect(hoursOfOperationClosingTime.patternTime).toBe('12:34:56');
      expect(hoursOfOperationClosingTime.fixedTime).toBeUndefined();
    });

    it('should assign a string to a time (exactly)', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.assignValue('12:34:56', true);
      expect(hoursOfOperationClosingTime.fixedTime).toBe('12:34:56');
      expect(hoursOfOperationClosingTime.patternTime).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned time by pattern[x]', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.assignValue('12:34:56');
      expect(hoursOfOperationClosingTime.patternTime).toBe('12:34:56');
      expect(() => {
        hoursOfOperationClosingTime.assignValue('12:34:57');
      }).toThrow(
        'Cannot assign "12:34:57" to this element; a different time is already assigned: "12:34:56".'
      );
      expect(() => {
        hoursOfOperationClosingTime.assignValue('12:34:57', true);
      }).toThrow(
        'Cannot assign "12:34:57" to this element; a different time is already assigned: "12:34:56".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned time by fixed[x]', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.assignValue('12:34:56', true);
      expect(hoursOfOperationClosingTime.fixedTime).toBe('12:34:56');
      expect(() => {
        hoursOfOperationClosingTime.assignValue('12:34:57', true);
      }).toThrow(
        'Cannot assign "12:34:57" to this element; a different time is already assigned: "12:34:56".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.assignValue('12:34:56', true);
      expect(hoursOfOperationClosingTime.fixedTime).toBe('12:34:56');
      expect(() => {
        hoursOfOperationClosingTime.assignValue('12:34:56');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedTime.'
      );
    });

    it('should throw MismatchedTypeError when assigning a time to an incorrect value', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      expect(() => {
        hoursOfOperationClosingTime.assignValue('hello there');
      }).toThrow(
        'Cannot assign string value: hello there. Value does not match element type: time'
      );
      expect(() => {
        hoursOfOperationClosingTime.assignValue('hello there', true);
      }).toThrow(
        'Cannot assign string value: hello there. Value does not match element type: time'
      );
    });

    // Assigning an oid
    it('should assign a string to an oid', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.assignValue('urn:oid:1.2.3.4.5');
      expect(inputValueOid.patternOid).toBe('urn:oid:1.2.3.4.5');
      expect(inputValueOid.fixedOid).toBeUndefined();
    });

    it('should assign a string to an oid (exactly)', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.assignValue('urn:oid:1.2.3.4.5', true);
      expect(inputValueOid.fixedOid).toBe('urn:oid:1.2.3.4.5');
      expect(inputValueOid.patternOid).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned oid by pattern[x]', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.assignValue('urn:oid:1.2.3.4.5');
      expect(inputValueOid.patternOid).toBe('urn:oid:1.2.3.4.5');
      expect(() => {
        inputValueOid.assignValue('urn:oid:1.4.3.2.1');
      }).toThrow(
        'Cannot assign "urn:oid:1.4.3.2.1" to this element; a different oid is already assigned: "urn:oid:1.2.3.4.5".'
      );
      expect(() => {
        inputValueOid.assignValue('urn:oid:1.4.3.2.1', true);
      }).toThrow(
        'Cannot assign "urn:oid:1.4.3.2.1" to this element; a different oid is already assigned: "urn:oid:1.2.3.4.5".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned oid by fixed[x]', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.assignValue('urn:oid:1.2.3.4.5', true);
      expect(inputValueOid.fixedOid).toBe('urn:oid:1.2.3.4.5');
      expect(() => {
        inputValueOid.assignValue('urn:oid:1.4.3.2.1', true);
      }).toThrow(
        'Cannot assign "urn:oid:1.4.3.2.1" to this element; a different oid is already assigned: "urn:oid:1.2.3.4.5".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.assignValue('urn:oid:1.2.3.4.5', true);
      expect(inputValueOid.fixedOid).toBe('urn:oid:1.2.3.4.5');
      expect(() => {
        inputValueOid.assignValue('urn:oid:1.2.3.4.5');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedOid.'
      );
    });

    it('should throw MismatchedTypeError when assigning an oid to an incorrect value', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      expect(() => {
        inputValueOid.assignValue('invalid oid');
      }).toThrow('Cannot assign string value: invalid oid. Value does not match element type: oid');
      expect(() => {
        inputValueOid.assignValue('invalid oid', true);
      }).toThrow('Cannot assign string value: invalid oid. Value does not match element type: oid');
    });

    // Assigning an id
    it('should assign a string to an id', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.assignValue('uniqueId123');
      expect(uid.patternId).toBe('uniqueId123');
      expect(uid.fixedId).toBeUndefined();
    });

    it('should assign a string to an id (exactly)', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.assignValue('uniqueId123', true);
      expect(uid.fixedId).toBe('uniqueId123');
      expect(uid.patternId).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned id by pattern[x]', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.assignValue('uniqueId123');
      expect(uid.patternId).toBe('uniqueId123');
      expect(() => {
        uid.assignValue('anotherUniqueId321');
      }).toThrow(
        'Cannot assign "anotherUniqueId321" to this element; a different id is already assigned: "uniqueId123".'
      );
      expect(() => {
        uid.assignValue('anotherUniqueId321', true);
      }).toThrow(
        'Cannot assign "anotherUniqueId321" to this element; a different id is already assigned: "uniqueId123".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned id by fixed[x]', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.assignValue('uniqueId123', true);
      expect(uid.fixedId).toBe('uniqueId123');
      expect(() => {
        uid.assignValue('anotherUniqueId321', true);
      }).toThrow(
        'Cannot assign "anotherUniqueId321" to this element; a different id is already assigned: "uniqueId123".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.assignValue('uniqueId123', true);
      expect(uid.fixedId).toBe('uniqueId123');
      expect(() => {
        uid.assignValue('uniqueId123');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedId.'
      );
    });

    it('should throw MismatchedTypeError when assigning an id to an incorrect value', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      expect(() => {
        uid.assignValue('invalid id');
      }).toThrow('Cannot assign string value: invalid id. Value does not match element type: id');
      expect(() => {
        uid.assignValue('invalid id', true);
      }).toThrow('Cannot assign string value: invalid id. Value does not match element type: id');
    });

    // Assigning markdown
    it('should assign a string to a markdown', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.assignValue('`This is code`');
      expect(description.patternMarkdown).toBe('`This is code`');
      expect(description.fixedMarkdown).toBeUndefined();
    });

    it('should assign a string to a markdown (exactly)', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.assignValue('`This is code`', true);
      expect(description.fixedMarkdown).toBe('`This is code`');
      expect(description.patternMarkdown).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned markdown by pattern[x]', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.assignValue('some text');
      expect(description.patternMarkdown).toBe('some text');
      expect(() => {
        description.assignValue('other text');
      }).toThrow(
        'Cannot assign "other text" to this element; a different markdown is already assigned: "some text".'
      );
      expect(() => {
        description.assignValue('other text', true);
      }).toThrow(
        'Cannot assign "other text" to this element; a different markdown is already assigned: "some text".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned markdown by fixed[x]', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.assignValue('some text', true);
      expect(description.fixedMarkdown).toBe('some text');
      expect(() => {
        description.assignValue('other text', true);
      }).toThrow(
        'Cannot assign "other text" to this element; a different markdown is already assigned: "some text".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.assignValue('some text', true);
      expect(description.fixedMarkdown).toBe('some text');
      expect(() => {
        description.assignValue('some text');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedMarkdown.'
      );
    });

    // Assigning uuid
    it('should assign a string to a uuid', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.assignValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.patternUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.fixedUuid).toBeUndefined();
    });

    it('should assign a string to a uuid (exactly)', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.assignValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520', true);
      expect(inputValueUuid.fixedUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.patternUuid).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned uuid by pattern[x]', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.assignValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.patternUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(() => {
        inputValueUuid.assignValue('urn:uuid:c123456d-ec9a-4326-a141-556f43239520');
      }).toThrow(
        'Cannot assign "urn:uuid:c123456d-ec9a-4326-a141-556f43239520" to this element; a different uuid is already assigned: "urn:uuid:c757873d-ec9a-4326-a141-556f43239520".'
      );
      expect(() => {
        inputValueUuid.assignValue('urn:uuid:c123456d-ec9a-4326-a141-556f43239520', true);
      }).toThrow(
        'Cannot assign "urn:uuid:c123456d-ec9a-4326-a141-556f43239520" to this element; a different uuid is already assigned: "urn:uuid:c757873d-ec9a-4326-a141-556f43239520".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned uuid by fixed[x]', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.assignValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520', true);
      expect(inputValueUuid.fixedUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(() => {
        inputValueUuid.assignValue('urn:uuid:c123456d-ec9a-4326-a141-556f43239520', true);
      }).toThrow(
        'Cannot assign "urn:uuid:c123456d-ec9a-4326-a141-556f43239520" to this element; a different uuid is already assigned: "urn:uuid:c757873d-ec9a-4326-a141-556f43239520".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.assignValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520', true);
      expect(inputValueUuid.fixedUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(() => {
        inputValueUuid.assignValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedUuid.'
      );
    });

    // Assigning xhtml

    it('should assign a string to an xhtml', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.assignValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      expect(narrativeDiv.patternXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
    });

    it('should assign a string to an xhtml (exactly)', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.assignValue(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>',
        true
      );
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
    });

    it('should assign a string to an xhtml and collapse whitespace', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.assignValue(
        `<div xmlns="http://www.w3.org/1999/xhtml">

        Twas     brillig
        and the   slithy             toves


        </div>`
      );
      expect(narrativeDiv.patternXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig and the slithy toves</div>'
      );
    });

    it('should assign a string to an xhtml and collapse whitespace (exactly)', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.assignValue(
        `<div xmlns="http://www.w3.org/1999/xhtml">

        Twas     brillig
        and the   slithy             toves


        </div>`,
        true
      );
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig and the slithy toves</div>'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned xhtml by pattern[x]', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.assignValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      expect(narrativeDiv.patternXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
      expect(() => {
        narrativeDiv.assignValue(
          '<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>'
        );
      }).toThrow(
        'Cannot assign "<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>" to this element; a different xhtml is already assigned: "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">Twas brillig</div>".'
      );
      expect(() => {
        narrativeDiv.assignValue(
          '<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>',
          true
        );
      }).toThrow(
        'Cannot assign "<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>" to this element; a different xhtml is already assigned: "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">Twas brillig</div>".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned xhtml by fixed[x]', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.assignValue(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>',
        true
      );
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
      expect(() => {
        narrativeDiv.assignValue(
          '<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>',
          true
        );
      }).toThrow(
        'Cannot assign "<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>" to this element; a different xhtml is already assigned: "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">Twas brillig</div>".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.assignValue(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>',
        true
      );
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
      expect(() => {
        narrativeDiv.assignValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedXhtml.'
      );
    });

    it('should throw MismatchedTypeError when assigning to a value that is not valid xhtml', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      expect(() => {
        narrativeDiv.assignValue('This is no good');
      }).toThrow(
        'Cannot assign string value: This is no good. Value does not match element type: xhtml'
      );
      expect(() => {
        narrativeDiv.assignValue('This is no good', true);
      }).toThrow(
        'Cannot assign string value: This is no good. Value does not match element type: xhtml'
      );
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.assignValue('hello');
      }).toThrow(
        'Cannot assign string value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.assignValue('hello', true);
      }).toThrow(
        'Cannot assign string value on this element since this element does not have a single type'
      );
      expect(valueX.patternString).toBeUndefined();
      expect(valueX.fixedString).toBeUndefined();
    });
    describe('#integer64', () => {
      let valueX: ElementDefinition;
      let valueInteger64: ElementDefinition;
      beforeAll(() => {
        const r5Extension = StructureDefinition.fromJSON(
          JSON.parse(
            fs.readFileSync(
              path.join(
                __dirname,
                '..',
                'testhelpers',
                'testdefs',
                'r5-definitions',
                'package',
                'StructureDefinition-Extension.json'
              ),
              'utf-8'
            )
          )
        );
        valueX = r5Extension.elements.find(e => e.id === 'Extension.value[x]');
      });

      beforeEach(() => {
        valueInteger64 = cloneDeep(valueX);
        valueInteger64.type = valueInteger64.type.filter(t => t.code === 'integer64');
      });

      // assigning an integer64
      // NOTE: Tests of assigning an integer64 as a number are in ElementDefinition.assignNumber.test.ts
      it('should assign an integer string to an integer64', () => {
        valueInteger64.assignValue('123');
        expect(valueInteger64.patternInteger64).toBe('123');
        expect(valueInteger64.fixedInteger64).toBeUndefined();
      });

      it('should assign an integer string to an integer64 (exactly)', () => {
        valueInteger64.assignValue('123', true);
        expect(valueInteger64.patternInteger64).toBeUndefined();
        expect(valueInteger64.fixedInteger64).toBe('123');
      });

      it('should throw MismatchedTypeError when assigning a decimal string to an integer64 value', () => {
        expect(() => {
          valueInteger64.assignValue('12.3');
        }).toThrow(
          'Cannot assign string value: 12.3. Value does not match element type: integer64'
        );
        expect(() => {
          valueInteger64.assignValue('12.3', true);
        }).toThrow(
          'Cannot assign string value: 12.3. Value does not match element type: integer64'
        );
      });

      it('should throw MismatchedTypeError when assigning a string to an integer64 value', () => {
        expect(() => {
          valueInteger64.assignValue('foo');
        }).toThrow('Cannot assign string value: foo. Value does not match element type: integer64');
      });
    });
  });
  describe('#checkXhtml', () => {
    beforeEach(() => {
      loggerSpy.reset();
    });
    it("should warn and throw when path doesn't start and end with div", () => {
      let didThrow = false;
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      try {
        narrativeDiv.assignValue('<piv xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      } catch (error) {
        didThrow = true;
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          'xhtml div elements should start and end with <div> tags for Patient.text.div'
        );
      }
      expect(didThrow).toBeTrue();
    });
    it("shouldn't warn when path starts and ends with div", () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.assignValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
    });
  });
});
