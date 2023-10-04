import { loggerSpy } from '../testhelpers/loggerSpy';
import { FSHImporter, RawFSH } from '../../src/import';

describe('FSHImporter', () => {
  beforeEach(() => {
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
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(importer.paramRuleSets.size).toBe(1);
      expect(importer.paramRuleSets.has('MyRuleSet')).toBe(true);
      const result = importer.paramRuleSets.get('MyRuleSet');
      expect(result.name).toBe('MyRuleSet');
      expect(result.parameters).toEqual(['system', 'strength']);
      const expectedContents = `
        * code from {system} {strength}
        * pig from egg`;
      expect(result.contents).toBe(expectedContents);
    });

    it('should parse a ParamRuleSet with a numeric name', () => {
      const importer = new FSHImporter();
      const input = `
        RuleSet: 123 (system, strength)
        * code from {system} {strength}
      `;

      importer.import([new RawFSH(input, 'Params.fsh')]);
      expect(importer.paramRuleSets.size).toBe(1);
      expect(importer.paramRuleSets.has('123')).toBe(true);
      const result = importer.paramRuleSets.get('123');
      expect(result.name).toBe('123');
      expect(result.parameters).toEqual(['system', 'strength']);
    });

    it('should parse a ParamRuleSet when there is no space between the ruleset name and parameter list', () => {
      const importer = new FSHImporter();
      const input = `
        RuleSet: MyRuleSet(system, strength)
        * code from {system} {strength}
        * pig from egg
      `;

      importer.import([new RawFSH(input, 'Params.fsh')]);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(importer.paramRuleSets.size).toBe(1);
      expect(importer.paramRuleSets.has('MyRuleSet')).toBe(true);
      const result = importer.paramRuleSets.get('MyRuleSet');
      expect(result.name).toBe('MyRuleSet');
      expect(result.parameters).toEqual(['system', 'strength']);
      const expectedContents = `
        * code from {system} {strength}
        * pig from egg`;
      expect(result.contents).toBe(expectedContents);
    });

    it('should stop parsing ParamRuleSet contents when the next entity is defined', () => {
      const importer = new FSHImporter();
      const input = `
        RuleSet: FirstRuleSet (system, strength)
        * code from http://example.org/{system}/info.html {strength}
        * pig from egg

        Profile: MyObservation
        Parent: Observation

        RuleSet: SecondRuleSet (min)
        * stuff {min}..

        Alias: $Something = http://example.org/Something

        RuleSet: ThirdRuleSet(cookie)
        * code from {cookie}

        Extension: MyExtension

        RuleSet: FourthRuleSet(toast)
        * reason ^short = {toast}

        Instance: ExampleObservation
        InstanceOf: MyObservation

        RuleSet: FifthRuleSet(strength, system)
        * code from {system} {strength}

        ValueSet: MyValueSet

        RuleSet: SixthRuleSet(content)
        * ^description = {content}

        Invariant: cat-1

        RuleSet: SeventhRuleSet(even, more)
        * content[+] = {even}
        * content[+] = {more}
        
        CodeSystem: MyCodeSystem

        RuleSet: EighthRuleSet(continuation)
        * continuation = {continuation} (exactly)

        Mapping: SomeMapping

        RuleSet: NinthRuleSet(tiring)
        * code from {tiring}

        Logical: MyLogical

        RuleSet: TenthRuleSet(conclusion)
        * valueString = {conclusion}

        Resource: MyResource
      `;

      const docs = importer.import([new RawFSH(input, 'Params.fsh')]);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(docs).toHaveLength(1);
      expect(docs[0].profiles.has('MyObservation')).toBe(true);
      expect(docs[0].aliases.has('$Something')).toBe(true);
      expect(docs[0].extensions.has('MyExtension')).toBe(true);
      expect(docs[0].instances.has('ExampleObservation')).toBe(true);
      expect(docs[0].valueSets.has('MyValueSet')).toBe(true);
      expect(docs[0].invariants.has('cat-1')).toBe(true);
      expect(docs[0].codeSystems.has('MyCodeSystem')).toBe(true);
      expect(docs[0].mappings.has('SomeMapping')).toBe(true);
      expect(docs[0].logicals.has('MyLogical')).toBe(true);
      expect(docs[0].resources.has('MyResource')).toBe(true);

      expect(importer.paramRuleSets.size).toBe(10);
      expect(importer.paramRuleSets.has('FirstRuleSet')).toBe(true);
      const firstRuleSet = importer.paramRuleSets.get('FirstRuleSet');
      expect(firstRuleSet.name).toBe('FirstRuleSet');
      expect(firstRuleSet.parameters).toEqual(['system', 'strength']);
      const firstContents = `
        * code from http://example.org/{system}/info.html {strength}
        * pig from egg`;
      expect(firstRuleSet.contents).toBe(firstContents);

      const secondRuleSet = importer.paramRuleSets.get('SecondRuleSet');
      expect(secondRuleSet.name).toBe('SecondRuleSet');
      expect(secondRuleSet.parameters).toEqual(['min']);
      const secondContents = `
        * stuff {min}..`;
      expect(secondRuleSet.contents).toBe(secondContents);

      const thirdRuleSet = importer.paramRuleSets.get('ThirdRuleSet');
      expect(thirdRuleSet.name).toBe('ThirdRuleSet');
      expect(thirdRuleSet.parameters).toEqual(['cookie']);
      const thirdContents = `
        * code from {cookie}`;
      expect(thirdRuleSet.contents).toBe(thirdContents);

      const fourthRuleSet = importer.paramRuleSets.get('FourthRuleSet');
      expect(fourthRuleSet.name).toBe('FourthRuleSet');
      expect(fourthRuleSet.parameters).toEqual(['toast']);
      const fourthContents = `
        * reason ^short = {toast}`;
      expect(fourthRuleSet.contents).toBe(fourthContents);

      const fifthRuleSet = importer.paramRuleSets.get('FifthRuleSet');
      expect(fifthRuleSet.name).toBe('FifthRuleSet');
      expect(fifthRuleSet.parameters).toEqual(['strength', 'system']);
      const fifthContents = `
        * code from {system} {strength}`;
      expect(fifthRuleSet.contents).toBe(fifthContents);

      const sixthRuleSet = importer.paramRuleSets.get('SixthRuleSet');
      expect(sixthRuleSet.name).toBe('SixthRuleSet');
      expect(sixthRuleSet.parameters).toEqual(['content']);
      const sixthContents = `
        * ^description = {content}`;
      expect(sixthRuleSet.contents).toBe(sixthContents);

      const seventhRuleSet = importer.paramRuleSets.get('SeventhRuleSet');
      expect(seventhRuleSet.name).toBe('SeventhRuleSet');
      expect(seventhRuleSet.parameters).toEqual(['even', 'more']);
      const seventhContents = `
        * content[+] = {even}
        * content[+] = {more}`;
      expect(seventhRuleSet.contents).toBe(seventhContents);

      const eighthRuleSet = importer.paramRuleSets.get('EighthRuleSet');
      expect(eighthRuleSet.name).toBe('EighthRuleSet');
      expect(eighthRuleSet.parameters).toEqual(['continuation']);
      const eighthContents = `
        * continuation = {continuation} (exactly)`;
      expect(eighthRuleSet.contents).toBe(eighthContents);

      const ninthRuleSet = importer.paramRuleSets.get('NinthRuleSet');
      expect(ninthRuleSet.name).toBe('NinthRuleSet');
      expect(ninthRuleSet.parameters).toEqual(['tiring']);
      const ninthContents = `
        * code from {tiring}`;
      expect(ninthRuleSet.contents).toBe(ninthContents);

      const tenthRuleSet = importer.paramRuleSets.get('TenthRuleSet');
      expect(tenthRuleSet.name).toBe('TenthRuleSet');
      expect(tenthRuleSet.parameters).toEqual(['conclusion']);
      const tenthContents = `
        * valueString = {conclusion}`;
      expect(tenthRuleSet.contents).toBe(tenthContents);
    });

    it('should log an error and skip the ParamRuleSet when encountering a ParamRuleSet with a name used by another ParamRuleSet', () => {
      const importer = new FSHImporter();
      const input = `
        RuleSet: MyRuleSet (system, strength)
        * code from http://example.org/{system}/info.html {strength}
        * pig from egg

        RuleSet: MyRuleSet (someName)
        * name = "Dr. {someName}"
      `;

      importer.import([new RawFSH(input, 'Params.fsh')]);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(importer.paramRuleSets.size).toBe(1);
      expect(importer.paramRuleSets.has('MyRuleSet')).toBe(true);
      const result = importer.paramRuleSets.get('MyRuleSet');
      expect(result.name).toBe('MyRuleSet');
      expect(result.parameters).toEqual(['system', 'strength']);
      const expectedContents = `
        * code from http://example.org/{system}/info.html {strength}
        * pig from egg`;
      expect(result.contents).toBe(expectedContents);
      expect(loggerSpy.getLastMessage('error')).toMatch(/RuleSet named MyRuleSet already exists/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Params\.fsh.*Line: 6 - 7/s);
    });

    it('should log an error and skip the ParamRuleSet when encountering an ParamRuleSet with a name used by another ParamRuleSet in another file', () => {
      const importer = new FSHImporter();
      const input1 = `
        RuleSet: MyRuleSet (system, strength)
        * code from http://example.org/{system}/info.html {strength}
        * pig from egg
      `;

      const input2 = `
        RuleSet: MyRuleSet (someName)
        * name = "Dr. {someName}"
      `;

      importer.import([new RawFSH(input1, 'File1.fsh'), new RawFSH(input2, 'File2.fsh')]);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(importer.paramRuleSets.size).toBe(1);
      expect(importer.paramRuleSets.size).toBe(1);
      expect(importer.paramRuleSets.has('MyRuleSet')).toBe(true);
      const result = importer.paramRuleSets.get('MyRuleSet');
      expect(result.name).toBe('MyRuleSet');
      expect(result.parameters).toEqual(['system', 'strength']);
      const expectedContents = `
        * code from http://example.org/{system}/info.html {strength}
        * pig from egg`;
      expect(result.contents).toBe(expectedContents);
      expect(loggerSpy.getLastMessage('error')).toMatch(/RuleSet named MyRuleSet already exists/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: File2\.fsh.*Line: 2 - 3/s);
    });

    it('should log a warning when a ParamRuleSet has parameters that are not used in the contents', () => {
      const importer = new FSHImporter();
      const input = `
        RuleSet: MyRuleSet (system, something, strength, extra)
        * code from http://example.org/{system}/info.html {strength}
        * pig from egg
      `;

      importer.import([new RawFSH(input, 'Params.fsh')]);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /RuleSet MyRuleSet contains unused parameters: something, extra/s
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Params\.fsh.*Line: 2 - 4/s);
    });
  });
});
