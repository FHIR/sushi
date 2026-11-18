import { isEqual, uniqWith } from 'lodash';
import type { ImplementationGuideDependsOn } from '../fhirtypes';
import type { PackageSpec, VersionFamilyToken } from '../ig/VersionScopes';
import type { FHIRVersionName } from './FHIRVersionUtils';

export enum AutomaticDependencyPriority {
  Low = 'Low', // load before configured dependencies / FHIR core (lowest resolution priority)
  High = 'High' // load after configured dependencies / FHIR core (highest resolution priority)
}

export type AutomaticDependency = {
  packageId: string;
  version: string;
  fhirVersions?: FHIRVersionName[];
  priority: AutomaticDependencyPriority;
};

// Keep requested versions and applicable targets even when a package's load position is reserved.
export type AutomaticDependencyPriorityAssignment = {
  package: PackageSpec;
  versions: VersionFamilyToken[];
  priority: AutomaticDependencyPriority | 'ordinary';
};

// For some context on implicit packages, see: https://chat.fhir.org/#narrow/stream/179239-tooling/topic/New.20Implicit.20Package/near/325318949
export const AUTOMATIC_DEPENDENCIES: AutomaticDependency[] = [
  {
    packageId: 'hl7.fhir.uv.tools.r4',
    version: 'latest',
    fhirVersions: ['R4', 'R4B'],
    priority: AutomaticDependencyPriority.Low
  },
  {
    packageId: 'hl7.fhir.uv.tools.r5',
    version: 'latest',
    fhirVersions: ['R5', 'R6'],
    priority: AutomaticDependencyPriority.Low
  },
  {
    packageId: 'hl7.terminology.r4',
    version: 'latest',
    fhirVersions: ['R4', 'R4B'],
    priority: AutomaticDependencyPriority.Low
  },
  {
    packageId: 'hl7.terminology.r5',
    version: 'latest',
    fhirVersions: ['R5', 'R6'],
    priority: AutomaticDependencyPriority.Low
  },
  {
    packageId: 'hl7.fhir.uv.extensions.r4',
    version: 'latest',
    fhirVersions: ['R4', 'R4B'],
    priority: AutomaticDependencyPriority.High
  },
  {
    packageId: 'hl7.fhir.uv.extensions.r5',
    version: 'latest',
    fhirVersions: ['R5', 'R6'],
    priority: AutomaticDependencyPriority.High
  }
];

export function configuredDependencyMatchesAutomaticDependency(
  cd: Pick<ImplementationGuideDependsOn, 'packageId'>,
  ad: AutomaticDependency
): boolean {
  // hl7.some.package, hl7.some.package.r4, and hl7.some.package.r5 all represent the same content,
  // so they are essentially interchangeable and we should allow for any of them in the config.
  // See: https://chat.fhir.org/#narrow/stream/179239-tooling/topic/New.20Implicit.20Package/near/325488084
  const [configRootId, packageRootId] = [cd.packageId, ad.packageId].map(id =>
    /\.r[4-9]$/.test(id) ? id.slice(0, -3) : id
  );
  return configRootId === packageRootId;
}

export function getAutomaticDependencyPriority(
  dep: Pick<ImplementationGuideDependsOn, 'packageId'>
): AutomaticDependencyPriority | undefined {
  return AUTOMATIC_DEPENDENCIES.find(autoDep =>
    configuredDependencyMatchesAutomaticDependency(dep, autoDep)
  )?.priority;
}

export function getAutomaticDependencies(
  fhirVersion: FHIRVersionName,
  configuredDependencies: ImplementationGuideDependsOn[],
  priority: AutomaticDependencyPriority
): ImplementationGuideDependsOn[] {
  return uniqWith(
    AUTOMATIC_DEPENDENCIES.filter(
      ad => ad.priority === priority
    ).flatMap<ImplementationGuideDependsOn>(autoDep => {
      const configured = configuredDependencies.filter(dep =>
        configuredDependencyMatchesAutomaticDependency(dep, autoDep)
      );
      if (configured.length) {
        return configured;
      }
      return autoDep.fhirVersions && !autoDep.fhirVersions.includes(fhirVersion) ? [] : [autoDep];
    }),
    isEqual
  );
}
