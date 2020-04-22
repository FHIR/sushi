import { exportFHIR, Package } from '../../src/export';
import { FSHTank } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';

describe('FHIRExporter', () => {
  it('should output empty results with empty input', () => {
    const input = new FSHTank(
      [],
      {
        name: 'test',
        version: '0.0.1',
        canonical: 'http://example.com'
      },
      {
        filePath: 'config.yaml',
        id: 'test',
        version: '0.0.1',
        url: 'http://example.com',
        name: 'Test',
        status: 'draft',
        fhirVersion: ['4.0.1'],
        template: 'hl7.fhir.template#0.0.5'
      }
    );
    const result = exportFHIR(input, new FHIRDefinitions());
    expect(result).toEqual(
      new Package(
        {
          name: 'test',
          version: '0.0.1',
          canonical: 'http://example.com'
        },
        {
          filePath: 'config.yaml',
          id: 'test',
          version: '0.0.1',
          url: 'http://example.com',
          name: 'Test',
          status: 'draft',
          fhirVersion: ['4.0.1'],
          template: 'hl7.fhir.template#0.0.5'
        }
      )
    );
  });
});
