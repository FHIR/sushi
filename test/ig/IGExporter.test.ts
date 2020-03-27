import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import os from 'os';
import { IGExporter } from '../../src/ig';
import { StructureDefinition, InstanceDefinition, CodeSystem } from '../../src/fhirtypes';
import { Package } from '../../src/export';
import { Config } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FHIRDefinitions, loadFromPath, loadCustomResources } from '../../src/fhirdefs';
import { TestFisher } from '../testhelpers';

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
      const profiles = path.join(fixtures, 'profiles');
      fs.readdirSync(profiles).forEach(f => {
        if (f.endsWith('.json')) {
          const sd = StructureDefinition.fromJSON(fs.readJSONSync(path.join(profiles, f)));
          pkg.profiles.push(sd);
        }
      });
      const extensions = path.join(fixtures, 'extensions');
      fs.readdirSync(extensions).forEach(f => {
        if (f.endsWith('.json')) {
          const sd = StructureDefinition.fromJSON(fs.readJSONSync(path.join(extensions, f)));
          pkg.extensions.push(sd);
        }
      });
      const examples = path.join(fixtures, 'examples');
      fs.readdirSync(examples).forEach(f => {
        if (f.endsWith('.json')) {
          const instanceDef = InstanceDefinition.fromJSON(fs.readJSONSync(path.join(examples, f)));
          // since instance meta isn't encoded in the JSON, add some here (usually done in the FSH import)
          if (instanceDef.id === 'patient-example-two') {
            instanceDef._instanceMeta.title = 'Another Patient Example';
            instanceDef._instanceMeta.description = 'Another example of a Patient';
            instanceDef._instanceMeta.usage = 'Example';
          }
          if (instanceDef.id === 'capability-statement-example') {
            instanceDef._instanceMeta.usage = 'Definition';
          }
          if (instanceDef.id === 'patient-example') {
            instanceDef._instanceMeta.usage = 'Example'; // Default would be set to example in import
          }
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

    it('should generate an ig.ini with the correct values based on the package.json', () => {
      const iniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(iniPath)).toBeTruthy();
      const content = fs.readFileSync(iniPath, 'utf8');
      expect(content).toEqual(
        [
          '[IG]',
          'ig = input/ImplementationGuide-sushi-test.json',
          'template = fhir.base.template',
          'usage-stats-opt-out = false',
          `copyrightyear = ${new Date().getFullYear()}+`,
          'license = CC0-1.0',
          'version = 0.1.0',
          'ballotstatus = CI Build',
          'fhirspec = http://build.fhir.org/'
        ]
          .map(ln => ln + os.EOL) // Windows: /r/n; Mac: /n
          .join('')
      );
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
        status: 'active',
        publisher: 'James Tuna',
        contact: [
          {
            name: 'Bill Cod',
            telecom: [
              {
                system: 'url',
                value: 'https://capecodfishermen.org/'
              },
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
          // USCore tests that it works with a package dependency w/ a specific version
          {
            uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
            packageId: 'hl7.fhir.us.core',
            version: '3.1.0'
          },
          // VHDir tests that it works with a package dependency w/ "current"
          {
            uri: 'http://hl7.org/fhir/uv/vhdir/ImplementationGuide/hl7.core.uv.vhdir',
            packageId: 'hl7.fhir.uv.vhdir',
            version: 'current'
          }
        ],
        definition: {
          resource: [
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
                reference: 'StructureDefinition/sample-complex-extension'
              },
              name: 'SampleComplexExtension',
              description:
                'Base StructureDefinition for Extension Type: Optional Extension Element - found in all resources.',
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
                reference: 'CodeSystem/sample-code-system'
              },
              name: 'SampleCodeSystem',
              description: 'A code system description',
              exampleBoolean: false
            },
            {
              reference: {
                reference: 'CapabilityStatement/capability-statement-example'
              },
              name: 'capability-statement-example',
              exampleBoolean: false // Not 'Example' Usages will set this to false
            },
            {
              reference: {
                reference: 'Patient/patient-example'
              },
              name: 'patient-example',
              exampleBoolean: true // No defined Usage on FSH file sets this to true
            },
            {
              reference: {
                reference: 'Patient/patient-example-two'
              },
              name: 'Another Patient Example',
              description: 'Another example of a Patient',
              exampleBoolean: true // Usage set to Example sets this to true
            }
          ],
          page: {
            nameUrl: 'toc.html',
            title: 'Table of Contents',
            generation: 'html',
            page: [
              {
                nameUrl: 'index.html',
                title: 'Home',
                generation: 'markdown'
              }
            ]
          },
          parameter: [
            {
              code: 'copyrightyear',
              value: `${new Date().getFullYear()}+`
            },
            {
              code: 'releaselabel',
              value: 'CI Build'
            },
            {
              code: 'show-inherited-invariants',
              value: 'false'
            },
            {
              code: 'path-history',
              value: 'http://hl7.org/fhir/sushi-test/history.html'
            }
          ]
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

    it('should generate a default menu.xml', () => {
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeTruthy();
      const content = fs.readFileSync(menuPath, 'utf8');
      expect(content).toMatch('<li><a href="index.html">IG Home</a></li>');
      expect(content).toMatch('<li><a href="toc.html">Table of Contents</a></li>');
    });
  });

  describe('#non-hl7-ig', () => {
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
      const fixtures = path.join(__dirname, 'fixtures', 'non-hl7-ig');
      const config: Config = fs.readJSONSync(path.join(fixtures, 'package.json'));
      pkg = new Package(config);

      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'));
      tempOut = temp.mkdirSync('sushi-test');
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should generate an ImplementationGuide resource based on the package', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content).toEqual({
        resourceType: 'ImplementationGuide',
        id: 'sushi-test',
        url: 'http://example.org/fhir/sushi-test/ImplementationGuide/sushi-test',
        version: '0.1.0',
        name: 'FSHTestIG',
        title: 'FSH Test IG',
        status: 'active',
        publisher: 'James Tuna',
        contact: [
          {
            name: 'Bill Cod',
            telecom: [
              {
                system: 'url',
                value: 'https://capecodfishermen.org/'
              },
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
          resource: [],
          page: {
            nameUrl: 'toc.html',
            title: 'Table of Contents',
            generation: 'html',
            page: [
              {
                nameUrl: 'index.html',
                title: 'Home',
                generation: 'markdown'
              }
            ]
          },
          parameter: [
            {
              code: 'copyrightyear',
              value: `${new Date().getFullYear()}+`
            },
            {
              code: 'releaselabel',
              value: 'CI Build'
            },
            {
              code: 'show-inherited-invariants',
              value: 'false'
            }
            // NOTE: no path-history for non-hl7 IGs
          ]
        }
      });
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
      const content = fs.readFileSync(iniPath, 'utf8');
      expect(content).toEqual(
        [
          '[IG]',
          'ig = input/ImplementationGuide-sushi-test.json',
          'template = hl7.fhir.template#0.1.0',
          'usage-stats-opt-out = true',
          'copyrightyear = 2018+',
          'license = CC0-1.0',
          'version = 0.1.0',
          'ballotstatus = STU1',
          'fhirspec = http://hl7.org/fhir/R4/',
          'excludexml = Yes',
          'excludejson = Yes',
          'excludettl = Yes',
          'excludeMaps = Yes'
        ]
          .map(ln => ln + os.EOL) // Windows: /r/n; Mac: /n
          .join('')
      );
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

    it('should reflect the user-provided copyrightyear and ballotstatus as IG parameters', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).toContainEqual({
        code: 'copyrightyear',
        value: '2018+'
      });
      expect(igContent.definition.parameter).toContainEqual({
        code: 'releaselabel',
        value: 'STU1'
      });
    });

    it('should use the user-provided index.md if it exists', () => {
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.md');
      expect(fs.existsSync(indexPath)).toBeTruthy();
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch('My special index page.');

      // Checks that the index.md file is added to IG definition
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toContainEqual({
        nameUrl: 'index.html',
        title: 'Home',
        generation: 'markdown'
      });
    });

    it('should use the user-provided menu.xml if it exists', () => {
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeTruthy();
      const content = fs.readFileSync(menuPath, 'utf8');
      expect(content).toMatch('<li><a href="index.html">My special menu</a></li>');
      expect(content).toMatch('<li><a href="toc.html">Customized Table of Contents</a></li>');
    });

    it('should use the user-provided ignoreWarnings.txt if it exists', () => {
      const ignorePath = path.join(tempOut, 'input', 'ignoreWarnings.txt');
      expect(fs.existsSync(ignorePath)).toBeTruthy();
      const content = fs.readFileSync(ignorePath, 'utf8');
      expect(content).toMatch(
        'Code System URI "http://ncimeta.nci.nih.gov" is unknown so the code cannot be validated'
      );
      expect(content).toMatch(
        'Code System URI "http://cancerstaging.org" is unknown so the code cannot be validated'
      );
    });

    it('should include any additional user-provided files in includes', () => {
      const otherIncludeFilePath = path.join(tempOut, 'input', 'includes', 'other.xml');
      expect(fs.existsSync(otherIncludeFilePath)).toBeTruthy();
      const content = fs.readFileSync(otherIncludeFilePath, 'utf8');
      expect(content).toMatch('<li><a href="index.html">Some other non-menu file</a></li>');
    });

    it('should include additional user-provided pages of valid file type', () => {
      const pageContentPath = path.join(tempOut, 'input', 'pagecontent');
      expect(fs.existsSync(pageContentPath)).toBeTruthy();

      // All file contents get copied over
      const otherFilePath = path.join(pageContentPath, 'other-page.md');
      const otherContent = fs.readFileSync(otherFilePath, 'utf8');
      expect(otherContent).toMatch('My other now-supported-page.');
      const unsupportedFilePath = path.join(pageContentPath, 'unsupported.html');
      const unsupportedContent = fs.readFileSync(unsupportedFilePath, 'utf8');
      expect(unsupportedContent).toMatch('<p>An unsupported file type will copied over</p>');
      const notesFilePath = path.join(pageContentPath, 'resource-notes.md');
      const notesContent = fs.readFileSync(notesFilePath, 'utf8');
      expect(notesContent).toContain('Some resource specific notes.');

      // File information added to pages list in IG. Unsupported files and intro/notes files not included
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'markdown'
        },
        {
          nameUrl: 'other-page.html',
          title: 'Other Page',
          generation: 'markdown'
        }
      ]);
    });

    it('should include user-provided images', () => {
      const imagesPath = path.join(tempOut, 'input', 'images');
      expect(fs.existsSync(imagesPath)).toBeTruthy();
      const imageFileNames = fs.readdirSync(imagesPath);
      expect(imageFileNames).toEqual(['Shorty.png']);
    });
  });

  describe('#customized-ig-with-local-template', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;

    beforeAll(() => {
      const fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-local-template');
      const config: Config = fs.readJSONSync(path.join(fixtures, 'package.json'));
      pkg = new Package(config);
      exporter = new IGExporter(pkg, new FHIRDefinitions(), path.resolve(fixtures, 'ig-data'));
      tempOut = temp.mkdirSync('sushi-test');
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should generate an ig.ini with working local-template value', () => {
      const iniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(iniPath)).toBeTruthy();
      const content = fs.readFileSync(iniPath, 'utf8');
      const lines = content.split(os.EOL); // Windows: /r/n; Mac: /n
      expect(lines[2]).toEqual('template = #local-template');
    });
  });

  describe('#customized-ig-with-index-xml', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;

    beforeAll(() => {
      const fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-index-xml');
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

    it('should use the user-provided index.xml if it exists', () => {
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.xml');
      expect(fs.existsSync(indexPath)).toBeTruthy();
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('An index file in XML');

      // Checks that the index.xml file is added to IG definition
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'html'
        }
      ]);
    });
  });

  describe('#customized-ig-with-resources', () => {
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
      const fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-resources');
      const config: Config = fs.readJSONSync(path.join(fixtures, 'package.json'));
      pkg = new Package(config);
      loadCustomResources(fixtures, defs);

      // Add a patient to the package that will be overwritten
      const fisher = new TestFisher(null, defs, pkg);
      const patient = fisher.fishForStructureDefinition('Patient');
      patient.id = 'MyPatient';
      patient.description = 'This should go away';
      pkg.profiles.push(patient);

      const patientInstance = new InstanceDefinition();
      patientInstance.resourceType = 'Patient';
      patientInstance.id = 'FooPatient';
      patientInstance._instanceMeta.description = 'This should stay';
      patientInstance._instanceMeta.name = 'StayName';
      patientInstance._instanceMeta.usage = 'Example';
      pkg.instances.push(patientInstance);

      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'));
      tempOut = temp.mkdirSync('sushi-test');
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should copy over resource files', () => {
      const directoryContents = new Map<string, string[]>();
      const dirNames = [
        'capabilities',
        'extensions',
        'models',
        'operations',
        'profiles',
        'resources',
        'vocabulary',
        'examples'
      ];
      for (const dirName of dirNames) {
        directoryContents.set(dirName, fs.readdirSync(path.join(tempOut, 'input', dirName)));
      }
      expect(directoryContents.get('capabilities')).toEqual(['CapabilityStatement-MyCS.json']);
      expect(directoryContents.get('models')).toEqual(['StructureDefinition-MyLM.json']);
      expect(directoryContents.get('extensions')).toEqual([
        'StructureDefinition-patient-birthPlace.json'
      ]);
      expect(directoryContents.get('operations')).toEqual(['OperationDefinition-MyOD.json']);
      expect(directoryContents.get('profiles')).toEqual([
        'StructureDefinition-MyPatient.json',
        'StructureDefinition-MyTitlePatient.json'
      ]);
      expect(directoryContents.get('resources')).toEqual(['Patient-BazPatient.json']);
      expect(directoryContents.get('vocabulary')).toEqual(['ValueSet-MyVS.json']);
      expect(directoryContents.get('examples')).toEqual([
        'Patient-BarPatient.json',
        'Patient-FooPatient.json' // Renamed from "PoorlyNamedPatient.json"
      ]);
    });

    it('should add basic resource references to the ImplementationGuide resource', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/MyLM'
        },
        name: 'MyLM',
        exampleBoolean: false
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'OperationDefinition/MyOD'
        },
        name: 'Populate Questionnaire', // Use name over ID
        exampleBoolean: false
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/BazPatient'
        },
        name: 'BazPatient',
        exampleBoolean: false
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'ValueSet/MyVS'
        },
        // eslint-disable-next-line
        name: "Yes/No/Don't Know", // Use name over ID
        exampleBoolean: false
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/patient-birthPlace'
        },
        name: 'birthPlace', // Use name over ID
        exampleBoolean: false
      });
    });

    it('should overwrite existing resource references in the ImplementationGuide resource', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      // Should only have one copy of MyPatient
      expect(
        igContent.definition.resource.filter(
          (r: any) => r.reference.reference === 'StructureDefinition/MyPatient'
        )
      ).toHaveLength(1);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/MyPatient'
        },
        name: 'MyPatient',
        exampleBoolean: false
        // Description is overwritten to be null
      });
    });

    it('should add resource references with a description to the ImplementationGuide resource', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'CapabilityStatement/MyCS'
        },
        name: 'Base FHIR Capability Statement (Empty)', // Use name over ID
        description: 'Test description',
        exampleBoolean: false
      });
    });

    it('should add example references to the ImplementationGuide resource', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/FooPatient'
        },
        // Preserve description and name from SUSHI defined Instance
        description: 'This should stay',
        name: 'StayName',
        exampleBoolean: true
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/BarPatient'
        },
        name: 'BarPatient',
        exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/MyPatient'
      });
    });

    it('should add resource references with a title to the ImplementationGuide resource', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/MyTitlePatient'
        },
        name: 'This patient has a title',
        exampleBoolean: false
      });
    });

    it('should log an error for input files missing resourceType or id', () => {
      expect(loggerSpy.getMessageAtIndex(-1, 'error')).toMatch(
        /.*InvalidPatient.json must define resourceType and id/
      );
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
      expect(loggerSpy.getMessageAtIndex(-5, 'error')).toMatch(
        /igi\.ini: sushi does not currently support overriding ig value\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]ig.ini/s
      );
      expect(loggerSpy.getMessageAtIndex(-4, 'error')).toMatch(
        /igi\.ini: license value \(Apache2\.0\) does not match license declared in package\.json \(CC0-1\.0\)\.  Keeping CC0-1\.0\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]ig.ini/s
      );
      expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(
        /igi\.ini: version value \(0\.2\.0\) does not match version declared in package\.json \(0\.1\.0\)\.  Keeping 0\.1\.0\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]ig.ini/s
      );

      // And ensure that invalid inputs did not override existing values
      const iniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(iniPath)).toBeTruthy();
      const content = fs.readFileSync(iniPath, 'utf8');
      expect(content).toEqual(
        [
          '[IG]',
          'ig = input/ImplementationGuide-sushi-test.json',
          'template = hl7.fhir.template',
          'usage-stats-opt-out = true',
          'copyrightyear = 2018+',
          'license = CC0-1.0',
          'version = 0.1.0',
          'ballotstatus = STU1',
          'fhirspec = http://hl7.org/fhir/R4/',
          'excludexml = Yes',
          'excludejson = Yes',
          'excludettl = Yes',
          'excludeMaps = Yes'
        ]
          .map(ln => ln + os.EOL) // Windows: /r/n; Mac: /n
          .join('')
      );
    });

    it('should add pages of an invalid file type but log a warning', () => {
      // Check that pages were added
      const pageContentPath = path.join(tempOut, 'input', 'pagecontent');
      expect(fs.existsSync(pageContentPath)).toBeTruthy();
      const imageFileNames = fs.readdirSync(pageContentPath);
      expect(imageFileNames).toContain('bad.html');

      // Check for log messages indicating invalid input
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Files not in the supported file types \(\.md and \.xml\) were detected\. These files will be copied over without any processing\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]input[\/\\]pagecontent/s
      );
    });

    it('should log an error if supplied package-list.json does not match package.json', () => {
      // Check for log messages indicating invalid input
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        /package-list\.json: package-id value \(wrong-package-id\) does not match name declared in package\.json \(sushi-test\)\.  Ignoring custom package-list\.json\..*File: .*[\/\\]invalid-data-ig[\/\\]ig-data[\/\\]package-list.json/s
      );
      expect(loggerSpy.getMessageAtIndex(-1, 'error')).toMatch(
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

  describe('#sorted-pages-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;

    beforeAll(() => {
      const fixtures = path.join(__dirname, 'fixtures', 'sorted-pages-ig');
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

    it('should add user-provided pages in the user-specified order', () => {
      const pageContentPath = path.join(tempOut, 'input', 'pagecontent');
      expect(fs.existsSync(pageContentPath)).toBeTruthy();

      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toHaveLength(9);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'html'
        },
        {
          nameUrl: 'oranges.html',
          title: 'Oranges',
          generation: 'markdown'
        },
        {
          nameUrl: 'apples.html',
          title: 'Apples',
          generation: 'markdown'
        },
        {
          nameUrl: 'bananas.html',
          title: 'Bananas',
          generation: 'markdown'
        },
        {
          nameUrl: 'pears.html',
          title: 'Pears',
          generation: 'markdown'
        },
        {
          nameUrl: 'left.html',
          title: 'Left',
          generation: 'markdown'
        },
        {
          nameUrl: 'right.html',
          title: 'Right',
          generation: 'markdown'
        },
        {
          nameUrl: 'big.html',
          title: 'Big',
          generation: 'markdown'
        },
        {
          nameUrl: 'pasta.html',
          title: 'Pasta',
          generation: 'markdown'
        }
      ]);
    });

    it('should remove numeric prefixes from copied files', () => {
      const pageContentPath = path.join(tempOut, 'input', 'pagecontent');
      expect(fs.existsSync(pageContentPath)).toBeTruthy();
      const pageContentFiles = fs.readdirSync(pageContentPath);
      expect(pageContentFiles).toHaveLength(9);
      expect(pageContentFiles).toContain('index.xml');
      expect(pageContentFiles).toContain('oranges.md');
      expect(pageContentFiles).toContain('apples.md');
      expect(pageContentFiles).toContain('bananas.md');
      expect(pageContentFiles).toContain('pears.md');
      expect(pageContentFiles).toContain('left.md');
      expect(pageContentFiles).toContain('right.md');
      expect(pageContentFiles).toContain('big.md');
      expect(pageContentFiles).toContain('pasta.md');
    });
  });
  describe('#name-collision-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;

    beforeAll(() => {
      const fixtures = path.join(__dirname, 'fixtures', 'name-collision-ig');
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

    it('should not remove numeric prefixes from page names when doing so would cause name collisions', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toHaveLength(5);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'html'
        },
        {
          nameUrl: '1_rocks.html',
          title: 'Rocks',
          generation: 'markdown'
        },
        {
          nameUrl: '2_rocks.html',
          title: 'Rocks',
          generation: 'markdown'
        },
        {
          nameUrl: '3_index.html',
          title: 'Index',
          generation: 'markdown'
        },
        {
          nameUrl: '4_2_rocks.html',
          title: '2 Rocks',
          generation: 'markdown'
        }
      ]);
    });

    it('should not remove numeric prefixes from files when doing so would cause name collisions', () => {
      const pageContentPath = path.join(tempOut, 'input', 'pagecontent');
      expect(fs.existsSync(pageContentPath)).toBeTruthy();
      const pageContentFiles = fs.readdirSync(pageContentPath);
      expect(pageContentFiles).toHaveLength(5);
      expect(pageContentFiles).toContain('index.xml');
      expect(pageContentFiles).toContain('1_rocks.md');
      expect(pageContentFiles).toContain('2_rocks.md');
      expect(pageContentFiles).toContain('3_index.md');
      expect(pageContentFiles).toContain('4_2_rocks.md');
    });
  });
});
