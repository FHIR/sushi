import path from 'path';
import ini from 'ini';
import sanitize from 'sanitize-filename';
import { EOL } from 'os';
import { sortBy, words, pad, padEnd, repeat, cloneDeep, escapeRegExp } from 'lodash';
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
  CodeSystemConcept,
  InstanceDefinition,
  ImplementationGuideDefinitionPage,
  ImplementationGuideDependsOn
} from '../fhirtypes';
import { CONFORMANCE_AND_TERMINOLOGY_RESOURCES } from '../fhirtypes/common';
import { ConfigurationMenuItem, ConfigurationResource } from '../fshtypes';
import { logger, Type, getFilesRecursive, stringOrElse, getFHIRVersionInfo } from '../utils';
import { FHIRDefinitions } from '../fhirdefs';
import { Configuration } from '../fshtypes';
import { parseCodeLexeme } from '../import';

function isR4(fhirVersion: string[]) {
  return fhirVersion.some(v => /^R4B?$/.test(getFHIRVersionInfo(v).name));
}

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
    this.addLinkReferences(outPath);
    if (!this.config.pages?.length) {
      this.addOtherPageContent();
    } else {
      this.addConfiguredPageContent();
    }
    this.addMenuXML(outPath);
    this.checkIgIni();
    this.checkPackageList();
    if (!isR4(this.config.fhirVersion)) {
      this.updateForR5();
    } else {
      this.translateR5PropertiesToR4();
    }
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
    this.config.parameters?.forEach(p => {
      const parsedCode = parseCodeLexeme(p.code as string); // parameter.code will always be a string coming from the config
      if (parsedCode.system) {
        // If a system and code is provided, normalize the system
        p.code = `${this.normalizeResourceReference(parsedCode.system, false)}#${parsedCode.code}`;
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

    // By default, dependsOn.reason should not be supported because it is an R5 element
    delete dependsOn.reason;

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

  addLinkReferences(igPath: string): void {
    // no need to make this file if there are no resources
    if (!this.ig.definition?.resource.length) {
      return;
    }
    const linkReferencesDir = path.join(igPath, 'fsh-generated', 'includes');
    const linkReferencesExportPath = path.join(linkReferencesDir, 'fsh-link-references.md');
    ensureDirSync(linkReferencesDir);
    const content = this.ig.definition.resource.map(igResource => {
      // FSH resources and predefined resources will have a _linkRef
      // a configured resource may lack a name
      // in that case, try to build a useful name from the reference
      const linkName =
        igResource._linkRef ??
        igResource.name ??
        igResource.reference?.reference?.replace(/^[^\/]*\//, '');
      // delete the _linkRef now that we've used it
      delete igResource._linkRef;
      return `[${linkName}]: ${igResource.reference?.reference?.replace('/', '-')}.html`;
    });
    outputFileSync(linkReferencesExportPath, content.join('\n'));
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

    // If user provided file and config, log a warning but prefer the file.
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

    // Use config menu if defined and no file is provided.
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
      menuItem += this.encodeMenuName(item.name);
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
    let subMenu = `${prefixSpaces}<a data-toggle="dropdown" href="#" class="dropdown-toggle">${this.encodeMenuName(
      item.name
    )}${EOL}`;
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

  private encodeMenuName(name: string): string {
    let escapedName = name;
    if (/&quot;|&apos;|&lt;|&gt;|&amp;/g.test(name)) {
      logger.warn(
        'SUSHI now supports automatically escaping characters in XML. You can safely replace the ' +
          `escaped character with the unescaped character in the following menu configuration item: ${name}. ` +
          'SUSHI will escape it when generating the menu.xml file.'
      );
    }
    escapedName = escapedName.replace(/"/g, '&quot;');
    escapedName = escapedName.replace(/'/g, '&apos;');
    escapedName = escapedName.replace(/</g, '&lt;');
    escapedName = escapedName.replace(/>/g, '&gt;');
    // Replace & with &amp; but we don't want to replace any previously escaped characters, which will start with &.
    escapedName = escapedName.replace(/&(?!quot;|apos;|lt;|gt;|amp;)/g, '&amp;');
    return escapedName;
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
      .filter(
        instance =>
          // Filter out instances that have a type that has the same type as a custom resource defined in the package
          !this.pkg.resources.some(r => r.type === instance.resourceType)
      )
      .forEach(instance => {
        // Logical instances should use Binary type. See: https://fshschool.org/docs/sushi/tips/#instances-of-logical-models
        const referenceKey = `${
          instance._instanceMeta.sdKind === 'logical' ? 'Binary' : instance.resourceType
        }/${instance.id ?? instance._instanceMeta.name}`;
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
        configResource?.name ??
        pkgResource._instanceMeta.title ??
        stringOrElse(pkgResource.title) ??
        pkgResource._instanceMeta.name;
      newResource.description =
        configResource?.description ??
        pkgResource._instanceMeta.description ??
        stringOrElse(pkgResource.description);
      newResource._linkRef = pkgResource.id;
    } else {
      newResource.name =
        configResource?.name ?? pkgResource.title ?? pkgResource.name ?? pkgResource.id;
      newResource.description = configResource?.description ?? pkgResource.description;
      newResource._linkRef = pkgResource.name;
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
      // so here's where we set exampleCanonical
      // but we need to be able to set it without there being anything in meta.profile
      const metaProfileUrls = pkgResource.meta?.profile ?? [];
      const exampleUrl = [...metaProfileUrls, pkgResource._instanceMeta.instanceOfUrl ?? ''].find(
        url => {
          const [baseUrl, version] = url.split('|', 2);
          const availableProfileOrLogical = this.pkg.fish(baseUrl, Type.Profile, Type.Logical);
          return (
            availableProfileOrLogical != null &&
            (version == null || version === availableProfileOrLogical.version)
          );
        }
      );
      if (exampleUrl) {
        newResource.exampleCanonical = exampleUrl.split('|', 1)[0];
      } else {
        newResource.exampleBoolean = true;
      }
    } else {
      newResource.exampleBoolean = false;
    }
    if (configResource?.extension?.length) {
      newResource.extension = configResource.extension;
    }
    if (
      pkgResource instanceof InstanceDefinition &&
      pkgResource._instanceMeta.sdKind === 'logical' &&
      !configResource?.extension?.some(
        ext =>
          ext.url === 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format'
      )
    ) {
      // Logical instances should add a special extension. See: https://fshschool.org/docs/sushi/tips/#instances-of-logical-models
      newResource.extension = newResource.extension ?? [];
      newResource.extension.push({
        url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
        valueCode: 'application/fhir+json'
      });
    }
    this.ig.definition.resource.push(newResource);
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
              // On some resources (Patient for example) title, name, and description can be objects, avoid using them when this is true
              newResource.description =
                configResource?.description ??
                metaExtensionDescription ??
                existingDescription ??
                stringOrElse(resourceJSON.description);
              if (configResource?.fhirVersion) {
                newResource.fhirVersion = configResource.fhirVersion;
              }
              if (configResource?.groupingId) {
                newResource.groupingId = configResource.groupingId;
                this.addGroup(newResource.groupingId);
              }
              if (path.basename(dirPath) === 'examples') {
                newResource.name =
                  configResource?.name ??
                  metaExtensionName ??
                  existingName ??
                  stringOrElse(resourceJSON.title) ??
                  stringOrElse(resourceJSON.name) ??
                  resourceJSON.id;
                newResource._linkRef = resourceJSON.id;
                // set exampleCanonical or exampleBoolean, preferring configured values
                if (configResource?.exampleCanonical) {
                  newResource.exampleCanonical = configResource.exampleCanonical;
                } else if (typeof configResource?.exampleBoolean === 'boolean') {
                  newResource.exampleBoolean = configResource.exampleBoolean;
                } else {
                  const exampleUrl = resourceJSON.meta?.profile?.find(url => {
                    const [baseUrl, version] = url.split('|', 2);
                    const availableProfile =
                      this.pkg.fish(baseUrl, Type.Profile) ??
                      this.fhirDefs.fishForFHIR(baseUrl, Type.Profile);
                    return (
                      availableProfile != null &&
                      (version == null || version === availableProfile.version)
                    );
                  });
                  if (exampleUrl) {
                    newResource.exampleCanonical = exampleUrl.split('|', 1)[0];
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
                newResource.name =
                  configResource?.name ??
                  metaExtensionName ??
                  existingResource?.name ??
                  stringOrElse(resourceJSON.title) ??
                  stringOrElse(resourceJSON.name) ??
                  resourceJSON.id;
                newResource._linkRef = stringOrElse(resourceJSON.name) ?? resourceJSON.id;
              }
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
        this.ig.definition.resource.push(resource);
      }
    }
  }

  /**
   * Sort the IG resources based on the configuration.
   * If all resources are listed in the configuration "resources" section, use that order.
   * Otherwise, if all resources are listed in the configuration "groups" section, use that order.
   * Otherwise, use the name attribute that was created when the resource was added to the IG.
   * A configured resource may lack a name, so use reference.reference as backup.
   */
  private sortResources(): void {
    if (!(this.trySortResourcesByConfig() || this.trySortResourcesByGroup())) {
      this.ig.definition.resource = sortBy(this.ig.definition.resource, resource => {
        return (resource.name ?? resource.reference?.reference)?.toLocaleUpperCase();
      });
    }
  }

  /**
   * Try to sort resources based on the order in the resource configuration.
   * If this sort is possible, perform it, and return true.
   * Otherwise, return false.
   */
  private trySortResourcesByConfig(): boolean {
    if (this.config.resources == null) {
      return false;
    }
    const resourceIndices = new Map<string, number>();
    const allInConfig = this.ig.definition.resource.every(igResource => {
      if (igResource.reference?.reference == null) {
        return false;
      }
      const configIndex = this.config.resources.findIndex(
        configResource => configResource.reference?.reference === igResource.reference.reference
      );
      if (configIndex >= 0) {
        resourceIndices.set(igResource.reference.reference, configIndex);
        return true;
      } else {
        return false;
      }
    });
    if (allInConfig) {
      this.ig.definition.resource = sortBy(this.ig.definition.resource, igResource =>
        resourceIndices.get(igResource.reference.reference)
      );
    }
    return allInConfig;
  }

  /**
   * Try to sort resources based on the order in the group configuration.
   * If this sort is possible, perform it, and return true.
   * Otherwise, return false.
   */
  private trySortResourcesByGroup(): boolean {
    if (this.config.groups == null) {
      return false;
    }
    const resourceIndices = new Map<string, { groupIndex: number; resourceIndex: number }>();
    const allInGroups = this.ig.definition.resource.every(igResource => {
      if (igResource.reference?.reference == null) {
        return false;
      }
      let resourceIndex = -1;
      const groupIndex = this.config.groups.findIndex(group => {
        resourceIndex = group.resources?.indexOf(igResource.reference.reference) ?? -1;
        if (resourceIndex >= 0) {
          return true;
        } else {
          return false;
        }
      });
      if (groupIndex >= 0) {
        resourceIndices.set(igResource.reference.reference, { groupIndex, resourceIndex });
        return true;
      } else {
        return false;
      }
    });
    if (allInGroups) {
      this.ig.definition.resource = sortBy(
        this.ig.definition.resource,
        igResource => resourceIndices.get(igResource.reference.reference).groupIndex,
        igResource => resourceIndices.get(igResource.reference.reference).resourceIndex
      );
    }
    return allInGroups;
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
      const igValue = `fsh-generated/resources/ImplementationGuide-${this.config.id}.json`;
      if (inputIni.IG.ig == null) {
        inputIni.IG.ig = igValue;
        logger.error(
          'The ig.ini file must have an "ig" property pointing to the IG file. Please add the following line ' +
            `to ${filePathString}:\n'` +
            `ig = ${igValue}`,
          {
            file: inputIniPath
          }
        );
      } else if (
        !new RegExp(
          `(.*[/\\\\])?fsh-generated[/\\\\]resources[/\\\\]ImplementationGuide-${escapeRegExp(
            this.config.id
          )}\.json$`
        ).test(inputIni.IG.ig)
      ) {
        logger.warn(
          '\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! IMPORTANT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' +
            'Your ig.ini file does NOT point to the Implementation Guide resource that SUSHI generates. As a\n' +
            'result, the IG Publisher will IGNORE the SUSHI-generated ImplementationGuide resource. To fix this,\n' +
            'please do one of the following:\n' +
            `- Update your ig.ini file with \'ig = ${igValue}\' (recommended), or\n` +
            "- Update your sushi-config.yaml file with 'FSHOnly: true' to tell SUSHI NOT to generate the IG resource\n\n"
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

  // Supports necessary updates for R5 IGs.
  // SUSHI only supports R4 or later, and as of now, we will just target R5.
  updateForR5(): void {
    // Update IG.definition.resource
    this.ig.definition.resource.forEach(resource => {
      // Use IG.definition.resource.isExample
      if (resource.exampleBoolean || resource.exampleCanonical) {
        resource.isExample = true;
        if (resource.exampleCanonical) {
          resource.profile = [resource.exampleCanonical];
        }
        delete resource.exampleBoolean;
        delete resource.exampleCanonical;
      } else if (resource.exampleBoolean === false) {
        resource.isExample = false;
        delete resource.exampleBoolean;
      }

      // Assign IG.definition.resource.profile if provided
      const configEntry = this.config.resources?.find(
        r => r.reference?.reference === resource.reference?.reference
      );
      if (configEntry?.profile != null) {
        resource.profile = configEntry.profile;
      }
      // Assign IG.definition.resource.isExample if provided
      if (configEntry?.isExample != null) {
        resource.isExample = configEntry.isExample;
      }
    });

    // Update IG.definition.page.name
    this.ig.definition.page.name = this.ig.definition.page.nameUrl;
    delete this.ig.definition.page.nameUrl;
    this.ig.definition.page.page.forEach(page => {
      this.updatePageNameForR5(page, this.config.pages);
    });

    // Add new IG.definition.page.source[x] property
    // this.ig.definition.page is the toc.html page we create
    // All configured pages are at the next level, so start at that level
    this.ig.definition.page.page.forEach(page => {
      this.addPageSourceForR5(page, this.config.pages);
    });
    // Default IG.definition.page.source[x] on every page if not set
    this.defaultPageSourceUrlForR5(this.ig.definition.page);

    // Update IG.definition.parameter
    this.ig.definition.parameter.forEach(parameter => {
      const guideParameterCodes: string[] =
        this.fhirDefs
          .fishForFHIR('http://hl7.org/fhir/guide-parameter-code', Type.CodeSystem)
          ?.concept.map((concept: CodeSystemConcept) => concept.code) ?? [];

      const code = parameter.code as string;
      parameter.code = { code };
      const parsedCode = parseCodeLexeme(code);

      if (parsedCode.code && parsedCode.system) {
        // If we can parse the code and we have a system and a code provided, we should use that.
        parameter.code.code = parsedCode.code;
        parameter.code.system = parsedCode.system;
      } else if (guideParameterCodes.some(c => c === code)) {
        // Otherwise, only a code was provided, so we check if it is in the bound VS
        parameter.code.system = 'http://hl7.org/fhir/guide-parameter-code';
      } else {
        // If the code is not in the VS in the R5 IG resource, we default the system
        // based on https://chat.fhir.org/#narrow/stream/179252-IG-creation/topic/Unknown.20FHIRVersion.20code.20'5.2E0.2E0-ballot'/near/298697304
        parameter.code.system = 'http://hl7.org/fhir/tools/CodeSystem/ig-parameters';
      }
    });

    // Add new copyrightLabel property
    if (this.config.copyrightLabel) {
      this.ig.copyrightLabel = this.config.copyrightLabel;
    }

    // Add new versionAlgorithm property
    if (this.config.versionAlgorithmString) {
      this.ig.versionAlgorithmString = this.config.versionAlgorithmString;
    } else if (this.config.versionAlgorithmCoding) {
      this.ig.versionAlgorithmCoding = this.config.versionAlgorithmCoding;
    }

    // Add new dependsOn.reason property
    this.ig.dependsOn?.forEach(dependency => {
      const configDependency = this.config.dependencies?.find(
        d => d.packageId === dependency.packageId
      );
      if (configDependency.reason) {
        dependency.reason = configDependency.reason;
      }
    });
  }

  // If an R4 IG uses any new properties from R5, they should be included as extensions.
  // Converting between FHIR versions is documented here: http://hl7.org/fhir/2022Sep/versions.html#extensions
  // If an R4 IG uses any R5 properties that have an equivalent R4 property, use the R4 property.
  translateR5PropertiesToR4() {
    this.ig.definition.resource.forEach(resource => {
      // Assign IG.definition.resource.profile to exampleCanonical if it is not set, otherwise add an extension
      const configEntry = this.config.resources?.find(
        r => r.reference?.reference === resource.reference?.reference
      );
      if (resource.exampleCanonical == null && configEntry?.profile?.length) {
        resource.exampleCanonical = configEntry.profile[0];
        delete resource.exampleBoolean;
      }
      if (
        resource.exampleCanonical != null &&
        configEntry?.profile?.some(p => p !== resource.exampleCanonical)
      ) {
        resource.extension = (resource.extension ?? []).concat({
          url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.resource.profile',
          valueCanonical: configEntry.profile
        });
      }
      // Assign isExample to exampleBoolean if it is set and neither exampleCanonical or exampleBoolean are already set.
      if (configEntry?.isExample != null && resource.exampleCanonical == null) {
        resource.exampleBoolean = configEntry.isExample;
      }
    });

    // Add new IG.definition.page.source[x] property to an extension if it is provided. No need to set a default like R5 needs to.
    // this.ig.definition.page is the toc.html page we create
    // All configured pages are at the next level, so start at that level
    this.ig.definition.page.page.forEach(page => {
      this.addNameUrlAndPageSourceExtensionForR4(page, this.config.pages);
    });

    // Update IG.definition.parameter.code
    this.ig.definition.parameter.forEach(parameter => {
      const code = parameter.code as string;
      const parsedCode = parseCodeLexeme(code);

      // If the code is parsed, use just the code portion
      if (parsedCode.code) {
        parameter.code = parsedCode.code;
      } else {
        parameter.code = code;
      }

      // If the system is parsed, add an extension for the full Coding
      if (parsedCode.system) {
        parameter.extension = (parameter.extension ?? []).concat({
          url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.resource.parameter.code',
          valueCoding: {
            code: parsedCode.code,
            system: parsedCode.system
          }
        });
      }
    });

    // Add new copyrightLabel property to an extension if provided
    if (this.config.copyrightLabel) {
      this.ig.extension = (this.ig.extension ?? []).concat({
        url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.copyrightLabel',
        valueString: this.config.copyrightLabel
      });
    }

    // Add new versionAlgorithm property to an extension if provided
    if (this.config.versionAlgorithmString) {
      this.ig.extension = (this.ig.extension ?? []).concat({
        url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.versionAlgorithm',
        valueString: this.config.versionAlgorithmString
      });
    } else if (this.config.versionAlgorithmCoding) {
      this.ig.extension = (this.ig.extension ?? []).concat({
        url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.versionAlgorithm',
        valueCoding: this.config.versionAlgorithmCoding
      });
    }

    // Add new dependsOn.reason property
    this.ig.dependsOn?.forEach(dependency => {
      const configDependency = this.config.dependencies?.find(
        d => d.packageId === dependency.packageId
      );
      if (configDependency.reason) {
        dependency.extension = (dependency.extension ?? []).concat({
          url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.dependsOn.reason',
          valueMarkdown: configDependency.reason
        });
      }
    });
  }

  updatePageNameForR5(
    page: ImplementationGuideDefinitionPage,
    configPages: ImplementationGuideDefinitionPage[]
  ): void {
    const configPage = configPages?.find(
      p => (p.nameUrl || p.name).replace(/\.[^.]+$/, '') === page.nameUrl.replace(/\.[^.]+$/, '')
    );
    if (configPage && configPage.name) {
      page.name = configPage.name;
      // Regenerate the title based on the updated name
      page.title =
        configPage.title ?? titleCase(words(page.name.replace(/\.[^.]+$/, '')).join(' '));
      // The default of sourceUrl will be the old nameUrl (for now).
      // If sourceUrl is included in the configuration, this value will be
      // overwritten in addPageSourceForR5, which is called after this function in updateForR5.
      page.sourceUrl = page.nameUrl;
      delete page.nameUrl;
    } else if (page.nameUrl) {
      page.name = page.nameUrl;
      delete page.nameUrl;
    }
    if (page.page?.length) {
      for (const subPage of page?.page) {
        this.updatePageNameForR5(subPage, configPage?.page ?? []);
      }
    }
  }

  addPageSourceForR5(
    page: ImplementationGuideDefinitionPage,
    configPages: ImplementationGuideDefinitionPage[]
  ): void {
    const configPage = configPages?.find(
      p => (p.nameUrl || p.name).replace(/\.[^.]+$/, '') === page.name.replace(/\.[^.]+$/, '')
    );
    if (configPage) {
      if (configPage.sourceUrl) {
        page.sourceUrl = configPage.sourceUrl;
      } else if (configPage.sourceString) {
        page.sourceString = configPage.sourceString;
      } else if (configPage.sourceMarkdown) {
        page.sourceMarkdown = configPage.sourceMarkdown;
      }

      if (page.page?.length) {
        for (const subPage of page?.page) {
          this.addPageSourceForR5(subPage, configPage.page);
        }
      }
    }
  }

  defaultPageSourceUrlForR5(page: ImplementationGuideDefinitionPage): void {
    if (page.sourceUrl == null && page.sourceString == null && page.sourceMarkdown == null) {
      page.sourceUrl = page.name;
    }

    if (page.page?.length) {
      for (const subPage of page?.page) {
        this.defaultPageSourceUrlForR5(subPage);
      }
    }
  }

  // Add an extension for the R5 property IG.definition.page.source[x] if provided in configuration
  addNameUrlAndPageSourceExtensionForR4(
    page: ImplementationGuideDefinitionPage,
    configPages: ImplementationGuideDefinitionPage[]
  ): void {
    const sourceExtensionUrl =
      'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source';
    const nameExtensionUrl =
      'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.name';

    // Find the corresponding configuration page
    // Configuration might use name or nameUrl and will have a filetype at the end that we want to ignore
    const configPage = configPages?.find(
      p => (p.nameUrl || p.name).replace(/\.[^.]+$/, '') === page.nameUrl.replace(/\.[^.]+$/, '')
    );
    if (configPage) {
      // If nameUrl and name do not match, add the name value to an extension
      if (configPage.name && configPage.nameUrl !== configPage.name) {
        page.extension = (page.extension ?? []).concat({
          url: nameExtensionUrl,
          valueUrl: configPage.name
        });
      }

      if (configPage.sourceUrl) {
        // If nameUrl and sourceUrl do not match, add the sourceUrl value to an extension
        if (configPage.nameUrl !== configPage.sourceUrl) {
          page.extension = (page.extension ?? []).concat({
            url: sourceExtensionUrl,
            valueUrl: configPage.sourceUrl
          });
        }
      } else if (configPage.sourceString) {
        page.extension = (page.extension ?? []).concat({
          url: sourceExtensionUrl,
          valueString: configPage.sourceString
        });
      } else if (configPage.sourceMarkdown) {
        page.extension = (page.extension ?? []).concat({
          url: sourceExtensionUrl,
          valueMarkdown: configPage.sourceMarkdown
        });
      }

      if (page.page?.length) {
        for (const subPage of page?.page) {
          this.addNameUrlAndPageSourceExtensionForR4(subPage, configPage.page);
        }
      }
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
