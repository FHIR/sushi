import { ValueSetExporter } from '../../src/export';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { FSHDocument, FSHTank } from '../../src/import';
import path from 'path';
import { FshValueSet, ValueSetFilterComponent } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';

describe('ValueSetExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: ValueSetExporter;

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
    input = new FSHTank([doc], { name: 'test', version: '0.0.1', canonical: 'http://example.com' });
    exporter = new ValueSetExporter(defs, input);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export();
    expect(exported).toEqual([]);
  });

  it('should export a single value set', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
  });

  it('should export multiple value sets', () => {
    const breakfast = new FshValueSet('BreakfastVS');
    const lunch = new FshValueSet('LunchVS');
    doc.valueSets.set(breakfast.name, breakfast);
    doc.valueSets.set(lunch.name, lunch);
    const exported = exporter.export();
    expect(exported.length).toBe(2);
  });

  it('should log a message when a value set has a logical definition without inclusions', () => {
    const valueSet = new FshValueSet('BreakfastVS')
      .withFile('Breakfast.fsh')
      .withLocation([2, 8, 4, 25]);
    const candyFilter = new ValueSetFilterComponent(false);
    candyFilter.from = { valueSets: ['CandyVS'] };
    valueSet.components.push(candyFilter);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(0);
    expect(loggerSpy.getLastMessage()).toMatch(/File: Breakfast\.fsh.*Line: 2\D/s);
  });
});
