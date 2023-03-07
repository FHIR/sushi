import { ContactDetail, UsageContext } from './metaDataTypes';
import {
  BackboneElement,
  CodeableConcept,
  Coding,
  DomainResource,
  Extension,
  Reference
} from './dataTypes';

export type ImplementationGuide = DomainResource & {
  resourceType: 'ImplementationGuide';
  url: string;
  version?: string;
  name: string;
  title?: string;
  status: ImplementationGuideStatus;
  experimental?: boolean;
  date?: string;
  publisher?: string;
  contact?: ContactDetail[];
  description?: string;
  useContext?: UsageContext[];
  jurisdiction?: CodeableConcept[];
  copyright?: string;
  copyrightLabel?: string; // Added in R5 IG resource
  versionAlgorithmString?: string; // Added in R5 IG resource
  versionAlgorithmCoding?: Coding; // Added in R5 IG resource
  packageId: string;
  license?: string;
  fhirVersion: string[];
  dependsOn?: ImplementationGuideDependsOn[];
  global?: ImplementationGuideGlobal[];
  definition?: ImplementationGuideDefinition;
  manifest?: ImplementationGuideManifest;
};

export type ImplementationGuideStatus = 'draft' | 'active' | 'retired' | 'unknown';

export type ImplementationGuideDependsOn = BackboneElement & {
  uri?: string; // optional for Configuration usecase where packageId is used instead
  packageId?: string;
  version?: string;
  reason?: string; // Added in R5 IG resource
};

export type ImplementationGuideGlobal = {
  type: string;
  profile: string;
};

export type ImplementationGuideDefinition = {
  grouping?: ImplementationGuideDefinitionGrouping[];
  resource: ImplementationGuideDefinitionResource[];
  page?: ImplementationGuideDefinitionPage;
  parameter?: ImplementationGuideDefinitionParameter[];
  template?: ImplementationGuideDefinitionTemplate[];
};

export type ImplementationGuideDefinitionGrouping = {
  id: string;
  name: string;
  description?: string;
};

export type ImplementationGuideDefinitionResource = {
  reference?: Reference; // optional to support Configuration use case where key is the reference
  fhirVersion?: string[];
  name?: string;
  description?: string;
  exampleBoolean?: boolean;
  exampleCanonical?: string;
  isExample?: boolean; // R5 added this property to replace exampleBoolean and exampleCanonical; you can only have one of the three
  profile?: string[]; // R5 added this property to replace exampleCanonical
  groupingId?: string;
  extension?: Extension[];
  _linkRef?: string;
};

export type ImplementationGuideDefinitionPage = {
  nameUrl?: string;
  nameReference?: Reference;
  name?: string; // R5 added this property to replace nameUrl NOTE: it is 1..1
  title?: string; // optional to support Configuration use case where title has a default
  generation?: ImplementationGuideDefinitionPageGeneration; // optional to support Configuration...
  extension?: Extension[];
  modifierExtension?: Extension[];
  sourceUrl?: string; // Added in R5 IG resource
  sourceString?: string; // Added in R5 IG resource
  sourceMarkdown?: string; // Added in R5 IG resource
  page?: ImplementationGuideDefinitionPage[];
};

export type ImplementationGuideDefinitionPageGeneration = 'html' | 'markdown' | 'xml' | 'generated';

export type ImplementationGuideDefinitionParameter = {
  code: string | Coding; // code changed from a code to a Coding type in R5
  extension?: Extension[];
  value: string;
};

export type ImplementationGuideDefinitionTemplate = {
  code: string;
  source: string;
  scope?: string;
};

export type ImplementationGuideManifest = {
  rendering?: string;
  resource: ImplementationGuideManifestResource[];
  page?: ImplementationGuideManifestPage[];
  image?: string[];
  other?: string[];
};

export type ImplementationGuideManifestResource = {
  reference: Reference;
  exampleBoolean?: boolean;
  exampleCanonical?: string;
  relativePath?: string;
};

export type ImplementationGuideManifestPage = {
  name: string;
  title?: string;
  anchor?: string[];
};
