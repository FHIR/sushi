import { FSHDocument } from './FSHDocument';
import {
  Profile,
  Extension,
  Instance,
  FshValueSet,
  FshCodeSystem,
  Invariant,
  RuleSet,
  Mapping,
  Configuration
} from '../fshtypes';
import flatMap from 'lodash/flatMap';
import { Type, Metadata, Fishable } from '../utils/Fishable';
import { CaretValueRule } from '../fshtypes/rules';

export class FSHTank implements Fishable {
  constructor(public readonly docs: FSHDocument[], public readonly config: Configuration) {}

  /**
   * Gets all profiles in the tank
   * @returns {Profile[]}
   */
  public getAllProfiles(): Profile[] {
    return flatMap(this.docs, doc => Array.from(doc.profiles.values()));
  }

  /**
   * Gets all extensions in the tank
   * @returns {Extension[]}
   */
  public getAllExtensions(): Extension[] {
    return flatMap(this.docs, doc => Array.from(doc.extensions.values()));
  }

  /**
   * Gets all instances in the tank
   * @returns {Instance[]}
   */
  public getAllInstances(): Instance[] {
    return flatMap(this.docs, doc => Array.from(doc.instances.values()));
  }

  /**
   * Gets all structure definitions (profiles and extensions) in the tank
   * @returns {(Profile | Extension)[]}
   */
  public getAllStructureDefinitions(): (Profile | Extension)[] {
    return [...this.getAllProfiles(), ...this.getAllExtensions()];
  }

  /**
   * Gets all value sets in the tank
   * @returns {FshValueSet[]}
   */
  public getAllValueSets(): FshValueSet[] {
    return flatMap(this.docs, doc => Array.from(doc.valueSets.values()));
  }

  /**
   * Gets all code systems in the tank
   * @returns {FshCodeSystem[]}
   */
  public getAllCodeSystems(): FshCodeSystem[] {
    return flatMap(this.docs, doc => Array.from(doc.codeSystems.values()));
  }

  /**
   * Gets all invariants in the tank
   * @returns {Invariant[]}
   */
  public getAllInvariants(): Invariant[] {
    return flatMap(this.docs, doc => Array.from(doc.invariants.values()));
  }

  /**
   * Gets all ruleSets in the tank
   * @returns {RuleSet[]}
   */
  public getAllRuleSets(): RuleSet[] {
    return flatMap(this.docs, doc => Array.from(doc.ruleSets.values()));
  }

  /**
   * Gets all Mappings in the tank
   * @returns {Mapping[]}
   */
  public getAllMappings(): Mapping[] {
    return flatMap(this.docs, doc => Array.from(doc.mappings.values()));
  }

  /**
   * Finds the alias in the tank, if it exists
   * @param {string} name - The name of the alias we're looking for
   * @returns {string | undefined}
   */
  public resolveAlias(name: string): string | undefined {
    for (const doc of this.docs) {
      const foundAlias = doc.aliases.get(name);
      if (foundAlias) return foundAlias;
    }
    return undefined;
  }

  fish(
    item: string,
    ...types: Type[]
  ):
    | Profile
    | Extension
    | FshValueSet
    | FshCodeSystem
    | Instance
    | Invariant
    | RuleSet
    | Mapping
    | undefined {
    // Resolve alias if necessary
    item = this.resolveAlias(item) ?? item;

    // No types passed in means to search ALL supported types
    if (types.length === 0) {
      types = [
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance,
        Type.Invariant,
        Type.RuleSet,
        Type.Mapping
      ];
    }

    for (const t of types) {
      let result;
      switch (t) {
        case Type.Profile:
          result = this.getAllProfiles().find(
            p =>
              p.name === item ||
              p.id === item ||
              `${this.config.canonical}/StructureDefinition/${p.id}` === item
          );
          break;
        case Type.Extension:
          result = this.getAllExtensions().find(
            e =>
              e.name === item ||
              e.id === item ||
              `${this.config.canonical}/StructureDefinition/${e.id}` === item
          );
          break;
        case Type.ValueSet:
          result = this.getAllValueSets().find(
            vs =>
              vs.name === item ||
              vs.id === item ||
              `${this.config.canonical}/ValueSet/${vs.id}` === item
          );
          break;
        case Type.CodeSystem:
          result = this.getAllCodeSystems().find(
            vs =>
              vs.name === item ||
              vs.id === item ||
              `${this.config.canonical}/CodeSystem/${vs.id}` === item
          );
          break;
        case Type.Instance:
          result = this.getAllInstances().find(i => i.name === item || i.id === item);
          break;
        case Type.Invariant:
          result = this.getAllInvariants().find(i => i.name === item);
          break;
        case Type.RuleSet:
          result = this.getAllRuleSets().find(r => r.name === item);
          break;
        case Type.Mapping:
          result = this.getAllMappings().find(m => m.name === item);
          break;
        case Type.Resource:
        case Type.Type:
        default:
          // Tank doesn't support these types
          break;
      }
      if (result != null) {
        return result;
      }
    }
    // No match, return undefined
    return;
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const result = this.fish(item, ...types);
    if (result) {
      const meta: Metadata = {
        id: result.id,
        name: result.name
      };
      if (result instanceof Profile || result instanceof Extension) {
        meta.url = this.getMetadataUrl(result, 'StructureDefinition');
        meta.parent = result.parent;
      } else if (result instanceof FshValueSet) {
        meta.url = this.getMetadataUrl(result, 'ValueSet');
      } else if (result instanceof FshCodeSystem) {
        meta.url = this.getMetadataUrl(result, 'CodeSystem');
      }
      return meta;
    }
    return;
  }

  /**
   * Determines the URL to use to refer to a fished-up FHIR entity.
   * If a caret value rule has been applied to the entity's url, use the
   * value specified in that rule.
   * Otherwise, use the default url based on the configured canonical url.
   *
   * @param {Profile | Extension | FshValueSet | FshCodeSystem} result - The FHIR entity that was fished up
   * @param {string} fhirType - The entity's type as a string for building the default URL
   * @returns {string} - The URL to use to refer to the FHIR entity
   */
  getMetadataUrl(
    result: Profile | Extension | FshValueSet | FshCodeSystem,
    fhirType: string
  ): string {
    for (const rule of result.rules) {
      if (rule instanceof CaretValueRule && rule.path === '' && rule.caretPath === 'url') {
        // this value should only be a string, but that might change at some point
        return rule.value.toString();
      }
    }
    return `${this.config.canonical}/${fhirType}/${result.id}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    // the FSHTank cannot return FHIR definitions, but we define this function
    // in order to implement the Fishable interface
  }
}
