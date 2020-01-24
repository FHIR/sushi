import { Meta } from './specialTypes';
import { Extension } from '../fshtypes';
import { Narrative, Resource, Identifier, CodeableConcept, Coding } from './dataTypes';
import { ContactDetail, UsageContext } from './metaDataTypes';
import { FHIRId } from './primitiveTypes';

/**
 * Class representing a FHIR R4 CodeSystem
 * @see {@link https://www.hl7.org/fhir/codesystem.html}
 */
export class CodeSystem {
  id?: FHIRId;
  meta?: Meta;
  implicitRules?: string;
  language?: string;
  text?: Narrative;
  contained?: Resource[];
  extension?: Extension[];
  modifierExtension?: Extension[];
  url?: string;
  identifier?: Identifier[];
  version?: string;
  name?: string;
  title?: string;
  status = 'active';
  experimental?: boolean;
  date?: string;
  publisher?: string;
  contact?: ContactDetail[];
  description?: string;
  useContext?: UsageContext[];
  jurisdiction?: CodeableConcept[];
  purpose?: string;
  copyright?: string;
  caseSensitive?: boolean;
  valueSet?: string;
  hierarchyMeaning?: string;
  compositional?: boolean;
  versionNeeded?: boolean;
  content = 'complete';
  supplements?: string;
  count?: number;
  filter?: CodeSystemFilter[];
  property?: CodeSystemProperty[];
  concept?: CodeSystemConcept[];

  /**
   * Get the file name for serializing to disk.
   * @returns {string} the filename
   */
  getFileName(): string {
    return `CodeSystem-${this.id}.json`;
  }

  /**
   * Exports the CodeSystem to a properly formatted FHIR JSON representation.
   * @returns {any} the FHIR JSON representation of the CodeSystem
   */
  toJSON(): any {
    return {
      resourceType: 'CodeSystem',
      ...this
    };
  }
}

export type CodeSystemFilter = {
  code: string;
  description?: string;
  operator: string[];
  value: string;
};

export type CodeSystemProperty = {
  code: string;
  uri?: string;
  description?: string;
  type: string;
};

export type CodeSystemConcept = {
  code: string;
  display?: string;
  definition?: string;
  designation?: CodeSystemConceptDesignation[];
  property?: CodeSystemConceptProperty[];
  concept?: CodeSystemConcept[];
};

export type CodeSystemConceptDesignation = {
  language?: string;
  use?: Coding;
  value: string;
};

export type CodeSystemConceptProperty = {
  code: string;
  // value[x] is 1..1, but can be any one of the following names/types:
  valueCode?: string;
  valueCoding?: Coding;
  valueString?: string;
  valueInteger?: number;
  valueBoolean?: boolean;
  valueDateTime?: string;
  valueDecimal?: number;
};
