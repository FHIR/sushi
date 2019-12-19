import path from 'path';
import ini from 'ini';
import { ensureDirSync, copySync, outputJSONSync, outputFileSync } from 'fs-extra';
import { FSHTank } from '../import';
import { Package } from '../export';
import { ContactDetail, ImplementationGuide } from '../fhirtypes';

export class IGExporter {
  private ig: ImplementationGuide;
  constructor(public readonly tank: FSHTank, public readonly pkg: Package) {}

  export(outPath: string) {
    // See: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#directory-structure
    ensureDirSync(outPath);
    this.initIG();
    this.addStaticFiles(outPath);
    this.addIndex(outPath);
    this.addResources(outPath);
    this.addImplementationGuide(outPath);
    this.addIgIni(outPath);
  }

  private initIG(): void {
    const config = this.tank.config;
    this.ig = {
      resourceType: 'ImplementationGuide',
      id: config.name,
      url: `${config.canonical}/ImplementationGuide/${config.name}`,
      version: config.version,
      name: config.name,
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

  private addStaticFiles(igPath: string): void {
    copySync(path.join(__dirname, 'files'), igPath);
  }

  private addIndex(igPath: string) {
    ensureDirSync(path.join(igPath, 'input', 'pagecontent'));
    outputFileSync(
      path.join(igPath, 'input', 'pagecontent', 'index.md'),
      this.tank.config.description ?? ''
    );
  }

  private addResources(igPath: string) {
    [...this.pkg.profiles, ...this.pkg.extensions].forEach(sd => {
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

  private addImplementationGuide(igPath: string): void {
    const igJsonPath = path.join(igPath, 'input', `ImplementationGuide-${this.ig.id}.json`);
    outputJSONSync(igJsonPath, this.ig, { spaces: 2 });
  }

  private addIgIni(igPath: string): void {
    const iniObj: any = {};
    iniObj.ig = `input/ImplementationGuide-${this.tank.config.name}.json`;
    iniObj.template = 'fhir.base.template';
    iniObj['usage-stats-opt-out'] = 'false';
    iniObj.copyrightyear = `${new Date().getFullYear()}+`;
    iniObj.license = this.tank.config.license ?? 'CC0-1.0';
    iniObj.version = this.tank.config.version;
    iniObj.ballotstatus = 'CI Build';
    iniObj.fhirspec = 'http://build.fhir.org/';

    outputFileSync(
      path.join(igPath, 'ig.ini'),
      ini.encode(iniObj, { section: 'IG', whitespace: true })
    );
  }
}
