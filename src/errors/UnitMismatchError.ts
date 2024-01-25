import { Annotated } from './Annotated';
import { Quantity } from '../fhirtypes';

export class UnitMismatchError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/datatypes.html#Range'];
  constructor(
    public q1: Quantity,
    public q2: Quantity
  ) {
    super(
      `The quantities must have matching units, but their units are ${q1.unit} and ${q2.unit}.`
    );
  }
}
