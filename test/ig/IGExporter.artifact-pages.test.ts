import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { IGExporter } from '../../src/ig';
import { Package } from '../../src/export';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { minimalConfig } from '../utils/minimalConfig';
import { FHIRDefinitions, loadFromPath, loadCustomResources } from '../../src/fhirdefs';
import { StructureDefinition, CodeSystem, InstanceDefinition, ValueSet } from '../../src/fhirtypes';
import { TestFisher } from '../testhelpers';

describe('IGExporter', () => {
  temp.track();

  describe('#artifact-pages', () => {
    let pkg: Package;
    let tempOut: string;
    let fixtures: string;
    let defs: FHIRDefinitions;

    beforeAll(() => {
      fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
    });

    beforeEach(() => {
      loggerSpy.reset();
      defs = new FHIRDefinitions();
      loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
      tempOut = temp.mkdirSync('sushi-test');
      pkg = new Package(minimalConfig);
      // add some resources to the package
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
      // Logical: StructureDefinition/CustomLogicalModel
      // this one comes from a different set of test fixtures
      pkg.logicals.push(
        StructureDefinition.fromJSON(
          fs.readJsonSync(
            path.join(
              __dirname,
              'fixtures',
              'simple-ig-plus',
              'logicals',
              'StructureDefinition-CustomLogicalModel.json'
            )
          )
        )
      );

      // CodeSystem: StructureDefinition/sample-code-system
      const codeSystemDef = new CodeSystem();
      codeSystemDef.id = 'sample-code-system';
      codeSystemDef.name = 'SampleCodeSystem';
      codeSystemDef.url = 'http://hl7.org/fhir/sushi-test/CodeSystem/sample-code-system';
      codeSystemDef.description = 'A code system description';
      pkg.codeSystems.push(codeSystemDef);

      // ValueSet: ValueSet/sample-value-set
      const valueSetDef = new ValueSet();
      valueSetDef.id = 'sample-value-set';
      valueSetDef.name = 'SampleValueSet';
      valueSetDef.url = 'http://hl7.org/fhir/sushi-test/ValueSet/sample-value-set';
      valueSetDef.description = 'Sample value set description';
      pkg.valueSets.push(valueSetDef);

      // Example: Patient/patient-example
      const instanceDef = InstanceDefinition.fromJSON(
        fs.readJSONSync(path.join(fixtures, 'examples', 'Patient-example.json'))
      );
      instanceDef._instanceMeta.usage = 'Example';
      pkg.instances.push(instanceDef);
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should not generate artifact pages when config.addArtifactPages is not true', () => {
      const exporter = new IGExporter(pkg, defs, '');
      exporter.export(tempOut);
      const profilePath = path.join(tempOut, 'input', 'pagecontent', 'profiles.md');
      const extensionPath = path.join(tempOut, 'input', 'pagecontent', 'extensions.md');
      const logicalPath = path.join(tempOut, 'input', 'pagecontent', 'logicals.md');
      const valueSetPath = path.join(tempOut, 'input', 'pagecontent', 'valueSets.md');
      const codeSystemPath = path.join(tempOut, 'input', 'pagecontent', 'codeSystems.md');
      const instancePath = path.join(tempOut, 'input', 'pagecontent', 'instances.md');
      expect(fs.existsSync(profilePath)).toBe(false);
      expect(fs.existsSync(extensionPath)).toBe(false);
      expect(fs.existsSync(logicalPath)).toBe(false);
      expect(fs.existsSync(valueSetPath)).toBe(false);
      expect(fs.existsSync(codeSystemPath)).toBe(false);
      expect(fs.existsSync(instancePath)).toBe(false);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should generate artifact pages for each type of artifact', () => {
      pkg.config.createArtifactPages = true;
      const exporter = new IGExporter(pkg, defs, '');
      exporter.export(tempOut);
      const profilePath = path.join(tempOut, 'input', 'pagecontent', 'profiles.md');
      const extensionPath = path.join(tempOut, 'input', 'pagecontent', 'extensions.md');
      const logicalPath = path.join(tempOut, 'input', 'pagecontent', 'logicals.md');
      const valueSetPath = path.join(tempOut, 'input', 'pagecontent', 'valueSets.md');
      const codeSystemPath = path.join(tempOut, 'input', 'pagecontent', 'codeSystems.md');
      const instancePath = path.join(tempOut, 'input', 'pagecontent', 'instances.md');
      expect(fs.existsSync(profilePath)).toBe(true);
      expect(fs.existsSync(extensionPath)).toBe(true);
      expect(fs.existsSync(logicalPath)).toBe(true);
      expect(fs.existsSync(valueSetPath)).toBe(true);
      expect(fs.existsSync(codeSystemPath)).toBe(true);
      expect(fs.existsSync(instancePath)).toBe(true);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should list generated and predefined artifacts in alphabetical order', () => {
      pkg.config.createArtifactPages = true;
      // load up some predefined resources
      const customResources = path.join(__dirname, 'fixtures', 'customized-ig-with-resources');
      loadCustomResources(path.join(customResources, 'input'), undefined, undefined, defs);
      const exporter = new IGExporter(pkg, defs, customResources);
      // add some more profiles to the package
      const observationJSON = fs.readJSONSync(
        path.join(fixtures, 'profiles', 'StructureDefinition-sample-observation.json')
      );
      pkg.profiles.push(StructureDefinition.fromJSON(observationJSON));
      const extraObservation = StructureDefinition.fromJSON(observationJSON);
      extraObservation.id = 'extra-observation';
      extraObservation.name = 'ExtraObservation';
      extraObservation.description = 'This is an extra observation.';
      pkg.profiles.push(extraObservation);

      exporter.export(tempOut);
      const profilePath = path.join(tempOut, 'input', 'pagecontent', 'profiles.md');
      const profileContent = fs.readFileSync(profilePath, 'utf-8');
      expect(profileContent).toMatch(
        /ExtraObservation.*MyPatient.*SampleObservation.*SamplePatient.*This patient has a title/s
      );
      const extensionPath = path.join(tempOut, 'input', 'pagecontent', 'extensions.md');
      const extensionContent = fs.readFileSync(extensionPath, 'utf-8');
      expect(extensionContent).toMatch(/Birth Place.*Birth Place.*SampleValueExtension/s);
    });

    it('should allow predefined resources to override generated resources', () => {
      pkg.config.createArtifactPages = true;
      // load up some predefined resources
      const customResources = path.join(__dirname, 'fixtures', 'customized-ig-with-resources');
      loadCustomResources(path.join(customResources, 'input'), undefined, undefined, defs);
      const exporter = new IGExporter(pkg, defs, customResources);
      // Add a profile to the package with the same id as a predefined profile
      const fisher = new TestFisher(null, defs, pkg);
      const patient = fisher.fishForStructureDefinition('Patient');
      patient.id = 'MyPatient';
      patient.name = 'MyPatient';
      patient.description = 'This should go away';
      pkg.profiles.push(patient);

      exporter.export(tempOut);
      const profilePath = path.join(tempOut, 'input', 'pagecontent', 'profiles.md');
      const profileContent = fs.readFileSync(profilePath, 'utf-8');
      expect(profileContent).toMatch(/MyPatient.*SamplePatient.*This patient has a title/s);
      expect(profileContent).not.toMatch(/This should go away/s);
    });

    it('should emit an error and not generate artifact pages if a page with the same path already exists', () => {
      pkg.config.createArtifactPages = true;
      const exporter = new IGExporter(pkg, defs, '');
      // make a pre-existing file at profiles.md
      const pageContentPath = path.join(tempOut, 'input', 'pagecontent');
      fs.ensureDirSync(pageContentPath);
      const existingFile = path.join(pageContentPath, 'profiles.md');
      fs.writeFileSync(existingFile, 'This is pre-existing content.', 'utf-8');

      exporter.export(tempOut);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toBe(
        'A page named profiles.md already exists. No artifact page will be created at this path.'
      );
      // the content of the file should be unchanged
      const content = fs.readFileSync(existingFile, 'utf-8');
      expect(content).toBe('This is pre-existing content.');
    });

    it('should not generate artifact pages when no artifact of that type is present', () => {
      pkg.config.createArtifactPages = true;
      const exporter = new IGExporter(pkg, defs, '');
      // remove the profile from the package
      pkg.profiles.splice(0);

      exporter.export(tempOut);
      const profilePath = path.join(tempOut, 'input', 'pagecontent', 'profiles.md');
      const extensionPath = path.join(tempOut, 'input', 'pagecontent', 'extensions.md');
      const logicalPath = path.join(tempOut, 'input', 'pagecontent', 'logicals.md');
      const valueSetPath = path.join(tempOut, 'input', 'pagecontent', 'valueSets.md');
      const codeSystemPath = path.join(tempOut, 'input', 'pagecontent', 'codeSystems.md');
      const instancePath = path.join(tempOut, 'input', 'pagecontent', 'instances.md');
      expect(fs.existsSync(profilePath)).toBe(false);
      expect(fs.existsSync(extensionPath)).toBe(true);
      expect(fs.existsSync(logicalPath)).toBe(true);
      expect(fs.existsSync(valueSetPath)).toBe(true);
      expect(fs.existsSync(codeSystemPath)).toBe(true);
      expect(fs.existsSync(instancePath)).toBe(true);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });
});
