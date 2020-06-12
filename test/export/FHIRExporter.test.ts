import { exportFHIR, Package } from '../../src/export';
import { FSHTank } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { minimalConfig } from '../utils/minimalConfig';

describe('FHIRExporter', () => {
  it('should output empty results with empty input', () => {
    const input = new FSHTank([], minimalConfig);
    const result = exportFHIR(input, new FHIRDefinitions());
    expect(result).toEqual(
      new Package({
        filePath: 'config.yaml',
        id: 'fhir.us.minimal',
        version: '1.0.0',
        canonical: 'http://hl7.org/fhir/us/minimal',
        name: 'MinimalIG',
        status: 'draft',
        fhirVersion: ['4.0.1'],
        template: 'hl7.fhir.template#0.0.5'
      })
    );
  });
});
