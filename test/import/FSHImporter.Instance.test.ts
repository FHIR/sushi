import { importText } from '../../src/import';
import { assertFixedValueRule } from '../utils/asserts';
import { FshCode } from '../../src/fshtypes';
import { RequiredMetadataError } from '../../src/errors';

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

      it('should parse an instance with an aliased type', () => {
        const input = `
        Alias: obs = Observation
        Instance: MyObservation
        InstanceOf: obs
        `;

        const result = importText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
      });

      it('should throw an error when an instance has no type', () => {
        const input = `
        Instance: MyObservation
        Title: "My Important Observation"
        `;

        expect(() => {
          importText(input);
        }).toThrow(RequiredMetadataError);
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

    describe('#instanceMetadata', () => {
      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        Title: "My Important Observation"
        InstanceOf: DuplicateObservation
        Title: "My Duplicate Observation"
        `;

        const result = importText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.title).toBe('My Important Observation');
      });
    });
  });
});
