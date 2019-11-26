import { ExtensionExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, load } from '../../src/fhirdefs';
import { Extension } from '../../src/fshtypes';

describe('ExtensionExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: ExtensionExporter;

  beforeAll(() => {
    defs = load('4.0.1');
  });

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    input = new FSHTank([doc], { canonical: 'http://example.com' });
    exporter = new ExtensionExporter(defs);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export(input);
    expect(exported).toEqual([]);
  });

  it('should export a single extension', () => {
    const extension = new Extension('Foo');
    doc.extensions.set(extension.name, extension);
    const exported = exporter.export(input);
    expect(exported.length).toBe(1);
  });

  it('should export multiple extensions', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export(input);
    expect(exported.length).toBe(2);
  });

  it('should still export extensions if one fails', () => {
    const extensionFoo = new Extension('Foo');
    extensionFoo.parent = 'Baz';
    const extensionBar = new Extension('Bar');
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export(input);
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Bar');
  });

  it('should export extensions with FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Foo';
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export(input);
    expect(exported.length).toBe(2);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
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
    const exported = exporter.export(input);
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
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
    const exported = exporter.export(input);
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
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
    const exported = exporter.export(input);
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Baz');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Foo');
  });
});
