import { Fishable, Type, Metadata } from './Fishable';
import { FSHTank } from '../import';
import { FHIRDefinitions } from '../fhirdefs';
import { Package } from '../export';
import { logger } from './FSHLogger';

/**
 * The MasterFisher can fish from the tank, the FHIR definitions, and the package that is currently
 * being exported. When the MasterFisher fishes, it fishes in the package first, then the tank, and
 * then the FHIRDefinitions.  This essentially prefers local definitions first (when there are naming
 * clashes).
 *
 * The MasterFisher also uses its knowledge of these Fishable locations to do some necessary magic.
 * For instance, the FSHTank has no knowledge of FHIRDefinitions, so it cannot provide the correct
 * sdType for its metadata results.  When the MasterFisher detects this has happened, it uses the
 * other Fishable locations to determine the proper sdType (even for an item that currently exists
 * only in the tank).
 */
export class MasterFisher implements Fishable {
  constructor(public tank?: FSHTank, public fhir?: FHIRDefinitions, public pkg?: Package) {}

  /**
   * Searches for the FHIR JSON by name/id/url.  It will first search through the local package
   * (which contains FHIR artifacts exported so far), then through the external FHIR definitions.
   * @param {string} item - the item name/id/url to fish for
   * @param types - the allowable types to fish for
   */
  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    // Resolve the alias if necessary
    item = this.tank?.resolveAlias(item) ?? item;

    // First check for it in the package
    let result = this.pkg?.fishForFHIR(item, ...types);
    if (result == null) {
      // If it is in the tank, return undefined. We don't want to return the external FHIR
      // definition, even if it exists -- because it won't match what is in the tank.  This
      // ensures consistency between the outputs of fishForFHIR and fishForMetadata.
      if (this.tank?.fish(item, ...types)) {
        return;
      }
      result = this.fhir?.fishForFHIR(item, ...types);
    }
    return result;
  }

  /**
   * Searches for the Metadata associated with the passed in name/id/url.  It will first search
   * through the local package (which contains FHIR artifacts exported so far), then through the
   * tank, then through the external FHIR definitions. This function is useful because it gets
   * commonly used information without having to force an export. This helps to reduce the risk
   * of circular dependencies causing problems.
   * @param item - the item/name/id url to fish for
   * @param types - the allowable types to fish for
   */
  fishForMetadata(item: string, ...types: Type[]): Metadata {
    // Resolve the alias if necessary
    item = this.tank?.resolveAlias(item) ?? item;

    const fishables = [this.pkg, this.tank, this.fhir].filter(f => f != null);
    for (const fishable of fishables) {
      const result = fishable.fishForMetadata(item, ...types);
      if (result) {
        // If it came from the tank, we need to get the sdType because the tank doesn't know.
        if (fishable instanceof FSHTank) {
          result.sdType = this.findSdType(result, types, fishables);
        }
        return result;
      }
    }
  }

  private findSdType(meta: Metadata, types: Type[], fishables: Fishable[]): string | undefined {
    const history = [meta];
    let [sdType, parent] = [meta.sdType, meta.parent];
    while (sdType == null && parent != null) {
      // Resolve the alias if necessary
      parent = this.tank?.resolveAlias(parent) ?? parent;

      let parentResult: Metadata;
      for (const fishable of fishables) {
        parentResult = fishable.fishForMetadata(parent, ...types);
        if (parentResult != null) {
          if (history.some(md => md.url === parentResult.url)) {
            let message =
              'Circular dependency detected on parent relationships: ' +
              [...history, parentResult].map(l => l.name).join(' < ');
            const fhirMeta =
              this.fhir?.fishForMetadata(parentResult.name) ??
              this.fhir?.fishForMetadata(parentResult.id);
            if (fhirMeta) {
              message += `\n  If the parent ${parentResult.name} is intended to refer to the FHIR resource, use its URL: ${fhirMeta.url}`;
            }
            logger.error(
              message,
              fishable instanceof FSHTank ? fishable.fish(parent)?.sourceInfo : undefined
            );
            return;
          }
          history.push(parentResult);
          break; // break out of fishables loop
        }
      }
      [sdType, parent] = [parentResult?.sdType, parentResult?.parent];
    }
    return sdType;
  }
}
