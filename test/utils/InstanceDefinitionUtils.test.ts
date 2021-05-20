import { filterInlineInstances } from '../../src/utils';
import { InstanceDefinition } from '../../src/fhirtypes';

describe('InstanceDefinitionUtils', () => {
  let instances: InstanceDefinition[];

  const examplePatient = new InstanceDefinition();
  examplePatient.resourceType = 'Patient';
  examplePatient.id = 'MyPatient';
  examplePatient._instanceMeta.name = 'MyPatient';
  examplePatient._instanceMeta.usage = 'Example';

  const inlinePatient = new InstanceDefinition();
  inlinePatient.resourceType = 'Patient';
  inlinePatient.id = 'MyInlinePatient';
  inlinePatient._instanceMeta.name = 'MyInlinePatient';
  inlinePatient._instanceMeta.usage = 'Inline';

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

  beforeEach(() => {
    // Reset instance as it is muted by the various filter functions
    instances = [
      examplePatient,
      inlinePatient,
      capabilityStatement,
      capabilityStatementExample,
      valueSet,
      operation,
      logicalModel,
      extension,
      profile,
      primitiveSD,
      observation
    ];
  });

  it('should filter out all "Inline" instances', () => {
    const inlines = filterInlineInstances(instances);
    expect(inlines).toEqual([inlinePatient]);
    expect(instances).toEqual([
      examplePatient,
      capabilityStatement,
      capabilityStatementExample,
      valueSet,
      operation,
      logicalModel,
      extension,
      profile,
      primitiveSD,
      observation
    ]);
  });
});
