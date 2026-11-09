import {
  AUTOMATIC_DEPENDENCIES,
  AutomaticDependencyPriority,
  configuredDependencyMatchesAutomaticDependency,
  getAutomaticDependencies,
  getAutomaticDependencyPriority
} from '../../src/utils/AutomaticDependencies';
import {
  AUTOMATIC_DEPENDENCIES as processingDependencies,
  AutomaticDependencyPriority as ProcessingPriority
} from '../../src/utils/Processing';
import { AUTOMATIC_DEPENDENCIES as publicDependencies } from '../../src/utils';
import type { FHIRVersionName } from '../../src/utils/FHIRVersionUtils';

describe('AutomaticDependencies', () => {
  it('preserves the automatic family declarations and public exports', () => {
    expect(AUTOMATIC_DEPENDENCIES).toEqual([
      {
        packageId: 'hl7.fhir.uv.tools.r4',
        version: 'latest',
        fhirVersions: ['R4', 'R4B'],
        priority: 'Low'
      },
      {
        packageId: 'hl7.fhir.uv.tools.r5',
        version: 'latest',
        fhirVersions: ['R5', 'R6'],
        priority: 'Low'
      },
      {
        packageId: 'hl7.terminology.r4',
        version: 'latest',
        fhirVersions: ['R4', 'R4B'],
        priority: 'Low'
      },
      {
        packageId: 'hl7.terminology.r5',
        version: 'latest',
        fhirVersions: ['R5', 'R6'],
        priority: 'Low'
      },
      {
        packageId: 'hl7.fhir.uv.extensions.r4',
        version: 'latest',
        fhirVersions: ['R4', 'R4B'],
        priority: 'High'
      },
      {
        packageId: 'hl7.fhir.uv.extensions.r5',
        version: 'latest',
        fhirVersions: ['R5', 'R6'],
        priority: 'High'
      }
    ]);
    expect(processingDependencies).toBe(AUTOMATIC_DEPENDENCIES);
    expect(publicDependencies).toBe(AUTOMATIC_DEPENDENCIES);
    expect(ProcessingPriority).toBe(AutomaticDependencyPriority);
  });

  it.each<[FHIRVersionName, string]>([
    ['R4', 'r4'],
    ['R4B', 'r4'],
    ['R5', 'r5'],
    ['R6', 'r5']
  ])('loads only the existing %s automatic packages', (version, suffix) => {
    expect(
      getAutomaticDependencies(version, [], AutomaticDependencyPriority.Low).map(
        dep => dep.packageId
      )
    ).toEqual([`hl7.fhir.uv.tools.${suffix}`, `hl7.terminology.${suffix}`]);
    expect(
      getAutomaticDependencies(version, [], AutomaticDependencyPriority.High).map(
        dep => dep.packageId
      )
    ).toEqual([`hl7.fhir.uv.extensions.${suffix}`]);
  });

  it.each(['hl7.terminology', 'hl7.terminology.r4', 'hl7.terminology.r5', 'hl7.terminology.r6'])(
    'recognizes configured root %s without changing the requested package',
    packageId => {
      const configured = { packageId, version: '2.0.0' };
      expect(getAutomaticDependencyPriority(configured)).toBe(AutomaticDependencyPriority.Low);
      const selected = getAutomaticDependencies(
        'R5',
        [configured],
        AutomaticDependencyPriority.Low
      );
      expect(selected.map(dep => dep.packageId)).toEqual(['hl7.fhir.uv.tools.r5', packageId]);
      expect(selected[1]).toBe(configured);
    }
  );

  it('retains the existing root-matching boundary and High classification', () => {
    expect(
      configuredDependencyMatchesAutomaticDependency(
        { packageId: 'hl7.terminology.r4b' },
        AUTOMATIC_DEPENDENCIES[2]
      )
    ).toBe(false);
    expect(
      getAutomaticDependencyPriority({ packageId: 'example.hl7.terminology.r4' })
    ).toBeUndefined();
    expect(getAutomaticDependencyPriority({ packageId: 'hl7.fhir.uv.extensions' })).toBe(
      AutomaticDependencyPriority.High
    );
  });

  it('preserves configured version order and removes duplicate family matches', () => {
    const configured = [
      { packageId: 'hl7.fhir.uv.extensions', version: '1.0.0' },
      { packageId: 'hl7.fhir.uv.extensions.r5', version: '2.0.0' }
    ];
    expect(getAutomaticDependencies('R5', configured, AutomaticDependencyPriority.High)).toEqual(
      configured
    );
    expect(configured).toEqual([
      { packageId: 'hl7.fhir.uv.extensions', version: '1.0.0' },
      { packageId: 'hl7.fhir.uv.extensions.r5', version: '2.0.0' }
    ]);
  });
});
