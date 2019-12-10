import { FshEntity } from './FshEntity';
import { ValueSetTerm } from './ValueSetTerm';
import { ValueSetFilter } from './ValueSetFilter';

/**
 * For more information about the composition of a ValueSet,
 * @see {@link http://hl7.org/fhir/valueset-definitions.html#ValueSet.compose}
 */
export class ValueSet extends FshEntity {
  id: string;
  url?: string;
  description?: string;
  inclusions: (ValueSetTerm | ValueSetFilter | ValueSet)[];
  exclusions: (ValueSetTerm | ValueSetFilter | ValueSet)[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.inclusions = [];
    this.exclusions = [];
  }
}
