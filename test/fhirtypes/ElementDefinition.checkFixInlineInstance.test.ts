import { loadFromPath } from '../../src/fhirdefs/load';
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
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
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

  describe('#checkFixInlineInstance', () => {
    it('should return a resource when it can be fixed', () => {
      const contained = observation.elements.find(e => e.id === 'Observation.contained');
      const value = contained.checkFixInlineInstance(inlineInstance, fisher);
      expect(value.resourceType).toBe('Patient');
    });

    it('should throw MismatchedTypeError when a Resource is fixed on a non-Resource element', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(() => {
        status.checkFixInlineInstance(inlineInstance, fisher);
      }).toThrow(
        'Cannot fix Patient value: MyInlineInstance. Value does not match element type: code'
      );
    });
  });
});
