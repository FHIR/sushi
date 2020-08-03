/**
 * Helper function for applying mixins.
 * @see {@link https://www.typescriptlang.org/docs/handbook/mixins.html#mixin-sample}
 */

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      if (name === 'constructor') return;
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name)
      );
    });
  });
}
