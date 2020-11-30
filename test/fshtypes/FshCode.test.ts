import { FshCode } from '../../src/fshtypes';

describe('FshCode', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new FshCode('my-code', 'http://important.com', 'My Important Code');
      expect(p.code).toBe('my-code');
      expect(p.system).toBe('http://important.com');
      expect(p.display).toBe('My Important Code');
    });
  });

  describe('#toString', () => {
    it('should return string for basic code', () => {
      const code = new FshCode('my-code');
      const result = code.toString();
      expect(result).toEqual('#my-code');
    });

    it('should return string for code with system', () => {
      const code = new FshCode('my-code', 'http://foo.com');
      const result = code.toString();
      expect(result).toEqual('http://foo.com#my-code');
    });

    it('should return string for code with display', () => {
      const code = new FshCode('my-code', null, 'Display');
      const result = code.toString();
      expect(result).toEqual('#my-code "Display"');
    });

    it('should return string for code with system and display', () => {
      const code = new FshCode('my-code', 'http://foo.com', 'Display');
      const result = code.toString();
      expect(result).toEqual('http://foo.com#my-code "Display"');
    });

    it('should return string for code with code with spaces', () => {
      const code = new FshCode('my spacey code');
      const result = code.toString();
      expect(result).toEqual('#"my spacey code"');
    });
  });
});
