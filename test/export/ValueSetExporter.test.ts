import { ValueSetExporter } from '../../src/export';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { FSHDocument, FSHTank } from '../../src/import';
import path from 'path';
import {
  FshValueSet,
  ValueSetFilterComponent,
  ValueSetConceptComponent,
  FshCode,
  VsProperty,
  VsOperator
} from '../../src/fshtypes';
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
    expect(exported[0].name).toBe('BreakfastVS');
    expect(exported[0].id).toBe('BreakfastVS');
    expect(exported[0].title).toBeUndefined();
    expect(exported[0].description).toBeUndefined();
    expect(exported[0].url).toBe('http://example.com/ValueSet/BreakfastVS');
  });

  it('should export multiple value sets', () => {
    const breakfast = new FshValueSet('BreakfastVS');
    const lunch = new FshValueSet('LunchVS');
    doc.valueSets.set(breakfast.name, breakfast);
    doc.valueSets.set(lunch.name, lunch);
    const exported = exporter.export();
    expect(exported.length).toBe(2);
  });

  it('should export a value set with additional metadata', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    valueSet.title = 'Breakfast Values';
    valueSet.description = 'A value set for breakfast items';
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('BreakfastVS');
    expect(exported[0].id).toBe('BreakfastVS');
    expect(exported[0].title).toBe('Breakfast Values');
    expect(exported[0].description).toBe('A value set for breakfast items');
    expect(exported[0].url).toBe('http://example.com/ValueSet/BreakfastVS');
  });

  it('should export each value set once, even if export is called more than once', () => {
    const breakfast = new FshValueSet('BreakfastVS');
    doc.valueSets.set(breakfast.name, breakfast);
    let exported = exporter.export();
    expect(exported.length).toBe(1);
    exported = exporter.export();
    expect(exported.length).toBe(1);
  });

  it('should export a value set that includes a component from a system', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = { system: 'FOOD' };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].compose.include.length).toBe(1);
    expect(exported[0].compose.include[0].system).toBe('FOOD');
  });

  it('should export a value set that includes a component from a value set', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = { valueSets: ['HotFoodVS', 'ColdFoodVS'] };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].compose.include.length).toBe(1);
    expect(exported[0].compose.include[0].valueSet).toEqual(['HotFoodVS', 'ColdFoodVS']);
  });

  it('should export a value set that includes a concept component with at least one concept', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = { system: 'FOOD' };
    component.concepts.push(new FshCode('Pizza', 'FOOD', 'Delicious pizza to share.'));
    component.concepts.push(new FshCode('Salad', 'FOOD', 'Plenty of fresh vegetables.'));
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].compose.include.length).toBe(1);
    expect(exported[0].compose.include[0].system).toBe('FOOD');
    expect(exported[0].compose.include[0].concept.length).toBe(2);
    expect(exported[0].compose.include[0].concept[0].code).toBe('Pizza');
    expect(exported[0].compose.include[0].concept[0].display).toBe('Delicious pizza to share.');
    expect(exported[0].compose.include[0].concept[1].code).toBe('Salad');
    expect(exported[0].compose.include[0].concept[1].display).toBe('Plenty of fresh vegetables.');
  });

  it('should export a value set that includes a filter component with a regex filter', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    const component = new ValueSetFilterComponent(true);
    component.from = { system: 'FOOD' };
    component.filters.push({
      property: VsProperty.DISPLAY,
      operator: VsOperator.REGEX,
      value: /pancakes|flapjacks/
    });
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].compose.include.length).toBe(1);
    expect(exported[0].compose.include[0].system).toBe('FOOD');
    expect(exported[0].compose.include[0].filter.length).toBe(1);
    expect(exported[0].compose.include[0].filter[0].property).toBe('display');
    expect(exported[0].compose.include[0].filter[0].op).toBe('regex');
    expect(exported[0].compose.include[0].filter[0].value).toBe('pancakes|flapjacks');
  });

  it('should export a value set that includes a filter component with a code filter', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    const component = new ValueSetFilterComponent(true);
    component.from = { system: 'FOOD' };
    component.filters.push({
      property: VsProperty.CODE,
      operator: VsOperator.DESCENDENT_OF,
      value: new FshCode('Potatoes', 'FOOD')
    });
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].compose.include.length).toBe(1);
    expect(exported[0].compose.include[0].system).toBe('FOOD');
    expect(exported[0].compose.include[0].filter.length).toBe(1);
    expect(exported[0].compose.include[0].filter[0].property).toBe('code');
    expect(exported[0].compose.include[0].filter[0].op).toBe('descendent-of');
    expect(exported[0].compose.include[0].filter[0].value).toBe('FOOD#Potatoes');
  });

  it('should export a value set that includes a filter component with a string filter', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    const component = new ValueSetFilterComponent(true);
    component.from = { system: 'FOOD' };
    component.filters.push({
      property: VsProperty.VERSION,
      operator: VsOperator.EQUALS,
      value: '3.0.0'
    });
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].compose.include.length).toBe(1);
    expect(exported[0].compose.include[0].system).toBe('FOOD');
    expect(exported[0].compose.include[0].filter.length).toBe(1);
    expect(exported[0].compose.include[0].filter[0].property).toBe('version');
    expect(exported[0].compose.include[0].filter[0].op).toBe('=');
    expect(exported[0].compose.include[0].filter[0].value).toBe('3.0.0');
  });

  it('should export a value set that excludes a component', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const includedComponent = new ValueSetFilterComponent(true);
    includedComponent.from = { system: 'FOOD', valueSets: ['BakedVS', 'GrilledVS'] };
    const excludedComponent = new ValueSetConceptComponent(false);
    excludedComponent.from = { system: 'FOOD' };
    excludedComponent.concepts.push(
      new FshCode('Cake', 'FOOD', 'A delicious treat for special occasions.')
    );
    valueSet.components.push(includedComponent);
    valueSet.components.push(excludedComponent);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].compose.include.length).toBe(1);
    expect(exported[0].compose.include[0].system).toBe('FOOD');
    expect(exported[0].compose.include[0].valueSet).toEqual(['BakedVS', 'GrilledVS']);
    expect(exported[0].compose.exclude.length).toBe(1);
    expect(exported[0].compose.exclude[0].system).toBe('FOOD');
    expect(exported[0].compose.exclude[0].concept.length).toBe(1);
    expect(exported[0].compose.exclude[0].concept[0].code).toBe('Cake');
    expect(exported[0].compose.exclude[0].concept[0].display).toBe(
      'A delicious treat for special occasions.'
    );
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
    expect(loggerSpy.getLastMessage()).toMatch(/File: Breakfast\.fsh.*Line: 2 - 4\D/s);
  });
});
