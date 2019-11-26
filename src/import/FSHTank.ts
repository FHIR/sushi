import { FSHDocument } from './FSHDocument';
import { Profile, Extension } from '../fshtypes';
import flatMap from 'lodash/flatMap';

export class FSHTank {
  constructor(public readonly docs: FSHDocument[], public readonly config: any) {}

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
   * Finds the profile in the tank by name, if it exists
   * @param {string} name - The name of the profile we're looking for
   * @returns {Profile | undefined}
   */
  public findProfileByName(name: string): Profile | undefined {
    return this.getAllProfiles().find(profile => profile.name === name);
  }

  /**
   * Finds the extension in the tank by name, if it exists
   * @param {string} name - The name of the extension we're looking for
   * @returns {Extension | undefined}
   */
  public findExtensionByName(name: string): Extension | undefined {
    return this.getAllExtensions().find(extension => extension.name === name);
  }
}
