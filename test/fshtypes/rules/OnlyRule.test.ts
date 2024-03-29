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

  describe('#toFSH', () => {
    it('should produce FSH for an OnlyRule with one non-Reference type', () => {
      const rule = new OnlyRule('value[x]');
      rule.types = [{ type: 'Quantity' }];
      expect(rule.toFSH()).toBe('* value[x] only Quantity');
    });

    it('should produce FSH for an OnlyRule with multiple non-Reference types', () => {
      const rule = new OnlyRule('value[x]');
      rule.types = [{ type: 'Quantity' }, { type: 'string' }];
      expect(rule.toFSH()).toBe('* value[x] only Quantity or string');
    });

    it('should produce FSH for an OnlyRule with one Reference type', () => {
      const rule = new OnlyRule('basedOn');
      rule.types = [{ type: 'FooReferenceProfile', isReference: true }];
      expect(rule.toFSH()).toBe('* basedOn only Reference(FooReferenceProfile)');
    });

    it('should produce FSH for an OnlyRule with multiple Reference types', () => {
      const rule = new OnlyRule('basedOn');
      rule.types = [
        { type: 'FooReferenceProfile', isReference: true },
        { type: 'BarReferenceProfile', isReference: true }
      ];
      expect(rule.toFSH()).toBe(
        '* basedOn only Reference(FooReferenceProfile or BarReferenceProfile)'
      );
    });

    it('should produce FSH for an OnlyRule with one canonical type', () => {
      const rule = new OnlyRule('library');
      rule.types = [{ type: 'FooCanonicalProfile', isCanonical: true }];
      expect(rule.toFSH()).toBe('* library only Canonical(FooCanonicalProfile)');
    });

    it('should produce FSH for an OnlyRule with multiple canonical types', () => {
      const rule = new OnlyRule('library');
      rule.types = [
        { type: 'FooCanonicalProfile', isCanonical: true },
        { type: 'BarCanonicalProfile', isCanonical: true }
      ];
      expect(rule.toFSH()).toBe(
        '* library only Canonical(FooCanonicalProfile or BarCanonicalProfile)'
      );
    });

    it('should produce FSH for an OnlyRule with one CodeableReference type', () => {
      const rule = new OnlyRule('basedOn');
      rule.types = [{ type: 'FooCodeableReferenceProfile', isCodeableReference: true }];
      expect(rule.toFSH()).toBe('* basedOn only CodeableReference(FooCodeableReferenceProfile)');
    });

    it('should produce FSH for an OnlyRule with multiple CodeableReference types', () => {
      const rule = new OnlyRule('basedOn');
      rule.types = [
        { type: 'FooCodeableReferenceProfile', isCodeableReference: true },
        { type: 'BarCodeableReferenceProfile', isCodeableReference: true }
      ];
      expect(rule.toFSH()).toBe(
        '* basedOn only CodeableReference(FooCodeableReferenceProfile or BarCodeableReferenceProfile)'
      );
    });

    it('should produce FSH for an OnlyRule with Reference and non-Reference types', () => {
      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'FooReferenceProfile', isReference: true },
        { type: 'BarReferenceProfile', isReference: true },
        { type: 'FooCanonicalProfile', isCanonical: true },
        { type: 'BarCanonicalProfile', isCanonical: true },
        { type: 'FooCodeableReferenceProfile', isCodeableReference: true },
        { type: 'BarCodeableReferenceProfile', isCodeableReference: true },
        { type: 'Quantity' },
        { type: 'string' }
      ];
      expect(rule.toFSH()).toBe(
        '* value[x] only Quantity or string or Reference(FooReferenceProfile or BarReferenceProfile) or Canonical(FooCanonicalProfile or BarCanonicalProfile) or CodeableReference(FooCodeableReferenceProfile or BarCodeableReferenceProfile)'
      );
    });
  });
});
