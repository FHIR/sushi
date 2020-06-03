import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { loggerSpy } from '../testhelpers/loggerSpy';
import {
  findInputDir,
  ensureOutputDir,
  readConfig,
  loadExternalDependencies,
  getRawFSHes,
  writeFHIRResources,
  getIgDataPath
} from '../../src/utils/Processing';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { Package } from '../../src/export';
import { StructureDefinition, ValueSet, CodeSystem, InstanceDefinition } from '../../src/fhirtypes';

describe('Processing', () => {
  temp.track();

  describe('#findInputDir()', () => {
    let tempRoot: string;

    beforeAll(() => {
      tempRoot = temp.mkdirSync('sushi-test');
      fs.mkdirSync(path.join(tempRoot, 'has-fsh'));
      fs.mkdirSync(path.join(tempRoot, 'has-fsh', 'fsh'));
      fs.mkdirSync(path.join(tempRoot, 'no-fsh'));
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should find a path to the current working directory when no input folder is specified', () => {
      const foundInput = findInputDir(undefined);
      expect(foundInput).toBe('.');
    });

    it('should find a path to the fsh subdirectory if present', () => {
      const input = path.join(tempRoot, 'has-fsh');
      const foundInput = findInputDir(input);
      expect(foundInput).toBe(path.join(tempRoot, 'has-fsh', 'fsh'));
    });

    it('should find a path to the provided directory if the fsh subdirectory is not present', () => {
      const input = path.join(tempRoot, 'no-fsh');
      const foundInput = findInputDir(input);
      expect(foundInput).toBe(input);
    });
  });

  describe('#ensureOutputDir()', () => {
    let tempRoot: string;

    beforeAll(() => {
      tempRoot = temp.mkdirSync('sushi-test');
      fs.mkdirSync(path.join(tempRoot, 'my-input'));
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should use and create the output directory when it is provided', () => {
      const input = path.join(tempRoot, 'my-input');
      const output = path.join(tempRoot, 'my-output');
      const igContextOutputDir = ensureOutputDir(input, output, true);
      const nonIgContextOutputDir = ensureOutputDir(input, output, false);
      expect(igContextOutputDir).toBe(output);
      expect(nonIgContextOutputDir).toBe(output);
      expect(fs.existsSync(output)).toBeTruthy();
    });

    it('should default the output directory to "build" when not running in IG Publisher context', () => {
      const input = path.join(tempRoot, 'my-input');
      const outputDir = ensureOutputDir(input, undefined, false);
      expect(outputDir).toBe('build');
      expect(fs.existsSync(outputDir)).toBeTruthy();
    });

    it('should default the output directory to the parent of the input when running in IG Publisher context', () => {
      const input = path.join(tempRoot, 'my-input');
      const outputDir = ensureOutputDir(input, undefined, true);
      expect(outputDir).toBe(tempRoot);
      expect(fs.existsSync(outputDir)).toBeTruthy();
    });
  });

  describe('#readConfig()', () => {
    beforeEach(() => {
      loggerSpy.reset();
    });

    it('should return the contents of package.json from the input directory', () => {
      const input = path.join(__dirname, 'fixtures', 'valid-json');
      const expectedConfig = fs.readJSONSync(path.join(input, 'package.json'));
      const config = readConfig(input);
      expect(config).toEqual(expectedConfig);
    });

    it('should log and throw an error when package.json is not found in the input directory', () => {
      const input = path.join(__dirname, 'fixtures', 'no-package');
      expect(() => {
        readConfig(input);
      }).toThrow();
      expect(loggerSpy.getLastMessage('error')).toMatch(/No package\.json/s);
    });

    it('should log and throw an error when the contents of package.json are not valid json', () => {
      const input = path.join(__dirname, 'fixtures', 'invalid-json');
      expect(() => {
        readConfig(input);
      }).toThrow();
      expect(loggerSpy.getLastMessage('error')).toMatch(/not valid JSON/s);
    });

    it('should log and throw an error when the configuration does not include a FHIR R4 dependency', () => {
      const input = path.join(__dirname, 'fixtures', 'no-fhir-r4');
      expect(() => {
        readConfig(input);
      }).toThrow();
      expect(loggerSpy.getLastMessage('error')).toMatch(/must specify FHIR R4 as a dependency/s);
    });
  });

  describe('#loadExternalDependencies()', () => {
    beforeEach(() => {
      loggerSpy.reset();
    });

    it('should load specified dependencies', () => {
      const config = {
        dependencies: {
          'hl7.fhir.r4.core': '4.0.1',
          'hl7.fhir.us.core': '3.1.0',
          'hl7.fhir.uv.vhdir': 'current'
        }
      };
      const defs = new FHIRDefinitions();
      const dependencyDefs = loadExternalDependencies(defs, config);
      return Promise.all(dependencyDefs).then(() => {
        expect(defs.packages.length).toBe(3);
        expect(defs.packages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(defs.packages).toContain('hl7.fhir.us.core#3.1.0');
        expect(defs.packages).toContain('hl7.fhir.uv.vhdir#current');
      });
    });

    it('should log an error when it fails to load a dependency', () => {
      const config = {
        dependencies: {
          'hl7.fhir.r4.core': '4.0.1',
          'hl7.fhir.us.core': '3.1.0',
          'hl7.does.not.exist': 'current'
        }
      };
      const defs = new FHIRDefinitions();
      const dependencyDefs = loadExternalDependencies(defs, config);
      return Promise.all(dependencyDefs).then(() => {
        expect(defs.packages.length).toBe(2);
        expect(defs.packages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(defs.packages).toContain('hl7.fhir.us.core#3.1.0');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Failed to load hl7\.does\.not\.exist#current/s
        );
      });
    });
  });

  describe('#getRawFSHes()', () => {
    it('should return a RawFSH for each file in the input directory that ends with .fsh', () => {
      const input = path.join(__dirname, 'fixtures', 'fsh-files');
      const rawFSHes = getRawFSHes(input);
      expect(rawFSHes.length).toBe(2);
      expect(rawFSHes).toContainEqual({
        content: '// Content of first file',
        path: path.join(input, 'first.fsh')
      });
      expect(rawFSHes).toContainEqual({
        content: '// Content of second file',
        path: path.join(input, 'second.fsh')
      });
    });

    it('should log and throw an error when the input path is invalid', () => {
      const input = path.join(__dirname, 'fixtures', 'wrong-path');
      expect(() => {
        getRawFSHes(input);
      }).toThrow();
      expect(loggerSpy.getLastMessage('error')).toMatch(/Invalid path to FSH definition folder\./s);
    });
  });

  describe('#writeFHIRResources()', () => {
    let tempRoot: string;
    let outPackage: Package;

    beforeAll(() => {
      tempRoot = temp.mkdirSync('output-dir');
      const input = path.join(__dirname, 'fixtures', 'valid-json');
      const config = readConfig(input);
      outPackage = new Package(config);

      const myProfile = new StructureDefinition();
      myProfile.id = 'my-profile';
      const myExtension = new StructureDefinition();
      myExtension.id = 'my-extension';
      const myValueSet = new ValueSet();
      myValueSet.id = 'my-value-set';
      const myCodeSystem = new CodeSystem();
      myCodeSystem.id = 'my-code-system';

      const myInlineInstance = new InstanceDefinition();
      myInlineInstance.id = 'my-inline-instance';
      myInlineInstance._instanceMeta.usage = 'Inline';
      const myExampleInstance = new InstanceDefinition();
      myExampleInstance.id = 'my-example';
      myExampleInstance.resourceType = 'Observation';
      myExampleInstance._instanceMeta.usage = 'Example';
      const myCapabilityStatement = new InstanceDefinition();
      myCapabilityStatement.id = 'my-capabilities';
      myCapabilityStatement.resourceType = 'CapabilityStatement';
      const myConceptMap = new InstanceDefinition();
      myConceptMap.id = 'my-concept-map';
      myConceptMap.resourceType = 'ConceptMap';
      const myModelInstance = new InstanceDefinition();
      myModelInstance.id = 'my-model';
      myModelInstance.resourceType = 'StructureDefinition';
      myModelInstance.kind = 'logical';
      const myOperationDefinition = new InstanceDefinition();
      myOperationDefinition.id = 'my-operation';
      myOperationDefinition.resourceType = 'OperationDefinition';
      const myExtensionInstance = new InstanceDefinition();
      myExtensionInstance.id = 'my-extension-instance';
      myExtensionInstance.resourceType = 'StructureDefinition';
      myExtensionInstance.kind = 'resource';
      myExtensionInstance.type = 'Extension';
      const myProfileInstance = new InstanceDefinition();
      myProfileInstance.id = 'my-profile-instance';
      myProfileInstance.resourceType = 'StructureDefinition';
      myProfileInstance.kind = 'resource';
      myProfileInstance.type = 'Observation';
      const myOtherInstance = new InstanceDefinition();
      myOtherInstance.id = 'my-other-instance';
      myOtherInstance.resourceType = 'Observation';

      outPackage.profiles.push(myProfile);
      outPackage.extensions.push(myExtension);
      outPackage.valueSets.push(myValueSet);
      outPackage.codeSystems.push(myCodeSystem);
      outPackage.instances.push(
        myInlineInstance,
        myExampleInstance,
        myCapabilityStatement,
        myConceptMap,
        myModelInstance,
        myOperationDefinition,
        myExtensionInstance,
        myProfileInstance,
        myOtherInstance
      );
      writeFHIRResources(tempRoot, outPackage, false);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should write profiles and profile instances to the "profiles" directory', () => {
      const profilesPath = path.join(tempRoot, 'input', 'profiles');
      expect(fs.existsSync(profilesPath)).toBeTruthy();
      const profilesFiles = fs.readdirSync(profilesPath);
      expect(profilesFiles.length).toBe(2);
      expect(profilesFiles).toContain('StructureDefinition-my-profile.json');
      expect(profilesFiles).toContain('StructureDefinition-my-profile-instance.json');
    });

    it('should write extensions and extension instances to the "extensions" directory', () => {
      const extensionsPath = path.join(tempRoot, 'input', 'extensions');
      expect(fs.existsSync(extensionsPath)).toBeTruthy();
      const extensionsFiles = fs.readdirSync(extensionsPath);
      expect(extensionsFiles.length).toBe(2);
      expect(extensionsFiles).toContain('StructureDefinition-my-extension.json');
      expect(extensionsFiles).toContain('StructureDefinition-my-extension-instance.json');
    });

    it('should write value sets, code systems, and vocabulary instances to the "vocabulary" directory', () => {
      const vocabularyPath = path.join(tempRoot, 'input', 'vocabulary');
      expect(fs.existsSync(vocabularyPath)).toBeTruthy();
      const vocabularyFiles = fs.readdirSync(vocabularyPath);
      expect(vocabularyFiles.length).toBe(3);
      expect(vocabularyFiles).toContain('ValueSet-my-value-set.json');
      expect(vocabularyFiles).toContain('CodeSystem-my-code-system.json');
      expect(vocabularyFiles).toContain('ConceptMap-my-concept-map.json');
    });

    it('should write example instances to the "examples" directory', () => {
      const examplesPath = path.join(tempRoot, 'input', 'examples');
      expect(fs.existsSync(examplesPath)).toBeTruthy();
      const examplesFiles = fs.readdirSync(examplesPath);
      expect(examplesFiles.length).toBe(1);
      expect(examplesFiles).toContain('Observation-my-example.json');
    });

    it('should write capability instances to the "capabilities" directory', () => {
      const capabilitiesPath = path.join(tempRoot, 'input', 'capabilities');
      expect(fs.existsSync(capabilitiesPath)).toBeTruthy();
      const capabilitiesFiles = fs.readdirSync(capabilitiesPath);
      expect(capabilitiesFiles.length).toBe(1);
      expect(capabilitiesFiles).toContain('CapabilityStatement-my-capabilities.json');
    });

    it('should write model instances to the "models" directory', () => {
      const modelsPath = path.join(tempRoot, 'input', 'models');
      expect(fs.existsSync(modelsPath)).toBeTruthy();
      const modelsFiles = fs.readdirSync(modelsPath);
      expect(modelsFiles.length).toBe(1);
      expect(modelsFiles).toContain('StructureDefinition-my-model.json');
    });

    it('should write operation instances to the "operations" directory', () => {
      const operationsPath = path.join(tempRoot, 'input', 'operations');
      expect(fs.existsSync(operationsPath)).toBeTruthy();
      const operationsFiles = fs.readdirSync(operationsPath);
      expect(operationsFiles.length).toBe(1);
      expect(operationsFiles).toContain('OperationDefinition-my-operation.json');
    });

    it('should write all other non-inline instances to the "resources" directory', () => {
      const resourcesPath = path.join(tempRoot, 'input', 'resources');
      expect(fs.existsSync(resourcesPath)).toBeTruthy();
      const resourcesFiles = fs.readdirSync(resourcesPath);
      expect(resourcesFiles.length).toBe(1);
      expect(resourcesFiles).toContain('Observation-my-other-instance.json');
    });

    it('should write an info message with the number of instances exported', () => {
      expect(loggerSpy.getLastMessage('info')).toMatch(/Exported 12 FHIR resources/s);
    });
  });

  describe('#getIgDataPath()', () => {
    let tempRoot: string;

    beforeAll(() => {
      tempRoot = temp.mkdirSync('sushi-test');
      fs.mkdirSync(path.join(tempRoot, 'yes-please'));
      fs.mkdirSync(path.join(tempRoot, 'yes-please', 'ig-data'));
      fs.mkdirSync(path.join(tempRoot, 'not-this-time'));
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should return the path to the ig-data directory when it exists', () => {
      const input = path.join(tempRoot, 'yes-please');
      const igDataPath = getIgDataPath(input);
      expect(igDataPath).toBe(path.join(input, 'ig-data'));
    });

    it('should return null when the path to the ig-data directory does not exist', () => {
      const input = path.join(tempRoot, 'not-this-time');
      const igDataPath = getIgDataPath(input);
      expect(igDataPath).toBeNull();
    });
  });
});
