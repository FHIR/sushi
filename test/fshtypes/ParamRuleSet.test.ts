import 'jest-extended';
import { ParamRuleSet } from '../../src/fshtypes/ParamRuleSet';
import { EOL } from 'os';

describe('ParamRuleSet', () => {
  describe('#constructor', () => {
    it('should set initial properties correctly', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      expect(ruleSet.name).toBe('MyParamRuleSet');
      expect(ruleSet.parameters).toEqual([]);
      expect(ruleSet.contents).toBe('');
    });
  });

  describe('#getUnusedParameters', () => {
    it('should return a list of all unused parameters', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      ruleSet.parameters = ['first', 'second', 'third', 'fourth'];
      ruleSet.contents = ['* code from {first}', '* category from {third}'].join(EOL);

      const unusedParameters = ruleSet.getUnusedParameters();
      expect(unusedParameters).toEqual(['second', 'fourth']);
    });

    it('should detect parameter uses that contain whitespace', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      ruleSet.parameters = ['first', 'second', 'third', 'fourth'];
      ruleSet.contents = ['* code from { first  }', '* category from {\tthird \t}'].join(EOL);

      const unusedParameters = ruleSet.getUnusedParameters();
      expect(unusedParameters).toEqual(['second', 'fourth']);
    });

    it('should return an empty list when all parameters are used', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      ruleSet.parameters = ['first', 'second', 'third', 'fourth'];
      ruleSet.contents = [
        '* code from {first}',
        '* category from {third}',
        '* note {second}..{fourth}'
      ].join(EOL);

      const unusedParameters = ruleSet.getUnusedParameters();
      expect(unusedParameters).toEqual([]);
    });
  });
});
