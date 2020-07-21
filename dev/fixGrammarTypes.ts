/**
 * The purpose of this script is to clean up the type definition files generated
 * by tsc for the antlr-generated grammar js files (src/import/generated). Type definition files
 * are needed for fsh-sushi to be usable as an import, but the type definition files produced
 * by tsc contain errors. This is because the antlr-generated js files use function-style
 * class declarations.
 *
 * Fortunately, the errors exhibit two regular patterns:
 *
 * 1. Extraneous constructor types added to class definitions. These are simply removed.
 *
 * 2. Exported types are exported as a var rather than as a class and constructor function.
 * The original "export var" is removed, and the empty object export that shows up at the end
 * of each file is populated with the names of the types to export.
 */

import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import { EOL } from 'os';

const generatedPath = path.join(__dirname, '..', 'dist', 'import', 'generated');
const exportRe = /^export var ([^:]+):.*$/;
const constructorRe = /^\s*constructor: .*$/;
const emptyExportRe = /^export {}/;

for (const gfile of fs.readdirSync(generatedPath)) {
  if (gfile.endsWith('.d.ts')) {
    fixTypes(gfile);
  }
}

// mostly copied from official documentation:
// https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
async function fixTypes(filename: string) {
  const inputStream = fs.createReadStream(path.join(generatedPath, filename));
  const reader = readline.createInterface({
    input: inputStream
  });
  const desiredExports: string[] = [];
  const outputLines: string[] = [];

  for await (const line of reader) {
    const exportMatch = line.match(exportRe);
    if (exportMatch) {
      desiredExports.push(exportMatch[1]);
    } else if (!line.match(constructorRe) && !line.match(emptyExportRe)) {
      outputLines.push(line);
    }
  }

  outputLines.push(`export { ${desiredExports.join(', ')} }`);

  inputStream.close();
  fs.writeFileSync(path.join(generatedPath, filename), outputLines.join(EOL));
}
