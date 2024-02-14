import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { loadFromPath } from 'fhir-package-loader';
import { IGExporter } from '../../src/ig';
import {
  StructureDefinition,
  InstanceDefinition,
  CodeSystem,
  ImplementationGuideDefinitionResource,
  ImplementationGuide,
  ImplementationGuideDependsOn
} from '../../src/fhirtypes';
import { Package } from '../../src/export';
import { Configuration } from '../../src/fshtypes';
import { FHIRDefinitions, loadCustomResources } from '../../src/fhirdefs';
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
        path.join(__dirname, '..', 'testhelpers', 'testdefs'),
        'fhir.no.ig.package#1.0.1',
        defs
      );
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
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
            instanceDef._instanceMeta.instanceOfUrl =
              'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient';
          }
          if (instanceDef.id === 'patient-example-three') {
            instanceDef._instanceMeta.usage = 'Inline';
            instanceDef._instanceMeta.instanceOfUrl =
              'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient';
          }
          if (instanceDef.id === 'capability-statement-example') {
            instanceDef._instanceMeta.usage = 'Definition';
          }
          if (instanceDef.id === 'patient-example') {
            instanceDef._instanceMeta.usage = 'Example'; // Default would be set to example in import
            instanceDef._instanceMeta.instanceOfUrl =
              'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient';
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
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = {
        filePath: path.join(fixtures, 'sushi-config.yml'),
        id: 'sushi-test',
        canonical: 'http://hl7.org/fhir/sushi-test',
        url: 'http://hl7.org/fhir/sushi-test/ImplementationGuide/FSHTestIG',
        version: '0.1.0',
        name: 'FSHTestIG',
        title: 'FSH Test IG',
        description: 'Provides a simple example of how FSH can be used to create an IG',
        dependencies: [
          { packageId: 'hl7.fhir.us.core', version: '3.1.0' },
          { packageId: 'hl7.fhir.uv.vhdir', version: 'current' },
          {
            packageId: 'hl7.fhir.us.mcode',
            uri: 'http://hl7.org/fhir/us/mcode/ImplementationGuide/hl7.fhir.us.mcode',
            id: 'mcode',
            version: '1.0.0'
          },
          {
            packageId: 'hl7.package.with.extension',
            version: '1.0.0',
            id: 'package.with.extension',
            extension: [
              {
                url: 'http://example.org/fake/StructureDefinition/bar',
                valueString: 'bar'
              }
            ]
          }
        ],
        resources: [
          {
            reference: { reference: 'Patient/patient-example' },
            name: 'Patient Example',
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
                valueCode: 'text/plain'
              }
            ]
          },
          {
            reference: { reference: 'StructureDefinition/sample-patient' },
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
                valueCode: 'text/plain'
              }
            ]
          }
        ],
        status: 'active',
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
      pkg = new Package(config);
      pkg.profiles.push(...pkgProfiles);
      pkg.extensions.push(...pkgExtensions);
      pkg.instances.push(...pkgInstances);
      pkg.codeSystems.push(...pkgCodeSystems);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should generate an implementation guide for simple-ig', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
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
            id: 'hl7_fhir_us_core',
            uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
            packageId: 'hl7.fhir.us.core',
            version: '3.1.0'
          },
          // VHDir tests that it works with a package dependency w/ "current"
          {
            id: 'hl7_fhir_uv_vhdir',
            uri: 'http://hl7.org/fhir/uv/vhdir/ImplementationGuide/hl7.core.uv.vhdir',
            packageId: 'hl7.fhir.uv.vhdir',
            version: 'current'
          },
          // mCODE tests that it works with the url and id explicitly provided in the config
          {
            id: 'mcode',
            uri: 'http://hl7.org/fhir/us/mcode/ImplementationGuide/hl7.fhir.us.mcode',
            packageId: 'hl7.fhir.us.mcode',
            version: '1.0.0'
          },
          // package.with.extension tests that extensions are passed from config to ig resource
          {
            id: 'package.with.extension',
            uri: 'http://fhir.org/packages/hl7.package.with.extension/ImplementationGuide/hl7.package.with.extension',
            packageId: 'hl7.package.with.extension',
            version: '1.0.0',
            extension: [
              {
                url: 'http://example.org/fake/StructureDefinition/bar',
                valueString: 'bar'
              }
            ]
          }
        ],
        definition: {
          resource: [
            // resources are ordered by name (case-insensitive)
            {
              reference: {
                reference: 'Patient/patient-example-two'
              },
              name: 'Another Patient Example',
              description: 'Another example of a Patient',
              exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient' // Usage set to Example sets this to InstanceOf url
            },
            {
              reference: {
                reference: 'CapabilityStatement/capability-statement-example'
              },
              name: 'capability-statement-example',
              description: 'Test description',
              exampleBoolean: false // Not 'Example' Usages will set this to false
            },
            {
              reference: {
                reference: 'Patient/patient-example'
              },
              name: 'Patient Example', // Name from config overrides _instanceMeta.name
              extension: [
                // Extension is added from config
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
                  valueCode: 'text/plain'
                }
              ],
              exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient' // No defined Usage on FSH file means this is an example
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
              extension: [
                // Extension is added from config
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
                  valueCode: 'text/plain'
                }
              ],
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

    it('should not carry over the special virtual extension package dependencies', () => {
      config.dependencies = [
        { packageId: 'hl7.fhir.us.core', version: '3.1.0' },
        { packageId: 'hl7.fhir.extensions.r2', version: '4.0.1' },
        { packageId: 'hl7.fhir.extensions.r3', version: '4.0.1' },
        { packageId: 'hl7.fhir.extensions.r4', version: '4.0.1' },
        { packageId: 'hl7.fhir.extensions.r5', version: '4.0.1' }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const dependencies: ImplementationGuideDependsOn[] = content.dependsOn;
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
      // Ensure US Core is exported but special fhir extension packages are not
      expect(dependencies).toEqual([
        {
          id: 'hl7_fhir_us_core',
          uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
          packageId: 'hl7.fhir.us.core',
          version: '3.1.0'
        }
      ]);
    });

    it('should get a canonical from package.json when a dependency has no implementation guide', () => {
      config.dependencies = [
        { packageId: 'fhir.no.ig.package', version: '1.0.1' },
        { packageId: 'hl7.fhir.us.core', version: '3.1.0' }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const dependencies: ImplementationGuideDependsOn[] = content.dependsOn;
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
      // ensure both packages are in the dependencies
      expect(dependencies).toEqual([
        {
          id: 'fhir_no_ig_package',
          uri: 'http://example.org/fhir/no/ig/package',
          packageId: 'fhir.no.ig.package',
          version: '1.0.1'
        },
        {
          id: 'hl7_fhir_us_core',
          uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
          packageId: 'hl7.fhir.us.core',
          version: '3.1.0'
        }
      ]);
    });

    it('should use a default url format when a dependency url cannot be inferred', () => {
      config.dependencies = [
        // NOTE: Will not find mCODE IG URL because we didn't load the mcode IG
        { packageId: 'hl7.fhir.us.mcode', version: '1.0.0' },
        { packageId: 'hl7.fhir.us.core', version: '3.1.0' }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const dependencies: ImplementationGuideDependsOn[] = content.dependsOn;
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
      // Ensure US Core is exported but mCODE is not
      expect(dependencies).toEqual([
        {
          id: 'hl7_fhir_us_mcode',
          uri: 'http://fhir.org/packages/hl7.fhir.us.mcode/ImplementationGuide/hl7.fhir.us.mcode',
          packageId: 'hl7.fhir.us.mcode',
          version: '1.0.0'
        },
        {
          id: 'hl7_fhir_us_core',
          uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
          packageId: 'hl7.fhir.us.core',
          version: '3.1.0'
        }
      ]);
    });

    it('should issue an error when a dependency version is not provided', () => {
      config.dependencies = [
        // NOTE: version is intentionally missing
        {
          packageId: 'hl7.fhir.us.mcode',
          uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core'
        },
        { packageId: 'hl7.fhir.us.core', version: '3.1.0' }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const dependencies: ImplementationGuideDependsOn[] = content.dependsOn;
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Failed to add hl7\.fhir\.us\.mcode to ImplementationGuide instance .* no version/
      );
      // Ensure US Core is exported but mCODE is not
      expect(dependencies).toEqual([
        {
          id: 'hl7_fhir_us_core',
          uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
          packageId: 'hl7.fhir.us.core',
          version: '3.1.0'
        }
      ]);
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const sampleObservation: ImplementationGuideDefinitionResource =
        content.definition.resource.find(
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const sampleObservation: ImplementationGuideDefinitionResource =
        content.definition.resource.find(
          (r: ImplementationGuideDefinitionResource) =>
            r?.reference?.reference === 'StructureDefinition/sample-observation'
        );
      expect(sampleObservation).toBeUndefined();
    });

    it('should add resources in the order in the configuration when all generated resources are in the configuration', () => {
      config.resources = [
        {
          reference: { reference: 'StructureDefinition/sample-observation' }
        },
        {
          reference: { reference: 'StructureDefinition/sample-patient' }
        },
        {
          reference: { reference: 'Patient/patient-example' },
          name: 'Patient Example'
        },
        {
          reference: { reference: 'Patient/patient-example-two' },
          name: 'Patient Example The Second'
        },
        {
          reference: {
            reference: 'CapabilityStatement/capability-statement-example'
          }
        },
        {
          reference: {
            reference: 'StructureDefinition/sample-complex-extension'
          }
        },
        {
          reference: {
            reference: 'StructureDefinition/sample-value-extension'
          }
        },
        {
          reference: {
            reference: 'CodeSystem/sample-code-system'
          }
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content.definition.resource).toEqual([
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
            reference: 'Patient/patient-example'
          },
          name: 'Patient Example', // Name from config overrides _instanceMeta.name
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient' // No defined Usage on FSH file means this is an example
        },
        {
          reference: {
            reference: 'Patient/patient-example-two'
          },
          name: 'Patient Example The Second',
          description: 'Another example of a Patient',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient' // Usage set to Example sets this to InstanceOf url
        },
        {
          reference: {
            reference: 'CapabilityStatement/capability-statement-example'
          },
          name: 'capability-statement-example',
          description: 'Test description',
          exampleBoolean: false // Not 'Example' Usages will set this to false
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
        }
      ]);
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      const configOnlyObservation: ImplementationGuideDefinitionResource =
        content.definition.resource.find(
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content.definition.grouping).toHaveLength(2);
      expect(content.definition.grouping).toContainEqual({
        id: 'MyPatientGroup',
        name: 'MyPatientGroup'
      });
      expect(content.definition.grouping).toContainEqual({
        id: 'MyObservationGroup',
        name: 'MyObservationGroup'
      });
    });

    it('should create groups for each configured group', () => {
      config.groups = [
        {
          id: 'MyPatientGroup',
          name: 'My Patient Group',
          description: 'Group for some patient-related things.',
          resources: ['StructureDefinition/sample-patient', 'Patient/patient-example']
        },
        {
          id: 'MyObservationGroup',
          name: 'My Observation Group',
          description: 'Group for some observation-related things.',
          resources: ['StructureDefinition/sample-observation']
        },
        {
          id: 'MyEmptyGroup',
          name: 'My Empty Group',
          description: 'A group for when nothing is better than something.'
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content.definition.grouping).toContainEqual({
        id: 'MyPatientGroup',
        name: 'My Patient Group',
        description: 'Group for some patient-related things.'
      });
      expect(content.definition.grouping).toContainEqual({
        id: 'MyObservationGroup',
        name: 'My Observation Group',
        description: 'Group for some observation-related things.'
      });
      expect(content.definition.grouping).toContainEqual({
        id: 'MyEmptyGroup',
        name: 'My Empty Group',
        description: 'A group for when nothing is better than something.'
      });
      const samplePatient: ImplementationGuideDefinitionResource = content.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'StructureDefinition/sample-patient'
      );
      expect(samplePatient.groupingId).toBe('MyPatientGroup');
      const examplePatient: ImplementationGuideDefinitionResource =
        content.definition.resource.find(
          (r: ImplementationGuideDefinitionResource) =>
            r?.reference?.reference === 'Patient/patient-example'
        );
      expect(examplePatient.groupingId).toBe('MyPatientGroup');
      const sampleObservation: ImplementationGuideDefinitionResource =
        content.definition.resource.find(
          (r: ImplementationGuideDefinitionResource) =>
            r?.reference?.reference === 'StructureDefinition/sample-observation'
        );
      expect(sampleObservation.groupingId).toBe('MyObservationGroup');
    });

    it('should add resources in the order given in the configured groups when all resources are listed in configured groups', () => {
      config.groups = [
        {
          id: 'PatientGroup',
          name: 'Patient Group',
          description: 'Has patient-related resources.',
          resources: [
            'StructureDefinition/sample-patient',
            'Patient/patient-example',
            'Patient/patient-example-two'
          ]
        },
        {
          id: 'ExtensionGroup',
          name: 'Extension Group',
          description: 'Has extensions of all varieties.',
          resources: [
            'StructureDefinition/sample-complex-extension',
            'StructureDefinition/sample-value-extension'
          ]
        },
        {
          id: 'CatawumpusGroup',
          name: 'Catawumpus Group',
          description: 'Has everything else.',
          resources: [
            'StructureDefinition/sample-observation',
            'CapabilityStatement/capability-statement-example',
            'CodeSystem/sample-code-system'
          ]
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content.definition.resource).toEqual([
        {
          reference: {
            reference: 'StructureDefinition/sample-patient'
          },
          name: 'SamplePatient',
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
              valueCode: 'text/plain'
            }
          ],
          description:
            'Demographics and other administrative information about an individual or animal receiving care or other health-related services.',
          exampleBoolean: false,
          groupingId: 'PatientGroup'
        },
        {
          reference: {
            reference: 'Patient/patient-example'
          },
          name: 'Patient Example', // Name from config overrides _instanceMeta.name
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
              valueCode: 'text/plain'
            }
          ],
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient', // No defined Usage on FSH file means this is an example
          groupingId: 'PatientGroup'
        },
        {
          reference: {
            reference: 'Patient/patient-example-two'
          },
          name: 'Another Patient Example',
          description: 'Another example of a Patient',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient', // Usage set to Example sets this to InstanceOf url
          groupingId: 'PatientGroup'
        },
        {
          reference: {
            reference: 'StructureDefinition/sample-complex-extension'
          },
          name: 'SampleComplexExtension',
          description:
            'Base StructureDefinition for Extension Type: Optional Extension Element - found in all resources.',
          exampleBoolean: false,
          groupingId: 'ExtensionGroup'
        },
        {
          reference: {
            reference: 'StructureDefinition/sample-value-extension'
          },
          name: 'SampleValueExtension',
          description:
            'Base StructureDefinition for Extension Type: Optional Extension Element - found in all resources.',
          exampleBoolean: false,
          groupingId: 'ExtensionGroup'
        },
        {
          reference: {
            reference: 'StructureDefinition/sample-observation'
          },
          name: 'SampleObservation',
          description:
            'Measurements and simple assertions made about a patient, device or other subject.',
          exampleBoolean: false,
          groupingId: 'CatawumpusGroup'
        },
        {
          reference: {
            reference: 'CapabilityStatement/capability-statement-example'
          },
          name: 'capability-statement-example',
          description: 'Test description',
          exampleBoolean: false, // Not 'Example' Usages will set this to false
          groupingId: 'CatawumpusGroup'
        },
        {
          reference: {
            reference: 'CodeSystem/sample-code-system'
          },
          name: 'SampleCodeSystem',
          description: 'A code system description',
          exampleBoolean: false,
          groupingId: 'CatawumpusGroup'
        }
      ]);
    });

    it('should log an error when a group is configured with a nonexistent resource', () => {
      config.groups = [
        {
          id: 'BananaGroup',
          name: 'Banana Group',
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
          id: 'Capulets',
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
          id: 'JustOneGroup',
          name: 'Just One Group',
          resources: ['StructureDefinition/sample-patient']
        }
      ];
      exporter.export(tempOut);
      expect(loggerSpy.getFirstMessage('warn')).toMatch(
        /StructureDefinition\/sample-patient is listed as a member of group JustOneGroup.*does not need a groupingId/s
      );
    });
  });

  describe('#simple-ig-plus', () => {
    // Same as '#simple-ig' with logical model and custom resource included in the package
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    const pkgProfiles: StructureDefinition[] = [];
    const pkgExtensions: StructureDefinition[] = [];
    const pkgLogicals: StructureDefinition[] = [];
    const pkgResources: StructureDefinition[] = [];

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      fixtures = path.join(__dirname, 'fixtures', 'simple-ig-plus');

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
      const logicals = path.join(fixtures, 'logicals');
      fs.readdirSync(logicals).forEach(f => {
        if (f.endsWith('.json')) {
          const sd = StructureDefinition.fromJSON(fs.readJSONSync(path.join(logicals, f)));
          pkgLogicals.push(sd);
        }
      });
      const resources = path.join(fixtures, 'resources');
      fs.readdirSync(resources).forEach(f => {
        if (f.endsWith('.json')) {
          const sd = StructureDefinition.fromJSON(fs.readJSONSync(path.join(resources, f)));
          pkgResources.push(sd);
        }
      });
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = {
        filePath: path.join(fixtures, 'sushi-config.yml'),
        id: 'sushi-test',
        canonical: 'http://hl7.org/fhir/sushi-test',
        url: 'http://hl7.org/fhir/sushi-test/ImplementationGuide/FSHTestIG',
        version: '0.1.0',
        name: 'FSHTestIG',
        title: 'FSH Test IG',
        description: 'Provides a simple example of how FSH can be used to create an IG',
        dependencies: [
          { packageId: 'hl7.fhir.us.core', version: '3.1.0' },
          { packageId: 'hl7.fhir.uv.vhdir', version: 'current' },
          {
            packageId: 'hl7.fhir.us.mcode',
            uri: 'http://hl7.org/fhir/us/mcode/ImplementationGuide/hl7.fhir.us.mcode',
            id: 'mcode',
            version: '1.0.0'
          }
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
      pkg.logicals.push(...pkgLogicals);
      pkg.resources.push(...pkgResources);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should generate an implementation guide for simple-ig with package containing logical model and custom resource and also ignore custom resource and its instance(s)', () => {
      // Add instance of custom resource and base resource
      const customResourceInstance = new InstanceDefinition();
      customResourceInstance.resourceType = 'CustomResource';
      customResourceInstance.id = 'FooResource';
      customResourceInstance._instanceMeta.description = 'CustomResource Description';
      customResourceInstance._instanceMeta.name = 'CustomResource name';
      customResourceInstance._instanceMeta.usage = 'Example';
      const patientInstance = new InstanceDefinition();
      patientInstance.resourceType = 'Patient';
      patientInstance.id = 'FooPatient';
      patientInstance._instanceMeta.description = 'Sample description';
      patientInstance._instanceMeta.name = 'Sample name';
      patientInstance._instanceMeta.usage = 'Example';
      pkg.instances.push(customResourceInstance, patientInstance);

      // Export
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      // Expectations:
      // - resource array contains object for 'StructureDefinition/CustomLogicalModel'
      // - resource array DOES NOT contain object for 'StructureDefinition/CustomResource'
      //   = It is not possible to include custom resources in IGs
      // - parameter array contains object for 'autoload-resources'
      //   = Because custom resources are included in the package being exported,
      //     this parameter is automatically injected and set to false
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
            id: 'hl7_fhir_us_core',
            uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
            packageId: 'hl7.fhir.us.core',
            version: '3.1.0'
          },
          // VHDir tests that it works with a package dependency w/ "current"
          {
            id: 'hl7_fhir_uv_vhdir',
            uri: 'http://hl7.org/fhir/uv/vhdir/ImplementationGuide/hl7.core.uv.vhdir',
            packageId: 'hl7.fhir.uv.vhdir',
            version: 'current'
          },
          // mCODE tests that it works with the url and id explicitly provided in the config
          {
            id: 'mcode',
            uri: 'http://hl7.org/fhir/us/mcode/ImplementationGuide/hl7.fhir.us.mcode',
            packageId: 'hl7.fhir.us.mcode',
            version: '1.0.0'
          }
        ],
        definition: {
          resource: [
            {
              reference: {
                reference: 'StructureDefinition/CustomLogicalModel'
              },
              name: 'Custom Logical Model Defined with FSH',
              description:
                'This is an example of a custom logical model defined using FSH with parent of Element',
              exampleBoolean: false
            },
            {
              reference: {
                reference: 'Patient/FooPatient'
              },
              name: 'Sample name',
              description: 'Sample description',
              exampleBoolean: true
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
                reference: 'StructureDefinition/sample-observation'
              },
              name: 'SampleObservation',
              description:
                'Measurements and simple assertions made about a patient, device or other subject.',
              exampleBoolean: false
            }
            // CustomResource and CustomResourceInstance are excluded because they are Custom Resources
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
            },
            {
              code: 'autoload-resources',
              value: 'false'
            }
          ]
        }
      });
    });

    it('should generate an implementation guide for simple-ig with package containing logical model and custom resource and logical model instance', () => {
      // Remove custom resources
      pkg.resources.length = 0;

      // Add instance of logical model
      const customLogicalInstance = new InstanceDefinition();
      customLogicalInstance.resourceType =
        'http://hl7.org/fhir/sushi-test/StructureDefinition/CustomLogicalModel';
      customLogicalInstance.id = 'Bob';
      customLogicalInstance.username = 'bob';
      customLogicalInstance.userId = 1;
      customLogicalInstance._instanceMeta.description = 'Example of CustomLogicalModel';
      customLogicalInstance._instanceMeta.name = 'Bob';
      customLogicalInstance._instanceMeta.usage = 'Example';
      customLogicalInstance._instanceMeta.instanceOfUrl =
        'http://hl7.org/fhir/sushi-test/StructureDefinition/CustomLogicalModel';
      customLogicalInstance._instanceMeta.sdType =
        'http://hl7.org/fhir/sushi-test/StructureDefinition/CustomLogicalModel';
      customLogicalInstance._instanceMeta.sdKind = 'logical';
      pkg.instances.push(customLogicalInstance);

      // Export
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      // Expectations:
      // - resource array contains object for 'StructureDefinition/CustomLogicalModel'
      // - resource array contains object for 'Binary/Bob' with appropriate extension
      expect(content.definition.resource).toEqual([
        {
          reference: { reference: 'Binary/Bob' },
          name: 'Bob',
          description: 'Example of CustomLogicalModel',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/CustomLogicalModel',
          extension: [
            {
              url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
              valueCode: 'application/fhir+json'
            }
          ]
        },
        {
          reference: {
            reference: 'StructureDefinition/CustomLogicalModel'
          },
          name: 'Custom Logical Model Defined with FSH',
          description:
            'This is an example of a custom logical model defined using FSH with parent of Element',
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
            reference: 'StructureDefinition/sample-observation'
          },
          name: 'SampleObservation',
          description:
            'Measurements and simple assertions made about a patient, device or other subject.',
          exampleBoolean: false
        }
      ]);
    });
  });

  describe('#simple-ig-meta-profile/package', () => {
    // Patient Profiles and Examples from '#simple-ig',
    // but the examples have meta.profile specified with versions
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    const pkgProfiles: StructureDefinition[] = [];
    const pkgInstances: InstanceDefinition[] = [];

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs'),
        'fhir.no.ig.package#1.0.1',
        defs
      );
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      fixtures = path.join(__dirname, 'fixtures', 'simple-ig-meta-profile', 'input');

      const profiles = path.join(fixtures, 'profiles');
      fs.readdirSync(profiles).forEach(f => {
        if (f.endsWith('.json')) {
          const sd = StructureDefinition.fromJSON(fs.readJSONSync(path.join(profiles, f)));
          pkgProfiles.push(sd);
        }
      });
      const examples = path.join(fixtures, 'examples');
      const exampleIds = [
        'patient-example',
        'patient-example-two',
        'patient-example-three',
        'patient-example-four',
        'patient-example-five',
        'patient-example-six'
      ];
      fs.readdirSync(examples).forEach(f => {
        if (f.endsWith('.json')) {
          const instanceDef = InstanceDefinition.fromJSON(fs.readJSONSync(path.join(examples, f)));
          // since instance meta isn't encoded in the JSON, add some here (usually done in the FSH import)
          if (exampleIds.includes(instanceDef.id)) {
            instanceDef._instanceMeta.usage = 'Example'; // Default would be set to example in import
          }
          if (instanceDef.id === 'patient-example-two') {
            instanceDef._instanceMeta.title = 'Another Patient Example';
            instanceDef._instanceMeta.description = 'Another example of a Patient';
          }

          pkgInstances.push(instanceDef);
        }
      });
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = {
        filePath: path.join(fixtures, 'sushi-config.yml'),
        id: 'sushi-test',
        canonical: 'http://hl7.org/fhir/sushi-test',
        url: 'http://hl7.org/fhir/sushi-test/ImplementationGuide/FSHTestIG',
        version: '0.1.0',
        name: 'FSHTestIG',
        title: 'FSH Test IG',
        description: 'Provides a simple example of how FSH can be used to create an IG',
        dependencies: [
          { packageId: 'hl7.fhir.us.core', version: '3.1.0' },
          { packageId: 'hl7.fhir.uv.vhdir', version: 'current' },
          {
            packageId: 'hl7.fhir.us.mcode',
            uri: 'http://hl7.org/fhir/us/mcode/ImplementationGuide/hl7.fhir.us.mcode',
            id: 'mcode',
            version: '1.0.0'
          }
        ],
        status: 'active',
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
      pkg = new Package(config);
      pkg.profiles.push(...pkgProfiles);
      pkg.instances.push(...pkgInstances);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should set exampleCanonical when meta.profile on an example Instance is a correctly versioned URL', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content.definition.resource).toBeDefined();
      expect(content.definition.resource).toEqual([
        {
          reference: {
            reference: 'Patient/patient-example-two'
          },
          name: 'Another Patient Example',
          description: 'Another example of a Patient',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient' // meta.profile version matches available profile
        },
        {
          reference: {
            reference: 'Patient/patient-example'
          },
          name: 'patient-example',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient'
        },
        {
          reference: { reference: 'Patient/patient-example-five' },
          name: 'patient-example-five',
          exampleBoolean: true // meta.profile has a profile that can't be found
        },
        {
          reference: { reference: 'Patient/patient-example-four' },
          name: 'patient-example-four',
          exampleBoolean: true // meta.profile has a profile that can't be found
        },
        {
          reference: {
            reference: 'Patient/patient-example-six'
          },
          name: 'patient-example-six',
          exampleCanonical:
            'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient-no-version' // meta.profile version matches config version (no version in profile)
        },
        {
          reference: { reference: 'Patient/patient-example-three' },
          name: 'patient-example-three',
          exampleBoolean: true // meta.profile version did not match available profile
        },
        {
          reference: { reference: 'StructureDefinition/sample-patient' },
          name: 'SamplePatient',
          description:
            'Demographics and other administrative information about an individual or animal receiving care or other health-related services.',
          exampleBoolean: false
        },
        {
          reference: { reference: 'StructureDefinition/sample-patient-no-version' },
          name: 'SamplePatientNoVersion',
          description: 'A sample patient profile, but without a version.',
          exampleBoolean: false
        }
      ]);
    });
  });

  describe('#simple-ig-meta-profile/predefined', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      fixtures = path.join(__dirname, 'fixtures', 'simple-ig-meta-profile');
      loadCustomResources(path.join(fixtures, 'input'), undefined, undefined, defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = cloneDeep(minimalConfig);
      pkg = new Package(config);
      // Add a patient to the package that will be overwritten
      const fisher = new TestFisher(null, defs, pkg);
      const patient = fisher.fishForStructureDefinition('Patient');
      patient.id = 'sample-patient';
      patient.name = 'SamplePatient';
      patient.description = 'This should go away';
      pkg.profiles.push(patient);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should set exampleCanonical when meta.profile on an example Instance is a correctly versioned URL', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const content = fs.readJSONSync(igPath);
      expect(content.definition.resource).toBeDefined();
      expect(content.definition.resource).toEqual([
        {
          reference: {
            reference: 'Patient/patient-example'
          },
          name: 'patient-example',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient'
        },
        {
          reference: {
            reference: 'Patient/patient-example-five'
          },
          name: 'patient-example-five',
          exampleCanonical:
            'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient-no-version' // meta.profile version matches config version (no version in profile)
        },
        {
          reference: { reference: 'Patient/patient-example-four' },
          name: 'patient-example-four',
          exampleBoolean: true // meta.profile has a profile that can't be found
        },
        {
          reference: { reference: 'Patient/patient-example-six' },
          name: 'patient-example-six',
          exampleBoolean: true // meta.profile has a profile that can't be found
        },
        {
          reference: { reference: 'Patient/patient-example-three' },
          name: 'patient-example-three',
          exampleBoolean: true // meta.profile version did not match available profile
        },
        {
          reference: {
            reference: 'Patient/patient-example-two'
          },
          name: 'patient-example-two',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient' // meta.profile version matches available profile
        },
        {
          reference: { reference: 'StructureDefinition/sample-patient' },
          name: 'SamplePatient',
          description:
            'Demographics and other administrative information about an individual or animal receiving care or other health-related services.',
          exampleBoolean: false
        },
        {
          reference: { reference: 'StructureDefinition/sample-patient-no-version' },
          name: 'SamplePatientNoVersion',
          description: 'A sample patient profile, but without a version.',
          exampleBoolean: false
        }
      ]);
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
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = cloneDeep(minimalConfig);
      pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should provide a default path-history for an HL7 IG', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).toContainEqual({
        code: 'path-history',
        value: 'http://hl7.org/fhir/us/minimal/history.html'
      });
    });

    it('should not provide a default path-history for a non-HL7 IG', () => {
      config.canonical = 'http://different-domain.org/fhir/fhir.us.minimal';
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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

    it('should not log an error when no file exists for a configured page', () => {
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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
    let testScriptInstance: InstanceDefinition;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-resources');
      loadCustomResources(path.join(fixtures, 'input'), undefined, undefined, defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = cloneDeep(minimalConfig);
      config.resources = [
        {
          reference: { reference: 'Patient/BazPatient' },
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
              valueCode: 'text/plain'
            }
          ]
        }
      ];
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

      testScriptInstance = new InstanceDefinition();
      testScriptInstance.resourceType = 'TestScript';
      testScriptInstance.id = 'AnotherTestScript';
      testScriptInstance._instanceMeta.name = 'AnotherTestScript';
      testScriptInstance._instanceMeta.usage = 'Example';
      pkg.instances.push(testScriptInstance);

      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should not copy over resource files', () => {
      exporter.export(tempOut);
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
        // No provided resources are copied to output
        expect(fs.existsSync(path.join(tempOut, 'input', dirName))).toBeFalsy();
      }
      expect(fs.existsSync(path.join(tempOut, 'fsh-generated', 'resources'))).toBeTruthy();
      const pageContentFiles = fs.readdirSync(path.join(tempOut, 'fsh-generated', 'resources'));
      expect(pageContentFiles).toHaveLength(1); // Contains only the generated IG resource
    });

    it('should add basic resource references to the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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
          reference: 'OperationDefinition/AnotherOD'
        },
        name: 'Title for Populate Another Questionnaire', // Use title over name
        exampleBoolean: false
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/BazPatient'
        },
        name: 'BazPatient',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
            valueCode: 'text/plain'
          }
        ],
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
        name: 'Birth Place', // Use title
        exampleBoolean: false
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/patient-birthPlaceXML'
        },
        name: 'Birth Place', // Use title
        exampleBoolean: false
      });
    });

    it('should overwrite existing resource references in the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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

    it('should not include a description for non-conformance resources when adding them to the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Goal/GoalWithDescription'
        },
        name: 'GoalWithDescription',
        // NOTE: no description since Goal.description is a CodeableConcept
        exampleBoolean: true
      });
    });

    it('should add example references to the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Goal/GoalWithDescription'
        },
        name: 'GoalWithDescription',
        exampleBoolean: true
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'TestScript/MyTestScript'
        },
        name: 'Test script title',
        description: 'This is the description of my nice test script.',
        exampleBoolean: true
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'TestScript/AnotherTestScript'
        },
        name: 'AnotherTestScript',
        exampleBoolean: true
      });
    });

    it('should add an example reference with a title attribute to the ImplementationGuide resource', () => {
      testScriptInstance.title = 'Another good title';

      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'TestScript/AnotherTestScript'
        },
        name: 'Another good title',
        exampleBoolean: true
      });
    });

    it('should add an example reference with a description attribute to the ImplementationGuide resource', () => {
      testScriptInstance.description = 'This is the description for another test script.';

      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'TestScript/AnotherTestScript'
        },
        name: 'AnotherTestScript',
        description: 'This is the description for another test script.',
        exampleBoolean: true
      });
    });

    it('should add resource references with a title to the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
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

    it('should add resource references with a description and name extension to the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/MetaExtensionPatient'
        },
        name: 'MetaExtension Patient Name',
        description: 'MetaExtension Patient Description',
        exampleBoolean: true
      });
    });

    it('should prefer configured names and descriptions to extensions on resource references', () => {
      config.resources = [
        {
          reference: {
            reference: 'Patient/MetaExtensionPatient'
          },
          name: 'Configured Name',
          description: 'Configured Description'
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/MetaExtensionPatient'
        },
        name: 'Configured Name',
        description: 'Configured Description',
        exampleBoolean: true
      });
    });

    it('should add non example resource references with a description and name extension to the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/MetaExtensionNotExamplePatient'
        },
        name: 'MetaExtensionNotExample Patient Name',
        description: 'MetaExtensionNotExample Patient Description',
        exampleBoolean: false
      });
    });

    it('should prefer non example configured names and descriptions to extensions on resource references', () => {
      config.resources = [
        {
          reference: {
            reference: 'Patient/MetaExtensionNotExamplePatient'
          },
          name: 'Configured Name',
          description: 'Configured Description'
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/MetaExtensionNotExamplePatient'
        },
        name: 'Configured Name',
        description: 'Configured Description',
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      const myPatient: ImplementationGuideDefinitionResource = igContent.definition.resource.find(
        (r: ImplementationGuideDefinitionResource) =>
          r?.reference?.reference === 'StructureDefinition/MyPatient'
      );
      expect(myPatient).toBeUndefined();
    });

    it('should add resources in the order in the configuration when all generated and predefined resources are in the configuration', () => {
      config.resources = [
        {
          reference: { reference: 'CapabilityStatement/MyCS' }
        },
        {
          reference: { reference: 'Patient/MetaExtensionPatient' }
        },
        {
          reference: { reference: 'StructureDefinition/patient-birthPlace' }
        },
        {
          reference: { reference: 'StructureDefinition/patient-birthPlaceXML' }
        },
        {
          reference: { reference: 'StructureDefinition/MyPatient' }
        },
        {
          reference: { reference: 'ValueSet/MyVS' }
        },
        {
          reference: { reference: 'OperationDefinition/MyOD' }
        },
        {
          reference: { reference: 'OperationDefinition/AnotherOD' }
        },
        {
          reference: { reference: 'StructureDefinition/MyTitlePatient' }
        },
        {
          reference: { reference: 'StructureDefinition/MyLM' }
        },
        {
          reference: { reference: 'Patient/BazPatient' }
        },
        {
          reference: { reference: 'Patient/MetaExtensionNotExamplePatient' }
        },
        {
          reference: { reference: 'Patient/FooPatient' }
        },
        {
          reference: { reference: 'Patient/BarPatient' }
        },
        {
          reference: { reference: 'TestScript/MyTestScript' }
        },
        {
          reference: { reference: 'TestScript/AnotherTestScript' }
        },
        {
          reference: { reference: 'Goal/GoalWithDescription' }
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition?.resource).toEqual([
        {
          reference: {
            reference: 'CapabilityStatement/MyCS'
          },
          name: 'Base FHIR Capability Statement (Empty)',
          description: 'Test description',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'Patient/MetaExtensionPatient'
          },
          name: 'MetaExtension Patient Name',
          description: 'MetaExtension Patient Description',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'StructureDefinition/patient-birthPlace'
          },
          name: 'Birth Place',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'StructureDefinition/patient-birthPlaceXML'
          },
          name: 'Birth Place',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'StructureDefinition/MyPatient'
          },
          name: 'MyPatient',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'ValueSet/MyVS'
          },
          name: "Yes/No/Don't Know",
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'OperationDefinition/MyOD'
          },
          name: 'Populate Questionnaire',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'OperationDefinition/AnotherOD'
          },
          name: 'Title for Populate Another Questionnaire',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'StructureDefinition/MyTitlePatient'
          },
          name: 'This patient has a title',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'StructureDefinition/MyLM'
          },
          name: 'MyLM',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'Patient/BazPatient'
          },
          name: 'BazPatient',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'Patient/MetaExtensionNotExamplePatient'
          },
          name: 'MetaExtensionNotExample Patient Name',
          description: 'MetaExtensionNotExample Patient Description',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'Patient/FooPatient'
          },
          description: 'This should stay',
          name: 'StayName',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'Patient/BarPatient'
          },
          name: 'BarPatient',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/MyPatient'
        },
        {
          reference: {
            reference: 'TestScript/MyTestScript'
          },
          name: 'Test script title',
          description: 'This is the description of my nice test script.',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'TestScript/AnotherTestScript'
          },
          name: 'AnotherTestScript',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'Goal/GoalWithDescription'
          },
          name: 'GoalWithDescription',
          exampleBoolean: true
        }
      ]);
    });

    it('should add resources in group order when all generated and predefined resources are in the group configuration', () => {
      config.groups = [
        {
          id: 'FirstGroup',
          name: 'First Group',
          description: 'The first group of resources',
          resources: [
            'CapabilityStatement/MyCS',
            'OperationDefinition/MyOD',
            'OperationDefinition/AnotherOD',
            'Goal/GoalWithDescription'
          ]
        },
        {
          id: 'PatientThings',
          name: 'Patient Things',
          description: 'Things related to patients',
          resources: [
            'StructureDefinition/MyPatient',
            'StructureDefinition/patient-birthPlaceXML',
            'StructureDefinition/patient-birthPlace',
            'Patient/MetaExtensionPatient',
            'StructureDefinition/MyTitlePatient',
            'Patient/FooPatient',
            'Patient/BarPatient',
            'Patient/BazPatient',
            'Patient/MetaExtensionNotExamplePatient'
          ]
        },
        {
          id: 'OtherThings',
          name: 'Other Things',
          description: 'This group has other things',
          resources: [
            'StructureDefinition/MyLM',
            'ValueSet/MyVS',
            'TestScript/MyTestScript',
            'TestScript/AnotherTestScript'
          ]
        }
      ];
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition?.resource).toEqual([
        {
          reference: {
            reference: 'CapabilityStatement/MyCS'
          },
          name: 'Base FHIR Capability Statement (Empty)',
          description: 'Test description',
          exampleBoolean: false,
          groupingId: 'FirstGroup'
        },
        {
          reference: {
            reference: 'OperationDefinition/MyOD'
          },
          name: 'Populate Questionnaire',
          exampleBoolean: false,
          groupingId: 'FirstGroup'
        },
        {
          reference: {
            reference: 'OperationDefinition/AnotherOD'
          },
          name: 'Title for Populate Another Questionnaire',
          exampleBoolean: false,
          groupingId: 'FirstGroup'
        },
        {
          reference: {
            reference: 'Goal/GoalWithDescription'
          },
          name: 'GoalWithDescription',
          exampleBoolean: true,
          groupingId: 'FirstGroup'
        },
        {
          reference: {
            reference: 'StructureDefinition/MyPatient'
          },
          name: 'MyPatient',
          exampleBoolean: false,
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'StructureDefinition/patient-birthPlaceXML'
          },
          name: 'Birth Place',
          exampleBoolean: false,
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'StructureDefinition/patient-birthPlace'
          },
          name: 'Birth Place',
          exampleBoolean: false,
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'Patient/MetaExtensionPatient'
          },
          name: 'MetaExtension Patient Name',
          description: 'MetaExtension Patient Description',
          exampleBoolean: true,
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'StructureDefinition/MyTitlePatient'
          },
          name: 'This patient has a title',
          exampleBoolean: false,
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'Patient/FooPatient'
          },
          description: 'This should stay',
          name: 'StayName',
          exampleBoolean: true,
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'Patient/BarPatient'
          },
          name: 'BarPatient',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/MyPatient',
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'Patient/BazPatient'
          },
          name: 'BazPatient',
          exampleBoolean: false,
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
              valueCode: 'text/plain'
            }
          ],
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'Patient/MetaExtensionNotExamplePatient'
          },
          name: 'MetaExtensionNotExample Patient Name',
          description: 'MetaExtensionNotExample Patient Description',
          exampleBoolean: false,
          groupingId: 'PatientThings'
        },
        {
          reference: {
            reference: 'StructureDefinition/MyLM'
          },
          name: 'MyLM',
          exampleBoolean: false,
          groupingId: 'OtherThings'
        },
        {
          reference: {
            reference: 'ValueSet/MyVS'
          },
          name: "Yes/No/Don't Know",
          exampleBoolean: false,
          groupingId: 'OtherThings'
        },
        {
          reference: {
            reference: 'TestScript/MyTestScript'
          },
          name: 'Test script title',
          description: 'This is the description of my nice test script.',
          exampleBoolean: true,
          groupingId: 'OtherThings'
        },
        {
          reference: {
            reference: 'TestScript/AnotherTestScript'
          },
          name: 'AnotherTestScript',
          exampleBoolean: true,
          groupingId: 'OtherThings'
        }
      ]);
    });

    it('should add resources sorted by name, title, or id when not all generated or predefined resources are in the configuration', () => {
      // when no specific sort is defined, resources are sorted by the "name" attribute in the IG.
      // if this attribute is not present, use "reference.reference" as backup.
      // this should only happen for configured resources.
      // add an extra config-only resource
      config.resources?.push({
        reference: { reference: 'Observation/ConfigOnlyObservation' },
        exampleBoolean: true
      });
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition?.resource).toEqual([
        {
          reference: {
            reference: 'TestScript/AnotherTestScript'
          },
          name: 'AnotherTestScript',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'Patient/BarPatient'
          },
          name: 'BarPatient',
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/MyPatient'
        },
        {
          reference: {
            reference: 'CapabilityStatement/MyCS'
          },
          name: 'Base FHIR Capability Statement (Empty)',
          description: 'Test description',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'Patient/BazPatient'
          },
          name: 'BazPatient',
          exampleBoolean: false,
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
              valueCode: 'text/plain'
            }
          ]
        },
        {
          reference: {
            reference: 'StructureDefinition/patient-birthPlace'
          },
          name: 'Birth Place',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'StructureDefinition/patient-birthPlaceXML'
          },
          name: 'Birth Place',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'Goal/GoalWithDescription'
          },
          name: 'GoalWithDescription',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'Patient/MetaExtensionPatient'
          },
          name: 'MetaExtension Patient Name',
          description: 'MetaExtension Patient Description',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'Patient/MetaExtensionNotExamplePatient'
          },
          name: 'MetaExtensionNotExample Patient Name',
          description: 'MetaExtensionNotExample Patient Description',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'StructureDefinition/MyLM'
          },
          name: 'MyLM',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'StructureDefinition/MyPatient'
          },
          name: 'MyPatient',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'Observation/ConfigOnlyObservation' // sort key is Observation/ConfigOnlyObservation
          },
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'OperationDefinition/MyOD'
          },
          name: 'Populate Questionnaire',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'Patient/FooPatient'
          },
          description: 'This should stay',
          name: 'StayName',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'TestScript/MyTestScript'
          },
          name: 'Test script title',
          description: 'This is the description of my nice test script.',
          exampleBoolean: true
        },
        {
          reference: {
            reference: 'StructureDefinition/MyTitlePatient'
          },
          name: 'This patient has a title',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'OperationDefinition/AnotherOD'
          },
          name: 'Title for Populate Another Questionnaire',
          exampleBoolean: false
        },
        {
          reference: {
            reference: 'ValueSet/MyVS'
          },
          name: "Yes/No/Don't Know",
          exampleBoolean: false
        }
      ]);
    });

    it('should log a warning for input files missing resourceType or id', () => {
      exporter.export(tempOut);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(3);
      expect(loggerSpy.getMessageAtIndex(0, 'warn')).toMatch(
        /.*InvalidPatient\.json is missing id/
      );
      expect(loggerSpy.getMessageAtIndex(1, 'warn')).toMatch(
        /.*InvalidPatient2\.json is missing resourceType/
      );
      expect(loggerSpy.getMessageAtIndex(2, 'warn')).toMatch(
        /.*InvalidPatient3\.json is missing resourceType and id/
      );
    });
  });

  describe('#customized-ig-with-nested-resources', () => {
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let defs: FHIRDefinitions;
    let config: Configuration;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-nested-resources');
      loadCustomResources(path.join(fixtures, 'input'), undefined, undefined, defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = cloneDeep(minimalConfig);
      config.parameters = [];
      config.parameters.push({
        code: 'path-resource',
        value: path.join('input', 'resources', 'path-resource-nest')
      });
      const pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures));
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should add only non-nested resource references to the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toHaveLength(3);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/BarPatient'
        },
        name: 'BarPatient',
        exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/MyPatient'
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/MyPatient'
        },
        name: 'MyPatient',
        exampleBoolean: false
      });
      expect(igContent.definition.resource).toContainEqual({
        exampleBoolean: false,
        name: 'MyCorrectlyNestedPatient',
        reference: {
          reference: 'StructureDefinition/MyCorrectlyNestedPatient'
        }
      });
    });

    it('should warn on deeply nested resources', () => {
      exporter.export(tempOut);
      const warning = loggerSpy.getFirstMessage('warn');
      expect(warning).toInclude(
        'The following files were not added to the ImplementationGuide JSON'
      );
      expect(warning).toInclude(path.join('nested1', 'StructureDefinition-MyTitlePatient.json'));
      expect(warning).toInclude(path.join('nested2', 'ValueSet-MyVS.json'));
      expect(warning).toInclude(
        path.join('path-resource-double-nest', 'john', 'Patient-John.json')
      );
      expect(warning).toInclude(
        path.join('path-resource-double-nest', 'jack', 'Patient-Jack.json')
      );
      expect(warning).not.toInclude('Patient-BarPatient.json');
      expect(warning).not.toInclude('StructureDefinition-MyPatient.json');
    });

    it('should not warn on deeply nested resources when implicated by the path-resource parameter', () => {
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-nested-resources');
      loadCustomResources(path.join(fixtures, 'input'), fixtures, config.parameters, defs);
      exporter.export(tempOut);
      const warning = loggerSpy.getFirstMessage('warn');
      expect(warning).toInclude(
        'The following files were not added to the ImplementationGuide JSON'
      );
      expect(warning).toInclude(path.join('nested1', 'StructureDefinition-MyTitlePatient.json'));
      expect(warning).toInclude(path.join('nested2', 'ValueSet-MyVS.json'));
      // path-resource-double-nest is not included in config
      expect(warning).toInclude(
        path.join('path-resource-double-nest', 'john', 'Patient-John.json')
      );
      expect(warning).toInclude(
        path.join('path-resource-double-nest', 'jack', 'Patient-Jack.json')
      );
      // path-resource-nest is included in config
      expect(warning).not.toInclude(
        path.join('path-resource-nest', 'StructureDefinition-MyCorrectlyNestedPatient.json')
      );
    });

    it('should not warn on deeply nested resources that are included in the path-resource parameter with a directory and wildcard', () => {
      const config = cloneDeep(minimalConfig);
      config.parameters = [];
      config.parameters.push({
        code: 'path-resource',
        value: path.join('input', 'resources', 'path-resource-double-nest', '*')
      });
      const pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures));
      exporter.export(tempOut);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      const warning = loggerSpy.getFirstMessage('warn');
      expect(warning).not.toInclude(
        path.join('path-resource-double-nest', 'john', 'Patient-John.json')
      );
      expect(warning).not.toInclude(
        path.join('path-resource-double-nest', 'jack', 'Patient-Jack.json')
      );
    });

    it('should warn on deeply nested resources that are included in the path-resource parameter with a directory but NO wildcard', () => {
      const config = cloneDeep(minimalConfig);
      config.parameters = [];
      config.parameters.push({
        code: 'path-resource',
        // NOTE: file path does not include the "*" portion (it just lists a directory), which is not sufficient
        value: path.join('input', 'resources', 'path-resource-double-nest')
      });
      const pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, path.resolve(fixtures));
      exporter.export(tempOut);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      const warning = loggerSpy.getFirstMessage('warn');
      const warningLines = warning.split('\n');
      const johnLine = warningLines.filter(w =>
        w.includes(path.join('path-resource-double-nest', 'john', 'Patient-John.json'))
      );
      const jackLine = warningLines.filter(w =>
        w.includes(path.join('path-resource-double-nest', 'john', 'Patient-John.json'))
      );
      // Check that both nested files are logged in the warning, but check that they're only there once
      expect(johnLine).toHaveLength(1);
      expect(jackLine).toHaveLength(1);
    });
  });

  describe('#customized-ig-with-logical-model-example', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-logical-model-example');
      loadCustomResources(path.join(fixtures, 'input'), undefined, undefined, defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = cloneDeep(minimalConfig);
      config.resources = [
        {
          reference: {
            reference: 'Binary/example-logical-model-json'
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
              valueCode: 'application/json'
            }
          ],
          name: 'Example of LM JSON',
          exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
        },
        {
          reference: {
            reference: 'Binary/second-example-logical-model-json'
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format', // deprecated url still supported
              valueCode: 'application/json'
            }
          ],
          name: 'Another Example of LM JSON',
          exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
        },
        {
          reference: {
            reference: 'Binary/canonical-url-resourceType-example-logical-model'
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
              valueCode: 'application/json'
            }
          ],
          name: 'Example of LM JSON with the full canonical URL as the resourceType',
          exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
        },
        {
          reference: {
            reference: 'Binary/example-logical-model-xml'
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
              valueCode: 'application/xml'
            }
          ],
          name: 'Example of LM XML',
          exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
        }
      ];
      pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should add logical model and example resource references (manually listed in config) to the ImplementationGuide resource', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toHaveLength(5);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/MyLM'
        },
        name: 'MyLM',
        exampleBoolean: false
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Binary/example-logical-model-json'
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
            valueCode: 'application/json'
          }
        ],
        name: 'Example of LM JSON',
        exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Binary/second-example-logical-model-json'
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format', // deprecated url still supported
            valueCode: 'application/json'
          }
        ],
        name: 'Another Example of LM JSON',
        exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Binary/canonical-url-resourceType-example-logical-model'
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
            valueCode: 'application/json'
          }
        ],
        name: 'Example of LM JSON with the full canonical URL as the resourceType',
        exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Binary/example-logical-model-xml'
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
            valueCode: 'application/xml'
          }
        ],
        name: 'Example of LM XML',
        exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /extension .* has been deprecated\. Update the configuration for Binary\/second-example-logical-model-json.*/
      );
    });
  });

  describe('#customized-ig-with-binary-example', () => {
    // An IG with one Binary example without resourceType or id
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-binary-example');
      loadCustomResources(path.join(fixtures, 'input'), undefined, undefined, defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = cloneDeep(minimalConfig);
      config.resources = [
        {
          reference: {
            reference: 'Binary/MissingResourceTypeAndId'
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
              valueCode: 'application/json'
            }
          ]
        },
        {
          reference: {
            reference: 'Binary/MissingId'
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
              valueCode: 'application/fhir+json'
            }
          ]
        }
      ];
      pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should allow binary resources that do not have resourceType or id but are specified correctly in config', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      // resource entry is unchanged
      expect(igContent.definition.resource).toHaveLength(2);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Binary/MissingResourceTypeAndId'
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
            valueCode: 'application/json'
          }
        ]
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Binary/MissingId'
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/tools/StructureDefinition/implementationguide-resource-format',
            valueCode: 'application/fhir+json'
          }
        ]
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /extension .* has been deprecated\. Update the configuration for Binary\/MissingResourceTypeAndId.*/
      );
    });
  });

  describe('#ref-by-id-or-name', () => {
    let pkg: Package;
    let tempOut: string;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      tempOut = temp.mkdirSync('sushi-test');
      const config: Configuration = {
        filePath: path.join(fixtures, 'sushi-config.yml'),
        id: 'sushi-test',
        canonical: 'http://hl7.org/fhir/sushi-test',
        name: 'FSHTestIG',
        status: 'active',
        fhirVersion: ['4.0.1'],
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
      pkg = new Package(config);

      // Profile: StructureDefinition/sample-patient
      pkg.profiles.push(
        StructureDefinition.fromJSON(
          fs.readJSONSync(
            path.join(fixtures, 'profiles', 'StructureDefinition-sample-patient.json')
          )
        )
      );

      // Extension: StructureDefinition/sample-value-extension
      pkg.extensions.push(
        StructureDefinition.fromJSON(
          fs.readJSONSync(
            path.join(fixtures, 'extensions', 'StructureDefinition-sample-value-extension.json')
          )
        )
      );

      // CodeSystem: StructureDefinition/sample-code-system
      const codeSystemDef = new CodeSystem();
      codeSystemDef.id = 'sample-code-system';
      codeSystemDef.name = 'SampleCodeSystem';
      codeSystemDef.url = 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-code-system';
      codeSystemDef.description = 'A code system description';
      pkg.codeSystems.push(codeSystemDef);

      // Example: Patient/patient-example
      const instanceDef = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example.json'))
      );
      instanceDef._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    const doResourceTest = (
      profile: string,
      extension: string,
      codeSystem: string,
      example: string,
      skipExpectations = false
    ) => {
      // Setup resources
      pkg.config.resources = [
        // Profile: StructureDefinition/sample-patient
        {
          reference: { reference: profile },
          name: 'A Very Special Profile' // override name to ensure correct match in expectations
        },
        // Extension: StructureDefinition/sample-value-extension
        {
          reference: { reference: extension },
          name: 'A Very Special Extension' // override name to ensure correct match in expectations
        },
        // CodeSystem: StructureDefinition/sample-code-system
        {
          reference: { reference: codeSystem },
          name: 'A Very Special CodeSystem' // override name to ensure correct match in expectations
        },
        // Example: Patient/patient-example
        {
          reference: { reference: example },
          name: 'A Very Special Example' // override name to ensure correct match in expectations
        }
      ];
      // Export and check
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, defs, fixtures);
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igJSON = fs.readJSONSync(igPath);
      if (!skipExpectations) {
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(igJSON.definition.resource).toEqual([
          {
            reference: {
              reference: 'StructureDefinition/sample-patient'
            },
            name: 'A Very Special Profile',
            description:
              'Demographics and other administrative information about an individual or animal receiving care or other health-related services.',
            exampleBoolean: false
          },
          {
            reference: {
              reference: 'StructureDefinition/sample-value-extension'
            },
            name: 'A Very Special Extension',
            description:
              'Base StructureDefinition for Extension Type: Optional Extension Element - found in all resources.',
            exampleBoolean: false
          },
          {
            reference: {
              reference: 'CodeSystem/sample-code-system'
            },
            name: 'A Very Special CodeSystem',
            description: 'A code system description',
            exampleBoolean: false
          },
          {
            reference: {
              reference: 'Patient/patient-example'
            },
            name: 'A Very Special Example',
            exampleBoolean: true
          }
        ]);
      }
      return igJSON;
    };

    it('should properly convert resource ids to relative URLs', () => {
      doResourceTest(
        'sample-patient',
        'sample-value-extension',
        'sample-code-system',
        'patient-example'
      );
    });

    it('should properly convert resource names to relative URLs', () => {
      doResourceTest(
        'SamplePatient',
        'SampleValueExtension',
        'SampleCodeSystem',
        'Patient/patient-example' // patients don't have a formal name
      );
    });

    it('should properly retain relative resource URLs', () => {
      doResourceTest(
        'StructureDefinition/sample-patient',
        'StructureDefinition/sample-value-extension',
        'CodeSystem/sample-code-system',
        'Patient/patient-example'
      );
    });

    it('should log a warning and use reference as-is when a name/id cannot be resolved', () => {
      const igJSON = doResourceTest(
        'invalid-id',
        'sample-value-extension',
        'sample-code-system',
        'patient-example',
        true
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Cannot determine relative URL for "invalid-id" referenced in sushi-config.yaml.'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(igJSON.definition.resource).toHaveLength(5);
      expect(igJSON.definition.resource).toContainEqual({
        reference: { reference: 'invalid-id' },
        name: 'A Very Special Profile'
      });
    });

    const doExampleCanonicalTest = (exampleCanonical: string, skipExpectations = false) => {
      // Remove extension and code system since we don't need them
      pkg.extensions.length = 0;
      pkg.codeSystems.length = 0;
      // Setup resources
      pkg.config.resources = [
        // Profile: StructureDefinition/sample-patient
        {
          reference: { reference: 'StructureDefinition/sample-patient' }
        },
        // Example: Patient/patient-example
        {
          reference: { reference: 'Patient/patient-example' },
          exampleCanonical
        }
      ];
      // Export and check
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, defs, fixtures);
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igJSON = fs.readJSONSync(igPath);
      if (!skipExpectations) {
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(igJSON.definition.resource).toEqual([
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
              reference: 'Patient/patient-example'
            },
            name: 'patient-example',
            exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient'
          }
        ]);
      }
      return igJSON;
    };

    it('should properly convert exampleCanonical id to canonical', () => {
      doExampleCanonicalTest('sample-patient');
    });

    it('should properly convert exampleCanonical name to canonical', () => {
      doExampleCanonicalTest('SamplePatient');
    });

    it('should properly retain canonical exampleCanonical', () => {
      doExampleCanonicalTest('http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient');
    });

    it('should properly convert exampleCanonical for external profiles too', () => {
      const igJSON = doExampleCanonicalTest('us-core-patient', true);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(igJSON.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/patient-example'
        },
        name: 'patient-example',
        exampleCanonical: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      });
    });

    it('should log a warning and use reference as-is when a name/id cannot be resolved', () => {
      const igJSON = doExampleCanonicalTest('invalid-example-canonical-id', true);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Cannot determine canonical for "invalid-example-canonical-id" referenced in sushi-config.yaml.'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(igJSON.definition.resource).toHaveLength(2);
      expect(igJSON.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/patient-example'
        },
        name: 'patient-example',
        exampleCanonical: 'invalid-example-canonical-id'
      });
    });

    const doGroupTest = (
      profile: string,
      extension: string,
      codeSystem: string,
      example: string,
      skipExpectations = false
    ) => {
      pkg.config.groups = [
        {
          id: 'MyPatientGroup',
          name: 'My Patient Group',
          description: 'Group of patient things.',
          resources: [profile, example]
        },
        {
          id: 'MyOtherGroup',
          name: 'My Other Group',
          description: 'Group of other things.',
          resources: [extension, codeSystem]
        }
      ];
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, defs, fixtures);
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igJSON = fs.readJSONSync(igPath);
      if (!skipExpectations) {
        expect(igJSON.definition.grouping).toContainEqual({
          id: 'MyPatientGroup',
          name: 'My Patient Group',
          description: 'Group of patient things.'
        });
        expect(igJSON.definition.grouping).toContainEqual({
          id: 'MyOtherGroup',
          name: 'My Other Group',
          description: 'Group of other things.'
        });
        expect(
          igJSON.definition.resource.find(
            (r: ImplementationGuideDefinitionResource) =>
              r?.reference?.reference === 'StructureDefinition/sample-patient'
          )?.groupingId
        ).toBe('MyPatientGroup');
        expect(
          igJSON.definition.resource.find(
            (r: ImplementationGuideDefinitionResource) =>
              r?.reference?.reference === 'Patient/patient-example'
          )?.groupingId
        ).toBe('MyPatientGroup');
        expect(
          igJSON.definition.resource.find(
            (r: ImplementationGuideDefinitionResource) =>
              r?.reference?.reference === 'StructureDefinition/sample-value-extension'
          )?.groupingId
        ).toBe('MyOtherGroup');
        expect(
          igJSON.definition.resource.find(
            (r: ImplementationGuideDefinitionResource) =>
              r?.reference?.reference === 'CodeSystem/sample-code-system'
          )?.groupingId
        ).toBe('MyOtherGroup');
      }
      return igJSON;
    };

    it('should properly convert resource ids to relative URLs', () => {
      doGroupTest(
        'sample-patient',
        'sample-value-extension',
        'sample-code-system',
        'patient-example'
      );
    });

    it('should properly convert resource names to relative URLs', () => {
      doGroupTest(
        'SamplePatient',
        'SampleValueExtension',
        'SampleCodeSystem',
        'Patient/patient-example' // patients don't have a formal name
      );
    });

    it('should properly retain relative resource URLs', () => {
      doGroupTest(
        'StructureDefinition/sample-patient',
        'StructureDefinition/sample-value-extension',
        'CodeSystem/sample-code-system',
        'Patient/patient-example'
      );
    });

    it('should log a warning and an error when a name/id cannot be resolved', () => {
      const igJSON = doGroupTest(
        'invalid-id',
        'sample-value-extension',
        'sample-code-system',
        'patient-example',
        true
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Cannot determine relative URL for "invalid-id" referenced in sushi-config.yaml.'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'Group MyPatientGroup configured with nonexistent resource invalid-id'
      );
      expect(igJSON.definition.grouping).toHaveLength(2);
      expect(igJSON.definition.resource).toHaveLength(4);
    });

    const doGlobalProfileTest = (profile: string, skipExpectations = false) => {
      // Remove extension, code system, and example since we don't need them
      pkg.extensions.length = 0;
      pkg.codeSystems.length = 0;
      pkg.instances.length = 0;
      // Setup global profile
      pkg.config.global = [{ type: 'Patient', profile }];
      // Export and check
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, defs, fixtures);
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-sushi-test.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igJSON = fs.readJSONSync(igPath);
      if (!skipExpectations) {
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(igJSON.global).toEqual([
          {
            type: 'Patient',
            profile: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient'
          }
        ]);
      }
      return igJSON;
    };

    it('should properly convert global profile id to canonical', () => {
      doGlobalProfileTest('sample-patient');
    });

    it('should properly convert global profile name to canonical', () => {
      doGlobalProfileTest('SamplePatient');
    });

    it('should properly retain global profile canonical', () => {
      doGlobalProfileTest('http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient');
    });

    it('should properly convert global profile for external profiles too', () => {
      const igJSON = doGlobalProfileTest('us-core-patient', true);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(igJSON.global).toEqual([
        {
          type: 'Patient',
          profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
        }
      ]);
    });

    it('should log a warning and use reference as-is when a name/id cannot be resolved', () => {
      const igJSON = doGlobalProfileTest('invalid-global-canonical-id', true);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Cannot determine canonical for "invalid-global-canonical-id" referenced in sushi-config.yaml.'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(igJSON.global).toEqual([
        {
          type: 'Patient',
          profile: 'invalid-global-canonical-id'
        }
      ]);
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
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = cloneDeep(minimalConfig);
      pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should use all available page content when pages are not configured', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);

      // Pages are added to IG content but nothing is copied
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
    });

    it('should include only configured pages when provided', () => {
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
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      // Only the index.md and extra.xml pages were configured, so they are included.
      // The other-page.md and other-page-notes.md are left alone.
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
    });
  });

  describe('#invalid-pages-folder-ig', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let config: Configuration;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      fixtures = path.join(__dirname, 'fixtures', 'invalid-pages-folder-ig');
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      config = minimalConfig;
      pkg = new Package(config);
      exporter = new IGExporter(pkg, defs, fixtures);
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should log a warning for invalid page types', () => {
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent: ImplementationGuide = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'markdown'
        }
      ]);
      // Check for log messages indicating invalid input
      expect(loggerSpy.getFirstMessage('warn')).toMatch(
        /Files not in the supported file types \(\.md and \.xml\) were detected\..*File: .*[\/\\]invalid-pages-folder-ig[\/\\]input[\/\\]pagecontent/s
      );
    });
  });

  describe('#sorted-pages-ig', () => {
    let tempOut: string;
    let fixtures: string;
    let defs: FHIRDefinitions;
    let pkg: Package;

    beforeAll(() => {
      tempOut = temp.mkdirSync('sushi-test');
      fixtures = path.join(__dirname, 'fixtures', 'sorted-pages-ig');
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      pkg = new Package(minimalConfig);
    });

    beforeEach(() => {
      loggerSpy.reset();
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    describe('IG Publisher mode', () => {
      beforeAll(() => {
        const exporter = new IGExporter(pkg, defs, fixtures);
        // No need to regenerate the IG on every test -- generate it once and inspect what you
        // need to in the tests
        exporter.export(tempOut);
      });

      afterAll(() => {
        temp.cleanupSync();
      });

      it('should configure user-provided pages in numeric then alphabetic order', () => {
        const igPath = path.join(
          tempOut,
          'fsh-generated',
          'resources',
          'ImplementationGuide-fhir.us.minimal.json'
        );
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
            nameUrl: '1_oranges.html',
            title: 'Oranges',
            generation: 'markdown'
          },
          {
            nameUrl: '2_apples.html',
            title: 'Apples',
            generation: 'markdown'
          },
          {
            nameUrl: '3_bananas.html',
            title: 'Bananas',
            generation: 'markdown'
          },
          {
            nameUrl: '4_pears.html',
            title: 'Pears',
            generation: 'markdown'
          },
          {
            nameUrl: '7_left.html',
            title: 'Left',
            generation: 'markdown'
          },
          {
            nameUrl: '7_right.html',
            title: 'Right',
            generation: 'markdown'
          },
          {
            nameUrl: '100_big.html',
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

      it('should not copy files', () => {
        let pageContentPath = path.join(tempOut, 'input', 'pagecontent');
        expect(fs.existsSync(pageContentPath)).toBeFalsy();

        pageContentPath = path.join(tempOut, 'fsh-generated', 'input', 'pagecontent');
        expect(fs.existsSync(pageContentPath)).toBeFalsy();
      });
    });
  });

  describe('#name-collision-ig', () => {
    let tempOut: string;

    beforeAll(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      const fixtures = path.join(__dirname, 'fixtures', 'name-collision-ig');
      const defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      const pkg = new Package(minimalConfig);
      const exporter = new IGExporter(pkg, defs, fixtures);
      // No need to regenerate the IG on every test -- generate it once and inspect what you
      // need to in the tests
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should not remove numeric prefixes from page names when doing so would cause name collisions', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toHaveLength(5);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'markdown'
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
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Duplicate file index.xml will be ignored. Please rename to avoid collisions/
      );
    });
  });

  describe('#devious-id-ig', () => {
    let tempOut: string;

    beforeAll(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      const deviousConfig = cloneDeep(minimalConfig);
      deviousConfig.id = '/../../../arenticlever';
      const pkg = new Package(deviousConfig);
      const exporter = new IGExporter(pkg, defs, fixtures);
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should not allow devious characters in the IG file name  ', () => {
      const deviousPath = path.join(tempOut, 'arenticlever.json');
      expect(fs.existsSync(deviousPath)).toBeFalse();
      const angelicPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide--..-..-..-arenticlever.json'
      );
      expect(fs.existsSync(angelicPath)).toBeTruthy();
    });
  });

  describe('#r5-ig-format', () => {
    let tempOut: string;

    beforeAll(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const defs = new FHIRDefinitions();
      // r5-definitions contains the guide-parameter-code CodeSystem, which was originally included in 5.0.0-ballot
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r5-definitions', defs);

      const r5config = cloneDeep(minimalConfig);
      r5config.fhirVersion = ['5.0.0-ballot'];
      r5config.copyrightLabel = 'Shorty Fsh 2022+';
      r5config.dependencies = [
        {
          packageId: 'hl7.fhir.us.ocean',
          uri: 'http://example.org/ocean',
          id: 'ocean',
          version: '1.0.0',
          reason: 'The ocean is essential because it has fsh'
        }
      ];
      r5config.resources = [
        {
          reference: { reference: 'Patient/patient-example-two' },
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient'
        },
        {
          reference: { reference: 'Patient/patient-example-three' },
          profile: [
            'http://example.org/StructureDefiniton/first',
            'http://example.org/StructureDefiniton/second'
          ]
        },
        {
          reference: { reference: 'Patient/patient-example-four' },
          isExample: false
        }
      ];
      r5config.pages = [
        {
          nameUrl: 'index.md',
          title: 'Home',
          generation: 'markdown',
          sourceMarkdown: 'source markdown for index'
        },
        {
          nameUrl: 'other-page.md',
          title: 'Some Other Page',
          generation: 'markdown',
          sourceUrl: 'http://example.org',
          page: [
            {
              nameUrl: 'nested-page.md',
              sourceString: 'source string for nested page'
            },
            {
              nameUrl: 'second-nested-page-url.md',
              name: 'second-nested-page-name.html'
            }
          ]
        }
      ];
      r5config.parameters = [
        {
          code: 'copyrightyear',
          value: '2020+'
        },
        {
          code: 'generate-xml',
          value: 'true'
        },
        {
          code: 'http://example.org/parameters#special-code',
          value: 'sparkles'
        },
        {
          code: 'http://example.org/CodeSystem/sample-code-system#url-code',
          value: 'true'
        },
        {
          code: 'SampleCodeSystem#name-code',
          value: 'true'
        },
        {
          code: 'sample-code-system#id-code',
          value: 'true'
        }
      ];

      const pkg = new Package(r5config);

      // Profile: StructureDefinition/sample-patient
      pkg.profiles.push(
        StructureDefinition.fromJSON(
          fs.readJSONSync(
            path.join(fixtures, 'profiles', 'StructureDefinition-sample-patient.json')
          )
        )
      );

      // Example: Patient/patient-example
      const instanceDef = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example.json'))
      );
      instanceDef._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef);

      // Example: Patient/patient-example-two
      const instanceDef2 = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example-two.json'))
      );
      instanceDef2._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef2);

      // Example: Patient/patient-example-three
      const instanceDef3 = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example-three.json'))
      );
      instanceDef3._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef3);

      // Example: Patient/patient-example-four
      const instanceDef4 = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example-three.json'))
      );
      instanceDef4.id = 'patient-example-four';
      instanceDef4._instanceMeta.name = 'patient-example-four';
      instanceDef4._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef4);

      // CodeSystem: CodeSystem/sample-code-system
      const codeSystemDef = new CodeSystem();
      codeSystemDef.id = 'sample-code-system';
      codeSystemDef.name = 'SampleCodeSystem';
      codeSystemDef.url = 'http://example.org/CodeSystem/sample-code-system';
      pkg.codeSystems.push(codeSystemDef);

      const exporter = new IGExporter(pkg, defs, fixtures);
      // No need to regenerate the IG on every test -- generate it once and inspect what you
      // need to in the tests
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should replace a definition.resource.exampleBoolean set to true with isExample', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/patient-example'
        },
        name: 'patient-example',
        isExample: true // Replaces exampleBoolean with isExample
      });
    });

    it('should replace an definition.resource.exampleBoolean set to false with isExample', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'StructureDefinition/sample-patient'
        },
        name: 'SamplePatient',
        description:
          'Demographics and other administrative information about an individual or animal receiving care or other health-related services.',
        isExample: false // Replaces exampleBoolean with isExample
      });
    });

    it('should replace an definition.resource.exampleCanonical with isExample and profile', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/patient-example-two'
        },
        name: 'patient-example-two',
        isExample: true, // Replaces exampleBoolean with isExample
        profile: ['http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient'] // Includes profile
      });
    });

    it('should use the definition.resource.isExample boolean in configuration if provided', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/patient-example-four'
        },
        name: 'patient-example-four',
        isExample: false // Provided by configuration
      });
    });

    it('should use the definition.resource.profile array in configuration if provided', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Patient/patient-example-three'
        },
        name: 'patient-example-three',
        isExample: true,
        // Profile is added if it is provided
        profile: [
          'http://example.org/StructureDefiniton/first',
          'http://example.org/StructureDefiniton/second'
        ]
      });
    });

    it('should replace definition.page.nameUrl and any nested pages nameUrls with name and support source[x]', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page).toEqual({
        title: 'Table of Contents',
        generation: 'html',
        name: 'toc.html',
        sourceUrl: 'toc.html', // Defaults sourceUrl if no configuration provided
        page: [
          {
            name: 'index.html', // Replaces nameUrl with name
            title: 'Home',
            generation: 'markdown',
            sourceMarkdown: 'source markdown for index' // Supports source[x]
          },
          {
            name: 'other-page.html',
            title: 'Some Other Page',
            generation: 'markdown',
            sourceUrl: 'http://example.org', // Supports source[x]
            page: [
              {
                name: 'nested-page.html',
                title: 'Nested Page',
                generation: 'markdown',
                sourceString: 'source string for nested page' // Supports source[x]
              },
              {
                name: 'second-nested-page-name.html', // Configured name
                title: 'Second Nested Page Name',
                generation: 'markdown',
                sourceUrl: 'second-nested-page-url.html' // NameUrl used as sourceUrl
              }
            ]
          }
        ]
      });
    });

    it('should replace definition.parameter code with a Coding and include the system if the value is in the bound VS', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).toContainEqual({
        code: {
          code: 'generate-xml', // Replaces simple code with a Coding
          system: 'http://hl7.org/fhir/guide-parameter-code' // Defaults to the ValueSet including in the binding
        },
        value: 'true'
      });
    });

    it('should replace definition.parameter code with a Coding and set the default system if the value is not in the bound VS', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).toContainEqual({
        code: {
          code: 'copyrightyear', // Replaces simple code with a Coding
          system: 'http://hl7.org/fhir/tools/CodeSystem/ig-parameters' // Default system is set
        },
        value: '2020+'
      });
    });

    it('should set the definition.parameter system and code if provided', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).toContainEqual({
        code: {
          code: 'special-code', // Replaces simple code with a Coding
          system: 'http://example.org/parameters' // Uses the provided system
        },
        value: 'sparkles'
      });
    });

    it('should support referencing system by name, id, or full url when setting a definition.parameter code with a system', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).toContainEqual({
        code: {
          code: 'url-code',
          system: 'http://example.org/CodeSystem/sample-code-system' // Normalizes system
        },
        value: 'true'
      });
      expect(igContent.definition.parameter).toContainEqual({
        code: {
          code: 'name-code',
          system: 'http://example.org/CodeSystem/sample-code-system' // Normalizes system
        },
        value: 'true'
      });
      expect(igContent.definition.parameter).toContainEqual({
        code: {
          code: 'id-code',
          system: 'http://example.org/CodeSystem/sample-code-system' // Normalizes system
        },
        value: 'true'
      });
    });

    it('should set copyrightLabel when provided in configuration', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.copyrightLabel).toEqual('Shorty Fsh 2022+');
    });

    it('should set versionAlgorithmString when provided in configuration', () => {
      // Export IG in this test so can test all variations of versionAlgorithm[x]
      const configWithVersionAlgorithm = cloneDeep(minimalConfig);
      configWithVersionAlgorithm.fhirVersion = ['5.0.0-ballot'];
      configWithVersionAlgorithm.versionAlgorithmString = 'date';

      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const defs = new FHIRDefinitions();
      const pkg = new Package(configWithVersionAlgorithm);
      const exporter = new IGExporter(pkg, defs, fixtures);
      const tempOut = temp.mkdirSync('sushi-test-version-alg');
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);

      expect(igContent.versionAlgorithmString).toEqual('date');
    });

    it('should set versionAlgorithmCoding when provided as FSH Code in configuration', () => {
      // Export IG in this test so can test all variations of versionAlgorithm[x]
      const configWithVersionAlgorithm = cloneDeep(minimalConfig);
      configWithVersionAlgorithm.fhirVersion = ['5.0.0-ballot'];
      configWithVersionAlgorithm.versionAlgorithmCoding = {
        system: 'http://example.org',
        code: 'semver'
      };

      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const defs = new FHIRDefinitions();
      const pkg = new Package(configWithVersionAlgorithm);
      const exporter = new IGExporter(pkg, defs, fixtures);
      const tempOut = temp.mkdirSync('sushi-test-version-alg');
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);

      expect(igContent.versionAlgorithmCoding).toEqual({
        system: 'http://example.org',
        code: 'semver'
      });
    });

    it('should support dependsOn.reason when provided in configuration', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.dependsOn).toEqual([
        {
          packageId: 'hl7.fhir.us.ocean',
          uri: 'http://example.org/ocean',
          id: 'ocean',
          version: '1.0.0',
          reason: 'The ocean is essential because it has fsh'
        }
      ]);
    });
  });

  describe('#r5-properties-on-r4-igs', () => {
    let tempOut: string;

    beforeAll(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const defs = new FHIRDefinitions();
      // r5-definitions contains the guide-parameter-code CodeSystem, which was originally included in 5.0.0-ballot
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r5-definitions', defs);

      const r4WithR5propsConfig = cloneDeep(minimalConfig);
      r4WithR5propsConfig.copyrightLabel = 'Shorty Fsh 2022+';
      r4WithR5propsConfig.dependencies = [
        {
          packageId: 'hl7.fhir.us.ocean',
          uri: 'http://example.org/ocean',
          id: 'ocean',
          version: '1.0.0',
          reason: 'The ocean is essential because it has fsh'
        }
      ];
      r4WithR5propsConfig.resources = [
        {
          reference: { reference: 'Patient/patient-example' },
          profile: ['http://example.org/StructureDefinition/solo']
        },
        {
          reference: { reference: 'Patient/patient-example-two' },
          profile: [
            'http://example.org/StructureDefiniton/first',
            'http://example.org/StructureDefiniton/second'
          ]
        },
        {
          reference: { reference: 'Patient/patient-example-three' },
          isExample: false
        },
        {
          reference: { reference: 'Patient/patient-example-four' },
          exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient',
          profile: ['http://example.org/StructureDefinition/solo']
        },
        {
          reference: { reference: 'Patient/patient-example-five' },
          exampleCanonical: 'http://example.org/StructureDefinition/solo',
          profile: ['http://example.org/StructureDefinition/solo']
        }
      ];
      r4WithR5propsConfig.parameters = [
        {
          code: 'generate-xml',
          value: 'true'
        },
        {
          code: 'http://example.org/parameters#special-code',
          value: 'sparkles'
        }
      ];

      const pkg = new Package(r4WithR5propsConfig);

      // Example: Patient/patient-example
      const instanceDef = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example.json'))
      );
      instanceDef._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef);

      // Example: Patient/patient-example-two
      const instanceDef2 = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example-two.json'))
      );
      instanceDef2._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef2);

      // Example: Patient/patient-example-three
      const instanceDef3 = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example-three.json'))
      );
      instanceDef3._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef3);

      // Example: Patient/patient-example-four
      const instanceDef4 = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example-three.json'))
      );
      instanceDef4.id = 'patient-example-four';
      instanceDef4._instanceMeta.name = 'patient-example-four';
      instanceDef4._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef4);

      // Example: Patient/patient-example-five
      const instanceDef5 = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example-three.json'))
      );
      instanceDef5.id = 'patient-example-five';
      instanceDef5._instanceMeta.name = 'patient-example-five';
      instanceDef5._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef5);

      const exporter = new IGExporter(pkg, defs, fixtures);
      // No need to regenerate the IG on every test -- generate it once and inspect what you
      // need to in the tests
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    describe('definition.resource.profile', () => {
      describe('exampleCanonical is not set', () => {
        it('should add configured profile array to exampleCanonical and no extension if length ===  1', () => {
          const igPath = path.join(
            tempOut,
            'fsh-generated',
            'resources',
            'ImplementationGuide-fhir.us.minimal.json'
          );
          expect(fs.existsSync(igPath)).toBeTruthy();
          const igContent = fs.readJSONSync(igPath);
          expect(igContent.definition.resource).toContainEqual({
            reference: { reference: 'Patient/patient-example' },
            name: 'patient-example',
            exampleCanonical: 'http://example.org/StructureDefinition/solo' // adds profile url
            // no extension because only one profile was provided
          });
        });

        it('should add configured profile array to exampleCanonical and add an extension if length > 1', () => {
          const igPath = path.join(
            tempOut,
            'fsh-generated',
            'resources',
            'ImplementationGuide-fhir.us.minimal.json'
          );
          expect(fs.existsSync(igPath)).toBeTruthy();
          const igContent = fs.readJSONSync(igPath);
          expect(igContent.definition.resource).toContainEqual({
            reference: {
              reference: 'Patient/patient-example-two'
            },
            name: 'patient-example-two',
            exampleCanonical: 'http://example.org/StructureDefiniton/first', // stays as exampleBoolean (not changed to isExample)
            // Profile is added to an extension because it is provided and length > 1
            extension: [
              {
                url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.resource.profile',
                valueCanonical: [
                  'http://example.org/StructureDefiniton/first',
                  'http://example.org/StructureDefiniton/second'
                ]
              }
            ]
          });
        });

        it('should add exampleBoolean if isExample is set and no profile array configured', () => {
          const igPath = path.join(
            tempOut,
            'fsh-generated',
            'resources',
            'ImplementationGuide-fhir.us.minimal.json'
          );
          expect(fs.existsSync(igPath)).toBeTruthy();
          const igContent = fs.readJSONSync(igPath);
          expect(igContent.definition.resource).toContainEqual({
            reference: { reference: 'Patient/patient-example-three' },
            name: 'patient-example-three',
            exampleBoolean: false
          });
        });
      });

      describe('exampleCanonical is set', () => {
        it('should add configured profile array to an extension and not change exampleCanonical if they differ', () => {
          const igPath = path.join(
            tempOut,
            'fsh-generated',
            'resources',
            'ImplementationGuide-fhir.us.minimal.json'
          );
          expect(fs.existsSync(igPath)).toBeTruthy();
          const igContent = fs.readJSONSync(igPath);
          expect(igContent.definition.resource).toContainEqual({
            reference: {
              reference: 'Patient/patient-example-four'
            },
            name: 'patient-example-four',
            exampleCanonical: 'http://hl7.org/fhir/sushi-test/StructureDefinition/sample-patient', // stays as configured
            // extension added with configured profiles
            extension: [
              {
                url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.resource.profile',
                valueCanonical: ['http://example.org/StructureDefinition/solo']
              }
            ]
          });
        });

        it('should not add any extension if the configured profile array matches the configured exampleCanonical', () => {
          const igPath = path.join(
            tempOut,
            'fsh-generated',
            'resources',
            'ImplementationGuide-fhir.us.minimal.json'
          );
          expect(fs.existsSync(igPath)).toBeTruthy();
          const igContent = fs.readJSONSync(igPath);
          expect(igContent.definition.resource).toContainEqual({
            reference: {
              reference: 'Patient/patient-example-five'
            },
            name: 'patient-example-five',
            exampleCanonical: 'http://example.org/StructureDefinition/solo' // stays as configured
            // no extension added because profile array is the same as exampleCanonical
          });
        });
      });
    });

    describe('definition.page.source[x] and definition.page.name', () => {
      let tempOutPages: string;
      let fixtures: string;
      let defs: FHIRDefinitions;

      beforeAll(() => {
        loggerSpy.reset();
        tempOutPages = temp.mkdirSync('sushi-test-pages');
        fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
        defs = new FHIRDefinitions();
        // r5-definitions contains the guide-parameter-code CodeSystem, which was originally included in 5.0.0-ballot
        loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r5-definitions', defs);
      });

      it('should set sourceUrl to extension if it differs from nameUrl', () => {
        const r4WithR5pagesConfig = cloneDeep(minimalConfig);
        r4WithR5pagesConfig.pages = [
          {
            nameUrl: 'nameUrl.md',
            title: 'Name Url',
            sourceUrl: 'different-sourceUrl.md',
            generation: 'markdown',
            page: [
              {
                nameUrl: 'nested-nameUrl.md',
                title: 'Nested Name Url',
                sourceUrl: 'nested-different-sourceUrl.md',
                generation: 'markdown'
              }
            ]
          }
        ];
        const pkg = new Package(r4WithR5pagesConfig);
        const exporter = new IGExporter(pkg, defs, fixtures);
        exporter.export(tempOutPages);

        const igPath = path.join(
          tempOutPages,
          'fsh-generated',
          'resources',
          'ImplementationGuide-fhir.us.minimal.json'
        );
        expect(fs.existsSync(igPath)).toBeTruthy();
        const igContent = fs.readJSONSync(igPath);
        expect(igContent.definition.page.page).toEqual([
          {
            nameUrl: 'nameUrl.html',
            generation: 'markdown',
            title: 'Name Url',
            extension: [
              {
                url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source',
                valueUrl: 'different-sourceUrl.md' // extension added for differing sourceUrl
              }
            ],
            page: [
              {
                nameUrl: 'nested-nameUrl.html',
                generation: 'markdown',
                title: 'Nested Name Url',
                extension: [
                  {
                    url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source',
                    valueUrl: 'nested-different-sourceUrl.md' // extension added for differing sourceUrl
                  }
                ]
              }
            ]
          }
        ]);
      });

      it('should not add an extension if sourceUrl and nameUrl match', () => {
        const r4WithR5pagesConfig = cloneDeep(minimalConfig);
        r4WithR5pagesConfig.pages = [
          {
            nameUrl: 'matching-nameUrl.md',
            title: 'Name Url',
            sourceUrl: 'matching-nameUrl.md',
            generation: 'markdown',
            page: [
              {
                nameUrl: 'nested-matching-nameUrl.md',
                title: 'Nested Name Url',
                sourceUrl: 'nested-matching-nameUrl.md',
                generation: 'markdown'
              }
            ]
          }
        ];
        const pkg = new Package(r4WithR5pagesConfig);
        const exporter = new IGExporter(pkg, defs, fixtures);
        exporter.export(tempOutPages);

        const igPath = path.join(
          tempOutPages,
          'fsh-generated',
          'resources',
          'ImplementationGuide-fhir.us.minimal.json'
        );
        expect(fs.existsSync(igPath)).toBeTruthy();
        const igContent = fs.readJSONSync(igPath);
        expect(igContent.definition.page.page).toEqual([
          {
            nameUrl: 'matching-nameUrl.html',
            generation: 'markdown',
            title: 'Name Url',
            // no extension because nameUrl and sourceUrl match
            page: [
              {
                nameUrl: 'nested-matching-nameUrl.html',
                generation: 'markdown',
                title: 'Nested Name Url'
                // no extension because nameUrl and sourceUrl match
              }
            ]
          }
        ]);
      });

      it('should add name to an extension if sourceUrl is defined', () => {
        const r4WithR5pagesConfig = cloneDeep(minimalConfig);
        r4WithR5pagesConfig.pages = [
          {
            nameUrl: 'name-and-sourceUrl.md',
            title: 'Name and SourceUrl',
            sourceUrl: 'sourceUrl.md',
            name: 'name.md',
            generation: 'markdown',
            page: [
              {
                nameUrl: 'nested-name-and-sourceUrl.md',
                title: 'Nested Name and SourceUrl',
                sourceUrl: 'nested-sourceUrl.md',
                name: 'nested-name.md',
                generation: 'markdown'
              }
            ]
          }
        ];
        const pkg = new Package(r4WithR5pagesConfig);
        const exporter = new IGExporter(pkg, defs, fixtures);
        exporter.export(tempOutPages);

        const igPath = path.join(
          tempOutPages,
          'fsh-generated',
          'resources',
          'ImplementationGuide-fhir.us.minimal.json'
        );
        expect(fs.existsSync(igPath)).toBeTruthy();
        const igContent = fs.readJSONSync(igPath);
        expect(igContent.definition.page.page).toEqual([
          {
            nameUrl: 'name-and-sourceUrl.html',
            title: 'Name and SourceUrl',
            generation: 'markdown',
            extension: [
              {
                url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.name',
                valueUrl: 'name.md' // extension added for name
              },
              {
                url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source',
                valueUrl: 'sourceUrl.md' // extension added for differing sourceUrl
              }
            ],
            page: [
              {
                nameUrl: 'nested-name-and-sourceUrl.html',
                title: 'Nested Name and SourceUrl',
                generation: 'markdown',
                extension: [
                  {
                    url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.name',
                    valueUrl: 'nested-name.md' // extension added for name
                  },
                  {
                    url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source',
                    valueUrl: 'nested-sourceUrl.md' // extension added for differing sourceUrl
                  }
                ]
              }
            ]
          }
        ]);
      });

      it('should add name to an extension if name differs from nameUrl when sourceUrl is not define', () => {
        const r4WithR5pagesConfig = cloneDeep(minimalConfig);
        r4WithR5pagesConfig.pages = [
          {
            nameUrl: 'name.md',
            title: 'Name',
            name: 'different-name.md',
            generation: 'markdown',
            page: [
              {
                nameUrl: 'nested-name.md',
                title: 'Nested Name',
                name: 'different-nested-name.md',
                generation: 'markdown'
              }
            ]
          }
        ];
        const pkg = new Package(r4WithR5pagesConfig);
        const exporter = new IGExporter(pkg, defs, fixtures);
        exporter.export(tempOutPages);

        const igPath = path.join(
          tempOutPages,
          'fsh-generated',
          'resources',
          'ImplementationGuide-fhir.us.minimal.json'
        );
        expect(fs.existsSync(igPath)).toBeTruthy();
        const igContent = fs.readJSONSync(igPath);
        expect(igContent.definition.page.page).toEqual([
          {
            nameUrl: 'name.html',
            title: 'Name',
            generation: 'markdown',
            extension: [
              {
                url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.name',
                valueUrl: 'different-name.md' // extension added for name
              }
            ],
            page: [
              {
                nameUrl: 'nested-name.html',
                title: 'Nested Name',
                generation: 'markdown',
                extension: [
                  {
                    url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.name',
                    valueUrl: 'different-nested-name.md' // extension added for name
                  }
                ]
              }
            ]
          }
        ]);
      });

      it('should not add name to an extension if name and nameUrl match', () => {
        const r4WithR5pagesConfig = cloneDeep(minimalConfig);
        r4WithR5pagesConfig.pages = [
          {
            nameUrl: 'matching-name.md',
            title: 'Matching NameUrl and Name',
            name: 'matching-name.md',
            generation: 'markdown',
            page: [
              {
                nameUrl: 'nested-matching-name.md',
                title: 'Nested Matching NameUrl and Name',
                name: 'nested-matching-name.md',
                generation: 'markdown'
              }
            ]
          }
        ];
        const pkg = new Package(r4WithR5pagesConfig);
        const exporter = new IGExporter(pkg, defs, fixtures);
        exporter.export(tempOutPages);

        const igPath = path.join(
          tempOutPages,
          'fsh-generated',
          'resources',
          'ImplementationGuide-fhir.us.minimal.json'
        );
        expect(fs.existsSync(igPath)).toBeTruthy();
        const igContent = fs.readJSONSync(igPath);
        expect(igContent.definition.page.page).toEqual([
          {
            nameUrl: 'matching-name.html',
            title: 'Matching NameUrl and Name',
            generation: 'markdown',
            // no extension because nameUrl and name match
            page: [
              {
                nameUrl: 'nested-matching-name.html',
                title: 'Nested Matching NameUrl and Name',
                generation: 'markdown'
                // no extension because nameUrl and name match
              }
            ]
          }
        ]);
      });

      it('should add sourceString to an extension', () => {
        const r4WithR5pagesConfig = cloneDeep(minimalConfig);
        r4WithR5pagesConfig.pages = [
          {
            nameUrl: 'sourceString.md',
            title: 'SourceString',
            sourceString: 'sourceString for page',
            generation: 'markdown',
            page: [
              {
                nameUrl: 'nested-sourceString.md',
                title: 'Nested SourceString',
                sourceString: 'nested sourceString for page',
                generation: 'markdown'
              }
            ]
          }
        ];
        const pkg = new Package(r4WithR5pagesConfig);
        const exporter = new IGExporter(pkg, defs, fixtures);
        exporter.export(tempOutPages);

        const igPath = path.join(
          tempOutPages,
          'fsh-generated',
          'resources',
          'ImplementationGuide-fhir.us.minimal.json'
        );
        expect(fs.existsSync(igPath)).toBeTruthy();
        const igContent = fs.readJSONSync(igPath);
        expect(igContent.definition.page.page).toEqual([
          {
            nameUrl: 'sourceString.html',
            title: 'SourceString',
            generation: 'markdown',
            extension: [
              {
                url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source',
                valueString: 'sourceString for page' // extension for source[x] string
              }
            ],
            page: [
              {
                nameUrl: 'nested-sourceString.html',
                title: 'Nested SourceString',
                generation: 'markdown',
                extension: [
                  {
                    url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source',
                    valueString: 'nested sourceString for page' // extension for source[x] string
                  }
                ]
              }
            ]
          }
        ]);
      });

      it('should add sourceMarkdown to an extension', () => {
        const r4WithR5pagesConfig = cloneDeep(minimalConfig);
        r4WithR5pagesConfig.pages = [
          {
            nameUrl: 'sourceMarkdown.md',
            title: 'SourceMarkdown',
            sourceMarkdown: 'sourceMarkdown for page',
            generation: 'markdown',
            page: [
              {
                nameUrl: 'nested-sourceMarkdown.md',
                title: 'Nested SourceMarkdown',
                sourceMarkdown: 'nested sourceMarkdown for page',
                generation: 'markdown'
              }
            ]
          }
        ];
        const pkg = new Package(r4WithR5pagesConfig);
        const exporter = new IGExporter(pkg, defs, fixtures);
        exporter.export(tempOutPages);

        const igPath = path.join(
          tempOutPages,
          'fsh-generated',
          'resources',
          'ImplementationGuide-fhir.us.minimal.json'
        );
        expect(fs.existsSync(igPath)).toBeTruthy();
        const igContent = fs.readJSONSync(igPath);
        expect(igContent.definition.page.page).toEqual([
          {
            nameUrl: 'sourceMarkdown.html',
            title: 'SourceMarkdown',
            generation: 'markdown',
            extension: [
              {
                url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source',
                valueMarkdown: 'sourceMarkdown for page' // extension for source[x] markdown
              }
            ],
            page: [
              {
                nameUrl: 'nested-sourceMarkdown.html',
                title: 'Nested SourceMarkdown',
                generation: 'markdown',
                extension: [
                  {
                    url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.page.source',
                    valueMarkdown: 'nested sourceMarkdown for page' // extension for source[x] markdown
                  }
                ]
              }
            ]
          }
        ]);
      });
    });

    it('should add definition.parameter.code system and code information to an extension if provided', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.parameter).toHaveLength(3); // Two configured + 1 default path-history
      expect(igContent.definition.parameter[0]).toEqual({
        code: 'generate-xml', // code configured without a system is left as is
        value: 'true'
      });
      expect(igContent.definition.parameter[1]).toEqual({
        code: 'special-code', // code configured with a system is parsed out from the system
        value: 'sparkles',
        extension: [
          // extension added with the full Coding provided in configuration
          {
            url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.definition.resource.parameter.code',
            valueCoding: {
              code: 'special-code',
              system: 'http://example.org/parameters'
            }
          }
        ]
      });
    });

    it('should add copyrightLabel information to an extension if provided', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.extension).toContainEqual({
        url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.copyrightLabel',
        valueString: 'Shorty Fsh 2022+'
      });
    });

    it('should add versionAlgorithmString to an extension if provided', () => {
      // Export IG in this test so can test all variations of versionAlgorithm[x]
      const configWithVersionAlgorithm = cloneDeep(minimalConfig);
      configWithVersionAlgorithm.versionAlgorithmString = 'date';

      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const defs = new FHIRDefinitions();
      const pkg = new Package(configWithVersionAlgorithm);
      const exporter = new IGExporter(pkg, defs, fixtures);
      const tempOut = temp.mkdirSync('sushi-test-version-alg');
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);

      expect(igContent.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.versionAlgorithm',
          valueString: 'date'
        }
      ]);
    });

    it('should add versionAlgorithmCoding to an extension if provided', () => {
      // Export IG in this test so can test all variations of versionAlgorithm[x]
      const configWithVersionAlgorithm = cloneDeep(minimalConfig);
      configWithVersionAlgorithm.versionAlgorithmCoding = {
        system: 'http://example.org',
        code: 'semver'
      };

      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const defs = new FHIRDefinitions();
      const pkg = new Package(configWithVersionAlgorithm);
      const exporter = new IGExporter(pkg, defs, fixtures);
      const tempOut = temp.mkdirSync('sushi-test-version-alg');
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);

      expect(igContent.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.versionAlgorithm',
          valueCoding: { system: 'http://example.org', code: 'semver' }
        }
      ]);
    });

    it('should add dependsOn.reason to an extension if provided', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.dependsOn).toEqual([
        {
          packageId: 'hl7.fhir.us.ocean',
          uri: 'http://example.org/ocean',
          id: 'ocean',
          version: '1.0.0',
          extension: [
            {
              url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-ImplementationGuide.dependsOn.reason',
              valueMarkdown: 'The ocean is essential because it has fsh'
            }
          ]
        }
      ]);
    });
  });

  describe('#resolve-latest', () => {
    let ig: any;

    beforeAll(() => {
      loggerSpy.reset();
      const tempOut = temp.mkdirSync('sushi-test');
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const defs = new FHIRDefinitions();
      // r4-definitions contains ImplementationGuide-hl7.fhir.us.core.json used for resolution
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      // add de.medizininformatikinitiative.kerndatensatz.consent package.json used for resolution
      defs.addPackageJson('de.medizininformatikinitiative.kerndatensatz.consent', {
        name: 'de.medizininformatikinitiative.kerndatensatz.consent',
        version: '1.0.6',
        description: 'Put a description here',
        author: 'sebastianstubert',
        fhirVersions: ['4.0.1'],
        dependencies: {
          'de.einwilligungsmanagement': '1.0.1'
        }
      });
      const config = cloneDeep(minimalConfig);
      config.dependencies = [
        { packageId: 'hl7.fhir.us.core', version: 'latest' },
        { packageId: 'de.medizininformatikinitiative.kerndatensatz.consent', version: 'latest' }
      ];
      const pkg = new Package(config);
      const exporter = new IGExporter(pkg, defs, fixtures);
      // No need to regenerate the IG on every test -- generate it once and inspect what you
      // need to in the tests
      exporter.export(tempOut);
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
      ig = fs.readJSONSync(igPath);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should use the resolved version of a package from IG JSON when a dependency version is "latest"', () => {
      const dependencies: ImplementationGuideDependsOn[] = ig.dependsOn;
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
      // Ensure US Core is exported with the resolved version
      expect(dependencies).toContainEqual({
        id: 'hl7_fhir_us_core',
        uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
        packageId: 'hl7.fhir.us.core',
        version: '3.1.0'
      });
    });

    it('should use the resolved version of a package from package.json when a dependency version is "latest"', () => {
      // See: https://chat.fhir.org/#narrow/stream/215610-shorthand/topic/automatically.20get.20latest.20dependencies/near/419245939
      const dependencies: ImplementationGuideDependsOn[] = ig.dependsOn;
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
      // Ensure consent is exported with the resolved version
      expect(dependencies).toContainEqual({
        id: 'de_medizininformatikinitiative_kerndatensatz_consent',
        uri: 'http://fhir.org/packages/de.medizininformatikinitiative.kerndatensatz.consent/ImplementationGuide/de.medizininformatikinitiative.kerndatensatz.consent',
        packageId: 'de.medizininformatikinitiative.kerndatensatz.consent',
        version: '1.0.6'
      });
    });
  });
});
