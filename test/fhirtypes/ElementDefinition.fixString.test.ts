import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';
import path from 'path';

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
      batchLotNumber.fixString('foo bar');
      expect(batchLotNumber.fixedString).toBe('foo bar');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed string', () => {
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

    it('should throw ValueAlreadyFixedError when fixing an already fixed uri', () => {
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
      }).toThrow('Cannot fix string value:  . Value does not match element type: uri');
    });

    // Fixing a URL
    it('should fix a string to a url', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.fixString('http://example.org');
      expect(url.fixedUrl).toBe('http://example.org');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed URL', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      url.fixString('http://example.org');
      expect(url.fixedUrl).toBe('http://example.org');
      expect(() => {
        url.fixString('http://newexample.com');
      }).toThrow(
        'Cannot fix http://newexample.com to this element; a different url is already fixed: http://example.org'
      );
    });

    it('should throw MismatchedTypeError when fixing a url to an incorrect value', () => {
      const url = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.implementation.url'
      );
      expect(() => {
        url.fixString(' ');
      }).toThrow('Cannot fix string value:  . Value does not match element type: url');
    });

    // Fixing a canonical
    it('should fix a string to a canonical', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.fixString('http://example.org');
      expect(instantiates.fixedCanonical).toBe('http://example.org');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed canonical', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      instantiates.fixString('http://example.org');
      expect(instantiates.fixedCanonical).toBe('http://example.org');
      expect(() => {
        instantiates.fixString('http://newexample.com');
      }).toThrow(
        'Cannot fix http://newexample.com to this element; a different canonical is already fixed: http://example.org'
      );
    });

    it('should throw MismatchedTypeError when fixing a canonical to an incorrect value', () => {
      const instantiates = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.instantiates'
      );
      expect(() => {
        instantiates.fixString(' ');
      }).toThrow('Cannot fix string value:  . Value does not match element type: canonical');
    });

    // Fixing a base64Binary
    it('should fix a string to a base64Binary', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.fixString('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBe('d293IHNvbWVvbmUgZGVjb2RlZA==');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed base64Binary', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      udiCarrierCarrierAIDC.fixString('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(udiCarrierCarrierAIDC.fixedBase64Binary).toBe('d293IHNvbWVvbmUgZGVjb2RlZA==');
      expect(() => {
        udiCarrierCarrierAIDC.fixString('dGhpcyB0b28=');
      }).toThrow(
        'Cannot fix dGhpcyB0b28= to this element; a different base64Binary is already fixed: d293IHNvbWVvbmUgZGVjb2RlZA=='
      );
    });

    it('should throw MismatchedTypeError when fixing a base64Binary to an incorrect value', () => {
      const udiCarrierCarrierAIDC = device.elements.find(
        e => e.id === 'Device.udiCarrier.carrierAIDC'
      );
      expect(() => {
        udiCarrierCarrierAIDC.fixString('Not valid');
      }).toThrow(
        'Cannot fix string value: Not valid. Value does not match element type: base64Binary'
      );
    });

    // Fixing an instant
    it('should fix a string to an instant', () => {
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.fixString('2015-02-07T13:28:17.239+02:00');
      expect(issued.fixedInstant).toBe('2015-02-07T13:28:17.239+02:00');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed instant', () => {
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
      }).toThrow('Cannot fix string value: 2015-02-07. Value does not match element type: instant');
    });

    // Fixing a date
    it('should fix a string to a date', () => {
      const birthDate = patient.elements.find(e => e.id === 'Patient.birthDate');
      birthDate.fixString('1905-08-23');
      expect(birthDate.fixedDate).toBe('1905-08-23');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed date', () => {
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
        'Cannot fix string value: 2016-02-07T13:28:17.239+02:00. Value does not match element type: date'
      );
    });

    // Fixing a dateTime
    it('should fix a string to a dateTime', () => {
      const date = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.date');
      date.fixString('2015-02-07T13:28:17-05:00');
      expect(date.fixedDateTime).toBe('2015-02-07T13:28:17-05:00');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed dateTime', () => {
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
        'Cannot fix string value: hello there. Value does not match element type: dateTime'
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

    it('should throw ValueAlreadyFixedError when fixing an already fixed time', () => {
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
      }).toThrow('Cannot fix string value: hello there. Value does not match element type: time');
    });

    // Fixing an oid
    it('should fix a string to an oid', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.fixString('urn:oid:1.2.3.4.5');
      expect(inputValueOid.fixedOid).toBe('urn:oid:1.2.3.4.5');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed oid', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      inputValueOid.fixString('urn:oid:1.2.3.4.5');
      expect(inputValueOid.fixedOid).toBe('urn:oid:1.2.3.4.5');
      expect(() => {
        inputValueOid.fixString('urn:oid:1.4.3.2.1');
      }).toThrow(
        'Cannot fix urn:oid:1.4.3.2.1 to this element; a different oid is already fixed: urn:oid:1.2.3.4.5'
      );
    });

    it('should throw MismatchedTypeError when fixing an oid to an incorrect value', () => {
      const inputValueOid = task.findElementByPath('input.valueOid', fisher);
      expect(() => {
        inputValueOid.fixString('invalid oid');
      }).toThrow('Cannot fix string value: invalid oid. Value does not match element type: oid');
    });

    // Fixing an id
    it('should fix a string to an id', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.fixString('uniqueId123');
      expect(uid.fixedId).toBe('uniqueId123');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed id', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      uid.fixString('uniqueId123');
      expect(uid.fixedId).toBe('uniqueId123');
      expect(() => {
        uid.fixString('anotherUniqueId321');
      }).toThrow(
        'Cannot fix anotherUniqueId321 to this element; a different id is already fixed: uniqueId123'
      );
    });

    it('should throw MismatchedTypeError when fixing an id to an incorrect value', () => {
      const uid = imagingStudy.elements.find(e => e.id === 'ImagingStudy.series.uid');
      expect(() => {
        uid.fixString('invalid id');
      }).toThrow('Cannot fix string value: invalid id. Value does not match element type: id');
    });

    // Fixing markdown
    it('should fix a string to a markdown', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.fixString('`This is code`');
      expect(description.fixedMarkdown).toBe('`This is code`');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed markdown', () => {
      const description = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.description'
      );
      description.fixString('some text');
      expect(description.fixedMarkdown).toBe('some text');
      expect(() => {
        description.fixString('other text');
      }).toThrow(
        'Cannot fix other text to this element; a different markdown is already fixed: some text'
      );
    });

    // Fixing uuid
    it('should fix a string to a uuid', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.fixString('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.fixedUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed uuid', () => {
      const inputValueUuid = task.findElementByPath('input.valueUuid', fisher);
      inputValueUuid.fixString('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(inputValueUuid.fixedUuid).toBe('urn:uuid:c757873d-ec9a-4326-a141-556f43239520');
      expect(() => {
        inputValueUuid.fixString('urn:uuid:c123456d-ec9a-4326-a141-556f43239520');
      }).toThrow(
        'Cannot fix urn:uuid:c123456d-ec9a-4326-a141-556f43239520 to this element; a different uuid is already fixed: urn:uuid:c757873d-ec9a-4326-a141-556f43239520'
      );
    });

    // Fixing xhtml

    it('should fix a string to an xhtml', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixString('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed xhtml', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      narrativeDiv.fixString('<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>');
      expect(narrativeDiv.fixedXhtml).toBe(
        '<div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
      expect(() => {
        narrativeDiv.fixString(
          '<div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div>'
        );
      }).toThrow(
        'Cannot fix <div xmlns="http://www.w3.org/1999/xhtml">and the slithy toves</div> to this element; a different xhtml is already fixed: <div xmlns="http://www.w3.org/1999/xhtml">Twas brillig</div>'
      );
    });

    it('should throw MismatchedTypeError when fixing to a value that is not valid xhtml', () => {
      const narrativeDiv = patient.findElementByPath('text.div', fisher);
      expect(() => {
        narrativeDiv.fixString('This is no good');
      }).toThrow(
        'Cannot fix string value: This is no good. Value does not match element type: xhtml'
      );
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
