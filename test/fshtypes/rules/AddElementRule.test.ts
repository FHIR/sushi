import 'jest-extended';
import { AddElementRule } from '../../../src/fshtypes/rules/AddElementRule';

describe('AddElementRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const r = new AddElementRule('component.code');
      expect(r.path).toBe('component.code');
      expect(r.min).toBeUndefined();
      expect(r.max).toBeUndefined();
      expect(r.types).toEqual([]);
      expect(r.mustSupport).toBeUndefined();
      expect(r.summary).toBeUndefined();
      expect(r.modifier).toBeUndefined();
      expect(r.trialUse).toBeUndefined();
      expect(r.normative).toBeUndefined();
      expect(r.draft).toBeUndefined();
      expect(r.short).toBeUndefined();
      expect(r.definition).toBeUndefined();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for an AddElementRule with cardinality and one type', () => {
      const rule = new AddElementRule('barley');
      rule.min = 0;
      rule.max = '*';
      rule.types.push({
        type: 'Quantity'
      });
      const expectedFSH = '* barley 0..* Quantity';
      expect(rule.toFSH()).toEqual(expectedFSH);
    });

    it('should produce FSH for an AddElementRule that contains flags', () => {
      const rule = new AddElementRule('road.brick');
      rule.min = 0;
      rule.max = '7';
      rule.types.push({
        type: 'Material',
        isReference: true
      });
      rule.modifier = true;
      rule.draft = true;
      const expectedFSH = '* road.brick 0..7 ?! D Reference(Material)';
      expect(rule.toFSH()).toEqual(expectedFSH);
    });

    it('should produce FSH for an AddElementRule that contains short text', () => {
      const rule = new AddElementRule('barley');
      rule.min = 0;
      rule.max = '*';
      rule.types.push({
        type: 'Quantity'
      });
      rule.short = 'Fresh barley';
      const expectedFSH = '* barley 0..* Quantity "Fresh barley" "Fresh barley"';
      expect(rule.toFSH()).toEqual(expectedFSH);
    });

    it('should produce FSH for an AddElementRule that contains short and definition text', () => {
      const rule = new AddElementRule('barley');
      rule.min = 0;
      rule.max = '*';
      rule.types.push({
        type: 'Quantity'
      });
      rule.short = 'Fresh barley';
      rule.definition = 'Barley, one of the known ancient grains.';
      const expectedFSH =
        '* barley 0..* Quantity "Fresh barley" "Barley, one of the known ancient grains."';
      expect(rule.toFSH()).toEqual(expectedFSH);
    });

    it('should produce FSH for an AddElementRule that contains multiple types', () => {
      const rule = new AddElementRule('barley');
      rule.min = 0;
      rule.max = '*';
      rule.types.push(
        {
          type: 'Quantity'
        },
        {
          type: 'Specimen',
          isReference: true
        }
      );
      const expectedFSH = '* barley 0..* Quantity or Reference(Specimen)';
      expect(rule.toFSH()).toEqual(expectedFSH);
    });

    it('should produce FSH for an AddElementRule that contains flags, multiple types, short text, and definition text', () => {
      const rule = new AddElementRule('barley');
      rule.min = 0;
      rule.max = '*';
      rule.types.push(
        {
          type: 'Quantity'
        },
        {
          type: 'Specimen',
          isReference: true
        }
      );
      rule.trialUse = true;
      rule.mustSupport = true;
      rule.short = 'Fresh barley';
      rule.definition = 'Barley, one of the "ancient grains."';
      const expectedFSH =
        '* barley 0..* MS TU Quantity or Reference(Specimen) "Fresh barley" "Barley, one of the \\"ancient grains.\\""';
      expect(rule.toFSH()).toEqual(expectedFSH);
    });
  });
});
