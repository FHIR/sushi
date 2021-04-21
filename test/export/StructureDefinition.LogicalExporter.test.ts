import path from 'path';
import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { Logical } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';
import { ContainsRule } from '../../src/fshtypes/rules';

describe('LogicalExporter', () => {
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
    const exported = exporter.export().logicals;
    expect(exported).toEqual([]);
  });

  it('should export a single logical model', () => {
    const logical = new Logical('Foo');
    doc.logicals.set(logical.name, logical);
    const exported = exporter.export().logicals;
    expect(exported.length).toBe(1);
  });

  it('should export multiple logical models', () => {
    const logicalFoo = new Logical('Foo');
    const logicalBar = new Logical('Bar');
    doc.logicals.set(logicalFoo.name, logicalFoo);
    doc.logicals.set(logicalBar.name, logicalBar);
    const exported = exporter.export().logicals;
    expect(exported.length).toBe(2);
  });

  it('should still export logical models if one fails', () => {
    const logicalFoo = new Logical('Foo');
    logicalFoo.parent = 'Baz'; // invalid parent cause failure
    const logicalBar = new Logical('Bar');
    doc.logicals.set(logicalFoo.name, logicalFoo);
    doc.logicals.set(logicalBar.name, logicalBar);
    const exported = exporter.export().logicals;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Bar');
  });

  it('should log an error with source information when the parent is invalid', () => {
    const logical = new Logical('BadParent').withFile('BadParent.fsh').withLocation([2, 9, 4, 23]);
    logical.parent = 'Basic';
    doc.logicals.set(logical.name, logical);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadParent\.fsh.*Line: 2 - 4\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/is not of type Logical/s);
  });

  it('should log an error with source information when the parent is not found', () => {
    const logical = new Logical('Bogus').withFile('Bogus.fsh').withLocation([2, 9, 4, 23]);
    logical.parent = 'BogusParent';
    doc.logicals.set(logical.name, logical);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bogus\.fsh.*Line: 2 - 4\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/Parent BogusParent not found for Bogus/s);
  });

  it('should export logical models with FSHy parents', () => {
    const logicalFoo = new Logical('Foo');
    const logicalBar = new Logical('Bar');
    logicalBar.parent = 'Foo';
    doc.logicals.set(logicalFoo.name, logicalFoo);
    doc.logicals.set(logicalBar.name, logicalBar);
    const exported = exporter.export().logicals;
    expect(exported.length).toBe(2);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[1].baseDefinition === exported[0].url);
  });

  it('should export logical models with the same FSHy parents', () => {
    const logicalFoo = new Logical('Foo');
    const logicalBar = new Logical('Bar');
    logicalBar.parent = 'Foo';
    const logicalBaz = new Logical('Baz');
    logicalBaz.parent = 'Foo';
    doc.logicals.set(logicalFoo.name, logicalFoo);
    doc.logicals.set(logicalBar.name, logicalBar);
    doc.logicals.set(logicalBaz.name, logicalBaz);
    const exported = exporter.export().logicals;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[0].url);
  });

  it('should export logical models with deep FSHy parents', () => {
    const logicalFoo = new Logical('Foo');
    const logicalBar = new Logical('Bar');
    logicalBar.parent = 'Foo';
    const logicalBaz = new Logical('Baz');
    logicalBaz.parent = 'Bar';
    doc.logicals.set(logicalFoo.name, logicalFoo);
    doc.logicals.set(logicalBar.name, logicalBar);
    doc.logicals.set(logicalBaz.name, logicalBaz);
    const exported = exporter.export().logicals;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[1].url);
  });

  it('should export logical models with out-of-order FSHy parents', () => {
    const logicalFoo = new Logical('Foo');
    logicalFoo.parent = 'Bar';
    const logicalBar = new Logical('Bar');
    logicalBar.parent = 'Baz';
    const logicalBaz = new Logical('Baz');
    doc.logicals.set(logicalFoo.name, logicalFoo);
    doc.logicals.set(logicalBar.name, logicalBar);
    doc.logicals.set(logicalBaz.name, logicalBaz);
    const exported = exporter.export().logicals;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Baz');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Foo');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[1].url);
  });

  it('should log an error when an inline extension is used', () => {
    const logical = new Logical('MyModel');
    logical.parent = 'Element';
    const containsRule = new ContainsRule('extension')
      .withFile('MyModel.fsh')
      .withLocation([3, 8, 3, 25]);
    containsRule.items.push({
      name: 'SomeExtension'
    });
    logical.rules.push(containsRule);
    doc.logicals.set(logical.name, logical);
    exporter.export();

    expect(loggerSpy.getLastMessage('error')).toMatch(/File: MyModel\.fsh.*Line: 3\D*/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Inline extensions should only be defined in Extensions/s
    );
  });
});
