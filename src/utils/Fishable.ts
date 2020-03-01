export enum Type {
  Profile,
  Extension,
  ValueSet,
  CodeSystem,
  Instance,
  Invariant,
  Resource, // NOTE: only defined in FHIR defs, not FSHTanks
  Type // NOTE: only defined in FHIR defs, not FSHTanks
}

export interface Metadata {
  id: string;
  name: string;
  sdType?: string;
  url?: string;
  parent?: string;
}

export interface Fishable {
  fishForFHIR(item: string, ...types: Type[]): any | undefined;
  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined;
}
