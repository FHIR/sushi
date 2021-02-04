import { CodeSystemExporter, Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { FshCodeSystem, FshCode, RuleSet } from '../../src/fshtypes';
import { CaretValueRule, InsertRule, AssignmentRule, ConceptRule } from '../../src/fshtypes/rules';
import { TestFisher } from '../testhelpers';
import { loggerSpy } from '../testhelpers';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import path from 'path';
import { minimalConfig } from '../utils/minimalConfig';

describe('CodeSystemExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let exporter: CodeSystemExporter;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
  });

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    const pkg = new Package(input.config);
    const fisher = new TestFisher(input, defs, pkg);
    exporter = new CodeSystemExporter(input, pkg, fisher);
    loggerSpy.reset();
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export().codeSystems;
    expect(exported).toEqual([]);
  });

  it('should export a single code system', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/MyCodeSystem',
      version: '1.0.0'
    });
  });

  it('should export a code system with additional metadata', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    codeSystem.id = 'CodeSystem1';
    codeSystem.title = 'My Fancy Code System';
    codeSystem.description = 'Lots of important details about my fancy code system';
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      name: 'MyCodeSystem',
      id: 'CodeSystem1',
      status: 'active',
      content: 'complete',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/CodeSystem1',
      title: 'My Fancy Code System',
      description: 'Lots of important details about my fancy code system',
      version: '1.0.0'
    });
  });

  it('should export each code system once, even if export is called more than once', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    const exportedAgain = exporter.export().codeSystems;
    expect(exportedAgain.length).toBe(1);
  });

  it('should export a code system with a concept with only a code', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const myCode = new ConceptRule('myCode');
    const anotherCode = new ConceptRule('anotherCode');
    codeSystem.rules = [myCode, anotherCode];
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/MyCodeSystem',
      version: '1.0.0',
      count: 2,
      concept: [{ code: 'myCode' }, { code: 'anotherCode' }]
    });
  });

  it('should export a code system with a concept with a code, display, and definition', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const myCode = new ConceptRule('myCode', 'My code', 'This is the formal definition of my code');
    const anotherCode = new ConceptRule(
      'anotherCode',
      'A second code',
      'More details about this code'
    );
    codeSystem.rules = [myCode, anotherCode];
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/MyCodeSystem',
      version: '1.0.0',
      count: 2,
      concept: [
        {
          code: 'myCode',
          display: 'My code',
          definition: 'This is the formal definition of my code'
        },
        {
          code: 'anotherCode',
          display: 'A second code',
          definition: 'More details about this code'
        }
      ]
    });
  });

  it('should log a message when the code system has an invalid id', () => {
    const codeSystem = new FshCodeSystem('StrangeSystem')
      .withFile('Strange.fsh')
      .withLocation([2, 4, 6, 23]);
    codeSystem.id = 'Is this allowed?';
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].id).toBe('Is this allowed?');
    expect(loggerSpy.getLastMessage('error')).toMatch(/does not represent a valid FHIR id/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Strange\.fsh.*Line: 2 - 6\D*/s);
  });

  it('should log a message when the code system has an invalid name', () => {
    const codeSystem = new FshCodeSystem('Strange.Code.System')
      .withFile('Strange.fsh')
      .withLocation([3, 4, 8, 24]);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Strange.Code.System');
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /may not be suitable for machine processing applications such as code generation/s
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Strange\.fsh.*Line: 3 - 8\D*/s);
  });

  it('should sanitize the id and log a message when a valid name is used to make an invalid id', () => {
    const codeSystem = new FshCodeSystem('Not_good_id')
      .withFile('Wrong.fsh')
      .withLocation([2, 8, 5, 18]);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported[0].name).toBe('Not_good_id');
    expect(exported[0].id).toBe('Not-good-id');
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /The string "Not_good_id" represents a valid FHIR name but not a valid FHIR id.*The id will be exported as "Not-good-id"/s
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
  });

  it('should sanitize the id and log a message when a long valid name is used to make an invalid id', () => {
    let longId = 'Toolong';
    while (longId.length < 65) longId += 'longer';
    const codeSystem = new FshCodeSystem(longId).withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    const expectedId = longId.slice(0, 64);
    expect(exported[0].name).toBe(longId);
    expect(exported[0].id).toBe(expectedId);
    const warning = new RegExp(
      `The string "${longId}" represents a valid FHIR name but not a valid FHIR id.*The id will be exported as "${expectedId}"`,
      's'
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(warning);
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
  });
  it('should log an error when multiple code systems have the same id', () => {
    const firstCodeSystem = new FshCodeSystem('FirstCodeSystem')
      .withFile('CodeSystems.fsh')
      .withLocation([2, 8, 6, 15]);
    firstCodeSystem.id = 'my-code-system';
    const secondCodeSystem = new FshCodeSystem('SecondCodeSystem')
      .withFile('CodeSystems.fsh')
      .withLocation([8, 8, 15, 19]);
    secondCodeSystem.id = 'my-code-system';
    doc.codeSystems.set(firstCodeSystem.name, firstCodeSystem);
    doc.codeSystems.set(secondCodeSystem.name, secondCodeSystem);

    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(2);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Multiple code systems with id my-code-system/s
    );
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: CodeSystems\.fsh.*Line: 8 - 15\D*/s);
  });

  // CaretValueRules
  it('should apply a CaretValueRule', () => {
    const codeSystem = new FshCodeSystem('CaretCodeSystem');
    const rule = new CaretValueRule('');
    rule.caretPath = 'publisher';
    rule.value = 'carat';
    codeSystem.rules.push(rule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      id: 'CaretCodeSystem',
      name: 'CaretCodeSystem',
      content: 'complete',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/CaretCodeSystem',
      version: '1.0.0',
      status: 'active',
      publisher: 'carat'
    });
  });

  it('should resolve soft indexing when applying Caret Value rules', () => {
    const codeSystem = new FshCodeSystem('CaretCodeSystem');
    const contactRule1 = new CaretValueRule('');
    contactRule1.caretPath = 'contact[+].name';
    contactRule1.value = 'Example Name';
    codeSystem.rules.push(contactRule1);

    const contactRule2 = new CaretValueRule('');
    contactRule2.caretPath = 'contact[=].telecom[+].rank';
    contactRule2.value = 1;
    codeSystem.rules.push(contactRule2);

    const contactRule3 = new CaretValueRule('');
    contactRule3.caretPath = 'contact[=].telecom[=].value';
    contactRule3.value = 'example@email.com';
    codeSystem.rules.push(contactRule3);

    const exported = exporter.exportCodeSystem(codeSystem);
    expect(exported.contact).toEqual([
      {
        name: 'Example Name',
        telecom: [
          {
            rank: 1,
            value: 'example@email.com'
          }
        ]
      }
    ]);
  });

  it('should not override count when ^count is provided by user', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const rule = new CaretValueRule('');
    rule.caretPath = 'content';
    rule.value = new FshCode('fragment', 'http://hl7.org/fhir/codesystem-content-mode');
    codeSystem.rules.push(rule);
    const rule2 = new CaretValueRule('');
    rule2.caretPath = 'count';
    rule2.value = 5;
    codeSystem.rules.push(rule2);
    codeSystem.rules.push(...[new ConceptRule('myCode'), new ConceptRule('anotherCode')]);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].count).toBe(5);
    expect(loggerSpy.getAllLogs('warn').length).toBe(0);
  });

  it('should warn when ^count does not match number of concepts in #complete CodeSystem', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    // NOTE: CS defaults to #complete so we don't need to explicitly set it
    const rule = new CaretValueRule('');
    rule.caretPath = 'count';
    rule.value = 5;
    rule.sourceInfo.file = 'test.fsh';
    rule.sourceInfo.location = {
      startLine: 2,
      startColumn: 1,
      endLine: 2,
      endColumn: 12
    };
    codeSystem.rules.push(rule);
    codeSystem.rules.push(...[new ConceptRule('myCode'), new ConceptRule('anotherCode')]);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].count).toBe(5);
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /The user-specified \^count \(5\) does not match the specified number of concepts \(2\)\..*File: test\.fsh\s*Line: 2\D*/s
    );
  });

  it('should warn when ^count is set and concepts is null in #complete CodeSystem', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    // NOTE: CS defaults to #complete so we don't need to explicitly set it
    const rule = new CaretValueRule('');
    rule.caretPath = 'count';
    rule.value = 5;
    rule.sourceInfo.file = 'test.fsh';
    rule.sourceInfo.location = {
      startLine: 2,
      startColumn: 1,
      endLine: 2,
      endColumn: 12
    };
    codeSystem.rules.push(rule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].count).toBe(5);
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /The user-specified \^count \(5\) does not match the specified number of concepts \(0\)\..*File: test\.fsh\s*Line: 2\D*/s
    );
  });

  it('should not set count when ^content is not #complete', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const rule = new CaretValueRule('');
    rule.caretPath = 'content';
    rule.value = new FshCode('fragment', 'http://hl7.org/fhir/codesystem-content-mode');
    codeSystem.rules.push(rule);
    codeSystem.rules.push(...[new ConceptRule('myCode'), new ConceptRule('anotherCode')]);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].count).toBeUndefined();
  });

  it('should log a message when applying invalid CaretValueRule', () => {
    const codeSystem = new FshCodeSystem('CaretCodeSystem');
    const rule = new CaretValueRule('').withFile('InvalidValue.fsh').withLocation([6, 3, 6, 12]);
    rule.caretPath = 'publisherz';
    rule.value = true;
    codeSystem.rules.push(rule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      id: 'CaretCodeSystem',
      name: 'CaretCodeSystem',
      content: 'complete',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/CaretCodeSystem',
      version: '1.0.0',
      status: 'active'
    });
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: InvalidValue\.fsh.*Line: 6\D*/s);
  });

  describe('#insertRules', () => {
    let cs: FshCodeSystem;
    let ruleSet: RuleSet;

    beforeEach(() => {
      cs = new FshCodeSystem('Foo');
      doc.codeSystems.set(cs.name, cs);

      ruleSet = new RuleSet('Bar');
      doc.ruleSets.set(ruleSet.name, ruleSet);
    });

    it('should apply rules from an insert rule', () => {
      // RuleSet: Bar
      // * ^title = "Wow fancy"
      //
      // CodeSystem: Foo
      // * insert Bar
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      ruleSet.rules.push(nameRule);

      const insertRule = new InsertRule();
      insertRule.ruleSet = 'Bar';
      cs.rules.push(insertRule);

      const exported = exporter.exportCodeSystem(cs);
      expect(exported.title).toBe('Wow fancy');
    });

    it('should resolve soft indexing when inserting an insert rule', () => {
      // RuleSet: Bar
      // * ^contact[+].name = Example Name
      // * ^concept[=].telecom[+].rank = 1
      // * ^concept[=].telecom[=].value = example@email.com
      //
      // CodeSystem: Foo
      // * insert Bar
      const contactRule1 = new CaretValueRule('');
      contactRule1.caretPath = 'contact[+].name';
      contactRule1.value = 'Example Name';
      ruleSet.rules.push(contactRule1);

      const contactRule2 = new CaretValueRule('');
      contactRule2.caretPath = 'contact[=].telecom[+].rank';
      contactRule2.value = 1;
      ruleSet.rules.push(contactRule2);

      const contactRule3 = new CaretValueRule('');
      contactRule3.caretPath = 'contact[=].telecom[=].value';
      contactRule3.value = 'example@email.com';
      ruleSet.rules.push(contactRule3);

      const insertRule = new InsertRule();
      insertRule.ruleSet = 'Bar';
      cs.rules.push(insertRule);

      const exported = exporter.exportCodeSystem(cs);
      expect(exported.contact).toEqual([
        {
          name: 'Example Name',
          telecom: [
            {
              rank: 1,
              value: 'example@email.com'
            }
          ]
        }
      ]);
    });

    it('should update count when applying concepts from an insert rule', () => {
      // RuleSet: Bar
      // * #lion
      //
      // CodeSystem: Foo
      // * insert Bar
      const concept = new ConceptRule('lion');
      ruleSet.rules.push(concept);

      const insertRule = new InsertRule();
      insertRule.ruleSet = 'Bar';
      cs.rules.push(insertRule);

      const exported = exporter.exportCodeSystem(cs);
      expect(exported.concept[0].code).toBe('lion');
      expect(exported.count).toBe(1);
    });

    it('should log an error and not apply rules from an invalid insert rule', () => {
      // RuleSet: Bar
      // * experimental = true
      // * ^title = "Wow fancy"
      //
      // CodeSystem: Foo
      // * insert Bar
      const valueRule = new AssignmentRule('experimental')
        .withFile('Value.fsh')
        .withLocation([1, 2, 3, 4]);
      valueRule.value = true;
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      ruleSet.rules.push(valueRule, nameRule);

      const insertRule = new InsertRule().withFile('Insert.fsh').withLocation([5, 6, 7, 8]);
      insertRule.ruleSet = 'Bar';
      cs.rules.push(insertRule);

      const exported = exporter.exportCodeSystem(cs);
      // CaretRule is still applied
      expect(exported.title).toBe('Wow fancy');
      // experimental is not set to true
      expect(exported.experimental).toBeFalsy();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /AssignmentRule.*FshCodeSystem.*File: Value\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Applied on Line: 5 - 7/s
      );
    });
  });
});
