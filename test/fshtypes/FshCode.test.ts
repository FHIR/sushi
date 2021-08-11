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
    it('should return a string for a basic code', () => {
      const code = new FshCode('my-code');
      const result = code.toString();
      expect(result).toEqual('#my-code');
    });

    it('should return a string for a code with system', () => {
      const code = new FshCode('my-code', 'http://foo.com');
      const result = code.toString();
      expect(result).toEqual('http://foo.com#my-code');
    });

    it('should return a string for a code with display', () => {
      const code = new FshCode('my-code', null, 'Display');
      const result = code.toString();
      expect(result).toEqual('#my-code "Display"');
    });

    it('should return a string for a code with system and display', () => {
      const code = new FshCode('my-code', 'http://foo.com', 'Display');
      const result = code.toString();
      expect(result).toEqual('http://foo.com#my-code "Display"');
    });

    it('should return a string for a code with spaces', () => {
      const code = new FshCode('my spacey code');
      const result = code.toString();
      expect(result).toEqual('#"my spacey code"');
    });

    it('should return a string for a code with tabs', () => {
      const code = new FshCode('my\ttabby\tcode');
      const result = code.toString();
      expect(result).toEqual('#"my\\ttabby\\tcode"');
    });

    it('should return a string for a code where the code has non-whitespace characters that must be escaped', () => {
      const code = new FshCode('strange\\ "code"');
      const result = code.toString();
      expect(result).toEqual('#"strange\\\\ \\"code\\""');
    });

    it('should return a string for a code with a display where the display has non-whitespace characters that must be escaped', () => {
      const code = new FshCode('strange-display', null, 'very "strange"\\display');
      const result = code.toString();
      expect(result).toEqual('#strange-display "very \\"strange\\"\\\\display"');
    });
  });
});
