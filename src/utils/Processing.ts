import path from 'path';
import fs from 'fs-extra';
import tarStream from 'tar-stream';
import zlib from 'zlib';
import http from 'http';
import { logger } from './FSHLogger';
import {
  loadDependency,
  loadIntoDefsPlayground,
  loadDependenciesInStorage,
  unzipDependencies
} from '../fhirdefs/load';
import { FHIRDefinitions } from '../fhirdefs';
import { FSHTank, RawFSH, importText, ensureConfiguration, importConfiguration } from '../import';
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

export function readConfigPlayground(input: string): Configuration {
  const yamlContents =
    'id: fhir.us.minimal\ncanonical: http://hl7.org/fhir/us/minimal\nname: MinimalIG\nstatus: draft\nversion: 1.0.0\nfhirVersion: 4.0.1\ncopyrightYear: 2020+\nreleaseLabel: Build CI\ntemplate: hl7.fhir.template#0.0.5';

  const defaultPlaygroundConfigYaml = importConfiguration(
    yamlContents,
    '/test/import/fixtures/minimal-config.yaml'
  );
  return defaultPlaygroundConfigYaml;
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

export async function loadExternalDependenciesPlayground(
  FHIRdefs: FHIRDefinitions
): Promise<FHIRDefinitions> {
  // Add FHIR R4 to the dependencies so it is loaded
  // const dependencies = [].slice(); // slice so we don't modify actual config;
  // dependencies.push({ packageId: 'hl7.fhir.r4.core', version: '4.0.1' });
  return new Promise((resolve, reject) => {
    let database: any;
    let objectStore: any;
    const version = 1;
    let OpenIDBRequest = indexedDB.deleteDatabase('FSH Playground Dependencies');
    console.log(OpenIDBRequest);
    OpenIDBRequest = indexedDB.open('FSH Playground Dependencies', version);
    console.log(OpenIDBRequest);
    // If successful the database exists
    OpenIDBRequest.onsuccess = async function (event) {
      console.log('Database exists, converting to FHIR Definitions...');
      // @ts-ignore
      database = event.target.result;
      const finalDefs = await loadIntoDefsPlayground(FHIRdefs, database);
      console.log(finalDefs);
      resolve(finalDefs);
    };
    // If upgrade is needed to the version, the database does not yet exist
    OpenIDBRequest.onupgradeneeded = async function (event) {
      console.log('Created database, now filling database...');
      let resources: any[] = [];
      resources = await unzipDependencies(resources);
      console.log('here');
      console.log(resources);
      // @ts-ignore
      database = event.target.result;
      console.log('made database');
      // @ts-ignore
      objectStore = database.createObjectStore('resources', { keyPath: 'url' });
      objectStore.transaction.oncomplete = async function () {
        // load unzipped json files into indexDB database
        console.log('Moving resources into indexdDB');
        await loadDependenciesInStorage(database, resources);
        console.log('Finished, should go to onSuccess');
      };
    };
    // Checks if there is an error
    OpenIDBRequest.onerror = function (event) {
      reject('Failed to make database');
    };
  });
  // const indexDBDependencies = unzipDependenciesPlayground(defs);
  // return await indexDBDependencies;
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

function getFilesRecursive(dir: string): string[] {
  if (fs.statSync(dir).isDirectory()) {
    const ancestors = fs.readdirSync(dir, 'utf8').map(f => getFilesRecursive(path.join(dir, f)));
    return [].concat(...ancestors);
  } else {
    return [dir];
  }
}
