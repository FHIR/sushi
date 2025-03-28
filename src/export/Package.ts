import {
  LOGICAL_TARGET_EXTENSION,
  TYPE_CHARACTERISTICS_EXTENSION,
  findImposeProfiles
} from '../fhirtypes/common';
import { StructureDefinition, InstanceDefinition, ValueSet, CodeSystem } from '../fhirtypes';
import { Configuration, SourceInfo } from '../fshtypes';
import { Fishable, Type, Metadata } from '../utils/Fishable';

export class Package implements Fishable {
  public readonly profiles: StructureDefinition[] = [];
  public readonly extensions: StructureDefinition[] = [];
  public readonly logicals: StructureDefinition[] = [];
  public readonly resources: StructureDefinition[] = [];
  public readonly instances: InstanceDefinition[] = [];
  public readonly valueSets: ValueSet[] = [];
  public readonly codeSystems: CodeSystem[] = [];

  public readonly fshMap: Map<string, SourceInfo & { fshName: string; fshType: string }> =
    new Map();

  constructor(public readonly config: Configuration) {}

  fish(
    item: string,
    ...types: Type[]
  ): StructureDefinition | ValueSet | CodeSystem | InstanceDefinition | undefined {
    return this.internalFish(item, types, true)[0];
  }

  fishAll(
    item: string,
    ...types: Type[]
  ): (StructureDefinition | ValueSet | CodeSystem | InstanceDefinition)[] {
    return this.internalFish(item, types, false);
  }

  private internalFish(
    item: string,
    types: Type[],
    stopOnFirstMatch: boolean
  ): (StructureDefinition | ValueSet | CodeSystem | InstanceDefinition)[] {
    const results: (StructureDefinition | ValueSet | CodeSystem | InstanceDefinition)[] = [];

    // No types passed in means to search ALL supported types
    if (types.length === 0) {
      types = [
        Type.Profile,
        Type.Extension,
        Type.Logical,
        Type.Resource,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      ];
    }

    // version needs to be checked separately from the base
    const [base, ...versionParts] = item?.split('|') ?? ['', ''];
    const version = versionParts.join('|') || null;

    for (const type of types) {
      let def;
      switch (type) {
        case Type.Profile:
          def = this.profiles.find(
            p =>
              (p.id === base || p.name === base || p.url === base) &&
              (version == null || p.version === version)
          );
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'StructureDefinition' &&
                i.derivation === 'constraint' &&
                i.type !== 'Extension' &&
                (i.id === base || i._instanceMeta.name === base || i.url === base) &&
                (version == null || i.version === version)
            );
          }
          break;
        case Type.Extension:
          def = this.extensions.find(
            e =>
              (e.id === base || e.name === base || e.url === base) &&
              (version == null || e.version === version)
          );
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'StructureDefinition' &&
                i.derivation === 'constraint' &&
                i.type === 'Extension' &&
                (i.id === base || i._instanceMeta.name === base || i.url === base) &&
                (version == null || i.version === version)
            );
          }
          break;
        case Type.Logical:
          def = this.logicals.find(
            l =>
              (l.id === base || l.name === base || l.url === base) &&
              (version == null || l.version === version)
          );
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'StructureDefinition' &&
                i.derivation === 'specialization' &&
                i.kind === 'logical' &&
                (i.id === base || i._instanceMeta.name === base || i.url === base) &&
                (version == null || i.version === version)
            );
          }
          break;
        case Type.Resource:
          def = this.resources.find(
            r =>
              (r.id === base || r.name === base || r.url === base) &&
              (version == null || r.version === version)
          );
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'StructureDefinition' &&
                i.derivation === 'specialization' &&
                i.kind === 'resource' &&
                (i.id === base || i._instanceMeta.name === base || i.url === base) &&
                (version == null || i.version === version)
            );
          }
          break;
        case Type.ValueSet:
          def = this.valueSets.find(
            vs =>
              (vs.id === base || vs.name === base || vs.url === base) &&
              (version == null || vs.version === version)
          );
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'ValueSet' &&
                (i.id === base || i._instanceMeta.name === base || i.url === base) &&
                (version == null || i.version === version)
            );
          }
          break;
        case Type.CodeSystem:
          def = this.codeSystems.find(
            cs =>
              (cs.id === base || cs.name === base || cs.url === base) &&
              (version == null || cs.version === version)
          );
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'CodeSystem' &&
                (i.id === base || i._instanceMeta.name === base || i.url === base) &&
                (version == null || i.version === version)
            );
          }
          break;
        case Type.Instance:
          def = this.instances.find(
            i =>
              (i.id === base || i._instanceMeta.name === base) &&
              (version == null || i.version === version)
          );
          break;
        case Type.Type: // Package doesn't currently support types
        default:
          break;
      }
      if (def) {
        if (stopOnFirstMatch) {
          return [def];
        }
        results.push(def);
      }
    }
    return results;
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    return this.fish(item, ...types)?.toJSON();
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const result = this.fish(item, ...types);
    if (result) {
      return this.extractMetadata(result);
    } else if (
      // If nothing is returned, perhaps the Package itself is being referenced
      item != null &&
      (item === this.config.packageId || item === this.config.name || item === this.config.id)
    ) {
      return this.extractImplementationGuideMetadataFromConfig();
    }
  }

  fishForMetadatas(item: string, ...types: Type[]): Metadata[] {
    const results = this.fishAll(item, ...types);
    const metadatas = results.map(result => this.extractMetadata(result));
    // Also handle cases where the Package itself is being referenced
    if (
      item != null &&
      (item === this.config.packageId || item === this.config.name || item === this.config.id)
    ) {
      metadatas.push(this.extractImplementationGuideMetadataFromConfig());
    }
    return metadatas;
  }

  private extractMetadata(
    result: StructureDefinition | ValueSet | CodeSystem | InstanceDefinition
  ): Metadata {
    if (result) {
      const metadata: Metadata = {
        id: result.id,
        name: result instanceof InstanceDefinition ? result._instanceMeta.name : result.name,
        instanceUsage:
          result instanceof InstanceDefinition ? result._instanceMeta.usage : undefined,
        url: result.url,
        version: result.version,
        resourceType: result.resourceType
      };
      if (result instanceof StructureDefinition) {
        metadata.sdType = result.type;
        metadata.parent = result.baseDefinition;
        const imposeProfiles = findImposeProfiles(result);
        if (imposeProfiles) {
          metadata.imposeProfiles = imposeProfiles;
        }

        if (result.kind === 'logical') {
          metadata.canBeTarget =
            result.extension?.some(ext => {
              return (
                (ext?.url === TYPE_CHARACTERISTICS_EXTENSION &&
                  ext?.valueCode === 'can-be-target') ||
                (ext?.url === LOGICAL_TARGET_EXTENSION && ext?.valueBoolean === true)
              );
            }) ?? false;
          // if the export is still in progress, there may be unprocessed rules that make this a valid reference target
          // return undefined to force the metadata to come from the tank
          if (metadata.canBeTarget === false && result.inProgress) {
            return undefined;
          }

          metadata.canBind =
            result.extension?.some(
              ext => ext?.url === TYPE_CHARACTERISTICS_EXTENSION && ext?.valueCode === 'can-bind'
            ) ?? false;
          // if the export is still in progress, there may be unprocessed rules that make this a valid bindable type
          // return undefined to force the metadata to come from the tank
          if (metadata.canBeTarget === false && result.inProgress) {
            return undefined;
          }
        }
      }
      return metadata;
    }
  }

  private extractImplementationGuideMetadataFromConfig(): Metadata {
    const metadata: Metadata = {
      id: this.config.packageId || this.config.id,
      name: this.config.name,
      url:
        this.config.url ||
        `${this.config.canonical}/ImplementationGuide/${this.config.packageId || this.config.id}`,
      version: this.config.version,
      resourceType: 'ImplementationGuide'
    };
    return metadata;
  }

  // Resets all the definition arrays to be zero-length. This is useful for re-using a package during testing.
  clearAllDefinitions() {
    this.profiles.length = 0;
    this.extensions.length = 0;
    this.logicals.length = 0;
    this.resources.length = 0;
    this.instances.length = 0;
    this.valueSets.length = 0;
    this.codeSystems.length = 0;
  }
}
