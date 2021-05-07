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
  assertValueSetFilterComponent
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
      assertCaretValueRule(profile.rules[1], 'name', 'short', 'foo', false);
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
      assertCaretValueRule(profile.rules[2], 'birthDate', 'short', 'foo', false);
    });

    it('should apply the last path in a comma separated list when multiple paths are used to set context', () => {
      const input = `
      Profile: Foo
      Parent: Patient
      * name, birthDate MS
        * ^short = "foo"
    `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      // One warning related to deprecated usage of commas
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
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
      assertCaretValueRule(profile.rules[2], 'birthDate', 'short', 'foo', false);
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

    it('should log an error when a ConceptRule is indented', () => {
      const input = `
        CodeSystem: Foo
        * #101
          * #102
      `;

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /rule that does not use a path cannot be indented/
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.codeSystems.size).toBe(1);
      const cs = result.codeSystems.get('Foo');
      expect(cs.name).toBe('Foo');
      expect(cs.rules.length).toBe(2);
      assertConceptRule(cs.rules[0], '101', undefined, undefined);
      // rule is not assigned any context
      assertConceptRule(cs.rules[1], '102', undefined, undefined);
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
});
