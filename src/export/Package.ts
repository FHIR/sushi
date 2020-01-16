import { StructureDefinition, InstanceDefinition, ValueSet, CodeSystem } from '../fhirtypes';
import { Config } from '../fshtypes';
import { Fishable, Type, Metadata } from '../utils/Fishable';

export class Package implements Fishable {
  public readonly profiles: StructureDefinition[] = [];
  public readonly extensions: StructureDefinition[] = [];
  public readonly instances: InstanceDefinition[] = [];
  public readonly valueSets: ValueSet[] = [];
  public readonly codeSystems: CodeSystem[] = [];

  constructor(public readonly config: Config) {}

  fish(
    item: string,
    ...types: Type[]
  ): StructureDefinition | ValueSet | CodeSystem | InstanceDefinition | undefined {
    // No types passed in means to search ALL supported types
    if (types.length === 0) {
      types = [Type.Profile, Type.Extension, Type.ValueSet, Type.CodeSystem, Type.Instance];
    }

    for (const type of types) {
      let def;
      switch (type) {
        case Type.Profile:
          def = this.profiles.find(p => p.id === item || p.name === item || p.url === item);
          break;
        case Type.Extension:
          def = this.extensions.find(e => e.id === item || e.name === item || e.url === item);
          break;
        case Type.ValueSet:
          def = this.valueSets.find(vs => vs.id === item || vs.name === item || vs.url === item);
          break;
        case Type.CodeSystem:
          def = this.codeSystems.find(cs => cs.id === item || cs.name === item || cs.url === item);
          break;
        case Type.Instance:
          def = this.instances.find(i => i.id === item || i.instanceName === item);
          break;
        case Type.Resource: // Package doesn't currently support resources
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
        name: result instanceof InstanceDefinition ? result.instanceName : result.name,
        url: result.url
      };
      if (result instanceof StructureDefinition) {
        metadata.sdType = result.type;
        metadata.parent = result.baseDefinition;
      } else if (result instanceof InstanceDefinition) {
        if (result.meta && result.meta.profile && result.meta.profile.length > 0) {
          metadata.instanceOf = result.meta.profile[0];
        } else {
          metadata.instanceOf = result.resourceType;
        }
      }
      return metadata;
    }
  }
}
