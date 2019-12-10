import { FshEntity } from './FshEntity';
import { ValueSetComponent } from './ValueSetComponent';

/**
 * For more information about the composition of a ValueSet,
 * @see {@link http://hl7.org/fhir/valueset-definitions.html#ValueSet.compose}
 */
export class ValueSet extends FshEntity {
  id: string;
  url?: string;
  description?: string;
  inclusions: ValueSetComponent[];
  exclusions: ValueSetComponent[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.inclusions = [];
    this.exclusions = [];
  }
}
