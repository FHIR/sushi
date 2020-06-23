import { FshEntity } from './FshEntity';
import { FshConcept } from './FshConcept';
import { CodeSystemDuplicateCodeError } from '../errors/CodeSystemDuplicateCodeError';
import { CaretValueRule, InsertRule } from './rules';

/**
 * For more information about a CodeSystem in FHIR,
 * @see {@link http://hl7.org/fhir/codesystem-definitions.html}
 */
export class FshCodeSystem extends FshEntity {
  id: string;
  title?: string;
  description?: string;
  rules: (FshConcept | CaretValueRule | InsertRule)[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.rules = [];
  }

  addConcept(newConcept: FshConcept) {
    if (
      this.rules
        .filter(rule => rule instanceof FshConcept)
        .find((existingConcept: FshConcept) => existingConcept.code == newConcept.code)
    ) {
      throw new CodeSystemDuplicateCodeError(this.id, newConcept.code);
    }
    this.rules.push(newConcept);
  }
}
