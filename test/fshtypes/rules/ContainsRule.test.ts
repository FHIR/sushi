import 'jest-extended';
import { ContainsRule } from '../../../src/fshtypes/rules/ContainsRule';
import { EOL } from 'os';

describe('ContainsRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new ContainsRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.items.length).toBe(0);
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a ContainsRule with one item', () => {
      // NOTE: All contains rules must have a card rule, so this case is purely for testing purposes.
      const rule = new ContainsRule('component');
      rule.items = [{ name: 'systolic' }];

      expect(rule.toFSH()).toBe('* component contains systolic 0..');
    });

    it('should produce FSH for a ContainsRule with one named item', () => {
      // NOTE: All contains rules must have a card rule, so this case is purely for testing purposes.
      const rule = new ContainsRule('component');
      rule.items = [{ name: 'systolic', type: 'SystolicBP' }];

      expect(rule.toFSH()).toBe('* component contains SystolicBP named systolic 0..');
    });

    it('should produce FSH for a ContainsRule with multiple items', () => {
      // NOTE: All contains rules must have a card rule, so this case is purely for testing purposes.
      const rule = new ContainsRule('component');
      rule.items = [
        { name: 'systolic', type: 'SystolicBP' },
        { name: 'diastolic', type: 'DiastolicBP' }
      ];

      const expectedFSH = `* component contains${EOL}    SystolicBP named systolic 0.. and${EOL}    DiastolicBP named diastolic 0..`;

      expect(rule.toFSH()).toBe(expectedFSH);
    });
  });
});
