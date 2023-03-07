import {
  ContactDetail,
  UsageContext,
  ImplementationGuideDefinitionTemplate,
  Meta,
  Narrative,
  Extension,
  ImplementationGuideDependsOn,
  ImplementationGuideGlobal,
  ImplementationGuideDefinitionResource,
  ImplementationGuideDefinitionPage,
  ImplementationGuideDefinitionParameter,
  ImplementationGuideStatus,
  CodeableConcept,
  Coding
} from '../fhirtypes';

/**
 * Configuration is related to the proposed YAML configuration format for FSH, but eliminates
 * ambiguities (like singular vs list representations) and normalizes closer to the intended
 * export formats.
 *
 * @see YAMLConfiguration
 * @see {@link http://hl7.org/fhir/R4/implementationguide.html}
 * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#igroot}
 * @see {@link https://confluence.hl7.org/display/FHIR/NPM+Package+Specification}
 * @see {@link https://confluence.hl7.org/pages/viewpage.action?pageId=66928420#FHIRIGPackageListdoco-PublicationObject}
 * @see {@link https://github.com/FHIR/sample-ig/blob/master/input/includes/menu.xml}
 */
export type Configuration = {
  filePath?: string;
  canonical: string;
  id?: string;
  meta?: Meta;
  implicitRules?: string;
  language?: string;
  text?: Narrative;
  contained?: any[];
  extension?: Extension[];
  modifierExtension?: Extension[];
  url?: string;
  version?: string;
  name?: string;
  title?: string;
  status?: ImplementationGuideStatus;
  experimental?: boolean;
  date?: string;

  // The first publisher's name in the YAML file will be used as IG.publisher.  The contact details
  // and/or additional publishers is translated into IG.contact values.
  publisher?: string;

  // The first contact entry contains additional publisher contact info (if applicable).
  // Those who need more control or want to add additional details to the contact values can use
  // contact directly and follow the format outlined in the ImplementationGuide resource and
  // ContactDetail.
  contact?: ContactDetail[];

  description?: string;
  useContext?: UsageContext[];
  jurisdiction?: CodeableConcept[];
  copyright?: string;
  copyrightLabel?: string; // Added in R5 IG resource
  versionAlgorithmString?: string; // Added in R5 IG resource
  versionAlgorithmCoding?: Coding; // Added in R5 IG resource

  // SUSHI will use id as both id and packageId in the IG unless a specific packageId is specified
  packageId?: string;

  license?: string;
  fhirVersion: string[];
  dependencies?: ImplementationGuideDependsOn[];
  global?: ImplementationGuideGlobal[];

  // Groups can control certain aspects of the IG generation.  The IG documentation recommends that
  // authors use the default groups that are provided by the templating framework, but if authors
  // want to use their own instead, they can use the mechanism below.  This will create
  // IG.definition.grouping entries and associate the individual resource entries with the
  // corresponding groupIds. If a resource is specified by id or name, SUSHI will replace it with
  // the correct URL when generating the IG JSON.
  groups?: ConfigurationGroup[];

  // The resources property corresponds to IG.definition.resource. SUSHI can auto-generate all of
  // the resource entries based on the FSH definitions and/or information in any user-provided
  // JSON resource files. If the generated entries are not sufficient or complete, however, the
  // author can add entries here. If the reference matches a generated entry, it will replace the
  // generated entry. If it doesn't match any generated entries, it will be added to the generated
  // entries. The format follows IG.definition.resource with the following differences:
  // * if the key is an id or name, SUSHI will replace it with the correct URL when generating the
  //   IG JSON.
  // * if the exampleCanonical is an id or name, SUSHI will replace it with the correct canonical
  //   when generating the IG JSON.
  // * additional "omit" property to omit a FSH-generated resource from the resource list.
  // * groupingId can be used, but top-level groups syntax may be a better option (see below).
  resources?: ConfigurationResource[];

  // The pages property corresponds to IG.definition.page. SUSHI can auto-generate the page list,
  // but if the author includes pages in this file, it is assumed that the author will fully manage
  // the pages section and SUSHI will not generate any page entries. If title is not provided, then
  // the title will be generated from the file name.  If a generation value is not provided, it
  // will be inferred from the file name extension.
  pages?: ImplementationGuideDefinitionPage[];

  // The parameters property represents IG.definition.parameter. For parameters defined by core FHIR
  // see: http://build.fhir.org/codesystem-guide-parameter-code.html. For parameters defined by the FHIR
  // Tools IG see: http://build.fhir.org/ig/FHIR/fhir-tools-ig/branches/master/CodeSystem-ig-parameters.html
  parameters?: ImplementationGuideDefinitionParameter[];

  // The templates property corresponds 1:1 with IG.definition.template. Note that plural templates
  // refers to the IG.definiton.template definitions; not the publisher template in ig.ini.
  templates?: ImplementationGuideDefinitionTemplate[];

  // NO LONGER SUPPORTED: Use of the template property is no longer supported.  Authors should manage the
  // ig.ini file themselves.
  // NOTE: This property is kept in the type so we can log more useful error messages in IGExporter.
  // If those errors are removed, the property should be removed entirely.
  template?: string;

  // The menu property will be used to generate the input/menu.xml file. The menu is represented as
  // a simple structure where the YAML key is the menu item name and the value is the URL. The IG
  // publisher currently only supports one level deep on sub-menus. To provide a custom menu.xml
  // file, do not include this property and include a `menu.xml` file in input/includes.
  menu?: ConfigurationMenuItem[];

  // NO LONGER SUPPORTED: Use of the history property is no longer supported.  Authors should manage
  // the package-list.json file directly.
  // NOTE: This property is kept in the type so we can log more useful error messages in IGExporter.
  // If those errors are removed, the property should be removed entirely.
  history?: ConfigurationHistory;

  // The indexPageContent property is used to generate a basic index.md file. To provide a
  // custom index file, do not include this property and include an index.md or index.xml file
  // in input/pages/ or input/pagecontent folders.
  indexPageContent?: string;

  // When the FSHOnly parameter is set to true, no IG specific content will be generated, SUSHI will
  // only convert FSH definitions to JSON files. When false, IG content is generated.
  FSHOnly?: boolean;

  // When set to true, the "short" and "definition" field on the root element of an Extension will
  // be set to the "Title" and "Description" of that Extension. Default is true.
  applyExtensionMetadataToRoot?: boolean;

  // The instanceOptions property is used to configure certain aspects of how SUSHI processed instances.
  // See the individual option definitions in ConfigurationInstanceOptions for more detail.
  instanceOptions?: ConfigurationInstanceOptions;
};

export type ConfigurationGroup = {
  id: string;
  name: string;
  description?: string;
  resources?: string[];
};

export type ConfigurationResource = ImplementationGuideDefinitionResource & { omit?: boolean };

export type ConfigurationMenuItem = {
  name: string;
  url?: string;
  openInNewTab?: boolean;
  subMenu?: ConfigurationMenuItem[];
};

export type ConfigurationHistory = {
  'package-id'?: string;
  canonical?: string;
  title?: string;
  introduction?: string;
  list?: ConfigurationHistoryItem[];
};

export type ConfigurationHistoryItem = {
  version: string;
  date?: string;
  desc?: string;
  path: string;
  changes?: string;
  status?:
    | 'ci-build'
    | 'preview'
    | 'ballot'
    | 'trial-use'
    | 'update'
    | 'normative'
    | 'trial-use+normative';
  sequence?: string;
  fhirversion?: string;
  current?: boolean;
};

export type ConfigurationInstanceOptions = {
  // Determines for which types of Instances SUSHI will automatically set meta.profile
  // if InstanceOf references a profile. Options are:
  // - always: Set meta.profile for all Instances of profiles (default)
  // - never: Do not set meta.profile on any Instances
  // - inline-only: Set meta.profile for only Instances of profiles with Usage set to #inline
  // - standalone-only: Set meta.profile for only Instances of profiles where Usage is any value other than #inline
  setMetaProfile?: 'always' | 'never' | 'inline-only' | 'standalone-only';
  // Determines for which types of Instances SUSHI will automatically set id
  // if InstanceOf references a profile. Options are:
  // - always: Set id for all Instances (default)
  // - standalone-only: Set id for only Instances where Usage is any value other than #inline
  setId?: 'always' | 'standalone-only';
  // When set to true, slices must be referred to by name and not only by a numeric index in order to be used
  // in an Instance's assignment rule. All slices appear in the order in which they are specified in FSH rules.
  manualSliceOrdering?: boolean;
};
