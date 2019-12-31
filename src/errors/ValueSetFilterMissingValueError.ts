import { VsOperator } from '../fshtypes';

export class ValueSetFilterMissingValueError extends Error {
  constructor(public operator: VsOperator) {
    super(`Not applying value set filter: missing value for operator "${operator}".`);
  }
}
