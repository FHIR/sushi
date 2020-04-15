import { ValueSetExporter, Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import {
  FshValueSet,
  ValueSetFilterComponent,
  ValueSetConceptComponent,
  FshCode,
  VsOperator,
  FshCodeSystem,
  ValueSetComponent
} from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import path from 'path';
import { CaretValueRule } from '../../src/fshtypes/rules';

describe('ValueSetExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
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
    const input = new FSHTank([doc], {
      name: 'test',
      version: '0.0.1',
      canonical: 'http://example.com'
    });
    const pkg = new Package(input.packageJSON);
    const fisher = new TestFisher(input, defs, pkg);
    exporter = new ValueSetExporter(input, pkg, fisher);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export().valueSets;
    expect(exported).toEqual([]);
  });

  it('should export a single value set', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
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
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(2);
  });

  it('should export a value set with additional metadata', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    valueSet.title = 'Breakfast Values';
    valueSet.description = 'A value set for breakfast items';
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      name: 'BreakfastVS',
      id: 'BreakfastVS',
      status: 'active',
      title: 'Breakfast Values',
      description: 'A value set for breakfast items',
      url: 'http://example.com/ValueSet/BreakfastVS',
      version: '0.0.1'
    });
  });

  it('should log a message when the value set has an invalid id', () => {
    const valueSet = new FshValueSet('BreakfastVS')
      .withFile('Breakfast.fsh')
      .withLocation([3, 7, 7, 12]);
    valueSet.id = 'Delicious!';
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0].id).toBe('Delicious!');
    expect(loggerSpy.getLastMessage('error')).toMatch(/does not represent a valid FHIR id/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Breakfast\.fsh.*Line: 3 - 7\D*/s);
  });

  it('should log a message when the value set has an invalid name', () => {
    const valueSet = new FshValueSet('All-you-can-eat')
      .withFile('Breakfast.fsh')
      .withLocation([2, 4, 8, 23]);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('All-you-can-eat');
    expect(loggerSpy.getLastMessage('error')).toMatch(/does not represent a valid FHIR name/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Breakfast\.fsh.*Line: 2 - 8\D*/s);
  });

  it('should export each value set once, even if export is called more than once', () => {
    const breakfast = new FshValueSet('BreakfastVS');
    doc.valueSets.set(breakfast.name, breakfast);
    let exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
  });

  it('should export a value set that includes a component from a system', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = { system: 'http://food.org/food' };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
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

  it('should export a value set that includes a component from a named system', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = { system: 'FoodCS' };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const foodCS = new FshCodeSystem('FoodCS');
    foodCS.id = 'food';
    doc.codeSystems.set(foodCS.name, foodCS);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      name: 'DinnerVS',
      id: 'DinnerVS',
      status: 'active',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      compose: {
        include: [{ system: 'http://example.com/CodeSystem/food' }]
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
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
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

  it('should export a value set that includes a component from a value set with a version', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = {
      valueSets: ['http://food.org/food/ValueSet/hot-food|1.2.3']
    };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            valueSet: ['http://food.org/food/ValueSet/hot-food|1.2.3']
          }
        ]
      }
    });
  });

  it('should export a value set that includes a component from a named value set', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponent(true);
    component.from = {
      valueSets: ['HotFoodVS', 'ColdFoodVS']
    };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const hotFoodVS = new FshValueSet('HotFoodVS');
    hotFoodVS.id = 'hot-food';
    doc.valueSets.set(hotFoodVS.name, hotFoodVS);
    const coldFoodVS = new FshValueSet('ColdFoodVS');
    coldFoodVS.id = 'cold-food';
    doc.valueSets.set(coldFoodVS.name, coldFoodVS);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(3);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            valueSet: [
              'http://example.com/ValueSet/hot-food',
              'http://example.com/ValueSet/cold-food'
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
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
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

  it('should export a value set that includes a concept component where the concept system includes a version', () => {
    const valueSet = new FshValueSet('BreakfastVS');
    const toastComponent = new ValueSetConceptComponent(true);
    toastComponent.from = { system: 'http://food.org/food|2.0.1' };
    toastComponent.concepts.push(new FshCode('Toast', 'http://food.org/food|2.0.1'));
    valueSet.components.push(toastComponent);
    const juiceComponent = new ValueSetConceptComponent(true);
    juiceComponent.from = { system: 'http://food.org/beverage|1.1|x' };
    juiceComponent.concepts.push(new FshCode('Orange juice', 'http://food.org/beverage|1.1|x'));
    valueSet.components.push(juiceComponent);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'BreakfastVS',
      name: 'BreakfastVS',
      url: 'http://example.com/ValueSet/BreakfastVS',
      version: '0.0.1',
      status: 'active',
      compose: {
        include: [
          {
            system: 'http://food.org/food',
            concept: [{ code: 'Toast' }],
            version: '2.0.1'
          },
          {
            system: 'http://food.org/beverage',
            concept: [{ code: 'Orange juice' }],
            version: '1.1|x'
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
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
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
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
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
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
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
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
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
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Breakfast\.fsh.*Line: 2 - 4\D*/s);
  });

  it('should log a message when a value set from system is not a URI', () => {
    const valueSet = new FshValueSet('BreakfastVS')
      .withFile('Breakfast.fsh')
      .withLocation([2, 8, 4, 25]);
    const component = new ValueSetComponent(true);
    component.from = { system: 'notAUri' };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /notAUri.*File: Breakfast\.fsh.*Line: 2 - 4\D*/s
    );
  });

  it('should log a message when a value set from is not a URI', () => {
    const valueSet = new FshValueSet('BreakfastVS')
      .withFile('Breakfast.fsh')
      .withLocation([2, 8, 4, 25]);
    const component = new ValueSetComponent(true);
    component.from = { valueSets: ['notAUri'] };
    valueSet.components.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /notAUri.*File: Breakfast\.fsh.*Line: 2 - 4\D*/s
    );
  });
  // CaretValueRules
  it('should apply a CaretValueRule', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const rule = new CaretValueRule('');
    rule.caretPath = 'publisher';
    rule.value = 'Carrots';
    valueSet.rules.push(rule);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      status: 'active',
      publisher: 'Carrots'
    });
  });

  it('should log a message when applying invalid CaretValueRule', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const rule = new CaretValueRule('').withFile('InvalidValue.fsh').withLocation([6, 3, 6, 12]);
    rule.caretPath = 'publisherz';
    rule.value = true;
    valueSet.rules.push(rule);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://example.com/ValueSet/DinnerVS',
      version: '0.0.1',
      status: 'active'
    });
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: InvalidValue\.fsh.*Line: 6\D*/s);
  });

  it('should use the url specified in a CaretValueRule when referencing a named value set', () => {
    const lunchVS = new FshValueSet('LunchVS');
    const lunchFilterComponent = new ValueSetFilterComponent(true);
    lunchFilterComponent.from = {
      valueSets: ['SandwichVS']
    };
    lunchVS.components.push(lunchFilterComponent);

    const sandwichVS = new FshValueSet('SandwichVS');
    const sandwichRule = new CaretValueRule('');
    sandwichRule.caretPath = 'url';
    sandwichRule.value = 'http://sandwich.org/ValueSet/SandwichVS';
    sandwichVS.rules.push(sandwichRule);

    doc.valueSets.set(lunchVS.name, lunchVS);
    doc.valueSets.set(sandwichVS.name, sandwichVS);

    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(2);
    expect(exported[0].compose.include[0].valueSet[0]).toBe(
      'http://sandwich.org/ValueSet/SandwichVS'
    );
  });

  it('should use the url specified in a CaretValueRule when referencing a named code system', () => {
    const lunchVS = new FshValueSet('LunchVS');
    const lunchFilterComponent = new ValueSetFilterComponent(true);
    lunchFilterComponent.from = {
      system: 'FoodCS'
    };
    lunchVS.components.push(lunchFilterComponent);

    const foodCS = new FshCodeSystem('FoodCS');
    const foodRule = new CaretValueRule('');
    foodRule.caretPath = 'url';
    foodRule.value = 'http://food.net/CodeSystem/FoodCS';
    foodCS.rules.push(foodRule);

    doc.valueSets.set(lunchVS.name, lunchVS);
    doc.codeSystems.set(foodCS.name, foodCS);

    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0].compose.include[0].system).toBe('http://food.net/CodeSystem/FoodCS');
  });
});
