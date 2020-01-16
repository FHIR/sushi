import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let riskEvidenceSynthesis: StructureDefinition;
  let capabilityStatement: StructureDefinition;
  let appointment: StructureDefinition;
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
    observation = fisher.fishForStructureDefinition('Observation');
    riskEvidenceSynthesis = fisher.fishForStructureDefinition('RiskEvidenceSynthesis');
    capabilityStatement = fisher.fishForStructureDefinition('CapabilityStatement');
    appointment = fisher.fishForStructureDefinition('Appointment');
  });

  describe('#fixNumber', () => {
    // fixing a decimal
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

    it('should throw ValueAlreadyFixedError when fixing an already fixed decimal', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixNumber(1.23);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
      expect(() => {
        riskEstimateValue.fixNumber(1.24);
      }).toThrow('Cannot fix 1.24 to this element; a different decimal is already fixed: 1.23.');
    });

    // fixing an integer
    it('should fix an integer to an integer', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixNumber(123);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed integer', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixNumber(123);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
      expect(() => {
        riskEstimateValueNumeratorCount.fixNumber(124);
      }).toThrow('Cannot fix 124 to this element; a different integer is already fixed: 123.');
    });

    it('should throw MismatchedTypeError when fixing a decimal to an integer value', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      expect(() => {
        riskEstimateValueNumeratorCount.fixNumber(12.3);
      }).toThrow('Cannot fix number value: 12.3. Value does not match element type: integer');
    });

    // fixing an unsignedInt
    it('should fix zero to an unsigned integer', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.fixNumber(0);
      expect(reliableCache.fixedUnsignedInt).toBe(0);
    });

    it('should throw MismatchedTypeError when fixing a decimal to an unsignedInt', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      expect(() => {
        reliableCache.fixNumber(2.4);
      }).toThrow('Cannot fix number value: 2.4. Value does not match element type: unsignedInt');
    });

    it('should throw MismatchedTypeError when fixing a negative integer to an unsignedInt', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      expect(() => {
        reliableCache.fixNumber(-24);
      }).toThrow('Cannot fix number value: -24. Value does not match element type: unsignedInt');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed unsignedInt', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.fixNumber(12);
      expect(reliableCache.fixedUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.fixNumber(34);
      }).toThrow('Cannot fix 34 to this element; a different unsignedInt is already fixed: 12.');
    });

    // fixing a positiveInt
    it('should fix a positive integer to positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.fixNumber(12);
      expect(minutesDuration.fixedPositiveInt).toBe(12);
    });

    it('should throw MismatchedTypeError when fixing a decimal to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.fixNumber(1.2);
      }).toThrow('Cannot fix number value: 1.2. Value does not match element type: positiveInt');
    });

    it('should throw MismatchedTypeError when fixing zero to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.fixNumber(0);
      }).toThrow('Cannot fix number value: 0. Value does not match element type: positiveInt');
    });

    it('should throw MismatchedTypeError when fixing a negative to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.fixNumber(-12);
      }).toThrow('Cannot fix number value: -12. Value does not match element type: positiveInt');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.fixNumber(12);
      expect(minutesDuration.fixedPositiveInt).toEqual(12);
      expect(() => {
        minutesDuration.fixNumber(34);
      }).toThrow('Cannot fix 34 to this element; a different positiveInt is already fixed: 12.');
    });

    // fixing a non-numerical value
    it('should throw MismatchedTypeError when fixing an integer to a non-numerical value', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(() => {
        status.fixNumber(123);
      }).toThrow('Cannot fix number value: 123. Value does not match element type: code');
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
