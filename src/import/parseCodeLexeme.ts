import { FshCode } from '../fshtypes';

/**
 * Parses the FSH code string and creates a FshCode, accomodating for escaped # and quoted codes.
 * NOTE: This does not accomodate aliases for the code system.  Alias checking should be done after
 * this parse. In addition, this handles only the system and code (not display)
 *
 * @param {string} conceptText - a concept in FSH syntax but with display excluded
 * @returns {FshCode} the parse FshCode
 */
export function parseCodeLexeme(conceptText: string): FshCode {
  const splitPoint = conceptText.match(/(^|[^\\])(\\\\)*#/);
  let system: string, code: string;
  if (splitPoint == null) {
    system = '';
    code = conceptText.startsWith('#') ? conceptText.slice(1) : '';
  } else {
    system = conceptText.slice(0, splitPoint.index) + splitPoint[0].slice(0, -1);
    code = conceptText.slice(splitPoint.index + splitPoint[0].length);
  }
  system = system.replace(/\\\\/g, '\\').replace(/\\#/g, '#');
  if (code.startsWith('"')) {
    code = code
      .slice(1, code.length - 1)
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"');
  }
  const concept = new FshCode(code);
  if (system.length > 0) {
    concept.system = system;
  }
  return concept;
}
