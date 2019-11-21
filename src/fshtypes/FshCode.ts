import { FshEntity } from './FshEntity';

export class FshCode extends FshEntity {
  constructor(public code: string, public system?: string, public display?: string) {
    super();
  }
}
