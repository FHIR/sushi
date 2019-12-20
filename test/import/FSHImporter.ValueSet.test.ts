import { importText } from '../../src/import';
import { assertValueSetConceptComponent } from '../testhelpers/asserts';
import { FshCode } from '../../src/fshtypes';

describe('FSHImporter', () => {
  describe('ValueSet', () => {
    describe('#ValueSetConceptComponent', () => {
      it('should parse a value set with a single concept', () => {
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
        const conceptComponent = valueSet.components[0];
        assertValueSetConceptComponent(conceptComponent, 'ZOO', undefined, [
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
    });
  });
});
