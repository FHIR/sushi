import path from 'path';
import ini from 'ini';
import sanitize from 'sanitize-filename';
import { EOL } from 'os';
import { sortBy, words, pad, padEnd, repeat, cloneDeep } from 'lodash';
import { titleCase } from 'title-case';
import {
  ensureDirSync,
  outputJSONSync,
  outputFileSync,
  existsSync,
  readdirSync,
  readFileSync
} from 'fs-extra';
import junk from 'junk';
import { Package } from '../export';
import {
  ImplementationGuide,
  ImplementationGuideDefinitionResource,
  ImplementationGuideDefinitionPageGeneration,
  StructureDefinition,
  ValueSet,
  CodeSystem,
  InstanceDefinition,
  ImplementationGuideDefinitionPage,
  ImplementationGuideDependsOn
} from '../fhirtypes';
import { ConfigurationMenuItem, ConfigurationResource } from '../fshtypes';
import { logger, Type, getFilesRecursive } from '../utils';
import { FHIRDefinitions } from '../fhirdefs';
import { Configuration } from '../fshtypes';

// List of Conformance and Terminology resources from http://hl7.org/fhir/R4/resourcelist.html
// and http://hl7.org/fhir/5.0.0-snapshot1/resourcelist.html
const CONFORMANCE_AND_TERMINOLOGY_RESOURCES = new Set([
  'CapabilityStatement',
  'CapabilityStatement2', // R5
  'StructureDefinition',
  'ImplementationGuide',
  'SearchParameter',
  'MessageDefinition',
  'OperationDefinition',
  'CompartmentDefinition',
  'StructureMap',
  'GraphDefinition',
  'ExampleScenario',
  'CodeSystem',
  'ValueSet',
  'ConceptMap',
  'ConceptMap2', // R5
  'NamingSystem',
  'TerminologyCapabilities'
]);

/**
 * The IG Exporter exports the FSH artifacts into a file structure supported by the IG Publisher.
 * This allows a FSH Tank to be built as a FHIR IG.  Currently, template-based IG publishing is
 * still new, so this functionality is subject to change.
 *
 * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/index.html}
 */
export class IGExporter {
  private ig: ImplementationGuide;
  private readonly configPath: string;
  private readonly config: Configuration;
  private readonly configName: string;
  constructor(
    private readonly pkg: Package,
    private readonly fhirDefs: FHIRDefinitions,
    private readonly inputPath: string
  ) {
    this.config = pkg.config;
    this.configPath = path.resolve(this.inputPath, '..', path.basename(this.config.filePath));
    this.configName = path.basename(this.configPath);
  }

  /**
   * Export the IG structure to the location specified by the outPath argument
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#directory-structure}
   * @param outPath {string} - the path to export the IG file structure to
   */
  export(outPath: string) {
    ensureDirSync(outPath);
    this.normalizeResourceReferences();
    this.initIG();
    this.addResources();
    this.addPredefinedResources();
    this.addConfiguredResources();
    this.sortResources();
    this.addConfiguredGroups();
    this.addIndex(outPath);
    if (!this.config.pages?.length) {
      this.addOtherPageContent();
    } else {
      this.addConfiguredPageContent();
    }
    this.addMenuXML(outPath);
    this.checkIgIni();
    this.checkPackageList();
    this.addImplementationGuide(outPath);
  }

  /**
   * Normalizes FSHy ids and names to the required relative URLs or canonicals
   */
  normalizeResourceReferences() {
    this.config.global?.forEach(g => {
      if (g.profile) {
        g.profile = this.normalizeResourceReference(g.profile, false);
      }
    });
    this.config.groups?.forEach(g => {
      if (g.resources) {
        g.resources = g.resources.map(r => this.normalizeResourceReference(r, true));
      }
    });
    this.config.resources?.forEach(r => {
      if (r.reference?.reference) {
        r.reference.reference = this.normalizeResourceReference(r.reference.reference, true);
      }
      if (r.exampleCanonical) {
        r.exampleCanonical = this.normalizeResourceReference(r.exampleCanonical, false);
      }
    });
  }

  /**
   * Initializes the ImplementationGuide JSON w/ data from the configuration YAML
   *
   * @see {@link https://confluence.hl7.org/pages/viewpage.action?pageId=35718629#NPMPackageSpecification-PackageManifestpropertiesforIGs}
   */
  initIG() {
    // first, properties that can be directly used without much trouble
    this.ig = {
      resourceType: 'ImplementationGuide',
      id: this.config.id,
      meta: this.config.meta,
      implicitRules: this.config.implicitRules,
      language: this.config.language,
      text: this.config.text,
      contained: this.config.contained,
      extension: this.config.extension,
      modifierExtension: this.config.modifierExtension,
      url: this.config.url ?? `${this.config.canonical}/ImplementationGuide/${this.config.id}`,
      version: this.config.version,
      // name must be alphanumeric (allowing underscore as well)
      name: this.config.name.replace(/[^A-Za-z0-9_]/g, ''),
      title: this.config.title,
      status: this.config.status,
      experimental: this.config.experimental,
      date: this.config.date,
      publisher: this.config.publisher,
      contact: this.config.contact,
      description: this.config.description,
      useContext: this.config.useContext,
      jurisdiction: this.config.jurisdiction,
      copyright: this.config.copyright,
      packageId: this.config.packageId ?? this.config.id,
      license: this.config.license,
      fhirVersion: this.config.fhirVersion,
      // put an empty dependsOn here to preserve the location of this property (delete later if not needed)
      dependsOn: [],
      global: this.config.global,
      definition: {
        // put an empty grouping here to preserve the location of this property (delete later if not needed)
        grouping: [],
        resource: [],
        page: {
          nameUrl: 'toc.html',
          title: 'Table of Contents',
          generation: 'html',
          page: [] // index.[md|html] is required and added later
        },
        // required parameters are enforced in the configuration
        // default to empty array in case we want to add other parameters later
        parameter: this.config.parameters ?? [],
        template: this.config.templates
      }
    };
    // Add the path-history, if applicable (only applies to HL7 IGs)
    if (
      /^https?:\/\/hl7.org\//.test(this.config.canonical) &&
      !this.ig.definition.parameter.some(param => {
        return param.code === 'path-history';
      })
    ) {
      this.ig.definition.parameter.push({
        code: 'path-history',
        value: `${this.config.canonical}/history.html`
      });
    }
    // Default 'autoload-resources' to false if it is not already defined
    // and only if custom resources are defined. This is done to counter
    // the IG Publisher behaving as if 'autoload-resources' is set to true
    // and allowing the IG Publisher to attempt processing of custom resources.
    if (
      this.pkg.resources?.length > 0 &&
      !this.ig.definition.parameter.some(param => {
        return param.code === 'autoload-resources';
      })
    ) {
      this.ig.definition.parameter.push({
        code: 'autoload-resources',
        value: 'false'
      });
      logger.info(
        'The autoload-resources parameter has been set to false because this implementation guide contains custom resources.'
      );
    }
    // add dependencies, filtering out "virtual" extension packages
    const dependencies = this.config.dependencies?.filter(
      d => !/^hl7\.fhir\.extensions\.r[2345]$/.test(d.packageId)
    );
    if (dependencies?.length) {
      const igs = this.fhirDefs.allImplementationGuides();
      for (const dependency of dependencies) {
        const dependsEntry = this.fixDependsOn(dependency, igs);
        if (dependsEntry) {
          this.ig.dependsOn.push(dependsEntry);
        }
      }
    } else {
      delete this.ig.dependsOn;
    }
    // delete grouping value if there are no groups in the config
    if (!this.config.groups?.length && !this.config.resources?.some(r => r.groupingId != null)) {
      delete this.ig.definition.grouping;
    }
    // delete global if it is empty
    if (!this.config.global?.length) {
      delete this.ig.global;
    }
    // delete templates if it is empty
    if (!this.config.templates?.length) {
      delete this.ig.definition.template;
    }
  }

  /**
   * Fixes a dependsOn entry by specifying its uri (if not yet specified) and generating an id (if
   * not yet specified). Will also ensure that required properties (uri/version) are available.
   * If it cannot ensure a valid dependsOn entry, it will return undefined.
   * @param dependency - the dependency to fix
   * @param igs - the IGs to search when finding the dependency URI
   * @returns the fixed dependency or null if it can't be fixed
   */
  private fixDependsOn(dependency: ImplementationGuideDependsOn, igs: any[]) {
    // Clone it so we don't mutate the original
    const dependsOn = cloneDeep(dependency);

    if (dependsOn.version == null) {
      // No need for the detailed log message since we already logged one in the package loader.
      logger.error(
        `Failed to add ${dependency.packageId} to ImplementationGuide instance because no ` +
          `version was specified in your ${this.configName}.`
      );
      return;
    }

    if (dependsOn.uri == null) {
      // Need to find the URI from the IG in the FHIR cache
      const dependencyIG = igs.find(
        ig =>
          ig.packageId === dependsOn.packageId &&
          (ig.version === dependsOn.version ||
            'current' === dependsOn.version ||
            'dev' === dependsOn.version)
      );
      dependsOn.uri = dependencyIG?.url;
      if (dependsOn.uri == null) {
        // there may be a package.json that can help us here
        const dependencyPackageJson = this.fhirDefs.getPackageJson(
          `${dependsOn.packageId}#${dependsOn.version}`
        );
        dependsOn.uri = dependencyPackageJson?.canonical;
      }

      if (dependsOn.uri == null) {
        // setting uri to required format as indicated in zulip discussion:
        // https://chat.fhir.org/#narrow/stream/179252-IG-creation/topic/fhir.2Edicom.20has.20no.20ImplementationGuide.20resource/near/265772431
        dependsOn.uri = `http://fhir.org/packages/${dependsOn.packageId}/ImplementationGuide/${dependsOn.packageId}`;
      }
    }

    if (dependsOn.id == null) {
      // packageId should be "a..z, A..Z, 0..9, and _ and it must start with a..z | A..Z" per
      // https://chat.fhir.org/#narrow/stream/215610-shorthand/topic/SUSHI.200.2E12.2E7/near/199193333
      // depId should be [A-Za-z0-9\-\.]{1,64}, so we replace . and - with _ and prepend "id_" if it does not start w/ a-z|A-Z
      dependsOn.id = /[A-Za-z]/.test(dependsOn.packageId[0])
        ? dependsOn.packageId.replace(/\.|-/g, '_')
        : 'id_' + dependsOn.packageId.replace(/\.|-/g, '_');
    }

    return dependsOn;
  }

  /**
   * Add the index.md file. Creates an index.md based on the "indexPageContent" in sushi-config.yaml.
   * If the user provided an index file, and no "indexPageContent" in sushi-config.yaml is specified,
   * the provided file is used instead. The provided file may be in one of two locations:
   * ./input/pagecontent or ./input/pages
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input}
   * @param igPath - the path where the IG is exported to
   */
  addIndex(igPath: string): void {
    const pageContentExportPath = path.join(igPath, 'input', 'pagecontent');

    // If the user provided an index.md file, use that
    // There are four possible locations for it (two filenames in two directories)
    // If more possibilities arise, rewrite this to avoid having to list all of them
    const inputIndexMarkdownPageContentPath = path.join(
      this.inputPath,
      'input',
      'pagecontent',
      'index.md'
    );
    const inputIndexXMLPageContentPath = path.join(
      this.inputPath,
      'input',
      'pagecontent',
      'index.xml'
    );
    const inputIndexMarkdownPagesPath = path.join(this.inputPath, 'input', 'pages', 'index.md');
    const inputIndexXMLPagesPath = path.join(this.inputPath, 'input', 'pages', 'index.xml');
    let generation: ImplementationGuideDefinitionPageGeneration = 'markdown';
    let filePath: string;
    if (existsSync(inputIndexMarkdownPageContentPath)) filePath = inputIndexMarkdownPageContentPath;
    if (existsSync(inputIndexXMLPageContentPath)) filePath = inputIndexXMLPageContentPath;
    if (existsSync(inputIndexMarkdownPagesPath)) filePath = inputIndexMarkdownPagesPath;
    if (existsSync(inputIndexXMLPagesPath)) filePath = inputIndexXMLPagesPath;

    if (this.config.indexPageContent) {
      ensureDirSync(pageContentExportPath);

      if (filePath) {
        const filePathString = path.join(
          path.basename(this.inputPath),
          path.relative(this.inputPath, filePath)
        );

        const preferredFileMessage =
          `Since a ${filePathString} file was found, the "indexPageContent" property in the ${this.configName} ` +
          'will be ignored and an index.md file will not be generated. Remove the "indexPageContent" ' +
          `property in ${this.configName} to resolve this warning.`;
        logger.warn(
          `Found both an "indexPageContent" property in ${this.configName} and an index file at ` +
            `${filePathString}. ${preferredFileMessage}`,
          {
            file: filePath
          }
        );

        if (
          !existsSync(inputIndexMarkdownPagesPath) &&
          !existsSync(inputIndexMarkdownPageContentPath) &&
          (existsSync(inputIndexXMLPagesPath) || existsSync(inputIndexXMLPageContentPath))
        ) {
          generation = 'html';
        }
        // Add user-provided index file to IG definition
        this.ig.definition.page.page.push({
          nameUrl: 'index.html',
          title: 'Home',
          generation
        });
        return;
      }

      // Generate index file if indexPageContent is provided in config
      const filePathString = 'input';
      const warning = warningBlock('<!-- index.md {% comment %}', '{% endcomment %} -->', [
        `To change the contents of this file, edit the "indexPageContent" attribute in the tank ${this.configName} file`,
        `or provide your own index file in the ${filePathString}${path.sep}pagecontent or ${filePathString}${path.sep}pages folder.`,
        'See: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input'
      ]);
      const outputPath = path.join(pageContentExportPath, 'index.md');
      outputFileSync(outputPath, `${warning}${this.config.indexPageContent}`);
      logger.info(`Generated index.md based on "indexPageContent" in ${this.configName}.`);
    } else if (
      !existsSync(inputIndexMarkdownPagesPath) &&
      !existsSync(inputIndexMarkdownPageContentPath) &&
      (existsSync(inputIndexXMLPagesPath) || existsSync(inputIndexXMLPageContentPath))
    ) {
      generation = 'html';
    } else {
      // do nothing -- no indexPageContent in config, do nothing with index file if provided
    }

    // Add user-provided or generated index file to IG definition
    // If pages are defined in the configuration, this is the author's responsibility
    if (!this.config.pages?.length && (filePath || this.config.indexPageContent)) {
      this.ig.definition.page.page.push({
        nameUrl: 'index.html',
        title: 'Home',
        generation
      });
    }
  }

  /**
   * Adds additional pages beyond index.md that are defined by the user.
   * Only add formats that are supported by the IG template
   * Intro and notes file contents are injected into relevant pages and should not be treated as their own page
   * Three directories are checked for additional page content:
   * pagecontent, pages, and resource-docs
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input}
   */
  private addOtherPageContent(): void {
    const pageContentFolderNames: string[] = ['pagecontent', 'pages', 'resource-docs'];
    for (const contentFolder of pageContentFolderNames) {
      const inputPageContentPath = path.join(this.inputPath, 'input', contentFolder);
      if (existsSync(inputPageContentPath)) {
        const organizedPages = this.organizePageContent(readdirSync(inputPageContentPath));

        let invalidFileTypeIncluded = false;
        organizedPages.forEach(page => {
          // All user defined pages are included in input/${contentFolder}
          const pagePath = path.join(this.inputPath, 'input', contentFolder, page.originalName);
          const isSupportedFileType = page.fileType === 'md' || page.fileType === 'xml';
          const isIntroOrNotesFile = page.name.endsWith('-intro') || page.name.endsWith('-notes');
          if (isSupportedFileType) {
            // Intro and notes files will be in supported formats but are not separate pages, so they should not be added to IG definition
            if (!isIntroOrNotesFile) {
              // Valid page files will be added to the IG definition
              this.ig.definition.page.page.push({
                nameUrl: `${page.name}.html`,
                title: page.title,
                generation: page.fileType === 'md' ? 'markdown' : 'html'
              });
            }
          } else if (!junk.is(path.basename(pagePath))) {
            invalidFileTypeIncluded = true;
          }
        });
        if (invalidFileTypeIncluded) {
          const errorString = 'Files not in the supported file types (.md and .xml) were detected.';
          logger.warn(errorString, {
            file: inputPageContentPath
          });
        }
      }
    }
  }

  /**
   * Adds additional pages to the IG based on user configuration.
   * Only pages present in the configuration are added, regardless of available files.
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#directory-structure}
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input}
   */
  addConfiguredPageContent(): void {
    // only configured pages are added to the implementation guide,
    for (const page of this.config.pages) {
      this.addConfiguredPage(page, this.ig.definition.page.page);
    }
    // all files in page content folders are left alone but checked for supported file types
    const pageContentFolderNames: string[] = ['pagecontent', 'pages', 'resource-docs'];
    for (const contentFolder of pageContentFolderNames) {
      let invalidFileTypeIncluded = false;
      const inputPageContentPath = path.join(this.inputPath, 'input', contentFolder);
      if (existsSync(inputPageContentPath)) {
        for (const contentFile of readdirSync(inputPageContentPath)) {
          const fileType = contentFile.slice(contentFile.lastIndexOf('.') + 1);
          if (!(fileType === 'md' || fileType === 'xml') && !junk.is(path.basename(contentFile))) {
            invalidFileTypeIncluded = true;
          }
        }
      }
      if (invalidFileTypeIncluded) {
        const errorString =
          'Files not in the supported file types (.md and .xml) were detected. These files will be included without any processing.';
        logger.warn(errorString, {
          file: inputPageContentPath
        });
      }
    }
  }

  /**
   * Adds pages to the implementation guide's list of pages.
   * The page configuration is traversed recursively to maintain the configured structure.
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input}
   * @param {ImplementationGuideDefinitionPage} page - the current page being added to a list of output pages
   * @param {ImplementationGuideDefinitionPage[]} target - the list of output pages that will receive the current page
   */
  private addConfiguredPage(
    page: ImplementationGuideDefinitionPage,
    target: ImplementationGuideDefinitionPage[]
  ) {
    if (page.nameUrl) {
      const lastPeriod = page.nameUrl.lastIndexOf('.');
      let name: string,
        fileType = '';
      if (lastPeriod === -1) {
        name = page.nameUrl;
      } else {
        name = page.nameUrl.slice(0, lastPeriod);
        fileType = page.nameUrl.slice(lastPeriod + 1);
      }
      // Any page listed in configuration will be added, even if it does not exist.
      const igPage: ImplementationGuideDefinitionPage = {
        nameUrl: `${name}.html`,
        title: page.title ?? titleCase(words(name).join(' ')),
        generation: page.generation ?? (fileType === 'md' ? 'markdown' : 'html'),
        ...(page.extension && { extension: page.extension }),
        ...(page.modifierExtension && { modifierExtension: page.modifierExtension })
      };
      if (page.page?.length) {
        const igSubpages: ImplementationGuideDefinitionPage[] = [];
        for (const subpage of page.page) {
          this.addConfiguredPage(subpage, igSubpages);
        }
        if (igSubpages.length > 0) {
          igPage.page = igSubpages;
        }
      }
      target.push(igPage);
    }
  }

  /**
   * Sorts and renames pages based on numeric prefixes.
   * Numeric prefixes are used for applying a sort order, and remain part of the file name.
   *
   * @param {string[]} pages - list of file names with extensions
   * @returns {PageMetadata []} - sorted list of file information objects
   */
  private organizePageContent(pages: string[]): PageMetadata[] {
    // Remove any preexisting duplicate file names, and log an error
    pages = pages.filter(page => {
      if (
        pages.find(p => p.slice(0, p.lastIndexOf('.')) === page.slice(0, page.lastIndexOf('.'))) !==
        page
      ) {
        logger.error(`Duplicate file ${page} will be ignored. Please rename to avoid collisions.`, {
          file: page
        });
        return false;
      }
      return true;
    });

    const pageData = pages.map(page => {
      const nameParts = page.match(/^(\d+)_(.*)/);
      let prefix: number = null;
      let nameWithoutPrefix: string;
      const nameWithPrefix = page.slice(0, page.lastIndexOf('.'));
      if (nameParts == null) {
        nameWithoutPrefix = page.slice(0, page.lastIndexOf('.'));
      } else {
        prefix = parseInt(nameParts[1]);
        nameWithoutPrefix = nameParts[2].slice(0, nameParts[2].lastIndexOf('.'));
      }
      return {
        originalName: page,
        prefix: prefix,
        name: nameWithPrefix,
        title: titleCase(words(nameWithoutPrefix).join(' ')),
        fileType: page.slice(page.lastIndexOf('.') + 1)
      };
    });
    let mightHaveDuplicates = true;
    while (mightHaveDuplicates) {
      mightHaveDuplicates = false;
      pageData.forEach(page => {
        const sameName = pageData.filter(otherPage => otherPage.name == page.name);
        if (sameName.length > 1) {
          mightHaveDuplicates = true;
          sameName.forEach(matchingPage => {
            matchingPage.name = matchingPage.originalName.slice(
              0,
              matchingPage.originalName.lastIndexOf('.')
            );
          });
        }
      });
    }
    return pageData.filter(page => page.name !== 'index').sort(this.compareIgFilenames);
  }

  /**
   * Compares two file names, each of which may be prefixed with a number.
   * If neither file has a prefix, compares the file names alphabetically.
   * If one file has a prefix, that file is before the other.
   * If both have a prefix, compares the prefixes numerically.
   * If the prefixes are equal, resolves the tie by comparing the file names alphabetically.
   *
   * @param {PageMetadata} pageA - metadata for first file
   * @param {PageMetadata} pageB - metadata for second file
   * @returns {number} - positive when file b comes first, negative when file a comes first, zero when the file names are equal.
   */
  private compareIgFilenames(pageA: PageMetadata, pageB: PageMetadata): number {
    if (pageA.prefix == null && pageB.prefix == null) {
      return pageA.name.localeCompare(pageB.name);
    } else if (pageA.prefix == null) {
      return 1;
    } else if (pageB.prefix == null) {
      return -1;
    } else {
      const prefixComparison = pageA.prefix - pageB.prefix;
      if (prefixComparison == 0) {
        return pageA.name.localeCompare(pageB.name);
      } else {
        return prefixComparison;
      }
    }
  }

  /**
   * Adds menu.xml
   * A user can define a menu in sushi-config.yaml or provide one in ./input/includes.
   * If neither is provided, the static one SUSHI provides will be used.
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  addMenuXML(igPath: string): void {
    const menuXMLDefaultPath = path.join(this.inputPath, 'input', 'includes', 'menu.xml');
    const menuXMLOutputPath = path.join(igPath, 'fsh-generated', 'includes', 'menu.xml');

    // If user provided file and config, log a warning but prefer the config.
    if (existsSync(menuXMLDefaultPath) && this.config.menu) {
      const filePathString = path.join(
        path.basename(this.inputPath),
        'input',
        'includes',
        'menu.xml'
      );

      const preferredFileMessage =
        `Since a ${filePathString} file was found, the "menu" property in the ${this.configName} ` +
        `will be ignored and a menu.xml file will not be generated. Remove the ${filePathString} ` +
        `file to use the "menu" property in ${this.configName} to generate a menu.xml file instead.`;
      logger.warn(
        `Found both a "menu" property in ${this.configName} and a menu.xml file at ${filePathString}. ` +
          `${preferredFileMessage}`,
        {
          file: menuXMLDefaultPath
        }
      );

      return;
    }

    // Always use config menu if defined
    if (this.config.menu) {
      let menu = `<ul xmlns="http://www.w3.org/1999/xhtml" class="nav navbar-nav">${EOL}`;
      this.config.menu.forEach(item => {
        menu += this.buildMenuItem(item, 2);
      });
      menu += '</ul>';

      const filePathString = path.join('input', 'includes');
      const warning = warningBlock(
        `<!-- ${path.parse(menuXMLOutputPath).base} {% comment %}`,
        '{% endcomment %} -->',
        [
          `To change the contents of this file, edit the "menu" attribute in the tank ${this.configName} file`,
          `or provide your own menu.xml in the ${filePathString} folder`
        ]
      );
      outputFileSync(menuXMLOutputPath, `${warning}${menu}`, 'utf8');
    }
  }

  /**
   * Build individual menu item for menu.xml file. An item could contain a submenu
   *
   * @param {ConfigurationMenuItem} item - the menu item to be rendered
   * @param {number} spaces - the base number of spaces to indent
   * @returns {string} - the piece of XML relating to the given menu item
   */

  private buildMenuItem(item: ConfigurationMenuItem, spaces: number): string {
    const prefixSpaces = ' '.repeat(spaces);
    let menuItem = '';

    if (item.subMenu) {
      menuItem += `${prefixSpaces}<li class="dropdown">${EOL}`;
      menuItem += this.buildSubMenu(item, spaces + 2);
      menuItem += `${prefixSpaces}</li>${EOL}`;
    } else {
      menuItem += `${prefixSpaces}<li>${EOL}${prefixSpaces}${'  '}`;
      if (item.url) {
        menuItem += '<a ';
        if (item.openInNewTab) menuItem += 'target="_blank" ';
        menuItem += `href="${item.url}">`;
      }
      menuItem += item.name;
      if (item.url) {
        menuItem += '</a>';
      }
      menuItem += `${EOL}${prefixSpaces}</li>${EOL}`;
    }
    return menuItem;
  }

  /**
   * Build a submenu for an item for menu.xml.
   *
   * @param item - the menu item with submenu to be rendered
   * @param spaces - the base number of spaces to indent
   * @returns {string} - the piece of XML relating to the submenu
   */
  private buildSubMenu(item: ConfigurationMenuItem, spaces: number): string {
    const prefixSpaces = ' '.repeat(spaces);
    let subMenu = `${prefixSpaces}<a data-toggle="dropdown" href="#" class="dropdown-toggle">${item.name}${EOL}`;
    subMenu += `${prefixSpaces}${'  '}<b class="caret"></b>${EOL}`;
    subMenu += `${prefixSpaces}</a>${EOL}`;
    subMenu += `${prefixSpaces}<ul class="dropdown-menu">${EOL}`;
    item.subMenu?.forEach((subItem: ConfigurationMenuItem): void => {
      if (subItem.subMenu) {
        logger.warn(
          `The ${subItem.name} menu item specifies a sub-menu. The IG template currently only supports two levels of menus. ` +
            `The sub-menu for ${subItem.name} is included in the menu.xml file but it will not be rendered in the IG.`
        );
      }
      subMenu += this.buildMenuItem(subItem, spaces + 2);
    });
    subMenu += `${prefixSpaces}</ul>${EOL}`;
    return subMenu;
  }

  /**
   * Add each of the resources from the package to the ImplementationGuide JSON file.
   * Configuration may specify resources to omit.
   *
   * This function has similar operation to addPredefinedResources, and both should be
   * analyzed when making changes to either.
   */
  private addResources(): void {
    // NOTE: Custom resources are not included in the implementation guide
    //       because the IG Publisher will not except newly defined resources.
    //       This only prevents adding custom resources into the IG. It does
    //       NOT prevent custom resource StructureDefinitions from being
    //       written to disk.
    const resources: (StructureDefinition | ValueSet | CodeSystem)[] = [
      ...this.pkg.profiles,
      ...this.pkg.extensions,
      ...this.pkg.logicals,
      ...this.pkg.valueSets,
      ...this.pkg.codeSystems
    ];
    resources.forEach(r => {
      const referenceKey = `${r.resourceType}/${r.id}`;
      const configResource = (this.config.resources ?? []).find(
        resource => resource.reference?.reference == referenceKey
      );

      if (configResource?.omit !== true) {
        this.addPackageResource(referenceKey, r, configResource);
      }
    });
    this.pkg.instances
      .filter(instance => instance._instanceMeta.usage !== 'Inline')
      .forEach(instance => {
        const referenceKey = `${instance.resourceType}/${
          instance.id ?? instance._instanceMeta.name
        }`;
        const configResource = (this.config.resources ?? []).find(
          resource => resource.reference?.reference == referenceKey
        );

        if (configResource?.omit !== true) {
          this.addPackageResource(referenceKey, instance, configResource);
        }
      });
  }

  private addPackageResource(
    referenceKey: string,
    pkgResource: StructureDefinition | ValueSet | CodeSystem | InstanceDefinition,
    configResource?: ConfigurationResource
  ): void {
    const newResource: ImplementationGuideDefinitionResource = {
      reference: { reference: referenceKey }
    };
    if (pkgResource instanceof InstanceDefinition) {
      newResource.name =
        configResource?.name ?? pkgResource._instanceMeta.title ?? pkgResource._instanceMeta.name;
      newResource.description =
        configResource?.description ?? pkgResource._instanceMeta.description;
      newResource._sortKey = pkgResource.id ?? pkgResource._instanceMeta.name;
    } else {
      newResource.name =
        configResource?.name ?? pkgResource.title ?? pkgResource.name ?? pkgResource.id;
      newResource.description = configResource?.description ?? pkgResource.description;
      newResource._sortKey = pkgResource.title ?? pkgResource.name;
    }
    if (configResource?.fhirVersion?.length) {
      newResource.fhirVersion = configResource.fhirVersion;
    }
    if (configResource?.groupingId) {
      newResource.groupingId = configResource.groupingId;
      this.addGroup(newResource.groupingId);
    }
    if (configResource?.exampleCanonical) {
      newResource.exampleCanonical = configResource.exampleCanonical;
    } else if (typeof configResource?.exampleBoolean === 'boolean') {
      newResource.exampleBoolean = configResource.exampleBoolean;
    } else if (
      pkgResource instanceof InstanceDefinition &&
      pkgResource._instanceMeta.usage === 'Example'
    ) {
      const exampleUrl = pkgResource.meta?.profile?.find(url => this.pkg.fish(url, Type.Profile));
      if (exampleUrl) {
        newResource.exampleCanonical = exampleUrl;
      } else {
        newResource.exampleBoolean = true;
      }
    } else {
      newResource.exampleBoolean = false;
    }
    if (configResource?.extension?.length) {
      newResource.extension = configResource.extension;
    }
    this.ig.definition.resource.push(newResource);
  }

  private areAllResourcesInConfig(): boolean {
    if (this.config.resources == null) {
      return false;
    }
    return this.ig.definition.resource.every(igResource => {
      return this.config.resources.some(
        configResource => configResource.reference?.reference === igResource.reference?.reference
      );
    });
  }

  private areAllResourcesInGroups(): boolean {
    if (this.config.groups == null) {
      return false;
    }
    return this.ig.definition.resource.every(igResource => {
      return this.config.groups.some(group =>
        group.resources?.includes(igResource.reference?.reference)
      );
    });
  }

  /**
   * Adds any user provided resource files to the ImplementationGuide JSON file.
   * This includes definitions in:
   * capabilities, extensions, models, operations, profiles, resources, vocabulary, examples
   * Based on: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input
   *
   * NOTE: This does not include files nested in subfolders in supported paths since the
   * IG Exporter does not handle those well.
   *
   * This function has similar operation to addResources, and both should be
   * analyzed when making changes to either.
   */
  private addPredefinedResources(): void {
    // Similar code for loading custom resources exists in load.ts loadCustomResources()
    const pathEnds = [
      'capabilities',
      'extensions',
      'models',
      'operations',
      'profiles',
      'resources',
      'vocabulary',
      'examples'
    ];
    const predefinedResourcePaths = pathEnds.map(pathEnd =>
      path.join(this.inputPath, 'input', pathEnd)
    );
    let pathResourceDirectories: string[];
    const pathResources = this.config.parameters
      ?.filter(parameter => parameter.value && parameter.code === 'path-resource')
      .map(parameter => parameter.value);
    if (pathResources) {
      pathResourceDirectories = pathResources
        .map(directoryPath => path.join(this.inputPath, directoryPath))
        .filter(directoryPath => existsSync(directoryPath));
      if (pathResourceDirectories) predefinedResourcePaths.push(...pathResourceDirectories);
    }
    const deeplyNestedFiles: string[] = [];
    for (const dirPath of predefinedResourcePaths) {
      if (existsSync(dirPath)) {
        const files = getFilesRecursive(dirPath);
        for (const file of files) {
          if (
            path.dirname(file) !== dirPath &&
            !pathResourceDirectories?.includes(path.dirname(file))
          ) {
            deeplyNestedFiles.push(file);
            continue;
          }
          const resourceJSON: InstanceDefinition = this.fhirDefs.getPredefinedResource(file);
          if (resourceJSON) {
            if (resourceJSON.resourceType == null || resourceJSON.id == null) {
              logger.error(`Resource at ${file} must define resourceType and id.`);
              continue;
            }

            const referenceKey = `${resourceJSON.resourceType}/${resourceJSON.id}`;
            const newResource: ImplementationGuideDefinitionResource = {
              reference: {
                reference: referenceKey
              }
            };
            const configResource = (this.config.resources ?? []).find(
              resource => resource.reference?.reference == referenceKey
            );

            // For predefined examples of Logical Models, the user must provide an entry in config
            // that specifies the reference as Binary/[id], the extension that specifies the resource format,
            // and the exampleCanonical that references the LogicalModel the resource is an example of.
            // In that case, we do not want to add our own entry for the predefined resource - we just
            // want to use the resource entry from the sushi-config.yaml
            const hasBinaryExampleReference = (this.config.resources ?? []).some(
              resource =>
                resource.reference?.reference === `Binary/${resourceJSON.id}` &&
                resource.exampleCanonical ===
                  `${this.config.canonical}/StructureDefinition/${resourceJSON.resourceType}` &&
                resource.extension?.some(
                  e =>
                    e.url ===
                    'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format'
                )
            );

            if (configResource?.omit !== true && !hasBinaryExampleReference) {
              const existingIndex = this.ig.definition.resource.findIndex(
                r => r.reference.reference === referenceKey
              );
              // If the user has provided a resource, it should override the generated resource.
              // This can be helpful for working around cases where the generated resource has some incorrect values.
              const existingResource =
                existingIndex >= 0 ? this.ig.definition.resource[existingIndex] : null;
              const existingIsExample =
                existingResource?.exampleBoolean || existingResource?.exampleCanonical;
              const existingName = existingIsExample ? existingResource.name : null;
              const existingDescription = existingIsExample ? existingResource.description : null;

              const metaExtensionDescription = this.getMetaExtensionDescription(resourceJSON);
              const metaExtensionName = this.getMetaExtensionName(resourceJSON);

              newResource.description =
                configResource?.description ??
                metaExtensionDescription ??
                existingDescription ??
                (CONFORMANCE_AND_TERMINOLOGY_RESOURCES.has(resourceJSON.resourceType)
                  ? resourceJSON.description
                  : undefined);
              if (configResource?.fhirVersion) {
                newResource.fhirVersion = configResource.fhirVersion;
              }
              if (configResource?.groupingId) {
                newResource.groupingId = configResource.groupingId;
                this.addGroup(newResource.groupingId);
              }
              if (path.basename(dirPath) === 'examples') {
                newResource.name =
                  configResource?.name ?? metaExtensionName ?? existingName ?? resourceJSON.id;
                // set exampleCanonical or exampleBoolean, preferring configured values
                if (configResource?.exampleCanonical) {
                  newResource.exampleCanonical = configResource.exampleCanonical;
                } else if (typeof configResource?.exampleBoolean === 'boolean') {
                  newResource.exampleBoolean = configResource.exampleBoolean;
                } else {
                  const exampleUrl = resourceJSON.meta?.profile?.find(
                    url =>
                      this.pkg.fish(url, Type.Profile) ??
                      this.fhirDefs.fishForFHIR(url, Type.Profile)
                  );
                  if (exampleUrl) {
                    newResource.exampleCanonical = exampleUrl;
                  } else {
                    newResource.exampleBoolean = true;
                  }
                }
              } else {
                if (configResource?.exampleCanonical) {
                  newResource.exampleCanonical = configResource.exampleCanonical;
                } else if (typeof configResource?.exampleBoolean === 'boolean') {
                  newResource.exampleBoolean = configResource.exampleBoolean;
                } else {
                  newResource.exampleBoolean = false;
                }
                // On some resources (Patient for example) these fields can be objects, avoid using them when this is true
                const title = typeof resourceJSON.title === 'string' ? resourceJSON.title : null;
                const name = typeof resourceJSON.name === 'string' ? resourceJSON.name : null;
                newResource.name =
                  configResource?.name ??
                  metaExtensionName ??
                  existingResource?.name ??
                  title ??
                  name ??
                  resourceJSON.id;
              }
              newResource._sortKey = resourceJSON.id;
              if (configResource?.extension?.length) {
                newResource.extension = configResource.extension;
              }

              if (existingIndex >= 0) {
                this.ig.definition.resource[existingIndex] = newResource;
              } else {
                this.ig.definition.resource.push(newResource);
              }
            }
          }
        }
      }
    }
    if (deeplyNestedFiles.length) {
      logger.warn(
        'The following files were not added to the ImplementationGuide JSON because they are not in one of the supported ' +
          'input folders or are nested too deep in one of those folders. While SUSHI automatically supports resources in ' +
          'sub-folders, the IG Publisher does not, unless the folder is explicitly added via the template or an IG parameter. ' +
          'To fix any issues you may encounter due to this, adjust your IG parameters or template accordingly or move these ' +
          `files so they are directly under a supported input folder (e.g., input/resources, input/profiles, etc.):\n  - ${deeplyNestedFiles.join(
            '\n  - '
          )}`
      );
    }
  }

  /**
   * Adds resources that are present only in the configuration.
   * If a configured resource is already in the implementation guide,
   * there is no need to add it again.
   */
  private addConfiguredResources(): void {
    for (const resource of this.config.resources ?? []) {
      if (
        !resource.omit &&
        this.ig.definition.resource.findIndex(
          r => resource.reference?.reference === r.reference?.reference
        ) === -1
      ) {
        resource._sortKey = resource.name ?? resource.reference?.reference?.split('/').pop();
        this.ig.definition.resource.push(resource);
      }
    }
  }

  private sortResources(): void {
    let sortedResources: ImplementationGuideDefinitionResource[] = [];
    if (this.areAllResourcesInConfig()) {
      this.ig.definition.resource.forEach(igResource => {
        const configIndex = this.config.resources.findIndex(configResource => {
          return configResource.reference?.reference === igResource.reference?.reference;
        });
        igResource._sortKey = configIndex;
      });
      sortedResources = sortBy(this.ig.definition.resource, '_sortKey');
    } else if (this.areAllResourcesInGroups()) {
      this.config.groups.forEach(group => {
        group.resources?.forEach(groupResource => {
          const igResource = this.ig.definition.resource.find(igResource => {
            return igResource.reference?.reference === groupResource;
          });
          if (igResource != null) {
            sortedResources.push(igResource);
          }
        });
      });
    } else {
      sortedResources = sortBy(this.ig.definition.resource, '_sortKey');
    }
    this.ig.definition.resource = sortedResources;
    this.ig.definition.resource.forEach(resource => delete resource._sortKey);
  }

  /**
   * Adds or updates a group in the implementation guide.
   *
   * @param {string} id - unique identifier for group
   * @param {string} name - name of the group
   * @param {string} description - optional description of the group
   */
  private addGroup(id: string, name?: string, description?: string): void {
    if (!this.ig.definition.grouping) {
      this.ig.definition.grouping = [];
    }
    // Initially `name` and `id` were derived from the same parameter. This allows
    // the function to still work with just a single parameter.
    if (name === undefined) {
      name = id;
    }
    const existingGroup = this.ig.definition.grouping.find(group => group.id === id);
    if (existingGroup) {
      existingGroup.name = name;
      if (description) {
        existingGroup.description = description;
      }
    } else {
      this.ig.definition.grouping.push({
        id: id,
        name: name,
        ...(description && { description })
      });
    }
  }

  /**
   * Adds groups listed in the configuration to the implementation guide.
   * Updates the groupingId on resources listed as members of a group.
   * Shows errors if a listed resource does not exist, or if there are conflicting
   * configured values for groupingId.
   * Shows a warning if a groupingId is given in resource configuration and
   * that resource is listed in the group with that groupingId.
   */

  private addConfiguredGroups(): void {
    for (const group of this.config.groups ?? []) {
      this.addGroup(group.id, group.name, group.description);
      if (group.resources) {
        for (const resourceKey of group.resources) {
          const existingResource = this.ig.definition.resource.find(
            resource => resource.reference?.reference === resourceKey
          );
          if (!existingResource) {
            logger.error(`Group ${group.id} configured with nonexistent resource ${resourceKey}`);
          } else {
            if (existingResource.groupingId) {
              if (existingResource.groupingId === group.id) {
                logger.warn(
                  `Resource ${resourceKey} is listed as a member of group ${group.id}, and does not need a groupingId.`
                );
              } else {
                logger.error(
                  `Resource ${resourceKey} configured with groupingId ${existingResource.groupingId}, but listed as member of group ${group.id}.`
                );
              }
            }
            existingResource.groupingId = group.id;
          }
        }
      }
    }
  }

  private getMetaExtensionDescription(resource: InstanceDefinition): string {
    const description = resource.meta?.extension?.find(
      e => e.url === 'http://hl7.org/fhir/StructureDefinition/instance-description'
    )?.valueMarkdown;
    if (!CONFORMANCE_AND_TERMINOLOGY_RESOURCES.has(resource.resourceType)) {
      return description;
    }
  }

  private getMetaExtensionName(resource: InstanceDefinition): string {
    const name = resource.meta?.extension?.find(
      e => e.url === 'http://hl7.org/fhir/StructureDefinition/instance-name'
    )?.valueString;
    if (!CONFORMANCE_AND_TERMINOLOGY_RESOURCES.has(resource.resourceType)) {
      return name;
    }
  }

  private normalizeResourceReference(resource: string, useRelative: boolean): string {
    let ref;
    // If it doesn't contain / or :, then it's not a relative URL or canonical yet
    if (!/[/:]/.test(resource)) {
      let def = this.pkg.fishForFHIR(resource);
      if (def == null) {
        def = this.fhirDefs.fishForFHIR(resource);
      }
      if (useRelative && def?.resourceType && def?.id) {
        ref = `${def.resourceType}/${def.id}`;
      } else if (def?.url) {
        ref = def.url;
      }
      if (ref == null) {
        logger.warn(
          `Cannot determine ${
            useRelative ? 'relative URL' : 'canonical'
          } for "${resource}" referenced in sushi-config.yaml.`
        );
      }
    }
    // Fallback to resource if we didn't assign a fullRef
    return ref ?? resource;
  }

  /**
   * Writes the in-memory ImplementationGuide JSON to the IG output folder.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  addImplementationGuide(igPath: string): void {
    const igJSONFolder = path.join('fsh-generated', 'resources');
    const igJsonPath = path.join(
      igPath,
      igJSONFolder,
      sanitize(`ImplementationGuide-${this.ig.id}.json`, { replacement: '-' })
    );
    outputJSONSync(igJsonPath, this.ig, { spaces: 2 });
    logger.info(`Generated ImplementationGuide-${this.ig.id}.json`);
  }

  /**
   * Logs an error if the no longer supported "template" property is used in sushi-config.yaml.
   */
  checkIgIni(): void {
    const inputIniPath = path.join(this.inputPath, 'ig.ini');
    if (this.config.template != null) {
      if (existsSync(inputIniPath)) {
        const filePathString = path.join(path.basename(this.inputPath), 'ig.ini');
        const message =
          `Found both a "template" property in ${this.configName} and an ig.ini file at ${filePathString}. ` +
          `The "template" property in ${this.configName} is no longer supported and will be ignored. The existing ` +
          `${filePathString} file will be used instead. To resolve this error, remove the "template" property in ` +
          `${this.configName} and manage the ig.ini file directly.`;
        logger.error(message, { file: inputIniPath });
      } else {
        const message =
          `The "template" property in ${this.configName} is no longer supported. Please remove the "template" ` +
          `property in ${this.configName} and manage the ig.ini file directly.` +
          ` To resolve this error, create an ig.ini file in your project folder with the following contents:\n\n${this.generateIgIniString()}`;
        logger.error(message);
      }
    } else if (existsSync(inputIniPath)) {
      this.processIgIni(inputIniPath);
    } else {
      // do nothing -- no template in config, no ig.ini provided
    }
  }

  /**
   * Generates the contents of an ig.ini file using the information in the configuration.
   *
   * @returns {string} contents of ig.ini file
   */
  generateIgIniString(): string {
    // Create an ig.ini object from the configuration
    const iniObj: any = {};
    const igFolder = 'fsh-generated/resources';
    iniObj.ig = `${igFolder}/ImplementationGuide-${this.config.id}.json`;
    iniObj.template = this.config.template;
    let outputIniContents = ini.encode(iniObj, { section: 'IG', whitespace: true });

    // The encoder escapes '#' but FHIR doesn't like that, so if `#` is escaped in the template, then unescape it.
    outputIniContents = outputIniContents.replace(/^template\s*=\s*.*?(\\#.+)?$/m, ($0, $1) =>
      $1 ? $0.replace($1, $1.slice(1)) : $0
    );

    return outputIniContents;
  }

  /**
   * Process an existing ig.ini.
   * When one of the required properties is missing, an error is logged but the file is not changed.
   *
   * @param inputIniPath {string} - the path to the input ig.ini file
   */
  processIgIni(inputIniPath: string): void {
    let inputIniContents = readFileSync(inputIniPath, 'utf8');
    // FHIR allows templates to have versions identified using #.  E.g.,
    //   template = hl7.fhir.template#0.1.0
    // The ini library, however, treats # as a comment unless it is escaped.  So if it exists, we need to escape it.
    inputIniContents = inputIniContents.replace(/^\s*template\s*=\s*[^#]*(#.+)?$/m, ($0, $1) =>
      $1 ? $0.replace($1, `\\${$1}`) : $0
    );
    const inputIni = ini.parse(inputIniContents);
    if (Object.keys(inputIni).length > 1 || inputIni.IG == null) {
      logger.error('ig.ini file must contain an [IG] section with no other sections', {
        file: inputIniPath
      });
    }
    const filePathString = path.join(path.basename(this.inputPath), 'ig.ini');
    if (inputIni.IG) {
      if (inputIni.IG.ig == null) {
        const igValue = `fsh-generated/resources/ImplementationGuide-${this.config.id}.json`;
        inputIni.IG.ig = igValue;
        logger.error(
          'The ig.ini file must have an "ig" property pointing to the IG file. Please add the following line ' +
            `to ${filePathString}:\n'` +
            `ig = ${igValue}`,
          {
            file: inputIniPath
          }
        );
      }
      if (inputIni.IG.template == null) {
        const templateValue = 'fhir.base.template';
        inputIni.IG.template = templateValue;
        logger.error(
          `The ig.ini file must have a "template" property. Please update ${filePathString} to include ` +
            'your desired template value. Consider adding the following line:\n' +
            `template = ${templateValue}`,
          {
            file: inputIniPath
          }
        );
      }
      const deprecatedProps = [
        'copyrightyear',
        'license',
        'version',
        'ballotstatus',
        'fhirspec',
        'excludexml',
        'excludejson',
        'excludettl',
        'excludeMaps'
      ].filter(p => inputIni.IG.hasOwnProperty(p));
      if (deprecatedProps.length > 0) {
        const propList = deprecatedProps.join(', ');
        logger.warn(
          `Your ${filePathString} file contains the following unsupported properties: ${propList}. ` +
            'These are no longer supported in ig.ini and should be removed.  See the following link for details: ' +
            'https://github.com/HL7/ig-template-base/releases/tag/0.0.2',
          {
            file: inputIniPath
          }
        );
      }
    }
  }

  /**
   * Logs an error if the no longer supported "history" property is used in sushi-config.yaml
   */
  checkPackageList(): void {
    if (this.config.history) {
      logger.error(
        'Detected "history" property in configuration. The use of "history" is no longer supported. Please remove the property and provide a package-list.json directly. ' +
          'The package-list.json corresponding to the "history" property in the configuration is:\n\n' +
          JSON.stringify(this.config.history, null, 2) +
          '\n'
      );
    }
  }
}

type PageMetadata = {
  originalName: string;
  prefix: number;
  name: string;
  title: string;
  fileType: string;
};

/**
 * Creates a block of comments indicating that a file is generated and should not be directly edited,
 * allowing for the block comment delimiters to be passed in as well as any extra text to include.
 *
 * @param blockPrefix {string} - the comment prefix to use at the start of the block (e.g., <!-- {% comment %})
 * @param blockPostfix {string} - the comment postfix to use at the end of the block (e.g., {% endcomment %} -->)
 * @param extra {List<string>} - an array of strings, each of which is a line to include in the comment after the
 *   standard warning text
 * @param blankLineAfter {boolean} - whether or not to put a blank line after the block of comments
 * @returns {string} representing the formatted comments
 */
function warningBlock(
  blockPrefix = '',
  blockPostfix = '',
  extra: string[] = [],
  blankLineAfter = true
): string {
  const a = [blockPrefix, ...warningTextArray('', extra), blockPostfix, ''];
  if (blankLineAfter) {
    a.push('');
  }
  return a.join(EOL);
}

/**
 * Creates a set of comments as an array of strings, each representing a line in the comments.
 * These comments indicate that a file is generated and should not be directly edited, and this function
 * allows for the comment delimiters to be passed in as well as any extra text to include.
 *
 * @param prefix {string} - the comment prefix to use at the start of each line (e.g., <!--)
 * @param extra {List<string>} - an array of strings, each of which is a line to include in the comment after the
 *   standard warning text
 */
function warningTextArray(prefix: string, extra: string[] = []): string[] {
  const msgLen = Math.max(85, ...extra.map(e => e.length));
  const a: string[] = [];
  const msg = (text = '', center = false): void => {
    const fn = center ? pad : padEnd;
    a.push(`${prefix}* ${fn(text, msgLen)} *`);
  };

  a.push(`${prefix}${repeat('*', msgLen + 4)}`);
  msg('WARNING: DO NOT EDIT THIS FILE', true);
  msg();
  msg('This file is generated by SUSHI. Any edits you make to this file will be overwritten.');
  if (extra && extra.length > 0) {
    msg();
    extra.forEach(m => msg(m));
  }
  a.push(`${prefix}${repeat('*', msgLen + 4)}`);
  return a;
}
