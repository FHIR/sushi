import path from 'path';
import fs from 'fs-extra';
import readlineSync from 'readline-sync';
import YAML from 'yaml';
import { execSync } from 'child_process';
import { isPlainObject, padEnd, sortBy, upperFirst } from 'lodash';
import { EOL } from 'os';
import { logger } from './FSHLogger';
import { loadDependency, loadSupplementalFHIRPackage, FHIRDefinitions } from '../fhirdefs';
import {
  FSHTank,
  RawFSH,
  importText,
  ensureConfiguration,
  importConfiguration,
  loadConfigurationFromIgResource
} from '../import';
import { Package } from '../export';
import { Configuration } from '../fshtypes';
import { axiosGet } from './axiosUtils';

const EXT_PKG_TO_FHIR_PKG_MAP: { [key: string]: string } = {
  'hl7.fhir.extensions.r2': 'hl7.fhir.r2.core#1.0.2',
  'hl7.fhir.extensions.r3': 'hl7.fhir.r3.core#3.0.2',
  'hl7.fhir.extensions.r4': 'hl7.fhir.r4.core#4.0.1',
  'hl7.fhir.extensions.r5': 'hl7.fhir.r5.core#current'
};

export function isSupportedFHIRVersion(version: string): boolean {
  // For now, allow current or any 4.x/5.x version of FHIR except 4.0.0. This is a quick check; not a guarantee.  If a user passes
  // in an invalid version that passes this test (e.g., 4.99.0), it is still expected to fail when we load dependencies.
  return version !== '4.0.0' && /^(current|[45]\.\d+.\d+(-.+)?)$/.test(version);
}

export function ensureInputDir(input: string): string {
  // If no input folder is specified, set default to current directory
  if (!input) {
    input = '.';
    logger.info('path-to-fsh-defs defaulted to current working directory');
  }
  return input;
}

export function hasFshFiles(path: string): boolean {
  try {
    fs.statSync(path);
    const files = getFilesRecursive(path).filter(file => file.endsWith('.fsh'));
    return files.length > 0;
  } catch (error) {
    return false;
  }
}

export function findInputDir(input: string): string {
  const originalInput = input;

  const inputFshSubdirectoryPath = path.join(originalInput, 'input', 'fsh');
  const fshSubdirectoryPath = path.join(originalInput, 'fsh');
  const rootIgDataPath = path.join(originalInput, 'ig-data');
  const currentTankWithNoFsh =
    !fs.existsSync(inputFshSubdirectoryPath) &&
    !fs.existsSync(fshSubdirectoryPath) &&
    !fs.existsSync(rootIgDataPath) &&
    !hasFshFiles(originalInput);

  // Use input/fsh/ subdirectory if not already specified and present
  // or when in the current tank configuration without FSH files
  if (fs.existsSync(inputFshSubdirectoryPath) || currentTankWithNoFsh) {
    input = path.join(originalInput, 'input', 'fsh');
  }

  // TODO: Error about unsupported features. Remove when message no longer needed.
  // Use fsh/ subdirectory if not already specified and present
  if (!fs.existsSync(inputFshSubdirectoryPath) && !currentTankWithNoFsh) {
    let msg =
      '\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! IMPORTANT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n';
    if (fs.existsSync(fshSubdirectoryPath)) {
      msg +=
        '\nSUSHI detected a "fsh" directory that will be used in the input path.\n' +
        'Use of this folder is NO LONGER SUPPORTED.\n' +
        'To migrate to the new folder structure, make the following changes:\n' +
        `  - move fsh${path.sep}config.yaml to .${path.sep}sushi-config.yaml\n` +
        `  - move fsh${path.sep}*.fsh files to .${path.sep}input${path.sep}fsh${path.sep}*.fsh\n`;
      if (fs.existsSync(path.join(input, 'fsh', 'ig-data'))) {
        msg += `  - move fsh${path.sep}ig-data${path.sep}* files and folders to .${path.sep}*\n`;
      }
    } else {
      msg +=
        '\nSUSHI has adopted a new folder structure for FSH tanks (a.k.a. SUSHI projects).\n' +
        'Support for other folder structures is NO LONGER SUPPORTED.\n' +
        'To migrate to the new folder structure, make the following changes:\n' +
        `  - rename .${path.sep}config.yaml to .${path.sep}sushi-config.yaml\n` +
        `  - move .${path.sep}*.fsh files to .${path.sep}input${path.sep}fsh${path.sep}*.fsh\n`;
      if (fs.existsSync(path.join(input, 'ig-data'))) {
        msg += `  - move .${path.sep}ig-data${path.sep}* files and folders to .${path.sep}*\n`;
      }
    }
    if (!fs.existsSync(path.join(input, 'ig-data', 'ig.ini'))) {
      msg += `  - if you used the "template" property in your config, remove it and manage .${path.sep}ig.ini directly\n`;
    }
    if (!fs.existsSync(path.join(input, 'ig-data', 'package-list.json'))) {
      msg += `  - if you used the "history" property in your config, remove it and manage .${path.sep}package-list.json directly\n`;
    }
    msg +=
      '  - ensure your .gitignore file is not configured to ignore the sources in their new locations\n' +
      '  - add /fsh-generated to your .gitignore file to prevent SUSHI output from being checked into source control\n\n' +
      `NOTE: After you make these changes, the default output folder for SUSHI will change to .${path.sep}fsh-generated.\n\n` +
      'For detailed migration instructions, see: https://fshschool.org/docs/sushi/migration/\n\n';
    logger.error(msg);
  }
  return input;
}

export function ensureOutputDir(input: string, output: string): string {
  let outDir = output;
  if (!output) {
    // Default output is the parent folder of the input/fsh folder
    outDir = path.join(input, '..', '..');
    logger.info(`No output path specified. Output to ${outDir}`);
  }
  fs.ensureDirSync(outDir);
  // If the outDir contains a fsh-generated folder, we ensure that folder is empty
  const fshGeneratedFolder = path.join(outDir, 'fsh-generated');
  if (fs.existsSync(fshGeneratedFolder)) {
    try {
      fs.emptyDirSync(fshGeneratedFolder);
    } catch (e) {
      logger.error(
        `Unable to empty existing fsh-generated folder because of the following error: ${e.message}`
      );
    }
  }
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
      `No sushi-config.yaml in ${input} folder, and no configuration could` +
        ' be extracted from an ImplementationGuide resource.'
    );
    throw Error;
  }
  if (!config.fhirVersion.some(v => isSupportedFHIRVersion(v))) {
    logger.error(
      `The ${path.basename(config.filePath)} must specify a supported version of FHIR. Be sure to` +
        ` add "fhirVersion: 4.0.1" (or 4.x.y, 5.0.0-snapshot1, etc., as appropriate) to the ${path.basename(
          config.filePath
        )} file.`
    );
    throw Error;
  }
  return config;
}

export async function loadExternalDependencies(
  defs: FHIRDefinitions,
  config: Configuration
): Promise<void> {
  // Add FHIR to the dependencies so it is loaded
  const dependencies = (config.dependencies ?? []).slice(); // slice so we don't modify actual config;
  const fhirVersion = config.fhirVersion.find(v => isSupportedFHIRVersion(v));
  let fhirPackageId: string;
  let prerelease = false;
  if (/^4\.0\./.test(fhirVersion)) {
    fhirPackageId = 'hl7.fhir.r4.core';
  } else if (/^(4\.1\.|4\.3.\d+-)/.test(fhirVersion)) {
    fhirPackageId = 'hl7.fhir.r4b.core';
    prerelease = true;
  } else if (/^4\.3.\d+$/.test(fhirVersion)) {
    fhirPackageId = 'hl7.fhir.r4b.core';
  } else if (/^5\.0.\d+$/.test(fhirVersion)) {
    fhirPackageId = 'hl7.fhir.r5.core';
  } else {
    fhirPackageId = 'hl7.fhir.r5.core';
    prerelease = true;
  }
  if (prerelease) {
    logger.warn(
      'SUSHI support for pre-release versions of FHIR is experimental. Use at your own risk!'
    );
  }
  dependencies.push({ packageId: fhirPackageId, version: fhirVersion });

  // Load dependencies
  const promises = dependencies.map(dep => {
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
      return Promise.resolve();
    } else if (EXT_PKG_TO_FHIR_PKG_MAP[dep.packageId]) {
      // It is a special "virtual" FHIR extensions package indicating we need to load supplemental
      // FHIR versions to support "implied extensions".
      if (dep.version !== fhirVersion) {
        logger.warn(
          `Incorrect package version: ${dep.packageId}#${dep.version}. FHIR extensions packages ` +
            "should use the same version as the implementation guide's fhirVersion. Version " +
            `${fhirVersion} will be used instead. Update the dependency version in ` +
            'sushi-config.yaml to eliminate this warning.'
        );
      }
      logger.info(
        `Loading supplemental version of FHIR to support extensions from ${dep.packageId}`
      );
      return loadSupplementalFHIRPackage(EXT_PKG_TO_FHIR_PKG_MAP[dep.packageId], defs);
    } else {
      return loadDependency(dep.packageId, dep.version, defs).catch(e => {
        let message = `Failed to load ${dep.packageId}#${dep.version}: ${e.message}`;
        if (/certificate/.test(e.message)) {
          message +=
            '\n\nSometimes this error occurs in corporate or educational environments that use proxies and/or SSL ' +
            'inspection.\nTroubleshooting tips:\n' +
            '  1. If a non-proxied network is available, consider connecting to that network instead.\n' +
            '  2. Set NODE_EXTRA_CA_CERTS as described at https://bit.ly/3ghJqJZ (RECOMMENDED).\n' +
            '  3. Disable certificate validation as described at https://bit.ly/3syjzm7 (NOT RECOMMENDED).\n';
        }
        logger.error(message);
      });
    }
  });

  return Promise.all(promises).then(() => {});
}

export function getRawFSHes(input: string): RawFSH[] {
  let files: string[];
  try {
    fs.statSync(input);
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

export function checkNullValuesOnArray(resource: any, parentName = '', priorPath = ''): void {
  const resourceName = parentName ? parentName : resource.id ?? resource.name;
  for (const propertyKey in resource) {
    const property = resource[propertyKey];
    const currentPath = !priorPath ? propertyKey : priorPath.concat(`.${propertyKey}`);
    // If a property's key begins with "_", we'll want to ignore null values on it's top level
    // but still check any nested objects for null values
    if (propertyKey.startsWith('_')) {
      if (isPlainObject(property)) {
        // If we encounter an object property, we'll want to check its properties as well
        checkNullValuesOnArray(property, resourceName, currentPath);
      }
      if (Array.isArray(property)) {
        property.forEach((element: any, index: number) => {
          if (isPlainObject(element)) {
            // If we encounter an object property, we'll want to check its properties as well
            checkNullValuesOnArray(element, resourceName, `${currentPath}[${index}]`);
          }
        });
      }
    } else {
      if (isPlainObject(property)) {
        // If we encounter an object property, we'll want to check its properties as well
        checkNullValuesOnArray(property, resourceName, currentPath);
      }
      if (Array.isArray(property)) {
        const nullIndexes: number[] = [];
        property.forEach((element: any, index: number) => {
          if (element === null) nullIndexes.push(index);
          if (isPlainObject(element)) {
            // If we encounter an object property, we'll want to check its properties as well
            checkNullValuesOnArray(element, resourceName, `${currentPath}[${index}]`);
          }
        });
        if (nullIndexes.length > 0) {
          logger.warn(
            `The array '${currentPath}' in ${resourceName} is missing values at the following indices: ${nullIndexes}`
          );
        }
      }
    }
  }
}

export function writeFHIRResources(
  outDir: string,
  outPackage: Package,
  defs: FHIRDefinitions,
  snapshot: boolean
) {
  logger.info('Exporting FHIR resources as JSON...');
  let count = 0;
  const predefinedResources = defs.allPredefinedResources();
  const writeResources = (
    resources: {
      getFileName: () => string;
      toJSON: (snapshot: boolean) => any;
      url?: string;
      id?: string;
      resourceType?: string;
    }[]
  ) => {
    const exportDir = path.join(outDir, 'fsh-generated', 'resources');
    resources.forEach(resource => {
      if (
        !predefinedResources.find(
          predef =>
            predef.url === resource.url &&
            predef.resourceType === resource.resourceType &&
            predef.id === resource.id
        )
      ) {
        checkNullValuesOnArray(resource);
        fs.outputJSONSync(path.join(exportDir, resource.getFileName()), resource.toJSON(snapshot), {
          spaces: 2
        });
        count++;
      } else {
        logger.error(
          `Ignoring FSH definition for ${
            resource.url ?? `${resource.resourceType}/${resource.id}`
          } since it duplicates existing pre-defined resource. ` +
            'To use the FSH definition, remove the conflicting file from "input". ' +
            'If you do want the FSH definition to be ignored, please comment the definition out ' +
            'to remove this error.'
        );
      }
    });
  };
  writeResources(outPackage.profiles);
  writeResources(outPackage.extensions);
  writeResources(outPackage.logicals);
  // WARNING: While custom resources are written to disk, the IG Publisher does not
  //          accept newly defined resources. However, it is configured to automatically
  //          search the fsh-generated directory for StructureDefinitions rather than using
  //          the StructureDefinitions defined in the exported implementation guide. So, be
  //          aware that the IG Publisher will attempt to process custom resources.
  //          NOTE: To mitigate against this, the parameter 'autoload-resources = false' is
  //          injected automatically into the IG array pf parameters if the parameter was
  //          not already defined and only if the custom resources were generated by Sushi.
  writeResources(outPackage.resources);
  writeResources([...outPackage.valueSets, ...outPackage.codeSystems]);

  // Filter out inline instances
  writeResources(outPackage.instances.filter(i => i._instanceMeta.usage !== 'Inline'));

  logger.info(`Exported ${count} FHIR resources as JSON.`);
}

export function writePreprocessedFSH(outDir: string, inDir: string, tank: FSHTank) {
  const preprocessedPath = path.join(outDir, '_preprocessed');
  fs.ensureDirSync(preprocessedPath);
  // Because this is the FSH that exists after processing, some entities from the original FSH are gone.
  // Specifically, RuleSets have already been applied.
  // Aliases have already been resolved for most cases, but since they may still
  // be used in a slice name, they are included.
  // TODO: Add Resources and Logicals once they are being imported and stored in docs
  tank.docs.forEach(doc => {
    let fileContent = '';
    // First, get all Aliases. They don't have source information.
    if (doc.aliases.size > 0) {
      doc.aliases.forEach((url, alias) => {
        fileContent += `Alias: ${alias} = ${url}${EOL}`;
      });
      fileContent += EOL;
    }
    // Then, get all other applicable entities. They will have source information.
    const entities = [
      ...doc.profiles.values(),
      ...doc.extensions.values(),
      ...doc.logicals.values(),
      ...doc.resources.values(),
      ...doc.instances.values(),
      ...doc.valueSets.values(),
      ...doc.codeSystems.values(),
      ...doc.invariants.values(),
      ...doc.mappings.values()
    ];
    // Sort entities by original line number, then write them out.
    sortBy(entities, 'sourceInfo.location.startLine').forEach(entity => {
      fileContent += `// Originally defined on lines ${entity.sourceInfo.location.startLine} - ${entity.sourceInfo.location.endLine}${EOL}`;
      fileContent += `${entity.toFSH()}${EOL}${EOL}`;
    });
    if (fileContent.length === 0) {
      fileContent = '// This file has no content after preprocessing.';
    }
    const outPath = path.relative(inDir, doc.file);
    fs.ensureFileSync(path.join(preprocessedPath, outPath));
    fs.writeFileSync(path.join(preprocessedPath, outPath), fileContent);
  });
  logger.info(`Wrote preprocessed FSH to ${preprocessedPath}`);
}

/**
 * Initializes an empty sample FSH within a user specified subdirectory of the current working directory
 */
export async function init(): Promise<void> {
  console.log(
    '\n╭───────────────────────────────────────────────────────────╮\n' +
      '│ This interactive tool will use your answers to create a   │\n' +
      "│ working SUSHI project configured with your project's      │\n" +
      '│ basic information.                                        │\n' +
      '╰───────────────────────────────────────────────────────────╯\n'
  );

  const configDoc = YAML.parseDocument(
    fs.readFileSync(path.join(__dirname, 'init-project', 'sushi-config.yaml'), 'utf-8')
  );
  // Accept user input for certain fields
  ['name', 'id', 'canonical', 'status', 'version'].forEach(field => {
    const userValue = readlineSync.question(
      `${upperFirst(field)} (Default: ${configDoc.get(field)}): `
    );
    if (userValue) {
      if (field === 'status') {
        const node = YAML.createNode(userValue);
        node.comment = ' draft | active | retired | unknown';
        configDoc.set(field, node);
      } else {
        configDoc.set(field, userValue);
      }
    }
  });

  // And for nested publisher fields
  ['name', 'url'].forEach(field => {
    const userValue = readlineSync.question(
      `Publisher ${upperFirst(field)} (Default: ${configDoc.get('publisher').get(field)}): `
    );
    if (userValue) {
      configDoc.get('publisher').set(field, userValue);
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
  fs.ensureDirSync(path.join(outputDir, 'input', 'pagecontent'));
  fs.writeFileSync(path.join(outputDir, 'input', 'pagecontent', 'index.md'), indexPageContent);
  // Add ig.ini, updating to reflect the user given id
  const iniContent = fs
    .readFileSync(path.join(initProjectDir, 'ig.ini'), 'utf-8')
    .replace('fhir.example', configDoc.get('id'));
  fs.writeFileSync(path.join(outputDir, 'ig.ini'), iniContent);
  // Add the config
  fs.writeFileSync(path.join(outputDir, 'sushi-config.yaml'), configDoc.toString());
  // Copy over remaining static files
  fs.ensureDirSync(path.join(outputDir, 'input', 'fsh'));
  fs.copyFileSync(
    path.join(initProjectDir, 'patient.fsh'),
    path.join(outputDir, 'input', 'fsh', 'patient.fsh')
  );
  fs.copyFileSync(
    path.join(initProjectDir, 'init-gitignore.txt'),
    path.join(outputDir, '.gitignore')
  );
  fs.copyFileSync(
    path.join(initProjectDir, 'ignoreWarnings.txt'),
    path.join(outputDir, 'input', 'ignoreWarnings.txt')
  );
  // Add the _updatePublisher, _genonce, and _gencontinuous scripts
  console.log('Downloading publisher scripts from https://github.com/HL7/ig-publisher-scripts');
  for (const script of [
    '_genonce.bat',
    '_genonce.sh',
    '_updatePublisher.bat',
    '_updatePublisher.sh'
  ]) {
    const url = `http://raw.githubusercontent.com/HL7/ig-publisher-scripts/main/${script}`;
    try {
      const res = await axiosGet(url);
      fs.writeFileSync(path.join(outputDir, script), res.data);
      if (script.endsWith('.sh')) {
        fs.chmodSync(path.join(outputDir, script), 0o755);
      }
    } catch (e) {
      logger.error(`Unable to download ${script} from ${url}: ${e.message}`);
    }
  }
  const maxLength = 32;
  const printName =
    projectName.length > maxLength ? projectName.slice(0, maxLength - 3) + '...' : projectName;
  console.log(
    '\n╭───────────────────────────────────────────────────────────╮\n' +
      `│ Project initialized at: ./${padEnd(printName, maxLength)}│\n` +
      '├───────────────────────────────────────────────────────────┤\n' +
      '│ Now try this:                                             │\n' +
      '│                                                           │\n' +
      `│ > cd ${padEnd(printName, maxLength + 21)}│\n` +
      '│ > sushi .                                                 │\n' +
      '│                                                           │\n' +
      '│ For guidance on project structure and configuration see   │\n' +
      '│ the SUSHI documentation: https://fshschool.org/docs/sushi │\n' +
      '╰───────────────────────────────────────────────────────────╯\n'
  );
}

export function getFilesRecursive(dir: string): string[] {
  // always return absolute paths
  const absPath = path.resolve(dir);
  try {
    if (fs.statSync(absPath).isDirectory()) {
      const descendants = fs
        .readdirSync(absPath, 'utf8')
        .map(f => getFilesRecursive(path.join(absPath, f)));
      return [].concat(...descendants);
    } else {
      return [absPath];
    }
  } catch {
    return [];
  }
}

export function getLocalSushiVersion(): string {
  const packageJSONPath = path.join(__dirname, '..', '..', 'package.json');
  if (fs.existsSync(packageJSONPath)) {
    return fs.readJSONSync(packageJSONPath)?.version;
  }
  return null;
}

async function getLatestSushiVersionFallback(): Promise<string> {
  logger.info('Attempting fallback to determine version of sushi.');
  try {
    const res = await axiosGet('https://registry.npmjs.org/fsh-sushi');
    const latestVer = res.data['dist-tags'].latest;
    if (latestVer.match(/^[0-9\.]*$/)) {
      return latestVer;
    } else {
      logger.warn('Unable to determine the latest version of sushi.');
    }
  } catch (e) {
    logger.warn(`Unable to determine the latest version of sushi: ${e.message}`);
  }
}

export async function getLatestSushiVersion(): Promise<string | undefined> {
  let latestVer = undefined;

  const getRegistryCmd = 'npm view fsh-sushi version';
  try {
    const execResult = execSync(getRegistryCmd)?.toString()?.replace(/\s*$/, '');
    if (execResult.match(/^[0-9\.]*$/)) {
      latestVer = execResult;
    }
  } catch (e) {
    logger.info(`Unable to determine the latest version of sushi: ${e.message}`);
  }

  if (latestVer === undefined) {
    latestVer = await getLatestSushiVersionFallback();
  }
  return latestVer;
}

export async function checkSushiVersion(): Promise<{
  latest: string | undefined;
  current: string;
}> {
  const latest = await getLatestSushiVersion();
  const current = getLocalSushiVersion();

  return { latest, current };
}
