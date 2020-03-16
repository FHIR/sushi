import 'jest-extended';
import { MappingRule } from '../../../src/fshtypes/rules/MappingRule';

describe('MappingRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const m = new MappingRule('identifier');
      expect(m.path).toBe('identifier');
      expect(m.map).toBeUndefined();
      expect(m.language).toBeUndefined();
      expect(m.comment).toBeUndefined();
    });
  });
});
