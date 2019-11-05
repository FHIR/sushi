import { exportFHIR } from '../../src/export';
import { FSHTank } from '../../src/import';

describe('FHIRExporter', () => {
  it('should output empty results with empty input', () => {
    const input = new FSHTank([]);
    const result = exportFHIR(input);
    expect(result).toEqual([]);
  });
});
