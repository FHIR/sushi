import { Annotated } from './Annotated';
import { AssignmentValueType } from '../fshtypes/rules';

export class AssignmentToCodeableReferenceError extends Error implements Annotated {
  specReferences = ['https://build.fhir.org/references.html#CodeableReference'];
  constructor(
    public valueType: string,
    public value: AssignmentValueType,
    public childPath: string
  ) {
    super(
      `Cannot assign ${valueType} value: ${value.toString()} to CodeableReference. Assign to CodeableReference.${childPath} instead`
    );
  }
}
