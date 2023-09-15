import { getFHIRVersionInfo } from '../../src/utils/FHIRVersionUtils';

describe('FHIRVersionUtils', () => {
  describe('#getFHIRVersionInfo', () => {
    // See: https://hl7.org/fhir/directory.html

    it('should get DSTU1 info for DSTU1 pre-releases', () => {
      for (const v of ['0.00', '0.01', '0.05', '0.06', '0.11', '0.0.83-snapshot1']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'DSTU1',
          packageId: 'hl7.fhir.r1.core',
          version: v,
          packageString: `hl7.fhir.r1.core#${v}`,
          isPreRelease: true,
          isSupported: false
        });
      }
    });

    it('should get DSTU1 info for DSTU1 final releases', () => {
      // ... including future patch releases
      for (const v of ['0.0.80', '0.0.81', '0.0.82', '0.0.83']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'DSTU1',
          packageId: 'hl7.fhir.r1.core',
          version: v,
          packageString: `hl7.fhir.r1.core#${v}`,
          isPreRelease: false,
          isSupported: false
        });
      }
    });

    it('should get DSTU2 info for DSTU2 pre-releases', () => {
      for (const v of ['0.4.0', '0.5.0', '1.0.0', '1.0.3-snapshot1']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'DSTU2',
          packageId: 'hl7.fhir.r2.core',
          version: v,
          packageString: `hl7.fhir.r2.core#${v}`,
          isPreRelease: true,
          isSupported: false
        });
      }
    });

    it('should get DSTU2 info for DSTU2 final releases', () => {
      // ... including future patch releases
      for (const v of ['1.0.1', '1.0.2', '1.0.3']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'DSTU2',
          packageId: 'hl7.fhir.r2.core',
          version: v,
          packageString: `hl7.fhir.r2.core#${v}`,
          isPreRelease: false,
          isSupported: false
        });
      }
    });

    it('should get STU3 info for STU3 pre-releases', () => {
      for (const v of ['1.1.0', '1.2.0', '1.4.0', '1.6.0', '1.8.0', '3.0.3-snapshot1']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'STU3',
          packageId: 'hl7.fhir.r3.core',
          version: v,
          packageString: `hl7.fhir.r3.core#${v}`,
          isPreRelease: true,
          isSupported: false
        });
      }
    });

    it('should get STU3 info for STU3 final releases', () => {
      // ... including future patch releases
      for (const v of ['3.0.0', '3.0.1', '3.0.2', '3.0.3']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'STU3',
          packageId: 'hl7.fhir.r3.core',
          version: v,
          packageString: `hl7.fhir.r3.core#${v}`,
          isPreRelease: false,
          isSupported: false
        });
      }
    });

    it('should get R4 info for R4 pre-releases', () => {
      // Past pre-releases that are not supported
      for (const v of ['3.2.0', '3.3.0', '3.5.0', '3.5a.0']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R4',
          packageId: 'hl7.fhir.r4.core',
          version: v,
          packageString: `hl7.fhir.r4.core#${v}`,
          isPreRelease: true,
          isSupported: false
        });
      }
      // Future pre-releases (if any) that will be supported
      for (const v of ['4.0.2-snapshot1']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R4',
          packageId: 'hl7.fhir.r4.core',
          version: v,
          packageString: `hl7.fhir.r4.core#${v}`,
          isPreRelease: true,
          isSupported: true
        });
      }
    });

    it('should get R4 info for R4 final releases', () => {
      // ... including future patch releases
      for (const v of ['4.0.0', '4.0.1', '4.0.2']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R4',
          packageId: 'hl7.fhir.r4.core',
          version: v,
          packageString: `hl7.fhir.r4.core#${v}`,
          isPreRelease: false,
          isSupported: true
        });
      }
    });

    it('should get R4B info for R4B pre-releases', () => {
      for (const v of ['4.1.0', '4.3.0-snapshot1']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R4B',
          packageId: 'hl7.fhir.r4b.core',
          version: v,
          packageString: `hl7.fhir.r4b.core#${v}`,
          isPreRelease: true,
          isSupported: true
        });
      }
    });

    it('should get R4B info for R4B final releases', () => {
      // ... including future patch releases
      for (const v of ['4.3.0', '4.3.1']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R4B',
          packageId: 'hl7.fhir.r4b.core',
          version: v,
          packageString: `hl7.fhir.r4b.core#${v}`,
          isPreRelease: false,
          isSupported: true
        });
      }
    });

    it('should get R5 info for R5 pre-releases', () => {
      for (const v of [
        '4.2.0',
        '4.4.0',
        '4.5.0',
        '4.6.0',
        '5.0.0-snapshot1',
        '5.0.0-ballot',
        '5.0.0-snapshot3',
        '5.0.0-draft-final'
      ]) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R5',
          packageId: 'hl7.fhir.r5.core',
          version: v,
          packageString: `hl7.fhir.r5.core#${v}`,
          isPreRelease: true,
          isSupported: true
        });
      }
    });

    it('should get R5 info for R5 final releases', () => {
      // ... including future patch releases
      for (const v of ['5.0.0', '5.0.1']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R5',
          packageId: 'hl7.fhir.r5.core',
          version: v,
          packageString: `hl7.fhir.r5.core#${v}`,
          isPreRelease: false,
          isSupported: true
        });
      }
    });

    it('should get R5 info for current and development releases', () => {
      for (const v of ['current', 'current$branch1', 'dev']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R5',
          packageId: 'hl7.fhir.r5.core',
          version: v,
          packageString: `hl7.fhir.r5.core#${v}`,
          isPreRelease: true,
          isSupported: true
        });
      }
    });

    it('should get R6 info for future R6 releases', () => {
      for (const v of ['6.0.0', '6.0.1']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R6',
          packageId: 'hl7.fhir.r6.core',
          version: v,
          packageString: `hl7.fhir.r6.core#${v}`,
          isPreRelease: false,
          isSupported: true
        });
      }
    });

    it('should get R6 info for future R6 pre-releases', () => {
      for (const v of ['6.0.0-snapshot1', '6.0.0-ballot']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: 'R6',
          packageId: 'hl7.fhir.r6.core',
          version: v,
          packageString: `hl7.fhir.r6.core#${v}`,
          isPreRelease: true,
          isSupported: true
        });
      }
    });

    it('should default ?? info for unknown versions', () => {
      for (const v of ['2.0.0', 'funky', '999']) {
        expect(getFHIRVersionInfo(v)).toEqual({
          name: '??',
          packageId: 'hl7.fhir.??.core',
          version: v,
          packageString: `hl7.fhir.??.core#${v}`,
          isPreRelease: false,
          isSupported: false
        });
      }
    });
  });
});
