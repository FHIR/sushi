import path from 'path';
import ini from 'ini';
import fs, { existsSync, readFileSync, readJSONSync } from 'fs-extra';
import { Document } from 'yaml';
import wordwrap from 'wordwrap';
import cloneDeep from 'lodash/cloneDeep';
import { xml2js } from 'xml-js';
import { PackageJSON } from '../fshtypes';
import {
  YAMLConfigurationPublisher,
  YAMLConfigurationContactDetail,
  YAMLConfigurationHistoryItem,
  YAMLConfigurationMenuTree
} from './YAMLConfiguration';
import { CommentableYAMLMap } from './CommentableYAMLMap';
import { logger } from '../utils/FSHLogger';

const wrap = wordwrap(1, 100);

/**
 * Checks for a config.yaml or config.yml file. If it finds one, it returns its path, otherwise it creates one
 * and then returns the new file's path.
 * @param root - the root path of the FSH Tank
 * @param allowFromScratch - create a config file from scratch even if package.json isn't found
 * @returns {string|undefined} path to the config file or undefined if it couldn't find or create one
 */
export function ensureConfiguration(root: string, allowFromScratch = false): string {
  const configPath = [path.join(root, 'config.yaml'), path.join(root, 'config.yml')].find(
    fs.existsSync
  );
  if (configPath) {
    // The config already exists, so return it
    logger.info(`Using configuration file: ${path.resolve(configPath)}`);
    return configPath;
  }

  // The config doesn't exist, so generate one
  return generateConfiguration(root, allowFromScratch);
}

/**
 * Creates a new config.yaml file using available other configs (package.json, ig.ini, package-list.json, menu.xml)
 * @param root - the root path of the FSH Tank
 * @param allowFromScratch - create a config file from scratch even if package.json isn't found
 * @returns {string|undefined} path to the config file or undefined if it couldn't find or create one
 */
function generateConfiguration(root: string, allowFromScratch: boolean): string {
  // Generate the config from available ig.ini, package.json, and package-list.json
  const igIni = getIgIni(root);
  const packageJSON = getPackageJSON(root);
  const packageList = getPackageList(root);

  // The config is "from scratch" if there is no package.json to base it on.
  // We know there wasn't a packageJSON if the returned packageJSON is the default one (by reference)
  const isFromScratch = packageJSON === DEFAULT_PACKAGE_JSON;
  if (isFromScratch && !allowFromScratch) {
    return;
  }

  // Create the new YAML document
  const configPath = path.join(root, 'config.yaml');
  const doc = new Document();
  const contents = new CommentableYAMLMap();
  // @ts-ignore See: https://github.com/eemeli/yaml/issues/156
  doc.contents = contents;

  // Set the comments for the document header. Comments differ depending on which
  // files were used in generation (if any).
  let docComments: string;
  if (isFromScratch) {
    docComments =
      'This SUSHI config.yaml file is provided as an example. You must modify its values to ' +
      'accurately reflect the details of your project.';
  } else {
    docComments =
      'This SUSHI config.yaml file was generated from the following configuration file(s):\n';
    if (packageJSON !== DEFAULT_PACKAGE_JSON) {
      docComments += '* package.json\n';
    }
    if (igIni !== DEFAULT_IG_INI) {
      docComments += `* ${path.join('ig-data', 'ig.ini')}\n`;
    }
    if (packageList !== DEFAULT_PACKAGE_LIST) {
      docComments += `* ${path.join('ig-data', 'package-list.json')}\n`;
    }
    docComments +=
      'Please review this new config.yaml file and, make edits as necessary. This file should be considered the ' +
      'new gold source configuration for SUSHI. Since this is the new gold source, you should delete the files ' +
      'listed above since they are now unnecessary and redundant with this file.';
  }
  docComments +=
    '\n\nThis new configuration is based on ImplementationGuide and other FHIR configuration formats but provides ' +
    'additional user-friendly defaults and representations of information. This format is experimental and subject ' +
    'to change. Your feedback is crucial. For more information about the new configuration format, please see the ' +
    'SUSHI documentation at: https://build.fhir.org/ig/HL7/fhir-shorthand/sushi.html';
  doc.commentBefore = wrap(docComments);

  // id
  const id = packageJSON.name ?? DEFAULT_PACKAGE_JSON.name;
  contents.addPair('id', id);
  // canonical
  const canonical = packageJSON.canonical ?? DEFAULT_PACKAGE_JSON.canonical;
  contents.addPair('canonical', canonical);
  // url
  contents.addCommentedOutPair(
    'url',
    `${canonical}/ImplementationGuide/${id}`,
    'NOTE: url defaults to a generated value based on canonical and id. Uncomment to set your own.'
  );
  // version
  contents.addPair('version', packageJSON.version ?? igIni.version ?? DEFAULT_PACKAGE_JSON.version);
  // name (mimics old IG Exporter algorithm)
  const name = (packageJSON.title ?? packageJSON.name ?? DEFAULT_PACKAGE_JSON.title).replace(
    /[^A-Za-z0-9_]/g,
    ''
  );
  contents.addPair('name', name);
  // title (mimics old IG Exporter algorithm)
  contents.addPair('title', packageJSON.title ?? packageJSON.name);
  // status (mimics old IG Exporter value)
  contents.addPair('status', 'active');
  // date (mimics old IG Exporter algorithm)
  contents.addCommentedOutPair(
    'date',
    new Date().toISOString().slice(0, 10),
    'NOTE: If date is not specified, the IG publisher will default to the ' +
      'current date.  Uncomment to set a static date.'
  );
  // publisher
  const publisherComment =
    'NOTE: The publisher can be a single item or a list, each with a name and ' +
    "optional url and/or email. The first publisher's name will be used as IG.publisher. The contact " +
    'details and/or additional publishers will be translated into IG.contact values.';
  const packageWithAuthor = packageJSON.author ? packageJSON : DEFAULT_PACKAGE_JSON;
  const maintainer = packageWithAuthor.maintainers?.find(m => m.name === packageWithAuthor.author);
  if (maintainer) {
    const publisher: YAMLConfigurationPublisher = { name: packageWithAuthor.author };
    if (maintainer.url) {
      publisher.url = maintainer.url;
    }
    if (maintainer.email) {
      publisher.email = maintainer.email;
    }
    if (packageWithAuthor === DEFAULT_PACKAGE_JSON && packageJSON !== DEFAULT_PACKAGE_JSON) {
      // comment out the example publisher if the config isn't totally from scratch
      contents.addCommentedOutPair('publisher', publisher, publisherComment);
    } else {
      contents.addPair('publisher', publisher, publisherComment);
    }
  } else {
    contents.addPair('publisher', packageWithAuthor.author, publisherComment);
  }
  // contact
  if (packageJSON.maintainers?.length) {
    const contacts = packageJSON.maintainers
      .filter(m => !packageJSON.author || m.name !== packageJSON.author) // filter out publisher
      .map(m => {
        const contact: YAMLConfigurationContactDetail = {};
        if (m.name) {
          contact.name = m.name;
        }
        if (m.url || m.email) {
          contact.telecom = [];
        }
        if (m.url) {
          contact.telecom.push({
            system: 'url',
            value: m.url
          });
        }
        if (m.email) {
          contact.telecom.push({
            system: 'email',
            value: m.email
          });
        }
        return contact;
      });
    if (contacts.length) {
      contents.addPair(
        'contact',
        contacts,
        'NOTE: contact is support for authors who need more explicit control over the ' +
          'contact property in the IG. It follows the format of the ImplementationGuide contact property and ContactDetail.'
      );
    }
  }
  // description
  if (packageJSON.description) {
    contents.addPair('description', packageJSON.description);
  } else {
    contents.addCommentedOutPair('description', DEFAULT_PACKAGE_JSON.description);
  }
  // packageId
  contents.addCommentedOutPair(
    'packageId',
    id,
    'NOTE: The packageId defaults to the id unless explicitly specified. Uncomment to set your own.'
  );
  // license
  if (packageJSON.license || igIni.license) {
    contents.addPair('license', packageJSON.license ?? igIni.license);
  } else {
    contents.addCommentedOutPair('license', DEFAULT_PACKAGE_JSON.license);
  }
  // fhirVersion
  contents.addPair(
    'fhirVersion',
    '4.0.1',
    'NOTE: Currently only FHIR 4.0.1 is supported, but in the future you will ' +
      'be able to add multiple FHIR versions in a list here.'
  );
  // dependencies
  let dependenciesComment =
    'NOTE: The dependencies property corresponds to IG.dependsOn. The key is the ' +
    'package id and the value is the version (or dev/current).';
  const packageWithDeps =
    packageJSON.dependencies &&
    Object.keys(packageJSON.dependencies)?.some(k => k !== 'hl7.fhir.r4.core')
      ? packageJSON
      : DEFAULT_PACKAGE_JSON;
  const dependencies = cloneDeep(packageWithDeps.dependencies);
  delete dependencies['hl7.fhir.r4.core'];
  if (packageWithDeps === DEFAULT_PACKAGE_JSON) {
    // Since this is example dependencies, comment them out
    dependenciesComment +=
      ' To add a dependency, uncomment below and modify to match your dependency. ' +
      'US Core is provided only as an example.';
    contents.addCommentedOutPair('dependencies', dependencies, dependenciesComment);
  } else {
    contents.addPair('dependencies', dependencies, dependenciesComment);
  }
  // parameters
  const params: { [key: string]: boolean } = { 'show-inherited-invariants': false }; // backwards-compatible to IG Exporter
  if (igIni['usage-stats-opt-out']) {
    params['usage-stats-opt-out'] = igIni['usage-stats-opt-out'];
  }
  contents.addPair(
    'parameters',
    params,
    'NOTE: The parameters property represents IG.definition.parameter. Rather than a list of code/value ' +
      'pairs (as in the ImplementationGuide resource), the code is the YAML key. If a parameter allows repeating ' +
      'values, the value in the YAML should be a sequence/array. For a partial list of allowed parameters see: ' +
      'https://confluence.hl7.org/display/FHIR/Implementation+Guide+Parameters'
  );
  // copyrightYear
  contents.addPair(
    'copyrightYear',
    igIni.copyrightyear ?? DEFAULT_IG_INI.copyrightyear,
    'NOTE: The following two lines correspond to items that are required for implementation guides, and used to be ' +
      'in ig.ini but were moved to IG.definition.parameter. Given that they are required, they are specified as ' +
      'top-level properties in SUSHI configuration, but SUSHI will convert them to ImplementationGuide parameters using ' +
      'the formal parameter names: copyrightyear and releaselabel.'
  );
  // releaseLabel
  contents.addPair('releaseLabel', igIni.ballotstatus ?? DEFAULT_IG_INI.ballotstatus);
  // template
  if (igIni !== DEFAULT_IG_INI) {
    contents.addCommentedOutPair(
      'template',
      igIni.template ?? DEFAULT_IG_INI.template,
      'NOTE: If template does not exist (or is commented out), then SUSHI will not generate an ig.ini file; but if ' +
        'ig-data/ig.ini exists, SUSHI will copy that ig.ini to the appropriate destination path. Uncomment template ' +
        'to manage the ig.ini contents in this configuration file instead. Currently ig.ini supports only two ' +
        'properties: ig (the path to the ImplementationGuide resource) and template. For more on template-based ' +
        'publishing, see: https://build.fhir.org/ig/FHIR/ig-guidance/index.html#technical-details.'
    );
  } else {
    contents.addPair(
      'template',
      igIni.template ?? DEFAULT_IG_INI.template,
      'NOTE: The template property is used to generate an ig.ini file. Currently ig.ini supports only two ' +
        'properties: ig (the path to the ImplementationGuide resource) and template. To manage your own ig.ini ' +
        'file, delete or comment out template and provide an ig.ini at ig-data/ig.ini. For more on template-based ' +
        'publishing, see: https://build.fhir.org/ig/FHIR/ig-guidance/index.html#technical-details.'
    );
  }
  // menu
  const menuPath = path.join(root, 'ig-data', 'input', 'includes', 'menu.xml');
  if (fs.existsSync(menuPath)) {
    const menuXML = fs.readFileSync(menuPath, 'utf8');
    const menu = getMenuObjectFromMenuXML(menuXML);
    contents.addCommentedOutPair(
      'menu',
      menu ?? DEFAULT_MENU,
      'NOTE: If menu does not exist (or is commented out), then SUSHI will not generate a menu; ' +
        'but if ig-data/input/includes/menu.xml exists, SUSHI will copy that menu.xml to the appropriate ' +
        'destination path. Uncomment menu to fully manage menu contents in this configuration file instead.'
    );
  } else {
    contents.addPair(
      'menu',
      DEFAULT_MENU,
      'NOTE: The menu property allows authors to fully manage the menu content in this configuration ' +
        'file instead of in a separate menu.xml file. In this configuration, the menu is represented as a simple ' +
        'structure where the YAML key is the menu item name and the value is the URL. Note that the IG publisher ' +
        'currently only supports one level deep on sub-menus. To provide your own menu.xml, delete or comment ' +
        'out the menu property and provide a menu at ig-data/input/includes/menu.xml. See: ' +
        'https://github.com/FHIR/sample-ig/blob/master/input/includes/menu.xml'
    );
  }
  // history
  const yamlHistory = new CommentableYAMLMap();
  if (packageList['package-id'] != null && packageList['package-id'] !== packageJSON.name) {
    yamlHistory.addPair('package-id', packageList['package-id']);
  }
  if (packageList.canonical != null && packageList.canonical !== packageJSON.canonical) {
    yamlHistory.addPair('canonical', packageList.canonical);
  }
  if (packageList.title != null && packageList.title !== packageJSON.title) {
    yamlHistory.addPair('title', packageList.title);
  }
  if (packageList.introduction != null && packageList.introduction !== packageJSON.description) {
    yamlHistory.addPair('introduction', packageList.introduction);
  }
  yamlHistory.addPair(
    'current',
    getCurrentFromPackageList(packageList, packageJSON),
    'NOTE: The current version is special. If the author provides a string value, it is assumed ' +
      'to be the URL path to the current build. The following default values will then be used:\n' +
      '*  desc: Continuous Integration Build (latest in version control)\n' +
      '*  status: ci-build\n' +
      '*  current: true\n' +
      "If the value of current is an object, it must contain valid properties for package-list.json's " +
      'current entry.'
  );
  yamlHistory.addComment(
    'NOTE: All other versions need each of their values fully specified. See: ' +
      'https://confluence.hl7.org/pages/viewpage.action?pageId=66928420#FHIRIGPackageListdoco-PublicationObject'
  );
  (packageList.list as any[])?.forEach(item => {
    if (item.version === 'current') {
      return;
    }
    const yamlItem = cloneDeep(item);
    delete yamlItem.version;
    yamlHistory.addPair(item.version, yamlItem);
  });
  if (packageList !== DEFAULT_PACKAGE_LIST) {
    contents.addCommentedOutPair(
      'history',
      yamlHistory,
      'NOTE: If history does not exist (or is commented out), then SUSHI will not generate a package-list.json; ' +
        'but if ig-data/package-list.json exists, SUSHI will copy that package-list.json to the appropriate ' +
        'destination path. Uncomment history to fully manage package-list.json contents in this configuration ' +
        'file instead.'
    );
  } else {
    contents.addPair(
      'history',
      yamlHistory,
      'NOTE: The history property corresponds to package-list.json. SUSHI will use the existing top-level ' +
        'properties in its config to populate the top-level package-list.json properties: packageId, canonical, title, and ' +
        'introduction. Authors that wish to provide different values can supply them as properties under history. All other ' +
        'properties under history are assumed to be versions. To provide your own package-list.json file, delete or ' +
        'comment out the history property and provide a package-list.json file at ig-data/package-list.json.\n' +
        'TODO: This history was generated as a placeholder but MUST be edited by the author to reflect actual values.'
    );
  }

  // Write out the new configuration file
  logger.warn(
    `Generated new configuration file: ${path.resolve(
      configPath
    )}. Please review to ensure configuration is correct.`
  );
  fs.writeFileSync(configPath, doc.toString(), 'utf8');
  return configPath;
}

/**
 * Convert a menu XML file into the required menu object format for the YAML configuration.
 * This assumes the menu XML format found in the sample-ig.  Other formats won't be parsed
 * correctly and should result in this function returning undefined.
 * @param menuXML - a string of menu XML
 * @returns {YAMLConfigurationMenu|undefined} the menu object or undefined if it couldn't be parsed
 */
function getMenuObjectFromMenuXML(menuXML: string): YAMLConfigurationMenuTree {
  const menu: YAMLConfigurationMenuTree = {};
  // We're making some assumptions about the XML here, so wrap in try/catch to be safe
  try {
    const xml: any = xml2js(menuXML, { compact: true });
    // Example xml result format:
    // {
    //   "ul": {
    //     "_attributes": { "xmlns": "http://www.w3.org/1999/xhtml", "class": "nav navbar-nav" },
    //     "li": [
    //       {
    //         "a": {
    //           "_attributes": { "href": "menu-item.html" },
    //           "_text": "Menu Item"
    //         }
    //       },
    //       {
    //         "_attributes": { "class": "dropdown" },
    //         "a": {
    //           "_attributes": { "data-toggle": "dropdown", "href": "#", "class": "dropdown-toggle" },
    //           "_text": "Sub Menu",
    //           "b": {
    //             "_attributes": { "class": "caret" }
    //           }
    //         },
    //         "ul": {
    //           "_attributes": { "class": "dropdown-menu" },
    //           "li": {
    //             "a": {
    //               "_attributes": { "href": "sub-menu-item.html" },
    //               "_text": "Sub-Menu Item"
    //             }
    //           }
    //         }
    //       }
    //     ]
    //   }
    // }
    if (xml.ul && xml.ul.li) {
      const items = Array.isArray(xml.ul.li) ? xml.ul.li : [xml.ul.li];
      items.forEach((li: any) => {
        if (li.a && !Array.isArray(li.a)) {
          const name = li.a._text;
          const link = li.a._attributes?.href;
          if (li.ul && li.ul.li) {
            const subMenu: YAMLConfigurationMenuTree = {};
            const subItems = Array.isArray(li.ul.li) ? li.ul.li : [li.ul.li];
            subItems.forEach((subLi: any) => {
              if (subLi.a && !Array.isArray(subLi.a)) {
                const subName = subLi.a._text;
                const subLink = subLi.a._attributes?.href;
                if (subLink && subLink !== '#') {
                  subMenu[subName] = subLink;
                }
                // NOTE: if there is another sub-sub-menu, we drop it since publisher doesn't support it
              }
            });
            if (Object.keys(subMenu).length > 0) {
              menu[name] = subMenu;
            } else if (link && link !== '#') {
              menu[name] = link;
            }
          } else if (link && link !== '#') {
            menu[name] = link;
          }
        }
      });
    }
  } catch (e) {
    // Not so suprising since menu.xml might have a crazy format
    return;
  }
  if (Object.keys(menu).length > 0) {
    return menu;
  }
}

/**
 * Gets the value for current, preferring a simple path string when all other values match the default
 * @param packageList - the packageList object from package-list.json (or default)
 * @param packageJSON - the packageJSON object from package.json (or default)
 * @returns {string|YAMLConfigurationHistoryItem} - a string for the current path or an object w/ current details
 */
function getCurrentFromPackageList(
  packageList: any,
  packageJSON: PackageJSON
): string | YAMLConfigurationHistoryItem {
  const plCurrent = packageList.list.find((item: any) => item.version === 'current');
  if (plCurrent == null) {
    return packageJSON.url ?? DEFAULT_PACKAGE_LIST.list[0].path;
  }
  for (const key of Object.keys(plCurrent)) {
    if (
      key === 'version' ||
      key === 'path' ||
      (key === 'desc' && plCurrent.desc === DEFAULT_PACKAGE_LIST.list[0].desc) ||
      (key === 'status' && plCurrent.status === DEFAULT_PACKAGE_LIST.list[0].status) ||
      (key === 'current' && plCurrent.current === DEFAULT_PACKAGE_LIST.list[0].current)
    ) {
      continue;
    } else {
      // return the full object since it contains non-default values besides path
      return plCurrent;
    }
  }
  // If we got this far, the only significant value is the path, so just return that
  return plCurrent.path;
}

/**
 * Gets the ig.ini representation or a default if none is found
 * @param root - the root path for the FSH Tank
 * @returns {object} - the ig.ini object representation
 */
function getIgIni(root: string): { [key: string]: any } {
  const inputIniPath = path.join(root, 'ig-data', 'ig.ini');
  if (existsSync(inputIniPath)) {
    let inputIniContents = readFileSync(inputIniPath, 'utf8');
    // FHIR allows templates to have versions identified using #. E.g.,
    //   template = hl7.fhir.template#0.1.0
    // The ini library, however, treats # as a comment unless it is escaped. So if it exists, we need to escape it.
    inputIniContents = inputIniContents.replace(/^\s*template\s*=\s*[^#]*(#.+)?$/m, ($0, $1) =>
      $1 ? $0.replace($1, `\\${$1}`) : $0
    );
    return ini.parse(inputIniContents).IG;
  }

  // No existing ig.ini, so return one with default values to populate an example config
  return DEFAULT_IG_INI;
}

/**
 * Gets the package.json representation or a default if none is found
 * @param root - the root path for the FSH Tank
 * @returns {PackageJSON} - the package.json object representation
 */
function getPackageJSON(root: string): PackageJSON {
  const packagePath = path.join(root, 'package.json');
  if (existsSync(packagePath)) {
    return fs.readJSONSync(packagePath);
  }

  // No existing package.json, so return one with default values to populate an example config
  return DEFAULT_PACKAGE_JSON;
}

/**
 * Gets the package-list.json representation or a default if none is found
 * @param root - the root path for the FSH Tank
 * @returns {object} - the package-list.json object representation
 */
function getPackageList(root: string): any {
  const packageListPath = path.join(root, 'ig-data', 'package-list.json');
  if (existsSync(packageListPath)) {
    return readJSONSync(packageListPath);
  }

  // No existing package-list.json, so return one with default values to populate an example config
  return DEFAULT_PACKAGE_LIST;
}

const DEFAULT_IG_INI: any = {
  template: 'fhir.base.template#current',
  copyrightyear: `${new Date().getFullYear()}+`,
  ballotstatus: 'CI Build'
};

const DEFAULT_PACKAGE_JSON: PackageJSON = {
  name: 'example-ig',
  version: '0.0.1',
  title: 'Example IG',
  description:
    'This is an example IG description. You should uncomment and replace it with your own.',
  canonical: 'http://example.org/fhir',
  author: 'Example Publisher',
  maintainers: [
    {
      name: 'Example Publisher',
      email: 'publisher@example.org',
      url: 'http://example.org/committee'
    }
  ],
  license: 'CC0-1.0',
  dependencies: {
    'hl7.fhir.r4.core': '4.0.1',
    'hl7.fhir.us.core': '3.1.0'
  }
};

const DEFAULT_MENU: YAMLConfigurationMenuTree = {
  'IG Home': 'index.html',
  'Table of Contents': 'toc.html',
  'Artifact Index': 'artifacts.html',
  Support: {
    'FHIR Spec': 'http://hl7.org/fhir/R4/index.html'
  }
};

const DEFAULT_PACKAGE_LIST: any = {
  list: [
    {
      version: 'current',
      desc: 'Continuous Integration Build (latest in version control)',
      path: 'http://build.fhir.org/ig/example/example-ig',
      status: 'ci-build',
      current: true
    },
    {
      version: DEFAULT_PACKAGE_JSON.version,
      fhirversion: '4.0.1',
      date: '2099-01-01',
      desc: 'Initial STU ballot (Mmm yyyy Ballot)',
      path: 'http://example.org/fhir/STU1',
      status: 'ballot',
      sequence: 'STU 1',
      current: true
    }
  ]
};
