import sanitize from 'sanitize-filename';
import { Meta } from './specialTypes';
import {
  Narrative,
  Resource,
  Identifier,
  CodeableConcept,
  Coding,
  Extension,
  Element
} from './dataTypes';
import { ContactDetail, UsageContext } from './metaDataTypes';
import { HasName, HasId } from './mixins';
import { applyMixins } from '../utils/Mixin';
import { StructureDefinition } from './StructureDefinition';
import { Fishable, Type } from '../utils';
import { orderedCloneDeep } from './common';

/**
 * Class representing a FHIR R4 ValueSet.
 *
 * @see {@link http://hl7.org/fhir/R4/valueset.html | FHIR ValueSet}
 */

export class ValueSet {
  readonly resourceType = 'ValueSet';
  // id: FHIRId; // provided by HasId mixin
  meta: Meta;
  implicitRules: string;
  language: string;
  text: Narrative;
  contained: Resource[];
  extension: Extension[];
  modifierExtension: Extension[];
  url: string;
  identifier: Identifier[];
  version: string;
  // name: string; // provided by HasName mixin
  title: string;
  status: 'draft' | 'active' | 'retired' | 'unknown' = 'draft';
  experimental: boolean;
  date: string;
  publisher: string;
  contact: ContactDetail[];
  description: string;
  useContext: UsageContext[];
  jurisdiction: CodeableConcept[];
  immutable: boolean;
  purpose: string;
  copyright: string;
  compose: ValueSetCompose;

  /**
   * Get the Structure Definition for ValueSet
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @returns {StructureDefinition} the StructureDefinition of ValueSet
   */
  getOwnStructureDefinition(fisher: Fishable): StructureDefinition {
    return StructureDefinition.fromJSON(fisher.fishForFHIR('ValueSet', Type.Resource));
  }

  /**
   * Get the file name for serializing to disk.
   * @returns {string} the filename
   */
  getFileName(): string {
    return sanitize(`ValueSet-${this.id}.json`, { replacement: '-' });
  }

  /**
   * Exports the ValueSet to a properly formatted FHIR JSON representation.
   * @returns {any} the FHIR JSON representation of the ValueSet
   */
  toJSON(): any {
    return {
      ...orderedCloneDeep(this)
    };
  }
}

export interface ValueSet extends HasName, HasId {}
applyMixins(ValueSet, [HasName, HasId]);

export type ValueSetCompose = {
  lockedDate?: string;
  inactive?: boolean;
  include: ValueSetComposeIncludeOrExclude[];
  exclude?: ValueSetComposeIncludeOrExclude[];
};

export type ValueSetComposeIncludeOrExclude = {
  system?: string;
  _system?: Element;
  version?: string;
  valueSet?: string[];
  concept?: ValueSetComposeConcept[];
  filter?: ValueSetComposeFilter[];
};

export type ValueSetComposeConcept = {
  code: string;
  display?: string;
  designation?: ValueSetComposeConceptDesignation[];
};

export type ValueSetComposeConceptDesignation = {
  language?: string;
  use?: Coding;
  value: string;
};

export type ValueSetComposeFilter = {
  property: string;
  op: string;
  value: string;
};
