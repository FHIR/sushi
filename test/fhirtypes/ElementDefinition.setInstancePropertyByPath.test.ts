import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ElementDefinition, ElementDefinitionType } from '../../src/fhirtypes/ElementDefinition';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { getTestFHIRDefinitions, testDefsPath, TestFisher } from '../testhelpers';
import { FshCode, FshQuantity } from '../../src/fshtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let status: ElementDefinition;
  let fisher: TestFisher;
  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    status = observation.elements.find(e => e.id === 'Observation.status');
  });

  describe('#setInstancePropertyByPath', () => {
    let fooCode: FshCode;
    let barCode: FshCode;
    beforeEach(() => {
      fooCode = new FshCode('foo', 'http://example.com');
      barCode = new FshCode('bar', 'http://example.com');
    });

    // Simple values
    it('should set an instance property which has a value', () => {
      status.setInstancePropertyByPath('short', 'foo', fisher);
      expect(status.short).toBe('foo');
    });

    it('should set an instance property which must be created', () => {
      status.setInstancePropertyByPath('label', 'foo', fisher);
      expect(status.label).toBe('foo');
    });

    it('should set a nested instance property which must be created', () => {
      // This isn't how you would normally do this, but it's useful for testing this part of the logic
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.setInstancePropertyByPath('patternQuantity.value', 1.2, fisher);
      expect(valueX.patternQuantity.value).toBe(1.2);
    });

    it('should set a Quantity on a Quantity specialization instance property (e.g., Age)', () => {
      // This isn't how you would normally do this, but it's useful for testing this part of the logic
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.setInstancePropertyByPath(
        'patternAge',
        new FshQuantity(42.0, new FshCode('a', 'http://unitsofmeasure.org')),
        fisher
      );
      expect(valueX.patternAge).toEqual({
        value: 42.0,
        code: 'a',
        system: 'http://unitsofmeasure.org'
      });
    });

    it('should not set an instance property which is being assigned incorrectly', () => {
      expect(() => {
        status.setInstancePropertyByPath('short', 1.2, fisher);
      }).toThrow('Cannot assign number value: 1.2. Value does not match element type: string');
      expect(status.short).toBe('registered | preliminary | final | amended +');
    });

    // Simple values in an array
    it('should add an instance property at the end of an array', () => {
      status.setInstancePropertyByPath('type[1].code', 'foo', fisher);
      expect(status.type.length).toBe(2);
      expect(status.type[1]).toEqual({ code: 'foo' });
    });

    it('should add an instance property in an array that must be empty filled', () => {
      status.setInstancePropertyByPath('type[2].code', 'foo', fisher);
      expect(status.type.length).toBe(3);
      expect(status.type[2]).toEqual({ code: 'foo' });
      expect(status.type[1]).toBeNull();
    });

    it('should add an instance property in an array that has been empty filled', () => {
      status.setInstancePropertyByPath('type[2].code', 'foo', fisher);
      status.setInstancePropertyByPath('type[1].code', 'bar', fisher);
      expect(status.type.length).toBe(3);
      expect(status.type[2]).toEqual({ code: 'foo' });
      expect(status.type[1]).toEqual({ code: 'bar' });
    });

    it('should change an instance property in an array', () => {
      status.setInstancePropertyByPath('type[0].code', 'foo', fisher);
      expect(status.type.length).toBe(1);
      expect(status.type[0]).toEqual(new ElementDefinitionType('foo'));
    });

    it('should change a part of an instance property in an array', () => {
      status.setInstancePropertyByPath('type[0].profile[0]', 'foo', fisher);
      expect(status.type.length).toBe(1);
      // setting an element in the profile array creates an empty element at the corresponding index in the _profile array
      const expectedType = new ElementDefinitionType('code').withProfiles('foo');
      expectedType._profile = [{}];
      expect(status.type[0]).toEqual(expectedType);
    });

    // Complex values
    it('should set a complex instance property on a newly created array', () => {
      status.setInstancePropertyByPath('code[0]', fooCode, fisher);
      expect(status.code.length).toBe(1);
      expect(status.code[0]).toEqual({ code: 'foo', system: 'http://example.com' });
    });

    it('should set a complex instance property on a newly created array, with implied 0 index', () => {
      status.setInstancePropertyByPath('code', fooCode, fisher);
      expect(status.code.length).toBe(1);
      expect(status.code[0]).toEqual({ code: 'foo', system: 'http://example.com' });
    });

    it('should set a complex instance property over a value that already exists', () => {
      status.setInstancePropertyByPath('code[0]', fooCode, fisher);
      status.setInstancePropertyByPath('code[0]', barCode, fisher);
      expect(status.code.length).toBe(1);
      expect(status.code[0]).toEqual({ code: 'bar', system: 'http://example.com' });
    });

    it('should set a complex instance property on an existing array', () => {
      status.setInstancePropertyByPath('code[0]', fooCode, fisher);
      status.setInstancePropertyByPath('code[1]', barCode, fisher);
      expect(status.code.length).toBe(2);
      expect(status.code[0]).toEqual({ code: 'foo', system: 'http://example.com' });
      expect(status.code[1]).toEqual({ code: 'bar', system: 'http://example.com' });
    });

    // Children of primitives
    it('should set a child of a primitive instance property which has a value', () => {
      status.setInstancePropertyByPath('short', 'foo', fisher);
      status.setInstancePropertyByPath('short.id', 'bar', fisher);
      expect(status.short).toBe('foo');
      // @ts-ignore
      expect(status._short.id).toBe('bar');
    });

    it('should set a child of a primitive instance property array which has a value', () => {
      status.setInstancePropertyByPath('alias[0]', 'foo', fisher);
      status.setInstancePropertyByPath('alias[0].id', 'bar', fisher);
      expect(status.alias.length).toBe(1);
      expect(status.alias[0]).toBe('foo');
      // @ts-ignore
      expect(status._alias[0].id).toBe('bar');
    });

    it('should set a child of a primitive instance property array and null fill the array', () => {
      status.setInstancePropertyByPath('alias[1]', 'foo', fisher);
      status.setInstancePropertyByPath('alias[1].id', 'bar', fisher);
      expect(status.alias.length).toBe(2);
      expect(status.alias[0]).toBeNull();
      expect(status.alias[1]).toBe('foo');
      // @ts-ignore
      expect(status._alias[0]).toBeNull();
      // @ts-ignore
      expect(status._alias[1].id).toBe('bar');
    });
  });
});
