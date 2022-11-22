import { InstanceExporter, Package, StructureDefinitionExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import {
  Instance,
  Profile,
  FshCanonical,
  FshCode,
  FshReference,
  Extension,
  FshCodeSystem,
  RuleSet,
  FshQuantity,
  Resource
} from '../../src/fshtypes';
import {
  AssignmentRule,
  CardRule,
  CaretValueRule,
  ContainsRule,
  FlagRule,
  InsertRule,
  OnlyRule
} from '../../src/fshtypes/rules';
import { loggerSpy, TestFisher } from '../testhelpers';
import { InstanceDefinition } from '../../src/fhirtypes';
import path from 'path';
import { minimalConfig } from '../utils/minimalConfig';

describe('InstanceExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let tank: FSHTank;
  let sdExporter: StructureDefinitionExporter;
  let exporter: InstanceExporter;
  let exportInstance: (instance: Instance) => InstanceDefinition;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
  });

  beforeEach(() => {
    loggerSpy.reset();
    doc = new FSHDocument('fileName');
    tank = new FSHTank([doc], minimalConfig);
    const pkg = new Package(tank.config);
    const fisher = new TestFisher(tank, defs, pkg);
    sdExporter = new StructureDefinitionExporter(tank, pkg, fisher);
    exporter = new InstanceExporter(tank, pkg, fisher);
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

  it('should log a message with source information when the parent is a profile of a logical model', () => {
    const instance = new Instance('MyServiceInstance')
      .withFile('Incorrect.fsh')
      .withLocation([15, 1, 18, 27]);
    instance.instanceOf = 'ServiceProfile';
    doc.instances.set(instance.name, instance);
    const exported = exporter.export().instances;
    expect(exported.length).toBe(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Incorrect\.fsh.*Line: 15 - 18\D*/s);
  });

  it('should warn when title and/or description is an empty string', () => {
    const instance = new Instance('MyInstance');
    instance.instanceOf = 'Patient';
    instance.title = '';
    instance.description = '';
    doc.instances.set(instance.name, instance);
    const exported = exporter.export().instances;

    expect(exported.length).toBe(1);

    expect(loggerSpy.getAllMessages('warn').length).toBe(2);
    expect(loggerSpy.getFirstMessage('warn')).toMatch(
      'Instance MyInstance has a title field that should not be empty.'
    );
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      'Instance MyInstance has a description field that should not be empty.'
    );
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

  it('should assign values on an instance', () => {
    const instance = new Instance('Bar');
    instance.instanceOf = 'Patient';
    const assignedValRule = new AssignmentRule('gender');
    const assignedFshCode = new FshCode('foo', 'http://foo.com');
    assignedValRule.value = assignedFshCode;
    instance.rules.push(assignedValRule);
    doc.instances.set(instance.name, instance);
    const exported = exporter.export().instances;
    expect(exported.length).toBe(1);
    expect(exported[0].gender).toBe('foo');
  });

  describe('#exportInstance', () => {
    let questionnaire: Profile;
    let patient: Profile;
    let respRate: Profile;
    let patientProf: Profile;
    let bundle: Profile;
    let communicationProf: Profile;
    let patientInstance: Instance;
    let patientProfInstance: Instance;
    let lipidInstance: Instance;
    let valueSetInstance: Instance;
    let respRateInstance: Instance;
    let bundleInstance: Instance;
    let carePlanInstance: Instance;
    let communicationInstance: Instance;
    beforeEach(() => {
      questionnaire = new Profile('TestQuestionnaire');
      questionnaire.parent = 'Questionnaire';
      doc.profiles.set(questionnaire.name, questionnaire);
      patient = new Profile('TestPatient');
      patient.parent = 'Patient';
      doc.profiles.set(patient.name, patient);
      patientProf = new Profile('TestPatientProf');
      patientProf.parent = 'patient-proficiency';
      doc.profiles.set(patientProf.name, patientProf);
      respRate = new Profile('TestRespRate');
      respRate.parent = 'resprate';
      doc.profiles.set(respRate.name, respRate);
      bundle = new Profile('TestBundle');
      bundle.parent = 'Bundle';
      doc.profiles.set(bundle.name, bundle);
      communicationProf = new Profile('TestCommunication');
      communicationProf.parent = 'Communication';
      doc.profiles.set(communicationProf.name, communicationProf);
      patientInstance = new Instance('Bar')
        .withFile('PatientInstance.fsh')
        .withLocation([10, 1, 20, 30]);
      patientInstance.instanceOf = 'TestPatient';
      doc.instances.set(patientInstance.name, patientInstance);
      patientProfInstance = new Instance('Baz');
      patientProfInstance.instanceOf = 'TestPatientProf';
      doc.instances.set(patientProfInstance.name, patientProfInstance);
      carePlanInstance = new Instance('C');
      carePlanInstance.instanceOf = 'CarePlan';
      doc.instances.set(carePlanInstance.name, carePlanInstance);
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
      bundleInstance = new Instance('Pow');
      bundleInstance.instanceOf = 'TestBundle';
      doc.instances.set(bundleInstance.name, bundleInstance);
      communicationInstance = new Instance('CommunicationInstance');
      communicationInstance.instanceOf = 'TestCommunication';
      doc.instances.set(communicationInstance.name, communicationInstance);
    });

    // Setting Metadata
    it('should set meta.profile to the defining URL we are making an instance of', () => {
      const exported = exportInstance(patientInstance);
      expect(exported.meta).toEqual({
        profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/TestPatient']
      });
    });

    it('should not set meta.profile when we are making an instance of a base resource', () => {
      const boo = new Instance('Boo');
      boo.instanceOf = 'Patient';
      const exported = exportInstance(boo);
      expect(exported.meta).toBeUndefined();
    });

    it('should set meta.profile with the InstanceOf profile before checking for required elements', () => {
      /*
       * meta 1..1 MS
       * meta.profile 1..* MS
       */
      const metaMS = new FlagRule('meta');
      metaMS.mustSupport = true;
      const metaCard = new CardRule('meta');
      metaCard.min = 1;
      metaCard.max = '1';
      const metaProfileMS = new FlagRule('meta.profile');
      metaProfileMS.mustSupport = true;
      const metaProfileCard = new CardRule('meta.profile');
      metaProfileCard.min = 1;
      metaProfileCard.max = '*';
      patient.rules.push(metaMS, metaCard, metaProfileMS, metaProfileCard);

      const exported = exportInstance(patientInstance);
      expect(exported.meta.profile).toHaveLength(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should only set meta.profile with one profile when profile is set on the InstanceOf profile', () => {
      const patientAbstractProfile = new Profile('MyPatientAbstract');
      patientAbstractProfile.parent = 'Patient';
      /*
       * meta 1..1 MS
       * meta.profile 1..* MS
       * meta.profile ^slicing.discriminator.type = #pattern
       * meta.profile ^slicing.discriminator.path = "$this"
       * meta.profile contains supportedPatientProfile 1..1
       */
      const metaMS = new FlagRule('meta');
      metaMS.mustSupport = true;
      const metaCard = new CardRule('meta');
      metaCard.min = 1;
      metaCard.max = '1';
      const metaProfileMS = new FlagRule('meta.profile');
      metaProfileMS.mustSupport = true;
      const metaProfileCard = new CardRule('meta.profile');
      metaProfileCard.min = 1;
      metaProfileCard.max = '*';
      const typeCaretRule = new CaretValueRule('meta.profile');
      typeCaretRule.caretPath = 'slicing.discriminator.type';
      typeCaretRule.value = new FshCode('pattern');
      const pathCaretRule = new CaretValueRule('meta.profile');
      pathCaretRule.caretPath = 'slicing.discriminator.path';
      pathCaretRule.value = '$this';
      const containsRule = new ContainsRule('meta.profile');
      containsRule.items = [{ name: 'supportedPatientProfile' }];
      const cardRule = new CardRule('meta.profile[supportedPatientProfile]');
      cardRule.min = 1;
      cardRule.max = '1';
      patientAbstractProfile.rules.push(
        metaMS,
        metaCard,
        metaProfileMS,
        metaProfileCard,
        typeCaretRule,
        pathCaretRule,
        containsRule,
        cardRule
      );

      const patientProfile = new Profile('MyPatient');
      patientProfile.parent = 'MyPatientAbstract';
      // * meta.profile[supportedPatientProfile] = Canonical(MyPatient)
      const metaProfileAssignment = new AssignmentRule('meta.profile[supportedPatientProfile]');
      metaProfileAssignment.value = new FshCanonical('MyPatient');
      patientProfile.rules.push(metaProfileAssignment);
      doc.profiles.set(patientAbstractProfile.name, patientAbstractProfile);
      doc.profiles.set(patientProfile.name, patientProfile);

      const patientInstance = new Instance('MyPatientInstance');
      patientInstance.instanceOf = 'MyPatient';
      // * name[0].family = "LastName"
      const patientAssignmentRule = new AssignmentRule('name[0].family');
      patientAssignmentRule.value = 'LastName';
      patientInstance.rules.push(patientAssignmentRule);

      const exported = exportInstance(patientInstance);
      expect(exported.meta.profile).toHaveLength(1);
      expect(exported.meta.profile).toEqual([
        'http://hl7.org/fhir/us/minimal/StructureDefinition/MyPatient'
      ]);
    });

    it('should add the InstanceOf profile as the first meta.profile if it is not added by any rules', () => {
      /*
       * meta 1..1 MS
       * meta.profile 1..* MS
       * meta.profile ^slicing.discriminator.type = #pattern
       * meta.profile ^slicing.discriminator.path = "$this"
       */
      const metaMS = new FlagRule('meta');
      metaMS.mustSupport = true;
      const metaCard = new CardRule('meta');
      metaCard.min = 1;
      metaCard.max = '1';
      const metaProfileMS = new FlagRule('meta.profile');
      metaProfileMS.mustSupport = true;
      const metaProfileCard = new CardRule('meta.profile');
      metaProfileCard.min = 1;
      metaProfileCard.max = '*';
      const typeCaretRule = new CaretValueRule('meta.profile');
      typeCaretRule.caretPath = 'slicing.discriminator.type';
      typeCaretRule.value = new FshCode('pattern');
      const pathCaretRule = new CaretValueRule('meta.profile');
      pathCaretRule.caretPath = 'slicing.discriminator.path';
      pathCaretRule.value = '$this';
      patient.rules.push(
        metaMS,
        metaCard,
        metaProfileMS,
        metaProfileCard,
        typeCaretRule,
        pathCaretRule
      );

      // * name[0].family = "LastName"
      // * meta.profile[+] = "http://example.org/fhir/StructureDefinition/OtherPatient"
      const patientAssignmentRule = new AssignmentRule('name[0].family');
      patientAssignmentRule.value = 'LastName';
      const otherProfileRule = new AssignmentRule('meta.profile[+]');
      otherProfileRule.value = 'http://example.org/fhir/StructureDefinition/OtherPatient';
      patientInstance.rules.push(patientAssignmentRule, otherProfileRule);

      const exported = exportInstance(patientInstance);
      expect(exported.meta.profile).toHaveLength(2);
      expect(exported.meta.profile).toEqual([
        'http://hl7.org/fhir/us/minimal/StructureDefinition/TestPatient',
        'http://example.org/fhir/StructureDefinition/OtherPatient'
      ]);
    });

    it('should set meta.profile without the unversioned InstanceOf profile if a versioned InstanceOf profile is present', () => {
      /*
       * meta 1..1 MS
       * meta.profile 1..* MS
       * meta.profile ^slicing.discriminator.type = #pattern
       * meta.profile ^slicing.discriminator.path = "$this"
       * meta.profile contains supportedProfile 1..1
       * meta.profile[supportedProfile] = Canonical(TestPatient|0.1.0)
       */
      const metaMS = new FlagRule('meta');
      metaMS.mustSupport = true;
      const metaCard = new CardRule('meta');
      metaCard.min = 1;
      metaCard.max = '1';
      const metaProfileMS = new FlagRule('meta.profile');
      metaProfileMS.mustSupport = true;
      const metaProfileCard = new CardRule('meta.profile');
      metaProfileCard.min = 1;
      metaProfileCard.max = '*';
      const typeCaretRule = new CaretValueRule('meta.profile');
      typeCaretRule.caretPath = 'slicing.discriminator.type';
      typeCaretRule.value = new FshCode('pattern');
      const pathCaretRule = new CaretValueRule('meta.profile');
      pathCaretRule.caretPath = 'slicing.discriminator.path';
      pathCaretRule.value = '$this';
      const containsRule = new ContainsRule('meta.profile');
      containsRule.items = [{ name: 'supportedProfile' }];
      const cardRule = new CardRule('meta.profile[supportedProfile]');
      cardRule.min = 1;
      cardRule.max = '1';
      const supportedProfileCanonical = new AssignmentRule('meta.profile[supportedProfile]');
      supportedProfileCanonical.value = new FshCanonical('TestPatient');
      supportedProfileCanonical.value.version = '0.1.0';
      patient.rules.push(
        metaMS,
        metaCard,
        metaProfileMS,
        metaProfileCard,
        typeCaretRule,
        pathCaretRule,
        containsRule,
        cardRule,
        supportedProfileCanonical
      );

      // * name[0].family = "LastName"
      const patientAssignmentRule = new AssignmentRule('name[0].family');
      patientAssignmentRule.value = 'LastName';
      patientInstance.rules.push(patientAssignmentRule);

      const exported = exportInstance(patientInstance);
      expect(exported.meta.profile).toHaveLength(1);
      expect(exported.meta.profile).toEqual([
        'http://hl7.org/fhir/us/minimal/StructureDefinition/TestPatient|0.1.0'
      ]);
    });

    it('should keep the unversioned InstanceOf in meta.profile if it is also added by a rule on the profile', () => {
      /*
       * meta 1..1 MS
       * meta.profile 2..* MS
       * meta.profile ^slicing.discriminator.type = #pattern
       * meta.profile ^slicing.discriminator.path = "$this"
       * meta.profile contains supportedProfile 1..1 and unversionedProfile 1..1
       * meta.profile[supportedProfile] = Canonical(TestPatient|0.1.0)
       * meta.profile[unversionedProfile] = Canonical(TestPatient)
       */
      const metaMS = new FlagRule('meta');
      metaMS.mustSupport = true;
      const metaCard = new CardRule('meta');
      metaCard.min = 1;
      metaCard.max = '1';
      const metaProfileMS = new FlagRule('meta.profile');
      metaProfileMS.mustSupport = true;
      const metaProfileCard = new CardRule('meta.profile');
      metaProfileCard.min = 2;
      metaProfileCard.max = '*';
      const typeCaretRule = new CaretValueRule('meta.profile');
      typeCaretRule.caretPath = 'slicing.discriminator.type';
      typeCaretRule.value = new FshCode('pattern');
      const pathCaretRule = new CaretValueRule('meta.profile');
      pathCaretRule.caretPath = 'slicing.discriminator.path';
      pathCaretRule.value = '$this';
      const containsRule = new ContainsRule('meta.profile');
      containsRule.items = [{ name: 'supportedProfile' }, { name: 'unversionedProfile' }];
      const supportedCardRule = new CardRule('meta.profile[supportedProfile]');
      supportedCardRule.min = 1;
      supportedCardRule.max = '1';
      const supportedProfileCanonical = new AssignmentRule('meta.profile[supportedProfile]');
      supportedProfileCanonical.value = new FshCanonical('TestPatient');
      supportedProfileCanonical.value.version = '0.1.0';
      const unversionedCardRule = new CardRule('meta.profile[unversionedProfile]');
      unversionedCardRule.min = 1;
      unversionedCardRule.max = '1';
      const unversionedProfileCanonical = new AssignmentRule('meta.profile[unversionedProfile]');
      unversionedProfileCanonical.value = new FshCanonical('TestPatient');
      patient.rules.push(
        metaMS,
        metaCard,
        metaProfileMS,
        metaProfileCard,
        typeCaretRule,
        pathCaretRule,
        containsRule,
        supportedCardRule,
        supportedProfileCanonical,
        unversionedCardRule,
        unversionedProfileCanonical
      );

      // * name[0].family = "LastName"
      const patientAssignmentRule = new AssignmentRule('name[0].family');
      patientAssignmentRule.value = 'LastName';
      patientInstance.rules.push(patientAssignmentRule);

      const exported = exportInstance(patientInstance);
      expect(exported.meta.profile).toHaveLength(2);
      expect(exported.meta.profile).toEqual([
        'http://hl7.org/fhir/us/minimal/StructureDefinition/TestPatient|0.1.0',
        'http://hl7.org/fhir/us/minimal/StructureDefinition/TestPatient'
      ]);
    });

    it('should keep the unversioned InstanceOf in meta.profile if it is also added by a rule on the instance', () => {
      /*
       * meta 1..1 MS
       * meta.profile 1..* MS
       * meta.profile ^slicing.discriminator.type = #pattern
       * meta.profile ^slicing.discriminator.path = "$this"
       * meta.profile contains supportedProfile 1..1
       * meta.profile[supportedProfile] = Canonical(TestPatient|0.1.0)
       */
      const metaMS = new FlagRule('meta');
      metaMS.mustSupport = true;
      const metaCard = new CardRule('meta');
      metaCard.min = 1;
      metaCard.max = '1';
      const metaProfileMS = new FlagRule('meta.profile');
      metaProfileMS.mustSupport = true;
      const metaProfileCard = new CardRule('meta.profile');
      metaProfileCard.min = 1;
      metaProfileCard.max = '*';
      const typeCaretRule = new CaretValueRule('meta.profile');
      typeCaretRule.caretPath = 'slicing.discriminator.type';
      typeCaretRule.value = new FshCode('pattern');
      const pathCaretRule = new CaretValueRule('meta.profile');
      pathCaretRule.caretPath = 'slicing.discriminator.path';
      pathCaretRule.value = '$this';
      const containsRule = new ContainsRule('meta.profile');
      containsRule.items = [{ name: 'supportedProfile' }];
      const cardRule = new CardRule('meta.profile[supportedProfile]');
      cardRule.min = 1;
      cardRule.max = '1';
      const supportedProfileCanonical = new AssignmentRule('meta.profile[supportedProfile]');
      supportedProfileCanonical.value = new FshCanonical('TestPatient');
      supportedProfileCanonical.value.version = '0.1.0';
      patient.rules.push(
        metaMS,
        metaCard,
        metaProfileMS,
        metaProfileCard,
        typeCaretRule,
        pathCaretRule,
        containsRule,
        cardRule,
        supportedProfileCanonical
      );

      // * name[0].family = "LastName"
      // * meta.profile[+] = Canonical(TestPatient|0.1.0)
      // * meta.profile[+] = Canonical(TestPatient)
      const patientAssignmentRule = new AssignmentRule('name[0].family');
      patientAssignmentRule.value = 'LastName';
      const versionedProfileRule = new AssignmentRule('meta.profile[+]');
      versionedProfileRule.value = new FshCanonical('TestPatient');
      versionedProfileRule.value.version = '0.1.0';
      const unversionedProfileRule = new AssignmentRule('meta.profile[+]');
      unversionedProfileRule.value = new FshCanonical('TestPatient');

      patientInstance.rules.push(
        patientAssignmentRule,
        versionedProfileRule,
        unversionedProfileRule
      );

      const exported = exportInstance(patientInstance);
      expect(exported.meta.profile).toHaveLength(2);
      expect(exported.meta.profile).toEqual([
        'http://hl7.org/fhir/us/minimal/StructureDefinition/TestPatient|0.1.0',
        'http://hl7.org/fhir/us/minimal/StructureDefinition/TestPatient'
      ]);
    });

    it('should set meta.profile on all instances when setMetaProfile is always', () => {
      tank.config.instanceOptions = { setMetaProfile: 'always' };
      const boo = new Instance('Boo');
      boo.instanceOf = patient.id;
      const spooky = new Instance('Skeleton');
      spooky.instanceOf = patient.id;
      spooky.usage = 'Inline';
      expect(exportInstance(boo).meta).toEqual({
        profile: [`${tank.config.canonical}/StructureDefinition/${patient.id}`]
      });
      expect(exportInstance(spooky).meta).toEqual({
        profile: [`${tank.config.canonical}/StructureDefinition/${patient.id}`]
      });
    });

    it('should set meta.profile on all instances when setMetaProfile is not set', () => {
      tank.config.instanceOptions = {};
      const boo = new Instance('Boo');
      boo.instanceOf = patient.id;
      const spooky = new Instance('Skeleton');
      spooky.instanceOf = patient.id;
      spooky.usage = 'Inline';
      expect(exportInstance(boo).meta).toEqual({
        profile: [`${tank.config.canonical}/StructureDefinition/${patient.id}`]
      });
      expect(exportInstance(spooky).meta).toEqual({
        profile: [`${tank.config.canonical}/StructureDefinition/${patient.id}`]
      });
    });

    it('should set meta.profile on no instances when setMetaProfile is never', () => {
      tank.config.instanceOptions = { setMetaProfile: 'never' };
      const boo = new Instance('Boo');
      boo.instanceOf = patient.id;
      const spooky = new Instance('Skeleton');
      spooky.instanceOf = patient.id;
      spooky.usage = 'Inline';
      expect(exportInstance(boo).meta).toBeUndefined();
      expect(exportInstance(spooky).meta).toBeUndefined();
    });

    it('should set meta.profile on inline instances when setMetaProfile is inline-only', () => {
      tank.config.instanceOptions = { setMetaProfile: 'inline-only' };
      const boo = new Instance('Boo');
      boo.instanceOf = patient.id;
      const spooky = new Instance('Skeleton');
      spooky.instanceOf = patient.id;
      spooky.usage = 'Inline';
      expect(exportInstance(boo).meta).toBeUndefined();
      expect(exportInstance(spooky).meta).toEqual({
        profile: [`${tank.config.canonical}/StructureDefinition/${patient.id}`]
      });
    });

    it('should set meta.profile on non-inline instances when setMetaProfile is standalone-only', () => {
      tank.config.instanceOptions = { setMetaProfile: 'standalone-only' };
      const boo = new Instance('Boo');
      boo.instanceOf = patient.id;
      const spooky = new Instance('Skeleton');
      spooky.instanceOf = patient.id;
      spooky.usage = 'Inline';
      expect(exportInstance(boo).meta).toEqual({
        profile: [`${tank.config.canonical}/StructureDefinition/${patient.id}`]
      });
      expect(exportInstance(spooky).meta).toBeUndefined();
    });

    it('should automatically set the URL property on definition instances', () => {
      const codeSystemInstance = new Instance('TestInstance');
      codeSystemInstance.instanceOf = 'CodeSystem';
      codeSystemInstance.usage = 'Definition';
      const exported = exportInstance(codeSystemInstance);
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/CodeSystem/TestInstance');
    });

    it('should not automatically set the URL property on definition instances if the URL is set explicitly', () => {
      const codeSystemInstance = new Instance('TestInstance');
      codeSystemInstance.instanceOf = 'CodeSystem';
      codeSystemInstance.usage = 'Definition';

      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://someDifferentCanonical.org/testInstance';
      codeSystemInstance.rules.push(urlRule);
      const exported = exportInstance(codeSystemInstance);
      expect(exported.url).toBe('http://someDifferentCanonical.org/testInstance');
    });

    it('should not automatically set the URL property on definition instances if the profile does not support URL setting', () => {
      const patientInstance = new Instance('TestInstance');
      patientInstance.instanceOf = 'Patient';
      patientInstance.usage = 'Definition';

      const exported = exportInstance(patientInstance);
      expect(exported.url).toBeUndefined;
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
      const assignedValRule = new AssignmentRule('id');
      assignedValRule.value = 'PatientA';
      myExamplePatient.rules.push(assignedValRule);
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
      const assignedValRule = new AssignmentRule('id');
      assignedValRule.value = 'Some Patient';
      myExamplePatient.rules.push(assignedValRule);
      const exported = exportInstance(myExamplePatient);
      const expectedInstanceJSON = {
        resourceType: 'Patient',
        id: 'Some Patient'
      };
      expect(exported.toJSON()).toEqual(expectedInstanceJSON);
      expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR id/s);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Some\.fsh.*Line: 3 - 6\D*/s);
    });

    it('should sanitize the id and log a message when a valid name is used to make an invalid id', () => {
      const instance = new Instance('Foo').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
      instance.instanceOf = 'Patient';
      const assignedValRule = new AssignmentRule('id');
      assignedValRule.value = 'Some_Patient';
      instance.rules.push(assignedValRule);
      const exported = exportInstance(instance);
      const expectedInstanceJSON = {
        resourceType: 'Patient',
        id: 'Some_Patient'
      };
      expect(exported.toJSON()).toEqual(expectedInstanceJSON);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /The string "Some_Patient" does not represent a valid FHIR id\. FHIR ids only allow ASCII letters \(A-Z, a-z\), numbers \(0-9\), hyphens \(-\), and dots \(\.\), with a length limit of 64 characters\. Avoid this warning by changing the Instance declaration to follow the FHIR id requirements\./s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
    });

    it('should log a message when a long valid name is used to make an invalid id', () => {
      const instance = new Instance('Foo').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
      instance.instanceOf = 'Patient';
      const assignedValRule = new AssignmentRule('id');
      let longId = 'Toolong';
      while (longId.length < 65) longId += 'longer';
      assignedValRule.value = longId;
      instance.rules.push(assignedValRule);
      const exported = exportInstance(instance);
      const expectedInstanceJSON = {
        resourceType: 'Patient',
        id: longId
      };
      expect(exported.toJSON()).toEqual(expectedInstanceJSON);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /The string "Toolong(longer)+" does not represent a valid FHIR id\. FHIR ids only allow ASCII letters \(A-Z, a-z\), numbers \(0-9\), hyphens \(-\), and dots \(\.\), with a length limit of 64 characters\. Avoid this warning by changing the Instance declaration to follow the FHIR id requirements\./s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
    });

    it('should log an error when multiple instances of the same type have the same id', () => {
      const firstExample = new Instance('FirstExample')
        .withFile('Repeat.fsh')
        .withLocation([3, 8, 11, 25]);
      firstExample.instanceOf = 'Patient';
      const firstId = new AssignmentRule('id');
      firstId.value = 'repeated-id';
      firstExample.rules.push(firstId);
      doc.instances.set(firstExample.name, firstExample);

      const secondExample = new Instance('SecondExample')
        .withFile('Repeat.fsh')
        .withLocation([13, 8, 20, 22]);
      secondExample.instanceOf = 'Patient';
      const secondId = new AssignmentRule('id');
      secondId.value = 'repeated-id';
      secondExample.rules.push(secondId);
      doc.instances.set(secondExample.name, secondExample);

      exporter.exportInstance(firstExample);
      exporter.exportInstance(secondExample);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple instances of type Patient with id repeated-id/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Repeat\.fsh.*Line: 13 - 20\D*/s);
    });

    it('should not log an error when multiple instances of different types have the same id', () => {
      const firstExample = new Instance('FirstExample')
        .withFile('Repeat.fsh')
        .withLocation([3, 8, 11, 25]);
      firstExample.instanceOf = 'Patient';
      const firstId = new AssignmentRule('id');
      firstId.value = 'repeated-id';
      firstExample.rules.push(firstId);
      doc.instances.set(firstExample.name, firstExample);

      const secondExample = new Instance('SecondExample')
        .withFile('Repeat.fsh')
        .withLocation([13, 8, 20, 22]);
      secondExample.instanceOf = 'Practitioner';
      const secondId = new AssignmentRule('id');
      secondId.value = 'repeated-id';
      secondExample.rules.push(secondId);
      doc.instances.set(secondExample.name, secondExample);

      exporter.exportInstance(firstExample);
      exporter.exportInstance(secondExample);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not log an error when multiple inline instances of the same type have the same id', () => {
      // Inline instances will typically not have an id assigned to them
      const firstQuantity = new Instance('FirstQuantity');
      firstQuantity.instanceOf = 'Quantity';
      firstQuantity.usage = 'Inline';
      doc.instances.set(firstQuantity.name, firstQuantity);

      const secondQuantity = new Instance('SecondQuantity');
      secondQuantity.instanceOf = 'Quantity';
      secondQuantity.usage = 'Inline';
      doc.instances.set(secondQuantity.name, secondQuantity);

      const firstInstance = exporter.exportInstance(firstQuantity);
      const secondInstance = exporter.exportInstance(secondQuantity);
      expect(firstInstance.id).toBe(secondInstance.id);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not log an error when an inline instance and a non-inline instance of the same type have the same id', () => {
      const inlineQuantity = new Instance('FirstQuantity');
      inlineQuantity.instanceOf = 'Quantity';
      inlineQuantity.usage = 'Inline';
      const inlineId = new AssignmentRule('id');
      inlineId.value = 'my-quantity';
      inlineQuantity.rules.push(inlineId);
      doc.instances.set(inlineQuantity.name, inlineQuantity);

      const exampleQuantity = new Instance('SecondQuantity');
      exampleQuantity.instanceOf = 'Quantity';
      exampleQuantity.usage = 'Example';
      const exampleId = new AssignmentRule('id');
      exampleId.value = 'my-quantity';
      exampleQuantity.rules.push(exampleId);
      doc.instances.set(exampleQuantity.name, exampleQuantity);

      const inlineInstance = exporter.exportInstance(inlineQuantity);
      const exampleInstance = exporter.exportInstance(exampleQuantity);
      expect(inlineInstance.id).toBe(exampleInstance.id);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should set id on all instances when setId is always', () => {
      tank.config.instanceOptions = { setId: 'always' };
      const boo = new Instance('Boo');
      boo.instanceOf = 'Patient';
      const spooky = new Instance('Skeleton');
      spooky.instanceOf = 'Patient';
      spooky.usage = 'Inline';
      expect(exportInstance(boo).id).toBe('Boo');
      expect(exportInstance(spooky).id).toBe('Skeleton');
    });

    it('should set id on all instances when setId is not set', () => {
      tank.config.instanceOptions = {};
      const boo = new Instance('Boo');
      boo.instanceOf = 'Patient';
      const spooky = new Instance('Skeleton');
      spooky.instanceOf = 'Patient';
      spooky.usage = 'Inline';
      expect(exportInstance(boo).id).toBe('Boo');
      expect(exportInstance(spooky).id).toBe('Skeleton');
    });

    it('should set id on only non-inline instances when setId is standalone-only', () => {
      tank.config.instanceOptions = { setId: 'standalone-only' };
      const boo = new Instance('Boo');
      boo.instanceOf = 'Patient';
      const spooky = new Instance('Skeleton');
      spooky.instanceOf = 'Patient';
      spooky.usage = 'Inline';
      expect(exportInstance(boo).id).toBe('Boo');
      expect(exportInstance(spooky).id).toBeUndefined();
    });

    // Assigning top level elements
    it('should assign top level elements that are assigned by pattern[x] on the Structure Definition', () => {
      const cardRule = new CardRule('active');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const assignedValRule = new AssignmentRule('active');
      assignedValRule.value = true;
      patient.rules.push(assignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toEqual(true);
    });

    it('should assign top level elements that are assigned by fixed[x] on the Structure Definition', () => {
      const cardRule = new CardRule('active');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const assignedValRule = new AssignmentRule('active');
      assignedValRule.value = true;
      assignedValRule.exactly = true;
      patient.rules.push(assignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toEqual(true);
    });

    it('should assign boolean false values that are assigned on the Structure Definition', () => {
      const cardRule = new CardRule('active');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const assignedValRule = new AssignmentRule('active');
      assignedValRule.value = false;
      assignedValRule.exactly = true;
      patient.rules.push(assignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toBe<boolean>(false);
    });

    it('should assign numeric 0 values that are assigned on the Structure Definition', () => {
      // Profile: ZeroGoal
      // Parent: Goal
      // * target.detailInteger 1..1
      // * target.detailInteger = 0
      const goalProfile = new Profile('ZeroGoal');
      goalProfile.parent = 'Goal';
      const cardRule = new CardRule('target.detailInteger');
      cardRule.min = 1;
      cardRule.max = '1';
      const assignmentRule = new AssignmentRule('target.detailInteger');
      assignmentRule.value = 0;
      goalProfile.rules.push(cardRule, assignmentRule);
      doc.profiles.set(goalProfile.name, goalProfile);
      // Instance: MyInstance
      // InstanceOf: ZeroGoal
      // * lifecycleStatus = #proposed
      // * description = #000
      // * subject.reference = "http://example.org/Someone"
      // * target.measure = #111
      const goalInstance = new Instance('MyInstance');
      goalInstance.instanceOf = 'ZeroGoal';
      const lifecycleStatus = new AssignmentRule('lifecycleStatus');
      lifecycleStatus.value = new FshCode('proposed');
      const description = new AssignmentRule('description');
      description.value = new FshCode('000');
      const subjectReference = new AssignmentRule('subject.reference');
      subjectReference.value = 'http://example.org/Someone';
      const targetMeasure = new AssignmentRule('target.measure');
      targetMeasure.value = new FshCode('111');
      goalInstance.rules.push(lifecycleStatus, description, subjectReference, targetMeasure);
      const exported = exportInstance(goalInstance);
      expect(exported.target[0].detailInteger).toBe<number>(0);
    });

    it('should assign top level codes that are assigned on the Structure Definition', () => {
      const cardRule = new CardRule('gender');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const assignedValRule = new AssignmentRule('gender');
      assignedValRule.value = new FshCode('F');
      patient.rules.push(assignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.gender).toBe('F');
    });

    it('should not assign optional elements that are assigned on the Structure Definition', () => {
      const assignedValRule = new AssignmentRule('active');
      assignedValRule.value = true;
      patient.rules.push(assignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toBeUndefined();
    });

    it('should assign top level elements to an array even if constrained on the Structure Definition', () => {
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
      const assignedValRule = new AssignmentRule('category');
      const assignedFshCode = new FshCode('foo', 'http://foo.com');
      assignedValRule.value = assignedFshCode;
      condition.rules.push(assignedValRule);
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

    it('should assign top level elements that are assigned by a pattern on the Structure Definition', () => {
      const cardRule = new CardRule('maritalStatus');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const assignedValRule = new AssignmentRule('maritalStatus');
      const assignedFshCode = new FshCode('foo', 'http://foo.com');
      assignedValRule.value = assignedFshCode;
      patient.rules.push(assignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com' }]
      });
    });

    it('should assign a value onto an element that are assigned by a pattern on the Structure Definition', () => {
      const observation = new Profile('TestObservation');
      observation.parent = 'Observation';
      doc.profiles.set(observation.name, observation);
      const onlyRule = new OnlyRule('value[x]');
      onlyRule.types = [{ type: 'Quantity' }];
      observation.rules.push(onlyRule); // * value[x] only Quantity
      const assignedValRule = new AssignmentRule('valueQuantity');
      const assignedFshCode = new FshCode('foo', 'http://foo.com');
      assignedValRule.value = assignedFshCode;
      observation.rules.push(assignedValRule); // * valueQuantity = foo.com#foo
      const cardRule = new CardRule('valueQuantity');
      cardRule.min = 1;
      observation.rules.push(cardRule); // * valueQuantity 1..1
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'TestObservation';
      const assignedQuantityValue = new AssignmentRule('valueQuantity.value');
      assignedQuantityValue.value = 100;
      observationInstance.rules.push(assignedQuantityValue); // * valueQuantity.value = 100
      doc.instances.set(observationInstance.name, observationInstance);

      const exported = exportInstance(observationInstance);
      expect(exported.valueQuantity).toEqual({
        code: 'foo',
        system: 'http://foo.com',
        value: 100
      });
    });

    it('should assign a value onto slice elements that are assigned by a pattern on the Structure Definition', () => {
      const containsRule = new ContainsRule('category');
      containsRule.items = [{ name: 'niceSlice' }];
      respRate.rules.push(containsRule); // * category contains niceSlice
      const cardRule = new CardRule('category[niceSlice]');
      cardRule.min = 1;
      cardRule.max = '*';
      respRate.rules.push(cardRule); // * category[niceSlice] 1..*
      const assignedValRule = new AssignmentRule('category[niceSlice]');
      const assignedFshCode = new FshCode('rice', 'http://spice.com');
      assignedValRule.value = assignedFshCode;
      respRate.rules.push(assignedValRule); // * category[niceSlice] = http://spice.com#rice
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

    it('should assign top level choice elements that are assigned on the Structure Definition', () => {
      const assignedValRule = new AssignmentRule('deceasedBoolean');
      assignedValRule.value = true;
      patient.rules.push(assignedValRule);
      const cardRule = new CardRule('deceasedBoolean');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const exported = exportInstance(patientInstance);
      expect(exported.deceasedBoolean).toBe(true);
    });

    it('should not assign fixed values from value[x] children when a specific choice has not been chosen', () => {
      // Profile: ObservationProfile
      // Parent: Observation
      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'Observation';
      // * value[x] 1..1
      const valueCardRequired = new CardRule('value[x]');
      valueCardRequired.min = 1;
      valueCardRequired.max = '1';
      observationProfile.rules.push(valueCardRequired);
      // * value[x].id 1..1
      const valueIdCardRequired = new CardRule('value[x].id');
      valueIdCardRequired.min = 1;
      valueIdCardRequired.max = '1';
      observationProfile.rules.push(valueIdCardRequired);
      // * value[x].id = "some-required-id"
      const valueIdAssignment = new AssignmentRule('value[x].id');
      valueIdAssignment.value = 'Hello World';
      observationProfile.rules.push(valueIdAssignment);
      doc.profiles.set(observationProfile.name, observationProfile);

      // Instance: TestInstance
      // InstanceOf: ObservationProfile
      const testInstance = new Instance('TestInstance');
      testInstance.instanceOf = 'ObservationProfile';
      // * status = #final
      const statusFinal = new AssignmentRule('status');
      statusFinal.value = new FshCode('final');
      testInstance.rules.push(statusFinal);
      // * code = #testcode
      const codeTestCode = new AssignmentRule('code');
      codeTestCode.value = new FshCode('testcode');
      testInstance.rules.push(codeTestCode);
      doc.instances.set(testInstance.name, testInstance);

      const exported = exportInstance(testInstance);
      expect(exported.toJSON()).toEqual({
        resourceType: 'Observation',
        id: 'TestInstance',
        meta: {
          profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationProfile']
        },
        status: 'final',
        code: { coding: [{ code: 'testcode' }] }
      });
    });

    it('should assign fixed values from value[x] children using the correct specific choice property name', () => {
      // Profile: ObservationProfile
      // Parent: Observation
      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'Observation';
      // * value[x] 1..1
      const valueCardRequired = new CardRule('value[x]');
      valueCardRequired.min = 1;
      valueCardRequired.max = '1';
      observationProfile.rules.push(valueCardRequired);
      // * value[x].id 1..1
      const valueIdCardRequired = new CardRule('value[x].id');
      valueIdCardRequired.min = 1;
      valueIdCardRequired.max = '1';
      observationProfile.rules.push(valueIdCardRequired);
      // * value[x].id = "some-required-id"
      const valueIdAssignment = new AssignmentRule('value[x].id');
      valueIdAssignment.value = 'some-id';
      observationProfile.rules.push(valueIdAssignment);
      doc.profiles.set(observationProfile.name, observationProfile);

      // Instance: TestInstance
      // InstanceOf: ObservationProfile
      const testInstance = new Instance('TestInstance');
      testInstance.instanceOf = 'ObservationProfile';
      // * status = #final
      const statusFinal = new AssignmentRule('status');
      statusFinal.value = new FshCode('final');
      testInstance.rules.push(statusFinal);
      // * code = #testcode
      const codeTestCode = new AssignmentRule('code');
      codeTestCode.value = new FshCode('testcode');
      testInstance.rules.push(codeTestCode);
      // * valueQuantity = 5 'mm'
      const valueQuantityAssignment = new AssignmentRule('valueQuantity');
      valueQuantityAssignment.value = new FshQuantity(
        5,
        new FshCode('mm', 'http://unitsofmeasure.org')
      );
      testInstance.rules.push(valueQuantityAssignment);
      doc.instances.set(testInstance.name, testInstance);

      const exported = exportInstance(testInstance);
      expect(exported.toJSON()).toEqual({
        resourceType: 'Observation',
        id: 'TestInstance',
        meta: {
          profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationProfile']
        },
        status: 'final',
        code: { coding: [{ code: 'testcode' }] },
        valueQuantity: {
          id: 'some-id',
          value: 5,
          system: 'http://unitsofmeasure.org',
          code: 'mm'
        }
      });
    });

    it('should assign fixed values from value[x] children using the correct specific choice property name (primitive edition)', () => {
      // Profile: ObservationProfile
      // Parent: Observation
      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'Observation';
      // * value[x] 1..1
      const valueCardRequired = new CardRule('value[x]');
      valueCardRequired.min = 1;
      valueCardRequired.max = '1';
      observationProfile.rules.push(valueCardRequired);
      // * value[x].id 1..1
      const valueIdCardRequired = new CardRule('value[x].id');
      valueIdCardRequired.min = 1;
      valueIdCardRequired.max = '1';
      observationProfile.rules.push(valueIdCardRequired);
      // * value[x].id = "some-required-id"
      const valueIdAssignment = new AssignmentRule('value[x].id');
      valueIdAssignment.value = 'some-id';
      observationProfile.rules.push(valueIdAssignment);
      doc.profiles.set(observationProfile.name, observationProfile);

      // Instance: TestInstance
      // InstanceOf: ObservationProfile
      const testInstance = new Instance('TestInstance');
      testInstance.instanceOf = 'ObservationProfile';
      // * status = #final
      const statusFinal = new AssignmentRule('status');
      statusFinal.value = new FshCode('final');
      testInstance.rules.push(statusFinal);
      // * code = #testcode
      const codeTestCode = new AssignmentRule('code');
      codeTestCode.value = new FshCode('testcode');
      testInstance.rules.push(codeTestCode);
      // * valueString = 'Hello World'
      const valueStringAssignment = new AssignmentRule('valueString');
      valueStringAssignment.value = 'Hello World';
      testInstance.rules.push(valueStringAssignment);
      doc.instances.set(testInstance.name, testInstance);

      const exported = exportInstance(testInstance);
      expect(exported.toJSON()).toEqual({
        resourceType: 'Observation',
        id: 'TestInstance',
        meta: {
          profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationProfile']
        },
        status: 'final',
        code: { coding: [{ code: 'testcode' }] },
        valueString: 'Hello World',
        _valueString: { id: 'some-id' }
      });
    });

    it('should assign fixed value[x] correctly and log no errors when multiple choice slices are assigned', () => {
      // Example from SUSHI 911: https://github.com/FHIR/sushi/issues/911

      // Instance: MyQuestionnaire
      // InstanceOf: Questionnaire
      const questionnaireInstance = new Instance('MyQuestionnaire');
      questionnaireInstance.instanceOf = 'Questionnaire';

      // Add required properties
      // status = #draft
      const statusDraft = new AssignmentRule('status');
      statusDraft.value = new FshCode('draft');
      questionnaireInstance.rules.push(statusDraft);
      // * item[+].linkId = "findrisc-score"
      // * item[=].type = #decimal
      const itemLinkId = new AssignmentRule('item[+].linkId');
      itemLinkId.value = 'findrisc-score';
      questionnaireInstance.rules.push(itemLinkId);
      const itemType = new AssignmentRule('item[=].type');
      itemType.value = new FshCode('decimal');
      questionnaireInstance.rules.push(itemType);

      // Add choiceSlices and ensure values are set and no warnings are logged
      // * item[=].extension[0].url = "http://example.org"
      // * item[=].extension[=].valueExpression.name = "scoreExt"
      // * item[=].extension[=].valueExpression.language = #text/fhirpath
      // * item[=].extension[=].valueExpression.expression = "'http://hl7.org/fhir/StructureDefinition/ordinalValue'"
      // * item[=].extension[+].url = "http://example.org"
      // * item[=].extension[=].valueCoding.display = "{score}"
      const firstExtensionUrl = new AssignmentRule('item[=].extension[0].url');
      firstExtensionUrl.value = 'http://example.org';
      questionnaireInstance.rules.push(firstExtensionUrl);
      const valueExpressionName = new AssignmentRule('item[=].extension[=].valueExpression.name');
      valueExpressionName.value = 'scoreExt';
      questionnaireInstance.rules.push(valueExpressionName);
      const valueExpressionLanguage = new AssignmentRule(
        'item[=].extension[=].valueExpression.language'
      );
      valueExpressionLanguage.value = new FshCode('#text/fhirpath');
      questionnaireInstance.rules.push(valueExpressionLanguage);
      const valueExpressionExpression = new AssignmentRule(
        'item[=].extension[=].valueExpression.expression'
      );
      valueExpressionExpression.value = "'http://hl7.org/fhir/StructureDefinition/ordinalValue'";
      questionnaireInstance.rules.push(valueExpressionExpression);
      const secondExtensionUrl = new AssignmentRule('item[=].extension[+].url');
      secondExtensionUrl.value = 'http://example.org';
      questionnaireInstance.rules.push(secondExtensionUrl);
      const valueCodingDisplay = new AssignmentRule('item[=].extension[=].valueCoding.display');
      valueCodingDisplay.value = '{score}';
      questionnaireInstance.rules.push(valueCodingDisplay);
      doc.instances.set(questionnaireInstance.name, questionnaireInstance);

      const exported = exportInstance(questionnaireInstance);
      // There should be no errors saying that valueExpression.language has min cardinality 1 but occurs 0 times
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(exported.toJSON()).toEqual({
        resourceType: 'Questionnaire',
        id: 'MyQuestionnaire',
        status: 'draft',
        item: [
          {
            linkId: 'findrisc-score',
            type: 'decimal',
            extension: [
              {
                url: 'http://example.org',
                valueExpression: {
                  name: 'scoreExt',
                  language: '#text/fhirpath',
                  expression: "'http://hl7.org/fhir/StructureDefinition/ordinalValue'"
                }
              },
              {
                url: 'http://example.org',
                valueCoding: {
                  display: '{score}'
                }
              }
            ]
          }
        ]
      });
    });

    it('should assign fixed value[x] correctly even in weird situations (SUSHI #760)', () => {
      // See https://github.com/FHIR/sushi/issues/760

      // Profile: EURMoney
      // Parent: Money
      const eurMoney = new Profile('EURMoney');
      eurMoney.parent = 'Money';
      // * currency 1..1
      const currencyRequired = new CardRule('currency');
      currencyRequired.min = 1;
      eurMoney.rules.push(currencyRequired);
      // * currency = #EUR (exactly)
      const currencyFixed = new AssignmentRule('currency');
      currencyFixed.value = new FshCode('EUR');
      currencyFixed.exactly = true;
      eurMoney.rules.push(currencyFixed);
      doc.profiles.set(eurMoney.name, eurMoney);

      // Extension: InsuranceCost
      const insCost = new Extension('InsuranceCost');
      // * extension contains Amount 1..1
      const containsAmount = new ContainsRule('extension');
      containsAmount.items = [{ name: 'Amount' }];
      insCost.rules.push(containsAmount);
      const amountRequired = new CardRule('extension[Amount]');
      amountRequired.min = 1;
      insCost.rules.push(amountRequired);
      const noValue = new CardRule('value[x]');
      noValue.max = '0';
      insCost.rules.push(noValue);
      // * extension[Amount].value[x] 1..1
      const amountValueRequired = new CardRule('extension[Amount].value[x]');
      amountValueRequired.min = 1;
      insCost.rules.push(amountValueRequired);
      const noExtension = new CardRule('extension[Amount].extension');
      noExtension.max = '0';
      insCost.rules.push(noExtension);
      // * extension[Amount].value[x] only EURMoney
      const amountOnlyEurMoney = new OnlyRule('extension[Amount].value[x]');
      amountOnlyEurMoney.types = [{ type: 'EURMoney' }];
      insCost.rules.push(amountOnlyEurMoney);
      // * extension[Amount].value[x].value ^short = "Cost"
      const amountMoneyValueShort = new CaretValueRule('extension[Amount].value[x].value');
      amountMoneyValueShort.caretPath = 'short';
      amountMoneyValueShort.value = 'Cost';
      insCost.rules.push(amountMoneyValueShort);
      doc.extensions.set(insCost.name, insCost);

      // Profile: ObservationProfile
      // Parent: Observation
      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'Observation';
      // * extension contains InsuranceCost named InsCost 1..1
      const containsInsCost = new ContainsRule('extension');
      containsInsCost.items = [{ name: 'InsCost', type: 'InsuranceCost' }];
      observationProfile.rules.push(containsInsCost);
      const insCostRequired = new CardRule('extension[InsCost]');
      insCostRequired.min = 1;
      observationProfile.rules.push(insCostRequired);
      doc.profiles.set(observationProfile.name, observationProfile);

      // Instance: TestInstance
      // InstanceOf: ObservationProfile
      const testInstance = new Instance('TestInstance');
      testInstance.instanceOf = 'ObservationProfile';
      // * status = #final
      const statusFinal = new AssignmentRule('status');
      statusFinal.value = new FshCode('final');
      testInstance.rules.push(statusFinal);
      // * code = #testcode
      const codeTestCode = new AssignmentRule('code');
      codeTestCode.value = new FshCode('testcode');
      testInstance.rules.push(codeTestCode);
      // * extension[InsCost].extension[Amount].valueMoney.value = 5.00
      const moneyValueFive = new AssignmentRule(
        'extension[InsCost].extension[Amount].valueMoney.value'
      );
      moneyValueFive.value = 5;
      testInstance.rules.push(moneyValueFive);
      doc.instances.set(testInstance.name, testInstance);

      const exported = exportInstance(testInstance);
      expect(exported.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/InsuranceCost',
          extension: [
            {
              url: 'Amount',
              valueMoney: {
                currency: 'EUR',
                value: 5
              }
            }
          ]
        }
      ]);
    });

    it('should assign value[x] to the correct path when the rule on the instance refers to value[x], and value[x] is constrained to one type', () => {
      // Profile: ObservationProfile
      // Parent: Observation
      // * value[x] 1..1
      // * value[x] only string
      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'Observation';
      const valueCard = new CardRule('value[x]');
      valueCard.min = 1;
      valueCard.max = '1';
      const valueOnly = new OnlyRule('value[x]');
      valueOnly.types = [{ type: 'string' }];
      observationProfile.rules.push(valueCard, valueOnly);
      doc.profiles.set(observationProfile.name, observationProfile);
      // Instance: MyObservation
      // InstanceOf: ObservationProfile
      // * status = #final
      // * code = #testcode
      // * value[x] = "some value"
      const testInstance = new Instance('MyObservation');
      testInstance.instanceOf = 'ObservationProfile';
      const statusFinal = new AssignmentRule('status');
      statusFinal.value = new FshCode('final');
      const codeTestCode = new AssignmentRule('code');
      codeTestCode.value = new FshCode('testcode');
      const valueSomeValue = new AssignmentRule('value[x]');
      valueSomeValue.value = 'some value';
      testInstance.rules.push(statusFinal, codeTestCode, valueSomeValue);
      const exported = exportInstance(testInstance);
      expect(exported.valueString).toBe('some value');
      expect(exported['value[x]']).toBeUndefined();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        "When assigning values on instances, use the choice element's type. Rule path changed from 'value[x]' to 'valueString'."
      );
    });

    it('should log an error and not assign to a descendant of a choice element when that choice element has more than one type', () => {
      // Profile: ObservationProfile
      // Parent: Observation
      // * value[x] only string or boolean
      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'Observation';
      const valueOnly = new OnlyRule('value[x]');
      valueOnly.types = [{ type: 'string' }, { type: 'boolean' }];
      observationProfile.rules.push(valueOnly);
      doc.profiles.set(observationProfile.name, observationProfile);
      // Instance: MyObservation
      // InstanceOf: ObservationProfile
      // * status = #final
      // * code = #testcode
      // * value[x].extension.url = "http://example.org/SomeExtension"
      const testInstance = new Instance('MyObservation');
      testInstance.instanceOf = 'ObservationProfile';
      const statusFinal = new AssignmentRule('status');
      statusFinal.value = new FshCode('final');
      const codeTestCode = new AssignmentRule('code');
      codeTestCode.value = new FshCode('testcode');
      const extensionUrl = new AssignmentRule('value[x].extension.url');
      extensionUrl.value = 'http://example.org/SomeExtension';
      testInstance.rules.push(statusFinal, codeTestCode, extensionUrl);
      const exported = exportInstance(testInstance);
      expect(exported['value[x]']).toBeUndefined();
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'Unable to assign value at value[x].extension.url: choice elements on an instance must use a specific type'
      );
    });

    it('should assign an element to a value the same as the assigned value on the Structure Definition', () => {
      const assignedValRule = new AssignmentRule('active');
      assignedValRule.value = true;
      assignedValRule.exactly = true;
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('active');
      instanceAssignedValRule.value = true;
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toEqual(true);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should assign an element to a value the same as the assigned pattern on the Structure Definition', () => {
      const assignedValRule = new AssignmentRule('maritalStatus');
      const assignedFshCode = new FshCode('foo', 'http://foo.com');
      assignedValRule.value = assignedFshCode;
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('maritalStatus');
      const instanceAssignedFshCode = new FshCode('foo', 'http://foo.com');
      instanceAssignedValRule.value = instanceAssignedFshCode;
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com' }]
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should assign an element to a value that is a superset of the assigned pattern on the Structure Definition', () => {
      const assignedValRule = new AssignmentRule('maritalStatus');
      const assignedFshCode = new FshCode('foo', 'http://foo.com');
      assignedValRule.value = assignedFshCode;
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('maritalStatus');
      const instanceAssignedFshCode = new FshCode('foo', 'http://foo.com', 'Foo Foo');
      instanceAssignedValRule.value = instanceAssignedFshCode;
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com', display: 'Foo Foo' }]
      });
    });

    it('should not assign an element to a value different than the assigned value on the Structure Definition', () => {
      const assignedValRule = new AssignmentRule('active');
      assignedValRule.value = true;
      patient.rules.push(assignedValRule);
      const cardRule = new CardRule('active');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const instanceAssignedValRule = new AssignmentRule('active');
      instanceAssignedValRule.value = false;
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toBe(true);
      expect(loggerSpy.getLastMessage()).toMatch(
        'Cannot assign false to this element; a different boolean is already assigned: true'
      );
    });

    it('should not assign an element to a value different than the pattern value on the Structure Definition', () => {
      const assignedValRule = new AssignmentRule('maritalStatus');
      const assignedFshCode = new FshCode('foo', 'http://foo.com');
      assignedValRule.value = assignedFshCode;
      patient.rules.push(assignedValRule);
      const cardRule = new CardRule('maritalStatus');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const instanceAssignedValRule = new AssignmentRule('maritalStatus');
      const instanceAssignedFshCode = new FshCode('bar', 'http://bar.com');
      instanceAssignedValRule.value = instanceAssignedFshCode;
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus.coding[0]).toEqual({
        code: 'foo',
        system: 'http://foo.com'
      });
      expect(loggerSpy.getLastMessage()).toMatch(
        'Cannot assign http://bar.com#bar to this element; a different CodeableConcept is already assigned: {"coding":[{"code":"foo","system":"http://foo.com"}]}.'
      );
    });

    it('should assign an element to a value different than the pattern value on the Structure Definition on an array', () => {
      const assignedValRule = new AssignmentRule('maritalStatus');
      const assignedFshCode = new FshCode('foo', 'http://foo.com');
      assignedValRule.value = assignedFshCode;
      patient.rules.push(assignedValRule);
      const cardRule = new CardRule('maritalStatus');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const instanceAssignedValRule = new AssignmentRule('maritalStatus.coding[1]');
      const instanceAssignedFshCode = new FshCode('bar', 'http://bar.com');
      instanceAssignedValRule.value = instanceAssignedFshCode;
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus.coding[0]).toEqual({
        code: 'foo',
        system: 'http://foo.com'
      });
      expect(exported.maritalStatus.coding[1]).toEqual({
        code: 'bar',
        system: 'http://bar.com'
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    // Nested elements
    it('should assign a nested element that has parents defined in the instance and is assigned on the Structure Definition', () => {
      const cardRule = new CardRule('communication.preferred');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const assignedValRule = new AssignmentRule('communication.preferred');
      assignedValRule.value = true;
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('communication[0].language');
      instanceAssignedValRule.value = new FshCode('foo');
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.communication[0]).toEqual({
        preferred: true,
        language: { coding: [{ code: 'foo' }] }
      });
    });

    it('should assign a nested element that has parents and children defined in the instance and is assigned on the Structure Definition', () => {
      const cardRule = new CardRule('communication.language.text');
      cardRule.min = 1;
      patient.rules.push(cardRule);
      const assignedValRule = new AssignmentRule('communication.language.text');
      assignedValRule.value = 'foo';
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule(
        'communication[0].language.coding[0].version'
      );
      instanceAssignedValRule.value = 'bar';
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.communication[0]).toEqual({
        language: { text: 'foo', coding: [{ version: 'bar' }] }
      });
    });

    it('should not assign a nested element that does not have parents defined in the instance', () => {
      const assignedValRule = new AssignmentRule('communication.preferred');
      assignedValRule.value = true;
      patient.rules.push(assignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.communication).toBeUndefined();
    });

    it('should assign a nested element that has parents defined in the instance and assigned on the SD to an array even if constrained', () => {
      const cardRule = new CardRule('contact');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      const cardRuleRelationship = new CardRule('contact.relationship');
      cardRuleRelationship.min = 1;
      cardRuleRelationship.max = '*';
      patient.rules.push(cardRuleRelationship);
      const assignedValRule = new AssignmentRule('contact.relationship');
      assignedValRule.value = new FshCode('mother');
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('contact.gender');
      instanceAssignedValRule.value = new FshCode('foo');
      patientInstance.rules.push(instanceAssignedValRule);
      const exported = exportInstance(patientInstance);
      expect(exported.contact).toEqual([
        {
          gender: 'foo',
          relationship: [{ coding: [{ code: 'mother' }] }]
        }
      ]);
    });

    // Deeply Nested Elements
    it('should assign a deeply nested element that is assigned on the Structure Definition and has 1..1 parents', () => {
      // * telecom.period 1..1
      // * telecom.period.start 1..1
      // * telecom.period.start = "2000-07-04"
      const periodCard = new CardRule('telecom.period');
      periodCard.min = 1;
      periodCard.max = '1';
      const startCard = new CardRule('telecom.period.start');
      startCard.min = 1;
      startCard.max = '1';
      const assignedValRule = new AssignmentRule('telecom.period.start');
      assignedValRule.value = '2000-07-04';

      patient.rules.push(periodCard, startCard, assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('telecom[0].system');
      instanceAssignedValRule.value = new FshCode('email');
      patientInstance.rules.push(instanceAssignedValRule); // * telecom[0].system = #email
      const exported = exportInstance(patientInstance);
      expect(exported.telecom[0]).toEqual({
        system: 'email',
        period: {
          start: '2000-07-04'
        }
      });
    });

    it('should not get confused by matching path parts when assigning deeply nested elements', () => {
      // * maritalStatus, maritalStatus.coding, maritalStatus.coding.system 1..1
      // * maritalStatus.coding.system = "http://itscomplicated.com"
      const statCard = new CardRule('maritalStatus');
      statCard.min = 1;
      statCard.max = '1';
      const codingCard = new CardRule('maritalStatus.coding');
      codingCard.min = 1;
      codingCard.max = '1';
      const sysCard = new CardRule('maritalStatus.coding.system');
      sysCard.min = 1;
      sysCard.max = '1';
      const assignedValRule = new AssignmentRule('maritalStatus.coding.system');
      assignedValRule.value = 'http://itscomplicated.com';

      patient.rules.push(statCard, codingCard, sysCard, assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('generalPractitioner.identifier.system');
      instanceAssignedValRule.value = 'http://medicine.med';
      patientInstance.rules.push(instanceAssignedValRule); // * generalPractitioner.identifier.system = "http://medicine.med"
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({ coding: [{ system: 'http://itscomplicated.com' }] });
      expect(exported.generalPractitioner).toEqual([
        { identifier: { system: 'http://medicine.med' } }
      ]);
      const messages = loggerSpy.getAllMessages('error');
      expect(messages).toHaveLength(0);
    });

    it('should assign a deeply nested element that is assigned on the Structure Definition and has array parents with min > 1', () => {
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
      const assignedValRule = new AssignmentRule('identifier.type.coding.display');
      assignedValRule.value = 'This is my coding';

      patient.rules.push(idCard, typeCard, displayCard, assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('identifier.type.coding[2].version');
      instanceAssignedValRule.value = '1.2.3';
      patientInstance.rules.push(instanceAssignedValRule); // * identifier.type.coding[2].version = "1.2.3"
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

    it('should assign a deeply nested element that is assigned on the Structure Definition and has slice array parents with min > 1', () => {
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
      const assignedValRule = new AssignmentRule('category[niceSlice]');
      const assignedFshCode = new FshCode('rice', 'http://spice.com');
      assignedValRule.value = assignedFshCode;
      respRate.rules.push(containsRule, cardRule, assignedValRule);
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

    it('should create additional elements when assigning primitive implied properties from named slices', () => {
      // Profile: ManateePatient
      // Parent: Patient
      // * contact.name.given ^slicing.discriminator.type = #pattern
      // * contact.name.given ^slicing.discriminator.path = "$this"
      // * contact.name.given ^slicing.rules = #open
      // * contact.name.given contains Manatee 1..1
      // * contact.name.given[Manatee] = "Manatee"
      const manateePatient = new Profile('ManateePatient');
      manateePatient.parent = 'Patient';
      const discriminatorType = new CaretValueRule('contact.name.given');
      discriminatorType.caretPath = 'slicing.discriminator.type';
      discriminatorType.value = new FshCode('pattern');
      const discriminatorPath = new CaretValueRule('contact.name.given');
      discriminatorPath.caretPath = 'slicing.discriminator.path';
      discriminatorPath.value = '$this';
      const slicingRules = new CaretValueRule('contact.name.given');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const manateeContains = new ContainsRule('contact.name.given');
      manateeContains.items = [{ name: 'Manatee' }];
      const manateeCard = new CardRule('contact.name.given[Manatee]');
      manateeCard.min = 1;
      manateeCard.max = '1';
      const manateeAssignment = new AssignmentRule('contact.name.given[Manatee]');
      manateeAssignment.value = 'Manatee';
      manateePatient.rules.push(
        discriminatorType,
        discriminatorPath,
        slicingRules,
        manateeContains,
        manateeCard,
        manateeAssignment
      );
      doc.profiles.set(manateePatient.name, manateePatient);

      // Profile: SeacowPatient
      // Parent: ManateePatient
      // * contact.name 1..1
      // * contact.name = SeacowName
      const seacowPatient = new Profile('SeacowPatient');
      seacowPatient.parent = 'ManateePatient';
      const seacowCard = new CardRule('contact.name');
      seacowCard.min = 1;
      seacowCard.max = '1';
      const seacowAssignment = new AssignmentRule('contact.name');
      seacowAssignment.value = 'SeacowName';
      seacowAssignment.isInstance = true;
      seacowPatient.rules.push(seacowCard, seacowAssignment);
      doc.profiles.set(seacowPatient.name, seacowPatient);

      // Instance: SeacowName
      // InstanceOf: HumanName
      // Usage: #inline
      // * given[0] = "Seacow"
      const seacowName = new Instance('SeacowName');
      seacowName.instanceOf = 'HumanName';
      seacowName.usage = 'Inline';
      const seacowGiven = new AssignmentRule('given[0]');
      seacowGiven.value = 'Seacow';
      seacowName.rules.push(seacowGiven);
      doc.instances.set(seacowName.name, seacowName);
      exportInstance(seacowName);

      // Instance: ThisIsSeacow
      // InstanceOf: SeacowPatient
      // * contact.name = SeacowName
      const thisIsSeacow = new Instance('ThisIsSeacow');
      thisIsSeacow.instanceOf = 'SeacowPatient';
      const thisIsName = new AssignmentRule('contact.name');
      thisIsName.value = 'SeacowName';
      thisIsName.isInstance = true;
      thisIsSeacow.rules.push(thisIsName);
      const exported = exportInstance(thisIsSeacow);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(exported.contact[0].name.given).toEqual(['Manatee', 'Seacow']);
    });

    it('should not create additional elements when assigning implied properties from named slices', () => {
      // Profile: ObservationProfile
      // Parent: observation-bodyweight
      // * code = http://loinc.org#29463-7
      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'http://hl7.org/fhir/StructureDefinition/bodyweight';
      const profileCode = new AssignmentRule('code');
      profileCode.value = new FshCode('29463-7', 'http://loinc.org');
      profileCode.exactly = false;
      observationProfile.rules.push(profileCode);
      doc.profiles.set(observationProfile.name, observationProfile);

      // Instance: MyObservation
      // InstanceOf: ObservationProfile
      // * code = http://loinc.org#29463-7 "this should be the only one"
      // * status = #final
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'ObservationProfile';
      const instanceCode = new AssignmentRule('code');
      instanceCode.value = new FshCode(
        '29463-7',
        'http://loinc.org',
        'this should be the only one'
      );
      const instanceStatus = new AssignmentRule('status');
      instanceStatus.value = new FshCode('final');
      observationInstance.rules.push(instanceCode, instanceStatus);
      const exported = exportInstance(observationInstance);

      expect(exported.code.coding).toHaveLength(1);
      expect(exported.code.coding[0]).toEqual({
        code: '29463-7',
        system: 'http://loinc.org',
        display: 'this should be the only one'
      });
    });

    it('should create additional elements when assigning implied properties if the value on the named slice and on an ancestor element are different', () => {
      // Profile: ObservationProfile
      // Parent: observation-bodyweight
      // * code = http://loinc.org#54126-8
      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'http://hl7.org/fhir/StructureDefinition/bodyweight';
      const profileCode = new AssignmentRule('code');
      profileCode.value = new FshCode('54126-8', 'http://loinc.org');
      profileCode.exactly = false;
      observationProfile.rules.push(profileCode);
      doc.profiles.set(observationProfile.name, observationProfile);

      // Instance: MyObservation
      // InstanceOf: ObservationProfile
      // * code = http://loinc.org#54126-8
      // * status = #final
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'ObservationProfile';
      const instanceCode = new AssignmentRule('code');
      instanceCode.value = new FshCode('54126-8', 'http://loinc.org');
      const instanceStatus = new AssignmentRule('status');
      instanceStatus.value = new FshCode('final');
      observationInstance.rules.push(instanceCode, instanceStatus);
      const exported = exportInstance(observationInstance);

      expect(exported.code.coding).toHaveLength(2);
      expect(exported.code.coding[0]).toEqual({
        code: '29463-7',
        system: 'http://loinc.org'
      });
      expect(exported.code.coding[1]).toEqual({
        code: '54126-8',
        system: 'http://loinc.org'
      });
    });

    it('should not create additional elements when assigning implied properties on descdendants of named slices', () => {
      // Profile: ObservationProfile
      // Parent: Observation
      // * component ^slicing.discriminator.type = #pattern
      // * component ^slicing.discriminator.path = "code"
      // * component ^slicing.rules = #open
      // * component contains MySlice 1..1
      // * component[MySlice].code.coding 1..*
      // * component[MySlice].code = http://foo#bar
      // * component[MySlice].code.coding ^slicing.discriminator.type = #pattern
      // * component[MySlice].code.coding ^slicing.discriminator.path = "$this"
      // * component[MySlice].code.coding ^slicing.rules = #open
      // * component[MySlice].code.coding contains MySubSlice 1..1
      // * component[MySlice].code.coding[MySubSlice] = http://foo#bar "extra display"

      const observationProfile = new Profile('ObservationProfile');
      observationProfile.parent = 'Observation';
      const componentType = new CaretValueRule('component');
      componentType.caretPath = 'slicing.discriminator.type';
      componentType.value = new FshCode('pattern');
      const componentPath = new CaretValueRule('component');
      componentPath.caretPath = 'slicing.discriminator.path';
      componentPath.value = 'code';
      const componentRules = new CaretValueRule('component');
      componentRules.caretPath = 'slicing.rules';
      componentRules.value = new FshCode('open');
      const componentContains = new ContainsRule('component');
      componentContains.items.push({ name: 'MySlice' });
      const mySliceCard = new CardRule('component[MySlice]');
      mySliceCard.min = 1;
      mySliceCard.max = '1';
      const codingCard = new CardRule('component[MySlice].code.coding');
      codingCard.min = 1;
      codingCard.max = '*';
      const codeAssignment = new AssignmentRule('component[MySlice].code');
      codeAssignment.value = new FshCode('bar', 'http://foo');
      const codingType = new CaretValueRule('component[MySlice].code.coding');
      codingType.caretPath = 'slicing.discriminator.type';
      codingType.value = new FshCode('pattern');
      const codingPath = new CaretValueRule('component[MySlice].code.coding');
      codingPath.caretPath = 'slicing.discriminator.path';
      codingPath.value = '$this';
      const codingRules = new CaretValueRule('component[MySlice].code.coding');
      codingRules.caretPath = 'slicing.rules';
      codingRules.value = new FshCode('open');
      const codingContains = new ContainsRule('component[MySlice].code.coding');
      codingContains.items.push({ name: 'MySubSlice' });
      const mySubSliceCard = new CardRule('component[MySlice].code.coding[MySubSlice]');
      mySubSliceCard.min = 1;
      mySubSliceCard.max = '1';
      const subSliceAssignment = new AssignmentRule('component[MySlice].code.coding[MySubSlice]');
      subSliceAssignment.value = new FshCode('bar', 'http://foo', 'extra display');

      observationProfile.rules.push(
        componentType,
        componentPath,
        componentRules,
        componentContains,
        mySliceCard,
        codingCard,
        codeAssignment,
        codingType,
        codingPath,
        codingRules,
        codingContains,
        mySubSliceCard,
        subSliceAssignment
      );
      doc.profiles.set(observationProfile.name, observationProfile);

      // Instance: ObservationInstance
      // InstanceOf: ObservationProfile
      // * code = http://any.com#code
      // * status = #final

      const observationInstance = new Instance('ObservationInstance');
      observationInstance.instanceOf = 'ObservationProfile';
      const instanceCode = new AssignmentRule('code');
      instanceCode.value = new FshCode('code', 'http://any.com');
      const instanceStatus = new AssignmentRule('status');
      instanceStatus.value = new FshCode('final');
      observationInstance.rules.push(instanceCode, instanceStatus);

      const exported = exportInstance(observationInstance);
      expect(exported.component[0].code.coding).toHaveLength(1);
    });

    it('should not assign a deeply nested element that is assigned on the Structure Definition but does not have 1..1 parents', () => {
      // * telecom.period 0..1 // Element is optional
      // * telecom.period.start 1..1
      // * telecom.period.start = "2000-07-04"
      const periodCard = new CardRule('telecom.period');
      periodCard.min = 0;
      periodCard.max = '1';
      const startCard = new CardRule('telecom.period.start');
      startCard.min = 1;
      startCard.max = '1';
      const assignedValRule = new AssignmentRule('telecom.period.start');
      assignedValRule.value = '2000-07-04';

      patient.rules.push(periodCard, startCard, assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('telecom[0].system');
      instanceAssignedValRule.value = new FshCode('email');
      patientInstance.rules.push(instanceAssignedValRule); // * telecom[0].system = #email
      const exported = exportInstance(patientInstance);
      expect(exported.telecom[0]).toEqual({
        system: 'email'
        // period not included since it is 0..1
      });
    });

    it('should log a warning when assigning a value to an element nested within an element with multiple profiles', () => {
      // Consider two Identifier profiles with mutually incompatible assigned values
      const regularIdentifier = new Profile('RegularIdentifier');
      regularIdentifier.parent = 'Identifier';
      const regularSystem = new AssignmentRule('system');
      regularSystem.value = 'http://example.org/regular';
      regularIdentifier.rules.push(regularSystem);
      doc.profiles.set(regularIdentifier.name, regularIdentifier);
      const unusualIdentifier = new Profile('UnusualIdentifier');
      unusualIdentifier.parent = 'Identifier';
      const unusualSystem = new AssignmentRule('system');
      unusualSystem.value = 'http://example.org/unusual';
      unusualIdentifier.rules.push(unusualSystem);
      doc.profiles.set(unusualIdentifier.name, unusualIdentifier);
      // In TestPatient, give the generalPractitioner.identifier element multiple profiles
      const gpOnly = new OnlyRule('generalPractitioner.identifier');
      gpOnly.types.push({ type: 'RegularIdentifier' }, { type: 'UnusualIdentifier' });
      patient.rules.push(gpOnly);
      // Assign a value to generalPractitioner.identifier.value, which is nested within the profiled element
      const gpValue = new AssignmentRule('generalPractitioner.identifier.value');
      gpValue.value = '12345';
      // Assign a value to generalPractitioner.identifier.system. This value is invalid on both profiles, but those profiles are being ignored.
      const gpSystem = new AssignmentRule('generalPractitioner.identifier.system');
      gpSystem.value = 'http://example.org/something-else';
      patientInstance.rules.push(gpValue, gpSystem);
      const exported = exportInstance(patientInstance);
      // The assigned values should be present
      expect(exported.generalPractitioner[0].identifier.value).toBe('12345');
      expect(exported.generalPractitioner[0].identifier.system).toBe(
        'http://example.org/something-else'
      );
      // We should receive a warning that the profiles are being ignored
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Multiple profiles present on element Patient.generalPractitioner.identifier. Base element type will be used instead of any profiles.'
      );
    });

    // Assigning with pattern[x]
    it('should assign a nested element that is assigned by pattern[x] from a parent on the SD', () => {
      const assignedValRule = new AssignmentRule('maritalStatus.coding');
      assignedValRule.value = new FshCode('foo', 'http://foo.com');
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('maritalStatus.coding[0].version');
      instanceAssignedValRule.value = '1.2.3';
      patientInstance.rules.push(instanceAssignedValRule);
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

    it('should assign multiple nested elements that are assigned by pattern[x] from a parent on the SD', () => {
      const assignedValRule = new AssignmentRule('maritalStatus.coding');
      assignedValRule.value = new FshCode('foo', 'http://foo.com');
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('maritalStatus.coding[0].version');
      instanceAssignedValRule.value = '1.2.3';
      patientInstance.rules.push(instanceAssignedValRule);
      const instanceAssignedValRule2 = new AssignmentRule('maritalStatus.coding[1].version');
      instanceAssignedValRule2.value = '3.2.1';
      patientInstance.rules.push(instanceAssignedValRule2);
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

    it('should assign a nested element that is assigned by array pattern[x] from a parent on the SD', () => {
      const assignedValRule = new AssignmentRule('maritalStatus');
      assignedValRule.value = new FshCode('foo', 'http://foo.com');
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('maritalStatus.coding[0].version');
      instanceAssignedValRule.value = '1.2.3';
      patientInstance.rules.push(instanceAssignedValRule);
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

    it('should assign multiple nested elements that are assigned by array pattern[x] from a parent on the SD', () => {
      const assignedValRule = new AssignmentRule('maritalStatus');
      assignedValRule.value = new FshCode('foo', 'http://foo.com');
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule1 = new AssignmentRule('maritalStatus.coding[0].version');
      instanceAssignedValRule1.value = '1.2.3';
      patientInstance.rules.push(instanceAssignedValRule1);
      const instanceAssignedValRule2 = new AssignmentRule('maritalStatus.coding[1].version');
      instanceAssignedValRule2.value = '3.2.1';
      patientInstance.rules.push(instanceAssignedValRule2);
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

    it('should assign elements with soft indexing used within a path', () => {
      const assignedValRule = new AssignmentRule('name[+].given');
      assignedValRule.value = 'John';
      patientInstance.rules.push(assignedValRule);
      const assignedValRule2 = new AssignmentRule('name[=].family');
      assignedValRule2.value = 'Johnson';
      patientInstance.rules.push(assignedValRule2);
      const assignedValRule3 = new AssignmentRule('name[+].given');
      assignedValRule3.value = 'Johnny';
      patientInstance.rules.push(assignedValRule3);
      const assignedValRule4 = new AssignmentRule('name[=].family');
      assignedValRule4.value = 'Jackson';
      patientInstance.rules.push(assignedValRule4);
      const exported = exportInstance(patientInstance);
      expect(exported.name).toEqual([
        {
          given: ['John'],
          family: 'Johnson'
        },
        {
          given: ['Johnny'],
          family: 'Jackson'
        }
      ]);
    });

    it('should assign cardinality 1..n elements that are assigned by array pattern[x] from a parent on the SD', () => {
      const assignedValRule = new AssignmentRule('maritalStatus');
      assignedValRule.value = new FshCode('foo', 'http://foo.com');
      patient.rules.push(assignedValRule);
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

    // TODO: The assignValue functions should be updated to not assign a value when a parent element sets
    // the value to something different using a pattern
    it.skip('should not assign an element to a value different than a parent pattern value on the Structure Definition', () => {
      const assignedValRule = new AssignmentRule('maritalStatus');
      const assignedFshCode = new FshCode('foo', 'http://foo.com');
      assignedValRule.value = assignedFshCode;
      patient.rules.push(assignedValRule);
      const instanceAssignedValRule = new AssignmentRule('maritalStatus.coding[0].system');
      instanceAssignedValRule.value = 'http://bar.com';
      patientInstance.rules.push(instanceAssignedValRule);
      expect(() => exportInstance(patientInstance)).toThrow();
    });

    // Assigning children of primitives
    it('should assign children of primitive values on an instance', () => {
      const assignedValRule = new AssignmentRule('active.id');
      assignedValRule.value = 'foo';
      patientInstance.rules.push(assignedValRule);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported._active.id).toBe('foo');
    });

    it('should assign primitive values and their children on an instance', () => {
      const assignedValRule1 = new AssignmentRule('active');
      assignedValRule1.value = true;
      patientInstance.rules.push(assignedValRule1);
      const assignedValRule2 = new AssignmentRule('active.id');
      assignedValRule2.value = 'foo';
      patientInstance.rules.push(assignedValRule2);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.active).toBe(true);
      expect(exported._active.id).toBe('foo');
    });

    it('should assign children of primitive value arrays on an instance', () => {
      const assignedValRule = new AssignmentRule('address[0].line[1].extension[0].url');
      assignedValRule.value = 'foo';
      patientInstance.rules.push(assignedValRule);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.address.length).toBe(1);
      expect(exported.address[0]._line.length).toBe(2);
      expect(exported.address[0]._line[0]).toBeNull();
      expect(exported.address[0]._line[1].extension.length).toBe(1);
      expect(exported.address[0]._line[1].extension[0].url).toBe('foo');
    });

    it('should assign children of primitive value arrays on an instance with out of order rules', () => {
      const assignedValRule1 = new AssignmentRule('address[0].line[1].extension[0].url');
      assignedValRule1.value = 'bar';
      patientInstance.rules.push(assignedValRule1);
      const assignedValRule2 = new AssignmentRule('address[0].line[0].extension[0].url');
      assignedValRule2.value = 'foo';
      patientInstance.rules.push(assignedValRule2);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.address.length).toBe(1);
      expect(exported.address[0]._line.length).toBe(2);
      expect(exported.address[0]._line[0].extension.length).toBe(1);
      expect(exported.address[0]._line[0].extension[0].url).toBe('foo');
      expect(exported.address[0]._line[1].extension.length).toBe(1);
      expect(exported.address[0]._line[1].extension[0].url).toBe('bar');
    });

    it('should assign children of sliced primitive arrays on an instance', () => {
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
      const assignedRule1 = new AssignmentRule('name[0].prefix[Dr][0]');
      assignedRule1.value = 'Doctor';
      const assignedRule2 = new AssignmentRule('name[0].prefix[Dr][1]');
      assignedRule2.value = 'Mister Doctor';
      const assignedRuleChild = new AssignmentRule('name[0].prefix[Dr][1].id');
      assignedRuleChild.value = 'Sir Mister Doctor to you';
      // * name[0].prefix[Dr][0] = "Doctor"
      // * name[0].prefix[Dr][1] = "Mister Doctor"
      // * name[0].prefix[Dr][1].id = "Sir Mister Doctor to you";
      patientInstance.rules.push(assignedRule1, assignedRule2, assignedRuleChild);
      const exported = exportInstance(patientInstance);
      expect(exported.name).toEqual([
        {
          prefix: ['Doctor', 'Mister Doctor'],
          _prefix: [null, { id: 'Sir Mister Doctor to you' }]
        }
      ]);
    });

    // Assigning References
    it('should assign a reference while resolving the Instance being referred to', () => {
      const orgInstance = new Instance('TestOrganization');
      orgInstance.instanceOf = 'Organization';
      const assignedIdRule = new AssignmentRule('id');
      assignedIdRule.value = 'org-id';
      orgInstance.rules.push(assignedIdRule);
      const assignedRefRule = new AssignmentRule('managingOrganization');
      assignedRefRule.value = new FshReference('TestOrganization');
      patientInstance.rules.push(assignedRefRule);
      doc.instances.set(patientInstance.name, patientInstance);
      doc.instances.set(orgInstance.name, orgInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.managingOrganization).toEqual({
        reference: 'Organization/org-id'
      });
    });

    it('should assign a reference to a contained resource using a relative reference', () => {
      const orgInstance = new Instance('TestOrganization');
      orgInstance.instanceOf = 'Organization';
      const assignedIdRule = new AssignmentRule('id');
      assignedIdRule.value = 'org-id';
      orgInstance.rules.push(assignedIdRule);
      const containedRule = new AssignmentRule('contained');
      containedRule.value = 'TestOrganization';
      containedRule.isInstance = true;
      const assignedRefRule = new AssignmentRule('managingOrganization');
      assignedRefRule.value = new FshReference('TestOrganization');
      patientInstance.rules.push(containedRule, assignedRefRule);
      doc.instances.set(patientInstance.name, patientInstance);
      doc.instances.set(orgInstance.name, orgInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.managingOrganization).toEqual({
        reference: '#org-id'
      });
    });

    it('should assign a reference without replacing if the referred Instance does not exist', () => {
      const assignedRefRule = new AssignmentRule('managingOrganization');
      assignedRefRule.value = new FshReference('http://hl7.org/fhir/us/minimal');
      patientInstance.rules.push(assignedRefRule);
      doc.instances.set(patientInstance.name, patientInstance);
      const exported = exportInstance(patientInstance);
      expect(exported.managingOrganization).toEqual({
        reference: 'http://hl7.org/fhir/us/minimal'
      });
    });

    it('should assign a reference to a type based on a profile', () => {
      const basePatientInstance = new Instance('BasePatient');
      basePatientInstance.instanceOf = 'Patient';
      doc.instances.set(basePatientInstance.name, basePatientInstance);

      // us-core-observation-lab constrains subject to be a reference to a us-core-patient
      // However, any patient instance can be assigned (because it might conform to the us-core-patient profile without explicitly specifying the profile)
      const profiledInstance = new Instance('MyExampleObservation');
      profiledInstance.instanceOf =
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
      const assignedRefRule = new AssignmentRule('subject');
      assignedRefRule.value = new FshReference('BasePatient');
      profiledInstance.rules.push(assignedRefRule); // * subject = Reference(BasePatient)
      doc.instances.set(profiledInstance.name, profiledInstance);

      const exported = exportInstance(profiledInstance);
      expect(exported.subject).toEqual({
        reference: 'Patient/BasePatient'
      });
    });

    it('should assign a reference when the type has no targetProfile', () => {
      const referencedPatientInstance = new Instance('ReferencedPatient');
      referencedPatientInstance.instanceOf = 'Patient';
      doc.instances.set(referencedPatientInstance.name, referencedPatientInstance);

      const assignedRefRule = new AssignmentRule('extension.valueReference');
      assignedRefRule.value = new FshReference('ReferencedPatient');
      patientInstance.rules.push(assignedRefRule); // * extension.valueReference = Reference(BasePatient)

      const exported = exportInstance(patientInstance);
      expect(exported.extension[0].valueReference).toEqual({
        reference: 'Patient/ReferencedPatient'
      });
    });

    it('should log an error when an invalid reference is assigned', () => {
      const observationInstance = new Instance('TestObservation');
      observationInstance.instanceOf = 'Observation';
      doc.instances.set(observationInstance.name, observationInstance);
      const assignedRefRule = new AssignmentRule('contact[0].organization');
      assignedRefRule.value = new FshReference('TestObservation');
      // * contact[0].organization = Reference(TestObservation)
      patientInstance.rules.push(assignedRefRule);
      doc.instances.set(patientInstance.name, patientInstance);

      const exported = exportInstance(patientInstance);
      expect(exported.contact).toEqual(undefined); // Contact is not set with invalid type
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /The type "Reference\(Observation\)" does not match any of the allowed types\D*/s
      );
    });

    it('should log an error when assigning an invalid reference to a type based on a profile', () => {
      const groupInstance = new Instance('MyGroup');
      groupInstance.instanceOf = 'Group';
      doc.instances.set(groupInstance.name, groupInstance);

      // us-core-observation-lab subject can only be a us-core-patient
      // Group, Device, and Location are allowed reference types on base Patient, but not this profile
      const profiledInstance = new Instance('MyExampleObservation');
      profiledInstance.instanceOf =
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
      const assignedRefRule = new AssignmentRule('subject');
      assignedRefRule.value = new FshReference('MyGroup'); // * subject = Reference(MyGroup)
      profiledInstance.rules.push(assignedRefRule);
      doc.instances.set(profiledInstance.name, profiledInstance);

      const exported = exportInstance(profiledInstance);
      expect(exported.subject).toEqual(undefined);
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /The type "Reference\(Group\)" does not match any of the allowed types\D*/s
      );
    });

    it('should assign a reference to a child type of the referenced type', () => {
      const documentReferenceInstance = new Instance('MyDocReference');
      documentReferenceInstance.instanceOf = 'DocumentReference';
      doc.instances.set(documentReferenceInstance.name, documentReferenceInstance);

      // DocumentReference.context.related is a reference to Any
      const assignedRefRule = new AssignmentRule('context.related');
      assignedRefRule.value = new FshReference('Bar'); // Bar is a Patient Instance that has a TestPatient profile
      documentReferenceInstance.rules.push(assignedRefRule); // * context.related = Reference(Bar)

      const exported = exportInstance(documentReferenceInstance);
      expect(exported.context.related).toEqual([
        {
          reference: 'Patient/Bar'
        }
      ]);
    });

    it('should log an error if an instance of a parent type is assigned', () => {
      const resourceInstance = new Instance('MyGeneralResource');
      resourceInstance.instanceOf = 'Resource';
      doc.instances.set(resourceInstance.name, resourceInstance);

      // Subject can be a reference to Patient, Group, Device, or Location, which are all Resources
      // However, the reference must be to an instance of one of those types, not a generic Resource instance
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'Observation';
      const assignedRefRule = new AssignmentRule('subject');
      assignedRefRule.value = new FshReference('MyGeneralResource'); // * subject = Reference(MyGeneralResource)
      observationInstance.rules.push(assignedRefRule);
      doc.instances.set(observationInstance.name, observationInstance);

      const exported = exportInstance(observationInstance);
      expect(exported.subject).toEqual(undefined);
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /The type "Reference\(Resource\)" does not match any of the allowed types\D*/s
      );
    });

    // Assigning using Canonical
    it('should apply an Assignment rule with a valid Canonical entity defined in FSH', () => {
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'Observation';
      doc.instances.set(observationInstance.name, observationInstance);

      const assignedValueRule = new AssignmentRule('code.coding.system');
      assignedValueRule.value = new FshCanonical('VeryRealCodeSystem');
      observationInstance.rules.push(assignedValueRule);

      const realCodeSystem = new FshCodeSystem('VeryRealCodeSystem');
      doc.codeSystems.set(realCodeSystem.name, realCodeSystem);

      const exported = exportInstance(observationInstance);
      expect(exported.code).toEqual({
        coding: [{ system: 'http://hl7.org/fhir/us/minimal/CodeSystem/VeryRealCodeSystem' }]
      });
    });

    it('should apply an Assignment rule with Canonical of a FHIR entity', () => {
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'Observation';
      doc.instances.set(observationInstance.name, observationInstance);

      const assignedValueRule = new AssignmentRule('code.coding.system');
      assignedValueRule.value = new FshCanonical('MedicationRequest');
      observationInstance.rules.push(assignedValueRule);

      const exported = exportInstance(observationInstance);
      expect(exported.code).toEqual({
        coding: [{ system: 'http://hl7.org/fhir/StructureDefinition/MedicationRequest' }]
      });
    });

    it('should apply an Assignment rule with Canonical of a Questionnaire instance', () => {
      const questionnaireInstance = new Instance('MyQuestionnaire');
      questionnaireInstance.usage = 'Definition';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://my.awesome.questions.org/Questionnaire/MyQuestionnaire';
      questionnaireInstance.rules.push(urlRule);
      doc.instances.set(questionnaireInstance.name, questionnaireInstance);

      const responseInstance = new Instance('MyQuestionnaireResponse');
      responseInstance.instanceOf = 'QuestionnaireResponse';
      const assignedValueRule = new AssignmentRule('questionnaire');
      assignedValueRule.value = new FshCanonical('MyQuestionnaire');
      responseInstance.rules.push(assignedValueRule);
      doc.instances.set(responseInstance.name, responseInstance);

      const exported = exportInstance(responseInstance);
      expect(exported.questionnaire).toEqual(
        'http://my.awesome.questions.org/Questionnaire/MyQuestionnaire'
      );
    });

    it('should apply an Assignment rule with Canonical of an inline instance', () => {
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'Observation';
      doc.instances.set(observationInstance.name, observationInstance);

      const inlineInstance = new Instance('MyMedRequest');
      inlineInstance.usage = 'Inline';
      doc.instances.set(inlineInstance.name, inlineInstance);

      const assignedValueRule = new AssignmentRule('code.coding.system');
      assignedValueRule.value = new FshCanonical('MyMedRequest');
      observationInstance.rules.push(assignedValueRule);

      const exported = exportInstance(observationInstance);
      expect(exported.code).toEqual({
        coding: [{ system: '#MyMedRequest' }]
      });
    });

    it('should apply an Assignment rule with Canonical of an instance that has its url assigned by a RuleSet', () => {
      // RuleSet: LibraryMetadata
      // * url = "http://fhir/ig/Library/273"
      // * version = "0.1.0"
      const ruleSet = new RuleSet('LibraryMetadata');
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://fhir/ig/Library/273';
      const versionRule = new AssignmentRule('version');
      versionRule.value = '0.1.0';
      ruleSet.rules.push(urlRule, versionRule);
      doc.ruleSets.set(ruleSet.name, ruleSet);
      // Instance: MyActivity
      // InstanceOf: ActivityDefinition
      // * status = #active
      // * library = Canonical(MyLibrary)
      const activityInstance = new Instance('MyActivity');
      activityInstance.instanceOf = 'ActivityDefinition';
      const activityStatus = new AssignmentRule('status');
      activityStatus.value = new FshCode('active');
      const activityLibrary = new AssignmentRule('library');
      activityLibrary.value = new FshCanonical('MyLibrary');
      activityInstance.rules.push(activityStatus, activityLibrary);
      doc.instances.set(activityInstance.name, activityInstance);
      // Instance: MyLibrary
      // InstanceOf: Library
      // * insert LibraryMetadata
      // * status = #active
      // * type = #logic-library
      const libraryInstance = new Instance('MyLibrary');
      libraryInstance.instanceOf = 'Library';
      const libraryInsert = new InsertRule('');
      libraryInsert.ruleSet = 'LibraryMetadata';
      const libraryStatus = new AssignmentRule('status');
      libraryStatus.value = new FshCode('active');
      const libraryType = new AssignmentRule('type');
      libraryType.value = new FshCode('logic-library');
      libraryInstance.rules.push(libraryInsert, libraryStatus, libraryType);
      doc.instances.set(libraryInstance.name, libraryInstance);

      const instances = exporter.export().instances;
      const exportedActivity = instances.find(
        instanceDefinition => instanceDefinition.id === 'MyActivity'
      );
      expect(exportedActivity.library).toEqual(['http://fhir/ig/Library/273']);
    });

    it('should not apply an Assignment rule with an invalid Canonical entity and log an error', () => {
      const observationInstance = new Instance('MyObservation');
      observationInstance.instanceOf = 'Observation';
      doc.instances.set(observationInstance.name, observationInstance);

      const assignedValueRule = new AssignmentRule('code.coding.system');
      assignedValueRule.value = new FshCanonical('FakeCodeSystem');
      observationInstance.rules.push(assignedValueRule);

      const exported = exportInstance(observationInstance);
      expect(exported.code).toEqual(undefined);
      expect(loggerSpy.getFirstMessage('error')).toMatch(
        /Cannot use canonical URL of FakeCodeSystem because it does not exist.\D*/s
      );
    });

    it('should assign a Canonical that is one of the valid types', () => {
      const assignedRefRule = new AssignmentRule('instantiatesCanonical');
      const pdInstance = new Instance('TestPD');
      pdInstance.instanceOf = 'PlanDefinition';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://example.org/PlanDefition/1';
      pdInstance.rules.push(urlRule);
      doc.instances.set(pdInstance.name, pdInstance);
      assignedRefRule.value = new FshCanonical('TestPD');
      // * instantiatesCanonical = Canonical(TestPD)
      carePlanInstance.rules.push(assignedRefRule);

      const exported = exportInstance(carePlanInstance);
      expect(exported.instantiatesCanonical).toEqual(['http://example.org/PlanDefition/1']); // instantiatesCanonical is set
    });

    it('should assign a Canonical that is one of the valid types (without checking the version) when the type is versioned', () => {
      // Profile: SpecialQuestionnaire
      // Parent: Questionnaire
      // derivedFrom only Canonical(TestQuestionnaire|3.1)
      const specialQuestionnaire = new Profile('SpecialQuestionnaire');
      specialQuestionnaire.parent = 'Questionnaire';
      const onlyRule = new OnlyRule('derivedFrom');
      onlyRule.types = [{ type: 'TestQuestionnaire|3.1', isCanonical: true }];
      specialQuestionnaire.rules.push(onlyRule);
      doc.profiles.set(specialQuestionnaire.name, specialQuestionnaire);
      // Instance: TQInstance
      // InstanceOf: TestQuestionnaire
      // url = "http://example.org/TQ/1"
      const tqInstance = new Instance('TQInstance');
      tqInstance.instanceOf = 'TestQuestionnaire';
      const tqUrl = new AssignmentRule('url');
      tqUrl.value = 'http://example.org/TQ/1';
      tqInstance.rules.push(tqUrl);
      doc.instances.set(tqInstance.name, tqInstance);
      // Instance: SQInstance
      // InstanceOf: SpecialQuestionnaire
      // derivedFrom = Canonical(TQInstance)
      const sqInstance = new Instance('SQInstance');
      sqInstance.instanceOf = 'SpecialQuestionnaire';
      const sqDerivedFrom = new AssignmentRule('derivedFrom');
      sqDerivedFrom.value = new FshCanonical('TQInstance');
      sqInstance.rules.push(sqDerivedFrom);

      const exported = exportInstance(sqInstance);
      expect(exported.derivedFrom).toBeDefined();
      expect(exported.derivedFrom).toEqual(['http://example.org/TQ/1']);
    });

    it('should assign a Canonical that is a child of the valid types', () => {
      const assignedRefRule = new AssignmentRule('instantiatesCanonical');
      const pdProfile = new Profile('PlanDefProfile');
      pdProfile.parent = 'PlanDefinition';
      doc.profiles.set(pdProfile.name, pdProfile);
      const pdInstance = new Instance('PlanDefInstance');
      pdInstance.instanceOf = 'PlanDefProfile';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://example.org/PlanDefition/1';
      pdInstance.rules.push(urlRule);
      doc.instances.set(pdInstance.name, pdInstance);
      assignedRefRule.value = new FshCanonical('PlanDefInstance');
      // * instantiatesCanonical = Canonical(PlanDefInstance)
      carePlanInstance.rules.push(assignedRefRule);

      const exported = exportInstance(carePlanInstance);
      expect(exported.instantiatesCanonical).toEqual(['http://example.org/PlanDefition/1']); // instantiatesCanonical is set
    });

    it('should log an error when an invalid canonical is assigned', () => {
      const assignedRefRule = new AssignmentRule('instantiatesCanonical');
      const vsInstance = new Instance('TestVS');
      vsInstance.instanceOf = 'ValueSet';
      doc.instances.set(vsInstance.name, vsInstance);
      assignedRefRule.value = new FshCanonical('TestVS');
      // * instantiatesCanonical = Canonical(TestVS)
      carePlanInstance.rules.push(assignedRefRule);

      const exported = exportInstance(carePlanInstance);
      expect(exported.instantiatesCanonical).toEqual(undefined); // instantiatesCanonical is not set with invalid type
      expect(loggerSpy.getFirstMessage('error')).toMatch(
        /The type "Canonical\(ValueSet\)" does not match any of the allowed types\D*/s
      );
    });

    it('should log an error when an already exported invalid canonical is assigned', () => {
      const assignedRefRule = new AssignmentRule('instantiatesCanonical');
      const vsInstance = new Instance('TestVS');
      vsInstance.instanceOf = 'ValueSet';
      doc.instances.set(vsInstance.name, vsInstance);
      // First export the VS so that it is fished from  the package instead of FSHTank
      exportInstance(vsInstance);
      assignedRefRule.value = new FshCanonical('TestVS');
      // * instantiatesCanonical = Canonical(TestVS)
      carePlanInstance.rules.push(assignedRefRule);

      const exported = exportInstance(carePlanInstance);
      expect(exported.instantiatesCanonical).toEqual(undefined); // instantiatesCanonical is not set with invalid type
      expect(loggerSpy.getMessageAtIndex(1, 'error')).toMatch(
        /The type "Canonical\(ValueSet\)" does not match any of the allowed types\D*/s
      );
    });

    // Assigning codes from local systems
    it('should assign a code to a top level element while replacing the local code system name with its url', () => {
      const brightInstance = new Instance('BrightObservation');
      brightInstance.instanceOf = 'Observation';
      const assignedCodeRule = new AssignmentRule('code');
      assignedCodeRule.value = new FshCode('bright', 'Visible');
      brightInstance.rules.push(assignedCodeRule);
      doc.instances.set(brightInstance.name, brightInstance);

      const visibleSystem = new FshCodeSystem('Visible');
      doc.codeSystems.set(visibleSystem.name, visibleSystem);
      const exported = exportInstance(brightInstance);
      expect(exported.code.coding).toEqual([
        {
          code: 'bright',
          system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
        }
      ]);
    });

    it('should assign a code with a version to a top level element while replacing the local code system name with its url and use the specified version', () => {
      const brightInstance = new Instance('BrightObservation');
      brightInstance.instanceOf = 'Observation';
      const assignedCodeRule = new AssignmentRule('code');
      assignedCodeRule.value = new FshCode('bright', 'Visible|1.0.0|a'); // Version should include anything that comes after the first |
      brightInstance.rules.push(assignedCodeRule);
      doc.instances.set(brightInstance.name, brightInstance);

      const visibleSystem = new FshCodeSystem('Visible');
      doc.codeSystems.set(visibleSystem.name, visibleSystem);
      const exported = exportInstance(brightInstance);
      expect(exported.code.coding).toEqual([
        {
          code: 'bright',
          version: '1.0.0|a',
          system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
        }
      ]);
    });

    it('should assign a code to a top level element if the code system was defined as an instance of usage definition', () => {
      const visibleSystem = new Instance('Visible');
      visibleSystem.instanceOf = 'CodeSystem';
      visibleSystem.usage = 'Definition';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://hl7.org/fhir/us/minimal/Instance/Visible';
      const nameRule = new AssignmentRule('name');
      nameRule.value = 'Visible';
      visibleSystem.rules.push(urlRule, nameRule);
      doc.instances.set(visibleSystem.name, visibleSystem);
      exportInstance(visibleSystem);

      const brightInstance = new Instance('BrightObservation');
      brightInstance.instanceOf = 'Observation';
      const assignedCodeRule = new AssignmentRule('code');
      assignedCodeRule.value = new FshCode('bright', 'Visible');
      brightInstance.rules.push(assignedCodeRule);
      doc.instances.set(brightInstance.name, brightInstance);

      const exported = exportInstance(brightInstance);
      expect(exported.code.coding).toEqual([
        {
          code: 'bright',
          system: 'http://hl7.org/fhir/us/minimal/Instance/Visible'
        }
      ]);
    });

    it('should not assign a code to a top level element if the system references an instance that is not a CodeSystem', () => {
      const invalidSystem = new Instance('NonSystem');
      invalidSystem.instanceOf = 'CapabilityStatement';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://hl7.org/fhir/us/minimal/Instance/NonSystem';
      invalidSystem.rules.push(urlRule);
      doc.instances.set(invalidSystem.name, invalidSystem);
      exportInstance(invalidSystem);

      const brightInstance = new Instance('BrightObservation');
      brightInstance.instanceOf = 'Observation';
      const assignedCodeRule = new AssignmentRule('code');
      assignedCodeRule.value = new FshCode('bright', 'NonSystem');
      brightInstance.rules.push(assignedCodeRule);
      doc.instances.set(brightInstance.name, brightInstance);

      const exported = exportInstance(brightInstance);
      expect(loggerSpy.getAllMessages('error')).toContain(
        'Resolved value "NonSystem" is not a valid URI.'
      );
      expect(exported.code).not.toBeDefined();
    });

    it('should not assign a code to a top level element if the code system was defined as an instance of a non-definition usage', () => {
      const invalidSystem = new Instance('NonDefinition');
      invalidSystem.instanceOf = 'CodeSystem';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://hl7.org/fhir/us/minimal/Instance/NonDefinition';
      const nameRule = new AssignmentRule('name');
      nameRule.value = 'Visible';
      invalidSystem.rules.push(urlRule, nameRule);
      doc.instances.set(invalidSystem.name, invalidSystem);
      exportInstance(invalidSystem);

      const brightInstance = new Instance('BrightObservation');
      brightInstance.instanceOf = 'Observation';
      const assignedCodeRule = new AssignmentRule('code');
      assignedCodeRule.value = new FshCode('bright', 'NonDefinition');
      brightInstance.rules.push(assignedCodeRule);
      doc.instances.set(brightInstance.name, brightInstance);

      const exported = exportInstance(brightInstance);
      expect(loggerSpy.getAllMessages('error')).toContain(
        'Resolved value "NonDefinition" is not a valid URI.'
      );
      expect(exported.code).not.toBeDefined();
    });

    it('should assign a code to a nested element while replacing the local code system name with its url', () => {
      const brightInstance = new Instance('BrightObservation');
      brightInstance.instanceOf = 'Observation';
      const assignedCodeRule = new AssignmentRule('component[0].code');
      assignedCodeRule.value = new FshCode('bright', 'Visible');
      brightInstance.rules.push(assignedCodeRule);
      doc.instances.set(brightInstance.name, brightInstance);

      const visibleSystem = new FshCodeSystem('Visible');
      doc.codeSystems.set(visibleSystem.name, visibleSystem);
      const exported = exportInstance(brightInstance);
      expect(exported.component[0].code.coding).toEqual([
        {
          code: 'bright',
          system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
        }
      ]);
    });

    // Assigning codes from systems in the fisher.fhir (core fhir package or dependencies)
    it('should assign a code from a CodeSystem in the fisher by name', () => {
      // allergyintolerance-clinical is the id of a CodeSystem in the R4 definitions
      const observation = new Instance('MyObservation');
      observation.instanceOf = 'Observation';
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      const assignedCodeRule = new AssignmentRule('code');
      assignedCodeRule.value = new FshCode('test-code', 'allergyintolerance-clinical'); // id
      observation.rules.push(assignedCodeRule, statusRule);
      doc.instances.set(observation.name, observation);

      const exported = exportInstance(observation);
      expect(exported.code).toEqual({
        coding: [
          {
            code: 'test-code',
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
          }
        ]
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should assign a code from a CodeSystem in the fisher by id', () => {
      // AllergyIntoleranceClinicalStatusCodes is the name of a CodeSystem in the R4 definitions
      const observation = new Instance('MyObservation');
      observation.instanceOf = 'Observation';
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      const assignedCodeRule = new AssignmentRule('code');
      assignedCodeRule.value = new FshCode('test-code', 'AllergyIntoleranceClinicalStatusCodes'); // name
      observation.rules.push(assignedCodeRule, statusRule);
      doc.instances.set(observation.name, observation);

      const exported = exportInstance(observation);
      expect(exported.code).toEqual({
        coding: [
          {
            code: 'test-code',
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
          }
        ]
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should assign a code from a CodeSystem in the fisher by url', () => {
      // http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical is the url of a CodeSystem in the R4 definitions
      const observation = new Instance('MyObservation');
      observation.instanceOf = 'Observation';
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      const assignedCodeRule = new AssignmentRule('code');
      assignedCodeRule.value = new FshCode(
        'test-code',
        'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
      ); // url
      observation.rules.push(assignedCodeRule, statusRule);
      doc.instances.set(observation.name, observation);

      const exported = exportInstance(observation);
      expect(exported.code).toEqual({
        coding: [
          {
            code: 'test-code',
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
          }
        ]
      });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    // Assigning Quantities with value 0 (e.g., Age)
    it('should assign a Quantity with value 0 (and not drop the 0)', () => {
      const observationInstance = new Instance('ZeroValueObservation');
      observationInstance.instanceOf = 'Observation';
      const assignedValueQuantityRule = new AssignmentRule('valueQuantity');
      assignedValueQuantityRule.value = new FshQuantity(
        0,
        new FshCode('mm', 'http://unitsofmeasure.org', 'mm')
      );
      observationInstance.rules.push(assignedValueQuantityRule);
      doc.instances.set(observationInstance.name, observationInstance);
      const exported = exportInstance(observationInstance);
      expect(exported.valueQuantity).toEqual({
        value: 0,
        code: 'mm',
        system: 'http://unitsofmeasure.org',
        unit: 'mm'
      });
    });

    // Assigning Quantities to Quantity specializations (e.g., Age)
    it('should assign a Quantity to a Quantity specialization', () => {
      const conditionInstance = new Instance('SomeCondition');
      conditionInstance.instanceOf = 'Condition';
      const assignedAgeRule = new AssignmentRule('onsetAge');
      assignedAgeRule.value = new FshQuantity(
        42.0,
        new FshCode('a', 'http://unitsofmeasure.org', 'years')
      );
      conditionInstance.rules.push(assignedAgeRule);
      doc.instances.set(conditionInstance.name, conditionInstance);
      const exported = exportInstance(conditionInstance);
      expect(exported.onsetAge).toEqual({
        value: 42.0,
        code: 'a',
        system: 'http://unitsofmeasure.org',
        unit: 'years'
      });
    });

    // Sliced elements
    it('should assign a single sliced element to a value', () => {
      const assignedValRule = new AssignmentRule('extension[level].valueCoding.system');
      assignedValRule.value = 'foo';
      patientProfInstance.rules.push(assignedValRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([{ url: 'level', valueCoding: { system: 'foo' } }]);
    });

    it('should assign a single primitive sliced element to a value', () => {
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
      const assignedRule = new AssignmentRule('name[0].prefix[Dr]');
      assignedRule.value = 'Doctor';
      // * name[0].prefix[Dr] = "Doctor"
      patientInstance.rules.push(assignedRule);
      const exported = exportInstance(patientInstance);
      expect(exported.name).toEqual([
        {
          prefix: ['Doctor']
        }
      ]);
    });

    it('should assign sliced elements in an array that are assigned in order', () => {
      const fooRule = new AssignmentRule('extension[type][0].valueCoding.system');
      fooRule.value = 'foo';
      patientProfInstance.rules.push(fooRule);
      const barRule = new AssignmentRule('extension[type][1].valueCoding.system');
      barRule.value = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type', valueCoding: { system: 'foo' } },
        { url: 'type', valueCoding: { system: 'bar' } }
      ]);
    });

    it('should assign a sliced primitive array', () => {
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
      const assignedRule1 = new AssignmentRule('name[0].prefix[Dr][0]');
      assignedRule1.value = 'Doctor';
      const assignedRule2 = new AssignmentRule('name[0].prefix[Dr][1]');
      assignedRule2.value = 'Mister Doctor';
      // * name[0].prefix[Dr][0] = "Doctor"
      // * name[0].prefix[Dr][1] = "Mister Doctor"
      patientInstance.rules.push(assignedRule1, assignedRule2);
      const exported = exportInstance(patientInstance);
      expect(exported.name).toEqual([
        {
          prefix: ['Doctor', 'Mister Doctor']
        }
      ]);
    });

    it('should assign a sliced element in an array that is assigned by multiple rules', () => {
      const fooRule = new AssignmentRule('extension[type][1].valueCoding.system');
      fooRule.value = 'foo';
      patientProfInstance.rules.push(fooRule);
      const barRule = new AssignmentRule('extension[type][1].valueCoding.version');
      barRule.value = '1.2.3';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type' },
        { url: 'type', valueCoding: { system: 'foo', version: '1.2.3' } }
      ]);
    });

    it('should assign sliced elements in an array that are assigned out of order', () => {
      const fooRule = new AssignmentRule('extension[type][1].valueCoding.system');
      fooRule.value = 'foo';
      patientProfInstance.rules.push(fooRule);
      const barRule = new AssignmentRule('extension[type][0].valueCoding.system');
      barRule.value = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type', valueCoding: { system: 'bar' } },
        { url: 'type', valueCoding: { system: 'foo' } }
      ]);
    });

    it('should assign sliced elements in an array and fill empty values', () => {
      const fooRule = new AssignmentRule('extension[type][1].valueCoding.system');
      fooRule.value = 'foo';
      patientProfInstance.rules.push(fooRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type' },
        { url: 'type', valueCoding: { system: 'foo' } }
      ]);
    });

    it('should assign mixed sliced elements in an array', () => {
      const fooRule = new AssignmentRule('extension[type][0].valueCoding.system');
      fooRule.value = 'foo';
      patientProfInstance.rules.push(fooRule);
      const bazRule = new AssignmentRule('extension[level].valueCoding.system');
      bazRule.value = 'baz';
      patientProfInstance.rules.push(bazRule);
      const barRule = new AssignmentRule('extension[type][1].valueCoding.system');
      barRule.value = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type', valueCoding: { system: 'foo' } },
        { url: 'level', valueCoding: { system: 'baz' } },
        { url: 'type', valueCoding: { system: 'bar' } }
      ]);
    });

    it('should assign mixed sliced elements in an array out of order', () => {
      const fooRule = new AssignmentRule('extension[type][1].valueCoding.system');
      fooRule.value = 'foo';
      patientProfInstance.rules.push(fooRule);
      const bazRule = new AssignmentRule('extension[level].valueCoding.system');
      bazRule.value = 'baz';
      patientProfInstance.rules.push(bazRule);
      const barRule = new AssignmentRule('extension[type][0].valueCoding.system');
      barRule.value = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        { url: 'type', valueCoding: { system: 'bar' } },
        { url: 'type', valueCoding: { system: 'foo' } },
        { url: 'level', valueCoding: { system: 'baz' } }
      ]);
    });

    it('should assign a sliced extension element that is referred to by name', () => {
      const fooExtension = new Extension('FooExtension');
      doc.extensions.set(fooExtension.name, fooExtension);
      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'foo', type: 'FooExtension' }];
      patientProf.rules.push(containsRule);
      const barRule = new AssignmentRule('extension[foo].valueString');
      barRule.value = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/FooExtension',
          valueString: 'bar'
        }
      ]);
    });

    it('should assign a nested sliced extension element that is referred to by name', () => {
      const fooExtension = new Extension('FooExtension');
      doc.extensions.set(fooExtension.name, fooExtension);
      const containsRule = new ContainsRule('maritalStatus.extension');
      containsRule.items = [{ name: 'foo', type: 'FooExtension' }];
      patient.rules.push(containsRule);
      const barRule = new AssignmentRule('maritalStatus.extension[foo].valueString');
      barRule.value = 'bar';
      const maritalRule = new AssignmentRule('maritalStatus');
      maritalRule.value = new FshCode('boo');
      patientInstance.rules.push(maritalRule, barRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus).toEqual({
        extension: [
          {
            url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/FooExtension',
            valueString: 'bar'
          }
        ],
        coding: [
          {
            code: 'boo'
          }
        ]
      });
    });

    it('should assign a sliced extension element that is referred to by url', () => {
      const fooExtension = new Extension('FooExtension');
      doc.extensions.set(fooExtension.name, fooExtension);
      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'foo', type: 'FooExtension' }];
      patientProf.rules.push(containsRule);
      const barRule = new AssignmentRule(
        'extension[http://hl7.org/fhir/us/minimal/StructureDefinition/FooExtension].valueString'
      );
      barRule.value = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/FooExtension',
          valueString: 'bar'
        }
      ]);
    });

    it('should assign a sliced extension element that is referred to by aliased url', () => {
      const fooExtension = new Extension('FooExtension');
      doc.aliases.set(
        'FooAlias',
        'http://hl7.org/fhir/us/minimal/StructureDefinition/FooExtension'
      );
      doc.extensions.set(fooExtension.name, fooExtension);
      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'foo', type: 'FooExtension' }];
      patientProf.rules.push(containsRule);
      const barRule = new AssignmentRule('extension[FooAlias].valueString');
      barRule.value = 'bar';
      patientProfInstance.rules.push(barRule);
      const exported = exportInstance(patientProfInstance);
      expect(exported.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/FooExtension',
          valueString: 'bar'
        }
      ]);
    });

    it('should assign an extension that is defined but not present on the SD', () => {
      const fooExtension = new Extension('FooExtension');
      doc.aliases.set(
        'FooAlias',
        'http://hl7.org/fhir/us/minimal/StructureDefinition/FooExtension'
      );
      doc.extensions.set(fooExtension.name, fooExtension);
      const barRule = new AssignmentRule('extension[FooAlias].valueString');
      barRule.value = 'bar';
      patientInstance.rules.push(barRule);
      const exported = exportInstance(patientInstance);
      expect(exported.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/FooExtension',
          valueString: 'bar'
        }
      ]);
    });

    it('should not assign an extension that is not defined and not present on the SD', () => {
      const barRule = new AssignmentRule('extension[FooAlias].valueString');
      barRule.value = 'bar';
      patientInstance.rules.push(barRule);
      const exported = exportInstance(patientInstance);
      expect(exported.extension).toBeUndefined();
    });

    it('should log an error when a modifier extension is assigned to an extension path', () => {
      // Extension: StrangeExtension
      // * . ?!
      const strangeExtension = new Extension('StrangeExtension');
      const modifierRule = new FlagRule('.');
      modifierRule.modifier = true;
      strangeExtension.rules.push(modifierRule);
      doc.extensions.set(strangeExtension.name, strangeExtension);
      // Instance: StrangeInstance
      // InstanceOf: StrangeExtension
      // Usage: #inline
      const strangeInstance = new Instance('StrangeInstance');
      strangeInstance.instanceOf = 'StrangeExtension';
      strangeInstance.usage = 'Inline';
      doc.instances.set(strangeInstance.name, strangeInstance);
      // Instance: Bar
      // InstanceOf: TestPatient
      // extension[0] = StrangeInstance
      const strangeRule = new AssignmentRule('extension[0]')
        .withFile('Strange.fsh')
        .withLocation([5, 3, 5, 28]);
      strangeRule.value = 'StrangeInstance';
      strangeRule.isInstance = true;
      patientInstance.rules.push(strangeRule);
      const exported = exportInstance(patientInstance);
      expect(exported.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/StrangeExtension'
        }
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Instance of modifier extension StrangeExtension assigned to extension path\. Modifier extensions should only be assigned to modifierExtension paths\..*File: Strange\.fsh.*Line: 5\D*/s
      );
    });

    it('should log an error when a non-modifier extension is assigned to a modifierExtension path', () => {
      // Extension: StrangeExtension
      const strangeExtension = new Extension('StrangeExtension');
      doc.extensions.set(strangeExtension.name, strangeExtension);
      // Instance: StrangeInstance
      // InstanceOf: StrangeExtension
      // Usage: #inline
      const strangeInstance = new Instance('StrangeInstance');
      strangeInstance.instanceOf = 'StrangeExtension';
      strangeInstance.usage = 'Inline';
      doc.instances.set(strangeInstance.name, strangeInstance);
      // Instance: Bar
      // InstanceOf: TestPatient
      // modifierExtension[0] = StrangeInstance
      const strangeRule = new AssignmentRule('modifierExtension[0]')
        .withFile('Strange.fsh')
        .withLocation([5, 3, 5, 28]);
      strangeRule.value = 'StrangeInstance';
      strangeRule.isInstance = true;
      patientInstance.rules.push(strangeRule);
      const exported = exportInstance(patientInstance);
      expect(exported.modifierExtension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/StrangeExtension'
        }
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Instance of non-modifier extension StrangeExtension assigned to modifierExtension path\. Non-modifier extensions should only be assigned to extension paths\..*File: Strange\.fsh.*Line: 5\D*/s
      );
    });

    it('should log an error when a modifier extension is used on an extension element as part of a longer path', () => {
      // Extension: StrangeExtension
      // * value[x] only string
      // * . ?!
      const strangeExtension = new Extension('StrangeExtension');
      const onlyRule = new OnlyRule('value[x]');
      onlyRule.types = [{ type: 'string' }];
      const modifierRule = new FlagRule('.');
      modifierRule.modifier = true;
      strangeExtension.rules.push(onlyRule, modifierRule);
      doc.extensions.set(strangeExtension.name, strangeExtension);
      // Instance: Bar
      // InstanceOf: TestPatient
      // extension[StrangeExtension].valueString = "This is strange"
      const strangeRule = new AssignmentRule('extension[StrangeExtension].valueString')
        .withFile('Strange.fsh')
        .withLocation([7, 7, 7, 19]);
      strangeRule.value = 'This is strange';
      patientInstance.rules.push(strangeRule);
      const exported = exportInstance(patientInstance);
      expect(exported.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/StrangeExtension',
          valueString: 'This is strange'
        }
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Modifier extension StrangeExtension used on extension element\. Modifier extensions should only be used with modifierExtension elements\..*File: Strange\.fsh.*Line: 7\D*/s
      );
    });

    it('should log an error when a modifier extension is used on an extension element in the middle of a path', () => {
      // Extension: StrangeExtension
      // * value[x] only string
      // * . ?!
      const strangeExtension = new Extension('StrangeExtension');
      const onlyRule = new OnlyRule('value[x]');
      onlyRule.types = [{ type: 'string' }];
      const modifierRule = new FlagRule('.');
      modifierRule.modifier = true;
      strangeExtension.rules.push(onlyRule, modifierRule);
      doc.extensions.set(strangeExtension.name, strangeExtension);
      // Instance: Bar
      // InstanceOf: TestPatient
      // maritalStatus.extension[StrangeExtension].valueString = "This is strange"
      const strangeRule = new AssignmentRule(
        'maritalStatus.extension[StrangeExtension].valueString'
      )
        .withFile('Strange.fsh')
        .withLocation([9, 5, 9, 23]);
      strangeRule.value = 'This is strange';
      patientInstance.rules.push(strangeRule);
      const exported = exportInstance(patientInstance);
      expect(exported.maritalStatus.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/StrangeExtension',
          valueString: 'This is strange'
        }
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Modifier extension StrangeExtension used on extension element\. Modifier extensions should only be used with modifierExtension elements\..*File: Strange\.fsh.*Line: 9\D*/s
      );
    });

    it('should log an error when a non-modifier extension is used on a modifierExtension element as part of a longer path', () => {
      // Extension: StrangeExtension
      // * value[x] only string
      const strangeExtension = new Extension('StrangeExtension');
      const onlyRule = new OnlyRule('value[x]');
      onlyRule.types = [{ type: 'string' }];
      strangeExtension.rules.push(onlyRule);
      doc.extensions.set(strangeExtension.name, strangeExtension);
      // Instance: Bar
      // InstanceOf: TestPatient
      // * modifierExtension[StrangeExtension].valueString = "This is normal"
      const strangeRule = new AssignmentRule('modifierExtension[StrangeExtension].valueString')
        .withFile('Strange.fsh')
        .withLocation([6, 7, 6, 19]);
      strangeRule.value = 'This is normal';
      patientInstance.rules.push(strangeRule);
      const exported = exportInstance(patientInstance);
      expect(exported.modifierExtension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/StrangeExtension',
          valueString: 'This is normal'
        }
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Non-modifier extension StrangeExtension used on modifierExtension element\. Non-modifier extensions should only be used with extension elements\..*File: Strange\.fsh.*Line: 6\D*/s
      );
    });

    it.skip('should throw when ordered is set in the discriminator but slices arrive out of order', () => {
      const assignedValRule = new AssignmentRule('result[Triglyceride].display');
      assignedValRule.value = 'foo';
      lipidInstance.rules.push(assignedValRule);
      // Feel free to change this error message when actually implementing
      expect(() => exportInstance(lipidInstance)).toThrow(
        'Slice Triglyceride of result assigned out of order'
      );
    });

    it.skip('should throw if incorrect elements are added when the slicing is closed', () => {
      const assignedValRule = new AssignmentRule('result[0].display');
      assignedValRule.value = 'foo';
      lipidInstance.rules.push(assignedValRule);
      expect(() => exportInstance(lipidInstance)).toThrow(
        'Slicing on result is closed, only named slices may be added'
      );
    });

    it.skip('should assign sliced elements on a sliced primitive', () => {
      /* Need example of sliced primitive */
    });

    // Content Reference
    it('should assign a child of a contentReference element', () => {
      const barRule = new AssignmentRule('compose.exclude.version');
      barRule.value = 'bar';
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

    it('should log an error when an element required by an incomplete assigned parent is not present', () => {
      const cardRule = new CardRule('maritalStatus.text');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      const assignedValueRule = new AssignmentRule('maritalStatus');
      assignedValueRule.value = new FshCode('foo');
      patientInstance.rules.push(assignedValueRule);
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
      const assignedValueRule = new AssignmentRule('contact[0].gender');
      assignedValueRule.value = new FshCode('F');
      patientInstance.rules.push(assignedValueRule);
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
      const assignedValueRule1 = new AssignmentRule('contact[0].relationship');
      assignedValueRule1.value = new FshCode('Looking for love');
      patientInstance.rules.push(assignedValueRule1);
      const assignedValueRule2 = new AssignmentRule('contact[1].relationship');
      assignedValueRule2.value = new FshCode('Complicated');
      patientInstance.rules.push(assignedValueRule2);
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
      const assignedValueRule = new AssignmentRule('deceasedBoolean');
      assignedValueRule.value = true;
      patientInstance.rules.push(assignedValueRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getAllMessages('error').length).toBe(originalLength);
    });

    it('should log an error when a required sliced element is not present', () => {
      const assignedValueRule = new AssignmentRule('result[Cholesterol]');
      assignedValueRule.value = new FshReference('Fsh are friends');
      lipidInstance.rules.push(assignedValueRule);
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

    it('should not log an error when a required sliced element could be satisfied by elements without a sliceName', () => {
      const assignedValueRule = new AssignmentRule('result[0]');
      assignedValueRule.value = new FshReference('Fsh are friends');
      lipidInstance.rules.push(assignedValueRule);
      exportInstance(lipidInstance);
      const messages = loggerSpy.getAllMessages('error');
      // No errors relating to specific slices are logged, since result[0] could be referring to any of them
      expect(messages[messages.length - 2]).toMatch(
        /DiagnosticReport.status.*File: LipidInstance\.fsh.*Line: 10 - 20/s
      );
      expect(messages[messages.length - 1]).toMatch(
        /DiagnosticReport.result.*File: LipidInstance\.fsh.*Line: 10 - 20/s
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

    it('should not log an error when a required choice element has an extension on a complex type choice', () => {
      // Profile: TestObservation
      // Parent: Observation
      // * effective[x] 1..1
      const observationProfile = new Profile('TestObservation');
      observationProfile.parent = 'Observation';
      const cardRule = new CardRule('effective[x]');
      cardRule.min = 1;
      cardRule.max = '1';
      observationProfile.rules.push(cardRule);
      doc.profiles.set(observationProfile.name, observationProfile);
      // Instance: HasExtension
      // InstanceOf: TestObservation
      // * status = #final
      // * code = #1234
      // * effectiveQuantity.extension.url = "http://example.org/SomeExtension"
      // * effectiveQuantity.extension.valueInteger = 7
      const observationInstance = new Instance('HasExtension');
      observationInstance.instanceOf = 'TestObservation';
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('final');
      const codeRule = new AssignmentRule('code');
      codeRule.value = new FshCode('1234');
      const extensionUrlRule = new AssignmentRule('effectivePeriod.extension.url');
      extensionUrlRule.value = 'http://example.org/SomeExtension';
      const extensionValueRule = new AssignmentRule('effectivePeriod.extension.valueInteger');
      extensionValueRule.value = 7;
      observationInstance.rules.push(statusRule, codeRule, extensionUrlRule, extensionValueRule);
      doc.instances.set(observationInstance.name, observationInstance);
      exportInstance(observationInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not log an error when a required choice element has an extension on a primitive type choice', () => {
      const cardRule = new CardRule('deceased[x]');
      cardRule.min = 1;
      cardRule.max = '1';
      patient.rules.push(cardRule);
      const extensionUrl = new AssignmentRule('deceasedBoolean.extension.url');
      extensionUrl.value = 'http://example.org/StrutureDefinition/SomeExtension';
      const extensionValue = new AssignmentRule('deceasedBoolean.extension.valueCode');
      extensionValue.value = new FshCode('complicated');
      patientInstance.rules.push(extensionUrl, extensionValue);
      exportInstance(patientInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when a required primitive child element is not present', () => {
      const cardRule1 = new CardRule('active.id');
      cardRule1.min = 1;
      cardRule1.max = '1';
      const cardRule2 = new CardRule('active');
      cardRule2.min = 1;
      cardRule2.max = '1';
      // * active.id 1..1
      // * active 1..1
      patient.rules.push(cardRule1, cardRule2);
      const activeRule = new AssignmentRule('active');
      activeRule.value = true;
      // * active = true
      patientInstance.rules.push(activeRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Patient.active.id has minimum cardinality 1 but occurs 0 time\(s\).*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should not log an error when a required primitive child element is present', () => {
      const cardRule1 = new CardRule('active.id');
      cardRule1.min = 1;
      cardRule1.max = '1';
      const cardRule2 = new CardRule('active');
      cardRule2.min = 1;
      cardRule2.max = '1';
      // * active.id 1..1
      // * active 1..1
      patient.rules.push(cardRule1, cardRule2);
      const idRule = new AssignmentRule('active.id');
      idRule.value = 'foo';
      // * active.id = "foo"
      patientInstance.rules.push(idRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when a required primitive child array is not large enough', () => {
      const cardRule1 = new CardRule('active.extension');
      cardRule1.min = 2;
      cardRule1.max = '*';
      const cardRule2 = new CardRule('active');
      cardRule2.min = 1;
      cardRule2.max = '1';
      // * active.extension 2..*
      // * active 1..1
      patient.rules.push(cardRule1, cardRule2);
      const activeRule = new AssignmentRule('active');
      activeRule.value = true;
      const extensionRule = new AssignmentRule('active.extension.url');
      extensionRule.value = 'http://example.com';
      // * active = true
      // * active.extension.url = "http://example.com"
      patientInstance.rules.push(activeRule, extensionRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Patient.active.extension has minimum cardinality 2 but occurs 1 time\(s\).*File: PatientInstance\.fsh.*Line: 10 - 20/s
      );
    });

    it('should not log an error when a required primitive child array is large enough', () => {
      const cardRule1 = new CardRule('active.extension');
      cardRule1.min = 1;
      cardRule1.max = '*';
      const cardRule2 = new CardRule('active');
      cardRule2.min = 1;
      cardRule2.max = '1';
      // * active.extension 1..*
      // * active 1..1
      patient.rules.push(cardRule1, cardRule2);
      const idRule = new AssignmentRule('active.extension.url');
      idRule.value = 'http://example.com';
      // * active.extension.url = "http://example.com"
      patientInstance.rules.push(idRule);
      exportInstance(patientInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not log an error when a connected element fulfills the cardinality constraint', () => {
      const caretRule = new CaretValueRule('item');
      caretRule.caretPath = 'slicing.discriminator.path';
      caretRule.value = 'type';
      const dTypeRule = new CaretValueRule('item');
      dTypeRule.caretPath = 'slicing.discriminator.type';
      dTypeRule.value = new FshCode('value');
      const rulesRule = new CaretValueRule('item');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ContainsRule('item');
      containsRule.items.push({ name: 'boo' });
      const cardRule = new CardRule('item[boo]');
      cardRule.min = 0;
      cardRule.max = '1';
      // * item ^slicing.discriminator[0].path = "type"
      // * item ^slicing.discriminator[0].type = #value
      // * item ^slicing.rules = #open
      // * item contains boo 0..1
      questionnaire.rules.push(caretRule, dTypeRule, rulesRule, containsRule, cardRule);
      const answerRule = new AssignmentRule('item[boo].answerOption[0].valueString');
      answerRule.value = 'foo';
      const linkIdRule = new AssignmentRule('item[boo].linkId');
      linkIdRule.value = 'bar';
      const typeRule = new AssignmentRule('item[boo].type');
      typeRule.value = new FshCode('group');
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      // * item[boo].answerOption[0].valueString = "foo"
      // * item[boo].linkId = "bar"
      // * item[boo].type = #group
      // * status = #active
      const questionnaireInstance = new Instance('Test');
      questionnaireInstance.instanceOf = 'TestQuestionnaire';
      questionnaireInstance.rules.push(answerRule, linkIdRule, typeRule, statusRule);
      exportInstance(questionnaireInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should properly validate slices with child elements of differing cardinalities', () => {
      const caretRule = new CaretValueRule('payload');
      caretRule.caretPath = 'slicing.discriminator.path';
      caretRule.value = 'content.url';
      const dTypeRule = new CaretValueRule('payload');
      dTypeRule.caretPath = 'slicing.discriminator.type';
      dTypeRule.value = new FshCode('exists');
      const rulesRule = new CaretValueRule('payload');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('closed');
      const containsRule = new ContainsRule('payload');
      containsRule.items.push({ name: 'inline' }, { name: 'link' }, { name: 'extra' });
      const onlyRule1 = new OnlyRule('payload[inline].content[x]');
      onlyRule1.types = [{ type: 'Attachment' }];
      const onlyRule2 = new OnlyRule('payload[link].content[x]');
      onlyRule2.types = [{ type: 'Attachment' }];
      const onlyRule3 = new OnlyRule('payload[extra].content[x]');
      onlyRule3.types = [{ type: 'string' }];
      const inlineCardRule1 = new CardRule('payload[inline].contentAttachment.url');
      inlineCardRule1.max = '0';
      const inlineCardRule2 = new CardRule('payload[inline].contentAttachment.data');
      inlineCardRule2.min = 1;
      const inlineCardRule3 = new CardRule('payload[inline].contentAttachment.contentType');
      inlineCardRule3.min = 1;
      const inlineAssignmentRule = new AssignmentRule(
        'payload[inline].contentAttachment.contentType'
      );
      inlineAssignmentRule.value = new FshCode('text/plain');
      const linkCardRule1 = new CardRule('payload[link].contentAttachment.url');
      linkCardRule1.min = 1;
      linkCardRule1.max = '1';
      const linkCardRule2 = new CardRule('payload[link].contentAttachment.data');
      linkCardRule2.max = '0';
      const linkCardRule3 = new CardRule('payload[link].contentAttachment.contentType');
      linkCardRule3.min = 1;
      const linkAssignmentRule = new AssignmentRule('payload[link].contentAttachment.contentType');
      linkAssignmentRule.value = new FshCode('image/png');
      // * payload contains
      //     inline 1..1 and
      //     link 0..* and
      //     extra 0..*
      // * payload[inline].content[x] only Attachment
      // * payload[inline].contentAttachment.url ..0
      // * payload[inline].contentAttachment.data 1..
      // * payload[inline].contentAttachment.contentType 1..
      // * payload[inline].contentAttachment.contentType = #text/plain
      // * payload[link].content[x] only Attachment
      // * payload[link].contentAttachment.url 1..1
      // * payload[link].contentAttachment.data ..0
      // * payload[link].contentAttachment.contentType 1..
      // * payload[link].contentAttachment.contentType = #image/png
      // * payload[extra].content[x] only string
      communicationProf.rules.push(
        caretRule,
        dTypeRule,
        rulesRule,
        containsRule,
        onlyRule1,
        inlineCardRule1,
        inlineCardRule2,
        inlineCardRule3,
        onlyRule2,
        linkCardRule1,
        linkCardRule2,
        linkCardRule3,
        onlyRule3,
        inlineAssignmentRule,
        linkAssignmentRule
      );
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      const inlineCTAssignmentRule = new AssignmentRule(
        'payload[inline].contentAttachment.contentType'
      );
      inlineCTAssignmentRule.value = new FshCode('text/plain');
      const inlineDataAssignmentRule = new AssignmentRule('payload[inline].contentAttachment.data');
      inlineDataAssignmentRule.value = 'OR3sMFkRaXsOtHff85+zrL+DXU3s5nkfIenVwcokMUx1qh8=';
      const linkCTAssignmentRule = new AssignmentRule(
        'payload[link].contentAttachment.contentType'
      );
      linkCTAssignmentRule.value = new FshCode('image/png');
      const linkUrlAssignmentRule = new AssignmentRule('payload[link].contentAttachment.url');
      linkUrlAssignmentRule.value = 'Binary/1234';
      const stringAssignmentRule = new AssignmentRule('payload[extra].contentString');
      stringAssignmentRule.value = 'Extra Content';
      // * status = #completed
      // * payload[inline].contentAttachment.contentType = #text/plain
      // * payload[inline].contentAttachment.data = "OR3sMFkRaXsOtHff85+zrL+DXU3s5nkfIenVwcokMUx1qh8="
      // * payload[link].contentAttachment.contentType = #image/png
      // * payload[link].contentAttachment.url = "Binary/1234"
      // * payload[extra].contentString = "Extra content"
      communicationInstance.rules.push(
        statusRule,
        inlineCTAssignmentRule,
        inlineDataAssignmentRule,
        linkCTAssignmentRule,
        linkUrlAssignmentRule,
        stringAssignmentRule
      );
      exportInstance(communicationInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log a warning when a pre-loaded element in a sliced array is accessed with a numeric index', () => {
      const caretRule = new CaretValueRule('code');
      caretRule.caretPath = 'slicing.discriminator.path';
      caretRule.value = 'type';
      const dTypeRule = new CaretValueRule('code');
      dTypeRule.caretPath = 'slicing.discriminator.type';
      dTypeRule.value = new FshCode('value');
      const rulesRule = new CaretValueRule('code');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ContainsRule('code');
      containsRule.items.push({ name: 'boo' });
      const cardRule = new CardRule('code[boo]');
      cardRule.min = 1;
      cardRule.max = '1';
      const codeRule = new AssignmentRule('code[boo]');
      codeRule.value = new FshCode('1-8', 'http://loinc.org/', 'Acyclovir [Susceptibility]');
      // * code ^slicing.discriminator[0].path = "type"
      // * code ^slicing.discriminator[0].type = #value
      // * code ^slicing.rules = #open
      // * code contains boo 1..1
      // * code[boo] = http://loinc.org#1-8 "Acyclovir [Susceptibility]"
      questionnaire.rules.push(caretRule, dTypeRule, rulesRule, containsRule, cardRule, codeRule);
      const linkIdRule = new AssignmentRule('item[0].linkId');
      linkIdRule.value = 'bar';
      const typeRule = new AssignmentRule('item[0].type');
      typeRule.value = new FshCode('group');
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      const codeAssignmentRule = new AssignmentRule('code[0]');
      codeAssignmentRule.value = new FshCode('otherCode', 'http://loinc.org/', 'OtherDisplay');
      // * item[0].linkId = "bar"
      // * item[0].type = #group
      // * status = #active
      // * code[0] = http://loinc.org#otherCode "OtherDisplay"
      const questionnaireInstance = new Instance('Test');
      questionnaireInstance.instanceOf = 'TestQuestionnaire';
      questionnaireInstance.rules.push(statusRule, linkIdRule, typeRule, codeAssignmentRule);
      exportInstance(questionnaireInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toBe(
        'Sliced element Questionnaire.code is being accessed via numeric index. Use slice names in rule paths when possible.'
      );
    });

    it('should log a warning when the child of a pre-loaded element in a sliced array is accessed with a numeric index', () => {
      const caretRule = new CaretValueRule('item');
      caretRule.caretPath = 'slicing.discriminator.path';
      caretRule.value = 'type';
      const dTypeRule = new CaretValueRule('item');
      dTypeRule.caretPath = 'slicing.discriminator.type';
      dTypeRule.value = new FshCode('value');
      const rulesRule = new CaretValueRule('item');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ContainsRule('item');
      containsRule.items.push({ name: 'boo' });
      const cardRule = new CardRule('item[boo]');
      cardRule.min = 1;
      cardRule.max = '1';
      const textCardRule = new CardRule('item[boo].text');
      textCardRule.min = 1;
      textCardRule.max = '1';
      const textAssignmentRule = new AssignmentRule('item[boo].text');
      textAssignmentRule.value = 'boo!';
      // * item ^slicing.discriminator[0].path = "type"
      // * item ^slicing.discriminator[0].type = #value
      // * item ^slicing.rules = #open
      // * item contains boo 1..1
      // * item[boo].text 1..1
      // * item[boo].text = "boo!"
      questionnaire.rules.push(
        caretRule,
        dTypeRule,
        rulesRule,
        containsRule,
        cardRule,
        textCardRule,
        textAssignmentRule
      );
      const linkIdRule = new AssignmentRule('item[0].linkId');
      linkIdRule.value = 'bar';
      const typeRule = new AssignmentRule('item[0].type');
      typeRule.value = new FshCode('group');
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      // * item[0].linkId = "bar"
      // * item[0].type = #group
      // * status = #active
      const questionnaireInstance = new Instance('Test');
      questionnaireInstance.instanceOf = 'TestQuestionnaire';
      questionnaireInstance.rules.push(statusRule, linkIdRule, typeRule);
      exportInstance(questionnaireInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(2);
      expect(loggerSpy.getLastMessage('warn')).toBe(
        'Sliced element Questionnaire.item is being accessed via numeric index. Use slice names in rule paths when possible.'
      );
    });

    it('should log a warning when any element in a closed sliced array is accessed with a numeric index', () => {
      const caretRule = new CaretValueRule('item');
      caretRule.caretPath = 'slicing.discriminator.path';
      caretRule.value = 'type';
      const dTypeRule = new CaretValueRule('item');
      dTypeRule.caretPath = 'slicing.discriminator.type';
      dTypeRule.value = new FshCode('value');
      const rulesRule = new CaretValueRule('item');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('closed');
      const containsRule = new ContainsRule('item');
      containsRule.items.push({ name: 'boo' });
      const cardRule = new CardRule('item[boo]');
      cardRule.min = 0;
      cardRule.max = '1';
      // * item ^slicing.discriminator[0].path = "type"
      // * item ^slicing.discriminator[0].type = #value
      // * item ^slicing.rules = #closed
      // * item contains boo 0..1
      questionnaire.rules.push(caretRule, dTypeRule, rulesRule, containsRule, cardRule);
      const textAssignmentRule = new AssignmentRule('item[boo].text');
      textAssignmentRule.value = 'boo!';
      const linkIdRule = new AssignmentRule('item[0].linkId');
      linkIdRule.value = 'bar';
      const typeRule = new AssignmentRule('item[0].type');
      typeRule.value = new FshCode('group');
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      // * item[0].linkId = "bar"
      // * item[0].type = #group
      // * status = #active
      const questionnaireInstance = new Instance('Test');
      questionnaireInstance.instanceOf = 'TestQuestionnaire';
      questionnaireInstance.rules.push(textAssignmentRule, statusRule, typeRule, linkIdRule);
      exportInstance(questionnaireInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(2);
      expect(loggerSpy.getLastMessage('warn')).toBe(
        'Sliced element Questionnaire.item is being accessed via numeric index. Use slice names in rule paths when possible.'
      );
    });

    it('should log a warning when a choice element has its cardinality satisfied, but an ancestor of the choice element is a named slice that is referenced numerically', () => {
      // Making an assignment rule on a required element inside the named slice forces the slice to be created when setting implied properties
      // see https://github.com/FHIR/sushi/issues/1028
      const caretRule = new CaretValueRule('item');
      caretRule.caretPath = 'slicing.discriminator.path';
      caretRule.value = 'type';
      const dTypeRule = new CaretValueRule('item');
      dTypeRule.caretPath = 'slicing.discriminator.type';
      dTypeRule.value = new FshCode('value');
      const rulesRule = new CaretValueRule('item');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ContainsRule('item');
      containsRule.items.push({ name: 'boo' });
      const cardRule = new CardRule('item[boo]');
      cardRule.min = 1;
      cardRule.max = '1';
      const textCardRule = new CardRule('item[boo].text');
      textCardRule.min = 1;
      textCardRule.max = '1';
      const textAssignmentRule = new AssignmentRule('item[boo].text');
      textAssignmentRule.value = 'boo!';
      // * item ^slicing.discriminator[0].path = "type"
      // * item ^slicing.discriminator[0].type = #value
      // * item ^slicing.rules = #open
      // * item contains boo 1..1
      // * item[boo].text 1..1
      // * item[boo].text = "boo!"
      questionnaire.rules.push(
        caretRule,
        dTypeRule,
        rulesRule,
        containsRule,
        cardRule,
        textCardRule,
        textAssignmentRule
      );
      const answerRule = new AssignmentRule('item[0].answerOption[0].valueString');
      answerRule.value = 'foo';
      const linkIdRule = new AssignmentRule('item[0].linkId');
      linkIdRule.value = 'bar';
      const typeRule = new AssignmentRule('item[0].type');
      typeRule.value = new FshCode('group');
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      // * item[0].answerOption[0].valueString = "foo"
      // * item[0].linkId = "bar"
      // * item[0].type = #group
      // * status = #active
      const questionnaireInstance = new Instance('Test');
      questionnaireInstance.instanceOf = 'TestQuestionnaire';
      questionnaireInstance.rules.push(answerRule, linkIdRule, typeRule, statusRule);
      exportInstance(questionnaireInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(4);
      expect(loggerSpy.getLastMessage('warn')).toBe(
        'Element Questionnaire.item:boo.answerOption.value[x] has its cardinality satisfied by a rule that does not include the slice name. Use slice names in rule paths when possible.'
      );
    });

    it('should not log an error when a reslice element fulfills a cardinality constraint', () => {
      // Profile: TestPatient
      // Parent: Patient
      // * identifier ^slicing.discriminator.type = #value
      // * identifier ^slicing.discriminator.path = "value"
      // * identifier ^slicing.rules = #open
      // * identifier contains ParentSlice 1..1
      // * identifier[ParentSlice] ^slicing.discriminator.type = #value
      // * identifier[ParentSlice] ^slicing.discriminator.path = "value"
      // * identifier[ParentSlice] ^slicing.rules = #open
      // * identifier[ParentSlice] contains ChildSlice 1..1
      const identifierSlicing = new CaretValueRule('identifier');
      identifierSlicing.caretPath = 'slicing.discriminator.path';
      identifierSlicing.value = 'value';
      const slicingType = new CaretValueRule('identifier');
      slicingType.caretPath = 'slicing.discriminator.type';
      slicingType.value = new FshCode('value');
      const slicingRules = new CaretValueRule('identifier');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const identifierContains = new ContainsRule('identifier');
      identifierContains.items.push({ name: 'ParentSlice' });
      const parentCard = new CardRule('identifier[ParentSlice]');
      parentCard.min = 1;
      parentCard.max = '1';
      const parentSlicing = new CaretValueRule('identifier[ParentSlice]');
      parentSlicing.caretPath = 'slicing.discriminator.path';
      parentSlicing.value = 'value';
      const parentSlicingType = new CaretValueRule('identifier[ParentSlice]');
      parentSlicingType.caretPath = 'slicing.discriminator.type';
      parentSlicingType.value = new FshCode('value');
      const parentSlicingRules = new CaretValueRule('identifier[ParentSlice]');
      parentSlicingRules.caretPath = 'slicing.rules';
      parentSlicingRules.value = new FshCode('open');
      const parentContains = new ContainsRule('identifier[ParentSlice]');
      parentContains.items.push({ name: 'ChildSlice' });
      const childCard = new CardRule('identifier[ParentSlice][ChildSlice]');
      childCard.min = 1;
      childCard.max = '1';
      patient.rules.push(
        identifierSlicing,
        slicingRules,
        slicingType,
        identifierContains,
        parentCard,
        parentSlicing,
        parentSlicingType,
        parentSlicingRules,
        parentContains,
        childCard
      );
      // Instance: PatientInstance
      // InstanceOf: TestPatient
      // * identifier[ParentSlice][ChildSlice] = SomeIdentifier
      const identifierAssignment = new AssignmentRule('identifier[ParentSlice][ChildSlice]');
      identifierAssignment.isInstance = true;
      identifierAssignment.value = 'SomeIdentifier';
      patientInstance.rules.push(identifierAssignment);
      // Instance: SomeIdentifier
      // InstanceOf: Identifier
      // * value = "Something"
      const someIdentifier = new Instance('SomeIdentifier');
      someIdentifier.instanceOf = 'Identifier';
      const valueAssignment = new AssignmentRule('value');
      valueAssignment.value = 'Something';
      someIdentifier.rules.push(valueAssignment);
      doc.instances.set(someIdentifier.name, someIdentifier);

      exportInstance(patientInstance);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not assign a value which violates a closed child slicing', () => {
      // Profile: MyProfile
      // Parent: Observation
      // * category.coding ^slicing.discriminator.type = #value
      // * category.coding ^slicing.discriminator.path = "coding"
      // * category.coding ^slicing.rules = #closed
      // * category.coding contains slice1 0..1
      // * category.coding[slice1] = http://example.com#foo
      const profile = new Profile('MyProfile');
      profile.parent = 'Observation';
      const typeRule = new CaretValueRule('category.coding');
      typeRule.caretPath = 'slicing.discriminator[0].type';
      typeRule.value = new FshCode('pattern');
      const pathRule = new CaretValueRule('category.coding');
      pathRule.caretPath = 'slicing.discriminator[0].path';
      pathRule.value = 'code';
      const rulesRule = new CaretValueRule('category.coding');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('closed');
      const containsRule = new ContainsRule('category.coding');
      containsRule.items.push({ name: 'slice1' });
      const assignmentRule = new AssignmentRule('category.coding[slice1]');
      assignmentRule.value = new FshCode('foo', 'http://example.com');
      profile.rules.push(typeRule, pathRule, rulesRule, containsRule, assignmentRule);
      doc.profiles.set(profile.name, profile);

      // Instance: MyInstance
      // InstanceOf: MyProfile
      // * category[0] = http://not-example.org#bar
      const instance = new Instance('MyInstance');
      instance.instanceOf = 'MyProfile';
      const categoryRule = new AssignmentRule('category[0]');
      categoryRule.value = new FshCode('bar', 'http://not-example.com');
      instance.rules.push(categoryRule);
      doc.instances.set(instance.name, instance);

      sdExporter.export();
      const exported = exporter.export().instances;
      const exportedInstance = exported.find(i => i._instanceMeta.name === 'MyInstance');
      expect(exportedInstance.category).toBeUndefined();
      expect(loggerSpy.getAllMessages('error')).toContainEqual(
        'Cannot assign {"coding":[{"code":"bar","system":"http://not-example.com"}]} to this element since it conflicts with all values of the closed slicing.'
      );
    });

    it('should assign a value which does not violate all elements of a closed child slicing', () => {
      // Profile: MyProfile
      // Parent: Observation
      // * category.coding ^slicing.discriminator.type = #value
      // * category.coding ^slicing.discriminator.path = "coding"
      // * category.coding ^slicing.rules = #closed
      // * category.coding contains slice1 0..1 and slice2 0..1
      // * category.coding[slice1] = http://example.com#foo
      // * category.coding[slice2] = http://example.com#bar
      const profile = new Profile('MyProfile');
      profile.parent = 'Observation';
      const typeRule = new CaretValueRule('category.coding');
      typeRule.caretPath = 'slicing.discriminator[0].type';
      typeRule.value = new FshCode('pattern');
      const pathRule = new CaretValueRule('category.coding');
      pathRule.caretPath = 'slicing.discriminator[0].path';
      pathRule.value = 'code';
      const rulesRule = new CaretValueRule('category.coding');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('closed');
      const containsRule = new ContainsRule('category.coding');
      containsRule.items.push({ name: 'slice1' });
      containsRule.items.push({ name: 'slice2' });
      const assignmentRule = new AssignmentRule('category.coding[slice1]');
      assignmentRule.value = new FshCode('foo', 'http://example.com');
      const assignmentRule2 = new AssignmentRule('category.coding[slice2]');
      assignmentRule2.value = new FshCode('bar', 'http://example.com');
      profile.rules.push(
        typeRule,
        pathRule,
        rulesRule,
        containsRule,
        assignmentRule,
        assignmentRule2
      );
      doc.profiles.set(profile.name, profile);

      // Instance: MyInstance
      // InstanceOf: MyProfile
      // * category[0] = http://example#bar
      const instance = new Instance('MyInstance');
      instance.instanceOf = 'MyProfile';
      const categoryRule = new AssignmentRule('category[0]');
      categoryRule.value = new FshCode('bar', 'http://example.com');
      instance.rules.push(categoryRule);
      doc.instances.set(instance.name, instance);

      sdExporter.export();
      const exported = exporter.export().instances;
      const exportedInstance = exported.find(i => i._instanceMeta.name === 'MyInstance');
      expect(exportedInstance.category).toEqual([
        { coding: [{ code: 'bar', system: 'http://example.com' }] }
      ]);
      expect(loggerSpy.getAllMessages('error')).not.toContainEqual(
        'Cannot assign {"coding":[{"code":"bar","system":"http://not-example.com"}]} to this element since it conflicts with all values of the closed slicing.'
      );
    });

    it('should assign a value which violates an open child slicing', () => {
      // Profile: MyProfile
      // Parent: Observation
      // * category.coding ^slicing.discriminator.type = #value
      // * category.coding ^slicing.discriminator.path = "coding"
      // * category.coding ^slicing.rules = #open
      // * category.coding contains slice1 0..1
      // * category.coding[slice1] = http://example.com#foo
      const profile = new Profile('MyProfile');
      profile.parent = 'Observation';
      const typeRule = new CaretValueRule('category.coding');
      typeRule.caretPath = 'slicing.discriminator[0].type';
      typeRule.value = new FshCode('pattern');
      const pathRule = new CaretValueRule('category.coding');
      pathRule.caretPath = 'slicing.discriminator[0].path';
      pathRule.value = 'code';
      const rulesRule = new CaretValueRule('category.coding');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ContainsRule('category.coding');
      containsRule.items.push({ name: 'slice1' });
      const assignmentRule = new AssignmentRule('category.coding[slice1]');
      assignmentRule.value = new FshCode('foo', 'http://example.com');
      profile.rules.push(typeRule, pathRule, rulesRule, containsRule, assignmentRule);
      doc.profiles.set(profile.name, profile);

      // Instance: MyInstance
      // InstanceOf: MyProfile
      // * category[0] = http://not-example.org#bar
      const instance = new Instance('MyInstance');
      instance.instanceOf = 'MyProfile';
      const categoryRule = new AssignmentRule('category[0]');
      categoryRule.value = new FshCode('bar', 'http://not-example.com');
      instance.rules.push(categoryRule);
      doc.instances.set(instance.name, instance);

      sdExporter.export();
      const exported = exporter.export().instances;
      const exportedInstance = exported.find(i => i._instanceMeta.name === 'MyInstance');
      expect(exportedInstance.category).toEqual([
        { coding: [{ code: 'bar', system: 'http://not-example.com' }] }
      ]);
      expect(loggerSpy.getAllMessages('error')).not.toContainEqual(
        'Cannot assign {"coding":[{"code":"bar","system":"http://not-example.com"}]} to this element since it conflicts with all values of the closed slicing.'
      );
    });

    it('should only export an instance once', () => {
      const bundleInstance = new Instance('MyBundle');
      bundleInstance.instanceOf = 'Bundle';
      const inlineRule = new AssignmentRule('entry[0].resource');
      inlineRule.value = 'MyBundledPatient';
      inlineRule.isInstance = true;
      bundleInstance.rules.push(inlineRule); // * entry[0].resource = MyBundledPatient
      doc.instances.set(bundleInstance.name, bundleInstance);

      const inlineInstance = new Instance('MyBundledPatient');
      inlineInstance.instanceOf = 'Patient';
      const assignedValRule = new AssignmentRule('active');
      assignedValRule.value = true;
      inlineInstance.rules.push(assignedValRule); // * active = true
      doc.instances.set(inlineInstance.name, inlineInstance);

      const exported = exporter.export().instances;
      const exportedBundle = exported.filter(i => i._instanceMeta.name === 'MyBundle');
      const exportedBundledPatient = exported.filter(
        i => i._instanceMeta.name === 'MyBundledPatient'
      );
      expect(exportedBundle).toHaveLength(1);
      expect(exportedBundledPatient).toHaveLength(1);
    });

    it('should only add optional children of list elements and the implied elements of those children to entries in the list that assign values on those children', () => {
      // * generalPractitioner only Reference(Practitioner | Organization)
      const onlyRule = new OnlyRule('generalPractitioner');
      onlyRule.types.push(
        {
          type: 'Practitioner',
          isReference: true
        },
        {
          type: 'Organization',
          isReference: true
        }
      );
      // * generalPractitioner.extension contains
      //   http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName named mothers-maiden-name 0..1
      const containsRule = new ContainsRule('generalPractitioner.extension');
      containsRule.items.push({
        name: 'mothers-maiden-name',
        type: 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      });
      const extensionCard = new CardRule('generalPractitioner.extension[mothers-maiden-name]');
      extensionCard.min = 0;
      extensionCard.max = '1';
      patient.rules.push(containsRule, extensionCard);

      // * generalPractitioner[0] = Reference(my-doctor)
      const gp = new AssignmentRule('generalPractitioner[0]');
      gp.value = new FshReference('my-doctor');
      // * generalPractitioner[1] = Reference(gp-org1)
      const gpOrg = new AssignmentRule('generalPractitioner[1]');
      gpOrg.value = new FshReference('gp-org1');
      // * generalPractitioner[1].extension[mothers-maiden-name].valueString = "Belnades"
      const directValue = new AssignmentRule(
        'generalPractitioner[1].extension[mothers-maiden-name].valueString'
      );
      directValue.value = 'Belnades';
      patientInstance.rules.push(gp, gpOrg, directValue);

      sdExporter.export();
      const result = exportInstance(patientInstance);
      expect(result.generalPractitioner.length).toBe(2);
      expect(result.generalPractitioner[0]).toEqual({
        reference: 'my-doctor'
      });
      expect(result.generalPractitioner[0].extension).toBeUndefined();
      expect(result.generalPractitioner[1]).toEqual({
        reference: 'gp-org1',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName',
            valueString: 'Belnades'
          }
        ]
      });
    });

    it('should handle extensions on non-zero element of primitive arrays', () => {
      // * address.line.extension contains
      //     http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-additionalLocator named locator 0..1
      const containsRule = new ContainsRule('address.line.extension');
      containsRule.items.push({
        name: 'locator',
        type: 'http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-additionalLocator'
      });
      const extensionCard = new CardRule('address.line.extension[locator]');
      extensionCard.min = 0;
      extensionCard.max = '1';
      patient.rules.push(containsRule, extensionCard);

      // * address.line[1].extension[locator] = "3rd floor"
      const loc = new AssignmentRule('address.line[1].extension[locator].valueString');
      loc.value = '3rd Floor';
      patientInstance.rules.push(loc);

      // In-memory result should be correct
      const result = exportInstance(patientInstance);
      expect(result.address).toHaveLength(1);
      expect(result.address[0].line).toBeUndefined();
      expect(result.address[0]._line).toHaveLength(2);
      expect(result.address[0]._line[0]).toBeNull();
      expect(result.address[0]._line[1].extension).toEqual([
        {
          url: 'http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-additionalLocator',
          valueString: '3rd Floor'
        }
      ]);

      // JSON representation should be correct
      const json = result.toJSON();
      expect(json.address).toHaveLength(1);
      expect(json.address[0].line).toBeUndefined();
      expect(json.address[0]._line).toHaveLength(2);
      expect(json.address[0]._line[0]).toBeNull();
      expect(json.address[0]._line[1].extension).toEqual([
        {
          url: 'http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-additionalLocator',
          valueString: '3rd Floor'
        }
      ]);
    });

    it('should keep additional values assigned directly on a sibling path before assigning a value with Reference()', () => {
      const observationInstance = new Instance('MyObs');
      observationInstance.instanceOf = 'Observation';
      const identifierValueRule = new AssignmentRule('subject.identifier.value');
      identifierValueRule.value = 'foo';
      observationInstance.rules.push(identifierValueRule); // * subject.identifier.value = "foo"
      const referenceRule = new AssignmentRule('subject');
      referenceRule.value = new FshReference('Bar'); // Patient
      observationInstance.rules.push(referenceRule); // * subject = Reference(Bar)
      doc.instances.set(observationInstance.name, observationInstance);

      const result = exportInstance(observationInstance);
      expect(result.subject.reference).toEqual('Patient/Bar');
      expect(result.subject.identifier).toEqual({ value: 'foo' });
    });

    it('should keep additional values assigned directly on a sibling but prefer later values when assigning a value with Reference()', () => {
      const observationInstance = new Instance('MyObs');
      observationInstance.instanceOf = 'Observation';
      const firstReferenceRule = new AssignmentRule('subject.reference');
      firstReferenceRule.value = 'Patient/TooEarly';
      observationInstance.rules.push(firstReferenceRule); // * subject.identifier.value = "foo"
      const secondReferenceRule = new AssignmentRule('subject');
      secondReferenceRule.value = new FshReference('Bar'); // Patient
      observationInstance.rules.push(secondReferenceRule); // * subject = Reference(Bar)
      doc.instances.set(observationInstance.name, observationInstance);

      const result = exportInstance(observationInstance);
      expect(result.subject).toEqual({ reference: 'Patient/Bar' }); // The reference that is set later in the FSH is kept
    });

    describe('#Inline Instances', () => {
      beforeEach(() => {
        const inlineInstance = new Instance('MyInlinePatient');
        inlineInstance.instanceOf = 'Patient';
        const assignedValRule = new AssignmentRule('active');
        assignedValRule.value = true;
        inlineInstance.rules.push(assignedValRule);
        // * active = true
        doc.instances.set(inlineInstance.name, inlineInstance);

        const inlineObservation = new Instance('MyInlineObservation');
        inlineObservation.instanceOf = 'Observation';
        const observationValueRule = new AssignmentRule('valueString');
        observationValueRule.value = 'Some Observation';
        inlineObservation.rules.push(observationValueRule);
        // * valueString = "Some Observation"
        doc.instances.set(inlineObservation.name, inlineObservation);

        const inlineOrganization = new Instance('MyInlineOrganization');
        inlineOrganization.instanceOf = 'Organization';
        const organizationName = new AssignmentRule('name');
        organizationName.value = 'Everyone';
        inlineOrganization.rules.push(organizationName);
        // * name = "Everyone"
        doc.instances.set(inlineOrganization.name, inlineOrganization);

        const caretRule = new CaretValueRule('entry');
        caretRule.caretPath = 'slicing.discriminator.type';
        caretRule.value = new FshCode('value');
        const containsRule = new ContainsRule('entry');
        containsRule.items = [{ name: 'PatientsOnly' }];
        const cardRule = new CardRule('entry[PatientsOnly]');
        cardRule.min = 0;
        cardRule.max = '1';
        const typeRule = new OnlyRule('entry[PatientsOnly].resource');
        typeRule.types = [{ type: 'Patient' }];

        const choiceContainsRule = new ContainsRule('entry');
        choiceContainsRule.items = [{ name: 'PatientOrOrganization' }];
        const choiceCardRule = new CardRule('entry[PatientOrOrganization]');
        choiceCardRule.min = 0;
        choiceCardRule.max = '1';
        const choiceTypeRule = new OnlyRule('entry[PatientOrOrganization].resource');
        choiceTypeRule.types = [{ type: 'Patient' }, { type: 'Organization' }];
        // * entry ^slicing.discriminator.type = #value
        // * entry contains Patient 0..1
        // * entry[PatientsOnly].resource only Patient
        // * entry contains PatientOrOrganization 0..1
        // * entry[PatientOrOrganization] only Patient or Organization
        bundle.rules.push(
          caretRule,
          containsRule,
          cardRule,
          typeRule,
          choiceContainsRule,
          choiceCardRule,
          choiceTypeRule
        );
      });

      it('should assign an inline resource to an instance', () => {
        const inlineRule = new AssignmentRule('contained[0]');
        inlineRule.value = 'MyInlinePatient';
        inlineRule.isInstance = true;
        patientInstance.rules.push(inlineRule); // * contained[0] = MyInlinePatient

        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([
          { resourceType: 'Patient', id: 'MyInlinePatient', active: true }
        ]);
      });

      it('should assign multiple inline resources to an instance', () => {
        const inlineRule = new AssignmentRule('contained[0]');
        inlineRule.value = 'MyInlinePatient';
        inlineRule.isInstance = true;
        patientInstance.rules.push(inlineRule); // * contained[0] = MyInlinePatient

        const inlineRule2 = new AssignmentRule('contained[1]');
        inlineRule2.value = 'MyInlineObservation';
        inlineRule2.isInstance = true;
        patientInstance.rules.push(inlineRule2); // * contained[1] = MyInlineObservation

        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([
          { resourceType: 'Patient', id: 'MyInlinePatient', active: true },
          {
            resourceType: 'Observation',
            id: 'MyInlineObservation',
            valueString: 'Some Observation'
          }
        ]);
      });

      it('should assign other resources to an instance', () => {
        const containedRule1 = new AssignmentRule('contained[0]');
        containedRule1.value = 'allergyintolerance-clinical';
        containedRule1.isInstance = true;
        patientInstance.rules.push(containedRule1); // * contained[0] = allergyintolerance-clinical

        const containedRule2 = new AssignmentRule('contained[1]');
        containedRule2.value = 'w3c-provenance-activity-type';
        containedRule2.isInstance = true;
        patientInstance.rules.push(containedRule2); // * contained[1] = w3c-provenance-activity-type

        const exported = exportInstance(patientInstance);
        expect(exported.contained[0].id).toBe('allergyintolerance-clinical');
        expect(exported.contained[0].resourceType).toBe('ValueSet');
        expect(exported.contained[1].id).toBe('w3c-provenance-activity-type');
        expect(exported.contained[1].resourceType).toBe('CodeSystem');
      });

      it('should assign an inline resource to an instance element with a specific type', () => {
        const bundleValRule = new AssignmentRule('entry[PatientsOnly].resource');
        bundleValRule.value = 'MyInlinePatient';
        bundleValRule.isInstance = true;
        // * entry[PatientsOnly].resource = MyInlinePatient
        bundleInstance.rules.push(bundleValRule);

        const exported = exportInstance(bundleInstance);
        expect(exported.entry[0]).toEqual({
          resource: { resourceType: 'Patient', id: 'MyInlinePatient', active: true }
        });
      });

      it('should assign an inline resource to an instance element with a choice type', () => {
        const bundleValRule = new AssignmentRule('entry[PatientOrOrganization].resource');
        bundleValRule.value = 'MyInlinePatient';
        bundleValRule.isInstance = true;
        // * entry[PatientOrOrganization].resource = MyInlinePatient
        bundleInstance.rules.push(bundleValRule);

        const exported = exportInstance(bundleInstance);
        expect(exported.entry[0].resource).toEqual({
          resourceType: 'Patient',
          id: 'MyInlinePatient',
          active: true
        });
      });

      it('should assign an inline resource that is not the first type to an instance element with a choice type', () => {
        const bundleValRule = new AssignmentRule('entry[PatientOrOrganization].resource');
        bundleValRule.value = 'MyInlineOrganization';
        bundleValRule.isInstance = true;
        // * entry[PatientOrOrganization].resource = MyInlineOrganization
        bundleInstance.rules.push(bundleValRule);

        const exported = exportInstance(bundleInstance);
        expect(exported.entry[0].resource).toEqual({
          resourceType: 'Organization',
          id: 'MyInlineOrganization',
          name: 'Everyone'
        });
      });

      it('should assign an inline resource to an instance when the resource is not a profile and uses meta', () => {
        // This test reflects a real-world bug reported on Zulip:
        // https://chat.fhir.org/#narrow/stream/215610-shorthand/topic/example.20FSH.20Bundle.20transaction.20with.20Create.20entries
        const inlineInstance = new Instance('ExampleInlinePatient');
        inlineInstance.instanceOf = 'Patient';
        // * meta.security = http://terminology.hl7.org/CodeSystem/v3-ActReason#HTEST
        const assignedValRule = new AssignmentRule('meta.security');
        assignedValRule.value = new FshCode(
          'HTEST',
          'http://terminology.hl7.org/CodeSystem/v3-ActReason'
        );
        inlineInstance.rules.push(assignedValRule);
        doc.instances.set(inlineInstance.name, inlineInstance);

        // * contained[0] = ExampleInlinePatient
        const inlineRule = new AssignmentRule('contained[0]');
        inlineRule.value = 'ExampleInlinePatient';
        inlineRule.isInstance = true;
        patientInstance.rules.push(inlineRule);

        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([
          {
            resourceType: 'Patient',
            id: 'ExampleInlinePatient',
            meta: {
              security: [
                {
                  code: 'HTEST',
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason'
                }
              ]
            }
          }
        ]);
      });

      it('should log an error when assigning an inline resource to an invalid choice', () => {
        const bundleValRule = new AssignmentRule('entry[PatientOrOrganization].resource')
          .withFile('BadChoice.fsh')
          .withLocation([1, 2, 3, 4]);
        bundleValRule.value = 'MyInlineObservation';
        bundleValRule.isInstance = true;
        // * entry[PatientOrOrganization].resource = MyInlineObservation
        bundleInstance.rules.push(bundleValRule);

        const exported = exportInstance(bundleInstance);
        expect(exported.entry).toBeUndefined();
        expect(
          loggerSpy
            .getAllMessages('error')
            .some(e =>
              e.match(
                /Cannot assign Observation value: MyInlineObservation. Value does not match element type: Patient, Organization/
              )
            )
        ).toBeTruthy();
      });

      it('should log an error when assigning an inline resource that does not exist to an instance', () => {
        const inlineRule = new AssignmentRule('contained[0]')
          .withFile('FakeInstance.fsh')
          .withLocation([1, 2, 3, 4]);
        inlineRule.value = 'MyFakePatient';
        inlineRule.isInstance = true;
        patientInstance.rules.push(inlineRule); // * contained[0] = MyFakePatient

        const exported = exportInstance(patientInstance);
        expect(exported.contained).toBeUndefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Cannot find definition for Instance: MyFakePatient. Skipping rule.*File: FakeInstance.fsh.*Line: 1 - 3\D*/s
        );
      });

      it('should override an assigned inline resource on an instance', () => {
        const inlineRule = new AssignmentRule('contained[0]');
        inlineRule.value = 'MyInlinePatient';
        inlineRule.isInstance = true;
        const overrideRule = new AssignmentRule('contained[0].birthDate');
        overrideRule.value = '2000-02-24';
        // * contained[0] = MyInlinePatient
        // * contained[0].birthDate = 2000-02-24
        patientInstance.rules.push(inlineRule, overrideRule);
        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([
          { resourceType: 'Patient', id: 'MyInlinePatient', active: true, birthDate: '2000-02-24' }
        ]);
      });

      it('should override an assigned via resourceType inline resource on an instance', () => {
        const inlineRule = new AssignmentRule('contained[0].resourceType');
        inlineRule.value = 'Patient';
        const overrideRule = new AssignmentRule('contained[0].birthDate');
        overrideRule.value = '2000-02-24';
        // * contained[0].resourceType = "Patient"
        // * contained[0].birthDate = 2000-02-24
        patientInstance.rules.push(inlineRule, overrideRule);
        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([{ resourceType: 'Patient', birthDate: '2000-02-24' }]);
      });

      it('should override an assigned inline resource on an instance with paths that mix usage of [0] indexing', () => {
        const inlineRule = new AssignmentRule('contained[00]'); // [00] index used
        inlineRule.value = 'MyInlinePatient';
        inlineRule.isInstance = true;
        const overrideRule = new AssignmentRule('contained.birthDate'); // no [0] index used
        overrideRule.value = '2000-02-24';
        // * contained[0] = MyInlinePatient
        // * contained.birthDate = 2000-02-24
        patientInstance.rules.push(inlineRule, overrideRule);
        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([
          { resourceType: 'Patient', id: 'MyInlinePatient', active: true, birthDate: '2000-02-24' }
        ]);
      });

      it('should override an assigned via resourceType inline resource on an instance with paths that mix usage of [0] indexing', () => {
        const inlineRule = new AssignmentRule('contained[0].resourceType'); // [0] index used
        inlineRule.value = 'Patient';
        const overrideRule = new AssignmentRule('contained.birthDate'); // no [0] index used
        overrideRule.value = '2000-02-24';
        // * contained.birthDate = 2000-02-24
        // * contained[0].resourceType = "Patient"
        patientInstance.rules.push(overrideRule, inlineRule);
        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([{ resourceType: 'Patient', birthDate: '2000-02-24' }]);
      });

      it('should override a nested assigned inline resource on an instance', () => {
        const bundleRule = new AssignmentRule('contained[0].resourceType');
        bundleRule.value = 'Bundle';
        const patientRule = new AssignmentRule('contained[0].entry[0].resource');
        patientRule.value = 'MyInlinePatient';
        patientRule.isInstance = true;
        const birthDateRule = new AssignmentRule('contained[0].entry[0].resource.birthDate');
        birthDateRule.value = '2000-02-24';
        // * contained[0].resourceType = "Bundle"
        // * contained[0].entry[0].resource = MyInlinePatient
        // * contained[0].entry[0].resource.birthDate = "2000-02-24"
        patientInstance.rules.push(bundleRule, patientRule, birthDateRule);
        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([
          {
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'Patient',
                  id: 'MyInlinePatient',
                  active: true,
                  birthDate: '2000-02-24'
                }
              }
            ]
          }
        ]);
      });

      it('should override an inline profile on an instance', () => {
        const inlineBundle = new Instance('MyBundle');
        inlineBundle.instanceOf = 'TestBundle';
        doc.instances.set(inlineBundle.name, inlineBundle);

        const bundleRule = new AssignmentRule('contained[0]');
        bundleRule.value = 'MyBundle';
        bundleRule.isInstance = true;
        const birthDateRule = new AssignmentRule(
          'contained[0].entry[PatientsOnly].resource.birthDate'
        );
        birthDateRule.value = '2000-02-24';
        // contained[0] = MyBundle
        // contained[0].entry[PatientsOnly].resource.birthDate = "2000-02-24"
        patientInstance.rules.push(bundleRule, birthDateRule);
        const exported = exportInstance(patientInstance);
        expect(exported.contained).toEqual([
          {
            id: 'MyBundle',
            meta: { profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/TestBundle'] },
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  birthDate: '2000-02-24'
                }
              }
            ]
          }
        ]);
      });

      it('should assign an inline instance of a type to an instance', () => {
        const inlineCodeable = new Instance('MyCodeable');
        inlineCodeable.instanceOf = 'CodeableConcept';
        inlineCodeable.usage = 'Inline';
        doc.instances.set(inlineCodeable.name, inlineCodeable);
        const codingRule = new AssignmentRule('coding');
        codingRule.value = new FshCode('foo', 'http://bar.com');
        // * coding = http://bar.com#foo
        inlineCodeable.rules.push(codingRule);

        const inlineRule = new AssignmentRule('maritalStatus');
        inlineRule.value = 'MyCodeable';
        inlineRule.isInstance = true;
        // * maritalStatus = MyCodeable
        patientInstance.rules.push(inlineRule);
        const exported = exportInstance(patientInstance);
        expect(exported.maritalStatus).toEqual({
          coding: [
            {
              system: 'http://bar.com',
              code: 'foo'
            }
          ]
        });
      });

      it('should assign an inline instance of a specialization of a type to an instance', () => {
        const inlineAge = new Instance('MyAge');
        inlineAge.instanceOf = 'Age';
        inlineAge.usage = 'Inline';
        doc.instances.set(inlineAge.name, inlineAge);
        const ageRule = new AssignmentRule('value');
        ageRule.value = 42;
        // * value = 42
        inlineAge.rules.push(ageRule);

        const inlineRule = new AssignmentRule('valueQuantity');
        inlineRule.value = 'MyAge';
        inlineRule.isInstance = true;
        // * valueQuantity = MyAge
        respRateInstance.rules.push(inlineRule);
        const exported = exportInstance(respRateInstance);
        expect(exported.valueQuantity.value).toBe(42);
      });

      it('should not overwrite the value property when assigning a Quantity object', () => {
        const exObservation = new Profile('ExObservation');
        exObservation.parent = 'Observation';
        doc.profiles.set(exObservation.name, exObservation);

        const onlyRule = new OnlyRule('value[x]');
        onlyRule.types = [{ type: 'Quantity' }];
        exObservation.rules.push(onlyRule);

        // * valueQuantity.value = 17
        const valueSettingRule = new AssignmentRule('valueQuantity.value');
        valueSettingRule.value = 17;
        valueSettingRule.isInstance = false;
        valueSettingRule.exactly = false;

        // * valueQuantity = UCUM#/min
        const codeSettingRule = new AssignmentRule('valueQuantity');
        codeSettingRule.value = new FshCode('mg', 'http://unitsofmeasure.org', 'mg');
        codeSettingRule.isInstance = false;
        codeSettingRule.exactly = false;

        const exInstance = new Instance('ExInstance');
        exInstance.instanceOf = 'ExObservation';
        exInstance.rules.push(valueSettingRule);
        exInstance.rules.push(codeSettingRule);

        const exported = exportInstance(exInstance);
        expect(exported.valueQuantity).toEqual({
          value: 17,
          code: 'mg',
          system: 'http://unitsofmeasure.org',
          unit: 'mg'
        });
      });

      it('should assign an inline instance of a profile of a type to an instance', () => {
        const inlineSimple = new Instance('MySimple');
        inlineSimple.instanceOf = 'SimpleQuantity';
        inlineSimple.usage = 'Inline';
        doc.instances.set(inlineSimple.name, inlineSimple);
        const quantRule = new AssignmentRule('value');
        quantRule.value = 7;
        // * value = 7
        inlineSimple.rules.push(quantRule);

        const inlineRule = new AssignmentRule('valueQuantity');
        inlineRule.value = 'MySimple';
        inlineRule.isInstance = true;
        // * valueQuantity = MySimple
        respRateInstance.rules.push(inlineRule);
        const exported = exportInstance(respRateInstance);
        expect(exported.valueQuantity.value).toBe(7);
      });

      it('should assign an inline instance of a FSH defined profile of a type to an instance', () => {
        const profile = new Profile('Foo');
        profile.parent = 'Quantity';
        doc.profiles.set(profile.name, profile);

        const inlineSimple = new Instance('MyQuantity');
        inlineSimple.instanceOf = 'Foo';
        inlineSimple.usage = 'Inline';
        doc.instances.set(inlineSimple.name, inlineSimple);
        const quantRule = new AssignmentRule('value');
        quantRule.value = 7;
        // * value = 7
        inlineSimple.rules.push(quantRule);

        const inlineRule = new AssignmentRule('valueQuantity');
        inlineRule.value = 'MyQuantity';
        inlineRule.isInstance = true;
        // * valueQuantity = MyQuantity
        respRateInstance.rules.push(inlineRule);
        const exported = exportInstance(respRateInstance);
        expect(exported.valueQuantity.value).toBe(7);
      });

      it('should assign an inline instance of an extension to an instance', () => {
        patientProfInstance.usage = 'Inline';
        const codingRule = new AssignmentRule('extension[level].valueCoding');
        codingRule.value = new FshCode('foo', 'http://bar.com');
        // * extension[level].valueCoding = http://bar.com#foo
        patientProfInstance.rules.push(codingRule);
        const inlineRule = new AssignmentRule('extension');
        inlineRule.value = 'Baz'; // InstanceOf patientProf defined in beforeEach
        inlineRule.isInstance = true;
        patientInstance.rules.push(inlineRule);
        const exported = exportInstance(patientInstance);
        expect(exported.extension).toEqual([
          {
            extension: [{ url: 'level', valueCoding: { system: 'http://bar.com', code: 'foo' } }],
            url: 'http://hl7.org/fhir/StructureDefinition/patient-proficiency'
          }
        ]);
      });

      it('should assign an instance that matches existing values', () => {
        // Profile: TestPatient
        // Parent: Patient
        // * name 1..1
        // * name.family = "Goodweather"
        // * name.family 1..1
        // * name.text = "Regular text"
        const nameCard = new CardRule('name');
        nameCard.min = 1;
        nameCard.max = '1';
        const familyAssignment = new AssignmentRule('name.family');
        familyAssignment.value = 'Goodweather';
        const familyCard = new CardRule('name.family');
        familyCard.min = 1;
        familyCard.max = '1';
        const textAssignment = new AssignmentRule('name.text');
        textAssignment.value = 'Regular text';
        patient.rules.push(nameCard, familyAssignment, familyCard, textAssignment);
        // Instance: SameName
        // InstanceOf: HumanName
        // Usage: #inline
        // * text = "Regular text"
        // * use = #official
        const sameName = new Instance('SameName');
        sameName.instanceOf = 'HumanName';
        sameName.usage = 'Inline';
        const sameText = new AssignmentRule('text');
        sameText.value = 'Regular text';
        const sameUse = new AssignmentRule('use');
        sameUse.value = new FshCode('official');
        sameName.rules.push(sameText, sameUse);
        doc.instances.set(sameName.name, sameName);
        // Instance: Bar
        // InstanceOf: TestPatient
        // * name = SameName
        const nameAssignment = new AssignmentRule('name')
          .withFile('Bar.fsh')
          .withLocation([3, 3, 3, 25]);
        nameAssignment.value = 'SameName';
        nameAssignment.isInstance = true;
        patientInstance.rules.push(nameAssignment);
        const exported = exportInstance(patientInstance);
        expect(exported.name[0].family).toBe('Goodweather');
        expect(exported.name[0].text).toBe('Regular text');
        expect(exported.name[0].use).toBe('official');
      });

      it('should log an error when assigning an instance that would overwrite an existing value', () => {
        // Profile: TestPatient
        // Parent: Patient
        // * name 1..1
        // * name.family = "Goodweather"
        // * name.family 1..1
        // * name.text = "Regular text"
        const nameCard = new CardRule('name');
        nameCard.min = 1;
        nameCard.max = '1';
        const familyAssignment = new AssignmentRule('name.family');
        familyAssignment.value = 'Goodweather';
        const familyCard = new CardRule('name.family');
        familyCard.min = 1;
        familyCard.max = '1';
        const textAssignment = new AssignmentRule('name.text');
        textAssignment.value = 'Regular text';
        patient.rules.push(nameCard, familyAssignment, familyCard, textAssignment);
        // Instance: DifferentName
        // InstanceOf: HumanName
        // Usage: #inline
        // * text = "Different text"
        // * use = #official
        const differentName = new Instance('DifferentName');
        differentName.instanceOf = 'HumanName';
        differentName.usage = 'Inline';
        const differentText = new AssignmentRule('text');
        differentText.value = 'Different text';
        const differentUse = new AssignmentRule('use');
        differentUse.value = new FshCode('official');
        differentName.rules.push(differentText, differentUse);
        doc.instances.set(differentName.name, differentName);
        // Instance: Bar
        // InstanceOf: TestPatient
        // * name = DifferentName
        const nameAssignment = new AssignmentRule('name')
          .withFile('Bar.fsh')
          .withLocation([3, 3, 3, 25]);
        nameAssignment.value = 'DifferentName';
        nameAssignment.isInstance = true;
        patientInstance.rules.push(nameAssignment);
        const exported = exportInstance(patientInstance);
        // name.family has a minimum cardinality of 1, so it is set as an implied property
        expect(exported.name[0].family).toBe('Goodweather');
        // text is not required, but the assigned Instance's text would violate the Profile, so it is not assigned
        expect(exported.name[0].text).toBeUndefined();
        // since the Instance is not assigned, the use is also undefined
        expect(exported.name[0].use).toBeUndefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Cannot assign Different text to this element.*File: Bar\.fsh.*Line: 3\D*/s
        );
      });

      it('should assign an instance of a type to an instance and log a warning when the type is not inline', () => {
        const inlineCodeable = new Instance('MyCodeable')
          .withFile('Code.fsh')
          .withLocation([1, 2, 3, 4]);
        inlineCodeable.instanceOf = 'CodeableConcept';
        doc.instances.set(inlineCodeable.name, inlineCodeable);
        const codingRule = new AssignmentRule('coding');
        codingRule.value = new FshCode('foo', 'http://bar.com');
        // * coding = http://bar.com#foo
        inlineCodeable.rules.push(codingRule);

        const inlineRule = new AssignmentRule('maritalStatus');
        inlineRule.value = 'MyCodeable';
        inlineRule.isInstance = true;
        // * maritalStatus = MyCodeable
        patientInstance.rules.push(inlineRule);
        const exported = exportInstance(patientInstance);
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /Instance MyCodeable is not an instance of a resource.*File: Code\.fsh.*Line: 1 - 3\D*/s
        );
        expect(exported.maritalStatus).toEqual({
          coding: [
            {
              system: 'http://bar.com',
              code: 'foo'
            }
          ]
        });
      });
    });
  });

  describe('#export', () => {
    it('should still apply valid rules if one fails', () => {
      const instance = new Instance('UnmeasurableAttribute');
      instance.instanceOf = 'Patient';
      const impossibleRule = new AssignmentRule('impossible');
      impossibleRule.value = 'unmeasurable';
      instance.rules.push(impossibleRule);
      const possibleRule = new AssignmentRule('identifier.value');
      possibleRule.value = 'Pascal';
      instance.rules.push(possibleRule);
      doc.instances.set(instance.name, instance);

      const exported = exporter.export().instances;
      expect(exported.length).toBe(1);
      expect(exported[0].identifier[0].value).toBe('Pascal');
    });

    it('should log a message when the path for a assigned value is not found', () => {
      const instance = new Instance('UnmeasurableAttribute');
      instance.instanceOf = 'Patient';
      const impossibleRule = new AssignmentRule('impossible')
        .withFile('Unmeasurable.fsh')
        .withLocation([3, 8, 3, 28]);
      impossibleRule.value = 'unmeasurable';
      instance.rules.push(impossibleRule);
      doc.instances.set(instance.name, instance);

      const exported = exporter.export().instances;
      expect(exported.length).toBe(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Unmeasurable\.fsh.*Line: 3\D*/s);
    });

    it('should log a warning when exporting an instance of a custom resource', () => {
      const resource = new Resource('Foo');
      doc.resources.set(resource.name, resource);
      const instance = new Instance('FooInstance');
      instance.instanceOf = 'Foo';
      doc.instances.set(instance.name, instance);
      sdExporter.export();
      const exported = exporter.export().instances;
      expect(exported.length).toBe(1);
      expect(loggerSpy.getAllMessages('warn').length).toBe(2);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /following instance\(s\) of custom resources:.*- FooInstance/s
      );
    });

    it('should log a warning when exporting multiple instances of custom resources', () => {
      const resource1 = new Resource('Foo');
      const resource2 = new Resource('Bar');
      doc.resources.set(resource1.name, resource1);
      doc.resources.set(resource2.name, resource2);
      const instance1 = new Instance('FooInstance');
      instance1.instanceOf = 'Foo';
      doc.instances.set(instance1.name, instance1);
      const instance2 = new Instance('BarInstance');
      instance2.instanceOf = 'Bar';
      doc.instances.set(instance2.name, instance2);
      sdExporter.export();
      const exported = exporter.export().instances;
      expect(exported.length).toBe(2);
      expect(loggerSpy.getAllMessages('warn').length).toBe(2);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /following instance\(s\) of custom resources:.*- FooInstance.*- BarInstance/s
      );
    });
  });

  describe('#insertRules', () => {
    let instance: Instance;
    let patientInstance: Instance;
    let ruleSet: RuleSet;

    beforeEach(() => {
      instance = new Instance('Foo');
      instance.instanceOf = 'Resource';
      doc.instances.set(instance.name, instance);

      patientInstance = new Instance('TestPatient');
      patientInstance.instanceOf = 'Patient';
      doc.instances.set(patientInstance.name, patientInstance);

      ruleSet = new RuleSet('Bar');
      doc.ruleSets.set(ruleSet.name, ruleSet);
    });

    it('should apply rules from an insert rule', () => {
      // RuleSet: Bar
      // * id = "my-id"
      //
      // Instance: Foo
      // InstanceOf: Resource
      // * insert Bar
      const valueRule = new AssignmentRule('id');
      valueRule.value = 'my-id';
      ruleSet.rules.push(valueRule);

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      instance.rules.push(insertRule);

      const exported = exporter.exportInstance(instance);
      expect(exported.id).toBe('my-id');
    });

    it('should assign elements from a rule set with soft indexing used within a path', () => {
      const assignedValRule = new AssignmentRule('name[+].given');
      assignedValRule.value = 'John';
      ruleSet.rules.push(assignedValRule);
      const assignedValRule2 = new AssignmentRule('name[=].family');
      assignedValRule2.value = 'Johnson';
      ruleSet.rules.push(assignedValRule2);
      const assignedValRule3 = new AssignmentRule('name[+].given');
      assignedValRule3.value = 'Johnny';
      ruleSet.rules.push(assignedValRule3);
      const assignedValRule4 = new AssignmentRule('name[=].family');
      assignedValRule4.value = 'Jackson';
      ruleSet.rules.push(assignedValRule4);

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      patientInstance.rules.push(insertRule);
      const exported = exporter.exportInstance(patientInstance);
      expect(exported.name).toEqual([
        {
          given: ['John'],
          family: 'Johnson'
        },
        {
          given: ['Johnny'],
          family: 'Jackson'
        }
      ]);
    });

    it('should log an error and not apply rules from an invalid insert rule', () => {
      // RuleSet: Bar
      // * ^title = "Wow fancy"
      // * id = "my-id"
      //
      // Instance: Foo
      // InstanceOf: Resource
      // * insert Bar
      const caretRule = new CaretValueRule('').withFile('Caret.fsh').withLocation([1, 2, 3, 4]);
      caretRule.caretPath = 'title';
      caretRule.value = 'Wow fancy';
      const valueRule = new AssignmentRule('id');
      valueRule.value = 'my-id';
      ruleSet.rules.push(caretRule, valueRule);

      const insertRule = new InsertRule('').withFile('Insert.fsh').withLocation([5, 6, 7, 8]);
      insertRule.ruleSet = 'Bar';
      instance.rules.push(insertRule);

      const exported = exporter.exportInstance(instance);
      // valueRule is still applied
      expect(exported.id).toBe('my-id');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /CaretValueRule.*Instance.*File: Caret\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Applied on Line: 5 - 7/s
      );
    });
  });
});

describe('InstanceExporter R5', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let sdExporter: StructureDefinitionExporter;
  let exporter: InstanceExporter;
  let exportInstance: (instance: Instance) => InstanceDefinition;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r5-definitions', defs);
  });

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    const pkg = new Package(input.config);
    const fisher = new TestFisher(input, defs, pkg, 'hl7.fhir.r5.core#current', 'r5-definitions');
    sdExporter = new StructureDefinitionExporter(input, pkg, fisher);
    exporter = new InstanceExporter(input, pkg, fisher);
    exportInstance = (instance: Instance) => {
      sdExporter.export();
      return exporter.exportInstance(instance);
    };
  });

  describe('#exportInstance', () => {
    beforeEach(() => {
      loggerSpy.reset();
    });

    // Assignment on CodeableReference
    it('should log a meaningful error when assigning a Reference directly to a CodeableReference', () => {
      const condition = new Instance('TestCondition');
      condition.instanceOf = 'Condition';
      const assignedIdRule = new AssignmentRule('id');
      assignedIdRule.value = 'condition-id';
      condition.rules.push(assignedIdRule);

      const carePlan = new Instance('TestCarePlan');
      carePlan.instanceOf = 'CarePlan';
      const assignedRefRule = new AssignmentRule('addresses');
      assignedRefRule.value = new FshReference('TestCondition');
      carePlan.rules.push(assignedRefRule);

      doc.instances.set(condition.name, condition);
      doc.instances.set(carePlan.name, carePlan);
      const exported = exportInstance(carePlan);
      expect(exported.addresses).toBeUndefined();
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /Cannot assign.*Reference\(Condition\/condition-id\).*Assign to CodeableReference.reference\D*/s
      );
    });

    it('should log a meaningful error when assigning a code directly to a CodeableReference', () => {
      const carePlan = new Instance('TestCarePlan');
      carePlan.instanceOf = 'CarePlan';
      const assignedRefRule = new AssignmentRule('addresses');
      assignedRefRule.value = new FshCode('foo');
      carePlan.rules.push(assignedRefRule);

      doc.instances.set(carePlan.name, carePlan);
      const exported = exportInstance(carePlan);
      expect(exported.addresses).toBeUndefined();
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /Cannot assign.*#foo.*Assign to CodeableReference.concept\D*/s
      );
    });

    // Assigning References

    it('should assign a reference while resolving the Instance being referred to on a CodeableReference', () => {
      const condition = new Instance('TestCondition');
      condition.instanceOf = 'Condition';
      const assignedIdRule = new AssignmentRule('id');
      assignedIdRule.value = 'condition-id';
      condition.rules.push(assignedIdRule);

      const carePlan = new Instance('TestCarePlan');
      carePlan.instanceOf = 'CarePlan';
      const assignedRefRule = new AssignmentRule('addresses.reference');
      assignedRefRule.value = new FshReference('TestCondition');
      carePlan.rules.push(assignedRefRule);

      doc.instances.set(condition.name, condition);
      doc.instances.set(carePlan.name, carePlan);
      const exported = exportInstance(carePlan);
      expect(exported.addresses[0].reference).toEqual({
        reference: 'Condition/condition-id'
      });
    });

    it('should log an error when an invalid reference is assigned on a CodeableReference', () => {
      const patient = new Instance('TestPatient');
      patient.instanceOf = 'Patient';

      const carePlan = new Instance('TestCarePlan');
      carePlan.instanceOf = 'CarePlan';
      const assignedRefRule = new AssignmentRule('addresses.reference');
      assignedRefRule.value = new FshReference('TestPatient');
      carePlan.rules.push(assignedRefRule);

      doc.instances.set(patient.name, patient);
      doc.instances.set(carePlan.name, carePlan);
      const exported = exportInstance(carePlan);
      expect(exported.addresses).toBeUndefined();
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /The type "Reference\(Patient\)" does not match any of the allowed types\D*/s
      );
    });
  });
});
