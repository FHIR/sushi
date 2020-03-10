import { assertFixedValueRule } from '../testhelpers/asserts';
import { FshCode } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { importSingleText } from '../testhelpers/importSingleText';

describe('FSHImporter', () => {
  describe('Instance', () => {
    describe('#instanceOf', () => {
      it('should parse the simplest possible instance', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        `;

        const result = importSingleText(input, 'SimpleInstance.fsh');
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.title).toBeUndefined();
        expect(instance.description).toBeUndefined();
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

        const result = importSingleText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
      });

      it('should not parse an instance that has no type', () => {
        const input = `
        Instance: MyObservation
        Title: "My Important Observation"
        `;

        const result = importSingleText(input, 'Missing.fsh');
        expect(result.instances.size).toBe(0);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Missing\.fsh.*Line: 2 - 3\D*/s);
      });
    });

    describe('#title', () => {
      it('should parse an instance with a title', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        Title: "My Important Observation"
        `;

        const result = importSingleText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.title).toBe('My Important Observation');
      });
    });

    describe('#description', () => {
      it('should parse an instance with a description', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        Description: "Shows an example of an Observation"
        `;

        const result = importSingleText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.description).toBe('Shows an example of an Observation');
      });
    });

    describe('#usage', () => {
      it('should parse an instance with a usage', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        Usage: Example
        `;

        const result = importSingleText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.usage).toBe('Example');
      });

      it('should log an error for invalid usage and set default usage to example', () => {
        const input = `
        Instance: MyBadObservation
        InstanceOf: Observation
        Usage: BadUse
        `;

        const result = importSingleText(input, 'Bad.fsh');
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyBadObservation');
        expect(instance.name).toBe('MyBadObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.usage).toBe('Example');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Invalid Usage. Supported usages are "Example" and "Definition". Instance will be treated as an Example./s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Bad\.fsh.*Line: 4\D*/s);
      });
    });

    describe('#rules', () => {
      it('should parse an instance with fixed value rules', () => {
        const input = `
        Instance: SamplePatient
        InstanceOf: Patient
        Title: "Georgio Manos"
        Description: "An example of a fictional patient named Georgio Manos"
        Usage: Example
        * name[0].family = "Georgio"
        * name[0].given[0] = "Manos"
        * gender = #other
        `;

        const result = importSingleText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('SamplePatient');
        expect(instance.instanceOf).toBe('Patient');
        expect(instance.title).toBe('Georgio Manos');
        expect(instance.description).toBe('An example of a fictional patient named Georgio Manos');
        expect(instance.usage).toBe('Example');
        expect(instance.rules.length).toBe(3);
        assertFixedValueRule(instance.rules[0], 'name[0].family', 'Georgio');
        assertFixedValueRule(instance.rules[1], 'name[0].given[0]', 'Manos');
        assertFixedValueRule(
          instance.rules[2],
          'gender',
          new FshCode('other').withLocation([9, 20, 9, 25]).withFile('')
        );
      });
    });

    describe('#instanceMetadata', () => {
      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        Title: "My Important Observation"
        Description: "My Observation Description"
        Usage: Example
        InstanceOf: DuplicateObservation
        Title: "My Duplicate Observation"
        Description: "My Duplicate Observation Description"
        Usage: Non-example
        `;

        const result = importSingleText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.title).toBe('My Important Observation');
        expect(instance.description).toBe('My Observation Description');
        expect(instance.usage).toBe('Example');
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        Title: "My Important Observation"
        Description: "My Observation Description"
        Usage: Example
        InstanceOf: DuplicateObservation
        Title: "My Duplicate Observation"
        Description: "My Duplicate Observation Description"
        Usage: Non-example
        `;

        importSingleText(input, 'Dupe.fsh');
        expect(loggerSpy.getMessageAtIndex(-4, 'error')).toMatch(/File: Dupe\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(/File: Dupe\.fsh.*Line: 8\D*/s);
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Dupe\.fsh.*Line: 9\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Dupe\.fsh.*Line: 10\D*/s);
      });
    });
  });
});
