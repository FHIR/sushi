import { ContactDetail, UsageContext } from './metaDataTypes';
import { CodeableConcept, Reference, BackboneElement } from './dataTypes';

export type ImplementationGuide = {
  resourceType: 'ImplementationGuide';
  id: string;
  url: string;
  version?: string;
  name: string;
  title?: string;
  status: 'draft' | 'active' | 'retired' | 'unknown';
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

export type ImplementationGuideDependsOn = BackboneElement & {
  uri: string;
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
  reference: Reference;
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
  title: string;
  generation: ImplementationGuideDefinitionPageGeneration;
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
