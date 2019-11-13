#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import mkdirp from 'mkdirp';
import program from 'commander';

let input: string;

program
    .name('sushi')
    .usage('<path-to-fsh-defs> [options]')
    .option('-o, --out <out>', `the path to the output folder`, path.join('.', 'out'))
    .option('-c, --config <config>', 'the name of the config file', 'config.json')
    .arguments('<path-to-fsh-defs>')
    .action(function (pathToFshDefs) {
        input = pathToFshDefs;
    })
    .parse(process.argv);

console.log('Running SUSHI!');

// Check that input folder is specified
if (!input) {
    console.error('Missing path to FSH definition folder');
    program.help();
  }

mkdirp.sync(program.out);
console.log('Created output directory.');


fs.writeFileSync(path.join(program.out, 'test.json'), fs.readFileSync(path.join(input, program.config)));
console.log('Wrote test output file.');