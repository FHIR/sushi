import { MappingExporter, Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { TestFisher } from '../testhelpers';
import { loggerSpy } from '../testhelpers';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import path from 'path';
import { StructureDefinition } from '../../src/fhirtypes';
import { Mapping } from '../../src/fshtypes';
import { MappingRule } from '../../src/fshtypes/rules';

describe('MappingExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let exporter: MappingExporter;
  let observation: StructureDefinition;

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
    const pkg = new Package(input.packageJSON);
    const fisher = new TestFisher(input, defs, pkg);
    exporter = new MappingExporter(input, pkg, fisher);
    observation = fisher.fishForStructureDefinition('Observation');
    observation.id = 'MyObservation';
    pkg.profiles.push(observation);
  });

  it('should log an error when the mapping source does not exist', () => {
    /**
     * Mapping: MyMapping
     * Source: MyInvalidSource
     */
    const mapping = new Mapping('MyMapping').withFile('NoSource.fsh').withLocation([1, 2, 3, 4]);
    mapping.source = 'MyInvalidSource';
    doc.mappings.set(mapping.name, mapping);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Unable to find source "MyInvalidSource".*File: NoSource\.fsh.*Line: 1 - 3\D*/s
    );
  });

  describe('#setMetadata', () => {
    it('should export no mappings with empty input', () => {
      const originalLength = observation.mapping.length;
      exporter.export();
      expect(observation.mapping.length).toBe(originalLength);
    });

    it('should export the simplest possible mapping', () => {
      /**
       * Mapping: MyMapping
       * Source: MyObservation
       */
      const originalLength = observation.mapping.length;
      const mapping = new Mapping('MyMapping');
      mapping.source = 'MyObservation';
      doc.mappings.set(mapping.name, mapping);
      exporter.export();
      expect(observation.mapping.length).toBe(originalLength + 1);
      const exported = observation.mapping.slice(-1)[0];
      expect(exported.identity).toBe('MyMapping');
    });

    it('should export a mapping when one does not yet exist', () => {
      /**
       * Mapping: MyMapping
       * Source: MyObservation
       */
      delete observation.mapping;
      const mapping = new Mapping('MyMapping');
      mapping.source = 'MyObservation';
      doc.mappings.set(mapping.name, mapping);
      exporter.export();
      expect(observation.mapping.length).toBe(1);
      const exported = observation.mapping.slice(-1)[0];
      expect(exported.identity).toBe('MyMapping');
    });

    it('should export a mapping with optional metadata', () => {
      /**
       * Mapping: MyMapping
       * Id: my-map
       * Source: MyObservation
       * Target: "http://mytarget.com"
       * Description: "Hello there"
       * Title: "HEY THERE"
       */
      const originalLength = observation.mapping.length;
      const mapping = new Mapping('MyMapping');
      mapping.id = 'my-map';
      mapping.source = 'MyObservation';
      mapping.target = 'http://mytarget.com';
      mapping.description = 'Hello there';
      mapping.title = 'HEY THERE';
      doc.mappings.set(mapping.name, mapping);
      exporter.export();
      expect(observation.mapping.length).toBe(originalLength + 1);
      const exported = observation.mapping.slice(-1)[0];
      expect(exported.identity).toBe('my-map');
      expect(exported.name).toBe('HEY THERE');
      expect(exported.uri).toBe('http://mytarget.com');
      expect(exported.comment).toBe('Hello there');
    });

    it('should log an error and not apply a mapping with an invalid Id', () => {
      /**
       * Mapping: MyMapping
       * Source: MyObservation
       * Id: Invalid!
       */
      const originalLength = observation.mapping.length;
      const mapping = new Mapping('MyMapping')
        .withLocation([1, 2, 3, 4])
        .withFile('BadMapping.fsh');
      mapping.source = 'MyObservation';
      mapping.id = 'Invalid!';
      doc.mappings.set(mapping.name, mapping);
      exporter.export();
      expect(observation.mapping.length).toBe(originalLength);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /The string "Invalid!" does not represent a valid FHIR id/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadMapping\.fsh.*Line: 1 - 3\D*/s);
    });
  });

  describe('#setMappingRules', () => {
    let mapping: Mapping;

    beforeEach(() => {
      mapping = new Mapping('MyMapping');
      mapping.source = 'MyObservation';
      doc.mappings.set(mapping.name, mapping);
    });

    it('should apply a valid mapping rule', () => {
      /**
       * Mapping: MyMapping
       * Source: MyObservation
       * * status -> "Observation.otherStatus"
       */
      const mapRule = new MappingRule('status');
      mapRule.map = 'Observation.otherStatus';
      mapping.rules.push(mapRule);
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalLength = status.mapping.length;
      exporter.export();
      expect(status.mapping.length).toBe(originalLength + 1);
      const exported = status.mapping.slice(-1)[0];
      expect(exported.map).toBe('Observation.otherStatus');
      expect(exported.identity).toBe('MyMapping');
    });

    it('should apply a valid mapping rule with no path', () => {
      /**
       * Mapping: MyMapping
       * Source: MyObservation
       * * status -> "Observation.otherStatus"
       */
      const mapRule = new MappingRule('');
      mapRule.map = 'OtherObservation';
      mapping.rules.push(mapRule);
      const status = observation.elements.find(e => e.id === 'Observation');
      const originalLength = status.mapping.length;
      exporter.export();
      expect(status.mapping.length).toBe(originalLength + 1);
      const exported = status.mapping.slice(-1)[0];
      expect(exported.map).toBe('OtherObservation');
      expect(exported.identity).toBe('MyMapping');
    });

    it('should log an error and skip rules with paths that cannot be found', () => {
      /**
       * Mapping: MyMapping
       * Source: MyObservation
       * * notAPath -> "whoCares"
       * * status -> "Observation.otherStatus"
       */
      const fakePathRule = new MappingRule('notAPath')
        .withFile('BadRule.fsh')
        .withLocation([1, 2, 1, 3]);
      fakePathRule.map = 'whoCares';
      mapping.rules.push(fakePathRule);
      const statusRule = new MappingRule('status');
      statusRule.map = 'Observation.otherStatus';
      mapping.rules.push(statusRule);
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalLength = status.mapping.length;
      exporter.export();
      // valid rule on status should still be applied
      expect(status.mapping.length).toBe(originalLength + 1);
      const exported = status.mapping.slice(-1)[0];
      expect(exported.map).toBe('Observation.otherStatus');
      expect(exported.identity).toBe('MyMapping');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /No element found at path notAPath for MyMapping.*File: BadRule\.fsh.*Line: 1\D*/s
      );
    });

    it('should log an error and skip rules with invalid mappings', () => {
      /**
       * Mapping: MyMapping
       * Source: MyObservation
       * * category ->
       * * status -> "Observation.otherStatus"
       */
      const noTargetRule = new MappingRule('category')
        .withFile('BadRule.fsh')
        .withLocation([1, 2, 1, 3]);
      mapping.rules.push(noTargetRule);
      const statusRule = new MappingRule('status');
      statusRule.map = 'Observation.otherStatus';
      mapping.rules.push(statusRule);
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalLength = status.mapping.length;
      exporter.export();
      // valid rule on status should still be applied
      expect(status.mapping.length).toBe(originalLength + 1);
      const exported = status.mapping.slice(-1)[0];
      expect(exported.map).toBe('Observation.otherStatus');
      expect(exported.identity).toBe('MyMapping');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid mapping, mapping.identity and mapping.map are 1..1 and must be set.*File: BadRule\.fsh.*Line: 1\D*/s
      );
    });
  });
});
