import { canonicalsAreEqualIgnoringVersion } from '../../src/fhirtypes/common';

describe('canonicalsAreEqualIgnoringVersion', () => {
  it('should return true for identical URLs with no version', () => {
    expect(
      canonicalsAreEqualIgnoringVersion('http://example.org/Foo', 'http://example.org/Foo')
    ).toBe(true);
  });

  it('should return true when one side is versioned and the other is not', () => {
    expect(
      canonicalsAreEqualIgnoringVersion('http://example.org/Foo|0.1.0', 'http://example.org/Foo')
    ).toBe(true);
    // reverse order
    expect(
      canonicalsAreEqualIgnoringVersion('http://example.org/Foo', 'http://example.org/Foo|0.1.0')
    ).toBe(true);
  });

  it('should return true when both sides carry the same version', () => {
    expect(
      canonicalsAreEqualIgnoringVersion(
        'http://example.org/Foo|0.1.0',
        'http://example.org/Foo|0.1.0'
      )
    ).toBe(true);
  });

  it('should return true when both sides are versioned but the versions differ', () => {
    // the canonical is the same; only the version differs, which is ignored
    expect(
      canonicalsAreEqualIgnoringVersion(
        'http://example.org/Foo|0.1.0',
        'http://example.org/Foo|2.0.0'
      )
    ).toBe(true);
  });

  it('should return false when the base URLs differ', () => {
    expect(
      canonicalsAreEqualIgnoringVersion('http://example.org/Foo|1', 'http://example.org/Bar|1')
    ).toBe(false);
  });

  it('should return false when the base URLs differ and neither is versioned', () => {
    expect(
      canonicalsAreEqualIgnoringVersion('http://example.org/Foo', 'http://example.org/Bar')
    ).toBe(false);
  });

  it('should return true for identical URLs that contain a literal pipe (exact-match path)', () => {
    // a URL containing a literal '|' still matches when both sides carry the same literal,
    // because the exact compare happens first
    expect(
      canonicalsAreEqualIgnoringVersion('http://example.org/Foo|bar', 'http://example.org/Foo|bar')
    ).toBe(true);
  });

  it('should NOT match a literal-pipe URL against its versioned form (symmetric strip limitation)', () => {
    // The helper strips the suspected trailing version from BOTH sides symmetrically, so it
    // cannot distinguish a literal '|' that is part of the URL from a '|version' suffix on the
    // shorter side: 'Foo|bar' strips to 'Foo' while 'Foo|bar|0.1.0' strips to 'Foo|bar'.
    // Per bugreport §1 the literal-'|' case is only guaranteed safe via the exact-match-first
    // step (identical strings); this mixed contrived case is outside that guarantee and does not
    // occur in the real (unversioned instance URL vs versioned profile) scenario.
    expect(
      canonicalsAreEqualIgnoringVersion(
        'http://example.org/Foo|bar',
        'http://example.org/Foo|bar|0.1.0'
      )
    ).toBe(false);
  });

  it('should return false (no throw) when exactly one input is null or undefined', () => {
    expect(canonicalsAreEqualIgnoringVersion(null, 'http://example.org/Foo')).toBe(false);
    expect(canonicalsAreEqualIgnoringVersion('http://example.org/Foo', null)).toBe(false);
    expect(canonicalsAreEqualIgnoringVersion(undefined, 'http://example.org/Foo')).toBe(false);
    expect(canonicalsAreEqualIgnoringVersion('http://example.org/Foo', undefined)).toBe(false);
  });

  it('should return true when both inputs are null (identical via exact match)', () => {
    // both null are `===`, so the exact-first step short-circuits to true before the null guard
    expect(canonicalsAreEqualIgnoringVersion(null, null)).toBe(true);
  });
});
