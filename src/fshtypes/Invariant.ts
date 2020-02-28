import { FshEntity, FshCode } from '.';

/**
 * The Invariant class is used to represent the "constraint" field on ElementDefinition
 * Invariant fields map to their corresponding field on "constraint" except:
 * description -> constraint.human
 * name -> constraint.key
 * @see {@link https://www.hl7.org/fhir/elementdefinition.html}
 */
export class Invariant extends FshEntity {
  description: string;
  expression?: string;
  xpath?: string;
  severity: FshCode;

  constructor(public name: string) {
    super();
  }

  /**
   * Read only property for id that just returns the name of the invariant
   * This was added so that all types that are returned by FSHTank.fish have an id that can be accessed
   */
  get id() {
    return this.name;
  }
}
