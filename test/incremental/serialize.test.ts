import {
  UnserializableError,
  buildClassRegistry,
  decode,
  encode,
  hashValue,
  replaceOwnProperties
} from '../../src/incremental/serialize';
import { definitionRegistry } from '../../src/incremental/registries';
import { importSingleText } from '../testhelpers';

class Point {
  constructor(
    public x: number,
    public y?: number
  ) {}
  sum() {
    return this.x + (this.y ?? 0);
  }
}

describe('serialize', () => {
  const registry = buildClassRegistry({ Point });
  const roundTrip = (value: any) =>
    decode(JSON.parse(JSON.stringify(encode(value, registry))), registry);

  it('should round-trip plain values', () => {
    const value = { a: 1, b: 'two', c: [true, null, 3.5], d: { e: 'nested' } };
    expect(roundTrip(value)).toEqual(value);
  });

  it('should keep values that JSON cannot represent', () => {
    const value = { u: undefined as any, neg: -0, inf: Infinity, nan: NaN, big: BigInt(12) };
    const result = roundTrip(value);
    expect(Object.keys(result)).toEqual(['u', 'neg', 'inf', 'nan', 'big']);
    expect(result.u).toBeUndefined();
    expect(Object.is(result.neg, -0)).toBe(true);
    expect(result.inf).toBe(Infinity);
    expect(result.nan).toBeNaN();
    expect(result.big).toBe(BigInt(12));
  });

  it('should keep Maps, Sets, Dates, and plain objects with keys that look like markers', () => {
    const value = {
      map: new Map<any, any>([
        ['k', 1],
        [2, { v: 'x' }]
      ]),
      set: new Set(['a', 'b']),
      date: new Date(1700000000000),
      marker: { $r: 1, $c: 'Point' }
    };
    const result = roundTrip(value);
    expect(result.map).toEqual(value.map);
    expect(result.set).toEqual(value.set);
    expect(result.date).toEqual(value.date);
    expect(result.marker).toEqual({ $r: 1, $c: 'Point' });
  });

  it('should keep regular expressions', () => {
    const sticky = /a+/gy;
    sticky.lastIndex = 2;
    const value = { regex: /^http:\/\/[a-z]+$/i, sticky, again: sticky };
    const result = roundTrip(value);
    expect(result.regex).toBeInstanceOf(RegExp);
    expect(result.regex.source).toBe(value.regex.source);
    expect(result.regex.flags).toBe('i');
    expect(result.sticky.flags).toBe('gy');
    expect(result.sticky.lastIndex).toBe(2);
    expect(result.again).toBe(result.sticky);
    expect(hashValue(result, registry)).toBe(hashValue(value, registry));
  });

  it('should keep class identity and property order', () => {
    const result = roundTrip(new Point(1, 2));
    expect(result).toBeInstanceOf(Point);
    expect(result.sum()).toBe(3);
    expect(Object.keys(result)).toEqual(['x', 'y']);
  });

  it('should keep shared and circular references', () => {
    const shared = new Point(5);
    const value: any = { first: shared, second: shared, list: [shared] };
    value.self = value;
    const result = roundTrip(value);
    expect(result.first).toBe(result.second);
    expect(result.list[0]).toBe(result.first);
    expect(result.self).toBe(result);
  });

  it('should throw an UnserializableError for functions, symbols, and unknown classes', () => {
    class Unknown {}
    expect(() => encode({ f: () => 1 }, registry)).toThrow(UnserializableError);
    expect(() => encode({ s: Symbol('s') }, registry)).toThrow(UnserializableError);
    expect(() => encode({ o: new Unknown() }, registry)).toThrow(UnserializableError);
  });

  it('should throw an UnserializableError for a regular expression with extra properties', () => {
    const regex: any = /a/;
    regex.extra = true;
    expect(() => encode(regex, registry)).toThrow(UnserializableError);
  });

  it('should refuse to decode references and classes it does not know', () => {
    expect(() => decode({ $r: 0 }, registry)).toThrow(/Invalid serialized reference/);
    expect(() => decode({ $c: 'Unknown', p: {} }, registry)).toThrow(/Unknown class/);
  });

  it('should refuse to build a registry with two different classes of the same name', () => {
    const a = { Point };
    const b = { Point: class Point {} };
    expect(() => buildClassRegistry(a, b)).toThrow(/Ambiguous/);
  });

  it('should round-trip imported FSH documents exactly', () => {
    const doc = importSingleText(
      `
      Alias: $sct = http://snomed.info/sct
      Profile: MyPatient
      Parent: Patient
      * name 1..* MS
      * gender = #female
      RuleSet: Params(path)
      * {path} MS
      Instance: Pat
      InstanceOf: MyPatient
      * name.family = "Smith"
      ValueSet: RegexVS
      * include codes from system http://example.org where display regex /^A.*/
      `,
      'doc.fsh'
    );
    const reg = definitionRegistry();
    const result = decode(JSON.parse(JSON.stringify(encode(doc, reg))), reg);
    expect(result).toEqual(doc);
    expect(result.constructor).toBe(doc.constructor);
    expect(result.profiles.get('MyPatient').constructor).toBe(
      doc.profiles.get('MyPatient').constructor
    );
    expect(hashValue(result, reg)).toBe(hashValue(doc, reg));
    const filter = result.valueSets.get('RegexVS').rules[0].filters[0];
    expect(filter.value).toBeInstanceOf(RegExp);
    expect(filter.value.source).toBe('^A.*');
  });

  it('should replace the own properties of an object while keeping its identity', () => {
    const target: any = new Point(1, 2);
    const ref = target;
    replaceOwnProperties(target, { y: 3, z: 4 });
    expect(ref).toBe(target);
    expect(Object.keys(target)).toEqual(['y', 'z']);
    expect(target.sum()).toBeNaN();
  });
});
