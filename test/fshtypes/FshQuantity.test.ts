import { FshCode, FshQuantity } from '../../src/fshtypes';

describe('FshQuantity', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const quantity = new FshQuantity(
        100,
        new FshCode('mm', 'http://unitsofmeasure.org', 'millimeters')
      );
      expect(quantity.value).toBe(100);
      expect(quantity.unit.code).toBe('mm');
      expect(quantity.unit.system).toBe('http://unitsofmeasure.org');
      expect(quantity.unit.display).toBe('millimeters');
    });
  });

  describe('#toString', () => {
    it('should return string for quantity without unit', () => {
      const quantity = new FshQuantity(100);
      const result = quantity.toString();
      expect(result).toEqual('100');
    });

    it('should return string for basic unit code', () => {
      const code = new FshCode('mm');
      const quantity = new FshQuantity(100, code);
      const result = quantity.toString();
      expect(result).toEqual('100 #mm');
    });

    it('should return string for unit code with UCUM system', () => {
      const code = new FshCode('mm', 'http://unitsofmeasure.org');
      const quantity = new FshQuantity(100, code);
      const result = quantity.toString();
      expect(result).toEqual("100 'mm'");
    });

    it('should return string for unit code with non-UCUM system', () => {
      const code = new FshCode('bar', 'http://foo.com');
      const quantity = new FshQuantity(100, code);
      const result = quantity.toString();
      expect(result).toEqual('100 http://foo.com#bar');
    });

    it('should return string for unit code with display', () => {
      const code = new FshCode('mm', null, 'Display');
      const quantity = new FshQuantity(100, code);
      const result = quantity.toString();
      expect(result).toEqual('100 #mm "Display"');
    });

    it('should return string for unit code with UCUM system and display', () => {
      const code = new FshCode('mm', 'http://unitsofmeasure.org', 'Display');
      const quantity = new FshQuantity(100, code);
      const result = quantity.toString();
      expect(result).toEqual('100 \'mm\' "Display"');
    });

    it('should return string for unit code with non-UCUM system and display', () => {
      const code = new FshCode('bar', 'http://foo.com', 'Display');
      const quantity = new FshQuantity(100, code);
      const result = quantity.toString();
      expect(result).toEqual('100 http://foo.com#bar "Display"');
    });

    it('should return string for unit code with code with spaces', () => {
      const code = new FshCode('milli meters');
      const quantity = new FshQuantity(100, code);
      const result = quantity.toString();
      expect(result).toEqual('100 #"milli meters"');
    });

    it('should return a string for a unit code with UCUM system and a display containing characters that must be escaped', () => {
      const code = new FshCode('mm', 'http://unitsofmeasure.org', 'strange" display\\');
      const quantity = new FshQuantity(100, code);
      const result = quantity.toString();
      expect(result).toEqual('100 \'mm\' "strange\\" display\\\\"');
    });
  });
});
