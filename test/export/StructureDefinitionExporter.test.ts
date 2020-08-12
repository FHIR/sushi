import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import {
  Profile,
  Extension,
  FshCanonical,
  FshCode,
  FshReference,
  Instance,
  FshValueSet,
  FshCodeSystem,
  Invariant,
  RuleSet
} from '../../src/fshtypes';
import {
  CardRule,
  FlagRule,
  OnlyRule,
  ValueSetRule,
  FixedValueRule,
  ContainsRule,
  CaretValueRule,
  ObeysRule,
  InsertRule,
  ConceptRule
} from '../../src/fshtypes/rules';
import { loggerSpy, TestFisher } from '../testhelpers';
import { ElementDefinitionType } from '../../src/fhirtypes';
import path from 'path';
import { withDebugLogging } from '../testhelpers/withDebugLogging';
import { minimalConfig } from '../utils/minimalConfig';

describe('StructureDefinitionExporter', () => {
  let defs: FHIRDefinitions;
  let fisher: TestFisher;
  let doc: FSHDocument;
  let pkg: Package;
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
    pkg = new Package(input.config);
    fisher = new TestFisher(input, defs, pkg);
    exporter = new StructureDefinitionExporter(input, pkg, fisher);
    loggerSpy.reset();
  });

  // Profile
  it('should set all user-provided metadata for a profile', () => {
    const profile = new Profile('Foo');
    profile.id = 'foo';
    profile.parent = 'Observation';
    profile.title = 'Foo Profile';
    profile.description = 'foo bar foobar';
    doc.profiles.set(profile.name, profile);
    exporter.exportStructDef(profile);
    const exported = pkg.profiles[0];
    expect(exported.name).toBe('Foo');
    expect(exported.id).toBe('foo');
    expect(exported.title).toBe('Foo Profile');
    expect(exported.description).toBe('foo bar foobar');
    expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/foo');
    expect(exported.version).toBe('1.0.0');
    expect(exported.type).toBe('Observation');
    expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Observation');
  });

  it('should properly set/clear all metadata properties for a profile', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    doc.profiles.set(profile.name, profile);
    exporter.exportStructDef(profile);
    const exported = pkg.profiles[0];

    expect(exported.id).toBe('Foo'); // defaulted from user-provided name
    expect(exported.meta).toBeUndefined();
    expect(exported.implicitRules).toBeUndefined();
    expect(exported.language).toBeUndefined();
    expect(exported.text).toBeUndefined();
    expect(exported.contained).toBeUndefined(); // inherited from Observation
    // NOTE: The following extensions are stripped out as uninherited extensions:
    // {
    //   url: "http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status",
    //   valueCode: "normative"
    // },
    // {
    //   url: "http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version",
    //   valueCode: "4.0.0"
    // },
    // { url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm', valueInteger: 5 },
    // { url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg', valueCode: 'oo' }
    //
    // BUT the following two extensions should remain:
    expect(exported.extension).toEqual([
      {
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
        valueString: 'Clinical.Diagnostics'
      },
      {
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-security-category',
        valueCode: 'patient'
      }
    ]);
    expect(exported.modifierExtension).toBeUndefined();
    expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'); // constructed from canonical and id
    expect(exported.identifier).toBeUndefined();
    expect(exported.version).toBe('1.0.0'); // provided by config
    expect(exported.name).toBe('Foo'); // provided by user
    expect(exported.title).toBeUndefined();
    expect(exported.status).toBe('active'); // always active
    expect(exported.experimental).toBeUndefined();
    expect(exported.date).toBeUndefined();
    expect(exported.publisher).toBeUndefined();
    expect(exported.contact).toBeUndefined();
    expect(exported.description).toBeUndefined();
    expect(exported.useContext).toBeUndefined();
    expect(exported.jurisdiction).toBeUndefined();
    expect(exported.purpose).toBeUndefined();
    expect(exported.copyright).toBeUndefined();
    expect(exported.keyword).toBeUndefined();
    expect(exported.fhirVersion).toBe('4.0.1'); // Inherited from Observation
    expect(exported.mapping).toEqual([
      { identity: 'workflow', uri: 'http://hl7.org/fhir/workflow', name: 'Workflow Pattern' },
      {
        identity: 'sct-concept',
        uri: 'http://snomed.info/conceptdomain',
        name: 'SNOMED CT Concept Domain Binding'
      },
      { identity: 'v2', uri: 'http://hl7.org/v2', name: 'HL7 v2 Mapping' },
      { identity: 'rim', uri: 'http://hl7.org/v3', name: 'RIM Mapping' },
      { identity: 'w5', uri: 'http://hl7.org/fhir/fivews', name: 'FiveWs Pattern Mapping' },
      {
        identity: 'sct-attr',
        uri: 'http://snomed.org/attributebinding',
        name: 'SNOMED CT Attribute Binding'
      }
    ]); // inherited from Observation
    expect(exported.kind).toBe('resource'); // inherited from Observation
    expect(exported.abstract).toBe(false); // always abstract
    expect(exported.context).toBeUndefined(); // inherited from Observation
    expect(exported.contextInvariant).toBeUndefined(); // inherited from Observation
    expect(exported.type).toBe('Observation'); // inherited from Observation
    expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Observation'); // url for Observation
    expect(exported.derivation).toBe('constraint'); // always constraint
  });

  it('should not overwrite metadata that is not given for a profile', () => {
    const profile = new Profile('Foo');
    doc.profiles.set(profile.name, profile);
    exporter.exportStructDef(profile);
    const exported = pkg.profiles[0];
    expect(exported.name).toBe('Foo');
    expect(exported.id).toBe('Foo');
    expect(exported.title).toBeUndefined();
    expect(exported.description).toBeUndefined();
    expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');
    expect(exported.version).toBe('1.0.0');
    expect(exported.type).toBe('Resource');
    expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Resource');
    expect(exported.derivation).toBe('constraint');
  });

  it('should allow metadata to be overwritten with caret rule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    const rule = new CaretValueRule('');
    rule.caretPath = 'status';
    rule.value = new FshCode('active');
    profile.rules.push(rule);
    doc.profiles.set(profile.name, profile);
    exporter.exportStructDef(profile);
    const exported = pkg.profiles[0];
    expect(exported.name).toBe('Foo');
    expect(exported.status).toBe('active');
  });

  it('should throw ParentNotDefinedError when parent resource is not found', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Bar';
    doc.profiles.set(profile.name, profile);
    expect(() => {
      exporter.exportStructDef(profile);
    }).toThrow('Parent Bar not found for Foo');
  });

  it('should throw ParentDeclaredAsProfileNameError when the profile decares itself as the parent', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Foo';
    doc.profiles.set(profile.name, profile);
    expect(() => {
      exporter.exportStructDef(profile);
    }).toThrow('Profile "Foo" cannot declare itself as a Parent.');
  });

  it('should throw ParentDeclaredAsProfileNameError and suggest resource URL when the profile decares itself as the parent and it is a FHIR resource', () => {
    const profile = new Profile('Patient');
    profile.parent = 'Patient';
    doc.profiles.set(profile.name, profile);
    expect(() => {
      exporter.exportStructDef(profile);
    }).toThrow(
      'Profile "Patient" cannot declare itself as a Parent. It looks like the parent is an external resource; use its URL (e.g., http://hl7.org/fhir/StructureDefinition/Patient).'
    );
  });

  it('should throw ParentDeclaredAsProfileIdError when a profile sets the same value for parent and id', () => {
    const parentProfile = new Profile('InitialProfile');
    parentProfile.id = 'ParentProfile';
    doc.profiles.set(parentProfile.name, parentProfile);

    const childProfile = new Profile('OverlappingProfile');
    childProfile.parent = 'InitialProfile';
    childProfile.id = 'InitialProfile';
    doc.profiles.set(childProfile.name, childProfile);

    expect(() => {
      exporter.exportStructDef(childProfile);
    }).toThrow(
      'Profile "OverlappingProfile" cannot declare "InitialProfile" as both Parent and Id.'
    );
  });

  it('should throw ParentDeclaredAsProfileIdError and suggest resource URL when a profile sets the same value for parent and id and the parent is a FHIR resource', () => {
    const profile = new Profile('KidsFirstPatient');
    profile.parent = 'Patient';
    profile.id = 'Patient';
    doc.profiles.set(profile.name, profile);
    expect(() => {
      exporter.exportStructDef(profile);
    }).toThrow(
      'Profile "KidsFirstPatient" cannot declare "Patient" as both Parent and Id. It looks like the parent is an external resource; use its URL (e.g., http://hl7.org/fhir/StructureDefinition/Patient).'
    );
  });

  // Extension
  it('should set all user-provided metadata for an extension', () => {
    const extension = new Extension('Foo');
    extension.id = 'foo';
    extension.title = 'Foo Profile';
    extension.description = 'foo bar foobar';
    doc.extensions.set(extension.name, extension);
    exporter.exportStructDef(extension);
    const exported = pkg.extensions[0];
    expect(exported.name).toBe('Foo');
    expect(exported.id).toBe('foo');
    expect(exported.title).toBe('Foo Profile');
    expect(exported.description).toBe('foo bar foobar');
    expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/foo');
    expect(exported.version).toBe('1.0.0');
    expect(exported.type).toBe('Extension');
    expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Extension');

    // Check that Extension.url is correctly fixed
    expect(exported.elements.find(e => e.id === 'Extension.url').fixedUri).toBe(
      'http://hl7.org/fhir/us/minimal/StructureDefinition/foo'
    );
  });

  it('should properly set/clear all metadata properties for an extension', () => {
    const extension = new Extension('Foo');
    extension.parent = 'patient-mothersMaidenName';
    doc.profiles.set(extension.name, extension);
    exporter.exportStructDef(extension);
    const exported = pkg.extensions[0];

    expect(exported.id).toBe('Foo'); // defaulted from user-provided name
    expect(exported.meta).toBeUndefined();
    expect(exported.implicitRules).toBeUndefined();
    expect(exported.language).toBeUndefined();
    expect(exported.text).toBeUndefined();
    expect(exported.contained).toBeUndefined(); // inherited from patient-mothersMaidenName
    expect(exported.extension).toBeUndefined(); // uninherited extensions are filtered out
    expect(exported.modifierExtension).toBeUndefined();
    expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'); // constructed from canonical and id
    expect(exported.identifier).toBeUndefined();
    expect(exported.version).toBe('1.0.0'); // provided by config
    expect(exported.name).toBe('Foo'); // provided by user
    expect(exported.title).toBeUndefined();
    expect(exported.status).toBe('active'); // always active
    expect(exported.experimental).toBeUndefined();
    expect(exported.date).toBeUndefined();
    expect(exported.publisher).toBeUndefined();
    expect(exported.contact).toBeUndefined();
    expect(exported.description).toBeUndefined();
    expect(exported.useContext).toBeUndefined();
    expect(exported.jurisdiction).toBeUndefined();
    expect(exported.purpose).toBeUndefined();
    expect(exported.copyright).toBeUndefined();
    expect(exported.keyword).toBeUndefined();
    expect(exported.fhirVersion).toBe('4.0.1'); // Inherited from patient-mothersMaidenName
    expect(exported.mapping).toEqual([
      { identity: 'v2', uri: 'http://hl7.org/v2', name: 'HL7 v2 Mapping' },
      { identity: 'rim', uri: 'http://hl7.org/v3', name: 'RIM Mapping' }
    ]); // inherited from patient-mothersMaidenName
    expect(exported.kind).toBe('complex-type'); // inherited from patient-mothersMaidenName
    expect(exported.abstract).toBe(false); // always abstract
    expect(exported.context).toEqual([{ type: 'element', expression: 'Patient' }]); // inherited from patient-mothersMaidenName
    expect(exported.contextInvariant).toBeUndefined(); // inherited from patient-mothersMaidenName
    expect(exported.type).toBe('Extension'); // inherited from patient-mothersMaidenName
    expect(exported.baseDefinition).toBe(
      'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
    ); // url for patient-mothersMaidenName
    expect(exported.derivation).toBe('constraint'); // always constraint

    // Check that Extension.url is correctly fixed
    expect(exported.elements.find(e => e.id === 'Extension.url').fixedUri).toBe(
      'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'
    );
  });

  it('should not overwrite metadata that is not given for an extension', () => {
    const extension = new Extension('Foo');
    doc.extensions.set(extension.name, extension);
    exporter.exportStructDef(extension);
    const exported = pkg.extensions[0];
    expect(exported.name).toBe('Foo');
    expect(exported.id).toBe('Foo');
    expect(exported.title).toBeUndefined();
    expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');
    expect(exported.elements.find(e => e.id === 'Extension.url').fixedUri).toBe(
      'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'
    );
    expect(exported.version).toBe('1.0.0');
    expect(exported.context).toEqual([
      {
        type: 'element',
        expression: 'Element'
      }
    ]);
    expect(exported.type).toBe('Extension');
    expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Extension');
    expect(exported.derivation).toBe('constraint');
  });

  it('should export sub-extensions, with similar starting names and different types', () => {
    const ruleString = new OnlyRule('extension[Foo].value[x]');
    ruleString.types = [{ type: 'string' }];
    const ruleDecimal = new OnlyRule('extension[FooBar].value[x]');
    ruleDecimal.types = [{ type: 'decimal' }];
    const exParent = new Extension('Parent');

    const FooFooCardRule = new CardRule('extension[Foo]');
    FooFooCardRule.min = 1;
    FooFooCardRule.max = '1'; // * extension[sliceB].extension 1..1

    const FooBarCardRule = new CardRule('extension[FooBar]');
    FooBarCardRule.min = 0;
    FooBarCardRule.max = '1'; // * extension[sliceB].extension 0..0

    const containsRule = new ContainsRule('extension');
    containsRule.items = [{ name: 'Foo' }, { name: 'FooBar' }];

    exParent.rules.push(containsRule, FooFooCardRule, FooBarCardRule, ruleString, ruleDecimal);

    exporter.exportStructDef(exParent);
    const sd = pkg.extensions[0];
    const extension = sd.elements.find(e => e.id === 'Extension.extension:FooBar.value[x]');
    expect(extension.type[0].code).toBe('decimal');
  });

  it('should not hardcode in the default context if parent already had a context', () => {
    // NOTE: This is a temporary test to ensure that we don't overwrite a valid context with our
    // "default" context.  In the (near) future, however, we should do away with our default
    // context and make context user-specified, in which case it should override the parent's
    // context.
    const extension = new Extension('Foo');
    extension.parent = 'http://hl7.org/fhir/StructureDefinition/patient-animal';
    doc.extensions.set(extension.name, extension);
    exporter.exportStructDef(extension);
    const exported = pkg.extensions[0];
    expect(exported.context).toEqual([
      {
        type: 'element',
        expression: 'Patient'
      }
    ]);
  });

  it('should allow metadata to be overwritten with caret rule', () => {
    const extension = new Extension('Foo');
    const rule1 = new CaretValueRule('');
    rule1.caretPath = 'status';
    rule1.value = new FshCode('active');
    const rule2 = new CaretValueRule('');
    rule2.caretPath = 'context[0].type';
    rule2.value = new FshCode('element');
    const rule3 = new CaretValueRule('');
    rule3.caretPath = 'context[0].expression';
    rule3.value = 'Observation';
    extension.rules.push(rule1, rule2, rule3);
    doc.extensions.set(extension.name, extension);
    exporter.exportStructDef(extension);
    const exported = pkg.extensions[0];
    expect(exported.name).toBe('Foo');
    expect(exported.status).toBe('active');
    expect(exported.context).toEqual([
      {
        type: 'element',
        expression: 'Observation'
      }
    ]);
  });

  it('should throw ParentNotDefinedError when parent extension is not found', () => {
    const extension = new Extension('Foo');
    extension.parent = 'Bar';
    doc.extensions.set(extension.name, extension);
    expect(() => {
      exporter.exportStructDef(extension);
    }).toThrow('Parent Bar not found for Foo');
  });

  it('should log a message when the structure definition has an invalid id', () => {
    const profile = new Profile('Wrong').withFile('Wrong.fsh').withLocation([1, 8, 4, 18]);
    profile.id = 'will?not?work';
    doc.profiles.set(profile.name, profile);
    exporter.exportStructDef(profile);
    const exported = pkg.profiles[0];
    expect(exported.id).toBe('will?not?work');
    expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR id/s);
    expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 1 - 4\D*/s);
  });

  it('should log a message when the structure definition has an invalid name', () => {
    const profile = new Profile('Not-good').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
    doc.profiles.set(profile.name, profile);
    exporter.exportStructDef(profile);
    const exported = pkg.profiles[0];
    expect(exported.name).toBe('Not-good');
    expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR name/s);
    expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
  });

  it('should sanitize the id and log a message when a valid name is used to make an invalid id', () => {
    const profile = new Profile('Not_good_id').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
    doc.profiles.set(profile.name, profile);
    exporter.exportStructDef(profile);
    const exported = pkg.profiles[0];
    expect(exported.name).toBe('Not_good_id');
    expect(exported.id).toBe('Not-good-id');
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /The string "Not_good_id" represents a valid FHIR name but not a valid FHIR id.*The id will be exported as "Not-good-id"/s
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
  });

  it('should sanitize the id and log a message when a long valid name is used to make an invalid id', () => {
    let longId = 'Toolong';
    while (longId.length < 65) longId += 'longer';
    const profile = new Profile(longId).withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
    doc.profiles.set(profile.name, profile);
    exporter.exportStructDef(profile);
    const exported = pkg.profiles[0];
    const expectedId = longId.slice(0, 64);
    expect(exported.name).toBe(longId);
    expect(exported.id).toBe(expectedId);
    const warning = new RegExp(
      `The string "${longId}" represents a valid FHIR name but not a valid FHIR id.*The id will be exported as "${expectedId}"`,
      's'
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(warning);
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
  });
  it('should log an error when multiple profiles have the same id', () => {
    const firstProfile = new Profile('FirstProfile')
      .withFile('Profiles.fsh')
      .withLocation([2, 8, 6, 25]);
    firstProfile.id = 'my-profile';
    const secondProfile = new Profile('SecondProfile')
      .withFile('Profiles.fsh')
      .withLocation([8, 8, 11, 25]);
    secondProfile.id = 'my-profile';
    doc.profiles.set(firstProfile.name, firstProfile);
    doc.profiles.set(secondProfile.name, secondProfile);

    exporter.export();
    expect(pkg.profiles).toHaveLength(2);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Multiple structure definitions with id my-profile/s
    );
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Profiles\.fsh.*Line: 8 - 11\D*/s);
  });

  it('should log an error when multiple extensions have the same id', () => {
    const firstExtension = new Extension('FirstExtension')
      .withFile('Extensions.fsh')
      .withLocation([3, 8, 7, 22]);
    firstExtension.id = 'my-extension';
    const secondExtension = new Extension('SecondExtension')
      .withFile('Extensions.fsh')
      .withLocation([11, 8, 15, 29]);
    secondExtension.id = 'my-extension';
    doc.extensions.set(firstExtension.name, firstExtension);
    doc.extensions.set(secondExtension.name, secondExtension);

    exporter.export();
    expect(pkg.extensions).toHaveLength(2);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Multiple structure definitions with id my-extension/s
    );
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Extensions\.fsh.*Line: 11 - 15\D*/s);
  });

  it('should log an error when a profile and an extension have the same id', () => {
    const profile = new Profile('MyProfile').withFile('Profiles.fsh').withLocation([2, 8, 5, 15]);
    profile.id = 'custom-definition';
    const extension = new Extension('MyExtension')
      .withFile('Extensions.fsh')
      .withLocation([3, 8, 5, 19]);
    extension.id = 'custom-definition';
    doc.profiles.set(profile.name, profile);
    doc.extensions.set(extension.name, extension);

    exporter.export();
    expect(pkg.profiles).toHaveLength(1);
    expect(pkg.extensions).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Multiple structure definitions with id custom-definition/s
    );
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Extensions\.fsh.*Line: 3 - 5\D*/s);
  });

  // Rules
  it('should emit an error and continue when the path is not found', () => {
    const profile = new Profile('Foo');
    const rule = new CardRule('fakePath').withFile('Foo.fsh').withLocation([3, 8, 4, 22]);
    rule.min = 0;
    rule.max = '1';
    profile.rules.push(rule);
    exporter.exportStructDef(profile);
    const structDef = pkg.profiles[0];
    expect(structDef).toBeDefined();
    expect(structDef.type).toBe('Resource');
    expect(loggerSpy.getLastMessage()).toMatch(/File: Foo\.fsh.*Line: 3 - 4\D*/s);
  });

  it('should emit an error and continue when the path for the child of a choice element is not found', () => {
    const profile = new Profile('Foo');
    const rule = new FixedValueRule('value[x].comparator')
      .withFile('Foo.fsh')
      .withLocation([4, 7, 4, 22]);
    rule.fixedValue = new FshCode('>=');
    profile.rules.push(rule);
    exporter.exportStructDef(profile);
    const structDef = pkg.profiles[0];
    expect(structDef).toBeDefined();
    expect(structDef.type).toBe('Resource');
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Foo\.fsh.*Line: 4\D*/s);
  });

  // Card Rule
  it('should apply a correct card rule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('subject');
    rule.min = 1;
    rule.max = '1';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCard = baseStructDef.findElement('Observation.subject');
    const changedCard = sd.findElement('Observation.subject');

    expect(baseCard.min).toBe(0);
    expect(baseCard.max).toBe('1');
    expect(changedCard.min).toBe(1);
    expect(changedCard.max).toBe('1');
  });

  it('should not apply an incorrect card rule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('status').withFile('Wrong.fsh').withLocation([5, 4, 5, 11]);
    rule.min = 0;
    rule.max = '1';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCard = baseStructDef.findElement('Observation.status');
    const changedCard = sd.findElement('Observation.status');

    expect(baseCard.min).toBe(1);
    expect(baseCard.max).toBe('1');
    expect(changedCard.min).toBe(1);
    expect(changedCard.max).toBe('1');
    expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 5\D*/s);
  });

  it('should apply a card rule with only min specified', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('category');
    rule.min = 1;
    rule.max = '';
    profile.rules.push(rule); // * category 1..

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCard = baseStructDef.findElement('Observation.category');
    const changedCard = sd.findElement('Observation.category');

    expect(baseCard.min).toBe(0);
    expect(baseCard.max).toBe('*');
    expect(changedCard.min).toBe(1); // Only min cardinality is updated
    expect(changedCard.max).toBe('*'); // Max remains same as base
  });

  it('should apply a card rule with only max specified', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('category');
    rule.min = NaN;
    rule.max = '3';
    profile.rules.push(rule); // * category ..3

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCard = baseStructDef.findElement('Observation.category');
    const changedCard = sd.findElement('Observation.category');

    expect(baseCard.min).toBe(0);
    expect(baseCard.max).toBe('*');
    expect(changedCard.min).toBe(0); // Min cardinality remains unchanged
    expect(changedCard.max).toBe('3'); // Only max is changed
  });

  it('should not apply an incorrect min only card rule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('status').withFile('BadCard.fsh').withLocation([3, 4, 3, 11]);
    rule.min = 0;
    rule.max = '';
    profile.rules.push(rule); // * status 0..

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCard = baseStructDef.findElement('Observation.status');
    const changedCard = sd.findElement('Observation.status');

    expect(baseCard.min).toBe(1);
    expect(baseCard.max).toBe('1');
    expect(changedCard.min).toBe(1);
    expect(changedCard.max).toBe('1'); // Neither card changes
    expect(loggerSpy.getLastMessage()).toMatch(/File: BadCard\.fsh.*Line: 3\D*/s);
  });

  it('should not apply an incorrect max only card rule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('status').withFile('BadCard.fsh').withLocation([3, 4, 3, 11]);
    rule.min = NaN;
    rule.max = '2';
    profile.rules.push(rule); // * status ..2

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCard = baseStructDef.findElement('Observation.status');
    const changedCard = sd.findElement('Observation.status');

    expect(baseCard.min).toBe(1);
    expect(baseCard.max).toBe('1');
    expect(changedCard.min).toBe(1);
    expect(changedCard.max).toBe('1'); // Neither card changes
    expect(loggerSpy.getLastMessage()).toMatch(/File: BadCard\.fsh.*Line: 3\D*/s);
  });

  it('should not apply a card rule with no sides specified', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('status').withFile('BadCard.fsh').withLocation([3, 4, 3, 11]);
    rule.min = NaN;
    rule.max = '';
    profile.rules.push(rule); // * status ..

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCard = baseStructDef.findElement('Observation.status');
    const changedCard = sd.findElement('Observation.status');

    expect(baseCard.min).toBe(1);
    expect(baseCard.max).toBe('1');
    expect(changedCard.min).toBe(1);
    expect(changedCard.max).toBe('1'); // Neither card changes. Error logged on import side.
  });

  // Flag Rule
  it('should apply a valid flag rule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'DiagnosticReport';

    const rule = new FlagRule('conclusion');
    rule.modifier = false;
    rule.mustSupport = true;
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('DiagnosticReport');

    const baseElement = baseStructDef.findElement('DiagnosticReport.conclusion');
    const changedElement = sd.findElement('DiagnosticReport.conclusion');
    expect(baseElement.isModifier).toBeFalsy();
    expect(baseElement.mustSupport).toBeFalsy();
    expect(baseElement.isSummary).toBeFalsy();
    expect(changedElement.isModifier).toBe(false);
    expect(changedElement.mustSupport).toBe(true);
    expect(baseElement.isSummary).toBeFalsy();
  });

  it('should apply a flag rule that specifies an element is trial use', () => {
    // Profile: HasTrial
    // Parent: Observation
    // * bodySite TU
    const profile = new Profile('HasTrial');
    profile.parent = 'Observation';
    const flagRule = new FlagRule('bodySite');
    flagRule.trialUse = true;
    profile.rules.push(flagRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const bodySite = sd.findElement('Observation.bodySite');
    expect(bodySite.extension).toHaveLength(1);
    expect(bodySite.extension[0]).toEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
      valueCode: 'trial-use'
    });
  });

  it('should apply a flag rule that specifies an element is normative', () => {
    // Profile: HasTrial
    // Parent: Observation
    // * method N
    const profile = new Profile('HasTrial');
    profile.parent = 'Observation';
    const flagRule = new FlagRule('method');
    flagRule.normative = true;
    profile.rules.push(flagRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const method = sd.findElement('Observation.method');
    expect(method.extension).toHaveLength(1);
    expect(method.extension[0]).toEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
      valueCode: 'normative'
    });
  });
  it('should apply a flag rule that specifies an element is a draft', () => {
    // Profile: HasDraft
    // Parent: DiagnosticReport
    // * media D
    const profile = new Profile('HasDraft');
    profile.parent = 'DiagnosticReport';
    const flagRule = new FlagRule('media');
    flagRule.draft = true;
    profile.rules.push(flagRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const media = sd.findElement('DiagnosticReport.media');
    expect(media.extension).toHaveLength(1);
    expect(media.extension[0]).toEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
      valueCode: 'draft'
    });
  });
  it('should log an error when more than one standards status flag rule is specified on an element', () => {
    // Profile: HasDraft
    // Parent: DiagnosticReport
    // * media D TU
    const profile = new Profile('HasDraft');
    profile.parent = 'DiagnosticReport';
    const flagRule = new FlagRule('media').withFile('MultiStatus.fsh').withLocation([3, 1, 3, 12]);
    flagRule.draft = true;
    flagRule.trialUse = true;
    profile.rules.push(flagRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const media = sd.findElement('DiagnosticReport.media');
    expect(media.extension).toBeUndefined();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: MultiStatus\.fsh.*Line: 3\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/multiple standards status/s);
  });

  it('should apply a flag rule that changes the existing standards status', () => {
    // Profile: HasTrial
    // Parent: Observation
    // * focus N
    const profile = new Profile('HasTrial');
    profile.parent = 'Observation';
    const flagRule = new FlagRule('focus').withFile('MultiStatus.fsh').withLocation([8, 3, 8, 14]);
    flagRule.normative = true;
    profile.rules.push(flagRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const focus = sd.findElement('Observation.focus');
    const baseStructDef = fisher.fishForStructureDefinition('Observation');
    const baseFocus = baseStructDef.findElement('Observation.focus');
    expect(baseFocus.extension).toContainEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
      valueCode: 'trial-use'
    });
    expect(focus.extension).toContainEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
      valueCode: 'normative'
    });
  });

  // Value Set Rule
  it('should apply a correct value set rule to an unbound string', () => {
    const profile = new Profile('Junk');
    profile.parent = 'Appointment';

    const vsRule = new ValueSetRule('description');
    vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Appointment');
    const baseElement = baseStructDef.findElement('Appointment.description');
    const changedElement = sd.findElement('Appointment.description');
    expect(baseElement.binding).toBeUndefined();
    expect(changedElement.binding.valueSet).toBe('http://example.org/fhir/ValueSet/some-valueset');
    expect(changedElement.binding.strength).toBe('extensible');
  });

  it('should apply a correct value set rule that overrides a previous binding', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const vsRule = new ValueSetRule('category');
    vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');
    const baseElement = baseStructDef.findElement('Observation.category');
    const changedElement = sd.findElement('Observation.category');
    expect(baseElement.binding.valueSet).toBe('http://hl7.org/fhir/ValueSet/observation-category');
    expect(baseElement.binding.strength).toBe('preferred');
    expect(changedElement.binding.valueSet).toBe('http://example.org/fhir/ValueSet/some-valueset');
    expect(changedElement.binding.strength).toBe('extensible');
  });

  it('should apply a correct value set rule when the VS is referenced by name', () => {
    const customCategoriesVS = new FshValueSet('CustomCategories');
    customCategoriesVS.id = 'custom-categories';
    doc.valueSets.set('CustomCategories', customCategoriesVS);

    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    const vsRule = new ValueSetRule('category');
    vsRule.valueSet = 'CustomCategories';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const element = sd.findElement('Observation.category');
    expect(element.binding.valueSet).toBe(
      'http://hl7.org/fhir/us/minimal/ValueSet/custom-categories'
    );
    expect(element.binding.strength).toBe('extensible');
  });

  it('should use the url specified in a CaretValueRule when referencing a named value set', () => {
    const customCategoriesVS = new FshValueSet('CustomCategories');
    customCategoriesVS.id = 'custom-categories';
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'url';
    caretValueRule.value = 'http://different-url.com/ValueSet/custom-categories';
    customCategoriesVS.rules.push(caretValueRule);
    doc.valueSets.set('CustomCategories', customCategoriesVS);

    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    const vsRule = new ValueSetRule('category');
    vsRule.valueSet = 'CustomCategories';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const element = sd.findElement('Observation.category');
    expect(element.binding.valueSet).toBe('http://different-url.com/ValueSet/custom-categories');
    expect(element.binding.strength).toBe('extensible');
  });

  it('should not apply a value set rule on an element that cannot support it', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const vsRule = new ValueSetRule('note').withFile('Codeless.fsh').withLocation([6, 9, 6, 25]);
    vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');
    const baseElement = baseStructDef.findElement('Observation.note');
    const changedElement = sd.findElement('Observation.note');
    expect(baseElement.binding).toBeUndefined();
    expect(changedElement.binding).toBeUndefined();
    expect(loggerSpy.getLastMessage()).toMatch(/File: Codeless\.fsh.*Line: 6\D*/s);
  });

  it('should not override a binding with a less strict binding', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const vsRule = new ValueSetRule('category').withFile('Strict.fsh').withLocation([9, 10, 9, 35]);
    vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
    vsRule.strength = 'example';
    profile.rules.push(vsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');
    const baseElement = baseStructDef.findElement('Observation.category');
    const changedElement = sd.findElement('Observation.category');
    expect(baseElement.binding.valueSet).toBe('http://hl7.org/fhir/ValueSet/observation-category');
    expect(baseElement.binding.strength).toBe('preferred');
    expect(changedElement.binding.valueSet).toBe(
      'http://hl7.org/fhir/ValueSet/observation-category'
    );
    expect(changedElement.binding.strength).toBe('preferred');
    expect(loggerSpy.getLastMessage()).toMatch(/File: Strict\.fsh.*Line: 9\D*/s);
  });

  // Only Rule
  it('should apply a correct OnlyRule on a non-reference choice', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new OnlyRule('value[x]');
    rule.types = [{ type: 'string' }];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseValue = baseStructDef.findElement('Observation.value[x]');
    const constrainedValue = sd.findElement('Observation.value[x]');

    expect(baseValue.type).toHaveLength(11);
    expect(baseValue.type[0]).toEqual(new ElementDefinitionType('Quantity'));
    expect(baseValue.type[1]).toEqual(new ElementDefinitionType('CodeableConcept'));
    expect(baseValue.type[2]).toEqual(new ElementDefinitionType('string'));

    expect(constrainedValue.type).toHaveLength(1);
    expect(constrainedValue.type[0]).toEqual(new ElementDefinitionType('string'));
  });

  it('should apply a correct OnlyRule on a reference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new OnlyRule('subject');
    rule.types = [{ type: 'Device', isReference: true }];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseSubject = baseStructDef.findElement('Observation.subject');
    const constrainedSubject = sd.findElement('Observation.subject');

    expect(baseSubject.type).toHaveLength(1);
    expect(baseSubject.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Patient',
        'http://hl7.org/fhir/StructureDefinition/Group',
        'http://hl7.org/fhir/StructureDefinition/Device',
        'http://hl7.org/fhir/StructureDefinition/Location'
      )
    );

    expect(constrainedSubject.type).toHaveLength(1);
    expect(constrainedSubject.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Device'
      )
    );
  });

  it('should apply a correct OnlyRule on a reference to Any', () => {
    const extension = new Extension('Foo');

    const rule = new OnlyRule('value[x]');
    rule.types = [
      { type: 'Observation', isReference: true },
      { type: 'Condition', isReference: true }
    ];
    extension.rules.push(rule);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const baseStructDef = fisher.fishForStructureDefinition('Extension');

    const baseValueX = baseStructDef.findElement('Extension.value[x]');
    const constrainedValueX = sd.findElement('Extension.value[x]');

    expect(baseValueX.type).toHaveLength(50);
    expect(baseValueX.type.find(t => t.code === 'Reference')).toEqual(
      new ElementDefinitionType('Reference')
    );

    expect(constrainedValueX.type).toHaveLength(1);
    expect(constrainedValueX.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Observation',
        'http://hl7.org/fhir/StructureDefinition/Condition'
      )
    );
  });

  it('should apply a correct OnlyRule with a specific target constrained', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new OnlyRule('hasMember[Observation]');
    rule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/bodyheight', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/bodyweight', isReference: true }
    ];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseHasMember = baseStructDef.findElement('Observation.hasMember');
    const constrainedHasMember = sd.findElement('Observation.hasMember');

    expect(baseHasMember.type).toHaveLength(1);
    expect(baseHasMember.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Observation',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );

    expect(constrainedHasMember.type).toHaveLength(1);
    expect(constrainedHasMember.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/bodyheight',
        'http://hl7.org/fhir/StructureDefinition/bodyweight',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );
  });

  it('should apply a correct OnlyRule on a non-reference FSHy choice', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const targetProfile = new Profile('MySpecialQuantity');
    targetProfile.parent = 'Quantity';
    doc.profiles.set(targetProfile.name, targetProfile);

    const rule = new OnlyRule('value[x]');
    rule.types = [{ type: 'MySpecialQuantity' }];
    profile.rules.push(rule);

    // force-load Quantity into the cache since MySpecialQuantity declares it as parent
    fisher.fishForStructureDefinition('Quantity');

    exporter.exportStructDef(profile);
    const sd = pkg.profiles.find(d => d.name === 'Foo');
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseValue = baseStructDef.findElement('Observation.value[x]');
    const constrainedValue = sd.findElement('Observation.value[x]');

    expect(baseValue.type).toHaveLength(11);
    expect(baseValue.type[0]).toEqual(new ElementDefinitionType('Quantity'));
    expect(baseValue.type[1]).toEqual(new ElementDefinitionType('CodeableConcept'));
    expect(baseValue.type[2]).toEqual(new ElementDefinitionType('string'));

    expect(constrainedValue.type).toHaveLength(1);
    expect(constrainedValue.type[0]).toEqual(
      new ElementDefinitionType('Quantity').withProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialQuantity'
      )
    );
  });

  it('should apply a correct OnlyRule on a FSHy reference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const targetProfile = new Profile('MySpecialDevice');
    targetProfile.parent = 'Device';
    doc.profiles.set(targetProfile.name, targetProfile);

    const rule = new OnlyRule('subject');
    rule.types = [{ type: 'MySpecialDevice', isReference: true }];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles.find(p => p.name === 'Foo');
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseSubject = baseStructDef.findElement('Observation.subject');
    const constrainedSubject = sd.findElement('Observation.subject');

    expect(baseSubject.type).toHaveLength(1);
    expect(baseSubject.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Patient',
        'http://hl7.org/fhir/StructureDefinition/Group',
        'http://hl7.org/fhir/StructureDefinition/Device',
        'http://hl7.org/fhir/StructureDefinition/Location'
      )
    );

    expect(constrainedSubject.type).toHaveLength(1);
    expect(constrainedSubject.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialDevice'
      )
    );
  });

  it('should apply a correct OnlyRule with a specific target constrained to FSHy definition', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const targetProfile1 = new Profile('MySpecialObservation1');
    targetProfile1.parent = 'Observation';
    const targetProfile2 = new Profile('MySpecialObservation2');
    targetProfile2.parent = 'Observation';
    doc.profiles.set(targetProfile1.name, targetProfile1);
    doc.profiles.set(targetProfile2.name, targetProfile2);

    const rule = new OnlyRule('hasMember[Observation]');
    rule.types = [
      { type: 'MySpecialObservation1', isReference: true },
      { type: 'MySpecialObservation2', isReference: true }
    ];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles.find(p => p.name === 'Foo');
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseHasMember = baseStructDef.findElement('Observation.hasMember');
    const constrainedHasMember = sd.findElement('Observation.hasMember');

    expect(baseHasMember.type).toHaveLength(1);
    expect(baseHasMember.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Observation',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );

    expect(constrainedHasMember.type).toHaveLength(1);
    expect(constrainedHasMember.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialObservation1',
        'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialObservation2',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );
  });

  it('should apply correct OnlyRules on circular FSHy choices', () => {
    const profile1 = new Profile('Foo');
    profile1.parent = 'Observation';
    doc.profiles.set(profile1.name, profile1);
    const profile2 = new Profile('Bar');
    profile2.parent = 'Observation';
    doc.profiles.set(profile2.name, profile2);

    const rule1 = new OnlyRule('hasMember[Observation]');
    rule1.types = [{ type: 'Bar', isReference: true }];
    const rule2 = new OnlyRule('hasMember[Observation]');
    rule2.types = [{ type: 'Foo', isReference: true }];
    profile1.rules.push(rule1);
    profile2.rules.push(rule2);

    withDebugLogging(() => exporter.export());
    loggerSpy.getAllMessages().forEach(m => {
      expect(m).not.toMatch(/circular/i);
    });

    const sdFoo = pkg.profiles.find(def => def.id === 'Foo');
    const sdBar = pkg.profiles.find(def => def.id === 'Bar');
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseHasMember = baseStructDef.findElement('Observation.hasMember');
    const constrainedHasMemberFoo = sdFoo.findElement('Observation.hasMember');
    const constrainedHasMemberBar = sdBar.findElement('Observation.hasMember');

    expect(baseHasMember.type).toHaveLength(1);
    expect(baseHasMember.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Observation',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );

    expect(constrainedHasMemberFoo.type).toHaveLength(1);
    expect(constrainedHasMemberFoo.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );

    expect(constrainedHasMemberBar.type).toHaveLength(1);
    expect(constrainedHasMemberBar.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );
  });

  it('should safely apply correct OnlyRule with circular FSHy parent', () => {
    const profile1 = new Profile('Foo');
    profile1.parent = 'Observation';
    doc.profiles.set(profile1.name, profile1);
    const profile2 = new Profile('Bar');
    profile2.parent = 'Foo';
    doc.profiles.set(profile2.name, profile2);

    const rule = new OnlyRule('hasMember[Observation]');
    rule.types = [{ type: 'Bar', isReference: true }];
    profile1.rules.push(rule);

    withDebugLogging(() => exporter.export());
    loggerSpy.getAllMessages().forEach(m => {
      expect(m).not.toMatch(/circular/i);
    });

    const sdFoo = pkg.profiles.find(def => def.id === 'Foo');
    const sdBar = pkg.profiles.find(def => def.id === 'Bar');
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    expect(sdFoo.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Observation');
    expect(sdBar.baseDefinition).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');

    const baseHasMember = baseStructDef.findElement('Observation.hasMember');
    const constrainedHasMemberFoo = sdFoo.findElement('Observation.hasMember');
    const constrainedHasMemberBar = sdBar.findElement('Observation.hasMember');

    expect(baseHasMember.type).toHaveLength(1);
    expect(baseHasMember.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Observation',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );

    expect(constrainedHasMemberFoo.type).toHaveLength(1);
    expect(constrainedHasMemberFoo.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );

    expect(constrainedHasMemberBar.type).toHaveLength(1);
    expect(constrainedHasMemberBar.type[0]).toEqual(
      new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar',
        'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
        'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
      )
    );
  });

  it('should log a debug message when we detect a circular dependency in OnlyRules that might result in incomplete definitions', () => {
    const profile1 = new Profile('FooQuantity');
    profile1.parent = 'Quantity';
    const p1ContainsRule = new ContainsRule('extension');
    p1ContainsRule.items.push({ name: 'quantity-ext', type: 'QuantityExtension' });
    const p1OnlyRule = new OnlyRule('extension[quantity-ext].valueQuantity');
    p1OnlyRule.types = [{ type: 'BarQuantity' }];
    const p1FixedValueRule = new FixedValueRule('extension[quantity-ext].valueQuantity.code');
    p1FixedValueRule.fixedValue = new FshCode('mg');
    profile1.rules = [p1ContainsRule, p1OnlyRule, p1FixedValueRule];
    doc.profiles.set(profile1.name, profile1);

    const profile2 = new Profile('BarQuantity');
    profile2.parent = 'Quantity';
    const p2ContainsRule = new ContainsRule('extension');
    p2ContainsRule.items.push({ name: 'quantity-ext', type: 'QuantityExtension' });
    const p2OnlyRule = new OnlyRule('extension[quantity-ext].valueQuantity');
    p2OnlyRule.types = [{ type: 'FooQuantity' }];
    const p2FixedValueRule = new FixedValueRule('extension[quantity-ext].valueQuantity.code');
    p2FixedValueRule.fixedValue = new FshCode('mg');
    profile2.rules = [p2ContainsRule, p2OnlyRule, p2FixedValueRule];
    doc.profiles.set(profile2.name, profile2);

    const extension = new Extension('QuantityExtension');
    const extOnlyRule = new OnlyRule('value[x]');
    extOnlyRule.types = [{ type: 'Quantity' }];
    extension.rules = [extOnlyRule];
    doc.extensions.set(extension.name, extension);

    withDebugLogging(() => exporter.export());

    expect(loggerSpy.getLastMessage('debug')).toMatch(
      /Warning: Circular .* BarQuantity and FooQuantity/
    );
  });

  it('should log a warning message when we detect a circular dependency that causes an incomplete parent', () => {
    const profile1 = new Profile('FooQuantity')
      .withFile('FooQuantity.fsh')
      .withLocation([6, 7, 11, 33]);
    profile1.parent = 'BarQuantity';
    doc.profiles.set(profile1.name, profile1);

    const profile2 = new Profile('BarQuantity');
    profile2.parent = 'Quantity';
    const p2ContainsRule = new ContainsRule('extension');
    p2ContainsRule.items.push({ name: 'quantity-ext', type: 'QuantityExtension' });
    const p2OnlyRule = new OnlyRule('extension[quantity-ext].valueQuantity');
    p2OnlyRule.types = [{ type: 'FooQuantity' }];
    const p2FixedValueRule = new FixedValueRule('extension[quantity-ext].valueQuantity.code');
    p2FixedValueRule.fixedValue = new FshCode('mg');
    profile2.rules = [p2ContainsRule, p2OnlyRule, p2FixedValueRule];
    doc.profiles.set(profile2.name, profile2);

    const extension = new Extension('QuantityExtension');
    const extOnlyRule = new OnlyRule('value[x]');
    extOnlyRule.types = [{ type: 'Quantity' }];
    extension.rules = [extOnlyRule];
    doc.extensions.set(extension.name, extension);

    exporter.export();

    const lastMessage = loggerSpy.getLastMessage('warn');
    expect(lastMessage).toMatch(/The definition of FooQuantity may be incomplete .* BarQuantity/);
    expect(lastMessage).toMatch(/File: FooQuantity\.fsh.*Line: 6 - 11\D*/s);
  });

  it('should not apply an incorrect OnlyRule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new OnlyRule('value[x]').withFile('Only.fsh').withLocation([10, 12, 10, 22]);
    rule.types = [{ type: 'instant' }];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseValue = baseStructDef.findElement('Observation.value[x]');
    const constrainedValue = sd.findElement('Observation.value[x]');

    expect(baseValue.type).toHaveLength(11);
    expect(constrainedValue.type).toHaveLength(11);
    expect(loggerSpy.getLastMessage()).toMatch(/File: Only\.fsh.*Line: 10\D*/s);
  });

  it('should log an error when a type constraint implicitly removes a choice created in the current StructureDefinition', () => {
    const flagFirst = new Profile('FlagFirst');
    flagFirst.parent = 'Observation';
    const flagRule = new FlagRule('valueCodeableConcept')
      .withFile('FlagFirst.fsh')
      .withLocation([7, 12, 7, 31]);
    flagRule.mustSupport = true;
    const secondFlagRule = new FlagRule('valueString')
      .withFile('FlagFirst.fsh')
      .withLocation([8, 12, 8, 31]);
    secondFlagRule.mustSupport = true;
    const onlyRule = new OnlyRule('value[x]')
      .withFile('FlagFirst.fsh')
      .withLocation([9, 12, 9, 24]);
    onlyRule.types = [{ type: 'Quantity' }, { type: 'string' }];

    flagFirst.rules.push(flagRule); // * valueCodeableConcept MS
    flagFirst.rules.push(secondFlagRule); // * valueString MS
    flagFirst.rules.push(onlyRule); // value[x] only Quantity or String

    exporter.exportStructDef(flagFirst);
    const sd = pkg.profiles[0];
    const constrainedValue = sd.findElement('Observation.value[x]');
    expect(constrainedValue.type).toHaveLength(2);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: FlagFirst\.fsh.*Line: 9\D*/s);
  });

  it('should not log an error when a type constraint implicitly removes a choice that has no rules applied in the current StructureDefinition', () => {
    loggerSpy.reset();
    const parentProfile = new Profile('ParentProfile');
    parentProfile.parent = 'Observation';
    const flagRule = new FlagRule('valueCodeableConcept');
    flagRule.mustSupport = true;
    parentProfile.rules.push(flagRule); // * valueCodeableConcept MS

    const childProfile = new Profile('ChildProfile');
    childProfile.parent = 'ParentProfile';
    const onlyRule = new OnlyRule('value[x]');
    onlyRule.types = [{ type: 'Quantity' }];
    childProfile.rules.push(onlyRule); // * value[x] only Quantity
    exporter.exportStructDef(parentProfile);
    exporter.exportStructDef(childProfile);
    expect(pkg.profiles).toHaveLength(2);
    expect(loggerSpy.getAllLogs()).toHaveLength(0);
  });

  it('should not log an error when a type constraint is applied to a specific slice', () => {
    loggerSpy.reset();
    const profile = new Profile('ConstrainedObservation');
    profile.parent = 'Observation';
    // * component ^slicing.discriminator[0].type = #pattern
    // * component ^slicing.discriminator[0].path = "code"
    // * component ^slicing.rules = #open
    // * component contains FirstSlice and SecondSlice
    // * component[FirstSlice].value[x] only Quantity
    // * component[FirstSlice].valueQuantity 1..1
    // * component[SecondSlice].value[x] only string
    const slicingType = new CaretValueRule('component');
    slicingType.caretPath = 'slicing.discriminator[0].type';
    slicingType.value = new FshCode('pattern');
    const slicingPath = new CaretValueRule('component');
    slicingPath.caretPath = 'slicing.discriminator[0].path';
    slicingPath.value = 'code';
    const slicingRules = new CaretValueRule('component');
    slicingRules.caretPath = 'slicing.rules';
    slicingRules.value = new FshCode('open');
    const componentSlices = new ContainsRule('component');
    componentSlices.items = [{ name: 'FirstSlice' }, { name: 'SecondSlice' }];
    const firstType = new OnlyRule('component[FirstSlice].value[x]');
    firstType.types = [{ type: 'Quantity' }];
    const firstCard = new CardRule('component[FirstSlice].valueQuantity');
    firstCard.min = 1;
    firstCard.max = '1';
    const secondType = new OnlyRule('component[SecondSlice].value[x]');
    secondType.types = [{ type: 'string' }];

    profile.rules.push(
      slicingType,
      slicingPath,
      slicingRules,
      componentSlices,
      firstType,
      firstCard,
      secondType
    );

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    expect(sd).toBeTruthy();
    expect(loggerSpy.getAllLogs()).toHaveLength(0);
  });

  // Fixed Value Rule
  it('should apply a correct FixedValueRule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new FixedValueRule('code');
    const fixedFshCode = new FshCode('foo', 'http://foo.com');
    rule.fixedValue = fixedFshCode;
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCode = baseStructDef.findElement('Observation.code');
    const fixedCode = sd.findElement('Observation.code');

    expect(baseCode.patternCodeableConcept).toBeUndefined();
    expect(fixedCode.patternCodeableConcept).toEqual({
      coding: [{ code: 'foo', system: 'http://foo.com' }]
    });
  });

  it('should apply a Reference FixedValueRule and replace the Reference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const instance = new Instance('Bar');
    instance.id = 'bar-id';
    instance.instanceOf = 'Patient';
    doc.instances.set(instance.name, instance);

    const rule = new FixedValueRule('subject');
    rule.fixedValue = new FshReference('Bar');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const fixedSubject = sd.findElement('Observation.subject');

    expect(fixedSubject.patternReference).toEqual({
      reference: 'Patient/bar-id'
    });
  });

  it('should not apply a Reference FixedValueRule with invalid type and log an error', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const instance = new Instance('Bar');
    instance.id = 'bar-id';
    instance.instanceOf = 'Condition';
    doc.instances.set(instance.name, instance);

    const rule = new FixedValueRule('subject'); // subject cannot be a reference to condition
    rule.fixedValue = new FshReference('Bar');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const fixedSubject = sd.findElement('Observation.subject');

    expect(fixedSubject.patternReference).toEqual(undefined);
    expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /The type "Reference\(Condition\)" does not match any of the allowed types\D*/s
    );
  });

  it('should apply a Code FixedValueRule and replace the local code system name with its url', () => {
    const profile = new Profile('LightObservation');
    profile.parent = 'Observation';
    const rule = new FixedValueRule('valueCodeableConcept');
    rule.fixedValue = new FshCode('bright', 'Visible');
    profile.rules.push(rule);

    const visibleSystem = new FshCodeSystem('Visible');
    doc.codeSystems.set(visibleSystem.name, visibleSystem);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const fixedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
    expect(fixedElement.patternCodeableConcept.coding).toEqual([
      {
        code: 'bright',
        system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
      }
    ]);
  });

  it('should apply a FixedValue rule with a valid Canonical entity defined in FSH', () => {
    const profile = new Profile('MyObservation');
    profile.parent = 'Observation';
    const rule = new FixedValueRule('code.coding.system');
    rule.fixedValue = new FshCanonical('VeryRealCodeSystem');
    profile.rules.push(rule);

    const realCodeSystem = new FshCodeSystem('VeryRealCodeSystem');
    doc.codeSystems.set(realCodeSystem.name, realCodeSystem);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const fixedSystem = sd.findElement('Observation.code.coding.system');
    expect(fixedSystem.patternUri).toEqual(
      'http://hl7.org/fhir/us/minimal/CodeSystem/VeryRealCodeSystem'
    );
    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
  });

  it('should apply a FixedValue rule with Canonical of a FHIR entity', () => {
    const profile = new Profile('MyObservation');
    profile.parent = 'Observation';
    const rule = new FixedValueRule('code.coding.system');
    rule.fixedValue = new FshCanonical('MedicationRequest');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const fixedSystem = sd.findElement('Observation.code.coding.system');
    expect(fixedSystem.patternUri).toEqual(
      'http://hl7.org/fhir/StructureDefinition/MedicationRequest'
    );
    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
  });

  it('should apply a FixedValue rule with Canonical of a FHIR entity with a given version', () => {
    const profile = new Profile('MyObservation');
    profile.parent = 'Observation';
    const rule = new FixedValueRule('code.coding.system');
    rule.fixedValue = new FshCanonical('MedicationRequest');
    rule.fixedValue.version = '3.2.1';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const fixedSystem = sd.findElement('Observation.code.coding.system');
    // Use the specified version instead of the version on MedicationRequest
    expect(fixedSystem.patternUri).toEqual(
      'http://hl7.org/fhir/StructureDefinition/MedicationRequest|3.2.1'
    );
    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
  });

  it('should not apply a FixedValue rule with an invalid Canonical entity and log an error', () => {
    const profile = new Profile('MyObservation');
    profile.parent = 'Observation';
    const rule = new FixedValueRule('code.coding.system');
    rule.fixedValue = new FshCanonical('FakeCodeSystem');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const fixedSystem = sd.findElement('Observation.code.coding.system');
    expect(fixedSystem.patternUri).toEqual(undefined);
    expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Cannot use canonical URL of FakeCodeSystem because it does not exist.\D*/s
    );
  });

  it('should apply an instance FixedValueRule and replace the instance', () => {
    const profile = new Profile('USPatient');
    profile.parent = 'Patient';
    const rule = new FixedValueRule('address');
    rule.fixedValue = 'USPostalAddress';
    rule.isInstance = true;
    profile.rules.push(rule); // * address = USPostalAddress
    doc.profiles.set(profile.name, profile);

    const instance = new Instance('USPostalAddress');
    instance.instanceOf = 'Address';
    instance.usage = 'Inline';
    const fixCountry = new FixedValueRule('country');
    fixCountry.fixedValue = 'US';
    instance.rules.push(fixCountry); // * country = "US"
    doc.instances.set(instance.name, instance);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const fixedAddress = sd.findElement('Patient.address');
    expect(fixedAddress.patternAddress).toEqual({ country: 'US' });
    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
  });

  it('should not apply an instance FixedValueRule when the instance cannot be found', () => {
    const profile = new Profile('USPatient');
    profile.parent = 'Patient';
    const rule = new FixedValueRule('address');
    rule.fixedValue = 'FakeInstance';
    rule.isInstance = true;
    profile.rules.push(rule); // * address = FakeInstance
    doc.profiles.set(profile.name, profile);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const fixedAddress = sd.findElement('Patient.address');
    expect(fixedAddress.patternAddress).toBeUndefined();
    expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Cannot find definition for Instance: FakeInstance. Skipping rule.\D*/s
    );
  });

  it('should use the url specified in a CaretValueRule when referencing a named code system', () => {
    const profile = new Profile('LightObservation');
    profile.parent = 'Observation';
    const rule = new FixedValueRule('valueCodeableConcept');
    rule.fixedValue = new FshCode('bright', 'Visible');
    profile.rules.push(rule);

    const visibleSystem = new FshCodeSystem('Visible');
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'url';
    caretValueRule.value = 'http://special-domain.com/CodeSystem/Visible';
    visibleSystem.rules.push(caretValueRule);
    doc.codeSystems.set(visibleSystem.name, visibleSystem);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const fixedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
    expect(fixedElement.patternCodeableConcept.coding).toEqual([
      {
        code: 'bright',
        system: 'http://special-domain.com/CodeSystem/Visible'
      }
    ]);
  });

  it('should apply a fixedValueRule on the child of a choice element with constrained choices that share a type', () => {
    // Quantity is the first ancestor of Duration and Age

    // * value[x] only Duration or Age
    // * value[x].comparator = #>=

    const extension = new Extension('QuantifiedExtension');

    const onlyRule = new OnlyRule('value[x]');
    onlyRule.types = [{ type: 'Duration' }, { type: 'Age' }];
    extension.rules.push(onlyRule);

    const fixedValueRule = new FixedValueRule('value[x].comparator');
    fixedValueRule.fixedValue = new FshCode('>=');
    extension.rules.push(fixedValueRule);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const fixedElement = sd.findElement('Extension.value[x].comparator');
    expect(fixedElement.patternCode).toBe('>=');
  });

  it('should apply a fixedValueRule on the child of a choice element with constrained choices that share a profile', () => {
    // Profile: CustomizedTiming
    // Parent: Timing
    // * extension contains customField 0..1
    const customizedTiming = new Profile('CustomizedTiming');
    customizedTiming.parent = 'Timing';
    const containsRule = new ContainsRule('extension');
    containsRule.items = [{ name: 'customField' }];
    const cardRule = new CardRule('extension[customField]');
    cardRule.min = 0;
    cardRule.max = '1';
    customizedTiming.rules.push(containsRule, cardRule);
    doc.profiles.set(customizedTiming.name, customizedTiming);

    // Profile: VerifiedTiming
    // Parent: CustomizedTiming
    const verifiedTiming = new Profile('VerifiedTiming');
    verifiedTiming.parent = customizedTiming.name;
    doc.profiles.set(verifiedTiming.name, verifiedTiming);

    // Profile: ConsensusTiming
    // Parent: CustomizedTiming
    const consensusTiming = new Profile('ConsensusTiming');
    consensusTiming.parent = customizedTiming.name;
    doc.profiles.set(consensusTiming.name, consensusTiming);

    // Profile: SpecialTimingObservation
    // Parent: Observation
    // * effective[x] only VerifiedTiming or ConsensusTiming
    // * effective[x].extension[customField].id = my-special-id
    const specialTimingObservation = new Profile('SpecialTimingObservation');
    specialTimingObservation.parent = 'Observation';
    const onlyRule = new OnlyRule('effective[x]');
    onlyRule.types = [{ type: 'VerifiedTiming' }, { type: 'ConsensusTiming' }];
    const fixedValueRule = new FixedValueRule('effective[x].extension[customField].id');
    fixedValueRule.fixedValue = 'my-special-id';
    specialTimingObservation.rules.push(onlyRule, fixedValueRule);
    doc.profiles.set(specialTimingObservation.name, specialTimingObservation);

    exporter.exportStructDef(specialTimingObservation);
    const specialTimingObservationSd = pkg.profiles.find(
      resource => resource.id === 'SpecialTimingObservation'
    );
    expect(specialTimingObservationSd).toBeDefined();
    const fixedId = specialTimingObservationSd.findElement(
      'Observation.effective[x].extension:customField.id'
    );
    expect(fixedId.patternString).toBe('my-special-id');
  });

  it('should not apply an incorrect FixedValueRule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new FixedValueRule('code').withFile('Fixed.fsh').withLocation([4, 18, 4, 28]);
    rule.fixedValue = true; // Incorrect boolean
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseCode = baseStructDef.findElement('Observation.code');
    const fixedCode = sd.findElement('Observation.code');

    expect(baseCode.patternCodeableConcept).toBeUndefined();
    expect(fixedCode.patternCodeableConcept).toBeUndefined(); // Code remains unset
    expect(loggerSpy.getLastMessage()).toMatch(/File: Fixed\.fsh.*Line: 4\D*/s);
  });

  // Contains Rule
  it('should apply a ContainsRule on an element with defined slicing', () => {
    const profile = new Profile('Foo');
    profile.parent = 'resprate';

    const rule = new ContainsRule('code.coding');
    rule.items = [{ name: 'barSlice' }];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('resprate');

    const barSlice = sd.elements.find(e => e.id === 'Observation.code.coding:barSlice');

    expect(sd.elements.length).toBe(baseStructDef.elements.length + 1);
    expect(barSlice).toBeDefined();
    const diff = barSlice.calculateDiff();
    expect(diff.min).toBe(0);
    expect(diff.max).toBe('*');
  });

  it('should apply a ContainsRule on a slice with defined slicing', () => {
    // Profile: Foo
    // Parent: resprate
    // * code.coding contains fooSlice
    // * code.coding[fooSlice] ^slicing.discriminator.type = #pattern
    // * code.coding[fooSlice] contains barReslice
    const profile = new Profile('Foo');
    profile.parent = 'resprate';

    const sliceRule = new ContainsRule('code.coding');
    sliceRule.items = [{ name: 'fooSlice' }];
    const caretRule = new CaretValueRule('code.coding[fooSlice]');
    caretRule.caretPath = 'slicing.discriminator.type';
    caretRule.value = new FshCode('pattern');
    const resliceRule = new ContainsRule('code.coding[fooSlice]');
    resliceRule.items = [{ name: 'barReslice' }];
    profile.rules.push(sliceRule, caretRule, resliceRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('resprate');

    const barReslice = sd.elements.find(
      e => e.id === 'Observation.code.coding:fooSlice/barReslice'
    );

    expect(sd.elements.length).toBe(baseStructDef.elements.length + 2);
    expect(barReslice).toBeDefined();
    const diff = barReslice.calculateDiff();
    expect(diff.min).toBe(0);
    expect(diff.max).toBe('*');
  });

  it('should apply a ContainsRule on an extension with defined slicing', () => {
    // Profile: Foo
    // Parent: resprate
    // * extension contains bar
    // * extension[bar] ^slicing.discriminator.type = #pattern
    // * extension[bar] contains barReslice
    const profile = new Profile('Foo');
    profile.parent = 'resprate';

    const sliceRule = new ContainsRule('extension');
    sliceRule.items = [{ name: 'bar' }];
    const caretRule = new CaretValueRule('extension[bar]');
    caretRule.caretPath = 'slicing.discriminator.type';
    caretRule.value = new FshCode('pattern');
    const resliceRule = new ContainsRule('extension[bar]');
    resliceRule.items = [{ name: 'barReslice' }];
    profile.rules.push(sliceRule, caretRule, resliceRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('resprate');

    const barReslice = sd.elements.find(e => e.id === 'Observation.extension:bar/barReslice');

    expect(sd.elements.length).toBe(baseStructDef.elements.length + 6);
    expect(barReslice).toBeDefined();
    const diff = barReslice.calculateDiff();
    expect(diff.min).toBe(0);
    expect(diff.max).toBe('*');
    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
  });

  it('should apply a ContainsRule of a defined extension on an extension element', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new ContainsRule('extension');
    rule.items = [{ name: 'vs', type: 'valueset-expression' }];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const valuesetExpression = sd.elements.find(e => e.id === 'Observation.extension:vs');

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(valuesetExpression).toBeDefined();
    expect(valuesetExpression.type[0]).toEqual(
      new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/valueset-expression'
      )
    );
  });

  it('should apply a ContainsRule of a defined extension on a modifierExtension element', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new ContainsRule('modifierExtension');
    rule.items = [{ name: 'vs', type: 'valueset-expression' }];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extension = sd.elements.find(e => e.id === 'Observation.modifierExtension');
    const valuesetExpression = sd.elements.find(e => e.id === 'Observation.modifierExtension:vs');

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(valuesetExpression).toBeDefined();
    expect(valuesetExpression.type[0]).toEqual(
      new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/valueset-expression'
      )
    );
  });

  it('should apply a ContainsRule of an aliased extension on an extension element', () => {
    const profile = new Profile('Foo');
    const extBar = new Extension('Bar');
    const extBaz = new Extension('Baz');
    extBaz.id = 'BazId';
    profile.parent = 'Observation';

    doc.aliases.set('barAlias', 'Bar');
    doc.aliases.set('bazAlias', 'BazId');
    doc.extensions.set('Bar', extBar);
    doc.extensions.set('Baz', extBaz);

    const ruleBar = new ContainsRule('extension');
    ruleBar.items = [{ name: 'bar', type: 'barAlias' }];
    profile.rules.push(ruleBar);
    const ruleBaz = new ContainsRule('extension');
    ruleBaz.items = [{ name: 'baz', type: 'bazAlias' }];
    profile.rules.push(ruleBaz);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const bar = sd.elements.find(e => e.id === 'Observation.extension:bar');
    const baz = sd.elements.find(e => e.id === 'Observation.extension:baz');

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(bar).toBeDefined();
    expect(bar.type[0]).toEqual(
      new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar'
      )
    );
    expect(baz).toBeDefined();
    expect(baz.type[0]).toEqual(
      new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/BazId'
      )
    );
  });

  it('should apply a ContainsRule of an existing aliased extension on an extension element', () => {
    const profile = new Profile('Foo');
    const ext = new Extension('VSExpression');
    profile.parent = 'Observation';

    doc.aliases.set('VSAlias', 'http://hl7.org/fhir/StructureDefinition/valueset-expression');
    doc.extensions.set('VSExpression', ext);

    const ruleBar = new ContainsRule('extension');
    ruleBar.items = [{ name: 'vs', type: 'VSAlias' }];
    profile.rules.push(ruleBar);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const VSExpression = sd.elements.find(e => e.id === 'Observation.extension:vs');

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(VSExpression).toBeDefined();
    expect(VSExpression.type[0]).toEqual(
      new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/valueset-expression'
      )
    );
  });

  it('should apply a ContainsRule of an inline extension to an extension element', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension');
    containsRule.items = [{ name: 'my-inline-extension' }];
    profile.rules.push(containsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const extensionSlice = sd.elements.find(
      e => e.id === 'Observation.extension:my-inline-extension'
    );
    const extensionSliceUrl = sd.elements.find(
      e => e.id === 'Observation.extension:my-inline-extension.url'
    );

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSliceUrl).toBeDefined();
    expect(extensionSliceUrl.fixedUri).toBe('my-inline-extension');
  });

  it('should apply a ContainsRule of an inline extension with a name that resolves to a non-extension type', () => {
    // This tests the use case in https://github.com/FHIR/sushi/issues/83, which we originally thought
    // was an issue w/ reserved words, but was actually an issue because "code" resolves to the StructureDefinition
    // for the code type.  This test initially failed and was fixed by changing the code that handles extension
    // slices to only look for Extension resolutions (as opposed to all types).
    // NOTE: This test is mainly irrelevant now that we switched to a syntax that distinguishes slice name from type.
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension');
    containsRule.items = [{ name: 'code' }];
    profile.rules.push(containsRule);

    const onlyRule = new OnlyRule('extension[code].value[x]');
    onlyRule.types = [{ type: 'Quantity' }];
    profile.rules.push(onlyRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:code');
    const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:code.url');
    const extensionSliceValueX = sd.elements.find(
      e => e.id === 'Observation.extension:code.value[x]'
    );

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSliceUrl).toBeDefined();
    expect(extensionSliceUrl.fixedUri).toBe('code');
    expect(extensionSliceValueX).toBeDefined();
    expect(extensionSliceValueX.type).toEqual([new ElementDefinitionType('Quantity')]);
  });

  it('should apply a ContainsRule of an extension with an overridden URL', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    doc.profiles.set('Foo', profile);

    const extBar = new Extension('Bar');
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'url';
    caretValueRule.value = 'http://different-url.com/StructureDefinition/Bar';
    extBar.rules.push(caretValueRule);
    doc.extensions.set('Bar', extBar);

    const constainsRule = new ContainsRule('extension');
    constainsRule.items = [{ name: 'bar', type: 'Bar' }];
    profile.rules.push(constainsRule);

    const onlyRule = new OnlyRule('extension[bar].value[x]');
    onlyRule.types = [{ type: 'Quantity' }];
    profile.rules.push(onlyRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:bar');
    const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:bar.url');
    const extensionSliceValueX = sd.elements.find(
      e => e.id === 'Observation.extension:bar.value[x]'
    );

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSliceUrl).toBeDefined();
    expect(extensionSliceUrl.fixedUri).toBe('http://different-url.com/StructureDefinition/Bar');
    expect(extensionSliceValueX).toBeDefined();
    expect(extensionSliceValueX.type).toEqual([new ElementDefinitionType('Quantity')]);
  });

  it('should apply a ContainsRule of an extension with an overridden URL by URL', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    doc.profiles.set('Foo', profile);

    const extBar = new Extension('Bar');
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'url';
    caretValueRule.value = 'http://different-url.com/StructureDefinition/Bar';
    extBar.rules.push(caretValueRule);
    doc.extensions.set('Bar', extBar);

    const constainsRule = new ContainsRule('extension');
    constainsRule.items = [{ name: 'bar', type: 'Bar' }];
    profile.rules.push(constainsRule);

    const onlyRule = new OnlyRule(
      'extension[http://different-url.com/StructureDefinition/Bar].value[x]'
    );
    onlyRule.types = [{ type: 'Quantity' }];
    profile.rules.push(onlyRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:bar');
    const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:bar.url');
    const extensionSliceValueX = sd.elements.find(
      e => e.id === 'Observation.extension:bar.value[x]'
    );

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSliceUrl).toBeDefined();
    expect(extensionSliceUrl.fixedUri).toBe('http://different-url.com/StructureDefinition/Bar');
    expect(extensionSliceValueX).toBeDefined();
    expect(extensionSliceValueX.type).toEqual([new ElementDefinitionType('Quantity')]);
  });

  it('should apply multiple ContainsRule on an element with defined slicing', () => {
    const profile = new Profile('Foo');
    profile.parent = 'resprate';

    const rule1 = new ContainsRule('code.coding');
    const rule2 = new ContainsRule('code.coding');
    rule1.items = [{ name: 'barSlice' }];
    rule2.items = [{ name: 'fooSlice' }];
    profile.rules.push(rule1);
    profile.rules.push(rule2);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('resprate');

    const barSlice = sd.elements.find(e => e.id === 'Observation.code.coding:barSlice');
    const fooSlice = sd.elements.find(e => e.id === 'Observation.code.coding:fooSlice');

    expect(sd.elements.length).toBe(baseStructDef.elements.length + 2);
    expect(barSlice).toBeDefined();
    expect(fooSlice).toBeDefined();
  });

  it('should apply a containsRule on the child of a choice element with a common ancestor of Element', () => {
    // Element contains extension and id
    // * value[x].extension contains my-inline-extension 0..1

    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('value[x].extension');
    containsRule.items = [{ name: 'my-inline-extension' }];
    profile.rules.push(containsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const extension = sd.elements.find(e => e.id === 'Observation.value[x].extension');
    const extensionSlice = sd.elements.find(
      e => e.id === 'Observation.value[x].extension:my-inline-extension'
    );
    const extensionSliceUrl = sd.elements.find(
      e => e.id === 'Observation.value[x].extension:my-inline-extension.url'
    );

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSliceUrl).toBeDefined();
    expect(extensionSliceUrl.fixedUri).toBe('my-inline-extension');
  });
  it('should report an error and not add the slice when a ContainsRule tries to add a slice that already exists', () => {
    // Profile: DoubleSlice
    // Parent: resprate
    // * code.coding contains onlySlice
    // * code.coding contains onlySlice

    const profile = new Profile('DoubleSlice');
    profile.parent = 'resprate';

    const rule1 = new ContainsRule('code.coding');
    rule1.items = [{ name: 'onlySlice' }];
    const rule2 = new ContainsRule('code.coding');
    rule2.items = [{ name: 'onlySlice' }];
    profile.rules.push(rule1, rule2);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('resprate');
    const onlySlice = sd.elements.find(e => e.id === 'Observation.code.coding:onlySlice');

    expect(sd.elements.length).toBe(baseStructDef.elements.length + 1);
    expect(onlySlice).toBeDefined();
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Slice named onlySlice already exists on element Observation\.code\.coding of DoubleSlice/s
    );
  });

  it('should report an error and not add the slice when a ContainsRule tries to add a slice that was created on the parent', () => {
    // Profile: FirstProfile
    // Parent: resprate
    // * code.coding contains onlySlice

    // Profile: SecondProfile
    // Parent: FirstProfile
    // * code.coding contains onlySlice

    const firstProfile = new Profile('FirstProfile');
    firstProfile.parent = 'resprate';
    const firstRule = new ContainsRule('code.coding');
    firstRule.items = [{ name: 'onlySlice' }];
    firstProfile.rules.push(firstRule);
    doc.profiles.set(firstProfile.name, firstProfile);

    const secondProfile = new Profile('SecondProfile');
    secondProfile.parent = 'FirstProfile';
    const secondRule = new ContainsRule('code.coding');
    secondRule.items = [{ name: 'onlySlice' }];
    secondProfile.rules.push(secondRule);
    doc.profiles.set(secondProfile.name, secondProfile);

    exporter.exportStructDef(firstProfile);
    exporter.exportStructDef(secondProfile);
    const [firstSd, secondSd] = pkg.profiles;
    const firstSlice = firstSd.elements.find(e => e.id === 'Observation.code.coding:onlySlice');
    const secondSlice = secondSd.elements.find(e => e.id === 'Observation.code.coding:onlySlice');

    expect(firstSlice).toBeDefined();
    expect(secondSlice).toBeDefined();
    expect(firstSd.elements.length).toEqual(secondSd.elements.length);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Slice named onlySlice already exists on element Observation\.code\.coding of SecondProfile/s
    );
  });

  it('should not apply a ContainsRule on an element without defined slicing', () => {
    const profile = new Profile('Foo');
    profile.parent = 'resprate';

    const rule = new ContainsRule('identifier').withFile('NoSlice.fsh').withLocation([6, 3, 6, 12]);
    rule.items = [{ name: 'barSlice' }];
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('resprate');

    const barSlice = sd.elements.find(e => e.id === 'Observation.identifier:barSlice');

    expect(sd.elements.length).toBe(baseStructDef.elements.length);
    expect(barSlice).toBeUndefined();
    expect(loggerSpy.getLastMessage()).toMatch(/File: NoSlice\.fsh.*Line: 6\D*/s);
  });

  // Since previous versions of SUSHI used the slicename as a type lookup as well, we used to issue a warning when we
  // found a rule that may have been intended to work that way (essentially, a user who has not updated their fsh).
  // Time has passed since then and we no longer issue that warning.  This test proves that.
  it('should NOT report a warning if the extension slice name resolves to an external extension type and no explicit type was specified', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension')
      .withFile('ExternalSliceName.fsh')
      .withLocation([6, 3, 6, 12]);
    // maxSize is the id of a core FHIR extension
    containsRule.items = [{ name: 'maxSize' }];
    const cardRule = new CardRule('extension[maxSize]');
    cardRule.min = 0;
    cardRule.max = '1';
    profile.rules.push(containsRule, cardRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:maxSize');
    const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:maxSize.url');

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSliceUrl).toBeDefined();
    expect(extensionSliceUrl.fixedUri).toBe('maxSize');

    // In previous versions of this test, a warning was expected here
    expect(loggerSpy.getAllLogs('warn').length).toBe(0);
  });

  it('should NOT report a warning if the extension slice name resolves to a FSH extension and no explicit type was specified', () => {
    const extension = new Extension('MyFshExtension');
    const extCardRule = new CardRule('extension');
    extCardRule.min = 0;
    extCardRule.max = '0';
    extension.rules.push(extCardRule);
    doc.extensions.set(extension.name, extension);

    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension')
      .withFile('FSHSliceName.fsh')
      .withLocation([6, 3, 6, 12]);
    containsRule.items = [{ name: 'MyFshExtension' }];
    const cardRule = new CardRule('extension[MyFshExtension]');
    cardRule.min = 0;
    cardRule.max = '1';
    profile.rules.push(containsRule, cardRule);

    exporter.exportStructDef(extension);
    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extensionEl = sd.elements.find(e => e.id === 'Observation.extension');
    const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:MyFshExtension');
    const extensionSliceUrl = sd.elements.find(
      e => e.id === 'Observation.extension:MyFshExtension.url'
    );

    expect(extensionEl.slicing).toBeDefined();
    expect(extensionEl.slicing.discriminator.length).toBe(1);
    expect(extensionEl.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSliceUrl).toBeDefined();
    expect(extensionSliceUrl.fixedUri).toBe('MyFshExtension');

    // In previous versions of this test, a warning was expected here
    expect(loggerSpy.getAllLogs('warn').length).toBe(0);
  });

  it('should not report a warning if the extension slice name resolves to an extension type but explicit type was specified', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension');
    // maxSize is the id of a core FHIR extension
    containsRule.items = [{ name: 'maxSize', type: 'maxSize' }];
    const cardRule = new CardRule('extension[maxSize]');
    cardRule.min = 0;
    cardRule.max = '1';
    profile.rules.push(containsRule, cardRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:maxSize');
    const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:maxSize.url');

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSlice.type).toEqual([
      new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/maxSize'
      )
    ]);
    expect(extensionSliceUrl).toBeUndefined();

    expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
  });

  it('should not report a warning if the extension slice name does not resolve to an extension type', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension');
    // maxSize is the id of a core FHIR extension
    containsRule.items = [{ name: 'foo' }];
    const cardRule = new CardRule('extension[foo]');
    cardRule.min = 0;
    cardRule.max = '1';
    profile.rules.push(containsRule, cardRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extension = sd.elements.find(e => e.id === 'Observation.extension');
    const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:foo');
    const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:foo.url');

    expect(extension.slicing).toBeDefined();
    expect(extension.slicing.discriminator.length).toBe(1);
    expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
    expect(extensionSlice).toBeDefined();
    expect(extensionSliceUrl).toBeDefined();
    expect(extensionSliceUrl.fixedUri).toBe('foo');

    expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
  });

  it('should report an error if the author specifies a slice type on a non-extension', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const slicingType = new CaretValueRule('component');
    slicingType.caretPath = 'slicing.discriminator[0].type';
    slicingType.value = new FshCode('pattern');
    const slicingPath = new CaretValueRule('component');
    slicingPath.caretPath = 'slicing.discriminator[0].path';
    slicingPath.value = 'code';
    const slicingRules = new CaretValueRule('component');
    slicingRules.caretPath = 'slicing.rules';
    slicingRules.value = new FshCode('open');
    const containsRule = new ContainsRule('component')
      .withFile('BadSlice.fsh')
      .withLocation([6, 3, 6, 12]);
    containsRule.items = [{ name: 'offset', type: 'observation-timeOffset' }];
    profile.rules.push(slicingType, slicingPath, slicingRules, containsRule);

    exporter.exportStructDef(profile);

    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Cannot specify type on offset slice since component is not an extension path\..*File: BadSlice\.fsh.*Line: 6\D*/s
    );

    // But it should still go ahead and create the slice
    const sd = pkg.profiles[0];
    const offsetSlice = sd.elements.find(e => e.id === 'Observation.component:offset');
    expect(offsetSlice.sliceName).toEqual('offset');
  });

  it('should report an error for an extension ContainsRule with a type that resolves to a non-extension', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension')
      .withFile('BadExt.fsh')
      .withLocation([6, 3, 6, 12]);
    containsRule.items = [{ name: 'condition', type: 'Condition' }];
    profile.rules.push(containsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');
    expect(sd.elements.length).toBe(baseStructDef.elements.length);

    const conditionSlice = sd.elements.find(e => e.id === 'Observation.extension:condition');
    expect(conditionSlice).toBeUndefined();
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Cannot create condition extension; unable to locate extension definition for: Condition\..*File: BadExt\.fsh.*Line: 6\D*/s
    );
  });

  it('should report an error for an extension ContainsRule with a type that does not resolve', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension')
      .withFile('BadExt.fsh')
      .withLocation([6, 3, 6, 12]);
    containsRule.items = [{ name: 'spoon', type: 'IDoNotExist' }];
    profile.rules.push(containsRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');
    expect(sd.elements.length).toBe(baseStructDef.elements.length);

    const spoonSlice = sd.elements.find(e => e.id === 'Observation.extension:spoon');
    expect(spoonSlice).toBeUndefined();
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Cannot create spoon extension; unable to locate extension definition for: IDoNotExist\..*File: BadExt\.fsh.*Line: 6\D*/s
    );
  });

  // CaretValueRule
  it('should apply a CaretValueRule on an element with a path', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CaretValueRule('status');
    rule.caretPath = 'short';
    rule.value = 'foo';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const status = sd.findElement('Observation.status');
    expect(status.short).toBe('foo');
  });

  it('should not apply an invalid CaretValueRule on an element with a path', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CaretValueRule('status')
      .withFile('InvalidValue.fsh')
      .withLocation([6, 3, 6, 12]);
    rule.caretPath = 'short';
    rule.value = true;
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const status = sd.findElement('Observation.status');
    const baseStatus = baseStructDef.findElement('Observation.status');

    expect(status.short).toBe(baseStatus.short);
    expect(loggerSpy.getLastMessage()).toMatch(/File: InvalidValue\.fsh.*Line: 6\D*/s);
  });

  it('should apply a CaretValueRule on the parent element', () => {
    // Profile: ShortObservation
    // Parent: Observation
    // * . ^ short = "This one is not so tall."
    const profile = new Profile('ShortObservation');
    profile.parent = 'Observation';

    const rule = new CaretValueRule('.');
    rule.caretPath = 'short';
    rule.value = 'This one is not so tall.';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const observation = sd.findElement('Observation');
    expect(observation.short).toBe('This one is not so tall.');
  });

  it('should apply a CaretValueRule on an element without a path', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CaretValueRule('');
    rule.caretPath = 'description';
    rule.value = 'foo';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    expect(sd.description).toBe('foo');
  });

  it('should apply a CaretValueRule on the child of a primitive element without a path', () => {
    const profile = new Profile('SpecialUrlId');
    profile.parent = 'Observation';

    const rule = new CaretValueRule('');
    rule.caretPath = 'url.id';
    rule.value = 'my-id';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    expect(sd).toHaveProperty('_url', { id: 'my-id' });
  });

  it('should not apply an invalid CaretValueRule on an element without a path', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CaretValueRule('').withFile('InvalidValue.fsh').withLocation([6, 3, 6, 12]);
    rule.caretPath = 'description';
    rule.value = true;
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    expect(sd.description).toBeUndefined();
    expect(loggerSpy.getLastMessage()).toMatch(/File: InvalidValue\.fsh.*Line: 6\D*/s);
  });

  it('should apply a CaretValueRule on an extension element without a path', () => {
    // Extension: SpecialExtension
    const extension = new Extension('SpecialExtension');
    doc.extensions.set(extension.name, extension);
    // Profile: HasSpecialExtension
    // Parent: Observation
    // * ^extension[SpecialExtension].valueString = "This is the special extension on the structure definition."
    const profile = new Profile('HasSpecialExtension');
    profile.parent = 'Observation';
    const caretValueRule = new CaretValueRule('');
    caretValueRule.caretPath = 'extension[SpecialExtension].valueString';
    caretValueRule.value = 'This is the special extension on the structure definition.';
    profile.rules.push(caretValueRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const extensionElement = sd.extension.find(
      e => e.url === 'http://hl7.org/fhir/us/minimal/StructureDefinition/SpecialExtension'
    );
    expect(extensionElement).toBeDefined();
    expect(extensionElement).toEqual({
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/SpecialExtension',
      valueString: 'This is the special extension on the structure definition.'
    });
  });

  it('should apply a Reference CaretValueRule on an SD and replace the Reference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const instance = new Instance('Bar');
    instance.id = 'bar-id';
    instance.instanceOf = 'Organization';
    doc.instances.set(instance.name, instance);

    const rule = new CaretValueRule('');
    rule.caretPath = 'identifier[0].assigner';
    rule.value = new FshReference('Bar');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    expect(sd.identifier[0].assigner).toEqual({
      reference: 'Organization/bar-id'
    });
  });

  it('should apply a Reference CaretValueRule on an ED and replace the Reference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const instance = new Instance('Bar');
    instance.id = 'bar-id';
    instance.instanceOf = 'Organization';
    doc.instances.set(instance.name, instance);

    const rule = new CaretValueRule('subject');
    rule.caretPath = 'patternReference';
    rule.value = new FshReference('Bar');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const ed = sd.elements.find(e => e.id === 'Observation.subject');

    expect(ed.patternReference).toEqual({
      reference: 'Organization/bar-id'
    });
  });

  it('should apply a CodeSystem CaretValueRule on an SD and replace the CodeSystem', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const cs = new FshCodeSystem('Bar');
    cs.id = 'bar-id';
    doc.codeSystems.set(cs.name, cs);

    const rule = new CaretValueRule('');
    rule.caretPath = 'jurisdiction';
    rule.value = new FshCode('foo', 'Bar');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    expect(sd.jurisdiction[0].coding[0]).toEqual({
      code: 'foo',
      system: 'http://hl7.org/fhir/us/minimal/CodeSystem/bar-id'
    });
  });

  it('should apply a CodeSystem CaretValueRule on an ED and replace the Reference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const cs = new FshCodeSystem('Bar');
    cs.id = 'bar-id';
    doc.codeSystems.set(cs.name, cs);

    const rule = new CaretValueRule('subject');
    rule.caretPath = 'code';
    rule.value = new FshCode('foo', 'Bar');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const ed = sd.elements.find(e => e.id === 'Observation.subject');

    expect(ed.code[0]).toEqual({
      code: 'foo',
      system: 'http://hl7.org/fhir/us/minimal/CodeSystem/bar-id'
    });
  });

  // ObeysRule
  it('should apply an ObeysRule at the specified path', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    doc.profiles.set(profile.name, profile);

    const invariant = new Invariant('MyInvariant');
    invariant.description = 'My important invariant';
    invariant.severity = new FshCode('error');
    doc.invariants.set(invariant.name, invariant);

    const rule = new ObeysRule('value[x]');
    rule.invariant = 'MyInvariant';
    profile.rules.push(rule); // * value[x] obeys MyInvariant

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseValueX = baseStructDef.findElement('Observation.value[x]');
    const changedValueX = sd.findElement('Observation.value[x]');

    expect(baseValueX.constraint).toHaveLength(1);
    expect(changedValueX.constraint).toHaveLength(2);
    expect(changedValueX.constraint[1].key).toEqual(invariant.name);
  });

  it('should apply an ObeysRule at the path which does not have a constraint', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    doc.profiles.set(profile.name, profile);

    const invariant = new Invariant('MyInvariant');
    invariant.description = 'My important invariant';
    invariant.severity = new FshCode('error');
    doc.invariants.set(invariant.name, invariant);

    const rule = new ObeysRule('id');
    rule.invariant = 'MyInvariant';
    profile.rules.push(rule); // * id obeys MyInvariant

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const basedId = baseStructDef.findElement('Observation.id');
    const changedId = sd.findElement('Observation.id');

    expect(basedId.constraint).toBeUndefined();
    expect(changedId.constraint).toHaveLength(1);
    expect(changedId.constraint[0].key).toEqual(invariant.name);
  });

  it('should apply an ObeysRule to the base element when not path specified', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    doc.profiles.set(profile.name, profile);

    const invariant = new Invariant('MyInvariant');
    invariant.description = 'My important invariant';
    invariant.severity = new FshCode('error');
    doc.invariants.set(invariant.name, invariant);

    const rule = new ObeysRule('');
    rule.invariant = 'MyInvariant';
    profile.rules.push(rule); // * obeys MyInvariant

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseElement = baseStructDef.findElement('Observation');
    const changedElement = sd.findElement('Observation');

    expect(baseElement.constraint).toHaveLength(7);
    expect(changedElement.constraint).toHaveLength(8);
    expect(changedElement.constraint[7].key).toEqual(invariant.name);
  });

  it('should not apply an ObeysRule on an invariant that does not exist', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';
    doc.profiles.set(profile.name, profile);

    const invariant = new Invariant('MyRealInvariant');
    invariant.description = 'A very real invariant';
    invariant.severity = new FshCode('error');
    doc.invariants.set(invariant.name, invariant);

    const rule = new ObeysRule('value[x]').withFile('FooProfile.fsh').withLocation([4, 7, 4, 15]);
    rule.invariant = 'MyFakeInvariant';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const baseStructDef = fisher.fishForStructureDefinition('Observation');

    const baseValueX = baseStructDef.findElement('Observation.value[x]');
    const changedValueX = sd.findElement('Observation.value[x]');

    expect(baseValueX.constraint).toHaveLength(1);
    expect(changedValueX.constraint).toHaveLength(1);
    expect(loggerSpy.getLastMessage()).toMatch(
      /Cannot apply MyFakeInvariant constraint on Foo because it was never defined./s
    );
    expect(loggerSpy.getLastMessage()).toMatch(/File: FooProfile\.fsh.*Line: 4\D*/s);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
  });

  it('should log an error when applying an ObeysRule on an invariant with an invalid id', () => {
    // Profile: StrangeObservation
    // Parent: Observation
    // * category obeys strange_1
    // Invariant: strange_1
    // Severity: #error
    // Description: "This is a strange one."

    const profile = new Profile('StrangeObservation');
    profile.parent = 'Observation';
    doc.profiles.set(profile.name, profile);

    const invariant = new Invariant('strange_1');
    invariant.severity = new FshCode('error');
    invariant.description = 'This is a strange one.';
    doc.invariants.set(invariant.name, invariant);

    const rule = new ObeysRule('category').withFile('StrangeOne.fsh').withLocation([3, 8, 3, 24]);
    rule.invariant = 'strange_1';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const category = sd.findElement('Observation.category');
    expect(category.constraint).toHaveLength(2);
    expect(category.constraint[1].key).toBe(invariant.name);
    expect(loggerSpy.getLastMessage('error')).toMatch(/does not represent a valid FHIR id/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: StrangeOne\.fsh.*Line: 3\D*/s);
  });

  // Extension preprocessing
  it('should zero out Extension.value[x] when Extension.extension is used', () => {
    const extension = new Extension('MyInferredComplexExtension');
    extension.id = 'complex-extension';

    const cardRuleForExtension = new CardRule('extension');
    cardRuleForExtension.min = 1;
    cardRuleForExtension.max = '*';
    extension.rules.push(cardRuleForExtension);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('0');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should not zero out Extension.value[x] if Extension.extension is zeroed out', () => {
    const extension = new Extension('MyExplicitSimpleExtension');
    extension.id = 'simple-extension';

    const cardRuleForExtension = new CardRule('extension');
    cardRuleForExtension.min = 0;
    cardRuleForExtension.max = '0';
    extension.rules.push(cardRuleForExtension);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('1');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should log an error if Extension.extension and Extension.value[x] are both used but apply both rules', () => {
    const extension = new Extension('MyInvalidExtension');
    extension.id = 'my-invalid-extension';

    const onlyRuleForValueX = new OnlyRule('value[x]');
    onlyRuleForValueX.types = [{ type: 'string' }];
    extension.rules.push(onlyRuleForValueX);
    const containsRuleForExtension = new ContainsRule('extension')
      .withFile('InvalidExtension.fsh')
      .withLocation([4, 7, 4, 15]);
    containsRuleForExtension.items = [{ name: 'MySlice' }];
    extension.rules.push(containsRuleForExtension);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');
    const extensionElement = sd.findElement('Extension.extension:MySlice');

    // Both rules are applied but an error is logged
    expect(valueElement.type).toEqual([new ElementDefinitionType('string')]);
    expect(extensionElement).toBeDefined();
    expect(extensionElement.sliceName).toEqual('MySlice');
    expect(loggerSpy.getLastMessage()).toMatch(
      /Extension on MyInvalidExtension cannot have both a value and sub-extensions/s
    );
    expect(loggerSpy.getLastMessage()).toMatch(/File: InvalidExtension\.fsh.*Line: 4\D*/s);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
  });

  it('should zero out Extension.extension when Extension.value[x] is used', () => {
    const extension = new Extension('MyInferredSimpleExtension');
    extension.id = 'simple-extension';

    const onlyRuleForValue = new OnlyRule('value[x]');
    onlyRuleForValue.types = [{ type: 'string' }];
    extension.rules.push(onlyRuleForValue);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const extensionElement = sd.findElement('Extension.extension');

    expect(extensionElement.min).toEqual(0);
    expect(extensionElement.max).toEqual('0');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should not zero out Extension.extension if Extension.value[x] is zeroed out', () => {
    const extension = new Extension('MyExplicitComplexExtension');
    extension.id = 'complex-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'MySlice' }];
    extension.rules.push(containsRuleForExtension);

    const cardRuleForValue = new CardRule('value[x]');
    cardRuleForValue.min = 0;
    cardRuleForValue.max = '0';
    extension.rules.push(cardRuleForValue);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const extensionElement = sd.findElement('Extension.extension');

    expect(extensionElement.min).toEqual(0);
    expect(extensionElement.max).toEqual('*');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should log an error if Extension.value[x] is changed after Extension.extension is used but apply both rules', () => {
    const extension = new Extension('MyOtherInvalidExtension');
    extension.id = 'my-invalid-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'MySlice' }];
    extension.rules.push(containsRuleForExtension);
    const onlyRuleForValueX = new OnlyRule('value[x]')
      .withFile('OtherInvalidExtension.fsh')
      .withLocation([4, 7, 4, 15]);
    onlyRuleForValueX.types = [{ type: 'string' }];
    extension.rules.push(onlyRuleForValueX);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const extensionElement = sd.findElement('Extension.extension:MySlice');
    const valueElement = sd.findElement('Extension.value[x]');

    // Both rules are applied but an error is logged
    expect(extensionElement).toBeDefined();
    expect(extensionElement.sliceName).toEqual('MySlice');
    expect(valueElement.type).toEqual([new ElementDefinitionType('string')]);
    expect(loggerSpy.getLastMessage()).toMatch(
      /Extension on MyOtherInvalidExtension cannot have both a value and sub-extensions/s
    );
    expect(loggerSpy.getLastMessage()).toMatch(/File: OtherInvalidExtension\.fsh.*Line: 4\D*/s);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
  });

  it('should zero out value[x] on an extension defined inline that uses extension', () => {
    const extension = new Extension('MyExtension');
    extension.id = 'my-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'mySlice' }];
    extension.rules.push(containsRuleForExtension); // * extension contains MySlice

    const cardRule = new CardRule('extension[mySlice].extension');
    cardRule.min = 1;
    cardRule.max = '*';
    extension.rules.push(cardRule); // * extension[mySlice].extension 1..* which implies extension[mySlice].value[x] 0..0

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');
    const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('0');
    expect(mySliceValueElement.min).toEqual(0);
    expect(mySliceValueElement.max).toEqual('0');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should zero out extension on an extension defined inline that uses value[x]', () => {
    const extension = new Extension('MyExtension');
    extension.id = 'my-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'mySlice' }];
    extension.rules.push(containsRuleForExtension); // * extension contains MySlice

    const fixedValueRule = new FixedValueRule('extension[mySlice].valueBoolean');
    fixedValueRule.fixedValue = true;
    extension.rules.push(fixedValueRule);

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');
    const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('0');
    expect(mySliceExtensionElement.min).toEqual(0);
    expect(mySliceExtensionElement.max).toEqual('0');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should not zero out extension if value[x] is zeroed out on an extension defined inline', () => {
    const extension = new Extension('MyExtension');
    extension.id = 'my-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'mySlice' }];
    extension.rules.push(containsRuleForExtension); // * extension contains MySlice

    const cardRule = new CardRule('extension[mySlice].value[x]');
    cardRule.min = 0;
    cardRule.max = '0';
    extension.rules.push(cardRule); // * extension[mySlice].value[x] 0..0 which should not change anything on extension[mySlice].extension

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');
    const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');
    const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('0');
    expect(mySliceValueElement.min).toEqual(0);
    expect(mySliceValueElement.max).toEqual('0');
    expect(mySliceExtensionElement.min).toEqual(0);
    expect(mySliceExtensionElement.max).toEqual('*'); // extension[mySlice].extension cardinality is unchanged
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should not zero out value[x] if extension is zeroed out on an extension defined inline', () => {
    const extension = new Extension('MyExtension');
    extension.id = 'my-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'mySlice' }];
    extension.rules.push(containsRuleForExtension); // * extension contains MySlice

    const cardRule = new CardRule('extension[mySlice].extension');
    cardRule.min = 0;
    cardRule.max = '0';
    extension.rules.push(cardRule); // * extension[mySlice].extension 0..0 which should not change anything on extension[mySlice].value[x]

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');
    const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');
    const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('0');
    expect(mySliceValueElement.min).toEqual(0);
    expect(mySliceValueElement.max).toEqual('1'); // extension[mySlice].value[x] cardinality is unchanged
    expect(mySliceExtensionElement.min).toEqual(0);
    expect(mySliceExtensionElement.max).toEqual('0');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should log an error if extension is used after value[x] on an extension defined inline and apply both rules', () => {
    const extension = new Extension('MyInvalidExtension');
    extension.id = 'my-invalid-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'mySlice' }];
    extension.rules.push(containsRuleForExtension); // * extension contains MySlice

    // Contradictory rules - log an error but set both
    const valueCardRule = new CardRule('extension[mySlice].value[x]');
    valueCardRule.min = 1;
    valueCardRule.max = '1';
    extension.rules.push(valueCardRule); // * extension[mySlice].value[x] 1..1
    const extensionCardRule = new CardRule('extension[mySlice].extension')
      .withFile('InvalidInlineExtension.fsh')
      .withLocation([4, 7, 4, 15]);
    extensionCardRule.min = 1;
    extensionCardRule.max = '*';
    extension.rules.push(extensionCardRule); // * extension[mySlice].extension 1..*

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');
    const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');
    const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('0');
    expect(mySliceExtensionElement.min).toEqual(1);
    expect(mySliceExtensionElement.max).toEqual('*');
    expect(mySliceValueElement.min).toEqual(1);
    expect(mySliceValueElement.max).toEqual('1');
    expect(loggerSpy.getLastMessage()).toMatch(
      /Extension on MyInvalidExtension cannot have both a value and sub-extensions/s
    );
    expect(loggerSpy.getLastMessage()).toMatch(/File: InvalidInlineExtension\.fsh.*Line: 4\D*/s);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
  });

  it('should log an error if value[x] is used after extension on an extension defined inline and apply both rules', () => {
    const extension = new Extension('MyInvalidExtension');
    extension.id = 'my-invalid-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'mySlice' }];
    extension.rules.push(containsRuleForExtension); // * extension contains MySlice

    // Contradictory rules - log an error but set both
    const extensionCardRule = new CardRule('extension[mySlice].extension');
    extensionCardRule.min = 1;
    extensionCardRule.max = '*';
    extension.rules.push(extensionCardRule); // * extension[mySlice].extension 1..*
    const valueCardRule = new CardRule('extension[mySlice].value[x]')
      .withFile('InvalidInlineExtension.fsh')
      .withLocation([5, 7, 5, 15]);
    valueCardRule.min = 1;
    valueCardRule.max = '1';
    extension.rules.push(valueCardRule); // * extension[mySlice].value[x] 1..1

    exporter.exportStructDef(extension);
    const sd = pkg.extensions[0];
    const valueElement = sd.findElement('Extension.value[x]');
    const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');
    const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('0');
    expect(mySliceExtensionElement.min).toEqual(1);
    expect(mySliceExtensionElement.max).toEqual('*');
    expect(mySliceValueElement.min).toEqual(1);
    expect(mySliceValueElement.max).toEqual('1');
    expect(loggerSpy.getLastMessage()).toMatch(
      /Extension on MyInvalidExtension cannot have both a value and sub-extensions/s
    );
    expect(loggerSpy.getLastMessage()).toMatch(/File: InvalidInlineExtension\.fsh.*Line: 5\D*/s);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
  });

  it('should zero out value[x] if extension is used on an extension defined inline on a profile', () => {
    // Other combinations of inferred CardRules on profiles are covered by the extensions tests
    const patientProfile = new Profile('MyPatient');
    patientProfile.parent = 'Patient';

    const containsRule = new ContainsRule('maritalStatus.extension');
    containsRule.items = [{ name: 'maritalSlice' }];
    const sliceCardRule = new CardRule('maritalStatus.extension[maritalSlice].extension');
    sliceCardRule.min = 1;
    sliceCardRule.max = '2';
    patientProfile.rules.push(containsRule, sliceCardRule);

    exporter.exportStructDef(patientProfile);
    const sd = pkg.profiles[0];
    const valueElement = sd.findElement('Patient.maritalStatus.extension:maritalSlice.value[x]');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('0');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should correctly allow both extension and value[x] on profiles', () => {
    const profile = new Profile('ExtendedObservation');
    profile.parent = 'Observation';

    const containsRule = new ContainsRule('extension');
    containsRule.items = [{ name: 'EvidenceType' }];
    const onlyRule = new OnlyRule('value[x]');
    onlyRule.types = [{ type: 'string' }];
    profile.rules.push(containsRule, onlyRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const valueElement = sd.findElement('Observation.value[x]');
    const extensionElement = sd.findElement('Observation.extension');

    expect(valueElement.min).toEqual(0);
    expect(valueElement.max).toEqual('1');
    expect(extensionElement.min).toEqual(0);
    expect(extensionElement.max).toEqual('*');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should not add value[x] onto non-extension elements', () => {
    const profile = new Profile('ExtendedPatient');
    profile.parent = 'Patient';

    const containsRule = new ContainsRule('extension');
    containsRule.items = [{ name: 'PatientNote' }];
    const cardRule = new CardRule('extension[PatientNote].extension');
    cardRule.min = 1;
    cardRule.max = '1';
    profile.rules.push(containsRule, cardRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const extensionElement = sd.findElement('Patient.extension');
    const sliceExtensionElement = sd.findElement('Patient.extension:PatientNote.extension');
    const sliceValueElement = sd.findElement('Patient.extension:PatientNote.value[x]');

    expect(extensionElement.min).toEqual(0);
    expect(extensionElement.max).toEqual('*');
    expect(sliceExtensionElement.min).toEqual(1);
    expect(sliceExtensionElement.max).toEqual('1');
    expect(sliceValueElement.min).toEqual(0);
    expect(sliceValueElement.max).toEqual('0');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should set value[x] on nested elements of a profile without zeroing extension', () => {
    const profile = new Profile('MyObservation');
    profile.parent = 'Observation';

    const onlyRule = new OnlyRule('component.value[x]');
    onlyRule.types = [{ type: 'string' }];
    const cardRule = new CardRule('component.extension');
    cardRule.min = 1;
    cardRule.max = '1';
    profile.rules.push(onlyRule, cardRule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const componentValueElement = sd.findElement('Observation.component.value[x]');
    const componentExtensionElement = sd.findElement('Observation.component.extension');

    expect(componentValueElement.type[0]).toEqual(new ElementDefinitionType('string'));
    expect(componentExtensionElement.min).toEqual(1);
    expect(componentExtensionElement.max).toEqual('1');
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should not set inferred 0..0 CardRules if they were set on the FSH definition', () => {
    const extension = new Extension('MyNoInferenceExtension');
    extension.id = 'my-extension';

    const containsRuleForExtension = new ContainsRule('extension');
    containsRuleForExtension.items = [{ name: 'sliceA' }, { name: 'sliceB' }];
    extension.rules.push(containsRuleForExtension); // * extension contains sliceA, sliceB

    // Manually zero out value[x]/extension where appropriate
    const sliceAExtensionCardRule = new CardRule('extension[sliceA].extension');
    sliceAExtensionCardRule.min = 1;
    sliceAExtensionCardRule.max = '*'; // * extension[sliceA].extension 1..*
    const sliceAValueCardRule = new CardRule('extension[sliceA].value[x]');
    sliceAValueCardRule.min = 0;
    sliceAValueCardRule.max = '0'; // * extension[sliceA].value[x] 0..0

    const sliceBExtensionCardRule = new CardRule('extension[sliceB].value[x]');
    sliceBExtensionCardRule.min = 1;
    sliceBExtensionCardRule.max = '1'; // * extension[sliceB].extension 1..1
    const sliceBValueCardRule = new CardRule('extension[sliceB].extension');
    sliceBValueCardRule.min = 0;
    sliceBValueCardRule.max = '0'; // * extension[sliceB].extension 0..0

    extension.rules.push(
      sliceAExtensionCardRule,
      sliceAValueCardRule,
      sliceBExtensionCardRule,
      sliceBValueCardRule
    );

    exporter.exportStructDef(extension);
    expect(extension.rules).toHaveLength(6);
    expect(extension.rules).toEqual([
      {
        sourceInfo: {},
        path: 'extension',
        items: [{ name: 'sliceA' }, { name: 'sliceB' }]
      },
      {
        sourceInfo: {},
        path: 'extension[sliceA].extension',
        min: 1,
        max: '*'
      },
      {
        sourceInfo: {},
        path: 'extension[sliceA].value[x]',
        min: 0,
        max: '0'
      },
      {
        sourceInfo: {},
        path: 'extension[sliceB].value[x]',
        min: 1,
        max: '1'
      },
      {
        sourceInfo: {},
        path: 'extension[sliceB].extension',
        min: 0,
        max: '0'
      },
      { sourceInfo: {}, path: 'value[x]', min: 0, max: '0' } // The only rule inferred
    ]);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  // rules applied to slices, sliced elements, and their children
  describe('#RulesWithSlices', () => {
    let observationWithSlice: Profile;
    beforeEach(() => {
      // Profile: ObservationWithSlice
      // Parent: Observation
      // * category ^slicing.discriminator[0].type = #pattern
      // * category ^slicing.discriminator[0].path = "$this"
      // * category ^slicing.rules = #open
      // * category contains Procedure 0..1
      // * component ^slicing.discriminator[0].type = #pattern
      // * component ^slicing.discriminator[0].path = "$this"
      // * component ^slicing.rules = #open
      // * component contains Lab 0..1
      observationWithSlice = new Profile('ObservationWithSlice');
      observationWithSlice.parent = 'Observation';
      const categorySlicingType = new CaretValueRule('category');
      categorySlicingType.caretPath = 'slicing.discriminator[0].type';
      categorySlicingType.value = new FshCode('pattern');
      const categorySlicingPath = new CaretValueRule('category');
      categorySlicingPath.caretPath = 'slicing.discriminator[0].path';
      categorySlicingPath.value = '$this';
      const categorySlicingRules = new CaretValueRule('category');
      categorySlicingRules.caretPath = 'slicing.rules';
      categorySlicingRules.value = new FshCode('open');
      const categoryContainsProcedure = new ContainsRule('category');
      categoryContainsProcedure.items = [{ name: 'Procedure' }];
      const procedureCard = new CardRule('category[Procedure]');
      procedureCard.min = 0;
      procedureCard.max = '1';
      const componentSlicingType = new CaretValueRule('component');
      componentSlicingType.caretPath = 'slicing.discriminator[0].type';
      componentSlicingType.value = new FshCode('pattern');
      const componentSlicingPath = new CaretValueRule('component');
      componentSlicingPath.caretPath = 'slicing.discriminator[0].path';
      componentSlicingPath.value = '$this';
      const componentSlicingRules = new CaretValueRule('component');
      componentSlicingRules.caretPath = 'slicing.rules';
      componentSlicingRules.value = new FshCode('open');
      const componentContainsLab = new ContainsRule('component');
      componentContainsLab.items = [{ name: 'Lab' }];
      const labCard = new CardRule('component[Lab]');
      labCard.min = 0;
      labCard.max = '1';
      observationWithSlice.rules.push(
        categorySlicingType,
        categorySlicingPath,
        categorySlicingRules,
        categoryContainsProcedure,
        procedureCard,
        componentSlicingType,
        componentSlicingPath,
        componentSlicingRules,
        componentContainsLab,
        labCard
      );
    });

    it('should apply a CardRule that makes the cardinality of the child of a slice narrower', () => {
      loggerSpy.reset();
      // * component[Lab].interpretation 2..2
      // * component.interpretation 0..5
      const rootCard = new CardRule('component.interpretation');
      rootCard.min = 0;
      rootCard.max = '5';
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 2;
      labCard.max = '2';

      observationWithSlice.rules.push(labCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      expect(rootInterpretation.min).toBe(0);
      expect(rootInterpretation.max).toBe('5');
      expect(labInterpretation.min).toBe(2);
      expect(labInterpretation.max).toBe('2');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply a CardRule that would make the cardinality of a slice smaller than the root', () => {
      loggerSpy.reset();
      // component[Lab] has card 0..1
      // * component 1..5

      const rootCard = new CardRule('component')
        .withFile('Narrower.fsh')
        .withLocation([7, 9, 7, 23]);
      rootCard.min = 1;
      rootCard.max = '5';

      observationWithSlice.rules.push(rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      expect(sd.findElement('Observation.component').max).toBe('5');
      expect(sd.findElement('Observation.component').min).toBe(1);
      expect(sd.findElement('Observation.component:Lab').min).toBe(0);
      expect(sd.findElement('Observation.component:Lab').max).toBe('1');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not apply a CardRule that would make the cardinality of the child of a slice too small', () => {
      loggerSpy.reset();
      // * component[Lab].interpretation 0..4
      // * component.interpretation 1..5 // this rule is invalid!
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.max = '4';
      const rootCard = new CardRule('component.interpretation')
        .withFile('Narrower.fsh')
        .withLocation([7, 9, 7, 23]);
      rootCard.min = 1;
      rootCard.max = '5';

      observationWithSlice.rules.push(labCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      expect(sd.findElement('Observation.component.interpretation').max).toBe('*');
      expect(sd.findElement('Observation.component.interpretation').min).toBe(0);
      expect(sd.findElement('Observation.component:Lab.interpretation').max).toBe('4');
      expect(loggerSpy.getLastMessage('error')).toMatch(/cannot be narrowed/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Narrower\.fsh.*Line: 7\D*/s);
    });

    it('should not apply a CardRule that would make the cardinality of the child of a slice too large', () => {
      // * component[Lab].interpretation 0..9
      // * component.interpretation 0..5 // this rule is invalid!
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.max = '9';
      const rootCard = new CardRule('component.interpretation')
        .withFile('Narrower.fsh')
        .withLocation([7, 9, 7, 23]);
      rootCard.max = '5';

      observationWithSlice.rules.push(labCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      expect(sd.findElement('Observation.component.interpretation').max).toBe('*');
      expect(sd.findElement('Observation.component:Lab.interpretation').max).toBe('9');
      expect(loggerSpy.getLastMessage('error')).toMatch(/cannot be narrowed/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Narrower\.fsh.*Line: 7\D*/s);
    });

    it('should apply a FlagRule on a sliced element that updates the flags on its slices', () => {
      // * component MS
      const rootFlag = new FlagRule('component');
      rootFlag.mustSupport = true;

      observationWithSlice.rules.push(rootFlag);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootComponent = sd.findElement('Observation.component');
      const labComponent = sd.findElement('Observation.component:Lab');
      expect(rootComponent.mustSupport).toBe(true);
      expect(labComponent.mustSupport).toBe(true);
    });

    it('should apply a FlagRule on the child of a sliced element that updates the flags on the child of a slice', () => {
      // * component[Lab].interpretation 0..1 // this forces the creation of the unfolded slice
      // * component.interpretation MS
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 0;
      labCard.max = '1';
      const rootFlag = new FlagRule('component.interpretation');
      rootFlag.mustSupport = true;

      observationWithSlice.rules.push(labCard, rootFlag);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      expect(rootInterpretation.mustSupport).toBe(true);
      expect(labInterpretation.mustSupport).toBe(true);
    });

    it('should apply ValueSetRules on a slice, then a sliced element, with different value sets', () => {
      // * category[Procedure] from http://hl7.org/fhir/us/minimal/MediocreObservationCodes (extensible)
      // * category from http://hl7.org/fhir/us/minimal/ImportantObservationCodes (required)
      const procedureValueSet = new ValueSetRule('category[Procedure]');
      procedureValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes';
      procedureValueSet.strength = 'extensible';
      const rootValueSet = new ValueSetRule('category');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes';
      rootValueSet.strength = 'required';

      observationWithSlice.rules.push(procedureValueSet, rootValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const procedureCategory = sd.findElement('Observation.category:Procedure');
      const importantBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes',
        strength: 'required'
      };
      const mediocreBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes',
        strength: 'extensible'
      };
      expect(rootCategory.binding).toEqual(importantBinding);
      expect(procedureCategory.binding).toEqual(mediocreBinding);
    });

    it('should apply ValueSetRules on a sliced element, then a slice, with different value sets', () => {
      // * category from http://hl7.org/fhir/us/minimal/ImportantObservationCodes (required)
      // * category[Procedure] from http://hl7.org/fhir/us/minimal/MediocreObservationCodes (extensible)
      const rootValueSet = new ValueSetRule('category');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes';
      rootValueSet.strength = 'required';
      const procedureValueSet = new ValueSetRule('category[Procedure]');
      procedureValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes';
      procedureValueSet.strength = 'extensible';

      observationWithSlice.rules.push(rootValueSet, procedureValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const procedureCategory = sd.findElement('Observation.category:Procedure');
      const importantBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes',
        strength: 'required'
      };
      const mediocreBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes',
        strength: 'extensible'
      };
      expect(rootCategory.binding).toEqual(importantBinding);
      expect(procedureCategory.binding).toEqual(mediocreBinding);
    });

    it('should apply ValueSetRules on a slice, then the sliced element, with the same value set', () => {
      // * category[Procedure] from http://hl7.org/fhir/us/minimal/RegularObservationCodes (extensible)
      // * category from http://hl7.org/fhir/us/minimal/RegularObservationCodes (required)
      const procedureValueSet = new ValueSetRule('category[Procedure]');
      procedureValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      procedureValueSet.strength = 'extensible';
      const rootValueSet = new ValueSetRule('category');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      rootValueSet.strength = 'required';

      observationWithSlice.rules.push(procedureValueSet, rootValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const procedureCategory = sd.findElement('Observation.category:Procedure');
      const regularBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/RegularObservationCodes',
        strength: 'required'
      };
      expect(rootCategory.binding).toEqual(regularBinding);
      expect(procedureCategory.binding).toEqual(regularBinding);
    });

    it('should not apply a ValueSetRule on a sliced element that would bind it to the same value set as the root, but more weakly', () => {
      // * category from http://hl7.org/fhir/us/minimal/RegularObservationCodes (required)
      // * category[Procedure] from http://hl7.org/fhir/us/minimal/RegularObservationCodes (extensible)
      const rootValueSet = new ValueSetRule('category');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      rootValueSet.strength = 'required';
      const procedureValueSet = new ValueSetRule('category[Procedure]')
        .withFile('Weaker.fsh')
        .withLocation([4, 8, 4, 23]);
      procedureValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      procedureValueSet.strength = 'extensible';

      observationWithSlice.rules.push(rootValueSet, procedureValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const regularBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/RegularObservationCodes',
        strength: 'required'
      };
      expect(rootCategory.binding).toEqual(regularBinding);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot override required binding with extensible/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Weaker\.fsh.*Line: 4\D*/s);
    });

    it('should apply ValueSetRules on the child of a slice, then the child of a sliced element, with different value sets', () => {
      // * component[Lab].code from http://hl7.org/fhir/us/minimal/MediocreObservationCodes (extensible)
      // * component.code from http://hl7.org/fhir/us/minimal/ImportantObservationCodes (required)
      const labValueSet = new ValueSetRule('component[Lab].code');
      labValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes';
      labValueSet.strength = 'extensible';
      const rootValueSet = new ValueSetRule('component.code');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes';
      rootValueSet.strength = 'required';

      observationWithSlice.rules.push(labValueSet, rootValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      const labCode = sd.findElement('Observation.component:Lab.code');
      const importantBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes',
        strength: 'required'
      };
      const mediocreBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes',
        strength: 'extensible'
      };
      expect(rootCode.binding).toEqual(importantBinding);
      expect(labCode.binding).toEqual(mediocreBinding);
    });

    it('should apply ValueSetRules on the child of a sliced element, then the child of a slice, with different value sets', () => {
      // * component[Lab].code MS // force creation of element
      // * component.code from http://hl7.org/fhir/us/minimal/ImportantObservationCodes (required)
      // * component[Lab].code from http://hl7.org/fhir/us/minimal/MediocreObservationCodes (extensible)
      const flagRule = new FlagRule('component[Lab].code');
      flagRule.mustSupport = true;
      const rootValueSet = new ValueSetRule('component.code');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes';
      rootValueSet.strength = 'required';
      const labValueSet = new ValueSetRule('component[Lab].code');
      labValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes';
      labValueSet.strength = 'extensible';

      observationWithSlice.rules.push(flagRule, rootValueSet, labValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      const labCode = sd.findElement('Observation.component:Lab.code');
      const importantBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes',
        strength: 'required'
      };
      const mediocreBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes',
        strength: 'extensible'
      };
      expect(rootCode.binding).toEqual(importantBinding);
      expect(labCode.binding).toEqual(mediocreBinding);
    });

    it('should apply ValueSetRules on the child of a slice, then the child of the sliced element, with the same value set', () => {
      // * component[Lab].code from http://hl7.org/fhir/us/minimal/RegularObservationCodes (extensible)
      // * component.code from http://hl7.org/fhir/us/minimal/RegularObservationCodes (required)
      const labValueSet = new ValueSetRule('component[Lab].code');
      labValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      labValueSet.strength = 'extensible';
      const rootValueSet = new ValueSetRule('component.code');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      rootValueSet.strength = 'required';

      observationWithSlice.rules.push(labValueSet, rootValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      const labCode = sd.findElement('Observation.component:Lab.code');
      const regularBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/RegularObservationCodes',
        strength: 'required'
      };
      expect(rootCode.binding).toEqual(regularBinding);
      expect(labCode.binding).toEqual(regularBinding);
    });

    it('should not apply a ValueSetRule on the child of a sliced element that would bind it to the same value set as the child of the root, but more weakly', () => {
      // * component.code from http://hl7.org/fhir/us/minimal/RegularObservationCodes (required)
      // * component[Lab].code from http://hl7.org/fhir/us/minimal/RegularObservationCodes (extensible)
      const rootValueSet = new ValueSetRule('component.code');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      rootValueSet.strength = 'required';
      const labValueSet = new ValueSetRule('component[Lab].code')
        .withFile('Weaker.fsh')
        .withLocation([9, 15, 9, 33]);
      labValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      labValueSet.strength = 'extensible';

      observationWithSlice.rules.push(rootValueSet, labValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      // const labCode = sd.findElement('Observation.component:Lab.code');
      const regularBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/RegularObservationCodes',
        strength: 'required'
      };
      expect(rootCode.binding).toEqual(regularBinding);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot override required binding with extensible/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Weaker\.fsh.*Line: 9\D*/s);
    });

    it.todo(
      'should apply a FixedValueRule on a sliced element that updates the fixed value on its slices'
    );
    it.todo(
      'should not apply a FixedValueRule on a sliced element that would invalidate the fixed value on a slice'
    );
    it.todo(
      'should apply a ContainsRule on the child of a sliced element that updates the slices on the child of a slice'
    );
    it.todo(
      'should not apply a ContainsRule on the child of a sliced element that would invalidate slices within a defined slice'
    );

    it('should apply an OnlyRule on a sliced element that updates the types on its slices', () => {
      loggerSpy.reset();
      // * component[Lab].value[x] MS // this forces the creation of the unfolded slice
      // * component.value[x] only Quantity or Ratio
      const labFlag = new FlagRule('component[Lab].value[x]');
      labFlag.mustSupport = true;
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'Quantity' }, { type: 'string' }];

      observationWithSlice.rules.push(labFlag, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeQuantity = new ElementDefinitionType('Quantity');
      const expectedTypeString = new ElementDefinitionType('string');
      expect(rootValue.type).toHaveLength(2);
      expect(rootValue.type).toContainEqual(expectedTypeQuantity);
      expect(rootValue.type).toContainEqual(expectedTypeString);
      expect(labValue.type).toHaveLength(2);
      expect(labValue.type).toContainEqual(expectedTypeQuantity);
      expect(labValue.type).toContainEqual(expectedTypeString);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an OnlyRule on a sliced element that includes more types than are allowed on its slices', () => {
      loggerSpy.reset();
      // * component[Lab].value[x] only Quantity
      // * component.value[x] only Quantity or Ratio
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }];
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'Quantity' }, { type: 'Ratio' }];

      observationWithSlice.rules.push(labOnly, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeQuantity = new ElementDefinitionType('Quantity');
      const expectedTypeRatio = new ElementDefinitionType('Ratio');
      expect(rootValue.type).toHaveLength(2);
      expect(rootValue.type).toContainEqual(expectedTypeQuantity);
      expect(rootValue.type).toContainEqual(expectedTypeRatio);
      expect(labValue.type).toHaveLength(1);
      expect(labValue.type).toContainEqual(expectedTypeQuantity);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an OnlyRule on a sliced element that removes types available on a slice', () => {
      loggerSpy.reset();
      // * component[Lab].value[x] only Quantity or Ratio
      // * component.value[x] only Quantity
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }, { type: 'Ratio' }];
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'Quantity' }];

      observationWithSlice.rules.push(labOnly, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeQuantity = new ElementDefinitionType('Quantity');
      expect(rootValue.type).toHaveLength(1);
      expect(rootValue.type).toContainEqual(expectedTypeQuantity);
      expect(labValue.type).toHaveLength(1);
      expect(labValue.type).toContainEqual(expectedTypeQuantity);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not apply an OnlyRule on a sliced element that would invalidate any of its slices', () => {
      // * component[Lab].value[x] only Quantity
      // * component.value[x] only Ratio // this would remove all types from the slice!
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }];
      const rootOnly = new OnlyRule('component.value[x]')
        .withFile('RemoveType.fsh')
        .withLocation([12, 5, 12, 23]);
      rootOnly.types = [{ type: 'Ratio' }];

      observationWithSlice.rules.push(labOnly, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeQuantity = new ElementDefinitionType('Quantity');
      expect(rootValue.type).toHaveLength(11);
      expect(labValue.type).toHaveLength(1);
      expect(labValue.type).toContainEqual(expectedTypeQuantity);
      expect(loggerSpy.getLastMessage('error')).toMatch(/eliminate all types/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: RemoveType\.fsh.*Line: 12\D*/s);
    });

    it('should apply an OnlyRule on a sliced element that would remove all types from a zeroed-out slice', () => {
      // * component[Lab].value[x] only Quantity
      // * component[Lab] 0..0
      // * component.value[x] only Ratio
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }];
      const labCard = new CardRule('component[Lab]');
      labCard.min = 0;
      labCard.max = '0';
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'Ratio' }];

      observationWithSlice.rules.push(labOnly, labCard, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const expectedTypeRatio = new ElementDefinitionType('Ratio');
      expect(rootValue.type).toHaveLength(1);
      expect(rootValue.type).toContainEqual(expectedTypeRatio);
    });

    it('should apply an OnlyRule on a sliced element that constrains the types on its slices to subtypes', () => {
      loggerSpy.reset();
      // * component[Lab].value[x] only Quantity
      // * component.value[x] only SimpleQuantity or Ratio
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }];
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'SimpleQuantity' }, { type: 'Ratio' }];

      observationWithSlice.rules.push(labOnly, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeRatio = new ElementDefinitionType('Ratio');
      const expectedTypeSimpleQuantity = new ElementDefinitionType('Quantity').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/SimpleQuantity'
      );
      expect(rootValue.type).toHaveLength(2);
      expect(rootValue.type).toContainEqual(expectedTypeRatio);
      expect(rootValue.type).toContainEqual(expectedTypeSimpleQuantity);
      expect(labValue.type).toHaveLength(1);
      expect(labValue.type).toContainEqual(expectedTypeSimpleQuantity);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when a type constraint implicitly removes a choice on a sliced element', () => {
      // * component[Lab].valueString = "Please leave"
      // * component.value[x] only Quantity
      const labFixedValue = new FixedValueRule('component[Lab].valueString');
      labFixedValue.fixedValue = 'Please leave';
      const rootOnly = new OnlyRule('component.value[x]')
        .withFile('RemoveString.fsh')
        .withLocation([8, 4, 8, 23]);
      rootOnly.types = [{ type: 'Quantity' }];

      observationWithSlice.rules.push(labFixedValue, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      expect(rootValue.type).toHaveLength(1);
      expect(labValue.type).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/obsolete for choices.*valueString/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: RemoveString\.fsh.*Line: 8\D*/s);
    });
    it.todo(
      'should apply an OnlyRule on the child of a sliced element that updates the types on the children of its slices'
    );
    it.todo(
      'should not apply an OnlyRule on the child of a sliced element that would invalidate any of its slices'
    );

    it('should apply an ObeysRule on a sliced element that updates the constraints on its slices', () => {
      // * category[Procedure] obeys ShoutingRule
      // * category obeys TalkingRule
      // Invariant: ShoutingRule
      // Description: "No shouting allowed."
      // Invariant: TalkingRule
      // Description: "Talking is prohibited."
      const shoutingRule = new ObeysRule('category[Procedure]');
      shoutingRule.invariant = 'shout-1';
      const talkingRule = new ObeysRule('category');
      talkingRule.invariant = 'talk-1';

      const shoutingInvariant = new Invariant('shout-1');
      shoutingInvariant.description = 'No shouting allowed.';
      const talkingInvariant = new Invariant('talk-1');
      talkingInvariant.description = 'Talking is prohibited.';

      observationWithSlice.rules.push(shoutingRule, talkingRule);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      doc.invariants.set(shoutingInvariant.name, shoutingInvariant);
      doc.invariants.set(talkingInvariant.name, talkingInvariant);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const procedureCategory = sd.findElement('Observation.category:Procedure');
      const expectedShouting = {
        key: 'shout-1',
        human: 'No shouting allowed.',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationWithSlice'
      };
      const expectedTalking = {
        key: 'talk-1',
        human: 'Talking is prohibited.',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationWithSlice'
      };
      expect(rootCategory.constraint).toContainEqual(expectedTalking);
      expect(procedureCategory.constraint).toContainEqual(expectedShouting);
      expect(procedureCategory.constraint).toContainEqual(expectedTalking);
    });

    it('should apply an ObeysRule on the child of a sliced element that updates the child elements on its slices', () => {
      // * component[Lab].code obeys RunningRule
      // * component.code obeys WalkingRule
      // Invariant: RunningRule
      // Description: "Run as fast as you can!"
      // Invariant: WalkingRule
      // Description: "Walk at your own pace."
      const runningRule = new ObeysRule('component[Lab].code');
      runningRule.invariant = 'run-1';
      const walkingRule = new ObeysRule('component.code');
      walkingRule.invariant = 'walk-1';

      const runningInvariant = new Invariant('run-1');
      runningInvariant.description = 'Run as fast as you can!';
      const walkingInvariant = new Invariant('walk-1');
      walkingInvariant.description = 'Walk at your own pace.';

      observationWithSlice.rules.push(runningRule, walkingRule);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      doc.invariants.set(runningInvariant.name, runningInvariant);
      doc.invariants.set(walkingInvariant.name, walkingInvariant);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      const labCode = sd.findElement('Observation.component:Lab.code');
      const expectedRunning = {
        key: 'run-1',
        human: 'Run as fast as you can!',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationWithSlice'
      };
      const expectedWalking = {
        key: 'walk-1',
        human: 'Walk at your own pace.',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationWithSlice'
      };
      expect(rootCode.constraint).toContainEqual(expectedWalking);
      expect(labCode.constraint).toContainEqual(expectedRunning);
      expect(labCode.constraint).toContainEqual(expectedWalking);
    });
    it.todo('should have some tests involving slices and CaretValueRule');
  });

  // toJSON
  it('should correctly generate a diff containing only changed elements', () => {
    // We already have separate tests for the differentials, so this just ensures that the
    // StructureDefinition is setup correctly to produce accurate differential elements.
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('subject');
    rule.min = 1;
    rule.max = '1';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const json = sd.toJSON();

    expect(json.differential.element).toHaveLength(1);
    expect(json.differential.element).toEqual([
      { id: 'Observation.subject', path: 'Observation.subject', min: 1 }
    ]);
  });

  it('should correctly generate a diff containing only changed elements when elements are unfolded', () => {
    // We already have separate tests for the differentials, so this just ensures that the
    // StructureDefinition captures originals at the right time to produce the most correct
    // differentials
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    // Create a few rules that will force complex types to be "unfolded"
    let rule = new CardRule('code.coding');
    rule.min = 1;
    rule.max = '*';
    profile.rules.push(rule);

    rule = new CardRule('code.coding.userSelected');
    rule.min = 1;
    rule.max = '1';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const json = sd.toJSON();

    expect(json.differential.element).toHaveLength(2);
    expect(json.differential.element).toEqual([
      {
        id: 'Observation.code.coding',
        path: 'Observation.code.coding',
        min: 1
      },
      {
        id: 'Observation.code.coding.userSelected',
        path: 'Observation.code.coding.userSelected',
        min: 1
      }
    ]);
  });

  it('should correctly generate a diff containing only changed elements when elements are sliced', () => {
    // We already have separate tests for the differentials, so this just ensures that the
    // StructureDefinition captures originals at the right time to produce the most correct
    // differentials
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    // Create some rules to slice component
    // * component ^slicing.discriminator[0].type = #pattern
    // * component ^slicing.discriminator[0].path = "code"
    // * component ^slicing.rules = #open
    // * component ^comment = "BP comment"
    // * component contains SystolicBP 0..1 and DiastolicBP 0..1
    // * component[SystolicBP].code = LOINC#8480-6
    // * component[SystolicBP].value[x] only Quantity
    // * component[DiastolicBP].code = LOINC#8462-4
    // * component[DiastolicBP].value[x] only Quantity
    const ruleA = new CaretValueRule('component');
    ruleA.caretPath = 'slicing.discriminator[0].type';
    ruleA.value = new FshCode('pattern');
    const ruleB = new CaretValueRule('component');
    ruleB.caretPath = 'slicing.discriminator[0].path';
    ruleB.value = 'code';
    const ruleC = new CaretValueRule('component');
    ruleC.caretPath = 'slicing.rules';
    ruleC.value = new FshCode('open');
    const ruleD = new CaretValueRule('component');
    ruleD.caretPath = 'comment';
    ruleD.value = 'BP comment';
    const rule1 = new ContainsRule('component');
    rule1.items = [{ name: 'SystolicBP' }, { name: 'DiastolicBP' }];
    const rule2 = new CardRule('component[SystolicBP]');
    rule2.max = '1';
    const rule3 = new FixedValueRule('component[SystolicBP].code');
    rule3.fixedValue = new FshCode('8480-6', 'http://loinc.org');
    const rule4 = new OnlyRule('component[SystolicBP].value[x]');
    rule4.types = [{ type: 'Quantity' }];
    const rule5 = new CardRule('component[DiastolicBP]');
    rule5.max = '1';
    const rule6 = new FixedValueRule('component[DiastolicBP].code');
    rule6.fixedValue = new FshCode('8462-4', 'http://loinc.org');
    const rule7 = new OnlyRule('component[DiastolicBP].value[x]');
    rule7.types = [{ type: 'Quantity' }];
    profile.rules.push(ruleA, ruleB, ruleC, ruleD, rule1, rule2, rule3, rule4, rule5, rule6, rule7);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const json = sd.toJSON();

    expect(json.differential.element).toHaveLength(7);
    expect(json.differential.element).toEqual([
      {
        id: 'Observation.component',
        path: 'Observation.component',
        slicing: {
          discriminator: [{ type: 'pattern', path: 'code' }],
          rules: 'open'
        },
        comment: 'BP comment'
      },
      {
        id: 'Observation.component:SystolicBP',
        path: 'Observation.component',
        sliceName: 'SystolicBP',
        min: 0,
        max: '1'
      },
      {
        id: 'Observation.component:SystolicBP.code',
        path: 'Observation.component.code',
        patternCodeableConcept: {
          coding: [{ code: '8480-6', system: 'http://loinc.org' }]
        }
      },
      {
        id: 'Observation.component:SystolicBP.value[x]',
        path: 'Observation.component.value[x]',
        type: [{ code: 'Quantity' }]
      },
      {
        id: 'Observation.component:DiastolicBP',
        path: 'Observation.component',
        sliceName: 'DiastolicBP',
        min: 0,
        max: '1'
      },
      {
        id: 'Observation.component:DiastolicBP.code',
        path: 'Observation.component.code',
        patternCodeableConcept: {
          coding: [{ code: '8462-4', system: 'http://loinc.org' }]
        }
      },
      {
        id: 'Observation.component:DiastolicBP.value[x]',
        path: 'Observation.component.value[x]',
        type: [{ code: 'Quantity' }]
      }
    ]);
  });

  it('should include sliceName in a differential when an attribute of the slice is changed', () => {
    const profile = new Profile('MustSlice');
    profile.parent = 'resprate';
    const mustCode = new FlagRule('code.coding[RespRateCode]');
    mustCode.mustSupport = true;
    profile.rules.push(mustCode);
    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const json = sd.toJSON();
    expect(json.differential.element).toHaveLength(1);
    expect(json.differential.element).toEqual([
      {
        id: 'Observation.code.coding:RespRateCode',
        path: 'Observation.code.coding',
        sliceName: 'RespRateCode',
        mustSupport: true
      }
    ]);
  });

  it('should include the children of primitive elements when serializing to JSON', () => {
    const profile = new Profile('SpecialUrlId');
    profile.parent = 'Observation';

    const rule = new CaretValueRule('');
    rule.caretPath = 'url.id';
    rule.value = 'my-id';
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const json = sd.toJSON();
    expect(json).toHaveProperty('_url', { id: 'my-id' });
  });

  it.skip('should not change sliceName based on a CaretValueRule', () => {
    const profile = new Profile('NameChange');
    profile.parent = 'resprate';
    const sliceChange = new CaretValueRule('code.coding[RespRateCode]');
    sliceChange.caretPath = 'sliceName';
    sliceChange.value = 'SomeOtherCode';
    profile.rules.push(sliceChange);
    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];
    const json = sd.toJSON();
    expect(json.differential.element).toHaveLength(1);
    expect(json.differential.element[0]).toEqual({
      id: 'Observation.code.coding:RespRateCode',
      path: 'Observation.code.coding',
      sliceName: 'RespRateCode'
    });
  });

  // No duplicate structure definitions exported
  it('should not export duplicate structure definitions', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Patient';
    doc.profiles.set(profile.name, profile);

    const extension = new Extension('Bar');
    extension.id = 'bar';
    doc.aliases.set('barAlias', 'Bar');
    doc.extensions.set(extension.name, extension);

    const ruleBar = new ContainsRule('extension');
    ruleBar.items = [{ name: 'bar', type: 'barAlias' }];
    profile.rules.push(ruleBar);

    const pkg = exporter.export();
    expect(pkg.profiles.length).toBe(1);
    expect(pkg.extensions.length).toBe(1);
  });

  describe('#Mixins', () => {
    let profile: Profile;
    let mixin: RuleSet;

    beforeEach(() => {
      profile = new Profile('Foo').withFile('Profile.fsh').withLocation([5, 6, 7, 16]);
      profile.parent = 'Patient';
      doc.profiles.set(profile.name, profile);

      mixin = new RuleSet('Bar');
      doc.ruleSets.set(mixin.name, mixin);
      profile.mixins.push('Bar');
    });

    it('should apply rules from a single mixin', () => {
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      mixin.rules.push(nameRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      expect(sd.title).toBe('Wow fancy');
    });

    it('should apply rules from multiple mixins in the correct order', () => {
      const nameRule1 = new CaretValueRule('');
      nameRule1.caretPath = 'title';
      nameRule1.value = 'Wow fancy';
      mixin.rules.push(nameRule1);

      const mixin2 = new RuleSet('Baz');
      doc.ruleSets.set(mixin2.name, mixin2);
      const nameRule2 = new CaretValueRule('');
      nameRule2.caretPath = 'title';
      nameRule2.value = 'Wow fancier title';
      mixin2.rules.push(nameRule2);
      profile.mixins.push('Baz');

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      expect(sd.title).toBe('Wow fancier title');
    });

    it('should emit an error when the path is not found on a mixin rule', () => {
      const nameRule = new CaretValueRule('fakepath')
        .withFile('Mixin.fsh')
        .withLocation([1, 2, 3, 12]);
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      mixin.rules.push(nameRule);

      exporter.exportStructDef(profile);

      expect(loggerSpy.getLastMessage('error')).toMatch(/fakepath/);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Mixin\.fsh.*Line: 1 - 3\D*/s);
      expect(loggerSpy.getLastMessage()).toMatch(
        /Applied in File: Profile\.fsh.*Applied on Line: 5 - 7\D*/s
      );
    });

    it('should emit an error when applying an invalid mixin rule', () => {
      const cardRule = new CardRule('active').withFile('Mixin.fsh').withLocation([1, 2, 3, 12]);
      cardRule.max = '2';
      cardRule.min = 0;
      mixin.rules.push(cardRule);

      exporter.exportStructDef(profile);

      expect(loggerSpy.getLastMessage('error')).toMatch(/0\.\.2.* 0\.\.1/);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Mixin\.fsh.*Line: 1 - 3\D*/s);
      expect(loggerSpy.getLastMessage()).toMatch(
        /Applied in File: Profile\.fsh.*Applied on Line: 5 - 7\D*/s
      );
    });

    it('should emit an error when a mixin cannot be found', () => {
      profile.mixins.push('Barz');

      exporter.exportStructDef(profile);

      expect(loggerSpy.getLastMessage('error')).toMatch(/Barz/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Profile\.fsh.*Line: 5 - 7\D*/s);
    });

    it('should emit a warning whenever a mixin is used', () => {
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      mixin.rules.push(nameRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      // mixins are still applied
      expect(sd.title).toBe('Wow fancy');
      expect(loggerSpy.getLastMessage('warn')).toMatch(/Use of the "Mixins" keyword/);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/\* insert Bar/);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Profile\.fsh.*Line: 5 - 7\D*/s);
    });

    it('should emit a warning whenever multiple mixins are used', () => {
      const nameRule1 = new CaretValueRule('');
      nameRule1.caretPath = 'title';
      nameRule1.value = 'Wow fancy';
      mixin.rules.push(nameRule1);

      const mixin2 = new RuleSet('Baz');
      doc.ruleSets.set(mixin2.name, mixin2);
      const nameRule2 = new CaretValueRule('');
      nameRule2.caretPath = 'title';
      nameRule2.value = 'Wow fancier title';
      mixin2.rules.push(nameRule2);
      profile.mixins.push('Baz');

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      // mixins are still applied
      expect(sd.title).toBe('Wow fancier title');
      expect(loggerSpy.getLastMessage('warn')).toMatch(/Use of the "Mixins" keyword/);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/\* insert Bar.*insert Baz/s);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Profile\.fsh.*Line: 5 - 7\D*/s);
    });
  });

  describe('#insertRules', () => {
    let profile: Profile;
    let ruleSet: RuleSet;

    beforeEach(() => {
      profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      ruleSet = new RuleSet('Bar');
      doc.ruleSets.set(ruleSet.name, ruleSet);
    });

    it('should apply rules from an insert rule', () => {
      // RuleSet: Bar
      // * ^title = "Wow fancy"
      //
      // Profile: Foo
      // Parent: Observation
      // * insert Bar
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      ruleSet.rules.push(nameRule);

      const insertRule = new InsertRule();
      insertRule.ruleSet = 'Bar';
      profile.rules.push(insertRule);

      const exported = exporter.exportStructDef(profile);
      expect(exported.title).toBe('Wow fancy');
    });

    it('should log an error and not apply rules from an invalid insert rule', () => {
      // RuleSet: Bar
      // * #lion
      // * ^title = "Wow fancy"
      //
      // Profile: Foo
      // Parent: Observation
      // * insert Bar
      const concept = new ConceptRule('bear').withFile('Concept.fsh').withLocation([1, 2, 3, 4]);
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      ruleSet.rules.push(concept, nameRule);

      const insertRule = new InsertRule().withFile('Insert.fsh').withLocation([5, 6, 7, 8]);
      insertRule.ruleSet = 'Bar';
      profile.rules.push(insertRule);

      const exported = exporter.exportStructDef(profile);
      // CaretRule is still applied
      expect(exported.title).toBe('Wow fancy');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /ConceptRule.*Profile.*File: Concept\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Applied on Line: 5 - 7/s
      );
    });
  });
});
