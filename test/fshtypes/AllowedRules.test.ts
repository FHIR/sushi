import 'jest-extended';
import { Profile } from '../../src/fshtypes/Profile';
import {
  CardRule,
  ConceptRule,
  CaretValueRule,
  ContainsRule,
  AssignmentRule,
  FlagRule,
  ObeysRule,
  OnlyRule,
  BindingRule,
  MappingRule,
  InsertRule,
  ValueSetComponentRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule
} from '../../src/fshtypes/rules';
import {
  isAllowedRule,
  Extension,
  Instance,
  FshValueSet,
  FshCodeSystem,
  Mapping,
  RuleSet
} from '../../src/fshtypes';

describe('isAllowedRule', () => {
  describe('#Profile', () => {
    let p: Profile;
    beforeAll(() => {
      p = new Profile('Bar');
    });
    it('should allow valid rules on a Profile', () => {
      expect(isAllowedRule(p, new CardRule('foo'))).toBeTrue();
      expect(isAllowedRule(p, new CaretValueRule('foo'))).toBeTrue();
      expect(isAllowedRule(p, new ContainsRule('foo'))).toBeTrue();
      expect(isAllowedRule(p, new AssignmentRule('foo'))).toBeTrue();
      expect(isAllowedRule(p, new FlagRule('foo'))).toBeTrue();
      expect(isAllowedRule(p, new ObeysRule('foo'))).toBeTrue();
      expect(isAllowedRule(p, new OnlyRule('foo'))).toBeTrue();
      expect(isAllowedRule(p, new BindingRule('foo'))).toBeTrue();
    });

    it('should not allow invalid rules on a Profile', () => {
      expect(isAllowedRule(p, new MappingRule('foo'))).toBeFalse();
      expect(isAllowedRule(p, new InsertRule())).toBeFalse();
      expect(isAllowedRule(p, new ValueSetComponentRule(true))).toBeFalse();
      expect(isAllowedRule(p, new ConceptRule('foo'))).toBeFalse();
    });
  });

  describe('#Extension', () => {
    let e: Extension;
    beforeAll(() => {
      e = new Extension('Bar');
    });
    it('should allow valid rules on an Extension', () => {
      expect(isAllowedRule(e, new CardRule('foo'))).toBeTrue();
      expect(isAllowedRule(e, new CaretValueRule('foo'))).toBeTrue();
      expect(isAllowedRule(e, new ContainsRule('foo'))).toBeTrue();
      expect(isAllowedRule(e, new AssignmentRule('foo'))).toBeTrue();
      expect(isAllowedRule(e, new FlagRule('foo'))).toBeTrue();
      expect(isAllowedRule(e, new ObeysRule('foo'))).toBeTrue();
      expect(isAllowedRule(e, new OnlyRule('foo'))).toBeTrue();
      expect(isAllowedRule(e, new BindingRule('foo'))).toBeTrue();
    });

    it('should not allow invalid rules on an Extension', () => {
      expect(isAllowedRule(e, new MappingRule('foo'))).toBeFalse();
      expect(isAllowedRule(e, new InsertRule())).toBeFalse();
      expect(isAllowedRule(e, new ValueSetComponentRule(true))).toBeFalse();
      expect(isAllowedRule(e, new ConceptRule('foo'))).toBeFalse();
    });
  });

  describe('#Instance', () => {
    let i: Instance;
    beforeAll(() => {
      i = new Instance('Bar');
    });
    it('should allow valid rules on an Instance', () => {
      expect(isAllowedRule(i, new AssignmentRule('foo'))).toBeTrue();
    });

    it('should not allow invalid rules on Instance', () => {
      expect(isAllowedRule(i, new MappingRule('foo'))).toBeFalse();
      expect(isAllowedRule(i, new InsertRule())).toBeFalse();
      expect(isAllowedRule(i, new ValueSetComponentRule(true))).toBeFalse();
      expect(isAllowedRule(i, new ConceptRule('foo'))).toBeFalse();
      expect(isAllowedRule(i, new CardRule('foo'))).toBeFalse();
      expect(isAllowedRule(i, new CaretValueRule('foo'))).toBeFalse();
      expect(isAllowedRule(i, new ContainsRule('foo'))).toBeFalse();
      expect(isAllowedRule(i, new FlagRule('foo'))).toBeFalse();
      expect(isAllowedRule(i, new ObeysRule('foo'))).toBeFalse();
      expect(isAllowedRule(i, new OnlyRule('foo'))).toBeFalse();
      expect(isAllowedRule(i, new BindingRule('foo'))).toBeFalse();
    });
  });

  describe('FshValueSet', () => {
    let v: FshValueSet;
    beforeAll(() => {
      v = new FshValueSet('Bar');
    });
    it('should allow valid rules on a FshValueSet', () => {
      expect(isAllowedRule(v, new CaretValueRule('foo'))).toBeTrue();
      expect(isAllowedRule(v, new ValueSetComponentRule(true))).toBeTrue();
      expect(isAllowedRule(v, new ValueSetConceptComponentRule(true))).toBeTrue();
      expect(isAllowedRule(v, new ValueSetFilterComponentRule(true))).toBeTrue();
    });

    it('should not allow invalid rules on a FshValueSet', () => {
      expect(isAllowedRule(v, new AssignmentRule('foo'))).toBeFalse();
      expect(isAllowedRule(v, new MappingRule('foo'))).toBeFalse();
      expect(isAllowedRule(v, new InsertRule())).toBeFalse();
      expect(isAllowedRule(v, new ConceptRule('foo'))).toBeFalse();
      expect(isAllowedRule(v, new CardRule('foo'))).toBeFalse();
      expect(isAllowedRule(v, new ContainsRule('foo'))).toBeFalse();
      expect(isAllowedRule(v, new FlagRule('foo'))).toBeFalse();
      expect(isAllowedRule(v, new ObeysRule('foo'))).toBeFalse();
      expect(isAllowedRule(v, new OnlyRule('foo'))).toBeFalse();
      expect(isAllowedRule(v, new BindingRule('foo'))).toBeFalse();
    });
  });

  describe('FshCodeSystem', () => {
    let c: FshCodeSystem;
    beforeAll(() => {
      c = new FshCodeSystem('Bar');
    });
    it('should allow valid rules on a FshCodeSystem', () => {
      expect(isAllowedRule(c, new CaretValueRule('foo'))).toBeTrue();
      expect(isAllowedRule(c, new ConceptRule('foo'))).toBeTrue();
    });

    it('should not allow invalid rules on a FshCodeSystem', () => {
      expect(isAllowedRule(c, new AssignmentRule('foo'))).toBeFalse();
      expect(isAllowedRule(c, new MappingRule('foo'))).toBeFalse();
      expect(isAllowedRule(c, new InsertRule())).toBeFalse();
      expect(isAllowedRule(c, new CardRule('foo'))).toBeFalse();
      expect(isAllowedRule(c, new ContainsRule('foo'))).toBeFalse();
      expect(isAllowedRule(c, new FlagRule('foo'))).toBeFalse();
      expect(isAllowedRule(c, new ObeysRule('foo'))).toBeFalse();
      expect(isAllowedRule(c, new OnlyRule('foo'))).toBeFalse();
      expect(isAllowedRule(c, new BindingRule('foo'))).toBeFalse();
      expect(isAllowedRule(c, new ValueSetComponentRule(true))).toBeFalse();
    });
  });

  describe('Mapping', () => {
    let m: Mapping;
    beforeAll(() => {
      m = new Mapping('Bar');
    });
    it('should allow valid rules on a Mapping', () => {
      expect(isAllowedRule(m, new MappingRule('foo'))).toBeTrue();
    });

    it('should not allow invalid rules on a Mapping', () => {
      expect(isAllowedRule(m, new CaretValueRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new AssignmentRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new ConceptRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new InsertRule())).toBeFalse();
      expect(isAllowedRule(m, new CardRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new ContainsRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new FlagRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new ObeysRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new OnlyRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new BindingRule('foo'))).toBeFalse();
      expect(isAllowedRule(m, new ValueSetComponentRule(true))).toBeFalse();
    });
  });

  describe('#RuleSet', () => {
    let r: RuleSet;
    beforeAll(() => {
      r = new RuleSet('Bar');
    });
    it('should allow valid rules on a RuleSet', () => {
      expect(isAllowedRule(r, new CardRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new CaretValueRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new ContainsRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new AssignmentRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new FlagRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new ObeysRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new OnlyRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new BindingRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new MappingRule('foo'))).toBeTrue();
      expect(isAllowedRule(r, new ValueSetComponentRule(true))).toBeTrue();
      expect(isAllowedRule(r, new ConceptRule('foo'))).toBeTrue();
    });

    it('should not allow invalid rules on a RuleSet', () => {
      expect(isAllowedRule(r, new InsertRule())).toBeFalse();
    });
  });
});
