import 'jest-extended';
import { OnlyRule } from '../../../src/fshtypes/rules/OnlyRule';

describe('OnlyRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const t = new OnlyRule('component.code');
      expect(t.path).toBe('component.code');
      expect(t.types).toBeEmpty();
    });
  });
});
