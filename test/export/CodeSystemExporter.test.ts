import { CodeSystemExporter } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { FshCodeSystem } from '../../src/fshtypes';
import { FshConcept } from '../../src/fshtypes/FshConcept';

describe('CodeSystemExporter', () => {
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: CodeSystemExporter;

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    input = new FSHTank([doc], { name: 'test', version: '0.0.1', canonical: 'http://example.com' });
    exporter = new CodeSystemExporter(input);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export();
    expect(exported).toEqual([]);
  });

  it('should export a single code system', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem'
    });
  });

  it('should export a code system with additional metadata', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    codeSystem.id = 'CodeSystem1';
    codeSystem.title = 'My Fancy Code System';
    codeSystem.description = 'Lots of important details about my fancy code system';
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      name: 'MyCodeSystem',
      id: 'CodeSystem1',
      status: 'active',
      content: 'complete',
      url: 'http://example.com/CodeSystem/CodeSystem1',
      title: 'My Fancy Code System',
      description: 'Lots of important details about my fancy code system'
    });
  });

  it('should export each code system once, even if export is called more than once', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    const exportedAgain = exporter.export();
    expect(exportedAgain.length).toBe(1);
  });

  it('should export a code system with a concept with only a code', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const myCode = new FshConcept('myCode');
    const anotherCode = new FshConcept('anotherCode');
    codeSystem.concepts = [myCode, anotherCode];
    doc.codeSystems.set(codeSystem.name, codeSystem);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem',
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
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem',
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
});
