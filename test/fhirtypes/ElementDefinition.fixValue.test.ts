import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshCode } from '../../src/fshtypes/FshCode';
import { FshQuantity, FshRatio, FshReference } from '../../src/fshtypes';
import { TestFisher } from '../testhelpers';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let riskEvidenceSynthesis: StructureDefinition;
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
    riskEvidenceSynthesis = fisher.fishForStructureDefinition('RiskEvidenceSynthesis');
    medicationRequest = fisher.fishForStructureDefinition('MedicationRequest');
    medication = fisher.fishForStructureDefinition('Medication');
  });

  describe('#fixValue', () => {
    it('should fix a boolean', () => {
      const doNotPerform = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.doNotPerform'
      );
      doNotPerform.fixValue(true);
      expect(doNotPerform.fixedBoolean).toBe(true);
    });

    it('should fix a number', () => {
      const sampleSizeNumberOfStudies = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.sampleSize.numberOfStudies'
      );
      sampleSizeNumberOfStudies.fixValue(123);
      expect(sampleSizeNumberOfStudies.fixedInteger).toBe(123);
    });

    it('should fix a string', () => {
      const name = riskEvidenceSynthesis.elements.find(e => e.id === 'RiskEvidenceSynthesis.name');
      name.fixValue('foo');
      expect(name.fixedString).toBe('foo');
    });

    it('should fix a FshCode', () => {
      const status = medicationRequest.elements.find(e => e.id === 'MedicationRequest.status');
      status.fixValue(new FshCode('foo'));
      expect(status.fixedCode).toBe('foo');
    });

    it('should fix a FshQuantity', () => {
      const dispenseRequestQuantity = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.dispenseRequest.quantity'
      );
      dispenseRequestQuantity.fixValue(
        new FshQuantity(1.23, new FshCode('mm', 'http://unitsofmeasure.org'))
      );
      expect(dispenseRequestQuantity.patternQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
    });

    it('should fix a FshRatio', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixValue(
        new FshRatio(
          new FshQuantity(1.2, new FshCode('mm', 'http://unitsofmeasure.org')),
          new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
        )
      );
      expect(amount.patternRatio).toEqual({
        numerator: {
          value: 1.2,
          code: 'mm',
          system: 'http://unitsofmeasure.org'
        },
        denominator: {
          value: 3.4,
          code: 'cm',
          system: 'http://unitsofmeasure.org'
        }
      });
    });

    it('should fix a FshReference', () => {
      const subject = medicationRequest.elements.find(e => e.id === 'MedicationRequest.subject');
      subject.fixValue(new FshReference('foo', 'bar'));
      expect(subject.patternReference).toEqual({
        reference: 'foo',
        display: 'bar'
      });
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
      statusReason.fixValue(new FshCode('foo', 'bar'));
      const statusReasonCodingSystem = medicationRequest.findElementByPath(
        'statusReason.coding.system',
        fisher
      );
      // Single element in array
      let patternValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(patternValue).toBe('bar');

      // Multiple not matching array elements
      statusReason.patternCodeableConcept = { coding: [{ system: 'foo' }, { system: 'bar' }] };
      patternValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(patternValue).toBeUndefined();

      // Multiple matching array elements
      statusReason.patternCodeableConcept = { coding: [{ system: 'foo' }, { system: 'foo' }] };
      patternValue = statusReasonCodingSystem.fixedByAnyParent();
      expect(patternValue).toBe('foo');
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
