import { FshEntity } from './FshEntity';

export class FshConcept extends FshEntity {
  constructor(public code: string, public display?: string, public definition?: string) {
    super();
  }
}
