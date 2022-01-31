import path from 'path';
import { cloneDeep } from 'lodash';
import { loadFromPath } from 'fhir-package-load';
import { MappingExporter, Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { TestFisher } from '../testhelpers';
import { loggerSpy } from '../testhelpers';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { StructureDefinition } from '../../src/fhirtypes';
import { Mapping, RuleSet } from '../../src/fshtypes';
import { MappingRule, InsertRule, AssignmentRule } from '../../src/fshtypes/rules';
import { minimalConfig } from '../utils/minimalConfig';

describe('MappingExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let exporter: MappingExporter;
  let observation: StructureDefinition;
  let practitioner: StructureDefinition;
  let logical: StructureDefinition;
  let resource: StructureDefinition;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
  });

  beforeEach(() => {
    loggerSpy.reset();
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    const pkg = new Package(input.config);
    const fisher = new TestFisher(input, defs, pkg);
    exporter = new MappingExporter(input, pkg, fisher);
    observation = fisher.fishForStructureDefinition('Observation');
    observation.id = 'MyObservation';
    pkg.profiles.push(observation);
    practitioner = fisher.fishForStructureDefinition('Practitioner');
    practitioner.id = 'MyPractitioner';
    pkg.profiles.push(practitioner);
    logical = fisher.fishForStructureDefinition('eLTSSServiceModel');
    logical.id = 'MyLogical';
    pkg.logicals.push(logical);
    resource = fisher.fishForStructureDefinition('Duration');
    resource.id = 'MyResource';
    pkg.resources.push(resource);
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

    it('should log an error when multiple mappings have the same source and the same id', () => {
      /**
       * Mapping: FirstMapping
       * Source: MyObservation
       * Id: reused-id
       *
       * Mapping: SecondMapping
       * Source: MyObservation
       * Id: reused-id
       */
      const firstMapping = new Mapping('FirstMapping')
        .withFile('Mappings.fsh')
        .withLocation([3, 8, 7, 18]);
      firstMapping.source = 'MyObservation';
      firstMapping.id = 'reused-id';
      doc.mappings.set(firstMapping.name, firstMapping);
      const secondMapping = new Mapping('SecondMapping')
        .withFile('Mappings.fsh')
        .withLocation([8, 8, 11, 19]);
      secondMapping.source = 'MyObservation';
      secondMapping.id = 'reused-id';
      doc.mappings.set(secondMapping.name, secondMapping);

      exporter.export();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple mappings on MyObservation found with id reused-id/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Mappings\.fsh.*Line: 8 - 11\D*/s);
    });

    it('should not log an error when multiple mappings have different sources and the same id', () => {
      /**
       * Mapping: FirstMapping
       * Source: MyObservation
       * Id: reused-id
       *
       * Mapping: SecondMapping
       * Source: MyPractitioner
       * Id: reused-id
       */
      const firstMapping = new Mapping('FirstMapping')
        .withFile('Mappings.fsh')
        .withLocation([3, 8, 7, 18]);
      firstMapping.source = 'MyObservation';
      firstMapping.id = 'reused-id';
      doc.mappings.set(firstMapping.name, firstMapping);
      const secondMapping = new Mapping('SecondMapping')
        .withFile('Mappings.fsh')
        .withLocation([8, 8, 11, 19]);
      secondMapping.source = 'MyPractitioner';
      secondMapping.id = 'reused-id';
      doc.mappings.set(secondMapping.name, secondMapping);

      exporter.export();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not log an error and not add metadata but add rules for a simple Mapping that is inherited from the parent', () => {
      /**
       * Mapping: rim
       * Source: MyObservation
       * * status -> "Something.new"
       */

      const mapping = new Mapping('rim');
      mapping.source = 'MyObservation';
      const newRule = new MappingRule('status');
      newRule.map = 'Something.new';
      mapping.rules.push(newRule);
      doc.mappings.set(mapping.name, mapping);

      const originalMappingLength = observation.mapping.length;
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalStatusMappingLength = status.mapping.length;
      const originalRimMapping = cloneDeep(observation.mapping.find(m => m.identity === 'rim'));

      exporter.export();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(observation.mapping.length).toBe(originalMappingLength); // No metadata added
      expect(status.mapping.length).toBe(originalStatusMappingLength + 1); // New rule added to status element

      // Metadata is same as the parent
      const rimMapping = observation.mapping.find(m => m.identity === 'rim');
      expect(rimMapping).toEqual(originalRimMapping);
    });

    it('should not log an error and not add metadata but add rules for a Mapping that is inherited from the parent with the same metadata', () => {
      /**
       * Mapping: rim
       * Id: rim
       * Source: MyObservation
       * Title: "RIM Mapping"
       * Target: "http://hl7.org/v3"
       * * status -> "Something.new"
       */

      const mapping = new Mapping('rim');
      mapping.source = 'MyObservation';
      mapping.id = 'rim';
      mapping.title = 'RIM Mapping';
      mapping.target = 'http://hl7.org/v3';
      const newRule = new MappingRule('status');
      newRule.map = 'Something.new';
      mapping.rules.push(newRule);
      doc.mappings.set(mapping.name, mapping);

      const originalMappingLength = observation.mapping.length;
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalStatusMappingLength = status.mapping.length;

      exporter.export();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(observation.mapping.length).toBe(originalMappingLength); // No metadata added
      expect(status.mapping.length).toBe(originalStatusMappingLength + 1); // New rule added to status element
    });

    it('should not log an error, should update metadata, and should add rules for a Mapping that is inherited from the parent and has additional metadata not on the parent', () => {
      /**
       * Mapping: rim
       * Source: MyObservation
       * Description: "A totally new description"
       * * status -> "Something.new"
       */

      const mapping = new Mapping('rim');
      mapping.source = 'MyObservation';
      mapping.description = 'A totally new description'; // There is no comment on the parent rim mapping
      const newRule = new MappingRule('status');
      newRule.map = 'Something.new';
      mapping.rules.push(newRule);
      doc.mappings.set(mapping.name, mapping);

      const originalMappingLength = observation.mapping.length;
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalStatusMappingLength = status.mapping.length;
      const originalRimMapping = cloneDeep(observation.mapping.find(m => m.identity === 'rim'));

      exporter.export();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(observation.mapping.length).toBe(originalMappingLength); // No metadata added
      expect(status.mapping.length).toBe(originalStatusMappingLength + 1); // New rule added to status element

      // New comment (Description) is added to mapping, all other metadata should be the same
      const rimMapping = observation.mapping.find(m => m.identity === 'rim');
      originalRimMapping.comment = 'A totally new description'; // Description is added
      expect(rimMapping).toEqual(originalRimMapping);
    });

    it('should log an error and not add mapping or rules when a Mapping has the same identity as one on the parent but name or uri differs', () => {
      /**
       * Mapping: rim
       * Id: rim
       * Source: MyObservation
       * Title: "RIM Mapping"
       * Target: "http://real.org/not"
       * * status -> "Something.new"
       */

      const mapping = new Mapping('rim');
      mapping.source = 'MyObservation';
      mapping.id = 'rim';
      mapping.title = 'RIM Mapping';
      mapping.target = 'http://real.org/not';
      const newRule = new MappingRule('status');
      newRule.map = 'Something.new';
      mapping.rules.push(newRule);
      doc.mappings.set(mapping.name, mapping);

      const originalMappingLength = observation.mapping.length;
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const originalStatusMappingLength = status.mapping.length;

      exporter.export();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(observation.mapping.length).toBe(originalMappingLength); // No metadata added
      expect(status.mapping.length).toBe(originalStatusMappingLength); // No rule added to status element
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
       * * -> "OtherObservation"
       */
      const mapRule = new MappingRule('');
      mapRule.map = 'OtherObservation';
      mapping.rules.push(mapRule);
      const baseElement = observation.elements.find(e => e.id === 'Observation');
      const originalLength = baseElement.mapping.length;
      exporter.export();
      expect(baseElement.mapping.length).toBe(originalLength + 1);
      const exported = baseElement.mapping.slice(-1)[0];
      expect(exported.map).toBe('OtherObservation');
      expect(exported.identity).toBe('MyMapping');
    });

    it('should apply a valid mapping rule with a Logical source', () => {
      /**
       * Mapping: MyMapping
       * Source: MyLogical
       * * name -> "Something.provider.name"
       */
      mapping.source = 'MyLogical';
      const mapRule = new MappingRule('name');
      mapRule.map = 'Something.provider.name';
      mapping.rules.push(mapRule);
      const baseName = logical.elements.find(e => e.id === 'eLTSSServiceModel.name');
      expect(baseName.mapping).toBeUndefined();
      exporter.export();
      expect(baseName.mapping).toHaveLength(1);
      expect(baseName.mapping[0].identity).toBe('MyMapping');
      expect(baseName.mapping[0].map).toBe('Something.provider.name');
    });

    it('should apply a valid mapping rule with a Resource source', () => {
      /**
       * Mapping: MyMapping
       * Source: MyResource
       * * comparator -> "Something.operator"
       */
      mapping.source = 'MyResource';
      const mapRule = new MappingRule('comparator');
      mapRule.map = 'Something.operator';
      mapping.rules.push(mapRule);
      const baseComparator = resource.elements.find(e => e.id === 'Duration.comparator');
      const originalMappingLength = baseComparator.mapping.length;
      exporter.export();
      expect(baseComparator.mapping).toHaveLength(originalMappingLength + 1);
      const exported = baseComparator.mapping.slice(-1)[0];
      expect(exported.identity).toBe('MyMapping');
      expect(exported.map).toBe('Something.operator');
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

  describe('#insertRules', () => {
    let mapping: Mapping;
    let ruleSet: RuleSet;

    beforeEach(() => {
      mapping = new Mapping('Foo');
      mapping.source = 'MyObservation';
      doc.mappings.set(mapping.name, mapping);

      ruleSet = new RuleSet('Bar');
      doc.ruleSets.set(ruleSet.name, ruleSet);
    });

    it('should apply rules from an insert rule', () => {
      // RuleSet: Bar
      // * status -> Observation.otherStatus
      //
      // Mapping: Foo
      // * insert Bar
      const mapRule = new MappingRule('status');
      mapRule.map = 'Observation.otherStatus';
      ruleSet.rules.push(mapRule);

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      mapping.rules.push(insertRule);

      exporter.export();
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const exported = status.mapping.slice(-1)[0];
      expect(exported.map).toBe('Observation.otherStatus');
      expect(exported.identity).toBe('Foo');
    });

    it('should log an error and not apply rules from an invalid insert rule', () => {
      // RuleSet: Bar
      // * experimental = true
      // * status -> Observation.otherStatus
      //
      // Mapping: Foo
      // * insert Bar
      const valueRule = new AssignmentRule('experimental')
        .withFile('Value.fsh')
        .withLocation([1, 2, 3, 4]);
      valueRule.value = true;
      const mapRule = new MappingRule('status');
      mapRule.map = 'Observation.otherStatus';
      ruleSet.rules.push(mapRule);
      ruleSet.rules.push(valueRule, mapRule);

      const insertRule = new InsertRule('').withFile('Insert.fsh').withLocation([5, 6, 7, 8]);
      insertRule.ruleSet = 'Bar';
      mapping.rules.push(insertRule);

      exporter.export();
      // mapping rule is still applied
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const exported = status.mapping.slice(-1)[0];
      expect(exported.map).toBe('Observation.otherStatus');
      expect(exported.identity).toBe('Foo');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /AssignmentRule.*Mapping.*File: Value\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Applied on Line: 5 - 7/s
      );
    });
  });
});
