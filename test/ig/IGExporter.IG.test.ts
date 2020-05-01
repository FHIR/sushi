import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { IGExporter } from '../../src/ig';
import { StructureDefinition, InstanceDefinition, CodeSystem } from '../../src/fhirtypes';
import { Package } from '../../src/export';
import { Configuration, PackageJSON } from '../../src/fshtypes';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { loggerSpy } from '../testhelpers';

describe('IGExporter', () => {
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
      // several parts of the IG exporter still need packageJSON to function
      const packageJSON: PackageJSON = fs.readJSONSync(path.join(fixtures, 'package.json'));
      const config: Configuration = {
        filePath: path.join(fixtures, 'config.yml'),
        id: 'sushi-test',
        canonical: 'http://hl7.org/fhir/sushi-test',
        url: 'http://hl7.org/fhir/sushi-test/ImplementationGuide/FSHTestIG',
        version: '0.1.0',
        name: 'FSHTestIG',
        title: 'FSH Test IG',
        description: 'Provides a simple example of how FSH can be used to create an IG',
        dependencies: [
          { packageId: 'hl7.fhir.us.core', version: '3.1.0' },
          { packageId: 'hl7.fhir.uv.vhdir', version: 'current' }
        ],
        status: 'active',
        template: 'fhir.base.template',
        fhirVersion: ['4.0.1'],
        language: 'en',
        publisher: 'James Tuna',
        contact: [
          {
            name: 'Bill Cod',
            telecom: [
              { system: 'url', value: 'https://capecodfishermen.org/' },
              { system: 'email', value: 'cod@reef.gov' }
            ]
          }
        ],
        license: 'CC0-1.0',
        parameters: [
          {
            code: 'copyrightyear',
            value: '2020+'
          },
          {
            code: 'releaselabel',
            value: 'CI Build'
          }
        ]
      };
      pkg = new Package(packageJSON, config);
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
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
      tempOut = temp.mkdirSync('sushi-test');
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should generate an implementation guide for simple-ig', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content).toEqual({
        resourceType: 'ImplementationGuide',
        id: 'sushi-test',
        language: 'en',
        url: 'http://hl7.org/fhir/sushi-test/ImplementationGuide/FSHTestIG',
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
              value: '2020+'
            },
            {
              code: 'releaselabel',
              value: 'CI Build'
            },
            {
              code: 'path-history',
              value: 'http://hl7.org/fhir/sushi-test/history.html'
            }
          ]
        }
      });
    });
  });

  describe('#customized-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let packageJSON: PackageJSON;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig');
      packageJSON = fs.readJSONSync(path.join(fixtures, 'package.json'));
      tempOut = temp.mkdirSync('sushi-test');
      defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'testPackage',
        defs
      );
    });

    beforeEach(() => {
      config = {
        filePath: path.join(fixtures, 'config.yml'),
        id: 'sushi-test',
        canonical: 'http://hl7.org/fhir/sushi-test',
        version: '0.1.0',
        name: 'sushi-test',
        title: 'FSH Test IG',
        description: 'Provides a simple example of how FSH can be used to create an IG',
        dependencies: [
          { packageId: 'hl7.fhir.us.core', version: '3.1.0' },
          { packageId: 'hl7.fhir.uv.vhdir', version: 'current' }
        ],
        status: 'active',
        template: 'fhir.base.template',
        fhirVersion: ['4.0.1'],
        language: 'en',
        publisher: 'James Tuna',
        contact: [
          {
            name: 'Bill Cod',
            telecom: [
              { system: 'url', value: 'https://capecodfishermen.org/' },
              { system: 'email', value: 'cod@reef.gov' }
            ]
          }
        ],
        license: 'CC0-1.0'
      };
      pkg = new Package(packageJSON, config);
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should provide a default path-history for an HL7 IG', () => {
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).toContainEqual({
        code: 'path-history',
        value: 'http://hl7.org/fhir/sushi-test/history.html'
      });
    });

    it('should not provide a default path-history for a non-HL7 IG', () => {
      config.canonical = 'http://different-domain.org/fhir/sushi-test';
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).not.toContainEqual(
        expect.objectContaining({
          code: 'path-history'
        })
      );
    });
    it('should use configured pages when provided', () => {
      config.pages = [
        {
          nameUrl: 'index.md',
          title: 'Home',
          generation: 'markdown'
        },
        {
          nameUrl: 'other-page.md',
          title: 'Some Other Page',
          generation: 'markdown'
        }
      ];
      exporter.export(tempOut);
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
          title: 'Some Other Page',
          generation: 'markdown'
        }
      ]);
    });

    it('should provide default title and generation for configured pages when no title is provided', () => {
      config.pages = [
        {
          nameUrl: 'index.md',
          title: 'Home',
          generation: 'markdown'
        },
        {
          nameUrl: 'other-page.md'
        },
        {
          nameUrl: 'something-special.xml',
          generation: 'xml'
        },
        {
          nameUrl: 'unsupported.html'
        }
      ];
      exporter.export(tempOut);
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
        },
        {
          nameUrl: 'something-special.html',
          title: 'Something Special',
          generation: 'xml'
        },
        {
          nameUrl: 'unsupported.html',
          title: 'Unsupported',
          generation: 'html'
        }
      ]);
    });

    it('should maintain page hierarchy for configured pages', () => {
      config.pages = [
        {
          nameUrl: 'index.md',
          title: 'Home',
          generation: 'markdown',
          page: [
            {
              nameUrl: 'something-special.xml',
              title: 'Something Special',
              generation: 'xml'
            },
            {
              nameUrl: 'other-page.md',
              title: 'Other Page',
              generation: 'markdown',
              page: [
                {
                  nameUrl: 'unsupported.html',
                  title: 'Unsupported',
                  generation: 'html'
                }
              ]
            }
          ]
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'markdown',
          page: [
            {
              nameUrl: 'something-special.html',
              title: 'Something Special',
              generation: 'xml'
            },
            {
              nameUrl: 'other-page.html',
              title: 'Other Page',
              generation: 'markdown',
              page: [
                {
                  nameUrl: 'unsupported.html',
                  title: 'Unsupported',
                  generation: 'html'
                }
              ]
            }
          ]
        }
      ]);
    });

    it('should log an error when no file exists for a configured page', () => {
      config.pages = [
        {
          nameUrl: 'index.md',
          title: 'Home',
          generation: 'markdown'
        },
        {
          nameUrl: 'nothing.md',
          title: 'Nothing',
          generation: 'markdown'
        }
      ];
      exporter.export(tempOut);
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
          nameUrl: 'nothing.html',
          title: 'Nothing',
          generation: 'markdown'
        }
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(/nothing\.md not found/s);
    });
  });

  describe('#pages-folder-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let packageJSON: PackageJSON;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      fixtures = path.join(__dirname, 'fixtures', 'pages-folder-ig');
      packageJSON = fs.readJSONSync(path.join(fixtures, 'package.json'));
      defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'testPackage',
        defs
      );
    });

    beforeEach(() => {
      tempOut = temp.mkdirSync('sushi-test');
      config = {
        filePath: path.join(fixtures, 'config.yml'),
        id: 'sushi-test',
        canonical: 'http://hl7.org/fhir/sushi-test',
        version: '0.1.0',
        name: 'sushi-test',
        title: 'FSH Test IG',
        description: 'Provides a simple example of how FSH can be used to create an IG',
        status: 'active',
        template: 'fhir.base.template',
        fhirVersion: ['4.0.1'],
        language: 'en',
        publisher: 'Georgio Manos',
        license: 'CC0-1.0'
      };
      pkg = new Package(packageJSON, config);
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should use all available page content when pages are not configured', () => {
      exporter.export(tempOut);
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
          nameUrl: 'extra.html',
          title: 'Extra',
          generation: 'html'
        },
        {
          nameUrl: 'other-page.html',
          title: 'Other Page',
          generation: 'markdown'
        }
      ]);
      expect(fs.existsSync(path.join(tempOut, 'input', 'pagecontent', 'extra.xml'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, 'input', 'pages', 'index.md'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, 'input', 'pages', 'other-page.md'))).toBeTruthy();
      expect(
        fs.existsSync(path.join(tempOut, 'input', 'resource-docs', 'other-page-notes.md'))
      ).toBeTruthy();
    });

    it('should include only configured pages when provided, but still copy all available files', () => {
      config.pages = [
        {
          nameUrl: 'index.md',
          title: 'Home Page',
          generation: 'markdown'
        },
        {
          nameUrl: 'extra.xml',
          title: 'Extra!',
          generation: 'html'
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home Page',
          generation: 'markdown'
        },
        {
          nameUrl: 'extra.html',
          title: 'Extra!',
          generation: 'html'
        }
      ]);
      expect(fs.existsSync(path.join(tempOut, 'input', 'pagecontent', 'extra.xml'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, 'input', 'pages', 'index.md'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempOut, 'input', 'pages', 'other-page.md'))).toBeTruthy();
      expect(
        fs.existsSync(path.join(tempOut, 'input', 'resource-docs', 'other-page-notes.md'))
      ).toBeTruthy();
    });
  });
});
