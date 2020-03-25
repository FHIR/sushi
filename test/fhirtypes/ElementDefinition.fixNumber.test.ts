import path from 'path';
import { cloneDeep } from 'lodash';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';

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
      riskEstimateValue.fixValue(1.23);
      expect(riskEstimateValue.patternDecimal).toBe(1.23);
    });

    it('should fix a decimal to a decimal (exactly)', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixValue(1.23, true);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
    });

    it('should fix an integer to a decimal', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixValue(123);
      expect(riskEstimateValue.patternDecimal).toBe(123);
      expect(riskEstimateValue.fixedDecimal).toBeUndefined();
    });

    it('should fix an integer to a decimal (exactly)', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixValue(123, true);
      expect(riskEstimateValue.fixedDecimal).toBe(123);
      expect(riskEstimateValue.patternDecimal).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed decimal by pattern[x]', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixValue(1.23);
      expect(riskEstimateValue.patternDecimal).toBe(1.23);
      expect(() => {
        riskEstimateValue.fixValue(1.24);
      }).toThrow('Cannot fix 1.24 to this element; a different decimal is already fixed: 1.23.');
      expect(() => {
        riskEstimateValue.fixValue(1.24, true);
      }).toThrow('Cannot fix 1.24 to this element; a different decimal is already fixed: 1.23.');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed decimal by fixed[x]', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixValue(1.23, true);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
      expect(() => {
        riskEstimateValue.fixValue(1.24, true);
      }).toThrow('Cannot fix 1.24 to this element; a different decimal is already fixed: 1.23.');
    });

    it('should throw ValueAlreadyFixedError when fixing a decimal to a different value set in a parent by pattern[x]', () => {
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      valueQuantity.patternQuantity = { value: 1.5 };
      valueQuantity.unfold(fisher);
      const valueQuantityValue = observation.elements.find(
        e => e.id === 'Observation.value[x]:valueQuantity.value'
      );
      const clone = cloneDeep(valueQuantityValue);
      expect(() => {
        valueQuantityValue.fixValue(2.5);
      }).toThrow('Cannot fix 2.5 to this element; a different decimal is already fixed: 1.5.');
      expect(() => {
        valueQuantityValue.fixValue(2.5, true);
      }).toThrow('Cannot fix 2.5 to this element; a different decimal is already fixed: 1.5.');
      expect(clone).toEqual(valueQuantityValue);
    });

    it('should throw ValueAlreadyFixedError when fixing a decimal to a different value set in a parent by fixed[x]', () => {
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      valueQuantity.fixedQuantity = { value: 1.5 };
      valueQuantity.unfold(fisher);
      const valueQuantityValue = observation.elements.find(
        e => e.id === 'Observation.value[x]:valueQuantity.value'
      );
      const clone = cloneDeep(valueQuantityValue);
      expect(() => {
        valueQuantityValue.fixValue(2.5);
      }).toThrow('Cannot fix 2.5 to this element; a different decimal is already fixed: 1.5.');
      expect(() => {
        valueQuantityValue.fixValue(2.5, true);
      }).toThrow('Cannot fix 2.5 to this element; a different decimal is already fixed: 1.5.');
      expect(clone).toEqual(valueQuantityValue);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.fixValue(1.23, true);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
      expect(() => {
        riskEstimateValue.fixValue(1.23);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedDecimal.'
      );
    });

    // fixing an integer
    it('should fix an integer to an integer', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixValue(123);
      expect(riskEstimateValueNumeratorCount.patternInteger).toBe(123);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBeUndefined();
    });

    it('should fix an integer to an integer (exactly)', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixValue(123, true);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
      expect(riskEstimateValueNumeratorCount.patternInteger).toBeUndefined();
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed integer by pattern[x]', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixValue(123);
      expect(riskEstimateValueNumeratorCount.patternInteger).toBe(123);
      expect(() => {
        riskEstimateValueNumeratorCount.fixValue(124);
      }).toThrow('Cannot fix 124 to this element; a different integer is already fixed: 123.');
      expect(() => {
        riskEstimateValueNumeratorCount.fixValue(124, true);
      }).toThrow('Cannot fix 124 to this element; a different integer is already fixed: 123.');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed integer by fixed[x]', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixValue(123, true);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
      expect(() => {
        riskEstimateValueNumeratorCount.fixValue(124, true);
      }).toThrow('Cannot fix 124 to this element; a different integer is already fixed: 123.');
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.fixValue(123, true);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
      expect(() => {
        riskEstimateValueNumeratorCount.fixValue(123);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedInteger.'
      );
    });

    it('should throw MismatchedTypeError when fixing a decimal to an integer value', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      expect(() => {
        riskEstimateValueNumeratorCount.fixValue(12.3);
      }).toThrow('Cannot fix number value: 12.3. Value does not match element type: integer');
      expect(() => {
        riskEstimateValueNumeratorCount.fixValue(12.3, true);
      }).toThrow('Cannot fix number value: 12.3. Value does not match element type: integer');
    });

    // fixing an unsignedInt
    it('should fix zero to an unsigned integer', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.fixValue(0);
      expect(reliableCache.patternUnsignedInt).toBe(0);
      expect(reliableCache.fixedUnsignedInt).toBeUndefined();
    });

    it('should fix zero to an unsigned integer (exactly)', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.fixValue(0, true);
      expect(reliableCache.fixedUnsignedInt).toBe(0);
      expect(reliableCache.patternUnsignedInt).toBeUndefined();
    });

    it('should throw MismatchedTypeError when fixing a decimal to an unsignedInt', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      expect(() => {
        reliableCache.fixValue(2.4);
      }).toThrow('Cannot fix number value: 2.4. Value does not match element type: unsignedInt');
      expect(() => {
        reliableCache.fixValue(2.4, true);
      }).toThrow('Cannot fix number value: 2.4. Value does not match element type: unsignedInt');
    });

    it('should throw MismatchedTypeError when fixing a negative integer to an unsignedInt', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      expect(() => {
        reliableCache.fixValue(-24);
      }).toThrow('Cannot fix number value: -24. Value does not match element type: unsignedInt');
      expect(() => {
        reliableCache.fixValue(-24, true);
      }).toThrow('Cannot fix number value: -24. Value does not match element type: unsignedInt');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed unsignedInt by pattern[x]', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.fixValue(12);
      expect(reliableCache.patternUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.fixValue(34);
      }).toThrow('Cannot fix 34 to this element; a different unsignedInt is already fixed: 12.');
      expect(() => {
        reliableCache.fixValue(34, true);
      }).toThrow('Cannot fix 34 to this element; a different unsignedInt is already fixed: 12.');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed unsignedInt by fixed[x]', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.fixValue(12, true);
      expect(reliableCache.fixedUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.fixValue(34, true);
      }).toThrow('Cannot fix 34 to this element; a different unsignedInt is already fixed: 12.');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed unsignedInt by fixed[x]', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.fixValue(12, true);
      expect(reliableCache.fixedUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.fixValue(34, true);
      }).toThrow('Cannot fix 34 to this element; a different unsignedInt is already fixed: 12.');
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.fixValue(12, true);
      expect(reliableCache.fixedUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.fixValue(12);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedUnsignedInt.'
      );
    });

    // fixing a positiveInt
    it('should fix a positive integer to positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.fixValue(12);
      expect(minutesDuration.patternPositiveInt).toBe(12);
      expect(minutesDuration.fixedPositiveInt).toBeUndefined();
    });

    it('should fix a positive integer to positiveInt (exactly)', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.fixValue(12, true);
      expect(minutesDuration.fixedPositiveInt).toBe(12);
      expect(minutesDuration.patternPositiveInt).toBeUndefined();
    });

    it('should throw MismatchedTypeError when fixing a decimal to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.fixValue(1.2);
      }).toThrow('Cannot fix number value: 1.2. Value does not match element type: positiveInt');
      expect(() => {
        minutesDuration.fixValue(1.2, true);
      }).toThrow('Cannot fix number value: 1.2. Value does not match element type: positiveInt');
    });

    it('should throw MismatchedTypeError when fixing zero to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.fixValue(0);
      }).toThrow('Cannot fix number value: 0. Value does not match element type: positiveInt');
      expect(() => {
        minutesDuration.fixValue(0, true);
      }).toThrow('Cannot fix number value: 0. Value does not match element type: positiveInt');
    });

    it('should throw MismatchedTypeError when fixing a negative to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.fixValue(-12);
      }).toThrow('Cannot fix number value: -12. Value does not match element type: positiveInt');
      expect(() => {
        minutesDuration.fixValue(-12, true);
      }).toThrow('Cannot fix number value: -12. Value does not match element type: positiveInt');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed positiveInt by pattern[x]', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.fixValue(12);
      expect(minutesDuration.patternPositiveInt).toEqual(12);
      expect(() => {
        minutesDuration.fixValue(34);
      }).toThrow('Cannot fix 34 to this element; a different positiveInt is already fixed: 12.');
      expect(() => {
        minutesDuration.fixValue(34, true);
      }).toThrow('Cannot fix 34 to this element; a different positiveInt is already fixed: 12.');
    });

    it('should throw ValueAlreadyFixedError when fixing an already fixed positiveInt by fixed[x]', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.fixValue(12, true);
      expect(minutesDuration.fixedPositiveInt).toEqual(12);
      expect(() => {
        minutesDuration.fixValue(34, true);
      }).toThrow('Cannot fix 34 to this element; a different positiveInt is already fixed: 12.');
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.fixValue(12, true);
      expect(minutesDuration.fixedPositiveInt).toEqual(12);
      expect(() => {
        minutesDuration.fixValue(12);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedPositiveInt.'
      );
    });

    // fixing a non-numerical value
    it('should throw MismatchedTypeError when fixing an integer to a non-numerical value', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(() => {
        status.fixValue(123);
      }).toThrow('Cannot fix number value: 123. Value does not match element type: code');
      expect(() => {
        status.fixValue(123, true);
      }).toThrow('Cannot fix number value: 123. Value does not match element type: code');
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(123);
      }).toThrow(
        'Cannot fix number value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.fixValue(123, true);
      }).toThrow(
        'Cannot fix number value on this element since this element does not have a single type'
      );
      expect(valueX.patternInteger).toBeUndefined();
      expect(valueX.fixedInteger).toBeUndefined();
    });
  });
});
