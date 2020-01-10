import { FshEntity } from './FshEntity';
import { FshConcept } from './FshConcept';
import { CodeSystemDuplicateCodeError } from '../errors/CodeSystemDuplicateCodeError';

/**
 * For more information about a CodeSystem in FHIR,
 * @see {@link http://hl7.org/fhir/codesystem-definitions.html}
 */
export class FshCodeSystem extends FshEntity {
  id: string;
  title?: string;
  description?: string;
  concepts: FshConcept[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.concepts = [];
  }

  addConcept(newConcept: FshConcept) {
    if (this.concepts.find(existingConcept => existingConcept.code == newConcept.code)) {
      throw new CodeSystemDuplicateCodeError(this.id, newConcept.code);
    }
    this.concepts.push(newConcept);
  }
}
