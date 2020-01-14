import { FSHTank, FSHDocument } from '../../src/import';
import { Profile, Extension, FshValueSet, Instance } from '../../src/fshtypes';
import { Type, Metadata } from '../../src/utils/Fishable';

describe('FSHTank', () => {
  let tank: FSHTank;
  beforeEach(() => {
    const doc1 = new FSHDocument('doc1.fsh');
    doc1.aliases.set('FOO', 'http://foo.com');
    doc1.profiles.set('Profile1', new Profile('Profile1'));
    doc1.profiles.get('Profile1').id = 'prf1';
    doc1.profiles.get('Profile1').parent = 'Observation';
    doc1.profiles.set('Profile2', new Profile('Profile2'));
    doc1.extensions.set('Extension1', new Extension('Extension1'));
    doc1.extensions.get('Extension1').id = 'ext1';
    doc1.extensions.get('Extension1').parent = 'Extension2';
    const doc2 = new FSHDocument('doc2.fsh');
    doc2.aliases.set('BAR', 'http://bar.com');
    doc2.extensions.set('Extension2', new Extension('Extension2'));
    doc2.valueSets.set('ValueSet1', new FshValueSet('ValueSet1'));
    doc2.valueSets.get('ValueSet1').id = 'vs1';
    const doc3 = new FSHDocument('doc3.fsh');
    doc3.valueSets.set('ValueSet2', new FshValueSet('ValueSet2'));
    doc3.instances.set('Instance1', new Instance('Instance1'));
    doc3.instances.get('Instance1').id = 'inst1';
    doc3.instances.get('Instance1').instanceOf = 'Condition';

    tank = new FSHTank([doc1, doc2, doc3], {
      name: 'test',
      canonical: 'http://example.org',
      version: '0.0.1'
    });
  });

  describe('#fish', () => {
    it('should find valid fish when fishing by id for all types', () => {
      expect(tank.fish('prf1').name).toBe('Profile1');
      expect(tank.fish('ext1').name).toBe('Extension1');
      expect(tank.fish('vs1').name).toBe('ValueSet1');
      expect(tank.fish('inst1').name).toBe('Instance1');
    });

    it('should find valid fish when fishing by name for all types', () => {
      expect(tank.fish('Profile2').name).toBe('Profile2');
      expect(tank.fish('Extension2').name).toBe('Extension2');
      expect(tank.fish('ValueSet2').name).toBe('ValueSet2');
      expect(tank.fish('Instance1').name).toBe('Instance1');
    });

    it('should find valid fish when fishing by url for all types', () => {
      expect(tank.fish('http://example.org/StructureDefinition/prf1').name).toBe('Profile1');
      expect(tank.fish('http://example.org/StructureDefinition/ext1').name).toBe('Extension1');
      expect(tank.fish('http://example.org/ValueSet/vs1').name).toBe('ValueSet1');
      // not applicable for Instance
    });

    it('should not find fish when fishing by invalid name/id/url', () => {
      expect(tank.fish('Profile3')).toBeUndefined();
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
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
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
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
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
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
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
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });
  });

  describe('#fishForMetadata', () => {
    const prf1MD: Metadata = {
      id: 'prf1',
      name: 'Profile1',
      url: 'http://example.org/StructureDefinition/prf1',
      parent: 'Observation'
    };
    const ext1MD: Metadata = {
      id: 'ext1',
      name: 'Extension1',
      url: 'http://example.org/StructureDefinition/ext1',
      parent: 'Extension2'
    };
    const vs1MD: Metadata = {
      id: 'vs1',
      name: 'ValueSet1',
      url: 'http://example.org/ValueSet/vs1'
    };
    const inst1MD: Metadata = {
      id: 'inst1',
      name: 'Instance1',
      instanceOf: 'Condition'
    };
    it('should find valid fish metadata when fishing by id for all types', () => {
      expect(tank.fishForMetadata('prf1')).toEqual(prf1MD);
      expect(tank.fishForMetadata('ext1')).toEqual(ext1MD);
      expect(tank.fishForMetadata('vs1')).toEqual(vs1MD);
      expect(tank.fishForMetadata('inst1')).toEqual(inst1MD);
    });

    it('should find valid fish when fishing by name for all types', () => {
      expect(tank.fishForMetadata('Profile1')).toEqual(prf1MD);
      expect(tank.fishForMetadata('Extension1')).toEqual(ext1MD);
      expect(tank.fishForMetadata('ValueSet1')).toEqual(vs1MD);
      expect(tank.fishForMetadata('Instance1')).toEqual(inst1MD);
    });

    it('should find valid fish when fishing by url for all types', () => {
      expect(tank.fishForMetadata('http://example.org/StructureDefinition/prf1')).toEqual(prf1MD);
      expect(tank.fishForMetadata('http://example.org/StructureDefinition/ext1')).toEqual(ext1MD);
      expect(tank.fishForMetadata('http://example.org/ValueSet/vs1')).toEqual(vs1MD);
      // not applicable for Instance
    });

    it('should not find fish when fishing by invalid name/id/url', () => {
      expect(tank.fishForMetadata('Profile3')).toBeUndefined();
    });

    it('should only find profiles when profiles are requested', () => {
      expect(tank.fishForMetadata('prf1', Type.Profile)).toEqual(prf1MD);
      expect(
        tank.fish(
          'prf1',
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find extensions when extensions are requested', () => {
      expect(tank.fishForMetadata('ext1', Type.Extension)).toEqual(ext1MD);
      expect(
        tank.fish(
          'ext1',
          Type.Profile,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find valuesets when valuesets are requested', () => {
      expect(tank.fishForMetadata('vs1', Type.ValueSet)).toEqual(vs1MD);
      expect(
        tank.fish(
          'vs1',
          Type.Profile,
          Type.Extension,
          Type.CodeSystem,
          Type.Instance,
          Type.Resource,
          Type.Type
        )
      ).toBeUndefined();
    });

    it('should only find instances when instances are requested', () => {
      expect(tank.fishForMetadata('inst1', Type.Instance)).toEqual(inst1MD);
      expect(
        tank.fish(
          'inst1',
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
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
      expect(tank.fishForFHIR('http://example.org/StructureDefinition/prf1')).toBeUndefined();
      expect(tank.fishForFHIR('ext1')).toBeUndefined();
      expect(tank.fishForFHIR('ext1', Type.Extension)).toBeUndefined();
      expect(tank.fishForFHIR('Extension2')).toBeUndefined();
      expect(tank.fishForFHIR('http://example.org/StructureDefinition/ext1')).toBeUndefined();
      expect(tank.fishForFHIR('vs1')).toBeUndefined();
      expect(tank.fishForFHIR('vs1', Type.ValueSet)).toBeUndefined();
      expect(tank.fishForFHIR('ValueSet2')).toBeUndefined();
      expect(tank.fishForFHIR('http://example.org/ValueSet/vs1')).toBeUndefined();
      expect(tank.fishForFHIR('inst1')).toBeUndefined();
      expect(tank.fishForFHIR('inst1', Type.Instance)).toBeUndefined();
      expect(tank.fishForFHIR('Instance1')).toBeUndefined();
    });
  });
});
