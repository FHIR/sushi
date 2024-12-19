import path from 'path';
import { readJSONSync } from 'fs-extra';
import { InstanceDefinition } from '../../src/fhirtypes';
import { CaretValueRule, Rule, AssignmentRule } from '../../src/fshtypes/rules';
import { resolveSoftIndexing, parseFSHPath, collectValuesAtElementIdOrPath } from '../../src/utils';
import { loggerSpy } from '../testhelpers/loggerSpy';

describe('PathUtils', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#resolveSoftIndexing', () => {
    it('should resolve simple (non-nested) soft indexing', () => {
      const rules = ['name[+]', 'name[=]', 'name[=]', 'name[+]', 'name[=]'].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'name[0]',
        'name[0]',
        'name[0]',
        'name[1]',
        'name[1]'
      ]);
    });

    it('should resolve nested soft indexing w/ recursive paths', () => {
      // These types of paths are possible in instances of Questionnaire
      const rules = [
        'item[+].item[+].item[+]',
        'item[=].item[+].item[+]',
        'item[=].item[=].item[+]',
        'item[=].item[=].item[=]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'item[0].item[0].item[0]',
        'item[0].item[1].item[0]',
        'item[0].item[1].item[1]',
        'item[0].item[1].item[1]'
      ]);
    });

    it('should resolve soft indexing mixed w/ numeric indexes', () => {
      // These types of paths are possible in instances of Questionnaire
      const rules = [
        'item[+].item[+].item[0]',
        'item[0].item[+].item[+]',
        'item[=].item[2].item[+]',
        'item[=].item[=].item[1]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'item[0].item[0].item[0]',
        'item[0].item[1].item[0]',
        'item[0].item[2].item[0]',
        'item[0].item[2].item[1]'
      ]);
    });

    it('should resolve soft indexing on caret paths', () => {
      const rules: CaretValueRule[] = [];
      const caretRule1 = new CaretValueRule('');
      caretRule1.caretPath = 'contact[+].name';
      rules.push(caretRule1);
      const caretRule2 = new CaretValueRule('');
      caretRule2.caretPath = 'contact[=].phone';
      rules.push(caretRule2);
      const caretRule3 = new CaretValueRule('');
      caretRule3.caretPath = 'contact[=].email';
      rules.push(caretRule3);
      const caretRule4 = new CaretValueRule('');
      caretRule4.caretPath = 'contact[+].phone';
      rules.push(caretRule4);
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.caretPath)).toEqual([
        'contact[0].name',
        'contact[0].phone',
        'contact[0].email',
        'contact[1].phone'
      ]);
    });

    it('should resolve soft indexing on caret paths and regular paths', () => {
      const rules: CaretValueRule[] = [];
      const caretRule1 = new CaretValueRule('item[+]');
      caretRule1.caretPath = 'contact[+].name';
      rules.push(caretRule1);
      const caretRule2 = new CaretValueRule('item[=]');
      caretRule2.caretPath = 'contact[=].phone';
      rules.push(caretRule2);
      const caretRule3 = new CaretValueRule('item[0]');
      caretRule3.caretPath = 'contact[+].email';
      rules.push(caretRule3);
      const caretRule4 = new CaretValueRule('item[+]');
      caretRule4.caretPath = 'contact[+].phone';
      rules.push(caretRule4);
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual(['item[0]', 'item[0]', 'item[0]', 'item[1]']);
      expect(rules.map(r => r.caretPath)).toEqual([
        'contact[0].name',
        'contact[0].phone',
        'contact[1].email',
        'contact[0].phone'
      ]);
    });

    it('should resolve soft indexing on regular paths with slicing', () => {
      const rules: Rule[] = [];
      const caretRule1 = new Rule('item[Slice1][+]');
      rules.push(caretRule1);
      const caretRule2 = new Rule('item[Slice1][=]');
      rules.push(caretRule2);
      const caretRule3 = new Rule('item[Slice2][+]');
      rules.push(caretRule3);
      const caretRule4 = new Rule('item[Slice2][+]');
      rules.push(caretRule4);
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'item[Slice1][0]',
        'item[Slice1][0]',
        'item[Slice2][0]',
        'item[Slice2][1]'
      ]);
    });

    it('should resolve nested soft indexing w/ similar nested path items', () => {
      // These types of paths are possible in instances of ValueSet
      const rules = [
        'compose.include[+].concept[+]',
        'compose.include[=].concept[+]',
        'compose.exclude[+].concept[+]',
        'compose.exclude[=].concept[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'compose.include[0].concept[0]',
        'compose.include[0].concept[1]',
        'compose.exclude[0].concept[0]',
        'compose.exclude[0].concept[1]'
      ]);
    });

    it('should resolve improper soft indexing, but log an error', () => {
      const rules = ['name[=]', 'name[=]', 'name[=]', 'name[+]', 'name[=]'].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'name[0]',
        'name[0]',
        'name[0]',
        'name[1]',
        'name[1]'
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'The first index in a Soft Indexing sequence must be "+", an actual index of "0" has been assumed'
      );
    });

    it('should resolve soft indexing beginning with a non-zero index', () => {
      const rules = ['name[2]', 'name[=]', 'name[=]', 'name[+]', 'name[=]'].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'name[2]',
        'name[2]',
        'name[2]',
        'name[3]',
        'name[3]'
      ]);
    });

    it('should resolve strict soft indexing beginning with a named slice', () => {
      const rules = ['component[Bread]', 'component[+]', 'component[=]', 'component[+]'].map(
        r => new Rule(r)
      );
      resolveSoftIndexing(rules, true);
      expect(rules.map(r => r.path)).toEqual([
        'component[Bread]',
        'component[1]',
        'component[1]',
        'component[2]'
      ]);
    });

    it('should resolve strict soft indexing that contains multiple named slices', () => {
      const rules = [
        'component[Bread]',
        'component[+]',
        'component[=]',
        'component[Toast]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules, true);
      expect(rules.map(r => r.path)).toEqual([
        'component[Bread]',
        'component[1]',
        'component[1]',
        'component[Toast]',
        'component[3]'
      ]);
    });

    it('should resolve strict soft indexing that applies to both an element and its slices', () => {
      const rules = [
        'component[+]',
        'component[=]',
        'component[Bread][+]',
        'component[Bread][=]',
        'component[Bread][+]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules, true);
      expect(rules.map(r => r.path)).toEqual([
        'component[0]',
        'component[0]',
        'component[Bread][0]',
        'component[Bread][0]',
        'component[Bread][1]',
        'component[3]'
      ]);
    });

    it('should resolve strict soft indexing that applies to an element, its slices, and its reslices', () => {
      const rules = [
        'component[Bread][Rye][+]',
        'component[Bread][+]',
        'component[+]',
        'component[Bread][+]',
        'component[Bread][=]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules, true);
      expect(rules.map(r => r.path)).toEqual([
        'component[Bread][Rye][0]',
        'component[Bread][1]',
        'component[2]',
        'component[Bread][2]',
        'component[Bread][2]',
        'component[4]'
      ]);
    });

    it('should resolve strict soft indexing with named slices and numbered indices', () => {
      const rules = [
        'component[+]',
        'component[=]',
        'component[Bread][1]',
        'component[Bread][=]',
        'component[Bread][+]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules, true);
      expect(rules.map(r => r.path)).toEqual([
        'component[0]',
        'component[0]',
        'component[Bread][1]',
        'component[Bread][1]',
        'component[Bread][2]',
        'component[4]'
      ]);
    });

    it('should resolve strict soft indexing with named slices and out-of-order numbered indices', () => {
      const rules = [
        'component[+]',
        'component[=]',
        'component[Bread][1]',
        'component[Bread][0]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules, true);
      expect(rules.map(r => r.path)).toEqual([
        'component[0]',
        'component[0]',
        'component[Bread][1]',
        'component[Bread][0]',
        'component[3]'
      ]);
    });

    it('should resolve strict soft indexing with named slices and numbered indices that also have caret paths', () => {
      const rules: Rule[] = [];
      const caretRule1 = new CaretValueRule('item[+]');
      caretRule1.caretPath = 'contact[+].name';
      rules.push(caretRule1);
      const caretRule2 = new CaretValueRule('item[Bread][+]');
      caretRule2.caretPath = 'contact[+].name';
      rules.push(caretRule2);
      const assignmentRule3 = new AssignmentRule('item[Bread][=]');
      rules.push(assignmentRule3);
      const caretRule4 = new CaretValueRule('item[Bread][=]');
      caretRule4.caretPath = 'contact[+].name';
      rules.push(caretRule4);
      const assignmentRule5 = new AssignmentRule('item[+]');
      rules.push(assignmentRule5);
      const caretRule6 = new CaretValueRule('item[Bread][+]');
      caretRule6.caretPath = 'contact[+].email';
      rules.push(caretRule6);
      resolveSoftIndexing(rules, true);
      expect(rules.map(r => r.path)).toEqual([
        'item[0]',
        'item[Bread][0]',
        'item[Bread][0]',
        'item[Bread][0]',
        'item[2]',
        'item[Bread][1]'
      ]);
      expect(rules.map(r => (r instanceof CaretValueRule ? r.caretPath : undefined))).toEqual([
        'contact[0].name',
        'contact[0].name',
        undefined,
        'contact[1].name',
        undefined,
        'contact[0].email'
      ]);
    });
  });

  describe('#parseFSHPath', () => {
    it('should properly seperate path elements into PathParts', () => {
      const testPath = 'item1.item2.item3';
      const pathParts = parseFSHPath(testPath);

      expect(pathParts).toHaveLength(3);
      expect(pathParts[0]).toEqual({ base: 'item1' });
      expect(pathParts[1]).toEqual({ base: 'item2' });
      expect(pathParts[2]).toEqual({ base: 'item3' });
    });

    it('should properly seperate path elements with brackets into PathParts', () => {
      const testPath = 'item1[0].item2[0].item3[0]';
      const pathParts = parseFSHPath(testPath);

      expect(pathParts).toHaveLength(3);
      expect(pathParts[0]).toEqual({ base: 'item1', brackets: ['0'] });
      expect(pathParts[1]).toEqual({ base: 'item2', brackets: ['0'] });
      expect(pathParts[2]).toEqual({ base: 'item3', brackets: ['0'] });
    });

    it('should properly seperate path elements with multi-digit brackets into PathParts', () => {
      const testPath = 'item1[10].item2[11].item3[12]';
      const pathParts = parseFSHPath(testPath);

      expect(pathParts).toHaveLength(3);
      expect(pathParts[0]).toEqual({ base: 'item1', brackets: ['10'] });
      expect(pathParts[1]).toEqual({ base: 'item2', brackets: ['11'] });
      expect(pathParts[2]).toEqual({ base: 'item3', brackets: ['12'] });
    });

    it('should properly seperate path elements with slice names into PathParts', () => {
      const testPath = 'item1[10][Slice1].item2[11][Slice2].item3[12][Slice3]';
      const pathParts = parseFSHPath(testPath);

      expect(pathParts).toHaveLength(3);
      expect(pathParts[0]).toEqual({
        base: 'item1',
        brackets: ['10', 'Slice1'],
        slices: ['Slice1']
      });
      expect(pathParts[1]).toEqual({
        base: 'item2',
        brackets: ['11', 'Slice2'],
        slices: ['Slice1', 'Slice2']
      });
      expect(pathParts[2]).toEqual({
        base: 'item3',
        brackets: ['12', 'Slice3'],
        slices: ['Slice1', 'Slice2', 'Slice3']
      });
    });

    it('should properly seperate path elements with slice names including brackets into PathParts', () => {
      const testPath = 'item1[10][foo[x]].item2[11][bar[x]][baz[x]].value[x]';
      const pathParts = parseFSHPath(testPath);

      expect(pathParts).toHaveLength(3);
      expect(pathParts[0]).toEqual({
        base: 'item1',
        brackets: ['10', 'foo[x]'],
        slices: ['foo[x]']
      });
      expect(pathParts[1]).toEqual({
        base: 'item2',
        brackets: ['11', 'bar[x]', 'baz[x]'],
        slices: ['foo[x]', 'bar[x]', 'baz[x]']
      });
      expect(pathParts[2]).toEqual({
        base: 'value[x]'
      });
    });

    it('should properly seperate path elements with slice names on choice elements into PathParts', () => {
      const testPath = 'value[x][foo]';
      const pathParts = parseFSHPath(testPath);

      expect(pathParts).toHaveLength(1);
      expect(pathParts[0]).toEqual({
        base: 'value[x]',
        brackets: ['foo'],
        slices: ['foo']
      });
    });
  });

  describe('#collectValuesAtElementIdOrPath', () => {
    let object: InstanceDefinition;
    beforeEach(() => {
      const json = readJSONSync(
        path.join(
          __dirname,
          '..',
          'testhelpers',
          'testdefs',
          'r4-definitions',
          'package',
          'Observation-20minute-apgar-score.json'
        )
      );
      object = InstanceDefinition.fromJSON(json);
    });

    it('should collect simple singular properties with resourceType prefix and resourceType', () => {
      const results = collectValuesAtElementIdOrPath('Observation.status', object);
      expect(results.values).toEqual(['final']);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect simple singular properties with resourceType prefix and no resourceType', () => {
      delete object.resourceType;
      const results = collectValuesAtElementIdOrPath('Observation.status', object);
      expect(results.values).toEqual(['final']);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect simple singular properties without resourceType prefix but with resourceType', () => {
      const results = collectValuesAtElementIdOrPath('status', object);
      expect(results.values).toEqual(['final']);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect simple singular properties without resourceType prefix and without resourceType', () => {
      delete object.resourceType;
      const results = collectValuesAtElementIdOrPath('status', object);
      expect(results.values).toEqual(['final']);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should NOT collect simple singular properties with resourceType prefix and wrong resourceType', () => {
      const results = collectValuesAtElementIdOrPath('Condition.status', object);
      expect(results.values).toEqual([]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect simple singular properties with wrong resourceType prefix and no resourceType', () => {
      // This is simply to document how it works. Making it smart enough to detect the instance's resource
      // type without having a resourceType property is outside the scope of this utility.
      delete object.resourceType;
      const results = collectValuesAtElementIdOrPath('Condition.status', object);
      expect(results.values).toEqual(['final']);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect nested singular properties', () => {
      const results = collectValuesAtElementIdOrPath('Observation.code.text', object);
      expect(results.values).toEqual(['20 minute Apgar Score']);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect simple array properties with a single value', () => {
      const results = collectValuesAtElementIdOrPath('Observation.performer', object);
      expect(results.values).toEqual([{ reference: 'Practitioner/example' }]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect nested array properties with a single value', () => {
      const results = collectValuesAtElementIdOrPath('Observation.code.coding', object);
      expect(results.values).toEqual([
        {
          system: 'http://snomed.info/sct',
          code: '443849008',
          display: 'Apgar score at 20 minutes'
        }
      ]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect single properties that are nested in arrays with a single value', () => {
      const results = collectValuesAtElementIdOrPath('Observation.category.coding.code', object);
      expect(results.values).toEqual(['survey']);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect simple array properties with multiple values', () => {
      object.performer.push({ reference: 'Practitioner/example2' });
      const results = collectValuesAtElementIdOrPath('Observation.performer', object);
      expect(results.values).toEqual([
        { reference: 'Practitioner/example' },
        { reference: 'Practitioner/example2' }
      ]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect nested array properties with multiple values', () => {
      object.code.coding.push({
        system: 'http://example.org',
        code: 'apgar',
        display: 'Apgar score'
      });
      const results = collectValuesAtElementIdOrPath('Observation.code.coding', object);
      expect(results.values).toEqual([
        {
          system: 'http://snomed.info/sct',
          code: '443849008',
          display: 'Apgar score at 20 minutes'
        },
        {
          system: 'http://example.org',
          code: 'apgar',
          display: 'Apgar score'
        }
      ]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect properties that are nested in arrays with multiple elements in the leaf node', () => {
      object.category[0].coding.push({
        system: 'http://example.org',
        code: 'example',
        display: 'Example'
      });
      const results = collectValuesAtElementIdOrPath('Observation.category.coding', object);
      expect(results.values).toEqual([
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'survey',
          display: 'Survey'
        },
        {
          system: 'http://example.org',
          code: 'example',
          display: 'Example'
        }
      ]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect properties that are nested in arrays with multiple elements in an intermediate node', () => {
      object.category.push({
        coding: {
          system: 'http://example.org',
          code: 'example',
          display: 'Example'
        },
        text: 'Example'
      });
      const results = collectValuesAtElementIdOrPath('Observation.category.coding', object);
      expect(results.values).toEqual([
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'survey',
          display: 'Survey'
        },
        {
          system: 'http://example.org',
          code: 'example',
          display: 'Example'
        }
      ]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect nested singular properties embedded in multiple arrays', () => {
      const results = collectValuesAtElementIdOrPath(
        'Observation.component.code.coding.code',
        object
      );
      expect(results.values).toEqual([
        '249227004',
        '249223000',
        '249226008',
        '249225007',
        '249224006'
      ]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect properties from choice types when a specific choice is specified', () => {
      const results = collectValuesAtElementIdOrPath(
        'Observation.value[x]:valueQuantity.value',
        object
      );
      expect(results.values).toEqual([10]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should collect properties from choice types when a specific choice is not specified', () => {
      const results = collectValuesAtElementIdOrPath('Observation.value[x].value', object);
      expect(results.values).toEqual([10]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should not collect properties from choice types when a non-matching type is specified', () => {
      const results = collectValuesAtElementIdOrPath(
        'Observation.value[x]:valueString.value',
        object
      );
      expect(results.values).toEqual([]);
      expect(results.ignoredSliceRequirements).toEqual([]);
    });

    it('should ignore slicenames in the path, but remember what it ignored', () => {
      const results = collectValuesAtElementIdOrPath(
        'Observation.component:foo.code.coding:bar.code',
        object
      );
      expect(results.values).toEqual([
        '249227004',
        '249223000',
        '249226008',
        '249225007',
        '249224006'
      ]);
      expect(results.ignoredSliceRequirements).toEqual([
        'Observation.component:foo',
        'Observation.component:foo.code.coding:bar'
      ]);
    });

    it('should ignore resliced slicenames in the path, but remember what it ignored', () => {
      const results = collectValuesAtElementIdOrPath(
        'Observation.component:foo/bar.code.coding.code',
        object
      );
      expect(results.values).toEqual([
        '249227004',
        '249223000',
        '249226008',
        '249225007',
        '249224006'
      ]);
      expect(results.ignoredSliceRequirements).toEqual(['Observation.component:foo/bar']);
    });

    it('should ignore resliced slicenames in choice types, but remember what it ignored', () => {
      const results = collectValuesAtElementIdOrPath(
        'Observation.value[x]:valueQuantity/foo.value',
        object
      );
      expect(results.values).toEqual([10]);
      expect(results.ignoredSliceRequirements).toEqual(['Observation.value[x]:valueQuantity/foo']);
    });
  });
});
