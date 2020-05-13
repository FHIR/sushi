import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { IGExporter } from '../../src/ig';
import {
  StructureDefinition,
  InstanceDefinition,
  CodeSystem,
  ImplementationGuideDefinitionResource,
  ImplementationGuide
} from '../../src/fhirtypes';
import { Package } from '../../src/export';
import { Configuration } from '../../src/fshtypes';
import { FHIRDefinitions, loadFromPath, loadCustomResources } from '../../src/fhirdefs';
import { loggerSpy, TestFisher } from '../testhelpers';
import { cloneDeep } from 'lodash';
import { minimalConfig } from '../utils/minimalConfig';

describe('IGExporter', () => {
  temp.track();

  describe('#simple-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    const pkgProfiles: StructureDefinition[] = [];
    const pkgExtensions: StructureDefinition[] = [];
    const pkgInstances: InstanceDefinition[] = [];
    const pkgCodeSystems: CodeSystem[] = [];

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'testPackage',
        defs
      );
      fixtures = path.join(__dirname, 'fixtures', 'simple-ig');

      const profiles = path.join(fixtures, 'profiles');
      fs.readdirSync(profiles).forEach(f => {
        if (f.endsWith('.json')) {
          const sd = StructureDefinition.fromJSON(fs.readJSONSync(path.join(profiles, f)));
          pkgProfiles.push(sd);
        }
      });
      const extensions = path.join(fixtures, 'extensions');
      fs.readdirSync(extensions).forEach(f => {
        if (f.endsWith('.json')) {
          const sd = StructureDefinition.fromJSON(fs.readJSONSync(path.join(extensions, f)));
          pkgExtensions.push(sd);
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
          pkgInstances.push(instanceDef);
        }
      });

      // Add CodeSystem directly because there is no fromJSON method on the class
      const codeSystemDef = new CodeSystem();
      codeSystemDef.id = 'sample-code-system';
      codeSystemDef.name = 'SampleCodeSystem';
      codeSystemDef.description = 'A code system description';
      pkgCodeSystems.push(codeSystemDef);
      tempOut = temp.mkdirSync('sushi-test');
    });

    beforeEach(() => {
      config = {
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
        ],
        history: {} // to suppress warning for HL7 IGs
      };
      pkg = new Package(config);
      pkg.profiles.push(...pkgProfiles);
      pkg.extensions.push(...pkgExtensions);
      pkg.instances.push(...pkgInstances);
      pkg.codeSystems.push(...pkgCodeSystems);
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should generate an implementation guide for simple-ig', () => {
      exporter.export(tempOut);
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
            page: [] // no index file specified for this ig
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

    it('should override generated resource attributes with configured attributes', () => {
      config.resources = [
        {
          reference: { reference: 'StructureDefinition/sample-observation' },
          name: 'ConfiguredSampleObservation',
          description: 'This is a specially configured description'
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const sampleObservation: ImplementationGuideDefinitionResource = content.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'StructureDefinition/sample-observation'
      );
      expect(sampleObservation).toEqual({
        reference: { reference: 'StructureDefinition/sample-observation' },
        name: 'ConfiguredSampleObservation',
        description: 'This is a specially configured description',
        exampleBoolean: false
      });
    });

    it('should omit resources that are configured to be omitted', () => {
      config.resources = [
        {
          reference: { reference: 'StructureDefinition/sample-observation' },
          omit: true
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const sampleObservation: ImplementationGuideDefinitionResource = content.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'StructureDefinition/sample-observation'
      );
      expect(sampleObservation).toBeUndefined();
    });

    it('should add resources that are only present in configuration', () => {
      config.resources = [
        {
          reference: { reference: 'StructureDefinition/config-only-observation' },
          name: 'ConfigOnlyObservation',
          description: 'This resource is only in the configuration.'
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const configOnlyObservation: ImplementationGuideDefinitionResource = content.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'StructureDefinition/config-only-observation'
      );
      expect(configOnlyObservation).toEqual({
        reference: {
          reference: 'StructureDefinition/config-only-observation'
        },
        name: 'ConfigOnlyObservation',
        description: 'This resource is only in the configuration.'
      });
    });

    it('should create groups based on configured resource groupingId values', () => {
      config.resources = [
        {
          reference: { reference: 'StructureDefinition/sample-patient' },
          groupingId: 'MyPatientGroup'
        },
        {
          reference: { reference: 'Patient/patient-example' },
          groupingId: 'MyPatientGroup'
        },
        {
          reference: { reference: 'StructureDefinition/sample-observation' },
          groupingId: 'MyObservationGroup'
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content.definition.grouping).toHaveLength(2);
      expect(content.definition.grouping).toContainEqual({ name: 'MyPatientGroup' });
      expect(content.definition.grouping).toContainEqual({ name: 'MyObservationGroup' });
    });

    it('should create groups for each configured group', () => {
      config.groups = [
        {
          name: 'MyPatientGroup',
          description: 'Group for some patient-related things.',
          resources: ['StructureDefinition/sample-patient', 'Patient/patient-example']
        },
        {
          name: 'MyObservationGroup',
          description: 'Group for some observation-related things.',
          resources: ['StructureDefinition/sample-observation']
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content.definition.grouping).toContainEqual({
        name: 'MyPatientGroup',
        description: 'Group for some patient-related things.'
      });
      expect(content.definition.grouping).toContainEqual({
        name: 'MyObservationGroup',
        description: 'Group for some observation-related things.'
      });
      const samplePatient: ImplementationGuideDefinitionResource = content.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'StructureDefinition/sample-patient'
      );
      expect(samplePatient.groupingId).toBe('MyPatientGroup');
      const examplePatient: ImplementationGuideDefinitionResource = content.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'Patient/patient-example'
      );
      expect(examplePatient.groupingId).toBe('MyPatientGroup');
      const sampleObservation: ImplementationGuideDefinitionResource = content.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'StructureDefinition/sample-observation'
      );
      expect(sampleObservation.groupingId).toBe('MyObservationGroup');
    });

    it('should log an error when a group is configured with a nonexistent resource', () => {
      config.groups = [
        {
          name: 'BananaGroup',
          description: 'Holds all the bananas.',
          resources: ['StructureDefinition/sample-banana']
        }
      ];
      exporter.export(tempOut);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /BananaGroup configured with nonexistent resource StructureDefinition\/sample-banana/s
      );
    });

    it('should log an error when a resource has a groupingId, but a different group claims it', () => {
      config.resources = [
        {
          reference: { reference: 'StructureDefinition/sample-patient' },
          groupingId: 'Montagues'
        }
      ];
      config.groups = [
        {
          name: 'Capulets',
          resources: ['StructureDefinition/sample-patient']
        }
      ];
      exporter.export(tempOut);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /StructureDefinition\/sample-patient configured with groupingId Montagues.*member of group Capulets/s
      );
    });

    it('should log a warning when a resource is a member of a group and has a redundant groupingId', () => {
      config.resources = [
        {
          reference: { reference: 'StructureDefinition/sample-patient' },
          groupingId: 'JustOneGroup'
        }
      ];
      config.groups = [
        {
          name: 'JustOneGroup',
          resources: ['StructureDefinition/sample-patient']
        }
      ];
      exporter.export(tempOut);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /StructureDefinition\/sample-patient is listed as a member of group JustOneGroup.*does not need a groupingId/s
      );
    });
  });

  describe('#customized-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig');
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
      pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should provide a default path-history for an HL7 IG', () => {
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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

    it('should copy over the templates property', () => {
      config.templates = [
        {
          code: 'foo',
          source: 'bar',
          scope: 'mouthwash'
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.template).toEqual([
        {
          code: 'foo',
          source: 'bar',
          scope: 'mouthwash'
        }
      ]);
    });
  });

  describe('#customized-ig-with-resources', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'testPackage',
        defs
      );
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-resources');
      loadCustomResources(fixtures, defs);
      tempOut = temp.mkdirSync('sushi-test');
    });

    beforeEach(() => {
      config = cloneDeep(minimalConfig);
      pkg = new Package(config);
      // Add a patient to the package that will be overwritten
      const fisher = new TestFisher(null, defs, pkg);
      const patient = fisher.fishForStructureDefinition('Patient');
      patient.id = 'MyPatient';
      patient.name = 'MyPatient';
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
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should copy over resource files', () => {
      exporter.export(tempOut);
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
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-fhir.us.minimal.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-fhir.us.minimal.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-fhir.us.minimal.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-fhir.us.minimal.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-fhir.us.minimal.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/MyTitlePatient'
        },
        name: 'This patient has a title',
        exampleBoolean: false
      });
    });

    it('should omit predefined resources that are configured to be omitted', () => {
      config.resources = [
        {
          reference: {
            reference: 'StructureDefinition/MyPatient'
          },
          omit: true
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-fhir.us.minimal.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      const myPatient: ImplementationGuideDefinitionResource = igContent.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'StructureDefinition/MyPatient'
      );
      expect(myPatient).toBeUndefined();
    });

    it('should log an error for input files missing resourceType or id', () => {
      exporter.export(tempOut);
      expect(loggerSpy.getMessageAtIndex(-1, 'error')).toMatch(
        /.*InvalidPatient.json must define resourceType and id/
      );
    });
  });

  describe('#pages-folder-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      fixtures = path.join(__dirname, 'fixtures', 'pages-folder-ig');
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
      pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should use all available page content when pages are not configured', () => {
      exporter.export(tempOut);
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-sushi-test.json');
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
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
