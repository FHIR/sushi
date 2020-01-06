import { FshEntity } from './FshEntity';

export class FshReference extends FshEntity {
  constructor(public reference: string, public display?: string) {
    super();
  }
}
