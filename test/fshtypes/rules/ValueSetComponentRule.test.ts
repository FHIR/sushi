import 'jest-extended';
import {
  ValueSetComponentRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule
} from '../../../src/fshtypes/rules/ValueSetComponentRule';
import { FshCode, VsOperator } from '../../../src/fshtypes';
import { EOL } from 'os';

describe('ValueSetComponentRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const v = new ValueSetComponentRule(true);
      expect(v.inclusion).toBeTrue();
      expect(v.from).toEqual({});
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a ValueSetComponentRule', () => {
      const v = new ValueSetComponentRule(true);
      v.from.system = 'SomeSystem';
      v.from.valueSets = ['VSOne', 'VSTwo'];
      expect(v.toFSH()).toBe('* include codes from system SomeSystem and valueset VSOne and VSTwo');
    });
  });
});

describe('ValueSetConceptComponentRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const v = new ValueSetConceptComponentRule(true);
      expect(v.inclusion).toBeTrue();
      expect(v.from).toEqual({});
      expect(v.concepts).toEqual([]);
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a ValueSetConceptComponentRule with a single concept', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts.push(new FshCode('foo', 'bar'));

      expect(rule.toFSH()).toBe('* bar#foo');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a single excluded concept', () => {
      const rule = new ValueSetConceptComponentRule(false);
      rule.concepts.push(new FshCode('foo', 'bar'));

      expect(rule.toFSH()).toBe('* exclude bar#foo');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a single concept with system and display', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts.push(new FshCode('foo', 'bar', 'baz'));

      expect(rule.toFSH()).toBe('* bar#foo "baz"');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a concept from a system', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts.push(new FshCode('foo', 'someSystem'));
      rule.from.system = 'someSystem';

      expect(rule.toFSH()).toBe('* someSystem#foo');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with several concepts included from a system', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts.push(new FshCode('foo', 'someSystem'));
      rule.concepts.push(new FshCode('bar', 'someSystem'));
      rule.from.system = 'someSystem';

      expect(rule.toFSH()).toBe(`* someSystem#foo${EOL}* someSystem#bar`);
    });

    it('should produce FSH for a ValueSetConceptComponentRule with several concepts excluded from a system', () => {
      const rule = new ValueSetConceptComponentRule(false);
      rule.concepts.push(new FshCode('foo', 'someSystem'));
      rule.concepts.push(new FshCode('bar', 'someSystem'));
      rule.from.system = 'someSystem';

      expect(rule.toFSH()).toBe(`* exclude someSystem#foo${EOL}* exclude someSystem#bar`);
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a concept included from a valueset', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts.push(new FshCode('foo', 'bar'));
      rule.from.system = 'bar';
      rule.from.valueSets = ['someValueSet'];

      expect(rule.toFSH()).toBe('* bar#foo from valueset someValueSet');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a concept excluded from a valueset', () => {
      const rule = new ValueSetConceptComponentRule(false);
      rule.concepts.push(new FshCode('foo', 'bar'));
      rule.from.system = 'bar';
      rule.from.valueSets = ['someValueSet'];

      expect(rule.toFSH()).toBe('* exclude bar#foo from valueset someValueSet');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a concept included from several valuesets', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts.push(new FshCode('foo', 'bar'));
      rule.from.system = 'bar';
      rule.from.valueSets = ['someValueSet', 'otherValueSet'];

      expect(rule.toFSH()).toBe('* bar#foo from valueset someValueSet and otherValueSet');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a concept excluded from several valuesets', () => {
      const rule = new ValueSetConceptComponentRule(false);
      rule.concepts.push(new FshCode('foo', 'bar'));
      rule.from.system = 'bar';
      rule.from.valueSets = ['someValueSet', 'otherValueSet'];

      expect(rule.toFSH()).toBe('* exclude bar#foo from valueset someValueSet and otherValueSet');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a concept included from a system and several valuesets', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts.push(new FshCode('foo', 'someSystem'));
      rule.from.system = 'someSystem';
      rule.from.valueSets = ['someValueSet', 'otherValueSet'];

      expect(rule.toFSH()).toBe('* someSystem#foo from valueset someValueSet and otherValueSet');
    });

    it('should produce FSH for a ValueSetConceptComponentRule with a concept excluded from a system and several valuesets', () => {
      const rule = new ValueSetConceptComponentRule(false);
      rule.concepts.push(new FshCode('foo', 'someSystem'));
      rule.from.system = 'someSystem';
      rule.from.valueSets = ['someValueSet', 'otherValueSet'];

      expect(rule.toFSH()).toBe(
        '* exclude someSystem#foo from valueset someValueSet and otherValueSet'
      );
    });

    it('should produce FSH for a ValueSetConceptComponentRule with several concepts included from a valueset', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts.push(new FshCode('bear', 'zoo'));
      rule.concepts.push(new FshCode('pelican', 'zoo'));
      rule.from.system = 'zoo';
      rule.from.valueSets = ['someValueSet'];

      expect(rule.toFSH()).toBe(
        `* zoo#bear from valueset someValueSet${EOL}* zoo#pelican from valueset someValueSet`
      );
    });

    it('should format a long ValueSetConceptComponentRule to take up multiple lines', () => {
      const rule = new ValueSetConceptComponentRule(true);
      rule.concepts = [
        new FshCode(
          'cookies',
          'http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS',
          'Cookies'
        ),
        new FshCode(
          'candy',
          'http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS',
          'Candy'
        ),
        new FshCode(
          'chips',
          'http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS',
          'Chips'
        ),
        new FshCode(
          'cakes',
          'http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS',
          'Cakes'
        ),
        new FshCode(
          'verylargecakes',
          'http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS',
          'Very Large Cakes'
        )
      ];
      rule.from.system = 'http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS';
      rule.from.valueSets = ['http://fhir.food-pyramid.org/FoodPyramidGuide/ValueSets/DeliciousVS'];

      const result = rule.toFSH();
      const expectedResult = [
        '* http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS#cookies "Cookies"',
        '    from valueset http://fhir.food-pyramid.org/FoodPyramidGuide/ValueSets/DeliciousVS',
        '* http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS#candy "Candy"',
        '    from valueset http://fhir.food-pyramid.org/FoodPyramidGuide/ValueSets/DeliciousVS',
        '* http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS#chips "Chips"',
        '    from valueset http://fhir.food-pyramid.org/FoodPyramidGuide/ValueSets/DeliciousVS',
        '* http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS#cakes "Cakes"',
        '    from valueset http://fhir.food-pyramid.org/FoodPyramidGuide/ValueSets/DeliciousVS',
        '* http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS#verylargecakes "Very Large Cakes"',
        '    from valueset http://fhir.food-pyramid.org/FoodPyramidGuide/ValueSets/DeliciousVS'
      ].join(EOL);
      expect(result).toEqual(expectedResult);
    });
  });
});

describe('ValueSetFilterComponentRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const v = new ValueSetFilterComponentRule(true);
      expect(v.inclusion).toBeTrue();
      expect(v.from).toEqual({});
      expect(v.filters).toEqual([]);
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a ValueSetFilterComponentRule with codes from a system', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.system = 'someSystem';

      expect(rule.toFSH()).toBe('* include codes from system someSystem');
    });

    it('should produce FSH for a ValueSetFilterComponentRule that excludes codes from a system', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.system = 'someSystem';

      expect(rule.toFSH()).toBe('* exclude codes from system someSystem');
    });

    it('should produce FSH for a ValueSetFilterComponentRule with codes from a valueset', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.valueSets = ['someValueSet'];

      expect(rule.toFSH()).toBe('* include codes from valueset someValueSet');
    });

    it('should produce FSH for a ValueSetFilterComponentRule that excludes codes from a valueset', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.valueSets = ['someValueSet'];

      expect(rule.toFSH()).toBe('* exclude codes from valueset someValueSet');
    });

    it('should produce FSH for a ValueSetFilterComponentRule with codes from several valuesets', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.valueSets = ['someValueSet', 'otherValueSet'];

      expect(rule.toFSH()).toBe('* include codes from valueset someValueSet and otherValueSet');
    });

    it('should produce FSH for a ValueSetFilterComponentRule that excludes codes from several valuesets', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.valueSets = ['someValueSet', 'otherValueSet'];

      expect(rule.toFSH()).toBe('* exclude codes from valueset someValueSet and otherValueSet');
    });

    it('should produce FSH for a ValueSetFilterComponentRule with codes from a system and several valuesets', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.system = 'someSystem';
      rule.from.valueSets = ['someValueSet', 'otherValueSet'];

      expect(rule.toFSH()).toBe(
        '* include codes from system someSystem and valueset someValueSet and otherValueSet'
      );
    });

    it('should produce FSH for a ValueSetFilterComponentRule with codes from a system that are filtered', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.system = 'someSystem';
      rule.filters.push({ property: 'version', operator: VsOperator.EQUALS, value: '2.0' });

      expect(rule.toFSH()).toBe('* include codes from system someSystem where version = "2.0"');
    });

    it('should produce FSH for a ValueSetFilterComponentRule that excludes codes from a system that are filtered', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.system = 'someSystem';
      rule.filters.push({ property: 'version', operator: VsOperator.EQUALS, value: '2.0' });

      expect(rule.toFSH()).toBe('* exclude codes from system someSystem where version = "2.0"');
    });

    it('should produce FSH for a ValueSetFilterComponentRule with codes from a system that are filtered with regex', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.system = 'someSystem';
      rule.filters.push({
        property: 'version',
        operator: VsOperator.REGEX,
        value: /2.0/
      });

      expect(rule.toFSH()).toBe('* include codes from system someSystem where version regex /2.0/');
    });

    it('should produce FSH for a ValueSetFilterComponentRule that excludes codes from a system that are filtered with regex', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.system = 'someSystem';
      rule.filters.push({
        property: 'version',
        operator: VsOperator.REGEX,
        value: /2.0/
      });

      expect(rule.toFSH()).toBe('* exclude codes from system someSystem where version regex /2.0/');
    });

    it('should produce FSH for a ValueSetFilterComponentRule with codes from a system that are filtered with code', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.system = 'someSystem';
      rule.filters.push({
        property: 'version',
        operator: VsOperator.IS_A,
        value: new FshCode('foo')
      });

      expect(rule.toFSH()).toBe('* include codes from system someSystem where version is-a #foo');
    });

    it('should produce FSH for a ValueSetFilterComponentRule that excludes codes from a system that are filtered with code', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.system = 'someSystem';
      rule.filters.push({
        property: 'version',
        operator: VsOperator.IS_A,
        value: new FshCode('foo')
      });

      expect(rule.toFSH()).toBe('* exclude codes from system someSystem where version is-a #foo');
    });

    it('should produce FSH for a ValueSetFilterComponentRule with codes from a system that are filtered with boolean', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.system = 'someSystem';
      rule.filters.push({
        property: 'version',
        operator: VsOperator.EXISTS,
        value: true
      });

      expect(rule.toFSH()).toBe('* include codes from system someSystem where version exists true');
    });

    it('should produce FSH for a ValueSetFilterComponentRule that excludes codes from a system that are filtered with boolean', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.system = 'someSystem';
      rule.filters.push({
        property: 'version',
        operator: VsOperator.EXISTS,
        value: true
      });

      expect(rule.toFSH()).toBe('* exclude codes from system someSystem where version exists true');
    });

    it('should produce FSH for a ValueSetFilterComponentRule with codes from a system that are multi-filtered', () => {
      const rule = new ValueSetFilterComponentRule(true);
      rule.from.system = 'someSystem';
      rule.filters.push({ property: 'version', operator: VsOperator.EQUALS, value: '2.0' });
      rule.filters.push({ property: 'status', operator: VsOperator.EXISTS, value: true });

      expect(rule.toFSH()).toBe(
        '* include codes from system someSystem where version = "2.0" and status exists true'
      );
    });

    it('should produce FSH for a ValueSetFilterComponentRule that excludes codes from a system that are multi-filtered', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.system = 'someSystem';
      rule.filters.push({ property: 'version', operator: VsOperator.EQUALS, value: '2.0' });
      rule.filters.push({ property: 'status', operator: VsOperator.EXISTS, value: true });

      expect(rule.toFSH()).toBe(
        '* exclude codes from system someSystem where version = "2.0" and status exists true'
      );
    });

    it('should format a long ValueSetFilterComponentRule to take up multiple lines', () => {
      const rule = new ValueSetFilterComponentRule(false);
      rule.from.system = 'http://fhir.example.org/myImplementationGuide/CodeSystem/AppleCS';
      rule.from.valueSets = [
        'http://fhir.example.org/myImplementationGuide/ValueSet/BananaVS',
        'http://fhir.example.org/myImplementationGuide/ValueSet/CupcakeVS'
      ];
      rule.filters.push({
        property: 'display',
        operator: VsOperator.EQUALS,
        value: 'this and that'
      });
      rule.filters.push({ property: 'version', operator: VsOperator.EXISTS, value: true });
      rule.filters.push({
        property: 'concept',
        operator: VsOperator.DESCENDENT_OF,
        value: new FshCode('comestible')
      });

      const result = rule.toFSH();
      const expectedResult = [
        '* exclude codes from system http://fhir.example.org/myImplementationGuide/CodeSystem/AppleCS and',
        '    valueset http://fhir.example.org/myImplementationGuide/ValueSet/BananaVS and',
        '    http://fhir.example.org/myImplementationGuide/ValueSet/CupcakeVS',
        '    where display = "this and that" and',
        '    version exists true and',
        '    concept descendent-of #comestible'
      ].join(EOL);
      expect(result).toEqual(expectedResult);
    });
  });
});
