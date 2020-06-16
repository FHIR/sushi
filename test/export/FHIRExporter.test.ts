import path from 'path';
import { exportFHIR, Package, FHIRExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { minimalConfig } from '../utils/minimalConfig';
import { Instance, Profile } from '../../src/fshtypes';
import { CaretValueRule } from '../../src/fshtypes/rules';
import { TestFisher } from '../testhelpers';

describe('FHIRExporter', () => {
  it('should output empty results with empty input', () => {
    const input = new FSHTank([], minimalConfig);
    const result = exportFHIR(input, new FHIRDefinitions());
    expect(result).toEqual(
      new Package({
        filePath: 'config.yaml',
        id: 'fhir.us.minimal',
        version: '1.0.0',
        canonical: 'http://hl7.org/fhir/us/minimal',
        name: 'MinimalIG',
        status: 'draft',
        fhirVersion: ['4.0.1'],
        template: 'hl7.fhir.template#0.0.5'
      })
    );
  });

  describe('#containedResources', () => {
    let defs: FHIRDefinitions;
    let doc: FSHDocument;
    let exporter: FHIRExporter;

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
      exporter = new FHIRExporter(input, pkg, fisher);
    });

    it('should allow a profile to contain a defined resource', () => {
      const profile = new Profile('ContainingProfile');
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'allergyintolerance-clinical';
      profile.rules.push(caretValueRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();

      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].contained.length).toBe(1);
      const containedResource = result.profiles[0].contained[0];
      expect(containedResource).toEqual(
        defs.allValueSets().find(vs => vs.id === 'allergyintolerance-clinical')
      );
    });

    it('should allow a profile to contain an inline resource', () => {
      const instance = new Instance('myObservation');
      instance.instanceOf = 'Observation';
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'myObservation';
      profile.rules.push(caretValueRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();

      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].contained.length).toBe(1);
      expect(result.profiles[0].contained[0]).toEqual({
        resourceType: 'Observation',
        id: 'myObservation'
      });
    });
  });
});
