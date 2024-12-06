import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition, InstanceDefinition } from '../../src/fhirtypes';
import { getTestFHIRDefinitions, testDefsPath, TestFisher } from '../testhelpers';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let patient: StructureDefinition;
  let observation: StructureDefinition;
  let fisher: TestFisher;

  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    patient = fisher.fishForStructureDefinition('Patient');
    observation = fisher.fishForStructureDefinition('Observation');
  });

  describe('#assignInstance', () => {
    it('should assign an allowed type of an instance', () => {
      const addressInstance = new InstanceDefinition();
      addressInstance._instanceMeta.name = 'USPostalAddress';
      addressInstance._instanceMeta.sdType = 'Address';
      addressInstance._instanceMeta.usage = 'Inline';
      addressInstance.country = 'US';
      addressInstance.type = 'postal';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      address.assignValue(addressInstance);
      expect(address.patternAddress).toEqual({ country: 'US', type: 'postal' });
      expect(address.fixedAddress).toBeUndefined();
    });

    it('should assign an allowed type of an instance (exactly)', () => {
      const addressInstance = new InstanceDefinition();
      addressInstance._instanceMeta.name = 'USPostalAddress';
      addressInstance._instanceMeta.sdType = 'Address';
      addressInstance._instanceMeta.usage = 'Inline';
      addressInstance.country = 'US';
      addressInstance.type = 'postal';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      address.assignValue(addressInstance, true);
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
        valueX.assignValue(periodInstance);
      }).toThrow(
        'Cannot assign InstanceDefinition value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.assignValue(periodInstance, true);
      }).toThrow(
        'Cannot assign InstanceDefinition value on this element since this element does not have a single type'
      );
      expect(valueX.patternPeriod).toBeUndefined();
      expect(valueX.fixedPeriod).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value by pattern[x]', () => {
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
      address.assignValue(workAddress);
      expect(address.patternAddress).toEqual({ country: 'US', type: 'postal', use: 'work' });
      address.assignValue(workAddress);
      expect(address.patternAddress).toEqual({ country: 'US', type: 'postal', use: 'work' });
      expect(() => {
        address.assignValue(homeAddress);
      }).toThrow(
        'Cannot assign {"country":"US","type":"postal","use":"home"} to this element; a different Address is already assigned: {"country":"US","type":"postal","use":"work"}'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value by fixed[x]', () => {
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
      address.assignValue(workAddress, true);
      expect(address.fixedAddress).toEqual({ country: 'US', type: 'postal', use: 'work' });
      address.assignValue(workAddress, true);
      expect(address.fixedAddress).toEqual({ country: 'US', type: 'postal', use: 'work' });
      expect(() => {
        address.assignValue(homeAddress, true);
      }).toThrow(
        'Cannot assign {"country":"US","type":"postal","use":"home"} to this element; a different Address is already assigned: {"country":"US","type":"postal","use":"work"}'
      );
    });

    it('should throw AssignedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const addressInstance = new InstanceDefinition();
      addressInstance._instanceMeta.name = 'USPostalAddress';
      addressInstance._instanceMeta.sdType = 'Address';
      addressInstance._instanceMeta.usage = 'Inline';
      addressInstance.country = 'US';
      addressInstance.type = 'postal';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      address.assignValue(addressInstance, true);
      expect(address.fixedAddress).toEqual({ country: 'US', type: 'postal' });
      expect(() => {
        address.assignValue(addressInstance);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedAddress'
      );
    });

    it('should throw MismatchedTypeError when the value is assigned to an unsupported type', () => {
      const periodInstance = new InstanceDefinition();
      periodInstance._instanceMeta.name = 'LastYear';
      periodInstance._instanceMeta.sdType = 'Period';
      periodInstance._instanceMeta.usage = 'Inline';
      periodInstance.start = '2019-08-01';
      periodInstance.end = '2020-08-01';

      const address = patient.elements.find(e => e.id === 'Patient.address');
      expect(() => {
        address.assignValue(periodInstance);
      }).toThrow(
        'Cannot assign Period value: {"start":"2019-08-01","end":"2020-08-01"}. Value does not match element type: Address'
      );
    });
  });
});
