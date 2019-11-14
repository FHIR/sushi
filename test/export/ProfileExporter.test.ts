import { ProfileExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, load } from '../../src/fhirdefs';
import { Profile } from '../../src/fshtypes';
import { Logger, createLogger, format, transports } from 'winston';

describe('ProfileExporter', () => {
  let defs: FHIRDefinitions;
  let logger: Logger;
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: ProfileExporter;

  beforeAll(() => {
    defs = load('4.0.1');
    const { combine, colorize, printf } = format;
    logger = createLogger({
      format: combine(
        colorize({ all: true }),
        printf(info => `From ${info.label ?? 'StructureDefinitionExporter'}: \n${info.message}`)
      ),
      transports: [new transports.Console()]
    });
  });

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    input = new FSHTank([doc], { canonical: 'http://example.com' });
    exporter = new ProfileExporter(defs, logger.child({ label: 'ProfileExporter' }));
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export(input);
    expect(exported).toEqual([]);
  });

  it('should export a single profile', () => {
    const profile = new Profile('Foo');
    doc.profiles.set(profile.name, profile);
    const exported = exporter.export(input);
    expect(exported.length).toBe(1);
  });

  it('should export multiple profiles', () => {
    const profileFoo = new Profile('Foo');
    const profileBar = new Profile('Bar');
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    const exported = exporter.export(input);
    expect(exported.length).toBe(2);
  });

  it('should still export profiles if one fails', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Baz';
    const profileBar = new Profile('Bar');
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.profiles.set(profileBar.name, profileBar);
    const exported = exporter.export(input);
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Bar');
  });
});
