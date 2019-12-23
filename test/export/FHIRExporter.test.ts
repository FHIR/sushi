import { exportFHIR, Package } from '../../src/export';
import { FSHTank } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';

describe('FHIRExporter', () => {
  it('should output empty results with empty input', () => {
    const input = new FSHTank([], {
      name: 'test',
      version: '0.0.1',
      canonical: 'http://example.com'
    });
    const result = exportFHIR(input, new FHIRDefinitions());
    expect(result).toEqual(
      new Package([], [], { name: 'test', version: '0.0.1', canonical: 'http://example.com' })
    );
  });
});
