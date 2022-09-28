import { FSHTank } from '../import/FSHTank';
import { CodeSystem, CodeSystemConcept, StructureDefinition } from '../fhirtypes';
import {
  setPropertyOnDefinitionInstance,
  applyInsertRules,
  cleanResource
} from '../fhirtypes/common';
import { FshCodeSystem } from '../fshtypes';
import { CaretValueRule, ConceptRule } from '../fshtypes/rules';
import { logger } from '../utils/FSHLogger';
import { MasterFisher, Type, resolveSoftIndexing } from '../utils';
import { Package } from '.';
import { CannotResolvePathError } from '../errors';

export class CodeSystemExporter {
  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private fisher: MasterFisher
  ) {}

  private setMetadata(codeSystem: CodeSystem, fshDefinition: FshCodeSystem): void {
    codeSystem.setName(fshDefinition);
    codeSystem.setId(fshDefinition);
    if (fshDefinition.title) codeSystem.title = fshDefinition.title;
    if (fshDefinition.description) codeSystem.description = fshDefinition.description;
    delete codeSystem.version; // deleting to allow the IG Publisher default to take hold
    codeSystem.status = this.tank.config.status;
    codeSystem.url = `${this.tank.config.canonical}/CodeSystem/${codeSystem.id}`;
  }

  private setConcepts(codeSystem: CodeSystem, concepts: ConceptRule[]): void {
    if (concepts.length > 0) {
      codeSystem.concept = [];
      concepts.forEach(concept => {
        let conceptContainer = codeSystem.concept;
        const newConcept: CodeSystemConcept = { code: concept.code };
        if (concept.display) {
          newConcept.display = concept.display;
        }
        if (concept.definition) {
          newConcept.definition = concept.definition;
        }
        for (const ancestorCode of concept.hierarchy) {
          const ancestorConcept = conceptContainer.find(
            ancestorConcept => ancestorConcept.code === ancestorCode
          );
          if (ancestorConcept) {
            if (!ancestorConcept.concept) {
              ancestorConcept.concept = [];
            }
            conceptContainer = ancestorConcept.concept;
          } else {
            logger.error(
              `Could not find ${ancestorCode} in concept hierarchy to use as ancestor of ${concept.code}.`,
              concept.sourceInfo
            );
            return;
          }
        }
        conceptContainer.push(newConcept);
      });
    }
  }

  private setCaretPathRules(
    codeSystem: CodeSystem,
    csStructureDefinition: StructureDefinition,
    rules: CaretValueRule[]
  ) {
    // soft index resolution relies on the rule's path attribute.
    // a CaretValueRule is created with an empty path, so first
    // transform its arrayPath into a path.
    // Because this.findConceptPath can potentially throw an error,
    // build a list of successful rules that will actually be applied.
    const successfulRules: CaretValueRule[] = [];
    rules.forEach(rule => {
      try {
        rule.path = this.findConceptPath(codeSystem, rule.pathArray);
        successfulRules.push(rule);
        if (rule.path) {
          rule.isCodeCaretRule = true;
        }
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    });
    resolveSoftIndexing(successfulRules);
    for (const rule of successfulRules) {
      try {
        setPropertyOnDefinitionInstance(
          codeSystem,
          rule.path.length > 1 ? `${rule.path}.${rule.caretPath}` : rule.caretPath,
          rule.value,
          this.fisher
        );
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    }
  }

  private findConceptPath(codeSystem: CodeSystem, codePath: string[]): string {
    const conceptIndices: number[] = [];
    let conceptList = codeSystem.concept ?? [];
    for (const codeStep of codePath) {
      const stepIndex = conceptList.findIndex(concept => concept.code === codeStep);
      if (stepIndex === -1) {
        throw new CannotResolvePathError(codePath.map(code => `#${code}`).join(' '));
      }
      conceptIndices.push(stepIndex);
      conceptList = conceptList[stepIndex].concept ?? [];
    }
    return conceptIndices.map(conceptIndex => `concept[${conceptIndex}]`).join('.');
  }

  private countConcepts(concepts: CodeSystemConcept[]): number {
    if (concepts) {
      return (
        concepts.length +
        concepts
          .map(concept => this.countConcepts(concept.concept))
          .reduce((sum, next) => sum + next, 0)
      );
    } else {
      return 0;
    }
  }

  private updateCount(codeSystem: CodeSystem, fshDefinition: FshCodeSystem): void {
    // We can only derive a true count if the content is #complete
    if (codeSystem.content === 'complete') {
      const actualCount = this.countConcepts(codeSystem.concept) || undefined;
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
    const csStructureDefinition = StructureDefinition.fromJSON(
      this.fisher.fishForFHIR('CodeSystem', Type.Resource)
    );
    this.setConcepts(
      codeSystem,
      fshDefinition.rules.filter(rule => rule instanceof ConceptRule) as ConceptRule[]
    );
    this.setCaretPathRules(
      codeSystem,
      csStructureDefinition,
      fshDefinition.rules.filter(rule => rule instanceof CaretValueRule) as CaretValueRule[]
    );

    // check for another code system with the same id
    // see https://www.hl7.org/fhir/resource.html#id
    if (this.pkg.codeSystems.some(cs => codeSystem.id === cs.id)) {
      logger.error(
        `Multiple code systems with id ${codeSystem.id}. Each code system must have a unique id.`,
        fshDefinition.sourceInfo
      );
    }

    cleanResource(codeSystem, (prop: string) => ['_sliceName', '_primitive'].includes(prop));
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
