import 'jest-extended';
import { Logical } from '../../src/fshtypes/';
import { EOL } from 'os';
import { AddElementRule, ObeysRule } from '../../src/fshtypes/rules';

describe('Logical', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const l = new Logical('MyLogical');
      expect(l.name).toBe('MyLogical');
      expect(l.id).toBe('MyLogical');
      expect(l.parent).toBe('Base');
      expect(l.title).toBeUndefined();
      expect(l.description).toBeUndefined();
      expect(l.rules).toBeEmpty();
    });

    it('should get the correct constructor name', () => {
      const l = new Logical('MyLogical');
      expect(l.constructorName).toBe('Logical');
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest Logical model', () => {
      const input = new Logical('MyModel');
      const expectedResult = ['Logical: MyModel', 'Parent: Base', 'Id: MyModel'].join(EOL);
      expect(input.toFSH()).toEqual(expectedResult);
    });

    it('should produce FSH for a Logical model with additional metadata', () => {
      const input = new Logical('MyModel');
      input.id = 'my-model';
      input.title = 'My Model';
      input.description = 'A new model for logical modeling.';
      input.characteristics = ['can-be-target', 'has-size', 'has-length'];
      const expectedResult = [
        'Logical: MyModel',
        'Parent: Base',
        'Id: my-model',
        'Title: "My Model"',
        'Description: "A new model for logical modeling."',
        'Characteristics: #can-be-target, #has-size, #has-length'
      ].join(EOL);
      expect(input.toFSH()).toEqual(expectedResult);
    });

    it('should produce FSH for a Logical model with rules', () => {
      const input = new Logical('MyModel');
      const addElement = new AddElementRule('feature');
      addElement.min = 0;
      addElement.max = '11';
      addElement.types.push({ type: 'Procedure', isReference: true });
      const obeysRule = new ObeysRule('feature');
      obeysRule.invariant = 'mm-1';
      input.rules.push(addElement, obeysRule);

      const expectedResult = [
        'Logical: MyModel',
        'Parent: Base',
        'Id: MyModel',
        '* feature 0..11 Reference(Procedure)',
        '* feature obeys mm-1'
      ].join(EOL);
      expect(input.toFSH()).toEqual(expectedResult);
    });
  });
});
