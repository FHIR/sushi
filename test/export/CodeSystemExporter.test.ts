import { CodeSystemExporter, Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { FshCodeSystem } from '../../src/fshtypes';
import { FshConcept } from '../../src/fshtypes/FshConcept';
import { loggerSpy } from '../testhelpers';

describe('CodeSystemExporter', () => {
  let doc: FSHDocument;
  let exporter: CodeSystemExporter;

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], {
      name: 'test',
      version: '0.0.1',
      canonical: 'http://example.com'
    });
    const pkg = new Package(input.config);
    exporter = new CodeSystemExporter(input, pkg);
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
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'draft',
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
      name: 'MyCodeSystem',
      id: 'CodeSystem1',
      status: 'draft',
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
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'draft',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem',
      version: '0.0.1',
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
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'draft',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem',
      version: '0.0.1',
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
    expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR id/s);
    expect(loggerSpy.getLastMessage()).toMatch(/File: Strange\.fsh.*Line: 2 - 6\D/s);
  });

  it('should log a message when the code system has an invalid name', () => {
    const codeSystem = new FshCodeSystem('Strange.Code.System')
      .withFile('Strange.fsh')
      .withLocation([3, 4, 8, 24]);
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export().codeSystems;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Strange.Code.System');
    expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR name/s);
    expect(loggerSpy.getLastMessage()).toMatch(/File: Strange\.fsh.*Line: 3 - 8\D/s);
  });
});
