import { importText } from '../../src/import';

describe('FSHImporter', () => {
  describe('Instance', () => {
    describe('#instanceOf', () => {
      it('should parse the simplest possible instance', () => {
        const input = `
        Instance: MyObservation
        InstanceOf: Observation
        `;

        const result = importText(input);
        expect(result.instances.size).toBe(1);
        const instance = result.instances.get('MyObservation');
        expect(instance.name).toBe('MyObservation');
        expect(instance.instanceOf).toBe('Observation');
        expect(instance.title).toBeUndefined();
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
  });
});
