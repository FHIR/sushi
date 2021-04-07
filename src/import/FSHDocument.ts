import {
  Profile,
  Extension,
  Resource,
  Logical,
  Instance,
  FshValueSet,
  FshCodeSystem,
  Invariant,
  RuleSet,
  Mapping
} from '../fshtypes';

export class FSHDocument {
  readonly aliases: Map<string, string>;
  readonly profiles: Map<string, Profile>;
  readonly extensions: Map<string, Extension>;
  readonly resources: Map<string, Resource>;
  readonly logicals: Map<string, Logical>;
  readonly instances: Map<string, Instance>;
  readonly valueSets: Map<string, FshValueSet>;
  readonly codeSystems: Map<string, FshCodeSystem>;
  readonly invariants: Map<string, Invariant>;
  readonly ruleSets: Map<string, RuleSet>; // rulesets without parameters
  readonly appliedRuleSets: Map<string, RuleSet>; // rulesets with substitutions applied
  readonly mappings: Map<string, Mapping>;

  constructor(public readonly file: string) {
    this.aliases = new Map();
    this.profiles = new Map();
    this.extensions = new Map();
    this.resources = new Map();
    this.logicals = new Map();
    this.instances = new Map();
    this.valueSets = new Map();
    this.codeSystems = new Map();
    this.invariants = new Map();
    this.ruleSets = new Map();
    this.appliedRuleSets = new Map();
    this.mappings = new Map();
  }
}
