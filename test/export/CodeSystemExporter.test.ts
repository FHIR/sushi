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
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
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

  it('should export a code system with hierarchical codes', () => {
    // The concept hierarchy looks like this:
    // topCode
    //   middleCode
    //     bottomCode
    //   otherMiddle
    // unrelatedCode
    const codeSystem = new FshCodeSystem('HierarchicalCodeSystem');
    const topCode = new ConceptRule('topCode', 'Top Code', 'This is at the top of the hierarchy.');
    const middleCode = new ConceptRule(
      'middleCode',
      'Middle Code',
      'This is in the middle of the hierarchy.'
    );
    middleCode.hierarchy = ['topCode'];
    const bottomCode = new ConceptRule(
      'bottomCode',
      'Bottom Code',
      'This is at the bottom of the hierarchy.'
    );
    bottomCode.hierarchy = ['topCode', 'middleCode'];
    const otherMiddle = new ConceptRule(
      'otherMiddle',
      'Other Middle',
      'This is another middle code.'
    );
    otherMiddle.hierarchy = ['topCode'];
    const unrelatedCode = new ConceptRule(
      'unrelatedCode',
      'Unrelated Code',
      'This is not related to the hierarchy.'
    );
    codeSystem.rules.push(topCode, middleCode, bottomCode, otherMiddle, unrelatedCode);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      name: 'HierarchicalCodeSystem',
      id: 'HierarchicalCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/HierarchicalCodeSystem',
      version: '1.0.0',
      count: 5,
      concept: [
        {
          code: 'topCode',
          display: 'Top Code',
          definition: 'This is at the top of the hierarchy.',
          concept: [
            {
              code: 'middleCode',
              display: 'Middle Code',
              definition: 'This is in the middle of the hierarchy.',
              concept: [
                {
                  code: 'bottomCode',
                  display: 'Bottom Code',
                  definition: 'This is at the bottom of the hierarchy.'
                }
              ]
            },
            {
              code: 'otherMiddle',
              display: 'Other Middle',
              definition: 'This is another middle code.'
            }
          ]
        },
        {
          code: 'unrelatedCode',
          display: 'Unrelated Code',
          definition: 'This is not related to the hierarchy.'
        }
      ]
    });
  });

  it('should log an error when encountering a duplicate code', () => {
    // CodeSystem: Zoo
    // * #goat "A goat"
    // * #goat "Another goat?"
    const codeSystem = new FshCodeSystem('Zoo');
    const goatCode = new ConceptRule('goat', 'A goat');
    const anotherGoat = new ConceptRule('goat', 'Another goat?')
      .withFile('Zoo.fsh')
      .withLocation([3, 0, 3, 23]);
    codeSystem.rules.push(goatCode, anotherGoat);

    const exported = exporter.exportCodeSystem(codeSystem);
    expect(exported.concept[0].code).toBe('goat');
    expect(exported.concept[0].display).toBe('A goat');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /CodeSystem Zoo already contains code goat.*File: Zoo\.fsh.*Line: 3\D*/s
    );
  });

  it('should not log an error when encountering a duplicate code if the new code has no display or definition', () => {
    // CodeSystem: Zoo
    // * #goat "A goat"
    // * #goat
    const codeSystem = new FshCodeSystem('Zoo');
    const goatCode = new ConceptRule('goat', 'A goat');
    const anotherGoat = new ConceptRule('goat');
    codeSystem.rules.push(goatCode, anotherGoat);

    const exported = exporter.exportCodeSystem(codeSystem);
    expect(exported.concept).toHaveLength(1);
    expect(exported.concept[0].code).toBe('goat');
    expect(exported.concept[0].display).toBe('A goat');
    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
  });

  it('should log an error when encountering a code with an incorrectly defined hierarchy', () => {
    // CodeSystem: Zoo
    // * #bear "Bear" "A member of family Ursidae."
    // * #bear #sunbear #ursula "Ursula the sun bear"
    const codeSystem = new FshCodeSystem('Zoo');
    const bearCode = new ConceptRule('bear', 'Bear', 'A member of family Ursidae.');
    const ursulaCode = new ConceptRule('ursula', 'Ursula the sun bear')
      .withFile('Zoo.fsh')
      .withLocation([3, 0, 3, 46]);
    ursulaCode.hierarchy = ['bear', 'sunbear'];
    codeSystem.rules.push(bearCode, ursulaCode);

    const exported = exporter.exportCodeSystem(codeSystem);
    expect(exported.concept[0].code).toBe('bear');
    expect(exported.concept[0].display).toBe('Bear');
    expect(exported.concept[0].concept).toBeNull();
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Could not find sunbear in concept hierarchy to use as ancestor of ursula.*File: Zoo\.fsh.*Line: 3\D*/s
    );
  });

  it('should warn when title and/or description is an empty string', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    codeSystem.title = '';
    codeSystem.description = '';
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);

    expect(loggerSpy.getAllMessages('warn').length).toBe(2);
    expect(loggerSpy.getFirstMessage('warn')).toMatch(
      'Code system MyCodeSystem has a title field that should not be empty.'
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      'Code system MyCodeSystem has a description field that should not be empty.'
    );
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

  it('should not log a message when the code system overrides an invalid id with a Caret Rule', () => {
    const codeSystem = new FshCodeSystem('StrangeSystem')
      .withFile('Strange.fsh')
      .withLocation([2, 4, 6, 23]);
    codeSystem.id = 'Is this allowed?';
    const idRule = new CaretValueRule('');
    idRule.caretPath = 'id';
    idRule.value = 'this-is-allowed';
    codeSystem.rules.push(idRule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].id).toBe('this-is-allowed');
    expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
  });

  it('should log a message when the code system overrides an invalid id with an invalid Caret Rule', () => {
    const codeSystem = new FshCodeSystem('StrangeSystem')
      .withFile('Strange.fsh')
      .withLocation([2, 4, 6, 23]);
    codeSystem.id = 'Is this allowed?';
    const idRule = new CaretValueRule('').withFile('Strange.fsh').withLocation([4, 4, 4, 4]);
    idRule.caretPath = 'id';
    idRule.value = 'No this is not allowed';
    codeSystem.rules.push(idRule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].id).toBe('No this is not allowed');
    expect(loggerSpy.getLastMessage('error')).toMatch(/does not represent a valid FHIR id/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Strange\.fsh.*Line: 4\D*/s);
  });

  it('should log a message when the code system overrides a valid id with an invalid Caret Rule', () => {
    const codeSystem = new FshCodeSystem('StrangeSystem')
      .withFile('Strange.fsh')
      .withLocation([2, 4, 6, 23]);
    codeSystem.id = 'this-is-allowed';
    const idRule = new CaretValueRule('').withFile('Strange.fsh').withLocation([4, 4, 4, 4]);
    idRule.caretPath = 'id';
    idRule.value = 'This is not allowed';
    codeSystem.rules.push(idRule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].id).toBe('This is not allowed');
    expect(loggerSpy.getLastMessage('error')).toMatch(/does not represent a valid FHIR id/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Strange\.fsh.*Line: 4\D*/s);
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

  it('should not log a message when the code system overrides an invalid name with a Caret Rule', () => {
    const codeSystem = new FshCodeSystem('Strange.Code.System')
      .withFile('Strange.fsh')
      .withLocation([3, 4, 8, 24]);
    const nameRule = new CaretValueRule('');
    nameRule.caretPath = 'name';
    nameRule.value = 'StrangeCodeSystem';
    codeSystem.rules.push(nameRule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('StrangeCodeSystem');
    expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
  });

  it('should log a message when the code system overrides an invalid name with an invalid Caret Rule', () => {
    const codeSystem = new FshCodeSystem('Strange.Code.System')
      .withFile('Strange.fsh')
      .withLocation([3, 4, 8, 24]);
    const nameRule = new CaretValueRule('').withFile('Strange.fsh').withLocation([4, 4, 4, 4]);
    nameRule.caretPath = 'name';
    nameRule.value = 'Strange.Code.System';
    codeSystem.rules.push(nameRule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /may not be suitable for machine processing applications such as code generation/s
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Strange\.fsh.*Line: 4\D*/s);
  });

  it('should log a message when the code system overrides a valid name with an invalid Caret Rule', () => {
    const codeSystem = new FshCodeSystem('StrangeCodeSystem')
      .withFile('Strange.fsh')
      .withLocation([3, 4, 8, 24]);
    const nameRule = new CaretValueRule('').withFile('Strange.fsh').withLocation([4, 4, 4, 4]);
    nameRule.caretPath = 'name';
    nameRule.value = 'Strange.Code.System';
    codeSystem.rules.push(nameRule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /may not be suitable for machine processing applications such as code generation/s
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Strange\.fsh.*Line: 4\D*/s);
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

  it('should apply a CaretValueRule on a top-level concept', () => {
    const codeSystem = new FshCodeSystem('CaretCodeSystem');
    const someCode = new ConceptRule('someCode', 'Some Code');
    const someCaret = new CaretValueRule('');
    someCaret.pathArray = ['someCode'];
    someCaret.caretPath = 'designation[0].value';
    someCaret.value = 'Designated value';
    codeSystem.rules.push(someCode, someCaret);
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
      count: 1,
      status: 'active',
      concept: [
        {
          code: 'someCode',
          display: 'Some Code',
          designation: [
            {
              value: 'Designated value'
            }
          ]
        }
      ]
    });
  });

  it('should apply a CaretValueRule on a concept within a hierarchy', () => {
    const codeSystem = new FshCodeSystem('CaretCodeSystem');
    const someCode = new ConceptRule('someCode', 'Some Code');
    const otherCode = new ConceptRule('otherCode', 'Other Code');
    otherCode.hierarchy = ['someCode'];
    const someCaret = new CaretValueRule('');
    someCaret.pathArray = ['someCode', 'otherCode'];
    someCaret.caretPath = 'designation[0].value';
    someCaret.value = 'Other designated value';
    codeSystem.rules.push(someCode, otherCode, someCaret);
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
      count: 2,
      status: 'active',
      concept: [
        {
          code: 'someCode',
          display: 'Some Code',
          concept: [
            {
              code: 'otherCode',
              display: 'Other Code',
              designation: [
                {
                  value: 'Other designated value'
                }
              ]
            }
          ]
        }
      ]
    });
  });

  it('should resolve soft indexing when applying top level Caret Value rules', () => {
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

  it('should resolve soft indexing when applying CaretValue rules with paths', () => {
    const codeSystem = new FshCodeSystem('CodeCaretCS');
    const topCode = new ConceptRule('topCode', 'Top Code');
    const bottomCode = new ConceptRule('bottomCode', 'Bottom Code');
    bottomCode.hierarchy = ['topCode'];

    const firstTop = new CaretValueRule('');
    firstTop.pathArray = ['topCode'];
    firstTop.caretPath = 'designation[+].value';
    firstTop.value = 'First top designation';
    const secondTop = new CaretValueRule('');
    secondTop.pathArray = ['topCode'];
    secondTop.caretPath = 'designation[+].value';
    secondTop.value = 'Second top designation';

    const firstBottom = new CaretValueRule('');
    firstBottom.pathArray = ['topCode', 'bottomCode'];
    firstBottom.caretPath = 'designation[+].value';
    firstBottom.value = 'First bottom designation';
    const secondBottom = new CaretValueRule('');
    secondBottom.pathArray = ['topCode', 'bottomCode'];
    secondBottom.caretPath = 'designation[+].value';
    secondBottom.value = 'Second bottom designation';

    codeSystem.rules.push(topCode, bottomCode, firstTop, secondTop, firstBottom, secondBottom);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      id: 'CodeCaretCS',
      name: 'CodeCaretCS',
      content: 'complete',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/CodeCaretCS',
      version: '1.0.0',
      count: 2,
      status: 'active',
      concept: [
        {
          code: 'topCode',
          display: 'Top Code',
          designation: [
            {
              value: 'First top designation'
            },
            {
              value: 'Second top designation'
            }
          ],
          concept: [
            {
              code: 'bottomCode',
              display: 'Bottom Code',
              designation: [
                {
                  value: 'First bottom designation'
                },
                {
                  value: 'Second bottom designation'
                }
              ]
            }
          ]
        }
      ]
    });
  });

  it('should export a code system with extensions', () => {
    const codeSystem = new FshCodeSystem('Strange.Code.System')
      .withFile('Strange.fsh')
      .withLocation([3, 4, 8, 24]);
    const extensionRule = new CaretValueRule('');
    extensionRule.caretPath = 'extension[structuredefinition-fmm].valueInteger';
    extensionRule.value = 1;
    const conceptRule = new ConceptRule('bar', 'Bar', 'Bar');
    const conceptExtensionRule = new CaretValueRule('bar');
    conceptExtensionRule.pathArray = ['bar'];
    conceptExtensionRule.caretPath = 'extension[structuredefinition-fmm].valueInteger';
    conceptExtensionRule.value = 2;
    codeSystem.rules.push(extensionRule, conceptRule, conceptExtensionRule);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].extension).toContainEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm',
      valueInteger: 1
    });
    expect(exported[0].concept[0].extension).toContainEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm',
      valueInteger: 2
    });
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

  it('should log a message when applying an invalid ConceptRule', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const topCode = new ConceptRule('top');
    const bottomCode = new ConceptRule('bottom');
    bottomCode.hierarchy = ['top'];
    const mistakeCode = new ConceptRule('mistake')
      .withFile('InvalidHierarchy.fsh')
      .withLocation([8, 3, 8, 25]);
    mistakeCode.hierarchy = ['bottom']; // This is an incomplete hierarchy, and will generate an error.
    codeSystem.rules.push(topCode, bottomCode, mistakeCode);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].count).toBe(2); // top and bottom were added, but not mistake
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: InvalidHierarchy\.fsh.*Line: 8\D*/s);
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

  it('should log a message when applying an invalid CaretValueRule', () => {
    const codeSystem = new FshCodeSystem('CaretCodeSystem');
    const someCode = new ConceptRule('someCode', 'Some Code');
    const otherCode = new ConceptRule('otherCode', 'Other Code');
    otherCode.hierarchy = ['someCode'];
    const someCaret = new CaretValueRule('')
      .withFile('InvalidValue.fsh')
      .withLocation([8, 5, 8, 25]);
    someCaret.pathArray = ['someCode', 'wrongCode'];
    someCaret.caretPath = 'designation[0].value';
    someCaret.value = 'Other designated value';
    codeSystem.rules.push(someCode, otherCode, someCaret);
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
      count: 2,
      status: 'active',
      concept: [
        {
          code: 'someCode',
          display: 'Some Code',
          concept: [
            {
              code: 'otherCode',
              display: 'Other Code'
            }
          ]
        }
      ]
    });
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: InvalidValue\.fsh.*Line: 8\D*/s);
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

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      cs.rules.push(insertRule);

      exporter.applyInsertRules();
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

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      cs.rules.push(insertRule);

      exporter.applyInsertRules();
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

    it('should insert a rule set at a code path', () => {
      // RuleSet: Bar
      // * ^designation[+].value = "Bar Value"
      // * #extra
      //
      // CodeSystem: Foo
      // * #bear
      // * #bear insert Bar
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'designation[+].value';
      caretValueRule.value = 'Bar Value';
      const extraConcept = new ConceptRule('extra');
      ruleSet.rules.push(caretValueRule, extraConcept);

      const conceptRule = new ConceptRule('bear');
      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      insertRule.pathArray = ['bear'];
      cs.rules.push(conceptRule, insertRule);

      exporter.applyInsertRules();
      const exported = exporter.exportCodeSystem(cs);
      expect(exported.concept[0]).toEqual({
        code: 'bear',
        designation: [
          {
            value: 'Bar Value'
          }
        ],
        concept: [
          {
            code: 'extra'
          }
        ]
      });
    });

    it('should update count when applying concepts from an insert rule', () => {
      // RuleSet: Bar
      // * #lion
      //
      // CodeSystem: Foo
      // * insert Bar
      const concept = new ConceptRule('lion');
      ruleSet.rules.push(concept);

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      cs.rules.push(insertRule);

      exporter.applyInsertRules();
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

      const insertRule = new InsertRule('').withFile('Insert.fsh').withLocation([5, 6, 7, 8]);
      insertRule.ruleSet = 'Bar';
      cs.rules.push(insertRule);

      exporter.applyInsertRules();
      const exported = exporter.exportCodeSystem(cs);
      // CaretRule is still applied
      expect(exported.title).toBe('Wow fancy');
      // experimental is not set to true
      expect(exported.experimental).toBeFalsy();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /AssignmentRule.*FshCodeSystem.*File: Value\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Applied on Line: 5 - 7/s
      );
    });

    it('should maintain concept order when adding concepts from an insert rule', () => {
      // RuleSet: Bar
      // * #lion
      //
      // CodeSystem: Foo
      // * #bear
      // * insert Bar
      // * #alligator
      const lionRule = new ConceptRule('lion');
      ruleSet.rules.push(lionRule);

      const bearRule = new ConceptRule('bear');
      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      const alligatorRule = new ConceptRule('alligator');
      cs.rules.push(bearRule, insertRule, alligatorRule);

      exporter.applyInsertRules();
      const exported = exporter.exportCodeSystem(cs);
      expect(exported.concept[0].code).toBe('bear');
      expect(exported.concept[1].code).toBe('lion');
      expect(exported.concept[2].code).toBe('alligator');
      expect(exported.count).toBe(3);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should add nested concepts from an insert rule', () => {
      // RuleSet: Bar
      // * #main "MainCode"
      //
      // RuleSet: AnotherBar
      // * #main #sub "SubCode"
      //
      // CodeSystem: Foo
      // * insert Bar
      // * insert AnotherBar
      const mainCode = new ConceptRule('main', 'MainCode');
      ruleSet.rules.push(mainCode);

      const anotherRuleSet = new RuleSet('AnotherBar');
      doc.ruleSets.set(anotherRuleSet.name, anotherRuleSet);
      const subCode = new ConceptRule('sub', 'SubCode');
      subCode.hierarchy = ['main'];
      anotherRuleSet.rules.push(subCode);

      const insertBar = new InsertRule('');
      insertBar.ruleSet = 'Bar';
      const insertAnother = new InsertRule('');
      insertAnother.ruleSet = 'AnotherBar';
      cs.rules.push(insertBar, insertAnother);

      exporter.applyInsertRules();
      const exported = exporter.exportCodeSystem(cs);
      expect(exported.concept[0].code).toBe('main');
      expect(exported.concept[0].concept[0].code).toBe('sub');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should add nested concepts whose hierarchy is created by an insert rule', () => {
      // RuleSet: Bar
      // * #MyCode "MyCode" "This is my code"
      //
      // CodeSystem: Foo
      // * insert Bar
      // * #MyCode #SubCode "SubCode" "This is my sub-code"
      const myCode = new ConceptRule('MyCode', 'MyCode', 'This is my code');
      ruleSet.rules.push(myCode);

      const insertBar = new InsertRule('');
      insertBar.ruleSet = 'Bar';
      const subCode = new ConceptRule('SubCode', 'SubCode', 'This is my sub-code');
      subCode.hierarchy = ['MyCode'];
      cs.rules.push(insertBar, subCode);

      exporter.applyInsertRules();
      const exported = exporter.exportCodeSystem(cs);
      expect(exported.concept[0].code).toBe('MyCode');
      expect(exported.concept[0].concept[0].code).toBe('SubCode');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not add concepts from an insert rule that are duplicates of existing concepts', () => {
      // RuleSet: Bar
      // * #lion "Lion"
      // * #bear "Extra Bear"
      //
      // CodeSystem: Foo
      // * #bear "Regular Bear"
      // * insert Bar
      // * #alligator "Alligator"
      const lionRule = new ConceptRule('lion', 'Lion');
      const duplicateBear = new ConceptRule('bear', 'Extra Bear')
        .withFile('RuleSet.fsh')
        .withLocation([3, 0, 3, 20]);
      ruleSet.rules.push(lionRule, duplicateBear);

      const bearRule = new ConceptRule('bear', 'Regular Bear');
      const insertRule = new InsertRule('').withFile('CodeSystem.fsh').withLocation([4, 0, 4, 12]);
      insertRule.ruleSet = 'Bar';
      const alligatorRule = new ConceptRule('alligator', 'Alligator');
      cs.rules.push(bearRule, insertRule, alligatorRule);

      exporter.applyInsertRules();
      const exported = exporter.exportCodeSystem(cs);
      expect(exported.concept[0].code).toBe('bear');
      expect(exported.concept[0].display).toBe('Regular Bear');
      expect(exported.concept[1].code).toBe('lion');
      expect(exported.concept[2].code).toBe('alligator');
      expect(exported.count).toBe(3);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /CodeSystem Foo already contains code bear.*File: RuleSet\.fsh.*Line: 3\D.*Applied in File: CodeSystem\.fsh.*Applied on Line: 4\D*/s
      );
    });

    it('should not add concepts from an insert rule that are duplicates of concepts added by a previous insert rule', () => {
      // RuleSet: Bar
      // * #bear "Bear"
      //
      // RuleSet: AnotherBar
      // * #bear "Another Bear"
      //
      // CodeSystem: Foo
      // * insert Bar
      // * insert AnotherBar
      const bearRule = new ConceptRule('bear', 'Bear');
      ruleSet.rules.push(bearRule);

      const anotherRuleSet = new RuleSet('AnotherBar');
      doc.ruleSets.set(anotherRuleSet.name, anotherRuleSet);
      const anotherBearRule = new ConceptRule('bear', 'Another Bear')
        .withFile('RuleSet.fsh')
        .withLocation([5, 0, 5, 22]);
      anotherRuleSet.rules.push(anotherBearRule);

      const insertBarRule = new InsertRule('');
      insertBarRule.ruleSet = 'Bar';
      const insertAnotherRule = new InsertRule('')
        .withFile('CodeSystem.fsh')
        .withLocation([9, 0, 9, 19]);
      insertAnotherRule.ruleSet = 'AnotherBar';
      cs.rules.push(insertBarRule, insertAnotherRule);

      exporter.applyInsertRules();
      const exported = exporter.exportCodeSystem(cs);
      expect(exported.concept[0].code).toBe('bear');
      expect(exported.concept[0].display).toBe('Bear');
      expect(exported.count).toBe(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /CodeSystem Foo already contains code bear.*File: RuleSet\.fsh.*Line: 5\D.*Applied in File: CodeSystem\.fsh.*Applied on Line: 9\D*/s
      );
    });
  });
});
