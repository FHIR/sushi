#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import { importText, FSHTank, RawFSH } from './import';
import { exportFHIR } from './export';
import { IGExporter } from './ig/IGExporter';
import { logger, stats } from './utils/FSHLogger';
import { loadDependency } from './fhirdefs/load';
import { FHIRDefinitions } from './fhirdefs';

app();

async function app() {
  let input: string;

  program
    .name('sushi')
    .usage('<path-to-fsh-defs> [options]')
    .option('-o, --out <out>', 'the path to the output folder', path.join('.', 'build'))
    .option('-d, --debug', 'output extra debugging information')
    .arguments('<path-to-fsh-defs>')
    .action(function(pathToFshDefs) {
      input = pathToFshDefs;
    })
    .parse(process.argv);

  if (program.debug) logger.level = 'debug';

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

  let config: any;
  try {
    config = JSON.parse(fs.readFileSync(path.join(input, 'package.json'), 'utf8').toString());
  } catch {
    logger.error('No package.json in FSH definition folder.');
    program.help();
  }

  // Load external dependencies
  const defs = new FHIRDefinitions();
  const dependencyDefs: Promise<FHIRDefinitions | void>[] = [];
  for (const dep of Object.keys(config?.dependencies ?? {})) {
    dependencyDefs.push(
      loadDependency(dep, config.dependencies[dep], defs).catch(e => {
        logger.error(`Failed to load ${dep}#${config.dependencies[dep]}`);
        logger.error(e.message);
      })
    );
  }

  const rawFSHes = files
    .filter(file => file.endsWith('.fsh'))
    .map(file => {
      const filePath = path.resolve(input, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return new RawFSH(fileContent, filePath);
    });

  const docs = importText(rawFSHes);

  const tank = new FSHTank(docs, config);
  await Promise.all(dependencyDefs);
  const outPackage = exportFHIR(tank, defs);

  fs.ensureDirSync(program.out);

  fs.writeFileSync(
    path.join(program.out, 'package.json'),
    JSON.stringify(outPackage.config, null, 2),
    'utf8'
  );

  // If ig-data exists, generate an IG, otherwise, generate resources only
  const igDataPath = path.resolve(input, 'ig-data');
  if (fs.existsSync(igDataPath)) {
    const igExporter = new IGExporter(outPackage, defs, igDataPath);
    igExporter.export(program.out);
  } else {
    for (const sd of [
      ...outPackage.profiles,
      ...outPackage.extensions,
      ...outPackage.instances,
      ...outPackage.valueSets,
      ...outPackage.codeSystems
    ]) {
      fs.writeFileSync(
        path.join(program.out, sd.getFileName()),
        JSON.stringify(sd.toJSON(), null, 2),
        'utf8'
      );
    }
  }

  logger.info(`
  Profiles:    ${outPackage.profiles.length}
  Extensions:  ${outPackage.extensions.length}
  Instances:   ${outPackage.instances.length}
  ValueSets:   ${outPackage.valueSets.length}
  CodeSystems: ${outPackage.codeSystems.length}
  Errors:      ${stats.numError}
  Warnings:    ${stats.numWarn}`);
}
