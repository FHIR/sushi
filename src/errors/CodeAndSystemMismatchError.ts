import { Annotated } from './Annotated';
import { Quantity } from '../fhirtypes';

export class CodeAndSystemMismatchError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/datatypes.html#Range'];
  constructor(
    public q1: Quantity,
    public q2: Quantity
  ) {
    super(
      `The quantities must have matching codes and systems, but their codes are ${q1.code} and ${q2.code} and their systems are ${q1.system} and ${q2.system}.`
    );
  }
}
