import { StructureDefinition, ValueSet /*, CodeSystem*/ } from '../fhirtypes';

export enum Type {
  Alias,
  Profile,
  Extension,
  ValueSet,
  CodeSystem,
  Instance,
  Resource, // NOTE: only defined in FHIR defs, not FSHTanks
  Type // NOTE: only defined in FHIR defs, not FSHTanks
}

export interface Metadata {
  id: string;
  name: string;
  url: string;
  parent?: string;
  instanceOf?: string;
}

export interface Fishable {
  fishForFHIR(
    item: string,
    ...types: Type[]
  ): StructureDefinition | ValueSet /*| CodeSystem */ | any | undefined;
  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined;
}
