/**
 * Abstract class to contain elements common to all FSH types.
 */
export abstract class FshEntity {
  constructor(public location?: TextLocation) {}
}

export type TextLocation = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};
