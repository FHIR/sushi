import 'jest-extended';
import { Instance, FshCode } from '../../src/fshtypes';
import { AssignmentRule } from '../../src/fshtypes/rules';
import { EOL } from 'os';

describe('Instance', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Instance('MyInstance');
      expect(p.name).toBe('MyInstance');
      expect(p.id).toBe('MyInstance');
      expect(p.instanceOf).toBeUndefined();
      expect(p.title).toBeUndefined();
      expect(p.rules).toBeEmpty();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest Instance', () => {
      const i = new Instance('MyInstance');
      i.instanceOf = 'Patient';

      const expectedResult = [
        'Instance: MyInstance',
        'InstanceOf: Patient',
        'Usage: #example'
      ].join(EOL);
      expect(i.toFSH()).toBe(expectedResult);
    });

    it('should produce FSH for an instance with additional metadata', () => {
      const i = new Instance('MyInstance');
      i.instanceOf = 'Patient';
      i.title = 'My Patient Title';
      i.description = 'My Patient Description';

      const expectedResult = [
        'Instance: MyInstance',
        'InstanceOf: Patient',
        'Title: "My Patient Title"',
        'Description: "My Patient Description"',
        'Usage: #example'
      ].join(EOL);
      expect(i.toFSH()).toBe(expectedResult);
    });

    it('should produce FSH for an instance with assignment rules', () => {
      const exInstance = new Instance('MyInstance');
      exInstance.instanceOf = 'Observation';

      const statusRule = new AssignmentRule('status');
      const statusCode = new FshCode('final');
      statusRule.value = statusCode;
      exInstance.rules.push(statusRule);

      const dateRule = new AssignmentRule('effectiveDateTime');
      dateRule.value = '2019-04-01';
      exInstance.rules.push(dateRule);

      const expectedResult = [
        'Instance: MyInstance',
        'InstanceOf: Observation',
        'Usage: #example',
        '* status = #final',
        '* effectiveDateTime = "2019-04-01"'
      ].join(EOL);
      expect(exInstance.toFSH()).toBe(expectedResult);
    });
  });
});
