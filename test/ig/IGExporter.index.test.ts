import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { IGExporter } from '../../src/ig';
import { Package } from '../../src/export';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { minimalConfig } from '../utils/minimalConfig';

describe('IGExporter', () => {
  // Track temp files/folders for cleanup
  temp.track();

  describe('#index', () => {
    let tempOut: string;
    let indexMarkdownPageContentPath: string;
    let indexXMLPageContentPath: string;
    let indexMarkdownPagesPath: string;
    let indexXMLPagesPath: string;
    let igPath: string;

    beforeEach(() => {
      tempOut = temp.mkdirSync('sushi-test');
      indexMarkdownPageContentPath = path.join(tempOut, 'input', 'pagecontent', 'index.md');
      indexXMLPageContentPath = path.join(tempOut, 'input', 'pagecontent', 'index.xml');
      indexMarkdownPagesPath = path.join(tempOut, 'input', 'pages', 'index.md');
      indexXMLPagesPath = path.join(tempOut, 'input', 'pages', 'index.xml');
      igPath = path.join(
        tempOut,
        'fsh-generated',
        'resources',
        'ImplementationGuide-fhir.us.minimal.json'
      );
      loggerSpy.reset();
    });

    afterEach(() => {
      temp.cleanupSync();
    });

    it('should not export index file when config.indexPageContent is not defined and none provided', () => {
      const pkg = new Package(minimalConfig);
      const exporter = new IGExporter(pkg, null, '');
      exporter.initIG();
      exporter.addIndex(tempOut);
      exporter.addImplementationGuide(tempOut);
      expect(fs.existsSync(indexMarkdownPageContentPath)).toBeFalsy();
      expect(fs.existsSync(indexXMLPageContentPath)).toBeFalsy();
      expect(fs.existsSync(indexMarkdownPagesPath)).toBeFalsy();
      expect(fs.existsSync(indexXMLPagesPath)).toBeFalsy();

      // Checks that the index.md file is not added to IG definition
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).not.toContainEqual({
        nameUrl: 'index.html',
        title: 'Home',
        generation: 'markdown'
      });

      // No warnings or errors logged
      expect(loggerSpy.getAllMessages()).toHaveLength(loggerSpy.getAllMessages('info').length);
    });

    it('should use user-provided input/pagecontent/index.md when config.indexPageContent is not defined', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.initIG();
      exporter.addIndex(tempOut);
      exporter.addImplementationGuide(tempOut);
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.md');
      expect(fs.existsSync(indexPath)).toBeFalsy(); // File not copied

      // Checks that the index.md file is added to IG definition
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toContainEqual({
        nameUrl: 'index.html',
        title: 'Home',
        generation: 'markdown'
      });

      // No warnings or errors logged
      expect(loggerSpy.getAllMessages()).toHaveLength(loggerSpy.getAllMessages('info').length);
    });

    it('should use user-provided input/pagecontent/index.xml when config.indexPageContent is not defined', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig-with-index-xml');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.initIG();
      exporter.addIndex(tempOut);
      exporter.addImplementationGuide(tempOut);
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.xml');
      expect(fs.existsSync(indexPath)).toBeFalsy();

      // Checks that the index.xml file is added to IG definition
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'html'
        }
      ]);

      // No warnings or errors logged
      expect(loggerSpy.getAllMessages()).toHaveLength(loggerSpy.getAllMessages('info').length);
    });

    it('should use user-provided input/pages/index.md when config.indexPageContent is not defined', () => {
      // Create temp ig fixture for input/pages/index.md set up
      const igDir = temp.mkdirSync('custom-ig-pages-index');
      fs.copySync(path.resolve(__dirname, 'fixtures', 'customized-ig'), igDir);
      fs.renameSync(path.join(igDir, 'input', 'pagecontent'), path.join(igDir, 'input', 'pages'));

      const pkg = new Package(minimalConfig);
      const exporter = new IGExporter(pkg, null, igDir);
      exporter.initIG();
      exporter.addIndex(tempOut);
      exporter.addImplementationGuide(tempOut);
      const indexPath = path.join(tempOut, 'input', 'pages', 'index.md');
      expect(fs.existsSync(indexPath)).toBeFalsy();

      // Checks that the index.xml file is added to IG definition
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'markdown'
        }
      ]);

      // No warnings or errors logged
      expect(loggerSpy.getAllMessages()).toHaveLength(loggerSpy.getAllMessages('info').length);
    });

    it('should use user-provided input/pages/index.xml when config.indexPageContent is not defined', () => {
      // Create temp ig fixture for input/pages/index.xml set up
      const igDir = temp.mkdirSync('custom-ig-pages-index');
      fs.copySync(path.resolve(__dirname, 'fixtures', 'customized-ig-with-index-xml'), igDir);
      fs.renameSync(path.join(igDir, 'input', 'pagecontent'), path.join(igDir, 'input', 'pages'));

      const pkg = new Package(minimalConfig);
      const exporter = new IGExporter(pkg, null, igDir);
      exporter.initIG();
      exporter.addIndex(tempOut);
      exporter.addImplementationGuide(tempOut);
      const indexPath = path.join(tempOut, 'input', 'pages', 'index.xml');
      expect(fs.existsSync(indexPath)).toBeFalsy();

      // Checks that the index.xml file is added to IG definition
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'html'
        }
      ]);

      // No warnings or errors logged
      expect(loggerSpy.getAllMessages()).toHaveLength(loggerSpy.getAllMessages('info').length);
    });

    it('should use config.indexPageContent to generate an index.md file', () => {
      const config = { ...minimalConfig, indexPageContent: 'An index file defined in config' };
      const pkg = new Package(config);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'simple-ig');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.initIG();
      exporter.addIndex(tempOut);
      exporter.addImplementationGuide(tempOut);
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.md');
      expect(fs.existsSync(indexPath)).toBeTruthy();
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/^<!-- index.md {% comment %}$/m);
      expect(content).toMatch(/^\*\s+WARNING: DO NOT EDIT THIS FILE\s+\*$/m);
      expect(content).toMatch(
        /^\*\s+To change the contents of this file, edit the "indexPageContent" attribute in the tank sushi-config.yaml file\s+\*/m
      );
      expect(content).toMatch(
        /^\*\s+or provide your own index file in the input[\/\\]pagecontent or input[\/\\]pages folder.\s+\*/m
      );
      expect(content).toContain('An index file defined in config');

      // Checks that the index.md file is added to IG definition
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'markdown'
        }
      ]);

      // No warnings or errors logged
      expect(loggerSpy.getAllMessages()).toHaveLength(loggerSpy.getAllMessages('info').length);
      expect(loggerSpy.getMessageAtIndex(0, 'info')).toMatch(
        /Generated index.md based on "indexPageContent" in sushi-config.yaml/i
      );
    });

    it('should log a warning if config.indexPageContent defined and use user provided file but not copy file', () => {
      const config = { ...minimalConfig, indexPageContent: 'An index file defined in config' };
      const pkg = new Package(config);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.initIG();
      exporter.addIndex(tempOut);
      exporter.addImplementationGuide(tempOut);
      const indexPath = path.join(tempOut, 'input', 'pagecontent', 'index.md');
      expect(fs.existsSync(indexPath)).toBeFalsy(); // Do not copy user provided file or generate a new file

      // Checks that the index.md file is added to IG definition
      expect(fs.existsSync(igPath)).toBeTruthy();
      const igContent = fs.readJSONSync(igPath);
      expect(igContent.definition.page.page).toEqual([
        {
          nameUrl: 'index.html',
          title: 'Home',
          generation: 'markdown'
        }
      ]);

      // No errors logged, warning logged that both indexPageContent and index file provided
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Found both an "indexPageContent" property in sushi-config\.yaml and an index file.*File: .*index.md/s
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /the "indexPageContent" property in the sushi-config\.yaml will be ignored/s
      );
    });
  });
});
