import { StructureDefinitionExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, load } from '../../src/fhirdefs';
import { Profile, Extension, FshCode } from '../../src/fshtypes';
import {
  CardRule,
  FlagRule,
  OnlyRule,
  ValueSetRule,
  FixedValueRule
} from '../../src/fshtypes/rules';

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

  // Flag Rule
  it('should apply a valid flag rule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'DiagnosticReport';

    const rule = new FlagRule('conclusion');
    rule.modifier = false;
    rule.mustSupport = true;
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseElement = baseStructDef.findElement('DiagnosticReport.conclusion');
    const changedElement = sd.findElement('DiagnosticReport.conclusion');
    expect(baseElement.isModifier).toBeFalsy();
    expect(baseElement.mustSupport).toBeFalsy();
    expect(baseElement.isSummary).toBeFalsy();
    expect(changedElement.isModifier).toBe(false);
    expect(changedElement.mustSupport).toBe(true);
    expect(baseElement.isSummary).toBeFalsy();
  });

  it('should not apply a flag rule that disables isModifier', () => {
    const profile = new Profile('Foo');
    profile.parent = 'DiagnosticReport';

    const rule = new FlagRule('status');
    rule.modifier = false;
    rule.mustSupport = true;
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseElement = baseStructDef.findElement('DiagnosticReport.status');
    const changedElement = sd.findElement('DiagnosticReport.status');
    expect(baseElement.isModifier).toBe(true);
    expect(baseElement.mustSupport).toBeFalsy();
    expect(changedElement.isModifier).toBe(true);
    expect(changedElement.mustSupport).toBeFalsy();
  });

  it('should not apply a flag rule that disables mustSupport', () => {
    const profile = new Profile('Foo');
    profile.parent = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';

    const rule = new FlagRule('code');
    rule.modifier = true;
    rule.summary = false;
    rule.mustSupport = false;
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseElement = baseStructDef.findElement('Observation.code');
    const changedElement = sd.findElement('Observation.code');
    expect(baseElement.isModifier).toBeFalsy();
    expect(baseElement.isSummary).toBe(true);
    expect(baseElement.mustSupport).toBe(true);
    expect(changedElement.isModifier).toBeFalsy();
    expect(changedElement.isSummary).toBe(true);
    expect(changedElement.mustSupport).toBe(true);
  });

  // Value Set Rule
  it('should apply a correct value set rule to an unbound string', () => {
    const profile = new Profile('Junk');
    profile.parent = 'Appointment';

    const vsRule = new ValueSetRule('description');
    vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();
    const baseElement = baseStructDef.findElement('Appointment.description');
    const changedElement = sd.findElement('Appointment.description');
    expect(baseElement.binding).toBeUndefined();
    expect(changedElement.binding.valueSet).toBe('http://example.org/fhir/ValueSet/some-valueset');
    expect(changedElement.binding.strength).toBe('extensible');
  });

  it('should apply a correct value set rule that overrides a previous binding', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const vsRule = new ValueSetRule('category');
    vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();
    const baseElement = baseStructDef.findElement('Observation.category');
    const changedElement = sd.findElement('Observation.category');
    expect(baseElement.binding.valueSet).toBe('http://hl7.org/fhir/ValueSet/observation-category');
    expect(baseElement.binding.strength).toBe('preferred');
    expect(changedElement.binding.valueSet).toBe('http://example.org/fhir/ValueSet/some-valueset');
    expect(changedElement.binding.strength).toBe('extensible');
  });

  it('should not apply a value set rule on an element that cannot support it', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const vsRule = new ValueSetRule('note');
    vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
    vsRule.strength = 'extensible';
    profile.rules.push(vsRule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();
    const baseElement = baseStructDef.findElement('Observation.note');
    const changedElement = sd.findElement('Observation.note');
    expect(baseElement.binding).toBeUndefined();
    expect(changedElement.binding).toBeUndefined();
  });

  it('should not override a binding with a less strict binding', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const vsRule = new ValueSetRule('category');
    vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
    vsRule.strength = 'example';
    profile.rules.push(vsRule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();
    const baseElement = baseStructDef.findElement('Observation.category');
    const changedElement = sd.findElement('Observation.category');
    expect(baseElement.binding.valueSet).toBe('http://hl7.org/fhir/ValueSet/observation-category');
    expect(baseElement.binding.strength).toBe('preferred');
    expect(changedElement.binding.valueSet).toBe(
      'http://hl7.org/fhir/ValueSet/observation-category'
    );
    expect(changedElement.binding.strength).toBe('preferred');
  });

  // Only Rule
  it('should apply a correct OnlyRule on a non-reference choice', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new OnlyRule('value[x]');
    rule.types = [{ type: 'string' }];
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseValue = baseStructDef.findElement('Observation.value[x]');
    const constrainedValue = sd.findElement('Observation.value[x]');

    expect(baseValue.type).toHaveLength(11);
    expect(baseValue.type[0]).toEqual({ code: 'Quantity' });
    expect(baseValue.type[1]).toEqual({ code: 'CodeableConcept' });
    expect(baseValue.type[2]).toEqual({ code: 'string' });

    expect(constrainedValue.type).toHaveLength(1);
    expect(constrainedValue.type[0]).toEqual({ code: 'string' });
  });

  it('should apply a correct OnlyRule on a reference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new OnlyRule('subject');
    rule.types = [{ type: 'Device', isReference: true }];
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseSubject = baseStructDef.findElement('Observation.subject');
    const constrainedSubject = sd.findElement('Observation.subject');

    expect(baseSubject.type).toHaveLength(1);
    expect(baseSubject.type).toEqual([
      {
        code: 'Reference',
        targetProfile: [
          'http://hl7.org/fhir/StructureDefinition/Patient',
          'http://hl7.org/fhir/StructureDefinition/Group',
          'http://hl7.org/fhir/StructureDefinition/Device',
          'http://hl7.org/fhir/StructureDefinition/Location'
        ]
      }
    ]);

    expect(constrainedSubject.type).toHaveLength(1);
    expect(constrainedSubject.type).toEqual([
      {
        code: 'Reference',
        targetProfile: ['http://hl7.org/fhir/StructureDefinition/Device']
      }
    ]);
  });

  it('should apply a correct OnlyRule with a specific target constrained', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new OnlyRule('hasMember[Observation]');
    rule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/bodyheight', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/bodyweight', isReference: true }
    ];
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseHasMember = baseStructDef.findElement('Observation.hasMember');
    const constrainedHasMember = sd.findElement('Observation.hasMember');

    expect(baseHasMember.type).toHaveLength(1);
    expect(baseHasMember.type).toEqual([
      {
        code: 'Reference',
        targetProfile: [
          'http://hl7.org/fhir/StructureDefinition/Observation',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        ]
      }
    ]);

    expect(constrainedHasMember.type).toHaveLength(1);
    expect(constrainedHasMember.type).toEqual([
      {
        code: 'Reference',
        targetProfile: [
          'http://hl7.org/fhir/StructureDefinition/bodyheight',
          'http://hl7.org/fhir/StructureDefinition/bodyweight',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        ]
      }
    ]);
  });

  it('should not apply an incorrect OnlyRule', () => {
    // TODO: this should check for emitting an error once logging is set up
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new OnlyRule('value[x]');
    rule.types = [{ type: 'instant' }];
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseValue = baseStructDef.findElement('Observation.value[x]');
    const constrainedValue = sd.findElement('Observation.value[x]');

    expect(baseValue.type).toHaveLength(11);
    expect(constrainedValue.type).toHaveLength(11);
  });

  // FixValue rule
  it('should apply a correct FixValueRule', () => {
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new FixedValueRule('code');
    const fixedFshCode = new FshCode('foo', 'http://foo.com');
    rule.fixedValue = fixedFshCode;
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseCode = baseStructDef.findElement('Observation.code');
    const fixedCode = sd.findElement('Observation.code');

    expect(baseCode.patternCodeableConcept).toBeUndefined();
    expect(fixedCode.patternCodeableConcept).toEqual({
      coding: [{ code: 'foo', system: 'http://foo.com' }]
    });
  });

  it('should not apply an incorrect FixValueRule', () => {
    // TODO: this should check for emitting an error once logging is set up
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new FixedValueRule('code');
    rule.fixedValue = true; // Incorrect boolean
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const baseStructDef = sd.getBaseStructureDefinition();

    const baseCode = baseStructDef.findElement('Observation.code');
    const fixedCode = sd.findElement('Observation.code');

    expect(baseCode.patternCodeableConcept).toBeUndefined();
    expect(fixedCode.patternCodeableConcept).toBeUndefined(); // Code remains unset
  });

  // toJSON
  it('should correctly generate a diff containing only changed elements', () => {
    // We already have separate tests for the differentials, so this just ensures that the
    // StructureDefinition is setup correctly to produce accurate differential elements.
    const profile = new Profile('Foo');
    profile.parent = 'Observation';

    const rule = new CardRule('subject');
    rule.min = 1;
    rule.max = '1';
    profile.rules.push(rule);

    const sd = exporter.exportStructDef(profile, input);
    const json = sd.toJSON();

    expect(json.differential.element).toHaveLength(1);
    expect(json.differential.element[0]).toEqual({
      id: 'Observation.subject',
      path: 'Observation.subject',
      min: 1
    });
  });
});
