#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import { importText, FSHDocument, FSHTank } from './import';
import { exportFHIR } from './export';

let input: string;

program
  .name('sushi')
  .usage('<path-to-fsh-defs> [options]')
  .option('-o, --out <out>', 'the path to the output folder', path.join('.', 'out'))
  .arguments('<path-to-fsh-defs>')
  .action(function(pathToFshDefs) {
    input = pathToFshDefs;
  })
  .parse(process.argv);

// Check that input folder is specified
if (!input) {
  console.error('Missing path to FSH definition folder.');
  program.help();
}

let files: string[];
try {
  files = fs.readdirSync(input, 'utf8');
} catch {
  console.error('Invalid path to FSH definition folder.');
  program.help();
}

const docs: FSHDocument[] = [];
for (const file of files) {
  if (file.endsWith('.fsh')) {
    const fileContent = fs.readFileSync(path.join(input, file), 'utf8');
    const doc = importText(fileContent, file);
    if (doc) docs.push(doc);
  }
}


let config: any;
try {
  config = JSON.parse(fs.readFileSync(path.join(input, 'package.json'), 'utf8').toString());
} catch {
  console.error('No package.json in FSH definition folder.');
  program.help();
}

const tank = new FSHTank(docs, config);
const outPackage = exportFHIR(tank);

fs.ensureDirSync(program.out);

for (const profile of outPackage.profiles) {
  fs.writeFileSync(
    path.join(program.out, `StructureDefinition-${profile.id}.json`),
    JSON.stringify(profile.toJSON(), null, 2),
    'utf8'
  );
}
for (const extension of outPackage.extensions) {
  fs.writeFileSync(
    path.join(program.out, `StructureDefinition-${extension.id}.json`),
    JSON.stringify(extension.toJSON(), null, 2),
    'utf8'
  );
}

fs.writeFileSync(
  path.join(program.out, 'package.json'),
  JSON.stringify(outPackage.config, null, 2),
  'utf8'
);

console.info(`Exported ${outPackage.profiles.length} profile(s) and ${outPackage.extensions.length} extension(s).`);