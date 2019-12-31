import { StructureDefinitionExporter } from '../../src/export';
import { StructureDefinition, ResolveFn } from '../../src/fhirtypes';

export function spyResolve(
  exporter: StructureDefinitionExporter,
  resolve: ResolveFn
): jest.SpyInstance<StructureDefinition, [string]> {
  const exporterResolve = exporter.resolve.bind(exporter);
  const mockExporter = jest.spyOn(exporter, 'resolve').mockImplementation(
    (type: string): StructureDefinition => {
      let resolved = exporterResolve(type);
      if (!resolved) {
        resolved = resolve(type);
      }
      return resolved;
    }
  );
  return mockExporter;
}
