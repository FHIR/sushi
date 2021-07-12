import { FSHDocument } from './FSHDocument';
import {
  Profile,
  Extension,
  Logical,
  Resource,
  Instance,
  FshValueSet,
  FshCodeSystem,
  Invariant,
  RuleSet,
  Mapping,
  Configuration
} from '../fshtypes';
import { AssignmentRule } from '../fshtypes/rules';
import { Type, Metadata, Fishable } from '../utils/Fishable';
import { getUrlFromFshDefinition } from '../fhirtypes/common';
import flatMap from 'lodash/flatMap';

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
   * Gets all logical models in the tank
   * @returns {Logical[]}
   */
  public getAllLogicals(): Logical[] {
    return flatMap(this.docs, doc => Array.from(doc.logicals.values()));
  }

  /**
   * Gets all resources in the tank
   * @returns {Resource[]}
   */
  public getAllResources(): Resource[] {
    return flatMap(this.docs, doc => Array.from(doc.resources.values()));
  }

  /**
   * Gets all instances in the tank
   * @returns {Instance[]}
   */
  public getAllInstances(): Instance[] {
    return flatMap(this.docs, doc => Array.from(doc.instances.values()));
  }

  /**
   * Gets all structure definitions (i.e., FshStructures) (profiles, extensions,
   * logical models, and resources) in the tank.
   * @returns {(Profile | Extension)[]}
   */
  public getAllStructureDefinitions(): (Profile | Extension | Logical | Resource)[] {
    return [
      ...this.getAllProfiles(),
      ...this.getAllExtensions(),
      ...this.getAllLogicals(),
      ...this.getAllResources()
    ];
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
    | Logical
    | Resource
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
        Type.Logical,
        Type.Resource,
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
              getUrlFromFshDefinition(p, this.config.canonical) === item
          );
          break;
        case Type.Extension:
          result = this.getAllExtensions().find(
            e =>
              e.name === item ||
              e.id === item ||
              getUrlFromFshDefinition(e, this.config.canonical) === item
          );
          break;
        case Type.Logical:
          result = this.getAllLogicals().find(
            l =>
              l.name === item ||
              l.id === item ||
              getUrlFromFshDefinition(l, this.config.canonical) === item
          );
          break;
        case Type.Resource:
          result = this.getAllResources().find(
            r =>
              r.name === item ||
              r.id === item ||
              getUrlFromFshDefinition(r, this.config.canonical) === item
          );
          break;
        case Type.ValueSet:
          result = this.getAllValueSets().find(
            vs =>
              vs.name === item ||
              vs.id === item ||
              getUrlFromFshDefinition(vs, this.config.canonical) === item
          );
          break;
        case Type.CodeSystem:
          result = this.getAllCodeSystems().find(
            cs =>
              cs.name === item ||
              cs.id === item ||
              getUrlFromFshDefinition(cs, this.config.canonical) === item
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

  fishForAppliedRuleSet(item: string): RuleSet | undefined {
    for (const doc of this.docs) {
      const ruleSet = doc.appliedRuleSets.get(item);
      if (ruleSet) {
        return ruleSet;
      }
    }
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const result = this.fish(item, ...types);
    if (result) {
      const meta: Metadata = {
        id: result.id,
        name: result.name
      };
      if (
        result instanceof Profile ||
        result instanceof Extension ||
        result instanceof Logical ||
        result instanceof Resource
      ) {
        meta.url = getUrlFromFshDefinition(result, this.config.canonical);
        meta.parent = result.parent;
        meta.ancestor = 'StructureDefinition';
        if (result instanceof Logical) {
          // Logical models should always use an absolute URL as their StructureDefinition.type
          // unless HL7 published them. In that case, the URL is relative to
          // http://hl7.org/fhir/StructureDefinition/.
          // Ref: https://chat.fhir.org/#narrow/stream/179177-conformance/topic/StructureDefinition.2Etype.20for.20Logical.20Models.2FCustom.20Resources/near/240488388
          const HL7_URL = 'http://hl7.org/fhir/StructureDefinition/';
          meta.sdType = meta.url.startsWith(HL7_URL) ? meta.url.slice(HL7_URL.length) : meta.url;
        }
      } else if (result instanceof FshValueSet || result instanceof FshCodeSystem) {
        meta.url = getUrlFromFshDefinition(result, this.config.canonical);
        if (result instanceof FshValueSet) {
          meta.ancestor = 'ValueSet';
        } else {
          meta.ancestor = 'CodeSystem';
        }
      } else if (result instanceof Instance) {
        result.rules?.forEach(r => {
          if (r.path === 'url' && r instanceof AssignmentRule && typeof r.value === 'string') {
            meta.url = r.value;
            // don't break; keep looping in case there is a later rule that re-assigns url
          }
        });
        meta.instanceUsage = result.usage;
        meta.ancestor = result.instanceOf;
      }
      return meta;
    }
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    // the FSHTank cannot return FHIR definitions, but we define this function
    // in order to implement the Fishable interface
  }
}
