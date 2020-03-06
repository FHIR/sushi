import fs from 'fs-extra';
import path from 'path';
import ini from 'ini';
import sortBy from 'lodash/sortBy';
import words from 'lodash/words';
import { titleCase } from 'title-case';
import { ensureDirSync, copySync, outputJSONSync, outputFileSync } from 'fs-extra';
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
  constructor(
    private readonly pkg: Package,
    private readonly fhirDefs: FHIRDefinitions,
    private readonly igDataPath: string
  ) {}

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
    this.addIgIni(outPath);
    this.addPackageList(outPath);
    this.addIgnoreWarningsFile(outPath);
    this.addImplementationGuide(outPath);
  }

  /**
   * Initializes the ImplementationGuide JSON w/ data from the package.json
   *
   * @see {@link https://confluence.hl7.org/pages/viewpage.action?pageId=35718629#NPMPackageSpecification-PackageManifestpropertiesforIGs}
   */
  private initIG(): void {
    const config = this.pkg.config;
    this.ig = {
      resourceType: 'ImplementationGuide',
      id: config.name,
      url: `${config.canonical}/ImplementationGuide/${config.name}`,
      version: config.version,
      // name must be alphanumeric (allowing underscore as well)
      name: (config.title ?? config.name).replace(/[^A-Za-z0-9_]/g, ''),
      title: config.title ?? config.name,
      status: 'active', // TODO: make user-configurable
      publisher: config.author,
      contact: config.maintainers?.map(m => {
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
      description: config.description,
      packageId: config.name,
      license: config.license,
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
        // Parameter apparently required by IG Publisher (as of Jan 29, 2020)
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

    // Add the dependencies
    if (this.pkg.config.dependencies) {
      const igs = this.fhirDefs.allImplementationGuides();
      for (const depId of Object.keys(this.pkg.config.dependencies)) {
        if (depId === 'hl7.fhir.r4.core') {
          continue;
        }
        const depVersion = this.pkg.config.dependencies[depId];
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
    copySync(path.join(__dirname, 'files'), igPath);

    // On Windows, the file permissions are not always preserved. This doesn't
    // cause a problem for the Windows user, but it may cause problems for
    // Mac and Linux users who use an NPM package published by a Windows user.
    // To work around this, we set the necessary permissions on executable
    // scripts after copying them to the IG path.
    try {
      fs.chmodSync(path.join(igPath, '_genonce.sh'), 0o755);
      fs.chmodSync(path.join(igPath, '_updatePublisher.sh'), 0o755);
    } catch (e) {
      // We don't want to fail the whole export for this, but we should log it
      logger.warn(
        'Failed to set executable permissions on IG publisher scripts (_genonce.sh, ' +
          '_updatePublisher.sh). You may need to set these permissions manually before they can ' +
          'be executed (e.g., chmod 755 _genonce.sh).'
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
    if (fs.existsSync(inputIndexMarkdownPath)) {
      fs.copySync(inputIndexMarkdownPath, path.join(igPath, 'input', 'pagecontent', 'index.md'));
      logger.info('Copied ig-data/input/pagecontent/index.md');
    } else if (fs.existsSync(inputIndexXMLPath)) {
      fs.copySync(inputIndexXMLPath, path.join(igPath, 'input', 'pagecontent', 'index.xml'));
      generation = 'html';
      logger.info('Copied ig-data/input/pagecontent/index.xml');
    } else {
      logger.info('Generated default index.md.');
      outputFileSync(
        path.join(igPath, 'input', 'pagecontent', 'index.md'),
        this.pkg.config.description ?? ''
      );
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
    if (fs.existsSync(inputPageContentPath)) {
      const organizedPages = this.organizePageContent(fs.readdirSync(inputPageContentPath));

      let invalidFileTypeIncluded = false;
      organizedPages.forEach(page => {
        // All user defined pages are included in input/pagecontent
        const pagePath = path.join(this.igDataPath, 'input', 'pagecontent', page.originalName);

        fs.copySync(
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
    if (fs.existsSync(inputImagesPath)) {
      fs.copySync(inputImagesPath, path.join(igPath, 'input', 'images'));
    }
  }

  /**
   * Adds any user provided includes files
   * A user provided menu.xml will be in this folder. If one is not provided, the static one SUSHI provides will be used.
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  private addIncludeContents(igPath: string): void {
    const includesPath = path.join(this.igDataPath, 'input', 'includes');
    if (fs.existsSync(includesPath)) {
      fs.copySync(includesPath, path.join(igPath, 'input', 'includes'));
    }
  }

  /**
   * Adds user provided ignoreWarnings.txt file if it exists; otherwise the static one SUSHI provides will be used.
   *
   * @param {string} igPath - the path where the IG is exported to
   */
  private addIgnoreWarningsFile(igPath: string): void {
    const ignorePath = path.join(this.igDataPath, 'input', 'ignoreWarnings.txt');
    if (fs.existsSync(ignorePath)) {
      fs.copyFileSync(ignorePath, path.join(igPath, 'input', 'ignoreWarnings.txt'));
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
    const examples = sortBy(
      this.pkg.instances,
      instance => instance.id ?? instance._instanceMeta.name
    );
    examples.forEach(example => {
      const resource: ImplementationGuideDefinitionResource = {
        reference: {
          reference: `${example.resourceType}/${example.id ?? example._instanceMeta.name}`
        },
        name: example._instanceMeta.title ?? example._instanceMeta.name,
        description: example._instanceMeta.description
      };
      const exampleUrl = example.meta?.profile?.find(url => this.pkg.fish(url, Type.Profile));
      if (exampleUrl) {
        resource.exampleCanonical = exampleUrl;
      } else {
        resource.exampleBoolean = true;
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
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          let resourceJSON: InstanceDefinition;
          if (file.endsWith('.json')) {
            resourceJSON = fs.readJSONSync(path.join(dirPath, file));

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
            fs.copySync(
              path.join(dirPath, file),
              path.join(
                igPath,
                'input',
                pathEnd,
                `${resourceJSON.resourceType}-${resourceJSON.id}.json`
              )
            );
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
    iniObj.ig = `input/ImplementationGuide-${this.pkg.config.name}.json`;
    iniObj.template = 'fhir.base.template';
    iniObj['usage-stats-opt-out'] = 'false';
    iniObj.copyrightyear = `${new Date().getFullYear()}+`;
    iniObj.license = this.pkg.config.license ?? 'CC0-1.0';
    iniObj.version = this.pkg.config.version;
    iniObj.ballotstatus = 'CI Build';
    iniObj.fhirspec = 'http://build.fhir.org/';

    // Then add properties from the user-provided ig.ini (if applicable)
    const inputIniPath = path.join(this.igDataPath, 'ig.ini');
    let merged = false;
    if (fs.existsSync(inputIniPath)) {
      merged = true;
      let inputIniContents = fs.readFileSync(inputIniPath, 'utf8');
      // FHIR allows templates to have versions identified using #.  E.g.,
      //   template = hl7.fhir.template#0.1.0
      // The ini library, however, treats # as a comment unless it is escaped.  So if it exists, we need to escape it.
      inputIniContents = inputIniContents.replace(/^\s*template\s*=\s*[^#]+(#.+)?$/m, ($0, $1) =>
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
    outputIniContents = outputIniContents.replace(/^template\s*=\s*.+?(\\#.+)?$/m, ($0, $1) =>
      $1 ? $0.replace($1, $1.slice(1)) : $0
    );

    // Finally, write it to disk
    outputFileSync(path.join(igPath, 'ig.ini'), outputIniContents);

    if (merged) {
      logger.info('Merged ig-data/ig.ini w/ generated ig.ini');
    } else {
      logger.info('Generated default ig.ini.');
    }
  }

  /**
   * Adds the package-list.json file to the IG.  If one already exists, it will be used, otherwise
   * it will be generated based on the package.json.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addPackageList(igPath: string): void {
    // If the user provided an index.md file, use that
    const inputPackageListPath = path.join(this.igDataPath, 'package-list.json');
    if (fs.existsSync(inputPackageListPath)) {
      let mismatch = false;
      const inputPackageList = fs.readJSONSync(inputPackageListPath);
      if (inputPackageList['package-id'] !== this.pkg.config.name) {
        logger.error(
          `package-list.json: package-id value (${inputPackageList['package-id']}) does not match name declared in package.json (${this.pkg.config.name}).  Ignoring custom package-list.json.`,
          { file: inputPackageListPath }
        );
        mismatch = true;
      }
      if (inputPackageList.canonical !== this.pkg.config.canonical) {
        logger.error(
          `package-list.json: canonical value (${inputPackageList.canonical}) does not match canonical declared in package.json (${this.pkg.config.canonical}).  Ignoring custom package-list.json.`,
          { file: inputPackageListPath }
        );
        mismatch = true;
      }
      if (!mismatch) {
        fs.copySync(inputPackageListPath, path.join(igPath, 'package-list.json'));
        logger.info('Copied ig-data/package-list.json.');
        return;
      }
    }
    outputJSONSync(
      path.join(igPath, 'package-list.json'),
      {
        'package-id': this.pkg.config.name,
        title: this.pkg.config.title ?? this.pkg.config.name,
        canonical: this.pkg.config.canonical,
        introduction: this.pkg.config.description ?? this.pkg.config.title ?? this.pkg.config.name,
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: this.pkg.config.url,
            status: 'ci-build',
            current: true
          },
          {
            version: this.pkg.config.version,
            fhirversion: '4.0.1',
            date: '2099-01-01',
            desc: 'Initial STU ballot (Mmm yyyy Ballot)',
            path: this.pkg.config.url,
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      },
      { spaces: 2 }
    );
    logger.info('Generated default package-list.json');
  }
}

interface PageMetadata {
  originalName: string;
  prefix: number;
  name: string;
  title: string;
  fileType: string;
}
