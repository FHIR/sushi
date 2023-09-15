import path from 'path';
import { loadFromPath } from 'fhir-package-loader';
import { TestFisher, loggerSpy } from '../testhelpers';
import { Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { Instance, Profile } from '../../src/fshtypes';
import { CaretValueRule } from '../../src/fshtypes/rules';
import { InstanceDefinition } from '../../src/fhirtypes';
import { minimalConfig } from './minimalConfig';
import {
  fishForFHIRBestVersion,
  fishForMetadataBestVersion,
  fishInTankBestVersion,
  getFHIRVersionPreferringFisher,
  fishForR5ResourceAllowedInR4IGs
} from '../../src/utils';

const someSourceInfo = {
  file: 'SomeFile.fsh',
  location: { startLine: 12, startColumn: 0, endLine: 12, endColumn: 35 }
};

describe('FishingUtils', () => {
  let fisher: TestFisher;
  let tank: FSHTank;

  beforeAll(() => {
    const doc = new FSHDocument('fileName');
    // tank
    const ad1 = new Instance('AD1');
    ad1.usage = 'Definition';
    ad1.id = 'ad-1';
    ad1.instanceOf = 'ActorDefinition';
    doc.instances.set('AD1', ad1);
    const ees1 = new Instance('EES1');
    ees1.usage = 'Definition';
    ees1.id = 'ees-1';
    ees1.instanceOf = 'EffectEvidenceSynthesis';
    doc.instances.set('EES1', ees1);
    tank = new FSHTank([doc], minimalConfig);
    // defs
    const defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    const r5Defs = new FHIRDefinitions(true);
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r5-definitions', r5Defs);
    defs.addSupplementalFHIRDefinitions('hl7.fhir.r5.core#5.0.0', r5Defs);
    // pkg
    const pkg = new Package(tank.config);
    const ad2 = new InstanceDefinition();
    ad2._instanceMeta.name = 'AD2';
    ad2._instanceMeta.usage = 'Definition';
    ad2.id = 'ad-2';
    ad2.resourceType = 'ActorDefinition';
    pkg.instances.push(ad2);
    const ees2 = new InstanceDefinition();
    ees2._instanceMeta.name = 'EES2';
    ees2._instanceMeta.usage = 'Definition';
    ees2.id = 'ees-2';
    ees2.resourceType = 'EffectEvidenceSynthesis';
    pkg.instances.push(ees2);
    fisher = new TestFisher(tank, defs, pkg);
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#fishForFHIRBestVersion', () => {
    let fishForFHIRSpy: jest.SpyInstance;
    beforeAll(() => {
      fishForFHIRSpy = jest.spyOn(fisher, 'fishForFHIR');
    });

    beforeEach(() => {
      fishForFHIRSpy.mockReset();
    });

    afterAll(() => {
      fishForFHIRSpy.mockRestore();
    });

    it('should only fish once if result is found when no version is provided', () => {
      fishForFHIRSpy.mockReturnValueOnce({ resourceType: 'mock' });
      fishForFHIRBestVersion(fisher, 'item');
      expect(fishForFHIRSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should only fish once if result is found when version is provided', () => {
      fishForFHIRSpy.mockReturnValueOnce({ resourceType: 'mock' });
      fishForFHIRBestVersion(fisher, 'item|1.0');
      expect(fishForFHIRSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should only fish once if result is not found and no version is provided', () => {
      fishForFHIRSpy.mockReturnValueOnce(undefined);
      fishForFHIRBestVersion(fisher, 'item');
      expect(fishForFHIRSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fish twice if result is not found when version is provided and not log a warning when version matches', () => {
      fishForFHIRSpy.mockReturnValueOnce(undefined);
      fishForFHIRSpy.mockReturnValueOnce({ resourceType: 'mock', version: '1.0' });
      fishForFHIRBestVersion(fisher, 'item|1.0');
      expect(fishForFHIRSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fish twice if result is not found when version is provided and log a warning if different version is found', () => {
      fishForFHIRSpy.mockReturnValueOnce(undefined);
      fishForFHIRSpy.mockReturnValueOnce({ resourceType: 'mock', version: '2.0' });
      fishForFHIRBestVersion(fisher, 'item|1.0');
      expect(fishForFHIRSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /item\|1\.0 was requested, but SUSHI found item\|2\.0/
      );
    });

    it('should fish twice if result is not found when version is provided and log a warning with source info if different version is found', () => {
      fishForFHIRSpy.mockReturnValueOnce(undefined);
      fishForFHIRSpy.mockReturnValueOnce({ resourceType: 'mock', version: '2.0' });
      fishForFHIRBestVersion(fisher, 'item|1.0', someSourceInfo);
      expect(fishForFHIRSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /item\|1\.0 was requested, but SUSHI found item\|2\.0.*File: SomeFile\.fsh.*Line: 12\D*/s
      );
    });

    it('should fish twice if result is not found when version is provided and not log a warning when provided version is null', () => {
      fishForFHIRSpy.mockReturnValueOnce(undefined);
      fishForFHIRSpy.mockReturnValueOnce({ resourceType: 'mock', version: '1.0' });
      fishForFHIRBestVersion(fisher, 'item|'); // no real version provided
      expect(fishForFHIRSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fish twice if result is not found when version is provided and not log a warning when found version is null', () => {
      fishForFHIRSpy.mockReturnValueOnce(undefined);
      fishForFHIRSpy.mockReturnValueOnce({ resourceType: 'mock' }); // no version on result
      fishForFHIRBestVersion(fisher, 'item|1.0');
      expect(fishForFHIRSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });
  });

  describe('#fishForMetadataBestVersion', () => {
    let fishForMetadataSpy: jest.SpyInstance;
    beforeAll(() => {
      fishForMetadataSpy = jest.spyOn(fisher, 'fishForMetadata');
    });

    beforeEach(() => {
      fishForMetadataSpy.mockReset();
    });

    afterAll(() => {
      fishForMetadataSpy.mockRestore();
    });

    it('should only fishForMetadata once if result is found when no version is provided', () => {
      fishForMetadataSpy.mockReturnValueOnce({ id: 'mock' });
      fishForMetadataBestVersion(fisher, 'item');
      expect(fishForMetadataSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should only fishForMetadata once if result is found when version is provided', () => {
      fishForMetadataSpy.mockReturnValueOnce({ id: 'mock' });
      fishForMetadataBestVersion(fisher, 'item|1.0');
      expect(fishForMetadataSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should only fishForMetadata once if result is not found and no version is provided', () => {
      fishForMetadataSpy.mockReturnValueOnce(undefined);
      fishForMetadataBestVersion(fisher, 'item');
      expect(fishForMetadataSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fishForMetadata twice if result is not found when version is provided and not log a warning when version matches', () => {
      fishForMetadataSpy.mockReturnValueOnce(undefined);
      fishForMetadataSpy.mockReturnValueOnce({ id: 'mock', version: '1.0' });
      fishForMetadataBestVersion(fisher, 'item|1.0');
      expect(fishForMetadataSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fishForMetadata twice if result is not found when version is provided and log a warning if different version is found', () => {
      fishForMetadataSpy.mockReturnValueOnce(undefined);
      fishForMetadataSpy.mockReturnValueOnce({ id: 'mock', version: '2.0' });
      fishForMetadataBestVersion(fisher, 'item|1.0');
      expect(fishForMetadataSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /item\|1\.0 was requested, but SUSHI found item\|2\.0/
      );
    });

    it('should fishForMetadata twice if result is not found when version is provided and log a warning with source info if different version is found', () => {
      fishForMetadataSpy.mockReturnValueOnce(undefined);
      fishForMetadataSpy.mockReturnValueOnce({ id: 'mock', version: '2.0' });
      fishForMetadataBestVersion(fisher, 'item|1.0', someSourceInfo);
      expect(fishForMetadataSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /item\|1\.0 was requested, but SUSHI found item\|2\.0.*File: SomeFile\.fsh.*Line: 12\D*/s
      );
    });

    it('should fish twice if result is not found when version is provided and not log a warning when provided version is null', () => {
      fishForMetadataSpy.mockReturnValueOnce(undefined);
      fishForMetadataSpy.mockReturnValueOnce({ resourceType: 'mock', version: '1.0' });
      fishForMetadataBestVersion(fisher, 'item|'); // no real version provided
      expect(fishForMetadataSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fish twice if result is not found when version is provided and not log a warning when found version is null', () => {
      fishForMetadataSpy.mockReturnValueOnce(undefined);
      fishForMetadataSpy.mockReturnValueOnce({ resourceType: 'mock' }); // no version on result
      fishForMetadataBestVersion(fisher, 'item|1.0');
      expect(fishForMetadataSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });
  });

  describe('#fishInTankBestVersion', () => {
    let fishInTankSpy: jest.SpyInstance;
    beforeAll(() => {
      fishInTankSpy = jest.spyOn(tank, 'fish');
    });

    beforeEach(() => {
      fishInTankSpy.mockReset();
    });

    afterAll(() => {
      fishInTankSpy.mockRestore();
    });

    it('should only fish in tank once if result is found when no version is provided', () => {
      fishInTankSpy.mockReturnValueOnce(new Profile('mock'));
      fishInTankBestVersion(tank, 'item');
      expect(fishInTankSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should only fish in tank once if result is found when version is provided', () => {
      fishInTankSpy.mockReturnValueOnce(new Profile('mock'));
      fishInTankBestVersion(tank, 'item|1.0');
      expect(fishInTankSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should only fish in tank once if result is not found and no version is provided', () => {
      fishInTankSpy.mockReturnValueOnce(undefined);
      fishInTankBestVersion(tank, 'item');
      expect(fishInTankSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fish in tank twice if result is not found when version is provided and not log a warning when version matches', () => {
      const mockProfile = new Profile('mock');
      const mockProfileVersion = new CaretValueRule('');
      mockProfileVersion.caretPath = 'version';
      mockProfileVersion.value = '1.0';
      mockProfile.rules.push(mockProfileVersion);
      fishInTankSpy.mockReturnValueOnce(undefined);
      fishInTankSpy.mockReturnValueOnce(mockProfile);
      fishInTankBestVersion(tank, 'item|1.0');
      expect(fishInTankSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fish in tank twice if result is not found when version is provided and log a warning if different version is found', () => {
      const mockProfile = new Profile('mock');
      const mockProfileVersion = new CaretValueRule('');
      mockProfileVersion.caretPath = 'version';
      mockProfileVersion.value = '2.0';
      mockProfile.rules.push(mockProfileVersion);
      fishInTankSpy.mockReturnValueOnce(undefined);
      fishInTankSpy.mockReturnValueOnce(mockProfile);
      fishInTankBestVersion(tank, 'item|1.0');
      expect(fishInTankSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /item|1\.0 was requested, but SUSHI found item|2\.0/
      );
    });

    it('should fish in tank twice if result is not found when version is provided and log a warning with source info if different version is found', () => {
      const mockProfile = new Profile('mock');
      const mockProfileVersion = new CaretValueRule('');
      mockProfileVersion.caretPath = 'version';
      mockProfileVersion.value = '2.0';
      mockProfile.rules.push(mockProfileVersion);
      fishInTankSpy.mockReturnValueOnce(undefined);
      fishInTankSpy.mockReturnValueOnce(mockProfile);
      fishInTankBestVersion(tank, 'item|1.0', someSourceInfo);
      expect(fishInTankSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /item\|1\.0 was requested, but SUSHI found item\|2\.0.*File: SomeFile\.fsh.*Line: 12\D*/s
      );
    });

    it('should fish twice if result is not found when version is provided and not log a warning when provided version is null', () => {
      fishInTankSpy.mockReturnValueOnce(undefined);
      fishInTankSpy.mockReturnValueOnce(new Profile('mock'));
      fishInTankBestVersion(tank, 'item|'); // no version provided
      expect(fishInTankSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should fish twice if result is not found when version is provided and not log a warning when found version is null', () => {
      const configWithoutVersion = { ...minimalConfig };
      delete configWithoutVersion.version;
      const tankWithoutVersion = new FSHTank([new FSHDocument('no-version')], configWithoutVersion);
      const fishInTankWithoutVersionSpy = jest.spyOn(tankWithoutVersion, 'fish');
      fishInTankWithoutVersionSpy.mockReturnValueOnce(undefined);
      fishInTankWithoutVersionSpy.mockReturnValueOnce(new Profile('mock')); // no version on result (not set with rule or in config)
      fishInTankBestVersion(tankWithoutVersion, 'item|1.0');
      expect(fishInTankWithoutVersionSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });
  });

  describe('#getFHIRVersionPreferringFisher', () => {
    it('should fish up an R5 resource in an R4 IG when using R5 preferring fisher', () => {
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForFHIR('ActorDefinition');
      expect(result).toBeDefined();
      expect(result.url).toBe('http://hl7.org/fhir/StructureDefinition/ActorDefinition');
      expect(result.fhirVersion).toBe('5.0.0');
    });

    it('should fish up metadata from an R5 resource in an R4 IG when using R5 preferring fisher', () => {
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForMetadata(
        'ActorDefinition'
      );
      expect(result).toBeDefined();
      expect(result.id).toBe('ActorDefinition');
      expect(result.name).toBe('ActorDefinition');
      expect(result.sdType).toBe('ActorDefinition');
      expect(result.url).toBe('http://hl7.org/fhir/StructureDefinition/ActorDefinition');
      expect(result.parent).toBe('http://hl7.org/fhir/StructureDefinition/DomainResource');
      expect(result.abstract).toBeFalse();
      expect(result.version).toBe('5.0.0');
      expect(result.resourceType).toBe('StructureDefinition');
      expect(result.canBeTarget).toBeUndefined();
    });

    it('should fish up an instance of an R5 resource in an R4 IG when using R5 preferring fisher', () => {
      // Lookup AD2 from the pkg since AD1 only exists in the tank
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForFHIR('AD2');
      expect(result).toBeDefined();
      expect(result.id).toBe('ad-2');
      expect(result.resourceType).toBe('ActorDefinition');
    });

    it('should fish up metadata from an instance of an R5 resource metadata from the tank in an R4 IG when using R5 preferring fisher', () => {
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForMetadata('AD1');
      expect(result).toBeDefined();
      expect(result.instanceUsage).toBe('Definition');
      expect(result.id).toBe('ad-1');
      expect(result.name).toBe('AD1');
      expect(result.resourceType).toBe('ActorDefinition');
      expect(result.url).toBe('http://hl7.org/fhir/us/minimal/ActorDefinition/ad-1');
    });

    it('should fish up metadata from an instance of an R5 resource metadata from the package in an R4 IG when using R5 preferring fisher', () => {
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForMetadata('AD2');
      expect(result).toBeDefined();
      expect(result.instanceUsage).toBe('Definition');
      expect(result.id).toBe('ad-2');
      expect(result.name).toBe('AD2');
      expect(result.resourceType).toBe('ActorDefinition');
      expect(result.url).toBe('http://hl7.org/fhir/us/minimal/ActorDefinition/ad-2');
    });

    it('should fish up an R4-only resource in an R4 IG when using R5 preferring fisher', () => {
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForFHIR(
        'EffectEvidenceSynthesis'
      );
      expect(result).toBeDefined();
      expect(result.url).toBe('http://hl7.org/fhir/StructureDefinition/EffectEvidenceSynthesis');
      expect(result.fhirVersion).toBe('4.0.1');
    });

    it('should fish up an R4-only resource metadata in an R4 IG when using R5 preferring fisher', () => {
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForMetadata(
        'EffectEvidenceSynthesis'
      );
      expect(result).toBeDefined();
      expect(result.id).toBe('EffectEvidenceSynthesis');
      expect(result.name).toBe('EffectEvidenceSynthesis');
      expect(result.sdType).toBe('EffectEvidenceSynthesis');
      expect(result.url).toBe('http://hl7.org/fhir/StructureDefinition/EffectEvidenceSynthesis');
      expect(result.parent).toBe('http://hl7.org/fhir/StructureDefinition/DomainResource');
      expect(result.abstract).toBeFalse();
      expect(result.version).toBe('4.0.1');
      expect(result.resourceType).toBe('StructureDefinition');
      expect(result.canBeTarget).toBeUndefined();
    });

    it('should fish up an instance of an R4-only resource in an R4 IG when using R5 preferring fisher', () => {
      // Lookup EES2 from the pkg since AD1 only exists in the tank
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForFHIR('EES2');
      expect(result).toBeDefined();
      expect(result.id).toBe('ees-2');
      expect(result.resourceType).toBe('EffectEvidenceSynthesis');
    });

    it('should fish up metadata from an instance of an R4-only resource metadata from the tank in an R4 IG when using R5 preferring fisher', () => {
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForMetadata('EES1');
      expect(result).toBeDefined();
      expect(result.instanceUsage).toBe('Definition');
      expect(result.id).toBe('ees-1');
      expect(result.name).toBe('EES1');
      expect(result.resourceType).toBe('EffectEvidenceSynthesis');
      expect(result.url).toBe('http://hl7.org/fhir/us/minimal/EffectEvidenceSynthesis/ees-1');
    });

    it('should fish up metadata from an instance of an R4-only resource metadata from the package in an R4 IG when using R5 preferring fisher', () => {
      const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForMetadata('EES2');
      expect(result).toBeDefined();
      expect(result.instanceUsage).toBe('Definition');
      expect(result.id).toBe('ees-2');
      expect(result.name).toBe('EES2');
      expect(result.resourceType).toBe('EffectEvidenceSynthesis');
      expect(result.url).toBe('http://hl7.org/fhir/us/minimal/EffectEvidenceSynthesis/ees-2');
    });
  });

  describe('#fishForR5ResourceAllowedInR4IGs', () => {
    it('should find R5 ActorDefinition', () => {
      const result = fishForR5ResourceAllowedInR4IGs(fisher, 'ActorDefinition');
      expect(result).toBeDefined();
      expect(result.url).toBe('http://hl7.org/fhir/StructureDefinition/ActorDefinition');
      expect(result.fhirVersion).toBe('5.0.0');
    });

    it('should find R5 Requirements', () => {
      const result = fishForR5ResourceAllowedInR4IGs(fisher, 'Requirements');
      expect(result).toBeDefined();
      expect(result.url).toBe('http://hl7.org/fhir/StructureDefinition/Requirements');
      expect(result.fhirVersion).toBe('5.0.0');
    });

    it('should find R5 SubscriptionTopic', () => {
      const result = fishForR5ResourceAllowedInR4IGs(fisher, 'SubscriptionTopic');
      expect(result).toBeDefined();
      expect(result.url).toBe('http://hl7.org/fhir/StructureDefinition/SubscriptionTopic');
      expect(result.fhirVersion).toBe('5.0.0');
    });

    it('should find R5 TestPlan', () => {
      const result = fishForR5ResourceAllowedInR4IGs(fisher, 'TestPlan');
      expect(result).toBeDefined();
      expect(result.url).toBe('http://hl7.org/fhir/StructureDefinition/TestPlan');
      expect(result.fhirVersion).toBe('5.0.0');
    });

    it('should NOT find R5 NutritionProduct', () => {
      const result = fishForR5ResourceAllowedInR4IGs(fisher, 'NutritionProduct');
      expect(result).toBeUndefined();
    });

    it('should NOT find R4 EffectEvidenceSynthesis', () => {
      const result = fishForR5ResourceAllowedInR4IGs(fisher, 'EffectEvidenceSynthesis');
      expect(result).toBeUndefined();
    });
  });
});
