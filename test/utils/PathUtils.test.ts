import '../testhelpers/loggerSpy'; // side-effect: silences logs
import { CaretValueRule, Rule } from '../../src/fshtypes/rules';
import { resolveSoftIndexing } from '../../src/utils';

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
  });
});
