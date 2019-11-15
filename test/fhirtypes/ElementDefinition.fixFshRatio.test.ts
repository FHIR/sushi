import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshQuantity, Code, FshRatio } from '../../src/fshtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonMedication: any;
  let medication: StructureDefinition;

  beforeAll(() => {
    defs = load('4.0.1');
    jsonMedication = defs.findResource('Medication');
  });
  beforeEach(() => {
    medication = StructureDefinition.fromJSON(jsonMedication);
  });

  describe('#fixFshRatio', () => {
    it('should fix a FshRatio to a Ratio', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixFshRatio(
        new FshRatio(
          new FshQuantity(1.2, new Code('mm', 'http://unitsofmeasure.org')),
          new FshQuantity(3.4, new Code('cm', 'http://unitsofmeasure.org'))
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
