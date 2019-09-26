// NOTE: This logic is roughly stolen from shr-fhir-export.  It probably could be refined for
// our specific use case.

// TODO: Load from package files instead of these static folders.

import { FHIRDefinitions } from './FHIRDefinitions';
import fs from 'fs';
import path from 'path';

const _cache: Map<string, FHIRDefinitions> = new Map();

export function load(fhirVersion: string): FHIRDefinitions {
  if (!_cache.has(fhirVersion)) {
    const result = new FHIRDefinitions(fhirVersion);
    // Load the base FHIR definitions
    const files = [
      `${__dirname}/fhir-${fhirVersion}/extension-definitions.json`,
      `${__dirname}/fhir-${fhirVersion}/profiles-resources.json`,
      `${__dirname}/fhir-${fhirVersion}/profiles-types.json`,
      `${__dirname}/fhir-${fhirVersion}/profiles-others.json`,
      `${__dirname}/fhir-${fhirVersion}/valuesets.json`
    ];
    for (const file of files) {
      const definitions = JSON.parse(fs.readFileSync(file, 'utf-8'));
      for (const entry of definitions.entry) {
        result.add(entry.resource);
      }
    }
    // Load external IGs (e.g., US Core)
    recursiveLoadIGPath(`${__dirname}/fhir-${fhirVersion}/IGs`, result);

    _cache.set(fhirVersion, result);
  }

  return _cache.get(fhirVersion);
}

function recursiveLoadIGPath(
  filePath: string,
  fhirDefinitions: FHIRDefinitions
): void {
  const stat = fs.lstatSync(filePath);
  if (stat.isDirectory()) {
    fs.readdirSync(filePath).forEach(file => {
      recursiveLoadIGPath(path.join(filePath, file), fhirDefinitions);
    });
  } else if (stat.isFile() && filePath.endsWith('.json')) {
    fhirDefinitions.add(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  }
}
