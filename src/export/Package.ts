import { StructureDefinition } from '../fhirtypes';

export class Package {
  constructor(
    public readonly profiles: StructureDefinition[],
    public readonly extensions: StructureDefinition[],
    public readonly config: any
  ) {}
}
