import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshCode } from '../../src/fshtypes/FshCode';
import { FshQuantity, FshRatio } from '../../src/fshtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonRiskEvidenceSynthesis: any;
  let jsonMedicationRequest: any;
  let jsonMedication: any;
  let riskEvidenceSynthesis: StructureDefinition;
  let medicationRequest: StructureDefinition;
  let medication: StructureDefinition;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonRiskEvidenceSynthesis = defs.findResource('RiskEvidenceSynthesis');
    jsonMedicationRequest = defs.findResource('MedicationRequest');
    jsonMedication = defs.findResource('Medication');
  });
  beforeEach(() => {
    riskEvidenceSynthesis = StructureDefinition.fromJSON(jsonRiskEvidenceSynthesis);
    medicationRequest = StructureDefinition.fromJSON(jsonMedicationRequest);
    medication = StructureDefinition.fromJSON(jsonMedication);
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
  });
});
