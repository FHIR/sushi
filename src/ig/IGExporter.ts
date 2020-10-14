import path from 'path';
import ini from 'ini';
import { EOL } from 'os';
import { sortBy, words, pad, padEnd, repeat, orderBy, cloneDeep } from 'lodash';
import { titleCase } from 'title-case';
import {
  statSync,
  ensureDirSync,
  copySync,
  outputJSONSync,
  outputFileSync,
  existsSync,
  readdirSync,
  readFileSync
} from 'fs-extra';
import table from 'markdown-table';
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
import { ConfigurationMenuItem } from '../fshtypes';
import { logger, Type } from '../utils';
import { FHIRDefinitions } from '../fhirdefs';
import { Configuration } from '../fshtypes';

// List of Conformance and Terminology resources from http://hl7.org/fhir/R4/resourcelist.html
const CONFORMANCE_AND_TERMINOLOGY_RESOURCES = new Set([
  'CapabilityStatement',
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
  private readonly outputLog: Map<string, outputLogDetails>;
  private readonly config: Configuration;
  private readonly configName: string;
  private shouldCopyFiles: boolean;
  constructor(
    private readonly pkg: Package,
    private readonly fhirDefs: FHIRDefinitions,
    private readonly igDataPath: string,
    private readonly isIgPubContext = false
  ) {
    this.outputLog = new Map();
    this.config = pkg.config;
    this.configPath = path.resolve(this.igDataPath, '..', path.basename(this.config.filePath));
    this.configName = path.basename(this.configPath);
    // In legacy IG publisher mode and legacy flat tank, always copy files and prefer config files.
    // Since current supported tank configuration requires input/fsh folder, both legacy cases occur when not in IG Pub context
    this.shouldCopyFiles = !this.isIgPubContext;
  }

  getOutputLogDetails(file: string) {
    return this.outputLog.get(file);
  }

  /**
   * Export the IG structure to the location specified by the outPath argument
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#directory-structure}
   * @param outPath {string} - the path to export the IG file structure to
   */
  export(outPath: string) {
    ensureDirSync(outPath);
    this.initIG();
    this.addResources();
    this.addPredefinedResources(outPath);
    this.addConfiguredResources();
    this.addConfiguredGroups();
    this.addIndex(outPath);
    if (!this.config.pages?.length) {
      this.addOtherPageContent(outPath);
    } else {
      this.addConfiguredPageContent(outPath);
    }
    this.addImages(outPath);
    this.addIncludeContents(outPath);
    this.addMenuXML(outPath);
    this.addIgIni(outPath);
    this.addPackageList(outPath);
    this.addIgnoreWarningsFile(outPath);
    this.addImplementationGuide(outPath);
    this.addOutputLog(outPath);
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
    // add dependencies
    if (this.config.dependencies?.length) {
      const igs = this.fhirDefs.allImplementationGuides();
      for (const dependency of this.config.dependencies) {
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
        logger.error(
          `Failed to add ${dependsOn.packageId}:${dependsOn.version} to ` +
            'ImplementationGuide instance because SUSHI could not find the IG URL in the ' +
            `dependency IG. To specify the IG URL in your ${this.configName}, use the dependency ` +
            'details format:\n\n' +
            'dependencies:\n' +
            `  ${dependsOn.packageId}:\n` +
            '    uri: http://my-fhir-ig.org/ImplementationGuide/123\n' +
            `    version: ${dependsOn.version}`
        );
        return;
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
   * If the user specified an index file in the ig-data folder, and no "indexPageContent" in sushi-config.yaml is specified,
   * the file from ig-data is used instead. The provided file may be in one of two locations:
   * ig-data/input/pagecontent or ig-data/input/pages
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input}
   * @param igPath - the path where the IG is exported to
   */
  addIndex(igPath: string): void {
    const pageContentExportPath = path.join(igPath, 'input', 'pagecontent');
    const pagesExportPath = path.join(igPath, 'input', 'pages');

    // If the user provided an index.md file, use that
    // There are four possible locations for it (two filenames in two directories)
    // If more possibilities arise, rewrite this to avoid having to list all of them
    const inputIndexMarkdownPageContentPath = path.join(
      this.igDataPath,
      'input',
      'pagecontent',
      'index.md'
    );
    const inputIndexXMLPageContentPath = path.join(
      this.igDataPath,
      'input',
      'pagecontent',
      'index.xml'
    );
    const inputIndexMarkdownPagesPath = path.join(this.igDataPath, 'input', 'pages', 'index.md');
    const inputIndexXMLPagesPath = path.join(this.igDataPath, 'input', 'pages', 'index.xml');
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
          path.basename(this.igDataPath),
          path.relative(this.igDataPath, filePath)
        );

        let preferredFileMessage =
          `Since a ${filePathString} file was found, the "indexPageContent" property in the ${this.configName} ` +
          'will be ignored and an index.md file will not be generated. Remove the "indexPageContent" ' +
          `property in ${this.configName} to resolve this warning.`;
        if (this.shouldCopyFiles) {
          preferredFileMessage =
            `Since the "indexPageContent" property is present in the ${this.configName}, ` +
            `an index.md file will be generated and the ${filePathString} file will be ignored.` +
            `Remove the "indexPageContent" property in ${this.configName} to use the ${filePathString} file instead.`;
        }
        logger.warn(
          `Found both an "indexPageContent" property in ${this.configName} and an index file at ` +
            `${filePathString}. ${preferredFileMessage}`,
          {
            file: filePath
          }
        );

        if (!this.shouldCopyFiles) {
          if (existsSync(inputIndexXMLPagesPath) || existsSync(inputIndexXMLPageContentPath)) {
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
      }

      const warning = warningBlock('<!-- index.md {% comment %}', '{% endcomment %} -->', [
        `To change the contents of this file, edit the "indexPageContent" attribute in the tank ${this.configName} file`,
        `or provide your own index file in the ${path.basename(this.igDataPath)}${path.sep}input${
          path.sep
        }pagecontent or ${path.basename(this.igDataPath)}${path.sep}input${path.sep}pages folder.`,
        'See: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input'
      ]);
      const outputPath = path.join(pageContentExportPath, 'index.md');
      outputFileSync(outputPath, `${warning}${this.config.indexPageContent}`);
      this.updateOutputLog(outputPath, [this.configPath], 'generated');
      logger.info(`Generated index.md based on "indexPageContent" in ${this.configName}.`);
    } else if (existsSync(inputIndexMarkdownPageContentPath)) {
      if (this.shouldCopyFiles) {
        ensureDirSync(pageContentExportPath);
        this.copyWithWarningText(
          inputIndexMarkdownPageContentPath,
          path.join(pageContentExportPath, 'index.md')
        );
        logger.info(`Copied ${path.join(pageContentExportPath, 'index.md')}`);
      }
    } else if (existsSync(inputIndexXMLPageContentPath)) {
      generation = 'html';
      if (this.shouldCopyFiles) {
        ensureDirSync(pageContentExportPath);
        this.copyWithWarningText(
          inputIndexXMLPageContentPath,
          path.join(pageContentExportPath, 'index.xml')
        );
        logger.info(`Copied ${path.join(pageContentExportPath, 'index.xml')}`);
      }
    } else if (existsSync(inputIndexMarkdownPagesPath)) {
      if (this.shouldCopyFiles) {
        ensureDirSync(pagesExportPath);
        this.copyWithWarningText(
          inputIndexMarkdownPagesPath,
          path.join(pagesExportPath, 'index.md')
        );
        logger.info(`Copied ${path.join(pagesExportPath, 'index.md')}`);
      }
    } else if (existsSync(inputIndexXMLPagesPath)) {
      generation = 'html';
      if (this.shouldCopyFiles) {
        ensureDirSync(pagesExportPath);
        this.copyWithWarningText(inputIndexXMLPagesPath, path.join(pagesExportPath, 'index.xml'));
        logger.info(`Copied ${path.join(pagesExportPath, 'index.xml')}`);
      }
    } else {
      // do nothing -- no indexPageContent in config, no index file in ig-data
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
   * @param {string} igPath - the path where the IG is exported to
   */
  private addOtherPageContent(igPath: string): void {
    const pageContentFolderNames: string[] = ['pagecontent', 'pages', 'resource-docs'];
    for (const contentFolder of pageContentFolderNames) {
      const inputPageContentPath = path.join(this.igDataPath, 'input', contentFolder);
      if (existsSync(inputPageContentPath)) {
        const organizedPages = this.organizePageContent(readdirSync(inputPageContentPath));

        let invalidFileTypeIncluded = false;
        organizedPages.forEach(page => {
          // All user defined pages are included in input/${contentFolder}
          const pagePath = path.join(this.igDataPath, 'input', contentFolder, page.originalName);

          if (this.shouldCopyFiles) {
            this.copyWithWarningText(
              pagePath,
              path.join(igPath, 'input', contentFolder, `${page.name}.${page.fileType}`)
            );
          }
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
          const errorString =
            'Files not in the supported file types (.md and .xml) were detected. These files will be copied over without any processing.';
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
   * All files in the page content folders will be copied,
   * regardless of configuration.
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#directory-structure}
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input}
   * @param {string} igPath - the path where the IG is exported to
   */
  private addConfiguredPageContent(igPath: string): void {
    // only configured pages are added to the implementation guide,
    for (const page of this.config.pages) {
      this.addConfiguredPage(page, this.ig.definition.page.page);
    }
    // but all files in page content folders are copied to corresponding output folders
    const pageContentFolderNames: string[] = ['pagecontent', 'pages', 'resource-docs'];
    for (const contentFolder of pageContentFolderNames) {
      let invalidFileTypeIncluded = false;
      const inputPageContentPath = path.join(this.igDataPath, 'input', contentFolder);
      if (existsSync(inputPageContentPath)) {
        const outputPageContentPath = path.join(igPath, 'input', contentFolder);
        for (const contentFile of readdirSync(inputPageContentPath)) {
          this.copyWithWarningText(
            path.join(inputPageContentPath, contentFile),
            path.join(outputPageContentPath, contentFile)
          );
          const fileType = contentFile.slice(contentFile.lastIndexOf('.') + 1);
          if (!(fileType === 'md' || fileType === 'xml') && !junk.is(path.basename(contentFile))) {
            invalidFileTypeIncluded = true;
          }
        }
      }
      if (invalidFileTypeIncluded) {
        const errorString =
          'Files not in the supported file types (.md and .xml) were detected. These files will be copied over without any processing.';
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
      // page content may be in pagecontent or pages folders
      const pageFolder = ['pagecontent', 'pages'].find(folder => {
        return existsSync(path.join(this.igDataPath, 'input', folder, page.nameUrl));
      });
      if (!pageFolder) {
        logger.error(`File for configured page ${page.nameUrl} not found.`);
      }
      const igPage: ImplementationGuideDefinitionPage = {
        nameUrl: `${name}.html`,
        title: page.title ?? titleCase(words(name).join(' ')),
        generation: page.generation ?? (fileType === 'md' ? 'markdown' : 'html')
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
   * Numeric prefixes are used for applying a sort order, but should be removed
   * from the page's name and title unless doing so would cause a name collision.
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
        name: this.isIgPubContext ? nameWithPrefix : nameWithoutPrefix,
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
   * Adds any user provided images that can be referenced directly in other pages
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addImages(igPath: string): void {
    // If the user provided additional image files, include them
    const inputImagesPath = path.join(this.igDataPath, 'input', 'images');
    if (existsSync(inputImagesPath)) {
      const outputPath = path.join(igPath, 'input', 'images');
      const files = readdirSync(inputImagesPath);
      files.forEach(file => {
        this.copyAsIs(path.join(inputImagesPath, file), path.join(outputPath, file));
      });
    }
  }

  /**
   * Adds any user provided includes files
   * A user provided menu.xml may be in this folder, but do not handle it here. It is handled separately in addMenuXML.
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  private addIncludeContents(igPath: string): void {
    const includesPath = path.join(this.igDataPath, 'input', 'includes');
    if (existsSync(includesPath)) {
      this.copyWithWarningText(includesPath, path.join(igPath, 'input', 'includes'), src => {
        // Filter out menu.xml because handled separately
        return !path.parse(src).base.startsWith('menu.xml');
      });
    }
  }

  /**
   * Adds menu.xml
   * A user can define a menu in sushi-config.yaml or provide one in ig-data/input/includes.
   * If neither is provided, the static one SUSHI provides will be used.
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  addMenuXML(igPath: string): void {
    const menuXMLDefaultPath = path.join(this.igDataPath, 'input', 'includes', 'menu.xml');
    const menuXMLOutputPath = this.isIgPubContext
      ? path.join(igPath, 'fsh-generated', 'includes', 'menu.xml')
      : path.join(igPath, 'input', 'includes', 'menu.xml');

    // If user provided menu file in input/includes and no config, copy over the file.
    if (existsSync(menuXMLDefaultPath) && !this.config.menu && this.shouldCopyFiles) {
      this.copyWithWarningText(menuXMLDefaultPath, menuXMLOutputPath);
      return;
    }

    // If user provided file and config, log a warning but prefer the config.
    if (existsSync(menuXMLDefaultPath) && this.config.menu) {
      const filePathString = path.join(
        path.basename(this.igDataPath),
        'input',
        'includes',
        'menu.xml'
      );

      let preferredFileMessage =
        `Since a ${filePathString} file was found, the "menu" property in the ${this.configName} ` +
        `will be ignored and a menu.xml file will not be generated. Remove the ${filePathString} ` +
        `file to use the "menu" property in ${this.configName} to generate a menu.xml file instead.`;
      if (this.shouldCopyFiles) {
        preferredFileMessage =
          `Since the "menu" property is present in the ${this.configName}, a menu.xml file will be generated and ` +
          `the ${filePathString} file will be ignored. Remove the "menu" property in ${this.configName} ` +
          `to use the ${filePathString} file instead.`;
      }
      logger.warn(
        `Found both a "menu" property in ${this.configName} and a menu.xml file at ${filePathString}. ` +
          `${preferredFileMessage}`,
        {
          file: menuXMLDefaultPath
        }
      );

      if (!this.shouldCopyFiles) {
        return;
      }
    }

    // Always use config menu if defined
    if (this.config.menu) {
      let menu = `<ul xmlns="http://www.w3.org/1999/xhtml" class="nav navbar-nav">${EOL}`;
      this.config.menu.forEach(item => {
        menu += this.buildMenuItem(item, 2);
      });
      menu += '</ul>';

      const filePathString = path.join(path.basename(this.igDataPath), 'input', 'includes');
      const warning = warningBlock(
        `<!-- ${path.parse(menuXMLOutputPath).base} {% comment %}`,
        '{% endcomment %} -->',
        [
          `To change the contents of this file, edit the "menu" attribute in the tank ${this.configName} file`,
          `or provide your own menu.xml in the ${filePathString} folder`
        ]
      );
      outputFileSync(menuXMLOutputPath, `${warning}${menu}`, 'utf8');
      this.updateOutputLog(menuXMLOutputPath, [this.configPath], 'generated');
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
        if (item.isExternal) menuItem += ' <img src="external.png" style="text-align: baseline"/>';
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
   * Adds user provided ignoreWarnings.txt file if it exists; otherwise the static one SUSHI provides will be used.
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  public addIgnoreWarningsFile(igPath: string): void {
    // Only copy ignoreWarnings.txt for legacy configurations
    if (!this.isIgPubContext) {
      const outputPath = path.join(igPath, 'input', 'ignoreWarnings.txt');
      const ignorePath = path.join(this.igDataPath, 'input', 'ignoreWarnings.txt');
      if (existsSync(ignorePath)) {
        this.copyAsIs(ignorePath, outputPath);
      } else {
        const ignoreWarningsContents = `== Suppressed Messages ==

        # ********************************************************************************************************************************
        # *                               WARNING: DO NOT EDIT THIS FILE                                                                 *
        # *                                                                                                                              *
        # * This file is generated by SUSHI. Any edits you make to this file will be overwritten.                                        *
        # *                                                                                                                              *
        # * Authors should create their own ignoreWarnings.txt file at ig-data/input/ignoreWarnings.txt.                                 *
        # * If that file exists, SUSHI will use it instead of generating this one.                                                       *
        # * See: https://confluence.hl7.org/pages/viewpage.action?pageId=66938614#ImplementationGuideParameters-ManagingWarningsandHints *
        # ********************************************************************************************************************************`;
        outputFileSync(outputPath, ignoreWarningsContents);
        this.updateOutputLog(outputPath, [], 'generated');
      }
    }
  }

  /**
   * Add each of the resources from the package to the ImplementationGuide JSON file.
   * Configuration may specify resources to omit.
   *
   * This function has similar operation to addPredefinedResources, and both should be
   * analyzed when making changes to either.
   */
  private addResources(): void {
    const resources: (StructureDefinition | ValueSet | CodeSystem)[] = [
      ...sortBy(this.pkg.profiles, sd => sd.name),
      ...sortBy(this.pkg.extensions, sd => sd.name),
      ...sortBy(this.pkg.valueSets, valueSet => valueSet.name),
      ...sortBy(this.pkg.codeSystems, codeSystem => codeSystem.name)
    ];
    resources.forEach(r => {
      const referenceKey = `${r.resourceType}/${r.id}`;
      const newResource: ImplementationGuideDefinitionResource = {
        reference: { reference: referenceKey }
      };
      const configResource = (this.config.resources ?? []).find(
        resource => resource.reference?.reference == referenceKey
      );

      if (configResource?.omit !== true) {
        newResource.name = configResource?.name ?? r.title ?? r.name ?? r.id;
        newResource.description = configResource?.description ?? r.description;
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
        } else {
          newResource.exampleBoolean = false;
        }
        this.ig.definition.resource.push(newResource);
      }
    });
    const instances = sortBy(
      this.pkg.instances,
      instance => instance.id ?? instance._instanceMeta.name
    );
    instances
      .filter(instance => instance._instanceMeta.usage !== 'Inline')
      .forEach(instance => {
        const referenceKey = `${instance.resourceType}/${
          instance.id ?? instance._instanceMeta.name
        }`;
        const newResource: ImplementationGuideDefinitionResource = {
          reference: { reference: referenceKey }
        };
        const configResource = (this.config.resources ?? []).find(
          resource => resource.reference?.reference == referenceKey
        );

        if (configResource?.omit !== true) {
          newResource.name =
            configResource?.name ?? instance._instanceMeta.title ?? instance._instanceMeta.name;
          newResource.description =
            configResource?.description ?? instance._instanceMeta.description;
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
          } else {
            if (instance._instanceMeta.usage === 'Example') {
              const exampleUrl = instance.meta?.profile?.find(url =>
                this.pkg.fish(url, Type.Profile)
              );
              if (exampleUrl) {
                newResource.exampleCanonical = exampleUrl;
              } else {
                newResource.exampleBoolean = true;
              }
            } else {
              newResource.exampleBoolean = false;
            }
          }
          this.ig.definition.resource.push(newResource);
        }
      });
  }

  /**
   * Adds any user provided resource files
   * This includes definitions in:
   * capabilities, extensions, models, operations, profiles, resources, vocabulary, examples
   * Based on: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input
   *
   * This function has similar operation to addResources, and both should be
   * analyzed when making changes to either.
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  private addPredefinedResources(igPath: string): void {
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
    for (const pathEnd of pathEnds) {
      const dirPath = path.join(this.igDataPath, 'input', pathEnd);
      if (existsSync(dirPath)) {
        const files = readdirSync(dirPath);
        for (const file of files) {
          const resourceJSON: InstanceDefinition = this.fhirDefs.getPredefinedResource(file);
          if (resourceJSON) {
            if (resourceJSON.resourceType == null || resourceJSON.id == null) {
              logger.error(
                `Resource at ${path.join(dirPath, file)} must define resourceType and id.`
              );
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

            if (configResource?.omit !== true) {
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
              newResource.description =
                configResource?.description ??
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
              if (pathEnd === 'examples') {
                newResource.name = configResource?.name ?? existingName ?? resourceJSON.id;
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
                  existingResource?.name ??
                  title ??
                  name ??
                  resourceJSON.id;
              }

              if (existingIndex >= 0) {
                this.ig.definition.resource[existingIndex] = newResource;
              } else {
                this.ig.definition.resource.push(newResource);
              }

              if (this.shouldCopyFiles) {
                const inputPath = path.join(dirPath, file);
                const outputFileName = `${resourceJSON.resourceType}-${
                  resourceJSON.id
                }${path.extname(file)}`;
                const outputPath = path.join(igPath, 'input', pathEnd, outputFileName);
                this.copyAsIs(inputPath, outputPath);
              }
            }
          }
        }
      }
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
        this.ig.definition.resource.push(resource);
      }
    }
  }

  /**
   * Adds or updates a group in the implementation guide.
   *
   * @param {string} name - name of the group, used as unique identifier
   * @param {string} description - optional description of the group
   */
  private addGroup(name: string, description?: string): void {
    if (!this.ig.definition.grouping) {
      this.ig.definition.grouping = [];
    }
    const existingGroup = this.ig.definition.grouping.find(group => group.name === name);
    if (existingGroup) {
      if (description) {
        existingGroup.description = description;
      }
    } else {
      this.ig.definition.grouping.push({
        id: name,
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
      this.addGroup(group.name, group.description);
      for (const resourceKey of group.resources) {
        const existingResource = this.ig.definition.resource.find(
          resource => resource.reference?.reference === resourceKey
        );
        if (!existingResource) {
          logger.error(`Group ${group.name} configured with nonexistent resource ${resourceKey}`);
        } else {
          if (existingResource.groupingId) {
            if (existingResource.groupingId === group.name) {
              logger.warn(
                `Resource ${resourceKey} is listed as a member of group ${group.name}, and does not need a groupingId.`
              );
            } else {
              logger.error(
                `Resource ${resourceKey} configured with groupingId ${existingResource.groupingId}, but listed as member of group ${group.name}.`
              );
            }
          }
          existingResource.groupingId = group.name;
        }
      }
    }
  }

  /**
   * Writes the in-memory ImplementationGuide JSON to the IG output folder.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  addImplementationGuide(igPath: string): void {
    const igJSONFolder = this.isIgPubContext ? path.join('fsh-generated', 'resources') : 'input';
    const igJsonPath = path.join(igPath, igJSONFolder, `ImplementationGuide-${this.ig.id}.json`);
    outputJSONSync(igJsonPath, this.ig, { spaces: 2 });
    this.updateOutputLog(
      igJsonPath,
      [this.configPath, '{all input resources and pages}'],
      'generated'
    );
    logger.info(`Generated ImplementationGuide-${this.ig.id}.json`);
  }

  /**
   * Creates an ig.ini file based on the "template" in sushi-config.yaml and exports it to the IG folder.
   * If the user specified an igi.ini file in the ig-data folder, and no "template" in sushi-config.yaml is specified,
   * the file from ig-data is used instead.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  addIgIni(igPath: string): void {
    const inputIniPath = path.join(this.igDataPath, 'ig.ini');
    if (this.config.template != null) {
      if (existsSync(inputIniPath)) {
        const filePathString = path.join(path.basename(this.igDataPath), 'ig.ini');
        let message = `Found both a "template" property in ${this.configName} and an ig.ini file at ${filePathString}. `;
        if (this.shouldCopyFiles) {
          message +=
            `Since the "template" property is present in the ${this.configName}, an ig.ini file will be generated and ` +
            `the ${filePathString} file will be ignored. NOTE: Support for the "template" property in ${this.configName} will ` +
            `be removed in a future version of SUSHI. Please remove the "template" property in ${this.configName} and ` +
            'manage the ig.ini file directly.';
          logger.warn(message, { file: inputIniPath });
        } else {
          message +=
            `The "template" property in ${this.configName} has been deprecated and will be ignored. The existing ` +
            `${filePathString} file will be used instead.  To resolve this error, remove the "template" property in ` +
            `${this.configName} and manage the ig.ini file directly.`;
          logger.error(message, { file: inputIniPath });
        }
      } else {
        let message =
          `The "template" property in ${this.configName} has been deprecated. Please remove the "template" ` +
          `property in ${this.configName} and manage the ig.ini file directly.`;
        if (this.shouldCopyFiles) {
          message +=
            ` Support for the "template" property in ${this.configName} will be removed in a future ` +
            'version of SUSHI.';
          logger.warn(message);
        } else {
          message += ` To resolve this error, create an ig.ini file in your project folder with the following contents:\n\n${this.generateIgIniString(
            false
          )}`;
          logger.error(message);
        }
      }

      // Don't ever generate ig.ini in new IG Publisher project structure
      if (!this.shouldCopyFiles) {
        return;
      }

      this.generateIgIni(igPath);
    } else if (existsSync(inputIniPath)) {
      this.processIgIni(igPath, inputIniPath);
    } else {
      // do nothing -- no template in config, no ig.ini in ig-data
    }
  }

  /**
   * Generates the contents of an ig.ini file using the information in the configuration.
   *
   * @returns {string} contents of ig.ini file
   */
  generateIgIniString(includeWarning = true): string {
    // Create an ig.ini object from the configuration
    const iniObj: any = {};
    const igFolder = this.isIgPubContext ? 'fsh-generated/resources' : 'input';
    iniObj.ig = `${igFolder}/ImplementationGuide-${this.config.id}.json`;
    iniObj.template = this.config.template;
    let outputIniContents = ini.encode(iniObj, { section: 'IG', whitespace: true });
    if (includeWarning) {
      const comment = [
        `This ig.ini was generated using the template property in ${this.configName}. To provide your own`,
        `ig.ini, create an ig.ini file in the ${path.basename(
          this.igDataPath
        )} folder with required properties: ig, template.`,
        'See: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root'
      ];
      const iniWarning = [...warningTextArray('; ', comment), ''].join(EOL);
      outputIniContents = outputIniContents.replace('\n', `\n${iniWarning}`);
    }

    // The encoder escapes '#' but FHIR doesn't like that, so if `#` is escaped in the template, then unescape it.
    outputIniContents = outputIniContents.replace(/^template\s*=\s*.*?(\\#.+)?$/m, ($0, $1) =>
      $1 ? $0.replace($1, $1.slice(1)) : $0
    );

    return outputIniContents;
  }

  /**
   * Generates an ig.ini file using the information in the configuration.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  generateIgIni(igPath: string): void {
    const outputPath = path.join(igPath, 'ig.ini');
    outputFileSync(outputPath, this.generateIgIniString());
    this.updateOutputLog(outputPath, [this.configPath], 'generated');
    logger.info('Generated ig.ini.');
  }

  /**
   * Process an existing ig.ini. The file will always be copied as-is.
   * When one of the required properties is missing, an error is logged but the file is copied as-is.
   *
   * @param igPath {string} - the path where the IG is exported to
   * @param inputIniPath {string} - the path to the input ig.ini file
   */
  processIgIni(igPath: string, inputIniPath: string): void {
    let inputIniContents = readFileSync(inputIniPath, 'utf8');
    // FHIR allows templates to have versions identified using #.  E.g.,
    //   template = hl7.fhir.template#0.1.0
    // The ini library, however, treats # as a comment unless it is escaped.  So if it exists, we need to escape it.
    inputIniContents = inputIniContents.replace(/^\s*template\s*=\s*[^#]*(#.+)?$/m, ($0, $1) =>
      $1 ? $0.replace($1, `\\${$1}`) : $0
    );
    const inputIni = ini.parse(inputIniContents);
    if (Object.keys(inputIni).length > 1 || inputIni.IG == null) {
      logger.error('igi.ini file must contain an [IG] section with no other sections', {
        file: inputIniPath
      });
    }
    const filePathString = path.join(path.basename(this.igDataPath), 'ig.ini');
    if (inputIni.IG) {
      if (inputIni.IG.ig == null) {
        const igValue = `input/ImplementationGuide-${this.config.id}.json`;
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
          `Your ${filePathString} file contains the following deprecated properties: ${propList}. ` +
            'These are no longer supported in ig.ini and should be removed.  See the following link for details: ' +
            'https://github.com/HL7/ig-template-base/releases/tag/0.0.2',
          {
            file: inputIniPath
          }
        );
      }
    }

    // Copy the ig.ini as-is with an embedded comment
    let outputIniContents = inputIniContents;
    // Now we need to do the reverse of what we did before.  If `#` is escaped, then unescape it.
    outputIniContents = outputIniContents.replace(/^template\s*=\s*.*?(\\#.+)?$/m, ($0, $1) =>
      $1 ? $0.replace($1, $1.slice(1)) : $0
    );
    const comment = [
      'To change the contents of this file, edit the original source file at:',
      `${filePathString}`
    ];
    const iniWarning = [...warningTextArray('; ', comment), ''].join(EOL);
    outputIniContents = outputIniContents.replace('\n', `\n${iniWarning}`);

    // Finally, write it to disk
    const outputPath = path.join(igPath, 'ig.ini');
    if (this.shouldCopyFiles) {
      outputFileSync(outputPath, outputIniContents);
      this.updateOutputLogForCopiedPath(outputPath, inputIniPath);
      logger.info('Copied ig.ini.');
    }
  }

  /**
   * Adds the package-list.json file to the IG. Generated based on the Configuration history
   * field, or the package-list.json found at ig-data/package-list.json.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  addPackageList(igPath: string): void {
    const packageListPath = path.join(this.igDataPath, 'package-list.json');
    const isIgDataPackageList = existsSync(packageListPath);
    const filePathString = path.join(path.basename(this.igDataPath), 'package-list.json');

    if (this.config.history) {
      if (this.isIgPubContext) {
        logger.error(
          'Detected "history" property in configuration. The use of "history" is deprecated. Please remove the property and provide a package-list.json directly. ' +
            'The package-list.json corresponding to the "history" property in the configuration is:\n\n' +
            JSON.stringify(this.config.history, null, 2) +
            '\n'
        );
        return;
      }
      logger.warn(
        'Use of "history" property in configuration is deprecated and will be removed in a future version. Please remove the property and provide a package-list.json directly.'
      );
      const outputPath = path.join(igPath, 'package-list.json');
      outputJSONSync(outputPath, this.config.history, { spaces: 2 });
      logger.info('Generated package-list.json');
      this.updateOutputLog(outputPath, [this.configPath], 'generated');
      if (isIgDataPackageList) {
        logger.warn(
          `Found both a "history" property in ${this.configName} and a package-list.json file at ${filePathString}. ` +
            `Since the "history" property is present in the ${this.configName}, a package-list.json file will be generated and ` +
            `the ${filePathString} file will be ignored. Remove the "history" property in ${this.configName} ` +
            `to use the ${filePathString} file instead.`,
          {
            file: packageListPath
          }
        );
      }
    } else if (isIgDataPackageList && this.shouldCopyFiles) {
      this.copyAsIs(packageListPath, path.join(igPath, 'package-list.json'));
      logger.info(`Copied ${filePathString}.`);
    }
  }

  /**
   * Creates and writes the SUSHI-GENERATED-FILES.md file. This file is intended to help users understand what
   * files are created by SUSHI and how they are created.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addOutputLog(igPath: string): void {
    // If we are in the new context, all output goes into fsh-generated, so no point having SUSHI-GENERATED-FILES
    if (this.isIgPubContext) {
      return;
    }
    const intro = [
      '# SUSHI-GENERATED FILES #',
      '',
      'The following table shows all IG config files that were generated or copied by SUSHI.  The first column',
      'represents the SUSHI-generated file. Authors should NOT edit SUSHI-generated files, else their edits will',
      'be overwritten the next time SUSHI is run. Where applicable, the last column shows the files that are used',
      'as input into the generated files. Authors should edit the input files in order to affect the SUSHI-generated',
      'files.',
      '',
      'NOTE: This file does not currently list the FHIR resources and examples generated from .fsh files. It only',
      `lists those files generated from project configs or the contents in the ${path.basename(
        this.igDataPath
      )} folder.`,
      '',
      ''
    ].join(EOL);

    let rows: string[][] = [];
    this.outputLog.forEach((details, outputPath) => {
      // Make output paths relative to output
      const output = path.relative(igPath, outputPath);
      // Make input paths relative to output (except { placeholder } inputs)
      const inputs = details.inputs
        .map(input => (/^\{.+\}$/.test(input) ? input : path.relative(igPath, input)))
        .sort()
        .join(', ');
      rows.push([output, details.action, inputs]);
    });

    rows = [
      ['SUSHI-GENERATED FILE', 'ACTION', 'INPUT FILE(S)'],
      ...orderBy(rows, ['1', '0'], ['desc', 'asc'])
    ];

    outputFileSync(path.join(igPath, 'SUSHI-GENERATED-FILES.md'), `${intro}${table(rows)}`, 'utf8');
  }

  /**
   * Recursively copies one path to another, logging the output of each file so it can be reported in the
   * SUSHI-GENERATED-FILES.md file.
   *
   * @param inputPath {string} - the input path to copy
   * @param outputPath {string} - the output path to copy to
   * @param filter {(string) => boolean} - a filter indicating the files to copy
   */
  private copyAsIs(inputPath: string, outputPath: string, filter?: (src: string) => boolean): void {
    if (!existsSync(inputPath) || junk.is(path.basename(inputPath))) {
      return;
    }

    // Don't copy to the same directory it came from
    const fullInputPath = path.resolve(inputPath);
    const fullOutputPath = path.resolve(outputPath);
    if (fullInputPath === fullOutputPath) return;

    copySync(inputPath, outputPath, { filter });
    this.updateOutputLogForCopiedPath(outputPath, inputPath, filter);
  }

  /**
   * Recursively copies input to an output location, adding a warning to the top of the each supported
   * file indicating that it is a generated file and should not be edited directly. Only .md and .xml
   * files will have the warning added.  All other files are copied as-is. In addition, this function
   * will log the output file so it can be reported in the SUSHI-GENERATED-FILES.md file.
   *
   * @param inputPath {string} - the input path to copy
   * @param outputPath {string} - the output path to copy to
   */
  private copyWithWarningText(
    inputPath: string,
    outputPath: string,
    filter?: (src: string) => boolean
  ): void {
    if (!existsSync(inputPath)) {
      return;
    }

    if (statSync(inputPath).isDirectory()) {
      readdirSync(inputPath).forEach(child => {
        this.copyWithWarningText(path.join(inputPath, child), path.join(outputPath, child), filter);
      });
      return;
    }

    // Filtered out, don't copy
    if (filter && !filter(inputPath)) {
      return;
    }

    // If it's not xml or md, just copy it as is and we're done.
    if (!inputPath.endsWith('.md') && !inputPath.endsWith('.xml')) {
      this.copyAsIs(inputPath, outputPath);
      return;
    }

    // Otherwise, it's .md or .xml
    const extra = [
      'To change the contents of this file, edit the original source file at:',
      inputPath.slice(
        inputPath.indexOf(`${path.sep}${path.basename(this.igDataPath)}${path.sep}`) + 1
      )
    ];
    // .xml files can't have bare jekyll comments at the start of the file, as they fail XML parsing,
    // so we must surround the warning w/ XML comments.  To avoid the final HTML having just an empty
    // XML comment tag, we add in the file name -- which is likely useful info in the source anyway;
    // and for consistency, we do it for both .xml and .md
    const warning = warningBlock(
      `<!-- ${path.parse(outputPath).base} {% comment %}`,
      '{% endcomment %} -->',
      extra,
      false
    );
    const content = readFileSync(inputPath, 'utf8');
    outputFileSync(outputPath, `${warning}${content}`, 'utf8');
    this.updateOutputLogForCopiedPath(outputPath, inputPath);
  }

  /**
   * Updates the output log with the files that were copied from input to output. For files that come
   * directly from SUSHI (e.g., _updatePublisher.sh), don't log the input path.  Just mark it as a
   * generated file.
   *
   * @param outputPath - the output path to report on in the log
   * @param inputPath - the input path that was copied to the output
   * @param filter {(string) => boolean} - a filter indicating the files to copy
   */
  private updateOutputLogForCopiedPath(
    outputPath: string,
    inputPath: string,
    filter: (src: string) => boolean = () => true
  ): void {
    if (existsSync(inputPath) && statSync(inputPath).isDirectory()) {
      readdirSync(inputPath)
        .filter(filter)
        .forEach(child => {
          this.updateOutputLogForCopiedPath(
            path.join(outputPath, child),
            path.join(inputPath, child)
          );
        });
      return;
    }
    // If the input path is actually from our SUSHI source code (e.g., a static file),
    // change the action to generated and suppress the input path
    if (!filter(inputPath)) {
      // Filtered out.  Do nothing.
    } else if (inputPath.startsWith(__dirname)) {
      this.updateOutputLog(outputPath, [], 'generated');
    } else {
      this.updateOutputLog(outputPath, [inputPath], 'copied');
    }
  }

  /**
   * Updates the output log for a specific output file, indicating the file (or files) that were
   * either copied or used to generate the file. If a log already exists for the output file,
   * it will update the log.
   *
   * @param output {string} - the output file to log
   * @param inputs {List<string>} - the list of inputs used to create the file
   * @param action {'copied'|'generated'} - how SUSHI created the file
   */
  private updateOutputLog(output: string, inputs: string[], action?: OutputLogAction): void {
    if (this.outputLog.has(output)) {
      const details = this.outputLog.get(output);
      inputs.forEach(input => {
        // Always use the msot recent action provided
        if (action) {
          details.action = action;
        }
        // If copied, replace the old inputs with the new ones
        if (action === 'copied') {
          details.inputs = inputs.slice();
        } else if (details.inputs.indexOf(input) === -1) {
          details.inputs.push(input);
        }
      });
    } else {
      this.outputLog.set(output, { action, inputs });
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

type OutputLogAction = 'copied' | 'generated';
type outputLogDetails = {
  action: OutputLogAction;
  inputs: string[];
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
