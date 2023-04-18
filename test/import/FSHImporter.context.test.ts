import { loggerSpy } from '../testhelpers/loggerSpy';
import { importSingleText } from '../testhelpers/importSingleText';
import {
  assertAssignmentRule,
  assertCardRule,
  assertCaretValueRule,
  assertConceptRule,
  assertFlagRule,
  assertObeysRule,
  assertValueSetConceptComponent,
  assertValueSetFilterComponent,
  assertAddElementRule,
  assertOnlyRule,
  assertInsertRule,
  assertPathRule
} from '../testhelpers/asserts';
import { FshCode } from '../../src/fshtypes';
import { leftAlign } from '../utils/leftAlign';

describe('FSHImporter', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('context', () => {
    it('should parse non-indented rules', () => {
      const input = leftAlign(`
        Instance: Foo
        InstanceOf: Patient
        * name.family = "foo"
        * name.given = "bar"
      `);

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
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Patient
      * name.family = "foo"

        * id = "foo-id"
    `);

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
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Patient
      * name.family = "foo"
        * id = "foo-id"
    `);

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
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * name 1..1
        * family 1..1
        * given 1..1
    `);

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
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * name 1..1
        * family 1..1
          * id 1..1
            * id 1..1
        * given 1..1
    `);

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

    it('should parse a rule that only sets a path context on a StructureDefinition', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * name
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      // Path Rules are not added to the rules array in Profiles
      expect(profile.rules.length).toBe(0);
    });

    it('should parse a rule that only sets a path context on an Instance', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Patient
      * name
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      // Path Rules are added to the rules array in Instances
      expect(instance.rules.length).toBe(1);
      assertPathRule(instance.rules[0], 'name');
    });

    it('should use context from rules that only set context on StructureDefinitions', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * name
        * family 1..1
    `);

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

    it('should use context from rules that only set context on Instances', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Patient
      * name
        * family = "Foo"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Patient');
      expect(instance.rules.length).toBe(2);
      assertPathRule(instance.rules[0], 'name');
      assertAssignmentRule(instance.rules[1], 'name.family', 'Foo');
    });

    it('should change + to = when setting context on children of soft indexed rules on StructureDefs', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Questionnaire
      * item[+]
        * linkId = "foo"
        * item[+]
          * linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Questionnaire');
      expect(profile.rules.length).toBe(2);
      assertAssignmentRule(profile.rules[0], 'item[+].linkId', 'foo');
      assertAssignmentRule(profile.rules[1], 'item[=].item[+].linkId', 'bar');
    });

    it('should change + to = when setting context on children of soft indexed rules on Instances', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+]
        * linkId = "foo"
        * item[+]
          * linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(4);
      assertPathRule(instance.rules[0], 'item[+]');
      assertAssignmentRule(instance.rules[1], 'item[=].linkId', 'foo');
      assertPathRule(instance.rules[2], 'item[=].item[+]');
      assertAssignmentRule(instance.rules[3], 'item[=].item[=].linkId', 'bar');
    });

    it('should keep + on consecutive path rules when setting context on first child of soft indexed rules on StructureDefinitions', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Questionnaire
      * item[+]
        * item[+]
          * linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Questionnaire');
      expect(profile.rules.length).toBe(1);
      assertAssignmentRule(profile.rules[0], 'item[+].item[+].linkId', 'bar');
    });

    it('should change + to = on consecutive path rules when setting context on first child of soft indexed rules on Instances', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+]
        * item[+]
          * linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(3);
      assertPathRule(instance.rules[0], 'item[+]');
      assertPathRule(instance.rules[1], 'item[=].item[+]');
      assertAssignmentRule(instance.rules[2], 'item[=].item[=].linkId', 'bar');
    });

    it('should log a warning for path rules that increment the index but then do not use it on StructureDefinitions', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Questionnaire
      * item[+]
      * item[+]
        * linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /the previous path context will be ignored(.|\s)*Line: 5$/
      );
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Questionnaire');
      expect(profile.rules.length).toBe(1);
      assertAssignmentRule(profile.rules[0], 'item[+].linkId', 'bar');
    });

    it('should parse path rules that increment the index but then do not use it on Instances', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+]
      * item[+]
        * linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(3);
      assertPathRule(instance.rules[0], 'item[+]');
      assertPathRule(instance.rules[1], 'item[+]');
      assertAssignmentRule(instance.rules[2], 'item[=].linkId', 'bar');
    });

    it('should not log a warning for non-path rules that increment the index', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+].linkId = "foo"
      * item[+].linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(2);
      assertAssignmentRule(instance.rules[0], 'item[+].linkId', 'foo');
      assertAssignmentRule(instance.rules[1], 'item[+].linkId', 'bar');
    });

    it('should change + to = when setting context on children of soft indexed rules which are not path rules on StructureDefinitions', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Questionnaire
      * item[+]
        * linkId = "foo"
        * item[+].linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Questionnaire');
      expect(profile.rules.length).toBe(2);
      assertAssignmentRule(profile.rules[0], 'item[+].linkId', 'foo');
      assertAssignmentRule(profile.rules[1], 'item[=].item[+].linkId', 'bar');
    });

    it('should change + to = when setting context on children of soft indexed rules which are not path rules on Instances', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+]
        * linkId = "foo"
        * item[+].linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(3);
      assertPathRule(instance.rules[0], 'item[+]');
      assertAssignmentRule(instance.rules[1], 'item[=].linkId', 'foo');
      assertAssignmentRule(instance.rules[2], 'item[=].item[+].linkId', 'bar');
    });

    it('should change + to = when setting context on grandchildren of soft indexed rules which are not path rules on StructureDefinitions', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Questionnaire
      * item[+]
        * code = #foo
          * display = "Foo"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Questionnaire');
      expect(profile.rules.length).toBe(2);
      assertAssignmentRule(
        profile.rules[0],
        'item[+].code',
        new FshCode('foo').withFile('Context.fsh').withLocation([5, 12, 5, 15])
      );
      assertAssignmentRule(profile.rules[1], 'item[=].code.display', 'Foo');
    });

    it('should change + to = when setting context on grandchildren of soft indexed rules which are not path rules on Instances', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+]
        * code = #foo
          * display = "Foo"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(3);
      assertPathRule(instance.rules[0], 'item[+]');
      assertAssignmentRule(
        instance.rules[1],
        'item[=].code',
        new FshCode('foo').withFile('Context.fsh').withLocation([5, 12, 5, 15])
      );
      assertAssignmentRule(instance.rules[2], 'item[=].code.display', 'Foo');
    });

    it('should change nested + to = when setting context on children of soft indexed rules on StructureDefinitions', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Questionnaire
      * item[+].item[+]
        * linkId = "foo"
        * item[+]
          * linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Questionnaire');
      expect(profile.rules.length).toBe(2);
      assertAssignmentRule(profile.rules[0], 'item[+].item[+].linkId', 'foo');
      assertAssignmentRule(profile.rules[1], 'item[=].item[=].item[+].linkId', 'bar');
    });

    it('should change nested + to = when setting context on children of soft indexed rules on Instances', () => {
      const input = leftAlign(`
      Instance: Foo
      InstanceOf: Questionnaire
      * item[+].item[+]
        * linkId = "foo"
        * item[+]
          * linkId = "bar"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.instances.size).toBe(1);
      const instance = result.instances.get('Foo');
      expect(instance.name).toBe('Foo');
      expect(instance.instanceOf).toBe('Questionnaire');
      expect(instance.rules.length).toBe(4);
      assertPathRule(instance.rules[0], 'item[+].item[+]');
      assertAssignmentRule(instance.rules[1], 'item[=].item[=].linkId', 'foo');
      assertPathRule(instance.rules[2], 'item[=].item[=].item[+]');
      assertAssignmentRule(instance.rules[3], 'item[=].item[=].item[=].linkId', 'bar');
    });

    it('should parse child rules that have a blank path', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * name 1..1
        * ^short = "foo"
        * obeys inv1
    `);

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

    // Note: there is no equivalent test for Instances because no Instance rules support multiple paths
    it('should apply context to multiple paths', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * name
        * family and given MS
    `);

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
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * name and birthDate MS
        * ^short = "foo"
    `);

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
      const input = leftAlign(`
      Logical: Human
      * family 0..1 BackboneElement "Family"
        * mother 0..2 string "Mother"
        * father 0..2 string "Father"
    `);

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

    it('should set the context correctly when a rule with . path is followed by a caret rule with no path', () => {
      const input = leftAlign(`
      Extension: TestExtension
      * value[x] only boolean
      * . 0..1
        * ^short = "A test extension."
        * ^definition = "Yep.  It is a test extension."
      * ^context.expression = "Patient"
      `);
      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.extensions.size).toBe(1);
      const extension = result.extensions.get('TestExtension');
      expect(extension.rules).toHaveLength(5);
      assertOnlyRule(extension.rules[0], 'value[x]', { type: 'boolean' });
      assertCardRule(extension.rules[1], '.', 0, '1');
      assertCaretValueRule(extension.rules[2], '.', 'short', 'A test extension.', false, ['.']);
      assertCaretValueRule(
        extension.rules[3],
        '.',
        'definition',
        'Yep.  It is a test extension.',
        false,
        ['.']
      );
      assertCaretValueRule(extension.rules[4], '', 'context.expression', 'Patient', false, []);
    });

    it('should log an error when a . rule is indented', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * name 1..1
        * . ^short = "foo"
    `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/The special '\.' path/);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles.size).toBe(1);
      const profile = result.profiles.get('Foo');
      expect(profile.name).toBe('Foo');
      expect(profile.parent).toBe('Patient');
      expect(profile.rules.length).toBe(2);
      assertCardRule(profile.rules[0], 'name', 1, 1);
      assertCaretValueRule(profile.rules[1], '.', 'short', 'foo', false, ['.']);
    });

    it('should log an error when a rule is indented below a rule without a path', () => {
      const input = leftAlign(`
      Profile: Foo
      Parent: Patient
      * ^url = "http://example.org"
        * name 1..1
    `);

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
      const input = leftAlign(`
        Instance: Foo
        InstanceOf: Patient
        * name.family = "foo"
         * id = "bar"
      `);

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

    it('should log an error when the first rule of a definition is indented', () => {
      const input = leftAlign(`
        Instance: Foo
        InstanceOf: Patient
          * name.family = "foo"
        * id = "bar"
      `);

      const result = importSingleText(input, 'Context.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /first rule of a definition must be left-aligned/
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
      const input = leftAlign(`
        Instance: Foo
        InstanceOf: Patient
        * name.family = "foo"
            * id = "bar"
      `);

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

    it('should log an error when a ValueSetFilterComponentRule is indented', () => {
      const input = leftAlign(`
        ValueSet: Foo
        * include codes from system http://example.org
          * include codes from system http://indent.org
      `);

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
      const input = leftAlign(`
        ValueSet: Foo
        * http://example.org#foo
          * http://example.org#bar
      `);

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
          .withLocation([3, 3, 3, 24])
          .withFile('Context.fsh'),
        new FshCode('bar', 'http://example.org').withLocation([4, 5, 4, 26]).withFile('Context.fsh')
      ]);
    });
  });

  describe('code context', () => {
    it('should parse a code system with indented hierarchical rules', () => {
      const input = leftAlign(`
      CodeSystem: ZOO
      * #bear "Bear" "A member of family Ursidae."
        * #sunbear "Sun bear" "Helarctos malayanus"
          * #ursula "Ursula the sun bear"
      `);
      const result = importSingleText(input, 'Zoo.fsh');
      expect(result.codeSystems.size).toBe(1);
      const codeSystem = result.codeSystems.get('ZOO');
      expect(codeSystem.name).toBe('ZOO');
      expect(codeSystem.rules.length).toBe(3);
      assertConceptRule(codeSystem.rules[0], 'bear', 'Bear', 'A member of family Ursidae.', []);
      expect(codeSystem.rules[0].sourceInfo.location).toEqual({
        startLine: 3,
        startColumn: 1,
        endLine: 3,
        endColumn: 44
      });
      assertConceptRule(codeSystem.rules[1], 'sunbear', 'Sun bear', 'Helarctos malayanus', [
        'bear'
      ]);
      expect(codeSystem.rules[1].sourceInfo.location).toEqual({
        startLine: 4,
        startColumn: 3,
        endLine: 4,
        endColumn: 45
      });
      assertConceptRule(codeSystem.rules[2], 'ursula', 'Ursula the sun bear', undefined, [
        'bear',
        'sunbear'
      ]);
      expect(codeSystem.rules[2].sourceInfo.location).toEqual({
        startLine: 5,
        startColumn: 5,
        endLine: 5,
        endColumn: 35
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should parse a code system that uses an indented CaretValueRule on a top-level concept', () => {
      const input = leftAlign(`
      CodeSystem: ZOO
      * #anteater "Anteater"
        * ^property[0].valueString = "Their threat pose is really cute."
      `);
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
      const input = leftAlign(`
      CodeSystem: ZOO
      * #anteater "Anteater"
        * #northern "Northern tamandua"
          * ^property[0].valueString = "They are strong climbers."
      `);
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

    it('should parse a code system that uses an indented InsertRule on a top-level concept', () => {
      const input = leftAlign(`
      CodeSystem: ZOO
      * #anteater "Anteater"
        * insert MyRuleSet
      `);
      const result = importSingleText(input, 'Zoo.fsh');
      const codeSystem = result.codeSystems.get('ZOO');
      expect(codeSystem.rules).toHaveLength(2);
      assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
      assertInsertRule(codeSystem.rules[1], '', 'MyRuleSet', [], ['anteater']);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should allow code path context to be set by referencing an existing top-level code', () => {
      const input = leftAlign(`
      CodeSystem: ZOO
      * #anteater "Anteater"
        * #northern "Northern tamandua"
          * ^property[0].valueString = "They are strong climbers."
      * #anteater
        * ^property[0].valueString = "Their threat pose is really cute."
      `);
      const result = importSingleText(input, 'Zoo.fsh');
      const codeSystem = result.codeSystems.get('ZOO');
      expect(codeSystem.rules).toHaveLength(5);
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
      assertConceptRule(codeSystem.rules[3], 'anteater', undefined, undefined, []);
      expect(codeSystem.rules[3].sourceInfo.file).toBe('Zoo.fsh');
      assertCaretValueRule(
        codeSystem.rules[4],
        '',
        'property[0].valueString',
        'Their threat pose is really cute.',
        false,
        ['anteater']
      );
      expect(codeSystem.rules[4].sourceInfo.file).toBe('Zoo.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should allow code path context to be set by referencing an existing nested code', () => {
      const input = leftAlign(`
      CodeSystem: ZOO
      * #anteater "Anteater"
        * #northern "Northern tamandua"
        * #southern "Southern tamandua"
      * #anteater #northern
        * ^property[0].valueString = "They are strong climbers."
      `);
      const result = importSingleText(input, 'Zoo.fsh');
      const codeSystem = result.codeSystems.get('ZOO');
      expect(codeSystem.rules).toHaveLength(5);
      assertConceptRule(codeSystem.rules[0], 'anteater', 'Anteater', undefined, []);
      expect(codeSystem.rules[0].sourceInfo.file).toBe('Zoo.fsh');
      assertConceptRule(codeSystem.rules[1], 'northern', 'Northern tamandua', undefined, [
        'anteater'
      ]);
      expect(codeSystem.rules[1].sourceInfo.file).toBe('Zoo.fsh');
      assertConceptRule(codeSystem.rules[2], 'southern', 'Southern tamandua', undefined, [
        'anteater'
      ]);
      expect(codeSystem.rules[2].sourceInfo.file).toBe('Zoo.fsh');
      assertConceptRule(codeSystem.rules[3], 'northern', undefined, undefined, ['anteater']);
      expect(codeSystem.rules[3].sourceInfo.file).toBe('Zoo.fsh');
      assertCaretValueRule(
        codeSystem.rules[4],
        '',
        'property[0].valueString',
        'They are strong climbers.',
        false,
        ['anteater', 'northern']
      );
      expect(codeSystem.rules[4].sourceInfo.file).toBe('Zoo.fsh');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should parse a rule set that uses an indented CaretValueRule on a top-level concept', () => {
      const input = leftAlign(`
      RuleSet: ZOO
      * #anteater "Anteater"
        * ^property[0].valueString = "Their threat pose is really cute."
      `);
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
