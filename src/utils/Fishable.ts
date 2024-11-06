import { FshCanonical, Instance } from '../fshtypes';

export enum Type {
  Profile = 'Profile',
  Extension = 'Extension',
  ValueSet = 'ValueSet',
  CodeSystem = 'CodeSystem',
  Instance = 'Instance',
  Invariant = 'Invariant', // NOTE: only defined in FSHTanks, not FHIR defs
  RuleSet = 'RuleSet', // NOTE: only defined in FSHTanks, not FHIR defs
  Mapping = 'Mapping', // NOTE: only defined in FSHTanks, not FHIR defs
  Resource = 'Resource',
  Type = 'Type', // NOTE: only defined in FHIR defs, not FSHTanks
  Logical = 'Logical'
}

export interface Metadata {
  id: string;
  name: string;
  sdType?: string;
  resourceType?: string;
  url?: string;
  parent?: string;
  imposeProfiles?: (string | FshCanonical)[];
  abstract?: boolean;
  version?: string;
  instanceUsage?: Instance['usage'];
  canBeTarget?: boolean;
  canBind?: boolean;
  resourcePath?: string;
}

export interface Fishable {
  fishForFHIR(item: string, ...types: Type[]): any | undefined;
  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined;
}
