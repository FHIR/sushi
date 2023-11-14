import path from 'path';
import { loadFromPath } from 'fhir-package-loader';
import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { Profile, Instance, FshCode } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';
import {
  BindingRule,
  CaretValueRule,
  ContainsRule,
  AssignmentRule
} from '../../src/fshtypes/rules';
import { MismatchedTypeError } from '../../src/errors';

describe('ProfileExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let pkg: Package;
  let exporter: StructureDefinitionExporter;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
  });

  beforeEach(() => {
    loggerSpy.reset();
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    pkg = new Package(input.config);
    const fisher = new TestFisher(input, defs, pkg);
    exporter = new StructureDefinitionExporter(input, pkg, fisher);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export().profiles;
    expect(exported).toEqual([]);
  });

  it('should export a single profile', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Basic';
    doc.profiles.set(profile.name, profile);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
  });

  it('should add source info for the exported profile to the package', () => {
    const profile = new Profile('Foo').withFile('SomeProfiles.fsh').withLocation([28, 4, 39, 15]);
    profile.parent = 'Basic';
    doc.profiles.set(profile.name, profile);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(pkg.fshMap.get('StructureDefinition-Foo.json')).toEqual({
      file: 'SomeProfiles.fsh',
      location: {
        startLine: 28,
        startColumn: 4,
        endLine: 39,
        endColumn: 15
      },
      fshName: 'Foo',
      fshType: 'Profile'
    });
  });

  it('should export multiple profiles', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Basic';
    const profileBar = new Profile('Bar');
    profileBar.parent = 'Basic';
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(2);
  });

  it('should still export profiles if one fails', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Baz';
    const profileBar = new Profile('Bar');
    profileBar.parent = 'Basic';
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Bar');
  });

  it('should log a error with source information when the parent is not found', () => {
    const profile = new Profile('Bogus').withFile('Bogus.fsh').withLocation([2, 9, 4, 23]);
    profile.parent = 'BogusParent';
    doc.profiles.set(profile.name, profile);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bogus\.fsh.*Line: 2 - 4\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/Parent BogusParent not found for Bogus/s);
  });

  it('should log a error with source information when the parent is not provided', () => {
    const profile = new Profile('Missing').withFile('Missing.fsh').withLocation([2, 9, 4, 23]);
    doc.profiles.set(profile.name, profile);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Missing\.fsh.*Line: 2 - 4\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /The definition for Missing does not include a Parent/s
    );
  });

  it('should export profiles with FSHy parents', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Basic';
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
    profileFoo.parent = 'Basic';
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
    profileFoo.parent = 'Basic';
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
    profileBaz.parent = 'Basic';
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

  it('should export a profile with an abstract profile parent', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Basic';
    const abstractRule = new CaretValueRule('');
    abstractRule.caretPath = 'abstract';
    abstractRule.value = true;
    profileFoo.rules.push(abstractRule);
    const profileBar = new Profile('Bar');
    profileBar.parent = 'Foo';
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(2);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].abstract).toBeTrue();
    expect(exported[1].name).toBe('Bar');
    expect(exported[1].abstract).toBeFalse();
    expect(loggerSpy.getAllMessages('error').length).toBe(0);
  });

  it('should export a profile with a logical parent', () => {
    const profile = new Profile('Foo');
    profile.parent = 'ELTSSServiceModel';
    doc.profiles.set(profile.name, profile);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].kind).toBe('logical');
    expect(loggerSpy.getAllMessages('error').length).toBe(0);
  });

  it('should export profiles with deep logical parents', () => {
    const fooProfile = new Profile('Foo');
    fooProfile.parent = 'ELTSSServiceModel';
    const barProfile = new Profile('Bar');
    barProfile.parent = 'Foo';
    doc.profiles.set(fooProfile.name, fooProfile);
    doc.profiles.set(barProfile.name, barProfile);
    const exported = exporter.export().profiles;
    expect(exported.length).toBe(2);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].kind).toBe('logical');
    expect(exported[1].name).toBe('Bar');
    expect(exported[1].kind).toBe('logical');
    expect(loggerSpy.getAllMessages('error').length).toBe(0);
  });

  it('should export profiles with profile instance parents', () => {
    const parentProfileInstance = new Instance('ParentProfile');
    parentProfileInstance.instanceOf = 'StructureDefinition';
    parentProfileInstance.usage = 'Definition';
    const parentName = new AssignmentRule('name');
    parentName.value = 'ParentProfile';
    const parentStatus = new AssignmentRule('status');
    parentStatus.value = new FshCode('active');
    const parentKind = new AssignmentRule('kind');
    parentKind.value = new FshCode('resource');
    const parentAbstract = new AssignmentRule('abstract');
    parentAbstract.value = false;
    const parentType = new AssignmentRule('type');
    parentType.value = 'Observation';
    const parentDerivation = new AssignmentRule('derivation');
    parentDerivation.value = new FshCode('constraint');
    const parentBaseDefinition = new AssignmentRule('baseDefinition');
    parentBaseDefinition.value = 'http://hl7.org/fhir/StructureDefinition/Observation';
    const parentElementId = new AssignmentRule('snapshot.element[0].id');
    parentElementId.value = 'Observation';
    const parentElementPath = new AssignmentRule('snapshot.element[0].path');
    parentElementPath.value = 'Observation';
    parentProfileInstance.rules.push(
      parentName,
      parentStatus,
      parentKind,
      parentAbstract,
      parentType,
      parentDerivation,
      parentBaseDefinition,
      parentElementId,
      parentElementPath
    );
    doc.instances.set(parentProfileInstance.name, parentProfileInstance);

    const childProfile = new Profile('ChildProfile');
    childProfile.parent = 'ParentProfile';
    doc.profiles.set(childProfile.name, childProfile);
    const exported = exporter.export().profiles;
    expect(exported).toHaveLength(1);
    expect(exported[0].name).toBe('ChildProfile');
    expect(exported[0].baseDefinition).toBe(
      'http://hl7.org/fhir/us/minimal/StructureDefinition/ParentProfile'
    );
    expect(loggerSpy.getAllMessages('error').length).toBe(0);
  });

  it('should defer adding an instance to a profile as a contained resource', () => {
    const instance = new Instance('myResource');
    instance.instanceOf = 'Observation';
    doc.instances.set(instance.name, instance);

    const profile = new Profile('ContainingProfile');
    profile.parent = 'Basic';
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'contained';
    caretValueRule.value = 'myResource';
    caretValueRule.isInstance = true;
    profile.rules.push(caretValueRule);
    doc.profiles.set(profile.name, profile);

    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].contained).toBeUndefined();
    expect(exporter.deferredRules.size).toBe(1);
    expect(exporter.deferredRules.get(exported[0]).length).toBe(1);
    expect(exporter.deferredRules.get(exported[0])).toContainEqual({ rule: caretValueRule });
  });

  it('should defer adding an instance with a numeric id to a profile as a contained resource', () => {
    const instance = new Instance('1312');
    instance.instanceOf = 'Observation';
    doc.instances.set(instance.name, instance);

    const profile = new Profile('ContainingProfile');
    profile.parent = 'Basic';
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'contained';
    caretValueRule.value = 1312;
    caretValueRule.rawValue = '1312';
    profile.rules.push(caretValueRule);
    doc.profiles.set(profile.name, profile);

    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].contained).toBeUndefined();
    expect(exporter.deferredRules.size).toBe(1);
    expect(exporter.deferredRules.get(exported[0]).length).toBe(1);
    expect(exporter.deferredRules.get(exported[0])).toContainEqual({
      rule: caretValueRule,
      originalErr: expect.any(MismatchedTypeError)
    });
  });

  it('should defer adding an instance with an id that resembles a boolean to a profile as a contained resource', () => {
    const instance = new Instance('true');
    instance.instanceOf = 'Observation';
    doc.instances.set(instance.name, instance);

    const profile = new Profile('ContainingProfile');
    profile.parent = 'Basic';
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'contained';
    caretValueRule.value = true;
    caretValueRule.rawValue = 'true';
    profile.rules.push(caretValueRule);
    doc.profiles.set(profile.name, profile);

    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].contained).toBeUndefined();
    expect(exporter.deferredRules.size).toBe(1);
    expect(exporter.deferredRules.get(exported[0]).length).toBe(1);
    expect(exporter.deferredRules.get(exported[0])).toContainEqual({
      rule: caretValueRule,
      originalErr: expect.any(MismatchedTypeError)
    });
  });

  it('should NOT export a profile of an R5 resource in an R4 project', () => {
    // Although instances of ActorDefinition are allowed in R4, profiles of ActorDefinition are not!
    const adProfile = new Profile('ADProfile');
    adProfile.parent = 'ActorDefinition';
    doc.profiles.set(adProfile.name, adProfile);
    const exported = exporter.export().profiles;
    expect(exported).toBeEmpty();
    expect(loggerSpy.getLastMessage('error')).toBe(
      'Parent ActorDefinition not found for ADProfile'
    );
  });

  it('should throw a MismatchedBindingTypeError when a code property is bound to a code system', () => {
    const profile = new Profile('TestProfile');
    profile.parent = 'Patient';
    const bindingRule = new BindingRule('identifier.type');
    bindingRule.valueSet = 'W3cProvenanceActivityType';
    bindingRule.strength = 'required';
    profile.rules.push(bindingRule);
    doc.profiles.set(profile.name, profile);
    exporter.export();

    expect(loggerSpy.getLastMessage('error')).toMatch(/A ValueSet must be used./);
  });

  it('should log an error when an inline extension is used', () => {
    const profile = new Profile('MyObservation');
    profile.parent = 'Observation';
    const containsRule = new ContainsRule('extension')
      .withFile('MyObservation.fsh')
      .withLocation([3, 8, 3, 25]);
    containsRule.items.push({
      name: 'SomeExtension'
    });
    profile.rules.push(containsRule);
    doc.profiles.set(profile.name, profile);
    exporter.export();

    expect(loggerSpy.getLastMessage('error')).toMatch(/File: MyObservation\.fsh.*Line: 3\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Inline extensions should only be defined in Extensions/s
    );
  });
});
