type VersionMatcher = {
  regex: RegExp;
  name: FHIRVersionName;
  packageId: string;
  isPreRelease: boolean;
  isSupported: boolean;
};

const VERSIONS: VersionMatcher[] = [
  // Supported Official Releases
  {
    regex: /^4\.0\.\d$/,
    name: 'R4',
    packageId: 'hl7.fhir.r4.core',
    isPreRelease: false,
    isSupported: true
  },
  {
    regex: /^4\.3\.\d+$/,
    name: 'R4B',
    packageId: 'hl7.fhir.r4b.core',
    isPreRelease: false,
    isSupported: true
  },
  {
    regex: /^5\.\d+\.\d+$/,
    name: 'R5',
    packageId: 'hl7.fhir.r5.core',
    isPreRelease: false,
    isSupported: true
  },
  // Supported Pre-Releases
  {
    regex: /^4\.0\.\d+-\S+$/,
    name: 'R4',
    packageId: 'hl7.fhir.r4.core',
    isPreRelease: true,
    isSupported: true
  },
  {
    regex: /^(4\.1\.\d+|4\.[13]\.\d+-\S+)$/,
    name: 'R4B',
    packageId: 'hl7.fhir.r4b.core',
    isPreRelease: true,
    isSupported: true
  },
  {
    regex: /^4\.[^013]\.\d+|5\.\d+\.\d+-\S+$/,
    name: 'R5',
    packageId: 'hl7.fhir.r5.core',
    isPreRelease: true,
    isSupported: true
  },
  {
    regex: /^dev|current(\$\S+)?$/,
    name: 'R5',
    packageId: 'hl7.fhir.r5.core',
    isPreRelease: true,
    isSupported: true
  },
  // Supported Future Pre-Releases and Releases (well, we'll try)
  {
    regex: /^6\.\d+\.\d+$/,
    name: 'R6',
    packageId: 'hl7.fhir.r6.core',
    isPreRelease: false,
    isSupported: true
  },
  {
    regex: /^6\.\d+\.\d+-\S+$/,
    name: 'R6',
    packageId: 'hl7.fhir.r6.core',
    isPreRelease: true,
    isSupported: true
  },
  // Unsupported Pre-Releases and Releases
  {
    regex: /^3\.[^0][\da]*\.\d+$/,
    name: 'R4',
    packageId: 'hl7.fhir.r4.core',
    isPreRelease: true,
    isSupported: false
  },
  {
    regex: /^3\.0\.\d+$/,
    name: 'STU3',
    packageId: 'hl7.fhir.r3.core',
    isPreRelease: false,
    isSupported: false
  },
  {
    regex: /^1\.[^0]\d*\.\d+|3\.0\.\d+-\S+$/,
    name: 'STU3',
    packageId: 'hl7.fhir.r3.core',
    isPreRelease: true,
    isSupported: false
  },
  {
    regex: /^1\.0\.[^0]\d*$/,
    name: 'DSTU2',
    packageId: 'hl7.fhir.r2.core',
    isPreRelease: false,
    isSupported: false
  },
  {
    regex: /^0\.[^01]\d*\.\d+|1\.0\.0|1\.0\.\d+-\S+$/,
    name: 'DSTU2',
    packageId: 'hl7.fhir.r2.core',
    isPreRelease: true,
    isSupported: false
  },
  {
    regex: /^0.0.8\d*$/,
    name: 'DSTU1',
    packageId: 'hl7.fhir.r1.core',
    isPreRelease: false,
    isSupported: false
  },
  {
    regex: /^0\.\d+|0\.0\.[^8]\d*|0\.0\.8\d*-\S+$/,
    name: 'DSTU1',
    packageId: 'hl7.fhir.r1.core',
    isPreRelease: true,
    isSupported: false
  },
  // Catch-All
  {
    regex: /.*/,
    name: '??',
    packageId: 'hl7.fhir.??.core',
    isPreRelease: false,
    isSupported: false
  }
];

export type FHIRVersionName = 'DSTU1' | 'DSTU2' | 'STU3' | 'R4' | 'R4B' | 'R5' | 'R6' | '??';

export type FHIRVersionInfo = {
  name: FHIRVersionName;
  packageId: string;
  version: string;
  packageString: string;
  isPreRelease: boolean;
  isSupported: boolean;
};

export function getFHIRVersionInfo(version: string): FHIRVersionInfo {
  const match = VERSIONS.find(v => v.regex.test(version));
  return {
    name: match.name,
    packageId: match.packageId,
    version,
    packageString: `${match.packageId}#${version}`,
    isPreRelease: match.isPreRelease,
    isSupported: match.isSupported
  };
}
