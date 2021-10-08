import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';
import cloneDeep from 'lodash/cloneDeep';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
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
  });

  describe('#bindToVS()', () => {
    it('should bind a value set on a CodeableConcept', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(concept.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(concept.binding.strength).toBe('required');
    });

    it('should bind a value set on a Coding', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(coding.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(coding.binding.strength).toBe('required');
    });

    it('should bind a value set on a code', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      code.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(code.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(code.binding.strength).toBe('required');
    });

    it('should bind a value set on a Quantity', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(quantity.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(quantity.binding.strength).toBe('required');
    });

    it('should bind a value set on a string', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      string.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(string.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(string.binding.strength).toBe('required');
    });

    it('should bind a value set on a uri', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      uri.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(uri.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(uri.binding.strength).toBe('required');
    });

    it('should bind a value set with a version on a CodeableConcept', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.bindToVS('http://myvaluesets.org/myvs|1.2.3', 'required');
      expect(concept.binding.valueSet).toBe('http://myvaluesets.org/myvs|1.2.3');
      expect(concept.binding.strength).toBe('required');
    });

    it('should throw CodedTypeNotFoundError when binding to an unsupported type', () => {
      const instant = observation.elements.find(e => e.id === 'Observation.issued');
      const clone = cloneDeep(instant);
      expect(() => {
        clone.bindToVS('http://myvaluesets.org/myvs', 'required');
      }).toThrow(/instant/);
      expect(clone).toEqual(instant);
    });

    it('should throw InvalidUriError when binding with a non-URI value', () => {
      const category = observation.elements.find(e => e.id === 'Observation.category');
      const clone = cloneDeep(category);
      expect(() => {
        clone.bindToVS('notAUri', 'required');
      }).toThrow(/notAUri/);
    });

    it('should only allow required to be rebound with required', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(status.binding.strength).toBe('required');
      let clone = cloneDeep(status);
      clone.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(clone.binding.strength).toBe('required');
      clone = cloneDeep(status);
      expect(() => {
        clone.bindToVS('http://myvaluesets.org/myvs', 'extensible');
      }).toThrow(/required.*extensible/);
      expect(clone).toEqual(status);
      clone = cloneDeep(status);
      expect(() => {
        clone.bindToVS('http://myvaluesets.org/myvs', 'preferred');
      }).toThrow(/required.*preferred/);
      expect(clone).toEqual(status);
      clone = cloneDeep(status);
      expect(() => {
        clone.bindToVS('http://myvaluesets.org/myvs', 'example');
      }).toThrow(/required.*example/);
      expect(clone).toEqual(status);
    });

    it('should only allow extensible to be rebound with extensible or required', () => {
      const interpretation = observation.elements.find(e => e.id === 'Observation.interpretation');
      expect(interpretation.binding.strength).toBe('extensible');
      let clone = cloneDeep(interpretation);
      clone.bindToVS('http://myvaluesets.org/myvs', 'extensible');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(clone.binding.strength).toBe('extensible');
      clone = cloneDeep(interpretation);
      clone.bindToVS('http://myvaluesets.org/myvs2', 'required');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs2');
      expect(clone.binding.strength).toBe('required');
      clone = cloneDeep(interpretation);
      expect(() => {
        interpretation.bindToVS('http://myvaluesets.org/myvs', 'preferred');
      }).toThrow(/extensible.*preferred/);
      expect(clone).toEqual(interpretation);
      clone = cloneDeep(interpretation);
      expect(() => {
        interpretation.bindToVS('http://myvaluesets.org/myvs', 'example');
      }).toThrow(/extensible.*example/);
      expect(clone).toEqual(interpretation);
    });

    it('should only allow preferred to be rebound with preferred, extensible, or required', () => {
      const category = observation.elements.find(e => e.id === 'Observation.category');
      expect(category.binding.strength).toBe('preferred');
      let clone = cloneDeep(category);
      clone.bindToVS('http://myvaluesets.org/myvs', 'preferred');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(clone.binding.strength).toBe('preferred');
      clone = cloneDeep(category);
      clone.bindToVS('http://myvaluesets.org/myvs2', 'extensible');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs2');
      expect(clone.binding.strength).toBe('extensible');
      clone = cloneDeep(category);
      clone.bindToVS('http://myvaluesets.org/myvs3', 'required');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs3');
      expect(clone.binding.strength).toBe('required');
      clone = cloneDeep(category);
      expect(() => {
        category.bindToVS('http://myvaluesets.org/myvs', 'example');
      }).toThrow(/preferred.*example/);
      expect(clone).toEqual(category);
    });

    it('should only allow example to be rebound with any strength', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      expect(code.binding.strength).toBe('example');
      let clone = cloneDeep(code);
      clone.bindToVS('http://myvaluesets.org/myvs', 'example');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(clone.binding.strength).toBe('example');
      clone = cloneDeep(code);
      clone.bindToVS('http://myvaluesets.org/myvs2', 'preferred');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs2');
      expect(clone.binding.strength).toBe('preferred');
      clone = cloneDeep(code);
      clone.bindToVS('http://myvaluesets.org/myvs3', 'extensible');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs3');
      expect(clone.binding.strength).toBe('extensible');
      clone = cloneDeep(code);
      clone.bindToVS('http://myvaluesets.org/myvs4', 'required');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs4');
      expect(clone.binding.strength).toBe('required');
    });
  });
});

describe('ElementDefinition R5', () => {
  let defs: FHIRDefinitions;
  let r5CarePlan: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'r5-definitions'),
      'r5',
      defs
    );
    fisher = new TestFisher()
      .withFHIR(defs)
      .withCachePackageName('hl7.fhir.r5.core#current')
      .withTestPackageName('r5-definitions');
  });
  beforeEach(() => {
    r5CarePlan = fisher.fishForStructureDefinition('CarePlan');
  });

  describe('#bindToVS()', () => {
    it('should bind a value set on a CodeableReference', () => {
      const addresses = r5CarePlan.elements.find(e => e.id === 'CarePlan.addresses');
      addresses.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(addresses.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(addresses.binding.strength).toBe('required');
    });
  });
});
