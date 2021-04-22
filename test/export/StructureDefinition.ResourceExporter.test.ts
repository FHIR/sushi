import path from 'path';
import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { Resource } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';
import { ContainsRule } from '../../src/fshtypes/rules';

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
    expect(loggerSpy.getLastMessage('error')).toMatch(/not of type Resource or DomainResource/s);
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
    const containsRule = new ContainsRule('extension')
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
      /Inline extensions should only be defined in Extensions/s
    );
  });
});
