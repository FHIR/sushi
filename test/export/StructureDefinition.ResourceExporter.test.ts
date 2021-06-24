import path from 'path';
import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { Resource } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';
import { AddElementRule, CardRule, ContainsRule, FlagRule } from '../../src/fshtypes/rules';

describe('ResourceExporter', () => {
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
    const exported = exporter.export().resources;
    expect(exported).toEqual([]);
  });

  it('should export a single resource', () => {
    const resource = new Resource('Foo');
    doc.resources.set(resource.name, resource);
    const exported = exporter.export().resources;
    expect(exported.length).toBe(1);
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

  it('should log an error when constraining a parent element', () => {
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

    const flagRule1 = new FlagRule('language')
      .withFile('ConstrainParent.fsh')
      .withLocation([6, 1, 6, 16]);
    flagRule1.summary = true;
    resource.rules.push(flagRule1);

    const cardRule1 = new CardRule('language')
      .withFile('ConstrainParent.fsh')
      .withLocation([7, 1, 7, 18]);
    cardRule1.min = 1;
    cardRule1.max = '1';
    resource.rules.push(cardRule1);

    const flagRule2 = new FlagRule('backboneProp.address');
    flagRule2.summary = true;
    resource.rules.push(flagRule2);

    const cardRule2 = new CardRule('backboneProp.address');
    cardRule2.min = 1;
    cardRule2.max = '100';
    resource.rules.push(cardRule2);

    doc.resources.set(resource.name, resource);

    const exported = exporter.export().resources[0];

    const logs = loggerSpy.getAllMessages('error');
    expect(logs).toHaveLength(2);
    logs.forEach(log => {
      expect(log).toMatch(
        /FHIR prohibits logical models and resources from constraining parent elements. Skipping.*at path 'language'.*File: ConstrainParent\.fsh.*Line:\D*/s
      );
    });

    expect(exported.name).toBe('MyTestResource');
    expect(exported.id).toBe('MyResource');
    expect(exported.type).toBe('MyResource');
    expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/DomainResource');
    expect(exported.elements).toHaveLength(12); // 9 AlternateIdentification elements + 3 added elements
  });
});
