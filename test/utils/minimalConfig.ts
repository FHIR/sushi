import { Configuration } from '../../src/fshtypes';

export const minimalConfig: Configuration = {
  filePath: 'sushi-config.yaml',
  id: 'fhir.us.minimal',
  canonical: 'http://hl7.org/fhir/us/minimal',
  name: 'MinimalIG',
  status: 'draft',
  version: '1.0.0',
  fhirVersion: ['4.0.1'],
  template: 'hl7.fhir.template#0.0.5'
};
