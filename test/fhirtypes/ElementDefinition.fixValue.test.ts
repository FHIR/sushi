import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshCode } from '../../src/fshtypes/FshCode';
import { TestFisher } from '../testhelpers';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let medicationRequest: StructureDefinition;
  let medication: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    medicationRequest = fisher.fishForStructureDefinition('MedicationRequest');
    medication = fisher.fishForStructureDefinition('Medication');
  });

  describe('#fixValue', () => {
    // NOTE: Most fixValue tests are in separate type-specific files.  We only test outliers here.
    it('should throw MismatchedTypeException when attempting to fix a value with an unsupported type', () => {
      const authoredOn = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.authoredOn'
      );
      expect(() => {
        // @ts-ignore: Argument of type 'Date' is not assignable to parameter of type 'FixedValueType'
        authoredOn.fixValue(new Date()); // Date is not a supported type -- only strings are allowed
      }).toThrow(/Cannot fix Date value.*Value does not match element type: dateTime/);
    });

    it('should throw ValueAlreadyFixedError when fixing a value fixed via parent pattern', () => {
      const medicationForm = medication.elements.find(e => e.id === 'Medication.form');
      medicationForm.fixValue(new FshCode('foo', 'http://thankYouForSettingMe.com'));
      const medicationFormCodingSystem = medication.findElementByPath('form.coding.system', fisher);
      expect(() => {
        medicationFormCodingSystem.fixValue('http://ohManIWillNeverGetSet.sad');
      }).toThrow(
        'Cannot fix http://ohManIWillNeverGetSet.sad to this element; a different uri is already fixed: http://thankYouForSettingMe.com'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing a value fixed via parent pattern to a conflicting array', () => {
      const medicationForm = medication.elements.find(e => e.id === 'Medication.form');
      medicationForm.patternCodeableConcept = { coding: [{ system: 'foo' }, { system: 'bar' }] };
      const medicationFormCodingSystem = medication.findElementByPath('form.coding.system', fisher);
      expect(() => {
        medicationFormCodingSystem.fixValue('baz');
      }).toThrow('Cannot fix baz to this element; a different uri is already fixed: foo,bar');
    });

    it('should throw InvalidUnitsError when using the units keyword on a non-Quantity', () => {
      const code = medication.elements.find(e => e.id === 'Medication.code');
      expect(() => {
        code.fixValue(new FshCode('mycode', 'https://code.com'), true);
      }).toThrow(/units.*Medication.code/);
      // Units error should not stop value from still being fixed
      expect(code.patternCodeableConcept).toEqual({
        coding: [{ code: 'mycode', system: 'https://code.com' }]
      });
    });
  });

  describe('#fixedByDirectParent', () => {
    it('should find a pattern value from the parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo'));
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.fixedByDirectParent();
      expect(patternValue).toEqual([{ code: 'foo' }]);
    });

    it('should not find a pattern value from the parent when none is present', () => {
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.fixedByDirectParent();
      expect(patternValue).toBeUndefined();
    });

    it('should return undefined when being run on the root element', () => {
      const root = medicationRequest.elements.find(e => e.id === 'MedicationRequest');
      const patternValue = root.fixedByDirectParent();
      expect(patternValue).toBeUndefined();
    });
  });

  describe('#fixedByAnyParent', () => {
    it('should find a pattern value from a direct parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo'));
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.fixedByAnyParent();
      expect(patternValue).toEqual([{ code: 'foo' }]);
    });

    it('should find a pattern value from a grandparent when it exists', () => {
      const identifier = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.identifier'
      );
      identifier.max = '1';
      // @ts-ignore
      identifier.patternIdentifier = { period: { start: '2011-11-11' } };
      const identifierPeriodStart = medicationRequest.findElementByPath(
        'identifier.period.start',
        fisher
      );
      const patternValue = identifierPeriodStart.fixedByAnyParent();
      expect(patternValue).toBe('2011-11-11');
    });

    it('should find an array pattern value from a grandparent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo', 'http://bar.com'));
      const statusReasonCodingSystem = medicationRequest.findElementByPath(
        'statusReason.coding.system',
        fisher
      );
      // Single element in array
      let patternValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(patternValue).toBe('http://bar.com');

      // Multiple not matching array elements
      statusReason.patternCodeableConcept = {
        coding: [{ system: 'http://foo.com' }, { system: 'http://bar.com' }]
      };
      patternValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(patternValue).toEqual(['http://foo.com', 'http://bar.com']);

      // Multiple matching array elements
      statusReason.patternCodeableConcept = {
        coding: [{ system: 'http://foo.com' }, { system: 'http://foo.com' }]
      };
      patternValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(patternValue).toBe('http://foo.com');
    });

    it('should not find a pattern value from the parent when none is present', () => {
      const statusReasonCoding = medicationRequest.findElementByPath(
        'statusReason.coding.version',
        fisher
      );
      const patternValue = statusReasonCoding.fixedByAnyParent();
      expect(patternValue).toBeUndefined();
    });

    it('should return undefined when being run on the root element', () => {
      const root = medicationRequest.elements.find(e => e.id === 'MedicationRequest');
      const patternValue = root.fixedByAnyParent();
      expect(patternValue).toBeUndefined();
    });
  });
});
