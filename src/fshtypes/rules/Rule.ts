import { FshEntity } from '../FshEntity';

export class Rule extends FshEntity {
  constructor(public path: string) {
    super();
  }

  get constructorName() {
    return 'Rule';
  }
}
