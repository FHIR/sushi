import path from 'path';
import { loadFromPath } from 'fhir-package-loader';
import { exportFHIR, Package, FHIRExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { minimalConfig } from '../utils/minimalConfig';
import { Instance, Profile } from '../../src/fshtypes';
import { AssignmentRule, CaretValueRule } from '../../src/fshtypes/rules';
import { TestFisher, loggerSpy } from '../testhelpers';

describe('FHIRExporter', () => {
  it('should output empty results with empty input', () => {
    const input = new FSHTank([], minimalConfig);
    const result = exportFHIR(input, new FHIRDefinitions());
    expect(result).toEqual(
      new Package({
        filePath: 'sushi-config.yaml',
        id: 'fhir.us.minimal',
        version: '1.0.0',
        canonical: 'http://hl7.org/fhir/us/minimal',
        name: 'MinimalIG',
        status: 'draft',
        fhirVersion: ['4.0.1']
      })
    );
  });

  describe('#containedResources', () => {
    let defs: FHIRDefinitions;
    let doc: FSHDocument;
    let exporter: FHIRExporter;

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
      exporter = new FHIRExporter(input, pkg, fisher);
    });

    it('should allow a profile to contain a defined FHIR resource', () => {
      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'allergyintolerance-clinical';
      caretValueRule.isInstance = true;
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

    it('should allow a profile to contain a FSH resource', () => {
      const instance = new Instance('myObservation');
      instance.instanceOf = 'Observation';
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'myObservation';
      caretValueRule.isInstance = true;
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

    it('should allow a profile to contain a FSH resource with a numeric id', () => {
      const instance = new Instance('010203');
      instance.instanceOf = 'Observation';
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 10203;
      caretValueRule.rawValue = '010203';
      profile.rules.push(caretValueRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();

      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].contained.length).toBe(1);
      expect(result.profiles[0].contained[0]).toEqual({
        resourceType: 'Observation',
        id: '010203'
      });
    });

    it('should allow a profile to contain a FSH resource with an id that resembles a boolean', () => {
      const instance = new Instance('false');
      instance.instanceOf = 'Observation';
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = false;
      caretValueRule.rawValue = 'false';
      profile.rules.push(caretValueRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();

      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].contained.length).toBe(1);
      expect(result.profiles[0].contained[0]).toEqual({
        resourceType: 'Observation',
        id: 'false'
      });
    });

    it('should allow a profile to contain multiple FSH resources', () => {
      const instanceOneTwoThree = new Instance('010203');
      instanceOneTwoThree.instanceOf = 'Observation';
      doc.instances.set(instanceOneTwoThree.name, instanceOneTwoThree);

      const instanceCleanSocks = new Instance('CleanSocks');
      instanceCleanSocks.instanceOf = 'Observation';
      doc.instances.set(instanceCleanSocks.name, instanceCleanSocks);

      const instanceFourFiveSix = new Instance('456');
      instanceFourFiveSix.instanceOf = 'Location';
      doc.instances.set(instanceFourFiveSix.name, instanceFourFiveSix);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const containedOneTwoThree = new CaretValueRule('');
      containedOneTwoThree.caretPath = 'contained';
      containedOneTwoThree.value = 10203;
      containedOneTwoThree.rawValue = '010203';
      const containedCleanSocks = new CaretValueRule('');
      containedCleanSocks.caretPath = 'contained[1]';
      containedCleanSocks.value = 'CleanSocks';
      containedCleanSocks.isInstance = true;
      const containedFourFiveSix = new CaretValueRule('');
      containedFourFiveSix.caretPath = 'contained[2]';
      containedFourFiveSix.value = 456;
      containedFourFiveSix.rawValue = '456';
      profile.rules.push(containedOneTwoThree, containedCleanSocks, containedFourFiveSix);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles[0].contained.length).toBe(3);
      expect(result.profiles[0].contained).toEqual([
        { resourceType: 'Observation', id: '010203' },
        { resourceType: 'Observation', id: 'CleanSocks' },
        { resourceType: 'Location', id: '456' }
      ]);
    });

    it('should log an error when a profile tries to contain an instance that is not a resource', () => {
      const instance = new Instance('MyCodeable');
      instance.instanceOf = 'CodeableConcept';
      instance.usage = 'Inline';
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Patient';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained[0]';
      caretValueRule.value = 'MyCodeable';
      caretValueRule.isInstance = true;
      profile.rules.push(caretValueRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].contained).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign CodeableConcept value: MyCodeable/s
      );
    });

    it('should log an error when a profile tries to contain a resource that does not exist', () => {
      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'oops-no-resource';
      caretValueRule.isInstance = true;
      profile.rules.push(caretValueRule);
      doc.profiles.set(profile.name, profile);

      exporter.export();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Could not find a resource named oops-no-resource/s
      );
    });

    it('should let a profile assign an Inline instance that is not a resource', () => {
      // Profile: MyObservation
      // Parent: Observation
      // ^contact = MyContact
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const contactRule = new CaretValueRule('');
      contactRule.caretPath = 'contact';
      contactRule.value = 'MyContact';
      contactRule.isInstance = true;
      profile.rules.push(contactRule);
      doc.profiles.set(profile.name, profile);
      // Instance: MyContact
      // InstanceOf: ContactDetail
      // Usage: #inline
      // name = "Bearington"
      const instance = new Instance('MyContact');
      instance.instanceOf = 'ContactDetail';
      instance.usage = 'Inline';
      const contactName = new AssignmentRule('name');
      contactName.value = 'Bearington';
      instance.rules.push(contactName);
      doc.instances.set(instance.name, instance);

      const result = exporter.export();

      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].contact.length).toBe(1);
      expect(result.profiles[0].contact[0]).toEqual({
        name: 'Bearington'
      });
    });

    it('should log a message when trying to assign a value that is numeric and refers to an Instance, but both types are wrong', () => {
      // Profile: MyObservation
      // Parent: Observation
      // ^identifier = 1234
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const identifierRule = new CaretValueRule('')
        .withFile('Profiles.fsh')
        .withLocation([10, 5, 10, 29]);
      identifierRule.caretPath = 'identifier';
      identifierRule.value = 1234;
      identifierRule.rawValue = '1234';
      profile.rules.push(identifierRule);
      doc.profiles.set(profile.name, profile);
      // Instance: 1234
      // InstanceOf: ContactDetail
      // Usage: #inline
      // name = "Bearington"
      const instance = new Instance('1234');
      instance.instanceOf = 'ContactDetail';
      instance.usage = 'Inline';
      const contactName = new AssignmentRule('name');
      contactName.value = 'Bearington';
      instance.rules.push(contactName);
      doc.instances.set(instance.name, instance);

      const result = exporter.export();

      expect(result.profiles.length).toBe(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign number value: 1234\. Value does not match element type: Identifier.*File: Profiles\.fsh.*Line: 10\D*/s
      );
    });

    it('should log a message and not change the URL when trying to assign an instance to a URL and the instance is not the correct type', () => {
      // this represents the case where the author does not quote the url value, such as:
      // * ^url = http://example.org/some/url
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';

      const rule = new CaretValueRule('').withFile('UnquotedUrl.fsh').withLocation([4, 3, 4, 12]);
      rule.caretPath = 'url';
      rule.value = 'http://example.org/some/url';
      rule.isInstance = true;
      profile.rules.push(rule);
      doc.profiles.set(profile.name, profile);
      const result = exporter.export();

      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/MyObservation'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'Could not find a resource named http://example.org/some/url'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: UnquotedUrl\.fsh.*Line: 4\D*/s);
    });
  });
});
