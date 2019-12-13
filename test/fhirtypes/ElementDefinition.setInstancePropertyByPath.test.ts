import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ElementDefinition, ElementDefinitionType } from '../../src/fhirtypes/ElementDefinition';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { getResolver } from '../testhelpers/getResolver';
import { FshCode } from '../../src/fshtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  let status: ElementDefinition;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
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
      status.setInstancePropertyByPath('short', 'foo', getResolver(defs));
      expect(status.short).toBe('foo');
    });

    it('should set an instance property which must be created', () => {
      status.setInstancePropertyByPath('label', 'foo', getResolver(defs));
      expect(status.label).toBe('foo');
    });

    it('should set a nested instance property which must be created', () => {
      status.setInstancePropertyByPath('patternQuantity.value', 1.2, getResolver(defs));
      expect(status.patternQuantity.value).toBe(1.2);
    });

    it('should not set an instance property which is being fixed incorrectly', () => {
      expect(() => {
        status.setInstancePropertyByPath('short', 1.2, getResolver(defs));
      }).toThrow('Cannot fix number value: 1.2. Value does not match element type: string');
      expect(status.short).toBe('registered | preliminary | final | amended +');
    });

    // Simple values in an array
    it('should add an instance property at the end of an array', () => {
      status.setInstancePropertyByPath('type[1].code', 'foo', getResolver(defs));
      expect(status.type.length).toBe(2);
      expect(status.type[1]).toEqual({ code: 'foo' });
    });

    it('should add an instance property in an array that must be empty filled', () => {
      status.setInstancePropertyByPath('type[2].code', 'foo', getResolver(defs));
      expect(status.type.length).toBe(3);
      expect(status.type[2]).toEqual({ code: 'foo' });
      expect(status.type[1]).toBeUndefined();
    });

    it('should change an instance property in an array', () => {
      status.setInstancePropertyByPath('type[0].code', 'foo', getResolver(defs));
      expect(status.type.length).toBe(1);
      expect(status.type[0]).toEqual(new ElementDefinitionType('foo'));
    });

    it('should change a part of an instance property in an array', () => {
      status.setInstancePropertyByPath('type[0].profile[0]', 'foo', getResolver(defs));
      expect(status.type.length).toBe(1);
      expect(status.type[0]).toEqual(new ElementDefinitionType('code').withProfiles('foo'));
    });

    // Complex values
    it('should set a complex instance property on a newly created array', () => {
      status.setInstancePropertyByPath('code[0]', fooCode, getResolver(defs));
      expect(status.code.length).toBe(1);
      expect(status.code[0]).toEqual({ code: 'foo', system: 'http://example.com' });
    });

    it('should set a complex instance property on a newly created array, with implied 0 index', () => {
      status.setInstancePropertyByPath('code', fooCode, getResolver(defs));
      expect(status.code.length).toBe(1);
      expect(status.code[0]).toEqual({ code: 'foo', system: 'http://example.com' });
    });

    it('should set a complex instance property over a value that already exists', () => {
      status.setInstancePropertyByPath('code[0]', fooCode, getResolver(defs));
      status.setInstancePropertyByPath('code[0]', barCode, getResolver(defs));
      expect(status.code.length).toBe(1);
      expect(status.code[0]).toEqual({ code: 'bar', system: 'http://example.com' });
    });

    it('should set a complex instance property on an existing array', () => {
      status.setInstancePropertyByPath('code[0]', fooCode, getResolver(defs));
      status.setInstancePropertyByPath('code[1]', barCode, getResolver(defs));
      expect(status.code.length).toBe(2);
      expect(status.code[0]).toEqual({ code: 'foo', system: 'http://example.com' });
      expect(status.code[1]).toEqual({ code: 'bar', system: 'http://example.com' });
    });
  });
});
