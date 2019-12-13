import cloneDeep from 'lodash/cloneDeep';
import { getResolver } from '../testhelpers/getResolver';
import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { ElementDefinitionType } from '../../src/fhirtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
  });

  describe('#constrainType()', () => {
    it('should allow a choice to be constrained to a subset', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.constrainType([{ type: 'Quantity' }, { type: 'integer' }], getResolver(defs));
      expect(valueX.type).toHaveLength(2);
      expect(valueX.type[0]).toEqual(new ElementDefinitionType('Quantity'));
      expect(valueX.type[1]).toEqual(new ElementDefinitionType('integer'));
    });

    it('should maintain original type order when constraining to a subset', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.constrainType(
        [{ type: 'Period' }, { type: 'integer' }, { type: 'Quantity' }, { type: 'Ratio' }],
        getResolver(defs)
      );
      expect(valueX.type).toHaveLength(4);
      expect(valueX.type[0]).toEqual(new ElementDefinitionType('Quantity'));
      expect(valueX.type[1]).toEqual(new ElementDefinitionType('integer'));
      expect(valueX.type[2]).toEqual(new ElementDefinitionType('Ratio'));
      expect(valueX.type[3]).toEqual(new ElementDefinitionType('Period'));
    });

    it('should allow a choice to be constrained to a single item', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.constrainType([{ type: 'Quantity' }], getResolver(defs));
      expect(valueX.type).toHaveLength(1);
      expect(valueX.type[0]).toEqual(new ElementDefinitionType('Quantity'));
    });

    it('should allow a choice to be constrained to a single item by its URL', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.constrainType(
        [{ type: 'http://hl7.org/fhir/StructureDefinition/Quantity' }],
        getResolver(defs)
      );
      expect(valueX.type).toHaveLength(1);
      expect(valueX.type[0]).toEqual(new ElementDefinitionType('Quantity'));
    });

    it('should allow a choice to be constrained to a single profile', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.constrainType([{ type: 'SimpleQuantity' }], getResolver(defs));
      expect(valueX.type).toHaveLength(1);
      expect(valueX.type[0]).toEqual(
        new ElementDefinitionType('Quantity').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/SimpleQuantity'
        )
      );
    });

    it('should allow a resource type to be constrained to multiple profiles', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.constrainType(
        [{ type: 'SimpleQuantity' }, { type: 'MoneyQuantity' }],
        getResolver(defs)
      );
      expect(valueX.type).toHaveLength(1);
      expect(valueX.type[0]).toEqual(
        new ElementDefinitionType('Quantity').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/SimpleQuantity',
          'http://hl7.org/fhir/StructureDefinition/MoneyQuantity'
        )
      );
    });

    it.skip('should allow a profile to be constrained to a more specific profile', () => {
      // Cannot find any examples to use for testing.  Will revisit when we can reference FSH profiles
    });

    it('should allow Resource to be constrained to a resource', () => {
      const jsonBundle = defs.find('Bundle');
      const bundle = StructureDefinition.fromJSON(jsonBundle);
      const entryResource = bundle.elements.find(e => e.id === 'Bundle.entry.resource');
      entryResource.constrainType([{ type: 'Patient' }], getResolver(defs));
      expect(entryResource.type).toHaveLength(1);
      expect(entryResource.type[0]).toEqual(new ElementDefinitionType('Patient'));
    });

    it('should allow Resource to be constrained to a profile', () => {
      const jsonBundle = defs.find('Bundle');
      const bundle = StructureDefinition.fromJSON(jsonBundle);
      const entryResource = bundle.elements.find(e => e.id === 'Bundle.entry.resource');
      entryResource.constrainType(
        [{ type: 'http://hl7.org/fhir/StructureDefinition/bp' }],
        getResolver(defs)
      );
      expect(entryResource.type).toHaveLength(1);
      expect(entryResource.type[0]).toEqual(
        new ElementDefinitionType('Observation').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/bp'
        )
      );
    });

    it('should allow Resource to be constrained to multiple resources and profiles', () => {
      const jsonBundle = defs.find('Bundle');
      const bundle = StructureDefinition.fromJSON(jsonBundle);
      const entryResource = bundle.elements.find(e => e.id === 'Bundle.entry.resource');
      entryResource.constrainType(
        [
          { type: 'Practitioner' },
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyheight' },
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyweight' },
          { type: 'http://hl7.org/fhir/StructureDefinition/familymemberhistory-genetic' },
          { type: 'http://hl7.org/fhir/StructureDefinition/Procedure' }
        ],
        getResolver(defs)
      );
      expect(entryResource.type).toHaveLength(4);
      expect(entryResource.type[0]).toEqual(new ElementDefinitionType('Practitioner'));
      expect(entryResource.type[1]).toEqual(
        new ElementDefinitionType('Observation').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/bodyheight',
          'http://hl7.org/fhir/StructureDefinition/bodyweight'
        )
      );
      expect(entryResource.type[2]).toEqual(
        new ElementDefinitionType('FamilyMemberHistory').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/familymemberhistory-genetic'
        )
      );
      expect(entryResource.type[3]).toEqual(new ElementDefinitionType('Procedure'));
    });

    it('should allow a choice to be constrained such that only the target type is constrained to a profile and others remain as-is', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.constrainType([{ type: 'SimpleQuantity' }], getResolver(defs), 'Quantity');
      expect(valueX.type).toHaveLength(11);
      expect(valueX.type[0]).toEqual(
        new ElementDefinitionType('Quantity').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/SimpleQuantity'
        )
      );
    });

    it.skip('should allow a choice with profiles to be constrained such that only the target profile is constrained and others remain as-is', () => {
      // Cannot find any examples to use for testing.  Will revisit when we can reference FSH profiles
    });

    it('should allow Resource to be constrained to multiple resources and profiles when it is specifically targeted', () => {
      const jsonBundle = defs.find('Bundle');
      const bundle = StructureDefinition.fromJSON(jsonBundle);
      const entryResource = bundle.elements.find(e => e.id === 'Bundle.entry.resource');
      entryResource.constrainType(
        [
          { type: 'Practitioner' },
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyheight' },
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyweight' },
          { type: 'http://hl7.org/fhir/StructureDefinition/familymemberhistory-genetic' },
          { type: 'http://hl7.org/fhir/StructureDefinition/Procedure' }
        ],
        getResolver(defs),
        'Resource'
      );
      expect(entryResource.type).toHaveLength(4);
      expect(entryResource.type[0]).toEqual(new ElementDefinitionType('Practitioner'));
      expect(entryResource.type[1]).toEqual(
        new ElementDefinitionType('Observation').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/bodyheight',
          'http://hl7.org/fhir/StructureDefinition/bodyweight'
        )
      );
      expect(entryResource.type[2]).toEqual(
        new ElementDefinitionType('FamilyMemberHistory').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/familymemberhistory-genetic'
        )
      );
      expect(entryResource.type[3]).toEqual(new ElementDefinitionType('Procedure'));
    });

    it('should allow a reference to multiple resource types to be constrained to a reference to a subset', () => {
      const performer = observation.elements.find(e => e.id === 'Observation.performer');
      performer.constrainType(
        [
          { type: 'Practitioner', isReference: true },
          { type: 'Organization', isReference: true }
        ],
        getResolver(defs)
      );
      expect(performer.type).toHaveLength(1);
      expect(performer.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Practitioner',
          'http://hl7.org/fhir/StructureDefinition/Organization'
        )
      );
    });

    it('should allow a reference to multiple resource types to be constrained to a reference to a single type', () => {
      const performer = observation.elements.find(e => e.id === 'Observation.performer');
      performer.constrainType([{ type: 'Organization', isReference: true }], getResolver(defs));
      expect(performer.type).toHaveLength(1);
      expect(performer.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Organization'
        )
      );
    });

    it('should allow a resource type in a reference to multiple types to be constrained to a single profile', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.constrainType(
        [{ type: 'http://hl7.org/fhir/StructureDefinition/actualgroup', isReference: true }],
        getResolver(defs)
      );
      expect(subject.type).toHaveLength(1);
      expect(subject.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/actualgroup'
        )
      );
    });

    it('should allow a resource type in a reference to multiple types to be constrained to multiple profiles', () => {
      const hasMember = observation.elements.find(e => e.id === 'Observation.hasMember');
      hasMember.constrainType(
        [
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyheight', isReference: true },
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyweight', isReference: true }
        ],
        getResolver(defs)
      );
      expect(hasMember.type).toHaveLength(1);
      expect(hasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/bodyheight',
          'http://hl7.org/fhir/StructureDefinition/bodyweight'
        )
      );
    });

    it('should allow a resource type in a reference to multiple types to be constrained to a resource and a single profile', () => {
      const subject = observation.elements.find(e => e.id === 'Observation.subject');
      subject.constrainType(
        [
          { type: 'Patient', isReference: true },
          { type: 'http://hl7.org/fhir/StructureDefinition/actualgroup', isReference: true }
        ],
        getResolver(defs)
      );
      expect(subject.type).toHaveLength(1);
      expect(subject.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Patient',
          'http://hl7.org/fhir/StructureDefinition/actualgroup'
        )
      );
    });

    it('should allow a reference to a profile to be constrained to a reference to more specific profiles', () => {
      const jsonVitalSigns = defs.find('http://hl7.org/fhir/StructureDefinition/vitalsigns');
      const vitalSigns = StructureDefinition.fromJSON(jsonVitalSigns);
      const hasMember = vitalSigns.elements.find(e => e.id === 'Observation.hasMember');
      hasMember.constrainType(
        [
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyheight', isReference: true },
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyweight', isReference: true }
        ],
        getResolver(defs)
      );
      expect(hasMember.type).toHaveLength(1);
      expect(hasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/bodyheight',
          'http://hl7.org/fhir/StructureDefinition/bodyweight'
        )
      );
    });

    it('should allow a reference to Any to be constrained to a reference to a resource', () => {
      const focus = observation.elements.find(e => e.id === 'Observation.focus');
      focus.constrainType([{ type: 'Practitioner', isReference: true }], getResolver(defs));
      expect(focus.type).toHaveLength(1);
      expect(focus.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Practitioner'
        )
      );
    });

    it('should allow a reference to Any to be constrained to a reference to a profile', () => {
      const focus = observation.elements.find(e => e.id === 'Observation.focus');
      focus.constrainType(
        [{ type: 'http://hl7.org/fhir/StructureDefinition/bp', isReference: true }],
        getResolver(defs)
      );
      expect(focus.type).toHaveLength(1);
      expect(focus.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/bp'
        )
      );
    });

    it('should allow a reference to Any to be constrained to multiple references', () => {
      const focus = observation.elements.find(e => e.id === 'Observation.focus');
      focus.constrainType(
        [
          { type: 'Practitioner', isReference: true },
          { type: 'http://hl7.org/fhir/StructureDefinition/bp', isReference: true }
        ],
        getResolver(defs)
      );
      expect(focus.type).toHaveLength(1);
      expect(focus.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Practitioner',
          'http://hl7.org/fhir/StructureDefinition/bp'
        )
      );
    });

    it('should allow a reference to multiple resource types to be constrained such that only the target reference is constrained and others remain as-is', () => {
      const hasMember = observation.elements.find(e => e.id === 'Observation.hasMember');
      hasMember.constrainType(
        [
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyheight', isReference: true },
          { type: 'http://hl7.org/fhir/StructureDefinition/bodyweight', isReference: true }
        ],
        getResolver(defs),
        'Observation'
      );
      expect(hasMember.type).toHaveLength(1);
      expect(hasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/bodyheight',
          'http://hl7.org/fhir/StructureDefinition/bodyweight',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );
    });

    it('should throw InvalidTypeError when a passed in type cannot constrain any existing types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      const clone = cloneDeep(valueX);
      expect(() => {
        clone.constrainType([{ type: 'decimal' }], getResolver(defs));
      }).toThrow(/"decimal" does not match .* Quantity or CodeableConcept or string/);
      expect(clone).toEqual(valueX);
    });

    it('should throw InvalidTypeError when a passed in reference to a type does cannot constrain any existing references to types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.performer');
      const clone = cloneDeep(valueX);
      expect(() => {
        clone.constrainType([{ type: 'Medication', isReference: true }], getResolver(defs));
      }).toThrow(
        /"Reference\(Medication\)" does not match .* Reference\(http:\/\/hl7.org\/fhir\/StructureDefinition\/Practitioner | http:\/\/hl7.org\/fhir\/StructureDefinition\/PractitionerRole .*\)/
      );
      expect(clone).toEqual(valueX);
    });

    it('should throw InvalidTypeError when attempting to constrain Resource to a reference', () => {
      const jsonBundle = defs.find('Bundle');
      const bundle = StructureDefinition.fromJSON(jsonBundle);
      const entryResource = bundle.elements.find(e => e.id === 'Bundle.entry.resource');
      const clone = cloneDeep(entryResource);
      expect(() => {
        clone.constrainType([{ type: 'Procedure', isReference: true }], getResolver(defs));
      }).toThrow(/"Reference\(Procedure\)" does not match .* Resource/);
      expect(clone).toEqual(entryResource);
    });

    it('should throw InvalidTypeError when the targetType does not match any existing types', () => {
      const hasMember = observation.elements.find(e => e.id === 'Observation.hasMember');
      const clone = cloneDeep(hasMember);
      expect(() => {
        clone.constrainType(
          [
            {
              type: 'http://hl7.org/fhir/StructureDefinition/familymemberhistory-genetic',
              isReference: true
            }
          ],
          getResolver(defs),
          'FamilyMemberHistory'
        );
      }).toThrow(
        /"FamilyMemberHistory" does not match .* Reference\(http:\/\/hl7.org\/fhir\/StructureDefinition\/Observation .*\)/
      );
      expect(clone).toEqual(hasMember);
    });

    it('should throw InvalidTypeError when the passed in type does not match the targetType', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      const clone = cloneDeep(valueX);
      expect(() => {
        clone.constrainType([{ type: 'SimpleQuantity' }], getResolver(defs), 'CodeableConcept');
      }).toThrow(/"SimpleQuantity" does not match .* CodeableConcept/);
      expect(clone).toEqual(valueX);
    });

    it('should throw InvalidTypeError when the passed in reference type does not match the targetType', () => {
      const hasMember = observation.elements.find(e => e.id === 'Observation.hasMember');
      const clone = cloneDeep(hasMember);
      expect(() => {
        clone.constrainType(
          [{ type: 'http://hl7.org/fhir/StructureDefinition/bodyheight', isReference: true }],
          getResolver(defs),
          'QuestionnaireResponse'
        );
      }).toThrow(
        /"Reference\(http:\/\/hl7.org\/fhir\/StructureDefinition\/bodyheight\)" does not match .* Reference\(http:\/\/hl7.org\/fhir\/StructureDefinition\/QuestionnaireResponse\)/
      );
      expect(clone).toEqual(hasMember);
    });

    it('should throw InvalidTypeError when attempting to constrain a reference when the target type is Resource', () => {
      const jsonBundle = defs.find('Bundle');
      const bundle = StructureDefinition.fromJSON(jsonBundle);
      const entryResource = bundle.elements.find(e => e.id === 'Bundle.entry.resource');
      const clone = cloneDeep(entryResource);
      expect(() => {
        clone.constrainType(
          [{ type: 'Procedure', isReference: true }],
          getResolver(defs),
          'Resource'
        );
      }).toThrow(/"Reference\(Procedure\)" does not match .* Resource/);
      expect(clone).toEqual(entryResource);
    });

    it('should throw TypeNotFoundError when a passed in type definition cannot be found', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      const clone = cloneDeep(valueX);
      expect(() => {
        clone.constrainType([{ type: 'Quantity' }, { type: 'Monocle' }], getResolver(defs));
      }).toThrow(/No definition for the type "Monocle" could be found./);
      expect(clone).toEqual(valueX);
    });

    it('should throw TypeNotFoundError when a passed in reference types definition cannot be found', () => {
      const performer = observation.elements.find(e => e.id === 'Observation.performer');
      const clone = cloneDeep(performer);
      expect(() => {
        clone.constrainType(
          [
            { type: 'Practitioner', isReference: true },
            { type: 'Juggler', isReference: true }
          ],
          getResolver(defs)
        );
      }).toThrow(/No definition for the type "Juggler" could be found./);
      expect(clone).toEqual(performer);
    });

    it('should throw TypeNotFoundError when the targetType definition cannot be found', () => {
      const hasMember = observation.elements.find(e => e.id === 'Observation.hasMember');
      const clone = cloneDeep(hasMember);
      expect(() => {
        clone.constrainType(
          [{ type: 'http://hl7.org/fhir/StructureDefinition/bodyheight', isReference: true }],
          getResolver(defs),
          'VitalBillboards'
        );
      }).toThrow(/No definition for the type "VitalBillboards" could be found./);
      expect(clone).toEqual(hasMember);
    });
  });
});
