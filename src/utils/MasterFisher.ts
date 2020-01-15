import { Fishable, Type, Metadata } from './Fishable';

/**
 * The MasterFisher can fish multiple Fishable locations.  Fishable locations are passed into the
 * constructor.  When the MasterFisher fishes, they will fish at each location, in the order they
 * were passed in, until they catch a fish (or fail completely).
 *
 * In practice, this will allow us to easily have a single Fishable implementation that can fish
 * the FSHTank, FHIRDefinitions, and Packages at the same time.
 */
export class MasterFisher implements Fishable {
  private readonly fishables: Fishable[];

  constructor(...fishables: Fishable[]) {
    this.fishables = fishables;
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    for (const fishable of this.fishables) {
      const result = fishable.fishForFHIR(item, ...types);
      if (result) {
        return result;
      }
    }
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata {
    for (const fishable of this.fishables) {
      const result = fishable.fishForMetadata(item, ...types);
      if (result) {
        return result;
      }
    }
  }
}
