import { ValueSetExporter, Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { FshValueSet, FshCode, VsOperator, FshCodeSystem, RuleSet } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import path from 'path';
import {
  CaretValueRule,
  InsertRule,
  AssignmentRule,
  ValueSetComponentRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule
} from '../../src/fshtypes/rules';
import { minimalConfig } from '../utils/minimalConfig';
import { ValueSetExpansionContains } from '../../src/fhirtypes/ValueSet';
import { readFileSync } from 'fs-extra';

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
    const input = new FSHTank([doc], minimalConfig);
    const pkg = new Package(input.config);
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
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/BreakfastVS',
      version: '1.0.0'
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
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/BreakfastVS',
      version: '1.0.0'
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
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /may not be suitable for machine processing applications such as code generation/s
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Breakfast\.fsh.*Line: 2 - 8\D*/s);
  });

  it('should sanitize the id and log a message when a valid name is used to make an invalid id', () => {
    const valueSet = new FshValueSet('Not_good_id')
      .withFile('Wrong.fsh')
      .withLocation([2, 8, 5, 18]);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported[0].name).toBe('Not_good_id');
    expect(exported[0].id).toBe('Not-good-id');
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /The string "Not_good_id" represents a valid FHIR name but not a valid FHIR id.*The id will be exported as "Not-good-id"/s
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
  });

  it('should sanitize the id and log a message when a long valid name is used to make an invalid id', () => {
    let longId = 'Toolong';
    while (longId.length < 65) longId += 'longer';
    const valueSet = new FshValueSet(longId).withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    const expectedId = longId.slice(0, 64);
    expect(exported[0].name).toBe(longId);
    expect(exported[0].id).toBe(expectedId);
    const warning = new RegExp(
      `The string "${longId}" represents a valid FHIR name but not a valid FHIR id.*The id will be exported as "${expectedId}"`,
      's'
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(warning);
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
  });
  it('should log an error when multiple value sets have the same id', () => {
    const firstValueSet = new FshValueSet('FirstVS')
      .withFile('ValueSets.fsh')
      .withLocation([2, 8, 5, 15]);
    firstValueSet.id = 'my-value-set';
    const secondValueSet = new FshValueSet('SecondVS')
      .withFile('ValueSets.fsh')
      .withLocation([7, 8, 9, 19]);
    secondValueSet.id = 'my-value-set';
    doc.valueSets.set(firstValueSet.name, firstValueSet);
    doc.valueSets.set(secondValueSet.name, secondValueSet);

    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(2);
    expect(loggerSpy.getLastMessage('error')).toMatch(/Multiple value sets with id my-value-set/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: ValueSets\.fsh.*Line: 7 - 9\D*/s);
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
    const component = new ValueSetConceptComponentRule(true);
    component.from = { system: 'http://food.org/food' };
    valueSet.rules.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      name: 'DinnerVS',
      id: 'DinnerVS',
      status: 'active',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
      compose: {
        include: [{ system: 'http://food.org/food' }]
      }
    });
  });

  it('should export a value set that includes a component from a named system', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponentRule(true);
    component.from = { system: 'FoodCS' };
    valueSet.rules.push(component);
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
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
      compose: {
        include: [{ system: 'http://hl7.org/fhir/us/minimal/CodeSystem/food' }]
      }
    });
  });

  it('should export a value set that includes a component from a value set', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponentRule(true);
    component.from = {
      valueSets: [
        'http://food.org/food/ValueSet/hot-food',
        'http://food.org/food/ValueSet/cold-food'
      ]
    };
    valueSet.rules.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
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
    const component = new ValueSetConceptComponentRule(true);
    component.from = {
      valueSets: ['http://food.org/food/ValueSet/hot-food|1.2.3']
    };
    valueSet.rules.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
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
    const component = new ValueSetConceptComponentRule(true);
    component.from = {
      valueSets: ['HotFoodVS', 'ColdFoodVS']
    };
    valueSet.rules.push(component);
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
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
      status: 'active',
      compose: {
        include: [
          {
            valueSet: [
              'http://hl7.org/fhir/us/minimal/ValueSet/hot-food',
              'http://hl7.org/fhir/us/minimal/ValueSet/cold-food'
            ]
          }
        ]
      }
    });
  });

  it('should export a value set that includes a concept component with at least one concept', () => {
    const valueSet = new FshValueSet('DinnerVS');
    const component = new ValueSetConceptComponentRule(true);
    component.from = { system: 'http://food.org/food' };
    component.concepts.push(
      new FshCode('Pizza', 'http://food.org/food', 'Delicious pizza to share.')
    );
    component.concepts.push(
      new FshCode('Salad', 'http://food.org/food', 'Plenty of fresh vegetables.')
    );
    component.concepts.push(new FshCode('Mulch', 'http://food.org/food'));
    valueSet.rules.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
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
    const toastComponent = new ValueSetConceptComponentRule(true);
    toastComponent.from = { system: 'http://food.org/food|2.0.1' };
    toastComponent.concepts.push(new FshCode('Toast', 'http://food.org/food|2.0.1'));
    valueSet.rules.push(toastComponent);
    const juiceComponent = new ValueSetConceptComponentRule(true);
    juiceComponent.from = { system: 'http://food.org/beverage|1.1|x' };
    juiceComponent.concepts.push(new FshCode('Orange juice', 'http://food.org/beverage|1.1|x'));
    valueSet.rules.push(juiceComponent);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'BreakfastVS',
      name: 'BreakfastVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/BreakfastVS',
      version: '1.0.0',
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
    const component = new ValueSetFilterComponentRule(true);
    component.from = { system: 'http://food.org/food' };
    component.filters.push({
      property: 'display',
      operator: VsOperator.REGEX,
      value: /pancakes|flapjacks/
    });
    valueSet.rules.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'BreakfastVS',
      name: 'BreakfastVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/BreakfastVS',
      version: '1.0.0',
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
    const component = new ValueSetFilterComponentRule(true);
    component.from = { system: 'http://food.org/food' };
    component.filters.push({
      property: 'concept',
      operator: VsOperator.DESCENDENT_OF,
      value: new FshCode('Potatoes', 'http://food.org/food')
    });
    valueSet.rules.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'BreakfastVS',
      name: 'BreakfastVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/BreakfastVS',
      version: '1.0.0',
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
    const component = new ValueSetFilterComponentRule(true);
    component.from = { system: 'http://food.org/food' };
    component.filters.push({
      property: 'version',
      operator: VsOperator.EQUALS,
      value: '3.0.0'
    });
    valueSet.rules.push(component);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'BreakfastVS',
      name: 'BreakfastVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/BreakfastVS',
      version: '1.0.0',
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
    const includedComponent = new ValueSetFilterComponentRule(true);
    includedComponent.from = {
      system: 'http://food.org/food',
      valueSets: ['http://food.org/food/ValueSet/baked', 'http://food.org/food/ValueSet/grilled']
    };
    const excludedComponent = new ValueSetConceptComponentRule(false);
    excludedComponent.from = { system: 'http://food.org/food' };
    excludedComponent.concepts.push(
      new FshCode('Cake', 'http://food.org/food', 'A delicious treat for special occasions.')
    );
    valueSet.rules.push(includedComponent);
    valueSet.rules.push(excludedComponent);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'DinnerVS',
      name: 'DinnerVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
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
    const candyFilter = new ValueSetFilterComponentRule(false);
    candyFilter.from = { valueSets: ['CandyVS'] };
    valueSet.rules.push(candyFilter);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Breakfast\.fsh.*Line: 2 - 4\D*/s);
  });

  it('should log a message when a value set from system is not a URI', () => {
    const valueSet = new FshValueSet('BreakfastVS')
      .withFile('Breakfast.fsh')
      .withLocation([2, 8, 4, 25]);
    const component = new ValueSetComponentRule(true);
    component.from = { system: 'notAUri' };
    valueSet.rules.push(component);
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
    const component = new ValueSetComponentRule(true);
    component.from = { valueSets: ['notAUri'] };
    valueSet.rules.push(component);
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
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
      status: 'active',
      publisher: 'Carrots'
    });
  });

  it('should apply a CaretValueRule with soft indexing', () => {
    const valueSet = new FshValueSet('AppleVS');
    const caretRule1 = new CaretValueRule('');
    caretRule1.caretPath = 'contact[+].name';
    caretRule1.value = 'Johnny Appleseed';
    valueSet.rules.push(caretRule1);
    const caretRule2 = new CaretValueRule('');
    caretRule2.caretPath = 'contact[=].telecom[+].rank';
    caretRule2.value = 1;
    valueSet.rules.push(caretRule2);
    const caretRule3 = new CaretValueRule('');
    caretRule3.caretPath = 'contact[=].telecom[=].value';
    caretRule3.value = 'email.email@email.com';
    valueSet.rules.push(caretRule3);
    doc.valueSets.set(valueSet.name, valueSet);
    const exported = exporter.export().valueSets;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'ValueSet',
      id: 'AppleVS',
      name: 'AppleVS',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/AppleVS',
      version: '1.0.0',
      status: 'active',
      contact: [
        {
          name: 'Johnny Appleseed',
          telecom: [
            {
              rank: 1,
              value: 'email.email@email.com'
            }
          ]
        }
      ]
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
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
      version: '1.0.0',
      status: 'active'
    });
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: InvalidValue\.fsh.*Line: 6\D*/s);
  });

  it('should use the url specified in a CaretValueRule when referencing a named value set', () => {
    const lunchVS = new FshValueSet('LunchVS');
    const lunchFilterComponent = new ValueSetFilterComponentRule(true);
    lunchFilterComponent.from = {
      valueSets: ['SandwichVS']
    };
    lunchVS.rules.push(lunchFilterComponent);

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
    const lunchFilterComponent = new ValueSetFilterComponentRule(true);
    lunchFilterComponent.from = {
      system: 'FoodCS'
    };
    lunchVS.rules.push(lunchFilterComponent);

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

  describe('#expansion', () => {
    let valueSet: FshValueSet;

    beforeEach(() => {
      valueSet = new FshValueSet('MyValueSet');
      const expansionName = new CaretValueRule('');
      expansionName.caretPath = 'expansion.parameter.name';
      expansionName.value = 'sushi-generated';
      const expansionValue = new CaretValueRule('');
      expansionValue.caretPath = 'expansion.parameter.valueBoolean';
      expansionValue.value = true;
      valueSet.rules.push(expansionName, expansionValue);
      doc.valueSets.set(valueSet.name, valueSet);
      // Add a CodeSystem with content = "fragment" for use in a test
      const fragmentCsDef = JSON.parse(
        readFileSync(
          path.join(__dirname, '..', 'testhelpers', 'testdefs', 'CodeSystem-fragment.json'),
          'utf-8'
        ).trim()
      );
      defs.add(fragmentCsDef);
    });

    it('should expand a value set that contains specific concepts', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * includes http://zoo.org/animals|1.0#bear
      // * includes #tiger and #hippo from system http://zoo.org/animals|1.1
      const includeBear = new ValueSetConceptComponentRule(true);
      includeBear.concepts.push(new FshCode('bear', 'http://zoo.org/animals|1.0'));
      includeBear.from.system = 'http://zoo.org/animals|1.0';
      const includeTigerHippo = new ValueSetConceptComponentRule(true);
      includeTigerHippo.concepts.push(
        new FshCode('tiger', 'http://zoo.org/animals|1.1'),
        new FshCode('hippo', 'http://zoo.org/animals|1.1')
      );
      includeTigerHippo.from.system = 'http://zoo.org/animals|1.1';
      valueSet.rules.push(includeBear, includeTigerHippo);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(3);
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'bear',
        system: 'http://zoo.org/animals',
        version: '1.0'
      });
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'tiger',
        system: 'http://zoo.org/animals',
        version: '1.1'
      });
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'hippo',
        system: 'http://zoo.org/animals',
        version: '1.1'
      });
    });

    it('should expand a value set that contains locally defined code systems from JSON', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system AllergyIntoleranceClinicalStatusCodes
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      valueSet.rules.push(includeAllergy);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(2);
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'active',
        display: 'Active',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1'
      });
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'inactive',
        display: 'Inactive',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1',
        contains: [
          {
            code: 'resolved',
            display: 'Resolved',
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            version: '4.0.1'
          }
        ]
      });
    });

    it('should expand a value set that contains a matching version of a locally defined code system', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system AllergyIntoleranceClinicalStatusCodes|4.0.1
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes|4.0.1';
      valueSet.rules.push(includeAllergy);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(2);
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'active',
        display: 'Active',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1'
      });
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'inactive',
        display: 'Inactive',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1',
        contains: [
          {
            code: 'resolved',
            display: 'Resolved',
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            version: '4.0.1'
          }
        ]
      });
    });

    it('should not expand a value set that contains a different version of a locally defined code system', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system AllergyIntoleranceClinicalStatusCodes|7.6.5
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes|7.6.5';
      valueSet.rules.push(includeAllergy);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Composition contains CodeSystems without available concept lists\./s
      );
    });

    it('should keep explicitly included concepts at the top level', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include AllergyIntoleranceClinicalStatusCodes#resolved
      // * include codes from system AllergyIntoleranceClinicalStatusCodes
      // Because the #resolved code is already present when the full system is included,
      // it is not added again. Therefore, it stays in place in the main concept list.
      const includeResolved = new ValueSetConceptComponentRule(true);
      includeResolved.concepts.push(
        new FshCode('resolved', 'AllergyIntoleranceClinicalStatusCodes')
      );
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      includeResolved.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      valueSet.rules.push(includeResolved, includeAllergy);
      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(3);
    });

    it('should not change the hierarchy of included codes when a duplicate is added', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system AllergyIntoleranceClinicalStatusCodes
      // * include AllergyIntoleranceClinicalStatusCodes#resolved
      // Because the full system is included first, adding the specific code has no effect.
      // Thus, the hierarchy present in the included system is maintained.
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      const includeResolved = new ValueSetConceptComponentRule(true);
      includeResolved.concepts.push(
        new FshCode('resolved', 'AllergyIntoleranceClinicalStatusCodes')
      );
      includeResolved.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      valueSet.rules.push(includeAllergy, includeResolved);
      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(2);
    });

    it('should remove excluded concepts from the expansion', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system AllergyIntoleranceClinicalStatusCodes
      // * exclude AllergyIntoleranceClinicalStatusCodes#active
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      const excludeActive = new ValueSetConceptComponentRule(false);
      excludeActive.concepts.push(new FshCode('active', 'AllergyIntoleranceClinicalStatusCodes'));
      excludeActive.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      valueSet.rules.push(includeAllergy, excludeActive);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(1);
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'inactive',
        display: 'Inactive',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1',
        contains: [
          {
            code: 'resolved',
            display: 'Resolved',
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            version: '4.0.1'
          }
        ]
      });
    });

    it('should remove a contained excluded concept', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system AllergyIntoleranceClinicalStatusCodes
      // * exclude AllergyIntoleranceClinicalStatusCodes#resolved
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      const excludeResolved = new ValueSetConceptComponentRule(false);
      excludeResolved.concepts.push(
        new FshCode('resolved', 'AllergyIntoleranceClinicalStatusCodes')
      );
      excludeResolved.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      valueSet.rules.push(includeAllergy, excludeResolved);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(2);
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'active',
        display: 'Active',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1'
      });
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'inactive',
        display: 'Inactive',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1'
      });
    });

    it('should keep contained concepts when excluding the top-level concept', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system AllergyIntoleranceClinicalStatusCodes
      // * exclude AllergyIntoleranceClinicalStatusCodes#inactive
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      const excludeInactive = new ValueSetConceptComponentRule(false);
      excludeInactive.concepts.push(
        new FshCode('inactive', 'AllergyIntoleranceClinicalStatusCodes')
      );
      excludeInactive.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      valueSet.rules.push(includeAllergy, excludeInactive);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(2);
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'active',
        display: 'Active',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1'
      });
      // the contained concept moves up a level, and is now in the top-level contains array
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'resolved',
        display: 'Resolved',
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1'
      });
    });

    it('should remove all concepts from an excluded code system', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include AllergyIntoleranceClinicalStatusCodes#active
      // * include AllergyIntoleranceClinicalStatusCodes#inactive
      // * include http://zoo.org/animals|1.0#bear
      // * exclude codes from system AllergyIntoleranceClinicalStatusCodes
      const includeActive = new ValueSetConceptComponentRule(true);
      includeActive.concepts.push(new FshCode('active', 'AllergyIntoleranceClinicalStatusCodes'));
      includeActive.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      const includeInactive = new ValueSetConceptComponentRule(true);
      includeInactive.concepts.push(
        new FshCode('inactive', 'AllergyIntoleranceClinicalStatusCodes')
      );
      includeInactive.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      const includeBear = new ValueSetConceptComponentRule(true);
      includeBear.concepts.push(new FshCode('bear', 'http://zoo.org/animals|1.0'));
      includeBear.from.system = 'http://zoo.org/animals|1.0';
      const excludeAllergy = new ValueSetFilterComponentRule(false);
      excludeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      valueSet.rules.push(includeActive, includeInactive, includeBear, excludeAllergy);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toHaveLength(1);
      expect(exported.expansion.contains).toContainEqual<ValueSetExpansionContains>({
        code: 'bear',
        system: 'http://zoo.org/animals',
        version: '1.0'
      });
    });

    it('should not expand a value set that does not define its composition', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(/No composition defined\./s);
    });

    it('should not expand a value set that uses a filter operator', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system AllergyIntoleranceClinicalStatusCodes where definition exists
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.system = 'AllergyIntoleranceClinicalStatusCodes';
      includeAllergy.filters.push({
        property: 'definition',
        operator: VsOperator.EXISTS,
        value: true
      });
      valueSet.rules.push(includeAllergy);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(/Composition contains filter operators\./s);
    });

    it('should not expand a value set that references other value sets', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from valueset AllergyIntoleranceClinicalStatusCodes
      const includeAllergy = new ValueSetFilterComponentRule(true);
      includeAllergy.from.valueSets = ['AllergyIntoleranceClinicalStatusCodes'];
      valueSet.rules.push(includeAllergy);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(/Composition contains other ValueSets\./s);
    });

    it('should not expand value sets that refer to code systems without available definitions', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system http://example.org/CodeSystem/MyCodeSystem
      // This code system's content is "supplement"
      const includeUnknown = new ValueSetFilterComponentRule(true);
      includeUnknown.from.system = 'http://example.org/CodeSystem/MyCodeSystem';
      valueSet.rules.push(includeUnknown);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Composition contains CodeSystems without available concept lists\./s
      );
    });

    it('should not expand value sets that refer to code systems with content that is not complete', () => {
      // ValueSet: MyValueSet
      // * ^expansion.parameter.name = "sushi-generated"
      // * ^expansion.parameter.valueBoolean = true
      // * include codes from system http://example.org/CodeSystem/ZooFragmentSet
      const includeFragment = new ValueSetFilterComponentRule(true);
      includeFragment.from.system = 'http://example.org/CodeSystem/ZooFragmentSet';
      valueSet.rules.push(includeFragment);

      const exported = exporter.exportValueSet(valueSet);
      expect(exported.expansion.contains).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Composition contains CodeSystems without available concept lists\./s
      );
    });
  });

  describe('#insertRules', () => {
    let vs: FshValueSet;
    let ruleSet: RuleSet;

    beforeEach(() => {
      vs = new FshValueSet('Foo');
      doc.valueSets.set(vs.name, vs);

      ruleSet = new RuleSet('Bar');
      doc.ruleSets.set(ruleSet.name, ruleSet);
    });

    it('should apply rules from an insert rule', () => {
      // RuleSet: Bar
      // * ^title = "Wow fancy"
      //
      // ValueSet: Foo
      // * insert Bar
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      ruleSet.rules.push(nameRule);

      const insertRule = new InsertRule();
      insertRule.ruleSet = 'Bar';
      vs.rules.push(insertRule);

      const exported = exporter.exportValueSet(vs);
      expect(exported.title).toBe('Wow fancy');
    });

    it('should apply a CaretValueRule from a rule set with soft indexing', () => {
      const caretRule1 = new CaretValueRule('');
      caretRule1.caretPath = 'contact[+].name';
      caretRule1.value = 'Johnny Appleseed';
      ruleSet.rules.push(caretRule1);
      const caretRule2 = new CaretValueRule('');
      caretRule2.caretPath = 'contact[=].telecom[+].rank';
      caretRule2.value = 1;
      ruleSet.rules.push(caretRule2);
      const caretRule3 = new CaretValueRule('');
      caretRule3.caretPath = 'contact[=].telecom[=].value';
      caretRule3.value = 'email.email@email.com';
      ruleSet.rules.push(caretRule3);

      const insertRule = new InsertRule();
      insertRule.ruleSet = 'Bar';
      vs.rules.push(insertRule);

      const exported = exporter.exportValueSet(vs);
      expect(exported.contact).toEqual([
        {
          name: 'Johnny Appleseed',
          telecom: [
            {
              rank: 1,
              value: 'email.email@email.com'
            }
          ]
        }
      ]);
    });

    it('should log an error and not apply rules from an invalid insert rule', () => {
      // RuleSet: Bar
      // * experimental = true
      // * ^title = "Wow fancy"
      //
      // ValueSet: Foo
      // * insert Bar
      const valueRule = new AssignmentRule('experimental')
        .withFile('Value.fsh')
        .withLocation([1, 2, 3, 4]);
      valueRule.value = true;
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      ruleSet.rules.push(valueRule, nameRule);

      const insertRule = new InsertRule().withFile('Insert.fsh').withLocation([5, 6, 7, 8]);
      insertRule.ruleSet = 'Bar';
      vs.rules.push(insertRule);

      const exported = exporter.exportValueSet(vs);
      // CaretRule is still applied
      expect(exported.title).toBe('Wow fancy');
      // experimental is not set to true
      expect(exported.experimental).toBeFalsy();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /AssignmentRule.*FshValueSet.*File: Value\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Applied on Line: 5 - 7/s
      );
    });
  });
});
