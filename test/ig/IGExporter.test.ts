import temp from 'temp';
import path from 'path';
import fs from 'fs-extra';
import { Package } from '../../src/export';
import { IGExporter } from '../../src/ig';
import { importConfiguration } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { loggerSpy } from '../testhelpers';

describe('IGExporter', () => {
  describe('#minimal-config', () => {
    let tempOut: string;

    beforeAll(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      const configPath = path.join(__dirname, '..', 'import', 'fixtures', 'minimal-config.yaml');
      const configYaml = fs.readFileSync(configPath, 'utf8');
      const config = importConfiguration(configYaml, configPath);
      const pkg = new Package(config);
      const exporter = new IGExporter(pkg, null, path.join(__dirname, 'ig-data'), true);
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should export default files when no configuration values affect those files', () => {
      // defaults are:
      // no package-list.json
      const packageListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(packageListPath)).toBeFalsy();
      // no menu.xml
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeFalsy();
      // no ig.ini
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy();
      // generated implementation guide
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      expect(fs.existsSync(igPath)).toBeTruthy();
    });

    it('should put default content into ImplementationGuide file', () => {
      const igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      const igContent = fs.readJSONSync(igPath);

      expect(igContent.id).toBe('fhir.us.minimal');
      expect(igContent.definition.resource).toHaveLength(0);
    });
  });

  describe('#additional-config', () => {
    let tempOut: string;

    beforeAll(() => {
      loggerSpy.reset();
      tempOut = temp.mkdirSync('sushi-test');
      const configPath = path.join(__dirname, '..', 'import', 'fixtures', 'example-config.yaml');
      const configYaml = fs.readFileSync(configPath, 'utf8');
      const config = importConfiguration(configYaml, configPath);
      const pkg = new Package(config);
      const defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'testPackage',
        defs
      );
      const exporter = new IGExporter(pkg, defs, path.join(__dirname, 'ig-data'));
      exporter.export(tempOut);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should add elements to the implementation guide definition based upon configuration', () => {
      const igPath = path.join(tempOut, 'input', 'ImplementationGuide-fhir.us.example.json');
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.grouping).toHaveLength(2);
      expect(igContent.definition.grouping[0].name).toBe('GroupA');
      expect(igContent.definition.resource).toHaveLength(1);
      expect(igContent.definition.resource[0].name).toBe('My Example Patient');
      expect(igContent.definition.page.page).toHaveLength(3);
      expect(igContent.definition.page.page[0].title).toBe('Example Home');
      // one each for releaselabel and copyrightyear, three configured parameters, and one for the history
      expect(igContent.definition.parameter).toHaveLength(6);
      expect(igContent.definition.parameter[2]).toEqual({
        code: 'excludettl',
        value: 'true'
      });
    });

    it('should create package-list.json based upon configuration', () => {
      const packageListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(packageListPath)).toBeTruthy();
      const packageListContent = fs.readJSONSync(packageListPath);
      expect(packageListContent['package-id']).toBe('fhir.us.example');
      expect(packageListContent.list).toHaveLength(3);
    });

    it('should create menu.xml based upon configuration', () => {
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeTruthy();
      const menuContent = fs.readFileSync(menuPath, 'utf8');
      expect(menuContent).toMatch(
        /Artifacts.*Profiles.*Extensions.*Value Sets.*Downloads.*History/s
      );
    });
  });
});
