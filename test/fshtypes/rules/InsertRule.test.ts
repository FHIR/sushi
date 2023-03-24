import 'jest-extended';
import { InsertRule } from '../../../src/fshtypes/rules/InsertRule';

describe('InsertRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const i = new InsertRule('foo');
      expect(i.ruleSet).toBeUndefined();
      expect(i.params).toBeEmpty();
      expect(i.path).toBe('foo');
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for an InsertRule without parameters or a path', () => {
      const rule = new InsertRule('');
      rule.ruleSet = 'MyRuleSet';
      expect(rule.toFSH()).toEqual('* insert MyRuleSet');
    });

    it('should produce FSH for an InsertRule with parameters and no path', () => {
      const rule = new InsertRule('');
      rule.ruleSet = 'MyRuleSet';
      rule.params = [
        'this\\that',
        'oh, no',
        '(big)',
        'more regular',
        ' less regular ',
        '[[a]], ([[b]]), [[c]]'
      ];
      expect(rule.toFSH()).toEqual(
        '* insert MyRuleSet(this\\\\that, [[oh, no]], [[(big)]], more regular, [[ less regular ]], [[[[a]]\\, ([[b]]\\), [[c]]]])'
      );
    });

    it('should produce FSH for an InsertRule with a path and no parameters', () => {
      const rule = new InsertRule('name.family');
      rule.ruleSet = 'MyRuleSet';
      expect(rule.toFSH()).toEqual('* name.family insert MyRuleSet');
    });

    it('should produce FSH for an InsertRule with a code path and no parameters', () => {
      const rule = new InsertRule('');
      rule.ruleSet = 'MyRuleSet';
      rule.pathArray = ['pizza', 'bagelpizza'];
      expect(rule.toFSH()).toEqual('* #pizza #bagelpizza insert MyRuleSet');
    });

    it('should produce FSH for an InsertRule with a path and parameters', () => {
      const rule = new InsertRule('name.family');
      rule.ruleSet = 'MyRuleSet';
      rule.params = ['this\\that', 'oh, no', '(big)', 'more regular', ' less regular '];
      expect(rule.toFSH()).toEqual(
        '* name.family insert MyRuleSet(this\\\\that, [[oh, no]], [[(big)]], more regular, [[ less regular ]])'
      );
    });
  });
});
