import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher, getTestFHIRDefinitions, loggerSpy, testDefsPath } from '../testhelpers';
import omit from 'lodash/omit';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
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

    it('should bind a value set specified as a fragment', () => {
      // This can happen when binding to a contained ValueSet
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.bindToVS('#contained-vs', 'required');
      expect(concept.binding.valueSet).toBe('#contained-vs');
      expect(concept.binding.strength).toBe('required');
    });

    it('should allow a binding with no valueset specified (because it apparently happens)', () => {
      // See: https://github.com/FHIR/sushi/issues/1312
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.bindToVS(null, 'required');
      expect(concept.binding.valueSet).toBeUndefined();
      expect(concept.binding.strength).toBe('required');
    });

    it('should throw CodedTypeNotFoundError when binding to an unsupported type', () => {
      const instant = observation.elements.find(e => e.id === 'Observation.issued');
      const clone = instant.clone(false);
      expect(() => {
        clone.bindToVS('http://myvaluesets.org/myvs', 'required');
      }).toThrow(/instant/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(instant, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw InvalidUriError when binding with a non-URI non-fragment value', () => {
      const category = observation.elements.find(e => e.id === 'Observation.category');
      const clone = category.clone(false);
      expect(() => {
        clone.bindToVS('notAUri', 'required');
      }).toThrow(/notAUri/);
    });

    it('should only allow required to be rebound with required', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      expect(status.binding.strength).toBe('required');
      let clone = status.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(clone.binding.strength).toBe('required');
      clone = status.clone(false);
      expect(() => {
        clone.bindToVS('http://myvaluesets.org/myvs', 'extensible');
      }).toThrow(/required.*extensible/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(status, ['structDef', 'treeParent', 'treeChildren'])
      );
      clone = status.clone(false);
      expect(() => {
        clone.bindToVS('http://myvaluesets.org/myvs', 'preferred');
      }).toThrow(/required.*preferred/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(status, ['structDef', 'treeParent', 'treeChildren'])
      );
      clone = status.clone(false);
      expect(() => {
        clone.bindToVS('http://myvaluesets.org/myvs', 'example');
      }).toThrow(/required.*example/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(status, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should only allow extensible to be rebound with extensible or required', () => {
      const interpretation = observation.elements.find(e => e.id === 'Observation.interpretation');
      expect(interpretation.binding.strength).toBe('extensible');
      let clone = interpretation.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs', 'extensible');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(clone.binding.strength).toBe('extensible');
      clone = interpretation.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs2', 'required');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs2');
      expect(clone.binding.strength).toBe('required');
      clone = interpretation.clone(false);
      expect(() => {
        interpretation.bindToVS('http://myvaluesets.org/myvs', 'preferred');
      }).toThrow(/extensible.*preferred/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(interpretation, ['structDef', 'treeParent', 'treeChildren'])
      );
      clone = interpretation.clone(false);
      expect(() => {
        interpretation.bindToVS('http://myvaluesets.org/myvs', 'example');
      }).toThrow(/extensible.*example/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(interpretation, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should only allow preferred to be rebound with preferred, extensible, or required', () => {
      const category = observation.elements.find(e => e.id === 'Observation.category');
      expect(category.binding.strength).toBe('preferred');
      let clone = category.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs', 'preferred');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(clone.binding.strength).toBe('preferred');
      clone = category.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs2', 'extensible');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs2');
      expect(clone.binding.strength).toBe('extensible');
      clone = category.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs3', 'required');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs3');
      expect(clone.binding.strength).toBe('required');
      clone = category.clone(false);
      expect(() => {
        category.bindToVS('http://myvaluesets.org/myvs', 'example');
      }).toThrow(/preferred.*example/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(category, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should only allow example to be rebound with any strength', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      expect(code.binding.strength).toBe('example');
      let clone = code.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs', 'example');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(clone.binding.strength).toBe('example');
      clone = code.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs2', 'preferred');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs2');
      expect(clone.binding.strength).toBe('preferred');
      clone = code.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs3', 'extensible');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs3');
      expect(clone.binding.strength).toBe('extensible');
      clone = code.clone(false);
      clone.bindToVS('http://myvaluesets.org/myvs4', 'required');
      expect(clone.binding.valueSet).toBe('http://myvaluesets.org/myvs4');
      expect(clone.binding.strength).toBe('required');
    });
  });

  it('should still follow strength rules even when no value set is supplied (because it apparently happens)', () => {
    // See: https://github.com/FHIR/sushi/issues/1312
    const interpretation = observation.elements.find(e => e.id === 'Observation.interpretation');
    expect(interpretation.binding.strength).toBe('extensible');
    let clone = interpretation.clone(false);
    clone.bindToVS(null, 'extensible');
    expect(clone.binding.valueSet).toBeUndefined();
    expect(clone.binding.strength).toBe('extensible');
    clone = interpretation.clone(false);
    clone.bindToVS(null, 'required');
    expect(clone.binding.valueSet).toBeUndefined();
    expect(clone.binding.strength).toBe('required');
    clone = interpretation.clone(false);
    expect(() => {
      interpretation.bindToVS(null, 'preferred');
    }).toThrow(/extensible.*preferred/);
    expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
      omit(interpretation, ['structDef', 'treeParent', 'treeChildren'])
    );
    clone = interpretation.clone(false);
    expect(() => {
      interpretation.bindToVS(null, 'example');
    }).toThrow(/extensible.*example/);
    expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
      omit(interpretation, ['structDef', 'treeParent', 'treeChildren'])
    );
  });
});

describe('ElementDefinition R5', () => {
  let defs: FHIRDefinitions;
  let r5CarePlan: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(false, testDefsPath('r5-definitions'));
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    r5CarePlan = fisher.fishForStructureDefinition('CarePlan');
    loggerSpy.reset();
  });

  describe('#bindToVS()', () => {
    it('should bind a value set on a CodeableReference', () => {
      const addresses = r5CarePlan.elements.find(e => e.id === 'CarePlan.addresses');
      addresses.bindToVS('http://myvaluesets.org/myvs', 'required');
      expect(addresses.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(addresses.binding.strength).toBe('required');
    });

    it('should log an error when trying to bind the concept portion of a CodeableReference element directly', () => {
      const addresses = r5CarePlan.elements.find(e => e.id === 'CarePlan.addresses');
      addresses.unfold(fisher);
      const concept = r5CarePlan.elements.find(e => e.id === 'CarePlan.addresses.concept');
      const ruleSourceInfo = {
        file: 'fishy.fsh',
        location: {
          startLine: 6,
          startColumn: 1,
          endLine: 6,
          endColumn: 10
        }
      };
      concept.bindToVS('http://myvaluesets.org/myvs', 'required', ruleSourceInfo);
      expect(concept.binding.valueSet).toBe('http://myvaluesets.org/myvs');
      expect(concept.binding.strength).toBe('required');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Applying value set bindings to a CodeableReference element's underlying \.concept path is not allowed.* directly to the CodeableReference element/is
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: fishy\.fsh.*Line: 6\D*/s);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
    });
  });
});
