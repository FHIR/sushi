import 'jest-extended';
import { FshValueSet } from '../../src/fshtypes/FshValueSet';
import { EOL } from 'os';
import {
  CaretValueRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule
} from '../../src/fshtypes/rules';
import { FshCode } from '../../src/fshtypes';

describe('ValueSet', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const vs = new FshValueSet('MyValueSet');
      expect(vs.name).toBe('MyValueSet');
      expect(vs.id).toBe('MyValueSet');
      expect(vs.title).toBeUndefined();
      expect(vs.description).toBeUndefined();
      expect(vs.rules).toBeEmpty();
    });
  });

  describe('#id', () => {
    it('should return an id set by a string caret rule', () => {
      const p = new FshValueSet('MyValueSet');
      const idRule = new CaretValueRule('');
      idRule.caretPath = 'id';
      idRule.value = 'different-id';
      p.rules.push(idRule);
      expect(p.id).toBe('different-id');
    });

    it('should not return an id set by a non-string caret rule', () => {
      const p = new FshValueSet('MyValueSet');
      const idRule = new CaretValueRule('');
      idRule.caretPath = 'id';
      idRule.value = BigInt(23456);
      idRule.rawValue = '23456';
      p.rules.push(idRule);
      expect(p.id).toBe('MyValueSet');
    });

    it('should not return an id set by an instance caret rule', () => {
      const p = new FshValueSet('MyValueSet');
      const idRule = new CaretValueRule('');
      idRule.caretPath = 'id';
      idRule.value = 'different-id';
      idRule.isInstance = true;
      p.rules.push(idRule);
      expect(p.id).toBe('MyValueSet');
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest ValueSet', () => {
      const vs = new FshValueSet('MyValueSet');
      const expectedResult = ['ValueSet: MyValueSet', 'Id: MyValueSet'].join(EOL);
      expect(vs.toFSH()).toEqual(expectedResult);
    });

    it('should produce FSH for a ValueSet with additional metadata', () => {
      const vs = new FshValueSet('MyValueSet');
      vs.id = 'my-value-set';
      vs.title = 'My Value Set';
      vs.description = 'This is my newest value set.';
      const expectedResult = [
        'ValueSet: MyValueSet',
        'Id: my-value-set',
        'Title: "My Value Set"',
        'Description: "This is my newest value set."'
      ].join(EOL);
      expect(vs.toFSH()).toEqual(expectedResult);
    });

    it('should produce FSH for a ValueSet with rules', () => {
      const vs = new FshValueSet('MyValueSet');
      const conceptRule = new ValueSetConceptComponentRule(true);
      conceptRule.from.system = 'GoodCodes';
      conceptRule.concepts.push(new FshCode('goodthing'));
      const filterRule = new ValueSetFilterComponentRule(false);
      filterRule.from.valueSets = ['BadVS', 'TerribleVS'];
      vs.rules.push(conceptRule, filterRule);
      const expectedResult = [
        'ValueSet: MyValueSet',
        'Id: MyValueSet',
        '* GoodCodes#goodthing',
        '* exclude codes from valueset BadVS and TerribleVS'
      ].join(EOL);
      expect(vs.toFSH()).toEqual(expectedResult);
    });
  });
});
