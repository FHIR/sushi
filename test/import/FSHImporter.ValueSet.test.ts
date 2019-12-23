import { importText } from '../../src/import';
import {
  assertValueSetConceptComponent,
  assertValueSetFilterComponent
} from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FshCode } from '../../src/fshtypes';

describe('FSHImporter', () => {
  describe('ValueSet', () => {
    describe('#vsMetadata', () => {
      it('should parse a value set with additional metadata', () => {
        const input = `
        ValueSet: SimpleVS
        Id: SimpleVS_ID
        Title: "Simple Value Set"
        Description: "A simple value set for testing metadata"
        `;
        const result = importText(input, 'Simple.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('SimpleVS');
        expect(valueSet.name).toBe('SimpleVS');
        expect(valueSet.id).toBe('SimpleVS_ID');
        expect(valueSet.title).toBe('Simple Value Set');
        expect(valueSet.description).toBe('A simple value set for testing metadata');
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 5,
          endColumn: 62
        });
        expect(valueSet.sourceInfo.file).toBe('Simple.fsh');
      });
    });
    describe('#ValueSetConceptComponent', () => {
      it('should parse a value set with a concept specified as SYSTEM#code', () => {
        const input = `
        ValueSet: SimpleVS
        * ZOO#bear
        `;
        const result = importText(input, 'Simple.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('SimpleVS');
        expect(valueSet.name).toBe('SimpleVS');
        expect(valueSet.id).toBe('SimpleVS');
        expect(valueSet.description).toBeUndefined();
        expect(valueSet.components.length).toBe(1);
        assertValueSetConceptComponent(valueSet.components[0], 'ZOO', undefined, [
          new FshCode('bear', 'ZOO').withLocation([3, 11, 3, 18]).withFile('Simple.fsh')
        ]);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 18
        });
        expect(valueSet.sourceInfo.file).toBe('Simple.fsh');
      });

      it('should parse a value set with a concept specified as #code from SYSTEM', () => {
        const input = `
        ValueSet: ZooVS
        * #hippo "Hippopotamus" from system ZOO
        `;

        const result = importText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.components.length).toBe(1);
        assertValueSetConceptComponent(valueSet.components[0], 'ZOO', undefined, [
          new FshCode('hippo', 'ZOO', 'Hippopotamus')
            .withLocation([3, 11, 3, 31])
            .withFile('Zoo.fsh')
        ]);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 47
        });
        expect(valueSet.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should log an error when a concept component does not have a system', () => {
        const input = `
        ValueSet: ZooVS
        * #hippo
        `;
        const result = importText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.components.length).toBe(1);
        assertValueSetConceptComponent(valueSet.components[0], undefined, undefined, []);
        expect(loggerSpy.getLastMessage()).toMatch(/File: Zoo\.fsh.*Line: 3\D/s);
      });
      it('should log an error when a concept component has a system specified more than once', () => {
        const input = `
        ValueSet: ZooVS
        * ZOO#hippo from system ZOO
        `;
        const result = importText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.components.length).toBe(1);
        assertValueSetConceptComponent(valueSet.components[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage()).toMatch(/File: Zoo\.fsh.*Line: 3\D/s);
      });
    });
    describe('#ValueSetFilterComponent', () => {
      it('should parse a value set that includes all codes from a system', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO
        `;
        const result = importText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.components.length).toBe(1);
        assertValueSetFilterComponent(valueSet.components[0], 'ZOO', undefined, []);
      });
      it('should parse a value set that includes all codes from other value sets', () => {
        const input = `
        ValueSet: ZooVS
        * codes from valueset FirstZooVS
        * codes from valueset SecondZooVS, ThirdZooVS
        `;
        const result = importText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.components.length).toBe(2);
        assertValueSetFilterComponent(valueSet.components[0], undefined, ['FirstZooVS'], []);
        assertValueSetFilterComponent(
          valueSet.components[1],
          undefined,
          ['SecondZooVS', 'ThirdZooVS'],
          []
        );
      });

      it('should parse a value set that includes all codes from a system and other value sets', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO and valueset NorthZooVS, SouthZooVS
        `;
        const result = importText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.components.length).toBe(1);
        assertValueSetFilterComponent(
          valueSet.components[0],
          'ZOO',
          ['NorthZooVS', 'SouthZooVS'],
          []
        );
      });
      it.todo('should parse a value set that uses filter operator =');
      it.todo('should parse a value set that uses filter operator is-a');
      it.todo('should parse a value set that uses filter operator descendant-of');
      it.todo('should parse a value set that uses filter operator is-not-a');
      it.todo('should parse a value set that uses filter operator regex');
      it.todo('should parse a value set that uses filter operator in');
      it.todo('should parse a value set that uses filter operator not-in');
      it.todo('should parse a value set that uses filter operator generalizes');
      it.todo('should parse a value set that uses filter operator exists');
      it.todo('should parse a value set with an excluded component');
    });
  });
});
