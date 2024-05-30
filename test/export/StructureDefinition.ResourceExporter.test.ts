import path from 'path';
import { loadFromPath } from 'fhir-package-loader';
import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { FshCode, FshValueSet, Invariant, Profile, Resource } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';
import {
  AddElementRule,
  AssignmentRule,
  BindingRule,
  CardRule,
  CaretValueRule,
  ContainsRule,
  FlagRule,
  ObeysRule,
  OnlyRule
} from '../../src/fshtypes/rules';
import { StructureDefinition } from '../../src/fhirtypes';

describe('ResourceExporter', () => {
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
    const exported = exporter.export().resources;
    expect(exported).toEqual([]);
  });

  it('should export a single resource', () => {
    const resource = new Resource('Foo');
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
  });

  it('should add source info for the exported resource to the package', () => {
    const resource = new Resource('Tree').withFile('Treesource.fsh').withLocation([68, 4, 72, 15]);
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(pkg.fshMap.get('StructureDefinition-Tree.json')).toEqual({
      file: 'Treesource.fsh',
      location: {
        startLine: 68,
        startColumn: 4,
        endLine: 72,
        endColumn: 15
      },
      fshName: 'Tree',
      fshType: 'Resource'
    });
  });

  it('should export multiple resources', () => {
    const resourceFoo = new Resource('Foo');
    const resourceBar = new Resource('Bar');
    doc.resources.set(resourceFoo.name, resourceFoo);
    doc.resources.set(resourceBar.name, resourceBar);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(2);
  });

  it('should still export resources if one fails', () => {
    const resourceFoo = new Resource('Foo');
    resourceFoo.parent = 'Baz'; // invalid parent cause failure
    const resourceBar = new Resource('Bar');
    doc.resources.set(resourceFoo.name, resourceFoo);
    doc.resources.set(resourceBar.name, resourceBar);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Bar');
  });

  it('should export resource with Resource parent by id', () => {
    const resource = new Resource('Foo');
    resource.parent = 'Resource';
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Resource');
  });

  it('should export resource with Resource parent by url', () => {
    const resource = new Resource('Foo');
    resource.parent = 'http://hl7.org/fhir/StructureDefinition/Resource';
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Resource');
  });

  it('should export resource with DomainResource parent by id', () => {
    const resource = new Resource('Foo');
    resource.parent = 'DomainResource';
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].baseDefinition).toBe(
      'http://hl7.org/fhir/StructureDefinition/DomainResource'
    );
  });

  it('should export resource with DomainResource parent by url', () => {
    const resource = new Resource('Foo');
    resource.parent = 'http://hl7.org/fhir/StructureDefinition/DomainResource';
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].baseDefinition).toBe(
      'http://hl7.org/fhir/StructureDefinition/DomainResource'
    );
  });

  it('should export resource with DomainResource parent when parent not specified', () => {
    const resource = new Resource('Foo');
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Foo');
    expect(exported[0].baseDefinition).toBe(
      'http://hl7.org/fhir/StructureDefinition/DomainResource'
    );
  });

  it('should log an error with source information when the parent is invalid', () => {
    const resource = new Resource('BadParent')
      .withFile('BadParent.fsh')
      .withLocation([2, 9, 4, 23]);
    resource.parent = 'Basic';
    doc.resources.set(resource.name, resource);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadParent\.fsh.*Line: 2 - 4\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /The parent of a resource must be Resource or DomainResource./s
    );
  });

  it('should log an error with source information when the parent is not found', () => {
    const resource = new Resource('Bogus').withFile('Bogus.fsh').withLocation([2, 9, 4, 23]);
    resource.parent = 'BogusParent';
    doc.resources.set(resource.name, resource);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bogus\.fsh.*Line: 2 - 4\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/Parent BogusParent not found for Bogus/s);
  });

  it('should log an error when an inline extension is used', () => {
    const resource = new Resource('MyResource');
    const addElementRule = new AddElementRule('myExtension');
    addElementRule.min = 0;
    addElementRule.max = '*';
    addElementRule.types = [{ type: 'Extension' }];
    addElementRule.short = 'short definition';
    resource.rules.push(addElementRule);
    const containsRule = new ContainsRule('myExtension')
      .withFile('MyResource.fsh')
      .withLocation([3, 8, 3, 25]);
    containsRule.items.push({
      name: 'SomeExtension'
    });
    resource.rules.push(containsRule);
    doc.resources.set(resource.name, resource);
    exporter.export();

    expect(loggerSpy.getLastMessage('error')).toMatch(/File: MyResource\.fsh.*Line: 3\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Use of 'ContainsRule' is not permitted for 'Resource'/s
    );
  });

  it('should allow constraints on newly added elements and sub-elements', () => {
    const resource = new Resource('ExampleResource');
    resource.id = 'ExampleResource';

    const addElementRule = new AddElementRule('name');
    addElementRule.min = 0;
    addElementRule.max = '*';
    addElementRule.types = [{ type: 'HumanName' }];
    addElementRule.short = "A person's full name";
    resource.rules.push(addElementRule);

    const topLevelCardRule = new CardRule('name');
    topLevelCardRule.min = 1;
    topLevelCardRule.max = '1';
    resource.rules.push(topLevelCardRule);

    const subElementCardRule = new CardRule('name.given');
    subElementCardRule.min = 1;
    subElementCardRule.max = '1';
    resource.rules.push(subElementCardRule);

    doc.resources.set(resource.name, resource);
    exporter.export();
    const logs = loggerSpy.getAllMessages('error');
    expect(logs).toHaveLength(0);
  });

  it('should allow constraints on root elements', () => {
    const resource = new Resource('ExampleResource');
    resource.id = 'ExampleResource';

    const rootElementRule = new CaretValueRule('.');
    rootElementRule.caretPath = 'alias';
    rootElementRule.value = 'ExampleAlias';

    resource.rules.push(rootElementRule);

    doc.resources.set(resource.name, resource);
    exporter.export();
    const logs = loggerSpy.getAllMessages('error');
    expect(logs).toHaveLength(0);
  });

  it('should allow constraints on inherited elements', () => {
    const resource = new Resource('MyTestResource');
    // Parent defaults to DomainResource
    resource.id = 'MyResource';

    const addElementRule1 = new AddElementRule('backboneProp');
    addElementRule1.min = 0;
    addElementRule1.max = '*';
    addElementRule1.types = [{ type: 'BackboneElement' }];
    addElementRule1.short = 'short of backboneProp';
    resource.rules.push(addElementRule1);

    const addElementRule2 = new AddElementRule('backboneProp.name');
    addElementRule2.min = 1;
    addElementRule2.max = '1';
    addElementRule2.types = [{ type: 'HumanName' }];
    addElementRule2.short = 'short of backboneProp.name';
    resource.rules.push(addElementRule2);

    const addElementRule3 = new AddElementRule('backboneProp.address');
    addElementRule3.min = 0;
    addElementRule3.max = '*';
    addElementRule3.types = [{ type: 'Address' }];
    addElementRule3.short = 'short of backboneProp.address';
    resource.rules.push(addElementRule3);

    // FlagRule
    const flagRule1 = new FlagRule('extension');
    flagRule1.summary = true;
    resource.rules.push(flagRule1);

    // CardRule
    const cardRule1 = new CardRule('extension');
    cardRule1.min = 1;
    cardRule1.max = '1';
    resource.rules.push(cardRule1);

    // OnlyRule
    const profiledMeta = new Profile('MyMetaProfile');
    profiledMeta.parent = 'Meta';
    doc.profiles.set(profiledMeta.name, profiledMeta);
    const onlyRule = new OnlyRule('meta');
    onlyRule.types = [{ type: profiledMeta.name }];
    resource.rules.push(onlyRule);

    // BindingRule
    const myValueSet = new FshValueSet('MyValueSet');
    doc.valueSets.set(myValueSet.name, myValueSet);
    const bindingRule = new BindingRule('language');
    bindingRule.valueSet = myValueSet.name;
    bindingRule.strength = 'required';
    resource.rules.push(bindingRule);

    // AssignmentRule
    const assignmentRule = new AssignmentRule('text.status');
    assignmentRule.value = new FshCode('additional');
    assignmentRule.exactly = true;
    resource.rules.push(assignmentRule);

    // ObeysRule
    const myInvariant = new Invariant('MyInvariant');
    myInvariant.severity = new FshCode('error');
    myInvariant.description = 'Has a Patient';
    doc.invariants.set(myInvariant.name, myInvariant);
    const obeysRule = new ObeysRule('contained');
    obeysRule.invariant = myInvariant.name;
    resource.rules.push(obeysRule);

    // CaretValueRule
    const caretRule = new CaretValueRule('implicitRules');
    caretRule.caretPath = 'comment';
    caretRule.value = 'Not explicit';
    resource.rules.push(caretRule);

    const flagRule2 = new FlagRule('backboneProp.address');
    flagRule2.summary = true;
    resource.rules.push(flagRule2);

    const cardRule2 = new CardRule('backboneProp.address');
    cardRule2.min = 1;
    cardRule2.max = '100';
    resource.rules.push(cardRule2);

    doc.resources.set(resource.name, resource);

    const exported = exporter.export().resources[0];

    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);

    expect(exported.name).toBe('MyTestResource');
    expect(exported.id).toBe('MyResource');
    expect(exported.type).toBe('MyResource');
    expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/DomainResource');

    // FlagRule
    const extension = exported.findElement('MyResource.extension');
    expect(extension.isSummary).toBeTrue();

    // CardRule
    expect(extension.min).toBe(1);
    expect(extension.max).toBe('1');

    // OnlyRule
    const meta = exported.findElement('MyResource.meta');
    expect(meta.type[0].code).toBe('Meta');
    expect(meta.type[0].profile).toEqual([
      'http://hl7.org/fhir/us/minimal/StructureDefinition/MyMetaProfile'
    ]);

    // BindingRule
    const language = exported.findElement('MyResource.language');
    expect(language.binding.valueSet).toBe('http://hl7.org/fhir/us/minimal/ValueSet/MyValueSet');
    expect(language.binding.strength).toBe('required');

    // AssignmentRule
    const textStatus = exported.findElement('MyResource.text.status');
    expect(textStatus.fixedCode).toBe('additional');

    // ObeysRule
    const contained = exported.findElement('MyResource.contained');
    expect(contained.constraint[0].key).toBe('MyInvariant');
    expect(contained.constraint[0].severity).toBe('error');
    expect(contained.constraint[0].human).toBe('Has a Patient');

    // CaretValueRule
    const implicitRules = exported.findElement('MyResource.implicitRules');
    expect(implicitRules.comment).toBe('Not explicit');

    expect(exported.elements).toHaveLength(16); // 9 DomainResource elements + + 4 expanded Narrative elements + 3 added elements
  });

  it('should log an error when slicing an inherited element', () => {
    const resource = new Resource('MyResource');
    // Parent defaults to DomainResource
    const containsRule = new ContainsRule('contained')
      .withFile('MyResource.fsh')
      .withLocation([3, 8, 3, 25]);
    containsRule.items.push({
      name: 'conditions'
    });
    resource.rules.push(containsRule);
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources[0];

    expect(loggerSpy.getLastMessage('error')).toMatch(/File: MyResource\.fsh.*Line: 3\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Use of 'ContainsRule' is not permitted for 'Resource'/s
    );
    const contained = exported.findElement('MyResource.contained');
    expect(contained.slicing).toBeUndefined();
  });

  it('should log an error when adding an element with the same path as an inherited element', () => {
    const resource = new Resource('MyResource');
    const addElementRule = new AddElementRule('extension');
    addElementRule.min = 0;
    addElementRule.max = '1';
    resource.rules.push(addElementRule);
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;

    expect(exported.length).toBe(1);
    expect(exported[0].elements.filter(r => r.id === 'MyResource.extension')).toHaveLength(1);

    expect(exported[0].name).toBe('MyResource');
    expect(exported[0].id).toBe('MyResource');
    expect(exported[0].type).toBe('MyResource');
    expect(exported[0].baseDefinition).toBe(
      'http://hl7.org/fhir/StructureDefinition/DomainResource'
    );
    expect(exported[0].elements).toHaveLength(9);

    expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      `Cannot define element ${addElementRule.path} on ${resource.name} because it has already been defined`
    );
  });

  it('should log an error when two rules add a new element with the same path', () => {
    const resource = new Resource('MyResource');
    const addElementRule = new AddElementRule('testElement');
    addElementRule.min = 0;
    addElementRule.max = '1';
    const addElementRule2 = new AddElementRule('testElement');
    addElementRule2.min = 0;
    addElementRule2.max = '1';
    resource.rules.push(addElementRule);
    resource.rules.push(addElementRule2);
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;

    expect(exported.length).toBe(1);
    expect(exported[0].elements.filter(r => r.id === 'MyResource.testElement')).toHaveLength(1);

    expect(exported[0].name).toBe('MyResource');
    expect(exported[0].id).toBe('MyResource');
    expect(exported[0].type).toBe('MyResource');
    expect(exported[0].baseDefinition).toBe(
      'http://hl7.org/fhir/StructureDefinition/DomainResource'
    );
    expect(exported[0].elements).toHaveLength(10);

    expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      `Cannot define element ${addElementRule.path} on ${resource.name} because it has already been defined`
    );
  });

  it('should log an error when a rule with the same path is added by directly calling newElement', () => {
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    pkg = new Package(input.config);
    const fisher = new TestFisher(input, defs, pkg);
    const alternateIdentification: StructureDefinition = fisher.fishForStructureDefinition(
      'AlternateIdentification'
    ) as StructureDefinition;

    const addElementRule = new AddElementRule('elem1');
    addElementRule.min = 0;
    addElementRule.max = '1';
    const addElementRule2 = new AddElementRule('elem1');
    addElementRule2.min = 0;
    addElementRule2.max = '1';
    alternateIdentification.newElement(addElementRule.path);
    expect(() => {
      alternateIdentification.newElement(addElementRule2.path);
    }).toThrow(
      'Cannot define element elem1 on AlternateIdentification because it has already been defined'
    );
  });

  it('should not log a warning when exporting a conformant resource', () => {
    const resource = new Resource('Foo');
    const caretRule = new CaretValueRule('');
    caretRule.caretPath = 'url';
    caretRule.value = 'http://hl7.org/fhir/StructureDefinition/Foo';
    resource.rules.push(caretRule);
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
  });

  it('should log a warning when exporting a non-conformant resource', () => {
    const resource = new Resource('Foo');
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(loggerSpy.getLastMessage('warn')).toMatch(/non-conformant Resource.*- Foo/s);
  });

  it('should log a warning when exporting a multiple non-conformant resources', () => {
    const resource1 = new Resource('Foo');
    const resource2 = new Resource('Bar');
    doc.resources.set(resource1.name, resource1);
    doc.resources.set(resource2.name, resource2);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(2);
    expect(loggerSpy.getLastMessage('warn')).toMatch(/non-conformant Resource.*- Foo.*- Bar/s);
  });

  it('should log a warning and truncate the name when exporting a non-conformant resource with a long name', () => {
    const resource = new Resource(
      'SupercalifragilisticexpialidociousIsSurprisinglyNotEvenLongEnoughOnItsOwn'
    );
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /non-conformant Resource.*- SupercalifragilisticexpialidociousIsSurprisinglyNotEvenLon\.\.\./s
    );
  });

  it('should create Resource root element with short equal to title if short not available AND definition equal to description if definition not available', () => {
    const resource = new Resource('MyTestModel');
    resource.id = 'MyModel';
    resource.title = 'MyTestModel title is here';
    resource.description = 'MyTestModel description is here';

    doc.resources.set(resource.name, resource);
    exporter.exportStructDef(resource);
    const exported = pkg.resources[0];

    expect(exported.elements[0].short).toBe(resource.title);
    expect(exported.elements[0].definition).toBe(resource.description);
  });

  it('should create Resource root element with short equal to name if short and title not available AND definition equal to name if description and definition not available', () => {
    const resource = new Resource('MyTestModel');
    resource.id = 'MyModel';

    doc.resources.set(resource.name, resource);
    exporter.exportStructDef(resource);
    const exported = pkg.resources[0];

    expect(exported.elements[0].short).toBe(resource.name);
    expect(exported.elements[0].definition).toBe(resource.name);
  });

  it('should create Resource root element with short equal to title if short not available AND definition equal to short if description and definition not available', () => {
    const resource = new Resource('MyTestModel');
    resource.id = 'MyModel';
    resource.title = 'MyTestModel title is here';

    doc.resources.set(resource.name, resource);
    exporter.exportStructDef(resource);
    const exported = pkg.resources[0];

    expect(exported.elements[0].short).toBe(resource.title);
    expect(exported.elements[0].definition).toBe(exported.elements[0].short);
  });
});
