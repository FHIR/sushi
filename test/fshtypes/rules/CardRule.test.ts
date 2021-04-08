import 'jest-extended';
import { CardRule } from '../../../src/fshtypes/rules/CardRule';

describe('CardRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new CardRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.min).toBeUndefined();
      expect(c.max).toBeUndefined();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a CardRule with a min and a max', () => {
      const rule = new CardRule('name');
      rule.min = 2;
      rule.max = '8';

      expect(rule.toFSH()).toBe('* name 2..8');
    });

    it('should produce FSH for a CardRule with only a min', () => {
      const rule = new CardRule('photo');
      rule.min = 3;

      expect(rule.toFSH()).toBe('* photo 3..');
    });

    it('should produce FSH for a CardRule with only a max', () => {
      const rule = new CardRule('contact');
      rule.max = '5';

      expect(rule.toFSH()).toBe('* contact ..5');
    });
  });
});
