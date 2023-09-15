import { FSHTank } from '../import';
import {
  Profile,
  Extension,
  Logical,
  Resource,
  Instance,
  FshValueSet,
  FshCodeSystem,
  Invariant,
  RuleSet,
  Mapping,
  SourceInfo
} from '../fshtypes';
import { getVersionFromFshDefinition } from '../fhirtypes/common';
import { logger } from './FSHLogger';
import { Fishable, Metadata, Type } from './Fishable';
import { MasterFisher } from './MasterFisher';
import { getFHIRVersionInfo } from './FHIRVersionUtils';

// Use the provided fisher to fish for the item, which might have a |version appended.
// If found, return it. If not found, try to remove any |version info and fish for any available version.
export function fishForFHIRBestVersion(
  fisher: Fishable,
  item: string,
  sourceInfo?: SourceInfo,
  ...types: Type[]
): any | undefined {
  let result = fisher.fishForFHIR(item, ...types);

  // If the item was not found, try slicing off a version and searching for any version
  if (result == null && item?.includes('|')) {
    const [base, ...versionParts] = item.split('|');
    const version = versionParts.join('|') || null;
    result = fisher.fishForFHIR(base, ...types);
    if (version != null && result?.version != null && version != result.version) {
      logger.warn(`${item} was requested, but SUSHI found ${base}|${result.version}`, sourceInfo);
    }
  }

  return result;
}

// Use the provided fisher to fish for the item's metadata.
// If found, return it. If not found, try to remove any |version info and fish for any available version.
export function fishForMetadataBestVersion(
  fisher: Fishable,
  item: string,
  sourceInfo?: SourceInfo,
  ...types: Type[]
): Metadata | undefined {
  if (fisher == null) {
    return;
  }

  let metadata = fisher.fishForMetadata(item, ...types);

  // If the item was not found, try slicing off a version and searching for any version
  if (metadata == null && item?.includes('|')) {
    const [base, ...versionParts] = item.split('|');
    const version = versionParts.join('|') || null;
    metadata = fisher.fishForMetadata(base, ...types);
    if (version != null && metadata?.version != null && version != metadata.version) {
      logger.warn(`${item} was requested, but SUSHI found ${base}|${metadata.version}`, sourceInfo);
    }
  }

  return metadata;
}

// Use the provided tank to fish for the item, which might have a |version appended.
// If the specified version is found, return it. If not found, try to remove any |version info and fish for any available version.
export function fishInTankBestVersion(
  tank: FSHTank,
  item: string,
  sourceInfo?: SourceInfo,
  ...types: Type[]
):
  | Profile
  | Extension
  | Logical
  | Resource
  | FshValueSet
  | FshCodeSystem
  | Instance
  | Invariant
  | RuleSet
  | Mapping
  | undefined {
  let result = tank.fish(item, ...types);

  // If the item was not found, try slicing off a version and searching for any version
  if (result == null && item != null && item.includes('|')) {
    const [base, ...versionParts] = item.split('|');
    const version = versionParts.join('|') || null;
    result = tank.fish(base, ...types);
    if (result != null) {
      let resultVersion = tank.config.version;
      if (
        !(result instanceof Invariant || result instanceof RuleSet || result instanceof Mapping)
      ) {
        resultVersion = getVersionFromFshDefinition(result, tank.config.version);
      }
      if (version != null && resultVersion != null && version != resultVersion) {
        logger.warn(`${item} was requested, but SUSHI found ${base}|${resultVersion}`, sourceInfo);
      }
    }
  }

  return result;
}

export function getFHIRVersionPreferringFisher(
  fisher: MasterFisher,
  preferredFHIRVersion?: string
): Fishable {
  const supplementalFHIRDefs =
    preferredFHIRVersion &&
    preferredFHIRVersion != fisher.defaultFHIRVersion &&
    fisher.fhir.getSupplementalFHIRDefinitions(
      getFHIRVersionInfo(preferredFHIRVersion).packageString
    );
  if (supplementalFHIRDefs) {
    return {
      fishForFHIR: (item: string, ...types: Type[]) => {
        return (
          supplementalFHIRDefs.fishForFHIR(item, ...types) ?? fisher.fishForFHIR(item, ...types)
        );
      },
      fishForMetadata: (item: string, ...types: Type[]) => {
        return (
          supplementalFHIRDefs.fishForMetadata(item, ...types) ??
          fisher.fishForMetadata(item, ...types)
        );
      }
    };
  } else {
    return fisher;
  }
}

// The IG publisher supports a subset of R5 resources that can be instantiated (but not profiled) in R4 IGs
// See: https://chat.fhir.org/#narrow/stream/215610-shorthand/topic/using.20R5.20resources.20in.20FSH/near/377870473
// See: https://github.com/HL7/fhir-ig-publisher/blob/master/org.hl7.fhir.publisher.core/src/main/java/org/hl7/fhir/igtools/publisher/SpecialTypeHandler.java
const ALLOWED_R5_RESOURCES = ['ActorDefinition', 'Requirements', 'SubscriptionTopic', 'TestPlan'];
export function fishForR5ResourceAllowedInR4IGs(
  fisher: MasterFisher,
  item: string
): any | undefined {
  const result = getFHIRVersionPreferringFisher(fisher, '5.0.0').fishForFHIR(item, Type.Resource);
  if (result && ALLOWED_R5_RESOURCES.includes(result.type)) {
    return result;
  }
}
