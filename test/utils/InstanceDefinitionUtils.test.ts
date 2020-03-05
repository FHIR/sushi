import {
  filterExampleInstances,
  filterCapabilitiesInstances,
  filterVocabularyInstances,
  filterModelInstances,
  filterOperationInstances,
  filterExtensionInstances,
  filterProfileInstances
} from '../../src/utils';
import { InstanceDefinition } from '../../src/fhirtypes';

describe('InstanceDefinitionUtils', () => {
  const examplePatient = new InstanceDefinition();
  examplePatient.resourceType = 'Patient';
  examplePatient.id = 'MyPatient';
  examplePatient._instanceMeta.name = 'MyPatient';
  examplePatient._instanceMeta.usage = 'Example';

  const capabilityStatement = new InstanceDefinition();
  capabilityStatement.id = 'MyCS';
  capabilityStatement.resourceType = 'CapabilityStatement';
  capabilityStatement._instanceMeta.name = 'MyCS';
  capabilityStatement._instanceMeta.usage = 'Definition';

  const capabilityStatementExample = new InstanceDefinition();
  capabilityStatementExample.id = 'MyCSExample';
  capabilityStatementExample.resourceType = 'CapabilityStatement';
  capabilityStatementExample._instanceMeta.name = 'MyCSExample';
  capabilityStatementExample._instanceMeta.usage = 'Example';

  const valueSet = new InstanceDefinition();
  valueSet.id = 'MyVS';
  valueSet.resourceType = 'ValueSet';
  valueSet._instanceMeta.name = 'MyVS';
  valueSet._instanceMeta.usage = 'Definition';

  const operation = new InstanceDefinition();
  operation.id = 'MyOperation';
  operation.resourceType = 'OperationDefinition';
  operation._instanceMeta.name = 'MyOperation';
  operation._instanceMeta.usage = 'Definition';

  const logicalModel = new InstanceDefinition();
  logicalModel.id = 'MyLM';
  logicalModel.resourceType = 'StructureDefinition';
  logicalModel._instanceMeta.name = 'MyLM';
  logicalModel._instanceMeta.usage = 'Definition';
  logicalModel.kind = 'logical';

  const extension = new InstanceDefinition();
  extension.id = 'MyExtension';
  extension.resourceType = 'StructureDefinition';
  extension._instanceMeta.name = 'MyExtension';
  extension._instanceMeta.usage = 'Definition';
  extension.kind = 'resource';
  extension.type = 'Extension';

  const extensionExampleInferred = new InstanceDefinition();
  extensionExampleInferred.id = 'MyExtension';
  extensionExampleInferred.resourceType = 'StructureDefinition';
  extensionExampleInferred._instanceMeta.name = 'MyExtension';
  extensionExampleInferred.kind = 'resource';
  extensionExampleInferred.type = 'Extension';

  const profile = new InstanceDefinition();
  profile.id = 'MyProfile';
  profile.resourceType = 'StructureDefinition';
  profile._instanceMeta.name = 'MyProfile';
  profile._instanceMeta.usage = 'Definition';
  profile.kind = 'resource';
  profile.type = 'something-not-extension';

  const primitiveSD = new InstanceDefinition();
  primitiveSD.id = 'MyPrimitive';
  primitiveSD.resourceType = 'StructureDefinition';
  primitiveSD._instanceMeta.name = 'MyPrimitive';
  primitiveSD._instanceMeta.usage = 'Definition';
  primitiveSD.kind = 'something-not-extension';
  primitiveSD.type = 'primitive-type';

  const observation = new InstanceDefinition();
  observation.id = 'MyObservation';
  observation.resourceType = 'Observation';
  observation._instanceMeta.name = 'MyObservation';
  observation._instanceMeta.usage = 'Definition';

  const instances: InstanceDefinition[] = [
    examplePatient,
    capabilityStatement,
    capabilityStatementExample,
    valueSet,
    operation,
    logicalModel,
    extension,
    extensionExampleInferred,
    profile,
    primitiveSD,
    observation
  ];

  it('should filter out all example instances regardless of resourceType', () => {
    const examples = filterExampleInstances(instances);
    expect(examples).toEqual([
      examplePatient,
      capabilityStatementExample,
      extensionExampleInferred
    ]);
    expect(instances).toEqual([
      capabilityStatement,
      valueSet,
      operation,
      logicalModel,
      extension,
      profile,
      primitiveSD,
      observation
    ]);
  });
  describe('Non-example instances', () => {
    it('should filter out all capability instances', () => {
      const capabilities = filterCapabilitiesInstances(instances);
      expect(capabilities).toEqual([capabilityStatement]);
      expect(instances).toEqual([
        valueSet,
        operation,
        logicalModel,
        extension,
        profile,
        primitiveSD,
        observation
      ]);
    });
    it('should filter out all vocabulary instances', () => {
      const vocabulary = filterVocabularyInstances(instances);
      expect(vocabulary).toEqual([valueSet]);
      expect(instances).toEqual([
        operation,
        logicalModel,
        extension,
        profile,
        primitiveSD,
        observation
      ]);
    });
    it('should filter out all operation instances', () => {
      const operations = filterOperationInstances(instances);
      expect(operations).toEqual([operation]);
      expect(instances).toEqual([logicalModel, extension, profile, primitiveSD, observation]);
    });
    it('should filter out all model instances', () => {
      const models = filterModelInstances(instances);
      expect(models).toEqual([logicalModel]);
      expect(instances).toEqual([extension, profile, primitiveSD, observation]);
    });
    it('should filter out all extension instances', () => {
      const extensions = filterExtensionInstances(instances);
      expect(extensions).toEqual([extension]);
      expect(instances).toEqual([profile, primitiveSD, observation]);
    });
    it('should filter out all profile instances', () => {
      const profiles = filterProfileInstances(instances);
      expect(profiles).toEqual([profile]);
      expect(instances).toEqual([primitiveSD, observation]);
    });
    it('should only have instances remaining that cannot be categorized', () => {
      const others = instances;
      expect(others).toEqual([primitiveSD, observation]);
    });
  });
});
