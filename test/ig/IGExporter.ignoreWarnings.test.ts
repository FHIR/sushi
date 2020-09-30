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

  describe('#ignoreWarnings', () => {
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

    it('should not copy ignoreWarnings.txt file in new IG structure', () => {
      const pkg = new Package(config);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig', 'ig-data');
      const exporter = new IGExporter(pkg, null, igDataPath, true); // New tank configuration input/fsh/
      exporter.addIgnoreWarningsFile(tempOut);
      const ignoreWarningsPath = path.join(tempOut, 'input', 'ignoreWarnings.txt');
      expect(fs.existsSync(ignoreWarningsPath)).toBeFalsy(); // Do not copy user provided file
      expect(loggerSpy.getAllMessages('info')).toHaveLength(0);
    });

    it('should not generate ignoreWarnings.txt file in new IG structure', () => {
      const pkg = new Package(config);
      const igDataPath = path.resolve(
        __dirname,
        'fixtures',
        'customized-ig-with-resources',
        'ig-data'
      );
      const exporter = new IGExporter(pkg, null, igDataPath, true); // New tank configuration input/fsh/
      exporter.addIgnoreWarningsFile(tempOut);
      const ignoreWarningsPath = path.join(tempOut, 'input', 'ignoreWarnings.txt');
      expect(fs.existsSync(ignoreWarningsPath)).toBeFalsy(); // Do not generate a new file
      expect(loggerSpy.getAllMessages('info')).toHaveLength(0);
    });

    it('should copy ignoreWarnings.txt file in legacy mode', () => {
      const pkg = new Package(config);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig', 'ig-data');
      const exporter = new IGExporter(pkg, null, igDataPath); // Legacy tank configuration
      exporter.addIgnoreWarningsFile(tempOut);
      const ignoreWarningsPath = path.join(tempOut, 'input', 'ignoreWarnings.txt');
      expect(fs.existsSync(ignoreWarningsPath)).toBeTruthy(); // Copy user provided file
      const outputLogDetails = exporter.getOutputLogDetails(ignoreWarningsPath);
      expect(outputLogDetails.action).toBe('copied');
      expect(outputLogDetails.inputs).toHaveLength(1);
      expect(outputLogDetails.inputs[0].endsWith('ignoreWarnings.txt')).toBeTruthy();
      expect(loggerSpy.getAllMessages('info')).toHaveLength(0);
    });

    it('should copy ignoreWarnings.txt file in legacy mode', () => {
      const pkg = new Package(config);
      const igDataPath = path.resolve(
        __dirname,
        'fixtures',
        'customized-ig-with-resources',
        'ig-data'
      );
      const exporter = new IGExporter(pkg, null, igDataPath); // Legacy tank configuration
      exporter.addIgnoreWarningsFile(tempOut);
      const ignoreWarningsPath = path.join(tempOut, 'input', 'ignoreWarnings.txt');
      expect(fs.existsSync(ignoreWarningsPath)).toBeTruthy(); // Generate a new file
      const outputLogDetails = exporter.getOutputLogDetails(ignoreWarningsPath);
      expect(outputLogDetails.action).toBe('generated');
      expect(outputLogDetails.inputs).toHaveLength(0);
      expect(loggerSpy.getAllMessages('info')).toHaveLength(0);
    });
  });
});
