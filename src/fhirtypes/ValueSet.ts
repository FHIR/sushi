import { Meta } from './specialTypes';

import { Extension } from '../fshtypes';
import { Narrative, Resource, Identifier, CodeableConcept, Coding } from './dataTypes';
import { ContactDetail, UsageContext } from './metaDataTypes';

/**
 * Class representing a FHIR R4 ValueSet.
 *
 * @see {@link http://hl7.org/fhir/R4/valueset.html | FHIR ValueSet}
 */

export class ValueSet {
  id: string;
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
  name: string;
  title: string;
  status: string;
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
  compose: ValueSetLogicalDefinition;
}

export type ValueSetLogicalDefinition = {
  lockedDate?: string;
  inactive?: boolean;
  include: ValueSetCompose[];
  exclude?: ValueSetCompose[];
};

export type ValueSetCompose = {
  system?: string;
  version?: string;
  valueSet?: string[];
  concept?: ValueSetConcept[];
  filter?: ValueSetLogicalFilter[];
};

export type ValueSetConcept = {
  code: string;
  display?: string;
  designation?: ValueSetConceptDesignation[];
};

export type ValueSetConceptDesignation = {
  language?: string;
  use?: Coding;
  value: string;
};

export type ValueSetLogicalFilter = {
  property: string;
  op: string;
  value: string;
};
