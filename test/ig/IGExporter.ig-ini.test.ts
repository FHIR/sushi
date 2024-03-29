import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import cloneDeep from 'lodash/cloneDeep';
import { IGExporter } from '../../src/ig';
import { Package } from '../../src/export';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { minimalConfig } from '../utils/minimalConfig';
import { Configuration } from '../../src/fshtypes';

describe('IGExporter', () => {
  // Track temp files/folders for cleanup
  temp.track();

  describe('#ig-ini', () => {
    let configWithTemplate: Configuration;
    let tempOut: string;

    beforeEach(() => {
      tempOut = temp.mkdirSync('sushi-test');
      configWithTemplate = cloneDeep(minimalConfig);
      configWithTemplate.template = 'hl7.fhir.template#0.0.5';
      loggerSpy.reset();
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should do nothing when template is undefined and ig.ini is not provided', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy();
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should error if there is an ig.ini file and template is defined in the config and not generate or copy an ig.ini', () => {
      const pkg = new Package(configWithTemplate);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy(); // Does not copy ig.ini to output
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        `Found both a "template" property in sushi-config.yaml and an ig.ini file at customized-ig${path.sep}ig.ini.`
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'The "template" property in sushi-config.yaml is no longer supported and will be ignored'
      );
    });

    it('should error if there is no ig.ini file and template is defined in the config (and not generate an ig.ini)', () => {
      const pkg = new Package(configWithTemplate);
      const igDataPath = path.resolve(
        __dirname,
        'fixtures',
        'customized-ig-with-resources' // NOTE: This fixture does not have an ig.ini
      );
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy(); // Does not copy ig.ini to output
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'create an ig.ini file in your project folder'
      );
    });

    it('should use user-provided ig.ini when template is not defined', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy();
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should use user-provided ig.ini with local template when template is not defined', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig-with-local-template');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy();
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should log a warning when ig property in ig.ini does not point to SUSHI IG JSON', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'ig-ini-with-non-generated-ig');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy();
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Your ig.ini file does NOT point to the Implementation Guide resource that SUSHI generates.'
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /'ig = fsh-generated\/resources\/ImplementationGuide-fhir\.us\.minimal\.json'/
      );
    });

    it('should not log a warning when ig property in ig.ini is full path to SUSHI IG JSON', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'ig-ini-with-full-ig-path');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy();
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should not log a warning when ig property in ig.ini is full windows path to SUSHI IG JSON', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'ig-ini-with-full-win-ig-path');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy();
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should log an error when missing required properties and not copy provided ig.ini when template is not defined', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'ig-ini-missing-properties');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy(); // Does not copy ig.ini
      expect(loggerSpy.getAllMessages()).toHaveLength(2);
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        'The ig.ini file must have an "ig" property'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'The ig.ini file must have a "template" property'
      );
    });

    it('should report unsupported properties in user-provided ig.ini and not copy file when template is not defined', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'ig-ini-with-deprecated-properties');
      const exporter = new IGExporter(pkg, null, igDataPath); //, true); // New tank configuration input/fsh/
      exporter.checkIgIni();
      const igIniPath = path.join(tempOut, 'ig.ini');
      expect(fs.existsSync(igIniPath)).toBeFalsy(); // Does not copy ig.ini
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        `Your ig-ini-with-deprecated-properties${path.sep}ig.ini file contains the following unsupported properties: ` +
          'copyrightyear, license, version, ballotstatus, fhirspec, excludexml, excludejson, excludettl, excludeMaps.'
      );
    });
  });
});
