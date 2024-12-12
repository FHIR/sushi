import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshCode } from '../../src/fshtypes/FshCode';
import { getTestFHIRDefinitions, testDefsPath, TestFisher } from '../testhelpers';
import { Package } from '../../src/export';
import { FshReference, Instance } from '../../src/fshtypes';
import { AssignmentRule } from '../../src/fshtypes/rules';
import { FSHDocument, FSHTank } from '../../src/import';
import { minimalConfig } from '../utils/minimalConfig';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let medicationRequest: StructureDefinition;
  let medication: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    medicationRequest = fisher.fishForStructureDefinition('MedicationRequest');
    medication = fisher.fishForStructureDefinition('Medication');
  });

  describe('#assignValue', () => {
    // NOTE: Most assignValue tests are in separate type-specific files.  We only test outliers here.
    it('should throw MismatchedTypeException when attempting to assign a value with an unsupported type', () => {
      const authoredOn = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.authoredOn'
      );
      expect(() => {
        // @ts-ignore: Argument of type 'Date' is not assignable to parameter of type 'AssignmentValueType'
        authoredOn.assignValue(new Date()); // Date is not a supported type -- only strings are allowed
      }).toThrow(/Cannot assign Date value.*Value does not match element type: dateTime/);
      expect(() => {
        // @ts-ignore: Argument of type 'Date' is not assignable to parameter of type 'AssignmentValueType'
        authoredOn.assignValue(new Date(), true); // Date is not a supported type -- only strings are allowed
      }).toThrow(/Cannot assign Date value.*Value does not match element type: dateTime/);
    });

    it('should throw ValueAlreadyAssignedError when assigning a value assigned via parent pattern', () => {
      const medicationForm = medication.elements.find(e => e.id === 'Medication.form');
      medicationForm.assignValue(new FshCode('foo', 'http://thankYouForSettingMe.com'));
      const medicationFormCodingSystem = medication.findElementByPath('form.coding.system', fisher);
      expect(() => {
        medicationFormCodingSystem.assignValue('http://ohManIWillNeverGetSet.sad');
      }).toThrow(
        'Cannot assign "http://ohManIWillNeverGetSet.sad" to this element; a different uri is already assigned: "http://thankYouForSettingMe.com".'
      );
      expect(() => {
        medicationFormCodingSystem.assignValue('http://ohManIWillNeverGetSet.sad', true);
      }).toThrow(
        'Cannot assign "http://ohManIWillNeverGetSet.sad" to this element; a different uri is already assigned: "http://thankYouForSettingMe.com".'
      );
    });

    it('should ensure that minimum cardinality is 1 when assigning a value mentioned in a parent slice discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'value', path: 'coding.code' }], rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCodingCode = medicationRequest.findElementByPath(
        'category[mouse].coding.code',
        fisher
      );
      expect(catMouseCodingCode.min).toBe(0);
      catMouseCodingCode.assignValue(new FshCode('cheese'));
      expect(catMouseCodingCode.patternCode).toBe('cheese');
      expect(catMouseCodingCode.min).toBe(1);
    });

    it('should ensure that minimum cardinality is 1 when assigning a value mentioned in the discriminator of a grandparent slice', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'value', path: 'coding.code' }], rules: 'open' };
      cat.addSlice('mouse');
      const catCoding = medicationRequest.findElementByPath('category.coding', fisher);
      catCoding.slicing = { discriminator: [{ type: 'value', path: 'coding' }], rules: 'open' };
      catCoding.addSlice('rat');
      const catMouseCodingRatCode = medicationRequest.findElementByPath(
        'category[mouse].coding[rat].code',
        fisher
      );
      expect(catMouseCodingRatCode.min).toBe(0);
      catMouseCodingRatCode.assignValue(new FshCode('cheese'));
      expect(catMouseCodingRatCode.patternCode).toBe('cheese');
      expect(catMouseCodingRatCode.min).toBe(1);
    });

    it('should not ensure that minimum cardinality is 1 when assigning a value mentioned in a slice discriminator via $this', () => {
      const inUri = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.instantiatesUri'
      );
      inUri.slicing = { discriminator: [{ type: 'value', path: '$this' }], rules: 'open' };
      inUri.addSlice('mouse');
      const inUriMouse = medicationRequest.findElementByPath('instantiatesUri[mouse]', fisher);
      expect(inUriMouse.min).toBe(0);
      inUriMouse.assignValue('http://mice.cheese');
      expect(inUriMouse.patternUri).toBe('http://mice.cheese');
      expect(inUriMouse.min).toBe(0);
    });

    it('should not ensure that minimum cardinality is 1 when assigning a value not mentioned in a slice discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'value', path: 'coding.code' }], rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCodingSystem = medicationRequest.findElementByPath(
        'category[mouse].coding.system',
        fisher
      );
      expect(catMouseCodingSystem.min).toBe(0);
      catMouseCodingSystem.assignValue('http://mice.cheese');
      expect(catMouseCodingSystem.patternUri).toBe('http://mice.cheese');
      expect(catMouseCodingSystem.min).toBe(0);
    });

    it('should not ensure that minimum cardinality is 1 when assigning a value mentioned in a non value/pattern discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'exists', path: 'coding.code' }], rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCodingCode = medicationRequest.findElementByPath(
        'category[mouse].coding.code',
        fisher
      );
      expect(catMouseCodingCode.min).toBe(0);
      catMouseCodingCode.assignValue(new FshCode('cheese'));
      expect(catMouseCodingCode.patternCode).toBe('cheese');
      expect(catMouseCodingCode.min).toBe(0);
    });

    it('should not ensure that minimum cardinality is 1 when assigning a value with min card > 1 mentioned in a parent slice discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { discriminator: [{ type: 'value', path: 'coding' }], rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCoding = medicationRequest.findElementByPath('category[mouse].coding', fisher);
      catMouseCoding.min = 2;
      expect(catMouseCoding.min).toBe(2);
      catMouseCoding.assignValue(new FshCode('cheese'));
      expect(catMouseCoding.patternCoding).toEqual({ code: 'cheese' });
      expect(catMouseCoding.min).toBe(2); // We do not try to decrease min to 1
    });

    it('should not ensure that minimum cardinality is 1 when assigning a value with no parent slice discriminator', () => {
      const cat = medicationRequest.elements.find(e => e.id === 'MedicationRequest.category');
      cat.slicing = { rules: 'open' };
      cat.addSlice('mouse');
      const catMouseCoding = medicationRequest.findElementByPath('category[mouse].coding', fisher);
      expect(catMouseCoding.min).toBe(0);
      catMouseCoding.assignValue(new FshCode('cheese'));
      expect(catMouseCoding.patternCoding).toEqual({ code: 'cheese' });
      expect(catMouseCoding.min).toBe(0); // We do not increase min, since no discriminator
    });

    describe('R5 CodeableReference', () => {
      let doc: FSHDocument;
      let r5Fisher: TestFisher;
      let carePlan: StructureDefinition;

      beforeEach(async () => {
        doc = new FSHDocument('Conditions.fsh');
        const input = new FSHTank([doc], minimalConfig);
        const r5Defs = await getTestFHIRDefinitions(false, testDefsPath('r5-definitions'));
        const pkg = new Package(input.config);
        r5Fisher = new TestFisher(input, r5Defs, pkg);
        carePlan = r5Fisher.fishForStructureDefinition('CarePlan');
        // we need an Instance of Condition to reference
        const condition = new Instance('TestCondition');
        condition.instanceOf = 'Condition';
        const assignedIdRule = new AssignmentRule('id');
        assignedIdRule.value = 'condition-id';
        condition.rules.push(assignedIdRule);
        doc.instances.set(condition.name, condition);
      });

      it('should assign a patternCodeableReference with a code on an element with an existing patternCodeableReference with a reference', () => {
        const addresses = carePlan.elements.find(e => e.id === 'CarePlan.addresses');
        addresses.assignValue(new FshReference('condition-id'));
        addresses.assignValue(new FshCode('bar', 'http://foo.com'));
        expect(addresses.patternCodeableReference).toEqual({
          concept: {
            coding: [{ code: 'bar', system: 'http://foo.com' }]
          },
          reference: {
            reference: 'condition-id'
          }
        });
      });

      it('should assign a patternCodeableReference with a Reference on an element with an existing patternCodeableReference with a concept', () => {
        const addresses = carePlan.elements.find(e => e.id === 'CarePlan.addresses');
        addresses.assignValue(new FshCode('bar', 'http://foo.com'));
        addresses.assignValue(new FshReference('condition-id'));
        expect(addresses.patternCodeableReference).toEqual({
          concept: {
            coding: [{ code: 'bar', system: 'http://foo.com' }]
          },
          reference: {
            reference: 'condition-id'
          }
        });
      });

      it('should assign a fixedCodeableReference with a code on an element with an existing fixedCodeableReference with a reference', () => {
        const addresses = carePlan.elements.find(e => e.id === 'CarePlan.addresses');
        addresses.assignValue(new FshReference('condition-id'), true);
        addresses.assignValue(new FshCode('bar', 'http://foo.com'), true);
        expect(addresses.fixedCodeableReference).toEqual({
          concept: {
            coding: [{ code: 'bar', system: 'http://foo.com' }]
          },
          reference: {
            reference: 'condition-id'
          }
        });
      });

      it('should assign a fixedCodeableReference with a Reference on an element with an existing fixedCodeableReference with a concept', () => {
        const addresses = carePlan.elements.find(e => e.id === 'CarePlan.addresses');
        addresses.assignValue(new FshCode('bar', 'http://foo.com'), true);
        addresses.assignValue(new FshReference('condition-id'), true);
        expect(addresses.fixedCodeableReference).toEqual({
          concept: {
            coding: [{ code: 'bar', system: 'http://foo.com' }]
          },
          reference: {
            reference: 'condition-id'
          }
        });
      });
    });
  });

  describe('#assignedByDirectParent', () => {
    it('should find a fixed[x] value from the parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.assignValue(new FshCode('foo'), true);
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const assignedValue = statusReasonCoding.assignedByDirectParent();
      expect(assignedValue).toEqual([{ code: 'foo' }]);
    });

    it('should find a pattern[x] value from the parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.assignValue(new FshCode('foo'));
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.assignedByDirectParent();
      expect(patternValue).toEqual([{ code: 'foo' }]);
    });

    it('should not find a fixed[x] or pattern[x] value from the parent when none is present', () => {
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.assignedByDirectParent();
      expect(patternValue).toBeUndefined();
    });

    it('should return undefined when being run on the root element', () => {
      const root = medicationRequest.elements.find(e => e.id === 'MedicationRequest');
      const patternValue = root.assignedByDirectParent();
      expect(patternValue).toBeUndefined();
    });
  });

  describe('#assignedByAnyParent', () => {
    it('should find a fixed[x] value from a direct parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.assignValue(new FshCode('foo'), true);
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const assignedValue = statusReasonCoding.assignedByAnyParent();
      expect(assignedValue).toEqual([{ code: 'foo' }]);
    });

    it('should find a pattern[x] value from a direct parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.assignValue(new FshCode('foo'));
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.assignedByAnyParent();
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
      const assignedValue = identifierPeriodStart.assignedByAnyParent();
      expect(assignedValue).toBe('2011-11-11');
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
      const patternValue = identifierPeriodStart.assignedByAnyParent();
      expect(patternValue).toBe('2011-11-11');
    });

    it('should find an array fixed[x] value from a grandparent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.assignValue(new FshCode('foo', 'http://bar.com'), true);
      const statusReasonCodingSystem = medicationRequest.findElementByPath(
        'statusReason.coding.system',
        fisher
      );
      // Single element in array
      let assignedValue = statusReasonCodingSystem.assignedByAnyParent();
      expect(assignedValue).toBe('http://bar.com');

      // Multiple not matching array elements
      statusReason.fixedCodeableConcept = {
        coding: [{ system: 'http://foo.com' }, { system: 'http://bar.com' }]
      };
      assignedValue = statusReasonCodingSystem.assignedByAnyParent();
      expect(assignedValue).toEqual(['http://foo.com', 'http://bar.com']);

      // Multiple matching array elements
      statusReason.fixedCodeableConcept = {
        coding: [{ system: 'http://foo.com' }, { system: 'http://foo.com' }]
      };
      assignedValue = statusReasonCodingSystem.assignedByAnyParent();
      expect(assignedValue).toBe('http://foo.com');
    });

    it('should find an array pattern value from a grandparent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.assignValue(new FshCode('foo', 'http://bar.com'));
      const statusReasonCodingSystem = medicationRequest.findElementByPath(
        'statusReason.coding.system',
        fisher
      );
      // Single element in array
      let patternValue = statusReasonCodingSystem.assignedByAnyParent();
      expect(patternValue).toBe('http://bar.com');

      // Multiple not matching array elements
      statusReason.patternCodeableConcept = {
        coding: [{ system: 'http://foo.com' }, { system: 'http://bar.com' }]
      };
      patternValue = statusReasonCodingSystem.assignedByAnyParent();
      expect(patternValue).toEqual(['http://foo.com', 'http://bar.com']);

      // Multiple matching array elements
      statusReason.patternCodeableConcept = {
        coding: [{ system: 'http://foo.com' }, { system: 'http://foo.com' }]
      };
      patternValue = statusReasonCodingSystem.assignedByAnyParent();
      expect(patternValue).toBe('http://foo.com');
    });

    it('should not find a fixed[x] or pattern[x] value from the parent when none is present', () => {
      const statusReasonCoding = medicationRequest.findElementByPath(
        'statusReason.coding.version',
        fisher
      );
      const value = statusReasonCoding.assignedByAnyParent();
      expect(value).toBeUndefined();
    });

    it('should return undefined when being run on the root element', () => {
      const root = medicationRequest.elements.find(e => e.id === 'MedicationRequest');
      const patternValue = root.assignedByAnyParent();
      expect(patternValue).toBeUndefined();
    });
  });
});
