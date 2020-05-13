import path from 'path';
import fs from 'fs-extra';
import { logger } from './FSHLogger';
import { loadDependency } from '../fhirdefs/load';
import { FHIRDefinitions } from '../fhirdefs';
import { FSHTank, RawFSH, importText } from '../import';
import { cloneDeep } from 'lodash';
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
import { Configuration, PackageJSON } from '../fshtypes';

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

export function readConfig(input: string): any {
  // Check that package.json exists
  const packagePath = path.join(input, 'package.json');
  if (!fs.existsSync(packagePath)) {
    logger.error('No package.json in FSH definition folder.');
    throw Error;
  }

  // Parse package.json
  let config: any;
  try {
    config = fs.readJSONSync(packagePath);
  } catch (e) {
    logger.error(`The package.json file is not valid JSON: ${packagePath}`);
    throw e;
  }

  // Ensure FHIR R4 is added as a dependency
  const fhirR4Dependency = config.dependencies?.['hl7.fhir.r4.core'];
  if (fhirR4Dependency !== '4.0.1') {
    logger.error(
      'The package.json must specify FHIR R4 as a dependency. Be sure to' +
        ' add "hl7.fhir.r4.core": "4.0.1" to the dependencies list.'
    );
    throw Error;
  }
  return config;
}

export function loadExternalDependencies(
  defs: FHIRDefinitions,
  config: Configuration
): Promise<FHIRDefinitions | void>[] {
  // Ensure FHIR R4 is added as a fhirVersion
  const dependencies = (config.dependencies ?? []).slice(); // slice so we don't modify actual config;
  if (!config.fhirVersion.includes('4.0.1')) {
    logger.error(
      'The config.yaml must specify FHIR R4 as a fhirVersion. Be sure to' +
        ' add "fhirVersion: 4.0.1" to the config.yaml file.'
    );
    process.exit(1);
  } else {
    // Add hl7.fhir.r4.core so that it will be loaded as dependency
    dependencies.push({ packageId: 'hl7.fhir.r4.core', version: '4.0.1' });
  }

  // Load dependencies
  const dependencyDefs: Promise<FHIRDefinitions | void>[] = [];
  for (const dep of dependencies) {
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
  fs.writeFileSync(
    path.join(outDir, 'package.json'),
    JSON.stringify(outPackage.config, null, 2),
    'utf8'
  );

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

export function getIgDataPath(input: string): string {
  const igDataPath = path.resolve(input, 'ig-data');
  if (fs.existsSync(igDataPath)) {
    return igDataPath;
  } else {
    return null;
  }
}

function getFilesRecursive(dir: string): string[] {
  if (fs.statSync(dir).isDirectory()) {
    const ancestors = fs.readdirSync(dir, 'utf8').map(f => getFilesRecursive(path.join(dir, f)));
    return [].concat(...ancestors);
  } else {
    return [dir];
  }
}
