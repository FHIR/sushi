import { importText } from '../../src/import';
import { assertFixedValueRule } from '../utils/asserts';
import { FshCode } from '../../src/fshtypes';

describe('FSHImporter', () => {
  describe('Instance', () => {
    describe('#instanceOf', () => {
      it('should parse the simplest possible instance', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        `;

        const result = importText(input, 'SimpleInstance.fsh');
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.title).toBeUndefined();
        expect(instance.rules.length).toBe(0);
        expect(instance.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 31
        });
        expect(instance.sourceInfo.file).toBe('SimpleInstance.fsh');
      });
    });

    describe('#title', () => {
      it('should parse an instance with a title', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        Title: "My Important Observation"
        `;

        const result = importText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.title).toBe('My Important Observation');
      });
    });

    describe('#rules', () => {
      it('should parse an instance with fixed value rules', () => {
        const input = `
        Instance: SamplePatient
        InstanceOf: Patient
        Title: "Georgio Manos"
        * name[0].family = "Georgio"
        * name[0].given[0] = "Manos"
        * gender = #other
        `;

        const result = importText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('SamplePatient');
        expect(instance.rules.length).toBe(3);
        assertFixedValueRule(instance.rules[0], 'name[0].family', 'Georgio');
        assertFixedValueRule(instance.rules[1], 'name[0].given[0]', 'Manos');
        assertFixedValueRule(
          instance.rules[2],
          'gender',
          new FshCode('other').withLocation([7, 20, 7, 25]).withFile('')
        );
      });
    });
  });
});
