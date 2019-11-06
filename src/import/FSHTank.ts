import { FSHDocument } from './FSHDocument';

export class FSHTank {
  constructor(public readonly docs: FSHDocument[], public readonly packageJSON: any) {}
}
