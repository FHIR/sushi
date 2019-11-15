import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let jsonRiskEvidenceSynthesis: any;
  let observation: StructureDefinition;
  let riskEvidenceSynthesis: StructureDefinition;

  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
    jsonRiskEvidenceSynthesis = defs.findResource('RiskEvidenceSynthesis');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    riskEvidenceSynthesis = StructureDefinition.fromJSON(jsonRiskEvidenceSynthesis);
  });

  describe('#fixNumber', () => {
    it('should fix a decimal to a decimal', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixNumber(1.23);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
    });

    it('should fix an integer to a decimal', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixNumber(123);
      expect(riskEstimateValue.fixedDecimal).toBe(123);
    });

    it('should fix an integer to an integer', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixNumber(123);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
    });

    it('should throw MismatchedTypeError when fixing a decimal to an integer value', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      expect(() => {
        riskEstimateValueNumeratorCount.fixNumber(12.3);
      }).toThrow('Cannot fix number value 12.3 on element of type integer; types do not match');
    });

    it('should throw PrimitiveValueAlreadyFixedError when fixing an already fixed integer', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixNumber(123);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
      expect(() => {
        riskEstimateValueNumeratorCount.fixNumber(124);
      }).toThrow('Cannot fix 124 to this element; a different integer is already fixed: 123.');
    });

    it('should throw PrimitiveValueAlreadyFixedError when fixing an already fixed decimal', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixNumber(1.23);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
      expect(() => {
        riskEstimateValue.fixNumber(1.24);
      }).toThrow('Cannot fix 1.24 to this element; a different decimal is already fixed: 1.23.');
    });

    it('should throw MismatchedTypeError when fixing an integer to a non-numerical value', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(() => {
        status.fixNumber(123);
      }).toThrow('Cannot fix number value 123 on element of type code; types do not match');
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixBoolean(true);
      }).toThrow(
        'Cannot fix boolean value on this element since this element does not have a single type'
      );
      expect(valueX.fixedBoolean).toBeUndefined();
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixNumber(123);
      }).toThrow(
        'Cannot fix number value on this element since this element does not have a single type'
      );
      expect(valueX.fixedInteger).toBeUndefined();
    });
  });
});
