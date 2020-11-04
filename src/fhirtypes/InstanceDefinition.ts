import { difference } from 'lodash';
import { Meta } from './specialTypes';
import { HasId, orderedCloneDeep } from './common';
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
