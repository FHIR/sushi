export function stringOrElse(value: any): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
