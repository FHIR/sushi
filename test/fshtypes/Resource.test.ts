import 'jest-extended';
import { Resource } from '../../src/fshtypes/';
import { EOL } from 'os';
import { AddElementRule, BindingRule } from '../../src/fshtypes/rules';
describe('Resource', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const r = new Resource('MyResource');
      expect(r.name).toBe('MyResource');
      expect(r.id).toBe('MyResource');
      expect(r.parent).toBe('DomainResource');
      expect(r.title).toBeUndefined();
      expect(r.description).toBeUndefined();
      expect(r.rules).toBeEmpty();
    });

    it('should get the correct constructor name', () => {
      const r = new Resource('MyResource');
      expect(r.constructorName).toBe('Resource');
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest Resource', () => {
      const input = new Resource('MyResource');
      const expectedResult = ['Resource: MyResource', 'Id: MyResource'].join(EOL);
      expect(input.toFSH()).toEqual(expectedResult);
    });

    it('should produce FSH for a Resource with additional metadata', () => {
      const input = new Resource('MyResource');
      input.id = 'my-resource';
      input.title = 'My Resource';
      input.description = 'The new standard in resourcefulness.';
      const expectedResult = [
        'Resource: MyResource',
        'Id: my-resource',
        'Title: "My Resource"',
        'Description: "The new standard in resourcefulness."'
      ].join(EOL);
      expect(input.toFSH()).toEqual(expectedResult);
    });

    it('should produce FSH for a Resource with rules', () => {
      const input = new Resource('Cookie');
      const addElement = new AddElementRule('ingredient');
      addElement.min = 1;
      addElement.max = '*';
      addElement.summary = true;
      addElement.types.push({ type: 'CodeableConcept' });
      const bindingRule = new BindingRule('ingredient');
      bindingRule.valueSet = 'BakingVS';
      bindingRule.strength = 'preferred';
      input.rules.push(addElement, bindingRule);

      const expectedResult = [
        'Resource: Cookie',
        'Id: Cookie',
        '* ingredient 1..* SU CodeableConcept',
        '* ingredient from BakingVS (preferred)'
      ].join(EOL);
      expect(input.toFSH()).toEqual(expectedResult);
    });
  });
});
