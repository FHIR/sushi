import { FSHDocument, FSHTank } from '../../src/import';
import {
  Configuration,
  Extension,
  FshCanonical,
  FshCode,
  FshCodeSystem,
  FshValueSet,
  Instance,
  Invariant,
  Logical,
  Mapping,
  Profile,
  Resource,
  RuleSet
} from '../../src/fshtypes';
import { Metadata, Type } from '../../src/utils/Fishable';
import { minimalConfig } from '../utils/minimalConfig';
import { AssignmentRule, CaretValueRule } from '../../src/fshtypes/rules';

describe('FSHTank', () => {
  let tank: FSHTank;
  beforeEach(() => {
    const doc1 = new FSHDocument('doc1.fsh');
    doc1.aliases.set('FOO', 'http://foo.com');
    doc1.profiles.set('Profile1', new Profile('Profile1'));
    doc1.profiles.get('Profile1').id = 'prf1';
    doc1.profiles.get('Profile1').parent = 'Observation';
    doc1.profiles.set('Profile2', new Profile('Profile2'));
    doc1.profiles.get('Profile2').id = 'prf2';
    doc1.profiles.get('Profile2').parent = 'Observation';
    const profile3 = new Profile('Profile3');
    profile3.parent = 'Observation';
    const profile3Id = new CaretValueRule('');
    profile3Id.caretPath = 'id';
    profile3Id.value = 'prf3';
    const profile3Version = new CaretValueRule('');
    profile3Version.caretPath = 'version';
    profile3Version.value = 'v-2.0.0';
    profile3.rules.push(profile3Id, profile3Version);
    doc1.profiles.set(profile3.name, profile3);
    doc1.instances.set('ProfileInstance', new Instance('ProfileInstance'));
    doc1.instances.get('ProfileInstance').instanceOf = 'StructureDefinition';
    doc1.instances.get('ProfileInstance').usage = 'Definition';
    const profileInstanceDerivation = new AssignmentRule('derivation');
    profileInstanceDerivation.value = new FshCode('constraint');
    doc1.instances.get('ProfileInstance').rules.push(profileInstanceDerivation);
    const profileInstance2 = new Instance('ProfileInstance2');
    profileInstance2.instanceOf = 'StructureDefinition';
    profileInstance2.usage = 'Definition';
    const profileInstance2Version = new AssignmentRule('version');
    profileInstance2Version.value = 'v-2.0.0';
    profileInstance2.rules.push(profileInstanceDerivation, profileInstance2Version);
    doc1.instances.set(profileInstance2.name, profileInstance2);
    doc1.extensions.set('Extension1', new Extension('Extension1'));
    doc1.extensions.get('Extension1').id = 'ext1';
    doc1.extensions.get('Extension1').parent = 'Extension2';
    const doc2 = new FSHDocument('doc2.fsh');
    doc2.aliases.set('BAR', 'http://bar.com');
    doc2.extensions.set('Extension2', new Extension('Extension2'));
    doc2.extensions.get('Extension2').id = 'ext2';
    const ext3 = new Extension('Extension3');
    const ext3Id = new CaretValueRule('');
    ext3Id.caretPath = 'id';
    ext3Id.value = 'ext3';
    const ext3Version = new CaretValueRule('');
    ext3Version.caretPath = 'version';
    ext3Version.value = 'v-2.0.0';
    ext3.rules.push(ext3Id, ext3Version);
    doc2.extensions.set(ext3.name, ext3);
    doc2.instances.set('ExtensionInstance', new Instance('ExtensionInstance'));
    doc2.instances.get('ExtensionInstance').instanceOf = 'StructureDefinition';
    doc2.instances.get('ExtensionInstance').usage = 'Definition';
    const extensionInstanceDerivation = new AssignmentRule('derivation');
    extensionInstanceDerivation.value = new FshCode('constraint');
    const extensionInstanceType = new AssignmentRule('type');
    extensionInstanceType.value = 'Extension';
    doc2.instances
      .get('ExtensionInstance')
      .rules.push(extensionInstanceDerivation, extensionInstanceType);
    const extensionInstance2 = new Instance('ExtensionInstance2');
    extensionInstance2.instanceOf = 'StructureDefinition';
    extensionInstance2.usage = 'Definition';
    const extensionInstance2Version = new AssignmentRule('version');
    extensionInstance2Version.value = 'v-2.0.0';
    extensionInstance2.rules.push(
      extensionInstanceDerivation,
      extensionInstanceType,
      extensionInstance2Version
    );
    doc2.instances.set(extensionInstance2.name, extensionInstance2);
    doc2.valueSets.set('ValueSet1', new FshValueSet('ValueSet1'));
    doc2.valueSets.get('ValueSet1').id = 'vs1';
    doc2.instances.set('ValueSetInstance', new Instance('ValueSetInstance'));
    doc2.instances.get('ValueSetInstance').instanceOf = 'ValueSet';
    doc2.instances.get('ValueSetInstance').usage = 'Definition';
    const valueSetInstance2 = new Instance('ValueSetInstance2');
    valueSetInstance2.instanceOf = 'ValueSet';
    valueSetInstance2.usage = 'Definition';
    const valueSetInstance2Version = new AssignmentRule('version');
    valueSetInstance2Version.value = 'v-2.0.0';
    valueSetInstance2.rules.push(valueSetInstance2Version);
    doc2.instances.set(valueSetInstance2.name, valueSetInstance2);
    doc2.codeSystems.set('CodeSystem1', new FshCodeSystem('CodeSystem1'));
    doc2.codeSystems.get('CodeSystem1').id = 'cs1';
    doc2.instances.set('CodeSystemInstance', new Instance('CodeSystemInstance'));
    doc2.instances.get('CodeSystemInstance').instanceOf = 'CodeSystem';
    doc2.instances.get('CodeSystemInstance').usage = 'Definition';
    const codeSystemInstance2 = new Instance('CodeSystemInstance2');
    codeSystemInstance2.instanceOf = 'CodeSystem';
    codeSystemInstance2.usage = 'Definition';
    const codeSystemInstance2Version = new AssignmentRule('version');
    codeSystemInstance2Version.value = 'v-2.0.0';
    codeSystemInstance2.rules.push(codeSystemInstance2Version);
    doc2.instances.set(codeSystemInstance2.name, codeSystemInstance2);
    doc2.logicals.set('Logical1', new Logical('Logical1'));
    doc2.logicals.get('Logical1').id = 'log1';
    doc2.logicals.get('Logical1').parent = 'Element';
    doc2.instances.set('LogicalInstance', new Instance('LogicalInstance'));
    doc2.instances.get('LogicalInstance').instanceOf = 'StructureDefinition';
    doc2.instances.get('LogicalInstance').usage = 'Definition';
    const logicalInstanceDerivation = new AssignmentRule('derivation');
    logicalInstanceDerivation.value = new FshCode('specialization');
    const logicalInstanceKind = new AssignmentRule('kind');
    logicalInstanceKind.value = new FshCode('logical');
    doc2.instances
      .get('LogicalInstance')
      .rules.push(logicalInstanceDerivation, logicalInstanceKind);
    const logicalInstance2 = new Instance('LogicalInstance2');
    logicalInstance2.instanceOf = 'StructureDefinition';
    logicalInstance2.usage = 'Definition';
    const logicalInstance2Version = new AssignmentRule('version');
    logicalInstance2Version.value = 'v-2.0.0';
    logicalInstance2.rules.push(
      logicalInstanceDerivation,
      logicalInstanceKind,
      logicalInstance2Version
    );
    doc2.instances.set(logicalInstance2.name, logicalInstance2);
    doc2.resources.set('Resource1', new Resource('Resource1'));
    doc2.resources.get('Resource1').id = 'res1';
    const doc3 = new FSHDocument('doc3.fsh');
    doc3.logicals.set('Logical2', new Logical('Logical2'));
    doc3.logicals.get('Logical2').id = 'log2';
    doc3.logicals.get('Logical2').parent = 'Logical1';
    doc3.resources.set('Resource2', new Resource('Resource2'));
    doc3.resources.get('Resource2').id = 'res2';
    doc3.instances.set('ResourceInstance', new Instance('ResourceInstance'));
    doc3.instances.get('ResourceInstance').instanceOf = 'StructureDefinition';
    doc3.instances.get('ResourceInstance').usage = 'Definition';
    const resourceInstanceDerivation = new AssignmentRule('derivation');
    resourceInstanceDerivation.value = new FshCode('specialization');
    const resourceInstanceKind = new AssignmentRule('kind');
    resourceInstanceKind.value = new FshCode('resource');
    doc3.instances
      .get('ResourceInstance')
      .rules.push(resourceInstanceDerivation, resourceInstanceKind);
    const resourceInstance2 = new Instance('ResourceInstance2');
    resourceInstance2.instanceOf = 'StructureDefinition';
    resourceInstance2.usage = 'Definition';
    const resourceInstance2Version = new AssignmentRule('version');
    resourceInstance2Version.value = 'v-2.0.0';
    resourceInstance2.rules.push(
      resourceInstanceDerivation,
      resourceInstanceKind,
      resourceInstance2Version
    );
    doc3.instances.set(resourceInstance2.name, resourceInstance2);
    doc3.valueSets.set('ValueSet2', new FshValueSet('ValueSet2'));
    doc3.valueSets.get('ValueSet2').id = 'vs2';
    const vs3 = new FshValueSet('ValueSet3');
    const vs3Id = new CaretValueRule('');
    vs3Id.caretPath = 'id';
    vs3Id.value = 'vs3';
    const vs3Version = new CaretValueRule('');
    vs3Version.caretPath = 'version';
    vs3Version.value = 'v-2.0.0';
    vs3.rules.push(vs3Id, vs3Version);
    doc3.valueSets.set(vs3.name, vs3);
    doc3.codeSystems.set('CodeSystem2', new FshCodeSystem('CodeSystem2'));
    doc3.codeSystems.get('CodeSystem2').id = 'cs2';
    const cs3 = new FshCodeSystem('CodeSystem3');
    const cs3Id = new CaretValueRule('');
    cs3Id.caretPath = 'id';
    cs3Id.value = 'cs3';
    const cs3Version = new CaretValueRule('');
    cs3Version.caretPath = 'version';
    cs3Version.value = 'v-2.0.0';
    cs3.rules.push(cs3Id, cs3Version);
    doc3.codeSystems.set(cs3.name, cs3);
    const log3 = new Logical('Logical3');
    const log3Id = new CaretValueRule('');
    log3Id.caretPath = 'version';
    log3Id.value = 'v-2.0.0';
    const log3Version = new CaretValueRule('');
    log3Version.caretPath = 'id';
    log3Version.value = 'log3';
    log3.rules.push(log3Id, log3Version);
    doc3.logicals.set(log3.name, log3);
    const res3 = new Resource('Resource3');
    const res3Id = new CaretValueRule('');
    res3Id.caretPath = 'id';
    res3Id.value = 'res3';
    const res3Version = new CaretValueRule('');
    res3Version.caretPath = 'version';
    res3Version.value = 'v-2.0.0';
    res3.rules.push(res3Id, res3Version);
    doc3.resources.set(res3.name, res3);
    doc3.instances.set('Instance1', new Instance('Instance1'));
    doc3.instances.get('Instance1').id = 'inst1';
    doc3.instances.get('Instance1').instanceOf = 'Condition';
    const inst2 = new Instance('Instance2');
    inst2.instanceOf = 'Condition';
    const inst2Id = new AssignmentRule('id');
    inst2Id.value = 'inst2';
    const inst2Version = new AssignmentRule('version');
    inst2Version.value = 'v-2.0.0';
    inst2.rules.push(inst2Id, inst2Version);
    doc3.instances.set(inst2.name, inst2);
    const idRuleset = new RuleSet('IdRuleset');
    const idAssignment = new AssignmentRule('id');
    idAssignment.value = 'inst3';
    idRuleset.rules.push(idAssignment);
    doc3.ruleSets.set(idRuleset.name, idRuleset);

    doc3.invariants.set('Invariant1', new Invariant('Invariant1'));
    doc3.invariants.get('Invariant1').description = 'first invariant';
    doc3.invariants.get('Invariant1').severity = new FshCode('error');
    doc3.ruleSets.set('RuleSet1', new RuleSet('RuleSet1'));
    doc3.mappings.set('Mapping1', new Mapping('Mapping1'));
    doc3.mappings.get('Mapping1').id = 'map1';

    tank = new FSHTank([doc1, doc2, doc3], minimalConfig);
  });

  describe('#fish', () => {
    it('should find valid fish when fishing by id for all types', () => {
      expect(tank.fish('prf1').name).toBe('Profile1');
      expect(tank.fish('ext1').name).toBe('Extension1');
      expect(tank.fish('vs1').name).toBe('ValueSet1');
      expect(tank.fish('cs1').name).toBe('CodeSystem1');
      expect(tank.fish('inst1').name).toBe('Instance1');
      expect(tank.fish('log1').name).toBe('Logical1');
      expect(tank.fish('res1').name).toBe('Resource1');
      // not applicable for Invariant or RuleSet or Mapping
    });

    it('should find valid fish when fishing by name for all types', () => {
      expect(tank.fish('Profile2').id).toBe('prf2');
      expect(tank.fish('Extension2').id).toBe('ext2');
      expect(tank.fish('ValueSet2').id).toBe('vs2');
      expect(tank.fish('CodeSystem2').id).toBe('cs2');
      expect(tank.fish('Instance1').id).toBe('inst1');
      expect(tank.fish('Invariant1').name).toBe('Invariant1');
      expect(tank.fish('RuleSet1').name).toBe('RuleSet1');
      expect(tank.fish('Mapping1').name).toBe('Mapping1');
      expect(tank.fish('Logical2').id).toBe('log2');
      expect(tank.fish('Resource2').id).toBe('res2');
    });

    it('should find valid fish when fishing by url for all types', () => {
      expect(tank.fish('http://hl7.org/fhir/us/minimal/StructureDefinition/prf1').name).toBe(
        'Profile1'
      );
      expect(tank.fish('http://hl7.org/fhir/us/minimal/StructureDefinition/ext1').name).toBe(
        'Extension1'
      );
      expect(tank.fish('http://hl7.org/fhir/us/minimal/ValueSet/vs1').name).toBe('ValueSet1');
      expect(tank.fish('http://hl7.org/fhir/us/minimal/CodeSystem/cs1').name).toBe('CodeSystem1');
      expect(tank.fish('http://hl7.org/fhir/us/minimal/StructureDefinition/log1').name).toBe(
        'Logical1'
      );
      expect(tank.fish('http://hl7.org/fhir/us/minimal/StructureDefinition/res2').name).toBe(
        'Resource2'
      );
      // not applicable for Instance or Invariant or RuleSet or Mapping
    });

    it('should not find fish when fishing by invalid name/id/url', () => {
      expect(tank.fish('ProfileFake')).toBeUndefined();
    });

    it('should only find profiles when profiles are requested', () => {
      expect(tank.fish('prf1', Type.Profile).name).toBe('Profile1');
      expect(
        tank.fish(
          'prf1',
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find profiles defined as instance definitions when profiles are requested', () => {
      expect(tank.fish('ProfileInstance', Type.Profile).name).toBe('ProfileInstance');
      expect(
        tank.fish(
          'ProfileInstance',
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should not find instances where the derivation is not constraint when profiles are requested', () => {
      const instance = tank.docs[0].instances.get('ProfileInstance');
      const profileInstanceDerivation = new AssignmentRule('derivation');
      profileInstanceDerivation.value = new FshCode('specialization');
      instance.rules = [profileInstanceDerivation];
      expect(tank.fish('ProfileInstance', Type.Profile)).toBeUndefined();
      instance.rules = [];
      expect(tank.fish('ProfileInstance', Type.Profile)).toBeUndefined();
    });

    it('should find a profile when fishing by id when the profile id is set by a caret rule', () => {
      expect(tank.fish('prf3').name).toBe('Profile3');
    });

    it('should find a profile when fishing with a version', () => {
      expect(tank.fish('prf1|1.0.0', Type.Profile).name).toBe('Profile1'); // tank.config.version = 1.0.0
    });

    it('should find a profile when fishing with a version that is set by a caret rule', () => {
      expect(tank.fish('prf3|v-2.0.0', Type.Profile).name).toBe('Profile3');
    });

    it('should not find a profile when fishing with a version that does not match', () => {
      expect(tank.fish('prf1|2.0.0', Type.Profile)).toBeUndefined();
    });

    it('should find a profile defined as an instance definition when fishing with a version', () => {
      expect(tank.fish('ProfileInstance|1.0.0', Type.Profile).name).toBe('ProfileInstance');
    });

    it('should find a profile defined as an instance definition when fishing with a version that is set by an assignment rule', () => {
      expect(tank.fish('ProfileInstance2|v-2.0.0', Type.Profile).name).toBe('ProfileInstance2');
    });

    it('should not find a profile defined as an instance definition when fishing with a version that does not match', () => {
      expect(tank.fish('ProfileInstance|2.0.0', Type.Profile)).toBeUndefined();
    });

    it('should only find extensions when extensions are requested', () => {
      expect(tank.fish('ext1', Type.Extension).name).toBe('Extension1');
      expect(
        tank.fish(
          'ext1',
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find extensions defined as instance definitions when extensions are requested', () => {
      expect(tank.fish('ExtensionInstance', Type.Extension).name).toBe('ExtensionInstance');
      expect(
        tank.fish(
          'ExtensionInstance',
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should not find instances where the type is not Extension when extensions are requested', () => {
      const instance = tank.docs[1].instances.get('ExtensionInstance');
      const extensionInstanceType = new AssignmentRule('type');
      extensionInstanceType.value = 'Observation';
      const extensionInstanceDerivation = new AssignmentRule('derivation');
      extensionInstanceDerivation.value = new FshCode('specialization');
      instance.rules = [extensionInstanceType, extensionInstanceDerivation];
      expect(tank.fish('ExtensionInstance', Type.Extension)).toBeUndefined();
      instance.rules = [];
      expect(tank.fish('ExtensionInstance', Type.Extension)).toBeUndefined();
    });

    it('should not find instances where the derivation is not constraint when extensions are requested', () => {
      const instance = tank.docs[1].instances.get('ExtensionInstance');
      const extensionInstanceType = new AssignmentRule('type');
      extensionInstanceType.value = 'Extension';
      const extensionInstanceDerivation = new AssignmentRule('derivation');
      extensionInstanceDerivation.value = new FshCode('specialization');
      instance.rules = [extensionInstanceType, extensionInstanceDerivation];
      expect(tank.fish('ExtensionInstance', Type.Extension)).toBeUndefined();
      instance.rules = [];
      expect(tank.fish('ExtensionInstance', Type.Extension)).toBeUndefined();
    });

    it('should find an extension when fishing by id when the extension id is set by a caret rule', () => {
      expect(tank.fish('ext3').name).toBe('Extension3');
    });

    it('should find an extension when fishing with a version', () => {
      expect(tank.fish('ext1|1.0.0', Type.Extension).name).toBe('Extension1'); // tank.config.version = 1.0.0
    });

    it('should find an extension when fishing with a version that is set by a caret rule', () => {
      expect(tank.fish('ext3|v-2.0.0', Type.Extension).name).toBe('Extension3');
    });

    it('should not find an extension when fishing with a version that does not match', () => {
      expect(tank.fish('ext1|2.0.0', Type.Extension)).toBeUndefined();
    });

    it('should find an extension defined as an instance definition when fishing with a version', () => {
      expect(tank.fish('ExtensionInstance|1.0.0', Type.Extension).name).toBe('ExtensionInstance');
    });

    it('should find an extension defined as an instance definition when fishing with a version that is set by an assignment rule', () => {
      expect(tank.fish('ExtensionInstance2|v-2.0.0', Type.Extension).name).toBe(
        'ExtensionInstance2'
      );
    });

    it('should not find an extension defined as an instance definition when fishing with a version that does not match', () => {
      expect(tank.fish('ExtensionInstance|2.0.0', Type.Extension)).toBeUndefined();
    });

    it('should only find logical models when logical models are requested', () => {
      expect(tank.fish('log1', Type.Logical).name).toBe('Logical1');
      expect(
        tank.fish(
          'log1',
          Type.Extension,
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find logical models defined as instance definitions when logical models are requested', () => {
      expect(tank.fish('LogicalInstance', Type.Logical).name).toBe('LogicalInstance');
      expect(
        tank.fish(
          'LogicalInstance',
          Type.Extension,
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find a logical model when fishing by id when the logical model id is set by a caret rule', () => {
      expect(tank.fish('log3').name).toBe('Logical3');
    });

    it('should find a logical when fishing with a version', () => {
      expect(tank.fish('log1|1.0.0', Type.Logical).name).toBe('Logical1'); // tank.config.version = 1.0.0
    });

    it('should find a logical when fishing with a version that is set by a caret rule', () => {
      expect(tank.fish('log3|v-2.0.0', Type.Logical).name).toBe('Logical3');
    });

    it('should not find a logical when fishing with a version that does not match', () => {
      expect(tank.fish('log1|2.0.0', Type.Logical)).toBeUndefined();
    });

    it('should find a logical defined as an instance definition when fishing with a version', () => {
      expect(tank.fish('LogicalInstance|1.0.0', Type.Logical).name).toBe('LogicalInstance');
    });

    it('should find a logical defined as an instance definition when fishing with a version that is set by an assignment rule', () => {
      expect(tank.fish('LogicalInstance2|v-2.0.0', Type.Logical).name).toBe('LogicalInstance2');
    });

    it('should not find a logical defined as an instance definition when fishing with a version that does not match', () => {
      expect(tank.fish('LogicalInstance|2.0.0', Type.Logical)).toBeUndefined();
    });

    it('should only find resources when resources are requested', () => {
      expect(tank.fish('res2', Type.Resource).name).toBe('Resource2');
      expect(
        tank.fish(
          'res2',
          Type.Extension,
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find resources defined as instance definitions when resources are requested', () => {
      expect(tank.fish('ResourceInstance', Type.Resource).name).toBe('ResourceInstance');
      expect(
        tank.fish(
          'ResourceInstance',
          Type.Extension,
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find a resource when fishing by id when the resource id is set by a caret rule', () => {
      expect(tank.fish('res3').name).toBe('Resource3');
    });

    it('should find a resource when fishing with a version', () => {
      expect(tank.fish('res1|1.0.0', Type.Resource).name).toBe('Resource1'); // tank.config.version = 1.0.0
    });

    it('should find a resource when fishing with a version that is set by a caret rule', () => {
      expect(tank.fish('res3|v-2.0.0', Type.Resource).name).toBe('Resource3');
    });

    it('should not find a resource when fishing with a version that does not match', () => {
      expect(tank.fish('res1|2.0.0', Type.Resource)).toBeUndefined();
    });

    it('should find a resource defined as an instance definition when fishing with a version', () => {
      expect(tank.fish('ResourceInstance|1.0.0', Type.Resource).name).toBe('ResourceInstance');
    });

    it('should find a resource defined as an instance definition when fishing with a version that is set by an assignment rule', () => {
      expect(tank.fish('ResourceInstance2|v-2.0.0', Type.Resource).name).toBe('ResourceInstance2');
    });

    it('should not find a resource defined as an instance definition when fishing with a version that does not match', () => {
      expect(tank.fish('ResourceInstance|2.0.0', Type.Resource)).toBeUndefined();
    });

    it('should only find valuesets when valuesets are requested', () => {
      expect(tank.fish('vs1', Type.ValueSet).name).toBe('ValueSet1');
      expect(
        tank.fish(
          'vs1',
          Type.Profile,
          Type.Extension,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find valuesets defined as instance definitions when valuesets are requested', () => {
      expect(tank.fish('ValueSetInstance', Type.ValueSet).name).toBe('ValueSetInstance');
      expect(
        tank.fish(
          'ValueSetInstance',
          Type.Profile,
          Type.Extension,
          Type.CodeSystem,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find a valueset when fishing by id when the valueset id is set by a caret rule', () => {
      expect(tank.fish('vs3').name).toBe('ValueSet3');
    });

    it('should find a valueset when fishing with a version', () => {
      expect(tank.fish('vs1|1.0.0', Type.ValueSet).name).toBe('ValueSet1'); // tank.config.version = 1.0.0
    });

    it('should find a valueset when fishing with a version that is set by a caret rule', () => {
      expect(tank.fish('vs3|v-2.0.0', Type.ValueSet).name).toBe('ValueSet3');
    });

    it('should not find a valueset when fishing with a version that does not match', () => {
      expect(tank.fish('vs1|2.0.0', Type.ValueSet)).toBeUndefined();
    });

    it('should find a valueset defined as an instance definition when fishing with a version', () => {
      expect(tank.fish('ValueSetInstance|1.0.0', Type.ValueSet).name).toBe('ValueSetInstance');
    });

    it('should find a valueset defined as an instance definition when fishing with a version that is set by an assignment rule', () => {
      expect(tank.fish('ValueSetInstance2|v-2.0.0', Type.ValueSet).name).toBe('ValueSetInstance2');
    });

    it('should not find a valueset defined as an instance definition when fishing with a version that does not match', () => {
      expect(tank.fish('ValueSetInstance|2.0.0', Type.ValueSet)).toBeUndefined();
    });

    it('should only find codesystems when codesystems are requested', () => {
      expect(tank.fish('cs1', Type.CodeSystem).name).toBe('CodeSystem1');
      expect(
        tank.fish(
          'cs1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find codesystems defined as instance definitions when codesystems are requested', () => {
      expect(tank.fish('CodeSystemInstance', Type.CodeSystem).name).toBe('CodeSystemInstance');
      expect(
        tank.fish(
          'CodeSystemInstance',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find a codesystem when fishing by id when the codesystem id is set by a caret rule', () => {
      expect(tank.fish('cs3').name).toBe('CodeSystem3');
    });

    it('should find a codesystem when fishing with a version', () => {
      expect(tank.fish('cs1|1.0.0', Type.CodeSystem).name).toBe('CodeSystem1'); // tank.config.version = 1.0.0
    });

    it('should find a codesystem when fishing with a version that is set by a caret rule', () => {
      expect(tank.fish('cs3|v-2.0.0', Type.CodeSystem).name).toBe('CodeSystem3');
    });

    it('should not find a codesystem when fishing with a version that does not match', () => {
      expect(tank.fish('cs1|2.0.0', Type.CodeSystem)).toBeUndefined();
    });

    it('should find a codesystem defined as an instance definition when fishing with a version', () => {
      expect(tank.fish('CodeSystemInstance|1.0.0', Type.CodeSystem).name).toBe(
        'CodeSystemInstance'
      );
    });

    it('should find a codesystem defined as an instance definition when fishing with a version that is set by an assignment rule', () => {
      expect(tank.fish('CodeSystemInstance2|v-2.0.0', Type.CodeSystem).name).toBe(
        'CodeSystemInstance2'
      );
    });

    it('should not find a codesystem defined as an instance definition when fishing with a version that does not match', () => {
      expect(tank.fish('CodeSystemInstance|2.0.0', Type.CodeSystem)).toBeUndefined();
    });

    it('should only find instances when instances are requested', () => {
      expect(tank.fish('inst1', Type.Instance).name).toBe('Instance1');
      expect(
        tank.fish(
          'inst1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find an instance when fishing by id when the instance id is set by an assignment rule', () => {
      expect(tank.fish('inst2').name).toBe('Instance2');
    });

    it('should find an instance when fishing with a version', () => {
      expect(tank.fish('inst1|1.0.0', Type.Instance).name).toBe('Instance1'); // tank.config.version = 1.0.0
    });

    it('should find an instance when fishing with a version that is set by an assignment rule', () => {
      expect(tank.fish('inst2|v-2.0.0', Type.Instance).name).toBe('Instance2');
    });

    it('should not find an instance when fishing with a version that does not match', () => {
      expect(tank.fish('inst1|2.0.0', Type.Instance)).toBeUndefined();
    });

    it('should only find invariants when invariants are requested', () => {
      expect(tank.fish('Invariant1', Type.Invariant).name).toBe('Invariant1');
      expect(
        tank.fish(
          'Invariant1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find ruleSets when ruleSets are requested', () => {
      expect(tank.fish('RuleSet1', Type.RuleSet).name).toBe('RuleSet1');
      expect(
        tank.fish(
          'RuleSet1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find ruleSets even if fishing with a version', () => {
      // NOTE: this doesn't make much sense and wouldn't happen in real FSH, but testing for completeness
      expect(tank.fish('RuleSet1|any', Type.RuleSet).name).toBe('RuleSet1');
    });

    it('should only find Mappings when Mappings are requested', () => {
      expect(tank.fish('Mapping1', Type.Mapping).name).toBe('Mapping1');
      expect(
        tank.fish(
          'Mapping1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should find Mappings even if fishing with a version', () => {
      // NOTE: this doesn't make much sense and wouldn't happen in real FSH, but testing for completeness
      expect(tank.fish('Mapping1|any', Type.Mapping).name).toBe('Mapping1');
    });
  });

  describe('#fishForMetadata', () => {
    const prf1MD: Metadata = {
      id: 'prf1',
      name: 'Profile1',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/prf1',
      parent: 'Observation',
      resourceType: 'StructureDefinition'
    };
    const ext1MD: Metadata = {
      id: 'ext1',
      name: 'Extension1',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ext1',
      parent: 'Extension2',
      resourceType: 'StructureDefinition'
    };
    const log1MD: Metadata = {
      id: 'log1',
      name: 'Logical1',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/log1',
      sdType: 'http://hl7.org/fhir/us/minimal/StructureDefinition/log1',
      parent: 'Element',
      resourceType: 'StructureDefinition',
      canBeTarget: false,
      canBind: false
    };
    const res1MD: Metadata = {
      id: 'res1',
      name: 'Resource1',
      parent: 'DomainResource',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/res1',
      resourceType: 'StructureDefinition'
    };
    const vs1MD: Metadata = {
      id: 'vs1',
      name: 'ValueSet1',
      url: 'http://hl7.org/fhir/us/minimal/ValueSet/vs1',
      resourceType: 'ValueSet'
    };
    const cs1MD: Metadata = {
      id: 'cs1',
      name: 'CodeSystem1',
      url: 'http://hl7.org/fhir/us/minimal/CodeSystem/cs1',
      resourceType: 'CodeSystem'
    };
    const inst1MD: Metadata = {
      id: 'inst1',
      name: 'Instance1',
      instanceUsage: 'Example'
    };
    const inv1MD: Metadata = {
      id: 'Invariant1', // id will always be name on Invariants
      name: 'Invariant1'
    };
    const rul1MD: Metadata = {
      id: 'RuleSet1', // id will always be name for RuleSets
      name: 'RuleSet1'
    };
    const map1MD: Metadata = {
      id: 'map1',
      name: 'Mapping1'
    };

    it('should find valid fish metadata when fishing by id for all types', () => {
      expect(tank.fishForMetadata('prf1')).toEqual(prf1MD);
      expect(tank.fishForMetadata('ext1')).toEqual(ext1MD);
      expect(tank.fishForMetadata('log1')).toEqual(log1MD);
      expect(tank.fishForMetadata('res1')).toEqual(res1MD);
      expect(tank.fishForMetadata('vs1')).toEqual(vs1MD);
      expect(tank.fishForMetadata('cs1')).toEqual(cs1MD);
      expect(tank.fishForMetadata('inst1')).toEqual(inst1MD);
      // not applicable for Invariant or RuleSet or Mapping
    });

    it('should find valid fish when fishing by name for all types', () => {
      expect(tank.fishForMetadata('Profile1')).toEqual(prf1MD);
      expect(tank.fishForMetadata('Extension1')).toEqual(ext1MD);
      expect(tank.fishForMetadata('Logical1')).toEqual(log1MD);
      expect(tank.fishForMetadata('Resource1')).toEqual(res1MD);
      expect(tank.fishForMetadata('ValueSet1')).toEqual(vs1MD);
      expect(tank.fishForMetadata('CodeSystem1')).toEqual(cs1MD);
      expect(tank.fishForMetadata('Instance1')).toEqual(inst1MD);
      expect(tank.fishForMetadata('Invariant1')).toEqual(inv1MD);
      expect(tank.fishForMetadata('RuleSet1')).toEqual(rul1MD);
      expect(tank.fishForMetadata('Mapping1')).toEqual(map1MD);
    });

    it('should find valid fish when fishing by url for all types', () => {
      expect(
        tank.fishForMetadata('http://hl7.org/fhir/us/minimal/StructureDefinition/prf1')
      ).toEqual(prf1MD);
      expect(
        tank.fishForMetadata('http://hl7.org/fhir/us/minimal/StructureDefinition/ext1')
      ).toEqual(ext1MD);
      expect(
        tank.fishForMetadata('http://hl7.org/fhir/us/minimal/StructureDefinition/log1')
      ).toEqual(log1MD);
      expect(
        tank.fishForMetadata('http://hl7.org/fhir/us/minimal/StructureDefinition/res1')
      ).toEqual(res1MD);
      expect(tank.fishForMetadata('http://hl7.org/fhir/us/minimal/ValueSet/vs1')).toEqual(vs1MD);
      expect(tank.fishForMetadata('http://hl7.org/fhir/us/minimal/CodeSystem/cs1')).toEqual(cs1MD);
      // not applicable for Instance or Invariant or RuleSet or Mapping
    });

    it('should find fsh imposeProfiles when they are declared using indexed rules', () => {
      const profile = new Profile('ImposeProfile1');
      profile.id = 'ip1';
      profile.parent = 'Patient';
      addIndexedImposeProfileExtension(profile, 'http://example.org/imposedProfileA', 0);
      addIndexedImposeProfileExtension(profile, 'http://example.org/imposedProfileB', 1);
      const doc4 = new FSHDocument('doc4.fsh');
      doc4.profiles.set(profile.name, profile);
      tank.docs.push(doc4);

      expect(tank.fishForMetadata('ImposeProfile1')).toEqual({
        id: 'ip1',
        name: 'ImposeProfile1',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ip1',
        parent: 'Patient',
        resourceType: 'StructureDefinition',
        imposeProfiles: ['http://example.org/imposedProfileA', 'http://example.org/imposedProfileB']
      });
    });

    it('should find fsh imposeProfiles when they are declared using indexed rules and default 0 index', () => {
      const profile = new Profile('ImposeProfile2');
      profile.id = 'ip2';
      profile.parent = 'Patient';
      addIndexedImposeProfileExtension(profile, 'http://example.org/imposedProfileA');
      addIndexedImposeProfileExtension(profile, 'http://example.org/imposedProfileB', 1);
      const doc4 = new FSHDocument('doc4.fsh');
      doc4.profiles.set(profile.name, profile);
      tank.docs.push(doc4);

      expect(tank.fishForMetadata('ImposeProfile2')).toEqual({
        id: 'ip2',
        name: 'ImposeProfile2',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ip2',
        parent: 'Patient',
        resourceType: 'StructureDefinition',
        imposeProfiles: ['http://example.org/imposedProfileA', 'http://example.org/imposedProfileB']
      });
    });

    it('should find fsh imposeProfiles when they are declared using named rules', () => {
      const profile = new Profile('ImposeProfile3');
      profile.id = 'ip3';
      profile.parent = 'Patient';
      addNamedImposeProfileExtension(profile, 'http://example.org/imposedProfileA');
      addNamedImposeProfileExtension(profile, 'http://example.org/imposedProfileB', 1);
      const doc4 = new FSHDocument('doc4.fsh');
      doc4.profiles.set(profile.name, profile);
      tank.docs.push(doc4);

      expect(tank.fishForMetadata('ImposeProfile3')).toEqual({
        id: 'ip3',
        name: 'ImposeProfile3',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ip3',
        parent: 'Patient',
        resourceType: 'StructureDefinition',
        imposeProfiles: ['http://example.org/imposedProfileA', 'http://example.org/imposedProfileB']
      });
    });

    it('should find fsh imposeProfiles when they are declared using named rules with aliases', () => {
      const profile = new Profile('ImposeProfile4');
      profile.id = 'ip4';
      profile.parent = 'Patient';
      addNamedImposeProfileExtension(profile, 'http://example.org/imposedProfileA', 0, '$IMPOSE');
      addNamedImposeProfileExtension(profile, 'http://example.org/imposedProfileB', 1), '$IMPOSE';
      const doc4 = new FSHDocument('doc4.fsh');
      doc4.aliases.set(
        '$IMPOSE',
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-imposeProfile'
      );
      doc4.profiles.set(profile.name, profile);
      tank.docs.push(doc4);

      expect(tank.fishForMetadata('ImposeProfile4')).toEqual({
        id: 'ip4',
        name: 'ImposeProfile4',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ip4',
        parent: 'Patient',
        resourceType: 'StructureDefinition',
        imposeProfiles: ['http://example.org/imposedProfileA', 'http://example.org/imposedProfileB']
      });
    });

    it('should find fsh imposeProfiles when they are declared using the Canonical keyword', () => {
      const doc4 = new FSHDocument('doc4.fsh');
      const imposedProfileA = new Profile('ImposedProfileA');
      imposedProfileA.id = 'ipA';
      imposedProfileA.parent = 'Patient';
      doc4.profiles.set(imposedProfileA.name, imposedProfileA);
      const imposedProfileB = new Profile('ImposedProfileB');
      imposedProfileB.id = 'ipB';
      imposedProfileB.parent = 'Patient';
      doc4.profiles.set(imposedProfileB.name, imposedProfileB);
      const profile = new Profile('ImposeProfile5');
      profile.id = 'ip5';
      profile.parent = 'Patient';
      addIndexedImposeProfileExtension(profile, new FshCanonical('ImposedProfileA'), 0);
      addIndexedImposeProfileExtension(profile, new FshCanonical('ImposedProfileB'), 1);
      doc4.profiles.set(profile.name, profile);
      tank.docs.push(doc4);

      expect(tank.fishForMetadata('ImposeProfile5')).toEqual({
        id: 'ip5',
        name: 'ImposeProfile5',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ip5',
        parent: 'Patient',
        resourceType: 'StructureDefinition',
        imposeProfiles: [new FshCanonical('ImposedProfileA'), new FshCanonical('ImposedProfileB')]
      });
    });

    it('should not find fish when fishing by invalid name/id/url', () => {
      expect(tank.fishForMetadata('ProfileFake')).toBeUndefined();
    });

    it('should only find profiles when profiles are requested', () => {
      expect(tank.fishForMetadata('prf1', Type.Profile)).toEqual(prf1MD);
      expect(
        tank.fishForMetadata(
          'prf1',
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find extensions when extensions are requested', () => {
      expect(tank.fishForMetadata('ext1', Type.Extension)).toEqual(ext1MD);
      expect(
        tank.fishForMetadata(
          'ext1',
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find logical models when logical models are requested', () => {
      expect(tank.fishForMetadata('log1', Type.Logical)).toEqual(log1MD);
      expect(
        tank.fishForMetadata(
          'log1',
          Type.Extension,
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find resources when resources are requested', () => {
      expect(tank.fishForMetadata('res1', Type.Resource)).toEqual(res1MD);
      expect(
        tank.fishForMetadata(
          'res1',
          Type.Extension,
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find valuesets when valuesets are requested', () => {
      expect(tank.fishForMetadata('vs1', Type.ValueSet)).toEqual(vs1MD);
      expect(
        tank.fishForMetadata(
          'vs1',
          Type.Profile,
          Type.Extension,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find codesystems when codesystems are requested', () => {
      expect(tank.fishForMetadata('cs1', Type.CodeSystem)).toEqual(cs1MD);
      expect(
        tank.fishForMetadata(
          'cs1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find instances when instances are requested', () => {
      expect(tank.fishForMetadata('inst1', Type.Instance)).toEqual(inst1MD);
      expect(
        tank.fishForMetadata(
          'inst1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Invariant,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find invariants when invariants are requested', () => {
      expect(tank.fishForMetadata('Invariant1', Type.Invariant)).toEqual(inv1MD);
      expect(
        tank.fishForMetadata(
          'Invariant1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.RuleSet,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find ruleSets when ruleSets are requested', () => {
      expect(tank.fishForMetadata('RuleSet1', Type.RuleSet)).toEqual(rul1MD);
      expect(
        tank.fishForMetadata(
          'RuleSet1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.Mapping,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find Mappings when Mappings are requested', () => {
      expect(tank.fishForMetadata('Mapping1', Type.Mapping)).toEqual(map1MD);
      expect(
        tank.fishForMetadata(
          'Mapping1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Invariant,
          Type.RuleSet,
          Type.Logical,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });
  });

  describe('#fishForFHIR', () => {
    it('should never return any results for fishForFHIR', () => {
      expect(tank.fishForFHIR('prf1')).toBeUndefined();
      expect(tank.fishForFHIR('prf1', Type.Profile)).toBeUndefined();
      expect(tank.fishForFHIR('Profile2')).toBeUndefined();
      expect(
        tank.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/prf1')
      ).toBeUndefined();
      expect(tank.fishForFHIR('ext1')).toBeUndefined();
      expect(tank.fishForFHIR('ext1', Type.Extension)).toBeUndefined();
      expect(tank.fishForFHIR('Extension2')).toBeUndefined();
      expect(
        tank.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/ext1')
      ).toBeUndefined();
      expect(tank.fishForFHIR('log1')).toBeUndefined();
      expect(tank.fishForFHIR('log1', Type.Logical)).toBeUndefined();
      expect(tank.fishForFHIR('Logical2')).toBeUndefined();
      expect(
        tank.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/log1')
      ).toBeUndefined();
      expect(tank.fishForFHIR('ref1')).toBeUndefined();
      expect(tank.fishForFHIR('ref1', Type.Resource)).toBeUndefined();
      expect(tank.fishForFHIR('Reference2')).toBeUndefined();
      expect(
        tank.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/ref1')
      ).toBeUndefined();
      expect(tank.fishForFHIR('vs1')).toBeUndefined();
      expect(tank.fishForFHIR('vs1', Type.ValueSet)).toBeUndefined();
      expect(tank.fishForFHIR('ValueSet2')).toBeUndefined();
      expect(tank.fishForFHIR('http://hl7.org/fhir/us/minimal/ValueSet/vs1')).toBeUndefined();
      expect(tank.fishForFHIR('cs1')).toBeUndefined();
      expect(tank.fishForFHIR('cs1', Type.CodeSystem)).toBeUndefined();
      expect(tank.fishForFHIR('CodeSystem2')).toBeUndefined();
      expect(tank.fishForFHIR('http://hl7.org/fhir/us/minimal/ValueSet/vs1')).toBeUndefined();
      expect(tank.fishForFHIR('inst1')).toBeUndefined();
      expect(tank.fishForFHIR('inst1', Type.Instance)).toBeUndefined();
      expect(tank.fishForFHIR('Instance1')).toBeUndefined();
      expect(tank.fishForFHIR('Invariant1')).toBeUndefined();
      expect(tank.fishForFHIR('Invariant1', Type.Invariant)).toBeUndefined();
      expect(tank.fishForFHIR('RuleSet1')).toBeUndefined();
      expect(tank.fishForFHIR('RuleSet1', Type.RuleSet)).toBeUndefined();
      expect(tank.fishForFHIR('map1')).toBeUndefined();
      expect(tank.fishForFHIR('map1', Type.Mapping)).toBeUndefined();
      expect(tank.fishForFHIR('Mapping1')).toBeUndefined();
    });
  });
});

describe('FSHTank for HL7', () => {
  const hl7Config: Configuration = {
    filePath: 'sushi-config.yaml',
    id: 'hl7.fhir',
    canonical: 'http://hl7.org/fhir',
    name: 'HL7',
    status: 'draft',
    version: '4.9.0',
    fhirVersion: ['4.9.0'],
    template: 'hl7.fhir.template#0.0.5'
  };

  let hl7Tank: FSHTank;
  beforeEach(() => {
    const hl7Doc = new FSHDocument('HL7Doc.fsh');
    hl7Doc.logicals.set('HL7Logical', new Logical('HL7Logical'));
    hl7Doc.logicals.get('HL7Logical').id = 'hl7-log';
    hl7Doc.logicals.get('HL7Logical').parent = 'Element';

    hl7Tank = new FSHTank([hl7Doc], hl7Config);
  });

  describe('#fishForMetadata', () => {
    const hl7logMD: Metadata = {
      id: 'hl7-log',
      name: 'HL7Logical',
      url: 'http://hl7.org/fhir/StructureDefinition/hl7-log',
      sdType: 'hl7-log',
      parent: 'Element',
      resourceType: 'StructureDefinition',
      canBeTarget: false,
      canBind: false
    };

    it('should find valid HL7 fish metadata when fishing by id for logical models', () => {
      expect(hl7Tank.fishForMetadata('hl7-log')).toEqual(hl7logMD);
    });
  });
});

function addIndexedImposeProfileExtension(
  profile: Profile,
  imposedProfile: string | FshCanonical,
  index?: number
) {
  const extension = index != null ? `extension[${index}]` : 'extension';
  const extensionUrlRule = new CaretValueRule('');
  extensionUrlRule.caretPath = `${extension}.url`;
  extensionUrlRule.value =
    'http://hl7.org/fhir/StructureDefinition/structuredefinition-imposeProfile';
  const extensionValueRule = new CaretValueRule('');
  extensionValueRule.caretPath = `${extension}.valueCanonical`;
  extensionValueRule.value = imposedProfile;
  profile.rules.push(extensionUrlRule, extensionValueRule);
}

function addNamedImposeProfileExtension(
  profile: Profile,
  imposedProfile: string | FshCanonical,
  index = 0,
  name = 'http://hl7.org/fhir/StructureDefinition/structuredefinition-imposeProfile'
) {
  const extension = `extension[${name}]${index > 0 ? `[${index}]` : ''}`;
  const extensionRule = new CaretValueRule('');
  extensionRule.caretPath = `${extension}.valueCanonical`;
  extensionRule.value = imposedProfile;
  profile.rules.push(extensionRule);
}
