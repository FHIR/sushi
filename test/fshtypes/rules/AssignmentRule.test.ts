import 'jest-extended';
import { AssignmentRule } from '../../../src/fshtypes/rules/AssignmentRule';
import { FshCode, FshQuantity, FshRatio, FshReference } from '../../../src/fshtypes';
import { InstanceDefinition } from '../../../src/fhirtypes';

describe('AssignmentRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new AssignmentRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.value).toBeUndefined();
      expect(c.exactly).toBeUndefined();
      expect(c.isInstance).toBeUndefined();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for an AssignmentRule with a value that matches exactly', () => {
      const rule = new AssignmentRule('valueInteger');
      rule.value = 5;
      rule.exactly = true;
      expect(rule.toFSH()).toEqual('* valueInteger = 5 (exactly)');
    });

    it('should produce FSH for an AssignmentRule with a boolean value', () => {
      const rule = new AssignmentRule('valueBoolean');
      rule.value = true;
      expect(rule.toFSH()).toEqual('* valueBoolean = true');
    });

    it('should produce FSH for an AssignmentRule with a number value', () => {
      const rule = new AssignmentRule('valueDecimal');
      rule.value = 1.21;
      expect(rule.toFSH()).toEqual('* valueDecimal = 1.21');
    });

    it('should produce FSH for an AssignmentRule with a string value', () => {
      const rule = new AssignmentRule('note.text');
      rule.value = 'This is the "note text".\nThis is the second line.';
      expect(rule.toFSH()).toEqual(
        '* note.text = "This is the \\"note text\\".\\nThis is the second line."'
      );
    });

    it('should produce FSH for an AssignmentRule with a FshCode value for a code element', () => {
      const rule = new AssignmentRule('status');
      rule.value = new FshCode('final');
      expect(rule.toFSH()).toEqual('* status = #final');
    });

    it('should produce FSH for an AssignmentRule with a FshCode value for a CodeableConcept element', () => {
      const rule = new AssignmentRule('code');
      rule.value = new FshCode('573', 'http://example.com/codes', 'speed setting \\"high\\"');
      expect(rule.toFSH()).toEqual(
        '* code = http://example.com/codes#573 "speed setting \\"high\\""'
      );
    });

    it('should produce FSH for an AssignmentRule with a FshQuantity value', () => {
      const rule = new AssignmentRule('valueQuantity');
      rule.value = new FshQuantity(1.21, new FshCode('GW', 'http://unitsofmeasure.org'));
      expect(rule.toFSH()).toEqual("* valueQuantity = 1.21 'GW'");
    });

    it('should produce FSH for an AssignmentRule with a FshRatio value', () => {
      const rule = new AssignmentRule('valueRatio');
      rule.value = new FshRatio(
        new FshQuantity(5, new FshCode('cm', 'http://unitsofmeasure.org')),
        new FshQuantity(1, new FshCode('s', 'http://unitsofmeasure.org'))
      );
      expect(rule.toFSH()).toEqual("* valueRatio = 5 'cm' : 1 's'");
    });

    it('should produce FSH for an AssignmentRule with a FshReference value', () => {
      const rule = new AssignmentRule('subject');
      rule.value = new FshReference('http://example.com/PaulBunyan', 'Paul Bunyan');
      expect(rule.toFSH()).toEqual(
        '* subject = Reference(http://example.com/PaulBunyan) "Paul Bunyan"'
      );
    });

    it('should produce FSH for an AssignmentRule with an InstanceDefinition value', () => {
      const rule = new AssignmentRule('note');
      const value = new InstanceDefinition();
      value.resourceType = 'Annotation';
      value.id = 'Annotation0';
      rule.value = value;
      rule.isInstance = true;
      expect(rule.toFSH()).toEqual('* note = Annotation0');
    });
  });
});
