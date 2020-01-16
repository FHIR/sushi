import { Package } from '../../src/export';
import { ValueSet, StructureDefinition, InstanceDefinition, CodeSystem } from '../../src/fhirtypes';
import { Type } from '../../src/utils/Fishable';

describe('Package', () => {
  const pkg: Package = new Package({
    name: 'test',
    canonical: 'http://example.org',
    version: '0.0.1'
  });
  beforeAll(() => {
    // Profile[0]: Funny / fun-ny / Condition
    const profile0 = new StructureDefinition();
    profile0.name = 'Funny';
    profile0.id = 'fun-ny';
    profile0.type = 'Condition';
    profile0.url = 'http://example.org/StructureDefinition/fun-ny';
    profile0.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Condition';
    profile0.fhirVersion = '4.0.1';
    pkg.profiles.push(profile0);
    // Profile[1]: Sanguine / san-guine / Condition
    const profile1 = new StructureDefinition();
    profile1.name = 'Sanguine';
    profile1.id = 'san-guine';
    profile1.type = 'Condition';
    profile1.url = 'http://example.org/StructureDefinition/san-guine';
    profile1.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Condition';
    profile1.fhirVersion = '4.0.1';
    pkg.profiles.push(profile1);
    // Extension[0]: PreferredBeatle / preferred-beatle
    const extension0 = new StructureDefinition();
    extension0.name = 'PreferredBeatle';
    extension0.id = 'preferred-beatle';
    extension0.type = 'Extension';
    extension0.url = 'http://example.org/StructureDefinition/preferred-beatle';
    extension0.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Extension';
    extension0.fhirVersion = '4.0.1';
    pkg.extensions.push(extension0);
    // Extension[1]: PoorTaste / poor-taste
    const extension1 = new StructureDefinition();
    extension1.name = 'PoorTaste';
    extension1.id = 'poor-taste';
    extension1.type = 'Extension';
    extension1.url = 'http://example.org/StructureDefinition/poor-taste';
    extension1.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Extension';
    extension1.fhirVersion = '4.0.1';
    pkg.extensions.push(extension1);
    // ValueSet[0]: Soups / soup-flavors
    const valueset0 = new ValueSet();
    valueset0.name = 'Soups';
    valueset0.id = 'soup-flavors';
    valueset0.url = 'http://example.org/ValueSet/soup-flavors';
    valueset0.version = '4.0.1';
    pkg.valueSets.push(valueset0);
    // ValueSet[1]: Cheeses / cheese-flavors
    const valueset1 = new ValueSet();
    valueset1.name = 'Cheeses';
    valueset1.id = 'cheese-flavors';
    valueset1.url = 'http://example.org/ValueSet/cheese-flavors';
    valueset1.version = '4.0.1';
    pkg.valueSets.push(valueset1);
    // CodeSystem[0]: Letters / alphas
    const codeSystem0 = new CodeSystem();
    codeSystem0.name = 'Letters';
    codeSystem0.id = 'alphas';
    codeSystem0.url = 'http://example.org/CodeSystem/alphas';
    codeSystem0.version = '4.0.1';
    pkg.codeSystems.push(codeSystem0);
    // CodeSystem[1]: Numbers / numerics
    const codeSystem1 = new CodeSystem();
    codeSystem1.name = 'Numbers';
    codeSystem1.id = 'numerics';
    codeSystem1.url = 'http://example.org/CodeSystem/numerics';
    codeSystem1.version = '4.0.1';
    pkg.codeSystems.push(codeSystem1);
    // Instance[0]: DrSue / dr-sue / Practitioner
    const instance0 = new InstanceDefinition();
    instance0.instanceName = 'DrSue';
    instance0.id = 'dr-sue';
    instance0.resourceType = 'Practitioner';
    instance0.gender = 'female';
    pkg.instances.push(instance0);
    // Instance[0]: DrBob / dr-bob / Practitioner
    const instance1 = new InstanceDefinition();
    instance1.instanceName = 'DrBob';
    instance1.id = 'dr-bob';
    instance1.resourceType = 'Practitioner';
    instance1.gender = 'male';
    pkg.instances.push(instance1);
  });

  describe('#fishForFHIR()', () => {
    it('should find profiles', () => {
      const funnyProfile = pkg.fishForFHIR('fun-ny', Type.Profile);
      expect(funnyProfile.url).toBe('http://example.org/StructureDefinition/fun-ny');
      expect(funnyProfile.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('Funny', Type.Profile)).toEqual(funnyProfile);
      expect(
        pkg.fishForFHIR('http://example.org/StructureDefinition/fun-ny', Type.Profile)
      ).toEqual(funnyProfile);
    });

    it('should find extensions', () => {
      const poorTasteExtensionByID = pkg.fishForFHIR('poor-taste', Type.Extension);
      expect(poorTasteExtensionByID.url).toBe('http://example.org/StructureDefinition/poor-taste');
      expect(poorTasteExtensionByID.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('PoorTaste', Type.Extension)).toEqual(poorTasteExtensionByID);
      expect(
        pkg.fishForFHIR('http://example.org/StructureDefinition/poor-taste', Type.Extension)
      ).toEqual(poorTasteExtensionByID);
    });

    it('should find value sets', () => {
      const soupsValueSetByID = pkg.fishForFHIR('soup-flavors', Type.ValueSet);
      expect(soupsValueSetByID.url).toBe('http://example.org/ValueSet/soup-flavors');
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(soupsValueSetByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Soups', Type.ValueSet)).toEqual(soupsValueSetByID);
      expect(pkg.fishForFHIR('http://example.org/ValueSet/soup-flavors', Type.ValueSet)).toEqual(
        soupsValueSetByID
      );
    });

    it('should find code systems', () => {
      const numericsCodeSystemByID = pkg.fishForFHIR('numerics', Type.CodeSystem);
      expect(numericsCodeSystemByID.url).toBe('http://example.org/CodeSystem/numerics');
      // For some reason, code systems don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(numericsCodeSystemByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Numbers', Type.CodeSystem)).toEqual(numericsCodeSystemByID);
      expect(pkg.fishForFHIR('http://example.org/CodeSystem/numerics', Type.CodeSystem)).toEqual(
        numericsCodeSystemByID
      );
    });

    it('should find instances', () => {
      const drSueInstanceById = pkg.fishForFHIR('dr-sue', Type.Instance);
      expect(drSueInstanceById.id).toBe('dr-sue');
      expect(drSueInstanceById.gender).toBe('female');
      expect(pkg.fishForFHIR('DrSue', Type.Instance)).toEqual(drSueInstanceById);
    });

    it('should not find the definition when the type is not requested', () => {
      const funnyProfileByID = pkg.fishForFHIR(
        'fun-ny',
        Type.Resource,
        Type.Type,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(funnyProfileByID).toBeUndefined();

      const poorTasteExtensionByID = pkg.fishForFHIR(
        'poor-taste',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(poorTasteExtensionByID).toBeUndefined();

      const soupsValueSetByID = pkg.fishForFHIR(
        'soup-flavors',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.CodeSystem,
        Type.Instance
      );
      expect(soupsValueSetByID).toBeUndefined();

      const numericsCodeSystemByID = pkg.fishForFHIR(
        'numerics',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.Instance
      );
      expect(numericsCodeSystemByID).toBeUndefined();

      const drSueInstanceByID = pkg.fishForFHIR(
        'dr-sue',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem
      );
      expect(drSueInstanceByID).toBeUndefined();
    });

    it('should globally find any definition', () => {
      const funnyProfileByID = pkg.fishForFHIR('fun-ny');
      expect(funnyProfileByID.name).toBe('Funny');
      expect(funnyProfileByID.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('Funny')).toEqual(funnyProfileByID);
      expect(pkg.fishForFHIR('http://example.org/StructureDefinition/fun-ny')).toEqual(
        funnyProfileByID
      );

      const poorTasteExtensionByID = pkg.fishForFHIR('poor-taste');
      expect(poorTasteExtensionByID.name).toBe('PoorTaste');
      expect(poorTasteExtensionByID.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('PoorTaste')).toEqual(poorTasteExtensionByID);
      expect(pkg.fishForFHIR('http://example.org/StructureDefinition/poor-taste')).toEqual(
        poorTasteExtensionByID
      );

      const soupsValueSetByID = pkg.fishForFHIR('soup-flavors');
      expect(soupsValueSetByID.name).toBe('Soups');
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(soupsValueSetByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Soups')).toEqual(soupsValueSetByID);
      expect(pkg.fishForFHIR('http://example.org/ValueSet/soup-flavors')).toEqual(
        soupsValueSetByID
      );

      const numericsCodeSystemByID = pkg.fishForFHIR('numerics');
      expect(numericsCodeSystemByID.name).toBe('Numbers');
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(numericsCodeSystemByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Numbers')).toEqual(numericsCodeSystemByID);
      expect(pkg.fishForFHIR('http://example.org/CodeSystem/numerics')).toEqual(
        numericsCodeSystemByID
      );

      const drSueInstanceByID = pkg.fishForFHIR('dr-sue');
      expect(drSueInstanceByID.gender).toBe('female');
      expect(pkg.fishForFHIR('DrSue')).toEqual(drSueInstanceByID);
    });
  });

  describe('#fishForMetadata()', () => {
    it('should find profiles', () => {
      const funnyProfile = pkg.fishForMetadata('fun-ny', Type.Profile);
      expect(funnyProfile).toEqual({
        id: 'fun-ny',
        name: 'Funny',
        sdType: 'Condition',
        url: 'http://example.org/StructureDefinition/fun-ny',
        parent: 'http://hl7.org/fhir/StructureDefinition/Condition'
      });
      expect(pkg.fishForMetadata('Funny', Type.Profile)).toEqual(funnyProfile);
      expect(
        pkg.fishForMetadata('http://example.org/StructureDefinition/fun-ny', Type.Profile)
      ).toEqual(funnyProfile);
    });

    it('should find extensions', () => {
      const poorTasteExtensionByID = pkg.fishForMetadata('poor-taste', Type.Extension);
      expect(poorTasteExtensionByID).toEqual({
        id: 'poor-taste',
        name: 'PoorTaste',
        sdType: 'Extension',
        url: 'http://example.org/StructureDefinition/poor-taste',
        parent: 'http://hl7.org/fhir/StructureDefinition/Extension'
      });
      expect(pkg.fishForMetadata('PoorTaste', Type.Extension)).toEqual(poorTasteExtensionByID);
      expect(
        pkg.fishForMetadata('http://example.org/StructureDefinition/poor-taste', Type.Extension)
      ).toEqual(poorTasteExtensionByID);
    });

    it('should find value sets', () => {
      const soupsValueSetByID = pkg.fishForMetadata('soup-flavors', Type.ValueSet);
      expect(soupsValueSetByID).toEqual({
        id: 'soup-flavors',
        name: 'Soups',
        url: 'http://example.org/ValueSet/soup-flavors'
      });
      expect(pkg.fishForMetadata('Soups', Type.ValueSet)).toEqual(soupsValueSetByID);
      expect(
        pkg.fishForMetadata('http://example.org/ValueSet/soup-flavors', Type.ValueSet)
      ).toEqual(soupsValueSetByID);
    });

    it('should find code systems', () => {
      const numericsCodeSystemByID = pkg.fishForMetadata('numerics', Type.CodeSystem);
      expect(numericsCodeSystemByID).toEqual({
        id: 'numerics',
        name: 'Numbers',
        url: 'http://example.org/CodeSystem/numerics'
      });
      expect(pkg.fishForMetadata('Numbers', Type.CodeSystem)).toEqual(numericsCodeSystemByID);
      expect(
        pkg.fishForMetadata('http://example.org/CodeSystem/numerics', Type.CodeSystem)
      ).toEqual(numericsCodeSystemByID);
    });

    it('should find instances', () => {
      const drSueInstanceById = pkg.fishForMetadata('dr-sue', Type.Instance);
      expect(drSueInstanceById).toEqual({
        id: 'dr-sue',
        name: 'DrSue',
        instanceOf: 'Practitioner'
      });
      expect(pkg.fishForMetadata('DrSue', Type.Instance)).toEqual(drSueInstanceById);
    });

    it('should not find the definition when the type is not requested', () => {
      const funnyProfileByID = pkg.fishForMetadata(
        'fun-ny',
        Type.Resource,
        Type.Type,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(funnyProfileByID).toBeUndefined();

      const poorTasteExtensionByID = pkg.fishForMetadata(
        'poor-taste',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(poorTasteExtensionByID).toBeUndefined();

      const soupsValueSetByID = pkg.fishForMetadata(
        'soup-flavors',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.CodeSystem,
        Type.Instance
      );
      expect(soupsValueSetByID).toBeUndefined();

      const numericsCodeSystemByID = pkg.fishForMetadata(
        'numerics',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.Instance
      );
      expect(numericsCodeSystemByID).toBeUndefined();

      const drSueInstanceByID = pkg.fishForMetadata(
        'dr-sue',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem
      );
      expect(drSueInstanceByID).toBeUndefined();
    });

    it('should globally find any definition', () => {
      const funnyProfileByID = pkg.fishForMetadata('fun-ny');
      expect(funnyProfileByID).toEqual({
        id: 'fun-ny',
        name: 'Funny',
        sdType: 'Condition',
        url: 'http://example.org/StructureDefinition/fun-ny',
        parent: 'http://hl7.org/fhir/StructureDefinition/Condition'
      });
      expect(pkg.fishForMetadata('Funny')).toEqual(funnyProfileByID);
      expect(pkg.fishForMetadata('http://example.org/StructureDefinition/fun-ny')).toEqual(
        funnyProfileByID
      );

      const poorTasteExtensionByID = pkg.fishForMetadata('poor-taste');
      expect(poorTasteExtensionByID).toEqual({
        id: 'poor-taste',
        name: 'PoorTaste',
        sdType: 'Extension',
        url: 'http://example.org/StructureDefinition/poor-taste',
        parent: 'http://hl7.org/fhir/StructureDefinition/Extension'
      });
      expect(pkg.fishForMetadata('PoorTaste')).toEqual(poorTasteExtensionByID);
      expect(pkg.fishForMetadata('http://example.org/StructureDefinition/poor-taste')).toEqual(
        poorTasteExtensionByID
      );

      const soupsValueSetByID = pkg.fishForMetadata('soup-flavors');
      expect(soupsValueSetByID).toEqual({
        id: 'soup-flavors',
        name: 'Soups',
        url: 'http://example.org/ValueSet/soup-flavors'
      });
      expect(pkg.fishForMetadata('Soups')).toEqual(soupsValueSetByID);
      expect(pkg.fishForMetadata('http://example.org/ValueSet/soup-flavors')).toEqual(
        soupsValueSetByID
      );

      const numericsCodeSystemByID = pkg.fishForMetadata('numerics');
      expect(numericsCodeSystemByID).toEqual({
        id: 'numerics',
        name: 'Numbers',
        url: 'http://example.org/CodeSystem/numerics'
      });
      expect(pkg.fishForMetadata('Numbers')).toEqual(numericsCodeSystemByID);
      expect(pkg.fishForMetadata('http://example.org/CodeSystem/numerics')).toEqual(
        numericsCodeSystemByID
      );

      const drSueInstanceByID = pkg.fishForMetadata('dr-sue');
      expect(drSueInstanceByID).toEqual({
        id: 'dr-sue',
        name: 'DrSue',
        instanceOf: 'Practitioner'
      });

      expect(pkg.fishForMetadata('DrSue')).toEqual(drSueInstanceByID);
    });
  });
});
