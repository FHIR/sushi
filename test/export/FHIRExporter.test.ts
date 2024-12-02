import path from 'path';
import { loadFromPath } from 'fhir-package-loader';
import { exportFHIR, Package, FHIRExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { minimalConfig } from '../utils/minimalConfig';
import { FshCode, FshCodeSystem, FshValueSet, Instance, Profile } from '../../src/fshtypes';
import {
  AssignmentRule,
  BindingRule,
  CaretValueRule,
  ValueSetConceptComponentRule
} from '../../src/fshtypes/rules';
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

    it('should allow a profile to contain a resource and to apply caret rules within the contained resource', () => {
      // Instance: MyObservation
      // InstanceOf: Observation
      // Usage: #inline
      // * id = "my-observation"
      // * status = #draft
      // * code = #123
      const instance = new Instance('MyObservation');
      instance.instanceOf = 'Observation';
      instance.usage = 'Inline';
      const instanceId = new AssignmentRule('id');
      instanceId.value = 'my-observation';
      const instanceStatus = new AssignmentRule('status');
      instanceStatus.value = new FshCode('draft');
      const instanceCode = new AssignmentRule('code');
      instanceCode.value = new FshCode('123');
      instance.rules.push(instanceId, instanceStatus, instanceCode);
      doc.instances.set(instance.name, instance);
      // Profile: ContainingProfile
      // Parent: Patient
      // * ^contained = MyObservation
      // * ^contained.valueString = "contained observation"
      // * ^contained.category = #exam
      const profile = new Profile('ContainingProfile');
      profile.parent = 'Patient';
      const containedInstance = new CaretValueRule('');
      containedInstance.caretPath = 'contained';
      containedInstance.value = 'MyObservation';
      containedInstance.isInstance = true;
      const containedValue = new CaretValueRule('');
      containedValue.caretPath = 'contained.valueString';
      containedValue.value = 'contained observation';
      const containedCategory = new CaretValueRule('');
      containedCategory.caretPath = 'contained.category';
      containedCategory.value = new FshCode('exam');
      profile.rules.push(containedInstance, containedValue, containedCategory);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles[0].contained).toEqual([
        {
          resourceType: 'Observation',
          id: 'my-observation',
          status: 'draft',
          code: {
            coding: [
              {
                code: '123'
              }
            ]
          },
          valueString: 'contained observation',
          category: [
            {
              coding: [
                {
                  code: 'exam'
                }
              ]
            }
          ]
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when a deferred rule assigns something of the wrong type', () => {
      // Instance: MyObservation
      // InstanceOf: Observation
      // Usage: #inline
      // * id = "my-observation"
      // * status = #draft
      // * code = #123
      const instance = new Instance('MyObservation');
      instance.instanceOf = 'Observation';
      instance.usage = 'Inline';
      const instanceId = new AssignmentRule('id');
      instanceId.value = 'my-observation';
      const instanceStatus = new AssignmentRule('status');
      instanceStatus.value = new FshCode('draft');
      const instanceCode = new AssignmentRule('code');
      instanceCode.value = new FshCode('123');
      instance.rules.push(instanceId, instanceStatus, instanceCode);
      doc.instances.set(instance.name, instance);
      // Profile: ContainingProfile
      // Parent: Patient
      // * ^contained = MyObservation
      // * ^contained.interpretation = "contained observation"
      const profile = new Profile('ContainingProfile');
      profile.parent = 'Patient';
      const containedInstance = new CaretValueRule('');
      containedInstance.caretPath = 'contained';
      containedInstance.value = 'MyObservation';
      containedInstance.isInstance = true;
      const containedValue = new CaretValueRule('')
        .withFile('Contained.fsh')
        .withLocation([15, 3, 15, 33]);
      containedValue.caretPath = 'contained.interpretation';
      containedValue.value = 'contained observation';
      profile.rules.push(containedInstance, containedValue);
      doc.profiles.set(profile.name, profile);
      const result = exporter.export();
      expect(result.profiles[0].contained).toEqual([
        {
          resourceType: 'Observation',
          id: 'my-observation',
          status: 'draft',
          code: {
            coding: [
              {
                code: '123'
              }
            ]
          }
        }
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'Cannot assign string value: contained observation. Value does not match element type: CodeableConcept'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Contained\.fsh.*Line: 15\D*/s);
    });

    it('should not get confused when there are contained resources of different types', () => {
      // Instance: MyObservation
      // InstanceOf: Observation
      // Usage: #inline
      // * id = "my-observation"
      // * status = #draft
      // * code = #123
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'Observation';
      observationInstance.usage = 'Inline';
      const observationId = new AssignmentRule('id');
      observationId.value = 'my-observation';
      const observationStatus = new AssignmentRule('status');
      observationStatus.value = new FshCode('draft');
      const observationCode = new AssignmentRule('code');
      observationCode.value = new FshCode('123');
      observationInstance.rules.push(observationId, observationStatus, observationCode);
      doc.instances.set(observationInstance.name, observationInstance);
      // Instance: MyPatient
      // InstanceOf: Patient
      // Usage: #inline
      // * id = "my-patient"
      // * name.given = "Marisa"
      const patientInstance = new Instance('MyPatient');
      patientInstance.instanceOf = 'Patient';
      patientInstance.usage = 'Inline';
      const patientId = new AssignmentRule('id');
      patientId.value = 'my-patient';
      const patientName = new AssignmentRule('name.given');
      patientName.value = 'Marisa';
      patientInstance.rules.push(patientId, patientName);
      doc.instances.set(patientInstance.name, patientInstance);
      // Profile: ContainingProfile
      // Parent: Patient
      // * ^contained = MyObservation
      // * ^contained[1] = MyPatient
      // * ^contained.valueString = "contained observation"
      // * ^contained[1].name.family = "Kirisame"
      const profile = new Profile('ContainingProfile');
      profile.parent = 'Patient';
      const containedObservation = new CaretValueRule('');
      containedObservation.caretPath = 'contained';
      containedObservation.value = 'MyObservation';
      containedObservation.isInstance = true;
      const containedPatient = new CaretValueRule('');
      containedPatient.caretPath = 'contained[1]';
      containedPatient.value = 'MyPatient';
      containedPatient.isInstance = true;
      const containedValue = new CaretValueRule('');
      containedValue.caretPath = 'contained.valueString';
      containedValue.value = 'contained observation';
      const containedFamily = new CaretValueRule('');
      containedFamily.caretPath = 'contained[1].name.family';
      containedFamily.value = 'Kirisame';
      profile.rules.push(containedObservation, containedPatient, containedValue, containedFamily);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles[0].contained).toHaveLength(2);
      expect(result.profiles[0].contained[0]).toEqual({
        resourceType: 'Observation',
        id: 'my-observation',
        status: 'draft',
        code: { coding: [{ code: '123' }] },
        valueString: 'contained observation'
      });
      expect(result.profiles[0].contained[1]).toEqual({
        resourceType: 'Patient',
        id: 'my-patient',
        name: [{ given: ['Marisa'], family: 'Kirisame' }]
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should allow a profile to contain a profiled resource and to apply a caret rule within the contained resource', () => {
      // Instance: some-patient
      // InstanceOf: gendered-patient
      // Usage: #inline
      // * gender = #unknown
      const instance = new Instance('some-patient');
      instance.instanceOf = 'gendered-patient';
      instance.usage = 'Inline';
      const instanceGender = new AssignmentRule('gender');
      instanceGender.value = new FshCode('unknown');
      instance.rules.push(instanceGender);
      doc.instances.set(instance.name, instance);
      // Profile: ContainingProfile
      // Parent: Patient
      // * ^contained = some-patient
      // * ^contained.name.given = "mint"
      const profile = new Profile('ContainingProfile');
      profile.parent = 'Patient';
      const containedInstance = new CaretValueRule('');
      containedInstance.caretPath = 'contained';
      containedInstance.value = 'some-patient';
      containedInstance.isInstance = true;
      const containedName = new CaretValueRule('');
      containedName.caretPath = 'contained.name.given';
      containedName.value = 'mint';
      profile.rules.push(containedInstance, containedName);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles[0].contained).toEqual([
        {
          resourceType: 'Patient',
          meta: {
            profile: ['http://example.org/impose/StructureDefinition/gendered-patient']
          },
          id: 'some-patient',
          gender: 'unknown',
          name: [{ given: ['mint'] }]
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should allow a profile to bind an element to a contained ValueSet using a relative reference', () => {
      const valueSet = new FshValueSet('MyValueSet');
      valueSet.id = 'my-value-set';
      doc.valueSets.set(valueSet.name, valueSet);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'MyValueSet';
      caretValueRule.isInstance = true;
      const bindingRule = new BindingRule('code');
      bindingRule.valueSet = 'MyValueSet';
      bindingRule.strength = 'extensible';
      profile.rules.push(caretValueRule, bindingRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].contained).toEqual([
        {
          resourceType: 'ValueSet',
          id: 'my-value-set',
          name: 'MyValueSet',
          url: 'http://hl7.org/fhir/us/minimal/ValueSet/my-value-set',
          status: 'draft'
        }
      ]);
      const codeElement = result.profiles[0].findElement('Basic.code');
      expect(codeElement.binding.strength).toBe('extensible');
      expect(codeElement.binding.valueSet).toBe('#my-value-set');
    });

    it('should allow a profile to bind an element to a contained inline instance of ValueSet using a relative reference', () => {
      const instance = new Instance('MyValueSet');
      instance.instanceOf = 'ValueSet';
      instance.usage = 'Inline';
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'MyValueSet';
      caretValueRule.isInstance = true;
      const bindingRule = new BindingRule('code');
      bindingRule.valueSet = 'MyValueSet';
      bindingRule.strength = 'extensible';
      profile.rules.push(caretValueRule, bindingRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].contained).toEqual([
        { resourceType: 'ValueSet', id: 'MyValueSet' }
      ]);
      const codeElement = result.profiles[0].findElement('Basic.code');
      expect(codeElement.binding.strength).toBe('extensible');
      expect(codeElement.binding.valueSet).toBe('#MyValueSet');
    });

    it('should allow a profile to bind an element to a contained inline instance of ValueSet with name set by a rule, using a relative reference', () => {
      const instance = new Instance('my-value-set');
      instance.instanceOf = 'ValueSet';
      instance.usage = 'Inline';
      const nameRule = new AssignmentRule('name');
      nameRule.value = 'MyValueSet';
      instance.rules.push(nameRule);
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'my-value-set';
      caretValueRule.isInstance = true;
      const bindingRule = new BindingRule('code');
      bindingRule.valueSet = 'MyValueSet';
      bindingRule.strength = 'extensible';
      profile.rules.push(caretValueRule, bindingRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].contained).toEqual([
        { resourceType: 'ValueSet', id: 'my-value-set', name: 'MyValueSet' }
      ]);
      const codeElement = result.profiles[0].findElement('Basic.code');
      expect(codeElement.binding.strength).toBe('extensible');
      expect(codeElement.binding.valueSet).toBe('#my-value-set');
    });

    it('should allow a profile to bind an element to a contained inline instance of ValueSet with url set by a rule, using a relative reference', () => {
      const instance = new Instance('MyValueSet');
      instance.instanceOf = 'ValueSet';
      instance.usage = 'Inline';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://hl7.org/fhir/us/custom/ValueSet/MyValueSet';
      instance.rules.push(urlRule);
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'MyValueSet';
      caretValueRule.isInstance = true;
      const bindingRule = new BindingRule('code');
      bindingRule.valueSet = 'http://hl7.org/fhir/us/custom/ValueSet/MyValueSet';
      bindingRule.strength = 'extensible';
      profile.rules.push(caretValueRule, bindingRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].contained).toEqual([
        {
          resourceType: 'ValueSet',
          id: 'MyValueSet',
          url: 'http://hl7.org/fhir/us/custom/ValueSet/MyValueSet'
        }
      ]);
      const codeElement = result.profiles[0].findElement('Basic.code');
      expect(codeElement.binding.strength).toBe('extensible');
      expect(codeElement.binding.valueSet).toBe('#MyValueSet');
    });

    it('should allow a profile to bind an element to a contained definitional instance of ValueSet using a relative reference', () => {
      const instance = new Instance('MyValueSet');
      instance.instanceOf = 'ValueSet';
      instance.usage = 'Definition';
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'MyValueSet';
      caretValueRule.isInstance = true;
      const bindingRule = new BindingRule('code');
      bindingRule.valueSet = 'MyValueSet';
      bindingRule.strength = 'extensible';
      profile.rules.push(caretValueRule, bindingRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].contained).toEqual([
        {
          resourceType: 'ValueSet',
          id: 'MyValueSet',
          url: 'http://hl7.org/fhir/us/minimal/ValueSet/MyValueSet'
        }
      ]);
      const codeElement = result.profiles[0].findElement('Basic.code');
      expect(codeElement.binding.strength).toBe('extensible');
      expect(codeElement.binding.valueSet).toBe('#MyValueSet');
    });

    it('should allow a profile to bind an element by name to a contained definitional instance of ValueSet with a name set by a rule using a relative reference', () => {
      const instance = new Instance('MyValueSet');
      instance.instanceOf = 'ValueSet';
      instance.usage = 'Definition';
      const vsName = new AssignmentRule('name');
      vsName.value = 'MyVS';
      instance.rules.push(vsName);
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'MyValueSet';
      caretValueRule.isInstance = true;
      const bindingRule = new BindingRule('code');
      bindingRule.valueSet = 'MyVS';
      bindingRule.strength = 'extensible';
      profile.rules.push(caretValueRule, bindingRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].contained).toEqual([
        {
          resourceType: 'ValueSet',
          id: 'MyValueSet',
          url: 'http://hl7.org/fhir/us/minimal/ValueSet/MyValueSet',
          name: 'MyVS'
        }
      ]);
      const codeElement = result.profiles[0].findElement('Basic.code');
      expect(codeElement.binding.strength).toBe('extensible');
      expect(codeElement.binding.valueSet).toBe('#MyValueSet');
    });

    it('should allow a profile to bind an element to a contained ValueSet using a relative reference when the rule includes a version', () => {
      const valueSet = new FshValueSet('MyValueSet');
      valueSet.id = 'my-value-set';
      const vsVersion = new CaretValueRule('');
      vsVersion.caretPath = 'version';
      vsVersion.value = '1.2.8';
      valueSet.rules.push(vsVersion);
      doc.valueSets.set(valueSet.name, valueSet);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'contained';
      caretValueRule.value = 'MyValueSet|1.2.8';
      caretValueRule.isInstance = true;
      const bindingRule = new BindingRule('code');
      bindingRule.valueSet = 'MyValueSet';
      bindingRule.strength = 'extensible';
      profile.rules.push(caretValueRule, bindingRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].contained).toEqual([
        {
          resourceType: 'ValueSet',
          id: 'my-value-set',
          name: 'MyValueSet',
          url: 'http://hl7.org/fhir/us/minimal/ValueSet/my-value-set',
          status: 'draft',
          version: '1.2.8'
        }
      ]);
      const codeElement = result.profiles[0].findElement('Basic.code');
      expect(codeElement.binding.strength).toBe('extensible');
      expect(codeElement.binding.valueSet).toBe('#my-value-set');
    });

    it('should log an error when attempting to bind an element to an inline ValueSet instance that is not contained in the profile', () => {
      const instance = new Instance('MyValueSet');
      instance.instanceOf = 'ValueSet';
      instance.usage = 'Inline';
      doc.instances.set(instance.name, instance);

      const profile = new Profile('ContainingProfile');
      profile.parent = 'Basic';
      const bindingRule = new BindingRule('code')
        .withFile('Profile.fsh')
        .withLocation([8, 3, 8, 29]);
      bindingRule.valueSet = 'MyValueSet';
      bindingRule.strength = 'extensible';
      profile.rules.push(bindingRule);
      doc.profiles.set(profile.name, profile);

      const result = exporter.export();
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].contained).toBeUndefined();
      const codeElement = result.profiles[0].findElement('Basic.code');
      expect(codeElement.binding.strength).not.toBe('extensible');
      expect(codeElement.binding.valueSet).not.toBe('#MyValueSet');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Can not bind code to ValueSet MyValueSet: this ValueSet is an inline instance, but it is not present in the list of contained resources.*File: Profile\.fsh.*Line: 8\D*/s
      );
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

    it('should let a profile assign and modify an Inline instance that is not a resource', () => {
      // Profile: MyObservation
      // Parent: Observation
      // ^contact = MyContact
      // ^contact.telecom.value = "bearington@bear.zoo"
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const contactRule = new CaretValueRule('');
      contactRule.caretPath = 'contact';
      contactRule.value = 'MyContact';
      contactRule.isInstance = true;
      const telecomRule = new CaretValueRule('');
      telecomRule.caretPath = 'contact.telecom.value';
      telecomRule.value = 'bearington@bear.zoo';
      profile.rules.push(contactRule, telecomRule);
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
        name: 'Bearington',
        telecom: [
          {
            value: 'bearington@bear.zoo'
          }
        ]
      });
    });

    it('should export a value set that includes a component from a contained FSH code system and add the valueset-system extension', () => {
      // CodeSystem: FoodCS
      // Id: food
      const foodCS = new FshCodeSystem('FoodCS');
      foodCS.id = 'food';
      doc.codeSystems.set(foodCS.name, foodCS);
      // ValueSet: DinnerVS
      // * ^contained[0] = FoodCS
      // * include codes from system food
      const valueSet = new FshValueSet('DinnerVS');
      const containedCS = new CaretValueRule('');
      containedCS.caretPath = 'contained[0]';
      containedCS.value = 'FoodCS';
      containedCS.isInstance = true;
      const component = new ValueSetConceptComponentRule(true);
      component.from = { system: 'FoodCS' };
      valueSet.rules.push(containedCS, component);
      doc.valueSets.set(valueSet.name, valueSet);

      const exported = exporter.export();
      expect(exported.valueSets.length).toBe(1);
      expect(exported.valueSets[0]).toEqual({
        resourceType: 'ValueSet',
        name: 'DinnerVS',
        id: 'DinnerVS',
        status: 'draft',
        url: 'http://hl7.org/fhir/us/minimal/ValueSet/DinnerVS',
        contained: [
          {
            content: 'complete',
            id: 'food',
            name: 'FoodCS',
            resourceType: 'CodeSystem',
            status: 'draft',
            url: 'http://hl7.org/fhir/us/minimal/CodeSystem/food'
          }
        ],
        compose: {
          include: [
            {
              system: 'http://hl7.org/fhir/us/minimal/CodeSystem/food',
              _system: {
                extension: [
                  {
                    url: 'http://hl7.org/fhir/StructureDefinition/valueset-system',
                    valueCanonical: '#food'
                  }
                ]
              }
            }
          ]
        }
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
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
