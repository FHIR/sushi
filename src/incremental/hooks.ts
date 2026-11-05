/**
 * The exporters report to the active incremental build session (if any) through this object. It
 * deliberately has no imports, so that the export code can depend on it without import cycles.
 * When no session is active (the default, and always the case unless incremental builds were
 * requested), every hook is skipped and SUSHI behaves exactly as it always has.
 */
export interface IncrementalSessionHooks {
  exportEntity(kind: string, exporter: any, fshDefinition: any, live: () => any): any;
  check(fn: () => void): void;
  noteSdCache(exporter: any, url: string, created: boolean): void;
  noteNewInstanceExporter(exporter: any): void;
  beginExport(context: any): void;
  enterPostExport(): void;
  endExport(): void;
  checkNullValues(resource: any, check: () => void): void;
}

export const incrementalHooks: { session: IncrementalSessionHooks | null } = { session: null };
