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

    it('should replace parameters sequentially', () => {
      const ruleSet = new ParamRuleSet('MyParamRuleSet');
      ruleSet.parameters = ['first', 'second'];
      ruleSet.contents = ['* code from {first}', '* category from {second}'].join(EOL);

      const appliedContents = ruleSet.applyParameters(['{second}Deluxe', 'MySystem']);
      const expectedContents = ['* code from MySystemDeluxe', '* category from MySystem'].join(EOL);
      expect(appliedContents).toBe(expectedContents);
    });
  });
});
