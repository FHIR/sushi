import { FshCode } from './FshCode';

export class ValueSetTerm extends FshCode {
  constructor(code: string, system?: string, display?: string, public definition?: string) {
    super(code, system, display);
  }
}
