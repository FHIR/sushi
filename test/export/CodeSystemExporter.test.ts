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
    const exported = exporter.export([]);
    expect(exported).toEqual([]);
  });

  it('should export a single code system', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    // doc.codeSystems.set(codeSystem.name, codeSystem); // TODO Add this and remove the argument
    const exported = exporter.export([codeSystem]);
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
    codeSystem.title = 'My Fancy Code System';
    codeSystem.description = 'Lots of important details about my fancy code system';
    // doc.codeSystems.set(codeSystem.name, codeSystem); // TODO add this and remove arg
    const exported = exporter.export([codeSystem]);
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem',
      title: 'My Fancy Code System',
      description: 'Lots of important details about my fancy code system'
    });
  });

  // TODO does this equivalent pass for instance export?? Probably not - maybe yes because not a global variable that's exported!
  it('should export each code system once, even if export is called more than once', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    // doc.codeSystems.set(codeSystem.name, codeSystem); // TODO add this and remove arg
    const exported = exporter.export([codeSystem]);
    expect(exported.length).toBe(1);
    const exportedAgain = exporter.export([codeSystem]); // TODO remove this arg too
    expect(exportedAgain.length).toBe(1);
  });

  it('should export a code system with a concept with only a code', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const concept = new FshConcept('myCode');
    codeSystem.concepts = [concept];
    // doc.codeSystems.set(codeSystem.name, codeSystem); // TODO add this and remove arg
    const exported = exporter.export([codeSystem]);
    expect(exported.length).toBe(1);
    expect(exported[0]).toEqual({
      name: 'MyCodeSystem',
      id: 'MyCodeSystem',
      status: 'active',
      content: 'complete',
      url: 'http://example.com/CodeSystem/MyCodeSystem',
      concept: [{ code: 'myCode' }]
    });
  });

  it('should export a code system with a concept with a code, display, and definition', () => {
    const codeSystem = new FshCodeSystem('MyCodeSystem');
    const concept = new FshConcept('myCode', 'My code', 'This is the formal definition of my code');
    codeSystem.concepts = [concept];
    // doc.codeSystems.set(codeSystem.name, codeSystem); // TODO add this and remove arg
    const exported = exporter.export([codeSystem]);
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
        }
      ]
    });
  });
});
