import path from 'path';
import fs from 'fs-extra';
import readlineSync from 'readline-sync';
import { logger } from './FSHLogger';
import { loadDependency } from '../fhirdefs/load';
import { FHIRDefinitions } from '../fhirdefs';
import { FSHTank, RawFSH, importText, ensureConfiguration, importConfiguration } from '../import';
import { cloneDeep, padEnd } from 'lodash';
import YAML from 'yaml';
import { Package } from '../export';
import {
  filterInlineInstances,
  filterExampleInstances,
  filterCapabilitiesInstances,
  filterVocabularyInstances,
  filterModelInstances,
  filterOperationInstances,
  filterExtensionInstances,
  filterProfileInstances
} from './InstanceDefinitionUtils';
import { Configuration } from '../fshtypes';
import { loadConfigurationFromIgResource } from '../import/loadConfigurationFromIgResource';

export function findInputDir(input: string): string {
  // If no input folder is specified, set default to current directory
  if (!input) {
    input = '.';
    logger.info('path-to-fsh-defs defaulted to current working directory');
  }

  // TODO: Legacy support. Remove when no longer supported.
  // Use input/fsh/ subdirectory if not already specified and present
  const inputFshSubdirectoryPath = path.join(input, 'input', 'fsh');
  if (fs.existsSync(inputFshSubdirectoryPath)) {
    input = path.join(input, 'input', 'fsh');
  }

  // Use fsh/ subdirectory if not already specified and present
  const fshSubdirectoryPath = path.join(input, 'fsh');
  if (!fs.existsSync(inputFshSubdirectoryPath) && fs.existsSync(fshSubdirectoryPath)) {
    input = path.join(input, 'fsh');
    logger.warn(
      'SUSHI detected a "fsh" directory that will be used in the input path. ' +
        'Use of this folder is deprecated and will be removed in a future release. ' +
        'To migrate to the new folder structure the following changes are needed:\n' +
        `  - sushi-config.yaml moves to ${path.resolve(
          input,
          '..',
          'input',
          'fsh',
          'sushi-config.yaml'
        )}\n` +
        `  - ig-data/* files move to ${path.resolve(input, '..')}${path.sep}*\n` +
        `  - .fsh files move to ${path.resolve(input, 'input', 'fsh')}${path.sep}*`
    );
  }
  return input;
}

export function ensureOutputDir(
  input: string,
  output: string,
  isIgPubContext: boolean,
  isLegacyIgPubContext: boolean
): string {
  if (isIgPubContext || isLegacyIgPubContext) {
    // TODO: Message includes information about legacy support for top level fsh folder. Remove when not supported.
    let directory = 'fsh';
    let article = 'a';
    let parentDirectory = 'fsh';
    if (isIgPubContext) {
      directory = 'input/fsh';
      article = 'an';
      parentDirectory = 'input';
    }
    logger.info(
      `SUSHI detected ${article} "${directory}" directory in the input path. As a result, SUSHI will operate in "IG Publisher integration" mode. This means:\n` +
        `  - the "${directory}" directory will be used as the input path\n` +
        `  - the parent of the "${parentDirectory}" directory will be used as the output path unless otherwise specified with --out option\n` +
        '  - generation of publisher-related scripts will be suppressed (i.e., assumed to be managed by you)'
    );
  }
  let outDir = output;
  if (isLegacyIgPubContext && !output) {
    // TODO: Legacy support for top level "fsh" directory. Remove when no longer supported.
    // When running in a legacy IG Publisher context, default output is the parent folder of the tank
    outDir = path.join(input, '..');
    logger.info(`No output path specified. Output to ${outDir}`);
  } else if (isIgPubContext && !output) {
    // When running in an IG Publisher context, default output is the parent folder of the input/fsh folder
    outDir = path.join(input, '..', '..');
    logger.info(`No output path specified. Output to ${outDir}`);
  } else if (!output) {
    // Any other time, default output is just to 'build'
    outDir = path.join('.', 'build');
    logger.info(`No output path specified. Output to ${outDir}`);
  }
  fs.ensureDirSync(outDir);
  return outDir;
}

export function readConfig(input: string): Configuration {
  const configPath = ensureConfiguration(input);
  let config: Configuration;
  if (configPath == null || !fs.existsSync(configPath)) {
    config = loadConfigurationFromIgResource(input);
  } else {
    const configYaml = fs.readFileSync(configPath, 'utf8');
    config = importConfiguration(configYaml, configPath);
  }
  if (!config) {
    logger.error(
      'No sushi-config.yaml in FSH definition folder, and no configuration could' +
        ' be extracted from an ImplementationGuide resource.'
    );
    throw Error;
  }
  if (!config.fhirVersion.includes('4.0.1')) {
    logger.error(
      `The ${path.basename(config.filePath)} must specify FHIR R4 as a fhirVersion. Be sure to` +
        ` add "fhirVersion: 4.0.1" to the ${path.basename(config.filePath)} file.`
    );
    throw Error;
  }
  return config;
}

export function loadExternalDependencies(
  defs: FHIRDefinitions,
  config: Configuration
): Promise<FHIRDefinitions | void>[] {
  // Add FHIR R4 to the dependencies so it is loaded
  const dependencies = (config.dependencies ?? []).slice(); // slice so we don't modify actual config;
  dependencies.push({ packageId: 'hl7.fhir.r4.core', version: '4.0.1' });

  // Load dependencies
  const dependencyDefs: Promise<FHIRDefinitions | void>[] = [];
  for (const dep of dependencies) {
    if (dep.version == null) {
      logger.error(
        `Failed to load ${dep.packageId}: No version specified. To specify the version in your ` +
          `${path.basename(config.filePath)}, either use the simple dependency format:\n\n` +
          'dependencies:\n' +
          `  ${dep.packageId}: current\n\n` +
          'or use the detailed dependency format to specify other properties as well:\n\n' +
          'dependencies:\n' +
          `  ${dep.packageId}:\n` +
          `    uri: ${dep.uri ?? 'http://my-fhir-ig.org/ImplementationGuide/123'}\n` +
          '    version: current'
      );
      continue;
    }
    dependencyDefs.push(
      loadDependency(dep.packageId, dep.version, defs)
        .then(def => {
          return def;
        })
        .catch(e => {
          logger.error(`Failed to load ${dep.packageId}#${dep.version}: ${e.message}`);
        })
    );
  }
  return dependencyDefs;
}

export function getRawFSHes(input: string): RawFSH[] {
  let files: string[];
  try {
    files = getFilesRecursive(input);
  } catch {
    logger.error('Invalid path to FSH definition folder.');
    throw Error;
  }
  const rawFSHes = files
    .filter(file => file.endsWith('.fsh'))
    .map(file => {
      const filePath = path.resolve(file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return new RawFSH(fileContent, filePath);
    });
  return rawFSHes;
}

export function fillTank(rawFSHes: RawFSH[], config: Configuration): FSHTank {
  logger.info('Importing FSH text...');
  const docs = importText(rawFSHes);
  return new FSHTank(docs, config);
}

export function writeFHIRResources(
  outDir: string,
  outPackage: Package,
  snapshot: boolean,
  useGeneratedFolder: boolean
) {
  logger.info('Exporting FHIR resources as JSON...');
  let count = 0;
  const writeResources = (
    folder: string,
    resources: { getFileName: () => string; toJSON: (snapshot: boolean) => any }[]
  ) => {
    folder = useGeneratedFolder ? 'generated' : folder;
    const exportDir = path.join(outDir, 'input', folder);
    resources.forEach(resource => {
      fs.outputJSONSync(path.join(exportDir, resource.getFileName()), resource.toJSON(snapshot), {
        spaces: 2
      });
      count++;
    });
  };
  writeResources('profiles', outPackage.profiles);
  writeResources('extensions', outPackage.extensions);
  writeResources('vocabulary', [...outPackage.valueSets, ...outPackage.codeSystems]);

  // Sort instances into appropriate directories
  const instances = cloneDeep(outPackage.instances); // Filter functions below mutate the argument, so clone what is in the package
  filterInlineInstances(instances);
  writeResources('examples', filterExampleInstances(instances));
  writeResources('capabilities', filterCapabilitiesInstances(instances));
  writeResources('vocabulary', filterVocabularyInstances(instances));
  writeResources('models', filterModelInstances(instances));
  writeResources('operations', filterOperationInstances(instances));
  writeResources('extensions', filterExtensionInstances(instances));
  writeResources('profiles', filterProfileInstances(instances));
  writeResources('resources', instances); // Any instance left cannot be categorized any further so should just be in generic resources

  logger.info(`Exported ${count} FHIR resources as JSON.`);
}

/**
 * Initializes an empty sample FSH within a user specified subdirectory of the current working directory
 */
export function init(): void {
  console.log(
    '\n╭──────────────────────────────────────────────────────────╮\n' +
      '│ This interactive tool will use your answers to create a  │\n' +
      "│ working SUSHI project configured with your project's     │\n" +
      '│ basic information.                                       │\n' +
      '╰──────────────────────────────────────────────────────────╯\n'
  );

  const configDoc = YAML.parseDocument(
    fs.readFileSync(path.join(__dirname, 'init-project', 'sushi-config.yaml'), 'utf-8')
  );
  // Accept user input for certain fields
  ['name', 'id', 'canonical', 'status', 'version'].forEach(field => {
    const userValue = readlineSync.question(
      `${field.charAt(0).toUpperCase() + field.slice(1)} (Default: ${configDoc.get(field)}): `
    );
    if (userValue) {
      configDoc.set(field, userValue);
    }
  });
  // Ensure copyrightYear is accurate
  configDoc.set('copyrightYear', `${new Date().getFullYear()}+`);
  const projectName = configDoc.get('name');

  // Write init directory out, including user made sushi-config.yaml, files in utils/init-project, and build scripts from ig/files
  const outputDir = path.resolve('.', projectName);
  const initProjectDir = path.join(__dirname, 'init-project');
  if (!readlineSync.keyInYN(`Initialize SUSHI project in ${outputDir}?`)) {
    console.log('\nAborting Initialization.\n');
    return;
  }

  // Add index.md content, updating to reflect the user given name
  const indexPageContent = fs
    .readFileSync(path.join(initProjectDir, 'index.md'), 'utf-8')
    .replace('ExampleIG', projectName);
  fs.ensureDirSync(path.join(outputDir, 'fsh', 'ig-data', 'input', 'pagecontent'));
  fs.writeFileSync(
    path.join(outputDir, 'fsh', 'ig-data', 'input', 'pagecontent', 'index.md'),
    indexPageContent
  );
  // Add the config
  fs.writeFileSync(path.join(outputDir, 'fsh', 'sushi-config.yaml'), configDoc.toString());
  // Copy over remaining static files
  fs.copyFileSync(
    path.join(initProjectDir, 'patient.fsh'),
    path.join(outputDir, 'fsh', 'patient.fsh')
  );
  fs.copyFileSync(
    path.join(initProjectDir, 'init-gitignore.txt'),
    path.join(outputDir, '.gitignore')
  );
  // Add the _updatePublisher, _genonce, and _gencontinuous scripts
  const scriptsDir = path.join(__dirname, '..', 'ig', 'files');
  const scriptsDirContents = fs.readdirSync(scriptsDir);
  scriptsDirContents
    .filter(file => file.startsWith('_'))
    .forEach(file => {
      fs.copyFileSync(path.join(scriptsDir, file), path.join(outputDir, file));
    });

  const maxLength = 31;
  const printName =
    projectName.length > maxLength ? projectName.slice(0, maxLength - 3) + '...' : projectName;
  console.log(
    '\n╭──────────────────────────────────────────────────────────╮\n' +
      `│ Project initialized at: ./${padEnd(printName, maxLength)}│\n` +
      '├──────────────────────────────────────────────────────────┤\n' +
      '│ Now try this:                                            │\n' +
      '│                                                          │\n' +
      `│ > cd ${padEnd(printName, maxLength + 21)}│\n` +
      '│ > sushi .                                                │\n' +
      '│                                                          │\n' +
      '│ For guidance on project structure and configuration see  │\n' +
      '│ the SUSHI documentation:  https://fshschool.org/sushi    │\n' +
      '╰──────────────────────────────────────────────────────────╯\n'
  );
}

function getFilesRecursive(dir: string): string[] {
  if (fs.statSync(dir).isDirectory()) {
    const ancestors = fs.readdirSync(dir, 'utf8').map(f => getFilesRecursive(path.join(dir, f)));
    return [].concat(...ancestors);
  } else {
    return [dir];
  }
}
