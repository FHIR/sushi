import {
  assertValueSetConceptComponent,
  assertValueSetFilterComponent,
  assertCaretValueRule,
  assertInsertRule
} from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FshCode, VsOperator } from '../../src/fshtypes';
import { importSingleText } from '../testhelpers/importSingleText';
import { Rule } from '../../src/fshtypes/rules';

describe('FSHImporter', () => {
  afterEach(() => loggerSpy.reset());
  describe('ValueSet', () => {
    describe('#vsMetadata', () => {
      it('should parse a value set with additional metadata', () => {
        const input = `
        ValueSet: SimpleVS
        Id: SimpleVS_ID
        Title: "Simple Value Set"
        Description: "A simple value set for testing metadata"
        `;
        const result = importSingleText(input, 'Simple.fsh');
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

      it('should parse a value set with numeric name and id', () => {
        const input = `
        ValueSet: 123
        Id: 456
        `;
        const result = importSingleText(input, 'Simple.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('123');
        expect(valueSet.name).toBe('123');
        expect(valueSet.id).toBe('456');
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        ValueSet: SimpleVS
        Id: SimpleVS_ID
        Title: "Simple Value Set"
        Description: "A simple value set for testing metadata"
        Id: DuplicateVS_ID
        Title: "Duplicate Value Set"
        Description: "A duplicate value set for testing metadata"
        `;
        const result = importSingleText(input, 'Dupe.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('SimpleVS');
        expect(valueSet.name).toBe('SimpleVS');
        expect(valueSet.id).toBe('SimpleVS_ID');
        expect(valueSet.title).toBe('Simple Value Set');
        expect(valueSet.description).toBe('A simple value set for testing metadata');
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 8,
          endColumn: 65
        });
        expect(valueSet.sourceInfo.file).toBe('Dupe.fsh');
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = `
        ValueSet: SimpleVS
        Id: SimpleVS_ID
        Title: "Simple Value Set"
        Description: "A simple value set for testing metadata"
        Id: DuplicateVS_ID
        Title: "Duplicate Value Set"
        Description: "A duplicate value set for testing metadata"
        `;
        importSingleText(input, 'Dupe.fsh');
        expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(/File: Dupe\.fsh.*Line: 6\D*/s);
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Dupe\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Dupe\.fsh.*Line: 8\D*/s);
      });

      it('should log an error and skip the value set when encountering a value set with a name used by another value set', () => {
        const input = `
        ValueSet: SimpleVS
        Title: "First Value Set"

        ValueSet: SimpleVS
        Title: "Second Value Set"
        `;
        const result = importSingleText(input, 'SameName.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('SimpleVS');
        expect(valueSet.title).toBe('First Value Set');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /ValueSet named SimpleVS already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: SameName\.fsh.*Line: 5 - 6\D*/s);
      });
    });

    describe('#ValueSetConceptComponent', () => {
      it('should parse a value set with a concept specified as SYSTEM#code', () => {
        const input = `
        ValueSet: SimpleVS
        * ZOO#bear
        `;
        const result = importSingleText(input, 'Simple.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('SimpleVS');
        expect(valueSet.name).toBe('SimpleVS');
        expect(valueSet.id).toBe('SimpleVS');
        expect(valueSet.description).toBeUndefined();
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], 'ZOO', undefined, [
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

      it('should ignore optional include for code components', () => {
        const input = `
        ValueSet: SimpleVS
        * include ZOO#bear
        `;
        const result = importSingleText(input, 'Simple.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('SimpleVS');
        expect(valueSet.name).toBe('SimpleVS');
        expect(valueSet.id).toBe('SimpleVS');
        expect(valueSet.description).toBeUndefined();
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], 'ZOO', undefined, [
          new FshCode('bear', 'ZOO').withLocation([3, 19, 3, 26]).withFile('Simple.fsh')
        ]);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 26
        });
        expect(valueSet.sourceInfo.file).toBe('Simple.fsh');
      });

      it('should parse a value set with a concept specified as #code from SYSTEM', () => {
        const input = `
        ValueSet: ZooVS
        * #hippo "Hippopotamus" from system ZOO
        `;

        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], 'ZOO', undefined, [
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

      it('should parse a value set with a concept specified from an aliased system', () => {
        const input = `
        Alias: AQ = http://aquarium.org

        ValueSet: ZooVS
        * #octopus "Octopus" from system AQ
        `;

        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], 'http://aquarium.org', undefined, [
          new FshCode('octopus', 'http://aquarium.org', 'Octopus')
            .withLocation([5, 11, 5, 28])
            .withFile('Zoo.fsh')
        ]);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 4,
          startColumn: 9,
          endLine: 5,
          endColumn: 43
        });
        expect(valueSet.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should parse a value set with a concept specified as #code from numeric named SYSTEM', () => {
        const input = `
        ValueSet: ZooVS
        * #hippo "Hippopotamus" from system 123
        `;

        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], '123', undefined, [
          new FshCode('hippo', '123', 'Hippopotamus')
            .withLocation([3, 11, 3, 31])
            .withFile('Zoo.fsh')
        ]);
      });

      it('should parse a value set with a list of concepts', () => {
        const input = `
        ValueSet: ZooVS
        * #hippo "Hippopotamus" and #crocodile "Crocodile" from system ZOO
        `;

        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], 'ZOO', undefined, [
          new FshCode('hippo', 'ZOO', 'Hippopotamus')
            .withLocation([3, 11, 3, 31])
            .withFile('Zoo.fsh'),
          new FshCode('crocodile', 'ZOO', 'Crocodile')
            .withLocation([3, 37, 3, 58])
            .withFile('Zoo.fsh')
        ]);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 74
        });
        expect(valueSet.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should merge concept rules when possible', () => {
        const input = `
        ValueSet: ZooVS
        * ZOO#hippo "Hippopotamus"
        * #crocodile "Crocodile" and #emu "Emu" from system ZOO
        * ZOO#alligator "Alligator" from valueset ReptileVS
        * CRYPTID#jackalope "Jackalope"
        * exclude ZOO#lion "Lion"
        * exclude #cobra "Cobra" from system ZOO
        * exclude ZOO#monitor "Monitor lizard" from valueset ReptileVS
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(5);
        assertValueSetConceptComponent(valueSet.rules[0], 'ZOO', undefined, [
          new FshCode('hippo', 'ZOO', 'Hippopotamus')
            .withLocation([3, 11, 3, 34])
            .withFile('Zoo.fsh'),
          new FshCode('crocodile', 'ZOO', 'Crocodile')
            .withLocation([4, 11, 4, 32])
            .withFile('Zoo.fsh'),
          new FshCode('emu', 'ZOO', 'Emu').withLocation([4, 38, 4, 47]).withFile('Zoo.fsh')
        ]);
        assertValueSetConceptComponent(
          valueSet.rules[1],
          'ZOO',
          ['ReptileVS'],
          [
            new FshCode('alligator', 'ZOO', 'Alligator')
              .withLocation([5, 11, 5, 35])
              .withFile('Zoo.fsh')
          ]
        );
        assertValueSetConceptComponent(valueSet.rules[2], 'CRYPTID', undefined, [
          new FshCode('jackalope', 'CRYPTID', 'Jackalope')
            .withLocation([6, 11, 6, 39])
            .withFile('Zoo.fsh')
        ]);
        assertValueSetConceptComponent(
          valueSet.rules[3],
          'ZOO',
          undefined,
          [
            new FshCode('lion', 'ZOO', 'Lion').withLocation([7, 19, 7, 33]).withFile('Zoo.fsh'),
            new FshCode('cobra', 'ZOO', 'Cobra').withLocation([8, 19, 8, 32]).withFile('Zoo.fsh')
          ],
          false
        );
        assertValueSetConceptComponent(
          valueSet.rules[4],
          'ZOO',
          ['ReptileVS'],
          [
            new FshCode('monitor', 'ZOO', 'Monitor lizard')
              .withLocation([9, 19, 9, 46])
              .withFile('Zoo.fsh')
          ],
          false
        );
      });

      it('should log an error when a concept component with one concept does not have a system', () => {
        const input = `
        ValueSet: ZooVS
        * #hippo
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], undefined, undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });

      it('should log an error when a concept component with a list of concepts does not have a system', () => {
        const input = `
        ValueSet: ZooVS
        * #hippo "Hippopotamus" and #crocodile "Crocodile"
        `;

        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], undefined, undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });

      it('should log an error when a concept component has a system specified more than once', () => {
        const input = `
        ValueSet: ZooVS
        * ZOO#hippo from system ZOO
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetConceptComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });

      it('should log an error when both include and exclude are used on the same line', () => {
        const input = `
        ValueSet: ZooVS
        * include exclude ZOO#bear
        `;
        importSingleText(input, 'Zoo.fsh');
        expect(loggerSpy.getLastMessage('error')).toMatch(/extraneous input/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });

      it('should log an error when concepts are listed with commas', () => {
        const input = `
        ValueSet: ZooVS
        * #hippo, #crocodile , #emu from system ZOO
        `;

        const result = importSingleText(input, 'Deprecated.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet).toBeDefined();
        expect(loggerSpy.getFirstMessage('error')).toMatch(
          /Using ',' to list items is no longer supported/s
        );
        expect(loggerSpy.getFirstMessage('error')).toMatch(/File: Deprecated\.fsh.*Line: 3\D*/s);
      });
    });

    describe('#ValueSetFilterComponent', () => {
      it('should parse a value set that includes all codes from a system', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 31
        });
        expect(valueSet.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should ignore optional include for filter components', () => {
        const input = `
        ValueSet: ZooVS
        * include codes from system ZOO
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 39
        });
        expect(valueSet.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should parse a value set that includes all codes from other value sets', () => {
        const input = `
        ValueSet: ZooVS
        * codes from valueset FirstZooVS
        * codes from valueset SecondZooVS and ThirdZooVS
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(2);
        assertValueSetFilterComponent(valueSet.rules[0], undefined, ['FirstZooVS'], []);
        assertValueSetFilterComponent(
          valueSet.rules[1],
          undefined,
          ['SecondZooVS', 'ThirdZooVS'],
          []
        );
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 4,
          endColumn: 56
        });
        expect(valueSet.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should parse a value set that includes all codes from an aliased value set', () => {
        const input = `
        Alias: Z1 = FirstZooVS

        ValueSet: ZooVS
        * codes from valueset Z1
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], undefined, ['FirstZooVS'], []);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 4,
          startColumn: 9,
          endLine: 5,
          endColumn: 32
        });
        expect(valueSet.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should parse a value set that includes all codes from numeric named value sets', () => {
        const input = `
        ValueSet: ZooVS
        * codes from valueset 123
        * codes from valueset 456 and 789
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(2);
        assertValueSetFilterComponent(valueSet.rules[0], undefined, ['123'], []);
        assertValueSetFilterComponent(valueSet.rules[1], undefined, ['456', '789'], []);
      });

      it('should parse a value set that includes all codes from a system and other value sets', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO and valueset NorthZooVS and SouthZooVS
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', ['NorthZooVS', 'SouthZooVS'], []);
        expect(valueSet.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 70
        });
        expect(valueSet.sourceInfo.file).toBe('Zoo.fsh');
      });

      it('should log an error when valuesets are listed with commas', () => {
        const input = `
        ValueSet: ZooVS
        * codes from valueset FirstZooVS, SecondZooVS
        `;

        const result = importSingleText(input, 'Deprecated.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet).toBeDefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Using ',' to list items is no longer supported/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Deprecated\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator = with string value', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where version = "2.0"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'version',
            operator: VsOperator.EQUALS,
            value: '2.0'
          }
        ]);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /match value of filter operator "=" must be a code/
        );
      });

      it('should parse a value set that uses filter operator = with code value', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where version = #two
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'version',
            operator: VsOperator.EQUALS,
            value: new FshCode('two').withLocation([3, 49, 3, 52]).withFile('Zoo.fsh')
          }
        ]);
      });

      it('should parse a value set that uses filter operator with numeric property name', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where 123 = "2.0"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: '123',
            operator: VsOperator.EQUALS,
            value: '2.0'
          }
        ]);
      });

      it('should log an error when the = filter has a non-string and non-code value', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where version = /[1-9].*/
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"=".*string/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator is-a', () => {
        const input = `
        ValueSet: AllUrsinesVS
        * codes from system ZOO where concept is-a #bear "Bear"
        `;
        const result = importSingleText(input, 'Ursines.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('AllUrsinesVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.IS_A,
            value: new FshCode('bear', undefined, 'Bear')
              .withLocation([3, 52, 3, 63])
              .withFile('Ursines.fsh')
          }
        ]);
      });

      it('should log an error when the is-a filter has a non-code value', () => {
        const input = `
        ValueSet: AllUrsinesVS
        * codes from system ZOO where concept is-a "Bear"
        `;
        const result = importSingleText(input, 'Ursines.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('AllUrsinesVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"is-a".*code/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Ursines\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator descendent-of', () => {
        const input = `
        ValueSet: AllFelinesVS
        * codes from system ZOO where concept descendent-of ZOO#cat
        `;
        const result = importSingleText(input, 'Felines.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('AllFelinesVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.DESCENDENT_OF,
            value: new FshCode('cat', 'ZOO', undefined)
              .withLocation([3, 61, 3, 67])
              .withFile('Felines.fsh')
          }
        ]);
      });

      it('should parse a value set that uses filter operator descendant-of, which is the same as descendent-of, but spelled correctly', () => {
        const input = `
        ValueSet: AllFelinesVS
        * codes from system ZOO where concept descendant-of ZOO#cat
        `;
        const result = importSingleText(input, 'Felines.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('AllFelinesVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.DESCENDENT_OF,
            value: new FshCode('cat', 'ZOO', undefined)
              .withLocation([3, 61, 3, 67])
              .withFile('Felines.fsh')
          }
        ]);
      });

      it('should log an error when the descendent-of filter has a non-code value', () => {
        const input = `
        ValueSet: AllFelinesVS
        * codes from system ZOO where concept descendent-of "Cat"
        `;
        const result = importSingleText(input, 'Felines.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('AllFelinesVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"descendent-of".*code/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Felines\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator is-not-a', () => {
        const input = `
        ValueSet: NonCanineVS
        * codes from system ZOO where concept is-not-a #dog
        `;
        const result = importSingleText(input, 'NonCanine.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('NonCanineVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.IS_NOT_A,
            value: new FshCode('dog', undefined, undefined)
              .withLocation([3, 56, 3, 59])
              .withFile('NonCanine.fsh')
          }
        ]);
      });

      it('should log an error when the is-not-a filter has a non-code value', () => {
        const input = `
        ValueSet: NonCanineVS
        * codes from system ZOO where concept is-not-a "dog"
        `;
        const result = importSingleText(input, 'NonCanine.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('NonCanineVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"is-not-a".*code/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: NonCanine\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator regex', () => {
        const input = `
        ValueSet: ProbablyDogsVS
        * codes from system ZOO where display regex /([Dd]og)|([Cc]anine)/
        `;
        const result = importSingleText(input, 'MostlyDogs.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ProbablyDogsVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'display',
            operator: VsOperator.REGEX,
            value: /([Dd]og)|([Cc]anine)/
          }
        ]);
      });

      it('should log an error when the regex filter has a non-regex value', () => {
        const input = `
        ValueSet: ProbablyDogsVS
        * codes from system ZOO where display regex "Dog|Canine"
        `;
        const result = importSingleText(input, 'MostlyDogs.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ProbablyDogsVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"regex".*regex/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: MostlyDogs\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator in with a string value', () => {
        const input = `
        ValueSet: CatAndDogVS
        * codes from system ZOO where concept in "#cat, #dog"
        `;
        const result = importSingleText(input, 'CatDog.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('CatAndDogVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.IN,
            value: '#cat, #dog'
          }
        ]);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /match value of filter operator "in" must be a code/
        );
      });

      it('should parse a value set that use filter operator in with a code value', () => {
        const input = `
        ValueSet: CatAndDogVS
        * codes from system ZOO where concept in ZOO#cat
        `;
        const result = importSingleText(input, 'CatDog.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('CatAndDogVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.IN,
            value: new FshCode('cat', 'ZOO').withLocation([3, 50, 3, 56]).withFile('CatDog.fsh')
          }
        ]);
      });

      it('should log an error when the in filter has a non-string or non-code value', () => {
        const input = `
        ValueSet: CatAndDogVS
        * codes from system ZOO where concept in true
        `;
        const result = importSingleText(input, 'CatDog.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('CatAndDogVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"in".*string/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: CatDog\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator not-in with a string value', () => {
        const input = `
        ValueSet: NoGooseVS
        * codes from system ZOO where concept not-in "#goose"
        `;
        const result = importSingleText(input, 'NoGoose.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('NoGooseVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.NOT_IN,
            value: '#goose'
          }
        ]);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /match value of filter operator "not-in" must be a code/
        );
      });

      it('should parse a value set that uses filter operator not-in with a code value', () => {
        const input = `
        ValueSet: NoGooseVS
        * codes from system ZOO where concept not-in #goose
        `;
        const result = importSingleText(input, 'NoGoose.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('NoGooseVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.NOT_IN,
            value: new FshCode('goose').withLocation([3, 54, 3, 59]).withFile('NoGoose.fsh')
          }
        ]);
      });

      it('should log an error when the not-in filter has a non-string and non-code value', () => {
        const input = `
        ValueSet: NoGooseVS
        * codes from system ZOO where concept not-in /duck|goose/
        `;
        const result = importSingleText(input, 'NoGoose.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('NoGooseVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"not-in".*string/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: NoGoose\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator generalizes', () => {
        const input = `
        ValueSet: MustelidVS
        * codes from system ZOO where concept generalizes #mustela-nivalis "least weasel"
        `;
        const result = importSingleText(input, 'Mustelids.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('MustelidVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'concept',
            operator: VsOperator.GENERALIZES,
            value: new FshCode('mustela-nivalis', undefined, 'least weasel')
              .withLocation([3, 59, 3, 89])
              .withFile('Mustelids.fsh')
          }
        ]);
      });

      it('should log an error when the generalizes filter has a non-code value', () => {
        const input = `
        ValueSet: MustelidVS
        * codes from system ZOO where concept generalizes "least weasel"
        `;
        const result = importSingleText(input, 'Mustelids.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('MustelidVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"generalizes".*code/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Mustelids\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses filter operator exists', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where display exists true
        * codes from system ZOO where version exists
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(2);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'display',
            operator: VsOperator.EXISTS,
            value: true
          }
        ]);
        assertValueSetFilterComponent(valueSet.rules[1], 'ZOO', undefined, [
          {
            property: 'version',
            operator: VsOperator.EXISTS,
            value: true
          }
        ]);
      });

      it('should parse a value set that chains filter operators', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where
          display exists true and
          variant exists false and
          extension exists true
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'display',
            operator: VsOperator.EXISTS,
            value: true
          },
          {
            property: 'variant',
            operator: VsOperator.EXISTS,
            value: false
          },
          {
            property: 'extension',
            operator: VsOperator.EXISTS,
            value: true
          }
        ]);
      });

      it('should log an error when the exists filter has a non-boolean value', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where display exists "display"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/"exists".*boolean/);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });

      it('should parse a value set that uses multiple filters on a single component', () => {
        const input = `
        ValueSet: ZooTwoVS
        * codes from system ZOO where version regex /2\\./ and display exists
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooTwoVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, [
          {
            property: 'version',
            operator: VsOperator.REGEX,
            value: /2\./
          },
          {
            property: 'display',
            operator: VsOperator.EXISTS,
            value: true
          }
        ]);
      });

      it('should parse a value set with an excluded component', () => {
        const input = `
        ValueSet: AvailableVS
        * codes from system ZOO
        * exclude codes from valueset UnavailableAnimalVS
        `;
        const result = importSingleText(input, 'Available.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('AvailableVS');
        expect(valueSet.rules.length).toBe(2);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        assertValueSetFilterComponent(
          valueSet.rules[1],
          undefined,
          ['UnavailableAnimalVS'],
          [],
          false
        );
      });

      it('should log an error when a filter has an invalid operator', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where display resembles "cat"
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });

      it('should log an error when a filter (other than the exists filter) has no value', () => {
        const input = `
        ValueSet: ZooVS
        * codes from system ZOO where display regex
        `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], 'ZOO', undefined, []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });

      it('should log an error when a filter component has at least one filter, but no system', () => {
        const input = `
          ValueSet: ZooVS
          * codes from valueset OtherZooVS where version = "2.0"
          `;
        const result = importSingleText(input, 'Zoo.fsh');
        expect(result.valueSets.size).toBe(1);
        const valueSet = result.valueSets.get('ZooVS');
        expect(valueSet.rules.length).toBe(1);
        assertValueSetFilterComponent(valueSet.rules[0], undefined, ['OtherZooVS'], []);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Zoo\.fsh.*Line: 3\D*/s);
      });
    });

    describe('#ValueSetCaretValueRule', () => {
      it('should parse a value set that uses a CaretValueRule', () => {
        const input = `
          ValueSet: ZooVS
          * ^publisher = "foo"
          `;
        const result = importSingleText(input);
        const valueSet = result.valueSets.get('ZooVS');
        assertCaretValueRule(valueSet.rules[0] as Rule, '', 'publisher', 'foo', false);
      });

      it('should parse a value set that uses CaretValueRules alongside rules', () => {
        const input = `
        ValueSet: SimpleVS
        * ZOO#bear
        * ^publisher = "foo"
        `;
        const result = importSingleText(input, 'Simple.fsh');
        const valueSet = result.valueSets.get('SimpleVS');
        assertValueSetConceptComponent(valueSet.rules[0], 'ZOO', undefined, [
          new FshCode('bear', 'ZOO').withLocation([3, 11, 3, 18]).withFile('Simple.fsh')
        ]);
        assertCaretValueRule(valueSet.rules[1] as Rule, '', 'publisher', 'foo', false);
      });

      it('should log an error when a CaretValueRule contains a path before ^', () => {
        const input = `
        ValueSet: SimpleVS
        * mypath ^publisher = "foo"
        `;
        const result = importSingleText(input, 'Simple.fsh');
        const valueSet = result.valueSets.get('SimpleVS');
        expect(valueSet.rules).toHaveLength(0);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Simple\.fsh.*Line: 3\D*/s);
      });
    });

    describe('#insertRule', () => {
      it('should parse an insert rule with a single RuleSet', () => {
        const input = `
        ValueSet: MyVS
        * insert MyRuleSet
        `;
        const result = importSingleText(input, 'Insert.fsh');
        const vs = result.valueSets.get('MyVS');
        expect(vs.rules).toHaveLength(1);
        assertInsertRule(vs.rules[0] as Rule, 'MyRuleSet');
      });
    });
  });
});
