import fs from 'fs-extra';
import path from 'path';
import ini from 'ini';
import sortBy from 'lodash/sortBy';
import { ensureDirSync, copySync, outputJSONSync, outputFileSync } from 'fs-extra';
import { Package } from '../export';
import { ContactDetail, ImplementationGuide } from '../fhirtypes';
import { logger } from '../utils/FSHLogger';
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
    this.addStaticFiles(outPath);
    this.addIndex(outPath);
    this.checkForOtherPageContent();
    this.addResources(outPath);
    this.addImplementationGuide(outPath);
    this.addIgIni(outPath);
    this.addPackageList(outPath);
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
      status: 'draft', // TODO: make user-configurable
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
          page: [
            {
              nameUrl: 'index.html',
              title: config.title ?? config.name,
              generation: 'markdown'
            }
          ]
        }
      }
    };

    // Add the dependencies
    if (this.pkg.config.dependencies) {
      const igs = this.fhirDefs.allImplementationGuides();
      for (const key of Object.keys(this.pkg.config.dependencies)) {
        if (key === 'hl7.fhir.r4.core') {
          continue;
        }
        const depIG = igs.find(
          ig => ig.packageId === key && ig.version == this.pkg.config.dependencies[key]
        );
        if (depIG) {
          this.ig.dependsOn.push({
            uri: `${depIG.url}|${depIG.version}`,
            packageId: depIG.packageId,
            version: depIG.version
          });
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
  private addIndex(igPath: string) {
    ensureDirSync(path.join(igPath, 'input', 'pagecontent'));

    // If the user provided an index.md file, use that
    const inputIndexPath = path.join(this.igDataPath, 'input', 'pagecontent', 'index.md');
    if (fs.existsSync(inputIndexPath)) {
      fs.copySync(inputIndexPath, path.join(igPath, 'input', 'pagecontent', 'index.md'));
    } else {
      outputFileSync(
        path.join(igPath, 'input', 'pagecontent', 'index.md'),
        this.pkg.config.description ?? ''
      );
    }
  }

  /**
   * SUSHI doesn't yet support authors adding additional pages beyond index.md.  If we detect
   * additional pages, we need to log an error.
   */
  private checkForOtherPageContent() {
    const inputPageContentPath = path.join(this.igDataPath, 'input', 'pagecontent');
    if (fs.existsSync(inputPageContentPath)) {
      const pages = fs.readdirSync(inputPageContentPath);
      if (pages.length > 1 || (pages.length === 1 && pages[0] !== 'index.md')) {
        logger.error('SUSHI does not yet support custom pagecontent other than index.md.', {
          file: inputPageContentPath
        });
      }
    }
  }

  /**
   * Add each of the resources from the package to the ImplementationGuide JSON file.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addResources(igPath: string) {
    const sds = sortBy([...this.pkg.profiles, ...this.pkg.extensions], sd => sd.name);
    sds.forEach(sd => {
      const sdPath = path.join(igPath, 'input', 'resources', sd.getFileName());
      outputJSONSync(sdPath, sd.toJSON(), { spaces: 2 });
      this.ig.definition.resource.push({
        reference: { reference: `StructureDefinition/${sd.id}` },
        name: sd.title ?? sd.name,
        description: sd.description,
        exampleBoolean: false
      });
    });
    sortBy(this.pkg.instances, instance => instance.id ?? instance.instanceName).forEach(
      instance => {
        const instancePath = path.join(igPath, 'input', 'resources', instance.getFileName());
        outputJSONSync(instancePath, instance.toJSON(), { spaces: 2 });
        this.ig.definition.resource.push({
          reference: {
            reference: `${instance.resourceType}/${instance.id ?? instance.instanceName}`
          },
          name: instance.getFileName().slice(0, -5), // Slice off the .json of the file name
          exampleBoolean: true
        });
      }
    );
    sortBy(this.pkg.valueSets, valueSet => valueSet.name).forEach(valueSet => {
      const valueSetPath = path.join(igPath, 'input', 'resources', valueSet.getFileName());
      outputJSONSync(valueSetPath, valueSet.toJSON(), { spaces: 2 });
      this.ig.definition.resource.push({
        reference: { reference: `ValueSet/${valueSet.id}` },
        name: valueSet.title ?? valueSet.name,
        description: valueSet.description
      });
    });
    sortBy(this.pkg.codeSystems, codeSystem => codeSystem.name).forEach(codeSystem => {
      const codeSystemPath = path.join(igPath, 'input', 'resources', codeSystem.getFileName());
      outputJSONSync(codeSystemPath, codeSystem.toJSON(), { spaces: 2 });
      this.ig.definition.resource.push({
        reference: { reference: `CodeSystem/${codeSystem.id}` },
        name: codeSystem.title ?? codeSystem.name,
        description: codeSystem.description
      });
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
    if (fs.existsSync(inputIniPath)) {
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
  }
}
