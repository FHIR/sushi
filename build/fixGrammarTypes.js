const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const EOL = require('os').EOL;

const generatedPath = path.join(__dirname, '..', 'dist', 'import', 'generated');
const exportRe = /^export var ([^:]+):.*$/;
const constructorRe = /^\s*constructor: .*$/;
const emptyExportRe = /^export {}/;

for(const gfile of fs.readdirSync(generatedPath)) {
    if(gfile.endsWith('.d.ts')) {
        fixTypes(gfile);
    }
}

// mostly copied from official documentation:
// https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
async function fixTypes(filename) {
    const inputStream = fs.createReadStream(path.join(generatedPath, filename));
    const reader = readline.createInterface({
        input: inputStream
    });
    const desiredExports = [];
    const outputLines = [];

    for await (const line of reader) {
        const exportMatch = line.match(exportRe);
        if(exportMatch) {
            desiredExports.push(exportMatch[1]);
        } else if(!line.match(constructorRe) && !line.match(emptyExportRe)) {
            outputLines.push(line);
        }
    }

    outputLines.push(`export { ${ desiredExports.join(', ') } }`);

    inputStream.close();
    fs.writeFileSync(path.join(generatedPath, filename), outputLines.join(EOL));
}