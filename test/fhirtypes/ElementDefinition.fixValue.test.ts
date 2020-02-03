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
  });
  describe('#fixedByParent', () => {
    it('should find a pattern value from the parent when it exists', () => {
      const statusReason = medicationRequest.elements.find(
        e => e.id === 'MedicationRequest.statusReason'
      );
      statusReason.fixValue(new FshCode('foo'));
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.fixedByParent();
      expect(patternValue).toEqual([{ code: 'foo' }]);
    });

    it('should not find a pattern value from the parent when none is present', () => {
      const statusReasonCoding = medicationRequest.findElementByPath('statusReason.coding', fisher);
      const patternValue = statusReasonCoding.fixedByParent();
      expect(patternValue).toBeUndefined();
    });

    it('should return undefined when being run on the root element', () => {
      const root = medicationRequest.elements.find(e => e.id === 'MedicationRequest');
      const patternValue = root.fixedByParent();
      expect(patternValue).toBeUndefined();
    });
  });
});
