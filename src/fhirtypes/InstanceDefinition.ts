import { cloneDeep, remove, pull } from 'lodash';
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
    const orderedKeys: string[] = [];
    const keys = Object.keys(this);
    const underscoreKeys = remove(keys, key => key.startsWith('_'));
    // Reconstruct the object with properties in the expected serialization order.
    // resourceType, id, and meta are handled separately because they come before any other properties.
    // When properties on a primitive field (e.g. "status"), exist, they will have
    // an underscore-prefixed key (e.g. "_status"). If both of these properties exist
    // on the instance, they should appear next to one another.
    const clone: any = {
      resourceType: cloneDeep(this.resourceType)
    };
    if (this._resourceType) {
      clone._resourceType = cloneDeep(this._resourceType);
    }
    if (this.id) {
      clone.id = cloneDeep(this.id);
    }
    if (this._id) {
      clone._id = cloneDeep(this._id);
    }
    if (this.meta) {
      clone.meta = cloneDeep(this.meta);
    }
    if (this._meta) {
      clone._meta = cloneDeep(this._meta);
    }
    // remove values from keys and underscoreKeys if we do not need to handle them now
    // _instanceMeta is only needed for lookup and IG config - not a FHIR property
    pull(keys, 'resourceType', 'id', 'meta');
    pull(underscoreKeys, '_resourceType', '_id', '_meta', '_instanceMeta');

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
      clone[key] = cloneDeep(this[key]);
    });

    return clone;
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
