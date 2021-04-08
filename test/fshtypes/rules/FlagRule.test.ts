import 'jest-extended';
import { FlagRule } from '../../../src/fshtypes/rules/FlagRule';

describe('FlagRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const f = new FlagRule('component.code');
      expect(f.path).toBe('component.code');
      expect(f.mustSupport).toBeUndefined();
      expect(f.summary).toBeUndefined();
      expect(f.modifier).toBeUndefined();
      expect(f.trialUse).toBeUndefined();
      expect(f.normative).toBeUndefined();
      expect(f.draft).toBeUndefined();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a FlagRule with mustSupport', () => {
      const rule = new FlagRule('name');
      rule.mustSupport = true;

      expect(rule.toFSH()).toBe('* name MS');
    });

    it('should produce FSH for a FlagRule with isModifier', () => {
      const rule = new FlagRule('name');
      rule.modifier = true;

      expect(rule.toFSH()).toBe('* name ?!');
    });

    it('should produce FSH for a FlagRule with isSummary', () => {
      const rule = new FlagRule('name');
      rule.summary = true;

      expect(rule.toFSH()).toBe('* name SU');
    });

    it('should produce FSH for a FlagRule with trialUse', () => {
      const rule = new FlagRule('name');
      rule.trialUse = true;

      expect(rule.toFSH()).toBe('* name TU');
    });

    it('should produce FSH for a FlagRule with normative', () => {
      const rule = new FlagRule('name');
      rule.normative = true;

      expect(rule.toFSH()).toBe('* name N');
    });

    it('should produce FSH for a FlagRule with draft', () => {
      const rule = new FlagRule('name');
      rule.draft = true;

      expect(rule.toFSH()).toBe('* name D');
    });

    it('should produce FSH for a FlagRule with multiple valid flags', () => {
      const rule = new FlagRule('name');
      rule.mustSupport = true;
      rule.summary = true;
      rule.trialUse = true;

      expect(rule.toFSH()).toBe('* name MS SU TU');
    });

    it('should produce FSH for a FlagRule and apply draft status over trialUse and normative', () => {
      const rule = new FlagRule('name');
      rule.draft = true;
      rule.trialUse = true;
      rule.normative = true;

      expect(rule.toFSH()).toBe('* name D');
    });

    it('should produce FSH for a FlagRule and apply trialUse status over normative', () => {
      const rule = new FlagRule('name');
      rule.trialUse = true;
      rule.normative = true;

      expect(rule.toFSH()).toBe('* name TU');
    });
  });
});
