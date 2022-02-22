import { loadFromPath } from 'fhir-package-loader';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';
import path from 'path';
import { InstanceDefinition } from '../../src/fhirtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let inlineInstance: InstanceDefinition;
  let inlineCodeable: InstanceDefinition;
  let fisher: TestFisher;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    inlineInstance = new InstanceDefinition();
    inlineInstance.resourceType = 'Patient';
    inlineInstance.id = 'MyInlineInstance';
    inlineInstance._instanceMeta.sdType = 'Patient';

    inlineCodeable = new InstanceDefinition();
    inlineCodeable.resourceType = 'CodeableConcept';
    inlineCodeable.id = 'MyCodeable';
    inlineCodeable._instanceMeta.sdType = 'CodeableConcept';
  });

  describe('#checkAssignInlineInstance', () => {
    it('should return a resource when it can be assigned', () => {
      const contained = observation.elements.find(e => e.id === 'Observation.contained');
      const value = contained.checkAssignInlineInstance(inlineInstance, fisher);
      expect(value.resourceType).toBe('Patient');
    });

    it('should throw MismatchedTypeError when a Resource is assigned on a non-Resource element', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(() => {
        status.checkAssignInlineInstance(inlineInstance, fisher);
      }).toThrow(
        'Cannot assign Patient value: MyInlineInstance. Value does not match element type: code'
      );
    });
  });
});
