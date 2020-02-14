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
  CodeSystem
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
    this.addStaticFiles(outPath);
    this.addIndex(outPath);
    this.addOtherPageContent(outPath);
    this.addImages(outPath);
    this.addIncludeContents(outPath);
    this.addIgIni(outPath);
    this.addPackageList(outPath);
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
        if (m.email) {
          contact.telecom = [
            {
              system: 'email',
              value: m.email
            }
          ];
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
            value: `${new Date().getFullYear()}+` // TODO: Make this configurable
          },
          {
            code: 'releaselabel',
            value: 'CI Build' // TODO: Make this configurable
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
      title: this.ig.title,
      generation
    });
  }

  /**
   * Adds additional pages beyond index.md that are defined by the user.
   * Only add formats that are supported by the IG template
   * Intro and notes file contents are injected into relevant pages and should not be treated as their own page
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addOtherPageContent(igPath: string): void {
    const inputPageContentPath = path.join(this.igDataPath, 'input', 'pagecontent');
    if (fs.existsSync(inputPageContentPath)) {
      const pages = fs
        .readdirSync(inputPageContentPath)
        .filter(page => page !== 'index.md' && page !== 'index.xml')
        .sort(); // Sorts alphabetically

      let invalidFileTypeIncluded = false;
      pages.forEach(page => {
        // All user defined pages are included in input/pagecontent
        const pagePath = path.join(this.igDataPath, 'input', 'pagecontent', page);
        fs.copySync(pagePath, path.join(igPath, 'input', 'pagecontent', page));

        const fileName = page.slice(0, page.lastIndexOf('.'));
        const fileType = page.slice(page.lastIndexOf('.') + 1);
        const isSupportedFileType = fileType === 'md' || fileType === 'xml';
        const isIntroOrNotesFile = fileName.endsWith('-intro') || fileName.endsWith('-notes');
        if (isSupportedFileType) {
          // Intro and notes files will be in supported formats but are not separate pages, so they should not be added to IG definition
          if (!isIntroOrNotesFile) {
            // Valid page files will be added to the IG definition
            this.ig.definition.page.page.push({
              nameUrl: `${fileName}.html`,
              title: `${titleCase(words(fileName).join(' '))}`,
              generation: fileType === 'md' ? 'markdown' : 'html'
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
        name: r.title ?? r.name,
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
      const inputIni = ini.parse(fs.readFileSync(inputIniPath, 'utf8'));
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

    // Finally, write it to disk
    outputFileSync(
      path.join(igPath, 'ig.ini'),
      ini.encode(iniObj, { section: 'IG', whitespace: true })
    );

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
