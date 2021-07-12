import { Instance } from '../fshtypes';

export enum Type {
  Profile,
  Extension,
  ValueSet,
  CodeSystem,
  Instance,
  Invariant, // NOTE: only defined in FSHTanks, not FHIR defs
  RuleSet, // NOTE: only defined in FSHTanks, not FHIR defs
  Mapping, // NOTE: only defined in FSHTanks, not FHIR defs
  Resource,
  Type, // NOTE: only defined in FHIR defs, not FSHTanks
  Logical
}

export interface Metadata {
  id: string;
  name: string;
  sdType?: string;
  ancestor?: string;
  url?: string;
  parent?: string;
  abstract?: boolean;
  instanceUsage?: Instance['usage'];
}

export interface Fishable {
  fishForFHIR(item: string, ...types: Type[]): any | undefined;
  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined;
}
