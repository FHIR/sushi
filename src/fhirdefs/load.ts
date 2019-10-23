// TODO: Load from package files instead of these static folders.
import { FHIRDefinitions } from './FHIRDefinitions';
import fs from 'fs';

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

    _cache.set(fhirVersion, result);
  }

  return _cache.get(fhirVersion);
}
