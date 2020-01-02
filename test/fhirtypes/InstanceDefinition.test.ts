import { InstanceDefinition } from '../../src/fhirtypes';

describe('InstanceDefinition', () => {
  const patientInstanceJSON = {
    resourceType: 'Patient',
    id: 'example',
    name: [
      {
        family: 'Shaw',
        given: ['Amy', 'V.']
      }
    ]
  };
  let patientInstance: InstanceDefinition;
  beforeEach(() => {
    patientInstance = InstanceDefinition.fromJSON(patientInstanceJSON);
  });

  describe('#fromJSON', () => {
    it('should load an instance properly', () => {
      expect(patientInstance.resourceType).toBe('Patient');
      expect(patientInstance.id).toBe('example');
      expect(patientInstance.name).toEqual([
        {
          family: 'Shaw',
          given: ['Amy', 'V.']
        }
      ]);
    });
  });

  describe('#toJSON', () => {
    it('should round trip back to the original JSON', () => {
      patientInstance.instanceName = 'TestName'; // If imported from FSH file, will have an instance name that is removed in toJSON
      const newJSON = patientInstance.toJSON();
      expect(newJSON).toEqual(patientInstanceJSON);
    });
  });
});
