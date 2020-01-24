import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import ini from 'ini';
import { IGExporter } from '../../src/ig';
import { StructureDefinition, InstanceDefinition, CodeSystem } from '../../src/fhirtypes';
import { Package } from '../../src/export';
import { Config } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';

describe('IGExporter', () => {
  // Track temp files/folders for cleanup
  temp.track();

  describe('#simple-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;

    beforeAll(() => {
      const defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'testPackage',
        defs
      );
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const config: Config = fs.readJSONSync(path.join(fixtures, 'package.json'));
      pkg = new Package(config);
      const resources = path.join(fixtures, 'resources');
      const instances = path.join(fixtures, 'instances');
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
      fs.readdirSync(instances).forEach(f => {
        if (f.endsWith('.json')) {
          const instanceDef = InstanceDefinition.fromJSON(fs.readJSONSync(path.join(instances, f)));
          pkg.instances.push(instanceDef);
        }
      });

      // Add CodeSystem directly because there is no fromJSON method on the class
      const codeSystemDef = new CodeSystem();
      codeSystemDef.id = 'sample-code-system';
      codeSystemDef.name = 'SampleCodeSystem';
      codeSystemDef.description = 'A code system description';
      pkg.codeSystems.push(codeSystemDef);

      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'));
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
      expect(fs.existsSync(path.join(tempOut, 'input', 'ignoreWarnings.txt'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, 'input', 'includes', 'menu.xml'))).toBeTruthy();
    });

    it('should copy over the resource files', () => {
      const resourcesPath = path.join(tempOut, 'input', 'resources');
      expect(fs.readdirSync(resourcesPath)).toHaveLength(6);
      const ids = [
        'sample-observation',
        'sample-patient',
        'sample-value-extension',
        'sample-complex-extension'
      ];

      // StructureDefinitions copied
      ids.forEach(id => {
        const resourcePath = path.join(resourcesPath, `StructureDefinition-${id}.json`);
        expect(fs.existsSync(resourcePath)).toBeTruthy();
        expect(fs.readJSONSync(resourcePath).id).toEqual(id);
      });

      // Instances copied
      const instancePath = path.join(resourcesPath, 'Patient-example.json');
      expect(fs.existsSync(instancePath)).toBeTruthy();
      expect(fs.readJSONSync(instancePath).id).toEqual('example');

      // Code Systems copied
      const codeSystemPath = path.join(resourcesPath, 'CodeSystem-sample-code-system.json');
      expect(fs.existsSync(codeSystemPath)).toBeTruthy();
      expect(fs.readJSONSync(codeSystemPath).id).toEqual('sample-code-system');
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
        dependsOn: [
          {
            uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core|3.1.0',
            packageId: 'hl7.fhir.us.core',
            version: '3.1.0'
          }
        ],
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
            },
            {
              reference: {
                reference: 'Patient/example'
              },
              name: 'Patient-example',
              exampleBoolean: true
            },
            {
              reference: {
                reference: 'CodeSystem/sample-code-system'
              },
              name: 'SampleCodeSystem',
              description: 'A code system description'
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

    it('should generate a package-list.json based on the package', () => {
      const pkgListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(pkgListPath)).toBeTruthy();
      const content = fs.readJSONSync(pkgListPath);
      expect(content).toEqual({
        'package-id': 'sushi-test',
        title: 'FSH Test IG',
        canonical: 'http://hl7.org/fhir/sushi-test',
        introduction: 'Provides a simple example of how FSH can be used to create an IG',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://hl7.org/fhir/sushi-test',
            status: 'ci-build',
            current: true
          },
          {
            version: '0.1.0',
            fhirversion: '4.0.1',
            date: '2099-01-01',
            desc: 'Initial STU ballot (Mmm yyyy Ballot)',
            path: 'http://hl7.org/fhir/sushi-test',
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      });
    });

    it('should generate an index.md with the package description', () => {
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.md');
      expect(fs.existsSync(indexPath)).toBeTruthy();
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch('Provides a simple example of how FSH can be used to create an IG');
    });
  });

  describe('#customized-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;

    beforeAll(() => {
      const fixtures = path.join(__dirname, 'fixtures', 'customized-ig');
      const config: Config = fs.readJSONSync(path.join(fixtures, 'package.json'));
      pkg = new Package(config);
      exporter = new IGExporter(pkg, new FHIRDefinitions(), path.resolve(fixtures, 'ig-data'));
      tempOut = temp.mkdirSync('sushi-test');
      // No need to regenerate the IG on every test -- generate it once and inspect what you
      // need to in the tests
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should generate an ig.ini with user-specified values overridden', () => {
      const iniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(iniPath)).toBeTruthy();
      const content = ini.parse(fs.readFileSync(iniPath, 'utf8'));
      expect(Object.keys(content.IG)).toHaveLength(12);
      expect(content.IG.ig).toEqual('input/ImplementationGuide-sushi-test.json');
      expect(content.IG.template).toEqual('hl7.fhir.template');
      expect(content.IG['usage-stats-opt-out']).toBeTruthy();
      expect(content.IG.copyrightyear).toEqual('2018+');
      expect(content.IG.license).toEqual('CC0-1.0');
      expect(content.IG.version).toEqual('0.1.0');
      expect(content.IG.ballotstatus).toEqual('STU1');
      expect(content.IG.fhirspec).toEqual('http://hl7.org/fhir/R4/');
      expect(content.IG.excludexml).toEqual('Yes');
      expect(content.IG.excludejson).toEqual('Yes');
      expect(content.IG.excludettl).toEqual('Yes');
      expect(content.IG.excludeMaps).toEqual('Yes');
    });

    it('should use the user-provided package-list.json when supplied', () => {
      const pkgListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(pkgListPath)).toBeTruthy();
      const content = fs.readJSONSync(pkgListPath);
      expect(content).toEqual({
        'package-id': 'sushi-test',
        title: 'FSH Test IG',
        canonical: 'http://hl7.org/fhir/sushi-test',
        introduction: 'Custom intro',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://build.fhir.org/ig/fhir/sushi-test',
            status: 'ci-build',
            current: true
          },
          {
            version: '0.2.0',
            fhirversion: '4.0.1',
            date: '2019-09-01',
            desc: 'Second STU ballot (Sep 2019 Ballot)',
            path: 'http://hl7.org/fhir/sushi-test/stu2',
            status: 'ballot',
            sequence: 'STU 2'
          },
          {
            version: '0.1.0',
            fhirversion: '4.0.1',
            date: '2019-05-01',
            desc: 'Initial STU ballot (May 2019 Ballot)',
            path: 'http://hl7.org/fhir/sushi-test/stu1',
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      });
    });

    it('should use the user-provided index.md if it exists', () => {
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.md');
      expect(fs.existsSync(indexPath)).toBeTruthy();
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch('My special index page.');
    });
  });

  describe('#invalid-data-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;

    beforeAll(() => {
      const fixtures = path.join(__dirname, 'fixtures', 'invalid-data-ig');
      const config: Config = fs.readJSONSync(path.join(fixtures, 'package.json'));
      pkg = new Package(config);
      exporter = new IGExporter(pkg, new FHIRDefinitions(), path.resolve(fixtures, 'ig-data'));
      tempOut = temp.mkdirSync('sushi-test');
      // No need to regenerate the IG on every test -- generate it once and inspect what you
      // need to in the tests
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should should log errors for invalid user-specified values in ig.ini', () => {
      // Check for log messages indicating invalid input
      expect(loggerSpy.getMessageAtIndex(-5)).toMatch(
        /igi\.ini: sushi does not currently support overriding ig value\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]ig.ini/s
      );
      expect(loggerSpy.getMessageAtIndex(-4)).toMatch(
        /igi\.ini: license value \(Apache2\.0\) does not match license declared in package\.json \(CC0-1\.0\)\.  Keeping CC0-1\.0\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]ig.ini/s
      );
      expect(loggerSpy.getMessageAtIndex(-3)).toMatch(
        /igi\.ini: version value \(0\.2\.0\) does not match version declared in package\.json \(0\.1\.0\)\.  Keeping 0\.1\.0\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]ig.ini/s
      );

      // And ensure that invalid inputs did not override existing values
      const iniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(iniPath)).toBeTruthy();
      const content = ini.parse(fs.readFileSync(iniPath, 'utf8'));
      expect(Object.keys(content.IG)).toHaveLength(12);
      expect(content.IG.ig).toEqual('input/ImplementationGuide-sushi-test.json');
      expect(content.IG.template).toEqual('hl7.fhir.template');
      expect(content.IG['usage-stats-opt-out']).toBeTruthy();
      expect(content.IG.copyrightyear).toEqual('2018+');
      expect(content.IG.license).toEqual('CC0-1.0');
      expect(content.IG.version).toEqual('0.1.0');
      expect(content.IG.ballotstatus).toEqual('STU1');
      expect(content.IG.fhirspec).toEqual('http://hl7.org/fhir/R4/');
      expect(content.IG.excludexml).toEqual('Yes');
      expect(content.IG.excludejson).toEqual('Yes');
      expect(content.IG.excludettl).toEqual('Yes');
      expect(content.IG.excludeMaps).toEqual('Yes');
    });

    it('should log an error if the user attempted to add more pages', () => {
      // Check for log messages indicating invalid input
      expect(loggerSpy.getMessageAtIndex(-6)).toMatch(
        /SUSHI does not yet support custom pagecontent other than index\.md\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]input[\/\\]pagecontent/s
      );
    });

    it('should log an error if supplied package-list.json does not match package.json', () => {
      // Check for log messages indicating invalid input
      expect(loggerSpy.getMessageAtIndex(-2)).toMatch(
        /package-list\.json: package-id value \(wrong-package-id\) does not match name declared in package\.json \(sushi-test\)\.  Ignoring custom package-list\.json\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]package-list.json/s
      );
      expect(loggerSpy.getMessageAtIndex(-1)).toMatch(
        /package-list\.json: canonical value \(wrong-canonical\) does not match canonical declared in package\.json \(http:\/\/hl7\.org\/fhir\/sushi-test\)\.  Ignoring custom package-list\.json\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]package-list.json/s
      );

      // Confirm it makes up a package-list instead of using the supplied one.
      const pkgListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(pkgListPath)).toBeTruthy();
      const content = fs.readJSONSync(pkgListPath);
      expect(content).toEqual({
        'package-id': 'sushi-test',
        title: 'FSH Test IG',
        canonical: 'http://hl7.org/fhir/sushi-test',
        introduction: 'Provides a simple example of how FSH can be used to create an IG',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://hl7.org/fhir/sushi-test',
            status: 'ci-build',
            current: true
          },
          {
            version: '0.1.0',
            fhirversion: '4.0.1',
            date: '2099-01-01',
            desc: 'Initial STU ballot (Mmm yyyy Ballot)',
            path: 'http://hl7.org/fhir/sushi-test',
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      });
    });
  });
});
