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
  CodeableConcept
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
  filePath: string;
  canonical: string;
  id: string;
  meta?: Meta;
  implicitRules?: string;
  language?: string;
  text?: Narrative;
  contained?: any[];
  extension?: Extension[];
  modifierExtension?: Extension[];
  url?: string;
  version: string;
  name: string;
  title?: string;
  status: ImplementationGuideStatus;
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
  // corresponding groupIds.
  groups?: ConfigurationGroup[];

  // The resources property corresponds to IG.definition.resource. SUSHI can auto-generate all of
  // the resource entries based on the FSH definitions and/or information in any user-provided
  // JSON resource files. If the generated entries are not sufficient or complete, however, the
  // author can add entries here. If the reference matches a generated entry, it will replace the
  // generated entry. If it doesn't match any generated entries, it will be added to the generated
  // entries. The format follows IG.definition.resource with the following differences:
  // * additional "omit" property to omit a FSH-generated resource from the resource list.
  // * groupingId can be used, but top-level groups syntax may be a better option (see below).
  resources?: ConfigurationResource[];

  // The pages property corresponds to IG.definition.page. SUSHI can auto-generate the page list,
  // but if the author includes pages in this file, it is assumed that the author will fully manage
  // the pages section and SUSHI will not generate any page entries. If title is not provided, then
  // the title will be generated from the file name.  If a generation value is not provided, it
  // will be inferred from the file name extension.
  pages?: ImplementationGuideDefinitionPage[];

  // The parameters property represents IG.definition.parameter. For a partial list of allowed
  // parameters see: https://confluence.hl7.org/display/FHIR/Implementation+Guide+Parameters
  parameters?: ImplementationGuideDefinitionParameter[];

  // The templates property corresponds 1:1 with IG.definition.template. Note that plural templates
  // refers to the IG.definiton.template definitions; singular template refers to the specific
  // template to use for this IG.
  templates?: ImplementationGuideDefinitionTemplate[];

  // The template property will be used to generate an ig.ini file.
  // To provide a custom ig.ini file, do not include this property and include an `ig.ini` file in ig-data.
  template?: string;

  // The menu property will be used to generate the input/menu.xml file. The menu is represented as
  // a simple structure where the YAML key is the menu item name and the value is the URL. The IG
  // publisher currently only supports one level deep on sub-menus. To provide a custom menu.xml
  // file, do not include this property and include a `menu.xml` file in input/includes.
  // TO CONSIDER: If no menu data is provided, can we generate the menu based on the pages order
  // or should we just generate a very standard menu (since there may be too many pages to fit in
  // a menu)?
  menu?: ConfigurationMenuItem[];

  // The history property corresponds to package-list.json. SUSHI will use the existing top-level
  // properties in its config to populate the top-level package-list.json properties: package-id,
  // canonical, title, and introduction. Authors that wish to provide different values can supply
  // them as properties under history. All other properties under history are assumed to be
  // versions. To provide a custom package-list.json file, remove this property and include a
  // package-list.json file in ig-data.
  //
  // The current version is special. If the author provides only a single string value, it is
  // assumed to be the URL path to the current build. The following default values will then be
  // used:
  // * desc: Continuous Integration Build (latest in version control)
  // * status: ci-build
  // * current: true
  history?: ConfigurationHistory;

  // The indexPageContent property is used to generate a basic index.md file. To provide a
  // custom index file, do not include this property and include an index.md or index.xml file
  // in input/pages/ or input/pagecontent folders.
  indexPageContent?: string;

  // When the FSHOnly parameter is set to true, no IG specific content will be generated, SUSHI will
  // only convert FSH definitions to JSON files. When false, IG content is generated.
  FSHOnly?: boolean;
};

export type ConfigurationGroup = {
  name: string;
  description?: string;
  resources: string[];
};

export type ConfigurationResource = ImplementationGuideDefinitionResource & { omit?: boolean };

export type ConfigurationMenuItem = {
  name: string;
  url?: string;
  isExternal?: boolean;
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
