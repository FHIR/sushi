import { FSHTank } from '../import/FSHTank';
import { CodeSystem, CodeSystemConcept, validateFHIRId } from '../fhirtypes';
import { FshCodeSystem } from '../fshtypes';
import { logger } from '../utils/FSHLogger';
import { Package } from '.';
import { validateFHIRName } from '../fhirtypes/common';

export class CodeSystemExporter {
  constructor(private readonly tank: FSHTank, private readonly pkg: Package) {}

  private setMetadata(codeSystem: CodeSystem, fshDefinition: FshCodeSystem): void {
    codeSystem.name = fshDefinition.name;
    codeSystem.id = fshDefinition.id;
    try {
      validateFHIRName(codeSystem.name);
    } catch (ex) {
      logger.error(ex.message, fshDefinition.sourceInfo);
    }
    try {
      validateFHIRId(codeSystem.id);
    } catch (ex) {
      logger.error(ex.message, fshDefinition.sourceInfo);
    }
    if (fshDefinition.title) codeSystem.title = fshDefinition.title;
    if (fshDefinition.description) codeSystem.description = fshDefinition.description;
    // Version is set to value provided in config, will be overriden if reset by rules
    codeSystem.version = this.tank.config.version;
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

  exportCodeSystem(fshDefinition: FshCodeSystem): CodeSystem {
    if (this.pkg.codeSystems.some(cs => cs.name === fshDefinition.name)) {
      return;
    }
    const codeSystem = new CodeSystem();
    this.setMetadata(codeSystem, fshDefinition);
    this.setConcepts(codeSystem, fshDefinition);
    this.pkg.codeSystems.push(codeSystem);
    return codeSystem;
  }

  export(): Package {
    for (const cs of this.tank.getAllCodeSystems()) {
      try {
        this.exportCodeSystem(cs);
      } catch (e) {
        logger.error(e.message, cs.sourceInfo);
      }
    }
    return this.pkg;
  }
}
