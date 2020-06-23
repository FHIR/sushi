import { FSHTank, FSHDocument } from '../../src/import';
import { Profile, RuleSet } from '../../src/fshtypes';
import { InsertRule, CardRule } from '../../src/fshtypes/rules';
import { loggerSpy, assertCardRule } from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';
import { applyInsertRules } from '../../src/fhirtypes/common';
describe('applyInsertRules', () => {
  let doc: FSHDocument;
  let tank: FSHTank;
  let profile: Profile;
  let ruleSet1: RuleSet;
  let ruleSet2: RuleSet;

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    tank = new FSHTank([doc], minimalConfig);
    loggerSpy.reset();

    profile = new Profile('Foo').withFile('Profile.fsh').withLocation([5, 6, 7, 16]);
    profile.parent = 'Observation';
    doc.profiles.set(profile.name, profile);

    ruleSet1 = new RuleSet('Bar');
    doc.ruleSets.set(ruleSet1.name, ruleSet1);

    ruleSet2 = new RuleSet('Baz');
    doc.ruleSets.set(ruleSet2.name, ruleSet2);
  });

  it('should apply rules from a single level insert rule', () => {
    // RuleSet: Bar
    // * category 1..1
    //
    // Profile: Foo
    // Parent: Observation
    // * insert Bar
    const cardRule = new CardRule('category');
    cardRule.min = 1;
    cardRule.max = '1';
    ruleSet1.rules.push(cardRule);

    const insertRule = new InsertRule();
    insertRule.ruleSet = 'Bar';
    profile.rules.push(insertRule);

    applyInsertRules(profile, tank);

    expect(profile.rules).toHaveLength(1);
    assertCardRule(profile.rules[0], 'category', 1, '1');
  });

  it('should apply rules from a single level insert rule in correct order', () => {
    // RuleSet: Bar
    // * subject 1..
    //
    // Profile: Foo
    // Parent: Observation
    // * category ..1
    // * insert Bar
    // * focus ..1

    const categoryRule = new CardRule('category');
    categoryRule.min = 1;
    categoryRule.max = '1';
    const subjectRule = new CardRule('subject');
    subjectRule.min = 1;
    subjectRule.max = '1';
    const focusRule = new CardRule('focus');
    focusRule.min = 1;
    focusRule.max = '1';
    const insertRule = new InsertRule();
    insertRule.ruleSet = 'Bar';

    ruleSet1.rules.push(subjectRule);
    profile.rules.push(categoryRule, insertRule, focusRule);

    applyInsertRules(profile, tank);
    expect(profile.rules).toHaveLength(3);
    assertCardRule(profile.rules[0], 'category', 1, '1');
    assertCardRule(profile.rules[1], 'subject', 1, '1');
    assertCardRule(profile.rules[2], 'focus', 1, '1');
  });

  it('should apply rules from multiple single level insert rules in correct order', () => {
    // RuleSet: Bar
    // * status 1..1
    // RuleSet: Baz
    // * focus 1..1
    //
    // Profile: Foo
    // Parent: Observation
    // * insert Bar
    // * insert Baz
    const subjectRule = new CardRule('subject');
    subjectRule.min = 1;
    subjectRule.max = '1';
    ruleSet1.rules.push(subjectRule);
    const focusRule = new CardRule('focus');
    focusRule.min = 1;
    focusRule.max = '1';
    ruleSet2.rules.push(focusRule);

    const barRule = new InsertRule();
    barRule.ruleSet = 'Bar';
    const bazRule = new InsertRule();
    bazRule.ruleSet = 'Baz';
    profile.rules.push(barRule, bazRule);

    applyInsertRules(profile, tank);
    expect(profile.rules).toHaveLength(2);
    assertCardRule(profile.rules[0], 'subject', 1, '1');
    assertCardRule(profile.rules[1], 'focus', 1, '1');
  });

  it('should apply rules from a nested insert rule in the correct order', () => {
    // RuleSet: Bar
    // * category ..1
    // * insert Baz
    // RuleSet: Baz
    // * subject 1..
    // Profile: Foo
    // Parent: Observation
    // * insert Bar
    // * focus ..1
    const categoryRule = new CardRule('category');
    categoryRule.min = 1;
    categoryRule.max = '1';
    const subjectRule = new CardRule('subject');
    subjectRule.min = 1;
    subjectRule.max = '1';
    const focusRule = new CardRule('focus');
    focusRule.min = 1;
    focusRule.max = '1';
    const insertBazRule = new InsertRule();
    insertBazRule.ruleSet = 'Baz';
    const insertBarRule = new InsertRule();
    insertBarRule.ruleSet = 'Bar';

    ruleSet1.rules.push(categoryRule, insertBazRule);
    ruleSet2.rules.push(subjectRule);
    profile.rules.push(insertBarRule, focusRule);

    applyInsertRules(profile, tank);
    expect(profile.rules).toHaveLength(3);
    assertCardRule(profile.rules[0], 'category', 1, '1');
    assertCardRule(profile.rules[1], 'subject', 1, '1');
    assertCardRule(profile.rules[2], 'focus', 1, '1');
  });

  it('should ignore insert rules that cause a circular dependency, and log an error', () => {
    // RuleSet: Bar
    // * insert Baz
    // RuleSet: Baz
    // * insert Bar
    // * subject 1..
    // Profile: Foo
    // Parent: Observation
    // * insert Bar
    const subjectRule = new CardRule('subject');
    subjectRule.min = 1;
    subjectRule.max = '1';
    const insertBazRule = new InsertRule();
    insertBazRule.ruleSet = 'Baz';
    const insertBarRule = new InsertRule().withFile('Insert.fsh').withLocation([1, 2, 3, 4]);
    insertBarRule.ruleSet = 'Bar';

    ruleSet1.rules.push(insertBazRule);
    ruleSet2.rules.push(insertBarRule, subjectRule);
    profile.rules.push(insertBarRule);

    applyInsertRules(profile, tank);
    expect(profile.rules).toHaveLength(1);
    assertCardRule(profile.rules[0], 'subject', 1, '1');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Bar will cause a circular dependency.*File: Insert\.fsh.*Line: 1 - 3.*/s
    );
  });

  it('should log an error when a ruleSet cannot be found', () => {
    // Profile: Foo
    // Parent: Observation
    // * insert Bam
    const cardRule = new CardRule('category');
    cardRule.min = 1;
    cardRule.max = '1';
    ruleSet1.rules.push(cardRule);

    const insertRule = new InsertRule().withFile('NoBam.fsh').withLocation([1, 2, 3, 4]);
    insertRule.ruleSet = 'Bam';
    profile.rules.push(insertRule);

    applyInsertRules(profile, tank);

    expect(profile.rules).toHaveLength(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Unable to find definition for RuleSet Bam.*File: NoBam\.fsh.*Line: 1 - 3\D*/s
    );
  });
});
