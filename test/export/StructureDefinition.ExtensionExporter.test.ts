import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { Extension } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import path from 'path';
import { minimalConfig } from '../utils/minimalConfig';
import { ContainsRule } from '../../src/fshtypes/rules';

describe('ExtensionExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let exporter: StructureDefinitionExporter;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
  });

  beforeEach(() => {
    loggerSpy.reset();
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    const pkg = new Package(input.config);
    const fisher = new TestFisher(input, defs, pkg);
    exporter = new StructureDefinitionExporter(input, pkg, fisher);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export().extensions;
    expect(exported).toEqual([]);
  });

  it('should export a single extension', () => {
    const extension = new Extension('Foo');
    doc.extensions.set(extension.name, extension);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(1);
  });

  it('should export multiple extensions', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(2);
  });

  it('should still export extensions if one fails', () => {
    const extensionFoo = new Extension('Foo');
    extensionFoo.parent = 'Baz';
    const extensionBar = new Extension('Bar');
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Bar');
  });

  it('should log a message with source information when the parent is not found', () => {
    const extension = new Extension('Wrong').withFile('Wrong.fsh').withLocation([14, 8, 24, 17]);
    extension.parent = 'DoesNotExist';
    doc.extensions.set(extension.name, extension);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Wrong\.fsh.*Line: 14 - 24\D*/s);
  });

  it('should log a message with source information when the parent is not an extension', () => {
    const extension = new Extension('Wrong').withFile('Wrong.fsh').withLocation([14, 8, 24, 17]);
    extension.parent = 'Patient';
    doc.extensions.set(extension.name, extension);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Parent Patient is not of type Extension, so it is an invalid Parent for Extension Wrong.*File: Wrong\.fsh.*Line: 14 - 24\D*/s
    );
  });

  it('should export extensions with FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Foo';
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(2);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[1].baseDefinition === exported[0].url);
  });

  it('should export extensions with the same FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Foo';
    const extensionBaz = new Extension('Baz');
    extensionBaz.parent = 'Foo';
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    doc.extensions.set(extensionBaz.name, extensionBaz);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[0].url);
  });

  it('should export extensions with deep FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Foo';
    const extensionBaz = new Extension('Baz');
    extensionBaz.parent = 'Bar';
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    doc.extensions.set(extensionBaz.name, extensionBaz);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[1].url);
  });

  it('should export extensions with out-of-order FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    extensionFoo.parent = 'Bar';
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Baz';
    const extensionBaz = new Extension('Baz');
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    doc.extensions.set(extensionBaz.name, extensionBaz);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Baz');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Foo');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[1].url);
  });

  it('should not log an error when an inline extension is used', () => {
    loggerSpy.reset();
    const extension = new Extension('MyExtension');
    const containsRule = new ContainsRule('extension')
      .withFile('MyExtension.fsh')
      .withLocation([3, 8, 3, 25]);
    containsRule.items.push({
      name: 'SomeExtension'
    });
    extension.rules.push(containsRule);
    doc.extensions.set(extension.name, extension);
    exporter.export();

    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });
});
