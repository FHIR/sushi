import { TestFisher, loggerSpy } from '../testhelpers';
import { Package } from '../../src/export';
import { FSHDocument, FSHTank } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { Profile } from '../../src/fshtypes';
import { CaretValueRule } from '../../src/fshtypes/rules';
import { minimalConfig } from './minimalConfig';
import {
  fishForFHIRBestVersion,
  fishForMetadataBestVersion,
  fishInTankBestVersion
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
    tank = new FSHTank([doc], minimalConfig);
    const defs = new FHIRDefinitions();
    const pkg = new Package(tank.config);
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
});
