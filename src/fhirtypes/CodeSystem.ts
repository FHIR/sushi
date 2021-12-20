import sanitize from 'sanitize-filename';
import { cloneDeep } from 'lodash';
import { Meta } from './specialTypes';
import { Extension } from '../fshtypes';
import { Narrative, Resource, Identifier, CodeableConcept, Coding } from './dataTypes';
import { ContactDetail, UsageContext } from './metaDataTypes';
import { HasName, HasId } from './mixins';
import { applyMixins } from '../utils/Mixin';

/**
 * Class representing a FHIR R4 CodeSystem
 * @see {@link https://www.hl7.org/fhir/codesystem.html}
 */
export class CodeSystem {
  readonly resourceType = 'CodeSystem';
  // id?: FHIRId; // provided by HasId mixin
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
  // name?: string; // provided by HasName mixin
  title?: string;
  status: 'draft' | 'active' | 'retired' | 'unknown' = 'active';
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
  content: 'not-present' | 'example' | 'fragment' | 'complete' | 'supplement' = 'complete';
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
    return sanitize(`CodeSystem-${this.id}.json`, { replacement: '-' });
  }

  /**
   * Exports the CodeSystem to a properly formatted FHIR JSON representation.
   * @returns {any} the FHIR JSON representation of the CodeSystem
   */
  toJSON(): any {
    return {
      ...cloneDeep(this)
    };
  }
}

export interface CodeSystem extends HasId, HasName {}
applyMixins(CodeSystem, [HasId, HasName]);

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
