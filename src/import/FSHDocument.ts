import {
  Profile,
  Extension,
  Instance,
  FshValueSet,
  FshCodeSystem,
  Invariant,
  RuleSet
} from '../fshtypes';

export class FSHDocument {
  readonly aliases: Map<string, string>;
  readonly profiles: Map<string, Profile>;
  readonly extensions: Map<string, Extension>;
  readonly instances: Map<string, Instance>;
  readonly valueSets: Map<string, FshValueSet>;
  readonly codeSystems: Map<string, FshCodeSystem>;
  readonly invariants: Map<string, Invariant>;
  readonly ruleSets: Map<string, RuleSet>;

  constructor(public readonly file: string) {
    this.aliases = new Map();
    this.profiles = new Map();
    this.extensions = new Map();
    this.instances = new Map();
    this.valueSets = new Map();
    this.codeSystems = new Map();
    this.invariants = new Map();
    this.ruleSets = new Map();
  }
}
