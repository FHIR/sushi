import path from 'path';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshCode } from '../../src/fshtypes/FshCode';
import { TestFisher } from '../testhelpers';

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
      expect(() => {
        // @ts-ignore: Argument of type 'Date' is not assignable to parameter of type 'FixedValueType'
        authoredOn.fixValue(new Date(), true); // Date is not a supported type -- only strings are allowed
      }).toThrow(/Cannot fix Date value.*Value does not match element type: dateTime/);
    });

    it('should throw ValueAlreadyFixedError when fixing a value fixed via parent pattern', () => {
      const medicationForm = medication.elements.find(e => e.id === 'Medication.form');
      medicationForm.fixValue(new FshCode('foo', 'http://thankYouForSettingMe.com'));
      const medicationFormCodingSystem = medication.findElementByPath('form.coding.system', fisher);
      expect(() => {
        medicationFormCodingSystem.fixValue('http://ohManIWillNeverGetSet.sad');
      }).toThrow(
        'Cannot fix "http://ohManIWillNeverGetSet.sad" to this element; a different uri is already fixed: "http://thankYouForSettingMe.com".'
      );
      expect(() => {
        medicationFormCodingSystem.fixValue('http://ohManIWillNeverGetSet.sad', true);
      }).toThrow(
        'Cannot fix "http://ohManIWillNeverGetSet.sad" to this element; a different uri is already fixed: "http://thankYouForSettingMe.com".'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing a value fixed via parent pattern to a conflicting array', () => {
      const medicationForm = medication.elements.find(e => e.id === 'Medication.form');
      medicationForm.patternCodeableConcept = { coding: [{ system: 'foo' }, { system: 'bar' }] };
      const medicationFormCodingSystem = medication.findElementByPath('form.coding.system', fisher);
      expect(() => {
        medicationFormCodingSystem.fixValue('baz');
      }).toThrow(
        'Cannot fix "baz" to this element; a different uri is already fixed: ["foo","bar"].'
      );
      expect(() => {
        medicationFormCodingSystem.fixValue('baz', true);
      }).toThrow(
        'Cannot fix "baz" to this element; a different uri is already fixed: ["foo","bar"].'
      );
    });

    it('should throw InvalidUnitsError when using the units keyword on a non-Quantity', () => {
      const code = medication.elements.find(e => e.id === 'Medication.code');
      expect(() => {
        code.fixValue(new FshCode('mycode', 'https://code.com'), false, true);
      }).toThrow(/units.*Medication.code/);
      // Units error should not stop value from still being fixed
      expect(code.patternCodeableConcept).toEqual({
        coding: [{ code: 'mycode', system: 'https://code.com' }]
      });
    });

    it('should ensure that minimum cardinality is 1 when fixing a value mentioned in a parent slice discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'value', path: 'coding.code' }], rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCodingCode = medicationRequest.findElementByPath(
        'category[mouse].coding.code',
        fisher
      );
      expect(catMouseCodingCode.min).toBe(0);
      catMouseCodingCode.fixValue(new FshCode('cheese'));
      expect(catMouseCodingCode.patternCode).toBe('cheese');
      expect(catMouseCodingCode.min).toBe(1);
    });

    it('should ensure that minimum cardinality is 1 when fixing a value mentioned in a slice discriminator', () => {
      const inUri = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.instantiatesUri'
      );
      inUri.slicing = { discriminator: [{ type: 'value', path: '$this' }], rules: 'open' };
      inUri.addSlice('mouse');
      const inUriMouse = medicationRequest.findElementByPath('instantiatesUri[mouse]', fisher);
      expect(inUriMouse.min).toBe(0);
      inUriMouse.fixValue('http://mice.cheese');
      expect(inUriMouse.patternUri).toBe('http://mice.cheese');
      expect(inUriMouse.min).toBe(1);
    });

    it('should not ensure that minimum cardinality is 1 when fixing a value not mentioned in a slice discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'value', path: 'coding.code' }], rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCodingSystem = medicationRequest.findElementByPath(
        'category[mouse].coding.system',
        fisher
      );
      expect(catMouseCodingSystem.min).toBe(0);
      catMouseCodingSystem.fixValue('http://mice.cheese');
      expect(catMouseCodingSystem.patternUri).toBe('http://mice.cheese');
      expect(catMouseCodingSystem.min).toBe(0);
    });

    it('should not ensure that minimum cardinality is 1 when fixing a value mentioned in a non value/pattern discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'exists', path: 'coding.code' }], rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCodingCode = medicationRequest.findElementByPath(
        'category[mouse].coding.code',
        fisher
      );
      expect(catMouseCodingCode.min).toBe(0);
      catMouseCodingCode.fixValue(new FshCode('cheese'));
      expect(catMouseCodingCode.patternCode).toBe('cheese');
      expect(catMouseCodingCode.min).toBe(0);
    });

    it('should not ensure that minimum cardinality is 1 when fixing a value with min card > 1 mentioned in a parent slice discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'value', path: 'coding' }], rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCoding = medicationRequest.findElementByPath('category[mouse].coding', fisher);
      catMouseCoding.min = 2;
      expect(catMouseCoding.min).toBe(2);
      catMouseCoding.fixValue(new FshCode('cheese'));
      expect(catMouseCoding.patternCoding).toEqual({ code: 'cheese' });
      expect(catMouseCoding.min).toBe(2); // We do not try to decrease min to 1
    });
  });

  describe('#fixedByDirectParent', () => {
    it('should find a fixed[x] value from the parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo'), true);
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const fixedValue = statusReasonCoding.fixedByDirectParent();
      expect(fixedValue).toEqual([{ code: 'foo' }]);
    });

    it('should find a pattern[x] value from the parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo'));
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.fixedByDirectParent();
      expect(patternValue).toEqual([{ code: 'foo' }]);
    });

    it('should not find a fixed[x] or pattern[x] value from the parent when none is present', () => {
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
    it('should find a fixed[x] value from a direct parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo'), true);
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const fixedValue = statusReasonCoding.fixedByAnyParent();
      expect(fixedValue).toEqual([{ code: 'foo' }]);
    });

    it('should find a pattern[x] value from a direct parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo'));
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.fixedByAnyParent();
      expect(patternValue).toEqual([{ code: 'foo' }]);
    });

    it('should find a fixed[x] value from a grandparent when it exists', () => {
      const identifier = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.identifier'
      );
      identifier.max = '1';
      // @ts-ignore
      identifier.fixedIdentifier = { period: { start: '2011-11-11' } };
      const identifierPeriodStart = medicationRequest.findElementByPath(
        'identifier.period.start',
        fisher
      );
      const fixedValue = identifierPeriodStart.fixedByAnyParent();
      expect(fixedValue).toBe('2011-11-11');
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

    it('should find an array fixed[x] value from a grandparent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo', 'http://bar.com'), true);
      const statusReasonCodingSystem = medicationRequest.findElementByPath(
        'statusReason.coding.system',
        fisher
      );
      // Single element in array
      let fixedValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(fixedValue).toBe('http://bar.com');

      // Multiple not matching array elements
      statusReason.fixedCodeableConcept = {
        coding: [{ system: 'http://foo.com' }, { system: 'http://bar.com' }]
      };
      fixedValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(fixedValue).toEqual(['http://foo.com', 'http://bar.com']);

      // Multiple matching array elements
      statusReason.fixedCodeableConcept = {
        coding: [{ system: 'http://foo.com' }, { system: 'http://foo.com' }]
      };
      fixedValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(fixedValue).toBe('http://foo.com');
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

    it('should not find a fixed[x] or pattern[x] value from the parent when none is present', () => {
      const statusReasonCoding = medicationRequest.findElementByPath(
        'statusReason.coding.version',
        fisher
      );
      const value = statusReasonCoding.fixedByAnyParent();
      expect(value).toBeUndefined();
    });

    it('should return undefined when being run on the root element', () => {
      const root = medicationRequest.elements.find(e => e.id === 'MedicationRequest');
      const patternValue = root.fixedByAnyParent();
      expect(patternValue).toBeUndefined();
    });
  });
});
