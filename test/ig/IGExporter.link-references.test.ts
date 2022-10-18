import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { Package } from '../../src/export';
import { IGExporter } from '../../src/ig';
import { FHIRDefinitions, loadCustomResources } from '../../src/fhirdefs';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { minimalConfig } from '../utils/minimalConfig';
import { CodeSystem } from '../../src/fhirtypes';

describe('IGExporter', () => {
  temp.track();

  describe('#link-references', () => {
    let pkg: Package;
    let exporter: IGExporter;
    let defs: FHIRDefinitions;
    let tempOut: string;

    beforeEach(() => {
      tempOut = temp.mkdirSync('sushi-test');
      defs = new FHIRDefinitions();
      loadCustomResources(
        path.resolve(__dirname, 'fixtures', 'customized-ig-with-resources', 'input'),
        undefined,
        undefined,
        defs
      );
      loggerSpy.reset();
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should create links for each resource in the IG', () => {
      pkg = new Package({
        ...minimalConfig,
        resources: [
          {
            reference: { reference: 'ValueSet/unique-vs' },
            name: 'UniqueVS'
          },
          {
            reference: { reference: 'CodeSystem/nameless-cs' }
          }
        ]
      });
      // make a little codesystem to add to the package
      const littleCodeSystem = new CodeSystem();
      littleCodeSystem.id = 'little-cs';
      littleCodeSystem.name = 'LittleCodeSystem';
      littleCodeSystem.title = 'Little Code System';
      littleCodeSystem.description = 'A rather small code system';
      pkg.codeSystems.push(littleCodeSystem);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig-with-resources');
      exporter = new IGExporter(pkg, defs, igDataPath);
      exporter.export(tempOut);
      const linkReferencesPath = path.join(
        tempOut,
        'fsh-generated',
        'includes',
        'fsh-link-references.md'
      );
      expect(fs.existsSync(linkReferencesPath)).toBeTrue();
      const content = fs.readFileSync(linkReferencesPath, 'utf-8');
      // we should have links from resources in the package,
      expect(content).toMatch(/^\[LittleCodeSystem\]: CodeSystem-little-cs\.html$/m);
      // predefined resources,
      expect(content).toMatch(/^\[MyPatient\]: StructureDefinition-MyPatient\.html$/m);
      expect(content).toMatch(/^\[birthPlace\]: StructureDefinition-patient-birthPlace\.html$/m);
      // and config-only resources,
      expect(content).toMatch(/^\[UniqueVS\]: ValueSet-unique-vs\.html$/m);
      // even when the config doesn't give it a name
      expect(content).toMatch(/^\[nameless-cs\]: CodeSystem-nameless-cs\.html$/m);
    });

    it('should not create a file if there are no resources in the IG', () => {
      // reset defs so we have no predefined resources
      defs = new FHIRDefinitions();
      // configure the little codesystem to be omitted from the IG
      pkg = new Package({
        ...minimalConfig,
        resources: [
          {
            reference: { reference: 'CodeSystem/little-cs' },
            omit: true
          }
        ]
      });
      // make a little codesystem to add to the package
      const littleCodeSystem = new CodeSystem();
      littleCodeSystem.id = 'little-cs';
      littleCodeSystem.name = 'LittleCodeSystem';
      littleCodeSystem.description = 'A rather small code system';
      pkg.codeSystems.push(littleCodeSystem);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig-with-resources');
      exporter = new IGExporter(pkg, defs, igDataPath);
      exporter.export(tempOut);
      const linkReferencesPath = path.join(
        tempOut,
        'fsh-generated',
        'includes',
        'fsh-link-references.md'
      );
      expect(fs.existsSync(linkReferencesPath)).toBeFalse();
    });
  });
});
