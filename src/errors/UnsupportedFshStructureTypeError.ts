import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';
import { FshStructure } from '../fshtypes/FshStructure';

export class UnsupportedFshStructureTypeError extends Error implements WithSource {
  public sourceInfo: SourceInfo;
  constructor(public fshStructure: FshStructure) {
    super(
      `FshStructure ${fshStructure.name} has an unsupported type of ${fshStructure.constructorName}.`
    );
    this.sourceInfo = fshStructure.sourceInfo;
  }
}
