import 'jest-extended';
import { InsertRule } from '../../../src/fshtypes/rules/InsertRule';

describe('InsertRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const i = new InsertRule();
      expect(i.ruleSets).toEqual([]);
    });
  });
});
