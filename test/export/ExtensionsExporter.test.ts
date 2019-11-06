import { ExtensionExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, load } from '../../src/fhirdefs';
import { Extension } from '../../src/fshtypes';

describe('ExtensionsExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: ExtensionExporter;

  beforeAll(() => {
    defs = load('4.0.0');
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

  it('should set all metadata for an extension', () => {
    const extension = new Extension('Foo');
    extension.id = 'foo';
    extension.title = 'Foo Profile';
    extension.description = 'foo bar foobar';
    doc.extensions.set(extension.name, extension);
    const exported = exporter.export(input);
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].id).toBe('foo');
    expect(exported[0].title).toBe('Foo Profile');
    expect(exported[0].description).toBe('foo bar foobar');
    expect(exported[0].url).toBe('http://example.com/StructureDefinition/foo');
    expect(exported[0].type).toBe('Extension');
  });

  it('should not overwrite metadata that is not given for an extension', () => {
    const extension = new Extension('Foo');
    doc.extensions.set(extension.name, extension);
    const exported = exporter.export(input);
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].id).toBe('Foo');
    expect(exported[0].title).toBeUndefined();
    expect(exported[0].description).toBe(
      'Base StructureDefinition for Extension Type: Optional Extension Element - found in all resources.'
    );
    expect(exported[0].url).toBe('http://example.com/StructureDefinition/Foo');
    expect(exported[0].type).toBe('Extension');
  });

  it('should throw ParentNotDefinedError when parent extension is not found', () => {
    const extension = new Extension('Foo');
    extension.parent = 'Bar';
    doc.extensions.set(extension.name, extension);
    expect(() => {
      exporter.export(input);
    }).toThrow('Parent Bar not found for Foo');
  });
});
