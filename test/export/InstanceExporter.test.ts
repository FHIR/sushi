import { InstanceExporter, Package, StructureDefinitionExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import {
  Instance,
  Profile,
  FshCode,
  FshReference,
  Extension,
  FshCodeSystem,
  RuleSet
} from '../../src/fshtypes';
import {
  FixedValueRule,
  ContainsRule,
  CardRule,
  OnlyRule,
  CaretValueRule
} from '../../src/fshtypes/rules';
import { loggerSpy, TestFisher } from '../testhelpers';
import { InstanceDefinition } from '../../src/fhirtypes';
import path from 'path';

describe('InstanceExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let sdExporter: StructureDefinitionExporter;
  let exporter: InstanceExporter;
  let exportInstance: (instance: Instance) => InstanceDefinition;

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
    sdExporter = new StructureDefinitionExporter(input, pkg, fisher);
    exporter = new InstanceExporter(input, pkg, fisher);
    exportInstance = (instance: Instance) => {
      sdExporter.export();
      return exporter.exportInstance(instance);
    };
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export().instances;
    expect(exported).toEqual([]);
  });

  it('should export a single instance', () => {
    const instance = new Instance('MyInstance');
    instance.instanceOf = 'Patient';
    doc.instances.set(instance.name, instance);
    const exported = exporter.export().instances;
    expect(exported.length).toBe(1);
  });

  it('should export multiple instances', () => {
    const instanceFoo = new Instance('Foo');
    instanceFoo.instanceOf = 'Patient';
    const instanceBar = new Instance('Bar');
    instanceBar.instanceOf = 'Patient';
    doc.instances.set(instanceFoo.name, instanceFoo);
    doc.instances.set(instanceBar.name, instanceBar);
    const exported = exporter.export().instances;
    expect(exported.length).toBe(2);
  });

  it('should still export instance if one fails', () => {
    const instanceFoo = new Instance('Foo');
    instanceFoo.instanceOf = 'Baz';
    const instanceBar = new Instance('Bar');
    instanceBar.instanceOf = 'Patient';
    doc.instances.set(instanceFoo.name, instanceFoo);
    doc.instances.set(instanceBar.name, instanceBar);
    const exported = exporter.export().instances;
    expect(exported.length).toBe(1);
    expect(exported[0]._instanceMeta.name).toBe('Bar');
  });

  it('should log a message with source information when the parent is not found', () => {
    const instance = new Instance('Bogus').withFile('Bogus.fsh').withLocation([2, 9, 4, 23]);
    instance.instanceOf = 'BogusParent';
    doc.instances.set(instance.name, instance);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bogus\.fsh.*Line: 2 - 4\D*/s);
  });

  it('should export instances with InstanceOf FSHy profile', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Patient';
    const instanceBar = new Instance('Bar');
    instanceBar.instanceOf = 'Foo';
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.instances.set(instanceBar.name, instanceBar);
    sdExporter.export();
    const exported = exporter.export().instances;
    expect(exported.length).toBe(1); // One instance is successfully exported because profile is defined
    expect(exported[0]._instanceMeta.name).toBe('Bar');
    expect(exported[0].resourceType).toBe('Patient');
  });

  it('should fix values on an instance', () => {
    const instance = new Instance('Bar');
    instance.instanceOf = 'Patient';
    const fixedValRule = new FixedValueRule('gender');
    const fixedFshCode = new FshCode('foo', 'http://foo.com');
    fixedValRule.fixedValue = fixedFshCode;
    instance.rules.push(fixedValRule);
    doc.instances.set(instance.name, instance);
    const exported = exporter.export().instances;
    expect(exported.length).toBe(1);
    expect(exported[0].gender).toBe('foo');
  });

  describe('#exportInstance', () => {
    let patient: Profile;
    let respRate: Profile;
    let patientProf: Profile;
    let patientInstance: Instance;
    let patientProfInstance: Instance;
    let lipidInstance: Instance;
    let valueSetInstance: Instance;
    let respRateInstance: Instance;
    beforeEach(() => {
      patient = new Profile('TestPatient');
      patient.parent = 'Patient';
      doc.profiles.set(patient.name, patient);
      patientProf = new Profile('TestPatientProf');
      patientProf.parent = 'patient-proficiency';
      doc.profiles.set(patientProf.name, patientProf);
      respRate = new Profile('TestRespRate');
      respRate.parent = 'resprate';
      doc.profiles.set(respRate.name, respRate);
      patientInstance = new Instance('Bar')
        .withFile('PatientInstance.fsh')
        .withLocation([10, 1, 20, 30]);
      patientInstance.instanceOf = 'TestPatient';
      doc.instances.set(patientInstance.name, patientInstance);
      patientProfInstance = new Instance('Baz');
      patientProfInstance.instanceOf = 'TestPatientProf';
      doc.instances.set(patientProfInstance.name, patientProfInstance);
      lipidInstance = new Instance('Bam')
        .withFile('LipidInstance.fsh')
        .withLocation([10, 1, 20, 30]);
      lipidInstance.instanceOf = 'lipidprofile';
      doc.instances.set(lipidInstance.name, lipidInstance);
      valueSetInstance = new Instance('Boom');
      valueSetInstance.instanceOf = 'ValueSet';
      doc.instances.set(valueSetInstance.name, valueSetInstance);
      respRateInstance = new Instance('Bang');
      respRateInstance.instanceOf = 'TestRespRate';
      doc.instances.set(respRateInstance.name, respRateInstance);
    });

    // Setting Metadata
    it('should set meta.profile to the defining URL we are making an instance of', () => {
      const exported = exportInstance(patientInstance);
      expect(exported.meta).toEqual({
        profile: ['http://example.com/StructureDefinition/TestPatient']
      });
    });

    it('should not set meta.profile when we are making an instance of a base resource', () => {
      const boo = new Instance('Boo');
      boo.instanceOf = 'Patient';
      const exported = exportInstance(boo);
      expect(exported.meta).toBeUndefined();
    });

    // Setting instance id
    it('should set id to instance name by default', () => {
      const myExamplePatient = new Instance('MyExample');
      myExamplePatient.instanceOf = 'Patient';
      const exported = exportInstance(myExamplePatient);
      const expectedInstanceJSON = {
        resourceType: 'Patient',
        id: 'MyExample'
      };
      expect(exported.toJSON()).toEqual(expectedInstanceJSON);
    });

    it('should overwrite id if it is set by a rule', () => {
      const myExamplePatient = new Instance('MyExample');
      myExamplePatient.instanceOf = 'Patient';
      const fixedValRule = new FixedValueRule('id');
      fixedValRule.fixedValue = 'PatientA';
      myExamplePatient.rules.push(fixedValRule);
      const exported = exportInstance(myExamplePatient);
      const expectedInstanceJSON = {
        resourceType: 'Patient',
        id: 'PatientA'
      };
      expect(exported.toJSON()).toEqual(expectedInstanceJSON);
    });

    it('should log a message when the instance has an invalid id', () => {
      const myExamplePatient = new Instance('MyExample')
        .withFile('Some.fsh')
        .withLocation([3, 6, 6, 45]);
      myExamplePatient.instanceOf = 'Patient';
      const fixedValRule = new FixedValueRule('id');
      fixedValRule.fixedValue = 'Some Patient';
      myExamplePatient.rules.push(fixedValRule);
      const exported = exportInstance(myExamplePatient);
      const expectedInstanceJSON = {
        resourceType: 'Patient',
        id: 'Some Patient'
      };
      expect(exported.toJSON()).toEqual(expectedInstanceJSON);
      expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR id/s);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Some\.fsh.*Line: 3 - 6\D*/s);
    });

    // Fixing top level elements
    it('should fix top level elements that are fixed on the Structure Definition', () => {
      const cardRule = new CardRule('active');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toEqual(true);
    });

    it('should fix top level codes that are fixed on the Structure Definition', () => {
      const cardRule = new CardRule('gender');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const fixedValRule = new FixedValueRule('gender');
      fixedValRule.fixedValue = new FshCode('F');
      patient.rules.push(fixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.gender).toBe('F');
    });

    it('should not fix optional elements that are fixed on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toBeUndefined();
    });

    it('should fix top level elements to an array even if constrained on the Structure Definition', () => {
      const condition = new Profile('TestCondition');
      condition.parent = 'Condition';
      const cardRule = new CardRule('category');
      cardRule.min = 1;
      cardRule.max = '1';
      condition.rules.push(cardRule);
      doc.profiles.set(condition.name, condition);
      const conditionInstance = new Instance('Bar');
      conditionInstance.instanceOf = 'TestCondition';
      doc.instances.set(conditionInstance.name, conditionInstance);
      const fixedValRule = new FixedValueRule('category');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      condition.rules.push(fixedValRule);
      const exported = exportInstance(conditionInstance);
      expect(exported.category).toEqual([
        {
          coding: [
            {
              code: 'foo',
              system: 'http://foo.com'
            }
          ]
        }
      ]);
    });

    it('should fix top level elements that are fixed by a pattern on the Structure Definition', () => {
      const cardRule = new CardRule('maritalStatus');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com' }]
      });
    });

    it('should fix a value onto an element that are fixed by a pattern on the Structure Definition', () => {
      const observation = new Profile('TestObservation');
      observation.parent = 'Observation';
      doc.profiles.set(observation.name, observation);
      const onlyRule = new OnlyRule('value[x]');
      onlyRule.types = [{ type: 'Quantity' }];
      observation.rules.push(onlyRule); // * value[x] only Quantity
      const fixedValRule = new FixedValueRule('valueQuantity');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      observation.rules.push(fixedValRule); // * valueQuantity = foo.com#foo
      const cardRule = new CardRule('valueQuantity');
      cardRule.min = 1;
      observation.rules.push(cardRule); // * valueQuantity 1..1
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'TestObservation';
      const fixedQuantityValue = new FixedValueRule('valueQuantity.value');
      fixedQuantityValue.fixedValue = 100;
      observationInstance.rules.push(fixedQuantityValue); // * valueQuantity.value = 100
      doc.instances.set(observationInstance.name, observationInstance);

      const exported = exportInstance(observationInstance);
      expect(exported.valueQuantity).toEqual({
        code: 'foo',
        system: 'http://foo.com',
        value: 100
      });
    });

    it('should fix a value onto slice elements that are fixed by a pattern on the Structure Definition', () => {
      const containsRule = new ContainsRule('category');
      containsRule.items = [{ name: 'niceSlice' }];
      respRate.rules.push(containsRule); // * category contains niceSlice
      const cardRule = new CardRule('category[niceSlice]');
      cardRule.min = 1;
      cardRule.max = '*';
      respRate.rules.push(cardRule); // * category[niceSlice] 1..*
      const fixedValRule = new FixedValueRule('category[niceSlice]');
      const fixedFshCode = new FshCode('rice', 'http://spice.com');
      fixedValRule.fixedValue = fixedFshCode;
      respRate.rules.push(fixedValRule); // * category[niceSlice] = http://spice.com#rice
      const exported = exportInstance(respRateInstance);
      expect(exported.category).toContainEqual({
        coding: [
          {
            code: 'rice',
            system: 'http://spice.com'
          }
        ]
      });
    });

    it('should fix top level choice elements that are fixed on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('deceasedBoolean');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const cardRule = new CardRule('deceasedBoolean');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const exported = exportInstance(patientInstance);
      expect(exported.deceasedBoolean).toBe(true);
    });

    it('should fix an element to a value the same as the fixed value on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('active');
      instanceFixedValRule.fixedValue = true;
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toEqual(true);
    });

    it('should fix an element to a value the same as the fixed pattern on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus');
      const instanceFixedFshCode = new FshCode('foo', 'http://foo.com');
      instanceFixedValRule.fixedValue = instanceFixedFshCode;
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com' }]
      });
    });

    it('should fix an element to a value that is a superset of the fixed pattern on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus');
      const instanceFixedFshCode = new FshCode('foo', 'http://foo.com', 'Foo Foo');
      instanceFixedValRule.fixedValue = instanceFixedFshCode;
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com', display: 'Foo Foo' }]
      });
    });

    it('should not fix an element to a value different than the fixed value on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const cardRule = new CardRule('active');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const instanceFixedValRule = new FixedValueRule('active');
      instanceFixedValRule.fixedValue = false;
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toBe(true);
      expect(loggerSpy.getLastMessage()).toMatch(
        'Cannot fix false to this element; a different boolean is already fixed: true'
      );
    });

    it('should not fix an element to a value different than the pattern value on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const cardRule = new CardRule('maritalStatus');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus');
      const instanceFixedFshCode = new FshCode('bar', 'http://bar.com');
      instanceFixedValRule.fixedValue = instanceFixedFshCode;
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus.coding[0]).toEqual({
        code: 'foo',
        system: 'http://foo.com'
      });
      expect(loggerSpy.getLastMessage()).toMatch(
        'Cannot fix http://bar.com#bar to this element; a different CodeableConcept is already fixed: {"coding":[{"code":"foo","system":"http://foo.com"}]}.'
      );
    });

    // Nested elements
    it('should fix a nested element that has parents defined in the instance and is fixed on the Structure Definition', () => {
      const cardRule = new CardRule('communication.preferred');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const fixedValRule = new FixedValueRule('communication.preferred');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('communication[0].language');
      instanceFixedValRule.fixedValue = new FshCode('foo');
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.communication[0]).toEqual({
        preferred: true,
        language: { coding: [{ code: 'foo' }] }
      });
    });

    it('should fix a nested element that has parents and children defined in the instance and is fixed on the Structure Definition', () => {
      const cardRule = new CardRule('communication.language.text');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const fixedValRule = new FixedValueRule('communication.language.text');
      fixedValRule.fixedValue = 'foo';
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule(
        'communication[0].language.coding[0].version'
      );
      instanceFixedValRule.fixedValue = 'bar';
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.communication[0]).toEqual({
        language: { text: 'foo', coding: [{ version: 'bar' }] }
      });
    });

    it('should not fix a nested element that does not have parents defined in the instance', () => {
      const fixedValRule = new FixedValueRule('communication.preferred');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.communication).toBeUndefined();
    });

    it('should fix a nested element that has parents defined in the instance and fixed on the SD to an array even if constrained', () => {
      const cardRule = new CardRule('contact');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      const cardRuleRelationship = new CardRule('contact.relationship');
      cardRuleRelationship.min = 1;
      cardRuleRelationship.max = '*';
      patient.rules.push(cardRuleRelationship);
      const fixedValRule = new FixedValueRule('contact.relationship');
      fixedValRule.fixedValue = new FshCode('mother');
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('contact.gender');
      instanceFixedValRule.fixedValue = new FshCode('foo');
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.contact).toEqual([
        {
          gender: 'foo',
          relationship: [{ coding: [{ code: 'mother' }] }]
        }
      ]);
    });

    // Deeply Nested Elements
    it('should fix a deeply nested element that is fixed on the Structure Definition and has 1..1 parents', () => {
      // * telecom.period 1..1
      // * telecom.period.start 1..1
      // * telecom.period.start = "2000-07-04"
      const periodCard = new CardRule('telecom.period');
      periodCard.min = 1;
      periodCard.max = '1';
      const startCard = new CardRule('telecom.period.start');
      startCard.min = 1;
      startCard.max = '1';
      const fixedValRule = new FixedValueRule('telecom.period.start');
      fixedValRule.fixedValue = '2000-07-04';

      patient.rules.push(periodCard, startCard, fixedValRule);
      const instanceFixedValRule = new FixedValueRule('telecom[0].system');
      instanceFixedValRule.fixedValue = new FshCode('email');
      patientInstance.rules.push(instanceFixedValRule); // * telecom[0].system = #email
      const exported = exportInstance(patientInstance);
      expect(exported.telecom[0]).toEqual({
        system: 'email',
        period: {
          start: '2000-07-04'
        }
      });
    });

    it('should fix a deeply nested element that is fixed on the Structure Definition and has array parents with min > 1', () => {
      // * identifier 2..*
      // * identifier.type.coding 2..*
      // * identifier.type.coding.display 1..1
      // * identifier.type.coding.display = "This is my coding"
      const idCard = new CardRule('identifier');
      idCard.min = 2;
      idCard.max = '*';
      const typeCard = new CardRule('identifier.type.coding');
      typeCard.min = 2;
      typeCard.max = '*';
      const displayCard = new CardRule('identifier.type.coding.display');
      displayCard.min = 1;
      displayCard.max = '1';
      const fixedValRule = new FixedValueRule('identifier.type.coding.display');
      fixedValRule.fixedValue = 'This is my coding';

      patient.rules.push(idCard, typeCard, displayCard, fixedValRule);
      const instanceFixedValRule = new FixedValueRule('identifier.type.coding[2].version');
      instanceFixedValRule.fixedValue = '1.2.3';
      patientInstance.rules.push(instanceFixedValRule); // * identifier.type.coding[2].version = "1.2.3"
      const exported = exportInstance(patientInstance);
      expect(exported.identifier).toEqual([
        {
          type: {
            coding: [
              {
                display: 'This is my coding'
              },
              {
                display: 'This is my coding'
              },
              {
                display: 'This is my coding',
                version: '1.2.3'
              }
            ]
          }
        }
      ]);
    });

    it('should fix a deeply nested element that is fixed on the Structure Definition and has slice array parents with min > 1', () => {
      // * category contains niceSlice
      // * category[niceSlice] 1..1
      // * category[niceSlice] = http://spice.com#rice
      const containsRule = new ContainsRule('category');
      containsRule.items = [{ name: 'niceSlice' }];
      respRate.rules.push(containsRule);
      const cardRule = new CardRule('category[niceSlice]');
      cardRule.min = 1;
      cardRule.max = '1';
      respRate.rules.push(cardRule);
      const fixedValRule = new FixedValueRule('category[niceSlice]');
      const fixedFshCode = new FshCode('rice', 'http://spice.com');
      fixedValRule.fixedValue = fixedFshCode;
      respRate.rules.push(containsRule, cardRule, fixedValRule);
      const exported = exportInstance(respRateInstance);
      expect(exported.category).toEqual([
        {
          coding: [
            {
              code: 'rice',
              system: 'http://spice.com'
            }
          ]
        },
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs'
            }
          ]
        }
      ]);
    });

    it('should not fix a deeply nested element that is fixed on the Structure Definition but does not have 1..1 parents', () => {
      // * telecom.period 0..1 // Element is optional
      // * telecom.period.start 1..1
      // * telecom.period.start = "2000-07-04"
      const periodCard = new CardRule('telecom.period');
      periodCard.min = 0;
      periodCard.max = '1';
      const startCard = new CardRule('telecom.period.start');
      startCard.min = 1;
      startCard.max = '1';
      const fixedValRule = new FixedValueRule('telecom.period.start');
      fixedValRule.fixedValue = '2000-07-04';

      patient.rules.push(periodCard, startCard, fixedValRule);
      const instanceFixedValRule = new FixedValueRule('telecom[0].system');
      instanceFixedValRule.fixedValue = new FshCode('email');
      patientInstance.rules.push(instanceFixedValRule); // * telecom[0].system = #email
      const exported = exportInstance(patientInstance);
      expect(exported.telecom[0]).toEqual({
        system: 'email'
        // period not included since it is 0..1
      });
    });

    // Fixing with pattern[x]
    it('should fix a nested element that is fixed by pattern[x] from a parent on the SD', () => {
      const fixedValRule = new FixedValueRule('maritalStatus.coding');
      fixedValRule.fixedValue = new FshCode('foo', 'http://foo.com');
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus.coding[0].version');
      instanceFixedValRule.fixedValue = '1.2.3';
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [
          {
            code: 'foo',
            system: 'http://foo.com',
            version: '1.2.3'
          }
        ]
      });
    });

    it('should fix multiple nested elements that are fixed by pattern[x] from a parent on the SD', () => {
      const fixedValRule = new FixedValueRule('maritalStatus.coding');
      fixedValRule.fixedValue = new FshCode('foo', 'http://foo.com');
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus.coding[0].version');
      instanceFixedValRule.fixedValue = '1.2.3';
      patientInstance.rules.push(instanceFixedValRule);
      const instanceFixedValRule2 = new FixedValueRule('maritalStatus.coding[1].version');
      instanceFixedValRule2.fixedValue = '3.2.1';
      patientInstance.rules.push(instanceFixedValRule2);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [
          {
            code: 'foo',
            system: 'http://foo.com',
            version: '1.2.3'
          },
          {
            code: 'foo',
            system: 'http://foo.com',
            version: '3.2.1'
          }
        ]
      });
    });

    it('should fix a nested element that is fixed by array pattern[x] from a parent on the SD', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      fixedValRule.fixedValue = new FshCode('foo', 'http://foo.com');
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus.coding[0].version');
      instanceFixedValRule.fixedValue = '1.2.3';
      patientInstance.rules.push(instanceFixedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [
          {
            code: 'foo',
            system: 'http://foo.com',
            version: '1.2.3'
          }
        ]
      });
    });

    it('should fix multiple nested elements that are fixed by array pattern[x] from a parent on the SD', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      fixedValRule.fixedValue = new FshCode('foo', 'http://foo.com');
      patient.rules.push(fixedValRule);
      const instanceFixedValRule1 = new FixedValueRule('maritalStatus.coding[0].version');
      instanceFixedValRule1.fixedValue = '1.2.3';
      patientInstance.rules.push(instanceFixedValRule1);
      const instanceFixedValRule2 = new FixedValueRule('maritalStatus.coding[1].version');
      instanceFixedValRule2.fixedValue = '3.2.1';
      patientInstance.rules.push(instanceFixedValRule2);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [
          {
            code: 'foo',
            system: 'http://foo.com',
            version: '1.2.3'
          },
          {
            version: '3.2.1'
          }
        ]
      });
    });

    it('should fix cardinality 1..n elements that are fixed by array pattern[x] from a parent on the SD', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      fixedValRule.fixedValue = new FshCode('foo', 'http://foo.com');
      patient.rules.push(fixedValRule);
      const cardRule = new CardRule('maritalStatus');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [
          {
            code: 'foo',
            system: 'http://foo.com'
          }
        ]
      });
    });

    // TODO: The fixValue functions should be updated to not fix a value when a parent element sets
    // the value to something different using a pattern
    it.skip('should not fix an element to a value different than a parent pattern value on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus.coding[0].system');
      instanceFixedValRule.fixedValue = 'http://bar.com';
      patientInstance.rules.push(instanceFixedValRule);
      expect(() => exportInstance(patientInstance)).toThrow();
    });

    // Fixing children of primitives
    it('should fix children of primitive values on an instance', () => {
      const fixedValRule = new FixedValueRule('active.id');
      fixedValRule.fixedValue = 'foo';
      patientInstance.rules.push(fixedValRule);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported._active.id).toBe('foo');
    });

    it('should fix primitive values and their children on an instance', () => {
      const fixedValRule1 = new FixedValueRule('active');
      fixedValRule1.fixedValue = true;
      patientInstance.rules.push(fixedValRule1);
      const fixedValRule2 = new FixedValueRule('active.id');
      fixedValRule2.fixedValue = 'foo';
      patientInstance.rules.push(fixedValRule2);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toBe(true);
      expect(exported._active.id).toBe('foo');
    });

    it('should fix children of primitive value arrays on an instance', () => {
      const fixedValRule = new FixedValueRule('address[0].line[1].extension[0].url');
      fixedValRule.fixedValue = 'foo';
      patientInstance.rules.push(fixedValRule);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.address.length).toBe(1);
      expect(exported.address[0]._line.length).toBe(2);
      expect(exported.address[0]._line[0]).toBeNull();
      expect(exported.address[0]._line[1].extension.length).toBe(1);
      expect(exported.address[0]._line[1].extension[0].url).toBe('foo');
    });

    it('should fix children of primitive value arrays on an instance with out of order rules', () => {
      const fixedValRule1 = new FixedValueRule('address[0].line[1].extension[0].url');
      fixedValRule1.fixedValue = 'bar';
      patientInstance.rules.push(fixedValRule1);
      const fixedValRule2 = new FixedValueRule('address[0].line[0].extension[0].url');
      fixedValRule2.fixedValue = 'foo';
      patientInstance.rules.push(fixedValRule2);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.address.length).toBe(1);
      expect(exported.address[0]._line.length).toBe(2);
      expect(exported.address[0]._line[0].extension.length).toBe(1);
      expect(exported.address[0]._line[0].extension[0].url).toBe('foo');
      expect(exported.address[0]._line[1].extension.length).toBe(1);
      expect(exported.address[0]._line[1].extension[0].url).toBe('bar');
    });

    it('should fix children of sliced primitive arrays on an instance', () => {
      const caretRule = new CaretValueRule('name.prefix');
      caretRule.caretPath = 'slicing.discriminator.type';
      caretRule.value = new FshCode('value');
      const containsRule = new ContainsRule('name.prefix');
      containsRule.items = [{ name: 'Dr' }];
      const cardRule = new CardRule('name.prefix');
      cardRule.min = 0;
      cardRule.max = '*';
      // * name.prefix ^slicing.discriminator.type = #value
      // * name.prefix contains Dr 0..*
      patient.rules.push(caretRule, containsRule, cardRule);
      const fixedRule1 = new FixedValueRule('name[0].prefix[Dr][0]');
      fixedRule1.fixedValue = 'Doctor';
      const fixedRule2 = new FixedValueRule('name[0].prefix[Dr][1]');
      fixedRule2.fixedValue = 'Mister Doctor';
      const fixedRuleChild = new FixedValueRule('name[0].prefix[Dr][1].id');
      fixedRuleChild.fixedValue = 'Sir Mister Doctor to you';
      // * name[0].prefix[Dr][0] = "Doctor"
      // * name[0].prefix[Dr][1] = "Mister Doctor"
      // * name[0].prefix[Dr][1].id = "Sir Mister Doctor to you";
      patientInstance.rules.push(fixedRule1, fixedRule2, fixedRuleChild);
      const exported = exportInstance(patientInstance);
      expect(exported.name).toEqual([
        {
          prefix: ['Doctor', 'Mister Doctor'],
          _prefix: [null, { id: 'Sir Mister Doctor to you' }]
        }
      ]);
    });

    // Fixing References
    it('should fix a reference while resolving the Instance being referred to', () => {
      const orgInstance = new Instance('TestOrganization');
      orgInstance.instanceOf = 'Organization';
      const fixedIdRule = new FixedValueRule('id');
      fixedIdRule.fixedValue = 'org-id';
      orgInstance.rules.push(fixedIdRule);
      const fixedRefRule = new FixedValueRule('managingOrganization');
      fixedRefRule.fixedValue = new FshReference('TestOrganization');
      patientInstance.rules.push(fixedRefRule);
      doc.instances.set(patientInstance.name, patientInstance);
      doc.instances.set(orgInstance.name, orgInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.managingOrganization).toEqual({
        reference: 'Organization/org-id'
      });
    });

    it('should fix a reference without replacing if the referred Instance does not exist', () => {
      const fixedRefRule = new FixedValueRule('managingOrganization');
      fixedRefRule.fixedValue = new FshReference('http://example.com');
      patientInstance.rules.push(fixedRefRule);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.managingOrganization).toEqual({
        reference: 'http://example.com'
      });
    });

    // Fixing codes from local systems
    it('should fix a code to a top level element while replacing the local code system name with its url', () => {
      const brightInstance = new Instance('BrightObservation');
      brightInstance.instanceOf = 'Observation';
      const fixedCodeRule = new FixedValueRule('code');
      fixedCodeRule.fixedValue = new FshCode('bright', 'Visible');
      brightInstance.rules.push(fixedCodeRule);
      doc.instances.set(brightInstance.name, brightInstance);

      const visibleSystem = new FshCodeSystem('Visible');
      doc.codeSystems.set(visibleSystem.name, visibleSystem);
      const exported = exportInstance(brightInstance);
      expect(exported.code.coding).toEqual([
        {
          code: 'bright',
          system: 'http://example.com/CodeSystem/Visible'
        }
      ]);
    });

    it('should fix a code to a nested element while replacing the local code system name with its url', () => {
      const brightInstance = new Instance('BrightObservation');
      brightInstance.instanceOf = 'Observation';
      const fixedCodeRule = new FixedValueRule('component[0].code');
      fixedCodeRule.fixedValue = new FshCode('bright', 'Visible');
      brightInstance.rules.push(fixedCodeRule);
      doc.instances.set(brightInstance.name, brightInstance);

      const visibleSystem = new FshCodeSystem('Visible');
      doc.codeSystems.set(visibleSystem.name, visibleSystem);
      const exported = exportInstance(brightInstance);
      expect(exported.component[0].code.coding).toEqual([
        {
          code: 'bright',
          system: 'http://example.com/CodeSystem/Visible'
        }
      ]);
    });

    // Sliced elements
    it('should fix a single sliced element to a value', () => {
      const fixedValRule = new FixedValueRule('extension[level].valueCoding.system');
      fixedValRule.fixedValue = 'foo';
      patientProfInstance.rules.push(fixedValRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([{ url: 'level', valueCoding: { system: 'foo' } }]);
    });

    it('should fix a single primitive sliced element to a value', () => {
      const caretRule = new CaretValueRule('name.prefix');
      caretRule.caretPath = 'slicing.discriminator.type';
      caretRule.value = new FshCode('value');
      const containsRule = new ContainsRule('name.prefix');
      containsRule.items = [{ name: 'Dr' }];
      const cardRule = new CardRule('name.prefix');
      cardRule.min = 1;
      cardRule.max = '1';
      // * name.prefix ^slicing.discriminator.type = #value
      // * name.prefix contains Dr 1..1
      patient.rules.push(caretRule, containsRule, cardRule);
      const fixedRule = new FixedValueRule('name[0].prefix[Dr]');
      fixedRule.fixedValue = 'Doctor';
      // * name[0].prefix[Dr] = "Doctor"
      patientInstance.rules.push(fixedRule);
      const exported = exportInstance(patientInstance);
      expect(exported.name).toEqual([
        {
          prefix: ['Doctor']
        }
      ]);
    });

    it('should fix sliced elements in an array that are fixed in order', () => {
      const fooRule = new FixedValueRule('extension[type][0].valueCoding.system');
      fooRule.fixedValue = 'foo';
      patientProfInstance.rules.push(fooRule);
      const barRule = new FixedValueRule('extension[type][1].valueCoding.system');
      barRule.fixedValue = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type', valueCoding: { system: 'foo' } },
        { url: 'type', valueCoding: { system: 'bar' } }
      ]);
    });

    it('should fix a sliced primitive array', () => {
      const caretRule = new CaretValueRule('name.prefix');
      caretRule.caretPath = 'slicing.discriminator.type';
      caretRule.value = new FshCode('value');
      const containsRule = new ContainsRule('name.prefix');
      containsRule.items = [{ name: 'Dr' }];
      const cardRule = new CardRule('name.prefix');
      cardRule.min = 0;
      cardRule.max = '*';
      // * name.prefix ^slicing.discriminator.type = #value
      // * name.prefix contains Dr 0..*
      patient.rules.push(caretRule, containsRule, cardRule);
      const fixedRule1 = new FixedValueRule('name[0].prefix[Dr][0]');
      fixedRule1.fixedValue = 'Doctor';
      const fixedRule2 = new FixedValueRule('name[0].prefix[Dr][1]');
      fixedRule2.fixedValue = 'Mister Doctor';
      // * name[0].prefix[Dr][0] = "Doctor"
      // * name[0].prefix[Dr][1] = "Mister Doctor"
      patientInstance.rules.push(fixedRule1, fixedRule2);
      const exported = exportInstance(patientInstance);
      expect(exported.name).toEqual([
        {
          prefix: ['Doctor', 'Mister Doctor']
        }
      ]);
    });

    it('should fix a sliced element in an array that is fixed by multiple rules', () => {
      const fooRule = new FixedValueRule('extension[type][1].valueCoding.system');
      fooRule.fixedValue = 'foo';
      patientProfInstance.rules.push(fooRule);
      const barRule = new FixedValueRule('extension[type][1].valueCoding.version');
      barRule.fixedValue = '1.2.3';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type' },
        { url: 'type', valueCoding: { system: 'foo', version: '1.2.3' } }
      ]);
    });

    it('should fix sliced elements in an array that are fixed out of order', () => {
      const fooRule = new FixedValueRule('extension[type][1].valueCoding.system');
      fooRule.fixedValue = 'foo';
      patientProfInstance.rules.push(fooRule);
      const barRule = new FixedValueRule('extension[type][0].valueCoding.system');
      barRule.fixedValue = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type', valueCoding: { system: 'bar' } },
        { url: 'type', valueCoding: { system: 'foo' } }
      ]);
    });

    it('should fix sliced elements in an array and fill empty values', () => {
      const fooRule = new FixedValueRule('extension[type][1].valueCoding.system');
      fooRule.fixedValue = 'foo';
      patientProfInstance.rules.push(fooRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type' },
        { url: 'type', valueCoding: { system: 'foo' } }
      ]);
    });

    it('should fix mixed sliced elements in an array', () => {
      const fooRule = new FixedValueRule('extension[type][0].valueCoding.system');
      fooRule.fixedValue = 'foo';
      patientProfInstance.rules.push(fooRule);
      const bazRule = new FixedValueRule('extension[level].valueCoding.system');
      bazRule.fixedValue = 'baz';
      patientProfInstance.rules.push(bazRule);
      const barRule = new FixedValueRule('extension[type][1].valueCoding.system');
      barRule.fixedValue = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type', valueCoding: { system: 'foo' } },
        { url: 'level', valueCoding: { system: 'baz' } },
        { url: 'type', valueCoding: { system: 'bar' } }
      ]);
    });

    it('should fix mixed sliced elements in an array out of order', () => {
      const fooRule = new FixedValueRule('extension[type][1].valueCoding.system');
      fooRule.fixedValue = 'foo';
      patientProfInstance.rules.push(fooRule);
      const bazRule = new FixedValueRule('extension[level].valueCoding.system');
      bazRule.fixedValue = 'baz';
      patientProfInstance.rules.push(bazRule);
      const barRule = new FixedValueRule('extension[type][0].valueCoding.system');
      barRule.fixedValue = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type', valueCoding: { system: 'bar' } },
        { url: 'type', valueCoding: { system: 'foo' } },
        { url: 'level', valueCoding: { system: 'baz' } }
      ]);
    });

    it('should fix a sliced extension element that is referred to by name', () => {
      const fooExtension = new Extension('FooExtension');
      doc.extensions.set(fooExtension.name, fooExtension);
      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'foo', type: 'FooExtension' }];
      patientProf.rules.push(containsRule);
      const barRule = new FixedValueRule('extension[foo].valueString');
      barRule.fixedValue = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'http://example.com/StructureDefinition/FooExtension', valueString: 'bar' }
      ]);
    });

    it('should fix a sliced extension element that is referred to by url', () => {
      const fooExtension = new Extension('FooExtension');
      doc.extensions.set(fooExtension.name, fooExtension);
      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'foo', type: 'FooExtension' }];
      patientProf.rules.push(containsRule);
      const barRule = new FixedValueRule(
        'extension[http://example.com/StructureDefinition/FooExtension].valueString'
      );
      barRule.fixedValue = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'http://example.com/StructureDefinition/FooExtension', valueString: 'bar' }
      ]);
    });

    it('should fix a sliced extension element that is referred to by aliased url', () => {
      const fooExtension = new Extension('FooExtension');
      doc.aliases.set('FooAlias', 'http://example.com/StructureDefinition/FooExtension');
      doc.extensions.set(fooExtension.name, fooExtension);
      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'foo', type: 'FooExtension' }];
      patientProf.rules.push(containsRule);
      const barRule = new FixedValueRule('extension[FooAlias].valueString');
      barRule.fixedValue = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'http://example.com/StructureDefinition/FooExtension', valueString: 'bar' }
      ]);
    });

    it('should fix an extension that is defined but not present on the SD', () => {
      const fooExtension = new Extension('FooExtension');
      doc.aliases.set('FooAlias', 'http://example.com/StructureDefinition/FooExtension');
      doc.extensions.set(fooExtension.name, fooExtension);
      const barRule = new FixedValueRule('extension[FooAlias].valueString');
      barRule.fixedValue = 'bar';
      patientInstance.rules.push(barRule);
      const exported = exportInstance(patientInstance);
      expect(exported.extension).toEqual([
        { url: 'http://example.com/StructureDefinition/FooExtension', valueString: 'bar' }
      ]);
    });

    it('should not fix an extension that is not defined and not present on the SD', () => {
      const barRule = new FixedValueRule('extension[FooAlias].valueString');
      barRule.fixedValue = 'bar';
      patientInstance.rules.push(barRule);
      const exported = exportInstance(patientInstance);
      expect(exported.extension).toBeUndefined();
    });

    it.skip('should throw when ordered is set in the discriminator but slices arrive out of order', () => {
      const fixedValRule = new FixedValueRule('result[Triglyceride].display');
      fixedValRule.fixedValue = 'foo';
      lipidInstance.rules.push(fixedValRule);
      // Feel free to change this error message when actually implementing
      expect(() => exportInstance(lipidInstance)).toThrow(
        'Slice Triglyceride of result fixed out of order'
      );
    });

    it.skip('should throw if incorrect elements are added when the slicing is closed', () => {
      const fixedValRule = new FixedValueRule('result[0].display');
      fixedValRule.fixedValue = 'foo';
      lipidInstance.rules.push(fixedValRule);
      expect(() => exportInstance(lipidInstance)).toThrow(
        'Slicing on result is closed, only named slices may be added'
      );
    });

    it.skip('should fix sliced elements on a sliced primitive', () => {
      /* Need example of sliced primitive */
    });

    // Content Reference
    it('should fix a child of a contentReference element', () => {
      const barRule = new FixedValueRule('compose.exclude.version');
      barRule.fixedValue = 'bar';
      valueSetInstance.rules.push(barRule);
      const exported = exportInstance(valueSetInstance);
      expect(exported.compose).toEqual({
        exclude: [
          {
            version: 'bar'
          }
        ]
      });
    });

    // Units keyword
    it('should log an error when fixing to a non-Quantity with the units keyword', () => {
      const barRule = new FixedValueRule('gender')
        .withFile('PatientInstance.fsh')
        .withLocation([1, 2, 3, 4]);
      barRule.fixedValue = new FshCode('mycode', 'http:/mysystem.com');
      barRule.units = true;
      patientInstance.rules.push(barRule);
      const exported = exportInstance(patientInstance);
      expect(exported.gender).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /units.*Patient.gender.*File: PatientInstance.fsh.*Line: 1 - 3\D*/s
      );
    });

    // Validating required elements
    it('should log an error when a required element is not present', () => {
      const cardRule = new CardRule('active');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Patient.active.*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should log multiple errors when multiple required elements are not present', () => {
      const cardRule1 = new CardRule('active');
      cardRule1.min = 1;
      cardRule1.max = '1';
      patient.rules.push(cardRule1);
      const cardRule2 = new CardRule('gender');
      cardRule2.min = 1;
      cardRule2.max = '1';
      patient.rules.push(cardRule2);
      exportInstance(patientInstance);
      const messages = loggerSpy.getAllMessages('error');
      expect(messages[messages.length - 2]).toMatch(
        /Patient.active.*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
      expect(messages[messages.length - 1]).toMatch(
        /Patient.gender.*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should log an error when an element required by an incomplete fixed parent is not present', () => {
      const cardRule = new CardRule('maritalStatus.text');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      const fixedValueRule = new FixedValueRule('maritalStatus');
      fixedValueRule.fixedValue = new FshCode('foo');
      patientInstance.rules.push(fixedValueRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Patient.maritalStatus.text.*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should log an error for a parent only when a required parent is not present', () => {
      const cardRule1 = new CardRule('maritalStatus.text');
      cardRule1.min = 1;
      cardRule1.max = '1';
      patient.rules.push(cardRule1);
      const cardRule2 = new CardRule('maritalStatus');
      cardRule2.min = 1;
      cardRule2.max = '1';
      patient.rules.push(cardRule2);
      exportInstance(patientInstance);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Patient.maritalStatus.*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should log an error when an array does not have all required elements', () => {
      const cardRule = new CardRule('contact');
      cardRule.min = 2;
      cardRule.max = '*';
      patient.rules.push(cardRule);
      const fixedValueRule = new FixedValueRule('contact[0].gender');
      fixedValueRule.fixedValue = new FshCode('F');
      patientInstance.rules.push(fixedValueRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Patient.contact.*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should log an error multiple times for an element missing required elements in an array', () => {
      const cardRule = new CardRule('contact.gender');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      const fixedValueRule1 = new FixedValueRule('contact[0].relationship');
      fixedValueRule1.fixedValue = new FshCode('Looking for love');
      patientInstance.rules.push(fixedValueRule1);
      const fixedValueRule2 = new FixedValueRule('contact[1].relationship');
      fixedValueRule2.fixedValue = new FshCode('Complicated');
      patientInstance.rules.push(fixedValueRule2);
      exportInstance(patientInstance);
      const messages = loggerSpy.getAllMessages('error');
      expect(messages[messages.length - 2]).toMatch(
        /Patient.contact.gender.*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
      expect(messages[messages.length - 1]).toMatch(
        /Patient.contact.gender.*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should log an error when an [x] element is not present', () => {
      const cardRule = new CardRule('deceased[x]');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      exportInstance(patientInstance);
      const messages = loggerSpy.getAllMessages('error');
      expect(messages[messages.length - 1]).toMatch(
        /Patient.deceased\[x\].*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should not log an error when an [x] element is present', () => {
      const originalLength = loggerSpy.getAllMessages('error').length;
      const cardRule = new CardRule('deceased[x]');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      const fixedValueRule = new FixedValueRule('deceasedBoolean');
      fixedValueRule.fixedValue = true;
      patientInstance.rules.push(fixedValueRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getAllMessages('error').length).toBe(originalLength);
    });

    it('should log an error when a required sliced element is not present', () => {
      const fixedValueRule = new FixedValueRule('result[Cholesterol]');
      fixedValueRule.fixedValue = new FshReference('Fsh are friends');
      lipidInstance.rules.push(fixedValueRule);
      exportInstance(lipidInstance);
      const messages = loggerSpy.getAllMessages('error');
      expect(messages[messages.length - 4]).toMatch(
        /DiagnosticReport.status.*File: LipidInstance\.fsh.*Line: 10 - 20/s
      );
      expect(messages[messages.length - 3]).toMatch(
        /DiagnosticReport.result.*File: LipidInstance\.fsh.*Line: 10 - 20/s
      );
      expect(messages[messages.length - 2]).toMatch(
        /DiagnosticReport.result:Triglyceride.*File: LipidInstance\.fsh.*Line: 10 - 20/s
      );
      expect(messages[messages.length - 1]).toMatch(
        /DiagnosticReport.result:HDLCholesterol.*File: LipidInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should log an error when a required element inherited from a resource is not present', () => {
      const observationInstance = new Instance('Pow')
        .withFile('ObservationInstance.fsh')
        .withLocation([10, 1, 20, 30]);
      observationInstance.instanceOf = 'Observation';
      doc.instances.set(observationInstance.name, observationInstance);
      exportInstance(observationInstance);
      const messages = loggerSpy.getAllMessages('error');
      expect(messages[messages.length - 1]).toMatch(
        /Observation.code.*File: ObservationInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should log an error when a required element inherited on a profile is not present', () => {
      const observationProfile = new Profile('TestObservation');
      observationProfile.parent = 'Observation';
      doc.profiles.set(observationProfile.name, observationProfile);
      const observationInstance = new Instance('Pow')
        .withFile('ObservationInstance.fsh')
        .withLocation([10, 1, 20, 30]);
      observationInstance.instanceOf = 'TestObservation';
      doc.instances.set(observationInstance.name, observationInstance);
      exportInstance(observationInstance);
      const messages = loggerSpy.getAllMessages('error');
      expect(messages[messages.length - 1]).toMatch(
        /Observation.code.*File: ObservationInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should fix an inline resource to an instance', () => {
      const inlineInstance = new Instance('MyInlinePatient');
      inlineInstance.instanceOf = 'Patient';
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      inlineInstance.rules.push(fixedValRule); // * active = true
      doc.instances.set(inlineInstance.name, inlineInstance);

      const inlineRule = new FixedValueRule('contained[0]');
      inlineRule.fixedValue = 'MyInlinePatient';
      inlineRule.isResource = true;
      patientInstance.rules.push(inlineRule); // * contained[0] = MyInlinePatient

      const exported = exportInstance(patientInstance);
      expect(exported.contained).toEqual([
        { resourceType: 'Patient', id: 'MyInlinePatient', active: true }
      ]);
    });

    it('should only export an instance once', () => {
      const bundleInstance = new Instance('MyBundle');
      bundleInstance.instanceOf = 'Bundle';
      const inlineRule = new FixedValueRule('entry[0].resource');
      inlineRule.fixedValue = 'MyBundledPatient';
      inlineRule.isResource = true;
      bundleInstance.rules.push(inlineRule); // * entry[0].resource = MyBundledPatient
      doc.instances.set(bundleInstance.name, bundleInstance);

      const inlineInstance = new Instance('MyBundledPatient');
      inlineInstance.instanceOf = 'Patient';
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      inlineInstance.rules.push(fixedValRule); // * active = true
      doc.instances.set(inlineInstance.name, inlineInstance);

      const exported = exporter.export().instances;
      const exportedBundle = exported.filter(i => i._instanceMeta.name === 'MyBundle');
      const exportedBundledPatient = exported.filter(
        i => i._instanceMeta.name === 'MyBundledPatient'
      );
      expect(exportedBundle).toHaveLength(1);
      expect(exportedBundledPatient).toHaveLength(1);
    });

    it('should log an error when fixing an inline resource that does not exist to an instance', () => {
      const inlineRule = new FixedValueRule('contained[0]')
        .withFile('FakeInstance.fsh')
        .withLocation([1, 2, 3, 4]);
      inlineRule.fixedValue = 'MyFakePatient';
      inlineRule.isResource = true;
      patientInstance.rules.push(inlineRule); // * contained[0] = MyFakePatient

      const exported = exportInstance(patientInstance);
      expect(exported.contained).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot find definition for Instance: MyFakePatient. Skipping rule.*File: FakeInstance.fsh.*Line: 1 - 3\D*/s
      );
    });
  });

  describe('#export', () => {
    it('should still apply valid rules if one fails', () => {
      const instance = new Instance('UnmeasurableAttribute');
      instance.instanceOf = 'Patient';
      const impossibleRule = new FixedValueRule('impossible');
      impossibleRule.fixedValue = 'unmeasurable';
      instance.rules.push(impossibleRule);
      const possibleRule = new FixedValueRule('identifier.value');
      possibleRule.fixedValue = 'Pascal';
      instance.rules.push(possibleRule);
      doc.instances.set(instance.name, instance);

      const exported = exporter.export().instances;
      expect(exported.length).toBe(1);
      expect(exported[0].identifier[0].value).toBe('Pascal');
    });

    it('should log a message when the path for a fixed value is not found', () => {
      const instance = new Instance('UnmeasurableAttribute');
      instance.instanceOf = 'Patient';
      const impossibleRule = new FixedValueRule('impossible')
        .withFile('Unmeasurable.fsh')
        .withLocation([3, 8, 3, 28]);
      impossibleRule.fixedValue = 'unmeasurable';
      instance.rules.push(impossibleRule);
      doc.instances.set(instance.name, instance);

      const exported = exporter.export().instances;
      expect(exported.length).toBe(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Unmeasurable\.fsh.*Line: 3\D*/s);
    });
  });

  describe('#Mixins', () => {
    let instance: Instance;
    let mixin: RuleSet;

    beforeEach(() => {
      instance = new Instance('Foo').withFile('Instance.fsh').withLocation([5, 6, 7, 16]);
      instance.instanceOf = 'Patient';
      doc.instances.set(instance.name, instance);

      mixin = new RuleSet('Bar');
      doc.ruleSets.set(mixin.name, mixin);
      instance.mixins.push('Bar');
    });

    it('should apply rules from a single mixin', () => {
      const rule = new FixedValueRule('active');
      rule.fixedValue = true;
      mixin.rules.push(rule);

      const exported = exporter.exportInstance(instance);
      expect(exported.active).toBe(true);
    });

    it('should apply rules from multiple mixins in the correct order', () => {
      const rule1 = new FixedValueRule('active');
      rule1.fixedValue = true;
      mixin.rules.push(rule1);

      const mixin2 = new RuleSet('Baz');
      doc.ruleSets.set(mixin2.name, mixin2);
      const rule2 = new FixedValueRule('active');
      rule2.fixedValue = false;
      mixin2.rules.push(rule2);
      instance.mixins.push('Baz');

      const exported = exporter.exportInstance(instance);
      expect(exported.active).toBe(false);
    });

    it('should emit an error when the path is not found on a mixin rule', () => {
      const rule = new FixedValueRule('activez').withFile('Mixin.fsh').withLocation([1, 2, 3, 12]);
      rule.fixedValue = true;
      mixin.rules.push(rule);

      exporter.exportInstance(instance);
      expect(loggerSpy.getLastMessage('error')).toMatch(/activez/);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Mixin\.fsh.*Line: 1 - 3\D*/s);
      expect(loggerSpy.getLastMessage()).toMatch(
        /Applied in File: Instance\.fsh.*Applied on Line: 5 - 7\D*/s
      );
    });

    it('should emit an error when applying an invalid mixin rule', () => {
      const rule = new FixedValueRule('active').withFile('Mixin.fsh').withLocation([1, 2, 3, 12]);
      rule.fixedValue = 'some string';
      mixin.rules.push(rule);

      exporter.exportInstance(instance);
      expect(loggerSpy.getLastMessage('error')).toMatch(/some string/);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Mixin\.fsh.*Line: 1 - 3\D*/s);
      expect(loggerSpy.getLastMessage()).toMatch(
        /Applied in File: Instance\.fsh.*Applied on Line: 5 - 7\D*/s
      );
    });

    it('should emit an error when a mixin cannot be found', () => {
      instance.mixins.push('Barz');

      exporter.exportInstance(instance);

      expect(loggerSpy.getLastMessage('error')).toMatch(/Barz/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Instance\.fsh.*Line: 5 - 7\D*/s);
    });

    it('should emit an error when a mixin applies a non-fixed value rule', () => {
      const rule = new CardRule('active').withFile('Mixin.fsh').withLocation([1, 2, 3, 12]);
      rule.min = 0;
      rule.max = '1';
      mixin.rules.push(rule);

      exporter.exportInstance(instance);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Rules applied by mixins to an instance must fix a value. Other rules are ignored/
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: Mixin\.fsh.*Line: 1 - 3\D*/s);
      expect(loggerSpy.getLastMessage()).toMatch(
        /Applied in File: Instance\.fsh.*Applied on Line: 5 - 7\D*/s
      );
    });
  });
});
