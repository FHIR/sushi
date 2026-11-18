import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import {
  getTestFHIRDefinitions,
  importSingleText,
  loggerSpy,
  testDefsPath,
  TestFisher
} from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';

describe('Extension slices copied into new slices', () => {
  let defs: FHIRDefinitions;

  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
  });

  function exportText(fsh: string) {
    loggerSpy.reset();
    const doc = importSingleText(fsh);
    const tank = new FSHTank([doc], minimalConfig);
    const pkg = new Package(tank.config);
    const fisher = new TestFisher(tank, defs, pkg);
    const profiles = new StructureDefinitionExporter(tank, pkg, fisher).export().profiles;
    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    return profiles;
  }

  function exportProfiles(additionalRules: string, baseRules = '') {
    return exportText(`
Extension: LinkKind
* value[x] only CodeableConcept

Profile: BasePatient
Parent: Patient
* link.extension contains LinkKind named kind 0..1
* link ^slicing.discriminator.type = #value
* link ^slicing.discriminator.path = "type"
* link ^slicing.rules = #open
* link contains replacedBy 0..*
* link[replacedBy].type = #replaced-by
${baseRules}

Profile: DerivedPatient
Parent: BasePatient
${additionalRules}
`);
  }

  it.each([
    ['new slice', 'seeAlso', '* link contains seeAlso 0..*\n* link[seeAlso].type = #seealso'],
    ['reslice', 'replacedBy/current', '* link[replacedBy] contains current 0..*']
  ])('declares the extension profile in a %s', (_label, slice, rules) => {
    const profiles = exportProfiles(`${rules}
* link[${slice.replace('/', '][')}].extension[kind] 1..1
* link[${slice.replace('/', '][')}].extension[kind].valueCodeableConcept.coding.code = #current`);
    const derived = profiles.find(p => p.name === 'DerivedPatient').toJSON();
    const extension = derived.differential.element.find(
      (e: { id: string }) => e.id === `Patient.link:${slice}.extension:kind`
    );
    expect(extension).toMatchObject({
      min: 1,
      type: [
        {
          code: 'Extension',
          profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/LinkKind']
        }
      ]
    });
    expect(
      derived.differential.element.some(
        (e: { id: string }) => e.id === `Patient.link:${slice}.extension:kind.value[x].coding.code`
      )
    ).toBe(true);
  });

  it('declares the profile when only a descendant of the copied extension is constrained', () => {
    const profiles = exportProfiles(`
* link contains seeAlso 0..*
* link[seeAlso].type = #seealso
* link[seeAlso].extension[kind].valueCodeableConcept.coding.code = #current`);
    const derived = profiles.find(p => p.name === 'DerivedPatient').toJSON();
    expect(
      derived.differential.element.find(
        (e: { id: string }) => e.id === 'Patient.link:seeAlso.extension:kind'
      ).type
    ).toEqual([
      {
        code: 'Extension',
        profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/LinkKind']
      }
    ]);
  });

  it('declares the profile when the copied extension was introduced with the slicing entry type', () => {
    const profiles = exportText(`
Extension: LinkKind
* value[x] only CodeableConcept

Profile: TestPatient
Parent: Patient
* link.extension only LinkKind
* link.extension contains LinkKind named kind 0..1
* link.extension[kind] only LinkKind
* link ^slicing.discriminator.type = #value
* link ^slicing.discriminator.path = "type"
* link ^slicing.rules = #open
* link contains seeAlso 0..*
* link[seeAlso].type = #seealso
* link[seeAlso].extension[kind] 1..1
`);
    const profile = profiles.find(p => p.name === 'TestPatient').toJSON();
    expect(
      profile.differential.element.find(
        (e: { id: string }) => e.id === 'Patient.link:seeAlso.extension:kind'
      )
    ).toEqual({
      id: 'Patient.link:seeAlso.extension:kind',
      path: 'Patient.link.extension',
      sliceName: 'kind',
      min: 1,
      max: '1',
      type: [
        {
          code: 'Extension',
          profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/LinkKind']
        }
      ]
    });
  });

  it('omits copied extension slices when only an unrelated child is constrained', () => {
    const profiles = exportProfiles(`
* link contains seeAlso 0..*
* link[seeAlso].type = #seealso`);
    const derived = profiles.find(p => p.name === 'DerivedPatient').toJSON();
    expect(
      derived.differential.element.find(
        (e: { id: string }) => e.id === 'Patient.link:seeAlso.extension:kind'
      )
    ).toBeUndefined();
  });

  it('declares the profile when a connected extension is copied into an already unfolded slice', () => {
    const profiles = exportProfiles(
      '* link[replacedBy].extension[laterKind] 1..1',
      '* link.extension contains LinkKind named laterKind 0..1'
    );
    const base = profiles.find(p => p.name === 'BasePatient').toJSON();
    expect(
      base.snapshot.element.find(
        (e: { id: string }) => e.id === 'Patient.link:replacedBy.extension:laterKind'
      )
    ).toBeUndefined();

    const derived = profiles.find(p => p.name === 'DerivedPatient').toJSON();
    expect(
      derived.differential.element.find(
        (e: { id: string }) => e.id === 'Patient.link:replacedBy.extension:laterKind'
      )
    ).toEqual({
      id: 'Patient.link:replacedBy.extension:laterKind',
      path: 'Patient.link.extension',
      sliceName: 'laterKind',
      min: 1,
      type: [
        {
          code: 'Extension',
          profile: ['http://hl7.org/fhir/us/minimal/StructureDefinition/LinkKind']
        }
      ]
    });
  });

  it.each([
    ['slice', 'replacedBy', ''],
    [
      'reslice',
      'replacedBy/current',
      '* link[replacedBy] contains current 0..*\n* link[replacedBy][current].extension[kind] MS'
    ]
  ])('keeps changes inside an existing inherited %s differential-only', (_label, slice, rules) => {
    const profiles = exportProfiles(
      `* link[${slice.replace('/', '][')}].extension[kind] 1..1`,
      rules
    );
    const derived = profiles.find(p => p.name === 'DerivedPatient').toJSON();
    const extension = derived.differential.element.find(
      (e: { id: string }) => e.id === `Patient.link:${slice}.extension:kind`
    );
    expect(extension).toEqual({
      id: `Patient.link:${slice}.extension:kind`,
      path: 'Patient.link.extension',
      sliceName: 'kind',
      min: 1
    });
  });
});
