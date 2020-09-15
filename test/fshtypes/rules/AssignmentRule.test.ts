import 'jest-extended';
import { AssignmentRule } from '../../../src/fshtypes/rules/AssignmentRule';

describe('AssignmentRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new AssignmentRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.fixedValue).toBeUndefined();
      expect(c.exactly).toBeUndefined();
      expect(c.isInstance).toBeUndefined();
    });
  });
});
