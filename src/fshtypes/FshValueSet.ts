import { FshEntity } from './FshEntity';
import { ValueSetComponent } from './ValueSetComponent';

/**
 * For more information about the composition of a ValueSet,
 * @see {@link http://hl7.org/fhir/valueset-definitions.html#ValueSet.compose}
 */
export class FshValueSet extends FshEntity {
  id: string;
  title?: string;
  description?: string;
  components: ValueSetComponent[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.components = [];
  }
}
