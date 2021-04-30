import { FshEntity } from './FshEntity';
import { CodeSystemDuplicateCodeError } from '../errors/CodeSystemDuplicateCodeError';
import { CodeSystemIncorrectHierarchyError } from '../errors/CodeSystemIncorrectHierarchyError';
import { CaretValueRule, InsertRule, ConceptRule } from './rules';
import isEqual from 'lodash/isEqual';

/**
 * For more information about a CodeSystem in FHIR,
 * @see {@link http://hl7.org/fhir/codesystem-definitions.html}
 */
export class FshCodeSystem extends FshEntity {
  id: string;
  title?: string;
  description?: string;
  rules: (ConceptRule | CaretValueRule | InsertRule)[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.rules = [];
  }

  get constructorName() {
    return 'FshCodeSystem';
  }

  addConcept(newConcept: ConceptRule) {
    if (this.rules.find(rule => rule instanceof ConceptRule && rule.code == newConcept.code)) {
      throw new CodeSystemDuplicateCodeError(this.id, newConcept.code);
    }
    // check the hierarchy, if applicable
    // for each predecessor element in the new concept's hierarchy, we should be able to find a rule that
    // 1. defines a concept
    // 2. with the predecessor's code
    // 3. and a hierarchy equal to everything before it in the new concept's hierarchy
    newConcept.hierarchy.forEach((predecessor, i) => {
      if (
        !this.rules.some(rule => {
          return (
            rule instanceof ConceptRule &&
            rule.code === predecessor &&
            isEqual(rule.hierarchy, newConcept.hierarchy.slice(0, i))
          );
        })
      ) {
        throw new CodeSystemIncorrectHierarchyError(this.id, newConcept.code);
      }
    });
    this.rules.push(newConcept);
  }
}
