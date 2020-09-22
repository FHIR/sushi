import fs, { readJSONSync } from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { IGExporter } from '../../src/ig';
import { Package } from '../../src/export';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { minimalConfig } from '../utils/minimalConfig';

describe('IGExporter', () => {
  // Track temp files/folders for cleanup
  temp.track();

  describe('#package-list', () => {
    let tempOut: string;

    beforeAll(() => {
      tempOut = temp.mkdirSync('sushi-test');
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should copy package-list.json when ig-data/package-list.json is defined', () => {
      const pkg = new Package(minimalConfig);
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
