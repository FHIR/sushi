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
  Configuration,
  FshCode
} from '../fshtypes';
import { AssignmentRule, AssignmentValueType, CaretValueRule } from '../fshtypes/rules';
import { Type, Metadata, Fishable } from '../utils/Fishable';
import {
  applyInsertRules,
  getUrlFromFshDefinition,
  getVersionFromFshDefinition,
  IMPOSE_PROFILE_EXTENSION,
  LOGICAL_TARGET_EXTENSION,
  TYPE_CHARACTERISTICS_EXTENSION
} from '../fhirtypes/common';
import flatMap from 'lodash/flatMap';
import { getNonInstanceValueFromRules } from '../fshtypes/common';
import { logger } from '../utils/FSHLogger';

export class FSHTank implements Fishable {
  constructor(
    public readonly docs: FSHDocument[],
    public readonly config: Configuration
  ) {}

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

  checkDuplicateNameEntities(): undefined {
    const allEntities = [
      ...this.getAllStructureDefinitions(),
      ...this.getAllInstances(),
      ...this.getAllMappings(),
      ...this.getAllInvariants(),
      ...this.getAllValueSets(),
      ...this.getAllCodeSystems(),
      ...this.getAllRuleSets(),
      ...this.getAllExtensions()
    ];

    const duplicateEntities = new Set();
    allEntities.forEach(entity => {
      if (
        this.docs.some(
          doc =>
            (doc.profiles.has(entity.name) && doc.profiles.get(entity.name) != entity) ||
            (doc.extensions.has(entity.name) && doc.extensions.get(entity.name) != entity) ||
            (doc.logicals.has(entity.name) && doc.logicals.get(entity.name) != entity) ||
            (doc.resources.has(entity.name) && doc.resources.get(entity.name) != entity) ||
            (doc.instances.has(entity.name) && doc.instances.get(entity.name) != entity) ||
            (doc.mappings.has(entity.name) && doc.mappings.get(entity.name) != entity) ||
            (doc.invariants.has(entity.name) && doc.invariants.get(entity.name) != entity) ||
            (doc.valueSets.has(entity.name) && doc.valueSets.get(entity.name) != entity) ||
            (doc.codeSystems.has(entity.name) && doc.codeSystems.get(entity.name) != entity) ||
            (doc.ruleSets.has(entity.name) && doc.ruleSets.get(entity.name) != entity)
        )
      ) {
        duplicateEntities.add(entity.name);
      }
    });

    if (duplicateEntities.size > 0) {
      logger.warn(
        'Detected FSH entity definitions with duplicate names. While FSH allows for duplicate ' +
          'names across entity types, they can lead to ambiguous results when referring to these ' +
          'entities by name elsewhere (e.g., in references). Consider using unique names in FSH ' +
          'declarations and assigning duplicated names using caret assignment rules instead. ' +
          `Detected duplicate names: ${Array.from(duplicateEntities).join(', ')}.`
      );
    }
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
    return this.internalFish(item, types, true)[0];
  }

  fishAll(
    item: string,
    ...types: Type[]
  ): (
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
  )[] {
    return this.internalFish(item, types, false);
  }

  private internalFish(
    item: string,
    types: Type[],
    stopOnFirstMatch: boolean
  ): (
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
  )[] {
    const results: (
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
    )[] = [];

    // Resolve alias if necessary
    item = this.resolveAlias(item) ?? item;

    // version needs to be checked separately from the base
    const [base, ...versionParts] = item?.split('|') ?? ['', ''];
    const version = versionParts.join('|') || null;

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

    const allInstances = this.getAllInstances();
    for (const t of types) {
      let entitiesToSearch;
      let entityMatcher: (x: any) => boolean;
      let instanceMatcher: (instance: Instance) => boolean;
      switch (t) {
        case Type.Profile:
          entitiesToSearch = this.getAllProfiles();
          entityMatcher = (p: Profile) => {
            return (
              (p.name === base ||
                p.id === base ||
                getUrlFromFshDefinition(p, this.config.canonical) === base) &&
              (version == null || version === getVersionFromFshDefinition(p, this.config.version))
            );
          };
          instanceMatcher = (profileInstance: Instance) => {
            return (
              profileInstance.instanceOf === 'StructureDefinition' &&
              profileInstance.usage === 'Definition' &&
              (profileInstance.name === base ||
                profileInstance.id === base ||
                getUrlFromFshDefinition(profileInstance, this.config.canonical) === base) &&
              (version == null ||
                version === getVersionFromFshDefinition(profileInstance, this.config.version)) &&
              profileInstance.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  rule.path === 'derivation' &&
                  rule.value instanceof FshCode &&
                  rule.value.code === 'constraint'
              ) &&
              !profileInstance.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  rule.path === 'type' &&
                  rule.value === 'Extension'
              )
            );
          };
          break;
        case Type.Extension:
          entitiesToSearch = this.getAllExtensions();
          entityMatcher = (e: Extension) => {
            return (
              (e.name === base ||
                e.id === base ||
                getUrlFromFshDefinition(e, this.config.canonical) === base) &&
              (version == null || version === getVersionFromFshDefinition(e, this.config.version))
            );
          };
          instanceMatcher = (extensionInstance: Instance) => {
            return (
              extensionInstance.instanceOf === 'StructureDefinition' &&
              extensionInstance.usage === 'Definition' &&
              (extensionInstance.name === base ||
                extensionInstance.id === base ||
                getUrlFromFshDefinition(extensionInstance, this.config.canonical) === base) &&
              (version == null ||
                version === getVersionFromFshDefinition(extensionInstance, this.config.version)) &&
              extensionInstance.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  rule.path === 'derivation' &&
                  rule.value instanceof FshCode &&
                  rule.value.code === 'constraint'
              ) &&
              extensionInstance.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  rule.path === 'type' &&
                  rule.value === 'Extension'
              )
            );
          };
          break;
        case Type.Logical:
          entitiesToSearch = this.getAllLogicals();
          entityMatcher = (l: Logical) => {
            return (
              (l.name === base ||
                l.id === base ||
                getUrlFromFshDefinition(l, this.config.canonical) === base) &&
              (version == null || version === getVersionFromFshDefinition(l, this.config.version))
            );
          };
          instanceMatcher = (logicalInstance: Instance) => {
            return (
              logicalInstance.instanceOf === 'StructureDefinition' &&
              logicalInstance.usage === 'Definition' &&
              (logicalInstance.name === base ||
                logicalInstance.id === base ||
                getUrlFromFshDefinition(logicalInstance, this.config.canonical) === base) &&
              (version == null ||
                version === getVersionFromFshDefinition(logicalInstance, this.config.version)) &&
              logicalInstance.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  rule.path === 'derivation' &&
                  rule.value instanceof FshCode &&
                  rule.value.code === 'specialization'
              ) &&
              logicalInstance.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  rule.path === 'kind' &&
                  rule.value instanceof FshCode &&
                  rule.value.code === 'logical'
              )
            );
          };
          break;
        case Type.Resource:
          entitiesToSearch = this.getAllResources();
          entityMatcher = (r: Resource) => {
            return (
              (r.name === base ||
                r.id === base ||
                getUrlFromFshDefinition(r, this.config.canonical) === base) &&
              (version == null || version === getVersionFromFshDefinition(r, this.config.version))
            );
          };
          instanceMatcher = (resourceInstance: Instance) => {
            return (
              resourceInstance.instanceOf === 'StructureDefinition' &&
              resourceInstance.usage === 'Definition' &&
              (resourceInstance.name === base ||
                resourceInstance.id === base ||
                getUrlFromFshDefinition(resourceInstance, this.config.canonical) === base) &&
              (version == null ||
                version === getVersionFromFshDefinition(resourceInstance, this.config.version)) &&
              resourceInstance.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  rule.path === 'derivation' &&
                  rule.value instanceof FshCode &&
                  rule.value.code === 'specialization'
              ) &&
              resourceInstance.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  rule.path === 'kind' &&
                  rule.value instanceof FshCode &&
                  rule.value.code === 'resource'
              )
            );
          };
          break;
        case Type.ValueSet:
          entitiesToSearch = this.getAllValueSets();
          entityMatcher = (vs: FshValueSet) => {
            return (
              (vs.name === base ||
                vs.id === base ||
                getUrlFromFshDefinition(vs, this.config.canonical) === base ||
                getNonInstanceValueFromRules(vs, 'name', '', 'name') === base) &&
              (version == null || version === getVersionFromFshDefinition(vs, this.config.version))
            );
          };
          instanceMatcher = (vsInstance: Instance) => {
            return (
              vsInstance?.instanceOf === 'ValueSet' &&
              (vsInstance?.usage === 'Definition' || vsInstance?.usage === 'Inline') &&
              (vsInstance?.name === base ||
                vsInstance.id === base ||
                getUrlFromFshDefinition(vsInstance, this.config.canonical) === base ||
                getNonInstanceValueFromRules(vsInstance, 'name', '', 'name') === base) &&
              (version == null ||
                version === getVersionFromFshDefinition(vsInstance, this.config.version))
            );
          };
          break;
        case Type.CodeSystem:
          entitiesToSearch = this.getAllCodeSystems();
          entityMatcher = (cs: FshCodeSystem) => {
            return (
              (cs.name === base ||
                cs.id === base ||
                getUrlFromFshDefinition(cs, this.config.canonical) === base ||
                getNonInstanceValueFromRules(cs, 'name', '', 'name') === base) &&
              (version == null || version === getVersionFromFshDefinition(cs, this.config.version))
            );
          };
          instanceMatcher = (csInstance: Instance) => {
            return (
              csInstance?.instanceOf === 'CodeSystem' &&
              (csInstance?.usage === 'Definition' || csInstance?.usage === 'Inline') &&
              (csInstance?.name === base ||
                csInstance.id === base ||
                getUrlFromFshDefinition(csInstance, this.config.canonical) === base ||
                getNonInstanceValueFromRules(csInstance, 'name', '', 'name') === base) &&
              (version == null ||
                version === getVersionFromFshDefinition(csInstance, this.config.version))
            );
          };
          break;
        case Type.Instance:
          entitiesToSearch = allInstances;
          entityMatcher = (i: Instance) => {
            return (
              (i.name === base || i.id === base) &&
              (version == null || version === getVersionFromFshDefinition(i, this.config.version))
            );
          };
          break;
        case Type.Invariant:
          entitiesToSearch = this.getAllInvariants();
          entityMatcher = (i: Invariant) => i.name === base;
          break;
        case Type.RuleSet:
          entitiesToSearch = this.getAllRuleSets();
          entityMatcher = (rs: RuleSet) => rs.name === base;
          break;
        case Type.Mapping:
          entitiesToSearch = this.getAllMappings();
          entityMatcher = (m: Mapping) => m.name === base;
          break;
        case Type.Type:
        default:
          // Tank doesn't support these types
          continue;
      }
      if (stopOnFirstMatch) {
        const entity = entitiesToSearch.find(entityMatcher);
        if (entity) {
          return [entity];
        }
        if (instanceMatcher) {
          const instance = allInstances.find(instanceMatcher);
          if (instance) {
            return [instance];
          }
        }
      } else {
        results.push(...entitiesToSearch.filter(entityMatcher));
        if (instanceMatcher) {
          results.push(...allInstances.filter(instanceMatcher));
        }
      }
    }
    return results;
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
    return this.extractMetadataFromEntity(result);
  }

  fishForMetadatas(item: string, ...types: Type[]): Metadata[] {
    const results = this.fishAll(item, ...types);
    return results.map(result => this.extractMetadataFromEntity(result));
  }

  private extractMetadataFromEntity(
    entity:
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
  ): Metadata {
    if (entity) {
      applyInsertRules(entity, this);
      const meta: Metadata = {
        id: entity.id,
        name: entity.name
      };
      if (
        entity instanceof Profile ||
        entity instanceof Extension ||
        entity instanceof Logical ||
        entity instanceof Resource
      ) {
        meta.url = getUrlFromFshDefinition(entity, this.config.canonical);
        meta.parent = entity.parent;
        meta.resourceType = 'StructureDefinition';
        const imposeProfiles = this.findExtensionValues(
          entity,
          IMPOSE_PROFILE_EXTENSION,
          'structuredefinition-imposeProfile',
          'SDImposeProfile'
        ) as string[];
        if (imposeProfiles.length) {
          meta.imposeProfiles = imposeProfiles;
        }
        if (entity instanceof Logical) {
          // Logical models should always use an absolute URL as their StructureDefinition.type
          // unless HL7 published them. In that case, the URL is relative to
          // http://hl7.org/fhir/StructureDefinition/.
          // Ref: https://chat.fhir.org/#narrow/stream/179177-conformance/topic/StructureDefinition.2Etype.20for.20Logical.20Models.2FCustom.20Resources/near/240488388
          const HL7_URL = 'http://hl7.org/fhir/StructureDefinition/';
          meta.sdType = meta.url.startsWith(HL7_URL) ? meta.url.slice(HL7_URL.length) : meta.url;
          meta.canBeTarget = this.hasLogicalCharacteristic(entity, 'can-be-target');
          meta.canBind = this.hasLogicalCharacteristic(entity, 'can-bind');
        }
      } else if (entity instanceof FshValueSet || entity instanceof FshCodeSystem) {
        meta.url = getUrlFromFshDefinition(entity, this.config.canonical);
        if (entity instanceof FshValueSet) {
          meta.resourceType = 'ValueSet';
        } else {
          meta.resourceType = 'CodeSystem';
        }
      } else if (entity instanceof Instance) {
        const assignedUrl = getNonInstanceValueFromRules(entity, 'url', '', 'url');
        if (typeof assignedUrl === 'string') {
          meta.url = assignedUrl;
        }
        meta.instanceUsage = entity.usage;
      }
      return meta;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    // the FSHTank cannot return FHIR definitions, but we define this function
    // in order to implement the Fishable interface
  }

  private hasLogicalCharacteristic(logical: Logical, code: string) {
    if (logical.characteristics.includes(code)) {
      return true;
    } else {
      const charValues = this.findExtensionValues(
        logical,
        TYPE_CHARACTERISTICS_EXTENSION,
        'structuredefinition-type-characteristics',
        'SDTypeCharacteristics'
      ) as FshCode[];
      if (charValues.some(v => v.code === code)) {
        return true;
      }
      if (code === 'can-be-target') {
        const targetValues = this.findExtensionValues(
          logical,
          LOGICAL_TARGET_EXTENSION,
          'logical-target',
          'LogicalTarget'
        ) as boolean[];
        if (targetValues.some(v => v === true)) {
          return true;
        }
      }
    }
    return false;
  }

  private findExtensionValues(
    item: Profile | Extension | Logical | Resource,
    extensionUrl: string,
    extensionId: string,
    extensionName: string
  ): AssignmentValueType[] {
    // Iterate the rules and collect the indices for rules regarding the desired extension
    // and the values for all rules that assign a simple extension value
    const matchingExtensionIndexers: string[] = [];
    const indexerToValueMap = new Map<string, AssignmentValueType>();
    item.rules.forEach(rule => {
      if (rule.path === '' && rule instanceof CaretValueRule && rule.caretPath?.length) {
        // Match on simple extension url or value rules using a numeric index
        const numericMatch = rule.caretPath.match(
          /^extension(\[\d+\])?\.(url|value[A-Z][A-Za-z0-9]*)$/
        );
        if (numericMatch) {
          const indexer = numericMatch[1] ? numericMatch[1] : '[0]';
          if (numericMatch[2] === 'url') {
            // It's an extension url, but is it the one we want?
            if (rule.value.toString() === extensionUrl) {
              matchingExtensionIndexers.push(indexer);
            }
          } else {
            // We might not know if it's the extension indexer we want, so store it in case
            indexerToValueMap.set(indexer, rule.value);
          }
        } else {
          // If it wasn't a numeric indexer, check for a url/id/name indexer w/ a value, e.g.:
          // extension[http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics][1].valueCode
          const namedMatch = rule.caretPath.match(
            /^extension(\[([^\]]+)\](\[\d+\])?)\.value[A-Z][A-Za-z0-9]*$/
          );
          if (namedMatch) {
            // namedMatch[0]: extension[http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics][1].valueCode
            // namedMatch[1]: [http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics][1]
            // namedMatch[2]: http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics
            // namedMatch[3]: [1]
            const name = this.resolveAlias(namedMatch[2]) ?? namedMatch[2];
            if ([extensionUrl, extensionId, extensionName].includes(name)) {
              const indexer = `[${extensionUrl}]${namedMatch[3] ?? '[0]'}`;
              matchingExtensionIndexers.push(indexer);
              indexerToValueMap.set(indexer, rule.value);
            }
          }
        }
      }
    });
    return matchingExtensionIndexers
      .map(index => indexerToValueMap.get(index))
      .filter(value => value != null);
  }
}
