import { Annotated } from './Annotated';
import { Code } from '../fshtypes/Code';

export class CodeAlreadyFixedError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_'
  ];
  constructor(public foundCode: Code, requestedCode: Code) {
    super(
      `Cannot fix ${requestedCode.system || ''}#${
        requestedCode.code
      } to this element; a different code is already fixed: ${foundCode.system || ''}#${
        foundCode.code
      }.`
    );
  }
}
