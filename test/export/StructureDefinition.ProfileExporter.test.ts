import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { Profile } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import path from 'path';
import { minimalConfig } from '../utils/minimalConfig';

describe('ProfileExporter', () => {
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
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    const pkg = new Package(input.config);
    const fisher = new TestFisher(input, defs, pkg);
    exporter = new StructureDefinitionExporter(input, pkg, fisher);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export().profiles;
    expect(exported).toEqual([]);
  });

  it('should export a single profile', () => {
    const profile = new Profile('Foo');
    doc.profiles.set(profile.name, profile);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
  });

  it('should export multiple profiles', () => {
    const profileFoo = new Profile('Foo');
    const profileBar = new Profile('Bar');
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(2);
  });

  it('should still export profiles if one fails', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Baz';
    const profileBar = new Profile('Bar');
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Bar');
  });

  it('should log a message with source information when the parent is not found', () => {
    const profile = new Profile('Bogus').withFile('Bogus.fsh').withLocation([2, 9, 4, 23]);
    profile.parent = 'BogusParent';
    doc.profiles.set(profile.name, profile);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bogus\.fsh.*Line: 2 - 4\D*/s);
  });

  it('should export profiles with FSHy parents', () => {
    const profileFoo = new Profile('Foo');
    const profileBar = new Profile('Bar');
    profileBar.parent = 'Foo';
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(2);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[1].baseDefinition === exported[0].url);
  });

  it('should export profiles with the same FSHy parents', () => {
    const profileFoo = new Profile('Foo');
    const profileBar = new Profile('Bar');
    profileBar.parent = 'Foo';
    const profileBaz = new Profile('Baz');
    profileBaz.parent = 'Foo';
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    doc.profiles.set(profileBaz.name, profileBaz);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[0].url);
  });

  it('should export profiles with deep FSHy parents', () => {
    const profileFoo = new Profile('Foo');
    const profileBar = new Profile('Bar');
    profileBar.parent = 'Foo';
    const profileBaz = new Profile('Baz');
    profileBaz.parent = 'Bar';
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    doc.profiles.set(profileBaz.name, profileBaz);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[1].url);
  });

  it('should export profiles with out-of-order FSHy parents', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Bar';
    const profileBar = new Profile('Bar');
    profileBar.parent = 'Baz';
    const profileBaz = new Profile('Baz');
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    doc.profiles.set(profileBaz.name, profileBaz);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Baz');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Foo');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[1].url);
  });
});
