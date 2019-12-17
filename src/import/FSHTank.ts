import { FSHDocument } from './FSHDocument';
import { Profile, Extension } from '../fshtypes';
import flatMap from 'lodash/flatMap';
import { Config } from '../fshtypes/Config';

export class FSHTank {
  constructor(
    public readonly docs: FSHDocument[],
    public readonly config: Config,
    public readonly root?: string
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
   * Finds the profile in the tank by name, id, or alias, if it exists
   * @param {string} key - The name or id of the profile we're looking for
   * @returns {Profile | undefined}
   */
  public findProfile(key: string): Profile | undefined {
    return this.getAllProfiles().find(
      p =>
        p.name === key ||
        p.id === key ||
        `${this.config.canonical}/StructureDefinition/${p.id}` === key
    );
  }

  /**
   * Finds the extension in the tank by name, id, or alias, if it exists
   * @param {string} key - The name or id of the extension we're looking for
   * @returns {[Extension, string]}
   */
  public findExtension(key: string): Extension | undefined {
    return this.getAllExtensions().find(
      p =>
        p.name === key ||
        p.id === key ||
        `${this.config.canonical}/StructureDefinition/${p.id}` === key
    );
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
}
