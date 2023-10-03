import { Package } from '../../src/export';
import { CodeSystem, InstanceDefinition, StructureDefinition, ValueSet } from '../../src/fhirtypes';
import { Type } from '../../src/utils/Fishable';
import { minimalConfig } from '../utils/minimalConfig';

describe('Package', () => {
  const pkg: Package = new Package(minimalConfig);
  pkg.config.url = 'http://not-an-auto-generated-url.org';
  beforeAll(() => {
    // Profile[0]: Funny / fun-ny / Condition
    const profile0 = new StructureDefinition();
    profile0.name = 'Funny';
    profile0.id = 'fun-ny';
    profile0.type = 'Condition';
    profile0.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny';
    profile0.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Condition';
    profile0.fhirVersion = '4.0.1';
    profile0.version = '1.0.0';
    pkg.profiles.push(profile0);
    // Profile[1]: Sanguine / san-guine / Condition
    const profile1 = new StructureDefinition();
    profile1.name = 'Sanguine';
    profile1.id = 'san-guine';
    profile1.type = 'Condition';
    profile1.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/san-guine';
    profile1.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Condition';
    profile1.fhirVersion = '4.0.1';
    pkg.profiles.push(profile1);
    // Extension[0]: PreferredBeatle / preferred-beatle
    const extension0 = new StructureDefinition();
    extension0.name = 'PreferredBeatle';
    extension0.id = 'preferred-beatle';
    extension0.type = 'Extension';
    extension0.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/preferred-beatle';
    extension0.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Extension';
    extension0.fhirVersion = '4.0.1';
    pkg.extensions.push(extension0);
    // Extension[1]: PoorTaste / poor-taste
    const extension1 = new StructureDefinition();
    extension1.name = 'PoorTaste';
    extension1.id = 'poor-taste';
    extension1.type = 'Extension';
    extension1.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste';
    extension1.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Extension';
    extension1.fhirVersion = '4.0.1';
    extension1.version = '1.0.0';
    pkg.extensions.push(extension1);
    // Logical[0]: WheatBeer / wheat-beer / wheat-beer
    const logical0 = new StructureDefinition();
    logical0.name = 'WheatBeer';
    logical0.id = 'wheat-beer';
    logical0.type = 'wheat-beer';
    logical0.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer';
    logical0.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Element';
    logical0.kind = 'logical';
    logical0.derivation = 'specialization';
    logical0.fhirVersion = '4.0.1';
    logical0.version = '1.0.0';
    pkg.logicals.push(logical0);
    // Logical[1]: RedWine / red-wine / red-wine
    const logical1 = new StructureDefinition();
    logical1.name = 'RedWine';
    logical1.id = 'red-wine';
    logical1.type = 'red-wine';
    logical1.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/red-wine';
    logical1.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Basic';
    logical1.kind = 'logical';
    logical1.derivation = 'specialization';
    logical1.fhirVersion = '4.0.1';
    logical1.version = '1.0.0';
    logical1.extension = [
      {
        url: 'http://hl7.org/fhir/tools/StructureDefinition/logical-target',
        valueBoolean: true
      }
    ];
    pkg.logicals.push(logical1);
    // Logical[2]: SparklingWater / sparkling-water / sparkling-water
    const logical2 = new StructureDefinition();
    logical2.name = 'SparklingWater';
    logical2.id = 'sparkling-water';
    logical2.type = 'sparkling-water';
    logical2.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/sparkling-water';
    logical2.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Basic';
    logical2.kind = 'logical';
    logical2.derivation = 'specialization';
    logical2.fhirVersion = '4.0.1';
    logical2.version = '1.0.2';
    logical2.extension = [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics',
        valueCode: 'can-be-target'
      }
    ];
    pkg.logicals.push(logical2);
    // Logical[3]: IcedCoffee / iced-coffee / iced-coffee
    const logical3 = new StructureDefinition();
    logical3.name = 'IcedCoffee';
    logical3.id = 'iced-coffee';
    logical3.type = 'iced-coffee';
    logical3.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/iced-coffee';
    logical3.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Basic';
    logical3.kind = 'logical';
    logical3.derivation = 'specialization';
    logical3.fhirVersion = '4.0.1';
    logical3.version = '1.0.2';
    logical3.extension = [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics',
        valueCode: 'can-bind'
      }
    ];
    pkg.logicals.push(logical3);
    // Resource[0]: Destination / Destination / Destination
    const resource0 = new StructureDefinition();
    resource0.name = 'Destination';
    resource0.id = 'Destination';
    resource0.type = 'Destination';
    resource0.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/Destination';
    resource0.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/DomainResource';
    resource0.fhirVersion = '4.0.1';
    resource0.version = '1.0.0';
    pkg.resources.push(resource0);
    // Resource[1]: MovieTheater / MovieTheater / MovieTheater
    const resource1 = new StructureDefinition();
    resource1.name = 'MovieTheater';
    resource1.id = 'MovieTheater';
    resource1.type = 'MovieTheater';
    resource1.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/MovieTheater';
    resource1.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/DomainResource';
    resource1.fhirVersion = '4.0.1';
    pkg.resources.push(resource1);
    // ValueSet[0]: Soups / soup-flavors
    const valueset0 = new ValueSet();
    valueset0.name = 'Soups';
    valueset0.id = 'soup-flavors';
    valueset0.url = 'http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors';
    valueset0.version = '4.0.1';
    pkg.valueSets.push(valueset0);
    // ValueSet[1]: Cheeses / cheese-flavors
    const valueset1 = new ValueSet();
    valueset1.name = 'Cheeses';
    valueset1.id = 'cheese-flavors';
    valueset1.url = 'http://hl7.org/fhir/us/minimal/ValueSet/cheese-flavors';
    valueset1.version = '4.0.1';
    pkg.valueSets.push(valueset1);
    // CodeSystem[0]: Letters / alphas
    const codeSystem0 = new CodeSystem();
    codeSystem0.name = 'Letters';
    codeSystem0.id = 'alphas';
    codeSystem0.url = 'http://hl7.org/fhir/us/minimal/CodeSystem/alphas';
    codeSystem0.version = '4.0.1';
    pkg.codeSystems.push(codeSystem0);
    // CodeSystem[1]: Numbers / numerics
    const codeSystem1 = new CodeSystem();
    codeSystem1.name = 'Numbers';
    codeSystem1.id = 'numerics';
    codeSystem1.url = 'http://hl7.org/fhir/us/minimal/CodeSystem/numerics';
    codeSystem1.version = '4.0.1';
    pkg.codeSystems.push(codeSystem1);
    // Instance[0]: DrSue / dr-sue / Practitioner
    const instance0 = new InstanceDefinition();
    instance0._instanceMeta.name = 'DrSue';
    instance0.id = 'dr-sue';
    instance0.resourceType = 'Practitioner';
    instance0.gender = 'female';
    pkg.instances.push(instance0);
    // Instance[1]: DrBob / dr-bob / Practitioner
    const instance1 = new InstanceDefinition();
    instance1._instanceMeta.name = 'DrBob';
    instance1.id = 'dr-bob';
    instance1.meta = { profile: ['http://unreal.org/StructureDefinition/super-practitioner'] };
    instance1.resourceType = 'Practitioner';
    instance1.gender = 'male';
    pkg.instances.push(instance1);
    // Instance[2]: Thrilling / thrill-ing / Condition
    const instance2 = new InstanceDefinition();
    instance2._instanceMeta.name = 'Thrilling';
    instance2._instanceMeta.usage = 'Definition';
    instance2.id = 'thrill-ing';
    instance2.resourceType = 'StructureDefinition';
    instance2.derivation = 'constraint';
    instance2.type = 'Condition';
    instance2.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/thrill-ing';
    instance2.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Condition';
    instance2.fhirVersion = '4.0.1';
    instance2.version = '1.0.0';
    pkg.instances.push(instance2);
    // Instance[3]: TwoWolves / two-wolves / Extension
    const instance3 = new InstanceDefinition();
    instance3._instanceMeta.name = 'TwoWolves';
    instance3._instanceMeta.usage = 'Definition';
    instance3.id = 'two-wolves';
    instance3.resourceType = 'StructureDefinition';
    instance3.derivation = 'constraint';
    instance3.type = 'Extension';
    instance3.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/two-wolves';
    instance3.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Extension';
    instance3.fhirVersion = '4.0.1';
    instance3.version = '1.0.0';
    pkg.instances.push(instance3);
    // Instance[4]: Spices / spices / CodeSystem
    const instance4 = new InstanceDefinition();
    instance4._instanceMeta.name = 'Spices';
    instance4._instanceMeta.usage = 'Definition';
    instance4.id = 'spices';
    instance4.resourceType = 'CodeSystem';
    instance4.url = 'http://hl7.org/fhir/us/minimal/CodeSystem/spices';
    instance4.content = 'complete';
    instance4.version = '4.0.1';
    pkg.instances.push(instance4);
    // Instance[5]: Cookies / cookie-varieties / ValueSet
    const instance5 = new InstanceDefinition();
    instance5._instanceMeta.name = 'Cookies';
    instance5._instanceMeta.usage = 'Definition';
    instance5.id = 'cookie-varieties';
    instance5.resourceType = 'ValueSet';
    instance5.url = 'http://hl7.org/fhir/us/minimal/ValueSet/cookie-varieties';
    instance5.version = '4.0.1';
    pkg.instances.push(instance5);
    // Instance[6]: SpiderHouse / spider-house / Logical
    const instance6 = new InstanceDefinition();
    instance6._instanceMeta.name = 'SpiderHouse';
    instance6._instanceMeta.usage = 'Definition';
    instance6.id = 'spider-house';
    instance6.resourceType = 'StructureDefinition';
    instance6.derivation = 'specialization';
    instance6.kind = 'logical';
    instance6.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/spider-house';
    instance6.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Base';
    instance6.fhirVersion = '4.0.1';
    instance6.version = '1.0.0';
    pkg.instances.push(instance6);
    // Instance[7]: Zone / zone / Resource
    const instance7 = new InstanceDefinition();
    instance7._instanceMeta.name = 'Zone';
    instance7._instanceMeta.usage = 'Definition';
    instance7.id = 'zone';
    instance7.resourceType = 'StructureDefinition';
    instance7.derivation = 'specialization';
    instance7.kind = 'resource';
    instance7.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/zone';
    instance7.baseDefinition = '';
    instance7.fhirVersion = '4.0.1';
    instance7.version = '1.0.0';
    pkg.instances.push(instance7);
  });

  describe('#fishForFHIR()', () => {
    it('should find profiles', () => {
      const funnyProfile = pkg.fishForFHIR('fun-ny', Type.Profile);
      expect(funnyProfile.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny');
      expect(funnyProfile.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('Funny', Type.Profile)).toEqual(funnyProfile);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny', Type.Profile)
      ).toEqual(funnyProfile);
    });

    it('should find instances of profiles', () => {
      const thrillingProfile = pkg.fishForFHIR('thrill-ing', Type.Profile);
      expect(thrillingProfile.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/thrill-ing'
      );
      expect(thrillingProfile.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('Thrilling', Type.Profile)).toEqual(thrillingProfile);
      expect(
        pkg.fishForFHIR(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/thrill-ing',
          Type.Profile
        )
      ).toEqual(thrillingProfile);
    });

    it('should find profiles when fishing with a version', () => {
      const funnyProfile = pkg.fishForFHIR('fun-ny|1.0.0', Type.Profile);
      expect(funnyProfile.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny');
      expect(funnyProfile.version).toBe('1.0.0');
    });

    it('should not find a profile when fishing with a version that does not match', () => {
      const funnyProfile = pkg.fishForFHIR('fun-ny|2.0.0', Type.Profile);
      expect(funnyProfile).toBeUndefined();
    });

    it('should find instances of profiles when fishing with a version', () => {
      const thrillingProfile = pkg.fishForFHIR('thrill-ing|1.0.0', Type.Profile);
      expect(thrillingProfile.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/thrill-ing'
      );
      expect(thrillingProfile.version).toBe('1.0.0');
    });

    it('should find extensions', () => {
      const poorTasteExtensionByID = pkg.fishForFHIR('poor-taste', Type.Extension);
      expect(poorTasteExtensionByID.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste'
      );
      expect(poorTasteExtensionByID.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('PoorTaste', Type.Extension)).toEqual(poorTasteExtensionByID);
      expect(
        pkg.fishForFHIR(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste',
          Type.Extension
        )
      ).toEqual(poorTasteExtensionByID);
    });

    it('should find instances of extensions', () => {
      const twoWolvesExtension = pkg.fishForFHIR('two-wolves', Type.Extension);
      expect(twoWolvesExtension.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/two-wolves'
      );
      expect(twoWolvesExtension.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('TwoWolves', Type.Extension)).toEqual(twoWolvesExtension);
      expect(
        pkg.fishForFHIR(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/two-wolves',
          Type.Extension
        )
      ).toEqual(twoWolvesExtension);
    });

    it('should find extensions when fishing with a version', () => {
      const poorTasteExtensionByID = pkg.fishForFHIR('poor-taste|1.0.0', Type.Extension);
      expect(poorTasteExtensionByID.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste'
      );
      expect(poorTasteExtensionByID.version).toBe('1.0.0');
    });

    it('should not find an extension when fishing with a version that does not match', () => {
      const poorTasteExtensionByID = pkg.fishForFHIR('poor-taste|2.0.0', Type.Extension);
      expect(poorTasteExtensionByID).toBeUndefined();
    });

    it('should find instances of extensions when fishing with a version', () => {
      const twoWolvesExtension = pkg.fishForFHIR('two-wolves|1.0.0', Type.Extension);
      expect(twoWolvesExtension.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/two-wolves'
      );
      expect(twoWolvesExtension.version).toBe('1.0.0');
    });

    it('should find logicals', () => {
      const beerLogical = pkg.fishForFHIR('wheat-beer', Type.Logical);
      expect(beerLogical.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer');
      expect(beerLogical.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('WheatBeer', Type.Logical)).toEqual(beerLogical);
      expect(
        pkg.fishForFHIR(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer',
          Type.Logical
        )
      ).toEqual(beerLogical);
    });

    it('should find instances of logicals', () => {
      const spiderHouse = pkg.fishForFHIR('spider-house', Type.Logical);
      expect(spiderHouse.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/spider-house'
      );
      expect(spiderHouse.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('SpiderHouse', Type.Logical)).toEqual(spiderHouse);
      expect(
        pkg.fishForFHIR(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/spider-house',
          Type.Logical
        )
      ).toEqual(spiderHouse);
    });

    it('should find logicals when fishing with a version', () => {
      const beerLogical = pkg.fishForFHIR('wheat-beer|1.0.0', Type.Logical);
      expect(beerLogical.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer');
      expect(beerLogical.version).toBe('1.0.0');
    });

    it('should not find a logical when fishing with a version that does not match', () => {
      const beerLogical = pkg.fishForFHIR('wheat-beer|2.0.0', Type.Logical);
      expect(beerLogical).toBeUndefined();
    });

    it('should find instances of logicals when fishing with a version', () => {
      const spiderHouse = pkg.fishForFHIR('spider-house|1.0.0', Type.Logical);
      expect(spiderHouse.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/spider-house'
      );
      expect(spiderHouse.version).toBe('1.0.0');
    });

    it('should find resources', () => {
      const destination = pkg.fishForFHIR('Destination', Type.Resource);
      expect(destination.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/Destination'
      );
      expect(destination.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('Destination', Type.Resource)).toEqual(destination);
      expect(
        pkg.fishForFHIR(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Destination',
          Type.Resource
        )
      ).toEqual(destination);
    });

    it('should find instances of resources', () => {
      const zoneResource = pkg.fishForFHIR('zone', Type.Resource);
      expect(zoneResource.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/zone');
      expect(zoneResource.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('Zone', Type.Resource)).toEqual(zoneResource);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/zone', Type.Resource)
      ).toEqual(zoneResource);
    });

    it('should find resources when fishing with a version', () => {
      const destination = pkg.fishForFHIR('Destination|1.0.0', Type.Resource);
      expect(destination.url).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/Destination'
      );
      expect(destination.version).toBe('1.0.0');
    });

    it('should not find a resource when fishing with a version that does not match', () => {
      const destination = pkg.fishForFHIR('Destination|2.0.0', Type.Resource);
      expect(destination).toBeUndefined();
    });

    it('should find instances of resources when fishing with a version', () => {
      const zoneResource = pkg.fishForFHIR('zone|1.0.0', Type.Resource);
      expect(zoneResource.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/zone');
      expect(zoneResource.version).toBe('1.0.0');
    });

    it('should find value sets', () => {
      const soupsValueSetByID = pkg.fishForFHIR('soup-flavors', Type.ValueSet);
      expect(soupsValueSetByID.url).toBe('http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors');
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(soupsValueSetByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Soups', Type.ValueSet)).toEqual(soupsValueSetByID);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors', Type.ValueSet)
      ).toEqual(soupsValueSetByID);
    });

    it('should find instances of value sets', () => {
      const cookiesValueSetByID = pkg.fishForFHIR('cookie-varieties', Type.ValueSet);
      expect(cookiesValueSetByID.url).toBe(
        'http://hl7.org/fhir/us/minimal/ValueSet/cookie-varieties'
      );
      expect(cookiesValueSetByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Cookies', Type.ValueSet)).toEqual(cookiesValueSetByID);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/ValueSet/cookie-varieties', Type.ValueSet)
      ).toEqual(cookiesValueSetByID);
    });

    it('should find value sets when fishing with a version', () => {
      const soupsValueSetByID = pkg.fishForFHIR('soup-flavors|4.0.1', Type.ValueSet);
      expect(soupsValueSetByID.url).toBe('http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors');
      expect(soupsValueSetByID.version).toBe('4.0.1');
    });

    it('should not find a value set when fishing with a version that does not match', () => {
      const soupsValueSetByID = pkg.fishForFHIR('soup-flavors|1.1.1', Type.ValueSet);
      expect(soupsValueSetByID).toBeUndefined();
    });

    it('should find instances of value sets when fishing with a version', () => {
      const cookiesValueSetByID = pkg.fishForFHIR('cookie-varieties|4.0.1', Type.ValueSet);
      expect(cookiesValueSetByID.url).toBe(
        'http://hl7.org/fhir/us/minimal/ValueSet/cookie-varieties'
      );
      expect(cookiesValueSetByID.version).toBe('4.0.1');
    });

    it('should find code systems', () => {
      const numericsCodeSystemByID = pkg.fishForFHIR('numerics', Type.CodeSystem);
      expect(numericsCodeSystemByID.url).toBe('http://hl7.org/fhir/us/minimal/CodeSystem/numerics');
      // For some reason, code systems don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(numericsCodeSystemByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Numbers', Type.CodeSystem)).toEqual(numericsCodeSystemByID);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/CodeSystem/numerics', Type.CodeSystem)
      ).toEqual(numericsCodeSystemByID);
    });

    it('should find instances of code systems', () => {
      const spicesCodeSystemByID = pkg.fishForFHIR('spices', Type.CodeSystem);
      expect(spicesCodeSystemByID.url).toBe('http://hl7.org/fhir/us/minimal/CodeSystem/spices');
      expect(spicesCodeSystemByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Spices', Type.CodeSystem)).toEqual(spicesCodeSystemByID);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/CodeSystem/spices', Type.CodeSystem)
      ).toEqual(spicesCodeSystemByID);
    });

    it('should find code systems when fishing with a version', () => {
      const numericsCodeSystemByID = pkg.fishForFHIR('numerics|4.0.1', Type.CodeSystem);
      expect(numericsCodeSystemByID.url).toBe('http://hl7.org/fhir/us/minimal/CodeSystem/numerics');
      expect(numericsCodeSystemByID.version).toBe('4.0.1');
    });

    it('should not find a code system when fishing with a version that does not match', () => {
      const numericsCodeSystemByID = pkg.fishForFHIR('numerics|1.1.1', Type.CodeSystem);
      expect(numericsCodeSystemByID).toBeUndefined();
    });

    it('should find instances of code systems when fishing with a version', () => {
      const spicesCodeSystemByID = pkg.fishForFHIR('spices|4.0.1', Type.CodeSystem);
      expect(spicesCodeSystemByID.url).toBe('http://hl7.org/fhir/us/minimal/CodeSystem/spices');
      expect(spicesCodeSystemByID.version).toBe('4.0.1');
    });

    it('should find instances', () => {
      const drSueInstanceById = pkg.fishForFHIR('dr-sue', Type.Instance);
      expect(drSueInstanceById.id).toBe('dr-sue');
      expect(drSueInstanceById.gender).toBe('female');
      expect(pkg.fishForFHIR('DrSue', Type.Instance)).toEqual(drSueInstanceById);
    });

    it('should find instances that have a version when fishing with a version', () => {
      const drSueInstanceById = pkg.fishForFHIR('thrill-ing|1.0.0', Type.Instance);
      expect(drSueInstanceById.id).toBe('thrill-ing');
      expect(drSueInstanceById.version).toBe('1.0.0');
    });

    it('should not find an instance that does not have a version when fishing with a version', () => {
      const drSueInstanceById = pkg.fishForFHIR('dr-sue|1.0.0', Type.Instance);
      expect(drSueInstanceById).toBeUndefined();
    });

    it('should not find the definition when the type is not requested', () => {
      const funnyProfileByID = pkg.fishForFHIR(
        'fun-ny',
        Type.Resource,
        Type.Logical,
        Type.Type,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(funnyProfileByID).toBeUndefined();

      const thrillingProfileByID = pkg.fishForFHIR(
        'thrill-ing',
        Type.Resource,
        Type.Logical,
        Type.Type,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem
      );
      expect(thrillingProfileByID).toBeUndefined();

      const poorTasteExtensionByID = pkg.fishForFHIR(
        'poor-taste',
        Type.Resource,
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(poorTasteExtensionByID).toBeUndefined();

      const twoWolvesExtensionByID = pkg.fishForFHIR(
        'two-wolves',
        Type.Resource,
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.ValueSet,
        Type.CodeSystem
      );
      expect(twoWolvesExtensionByID).toBeUndefined();

      const wheatBeerLogicalByID = pkg.fishForFHIR(
        'wheat-beer',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(wheatBeerLogicalByID).toBeUndefined();

      const destinationResourceByID = pkg.fishForFHIR(
        'Destination',
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(destinationResourceByID).toBeUndefined();

      const soupsValueSetByID = pkg.fishForFHIR(
        'soup-flavors',
        Type.Resource,
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
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
      expect(pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny')).toEqual(
        funnyProfileByID
      );

      const poorTasteExtensionByID = pkg.fishForFHIR('poor-taste');
      expect(poorTasteExtensionByID.name).toBe('PoorTaste');
      expect(poorTasteExtensionByID.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('PoorTaste')).toEqual(poorTasteExtensionByID);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste')
      ).toEqual(poorTasteExtensionByID);

      const wheatBeerLogicalByID = pkg.fishForFHIR('wheat-beer');
      expect(wheatBeerLogicalByID.name).toBe('WheatBeer');
      expect(wheatBeerLogicalByID.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('WheatBeer')).toEqual(wheatBeerLogicalByID);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer')
      ).toEqual(wheatBeerLogicalByID);

      const destinationResourceByID = pkg.fishForFHIR('Destination');
      expect(destinationResourceByID.name).toBe('Destination');
      expect(destinationResourceByID.fhirVersion).toBe('4.0.1');
      expect(pkg.fishForFHIR('Destination')).toEqual(destinationResourceByID);
      expect(
        pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/StructureDefinition/Destination')
      ).toEqual(destinationResourceByID);

      const soupsValueSetByID = pkg.fishForFHIR('soup-flavors');
      expect(soupsValueSetByID.name).toBe('Soups');
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(soupsValueSetByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Soups')).toEqual(soupsValueSetByID);
      expect(pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors')).toEqual(
        soupsValueSetByID
      );

      const numericsCodeSystemByID = pkg.fishForFHIR('numerics');
      expect(numericsCodeSystemByID.name).toBe('Numbers');
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(numericsCodeSystemByID.version).toBe('4.0.1');
      expect(pkg.fishForFHIR('Numbers')).toEqual(numericsCodeSystemByID);
      expect(pkg.fishForFHIR('http://hl7.org/fhir/us/minimal/CodeSystem/numerics')).toEqual(
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
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny',
        parent: 'http://hl7.org/fhir/StructureDefinition/Condition',
        resourceType: 'StructureDefinition',
        version: '1.0.0'
      });
      expect(pkg.fishForMetadata('Funny', Type.Profile)).toEqual(funnyProfile);
      expect(
        pkg.fishForMetadata(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny',
          Type.Profile
        )
      ).toEqual(funnyProfile);
    });

    it('should find extensions', () => {
      const poorTasteExtensionByID = pkg.fishForMetadata('poor-taste', Type.Extension);
      expect(poorTasteExtensionByID).toEqual({
        id: 'poor-taste',
        name: 'PoorTaste',
        sdType: 'Extension',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste',
        parent: 'http://hl7.org/fhir/StructureDefinition/Extension',
        resourceType: 'StructureDefinition',
        version: '1.0.0'
      });
      expect(pkg.fishForMetadata('PoorTaste', Type.Extension)).toEqual(poorTasteExtensionByID);
      expect(
        pkg.fishForMetadata(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste',
          Type.Extension
        )
      ).toEqual(poorTasteExtensionByID);
    });

    it('should find logicals that can not be a reference target or have bindings', () => {
      const wheatBeerLogicalByID = pkg.fishForMetadata('wheat-beer', Type.Logical);
      expect(wheatBeerLogicalByID).toEqual({
        id: 'wheat-beer',
        name: 'WheatBeer',
        sdType: 'wheat-beer',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element',
        resourceType: 'StructureDefinition',
        version: '1.0.0',
        canBeTarget: false,
        canBind: false
      });
      expect(pkg.fishForMetadata('WheatBeer', Type.Logical)).toEqual(wheatBeerLogicalByID);
      expect(
        pkg.fishForMetadata(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer',
          Type.Logical
        )
      ).toEqual(wheatBeerLogicalByID);
    });

    it('should find logicals that can be a reference target using the logical-target extension', () => {
      const redWineLogicalByID = pkg.fishForMetadata('red-wine', Type.Logical);
      expect(redWineLogicalByID).toEqual({
        id: 'red-wine',
        name: 'RedWine',
        sdType: 'red-wine',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/red-wine',
        parent: 'http://hl7.org/fhir/StructureDefinition/Basic',
        resourceType: 'StructureDefinition',
        version: '1.0.0',
        canBeTarget: true,
        canBind: false
      });
      expect(pkg.fishForMetadata('RedWine', Type.Logical)).toEqual(redWineLogicalByID);
      expect(
        pkg.fishForMetadata(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/red-wine',
          Type.Logical
        )
      ).toEqual(redWineLogicalByID);
    });

    it('should find logicals that can be a reference target using the structuredefinition-type-characteristics extension', () => {
      const sparklingWaterLogicalByID = pkg.fishForMetadata('sparkling-water', Type.Logical);
      expect(sparklingWaterLogicalByID).toEqual({
        id: 'sparkling-water',
        name: 'SparklingWater',
        sdType: 'sparkling-water',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/sparkling-water',
        parent: 'http://hl7.org/fhir/StructureDefinition/Basic',
        resourceType: 'StructureDefinition',
        version: '1.0.2',
        canBeTarget: true,
        canBind: false
      });
      expect(pkg.fishForMetadata('SparklingWater', Type.Logical)).toEqual(
        sparklingWaterLogicalByID
      );
      expect(
        pkg.fishForMetadata(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/sparkling-water',
          Type.Logical
        )
      ).toEqual(sparklingWaterLogicalByID);
    });

    it('should find logicals that can have a binding using the can-bind extension', () => {
      const icedCoffeeLogicalById = pkg.fishForMetadata('iced-coffee', Type.Logical);
      expect(icedCoffeeLogicalById).toEqual({
        id: 'iced-coffee',
        name: 'IcedCoffee',
        sdType: 'iced-coffee',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/iced-coffee',
        parent: 'http://hl7.org/fhir/StructureDefinition/Basic',
        resourceType: 'StructureDefinition',
        version: '1.0.2',
        canBeTarget: false,
        canBind: true
      });
    });

    it('should find resources', () => {
      const destinationResourceByID = pkg.fishForMetadata('Destination', Type.Resource);
      expect(destinationResourceByID).toEqual({
        id: 'Destination',
        name: 'Destination',
        sdType: 'Destination',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Destination',
        parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
        resourceType: 'StructureDefinition',
        version: '1.0.0'
      });
      expect(pkg.fishForMetadata('Destination', Type.Resource)).toEqual(destinationResourceByID);
      expect(
        pkg.fishForMetadata(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Destination',
          Type.Resource
        )
      ).toEqual(destinationResourceByID);
    });

    it('should find value sets', () => {
      const soupsValueSetByID = pkg.fishForMetadata('soup-flavors', Type.ValueSet);
      expect(soupsValueSetByID).toEqual({
        id: 'soup-flavors',
        name: 'Soups',
        url: 'http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors',
        version: '4.0.1',
        resourceType: 'ValueSet'
      });
      expect(pkg.fishForMetadata('Soups', Type.ValueSet)).toEqual(soupsValueSetByID);
      expect(
        pkg.fishForMetadata('http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors', Type.ValueSet)
      ).toEqual(soupsValueSetByID);
    });

    it('should find code systems', () => {
      const numericsCodeSystemByID = pkg.fishForMetadata('numerics', Type.CodeSystem);
      expect(numericsCodeSystemByID).toEqual({
        id: 'numerics',
        name: 'Numbers',
        url: 'http://hl7.org/fhir/us/minimal/CodeSystem/numerics',
        version: '4.0.1',
        resourceType: 'CodeSystem'
      });
      expect(pkg.fishForMetadata('Numbers', Type.CodeSystem)).toEqual(numericsCodeSystemByID);
      expect(
        pkg.fishForMetadata('http://hl7.org/fhir/us/minimal/CodeSystem/numerics', Type.CodeSystem)
      ).toEqual(numericsCodeSystemByID);
    });

    it('should find instances', () => {
      const drSueInstanceById = pkg.fishForMetadata('dr-sue', Type.Instance);
      expect(drSueInstanceById).toEqual({
        id: 'dr-sue',
        name: 'DrSue',
        resourceType: 'Practitioner'
      });
      expect(pkg.fishForMetadata('DrSue', Type.Instance)).toEqual(drSueInstanceById);
    });

    it('should not find the definition when the type is not requested', () => {
      const funnyProfileByID = pkg.fishForMetadata(
        'fun-ny',
        Type.Resource,
        Type.Logical,
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
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(poorTasteExtensionByID).toBeUndefined();

      const wheatBeerLogicalByID = pkg.fishForMetadata(
        'wheat-beer',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(wheatBeerLogicalByID).toBeUndefined();

      const destinationResourceByID = pkg.fishForMetadata(
        'Destination',
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(destinationResourceByID).toBeUndefined();

      const soupsValueSetByID = pkg.fishForMetadata(
        'soup-flavors',
        Type.Resource,
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
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
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny',
        parent: 'http://hl7.org/fhir/StructureDefinition/Condition',
        resourceType: 'StructureDefinition',
        version: '1.0.0'
      });
      expect(pkg.fishForMetadata('Funny')).toEqual(funnyProfileByID);
      expect(
        pkg.fishForMetadata('http://hl7.org/fhir/us/minimal/StructureDefinition/fun-ny')
      ).toEqual(funnyProfileByID);

      const poorTasteExtensionByID = pkg.fishForMetadata('poor-taste');
      expect(poorTasteExtensionByID).toEqual({
        id: 'poor-taste',
        name: 'PoorTaste',
        sdType: 'Extension',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste',
        parent: 'http://hl7.org/fhir/StructureDefinition/Extension',
        resourceType: 'StructureDefinition',
        version: '1.0.0'
      });
      expect(pkg.fishForMetadata('PoorTaste')).toEqual(poorTasteExtensionByID);
      expect(
        pkg.fishForMetadata('http://hl7.org/fhir/us/minimal/StructureDefinition/poor-taste')
      ).toEqual(poorTasteExtensionByID);

      const wheatBeerLogicalByID = pkg.fishForMetadata('wheat-beer');
      expect(wheatBeerLogicalByID).toEqual({
        id: 'wheat-beer',
        name: 'WheatBeer',
        sdType: 'wheat-beer',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element',
        resourceType: 'StructureDefinition',
        version: '1.0.0',
        canBeTarget: false,
        canBind: false
      });
      expect(pkg.fishForMetadata('WheatBeer')).toEqual(wheatBeerLogicalByID);
      expect(
        pkg.fishForMetadata('http://hl7.org/fhir/us/minimal/StructureDefinition/wheat-beer')
      ).toEqual(wheatBeerLogicalByID);

      const destinationResourceByID = pkg.fishForMetadata('Destination');
      expect(destinationResourceByID).toEqual({
        id: 'Destination',
        name: 'Destination',
        sdType: 'Destination',
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Destination',
        parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
        resourceType: 'StructureDefinition',
        version: '1.0.0'
      });
      expect(pkg.fishForMetadata('Destination')).toEqual(destinationResourceByID);
      expect(
        pkg.fishForMetadata('http://hl7.org/fhir/us/minimal/StructureDefinition/Destination')
      ).toEqual(destinationResourceByID);

      const soupsValueSetByID = pkg.fishForMetadata('soup-flavors');
      expect(soupsValueSetByID).toEqual({
        id: 'soup-flavors',
        name: 'Soups',
        url: 'http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors',
        version: '4.0.1',
        resourceType: 'ValueSet'
      });
      expect(pkg.fishForMetadata('Soups')).toEqual(soupsValueSetByID);
      expect(pkg.fishForMetadata('http://hl7.org/fhir/us/minimal/ValueSet/soup-flavors')).toEqual(
        soupsValueSetByID
      );

      const numericsCodeSystemByID = pkg.fishForMetadata('numerics');
      expect(numericsCodeSystemByID).toEqual({
        id: 'numerics',
        name: 'Numbers',
        url: 'http://hl7.org/fhir/us/minimal/CodeSystem/numerics',
        version: '4.0.1',
        resourceType: 'CodeSystem'
      });
      expect(pkg.fishForMetadata('Numbers')).toEqual(numericsCodeSystemByID);
      expect(pkg.fishForMetadata('http://hl7.org/fhir/us/minimal/CodeSystem/numerics')).toEqual(
        numericsCodeSystemByID
      );

      const drSueInstanceByID = pkg.fishForMetadata('dr-sue');
      expect(drSueInstanceByID).toEqual({
        id: 'dr-sue',
        name: 'DrSue',
        resourceType: 'Practitioner'
      });

      expect(pkg.fishForMetadata('DrSue')).toEqual(drSueInstanceByID);
    });

    it('should return package metadata when fishing with the package id', () => {
      const packageMetadata = pkg.fishForMetadata('fhir.us.minimal');

      expect(packageMetadata.id).toEqual(minimalConfig.id);
      expect(packageMetadata.name).toEqual(minimalConfig.name);
      expect(packageMetadata.url).toEqual('http://not-an-auto-generated-url.org');
      expect(packageMetadata.resourceType).toEqual('ImplementationGuide');
    });

    it('should return package metadata when fishing with the package name', () => {
      const packageMetadata = pkg.fishForMetadata('MinimalIG');

      expect(packageMetadata.id).toEqual(minimalConfig.id);
      expect(packageMetadata.name).toEqual(minimalConfig.name);
      expect(packageMetadata.url).toEqual('http://not-an-auto-generated-url.org');
      expect(packageMetadata.resourceType).toEqual('ImplementationGuide');
    });

    it('should return package metadata with an auto-generated url when url is missing', () => {
      delete pkg.config.url;
      const packageMetadata = pkg.fishForMetadata('MinimalIG');

      expect(packageMetadata.id).toEqual(minimalConfig.id);
      expect(packageMetadata.name).toEqual(minimalConfig.name);
      expect(packageMetadata.url).toEqual(
        `${minimalConfig.canonical}/ImplementationGuide/${minimalConfig.id}`
      );
      expect(packageMetadata.resourceType).toEqual('ImplementationGuide');
    });
  });
});
