export enum Type {
  Profile,
  Extension,
  ValueSet,
  CodeSystem,
  Instance,
  Invariant, // NOTE: only defined in FSHTanks, not FHIR defs
  RuleSet, // NOTE: only defined in FSHTanks, not FHIR defs
  Mapping, // NOTE: only defined in FSHTanks, not FHIR defs
  Resource, // NOTE: only defined in FHIR defs, not FSHTanks
  Type // NOTE: only defined in FHIR defs, not FSHTanks
}

export interface Metadata {
  id: string;
  name: string;
  sdType?: string;
  url?: string;
  parent?: string;
  abstract?: boolean;
}

export interface Fishable {
  fishForFHIR(item: string, ...types: Type[]): any | undefined;
  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined;
}
