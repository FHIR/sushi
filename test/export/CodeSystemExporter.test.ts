import { CodeSystemExporter, Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { FshCodeSystem, FshCode } from '../../src/fshtypes';
import { FshConcept } from '../../src/fshtypes/FshConcept';
import { CaretValueRule } from '../../src/fshtypes/rules';
import { TestFisher } from '../testhelpers';
import { loggerSpy } from '../testhelpers';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import path from 'path';

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
    const input = new FSHTank([doc], {
      name: 'test',
      version: '0.0.1',
      canonical: 'http://example.com'
    });
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
      url: 'http://example.com/CodeSystem/MyCodeSystem',
      version: '0.0.1'
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
      url: 'http://example.com/CodeSystem/CodeSystem1',
      title: 'My Fancy Code System',
      description: 'Lots of important details about my fancy code system',
      version: '0.0.1'
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
    const myCode = new FshConcept('myCode');
    const anotherCode = new FshConcept('anotherCode');
    codeSystem.concepts = [myCode, anotherCode];
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem',
      version: '0.0.1',
      count: 2,
      concept: [{ code: 'myCode' }, { code: 'anotherCode' }]
    });
  });

  it('should export a code system with a concept with a code, display, and definition', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const myCode = new FshConcept('myCode', 'My code', 'This is the formal definition of my code');
    const anotherCode = new FshConcept(
      'anotherCode',
      'A second code',
      'More details about this code'
    );
    codeSystem.concepts = [myCode, anotherCode];
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      resourceType: 'CodeSystem',
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem',
      version: '0.0.1',
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
    expect(loggerSpy.getLastMessage('error')).toMatch(/does not represent a valid FHIR name/s);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Strange\.fsh.*Line: 3 - 8\D*/s);
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
      url: 'http://example.com/CodeSystem/CaretCodeSystem',
      version: '0.0.1',
      status: 'active',
      publisher: 'carat'
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
    codeSystem.concepts = [new FshConcept('myCode'), new FshConcept('anotherCode')];
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
    codeSystem.concepts = [new FshConcept('myCode'), new FshConcept('anotherCode')];
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
    codeSystem.concepts = [new FshConcept('myCode'), new FshConcept('anotherCode')];
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
      url: 'http://example.com/CodeSystem/CaretCodeSystem',
      version: '0.0.1',
      status: 'active'
    });
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: InvalidValue\.fsh.*Line: 6\D*/s);
  });
});
