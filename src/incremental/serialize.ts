import { createHash } from 'crypto';

/**
 * A class-aware serializer for the object graphs SUSHI builds (FSH definitions, rules, FSH values).
 * Unlike JSON.stringify, it keeps class identity (by constructor name, from a registry of known
 * classes), Maps, Sets, undefined-valued properties, bigints, and shared or circular references.
 * Anything it does not know how to represent faithfully (functions, symbols, unregistered classes)
 * makes it throw, so callers can fall back to doing the work instead of caching it.
 */

export class UnserializableError extends Error {
  constructor(what: string) {
    super(`Cannot serialize ${what}`);
  }
}

export type ClassRegistry = Map<string, new (...args: any[]) => any>;

/**
 * Builds a registry from the exports of the given modules. Every exported class is registered by
 * its name. Two different classes with the same name make the registry ambiguous, so that throws.
 */
export function buildClassRegistry(...modules: any[]): ClassRegistry {
  const registry: ClassRegistry = new Map();
  for (const mod of modules) {
    for (const value of Object.values(mod ?? {})) {
      if (typeof value === 'function' && value.prototype != null && value.name) {
        const existing = registry.get(value.name);
        if (existing != null && existing !== value) {
          throw new Error(`Ambiguous class name in serializer registry: ${value.name}`);
        }
        registry.set(value.name, value as any);
      }
    }
  }
  return registry;
}

export function encode(value: any, registry: ClassRegistry): any {
  const seen = new Map<any, number>();
  const ctorNames = new Map<any, string>();
  for (const [name, ctor] of registry) {
    ctorNames.set(ctor.prototype, name);
  }

  const encodeProps = (obj: any): any => {
    const out: any = {};
    for (const key of Object.keys(obj)) {
      out[key] = enc(obj[key]);
    }
    return out;
  };

  const enc = (v: any): any => {
    if (v === null) {
      return null;
    }
    switch (typeof v) {
      case 'string':
      case 'boolean':
        return v;
      case 'number':
        if (Number.isFinite(v) && !Object.is(v, -0)) {
          return v;
        }
        return { $n: Object.is(v, -0) ? '-0' : String(v) };
      case 'undefined':
        return { $u: 1 };
      case 'bigint':
        return { $b: v.toString() };
      case 'object':
        break;
      default:
        throw new UnserializableError(typeof v);
    }
    if (seen.has(v)) {
      return { $r: seen.get(v) };
    }
    seen.set(v, seen.size);
    const proto = Object.getPrototypeOf(v);
    if (proto === Array.prototype) {
      const arr = new Array(v.length);
      for (let i = 0; i < v.length; i++) {
        arr[i] = enc(v[i]);
      }
      return arr;
    } else if (proto === Object.prototype) {
      const props = encodeProps(v);
      return Object.keys(props).some(k => k.startsWith('$')) ? { $o: props } : props;
    } else if (proto === Map.prototype) {
      const entries: any[] = [];
      v.forEach((val: any, key: any) => {
        const k = enc(key);
        entries.push([k, enc(val)]);
      });
      return { $m: entries };
    } else if (proto === Set.prototype) {
      const items: any[] = [];
      v.forEach((item: any) => items.push(enc(item)));
      return { $s: items };
    } else if (proto === Date.prototype) {
      return { $d: v.getTime() };
    } else if (proto === RegExp.prototype) {
      if (Object.keys(v).length > 0) {
        throw new UnserializableError('regular expression with extra properties');
      }
      return { $x: [v.source, v.flags, v.lastIndex] };
    } else if (ctorNames.has(proto)) {
      return { $c: ctorNames.get(proto), $v: encodeProps(v) };
    }
    throw new UnserializableError(`object of class ${v?.constructor?.name ?? 'unknown'}`);
  };

  return enc(value);
}

export function decode(encoded: any, registry: ClassRegistry): any {
  const refs: any[] = [];
  const decodePropsInto = (target: any, props: any) => {
    for (const key of Object.keys(props)) {
      target[key] = dec(props[key]);
    }
    return target;
  };
  const dec = (e: any): any => {
    if (e === null || typeof e !== 'object') {
      return e;
    }
    if (Array.isArray(e)) {
      const arr: any[] = new Array(e.length);
      refs.push(arr);
      for (let i = 0; i < e.length; i++) {
        arr[i] = dec(e[i]);
      }
      return arr;
    }
    if ('$r' in e) {
      if (e.$r >= refs.length) {
        throw new Error('Invalid serialized reference');
      }
      return refs[e.$r];
    } else if ('$u' in e) {
      return undefined;
    } else if ('$n' in e) {
      return e.$n === '-0' ? -0 : Number(e.$n);
    } else if ('$b' in e) {
      return BigInt(e.$b);
    } else if ('$m' in e) {
      const map = new Map();
      refs.push(map);
      for (const [k, v] of e.$m) {
        const key = dec(k);
        map.set(key, dec(v));
      }
      return map;
    } else if ('$s' in e) {
      const set = new Set();
      refs.push(set);
      for (const item of e.$s) {
        set.add(dec(item));
      }
      return set;
    } else if ('$d' in e) {
      const date = new Date(e.$d);
      refs.push(date);
      return date;
    } else if ('$x' in e) {
      const regex = new RegExp(e.$x[0], e.$x[1]);
      regex.lastIndex = e.$x[2];
      refs.push(regex);
      return regex;
    } else if ('$c' in e) {
      const ctor = registry.get(e.$c);
      if (ctor == null) {
        throw new Error(`Unknown class in serialized data: ${e.$c}`);
      }
      const obj = Object.create(ctor.prototype);
      refs.push(obj);
      return decodePropsInto(obj, e.$v);
    } else if ('$o' in e) {
      const obj = {};
      refs.push(obj);
      return decodePropsInto(obj, e.$o);
    }
    const obj = {};
    refs.push(obj);
    return decodePropsInto(obj, e);
  };
  return dec(encoded);
}

export function hashString(s: string): string {
  return createHash('sha256').update(s).digest('base64url').slice(0, 32);
}

export function hashValue(value: any, registry: ClassRegistry): string {
  return hashString(JSON.stringify(encode(value, registry)));
}

/**
 * Replaces all of target's own enumerable properties with those of source, keeping target's
 * identity (other objects may hold references to it) and the property order of source.
 */
export function replaceOwnProperties(target: any, source: any): void {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  for (const key of Object.keys(source)) {
    target[key] = source[key];
  }
}
