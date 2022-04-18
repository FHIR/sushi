import path from 'path';
import fs from 'fs-extra';
import { cloneDeep } from 'lodash';
import { loadFromPath } from 'fhir-package-loader';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';
import { ElementDefinition } from '../../src/fhirtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let riskEvidenceSynthesis: StructureDefinition;
  let capabilityStatement: StructureDefinition;
  let appointment: StructureDefinition;
  let fisher: TestFisher;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    riskEvidenceSynthesis = fisher.fishForStructureDefinition('RiskEvidenceSynthesis');
    capabilityStatement = fisher.fishForStructureDefinition('CapabilityStatement');
    appointment = fisher.fishForStructureDefinition('Appointment');
  });

  describe('#assignNumber', () => {
    // assigning a decimal
    it('should assign a decimal to a decimal', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.assignValue(1.23);
      expect(riskEstimateValue.patternDecimal).toBe(1.23);
    });

    it('should assign a decimal to a decimal (exactly)', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.assignValue(1.23, true);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
    });

    it('should assign an integer to a decimal', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.assignValue(BigInt(123));
      expect(riskEstimateValue.patternDecimal).toBe(123);
      expect(riskEstimateValue.fixedDecimal).toBeUndefined();
    });

    it('should assign an integer to a decimal (exactly)', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.assignValue(BigInt(123), true);
      expect(riskEstimateValue.fixedDecimal).toBe(123);
      expect(riskEstimateValue.patternDecimal).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned decimal by pattern[x]', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.assignValue(1.23);
      expect(riskEstimateValue.patternDecimal).toBe(1.23);
      expect(() => {
        riskEstimateValue.assignValue(1.24);
      }).toThrow(
        'Cannot assign 1.24 to this element; a different decimal is already assigned: 1.23.'
      );
      expect(() => {
        riskEstimateValue.assignValue(1.24, true);
      }).toThrow(
        'Cannot assign 1.24 to this element; a different decimal is already assigned: 1.23.'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned decimal by fixed[x]', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.assignValue(1.23, true);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
      expect(() => {
        riskEstimateValue.assignValue(1.24, true);
      }).toThrow(
        'Cannot assign 1.24 to this element; a different decimal is already assigned: 1.23.'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a decimal to a different value set in a parent by pattern[x]', () => {
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      valueQuantity.patternQuantity = { value: 1.5 };
      valueQuantity.unfold(fisher);
      const valueQuantityValue = observation.elements.find(
        e => e.id === 'Observation.value[x]:valueQuantity.value'
      );
      const clone = cloneDeep(valueQuantityValue);
      expect(() => {
        valueQuantityValue.assignValue(2.5);
      }).toThrow(
        'Cannot assign 2.5 to this element; a different decimal is already assigned: 1.5.'
      );
      expect(() => {
        valueQuantityValue.assignValue(2.5, true);
      }).toThrow(
        'Cannot assign 2.5 to this element; a different decimal is already assigned: 1.5.'
      );
      expect(clone).toEqual(valueQuantityValue);
    });

    it('should throw ValueAlreadyAssignedError when assigning a decimal to a different value set in a parent by fixed[x]', () => {
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      valueQuantity.fixedQuantity = { value: 1.5 };
      valueQuantity.unfold(fisher);
      const valueQuantityValue = observation.elements.find(
        e => e.id === 'Observation.value[x]:valueQuantity.value'
      );
      const clone = cloneDeep(valueQuantityValue);
      expect(() => {
        valueQuantityValue.assignValue(2.5);
      }).toThrow(
        'Cannot assign 2.5 to this element; a different decimal is already assigned: 1.5.'
      );
      expect(() => {
        valueQuantityValue.assignValue(2.5, true);
      }).toThrow(
        'Cannot assign 2.5 to this element; a different decimal is already assigned: 1.5.'
      );
      expect(clone).toEqual(valueQuantityValue);
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const riskEstimateValue = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.value'
      );
      riskEstimateValue.assignValue(1.23, true);
      expect(riskEstimateValue.fixedDecimal).toBe(1.23);
      expect(() => {
        riskEstimateValue.assignValue(1.23);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedDecimal.'
      );
    });

    // assigning an integer
    it('should assign an integer to an integer', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.assignValue(BigInt(123));
      expect(riskEstimateValueNumeratorCount.patternInteger).toBe(123);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBeUndefined();
    });

    it('should assign an integer to an integer (exactly)', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.assignValue(BigInt(123), true);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
      expect(riskEstimateValueNumeratorCount.patternInteger).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned integer by pattern[x]', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.assignValue(BigInt(123));
      expect(riskEstimateValueNumeratorCount.patternInteger).toBe(123);
      expect(() => {
        riskEstimateValueNumeratorCount.assignValue(BigInt(124));
      }).toThrow(
        'Cannot assign 124 to this element; a different integer is already assigned: 123.'
      );
      expect(() => {
        riskEstimateValueNumeratorCount.assignValue(BigInt(124), true);
      }).toThrow(
        'Cannot assign 124 to this element; a different integer is already assigned: 123.'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned integer by fixed[x]', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.assignValue(BigInt(123), true);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
      expect(() => {
        riskEstimateValueNumeratorCount.assignValue(BigInt(124), true);
      }).toThrow(
        'Cannot assign 124 to this element; a different integer is already assigned: 123.'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      riskEstimateValueNumeratorCount.assignValue(BigInt(123), true);
      expect(riskEstimateValueNumeratorCount.fixedInteger).toBe(123);
      expect(() => {
        riskEstimateValueNumeratorCount.assignValue(BigInt(123));
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedInteger.'
      );
    });

    it('should throw MismatchedTypeError when assigning a decimal to an integer value', () => {
      const riskEstimateValueNumeratorCount = riskEvidenceSynthesis.elements.find(
        e => e.id === 'RiskEvidenceSynthesis.riskEstimate.numeratorCount'
      );
      expect(() => {
        riskEstimateValueNumeratorCount.assignValue(12.3);
      }).toThrow('Cannot assign number value: 12.3. Value does not match element type: integer');
      expect(() => {
        riskEstimateValueNumeratorCount.assignValue(12.3, true);
      }).toThrow('Cannot assign number value: 12.3. Value does not match element type: integer');
    });

    // assigning an unsignedInt
    it('should assign zero to an unsigned integer', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.assignValue(BigInt(0));
      expect(reliableCache.patternUnsignedInt).toBe(0);
      expect(reliableCache.fixedUnsignedInt).toBeUndefined();
    });

    it('should assign zero to an unsigned integer (exactly)', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.assignValue(BigInt(0), true);
      expect(reliableCache.fixedUnsignedInt).toBe(0);
      expect(reliableCache.patternUnsignedInt).toBeUndefined();
    });

    it('should throw MismatchedTypeError when assigning a decimal to an unsignedInt', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      expect(() => {
        reliableCache.assignValue(2.4);
      }).toThrow('Cannot assign number value: 2.4. Value does not match element type: unsignedInt');
      expect(() => {
        reliableCache.assignValue(2.4, true);
      }).toThrow('Cannot assign number value: 2.4. Value does not match element type: unsignedInt');
    });

    it('should throw MismatchedTypeError when assigning a negative integer to an unsignedInt', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      expect(() => {
        reliableCache.assignValue(BigInt(-24));
      }).toThrow('Cannot assign number value: -24. Value does not match element type: unsignedInt');
      expect(() => {
        reliableCache.assignValue(BigInt(-24), true);
      }).toThrow('Cannot assign number value: -24. Value does not match element type: unsignedInt');
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned unsignedInt by pattern[x]', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.assignValue(BigInt(12));
      expect(reliableCache.patternUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.assignValue(BigInt(34));
      }).toThrow(
        'Cannot assign 34 to this element; a different unsignedInt is already assigned: 12.'
      );
      expect(() => {
        reliableCache.assignValue(BigInt(34), true);
      }).toThrow(
        'Cannot assign 34 to this element; a different unsignedInt is already assigned: 12.'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned unsignedInt by fixed[x]', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.assignValue(BigInt(12), true);
      expect(reliableCache.fixedUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.assignValue(BigInt(34), true);
      }).toThrow(
        'Cannot assign 34 to this element; a different unsignedInt is already assigned: 12.'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned unsignedInt by fixed[x]', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.assignValue(BigInt(12), true);
      expect(reliableCache.fixedUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.assignValue(BigInt(34), true);
      }).toThrow(
        'Cannot assign 34 to this element; a different unsignedInt is already assigned: 12.'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const reliableCache = capabilityStatement.elements.find(
        e => e.id === 'CapabilityStatement.messaging.reliableCache'
      );
      reliableCache.assignValue(BigInt(12), true);
      expect(reliableCache.fixedUnsignedInt).toBe(12);
      expect(() => {
        reliableCache.assignValue(BigInt(12));
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedUnsignedInt.'
      );
    });

    // assigning a positiveInt
    it('should assign a positive integer to positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.assignValue(BigInt(12));
      expect(minutesDuration.patternPositiveInt).toBe(12);
      expect(minutesDuration.fixedPositiveInt).toBeUndefined();
    });

    it('should assign a positive integer to positiveInt (exactly)', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.assignValue(BigInt(12), true);
      expect(minutesDuration.fixedPositiveInt).toBe(12);
      expect(minutesDuration.patternPositiveInt).toBeUndefined();
    });

    it('should throw MismatchedTypeError when assigning a decimal to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.assignValue(1.2);
      }).toThrow('Cannot assign number value: 1.2. Value does not match element type: positiveInt');
      expect(() => {
        minutesDuration.assignValue(1.2, true);
      }).toThrow('Cannot assign number value: 1.2. Value does not match element type: positiveInt');
    });

    it('should throw MismatchedTypeError when assigning zero to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.assignValue(BigInt(0));
      }).toThrow('Cannot assign number value: 0. Value does not match element type: positiveInt');
      expect(() => {
        minutesDuration.assignValue(BigInt(0), true);
      }).toThrow('Cannot assign number value: 0. Value does not match element type: positiveInt');
    });

    it('should throw MismatchedTypeError when assigning a negative to a positiveInt', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      expect(() => {
        minutesDuration.assignValue(BigInt(-12));
      }).toThrow('Cannot assign number value: -12. Value does not match element type: positiveInt');
      expect(() => {
        minutesDuration.assignValue(BigInt(-12), true);
      }).toThrow('Cannot assign number value: -12. Value does not match element type: positiveInt');
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned positiveInt by pattern[x]', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.assignValue(BigInt(12));
      expect(minutesDuration.patternPositiveInt).toEqual(12);
      expect(() => {
        minutesDuration.assignValue(BigInt(34));
      }).toThrow(
        'Cannot assign 34 to this element; a different positiveInt is already assigned: 12.'
      );
      expect(() => {
        minutesDuration.assignValue(BigInt(34), true);
      }).toThrow(
        'Cannot assign 34 to this element; a different positiveInt is already assigned: 12.'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned positiveInt by fixed[x]', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.assignValue(BigInt(12), true);
      expect(minutesDuration.fixedPositiveInt).toEqual(12);
      expect(() => {
        minutesDuration.assignValue(BigInt(34), true);
      }).toThrow(
        'Cannot assign 34 to this element; a different positiveInt is already assigned: 12.'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const minutesDuration = appointment.elements.find(
        e => e.id === 'Appointment.minutesDuration'
      );
      minutesDuration.assignValue(BigInt(12), true);
      expect(minutesDuration.fixedPositiveInt).toEqual(12);
      expect(() => {
        minutesDuration.assignValue(BigInt(12));
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedPositiveInt.'
      );
    });

    // assigning a non-numerical value
    it('should throw MismatchedTypeError when assigning an integer to a non-numerical value', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(() => {
        status.assignValue(BigInt(123));
      }).toThrow('Cannot assign number value: 123. Value does not match element type: code');
      expect(() => {
        status.assignValue(BigInt(123), true);
      }).toThrow('Cannot assign number value: 123. Value does not match element type: code');
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.assignValue(BigInt(123));
      }).toThrow(
        'Cannot assign number value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.assignValue(BigInt(123), true);
      }).toThrow(
        'Cannot assign number value on this element since this element does not have a single type'
      );
      expect(valueX.patternInteger).toBeUndefined();
      expect(valueX.fixedInteger).toBeUndefined();
    });
  });

  describe('#integer64', () => {
    let valueX: ElementDefinition;
    let valueInteger64: ElementDefinition;
    beforeAll(() => {
      const r5Extension = StructureDefinition.fromJSON(
        JSON.parse(
          fs.readFileSync(
            path.join(
              __dirname,
              '..',
              'testhelpers',
              'testdefs',
              'r5-definitions',
              'package',
              'StructureDefinition-Extension.json'
            ),
            'utf-8'
          )
        )
      );
      valueX = r5Extension.elements.find(e => e.id === 'Extension.value[x]');
    });

    beforeEach(() => {
      valueInteger64 = cloneDeep(valueX);
      valueInteger64.type = valueInteger64.type.filter(t => t.code === 'integer64');
    });

    // assigning an integer64
    // NOTE: Tests of assigning an integer64 as a string are in ElementDefinition.assignString.test.ts
    it('should assign an integer to an integer64', () => {
      valueInteger64.assignValue(BigInt(123));
      expect(valueInteger64.patternInteger64).toBe('123');
      expect(valueInteger64.fixedInteger64).toBeUndefined();
    });

    it('should assign an integer to an integer64 (exactly)', () => {
      valueInteger64.assignValue(BigInt(123), true);
      expect(valueInteger64.patternInteger64).toBeUndefined();
      expect(valueInteger64.fixedInteger64).toBe('123');
    });

    it('should assign a large integer to an integer64 without losing precision', () => {
      valueInteger64.assignValue(BigInt('12345678901234567890'));
      expect(valueInteger64.patternInteger64).toBe('12345678901234567890');
      expect(valueInteger64.fixedInteger64).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned integer by pattern[x]', () => {
      valueInteger64.assignValue(BigInt(123));
      expect(valueInteger64.patternInteger64).toBe('123');
      expect(() => {
        valueInteger64.assignValue(BigInt(124));
      }).toThrow(
        'Cannot assign 124 to this element; a different integer64 is already assigned: "123".'
      );
      expect(() => {
        valueInteger64.assignValue(BigInt(124), true);
      }).toThrow(
        'Cannot assign 124 to this element; a different integer64 is already assigned: "123".'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning an already assigned integer by fixed[x]', () => {
      valueInteger64.assignValue(BigInt(123), true);
      expect(valueInteger64.fixedInteger64).toBe('123');
      expect(() => {
        valueInteger64.assignValue(BigInt(124), true);
      }).toThrow(
        'Cannot assign 124 to this element; a different integer64 is already assigned: "123".'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      valueInteger64.assignValue(BigInt(123), true);
      expect(valueInteger64.fixedInteger64).toBe('123');
      expect(() => {
        valueInteger64.assignValue(BigInt(123));
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedInteger64.'
      );
    });

    it('should throw MismatchedTypeError when assigning a decimal to an integer64 value', () => {
      expect(() => {
        valueInteger64.assignValue(12.3);
      }).toThrow('Cannot assign number value: 12.3. Value does not match element type: integer64');
      expect(() => {
        valueInteger64.assignValue(12.3, true);
      }).toThrow('Cannot assign number value: 12.3. Value does not match element type: integer64');
    });
  });
});
