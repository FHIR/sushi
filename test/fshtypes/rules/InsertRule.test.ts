import 'jest-extended';
import { InsertRule } from '../../../src/fshtypes/rules/InsertRule';

describe('InsertRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const i = new InsertRule();
      expect(i.ruleSet).toBeUndefined();
      expect(i.params).toBeEmpty();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for an InsertRule without parameters', () => {
      const rule = new InsertRule();
      rule.ruleSet = 'MyRuleSet';
      expect(rule.toFSH()).toEqual('* insert MyRuleSet');
    });

    it('should produce FSH for an InsertRule with parameters', () => {
      const rule = new InsertRule();
      rule.ruleSet = 'MyRuleSet';
      rule.params = ['this\\that', 'oh, no', '(big)'];
      expect(rule.toFSH()).toEqual('* insert MyRuleSet(this\\\\that, oh\\, no, (big\\))');
    });
  });
});
