import { RawFSH } from '../import';
import { exportFHIR, Package } from '../export';
import { FHIRDefinitions } from '../fhirdefs';
import { ImplementationGuideDependsOn } from '../fhirtypes';
import { fillTank, loadExternalDependencies, logger, errorsAndWarnings } from '../utils';

export async function fshToFhir(
  input: string,
  options: fshToFhirOptions
): Promise<{
  fhir: Package;
  errors: { message: string; location: string }[];
  warnings: { message: string; location: string }[];
}> {
  // track errors and warnings, and determine log level from options
  errorsAndWarnings.shouldTrack = true;
  if (options.logLevel == null) {
    logger.transports[0].silent = true;
  } else {
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

  // QUESTION: Could just convert to JSON here, not sure which is more useful
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
  logLevel?: string;
};
