#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import { importText, FSHDocument, FSHTank } from './import';
import { exportFHIR } from './export';
import { IGExporter } from './ig/IGExporter';
import { logger, stats } from './utils/FSHLogger';

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
  logger.error('Missing path to FSH definition folder.');
  program.help();
}

let files: string[];
try {
  files = fs.readdirSync(input, 'utf8');
} catch {
  logger.error('Invalid path to FSH definition folder.');
  program.help();
}

const docs: FSHDocument[] = [];
for (const file of files) {
  if (file.endsWith('.fsh')) {
    const filePath = path.resolve(input, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const doc = importText(fileContent, filePath);
    if (doc) docs.push(doc);
  }
}

let config: any;
try {
  config = JSON.parse(fs.readFileSync(path.join(input, 'package.json'), 'utf8').toString());
} catch {
  logger.error('No package.json in FSH definition folder.');
  program.help();
}

const tank = new FSHTank(docs, config);
const outPackage = exportFHIR(tank);

fs.ensureDirSync(program.out);

const igExporter = new IGExporter(tank, outPackage);
igExporter.export(program.out);

fs.writeFileSync(
  path.join(program.out, 'package.json'),
  JSON.stringify(outPackage.config, null, 2),
  'utf8'
);

logger.info(`
  Profiles:    ${outPackage.profiles.length}
  Extensions:  ${outPackage.extensions.length}
  Errors:      ${stats.numError}
  Warnings:    ${stats.numWarn}`);
