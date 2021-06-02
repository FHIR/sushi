import { EOL } from 'os';
import 'jest-extended';
import { Profile } from '../../src/fshtypes/Profile';
import { CardRule, FlagRule, BindingRule, ObeysRule } from '../../src/fshtypes/rules';
describe('Profile', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Profile('MyProfile');
      expect(p.name).toBe('MyProfile');
      expect(p.id).toBe('MyProfile');
      expect(p.parent).toBeUndefined();
      expect(p.rules).toBeEmpty();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest profile', () => {
      const input = new Profile('SimpleProfile');

      const expectedResult = ['Profile: SimpleProfile', 'Id: SimpleProfile'].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a profile with additional metadata', () => {
      const input = new Profile('MyObservation');
      input.parent = 'Observation';
      input.id = 'my-observation';
      input.title = 'My Observation';
      input.description = 'My profile on Observation.';

      const expectedResult = [
        'Profile: MyObservation',
        'Parent: Observation',
        'Id: my-observation',
        'Title: "My Observation"',
        'Description: "My profile on Observation."'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a profile with metadata that contains characters that are escaped in FSH', () => {
      const input = new Profile('NewlineProfile');
      input.id = 'newline-profile';
      input.title = 'This title\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';
      input.description =
        'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

      const expectedResult = [
        'Profile: NewlineProfile',
        'Id: newline-profile',
        'Title: "This title\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"',
        'Description: """This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?"""'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a profile with rules', () => {
      const input = new Profile('MyPatient');
      input.parent = 'Patient';

      const cardRule = new CardRule('name');
      cardRule.min = 2;
      cardRule.max = '8';
      input.rules.push(cardRule);

      const flagRule = new FlagRule('active');
      flagRule.mustSupport = true;
      flagRule.summary = true;
      input.rules.push(flagRule);

      const bindingRule = new BindingRule('maritalStatus');
      bindingRule.valueSet = 'http://example.org/ValueSet/MaritalStatus';
      bindingRule.strength = 'required';
      input.rules.push(bindingRule);

      const obeysRule = new ObeysRule('contact');
      obeysRule.invariant = 'myp-1';
      input.rules.push(obeysRule);

      const expectedResult = [
        'Profile: MyPatient',
        'Parent: Patient',
        'Id: MyPatient',
        '* name 2..8',
        '* active MS SU',
        '* maritalStatus from http://example.org/ValueSet/MaritalStatus (required)',
        '* contact obeys myp-1'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });
  });
});
