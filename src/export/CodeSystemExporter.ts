import { FSHTank } from '../import/FSHTank';
import { CodeSystem, CodeSystemConcept, StructureDefinition } from '../fhirtypes';
import { setPropertyOnInstance } from '../fhirtypes/common';
import { FshCodeSystem } from '../fshtypes';
import { CaretValueRule } from '../fshtypes/rules';
import { logger } from '../utils/FSHLogger';
import { MasterFisher, Type } from '../utils';
import { Package } from '.';

export class CodeSystemExporter {
  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private fisher: MasterFisher
  ) {}

  private setMetadata(codeSystem: CodeSystem, fshDefinition: FshCodeSystem): void {
    codeSystem.setName(fshDefinition.name, fshDefinition.sourceInfo);
    codeSystem.setId(fshDefinition.id, fshDefinition.sourceInfo);
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

  private setCaretRules(codeSystem: CodeSystem, rules: CaretValueRule[]) {
    const csStructureDefinition = StructureDefinition.fromJSON(
      this.fisher.fishForFHIR('CodeSystem', Type.Resource)
    );
    for (const rule of rules) {
      try {
        if (rule instanceof CaretValueRule) {
          const { fixedValue, pathParts } = csStructureDefinition.validateValueAtPath(
            rule.caretPath,
            rule.value,
            this.fisher
          );
          setPropertyOnInstance(codeSystem, pathParts, fixedValue);
        }
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    }
  }

  exportCodeSystem(fshDefinition: FshCodeSystem): CodeSystem {
    if (this.pkg.codeSystems.some(cs => cs.name === fshDefinition.name)) {
      return;
    }
    const codeSystem = new CodeSystem();
    this.setMetadata(codeSystem, fshDefinition);
    this.setCaretRules(codeSystem, fshDefinition.rules);
    this.setConcepts(codeSystem, fshDefinition);

    // check for another code system with the same id
    // see https://www.hl7.org/fhir/resource.html#id
    if (this.pkg.codeSystems.some(cs => codeSystem.id === cs.id)) {
      logger.error(
        `Multiple code systems with id ${codeSystem.id}. Each code system must have a unique id.`,
        fshDefinition.sourceInfo
      );
    }

    this.pkg.codeSystems.push(codeSystem);
    return codeSystem;
  }

  export(): Package {
    const codeSystems = this.tank.getAllCodeSystems();
    for (const cs of codeSystems) {
      try {
        this.exportCodeSystem(cs);
      } catch (e) {
        logger.error(e.message, cs.sourceInfo);
      }
    }
    if (codeSystems.length > 0) {
      logger.info(`Converted ${codeSystems.length} FHIR CodeSystems.`);
    }
    return this.pkg;
  }
}
