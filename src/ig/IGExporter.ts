import path from 'path';
import ini from 'ini';
import { EOL } from 'os';
import { sortBy, words, pad, padEnd, repeat, orderBy } from 'lodash';
import { titleCase } from 'title-case';
import {
  statSync,
  ensureDirSync,
  copySync,
  outputJSONSync,
  outputFileSync,
  chmodSync,
  existsSync,
  readdirSync,
  readJSONSync,
  readFileSync
} from 'fs-extra';
import table from 'markdown-table';
import { Package } from '../export';
import {
  ContactDetail,
  ImplementationGuide,
  ImplementationGuideDefinitionResource,
  ImplementationGuideDefinitionPageGeneration,
  StructureDefinition,
  ValueSet,
  CodeSystem,
  InstanceDefinition
} from '../fhirtypes';
import { ConfigurationMenuItem } from '../fshtypes';
import { logger, Type } from '../utils';
import { FHIRDefinitions } from '../fhirdefs';

/**
 * The IG Exporter exports the FSH artifacts into a file structure supported by the IG Publisher.
 * This allows a FSH Tank to be built as a FHIR IG.  Currently, template-based IG publishing is
 * still new, so this functionality is subject to change.
 *
 * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/index.html}
 */
export class IGExporter {
  private ig: ImplementationGuide;
  private readonly packagePath: string;
  private readonly configPath: string;
  private readonly outputLog: Map<string, outputLogDetails>;
  constructor(
    private readonly pkg: Package,
    private readonly fhirDefs: FHIRDefinitions,
    private readonly igDataPath: string,
    private readonly isIgPubContext: boolean = false
  ) {
    this.packagePath = path.resolve(this.igDataPath, '..', 'package.json');
    this.configPath = path.resolve(this.igDataPath, '..', 'config.yaml');
    this.outputLog = new Map();
  }

  getOutputLogDetails(file: string) {
    return this.outputLog.get(file);
  }

  /**
   * Export the IG structure to the location specified by the outPath argument
   * @param outPath {string} - the path to export the IG file structure to
   *
   * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#directory-structure}
   */
  export(outPath: string) {
    ensureDirSync(outPath);
    this.initIG();
    this.addResources();
    this.addPredefinedResources(outPath);
    this.addStaticFiles(outPath);
    this.addIndex(outPath);
    this.addOtherPageContent(outPath);
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
   * Initializes the ImplementationGuide JSON w/ data from the package.json
   *
   * @see {@link https://confluence.hl7.org/pages/viewpage.action?pageId=35718629#NPMPackageSpecification-PackageManifestpropertiesforIGs}
   */
  private initIG(): void {
    const packageJSON = this.pkg.packageJSON;
    // TODO: Consider adding a generated file warning when the IG Publisher supports JSON5-style comments
    this.ig = {
      resourceType: 'ImplementationGuide',
      id: packageJSON.name,
      url: `${packageJSON.canonical}/ImplementationGuide/${packageJSON.name}`,
      version: packageJSON.version,
      // name must be alphanumeric (allowing underscore as well)
      name: (packageJSON.title ?? packageJSON.name).replace(/[^A-Za-z0-9_]/g, ''),
      title: packageJSON.title ?? packageJSON.name,
      status: 'active', // TODO: make user-configurable
      publisher: packageJSON.author,
      contact: packageJSON.maintainers?.map(m => {
        const contact: ContactDetail = {};
        if (m.name) {
          contact.name = m.name;
        }
        if (m.url) {
          contact.telecom = [
            {
              system: 'url',
              value: m.url
            }
          ];
        }
        if (m.email) {
          contact.telecom = contact.telecom ?? [];
          contact.telecom.push({
            system: 'email',
            value: m.email
          });
        }
        return contact;
      }),
      description: packageJSON.description,
      packageId: packageJSON.name,
      license: packageJSON.license,
      fhirVersion: ['4.0.1'],
      dependsOn: [],
      definition: {
        resource: [],
        page: {
          nameUrl: 'toc.html',
          title: 'Table of Contents',
          generation: 'html',
          page: [] // index.[md|html] is required and added later
        },
        // Parameters apparently required by IG Publisher (as of Jan 29, 2020)
        parameter: [
          {
            code: 'copyrightyear',
            value: '' // Gets set when ig.ini is processed
          },
          {
            code: 'releaselabel',
            value: '' // Gets set when ig.ini is processed
          },
          {
            code: 'show-inherited-invariants',
            value: 'false' // TODO: Make this configurable
          }
        ]
      }
    };

    // Add the path-history, if applicable (only applies to HL7 IGs)
    if (/^https?:\/\/hl7.org\//.test(this.pkg.packageJSON.canonical)) {
      this.ig.definition.parameter.push({
        code: 'path-history',
        value: `${this.pkg.packageJSON.canonical}/history.html`
      });
    }

    // Add the dependencies
    if (this.pkg.packageJSON.dependencies) {
      const igs = this.fhirDefs.allImplementationGuides();
      for (const depId of Object.keys(this.pkg.packageJSON.dependencies)) {
        if (depId === 'hl7.fhir.r4.core') {
          continue;
        }
        const depVersion = this.pkg.packageJSON.dependencies[depId];
        // find the matching IG by id (for "current"/"dev" version) or id and version (for specific version)
        const depIG = igs.find(
          ig =>
            ig.packageId === depId &&
            (ig.version === depVersion || 'current' === depVersion || 'dev' === depVersion)
        );
        if (depIG && depIG.url) {
          this.ig.dependsOn.push({
            uri: `${depIG.url}`,
            packageId: depId,
            // packageId should be alphanumeric or '.', id must be alphanumeric or '_' for IG Publisher, so replace '.' with '_'
            id: depId.replace(/\./g, '_'),
            version: depVersion
          });
        } else {
          logger.error(
            `Failed to add ${depId}:${depVersion} to ImplementationGuide instance.  Could not determine its canonical URL from the FHIR cache.`
          );
        }
      }
      if (this.ig.dependsOn.length === 0) {
        delete this.ig.dependsOn;
      }
    }
  }

  /**
   * Add the static files that (currently) do not change from IG to IG.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addStaticFiles(igPath: string): void {
    const inputPath = path.join(__dirname, 'files');
    this.copyAsIs(inputPath, igPath, src => {
      // If in an IG Publisher context, do not include any of the publisher scripts
      if (this.isIgPubContext) {
        if (path.parse(src).base.startsWith('_genonce.')) return false;
        if (path.parse(src).base.startsWith('_gencontinuous.')) return false;
        if (path.parse(src).base.startsWith('_updatePublisher.')) return false;
        return true;
      }
      // Filter out menu because handled separately
      if (path.parse(src).base.startsWith('menu.xml')) return false;
      return true;
    });

    // On Windows, the file permissions are not always preserved. This doesn't
    // cause a problem for the Windows user, but it may cause problems for
    // Mac and Linux users who use an NPM package published by a Windows user.
    // To work around this, we set the necessary permissions on executable
    // scripts after copying them to the IG path.
    try {
      if (!this.isIgPubContext) {
        chmodSync(path.join(igPath, '_genonce.sh'), 0o755);
        chmodSync(path.join(igPath, '_gencontinuous.sh'), 0o755);
        chmodSync(path.join(igPath, '_updatePublisher.sh'), 0o755);
      }
    } catch (e) {
      // We don't want to fail the whole export for this, but we should log it
      logger.warn(
        'Failed to set executable permissions on IG publisher scripts (_genonce.sh, ' +
          '_gencontinuous.sh, _updatePublisher.sh). You may need to set these permissions ' +
          'manually before they can be executed (e.g., chmod 755 _genonce.sh).'
      );
    }
  }

  /**
   * Add the index.md file.  If the user provided one in ig-data/input/pagecontent,
   * use that -- otherwise create one, setting its content to be the package
   * description.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addIndex(igPath: string): void {
    ensureDirSync(path.join(igPath, 'input', 'pagecontent'));

    // If the user provided an index.md file, use that
    const inputIndexMarkdownPath = path.join(this.igDataPath, 'input', 'pagecontent', 'index.md');
    const inputIndexXMLPath = path.join(this.igDataPath, 'input', 'pagecontent', 'index.xml');
    let generation: ImplementationGuideDefinitionPageGeneration = 'markdown';
    if (existsSync(inputIndexMarkdownPath)) {
      this.copyWithWarningText(
        inputIndexMarkdownPath,
        path.join(igPath, 'input', 'pagecontent', 'index.md')
      );
      logger.info('Copied ig-data/input/pagecontent/index.md');
    } else if (existsSync(inputIndexXMLPath)) {
      this.copyWithWarningText(
        inputIndexXMLPath,
        path.join(igPath, 'input', 'pagecontent', 'index.xml')
      );
      generation = 'html';
      logger.info('Copied ig-data/input/pagecontent/index.xml');
    } else {
      logger.info('Generated default index.md.');
      const warning = warningBlock('<!-- index.md {% comment %}', '{% endcomment %} -->', [
        'This index.md file was generated from the "description" in package.json. To provide',
        'your own index file, create an index.md or index.xml in the ig-data/input/pagecontent',
        'folder.',
        'See: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input'
      ]);
      const outputPath = path.join(igPath, 'input', 'pagecontent', 'index.md');
      outputFileSync(outputPath, `${warning}${this.pkg.packageJSON.description ?? ''}`);
      this.updateOutputLog(outputPath, [this.packagePath], 'generated');
    }

    // Add user-provided or generated index file to IG definition
    this.ig.definition.page.page.push({
      nameUrl: 'index.html',
      title: 'Home',
      generation
    });
  }

  /**
   * Adds additional pages beyond index.md that are defined by the user.
   * Only add formats that are supported by the IG template
   * Intro and notes file contents are injected into relevant pages and should not be treated as their own page
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  private addOtherPageContent(igPath: string): void {
    const inputPageContentPath = path.join(this.igDataPath, 'input', 'pagecontent');
    if (existsSync(inputPageContentPath)) {
      const organizedPages = this.organizePageContent(readdirSync(inputPageContentPath));

      let invalidFileTypeIncluded = false;
      organizedPages.forEach(page => {
        // All user defined pages are included in input/pagecontent
        const pagePath = path.join(this.igDataPath, 'input', 'pagecontent', page.originalName);

        this.copyWithWarningText(
          pagePath,
          path.join(igPath, 'input', 'pagecontent', `${page.name}.${page.fileType}`)
        );
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
        } else {
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

  /**
   * Sorts and renames pages based on numeric prefixes.
   * Numeric prefixes are used for applying a sort order, but should be removed
   * from the page's name and title unless doing so would cause a name collision.
   *
   * @param {string[]} pages - list of file names with extensions
   * @returns {PageMetadata []} - sorted list of file information objects
   */
  private organizePageContent(pages: string[]): PageMetadata[] {
    const pageData = pages.map(page => {
      const nameParts = page.match(/^(\d+)_(.*)/);
      let prefix: number = null;
      let name: string;
      if (nameParts == null) {
        name = page.slice(0, page.lastIndexOf('.'));
      } else {
        prefix = parseInt(nameParts[1]);
        name = nameParts[2].slice(0, nameParts[2].lastIndexOf('.'));
      }
      return {
        originalName: page,
        prefix: prefix,
        name: name,
        title: titleCase(words(name).join(' ')),
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
      this.copyAsIs(inputImagesPath, outputPath);
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
   * A user can define a menu in config.yaml or provide one in ig-data/input/includes.
   * If neither is provided, the static one SUSHI provides will be used.
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  addMenuXML(igPath: string): void {
    const menuXMLPath = path.join(this.igDataPath, 'input', 'includes', 'menu.xml');

    // If user did not provide a menu.xml file and config.menu is not defined, use SUSHI's basic menu.
    if (!existsSync(menuXMLPath) && !this.pkg.config?.menu) {
      const inputPath = path.join(__dirname, 'files', 'input', 'includes', 'menu.xml');
      const outputPath = path.join(igPath, 'input', 'includes', 'menu.xml');
      this.copyAsIs(inputPath, outputPath);
      return;
    }

    // If user provided file and no config, copy over the file.
    if (existsSync(menuXMLPath) && !this.pkg.config?.menu) {
      this.copyWithWarningText(menuXMLPath, path.join(igPath, 'input', 'includes', 'menu.xml'));
      return;
    }

    // If user provided file and config, log a warning but prefer the config.
    if (existsSync(menuXMLPath) && this.pkg.config?.menu) {
      logger.warn(
        'An IG menu is configured in config.yaml and provided in a menu.xml file in the ' +
          'ig-data/input/includes folder. Only the menu configured by config.yaml will ' +
          'be used to generate the IG menu. Please remove the menu.xml file from the ig-data folder. ' +
          'To provide your own menu.xml, remove the "menu" attribute in config.yaml.'
      );
    }

    // Always use config menu if defined
    if (this.pkg.config?.menu) {
      let menu = `<ul xmlns="http://www.w3.org/1999/xhtml" class="nav navbar-nav">${EOL}`;
      this.pkg.config?.menu.forEach(item => {
        menu += this.buildMenuItem(item, 2);
      });
      menu += '</ul>';

      const outputPath = path.join(igPath, 'input', 'includes', 'menu.xml');

      const warning = warningBlock(
        `<!-- ${path.parse(outputPath).base} {% comment %}`,
        '{% endcomment %} -->',
        [
          'To change the contents of this file, edit the "menu" attribute in the tank config.yaml file',
          'or provide your own menu.xml in the ig-data/input/includes folder'
        ]
      );
      outputFileSync(outputPath, `${warning}${menu}`, 'utf8');
      this.updateOutputLog(outputPath, [this.configPath], 'generated');
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
      if (item.url) menuItem += `<a href="${item.url}">`;
      menuItem += item.name;
      if (item.url) menuItem += '</a>';
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
  private addIgnoreWarningsFile(igPath: string): void {
    const ignorePath = path.join(this.igDataPath, 'input', 'ignoreWarnings.txt');
    if (existsSync(ignorePath)) {
      const outputPath = path.join(igPath, 'input', 'ignoreWarnings.txt');
      this.copyAsIs(ignorePath, outputPath);
    }
  }

  /**
   * Add each of the resources from the package to the ImplementationGuide JSON file.
   */
  private addResources(): void {
    const resources: (StructureDefinition | ValueSet | CodeSystem)[] = [
      ...sortBy(this.pkg.profiles, sd => sd.name),
      ...sortBy(this.pkg.extensions, sd => sd.name),
      ...sortBy(this.pkg.valueSets, valueSet => valueSet.name),
      ...sortBy(this.pkg.codeSystems, codeSystem => codeSystem.name)
    ];
    resources.forEach(r => {
      this.ig.definition.resource.push({
        reference: { reference: `${r.resourceType}/${r.id}` },
        name: r.title ?? r.name ?? r.id,
        description: r.description,
        exampleBoolean: false
      });
    });
    const instances = sortBy(
      this.pkg.instances,
      instance => instance.id ?? instance._instanceMeta.name
    );
    instances
      .filter(instance => instance._instanceMeta.usage !== 'Inline')
      .forEach(instance => {
        const resource: ImplementationGuideDefinitionResource = {
          reference: {
            reference: `${instance.resourceType}/${instance.id ?? instance._instanceMeta.name}`
          },
          name: instance._instanceMeta.title ?? instance._instanceMeta.name,
          description: instance._instanceMeta.description
        };
        if (instance._instanceMeta.usage === 'Example') {
          const exampleUrl = instance.meta?.profile?.find(url => this.pkg.fish(url, Type.Profile));
          if (exampleUrl) {
            resource.exampleCanonical = exampleUrl;
          } else {
            resource.exampleBoolean = true;
          }
        } else {
          resource.exampleBoolean = false;
        }
        this.ig.definition.resource.push(resource);
      });
  }

  /**
   * Adds any user provided resource files
   * This includes definitions in:
   * capabilities, extensions, models, operations, profiles, resources, vocabulary, examples
   * Based on: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root.input
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
          let resourceJSON: InstanceDefinition;
          if (file.endsWith('.json')) {
            resourceJSON = readJSONSync(path.join(dirPath, file));

            if (resourceJSON.resourceType == null || resourceJSON.id == null) {
              logger.error(
                `Resource at ${path.join(dirPath, file)} must define resourceType and id.`
              );
              continue;
            }

            const resource: ImplementationGuideDefinitionResource = {
              reference: {
                reference: `${resourceJSON.resourceType}/${resourceJSON.id}`
              },
              name: resourceJSON.id, // will be overwritten w/ title or name where applicable
              description: resourceJSON.description
            };

            if (pathEnd === 'examples') {
              const exampleUrl = resourceJSON.meta?.profile?.find(
                url =>
                  this.pkg.fish(url, Type.Profile) ?? this.fhirDefs.fishForFHIR(url, Type.Profile)
              );
              if (exampleUrl) {
                resource.exampleCanonical = exampleUrl;
              } else {
                resource.exampleBoolean = true;
              }
            } else {
              resource.exampleBoolean = false;
              // On some resources (Patient for example) these fields can be objects, avoid using them when this is true
              const title = typeof resourceJSON.title === 'string' ? resourceJSON.title : null;
              const name = typeof resourceJSON.name === 'string' ? resourceJSON.name : null;
              if (title || name) {
                resource.name = title ?? name;
              }
            }

            const existingIndex = this.ig.definition.resource.findIndex(
              r => r.reference.reference === resource.reference.reference
            );
            if (existingIndex >= 0) {
              if (
                this.ig.definition.resource[existingIndex].exampleBoolean ||
                this.ig.definition.resource[existingIndex].exampleCanonical
              ) {
                // If it is replacing an existing example, preserve description and name from SUSHI
                // Allows user method for setting description/name on external example
                const oldDescription = this.ig.definition.resource[existingIndex].description;
                const oldName = this.ig.definition.resource[existingIndex].name;
                if (oldDescription) resource.description = oldDescription;
                if (oldName) resource.name = this.ig.definition.resource[existingIndex].name;
              }
              this.ig.definition.resource[existingIndex] = resource;
            } else {
              this.ig.definition.resource.push(resource);
            }
            const inputPath = path.join(dirPath, file);
            const outputPath = path.join(
              igPath,
              'input',
              pathEnd,
              `${resourceJSON.resourceType}-${resourceJSON.id}.json`
            );
            this.copyAsIs(inputPath, outputPath);
          }
        }
      }
    }
  }

  /**
   * Writes the in-memory ImplementationGuide JSON to the IG output folder.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addImplementationGuide(igPath: string): void {
    const igJsonPath = path.join(igPath, 'input', `ImplementationGuide-${this.ig.id}.json`);
    outputJSONSync(igJsonPath, this.ig, { spaces: 2 });
    this.updateOutputLog(
      igJsonPath,
      [this.packagePath, path.join(this.igDataPath, 'ig.ini'), '{all input resources and pages}'],
      'generated'
    );
    logger.info(`Generated ImplementationGuide-${this.ig.id}.json`);
  }

  /**
   * Creates an ig.ini file based on the package.json and exports it to the IG folder.
   * If the user specified an igi.ini file in the ig-data folder, then use its values
   * as long as they don't conflict with values already in package.json.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addIgIni(igPath: string): void {
    // First generate the ig.ini from the package.json
    const iniObj: any = {};
    iniObj.ig = `input/ImplementationGuide-${this.pkg.packageJSON.name}.json`;
    iniObj.template = 'fhir.base.template';
    iniObj['usage-stats-opt-out'] = 'false';
    iniObj.copyrightyear = `${new Date().getFullYear()}+`;
    iniObj.license = this.pkg.packageJSON.license ?? 'CC0-1.0';
    iniObj.version = this.pkg.packageJSON.version;
    iniObj.ballotstatus = 'CI Build';
    iniObj.fhirspec = 'http://build.fhir.org/';

    // Then add properties from the user-provided ig.ini (if applicable)
    const inputIniPath = path.join(this.igDataPath, 'ig.ini');
    let merged = false;
    if (existsSync(inputIniPath)) {
      merged = true;
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
      } else {
        Object.keys(inputIni.IG).forEach(key => {
          if (key === 'ig' && inputIni.IG.ig !== iniObj.ig) {
            logger.error('igi.ini: sushi does not currently support overriding ig value.', {
              file: inputIniPath
            });
          } else if (key === 'license' && inputIni.IG.license !== iniObj.license) {
            logger.error(
              `igi.ini: license value (${inputIni.IG.license}) does not match license declared in package.json (${iniObj.license}).  Keeping ${iniObj.license}.`,
              { file: inputIniPath }
            );
          } else if (key === 'version' && inputIni.IG.version !== iniObj.version) {
            logger.error(
              `igi.ini: version value (${inputIni.IG.version}) does not match version declared in package.json (${iniObj.version}).  Keeping ${iniObj.version}.`,
              { file: inputIniPath }
            );
          } else {
            iniObj[key] = inputIni.IG[key];
          }
        });
      }
    }

    // Update the corresponding parameters in the ImplementationGuide JSON
    const copyrightParam = this.ig.definition.parameter.find(p => p.code === 'copyrightyear');
    copyrightParam.value = iniObj.copyrightyear;
    const releaseParam = this.ig.definition.parameter.find(p => p.code === 'releaselabel');
    releaseParam.value = iniObj.ballotstatus;

    // Now we need to do the reverse of what we did before.  If `#` is escaped, then unescape it.
    let outputIniContents = ini.encode(iniObj, { section: 'IG', whitespace: true });
    outputIniContents = outputIniContents.replace(/^template\s*=\s*.*?(\\#.+)?$/m, ($0, $1) =>
      $1 ? $0.replace($1, $1.slice(1)) : $0
    );

    // Insert the warning comment, which unfortunately cannot be on the first line due to an IG Publisher limitation
    const extra = merged
      ? [
          'This ig.ini was generated by merging values from ig-data/ig.ini with a default set of values,',
          'including values inferred from package.json (name, license, version). To affect the generation',
          'of this file, edit values in the ig-data/ig.ini input file.'
        ]
      : [
          'This ig.ini was generated using a default set of values, including values inferred from',
          'package.json (name, license, version). To affect the generation of this file, create an ig.ini',
          'file in the ig-data folder with the values that should be merged into this generated file.',
          'See: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#root'
        ];
    const iniWarning = [...warningTextArray('; ', extra), ''].join(EOL);
    outputIniContents = outputIniContents.replace('\n', `\n${iniWarning}`);

    // Finally, write it to disk
    const outputPath = path.join(igPath, 'ig.ini');
    outputFileSync(outputPath, outputIniContents);
    this.updateOutputLog(outputPath, [this.packagePath, inputIniPath], 'generated');

    if (merged) {
      logger.info('Merged ig-data/ig.ini w/ generated ig.ini');
    } else {
      logger.info('Generated default ig.ini.');
    }
  }

  /**
   * Adds the package-list.json file to the IG. Generated based on the Configuration history
   * field.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  addPackageList(igPath: string): void {
    const packageListPath = path.join(this.igDataPath, '..', 'package-list.json');
    if (existsSync(packageListPath)) {
      logger.warn(
        'A package-list.json file was provided. This file will not be included in SUSHI output. ' +
          'To create a package-list.json file, define "history" in config.yaml.'
      );
    }

    if (this.pkg.config?.history) {
      const outputPath = path.join(igPath, 'package-list.json');
      outputJSONSync(outputPath, this.pkg.config.history, { spaces: 2 });
      logger.info('Generated package-list.json');
      this.updateOutputLog(outputPath, [this.configPath], 'generated');
    } else if (/^https?:\/\/hl7.org\//.test(this.pkg.config?.canonical)) {
      logger.warn(
        'HL7 IGs must have a package-list.json. Please define "history" in config.yaml to generate one.'
      );
    }
  }

  /**
   * Creates and writes the SUSHI-GENERATED-FILES.md file. This file is intended to help users understand what
   * files are created by SUSHI and how they are created.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addOutputLog(igPath: string): void {
    // Add package.json to the output log since it's actually copied outside of this process
    // so nothing else has added it yet
    this.updateOutputLogForCopiedPath(path.join(igPath, 'package.json'), this.packagePath);

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
      'lists those files generated from project configs or the contents in the ig-data folder.',
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
    if (!existsSync(inputPath)) {
      return;
    }

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
      inputPath.slice(inputPath.indexOf(`${path.sep}ig-data${path.sep}`) + 1)
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
