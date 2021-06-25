import { FshEntity } from './FshEntity';
import { CodeSystemDuplicateCodeError } from '../errors/CodeSystemDuplicateCodeError';
import { CodeSystemIncorrectHierarchyError } from '../errors/CodeSystemIncorrectHierarchyError';
import { CaretValueRule, InsertRule, ConceptRule } from './rules';
import { EOL } from 'os';
import { fshifyString } from './common';
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
    const existingConcept = this.rules.find(
      rule => rule instanceof ConceptRule && rule.code == newConcept.code
    ) as ConceptRule;
    if (existingConcept) {
      // if the new ConceptRule has only a code and a hierarchy,
      // and the existing ConceptRule with that code has a matching hierarchy,
      // the user may simply be referencing the existing concept to establish context.
      if (
        newConcept.display == null &&
        newConcept.definition == null &&
        isEqual(existingConcept.hierarchy, newConcept.hierarchy)
      ) {
        return;
      } else {
        throw new CodeSystemDuplicateCodeError(this.id, newConcept.code);
      }
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

  metadataToFSH(): string {
    const resultLines: string[] = [];
    resultLines.push(`CodeSystem: ${this.name}`);
    resultLines.push(`Id: ${this.id}`);
    if (this.title) {
      resultLines.push(`Title: "${fshifyString(this.title)}"`);
    }
    if (this.description) {
      // Description can be a multiline string.
      // If it contains newline characters, treat it as a multiline string.
      if (this.description.indexOf('\n') > -1) {
        resultLines.push(`Description: """${this.description}"""`);
      } else {
        resultLines.push(`Description: "${fshifyString(this.description)}"`);
      }
    }
    return resultLines.join(EOL);
  }

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
