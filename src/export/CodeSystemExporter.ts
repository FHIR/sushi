import { FSHTank } from '../import/FSHTank';
import { CodeSystem, CodeSystemConcept, StructureDefinition } from '../fhirtypes';
import { setPropertyOnInstance, applyInsertRules } from '../fhirtypes/common';
import { FshCodeSystem } from '../fshtypes';
import { CaretValueRule, ConceptRule } from '../fshtypes/rules';
import { logger } from '../utils/FSHLogger';
import { MasterFisher, Type, resolveSoftIndexing } from '../utils';
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

  private setConcepts(codeSystem: CodeSystem, concepts: ConceptRule[]): void {
    if (concepts.length > 0) {
      codeSystem.concept = concepts.map(concept => {
        const codeSystemConcept: CodeSystemConcept = { code: concept.code };
        if (concept.display) codeSystemConcept.display = concept.display;
        if (concept.definition) codeSystemConcept.definition = concept.definition;
        return codeSystemConcept;
      });
    }
  }

  private setCaretRules(codeSystem: CodeSystem, rules: CaretValueRule[]): void {
    const csStructureDefinition = StructureDefinition.fromJSON(
      this.fisher.fishForFHIR('CodeSystem', Type.Resource)
    );
    resolveSoftIndexing(rules);
    for (const rule of rules) {
      try {
        const { assignedValue, pathParts } = csStructureDefinition.validateValueAtPath(
          rule.caretPath,
          rule.value,
          this.fisher
        );
        setPropertyOnInstance(codeSystem, pathParts, assignedValue, this.fisher);
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    }
  }

  private updateCount(codeSystem: CodeSystem, fshDefinition: FshCodeSystem): void {
    // We can only derive a true count if the content is #complete
    if (codeSystem.content === 'complete') {
      const actualCount = codeSystem.concept?.length;
      if (codeSystem.count == null && actualCount != null) {
        codeSystem.count = actualCount;
      } else if (codeSystem.count !== actualCount) {
        const countRule = fshDefinition.rules.find(
          r => r instanceof CaretValueRule && r.caretPath === 'count'
        );
        const sourceInfo = countRule?.sourceInfo ?? fshDefinition.sourceInfo;
        logger.warn(
          `The user-specified ^count (${codeSystem.count}) does not match the specified number of concepts ` +
            `(${
              actualCount ?? 0
            }). If this is not a "complete" CodeSystem, set the ^content property to the appropriate ` +
            'value; otherwise fix or remove the ^count.',
          sourceInfo
        );
      }
    }
  }

  exportCodeSystem(fshDefinition: FshCodeSystem): CodeSystem {
    if (this.pkg.codeSystems.some(cs => cs.name === fshDefinition.name)) {
      return;
    }
    const codeSystem = new CodeSystem();
    this.setMetadata(codeSystem, fshDefinition);
    // fshDefinition.rules may include insert rules, which must be expanded before applying other rules
    applyInsertRules(fshDefinition, this.tank);
    this.setCaretRules(
      codeSystem,
      fshDefinition.rules.filter(rule => rule instanceof CaretValueRule) as CaretValueRule[]
    );
    this.setConcepts(
      codeSystem,
      fshDefinition.rules.filter(rule => rule instanceof ConceptRule) as ConceptRule[]
    );

    // check for another code system with the same id
    // see https://www.hl7.org/fhir/resource.html#id
    if (this.pkg.codeSystems.some(cs => codeSystem.id === cs.id)) {
      logger.error(
        `Multiple code systems with id ${codeSystem.id}. Each code system must have a unique id.`,
        fshDefinition.sourceInfo
      );
    }

    this.updateCount(codeSystem, fshDefinition);
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
