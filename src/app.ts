#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import mkdirp from 'mkdirp';
import program from 'commander';
import { importText, FSHDocument, FSHTank } from './import';
import { exportFHIR, Package } from './export';

let input: string;

program
  .name('sushi')
  .usage('<path-to-fsh-defs> [options]')
  .option('-o, --out <out>', 'the path to the output folder', path.join('.', 'out'))
  .option('-c, --config <config>', 'the name of the config file', 'config.json')
  .arguments('<path-to-fsh-defs>')
  .action(function(pathToFshDefs) {
    input = pathToFshDefs;
  })
  .parse(process.argv);

// Check that input folder is specified
if (!input) {
  console.error('Missing path to FSH definition folder');
  program.help();
}

mkdirp.sync(program.out);

const files: string[] = fs.readdirSync(input, 'utf8');
const docs: FSHDocument[] = [];
for (const file of files) {
  if (file.endsWith('.fsh')) {
    const fileContent: string = fs.readFileSync(path.join(input, file), 'utf8');
    const doc: FSHDocument = importText(fileContent, file);
    if (doc) docs.push(doc);
  }
}

const config = JSON.parse(fs.readFileSync(path.join(input, program.config)).toString());
const tank: FSHTank = new FSHTank(docs, config);
const outPackage: Package = exportFHIR(tank);

console.log(outPackage);
