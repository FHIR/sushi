import { RawFSH } from '../import';
import { exportFHIR, Package } from '../export';
import { FHIRDefinitions } from '../fhirdefs';
import { ImplementationGuideDependsOn } from '../fhirtypes';
import {
  fillTank,
  loadExternalDependencies,
  logger,
  errorsAndWarnings,
  ErrorsAndWarnings
} from '../utils';

export async function fshToFhir(
  input: string,
  options: fshToFhirOptions = {}
): Promise<{
  fhir: Package;
  errors: ErrorsAndWarnings['errors'];
  warnings: ErrorsAndWarnings['warnings'];
}> {
  // track errors and warnings, and determine log level from options
  errorsAndWarnings.shouldTrack = true;
  if (options.logLevel == 'silent') {
    logger.transports[0].silent = true;
  } else if (options.logLevel != null) {
    logger.level = options.logLevel;
  }

  // set up a config so that sushi can run
  const config = {
    canonical: options.canonical ?? 'http://example.org',
    FSHOnly: true,
    fhirVersion: ['4.0.1'],
    dependencies: options.dependencies,
    version: options.version
  };

  // load dependencies
  const defs = new FHIRDefinitions();
  await Promise.all(loadExternalDependencies(defs, config));

  // load FSH text into memory
  const rawFSH = [new RawFSH(input)];
  const tank = fillTank(rawFSH, config);

  // process FSH text into FHIR
  const outPackage = exportFHIR(tank, defs);

  return {
    fhir: outPackage,
    errors: errorsAndWarnings.errors,
    warnings: errorsAndWarnings.warnings
  };
}

type fshToFhirOptions = {
  canonical?: string;
  version?: string;
  dependencies?: ImplementationGuideDependsOn[];
  logLevel?: Level;
};

// Winston levels: https://github.com/winstonjs/winston#logging-levels plus a silent option
type Level = 'silly' | 'debug' | 'verbose' | 'http' | 'info' | 'warn' | 'error' | 'silent';
