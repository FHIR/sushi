import fs, { readJSONSync } from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { IGExporter } from '../../src/ig';
import { Package } from '../../src/export';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { minimalConfig } from '../utils/minimalConfig';
import { Configuration } from '../../src/fshtypes';
import { cloneDeep } from 'lodash';

describe('IGExporter', () => {
  // Track temp files/folders for cleanup
  temp.track();

  describe('#package-list', () => {
    let tempOut: string;
    let config: Configuration;

    beforeAll(() => {
      tempOut = temp.mkdirSync('sushi-test');
    });

    beforeEach(() => {
      config = cloneDeep(minimalConfig);
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should not export package-list.json when config.history is undefined and ig-data/package-list.json does not exist', () => {
      config.canonical = 'https://foo.com/my-ig';
      const pkg = new Package(null, config);
      const exporter = new IGExporter(pkg, null, '');
      exporter.addPackageList(tempOut);
      const pkgListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(pkgListPath)).toBeFalsy();
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
    });

    it('should export package-list.json when config.history is defined', () => {
      config.history = {
        'package-id': 'fhir.us.example',
        canonical: 'http://hl7.org/fhir/us/example',
        title: 'HL7 FHIR Implementation Guide: Example IG Release 1 - US Realm | STU1',
        introduction: 'Example IG exercises many of the fields in a SUSHI configuration.',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://build.fhir.org/ig/HL7/example-ig/',
            status: 'ci-build',
            current: true
          },
          {
            version: '0.9.1',
            fhirversion: '4.0.0',
            date: '2019-06-10',
            desc: 'Initial STU ballot (Sep 2019 Ballot)',
            path: 'https://hl7.org/fhir/us/example/2019Sep/',
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      };
      const pkg = new Package(null, config);
      const exporter = new IGExporter(pkg, null, '');
      exporter.addPackageList(tempOut);
      const pkgListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(pkgListPath)).toBeTruthy();
      const content = fs.readJSONSync(pkgListPath);
      expect(content).toEqual(config.history);
      const outputLogDetails = exporter.getOutputLogDetails(pkgListPath);
      expect(outputLogDetails.action).toBe('generated');
      expect(outputLogDetails.inputs).toHaveLength(1);
      expect(outputLogDetails.inputs[0].endsWith('config.yaml')).toBeTruthy();
      expect(loggerSpy.getLastMessage('info')).toBe('Generated package-list.json');
    });

    it('should export package-list.json and emit a warning when both config.history and ig-data/package-list.json are defined', () => {
      config.history = {
        'package-id': 'fhir.us.example',
        canonical: 'http://hl7.org/fhir/us/example',
        title: 'HL7 FHIR Implementation Guide: Example IG Release 1 - US Realm | STU1',
        introduction: 'Example IG exercises many of the fields in a SUSHI configuration.',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://build.fhir.org/ig/HL7/example-ig/',
            status: 'ci-build',
            current: true
          },
          {
            version: '0.9.1',
            fhirversion: '4.0.0',
            date: '2019-06-10',
            desc: 'Initial STU ballot (Sep 2019 Ballot)',
            path: 'https://hl7.org/fhir/us/example/2019Sep/',
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      };
      const pkg = new Package(null, config);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig', 'ig-data');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.addPackageList(tempOut);
      const pkgListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(pkgListPath)).toBeTruthy();
      const content = fs.readJSONSync(pkgListPath);
      expect(content).toEqual(config.history);
      const outputLogDetails = exporter.getOutputLogDetails(pkgListPath);
      expect(outputLogDetails.action).toBe('generated');
      expect(outputLogDetails.inputs).toHaveLength(1);
      expect(outputLogDetails.inputs[0].endsWith('config.yaml')).toBeTruthy();
      expect(loggerSpy.getLastMessage('info')).toBe('Generated package-list.json');
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Found both a "history" property in config\.yaml and a package-list\.json file.*File: .*package-list.json/s
      );
    });

    it('should copy package-list.json when ig-data/package-list.json is defined', () => {
      const pkg = new Package(null, config);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig', 'ig-data');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.addPackageList(tempOut);
      const expectedContent = readJSONSync(path.join(igDataPath, 'package-list.json'));
      const pkgListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(pkgListPath)).toBeTruthy();
      const content = fs.readJSONSync(pkgListPath);
      expect(content).toEqual(expectedContent);
      const outputLogDetails = exporter.getOutputLogDetails(pkgListPath);
      expect(outputLogDetails.action).toBe('copied');
      expect(outputLogDetails.inputs).toHaveLength(1);
      expect(outputLogDetails.inputs[0].endsWith('package-list.json')).toBeTruthy();
      expect(loggerSpy.getLastMessage('info')).toBe('Copied ig-data/package-list.json.');
    });
  });
});
