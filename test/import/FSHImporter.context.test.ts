import { loggerSpy } from '../testhelpers/loggerSpy';
import { importSingleText } from '../testhelpers/importSingleText';
import {
  assertAssignmentRule,
  assertCardRule,
  assertCaretValueRule,
  assertConceptRule,
  assertFlagRule,
  assertInsertRule,
  assertObeysRule,
  assertValueSetConceptComponent,
  assertValueSetFilterComponent,
  assertAddElementRule
} from '../testhelpers/asserts';
import { FshCode } from '../../src/fshtypes';

describe('FSHImporter', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('context', () => {
    it('should parse non-indented rules', () => {
      const input = `
        Instance: Foo
        InstanceOf: Patient
        * name.family = "foo"
        * name.given = "bar"
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'name.family', 'foo');
      assertAssignmentRule(instance.rules[1], 'name.given', 'bar');
    });

    it('should parse a rule that has context while ignoring whitespace lines', () => {
      const input = `
      Instance: Foo
      InstanceOf: Patient
      * name.family = "foo"

        * id = "foo-id"
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'name.family', 'foo');
      assertAssignmentRule(instance.rules[1], 'name.family.id', 'foo-id');
    });

    it('should parse a rule that has context', () => {
      const input = `
      Instance: Foo
      InstanceOf: Patient
      * name.family = "foo"
        * id = "foo-id"
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'name.family', 'foo');
      assertAssignmentRule(instance.rules[1], 'name.family.id', 'foo-id');
    });

    it('should parse multiple rules at the same level of context', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * name 1..1
        * family 1..1
        * given 1..1
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      expect(profile.rules.length).toBe(3);
      assertCardRule(profile.rules[0], 'name', 1, 1);
      assertCardRule(profile.rules[1], 'name.family', 1, 1);
      assertCardRule(profile.rules[2], 'name.given', 1, 1);
    });

    it('should preserve higher level context when decreasing indent', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * name 1..1
        * family 1..1
          * id 1..1
            * id 1..1
        * given 1..1
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      expect(profile.rules.length).toBe(5);
      assertCardRule(profile.rules[0], 'name', 1, 1);
      assertCardRule(profile.rules[1], 'name.family', 1, 1);
      assertCardRule(profile.rules[2], 'name.family.id', 1, 1);
      assertCardRule(profile.rules[3], 'name.family.id.id', 1, 1);
      assertCardRule(profile.rules[4], 'name.given', 1, 1);
    });

    it('should parse a rule that only sets a path context', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * name
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      // Path Rules are not added to the rules array
      expect(profile.rules.length).toBe(0);
    });

    it('should use context from rules that only set context', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * name
        * family 1..1
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      expect(profile.rules.length).toBe(1);
      assertCardRule(profile.rules[0], 'name.family', 1, 1);
    });

    it('should change + to = when setting context on children of soft indexed rules', () => {
      const input = `
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+]
        * linkId = "foo"
        * item[+]
          * linkId = "bar"
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'item[+].linkId', 'foo');
      assertAssignmentRule(instance.rules[1], 'item[=].item[+].linkId', 'bar');
    });

    it('should change nested + to = when setting context on children of soft indexed rules', () => {
      const input = `
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+].item[+]
        * linkId = "foo"
        * item[+]
          * linkId = "bar"
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'item[+].item[+].linkId', 'foo');
      assertAssignmentRule(instance.rules[1], 'item[=].item[=].item[+].linkId', 'bar');
    });

    it('should parse child rules that have a blank path', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * name 1..1
        * ^short = "foo"
        * obeys inv1
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      expect(profile.rules.length).toBe(3);
      assertCardRule(profile.rules[0], 'name', 1, 1);
      assertCaretValueRule(profile.rules[1], 'name', 'short', 'foo', false, ['name']);
      assertObeysRule(profile.rules[2], 'name', 'inv1');
    });

    it('should apply context to multiple paths', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * name
        * family and given MS
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      expect(profile.rules.length).toBe(2);
      assertFlagRule(
        profile.rules[0],
        'name.family',
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      assertFlagRule(
        profile.rules[1],
        'name.given',
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it('should apply the last path in a list when multiple paths are used to set context', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * name and birthDate MS
        * ^short = "foo"
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      expect(profile.rules.length).toBe(3);
      assertFlagRule(
        profile.rules[0],
        'name',
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      assertFlagRule(
        profile.rules[1],
        'birthDate',
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      assertCaretValueRule(profile.rules[2], 'birthDate', 'short', 'foo', false, ['birthDate']);
    });

    it('should apply context to AddElement rules', () => {
      const input = `
      Logical: Human
      * family 0..1 BackboneElement "Family"
        * mother 0..2 string "Mother"
        * father 0..2 string "Father"
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.logicals.size).toBe(1);
      const logical = result.logicals.get('Human');
      expect(logical.name).toBe('Human');
      expect(logical.rules.length).toBe(3);
      assertAddElementRule(logical.rules[0], 'family', {
        card: { min: 0, max: '1' },
        types: [{ type: 'BackboneElement' }],
        defs: { short: 'Family' }
      });
      assertAddElementRule(logical.rules[1], 'family.mother', {
        card: { min: 0, max: '2' },
        types: [{ type: 'string' }],
        defs: { short: 'Mother' }
      });
      assertAddElementRule(logical.rules[2], 'family.father', {
        card: { min: 0, max: '2' },
        types: [{ type: 'string' }],
        defs: { short: 'Father' }
      });
    });

    it('should log an error when a rule is indented below a rule without a path', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * ^url = "http://example.org"
        * name 1..1
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/Rule cannot be indented/);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      expect(profile.rules.length).toBe(2);
      assertCaretValueRule(profile.rules[0], '', 'url', 'http://example.org', false);
      assertCardRule(profile.rules[1], 'name', 1, 1);
    });

    it('should log an error when a rule is indented an invalid amount of spaces', () => {
      // only 1 space of indent
      const input = `
        Instance: Foo
        InstanceOf: Patient
        * name.family = "foo"
         * id = "bar"
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Unable to determine path context.*1 space/
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'name.family', 'foo');
      // rule is not assigned any context
      assertAssignmentRule(instance.rules[1], 'id', 'bar');
    });

    it('should log an error when a rule is indented a negative amount of spaces', () => {
      // -2 space of indent
      const input = `
        Instance: Foo
        InstanceOf: Patient
      * name.family = "foo"
        * id = "bar"
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Unable to determine path context.*-2 space/
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'name.family', 'foo');
      // rule is not assigned any context
      assertAssignmentRule(instance.rules[1], 'id', 'bar');
    });

    it('should log an error when the first rule of a definition is indented', () => {
      const input = `
        Instance: Foo
        InstanceOf: Patient
          * name.family = "foo"
        * id = "bar"
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /first rule of a definition cannot be indented/
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'name.family', 'foo');
      // rule is not assigned any context
      assertAssignmentRule(instance.rules[1], 'id', 'bar');
    });

    it('should log an error when a rule is indented too deeply', () => {
      // 4 spaces of indent
      const input = `
        Instance: Foo
        InstanceOf: Patient
        * name.family = "foo"
            * id = "bar"
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/indented too deeply/);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'name.family', 'foo');
      // rule is not assigned any context
      assertAssignmentRule(instance.rules[1], 'id', 'bar');
    });

    it('should log an error when an InsertRule is indented', () => {
      const input = `
        Instance: Foo
        InstanceOf: Patient
        * name.family = "foo"
          * insert Bar
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /rule that does not use a path cannot be indented/
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'name.family', 'foo');
      // rule is not assigned any context
      assertInsertRule(instance.rules[1], 'Bar');
    });

    it('should log an error when a ValueSetFilterComponentRule is indented', () => {
      const input = `
        ValueSet: Foo
        * include codes from system http://example.org
          * include codes from system http://indent.org
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /rule that does not use a path cannot be indented/
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.valueSets.size).toBe(1);
      const vs = result.valueSets.get('Foo');
      expect(vs.name).toBe('Foo');
      expect(vs.rules.length).toBe(2);
      assertValueSetFilterComponent(vs.rules[0], 'http://example.org', undefined, []);
      // rule is not assigned any context
      assertValueSetFilterComponent(vs.rules[1], 'http://indent.org', undefined, []);
    });

    it('should log an error when a ValueSetConceptComponentRule is indented', () => {
      const input = `
        ValueSet: Foo
        * http://example.org#foo
          * http://example.org#bar
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /rule that does not use a path cannot be indented/
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.valueSets.size).toBe(1);
      const vs = result.valueSets.get('Foo');
      expect(vs.name).toBe('Foo');
      expect(vs.rules.length).toBe(1);
      assertValueSetConceptComponent(vs.rules[0], 'http://example.org', undefined, [
        new FshCode('foo', 'http://example.org')
          .withLocation([3, 11, 3, 32])
          .withFile('Context.fsh'),
        new FshCode('bar', 'http://example.org')
          .withLocation([4, 13, 4, 34])
          .withFile('Context.fsh')
      ]);
    });
  });

  describe('code context', () => {
    it('should parse a code system with indented hierarchical rules', () => {
      const input = `
      CodeSystem: ZOO
      * #bear "Bear" "A member of family Ursidae."
        * #sunbear "Sun bear" "Helarctos malayanus"
          * #ursula "Ursula the sun bear"
      `;
      const result = importSingleText(input, 'Zoo.fsh');
      expect(result.codeSystems.size).toBe(1);
      const codeSystem = result.codeSystems.get('ZOO');
      expect(codeSystem.name).toBe('ZOO');
      expect(codeSystem.rules.length).toBe(3);
      assertConceptRule(codeSystem.rules[0], 'bear', 'Bear', 'A member of family Ursidae.', []);
      expect(codeSystem.rules[0].sourceInfo.location).toEqual({
        startLine: 3,
        startColumn: 7,
        endLine: 3,
        endColumn: 50
      });
      assertConceptRule(codeSystem.rules[1], 'sunbear', 'Sun bear', 'Helarctos malayanus', [
        'bear'
      ]);
      expect(codeSystem.rules[1].sourceInfo.location).toEqual({
        startLine: 4,
        startColumn: 9,
        endLine: 4,
        endColumn: 51
      });
      assertConceptRule(codeSystem.rules[2], 'ursula', 'Ursula the sun bear', undefined, [
        'bear',
        'sunbear'
      ]);
      expect(codeSystem.rules[2].sourceInfo.location).toEqual({
        startLine: 5,
        startColumn: 11,
        endLine: 5,
        endColumn: 41
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should parse a code system that uses an indented CaretValueRule on a top-level concept', () => {
      const input = `
      CodeSystem: ZOO
      * #anteater "Anteater"
        * ^property[0].valueString = "Their threat pose is really cute."
      `;
      const result = importSingleText(input, 'Zoo.fsh');
      const codeSystem = result.codeSystems.get('ZOO');
      assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
      expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
      assertCaretValueRule(
        codeSystem.rules[1],
        '',
        'property[0].valueString',
        'Their threat pose is really cute.',
        false,
        ['anteater']
      );
      expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should parse a code system that uses an indented CaretValueRule on a nested concept', () => {
      const input = `
      CodeSystem: ZOO
      * #anteater "Anteater"
        * #northern "Northern tamandua"
          * ^property[0].valueString = "They are strong climbers."
      `;
      const result = importSingleText(input, 'Zoo.fsh');
      const codeSystem = result.codeSystems.get('ZOO');
      assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
      expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
      assertConceptRule(codeSystem.rules[1], 'northern', 'Northern tamandua', undefined, [
        'anteater'
      ]);
      expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
      assertCaretValueRule(
        codeSystem.rules[2],
        '',
        'property[0].valueString',
        'They are strong climbers.',
        false,
        ['anteater', 'northern']
      );
      expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should allow code path context to be set by referencing an existing top-level code', () => {
      const input = `
      CodeSystem: ZOO
      * #anteater "Anteater"
        * #northern "Northern tamandua"
          * ^property[0].valueString = "They are strong climbers."
      * #anteater
        * ^property[0].valueString = "Their threat pose is really cute."
      `;
      const result = importSingleText(input, 'Zoo.fsh');
      const codeSystem = result.codeSystems.get('ZOO');
      expect(codeSystem.rules).toHaveLength(4);
      assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
      expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
      assertConceptRule(codeSystem.rules[1], 'northern', 'Northern tamandua', undefined, [
        'anteater'
      ]);
      expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
      assertCaretValueRule(
        codeSystem.rules[2],
        '',
        'property[0].valueString',
        'They are strong climbers.',
        false,
        ['anteater', 'northern']
      );
      expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
      assertCaretValueRule(
        codeSystem.rules[3],
        '',
        'property[0].valueString',
        'Their threat pose is really cute.',
        false,
        ['anteater']
      );
      expect(codeSystem.rules[3].sourceInfo.file).toBe('Zoo.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should allow code path context to be set by referencing an existing nested code', () => {
      const input = `
      CodeSystem: ZOO
      * #anteater "Anteater"
        * #northern "Northern tamandua"
        * #southern "Southern tamandua"
      * #anteater #northern
        * ^property[0].valueString = "They are strong climbers."
      `;
      const result = importSingleText(input, 'Zoo.fsh');
      const codeSystem = result.codeSystems.get('ZOO');
      expect(codeSystem.rules).toHaveLength(4);
      assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
      expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
      assertConceptRule(codeSystem.rules[1], 'northern', 'Northern tamandua', undefined, [
        'anteater'
      ]);
      expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
      assertConceptRule(codeSystem.rules[2], 'southern', 'Southern tamandua', undefined, [
        'anteater'
      ]);
      expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
      assertCaretValueRule(
        codeSystem.rules[3],
        '',
        'property[0].valueString',
        'They are strong climbers.',
        false,
        ['anteater', 'northern']
      );
      expect(codeSystem.rules[3].sourceInfo.file).toBe('Zoo.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should parse a rule set that uses an indented CaretValueRule on a top-level concept', () => {
      const input = `
      RuleSet: ZOO
      * #anteater "Anteater"
        * ^property[0].valueString = "Their threat pose is really cute."
      `;
      const result = importSingleText(input, 'Zoo.fsh');
      const codeSystem = result.ruleSets.get('ZOO');
      assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
      expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
      assertCaretValueRule(
        codeSystem.rules[1],
        'anteater',
        'property[0].valueString',
        'Their threat pose is really cute.',
        false,
        ['anteater']
      );
      expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });
});
