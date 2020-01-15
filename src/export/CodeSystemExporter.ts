import { FSHTank } from '../import/FSHTank';
import { CodeSystem, CodeSystemConcept } from '../fhirtypes';
import { FshCodeSystem } from '../fshtypes';
import { logger } from '../utils/FSHLogger';

export class CodeSystemExporter {
  public readonly codeSystems: CodeSystem[] = [];
  constructor(public readonly tank: FSHTank) {}

  private setMetadata(codeSystem: CodeSystem, fshDefinition: FshCodeSystem): void {
    codeSystem.name = fshDefinition.name;
    codeSystem.id = fshDefinition.id;
    if (fshDefinition.title) codeSystem.title = fshDefinition.title;
    if (fshDefinition.description) codeSystem.description = fshDefinition.description;
    codeSystem.url = `${this.tank.config.canonical}/CodeSystem/${codeSystem.id}`;
  }

  private setConcepts(codeSystem: CodeSystem, fshDefinition: FshCodeSystem): void {
    if (fshDefinition.concepts.length > 0) {
      codeSystem.concept = fshDefinition.concepts.map(concept => {
        const codeSystemConcept: CodeSystemConcept = { code: concept.code };
        if (concept.display) codeSystemConcept.display = concept.display;
        if (concept.definition) codeSystemConcept.definition = concept.definition;
        return codeSystemConcept;
      });
    }
  }

  exportCodeSystem(fshDefinition: FshCodeSystem): void {
    if (this.codeSystems.some(cs => cs.name === fshDefinition.name)) {
      return;
    }
    const codeSystem = new CodeSystem();
    this.setMetadata(codeSystem, fshDefinition);
    this.setConcepts(codeSystem, fshDefinition);
    this.codeSystems.push(codeSystem);
  }

  export(): CodeSystem[] {
    for (const cs of this.tank.getAllCodeSystems()) {
      try {
        this.exportCodeSystem(cs);
      } catch (e) {
        logger.error(e.message, cs.sourceInfo);
      }
    }
    return this.codeSystems;
  }
}
