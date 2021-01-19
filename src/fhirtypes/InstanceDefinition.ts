import { difference, remove, pull, cloneDeep, isObjectLike } from 'lodash';
import { Meta } from './specialTypes';
import { HasId } from './common';
import { applyMixins } from '../utils';
import { InstanceUsage } from '../fshtypes';

/**
 * A class representing a FHIR Instance.
 *
 * The defined properties on InstanceDefinition are relatively simple due to the fact that each FHIR resource will
 * be setting different properties based on their own definitions.
 */
export class InstanceDefinition {
  _instanceMeta: InstanceMeta = {};
  resourceType: string;
  // id?: FHIRId; // provided by HasId mixin
  meta?: Meta;
  [key: string]: any; // Allow any key value pair on InstanceDefinition due to the high number of potential properties that can be set on a FHIR instance

  /**
   * Get the file name for serializing to disk.
   * @returns {string} the filename
   */
  getFileName(): string {
    return `${this.resourceType}-${this.id ?? this._instanceMeta.name}.json`;
  }

  toJSON(): any {
    const orderedKeys = ['resourceType', '_resourceType', 'id', '_id', 'meta', '_meta'].filter(
      key => this[key] != null
    );
    // _instanceMeta is only needed for lookup and IG config - not a FHIR property
    const additionalKeys = difference(Object.keys(this), [...orderedKeys, '_instanceMeta']);
    return orderedCloneDeep(this, [...orderedKeys, ...additionalKeys]);
  }

  static fromJSON(json: { [key: string]: any }): InstanceDefinition {
    const instanceDefinition = new InstanceDefinition();
    Object.keys(json).forEach(key => {
      instanceDefinition[key] = json[key];
    });
    // Default the meta name to the id
    if (json.id != null) {
      instanceDefinition._instanceMeta.name = json.id;
    }
    return instanceDefinition;
  }
}

/**
 * Make a deep clone recursively, adding properties in the order expected for exported JSON.
 * If a list of keys is provided, use those properties from the input.
 * Otherwise, use all properties from the input.
 *
 * @param input - the value to clone
 * @param keys - optionally, the properties of the value to include in the clone, default's to input keys if not specified
 * @returns {any} - a clone of the input, with reordered properties
 */
function orderedCloneDeep(input: any, keys?: string[]): any {
  // non-objects should be cloned normally
  // arrays should get a recursive call on their elements, but don't need reordering
  if (!isObjectLike(input)) {
    return cloneDeep(input);
  } else if (Array.isArray(input)) {
    return input.map(element => orderedCloneDeep(element));
  } else {
    if (keys == null) {
      keys = Object.keys(input);
    }
    const underscoreKeys = remove(keys, key => key.startsWith('_'));
    const orderedKeys: string[] = [];
    const result: any = {};

    keys.forEach(key => {
      orderedKeys.push(key);
      if (underscoreKeys.includes(`_${key}`)) {
        orderedKeys.push(`_${key}`);
        pull(underscoreKeys, `_${key}`);
      }
    });
    underscoreKeys.forEach(key => {
      orderedKeys.push(key);
    });

    orderedKeys.forEach(key => {
      result[key] = orderedCloneDeep(input[key]);
    });

    return result;
  }
}

type InstanceMeta = {
  name?: string;
  title?: string;
  description?: string;
  usage?: InstanceUsage;
  sdType?: string;
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InstanceDefinition extends HasId {}
applyMixins(InstanceDefinition, [HasId]);
