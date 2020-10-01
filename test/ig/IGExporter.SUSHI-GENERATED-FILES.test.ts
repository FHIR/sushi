import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { cloneDeep } from 'lodash';
import { IGExporter } from '../../src/ig';
import { Package } from '../../src/export';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { minimalConfig } from '../utils/minimalConfig';
// import loggerSpy to suppress log messages
import '../testhelpers/loggerSpy';

describe('IGExporter', () => {
  temp.track();

  describe('#SUSHI-GENERATED-FILES', () => {
    let defs: FHIRDefinitions;

    beforeAll(() => {
      defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'testPackage',
        defs
      );
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should generate a SUSHI-GENERATED-FILES.md with the correct listings when configs are copied', () => {
      const config = cloneDeep(minimalConfig);
      delete config.template;
      const pkg = new Package(config);
      const fixtures = path.join(__dirname, 'fixtures', 'customized-ig');
      const exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
      const tempOut = temp.mkdirSync('sushi-test');
      exporter.export(tempOut);

      const reportPath = path.join(tempOut, 'SUSHI-GENERATED-FILES.md');
      expect(fs.existsSync(reportPath)).toBeTruthy();
      const content = fs.readFileSync(reportPath, 'utf8');
      expect(content).toMatch('# SUSHI-GENERATED FILES #');
      expect(content).toMatch(
        /\| input[\/\\]ImplementationGuide-fhir\.us\.minimal\.json \s*\| generated \| .*[\/\\]customized-ig[\/\\]sushi-config\.yaml, \{all input resources and pages\} \s*\|/
      );
      expect(content).toMatch(/\| ig\.ini \s*\| copied \s*\| ..*[\/\\]ig-data[\/\\]ig\.ini \s*\|/);
      expect(content).toMatch(
        /\| input[\/\\]ignoreWarnings\.txt \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]input[\/\\]ignoreWarnings\.txt \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]images[\/\\]Shorty\.png \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]input[\/\\]images[\/\\]Shorty\.png \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]includes[\/\\]menu\.xml \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]input[\/\\]includes[\/\\]menu\.xml \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]includes[\/\\]other\.xml \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]input[\/\\]includes[\/\\]other\.xml \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]pagecontent[\/\\]index\.md \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]input[\/\\]pagecontent[\/\\]index\.md \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]pagecontent[\/\\]other-page\.md \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]input[\/\\]pagecontent[\/\\]other-page\.md \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]pagecontent[\/\\]resource-notes\.md \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]input[\/\\]pagecontent[\/\\]resource-notes\.md \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]pagecontent[\/\\]unsupported\.html \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]input[\/\\]pagecontent[\/\\]unsupported\.html \s*\|/
      );
      expect(content).toMatch(
        /\| package-list\.json \s*\| copied \s*\| .*[\/\\]ig-data[\/\\]package-list\.json \s*\|/
      );
    });

    it('should generate a SUSHI-GENERATED-FILES.md with the correct listings when configs are generated', () => {
      const config = cloneDeep(minimalConfig);
      config.indexPageContent = 'My Index Page';
      config.menu = [{ name: 'Animals', url: 'animals.html' }];
      config.history = {
        'package-id': 'fhir.us.minimal',
        canonical: 'http://hl7.org/fhir/us/minimal',
        title: 'Minimal IG',
        introduction: 'Minimal IG exercises history.',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://build.fhir.org/ig/HL7/minimal-ig/',
            status: 'ci-build',
            current: true
          },
          {
            version: '0.9.1',
            fhirversion: '4.0.0',
            date: '2019-06-10',
            desc: 'Initial STU ballot (Sep 2019 Ballot)',
            path: 'https://hl7.org/fhir/us/minimal/2019Sep/',
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      };
      const pkg = new Package(config);
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
      const tempOut = temp.mkdirSync('sushi-test');
      exporter.export(tempOut);

      const reportPath = path.join(tempOut, 'SUSHI-GENERATED-FILES.md');
      expect(fs.existsSync(reportPath)).toBeTruthy();
      const content = fs.readFileSync(reportPath, 'utf8');
      expect(content).toMatch('# SUSHI-GENERATED FILES #');
      expect(content).toMatch(
        /\| ig\.ini \s*\| generated \s*\| .*[\/\\]simple-ig[\/\\]sushi-config\.yaml \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]ImplementationGuide-fhir\.us\.minimal\.json \s*\| generated \| .*[\/\\]simple-ig[\/\\]sushi-config\.yaml, \{all input resources and pages\} \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]includes[\/\\]menu\.xml \s*\| generated \s*\| .*[\/\\]simple-ig[\/\\]sushi-config\.yaml \s*\|/
      );
      expect(content).toMatch(
        /\| input[\/\\]pagecontent[\/\\]index\.md \s*\| generated \s*\| .*[\/\\]simple-ig[\/\\]sushi-config\.yaml \s*\|/
      );
      expect(content).toMatch(
        /\| package-list\.json \s*\| generated \s*\| .*[\/\\]simple-ig[\/\\]sushi-config\.yaml \s*\|/
      );
    });

    it('should generate a SUSHI-GENERATED-FILES.md with the correct listings when configs are not generated or copied', () => {
      const config = cloneDeep(minimalConfig);
      delete config.template;
      const pkg = new Package(config);
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), false);
      const tempOut = temp.mkdirSync('sushi-test');
      exporter.export(tempOut);

      const reportPath = path.join(tempOut, 'SUSHI-GENERATED-FILES.md');
      expect(fs.existsSync(reportPath)).toBeTruthy();
      const content = fs.readFileSync(reportPath, 'utf8');
      expect(content).toMatch('# SUSHI-GENERATED FILES #');
      expect(content).toMatch(
        /\| input[\/\\]ImplementationGuide-fhir\.us\.minimal\.json \s*\| generated \| .*[\/\\]simple-ig[\/\\]sushi-config\.yaml, \{all input resources and pages\} \s*\|/
      );
      expect(content).not.toMatch('ig.ini');
      expect(content).not.toMatch('menu.xml');
      expect(content).not.toMatch('index.md');
      expect(content).not.toMatch('package-list.json');
    });

    it('should not generate a SUSHI-GENERATED-FILES.md when in publisher context', () => {
      const config = cloneDeep(minimalConfig);
      delete config.template;
      const pkg = new Package(config);
      const fixtures = path.join(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, defs, path.resolve(fixtures, 'ig-data'), true);
      const tempOut = temp.mkdirSync('sushi-test');
      exporter.export(tempOut);

      const reportPath = path.join(tempOut, 'SUSHI-GENERATED-FILES.md');
      expect(fs.existsSync(reportPath)).toBeFalsy();
    });
  });
});
