import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
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
          }
          if (instanceDef.id === 'patient-example-three') {
            instanceDef._instanceMeta.usage = 'Inline';
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

    it('should issue an error when a dependency url cannot be inferred', () => {
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
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Failed to add hl7\.fhir\.us\.mcode:1\.0\.0 to ImplementationGuide instance .* IG URL/
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

    it('should generate an implementation guide for simple-ig with package containing logical model and custom resource', () => {
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
                reference: 'StructureDefinition/sample-observation'
              },
              name: 'SampleObservation',
              description:
                'Measurements and simple assertions made about a patient, device or other subject.',
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
                reference: 'StructureDefinition/CustomLogicalModel'
              },
              name: 'Custom Logical Model Defined with FSH',
              description:
                'This is an example of a custom logical model defined using FSH with parent of Element',
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
            },
            {
              code: 'autoload-resources',
              value: 'false'
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

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-resources');
      loadCustomResources(path.join(fixtures, 'input'), defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
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
        // NOTE: no description since Goal is not a conformance resource (and Goal.description is a CodeableConcept)
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

    it('should log an error for input files missing resourceType or id', () => {
      exporter.export(tempOut);
      expect(loggerSpy.getFirstMessage('error')).toMatch(
        /.*InvalidPatient.json must define resourceType and id/
      );
    });
  });

  describe('#customized-ig-with-nested-resources', () => {
    let exporter: IGExporter;
    let tempOut: string;
    let fixtures: string;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      fixtures = path.join(__dirname, 'fixtures', 'customized-ig-with-nested-resources');
      loadCustomResources(path.join(fixtures, 'input'), defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      const config = cloneDeep(minimalConfig);
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
      expect(igContent.definition.resource).toHaveLength(2);
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
    });

    it('should warn on deeply nested resources', () => {
      exporter.export(tempOut);
      const warning = loggerSpy.getFirstMessage('warn');
      expect(warning).toInclude(
        'The following files were not added to the ImplementationGuide JSON'
      );
      expect(warning).toInclude(path.join('nested1', 'StructureDefinition-MyTitlePatient.json'));
      expect(warning).toInclude(path.join('nested2', 'ValueSet-MyVS.json'));
      expect(warning).not.toInclude('Patient-BarPatient.json');
      expect(warning).not.toInclude('StructureDefinition-MyPatient.json');
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
      loadCustomResources(path.join(fixtures, 'input'), defs);
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
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
              valueCode: 'application/json'
            }
          ],
          name: 'Example of LM JSON',
          exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
        },
        {
          reference: {
            reference: 'Binary/example-logical-model-xml'
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
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

    it('should add logical model and example resource references to the ImplementationGuide resource', () => {
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
            url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
            valueCode: 'application/json'
          }
        ],
        name: 'Example of LM JSON',
        exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
      });
      expect(igContent.definition.resource).toContainEqual({
        reference: {
          reference: 'Binary/example-logical-model-xml'
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/implementationguide-resource-format',
            valueCode: 'application/xml'
          }
        ],
        name: 'Example of LM XML',
        exampleCanonical: `${config.canonical}/StructureDefinition/MyLM`
      });
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
});
