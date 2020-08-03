import path from 'path';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition, InstanceDefinition } from '../../src/fhirtypes';
import { TestFisher } from '../testhelpers';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let patient: StructureDefinition;
  let observation: StructureDefinition;
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
    patient = fisher.fishForStructureDefinition('Patient');
    observation = fisher.fishForStructureDefinition('Observation');
  });

  describe('#fixInstance', () => {
    it('should fix an allowed type of an instance', () => {
      const addressInstance = new InstanceDefinition();
      addressInstance._instanceMeta.name = 'USPostalAddress';
      addressInstance._instanceMeta.sdType = 'Address';
      addressInstance._instanceMeta.usage = 'Inline';
      addressInstance.country = 'US';
      addressInstance.type = 'postal';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      address.fixValue(addressInstance);
      expect(address.patternAddress).toEqual({ country: 'US', type: 'postal' });
      expect(address.fixedAddress).toBeUndefined();
    });

    it('should fix an allowed type of an instance (exactly)', () => {
      const addressInstance = new InstanceDefinition();
      addressInstance._instanceMeta.name = 'USPostalAddress';
      addressInstance._instanceMeta.sdType = 'Address';
      addressInstance._instanceMeta.usage = 'Inline';
      addressInstance.country = 'US';
      addressInstance.type = 'postal';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      address.fixValue(addressInstance, true);
      expect(address.fixedAddress).toEqual({ country: 'US', type: 'postal' });
      expect(address.patternAddress).toBeUndefined();
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const periodInstance = new InstanceDefinition();
      periodInstance._instanceMeta.name = 'LastYear';
      periodInstance._instanceMeta.sdType = 'Period';
      periodInstance._instanceMeta.usage = 'Inline';
      periodInstance.start = '2019-08-01';
      periodInstance.end = '2020-08-01';

      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(periodInstance);
      }).toThrow(
        'Cannot fix InstanceDefinition value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.fixValue(periodInstance, true);
      }).toThrow(
        'Cannot fix InstanceDefinition value on this element since this element does not have a single type'
      );
      expect(valueX.patternPeriod).toBeUndefined();
      expect(valueX.fixedPeriod).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value by pattern[x]', () => {
      const workAddress = new InstanceDefinition();
      workAddress._instanceMeta.name = 'USPostalAddress';
      workAddress._instanceMeta.sdType = 'Address';
      workAddress._instanceMeta.usage = 'Inline';
      workAddress.country = 'US';
      workAddress.type = 'postal';
      workAddress.use = 'work';
      const homeAddress = new InstanceDefinition();
      homeAddress._instanceMeta.name = 'USPostalAddress';
      homeAddress._instanceMeta.sdType = 'Address';
      homeAddress._instanceMeta.usage = 'Inline';
      homeAddress.country = 'US';
      homeAddress.type = 'postal';
      homeAddress.use = 'home';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      address.fixValue(workAddress);
      expect(address.patternAddress).toEqual({ country: 'US', type: 'postal', use: 'work' });
      address.fixValue(workAddress);
      expect(address.patternAddress).toEqual({ country: 'US', type: 'postal', use: 'work' });
      expect(() => {
        address.fixValue(homeAddress);
      }).toThrow(
        'Cannot fix {"country":"US","type":"postal","use":"home"} to this element; a different Address is already fixed: {"country":"US","type":"postal","use":"work"}'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value by fixed[x]', () => {
      const workAddress = new InstanceDefinition();
      workAddress._instanceMeta.name = 'USPostalAddress';
      workAddress._instanceMeta.sdType = 'Address';
      workAddress._instanceMeta.usage = 'Inline';
      workAddress.country = 'US';
      workAddress.type = 'postal';
      workAddress.use = 'work';
      const homeAddress = new InstanceDefinition();
      homeAddress._instanceMeta.name = 'USPostalAddress';
      homeAddress._instanceMeta.sdType = 'Address';
      homeAddress._instanceMeta.usage = 'Inline';
      homeAddress.country = 'US';
      homeAddress.type = 'postal';
      homeAddress.use = 'home';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      address.fixValue(workAddress, true);
      expect(address.fixedAddress).toEqual({ country: 'US', type: 'postal', use: 'work' });
      address.fixValue(workAddress, true);
      expect(address.fixedAddress).toEqual({ country: 'US', type: 'postal', use: 'work' });
      expect(() => {
        address.fixValue(homeAddress, true);
      }).toThrow(
        'Cannot fix {"country":"US","type":"postal","use":"home"} to this element; a different Address is already fixed: {"country":"US","type":"postal","use":"work"}'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to patternp[x]', () => {
      const addressInstance = new InstanceDefinition();
      addressInstance._instanceMeta.name = 'USPostalAddress';
      addressInstance._instanceMeta.sdType = 'Address';
      addressInstance._instanceMeta.usage = 'Inline';
      addressInstance.country = 'US';
      addressInstance.type = 'postal';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      address.fixValue(addressInstance, true);
      expect(address.fixedAddress).toEqual({ country: 'US', type: 'postal' });
      expect(() => {
        address.fixValue(addressInstance);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedAddress'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to an unsupported type', () => {
      const periodInstance = new InstanceDefinition();
      periodInstance._instanceMeta.name = 'LastYear';
      periodInstance._instanceMeta.sdType = 'Period';
      periodInstance._instanceMeta.usage = 'Inline';
      periodInstance.start = '2019-08-01';
      periodInstance.end = '2020-08-01';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      expect(() => {
        address.fixValue(periodInstance);
      }).toThrow(
        'Cannot fix Period value: {"start":"2019-08-01","end":"2020-08-01"}. Value does not match element type: Address'
      );
    });
  });
});
