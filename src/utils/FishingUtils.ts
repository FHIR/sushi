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
  Mapping
} from '../fshtypes';
import { getVersionFromFshDefinition } from '../fhirtypes/common';
import { logger } from './FSHLogger';
import { Fishable, Metadata, Type } from './Fishable';

// Use the provided fisher to fish for the item, which might have a |version appended.
// If found, return it. If not found, try to remove any |version info and fish for any available version.
export function fishForFHIRBestVersion(
  fisher: Fishable,
  item: string,
  ...types: Type[]
): any | undefined {
  let result = fisher.fishForFHIR(item, ...types);

  // If the item was not found, try slicing off a version and searching for any version
  if (result == null && item != null && item.includes('|')) {
    const [base, ...versionParts] = item.split('|');
    const version = versionParts.join('|') || null;
    result = fisher.fishForFHIR(base, ...types);
    if (version != null && result?.version != null && version != result?.version) {
      logger.warn(
        `The ${base} definition was specified with version ${version}, but SUSHI found version ${result.version}`
      );
    }
  }

  return result;
}

// Use the provided fisher to fish for the item's metadata.
// If found, return it. If not found, try to remove any |version info and fish for any available version.
export function fishForMetadataBestVersion(
  fisher: Fishable,
  item: string,
  ...types: Type[]
): Metadata | undefined {
  if (fisher == null) {
    return;
  }

  let metadata = fisher.fishForMetadata(item, ...types);

  // If the item was not found, try slicing off a version and searching for any version
  if (metadata == null && item != null && item.includes('|')) {
    const [base, ...versionParts] = item.split('|');
    const version = versionParts.join('|') || null;
    metadata = fisher.fishForMetadata(base, ...types);
    if (version != null && metadata?.version != null && version != metadata?.version) {
      logger.warn(
        `The ${base} definition was specified with version ${version}, but SUSHI found version ${metadata?.version}`
      );
    }
  }

  return metadata;
}

// Use the provided tank to fish for the item, which might have a |version appended.
// If the specified version is found, return it. If not found, try to remove any |version info and fish for any available version.
export function fishInTankBestVersion(
  tank: FSHTank,
  item: string,
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
        logger.warn(
          `The ${base} FSH definition was specified with version ${version}, but SUSHI found version ${resultVersion}`
        );
      }
    }
  }

  return result;
}
