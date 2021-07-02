import { FSHTank, FSHDocument } from '../../src/import';
import { Profile, Logical, RuleSet, FshCode, FshValueSet, Instance } from '../../src/fshtypes';
import {
  InsertRule,
  CardRule,
  ConceptRule,
  AssignmentRule,
  AddElementRule,
  CaretValueRule
} from '../../src/fshtypes/rules';
import {
  loggerSpy,
  assertCardRule,
  assertValueSetConceptComponent,
  assertAssignmentRule,
  assertAddElementRule,
  assertCaretValueRule
} from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';
import { applyInsertRules } from '../../src/fhirtypes/common';

describe('applyInsertRules', () => {
  let doc: FSHDocument;
  let tank: FSHTank;
  let profile: Profile;
  let instance: Instance;
  let ruleSet1: RuleSet;
  let ruleSet2: RuleSet;

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    tank = new FSHTank([doc], minimalConfig);
    loggerSpy.reset();

    profile = new Profile('Foo').withFile('Profile.fsh').withLocation([5, 6, 7, 16]);
    profile.parent = 'Observation';
    doc.profiles.set(profile.name, profile);

    instance = new Instance('Far');
    instance.instanceOf = 'Patient';
    doc.instances.set(instance.name, instance);

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

    const insertRule = new InsertRule('');
    insertRule.ruleSet = 'Bar';
    profile.rules.push(insertRule);

    applyInsertRules(profile, tank);

    expect(profile.rules).toHaveLength(1);
    assertCardRule(profile.rules[0], 'category', 1, '1');
  });

  it('should apply rules from a single level insert rule with a path', () => {
    // RuleSet: Bar
    // * coding 1..*
    //
    // Profile: Foo
    // Parent: Observation
    // * category insert Bar
    const cardRule = new CardRule('coding');
    cardRule.min = 1;
    cardRule.max = '*';
    ruleSet1.rules.push(cardRule);

    const insertRule = new InsertRule('category');
    insertRule.ruleSet = 'Bar';
    profile.rules.push(insertRule);

    applyInsertRules(profile, tank);

    expect(profile.rules).toHaveLength(1);
    assertCardRule(profile.rules[0], 'category.coding', 1, '*');
  });

  it('should apply a rule without a path from a single level insert rule with a path', () => {
    // RuleSet: Bar
    // * ^short = "foo"
    //
    // Profile: Foo
    // Parent: Observation
    // * category insert Bar
    const caretRule = new CaretValueRule('');
    caretRule.caretPath = 'short';
    caretRule.value = 'foo';
    ruleSet1.rules.push(caretRule);

    const insertRule = new InsertRule('category');
    insertRule.ruleSet = 'Bar';
    profile.rules.push(insertRule);

    applyInsertRules(profile, tank);

    expect(profile.rules).toHaveLength(1);
    assertCaretValueRule(profile.rules[0], 'category', 'short', 'foo', undefined, []);
  });

  it('should only apply soft indexing once when applying rules from a rule with a path', () => {
    // RuleSet: Bar
    // * family = "foo"
    // * given[0] = "bar"
    //
    // Instance: Foo
    // InstanceOf: Patient
    // * name[+] insert Bar
    const rule1 = new AssignmentRule('family');
    rule1.value = 'foo';
    rule1.exactly = false;
    rule1.isInstance = false;
    const rule2 = new AssignmentRule('given[0]');
    rule2.value = 'bar';
    rule2.exactly = false;
    rule2.isInstance = false;
    ruleSet1.rules.push(rule1, rule2);

    const insertRule1 = new InsertRule('name[+]');
    insertRule1.ruleSet = 'Bar';
    instance.rules.push(insertRule1);

    applyInsertRules(instance, tank);

    expect(instance.rules).toHaveLength(2);
    assertAssignmentRule(instance.rules[0], 'name[+].family', 'foo', false, false);
    assertAssignmentRule(instance.rules[1], 'name[=].given[0]', 'bar', false, false);
  });

  it('should not apply rules from a single level insert rule that are not valid', () => {
    // RuleSet: Bar
    // * #bear
    //
    // Profile: Foo
    // Parent: Observation
    // * insert Bar
    const concept = new ConceptRule('bear').withFile('Concept.fsh').withLocation([1, 2, 3, 4]);
    ruleSet1.rules.push(concept);

    const insertRule = new InsertRule('').withFile('Insert.fsh').withLocation([5, 6, 7, 8]);
    insertRule.ruleSet = 'Bar';
    profile.rules.push(insertRule);

    applyInsertRules(profile, tank);

    expect(profile.rules).toHaveLength(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /ConceptRule.*Profile.*File: Concept\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Line: 5 - 7\D*/s
    );
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
    const insertRule = new InsertRule('');
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

    const barRule = new InsertRule('');
    barRule.ruleSet = 'Bar';
    const bazRule = new InsertRule('');
    bazRule.ruleSet = 'Baz';
    profile.rules.push(barRule, bazRule);

    applyInsertRules(profile, tank);
    expect(profile.rules).toHaveLength(2);
    assertCardRule(profile.rules[0], 'subject', 1, '1');
    assertCardRule(profile.rules[1], 'focus', 1, '1');
  });

  it('should apply rules from repeated single level insert rules in correct order', () => {
    // RuleSet: Bar
    // * status 1..1
    //
    // Profile: Foo
    // Parent: Observation
    // * insert Bar
    // * insert Bar
    const subjectRule = new CardRule('subject');
    subjectRule.min = 1;
    subjectRule.max = '1';
    ruleSet1.rules.push(subjectRule);

    const barRule = new InsertRule('');
    barRule.ruleSet = 'Bar';
    profile.rules.push(barRule, barRule);

    applyInsertRules(profile, tank);
    expect(profile.rules).toHaveLength(2);
    assertCardRule(profile.rules[0], 'subject', 1, '1');
    assertCardRule(profile.rules[1], 'subject', 1, '1');
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
    const insertBazRule = new InsertRule('');
    insertBazRule.ruleSet = 'Baz';
    const insertBarRule = new InsertRule('');
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

  it('should apply rules from a nested insert rule with paths', () => {
    // RuleSet: Bar
    // * coding 1..*
    // * coding insert Baz
    //
    // RuleSet: Baz
    // * system 1..1
    //
    // Profile: Foo
    // Parent: Observation
    // * category insert Bar
    // * focus ..1
    const categoryRule = new CardRule('coding');
    categoryRule.min = 1;
    categoryRule.max = '*';
    const subjectRule = new CardRule('system');
    subjectRule.min = 1;
    subjectRule.max = '1';
    const focusRule = new CardRule('focus');
    focusRule.min = 1;
    focusRule.max = '1';
    const insertBazRule = new InsertRule('coding');
    insertBazRule.ruleSet = 'Baz';
    const insertBarRule = new InsertRule('category');
    insertBarRule.ruleSet = 'Bar';

    ruleSet1.rules.push(categoryRule, insertBazRule);
    ruleSet2.rules.push(subjectRule);
    profile.rules.push(insertBarRule, focusRule);

    applyInsertRules(profile, tank);
    expect(profile.rules).toHaveLength(3);
    assertCardRule(profile.rules[0], 'category.coding', 1, '*');
    assertCardRule(profile.rules[1], 'category.coding.system', 1, '1');
    assertCardRule(profile.rules[2], 'focus', 1, '1');
  });

  it('should apply rules from a nested insert rule even when they repeat', () => {
    // RuleSet: Bar
    // * category ..1
    // * insert Baz
    // RuleSet: Baz
    // * subject 1..
    // Profile: Foo
    // Parent: Observation
    // * insert Baz
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
    const insertBazRule = new InsertRule('');
    insertBazRule.ruleSet = 'Baz';
    const insertBarRule = new InsertRule('');
    insertBarRule.ruleSet = 'Bar';

    ruleSet1.rules.push(categoryRule, insertBazRule);
    ruleSet2.rules.push(subjectRule);
    profile.rules.push(insertBazRule, insertBarRule, focusRule);

    applyInsertRules(profile, tank);
    expect(profile.rules).toHaveLength(4);
    assertCardRule(profile.rules[0], 'subject', 1, '1');
    assertCardRule(profile.rules[1], 'category', 1, '1');
    assertCardRule(profile.rules[2], 'subject', 1, '1');
    assertCardRule(profile.rules[3], 'focus', 1, '1');
  });

  it('should convert a ConceptRule to a ValueSetConceptComponent when applying to a FshValueSet', () => {
    // RuleSet: Bar
    // * ZOO#bear "brown bear"
    //
    // ValueSet: Foo
    // * insert Bar
    const vs = new FshValueSet('Foo').withFile('VS.fsh').withLocation([5, 6, 7, 16]);
    doc.valueSets.set(vs.name, vs);

    const concept = new ConceptRule('bear', 'brown bear');
    concept.system = 'ZOO';
    ruleSet1.rules.push(concept);

    const insertRule = new InsertRule('');
    insertRule.ruleSet = 'Bar';
    vs.rules.push(insertRule);

    applyInsertRules(vs, tank);

    expect(vs.rules).toHaveLength(1);
    assertValueSetConceptComponent(
      vs.rules[0],
      undefined,
      undefined,
      [new FshCode('bear', 'ZOO', 'brown bear')],
      true
    );
  });

  it('should convert a ConceptRule with a definition to a ValueSetConceptComponent and log a warning when applying to a FshValueSet', () => {
    // RuleSet: Bar
    // * ZOO#bear "brown bear" "brown bears are kind of scary"
    //
    // ValueSet: Foo
    // * insert Bar
    const vs = new FshValueSet('Foo').withFile('VS.fsh').withLocation([5, 6, 7, 16]);
    doc.valueSets.set(vs.name, vs);

    const concept = new ConceptRule('bear', 'brown bear', 'brown bears are kind of scary')
      .withFile('Concept.fsh')
      .withLocation([1, 2, 3, 4]);
    concept.system = 'ZOO';
    ruleSet1.rules.push(concept);

    const insertRule = new InsertRule('').withFile('Insert.fsh').withLocation([1, 2, 3, 4]);
    insertRule.ruleSet = 'Bar';
    vs.rules.push(insertRule);

    applyInsertRules(vs, tank);

    expect(vs.rules).toHaveLength(1);
    assertValueSetConceptComponent(
      vs.rules[0],
      undefined,
      undefined,
      [new FshCode('bear', 'ZOO', 'brown bear')],
      true
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /ValueSet concepts should not include a definition, only system, code, and display are supported.*File: Concept\.fsh.*Line: 1 - 3\D*/s
    );
  });

  it('should not convert a ConceptRule to a ValueSetConceptComponent when applying to a Profile', () => {
    // RuleSet: Bar
    // * ZOO#bear "brown bear"
    //
    // Profile: Foo
    // * insert Bar
    const concept = new ConceptRule('bear', 'brown bear')
      .withFile('Concept.fsh')
      .withLocation([1, 2, 3, 4]);
    concept.system = 'ZOO';
    ruleSet1.rules.push(concept);

    const insertRule = new InsertRule('').withFile('Insert.fsh').withLocation([1, 2, 3, 4]);
    insertRule.ruleSet = 'Bar';
    profile.rules.push(insertRule);

    applyInsertRules(profile, tank);

    expect(profile.rules).toHaveLength(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /ConceptRule.*Profile.*File: Concept\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Line: 1 - 3\D*/s
    );
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
    const insertBazRule = new InsertRule('');
    insertBazRule.ruleSet = 'Baz';
    const insertBarRule = new InsertRule('').withFile('Insert.fsh').withLocation([1, 2, 3, 4]);
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

    const insertRule = new InsertRule('').withFile('NoBam.fsh').withLocation([1, 2, 3, 4]);
    insertRule.ruleSet = 'Bam';
    profile.rules.push(insertRule);

    applyInsertRules(profile, tank);

    expect(profile.rules).toHaveLength(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Unable to find definition for RuleSet Bam.*File: NoBam\.fsh.*Line: 1 - 3\D*/s
    );
  });

  it('should apply add element rules from a single level insert rule', () => {
    // RuleSet: AddCoreElements
    // primaryId 1..1 SU uri "Primary ID"
    // primaryOrganization 1..1 SU Reference(Organization) "Primary Organization"
    // sharedNotes 0..* Annotation "Shared notes"
    //
    // Logical: Foo
    // * insert AddCoreElements
    const ruleSet = new RuleSet('AddCoreElements');

    const addElementRule1 = new AddElementRule('primaryId');
    addElementRule1.min = 1;
    addElementRule1.max = '1';
    addElementRule1.summary = true;
    addElementRule1.types = [{ type: 'uri' }];
    addElementRule1.short = 'Primary ID';

    const addElementRule2 = new AddElementRule('primaryOrganization');
    addElementRule2.min = 1;
    addElementRule2.max = '1';
    addElementRule2.summary = true;
    addElementRule2.types = [{ type: 'Organization', isReference: true }];
    addElementRule2.short = 'Primary Organization';

    const addElementRule3 = new AddElementRule('sharedNotes');
    addElementRule3.min = 0;
    addElementRule3.max = '*';
    addElementRule3.types = [{ type: 'Annotation' }];
    addElementRule3.short = 'Shared notes';

    ruleSet.rules.push(addElementRule1, addElementRule2, addElementRule3);
    doc.ruleSets.set(ruleSet.name, ruleSet);

    const logical = new Logical('Foo').withFile('Logical.fsh').withLocation([5, 6, 7, 16]);
    doc.logicals.set(logical.name, logical);

    const insertRule = new InsertRule('');
    insertRule.ruleSet = 'AddCoreElements';
    logical.rules.push(insertRule);

    applyInsertRules(logical, tank);
    expect(logical.rules).toHaveLength(3);

    assertAddElementRule(logical.rules[0], 'primaryId', {
      card: { min: 1, max: '1' },
      flags: { summary: true },
      types: [{ type: 'uri' }],
      defs: { short: 'Primary ID' }
    });
    assertAddElementRule(logical.rules[1], 'primaryOrganization', {
      card: { min: 1, max: '1' },
      flags: { summary: true },
      types: [{ type: 'Organization', isReference: true }],
      defs: { short: 'Primary Organization' }
    });
    assertAddElementRule(logical.rules[2], 'sharedNotes', {
      card: { min: 0, max: '*' },
      types: [{ type: 'Annotation' }],
      defs: { short: 'Shared notes' }
    });
  });

  describe('#appliedRuleSet', () => {
    it('should apply rules from a single level insert rule with parameters', () => {
      // RuleSet: SimpleRules (value, maxNote)
      // valueString = {value}
      // note 0..{maxNote}
      //
      // Profile: Foo
      // Parent: Observation
      // * insert SimpleRules ("Something", 5)
      const appliedSimpleRules = new RuleSet('SimpleRules');
      const valueRule = new AssignmentRule('valueString');
      valueRule.value = 'Something';
      valueRule.exactly = false;
      valueRule.isInstance = false;
      const noteRule = new CardRule('note');
      noteRule.min = 0;
      noteRule.max = '5';
      appliedSimpleRules.rules.push(valueRule, noteRule);
      doc.appliedRuleSets.set(
        JSON.stringify(['SimpleRules', '"Something"', '5']),
        appliedSimpleRules
      );

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'SimpleRules';
      insertRule.params = ['"Something"', '5'];
      profile.rules.push(insertRule);

      applyInsertRules(profile, tank);
      expect(profile.rules).toHaveLength(2);
      assertAssignmentRule(profile.rules[0], 'valueString', 'Something', false, false);
      assertCardRule(profile.rules[1], 'note', 0, 5);
    });

    it('should ignore insert rules with parameters that cause a circular dependency, and log an error', () => {
      // RuleSet: SimpleRules (maxNote)
      // note 0..{maxNote}
      // insert FancyRules ({maxNote})
      //
      // RuleSet: FancyRules (maxInterpretation)
      // interpretation 0..{maxInterpretation}
      // insert SimpleRules ({maxInterpretation})
      //
      // Profile: Foo
      // Parent: Observation
      // * insert SimpleRules (5)
      const appliedSimpleRules = new RuleSet('SimpleRules');
      const simpleCard = new CardRule('note');
      simpleCard.min = 0;
      simpleCard.max = '5';
      const insertFancy = new InsertRule('');
      insertFancy.ruleSet = 'FancyRules';
      insertFancy.params = ['5'];
      appliedSimpleRules.rules.push(simpleCard, insertFancy);

      const appliedFancyRules = new RuleSet('FancyRules');
      const fancyCard = new CardRule('interpretation');
      fancyCard.min = 0;
      fancyCard.max = '5';
      const insertSimple = new InsertRule('').withFile('Fancy.fsh').withLocation([4, 9, 4, 29]);
      insertSimple.ruleSet = 'SimpleRules';
      insertSimple.params = ['5'];
      appliedFancyRules.rules.push(fancyCard, insertSimple);

      doc.appliedRuleSets
        .set(JSON.stringify(['SimpleRules', '5']), appliedSimpleRules)
        .set(JSON.stringify(['FancyRules', '5']), appliedFancyRules);

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'SimpleRules';
      insertRule.params = ['5'];
      profile.rules.push(insertRule);

      applyInsertRules(profile, tank);
      expect(profile.rules).toHaveLength(2);
      assertCardRule(profile.rules[0], 'note', 0, 5);
      assertCardRule(profile.rules[1], 'interpretation', 0, 5);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /SimpleRules will cause a circular dependency/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Fancy\.fsh.*Line: 4\D*/s);
    });
  });
});
