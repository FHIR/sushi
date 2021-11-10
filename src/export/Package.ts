import { StructureDefinition, InstanceDefinition, ValueSet, CodeSystem } from '../fhirtypes';
import { Configuration } from '../fshtypes';
import { Fishable, Type, Metadata } from '../utils/Fishable';

export class Package implements Fishable {
  public readonly profiles: StructureDefinition[] = [];
  public readonly extensions: StructureDefinition[] = [];
  public readonly logicals: StructureDefinition[] = [];
  public readonly resources: StructureDefinition[] = [];
  public readonly instances: InstanceDefinition[] = [];
  public readonly valueSets: ValueSet[] = [];
  public readonly codeSystems: CodeSystem[] = [];

  constructor(public readonly config: Configuration) {}

  fish(
    item: string,
    ...types: Type[]
  ): StructureDefinition | ValueSet | CodeSystem | InstanceDefinition | undefined {
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

    for (const type of types) {
      let def;
      switch (type) {
        case Type.Profile:
          def = this.profiles.find(p => p.id === item || p.name === item || p.url === item);
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'StructureDefinition' &&
                i.derivation === 'constraint' &&
                i.type !== 'Extension' &&
                (i.id === item || i._instanceMeta.name === item || i.url === item)
            );
          }
          break;
        case Type.Extension:
          def = this.extensions.find(e => e.id === item || e.name === item || e.url === item);
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'StructureDefinition' &&
                i.derivation === 'constraint' &&
                i.type === 'Extension' &&
                (i.id === item || i._instanceMeta.name === item || i.url === item)
            );
          }
          break;
        case Type.Logical:
          def = this.logicals.find(e => e.id === item || e.name === item || e.url === item);
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'StructureDefinition' &&
                i.derivation === 'specialization' &&
                i.kind === 'logical' &&
                (i.id === item || i._instanceMeta.name === item || i.url === item)
            );
          }
          break;
        case Type.Resource:
          def = this.resources.find(e => e.id === item || e.name === item || e.url === item);
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'StructureDefinition' &&
                i.derivation === 'specialization' &&
                i.kind === 'resource' &&
                (i.id === item || i._instanceMeta.name === item || i.url === item)
            );
          }
          break;
        case Type.ValueSet:
          def = this.valueSets.find(vs => vs.id === item || vs.name === item || vs.url === item);
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'ValueSet' &&
                (i.id === item || i._instanceMeta.name === item || i.url === item)
            );
          }
          break;
        case Type.CodeSystem:
          def = this.codeSystems.find(cs => cs.id === item || cs.name === item || cs.url === item);
          if (!def) {
            def = this.instances.find(
              i =>
                i._instanceMeta.usage === 'Definition' &&
                i.resourceType === 'CodeSystem' &&
                (i.id === item || i._instanceMeta.name === item || i.url === item)
            );
          }
          break;
        case Type.Instance:
          def = this.instances.find(i => i.id === item || i._instanceMeta.name === item);
          break;
        case Type.Type: // Package doesn't currently support types
        default:
          break;
      }
      if (def) {
        return def;
      }
    }
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    return this.fish(item, ...types)?.toJSON();
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const result = this.fish(item, ...types);
    if (result) {
      const metadata: Metadata = {
        id: result.id,
        name: result instanceof InstanceDefinition ? result._instanceMeta.name : result.name,
        instanceUsage:
          result instanceof InstanceDefinition ? result._instanceMeta.usage : undefined,
        url: result.url,
        resourceType: result.resourceType
      };
      if (result instanceof StructureDefinition) {
        metadata.sdType = result.type;
        metadata.parent = result.baseDefinition;
      }
      return metadata;
    }
  }
}
