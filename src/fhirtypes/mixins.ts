import { CaretValueRule } from '../fshtypes/rules';
import { FshValueSet, FshStructure, FshCodeSystem, SourceInfo } from '../fshtypes';
import { logger } from '../utils';
import { FHIRId, idRegex } from './primitiveTypes';
import { AbstractConfigSet } from 'winston/lib/winston/config';

const nameRegex = /^[A-Z]([A-Za-z0-9_]){0,254}$/;

export class HasName {
  name?: string;
  /**
   * Set the name and check if it matches the regular expression specified
   * in the invariant for "name" properties. A name must be between 1 and 255 characters long,
   * begin with an uppercase letter, and contain only uppercase letter, lowercase letter,
   * numeral, and '_' characters.
   * If the string does not match, log an error.
   *
   * @see {@link http://hl7.org/fhir/R4/structuredefinition-definitions.html#StructureDefinition.name}
   * @see {@link http://hl7.org/fhir/R4/valueset-definitions.html#ValueSet.name}
   * @see {@link http://hl7.org/fhir/R4/codesystem-definitions.html#CodeSystem.name}
   * @param {FshStructure | FshCodeSystem | FshValueSet} fshDefinition - The entity who's name is being set
   */
  setName(fshDefinition: FshStructure | FshCodeSystem | FshValueSet) {
    this.name = fshDefinition.name;
    const nameRule = fshDefinition.rules
      .filter(rule => rule instanceof CaretValueRule && rule.caretPath === 'name')
      .pop() as CaretValueRule;
    if (!nameRegex.test(this.name)) {
      // There's no need to warn on an invalid name if a Caret Rule overwrites the entity name
      if (!nameRule || !nameRegex.test(nameRule.value as string)) {
        logger.warn(
          `The name "${this.name}" may not be suitable for machine processing applications such as code generation. Valid names start with an ` +
            "upper-case ASCII letter ('A'..'Z') followed by any combination of upper- or lower-case ASCII letters ('A'..'Z', and " +
            "'a'..'z'), numerals ('0'..'9') and '_', with a length limit of 255 characters.",
          fshDefinition.sourceInfo
        );
      }
    } else if (nameRule && !nameRegex.test(nameRule.value as string)) {
      logger.warn(
        `"${fshDefinition.name}" includes a name-setting caret rule that may not be suitable for machine processing applications such as code generation. Valid names start with an ` +
          "upper-case ASCII letter ('A'..'Z') followed by any combination of upper- or lower-case ASCII letters ('A'..'Z', and " +
          "'a'..'z'), numerals ('0'..'9') and '_', with a length limit of 255 characters.",
        nameRule.sourceInfo
      );
    }
  }
}

export class HasId {
  id?: FHIRId;
  /**
   * Set the id and check if it matches the regular expression specified
   * in the definition of the "id" type.
   * If the FHIRId does not match, log an error.
   *
   * @param {FshStructure | FshCodeSystem | FshValueSet} fshDefinition - The entity who's id is being set
   */
  setId(fshDefinition: FshStructure | FshCodeSystem | FshValueSet) {
    this.id = fshDefinition.id;
    this.validateId(fshDefinition);
  }

  /**
   * Check if the current id matches the regular expression specified
   * in the definition of the "id" type.
   * If the FHIRId does not match, log an error.
   * If the id is a valid name, sanitize it to a valid id and log a warning
   *
   * @param {FshStructure | FshCodeSystem | FshValueSet} fshDefinition - The entity who's id is being set
   * @param sourceInfo - The FSH file and location that specified the id
   */
  validateId(fshDefinition: FshStructure | FshCodeSystem | FshValueSet) {
    let validId = idRegex.test(this.id);
    const idRule = fshDefinition.rules
      .filter(rule => rule instanceof CaretValueRule && rule.caretPath === 'id')
      .pop() as CaretValueRule;
    if (!validId) {
      if (idRule && idRegex.test(idRule.value as string)) {
        this.id = idRule.value as string;
        validId = true;
      } else if (nameRegex.test(this.id)) {
        // A valid name can be turned into a valid id by replacing _ with - and slicing to 64 character limit
        const sanitizedId = this.id.replace(/_/g, '-').slice(0, 64);
        if (idRegex.test(sanitizedId)) {
          // Use the sanitized id, but warn the user to fix this
          logger.warn(
            `The string "${this.id}" represents a valid FHIR name but not a valid FHIR id. FHIR ids cannot contain "_" and can be at most 64 characters. The id will be exported as "${sanitizedId}". Avoid this warning by specifying a valid id directly using the "Id" keyword.`,
            fshDefinition.sourceInfo
          );
          this.id = sanitizedId;
          validId = true;
        }
      } else {
        logger.error(
          `The string "${this.id}" does not represent a valid FHIR id. FHIR ids may contain any combination of upper- or lower-case ASCII letters ('A'..'Z', and 'a'..'z'), numerals ('0'..'9'), '-' and '.', with a length limit of 64 characters.`,
          fshDefinition.sourceInfo
        );
      }
    } else if (validId && idRule && !idRegex.test(idRule.value as string)) {
      logger.error(
        `${fshDefinition.name} contains an id-setting caret rule that does not represent a valid FHIR id. FHIR ids may contain any combination of upper- or lower-case ASCII letters ('A'..'Z', and 'a'..'z'), numerals ('0'..'9'), '-' and '.', with a length limit of 64 characters.`,
        idRule.sourceInfo
      );
    }
  }
}
