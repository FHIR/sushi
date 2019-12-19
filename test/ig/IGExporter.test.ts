import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import ini from 'ini';
import { IGExporter } from '../../src/ig';
import { StructureDefinition } from '../../src/fhirtypes';
import { Package } from '../../src/export';
import { Config } from '../../src/fshtypes';

describe('IGExporter', () => {
  // Track temp files/folders for cleanup
  temp.track();

  describe('#simple-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;

    beforeAll(() => {
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const config: Config = fs.readJSONSync(path.join(fixtures, 'package.json'));
      pkg = new Package([], [], config);
      const resources = path.join(fixtures, 'resources');
      fs.readdirSync(resources).forEach(f => {
        if (f.endsWith('.json')) {
          const sd = StructureDefinition.fromJSON(fs.readJSONSync(path.join(resources, f)));
          if (sd.type === 'Extension') {
            pkg.extensions.push(sd);
          } else {
            pkg.profiles.push(sd);
          }
        }
      });
      exporter = new IGExporter(pkg, path.resolve(fixtures, 'ig-data'));
      tempOut = temp.mkdirSync('sushi-test');
      // No need to regenerate the IG on every test -- generate it once and inspect what you
      // need to in the tests
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should copy over the static files', () => {
      expect(fs.existsSync(path.join(tempOut, '_genonce.bat'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, '_genonce.sh'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, '_updatePublisher.bat'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, '_updatePublisher.sh'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, 'input', 'ignorewarnings.txt'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, 'input', 'includes', 'menu.xml'))).toBeTruthy();
    });

    it('should copy over the resource files', () => {
      const resourcesPath = path.join(tempOut, 'input', 'resources');
      expect(fs.readdirSync(resourcesPath)).toHaveLength(4);
      const ids = [
        'sample-observation',
        'sample-patient',
        'sample-value-extension',
        'sample-complex-extension'
      ];
      ids.forEach(id => {
        const resourcePath = path.join(resourcesPath, `StructureDefinition-${id}.json`);
        expect(fs.existsSync(resourcePath)).toBeTruthy();
        expect(fs.readJSONSync(resourcePath).id).toEqual(id);
      });
    });

    it('should generate an ig.ini with the correct values based on the package.json', () => {
      const iniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(iniPath)).toBeTruthy();
      const content = ini.parse(fs.readFileSync(iniPath, 'utf8'));
      expect(Object.keys(content.IG)).toHaveLength(8);
      expect(content.IG.ig).toEqual('input/ImplementationGuide-sushi-test.json');
      expect(content.IG.template).toEqual('fhir.base.template');
      expect(content.IG['usage-stats-opt-out']).toBeFalsy();
      expect(content.IG.copyrightyear).toEqual(`${new Date().getFullYear()}+`);
      expect(content.IG.license).toEqual('CC0-1.0');
      expect(content.IG.version).toEqual('0.1.0');
      expect(content.IG.ballotstatus).toEqual('CI Build');
      expect(content.IG.fhirspec).toEqual('http://build.fhir.org/');
    });

    it('should generate an ImplementationGuide resource based on the package', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content).toEqual({
        resourceType: 'ImplementationGuide',
        id: 'sushi-test',
        url: 'http://hl7.org/fhir/sushi-test/ImplementationGuide/sushi-test',
        version: '0.1.0',
        name: 'FSHTestIG',
        title: 'FSH Test IG',
        status: 'draft',
        publisher: 'James Tuna',
        contact: [
          {
            name: 'Bill Cod',
            telecom: [
              {
                system: 'email',
                value: 'cod@reef.gov'
              }
            ]
          }
        ],
        description: 'Provides a simple example of how FSH can be used to create an IG',
        packageId: 'sushi-test',
        license: 'CC0-1.0',
        fhirVersion: ['4.0.1'],
        definition: {
          resource: [
            {
              reference: {
                reference: 'StructureDefinition/sample-complex-extension'
              },
              name: 'SampleComplexExtension',
              description:
                'Base StructureDefinition for Extension Type: Optional Extension Element - found in all resources.',
              exampleBoolean: false
            },
            {
              reference: {
                reference: 'StructureDefinition/sample-observation'
              },
              name: 'SampleObservation',
              description:
                'Measurements and simple assertions made about a patient, device or other subject.',
              exampleBoolean: false
            },
            {
              reference: {
                reference: 'StructureDefinition/sample-patient'
              },
              name: 'SamplePatient',
              description:
                'Demographics and other administrative information about an individual or animal receiving care or other health-related services.',
              exampleBoolean: false
            },
            {
              reference: {
                reference: 'StructureDefinition/sample-value-extension'
              },
              name: 'SampleValueExtension',
              description:
                'Base StructureDefinition for Extension Type: Optional Extension Element - found in all resources.',
              exampleBoolean: false
            }
          ],
          page: {
            nameUrl: 'toc.html',
            title: 'Table of Contents',
            generation: 'html',
            page: [
              {
                nameUrl: 'index.html',
                title: 'FSH Test IG',
                generation: 'markdown'
              }
            ]
          }
        }
      });
    });

    it('should generate an index.md with the package description', () => {
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.md');
      expect(fs.existsSync(indexPath)).toBeTruthy();
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch('Provides a simple example of how FSH can be used to create an IG');
    });
  });
});
