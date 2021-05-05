export type InstanceUsage = 'Example' | 'Definition' | 'Inline';

export function isInstanceUsage(s: string): s is InstanceUsage {
  return ['Example', 'Definition', 'Inline'].indexOf(s) >= 0;
}
