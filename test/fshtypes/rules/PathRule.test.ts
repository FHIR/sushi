import 'jest-extended';
import { PathRule } from '../../../src/fshtypes/rules/PathRule';

describe('PathRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new PathRule('component.code');
      expect(p.path).toBe('component.code');
    });
  });
});
