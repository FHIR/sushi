import { StructureDefinitionExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, load } from '../../src/fhirdefs';
import { Profile, Extension } from '../../src/fshtypes';
import { CardRule, ValueSetRule } from '../../src/fshtypes/rules';

describe('StructureDefinitionExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: StructureDefinitionExporter;

  beforeAll(() => {
    defs = load('4.0.1');
  });

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    input = new FSHTank([doc], { canonical: 'http://example.com' });
    exporter = new StructureDefinitionExporter(defs);
  });

  // Profile
  it('should set all metadata for a profile', () => {
    const profile = new Profile('Foo');
    profile.id = 'foo';
    profile.parent = 'Observation';
    profile.title = 'Foo Profile';
    profile.description = 'foo bar foobar';
    doc.profiles.set(profile.name, profile);
    const exported = exporter.exportStructDef(profile, input);
    expect(exported.name).toBe('Foo');
    expect(exported.id).toBe('foo');
    expect(exported.title).toBe('Foo Profile');
    expect(exported.description).toBe('foo bar foobar');
    expect(exported.url).toBe('http://example.com/StructureDefinition/foo');
    expect(exported.type).toBe('Observation');
  });

  it('should not overwrite metadata that is not given for a profile', () => {
    const profile = new Profile('Foo');
    doc.profiles.set(profile.name, profile);
    const exported = exporter.exportStructDef(profile, input);
    expect(exported.name).toBe('Foo');
    expect(exported.id).toBe('Foo');
    expect(exported.title).toBeUndefined();
    expect(exported.description).toBe('This is the base resource type for everything.');
    expect(exported.url).toBe('http://example.com/StructureDefinition/Foo');
    expect(exported.type).toBe('Resource');
  });

  it('should throw ParentNotDefinedError when parent resource is not found', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Bar';
    doc.profiles.set(profile.name, profile);
    expect(() => {
      exporter.exportStructDef(profile, input);
    }).toThrow('Parent Bar not found for Foo');
  });

  // Extension
  it('should set all metadata for an extension', () => {
    const extension = new Extension('Foo');
    extension.id = 'foo';
    extension.title = 'Foo Profile';
    extension.description = 'foo bar foobar';
    doc.extensions.set(extension.name, extension);
    const exported = exporter.exportStructDef(extension, input);
    expect(exported.name).toBe('Foo');
    expect(exported.id).toBe('foo');
    expect(exported.title).toBe('Foo Profile');
    expect(exported.description).toBe('foo bar foobar');
    expect(exported.url).toBe('http://example.com/StructureDefinition/foo');
    expect(exported.type).toBe('Extension');
  });

  it('should not overwrite metadata that is not given for an extension', () => {
    const extension = new Extension('Foo');
    doc.extensions.set(extension.name, extension);
    const exported = exporter.exportStructDef(extension, input);
    expect(exported.name).toBe('Foo');
    expect(exported.id).toBe('Foo');
    expect(exported.title).toBeUndefined();
    expect(exported.description).toBe(
      'Base StructureDefinition for Extension Type: Optional Extension Element - found in all resources.'
    );
    expect(exported.url).toBe('http://example.com/StructureDefinition/Foo');
    expect(exported.type).toBe('Extension');
  });

  it('should throw ParentNotDefinedError when parent extension is not found', () => {
    const extension = new Extension('Foo');
    extension.parent = 'Bar';
    doc.extensions.set(extension.name, extension);
    expect(() => {
      exporter.exportStructDef(extension, input);
    }).toThrow('Parent Bar not found for Foo');
  });

  // Rules
  it('should emit an error and continue when the path is not found', () => {
    // TODO: This should check for emitting an error once we have logging
    const profile = new Profile('Foo');
    const rule = new CardRule('fakePath');
    rule.min = 0;
    rule.max = '1';
    profile.rules.push(rule);
    const structDef = exporter.exportStructDef(profile, input);
    expect(structDef).toBeDefined();
    expect(structDef.type).toBe('Resource');
  });

  // Card Rule
  it('should apply a correct card rule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('subject');
    rule.min = 1;
    rule.max = '1';
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseCard = baseStructDef.findElement('Observation.subject');
    const changedCard = sd.findElement('Observation.subject');

    expect(baseCard.min).toBe(0);
    expect(baseCard.max).toBe('1');
    expect(changedCard.min).toBe(1);
    expect(changedCard.max).toBe('1');
  });

  it('should not apply an incorrect card rule', () => {
    // TODO: this should check for emitting an error once logging is setup
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('status');
    rule.min = 0;
    rule.max = '1';
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseCard = baseStructDef.findElement('Observation.status');
    const changedCard = sd.findElement('Observation.status');

    expect(baseCard.min).toBe(1);
    expect(baseCard.max).toBe('1');
    expect(changedCard.min).toBe(1);
    expect(changedCard.max).toBe('1');
  });

  // Value Set Rule
  it('should apply a correct value set rule to an unbound string', () => {
    const profile = new Profile('Junk');
    profile.parent = 'Appointment';

    const vsRule = new ValueSetRule('description');
    vsRule.valueSet = 'SomeVS';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();
    const baseElement = baseStructDef.findElement('Appointment.description');
    const changedElement = sd.findElement('Appointment.description');
    expect(baseElement.binding).toBeUndefined();
    expect(changedElement.binding.valueSet).toBe('SomeVS');
    expect(changedElement.binding.strength).toBe('extensible');
  });

  it('should apply a correct value set rule that overrides a previous binding', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const vsRule = new ValueSetRule('category');
    vsRule.valueSet = 'SomeVS';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();
    const baseElement = baseStructDef.findElement('Observation.category');
    const changedElement = sd.findElement('Observation.category');
    expect(baseElement.binding.valueSet).toBe('http://hl7.org/fhir/ValueSet/observation-category');
    expect(baseElement.binding.strength).toBe('preferred');
    expect(changedElement.binding.valueSet).toBe('SomeVS');
    expect(changedElement.binding.strength).toBe('extensible');
  });
});
