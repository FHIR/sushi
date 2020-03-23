import path from 'path';
import { cloneDeep } from 'lodash';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';

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
    medication = fisher.fishForStructureDefinition('Medication');
    patient = fisher.fishForStructureDefinition('Patient');
    riskEvidenceSynthesis = fisher.fishForStructureDefinition('RiskEvidenceSynthesis');
    location = fisher.fishForStructureDefinition('Location');
    capabilityStatement = fisher.fishForStructureDefinition('CapabilityStatement');
    imagingStudy = fisher.fishForStructureDefinition('ImagingStudy');
    device = fisher.fishForStructureDefinition('Device');
    task = fisher.fishForStructureDefinition('Task');
  });
  describe('#fixString', () => {
    // Fixing a string
    it('should fix a string to a string', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.fixValue('foo bar');
      expect(batchLotNumber.patternString).toBe('foo bar');
      expect(batchLotNumber.fixedString).toBeUndefined();
    });

    it('should fix a string to a string (exactly)', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.fixValue('foo bar', true);
      expect(batchLotNumber.fixedString).toBe('foo bar');
      expect(batchLotNumber.patternString).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed string by pattern[x]', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.fixValue('foo bar');
      expect(batchLotNumber.patternString).toBe('foo bar');
      expect(() => {
        batchLotNumber.fixValue('bar foo');
      }).toThrow(
        'Cannot fix "bar foo" to this element; a different string is already fixed: "foo bar".'
      );
      expect(() => {
        batchLotNumber.fixValue('bar foo', true);
      }).toThrow(
        'Cannot fix "bar foo" to this element; a different string is already fixed: "foo bar".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed string by fixed[x]', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.fixValue('foo bar', true);
      expect(batchLotNumber.fixedString).toBe('foo bar');
      expect(() => {
        batchLotNumber.fixValue('bar foo', true);
      }).toThrow(
        'Cannot fix "bar foo" to this element; a different string is already fixed: "foo bar".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing a decimal to a different value set in a parent by pattern[x]', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // @ts-ignore
      identifier.patternIdentifier = { value: 'Foo' };
      identifier.unfold(fisher);
      const identifierValue = observation.elements.find(
        e => e.id === 'Observation.identifier.value'
      );
      const clone = cloneDeep(identifierValue);
      expect(() => {
        identifierValue.fixValue('Bar');
      }).toThrow('Cannot fix "Bar" to this element; a different string is already fixed: "Foo".');
      expect(() => {
        identifierValue.fixValue('Bar', true);
      }).toThrow('Cannot fix "Bar" to this element; a different string is already fixed: "Foo".');
      expect(clone).toEqual(identifierValue);
    });

    it('should throw ValueAlreadyFixedError when fixing a decimal to a different value set in a parent by fixed[x]', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // @ts-ignore
      identifier.fixedIdentifier = { value: 'Foo' };
      identifier.unfold(fisher);
      const identifierValue = observation.elements.find(
        e => e.id === 'Observation.identifier.value'
      );
      const clone = cloneDeep(identifierValue);
      expect(() => {
        identifierValue.fixValue('Bar');
      }).toThrow('Cannot fix "Bar" to this element; a different string is already fixed: "Foo".');
      expect(() => {
        identifierValue.fixValue('Bar', true);
      }).toThrow('Cannot fix "Bar" to this element; a different string is already fixed: "Foo".');
      expect(clone).toEqual(identifierValue);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const batchLotNumber = medication.elements.find(e => e.id === 'Medication.batch.lotNumber');
      batchLotNumber.fixValue('foo bar', true);
      expect(batchLotNumber.fixedString).toBe('foo bar');
      expect(() => {
        batchLotNumber.fixValue('foo bar');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedString.'
      );
    });

    // Fixing a URI
    it('should fix a string to a uri', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.fixValue('http://example.org');
      expect(url.patternUri).toBe('http://example.org');
      expect(url.fixedUri).toBeUndefined();
    });

    it('should fix a string to a uri (exactly)', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.fixValue('http://example.org', true);
      expect(url.fixedUri).toBe('http://example.org');
      expect(url.patternUri).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed uri by pattern[x]', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.fixValue('http://example.org');
      expect(url.patternUri).toBe('http://example.org');
      expect(() => {
        url.fixValue('http://newexample.com');
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different uri is already fixed: "http://example.org".'
      );
      expect(() => {
        url.fixValue('http://newexample.com', true);
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different uri is already fixed: "http://example.org".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed uri by fixed[x]', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.fixValue('http://example.org', true);
      expect(url.fixedUri).toBe('http://example.org');
      expect(() => {
        url.fixValue('http://newexample.com', true);
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different uri is already fixed: "http://example.org".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      url.fixValue('http://example.org', true);
      expect(url.fixedUri).toBe('http://example.org');
      expect(() => {
        url.fixValue('http://example.com');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedUri.'
      );
    });

    it('should throw MismatchedTypeError when fixing a uri to an incorrect value', () => {
      const url = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.url');
      expect(() => {
        url.fixValue(' ');
      }).toThrow('Cannot fix string value:  . Value does not match element type: uri');
      expect(() => {
        url.fixValue(' ', true);
      }).toThrow('Cannot fix string value:  . Value does not match element type: uri');
    });

    // Fixing a URL
    it('should fix a string to a url', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.fixValue('http://example.org');
      expect(url.patternUrl).toBe('http://example.org');
      expect(url.fixedUrl).toBeUndefined();
    });

    it('should fix a string to a url (exactly)', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.fixValue('http://example.org', true);
      expect(url.fixedUrl).toBe('http://example.org');
      expect(url.patternUrl).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed URL by pattern[x]', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.fixValue('http://example.org');
      expect(url.patternUrl).toBe('http://example.org');
      expect(() => {
        url.fixValue('http://newexample.com');
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different url is already fixed: "http://example.org".'
      );
      expect(() => {
        url.fixValue('http://newexample.com', true);
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different url is already fixed: "http://example.org".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed URL by fixed[x]', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.fixValue('http://example.org', true);
      expect(url.fixedUrl).toBe('http://example.org');
      expect(() => {
        url.fixValue('http://newexample.com', true);
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different url is already fixed: "http://example.org".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.fixValue('http://example.org', true);
      expect(url.fixedUrl).toBe('http://example.org');
      expect(() => {
        url.fixValue('http://newexample.com');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedUrl.'
      );
    });

    it('should throw MismatchedTypeError when fixing a url to an incorrect value', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      expect(() => {
        url.fixValue(' ');
      }).toThrow('Cannot fix string value:  . Value does not match element type: url');
      expect(() => {
        url.fixValue(' ', true);
      }).toThrow('Cannot fix string value:  . Value does not match element type: url');
    });

    // Fixing a canonical
    it('should fix a string to a canonical', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.fixValue('http://example.org');
      expect(instantiates.patternCanonical).toBe('http://example.org');
      expect(instantiates.fixedCanonical).toBeUndefined();
    });

    it('should fix a string to a canonical (exactly)', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.fixValue('http://example.org', true);
      expect(instantiates.fixedCanonical).toBe('http://example.org');
      expect(instantiates.patternCanonical).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed canonical by pattern[x]', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.fixValue('http://example.org');
      expect(instantiates.patternCanonical).toBe('http://example.org');
      expect(() => {
        instantiates.fixValue('http://newexample.com');
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different canonical is already fixed: "http://example.org".'
      );
      expect(() => {
        instantiates.fixValue('http://newexample.com', true);
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different canonical is already fixed: "http://example.org".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed canonical by fixed[x]', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.fixValue('http://example.org', true);
      expect(instantiates.fixedCanonical).toBe('http://example.org');
      expect(() => {
        instantiates.fixValue('http://newexample.com', true);
      }).toThrow(
        'Cannot fix "http://newexample.com" to this element; a different canonical is already fixed: "http://example.org".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.fixValue('http://example.org', true);
      expect(instantiates.fixedCanonical).toBe('http://example.org');
      expect(() => {
        instantiates.fixValue('http://example.com');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedCanonical.'
      );
    });

    it('should throw MismatchedTypeError when fixing a canonical to an incorrect value', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      expect(() => {
        instantiates.fixValue(' ');
      }).toThrow('Cannot fix string value:  . Value does not match element type: canonical');
      expect(() => {
        instantiates.fixValue(' ', true);
      }).toThrow('Cannot fix string value:  . Value does not match element type: canonical');
    });

    // Fixing a base64Binary
    it('should fix a string to a base64Binary', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.fixValue('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(udiCarrierCarrierAIDC.patternBase64Binary).toBe('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBeUndefined();
    });

    it('should fix a string to a base64Binary (exactly)', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.fixValue('d293IHNvbWVvbmUgZGVjb2RlZA==', true);
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBe('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(udiCarrierCarrierAIDC.patternBase64Binary).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed base64Binary by pattern[x]', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.fixValue('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(udiCarrierCarrierAIDC.patternBase64Binary).toBe('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(() => {
        udiCarrierCarrierAIDC.fixValue('dGhpcyB0b28=');
      }).toThrow(
        'Cannot fix "dGhpcyB0b28=" to this element; a different base64Binary is already fixed: "d293IHNvbWVvbmUgZGVjb2RlZA==".'
      );
      expect(() => {
        udiCarrierCarrierAIDC.fixValue('dGhpcyB0b28=', true);
      }).toThrow(
        'Cannot fix "dGhpcyB0b28=" to this element; a different base64Binary is already fixed: "d293IHNvbWVvbmUgZGVjb2RlZA==".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed base64Binary by fixed[x]', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.fixValue('d293IHNvbWVvbmUgZGVjb2RlZA==', true);
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBe('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(() => {
        udiCarrierCarrierAIDC.fixValue('dGhpcyB0b28=', true);
      }).toThrow(
        'Cannot fix "dGhpcyB0b28=" to this element; a different base64Binary is already fixed: "d293IHNvbWVvbmUgZGVjb2RlZA==".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.fixValue('d293IHNvbWVvbmUgZGVjb2RlZA==', true);
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBe('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(() => {
        udiCarrierCarrierAIDC.fixValue('d293IHNvbWVvbmUgZGVjb2RlZA==');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedBase64Binary.'
      );
    });

    it('should throw MismatchedTypeError when fixing a base64Binary to an incorrect value', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      expect(() => {
        udiCarrierCarrierAIDC.fixValue('Not valid');
      }).toThrow(
        'Cannot fix string value: Not valid. Value does not match element type: base64Binary'
      );
      expect(() => {
        udiCarrierCarrierAIDC.fixValue('Not valid', true);
      }).toThrow(
        'Cannot fix string value: Not valid. Value does not match element type: base64Binary'
      );
    });

    // Fixing an instant
    it('should fix a string to an instant', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.fixValue('2015-02-07T13:28:17.239+02:00');
      expect(issued.patternInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(issued.fixedInstant).toBeUndefined();
    });

    it('should fix a string to an instant (exactly)', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.fixValue('2015-02-07T13:28:17.239+02:00', true);
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(issued.patternInstant).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed instant by pattern[x]', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.fixValue('2015-02-07T13:28:17.239+02:00');
      expect(issued.patternInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(() => {
        issued.fixValue('2016-02-07T13:28:17.239+02:00');
      }).toThrow(
        'Cannot fix "2016-02-07T13:28:17.239+02:00" to this element; a different instant is already fixed: "2015-02-07T13:28:17.239+02:00".'
      );
      expect(() => {
        issued.fixValue('2016-02-07T13:28:17.239+02:00', true);
      }).toThrow(
        'Cannot fix "2016-02-07T13:28:17.239+02:00" to this element; a different instant is already fixed: "2015-02-07T13:28:17.239+02:00".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed instant by fixed[x]', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.fixValue('2015-02-07T13:28:17.239+02:00', true);
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(() => {
        issued.fixValue('2016-02-07T13:28:17.239+02:00', true);
      }).toThrow(
        'Cannot fix "2016-02-07T13:28:17.239+02:00" to this element; a different instant is already fixed: "2015-02-07T13:28:17.239+02:00".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.fixValue('2015-02-07T13:28:17.239+02:00', true);
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
      expect(() => {
        issued.fixValue('2015-02-07T13:28:17.239+02:00');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedInstant.'
      );
    });

    it('should throw MismatchedTypeError when fixing an instant to an incorrect value', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      expect(() => {
        issued.fixValue('2015-02-07');
      }).toThrow('Cannot fix string value: 2015-02-07. Value does not match element type: instant');
      expect(() => {
        issued.fixValue('2015-02-07', true);
      }).toThrow('Cannot fix string value: 2015-02-07. Value does not match element type: instant');
    });

    // Fixing a date
    it('should fix a string to a date', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.fixValue('1905-08-23');
      expect(birthDate.patternDate).toBe('1905-08-23');
      expect(birthDate.fixedDate).toBeUndefined();
    });

    it('should fix a string to a date (exactly)', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.fixValue('1905-08-23', true);
      expect(birthDate.fixedDate).toBe('1905-08-23');
      expect(birthDate.patternDate).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed date by pattern[x]', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.fixValue('1905-08-23');
      expect(birthDate.patternDate).toBe('1905-08-23');
      expect(() => {
        birthDate.fixValue('1905-08-24');
      }).toThrow(
        'Cannot fix "1905-08-24" to this element; a different date is already fixed: "1905-08-23".'
      );
      expect(() => {
        birthDate.fixValue('1905-08-24', true);
      }).toThrow(
        'Cannot fix "1905-08-24" to this element; a different date is already fixed: "1905-08-23".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed date by fixed[x]', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.fixValue('1905-08-23', true);
      expect(birthDate.fixedDate).toBe('1905-08-23');
      expect(() => {
        birthDate.fixValue('1905-08-24', true);
      }).toThrow(
        'Cannot fix "1905-08-24" to this element; a different date is already fixed: "1905-08-23".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.fixValue('1905-08-23', true);
      expect(birthDate.fixedDate).toBe('1905-08-23');
      expect(() => {
        birthDate.fixValue('1905-08-23');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedDate.'
      );
    });

    it('should throw MismatchedTypeError when fixing a date to an incorrect value', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      expect(() => {
        birthDate.fixValue('2016-02-07T13:28:17.239+02:00');
      }).toThrow(
        'Cannot fix string value: 2016-02-07T13:28:17.239+02:00. Value does not match element type: date'
      );
      expect(() => {
        birthDate.fixValue('2016-02-07T13:28:17.239+02:00', true);
      }).toThrow(
        'Cannot fix string value: 2016-02-07T13:28:17.239+02:00. Value does not match element type: date'
      );
    });

    // Fixing a dateTime
    it('should fix a string to a dateTime', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.fixValue('2015-02-07T13:28:17-05:00');
      expect(date.patternDateTime).toBe('2015-02-07T13:28:17-05:00');
      expect(date.fixedDateTime).toBeUndefined();
    });

    it('should fix a string to a dateTime (exactly)', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.fixValue('2015-02-07T13:28:17-05:00', true);
      expect(date.fixedDateTime).toBe('2015-02-07T13:28:17-05:00');
      expect(date.patternDateTime).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed dateTime by pattern[x]', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.fixValue('1905-08-23');
      expect(date.patternDateTime).toBe('1905-08-23');
      expect(() => {
        date.fixValue('1905-08-24');
      }).toThrow(
        'Cannot fix "1905-08-24" to this element; a different dateTime is already fixed: "1905-08-23".'
      );
      expect(() => {
        date.fixValue('1905-08-24', true);
      }).toThrow(
        'Cannot fix "1905-08-24" to this element; a different dateTime is already fixed: "1905-08-23".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed dateTime by fixed[x]', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.fixValue('1905-08-23', true);
      expect(date.fixedDateTime).toBe('1905-08-23');
      expect(() => {
        date.fixValue('1905-08-24', true);
      }).toThrow(
        'Cannot fix "1905-08-24" to this element; a different dateTime is already fixed: "1905-08-23".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.fixValue('1905-08-23', true);
      expect(date.fixedDateTime).toBe('1905-08-23');
      expect(() => {
        date.fixValue('1905-08-23');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedDateTime.'
      );
    });

    it('should throw MismatchedTypeError when fixing a dateTime to an incorrect value', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      expect(() => {
        date.fixValue('hello there');
      }).toThrow(
        'Cannot fix string value: hello there. Value does not match element type: dateTime'
      );
      expect(() => {
        date.fixValue('hello there', true);
      }).toThrow(
        'Cannot fix string value: hello there. Value does not match element type: dateTime'
      );
    });

    // Fixing a time
    it('should fix a string to a time', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.fixValue('12:34:56');
      expect(hoursOfOperationClosingTime.patternTime).toBe('12:34:56');
      expect(hoursOfOperationClosingTime.fixedTime).toBeUndefined();
    });

    it('should fix a string to a time (exactly)', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.fixValue('12:34:56', true);
      expect(hoursOfOperationClosingTime.fixedTime).toBe('12:34:56');
      expect(hoursOfOperationClosingTime.patternTime).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed time by pattern[x]', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.fixValue('12:34:56');
      expect(hoursOfOperationClosingTime.patternTime).toBe('12:34:56');
      expect(() => {
        hoursOfOperationClosingTime.fixValue('12:34:57');
      }).toThrow(
        'Cannot fix "12:34:57" to this element; a different time is already fixed: "12:34:56".'
      );
      expect(() => {
        hoursOfOperationClosingTime.fixValue('12:34:57', true);
      }).toThrow(
        'Cannot fix "12:34:57" to this element; a different time is already fixed: "12:34:56".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed time by fixed[x]', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.fixValue('12:34:56', true);
      expect(hoursOfOperationClosingTime.fixedTime).toBe('12:34:56');
      expect(() => {
        hoursOfOperationClosingTime.fixValue('12:34:57', true);
      }).toThrow(
        'Cannot fix "12:34:57" to this element; a different time is already fixed: "12:34:56".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      hoursOfOperationClosingTime.fixValue('12:34:56', true);
      expect(hoursOfOperationClosingTime.fixedTime).toBe('12:34:56');
      expect(() => {
        hoursOfOperationClosingTime.fixValue('12:34:56');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedTime.'
      );
    });

    it('should throw MismatchedTypeError when fixing a time to an incorrect value', () => {
      const hoursOfOperationClosingTime = location.elements.find(
        e => e.id === 'Location.hoursOfOperation.closingTime'
      );
      expect(() => {
        hoursOfOperationClosingTime.fixValue('hello there');
      }).toThrow('Cannot fix string value: hello there. Value does not match element type: time');
      expect(() => {
        hoursOfOperationClosingTime.fixValue('hello there', true);
      }).toThrow('Cannot fix string value: hello there. Value does not match element type: time');
    });

    // Fixing an oid
    it('should fix a string to an oid', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.fixValue('urn:oid:1.2.3.4.5');
      expect(inputValueOid.patternOid).toBe('urn:oid:1.2.3.4.5');
      expect(inputValueOid.fixedOid).toBeUndefined();
    });

    it('should fix a string to an oid (exactly)', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.fixValue('urn:oid:1.2.3.4.5', true);
      expect(inputValueOid.fixedOid).toBe('urn:oid:1.2.3.4.5');
      expect(inputValueOid.patternOid).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed oid by pattern[x]', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.fixValue('urn:oid:1.2.3.4.5');
      expect(inputValueOid.patternOid).toBe('urn:oid:1.2.3.4.5');
      expect(() => {
        inputValueOid.fixValue('urn:oid:1.4.3.2.1');
      }).toThrow(
        'Cannot fix "urn:oid:1.4.3.2.1" to this element; a different oid is already fixed: "urn:oid:1.2.3.4.5".'
      );
      expect(() => {
        inputValueOid.fixValue('urn:oid:1.4.3.2.1', true);
      }).toThrow(
        'Cannot fix "urn:oid:1.4.3.2.1" to this element; a different oid is already fixed: "urn:oid:1.2.3.4.5".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed oid by fixed[x]', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.fixValue('urn:oid:1.2.3.4.5', true);
      expect(inputValueOid.fixedOid).toBe('urn:oid:1.2.3.4.5');
      expect(() => {
        inputValueOid.fixValue('urn:oid:1.4.3.2.1', true);
      }).toThrow(
        'Cannot fix "urn:oid:1.4.3.2.1" to this element; a different oid is already fixed: "urn:oid:1.2.3.4.5".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.fixValue('urn:oid:1.2.3.4.5', true);
      expect(inputValueOid.fixedOid).toBe('urn:oid:1.2.3.4.5');
      expect(() => {
        inputValueOid.fixValue('urn:oid:1.2.3.4.5');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedOid.'
      );
    });

    it('should throw MismatchedTypeError when fixing an oid to an incorrect value', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      expect(() => {
        inputValueOid.fixValue('invalid oid');
      }).toThrow('Cannot fix string value: invalid oid. Value does not match element type: oid');
      expect(() => {
        inputValueOid.fixValue('invalid oid', true);
      }).toThrow('Cannot fix string value: invalid oid. Value does not match element type: oid');
    });

    // Fixing an id
    it('should fix a string to an id', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.fixValue('uniqueId123');
      expect(uid.patternId).toBe('uniqueId123');
      expect(uid.fixedId).toBeUndefined();
    });

    it('should fix a string to an id (exactly)', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.fixValue('uniqueId123', true);
      expect(uid.fixedId).toBe('uniqueId123');
      expect(uid.patternId).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed id by pattern[x]', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.fixValue('uniqueId123');
      expect(uid.patternId).toBe('uniqueId123');
      expect(() => {
        uid.fixValue('anotherUniqueId321');
      }).toThrow(
        'Cannot fix "anotherUniqueId321" to this element; a different id is already fixed: "uniqueId123".'
      );
      expect(() => {
        uid.fixValue('anotherUniqueId321', true);
      }).toThrow(
        'Cannot fix "anotherUniqueId321" to this element; a different id is already fixed: "uniqueId123".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed id by fixed[x]', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.fixValue('uniqueId123', true);
      expect(uid.fixedId).toBe('uniqueId123');
      expect(() => {
        uid.fixValue('anotherUniqueId321', true);
      }).toThrow(
        'Cannot fix "anotherUniqueId321" to this element; a different id is already fixed: "uniqueId123".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.fixValue('uniqueId123', true);
      expect(uid.fixedId).toBe('uniqueId123');
      expect(() => {
        uid.fixValue('uniqueId123');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedId.'
      );
    });

    it('should throw MismatchedTypeError when fixing an id to an incorrect value', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      expect(() => {
        uid.fixValue('invalid id');
      }).toThrow('Cannot fix string value: invalid id. Value does not match element type: id');
      expect(() => {
        uid.fixValue('invalid id', true);
      }).toThrow('Cannot fix string value: invalid id. Value does not match element type: id');
    });

    // Fixing markdown
    it('should fix a string to a markdown', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.fixValue('`This is code`');
      expect(description.patternMarkdown).toBe('`This is code`');
      expect(description.fixedMarkdown).toBeUndefined();
    });

    it('should fix a string to a markdown (exactly)', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.fixValue('`This is code`', true);
      expect(description.fixedMarkdown).toBe('`This is code`');
      expect(description.patternMarkdown).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed markdown by pattern[x]', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.fixValue('some text');
      expect(description.patternMarkdown).toBe('some text');
      expect(() => {
        description.fixValue('other text');
      }).toThrow(
        'Cannot fix "other text" to this element; a different markdown is already fixed: "some text".'
      );
      expect(() => {
        description.fixValue('other text', true);
      }).toThrow(
        'Cannot fix "other text" to this element; a different markdown is already fixed: "some text".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed markdown by fixed[x]', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.fixValue('some text', true);
      expect(description.fixedMarkdown).toBe('some text');
      expect(() => {
        description.fixValue('other text', true);
      }).toThrow(
        'Cannot fix "other text" to this element; a different markdown is already fixed: "some text".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.fixValue('some text', true);
      expect(description.fixedMarkdown).toBe('some text');
      expect(() => {
        description.fixValue('some text');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedMarkdown.'
      );
    });

    // Fixing uuid
    it('should fix a string to a uuid', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.fixValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.patternUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.fixedUuid).toBeUndefined();
    });

    it('should fix a string to a uuid (exactly)', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.fixValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520', true);
      expect(inputValueUuid.fixedUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.patternUuid).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed uuid by pattern[x]', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.fixValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.patternUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(() => {
        inputValueUuid.fixValue('urn:uuid:c123456d-ec9a-4326-a141-556f43239520');
      }).toThrow(
        'Cannot fix "urn:uuid:c123456d-ec9a-4326-a141-556f43239520" to this element; a different uuid is already fixed: "urn:uuid:c757873d-ec9a-4326-a141-556f43239520".'
      );
      expect(() => {
        inputValueUuid.fixValue('urn:uuid:c123456d-ec9a-4326-a141-556f43239520', true);
      }).toThrow(
        'Cannot fix "urn:uuid:c123456d-ec9a-4326-a141-556f43239520" to this element; a different uuid is already fixed: "urn:uuid:c757873d-ec9a-4326-a141-556f43239520".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed uuid by fixed[x]', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.fixValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520', true);
      expect(inputValueUuid.fixedUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(() => {
        inputValueUuid.fixValue('urn:uuid:c123456d-ec9a-4326-a141-556f43239520', true);
      }).toThrow(
        'Cannot fix "urn:uuid:c123456d-ec9a-4326-a141-556f43239520" to this element; a different uuid is already fixed: "urn:uuid:c757873d-ec9a-4326-a141-556f43239520".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.fixValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520', true);
      expect(inputValueUuid.fixedUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(() => {
        inputValueUuid.fixValue('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedUuid.'
      );
    });

    // Fixing xhtml

    it('should fix a string to an xhtml', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      expect(narrativeDiv.patternXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
    });

    it('should fix a string to an xhtml (exactly)', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>', true);
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
    });

    it('should fix a string to an xhtml and collapse whitespace', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixValue(
        `<div xmlns="http://www.w3.org/1999/xhtml">

        Twas     brillig
        and the   slithy             toves


        </div>`
      );
      expect(narrativeDiv.patternXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig and the slithy toves</div>'
      );
    });

    it('should fix a string to an xhtml and collapse whitespace (exactly)', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixValue(
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

    it('should throw ValueAlreadyFixedError when fixing an already fixed xhtml by pattern[x]', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      expect(narrativeDiv.patternXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
      expect(() => {
        narrativeDiv.fixValue(
          '<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>'
        );
      }).toThrow(
        'Cannot fix "<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>" to this element; a different xhtml is already fixed: "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">Twas brillig</div>".'
      );
      expect(() => {
        narrativeDiv.fixValue(
          '<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>',
          true
        );
      }).toThrow(
        'Cannot fix "<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>" to this element; a different xhtml is already fixed: "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">Twas brillig</div>".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed xhtml by fixed[x]', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>', true);
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
      expect(() => {
        narrativeDiv.fixValue(
          '<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>',
          true
        );
      }).toThrow(
        'Cannot fix "<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>" to this element; a different xhtml is already fixed: "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">Twas brillig</div>".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>', true);
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
      expect(() => {
        narrativeDiv.fixValue('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedXhtml.'
      );
    });

    it('should throw MismatchedTypeError when fixing to a value that is not valid xhtml', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      expect(() => {
        narrativeDiv.fixValue('This is no good');
      }).toThrow(
        'Cannot fix string value: This is no good. Value does not match element type: xhtml'
      );
      expect(() => {
        narrativeDiv.fixValue('This is no good', true);
      }).toThrow(
        'Cannot fix string value: This is no good. Value does not match element type: xhtml'
      );
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue('hello');
      }).toThrow(
        'Cannot fix string value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.fixValue('hello', true);
      }).toThrow(
        'Cannot fix string value on this element since this element does not have a single type'
      );
      expect(valueX.patternString).toBeUndefined();
      expect(valueX.fixedString).toBeUndefined();
    });
  });
});
