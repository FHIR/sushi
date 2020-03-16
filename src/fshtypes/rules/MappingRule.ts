import { Rule } from './Rule';
import { FshCode } from '../FshCode';

export class MappingRule extends Rule {
  map: string;
  language: FshCode;
  comment: string;

  constructor(path: string) {
    super(path);
  }
}
