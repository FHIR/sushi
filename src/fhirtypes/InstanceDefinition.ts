import cloneDeep = require('lodash/cloneDeep');

/**
 * A class representing a FHIR Instance.
 *
 * The defined properties on InstanceDefinition are relatively simple due to the fact that each FHIR resource will
 * be setting different properties based on their own definitions.
 */
export class InstanceDefinition {
  resourceType: string;
  instanceName: string;
  id?: string;
  [key: string]: any; // Allow any key value pair on InstanceDefinition due to the high number of potential properties that can be set on a FHIR instance

  /**
   * Get the file name for serializing to disk.
   * @returns {string} the filename
   */
  getFileName(): string {
    return `${this.resourceType}-${this.id ?? this.instanceName}.json`;
  }

  toJSON(): any {
    const clone = cloneDeep(this);
    delete clone.instanceName; // Only needed for the file name - not a FHIR property
    return clone;
  }

  static fromJSON(json: { [key: string]: any }): InstanceDefinition {
    const instanceDefinition = new InstanceDefinition();
    Object.keys(json).forEach(key => {
      instanceDefinition[key] = json[key];
    });
    return instanceDefinition;
  }
}
