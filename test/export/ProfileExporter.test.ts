import { ProfileExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, load } from '../../src/fhirdefs';
import { Profile } from '../../src/fshtypes';

describe('ProfileExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: ProfileExporter;

  beforeAll(() => {
    defs = load('4.0.1');
  });

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    input = new FSHTank([doc], { canonical: 'http://example.com' });
    exporter = new ProfileExporter(defs);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export(input);
    expect(exported).toEqual([]);
  });

  it('should set all metadata for a profile', () => {
    const profile = new Profile('Foo');
    profile.id = 'foo';
    profile.parent = 'Observation';
    profile.title = 'Foo Profile';
    profile.description = 'foo bar foobar';
    doc.profiles.set(profile.name, profile);
    const exported = exporter.export(input);
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].id).toBe('foo');
    expect(exported[0].title).toBe('Foo Profile');
    expect(exported[0].description).toBe('foo bar foobar');
    expect(exported[0].url).toBe('http://example.com/StructureDefinition/foo');
    expect(exported[0].type).toBe('Observation');
  });

  it('should not overwrite metadata that is not given for a profile', () => {
    const profile = new Profile('Foo');
    doc.profiles.set(profile.name, profile);
    const exported = exporter.export(input);
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].id).toBe('Foo');
    expect(exported[0].title).toBeUndefined();
    expect(exported[0].description).toBe('This is the base resource type for everything.');
    expect(exported[0].url).toBe('http://example.com/StructureDefinition/Foo');
    expect(exported[0].type).toBe('Resource');
  });

  it('should throw ParentNotDefinedError when parent resource is not found', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Bar';
    doc.profiles.set(profile.name, profile);
    expect(() => {
      exporter.export(input);
    }).toThrow('Parent Bar not found for Foo');
  });
});
