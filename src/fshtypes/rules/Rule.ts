import { FshEntity } from '../FshEntity';

export class Rule extends FshEntity {
  constructorName = 'Rule';
  constructor(public path: string) {
    super();
  }
}
