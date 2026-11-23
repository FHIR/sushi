import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { Profile, Instance, FshCode } from '../../src/fshtypes';
import { StructureDefinition } from '../../src/fhirtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { getTestFHIRDefinitions, importSingleText, testDefsPath, TestFisher } from '../testhelpers';
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

  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
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
    expect(exporter.deferredCaretRules.size).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0]).length).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0])).toContainEqual({
      rule: caretValueRule,
      tryFish: true
    });
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
    expect(exporter.deferredCaretRules.size).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0]).length).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0])).toContainEqual({
      rule: caretValueRule,
      originalErr: expect.any(MismatchedTypeError),
      tryFish: true
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
    expect(exporter.deferredCaretRules.size).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0]).length).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0])).toContainEqual({
      rule: caretValueRule,
      originalErr: expect.any(MismatchedTypeError),
      tryFish: true
    });
  });

  it('should defer adding a binding to an inline ValueSet resource', () => {
    const instance = new Instance('MyValueSet');
    instance.instanceOf = 'ValueSet';
    instance.usage = 'Inline';
    doc.instances.set(instance.name, instance);

    const profile = new Profile('ContainingProfile');
    profile.parent = 'Basic';
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'contained';
    caretValueRule.value = 'MyValueSet';
    caretValueRule.isInstance = true;
    const bindingRule = new BindingRule('code');
    bindingRule.valueSet = 'MyValueSet';
    bindingRule.strength = 'extensible';
    profile.rules.push(caretValueRule, bindingRule);
    doc.profiles.set(profile.name, profile);

    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].contained).toBeUndefined();
    const codeElement = exported[0].findElement('Basic.code');
    expect(codeElement.binding.valueSet).not.toBe('#MyValueSet');
    expect(exporter.deferredCaretRules.size).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0]).length).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0])).toContainEqual({
      rule: caretValueRule,
      tryFish: true
    });
    expect(exporter.knownBindingRules.size).toBe(1);
    expect(exporter.knownBindingRules.get(exported[0]).length).toBe(1);
    expect(exporter.knownBindingRules.get(exported[0])).toContainEqual({
      rule: bindingRule,
      isInline: true
    });
  });

  it('should allow a contained resource with a resourceType to be built from several caret rules', () => {
    // Profile: ContainingProfile
    // Parent: Patient
    // * ^contained.resourceType = "Observation"
    // * ^contained.id = "my-observation"
    // * ^contained.status = #draft
    // * ^contained.code = #123
    // * ^contained.valueString = "contained observation"
    const profile = new Profile('ContainingProfile');
    profile.parent = 'Patient';
    const containedResourceType = new CaretValueRule('');
    containedResourceType.caretPath = 'contained.resourceType';
    containedResourceType.value = 'Observation';
    const containedId = new CaretValueRule('');
    containedId.caretPath = 'contained.id';
    containedId.value = 'my-observation';
    const containedStatus = new CaretValueRule('');
    containedStatus.caretPath = 'contained.status';
    containedStatus.value = new FshCode('draft');
    const containedCode = new CaretValueRule('');
    containedCode.caretPath = 'contained.code';
    containedCode.value = new FshCode('123');
    const containedValue = new CaretValueRule('');
    containedValue.caretPath = 'contained.valueString';
    containedValue.value = 'contained observation';
    profile.rules.push(
      containedResourceType,
      containedId,
      containedStatus,
      containedCode,
      containedValue
    );
    doc.profiles.set(profile.name, profile);

    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].contained[0]).toEqual({
      resourceType: 'Observation',
      id: 'my-observation',
      status: 'draft',
      code: {
        coding: [
          {
            code: '123'
          }
        ]
      },
      valueString: 'contained observation'
    });
  });

  it('should defer applying a caret rule that would be applied within a contained instance', () => {
    // Instance: MyObservation
    // InstanceOf: Observation
    // Usage: #inline
    // * id = "my-observation"
    // * status = #draft
    // * code = #123
    const instance = new Instance('MyObservation');
    instance.instanceOf = 'Observation';
    instance.usage = 'Inline';
    doc.instances.set(instance.name, instance);
    // Profile: ContainingProfile
    // Parent: Patient
    // * ^contained = MyObservation
    // * ^contained.valueString = "contained observation"
    const profile = new Profile('ContainingProfile');
    profile.parent = 'Patient';
    const containedInstance = new CaretValueRule('');
    containedInstance.caretPath = 'contained';
    containedInstance.value = 'MyObservation';
    containedInstance.isInstance = true;
    const containedValue = new CaretValueRule('');
    containedValue.caretPath = 'contained.valueString';
    containedValue.value = 'contained observation';
    profile.rules.push(containedInstance, containedValue);
    doc.profiles.set(profile.name, profile);

    const exported = exporter.export().profiles;
    expect(exported.length).toBe(1);
    expect(exported[0].contained).toBeUndefined();
    expect(exporter.deferredCaretRules.size).toBe(1);
    expect(exporter.deferredCaretRules.get(exported[0])).toEqual([
      {
        rule: containedInstance,
        tryFish: true
      },
      {
        rule: containedValue,
        tryFish: false
      }
    ]);
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

  describe('#Extension slices copied into new slices', () => {
    const extensions = [
      {
        element: 'extension',
        slice: 'kind',
        profile: 'http://hl7.org/fhir/us/minimal/StructureDefinition/LinkKind',
        childRule: 'valueCodeableConcept.coding.code = #current',
        childId: 'value[x].coding.code'
      },
      {
        element: 'modifierExtension',
        slice: 'modifier',
        profile: 'http://hl7.org/fhir/us/minimal/StructureDefinition/LinkModifier',
        childRule: 'valueBoolean = true',
        childId: 'value[x]'
      }
    ];
    const newSlices = [
      {
        label: 'new slice',
        slice: 'seeAlso',
        rules: '* link contains seeAlso 0..*\n* link[seeAlso].type = #seealso'
      },
      {
        label: 'reslice',
        slice: 'replacedBy/current',
        rules: '* link[replacedBy] contains current 0..*'
      }
    ];

    // link[replacedBy/current] is written as link[replacedBy][current] in FSH
    function fshPath(slice: string) {
      return `link[${slice.replace('/', '][')}]`;
    }

    function exportFSH(fsh: string) {
      const imported = importSingleText(fsh);
      imported.extensions.forEach((extension, name) => doc.extensions.set(name, extension));
      imported.logicals.forEach((logical, name) => doc.logicals.set(name, logical));
      imported.profiles.forEach((profile, name) => doc.profiles.set(name, profile));
      const profiles = exporter.export().profiles;
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      return profiles;
    }

    function exportProfiles(derivedRules: string, baseRules = '') {
      return exportFSH(`
Extension: LinkKind
* value[x] only CodeableConcept

Extension: LinkModifier
* . ?!
* value[x] only boolean

Profile: BasePatient
Parent: Patient
* link.extension contains LinkKind named kind 0..1
* link.modifierExtension contains LinkModifier named modifier 0..1
* link ^slicing.discriminator.type = #value
* link ^slicing.discriminator.path = "type"
* link ^slicing.rules = #open
* link contains replacedBy 0..*
* link[replacedBy].type = #replaced-by
${baseRules}

Profile: DerivedPatient
Parent: BasePatient
${derivedRules}
`);
    }

    function getDifferential(profiles: StructureDefinition[], name: string): { id: string }[] {
      return profiles.find(p => p.name === name).toJSON().differential.element;
    }

    it.each(extensions.flatMap(ext => newSlices.map(newSlice => ({ ext, newSlice }))))(
      'should declare the profile of a copied $ext.element when it is constrained in a $newSlice.label',
      ({ ext, newSlice }) => {
        const path = `${fshPath(newSlice.slice)}.${ext.element}[${ext.slice}]`;
        const profiles = exportProfiles(`${newSlice.rules}
* ${path} 1..1
* ${path}.${ext.childRule}`);
        const differential = getDifferential(profiles, 'DerivedPatient');
        const extensionId = `Patient.link:${newSlice.slice}.${ext.element}:${ext.slice}`;
        expect(differential.find(e => e.id === extensionId)).toMatchObject({
          min: 1,
          type: [{ code: 'Extension', profile: [ext.profile] }]
        });
        expect(differential.some(e => e.id === `${extensionId}.${ext.childId}`)).toBe(true);
      }
    );

    it.each(extensions)(
      'should add just the profile of a copied $element when one of its children is constrained',
      ext => {
        const profiles = exportProfiles(`
* link contains seeAlso 0..*
* link[seeAlso].type = #seealso
* link[seeAlso].${ext.element}[${ext.slice}].${ext.childRule}`);
        const differential = getDifferential(profiles, 'DerivedPatient');
        // The copied extension itself is unchanged, so its diff only identifies its profile
        expect(
          differential.find(e => e.id === `Patient.link:seeAlso.${ext.element}:${ext.slice}`)
        ).toEqual({
          id: `Patient.link:seeAlso.${ext.element}:${ext.slice}`,
          path: `Patient.link.${ext.element}`,
          sliceName: ext.slice,
          type: [{ code: 'Extension', profile: [ext.profile] }]
        });
        // The inherited replacedBy slice holds the same extension, but nothing in it changed
        expect(differential.filter(e => e.id.startsWith('Patient.link:replacedBy'))).toEqual([]);
      }
    );

    it.each(extensions)(
      'should declare the profile of a copied $element that was added in the same profile',
      ext => {
        const extensionName = ext.profile.split('/').pop();
        const profiles = exportFSH(`
Extension: LinkKind
* value[x] only CodeableConcept

Extension: LinkModifier
* . ?!
* value[x] only boolean

Profile: TestPatient
Parent: Patient
* link.${ext.element} only ${extensionName}
* link.${ext.element} contains ${extensionName} named ${ext.slice} 0..1
* link.${ext.element}[${ext.slice}] only ${extensionName}
* link ^slicing.discriminator.type = #value
* link ^slicing.discriminator.path = "type"
* link ^slicing.rules = #open
* link contains seeAlso 0..*
* link[seeAlso].type = #seealso
* link[seeAlso].${ext.element}[${ext.slice}] 1..1
`);
        expect(
          getDifferential(profiles, 'TestPatient').find(
            e => e.id === `Patient.link:seeAlso.${ext.element}:${ext.slice}`
          )
        ).toEqual({
          id: `Patient.link:seeAlso.${ext.element}:${ext.slice}`,
          path: `Patient.link.${ext.element}`,
          sliceName: ext.slice,
          min: 1,
          max: '1',
          type: [{ code: 'Extension', profile: [ext.profile] }]
        });
      }
    );

    it('should omit copied extensions from a new slice when only an unrelated child is constrained', () => {
      const profiles = exportProfiles(`
* link contains seeAlso 0..*
* link[seeAlso].type = #seealso`);
      const differential = getDifferential(profiles, 'DerivedPatient');
      expect(differential.map(e => e.id)).toEqual([
        'Patient.link:seeAlso',
        'Patient.link:seeAlso.type'
      ]);
    });

    it('should declare the profile of an extension that is copied into an already unfolded slice', () => {
      const profiles = exportProfiles(
        '* link[replacedBy].extension[laterKind] 1..1',
        '* link.extension contains LinkKind named laterKind 0..1'
      );
      expect(
        profiles
          .find(p => p.name === 'BasePatient')
          .toJSON()
          .snapshot.element.find(
            (e: { id: string }) => e.id === 'Patient.link:replacedBy.extension:laterKind'
          )
      ).toBeUndefined();
      expect(
        getDifferential(profiles, 'DerivedPatient').find(
          e => e.id === 'Patient.link:replacedBy.extension:laterKind'
        )
      ).toEqual({
        id: 'Patient.link:replacedBy.extension:laterKind',
        path: 'Patient.link.extension',
        sliceName: 'laterKind',
        min: 1,
        type: [
          {
            code: 'Extension',
            profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/LinkKind']
          }
        ]
      });
    });

    it.each([
      { label: 'slice', slice: 'replacedBy', rules: '' },
      {
        label: 'reslice',
        slice: 'replacedBy/current',
        rules:
          '* link[replacedBy] contains current 0..*\n* link[replacedBy][current].extension[kind] MS'
      }
    ])(
      'should not repeat the profile of an extension in an inherited $label',
      ({ slice, rules }) => {
        const profiles = exportProfiles(`* ${fshPath(slice)}.extension[kind] 1..1`, rules);
        expect(
          getDifferential(profiles, 'DerivedPatient').find(
            e => e.id === `Patient.link:${slice}.extension:kind`
          )
        ).toEqual({
          id: `Patient.link:${slice}.extension:kind`,
          path: 'Patient.link.extension',
          sliceName: 'kind',
          min: 1
        });
      }
    );

    it('should not treat an element named extension as an extension when it has another type', () => {
      const profiles = exportFSH(`
Logical: PhoneDirectory
* entry 0..* Base "Entry"
* entry.number 1..1 string "Phone number"
* entry.extension 0..* string "Phone extension, which is not a FHIR Extension"

Profile: OfficeDirectory
Parent: PhoneDirectory
* entry ^slicing.discriminator.type = #value
* entry ^slicing.discriminator.path = "number"
* entry ^slicing.rules = #open
* entry.extension ^slicing.discriminator.type = #value
* entry.extension ^slicing.discriminator.path = "$this"
* entry.extension ^slicing.rules = #open
* entry.extension contains internal 0..1
* entry.extension[internal] MS
* entry contains office 0..*
* entry[office].number = "555"
`);
      // The copy of the internal slice in the new office slice is handled like any other element
      // that is not an Extension, so it is not in the differential
      expect(getDifferential(profiles, 'OfficeDirectory').map(e => e.id)).toEqual([
        'PhoneDirectory.entry',
        'PhoneDirectory.entry.extension',
        'PhoneDirectory.entry.extension:internal',
        'PhoneDirectory.entry:office',
        'PhoneDirectory.entry:office.number'
      ]);
    });
  });
});
