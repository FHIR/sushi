/**
 * Abstract class to contain elements common to all FSH types.
 */
export abstract class FshEntity {
  readonly sourceInfo: SourceInfo = {};

  public withLocation(location: TextLocation | [number, number, number, number]): this {
    if (Array.isArray(location)) {
      this.sourceInfo.location = {
        startLine: location[0],
        startColumn: location[1],
        endLine: location[2],
        endColumn: location[3]
      };
    } else {
      this.sourceInfo.location = location;
    }
    return this;
  }

  public withFile(file: string): this {
    this.sourceInfo.file = file;
    return this;
  }
}

export type SourceInfo = {
  file?: string;
  location?: TextLocation;
};

export type TextLocation = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};
