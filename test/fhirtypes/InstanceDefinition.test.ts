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
      patientInstance._instanceMeta.name = 'TestName'; // If imported from FSH file, will have an instance name that is removed in toJSON
      const newJSON = patientInstance.toJSON();
      expect(newJSON).toEqual(patientInstanceJSON);
    });

    it('should serialize properties such that underscore properties come immediately after their non-underscore counterparts', () => {
      patientInstance._status = {
        extension: [
          {
            url: 'SomeExtension',
            valueCode: 'someCode'
          }
        ]
      };
      patientInstance._id = {
        extension: [
          {
            url: 'SomeExtension',
            valueCode: 'someCode'
          }
        ]
      };
      patientInstance.status = 'active';

      const newJSON = patientInstance.toJSON();
      const keys = Object.keys(newJSON);
      expect(keys.indexOf('id') + 1).toBe(keys.indexOf('_id'));
      expect(keys.indexOf('status') + 1).toBe(keys.indexOf('_status'));
    });

    it('should serialize subproperties such that underscore properties come immediately after their non-underscore counterparts', () => {
      patientInstance.name[0]._family = {
        extension: {
          url: 'http://question.org/wait/really?',
          valueBoolean: false
        }
      };
      const originalKeys = Object.keys(patientInstance.name[0]);
      expect(originalKeys.indexOf('family') + 1).not.toBe(originalKeys.indexOf('_family'));

      const newJSON = patientInstance.toJSON();
      const nameKeys = Object.keys(newJSON.name[0]);
      expect(nameKeys.indexOf('family') + 1).toBe(nameKeys.indexOf('_family'));
    });
  });
});
