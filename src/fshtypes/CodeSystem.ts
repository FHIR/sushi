import { FshEntity } from './FshEntity';
import { FshConcept } from './FshConcept';

/**
 * For more information about a CodeSystem in FHIR,
 * @see {@link http://hl7.org/fhir/codesystem-definitions.html}
 */
export class CodeSystem extends FshEntity {
  id: string;
  title?: string;
  description?: string;
  concepts: FshConcept[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.concepts = [];
  }

  addConcept(code: string, display?: string, definition?: string) {
    this.concepts.push(new FshConcept(code, display, definition));
  }
}
