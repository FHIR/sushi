import fs from 'fs-extra';
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

    beforeEach(() => {
      tempOut = temp.mkdirSync('sushi-test');
      config = cloneDeep(minimalConfig);
      loggerSpy.reset();
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should log an error that "history" is not supported when config.history is defined', () => {
      config.history = {
        'package-id': 'fhir.us.example',
        canonical: 'http://hl7.org/fhir/us/example',
        title: 'HL7 FHIR Implementation Guide: Example IG Release 1 - US Realm | STU1',
        introduction: 'Example IG exercises many of the fields in a SUSHI configuration.',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'https://build.fhir.org/ig/HL7/example-ig/',
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
      const pkg = new Package(config);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkPackageList();
      const pkgListPath = path.join(tempOut, 'package-list.json');
      expect(fs.existsSync(pkgListPath)).toBeFalsy(); // Do not copy user provided file or generate a new file
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Detected "history" property in configuration. The use of "history" is no longer supported./
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(JSON.stringify(config.history, null, 2));
    });
  });
});
