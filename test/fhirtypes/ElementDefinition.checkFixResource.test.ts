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
  });

  describe('#checkFixResource', () => {
    it('should return a resource when it can be fixed', () => {
      const contained = observation.elements.find(e => e.id === 'Observation.contained');
      const value = contained.checkFixResource(inlineInstance, fisher);
      expect(value.resourceType).toBe('Patient');
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Resource', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(() => {
        status.checkFixResource(inlineInstance, fisher);
      }).toThrow(
        'Cannot fix Patient value: MyInlineInstance. Value does not match element type: code'
      );
    });
  });
});
