import { ContactDetail, UsageContext } from './metaDataTypes';
import { CodeableConcept, Reference, BackboneElement, DomainResource } from './dataTypes';

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
  groupingId?: string;
};

export type ImplementationGuideDefinitionPage = {
  nameUrl?: string;
  nameReference?: Reference;
  title?: string; // optional to support Configuration use case where title has a default
  generation?: ImplementationGuideDefinitionPageGeneration; // optional to support Configuration...
  page?: ImplementationGuideDefinitionPage[];
};

export type ImplementationGuideDefinitionPageGeneration = 'html' | 'markdown' | 'xml' | 'generated';

export type ImplementationGuideDefinitionParameter = {
  code: string;
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
