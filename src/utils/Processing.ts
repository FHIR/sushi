import path from 'path';
import fs from 'fs-extra';
import readlineSync from 'readline-sync';
import { logger } from './FSHLogger';
import { loadDependency } from '../fhirdefs/load';
import { FHIRDefinitions } from '../fhirdefs';
import { FSHTank, RawFSH, importText, ensureConfiguration, importConfiguration } from '../import';
import { cloneDeep } from 'lodash';
import { Document } from 'yaml';
import { YAMLMap } from 'yaml/types';
import { YAMLPair } from '../import/ensureConfiguration';
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

export function findInputDir(input: string): string {
  // If no input folder is specified, set default to current directory
  if (!input) {
    input = '.';
    logger.info('path-to-fsh-defs defaulted to current working directory');
  }

  // Use fsh/ subdirectory if not already specified and present
  const fshSubdirectoryPath = path.join(input, 'fsh');
  if (fs.existsSync(fshSubdirectoryPath)) {
    input = path.join(input, 'fsh');
    logger.info('fsh/ subdirectory detected and add to input path');
  }
  return input;
}

export function ensureOutputDir(input: string, output: string, isIgPubContext: boolean): string {
  if (isIgPubContext) {
    logger.info(
      'Current FSH tank conforms to an IG Publisher context. Output will be adjusted accordingly.'
    );
  }
  let outDir = output;
  if (isIgPubContext && !output) {
    // When running in an IG Publisher context, default output is the parent folder of the tank
    outDir = path.join(input, '..');
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
  if (configPath == null || !fs.existsSync(configPath)) {
    logger.error('No config.yaml in FSH definition folder.');
    throw Error;
  }
  const configYaml = fs.readFileSync(configPath, 'utf8');
  const config = importConfiguration(configYaml, configPath);
  if (!config.fhirVersion.includes('4.0.1')) {
    logger.error(
      'The config.yaml must specify FHIR R4 as a fhirVersion. Be sure to' +
        ' add "fhirVersion: 4.0.1" to the config.yaml file.'
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
          'config.yaml, either use the simple dependency format:\n\n' +
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

export function writeFHIRResources(outDir: string, outPackage: Package, snapshot: boolean) {
  logger.info('Exporting FHIR resources as JSON...');
  let count = 0;
  const writeResources = (
    folder: string,
    resources: { getFileName: () => string; toJSON: (snapshot: boolean) => any }[]
  ) => {
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
  const doc = new Document();
  const contents = new YAMLMap();
  // @ts-ignore See: https://github.com/eemeli/yaml/issues/156
  doc.contents = contents;
  // Create the default config.yaml file
  contents.add(new YAMLPair('id', 'fhir.example'));
  contents.add(new YAMLPair('canonical', 'http://example.org'));
  contents.add(new YAMLPair('name', 'ExampleIG'));
  contents.add(new YAMLPair('status', 'draft'));
  contents.add(new YAMLPair('version', '1.0.0'));
  contents.add(new YAMLPair('fhirVersion', '4.0.1'));
  contents.add(new YAMLPair('copyrightYear', '2020+'));
  contents.add(new YAMLPair('releaseLabel', 'Build CI'));
  contents.add(new YAMLPair('template', 'fhir.base.template#0.1.0'));
  contents.add(new YAMLPair('menu', { Home: 'index.html', Artifacts: 'artifacts.html' }));

  logger.info(
    'This tool will initialize a SUSHI project by creating all necessary files to build a simple IG. ' +
      'The content of this IG will be simple default values, and should be updated. ' +
      'The tool will now interactively create a config.yaml file for your project.'
  );

  // Accept user input for certain fields
  ['name', 'id', 'canonical', 'status', 'version'].forEach(field => {
    const userValue = readlineSync.question(
      `${field.charAt(0).toUpperCase() + field.slice(1)} (Default: ${contents.get(field)}): `
    );
    if (userValue) {
      contents.set(field, userValue);
    }
  });

  // Write init directory out, including user made config.yaml, files in utils/init-project, and build scripts from ig/files
  const outputDir = path.resolve('.', contents.get('name'));
  const initProjectDir = path.join(__dirname, 'init-project');
  if (!readlineSync.keyInYN(`Initialize SUSHI project in ${outputDir}?`)) {
    logger.info('Aborting initialization.');
    return;
  }
  logger.info(`Adding files to ${outputDir}`);
  // Copy files from init-project, only now renaming to .gitignore to avoid this file being treated
  // as a .gitignore file by git and npm
  fs.copySync(initProjectDir, outputDir);
  fs.renameSync(path.join(outputDir, 'init-gitignore.txt'), path.join(outputDir, '.gitignore'));
  // Write the generated config.yaml file
  fs.writeFileSync(path.join(outputDir, 'fsh', 'config.yaml'), doc.toString());
  // Add the _updatePublisher, _genonce, and _gencontinuous scripts
  const scriptsDir = path.join(__dirname, '..', 'ig', 'files');
  const scriptsDirContents = fs.readdirSync(scriptsDir);
  scriptsDirContents
    .filter(file => file.startsWith('_'))
    .forEach(file => {
      fs.copyFileSync(path.join(scriptsDir, file), path.join(outputDir, file));
    });
}

function getFilesRecursive(dir: string): string[] {
  if (fs.statSync(dir).isDirectory()) {
    const ancestors = fs.readdirSync(dir, 'utf8').map(f => getFilesRecursive(path.join(dir, f)));
    return [].concat(...ancestors);
  } else {
    return [dir];
  }
}
