import 'jest-extended';
import { AddElementRule } from '../../../src/fshtypes/rules/AddElementRule';

describe('AddElementRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const r = new AddElementRule('component.code');
      expect(r.path).toBe('component.code');
      expect(r.min).toBeUndefined();
      expect(r.max).toBeUndefined();
      expect(r.types).toEqual([]);
      expect(r.mustSupport).toBeUndefined();
      expect(r.summary).toBeUndefined();
      expect(r.modifier).toBeUndefined();
      expect(r.trialUse).toBeUndefined();
      expect(r.normative).toBeUndefined();
      expect(r.draft).toBeUndefined();
      expect(r.short).toBeUndefined();
      expect(r.definition).toBeUndefined();
    });
  });
});
