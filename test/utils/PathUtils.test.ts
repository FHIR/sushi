import { CaretValueRule, Rule, AssignmentRule } from '../../src/fshtypes/rules';
import { resolveSoftIndexing, parseFSHPath } from '../../src/utils';
import '../testhelpers/loggerSpy'; // side-effect: suppresses logs

describe('PathUtils', () => {
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

    it('should resolve improper soft indexing, but throw an error', () => {
      const rules = ['name[=]', 'name[=]', 'name[=]', 'name[+]', 'name[=]'].map(r => new Rule(r));
      expect(() => {
        resolveSoftIndexing(rules);
      }).toThrowError;
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'name[0]',
        'name[0]',
        'name[0]',
        'name[1]',
        'name[1]'
      ]);
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

    it('should resolve soft indexing beginning with a named slice', () => {
      const rules = ['component[Bread]', 'component[+]', 'component[=]', 'component[+]'].map(
        r => new Rule(r)
      );
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'component[Bread]',
        'component[1]',
        'component[1]',
        'component[2]'
      ]);
    });

    it('should resolve soft indexing that contains multiple named slices', () => {
      const rules = [
        'component[Bread]',
        'component[+]',
        'component[=]',
        'component[Toast]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'component[Bread]',
        'component[1]',
        'component[1]',
        'component[Toast]',
        'component[3]'
      ]);
    });

    it('should resolve soft indexing that applies to both an element and its slices', () => {
      const rules = [
        'component[+]',
        'component[=]',
        'component[Bread][+]',
        'component[Bread][=]',
        'component[Bread][+]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'component[0]',
        'component[0]',
        'component[Bread][0]',
        'component[Bread][0]',
        'component[Bread][1]',
        'component[3]'
      ]);
    });

    it('should resolve soft indexing that applies to an element, its slices, and its reslices', () => {
      const rules = [
        'component[Bread][Rye][+]',
        'component[Bread][+]',
        'component[+]',
        'component[Bread][+]',
        'component[Bread][=]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'component[Bread][Rye][0]',
        'component[Bread][0]',
        'component[2]',
        'component[Bread][1]',
        'component[Bread][1]',
        'component[4]'
      ]);
    });

    it('should resolve soft indexing with named slices and numbered indices', () => {
      const rules = [
        'component[+]',
        'component[=]',
        'component[Bread][1]',
        'component[Bread][=]',
        'component[Bread][+]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'component[0]',
        'component[0]',
        'component[Bread][1]',
        'component[Bread][1]',
        'component[Bread][2]',
        'component[4]'
      ]);
    });

    it('should resolve soft indexing with named slices and out-of-order numbered indices', () => {
      const rules = [
        'component[+]',
        'component[=]',
        'component[Bread][1]',
        'component[Bread][0]',
        'component[+]'
      ].map(r => new Rule(r));
      resolveSoftIndexing(rules);
      expect(rules.map(r => r.path)).toEqual([
        'component[0]',
        'component[0]',
        'component[Bread][1]',
        'component[Bread][0]',
        'component[3]'
      ]);
    });

    it('should resolve soft indexing with named slices and numbered indices that also have caret paths', () => {
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
      resolveSoftIndexing(rules);
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

      expect(pathParts[0]).toEqual({ base: 'item1' });
      expect(pathParts[1]).toEqual({ base: 'item2' });
      expect(pathParts[2]).toEqual({ base: 'item3' });
    });

    it('should properly seperate path elements with brackets into PathParts', () => {
      const testPath = 'item1[0].item2[0].item3[0]';
      const pathParts = parseFSHPath(testPath);

      expect(pathParts[0]).toEqual({ base: 'item1', brackets: ['0'] });
      expect(pathParts[1]).toEqual({ base: 'item2', brackets: ['0'] });
      expect(pathParts[2]).toEqual({ base: 'item3', brackets: ['0'] });
    });

    it('should properly seperate path elements with multi-digit brackets into PathParts', () => {
      const testPath = 'item1[10].item2[11].item3[12]';
      const pathParts = parseFSHPath(testPath);

      expect(pathParts[0]).toEqual({ base: 'item1', brackets: ['10'] });
      expect(pathParts[1]).toEqual({ base: 'item2', brackets: ['11'] });
      expect(pathParts[2]).toEqual({ base: 'item3', brackets: ['12'] });
    });

    it('should properly seperate path elements with slice names into PathParts', () => {
      const testPath = 'item1[10][Slice1].item2[11][Slice2].item3[12][Slice3]';
      const pathParts = parseFSHPath(testPath);

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
  });
});
