import { StructureDefinition, InstanceDefinition, ValueSet, CodeSystem } from '../fhirtypes';
import { Config } from '../fshtypes';

export class Package {
  constructor(
    public readonly profiles: StructureDefinition[],
    public readonly extensions: StructureDefinition[],
    public readonly instances: InstanceDefinition[],
    public readonly valueSets: ValueSet[],
    public readonly codeSystems: CodeSystem[],
    public readonly config: Config
  ) {}
}
