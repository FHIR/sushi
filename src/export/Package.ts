import { StructureDefinition, InstanceDefinition } from '../fhirtypes';
import { Config } from '../fshtypes';

export class Package {
  constructor(
    public readonly profiles: StructureDefinition[],
    public readonly extensions: StructureDefinition[],
    public readonly instances: InstanceDefinition[],
    public readonly config: Config
  ) {}
}
