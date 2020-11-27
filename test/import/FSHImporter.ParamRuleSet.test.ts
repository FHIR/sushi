import { EOL } from 'os';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FSHImporter, RawFSH } from '../../src/import';

describe('FSHImporter', () => {
  beforeAll(() => {
    loggerSpy.reset();
  });
  describe('ParamRuleSet', () => {
    it('should parse a ParamRuleSet with a rule', () => {
      const importer = new FSHImporter();
      const input = `
        RuleSet: MyRuleSet (system, strength)
        * code from {system} {strength}
        * pig from egg
      `;

      importer.import([new RawFSH(input, 'Params.fsh')]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(importer.paramRuleSets.size).toBe(1);
      expect(importer.paramRuleSets.has('MyRuleSet')).toBe(true);
      const result = importer.paramRuleSets.get('MyRuleSet');
      expect(result.name).toBe('MyRuleSet');
      expect(result.parameters).toEqual(['system', 'strength']);
      const expectedContents = ['* code from {system} {strength}', '* pig from egg'].join(EOL);
      expect(result.contents).toBe(expectedContents);
    });

    it('should stop parsing ParamRuleSet contents when the next entity is defined', () => {
      const importer = new FSHImporter();
      const input = `
        RuleSet: MyRuleSet (system, strength)
        * code from http://example.org/{system}/info.html {strength}
        * pig from egg
        
        Profile: MyObservation
        Parent: Observation
      `;

      const docs = importer.import([new RawFSH(input, 'Params.fsh')]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(docs).toHaveLength(1);
      expect(docs[0].profiles.has('MyObservation')).toBe(true);
      expect(importer.paramRuleSets.size).toBe(1);
      expect(importer.paramRuleSets.has('MyRuleSet')).toBe(true);
      const result = importer.paramRuleSets.get('MyRuleSet');
      expect(result.name).toBe('MyRuleSet');
      expect(result.parameters).toEqual(['system', 'strength']);
      const expectedContents = [
        '* code from http://example.org/{system}/info.html {strength}',
        '* pig from egg'
      ].join(EOL);
      expect(result.contents).toBe(expectedContents);
    });
  });
});
