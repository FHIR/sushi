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

  describe('#applyParameters', () => {
    it('should replace parameters with their value in the contents', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      ruleSet.parameters = ['first', 'second'];
      ruleSet.contents = [
        '* category {first}..*',
        '* category from {second}',
        '* note 0..{first}'
      ].join(EOL);

      const appliedContents = ruleSet.applyParameters(['5', 'MySystem']);
      const expectedContents = ['* category 5..*', '* category from MySystem', '* note 0..5'].join(
        EOL
      );
      expect(appliedContents).toBe(expectedContents);
    });

    it('should replace all parameters simultaneously', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      ruleSet.parameters = ['first', 'second'];
      ruleSet.contents = ['* code from {first}', '* category from {second}'].join(EOL);

      const appliedContents = ruleSet.applyParameters(['{second}Deluxe', 'MySystem']);
      const expectedContents = ['* code from {second}Deluxe', '* category from MySystem'].join(EOL);
      expect(appliedContents).toBe(expectedContents);
    });

    it('should replace parameters when there is whitespace in the substitution token', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      ruleSet.parameters = ['first', 'second'];
      ruleSet.contents = [
        '* category {  first}..*',
        '* category from {second }',
        '* note 0..{ first \t}'
      ].join(EOL);

      const appliedContents = ruleSet.applyParameters(['5', 'MySystem']);
      const expectedContents = ['* category 5..*', '* category from MySystem', '* note 0..5'].join(
        EOL
      );
      expect(appliedContents).toBe(expectedContents);
    });

    it('should replace parameters when parameter names contain characters that have special meanings in regular expressions', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      ruleSet.parameters = ['system.a', 'system_a'];
      ruleSet.contents = ['* code from {system.a}', '* category from {system_a}'].join(EOL);

      const appliedContents = ruleSet.applyParameters(['FirstSystem', 'SecondSystem']);
      const expectedContents = ['* code from FirstSystem', '* category from SecondSystem'].join(
        EOL
      );
      expect(appliedContents).toBe(expectedContents);
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
