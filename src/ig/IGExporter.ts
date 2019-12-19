import path from 'path';
import ini from 'ini';
import { ensureDirSync, copySync, outputJSONSync, outputFileSync } from 'fs-extra';
import { Package } from '../export';
import { ContactDetail, ImplementationGuide } from '../fhirtypes';

/**
 * The IG Exporter exports the FSH artifacts into a file structure supported by the IG Publisher.
 * This allows a FSH Tank to be built as a FHIR IG.  Currently, template-based IG publishing is
 * still new, so this functionality is subject to change.
 *
 * @see {@link https://build.fhir.org/ig/FHIR/ig-guidance/index.html}
 */
export class IGExporter {
  private ig: ImplementationGuide;
  constructor(public readonly pkg: Package, public readonly igDataPath: string) {}

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
    this.addResources(outPath);
    this.addImplementationGuide(outPath);
    this.addIgIni(outPath);
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
  }

  /**
   * Add the static files that (currently) do not change from IG to IG.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addStaticFiles(igPath: string): void {
    copySync(path.join(__dirname, 'files'), igPath);
  }

  /**
   * Add the index.md file, setting its content to be the package description.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addIndex(igPath: string) {
    ensureDirSync(path.join(igPath, 'input', 'pagecontent'));
    outputFileSync(
      path.join(igPath, 'input', 'pagecontent', 'index.md'),
      this.pkg.config.description ?? ''
    );
  }

  /**
   * Add each of the resources from the package to the ImplementationGuide JSON file.
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addResources(igPath: string) {
    const sds = [...this.pkg.profiles, ...this.pkg.extensions].sort((a, b) => {
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
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
   *
   * @param igPath {string} - the path where the IG is exported to
   */
  private addIgIni(igPath: string): void {
    const iniObj: any = {};
    iniObj.ig = `input/ImplementationGuide-${this.pkg.config.name}.json`;
    iniObj.template = 'fhir.base.template';
    iniObj['usage-stats-opt-out'] = 'false';
    iniObj.copyrightyear = `${new Date().getFullYear()}+`;
    iniObj.license = this.pkg.config.license ?? 'CC0-1.0';
    iniObj.version = this.pkg.config.version;
    iniObj.ballotstatus = 'CI Build';
    iniObj.fhirspec = 'http://build.fhir.org/';

    outputFileSync(
      path.join(igPath, 'ig.ini'),
      ini.encode(iniObj, { section: 'IG', whitespace: true })
    );
  }
}
