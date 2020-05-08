import {
  UsageContext,
  ImplementationGuideDefinitionTemplate,
  Meta,
  Narrative,
  ImplementationGuideDefinitionResource,
  ImplementationGuideStatus,
  ContactPoint,
  ContactDetail,
  ImplementationGuideDefinitionPage,
  ImplementationGuideDefinitionPageGeneration,
  Quantity,
  ImplementationGuide,
  ImplementationGuideDependsOn,
  ImplementationGuideGlobal,
  ImplementationGuideDefinitionGrouping,
  Reference,
  Identifier
} from '../fhirtypes';

/**
 * YAMLConfiguration follows the proposed configuration format for FSH and incorporates aspects
 * of the ImplementationGuide, ig.ini, package.json, package-list.json, and menu.xml formats.
 *
 * This format is intended to be represented using YAML but is transformed into JSON for our use.
 *
 * @see {@link http://hl7.org/fhir/R4/implementationguide.html}
 * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#igroot}
 * @see {@link https://confluence.hl7.org/display/FHIR/NPM+Package+Specification}
 * @see {@link https://confluence.hl7.org/pages/viewpage.action?pageId=66928420#FHIRIGPackageListdoco-PublicationObject}
 * @see {@link https://github.com/FHIR/sample-ig/blob/master/input/includes/menu.xml}
 */
export type YAMLConfiguration = {
  canonical: string;
  id: ImplementationGuide['id']; // string
  meta?: YAMLConfigurationMeta;
  implicitRules?: ImplementationGuide['implicitRules']; // string
  language?: ImplementationGuide['language']; // string (shorthand code syntax can be used here)
  text?: YAMLConfigurationNarrative;
  contained?: ImplementationGuide['contained']; // any[]
  extension?: ImplementationGuide['extension']; // Extension[]
  modifierExtension?: ImplementationGuide['modifierExtension']; // Extension[]
  url?: ImplementationGuide['url']; // string
  version:
    | ImplementationGuide['version'] // string
    | number; // YAML will parse some versions (e.g., 1.2) as numbers
  name: ImplementationGuide['name']; // string;
  title?: ImplementationGuide['title']; // string;
  status: YAMLConfigurationStatus;
  experimental?: ImplementationGuide['experimental']; // boolean;
  date?:
    | ImplementationGuide['date'] // string
    | number; // YAML will parse year-only dates as numbers

  // The publisher can be a single item or a list, each with a name and optional url and/or email.
  // The first publisher's name will be used as IG.publisher.  The contact details and/or
  // additional publishers will be translated into IG.contact values.
  publisher?: YAMLConfigurationPublisher | YAMLConfigurationPublisher[];

  // Those who need more control or want to add additional details to the contact values can use
  // contact directly and follow the format outlined in the ImplementationGuide resource and
  // ContactDetail. A single item or a list can be provided.
  contact?: YAMLConfigurationContactDetail | YAMLConfigurationContactDetail[];

  description?: ImplementationGuide['description']; // string

  // useContext can be a single item or a list.
  useContext?: YAMLConfigurationUsageContext | YAMLConfigurationUsageContext[];

  // The jurisdiction can be a single item or a list. The Shorthand code syntax can be used here.
  jurisdiction?: YAMLConfigurationJurisdiction | YAMLConfigurationJurisdiction[];

  copyright?: ImplementationGuide['copyright']; // string

  // SUSHI will use id as both id and packageId in the IG unless a specific packageId is specified
  packageId?: ImplementationGuide['packageId']; // string

  license?: ImplementationGuide['license']; // string

  // Although fhirVersions is 0..* in the ImplementationGuide resource, it can be a single item OR
  // an array here (but so far SUSHI only supports 4.0.1 anyway).
  fhirVersion:
    | ImplementationGuide['fhirVersion'][0] // string
    | ImplementationGuide['fhirVersion']; // string[]

  // The dependencies property corresponds to IG.dependsOn. They key is the package id and the
  // value is the version (or dev/current).
  dependencies?: YAMLConfigurationDependencyMap;

  // The global property corresponds to the IG.global property, but it uses the type as the YAML
  // key and the profile as its value. Since FHIR does not explicitly disallow more than one
  // profile per type, neither do we; the value can be a single profile URL or an array of profile
  // URLs.
  global?: YAMLConfigurationGlobalMap;

  // Groups can control certain aspects of the IG generation.  The IG documentation recommends that
  // authors use the default groups that are provided by the templating framework, but if authors
  // want to use their own instead, they can use the mechanism below.  This will create
  // IG.definition.grouping entries and associate the individual resource entries with the
  // corresponding groupIds.
  groups?: YAMLConfigurationGroupMap;

  // The resources property corresponds to IG.definition.resource. SUSHI can auto-generate all of
  // the resource entries based on the FSH definitions and/or information in any user-provided
  // JSON resource files. If the generated entries are not sufficient or complete, however, the
  // author can add entries here. If the reference matches a generated entry, it will replace the
  // generated entry. If it doesn't match any generated entries, it will be added to the generated
  // entries. The format follows IG.definition.resource with the following differences:
  // * use IG.definition.resource.reference.reference as the YAML key (so reference is optional)
  // * specify "omit" to omit a FSH-generated resource from the resource list.
  // * groupingId can be used, but top-level groups syntax may be a better option (see below).
  resources?: YAMLConfigurationResourceMap;

  // The pages property corresponds to IG.definition.page. SUSHI can auto-generate the page list,
  // but if the author includes pages in this file, it is assumed that the author will fully manage
  // the pages section and SUSHI will not generate any page entries. The page file name is used as
  // the key. If title is not provided, then the title will be generated from the file name.  If a
  // generation value is not provided, it will be inferred from the file name extension.  Any
  // subproperties that are valid filenames with supported extensions (e.g., .md/.xml) will be
  // treated as sub-pages.
  pages?: YAMLConfigurationPageTree;

  // The parameters property represents IG.definition.parameter. Rather than a list of code/value
  // pairs (as in the ImplementationGuide resource, the code is the YAML key. If a parameter allows
  // repeating values, the value in the YAML should be a sequence/array. For a partial list of
  // allowed parameters see: https://confluence.hl7.org/display/FHIR/Implementation+Guide+Parameters
  parameters?: YAMLConfigurationParameterMap;

  // The templates property corresponds 1:1 with IG.definition.template. The templates value can be
  // a single item or a list. Note that the pluralized name 'templates' refers to the
  // IG.definiton.template definitions; the singularized name 'template' refers to the specific
  // template to use for this IG.
  templates?: ImplementationGuideDefinitionTemplate | ImplementationGuideDefinitionTemplate[];

  // The template property will be copied into the ig.ini file. If the value of template is "none",
  // then only the resources will be generated (with no supporting ImplementationGuide sources).
  template: string;

  // The following two lines correspond to items that used to be in ig.ini but were recently moved
  // to IG.definition.parameter. For consistency within this file, the names are represented using
  // camelcase, but if authors use the formal parameter names, SUSHI will recognize them as well.
  // In either case, they'll be copied to the IG JSON using the formal names.
  copyrightYear?: string | number; // YAML will parse years as numbers
  copyrightyear?: string | number; // YAML will parse years as numbers
  releaseLabel?: string;
  releaselabel?: string;

  // The menu property will be used to generate the input/menu.xml file. The menu is represented as
  // a simple structure where the YAML key is the menu item name and the value is the URL. The IG
  // publisher currently only supports one level deep on sub-menus.
  // TO CONSIDER: If no menu data is provided, can we generate the menu based on the pages order
  // or should we just generate a very standard menu (since there may be too many pages to fit in
  // a menu)?
  menu?: YAMLConfigurationMenuTree;

  // The history property corresponds to package-list.json. SUSHI will use the existing top-level
  // properties in its config to populate the top-level package-list.json properties: package-id,
  // canonical, title, and introduction. Authors that wish to provide different values can supply
  // them as properties under history. All other properties under history are assumed to be
  // versions.
  //
  // The current version is special. If the author provides only a single string value, it is
  // assumed to be the URL path to the current build. The following default values will then be
  // used:
  // * desc: Continuous Integration Build (latest in version control)
  // * status: ci-build
  // * current: true
  history?: YAMLConfigurationHistory;
};

export type YAMLConfigurationMeta = {
  versionId?: Meta['versionId']; // string
  lastUpdated?: Meta['lastUpdated']; // string
  source?: Meta['source']; // string
  profile?: Meta['profile']; // string[]
  security?: (Meta['security'][0] | string)[]; // (Coding | string)[]
  tag?: (Meta['tag'][0] | string)[]; // (Coding | string)[]
};

export type YAMLConfigurationNarrative = {
  status:
    | Narrative['status'] // 'generated', 'extensions', 'additional', 'empty
    | '#generated'
    | '#extensions'
    | '#additional'
    | '#empty';
  div: string;
};

export type YAMLConfigurationStatus =
  | ImplementationGuideStatus // 'draft', 'active', 'retired', 'unknown'
  | '#draft'
  | '#active'
  | '#retired'
  | '#unknown';

export type YAMLConfigurationPublisher = {
  name: ImplementationGuide['publisher']; // string
  url?: ContactPoint['value']; // string
  email?: ContactPoint['value']; // string
};

export type YAMLConfigurationContactDetail = {
  name?: ContactDetail['name']; // string
  telecom?: YAMLConfigurationContactPoint[];
};

export type YAMLConfigurationContactPoint = {
  system?:
    | ContactPoint['system'] // 'phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'
    | '#phone'
    | '#fax'
    | '#email'
    | '#pager'
    | '#url'
    | '#sms'
    | '#other';
  value?: ContactPoint['value']; // string
  use?:
    | ContactPoint['use'] // 'home', 'work', 'temp', 'old', 'mobile'
    | '#home'
    | '#work'
    | '#temp'
    | '#old'
    | '#mobile';
  rank?: ContactPoint['rank']; // number
  period?: ContactPoint['period']; // Period
};

export type YAMLConfigurationUsageContext = {
  code:
    | UsageContext['code'] // Coding
    | string;
  valueCodeableConcept?:
    | UsageContext['valueCodeableConcept'] // CodeableConcept
    | string;
  valueQuantity?: YAMLConfigurationQuantity | string; // special FSH quantity syntax (e.g., 50 'mm')
  valueRange?: YAMLConfigurationRange;
  valueReference?: YAMLConfigurationReference;
};

export type YAMLConfigurationQuantity = {
  value?: Quantity['value']; // number
  comparator?:
    | Quantity['comparator'] // '<', '<=', '>=', '>'
    | '#<'
    | '#<='
    | '#>='
    | '#>';
  unit?: Quantity['unit']; // string
  system?: Quantity['system']; // string
  code?: Quantity['code']; // string
};

export type YAMLConfigurationRange = {
  low?: YAMLConfigurationQuantity | string; // special FSH quantity syntax (e.g., 50 'mm')
  high?: YAMLConfigurationQuantity | string; // special FSH quantity syntax (e.g., 50 'mm')
};

export type YAMLConfigurationReference = {
  reference?: Reference['reference']; // string
  type?: Reference['type']; // string
  identifier?: YAMLConfigurationIdentifier;
  display?: Reference['display']; // string
};

export type YAMLConfigurationIdentifier = {
  use?:
    | Identifier['use'] // 'usual', 'official', 'temp', 'secondary', 'old'
    | '#usual'
    | '#official'
    | '#temp'
    | '#old';
  type?:
    | Identifier['type'] // CodeableConcept
    | string;
  system?: Identifier['system']; // string
  value?: Identifier['value']; // string
  period?: Identifier['period']; // Period
  assigner?: YAMLConfigurationReference;
};

export type YAMLConfigurationJurisdiction =
  | ImplementationGuide['jurisdiction'][0] // CodeableConcept
  | string;

export type YAMLConfigurationDependencyMap = {
  [key: string]:
    | ImplementationGuideDependsOn['version'] // string
    | number; // YAML will parse some versions as numbers (e.g., 1.2)
};

export type YAMLConfigurationGlobalMap = {
  [key: string]:
    | ImplementationGuideGlobal['profile'] // string
    | ImplementationGuideGlobal['profile'][]; // string[]
};

export type YAMLConfigurationGroupMap = {
  [key: string]: {
    description?: ImplementationGuideDefinitionGrouping['description']; // string
    resources: string[];
  };
};

export type YAMLConfigurationResourceMap = {
  [key: string]: 'omit' | '#omit' | YAMLConfigurationResource;
};

export type YAMLConfigurationResource = {
  reference?: ImplementationGuideDefinitionResource['reference']; // Reference
  fhirVersion?:
    | ImplementationGuideDefinitionResource['fhirVersion'] // string[]
    | ImplementationGuideDefinitionResource['fhirVersion'][0]; // string
  name?: ImplementationGuideDefinitionResource['name']; // string
  description?: ImplementationGuideDefinitionResource['description']; // string
  exampleBoolean?: ImplementationGuideDefinitionResource['exampleBoolean']; // boolean
  exampleCanonical?: ImplementationGuideDefinitionResource['exampleCanonical']; // canonical
  groupingId?: ImplementationGuideDefinitionResource['groupingId']; // string
};

export type YAMLConfigurationPageTree = {
  [key: string]: YAMLConfigurationPage;
};

export type YAMLConfigurationPage = null | {
  title?: ImplementationGuideDefinitionPage['title']; // string
  generation?:
    | ImplementationGuideDefinitionPageGeneration // 'html', 'markdown', 'xml', 'generated'
    | '#html'
    | '#markdown'
    | '#xml'
    | '#generated';
  [key: string]: YAMLConfigurationPage | string; // string allowed so title/generation work
};

export type YAMLConfigurationParameterMap = {
  // YAML will parse some of parameter values as numbers or booleans
  [key: string]: string | number | boolean | (string | number | boolean)[];
};

export type YAMLConfigurationMenuTree = {
  [key: string]: string | YAMLConfigurationMenuTree;
};

export type YAMLConfigurationHistory = {
  'package-id'?: string;
  canonical?: string;
  title?: string;
  introduction?: string;
  current: string | YAMLConfigurationHistoryItem;
  [key: string]: string | YAMLConfigurationHistoryItem;
};

export type YAMLConfigurationHistoryItem = {
  date?: string | number; // YAML will parse year-only dates as numbers
  desc?: string;
  path: string;
  changes?: string;
  status?:
    | 'ci-build'
    | '#ci-build'
    | 'preview'
    | '#preview'
    | 'ballot'
    | '#ballot'
    | 'trial-use'
    | '#trial-use'
    | 'update'
    | '#update'
    | 'normative'
    | '#normative'
    | 'trial=use+normative'
    | '#trial=use+normative';

  sequence?: string;
  fhirversion?: string;
  current?: boolean;
};
