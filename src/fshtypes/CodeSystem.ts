import { FshEntity } from './FshEntity';
import { FshCode } from './FshCode';

/**
 * For more information about a CodeSystem in FHIR,
 * @see {@link http://hl7.org/fhir/codesystem-definitions.html}
 */
export class CodeSystem extends FshEntity {
  id: string;
  title?: string;
  description?: string;
  concepts: FshCode[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.concepts = [];
  }

  addConcept(code: string, display?: string) {
    this.concepts.push(new FshCode(code, this.id, display));
  }
}
