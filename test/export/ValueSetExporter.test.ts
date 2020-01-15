import { ValueSetExporter } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import {
  FshValueSet,
  ValueSetFilterComponent,
  ValueSetConceptComponent,
  FshCode,
  VsOperator
} from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';

describe('ValueSetExporter', () => {
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: ValueSetExporter;

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    input = new FSHTank([doc], { name: 'test', version: '0.0.1', canonical: 'http://example.com' });
    exporter = new ValueSetExporter(input);
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
    expect(exported[0]).toEqual({
      name: 'BreakfastVS',
      id: 'BreakfastVS',
      status: 'active',
      url: 'http://example.com/ValueSet/BreakfastVS',
      version: '0.0.1'
    });
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
    expect(exported[0]).toEqual({
      name: 'BreakfastVS',
      id: 'BreakfastVS',
      status: 'active',
      title: 'Breakfast Values',
      description: 'A value set for breakfast items',
      url: 'http://example.com/ValueSet/BreakfastVS',
      version: '0.0.1'
    });
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
    component.from = { system: 'http://food.org/food' };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      name: 'DinnerVS',
      id: 'DinnerVS',
      status: 'active',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      compose: {
        include: [{ system: 'http://food.org/food' }]
      }
    });
  });

  it('should export a value set that includes a component from a value set', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = {
      valueSets: [
        'http://food.org/food/ValueSet/hot-food',
        'http://food.org/food/ValueSet/cold-food'
      ]
    };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            valueSet: [
              'http://food.org/food/ValueSet/hot-food',
              'http://food.org/food/ValueSet/cold-food'
            ]
          }
        ]
      }
    });
  });

  it('should export a value set that includes a concept component with at least one concept', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = { system: 'http://food.org/food' };
    component.concepts.push(
      new FshCode('Pizza', 'http://food.org/food', 'Delicious pizza to share.')
    );
    component.concepts.push(
      new FshCode('Salad', 'http://food.org/food', 'Plenty of fresh vegetables.')
    );
    component.concepts.push(new FshCode('Mulch', 'http://food.org/food'));
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://food.org/food',
            concept: [
              { code: 'Pizza', display: 'Delicious pizza to share.' },
              { code: 'Salad', display: 'Plenty of fresh vegetables.' },
              { code: 'Mulch' }
            ]
          }
        ]
      }
    });
  });

  it('should export a value set that includes a filter component with a regex filter', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    const component = new ValueSetFilterComponent(true);
    component.from = { system: 'http://food.org/food' };
    component.filters.push({
      property: 'display',
      operator: VsOperator.REGEX,
      value: /pancakes|flapjacks/
    });
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      id: 'BreakfastVS',
      name: 'BreakfastVS',
      url: 'http://example.com/ValueSet/BreakfastVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://food.org/food',
            filter: [
              {
                property: 'display',
                op: 'regex',
                value: 'pancakes|flapjacks'
              }
            ]
          }
        ]
      }
    });
  });

  it('should export a value set that includes a filter component with a code filter', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    const component = new ValueSetFilterComponent(true);
    component.from = { system: 'http://food.org/food' };
    component.filters.push({
      property: 'concept',
      operator: VsOperator.DESCENDENT_OF,
      value: new FshCode('Potatoes', 'http://food.org/food')
    });
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      id: 'BreakfastVS',
      name: 'BreakfastVS',
      url: 'http://example.com/ValueSet/BreakfastVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://food.org/food',
            filter: [
              {
                property: 'concept',
                op: 'descendent-of',
                value: 'Potatoes'
              }
            ]
          }
        ]
      }
    });
  });

  it('should export a value set that includes a filter component with a string filter', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    const component = new ValueSetFilterComponent(true);
    component.from = { system: 'http://food.org/food' };
    component.filters.push({
      property: 'version',
      operator: VsOperator.EQUALS,
      value: '3.0.0'
    });
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      id: 'BreakfastVS',
      name: 'BreakfastVS',
      url: 'http://example.com/ValueSet/BreakfastVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://food.org/food',
            filter: [
              {
                property: 'version',
                op: '=',
                value: '3.0.0'
              }
            ]
          }
        ]
      }
    });
  });

  it('should export a value set that excludes a component', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const includedComponent = new ValueSetFilterComponent(true);
    includedComponent.from = {
      system: 'http://food.org/food',
      valueSets: ['http://food.org/food/ValueSet/baked', 'http://food.org/food/ValueSet/grilled']
    };
    const excludedComponent = new ValueSetConceptComponent(false);
    excludedComponent.from = { system: 'http://food.org/food' };
    excludedComponent.concepts.push(
      new FshCode('Cake', 'http://food.org/food', 'A delicious treat for special occasions.')
    );
    valueSet.components.push(includedComponent);
    valueSet.components.push(excludedComponent);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://food.org/food',
            valueSet: [
              'http://food.org/food/ValueSet/baked',
              'http://food.org/food/ValueSet/grilled'
            ]
          }
        ],
        exclude: [
          {
            system: 'http://food.org/food',
            concept: [
              {
                code: 'Cake',
                display: 'A delicious treat for special occasions.'
              }
            ]
          }
        ]
      }
    });
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
