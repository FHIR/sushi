/**
 * Removes white space in each non-empty line of a string, such that the first line is left-aligned
 * @param {string} inputFSH - The string to be made left-aligned
 * @returns {string} - The altered string
 */
export function leftAlign(inputFSH: string): string {
  const lineArray = inputFSH.split(/\r?\n/);
  let offsetAmount: number;
  const letterRegex = /[a-z]/i;

  for (const line of lineArray) {
    if (letterRegex.test(line)) {
      offsetAmount = line.search(/\S/);
      break;
    }
  }

  return lineArray.map(l => (l.length >= offsetAmount ? l.slice(offsetAmount) : l)).join('\n');
}
