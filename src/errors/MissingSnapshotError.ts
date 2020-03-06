export class MissingSnapshotError extends Error {
  constructor(public url: string) {
    super(`Structure Definition ${url} is missing snapshot. Snapshot is required for import.`);
  }
}
