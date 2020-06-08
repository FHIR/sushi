import path from 'path';
import ini from 'ini';
import fs, { existsSync, readFileSync, readJSONSync } from 'fs-extra';
import { Document, createNode } from 'yaml';
import { YAMLMap, Pair, Schema } from 'yaml/types';
import wordwrap from 'wordwrap';
import cloneDeep from 'lodash/cloneDeep';
import { xml2js } from 'xml-js';
import { PackageJSON } from '../fshtypes';
import {
  YAMLConfigurationPublisher,
  YAMLConfigurationContactDetail,
  YAMLConfigurationHistoryItem,
  YAMLConfigurationMenuTree,
  YAMLConfigurationHistory
} from './YAMLConfiguration';
import { logger } from '../utils/FSHLogger';
import { pad, padEnd } from 'lodash';

/**
 * A pair that automatically wraps the key in a node so we can attach a comment.
 * @see https://github.com/eemeli/yaml/issues/157
 */
class YAMLPair extends Pair {
  constructor(key: string, value: any) {
    super(createNode(key), value);
  }

  withCommentBefore(comment: string): YAMLPair {
    this.key.commentBefore = comment;
    return this;
  }

  withSpaceBefore(): YAMLPair {
    this.spaceBefore = true;
    return this;
  }
}

/**
 * A commented out pair. Solution suggested by author of the yaml library.
 * @see https://github.com/eemeli/yaml/issues/159
 */
class CommentPair extends YAMLPair {
  toString(ctx: Schema.StringifyContext, onComment?: () => void, onChompKeep?: () => void) {
    // @ts-ignore toString not properly types on Pair
    const str = super.toString(ctx, onComment, onChompKeep);
    return str.replace(new RegExp(`^(${ctx.indent})?`, 'gm'), '$&# ');
  }
}

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
  const contents = new YAMLMap();
  // @ts-ignore See: https://github.com/eemeli/yaml/issues/156
  doc.contents = contents;

  // Set the comments for the document header.
  if (isFromScratch) {
    doc.commentBefore = getBoxComment(
      '',
      'ACTION REQUIRED: EDIT THIS FILE TO ENSURE IT ACCURATELY REFLECTS YOUR PROJECT!\n\n' +
        'This file is a placeholder, generated as a convenience to help you start your project. '
    );
  } else {
    doc.commentBefore = getBoxComment(
      '',
      'ACTION REQUIRED: REVIEW AND EDIT THIS FILE TO ENSURE IT ACCURATELY REFLECTS YOUR PROJECT!\n\n' +
        'This file was generated from your existing project files and will be used for SUSHI configuration ' +
        'from now on. You may delete your package.json as it is no longer needed.'
    );
  }

  // id
  const id = packageJSON.name ?? DEFAULT_PACKAGE_JSON.name;
  contents.add(
    new YAMLPair('id', id).withCommentBefore(
      getBoxComment(
        `ImplementationGuide-${id}.json`,
        'The properties below are used to create the ImplementationGuide resource. For a list of supported ' +
          'properties, see: http://build.fhir.org/ig/HL7/fhir-shorthand/branches/beta/sushi.html#ig-development'
      )
    )
  );
  // canonical
  const canonical = packageJSON.canonical ?? DEFAULT_PACKAGE_JSON.canonical;
  contents.add(new YAMLPair('canonical', canonical));
  // version
  contents.add(
    new YAMLPair('version', packageJSON.version ?? igIni.version ?? DEFAULT_PACKAGE_JSON.version)
  );
  // name (mimics old IG Exporter algorithm)
  const name = (packageJSON.title ?? packageJSON.name ?? DEFAULT_PACKAGE_JSON.title).replace(
    /[^A-Za-z0-9_]/g,
    ''
  );
  contents.add(new YAMLPair('name', name));
  // title (mimics old IG Exporter algorithm)
  if (packageJSON.title || packageJSON.name) {
    contents.add(new YAMLPair('title', packageJSON.title ?? packageJSON.name));
  }
  // status (mimics old IG Exporter value)
  contents.add(new YAMLPair('status', 'active'));
  // publisher
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
    // only include the publisher if it didn't fall back to a default or if it's from scratch
    if (packageWithAuthor !== DEFAULT_PACKAGE_JSON || packageJSON === DEFAULT_PACKAGE_JSON) {
      contents.add(new YAMLPair('publisher', publisher));
    }
  } else {
    contents.add(new YAMLPair('publisher', packageWithAuthor.author));
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
      contents.add(new YAMLPair('contact', contacts));
    }
  }
  // description
  if (packageJSON.description) {
    contents.add(new YAMLPair('description', packageJSON.description));
  }
  // license
  if (packageJSON.license || igIni.license) {
    contents.add(new YAMLPair('license', packageJSON.license ?? igIni.license));
  }
  // fhirVersion
  contents.add(new YAMLPair('fhirVersion', '4.0.1'));
  // dependencies
  const packageWithDeps =
    packageJSON.dependencies &&
    Object.keys(packageJSON.dependencies)?.some(k => k !== 'hl7.fhir.r4.core')
      ? packageJSON
      : DEFAULT_PACKAGE_JSON;
  const dependencies = cloneDeep(packageWithDeps.dependencies);
  delete dependencies['hl7.fhir.r4.core'];
  if (packageWithDeps !== DEFAULT_PACKAGE_JSON) {
    contents.add(new YAMLPair('dependencies', dependencies));
  }
  // parameters
  const params: { [key: string]: boolean } = { 'show-inherited-invariants': false }; // backwards-compatible to IG Exporter
  if (igIni['usage-stats-opt-out']) {
    params['usage-stats-opt-out'] = igIni['usage-stats-opt-out'];
  }
  contents.add(new YAMLPair('parameters', params));
  // copyrightYear
  contents.add(new YAMLPair('copyrightYear', igIni.copyrightyear ?? DEFAULT_IG_INI.copyrightyear));
  // releaseLabel
  contents.add(new YAMLPair('releaseLabel', igIni.ballotstatus ?? DEFAULT_IG_INI.ballotstatus));

  // The remaining properties are optional. If they exist (uncommented), they control other config files,
  // otherwise (when they are deleted or commented out), SUSHI will not generate them (but will copy them
  // if they exist in the predetermined locations).

  // Keep track of commented vs uncommented properties because we want to group the commented ones at
  // the end. This is partially for organizational purposes, but ACTUALLY because the YAML library has a
  // bug related to having commented out YAML in a block between two uncommented YAML blocks.  It's weird
  // but the unit tests activate the bug when we don't re-order like this.
  const setPairs: YAMLPair[] = [];
  const commentedPairs: YAMLPair[] = [];

  if (igIni !== DEFAULT_IG_INI) {
    commentedPairs.push(
      new CommentPair('template', igIni.template ?? DEFAULT_IG_INI.template)
        .withCommentBefore(
          getBoxComment(
            'ig.ini',
            'To control the ig.ini using this config, uncomment and set the "template" property.'
          )
        )
        .withSpaceBefore()
    );
  } else {
    setPairs.push(
      new YAMLPair('template', igIni.template ?? DEFAULT_IG_INI.template)
        .withCommentBefore(
          getBoxComment(
            'ig.ini',
            'To use a provided ig-data/ig.ini file, delete the "template" property below.'
          )
        )
        .withSpaceBefore()
    );
  }
  // menu
  const menuPath = path.join(root, 'ig-data', 'input', 'includes', 'menu.xml');
  if (fs.existsSync(menuPath)) {
    const menuXML = fs.readFileSync(menuPath, 'utf8');
    const menu = getMenuObjectFromMenuXML(menuXML);
    commentedPairs.push(
      new CommentPair('menu', menu ?? DEFAULT_MENU)
        .withCommentBefore(
          getBoxComment(
            'menu.xml',
            'To control the menu.xml using this config, uncomment and set the "menu" property.'
          )
        )
        .withSpaceBefore()
    );
  } else {
    setPairs.push(
      new YAMLPair('menu', DEFAULT_MENU)
        .withCommentBefore(
          getBoxComment(
            'menu.xml',
            'To use a provided ig-data/input/includes/menu.xml file, delete the "menu" property below.'
          )
        )
        .withSpaceBefore()
    );
  }
  // index
  // There are four possible locations for it (two filenames in two directories)
  const inputIndexMarkdownPageContentPath = path.join(
    root,
    'ig-data',
    'input',
    'pagecontent',
    'index.md'
  );
  const inputIndexXMLPageContentPath = path.join(
    root,
    'ig-data',
    'input',
    'pagecontent',
    'index.xml'
  );
  const inputIndexMarkdownPagesPath = path.join(root, 'ig-data', 'input', 'pages', 'index.md');
  const inputIndexXMLPagesPath = path.join(root, 'ig-data', 'input', 'pages', 'index.xml');
  if (
    !fs.existsSync(inputIndexMarkdownPageContentPath) &&
    !fs.existsSync(inputIndexXMLPageContentPath) &&
    !fs.existsSync(inputIndexMarkdownPagesPath) &&
    !fs.existsSync(inputIndexXMLPagesPath)
  ) {
    // no index file found, create our default
    setPairs.push(
      new YAMLPair('indexPageContent', packageJSON.description ?? '')
        .withCommentBefore(
          getBoxComment(
            'index.md',
            `To use a provided ig-data${path.sep}input${path.sep}[pagecontent | pages]${path.sep}index.[md | xml], delete the "indexPageContent" property below.`
          )
        )
        .withSpaceBefore()
    );
  } else {
    // if an index file is provided, don't add anything to config
  }

  // history
  // @ts-ignore it's ok that we don't initialize it with current.  It will get current eventually.
  const yamlHistory: YAMLConfigurationHistory = {};
  if (packageList['package-id'] != null && packageList['package-id'] !== packageJSON.name) {
    yamlHistory['package-id'] = packageList['package-id'];
  }
  if (packageList.canonical != null && packageList.canonical !== packageJSON.canonical) {
    yamlHistory.canonical = packageList.canonical;
  }
  if (packageList.title != null && packageList.title !== packageJSON.title) {
    yamlHistory.title = packageList.title;
  }
  if (packageList.introduction != null && packageList.introduction !== packageJSON.description) {
    yamlHistory.introduction = packageList.introduction;
  }
  yamlHistory.current = getCurrentFromPackageList(packageList, packageJSON);
  (packageList.list as any[])?.forEach(item => {
    if (item.version === 'current') {
      return;
    }
    const yamlItem = cloneDeep(item);
    delete yamlItem.version;
    yamlHistory[item.version] = yamlItem;
  });
  if (packageList !== DEFAULT_PACKAGE_LIST) {
    commentedPairs.push(
      new CommentPair('history', yamlHistory)
        .withCommentBefore(
          getBoxComment(
            'package-list.json',
            'To control the package-list.json using this config, uncomment and set the "history" property.'
          )
        )
        .withSpaceBefore()
    );
  } else {
    setPairs.push(
      new YAMLPair('history', yamlHistory)
        .withCommentBefore(
          getBoxComment(
            'package-list.json',
            'To use a provided ig-data/package-list.json file, delete the "history" property below.'
          )
        )
        .withSpaceBefore()
    );
  }

  setPairs.forEach(p => contents.add(p));
  commentedPairs.forEach(p => contents.add(p));

  // Write out the new configuration file
  logger.warn(
    `Generated new configuration file: ${path.resolve(
      configPath
    )}. Please review to ensure configuration is correct.`
  );
  fs.writeFileSync(configPath, doc.toString(), 'utf8');
  return configPath;
}

const COMMENTLENGTH = 94; // excluding 6 chars for initial '# │ ' and closing ' │'
const wrap = wordwrap(1, COMMENTLENGTH);
/**
 * Wraps a comment in a box (for visual purposes)
 * @param title - the title to put at the top of the box
 * @param comment - the comment to put in the body of the box
 * @returns string - the comment in a box
 */
function getBoxComment(title: string, comment: string): string {
  let boxComment = ` ╭─${pad(title, COMMENTLENGTH, '─')}─╮\n`;
  wrap(comment)
    .split(/\r?\n/)
    .forEach(line => {
      boxComment += ` │ ${padEnd(line, COMMENTLENGTH, ' ')} │\n`;
    });
  boxComment += ` ╰─${pad('', COMMENTLENGTH, '─')}─╯`;
  return boxComment;
}

// Helper functions for converting menu XML file
const itemInNewTab = (item: any) => (item.a._attributes?.target === '_blank' ? 'new-tab ' : '');
const itemIsExternal = (item: any) =>
  item.a.img?._attributes?.src === 'external.png' ? 'external ' : '';

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
          const menuLinkWithKeywords = `${itemInNewTab(li)}${itemIsExternal(li)}${link}`;
          if (li.ul && li.ul.li) {
            const subMenu: YAMLConfigurationMenuTree = {};
            const subItems = Array.isArray(li.ul.li) ? li.ul.li : [li.ul.li];
            subItems.forEach((subLi: any) => {
              if (subLi.a && !Array.isArray(subLi.a)) {
                const subName = subLi.a._text;
                const subLink = subLi.a._attributes?.href;
                if (subLink && subLink !== '#') {
                  subMenu[subName] = `${itemInNewTab(subLi)}${itemIsExternal(subLi)}${subLink}`;
                }
                // NOTE: if there is another sub-sub-menu, we drop it since publisher doesn't support it
              }
            });
            if (Object.keys(subMenu).length > 0) {
              menu[name] = subMenu;
            } else if (link && link !== '#') {
              menu[name] = menuLinkWithKeywords;
            }
          } else if (link && link !== '#') {
            menu[name] = menuLinkWithKeywords;
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
    'FHIR Spec': 'new-tab external http://hl7.org/fhir/R4/index.html'
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
