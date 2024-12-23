import { FSHTank } from '../import/FSHTank';
import { CodeSystem, CodeSystemConcept, PathPart, StructureDefinition } from '../fhirtypes';
import {
  setPropertyOnDefinitionInstance,
  applyInsertRules,
  cleanResource,
  determineKnownSlices,
  setImpliedPropertiesOnInstance,
  validateInstanceFromRawValue,
  isExtension,
  replaceReferences,
  splitOnPathPeriods,
  checkForMultipleChoice
} from '../fhirtypes/common';
import { FshCodeSystem } from '../fshtypes';
import { CaretValueRule, ConceptRule } from '../fshtypes/rules';
import { logger } from '../utils/FSHLogger';
import { MasterFisher, assembleFSHPath, resolveSoftIndexing } from '../utils';
import { InstanceExporter, Package } from '.';
import { CannotResolvePathError, MismatchedTypeError } from '../errors';
import { isEqual } from 'lodash';

export class CodeSystemExporter {
  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private fisher: MasterFisher
  ) {}

  private setMetadata(codeSystem: CodeSystem, fshDefinition: FshCodeSystem): void {
    codeSystem.setName(fshDefinition);
    codeSystem.setId(fshDefinition);
    if (fshDefinition.title == '') {
      logger.warn(`Code system ${fshDefinition.name} has a title field that should not be empty.`);
    }
    if (fshDefinition.description == '') {
      logger.warn(
        `Code system ${fshDefinition.name} has a description field that should not be empty.`
      );
    }
    if (fshDefinition.title) codeSystem.title = fshDefinition.title;
    if (fshDefinition.description) codeSystem.description = fshDefinition.description;
    if (this.tank.config.FSHOnly) {
      codeSystem.version = this.tank.config.version;
    } else {
      delete codeSystem.version; // deleting to allow the IG Publisher default to take hold
    }
    codeSystem.status = this.tank.config.status;
    codeSystem.url = `${this.tank.config.canonical}/CodeSystem/${codeSystem.id}`;
  }

  private setConcepts(codeSystem: CodeSystem, concepts: ConceptRule[]): void {
    if (concepts.length > 0) {
      codeSystem.concept = [];
      const existingConcepts = new Map<string, ConceptRule>();
      concepts.forEach(concept => {
        const existingConcept = existingConcepts.get(concept.code);
        if (existingConcept) {
          // if this concept has only a code (and optionally, a hierarchy),
          // and the existing concept has the same code and hierarchy,
          // this concept may just be used to establish path context, which is fine.
          if (
            !(
              concept.display == null &&
              concept.definition == null &&
              isEqual(concept.hierarchy, existingConcept.hierarchy)
            )
          ) {
            // duplicates are prohibited: http://hl7.org/fhir/codesystem.html#invs
            logger.error(
              `CodeSystem ${codeSystem.id} already contains code ${concept.code}.`,
              concept.sourceInfo
            );
          }
        } else {
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
          existingConcepts.set(concept.code, concept);
        }
      });
    }
  }

  private setCaretPathRules(
    codeSystem: CodeSystem,
    rules: CaretValueRule[],
    codeSystemSD: StructureDefinition
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
        if (e.stack) {
          logger.debug(e.stack);
        }
      }
    });
    resolveSoftIndexing(successfulRules);

    // a codesystem is a specific case where the only implied values are going to be extension urls.
    // so, we only need to track rules that involve an extension.
    const ruleMap: Map<string, { pathParts: PathPart[] }> = new Map();
    // in order to validate rules that set values on contained resources, we need to track information from rules
    // that define the types of those resources. those types could be defined by rules on the "resourceType" element,
    // or they could be defined by the existing resource that is being assigned.
    const inlineResourcePaths: { path: string; caretPath: string; instanceOf: string }[] = [];
    // first, collect the information we can from rules that set a resourceType
    // if instances are directly assigned, we'll get information from them when we fish up the instance.
    successfulRules.forEach((r: CaretValueRule) => {
      if (r.caretPath.endsWith('.resourceType') && typeof r.value === 'string' && !r.isInstance) {
        inlineResourcePaths.push({
          path: r.path,
          caretPath: splitOnPathPeriods(r.caretPath).slice(0, -1).join('.'),
          instanceOf: r.value
        });
      }
    });
    const successfulRulesWithInstances = successfulRules
      .map(rule => {
        if (rule.isInstance) {
          const instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
          const instance = instanceExporter.fishForFHIR(rule.value as string);
          if (instance == null) {
            logger.error(
              `Cannot find definition for Instance: ${rule.value}. Skipping rule.`,
              rule.sourceInfo
            );
            return null;
          }
          if (instance._instanceMeta.usage === 'Example') {
            logger.warn(
              `Contained instance "${rule.value}" is an example and probably should not be included in a conformance resource.`,
              rule.sourceInfo
            );
          }
          rule.value = instance;
          // since we found a resource, save its type in our list of inline resource paths.
          inlineResourcePaths.push({
            path: rule.path,
            caretPath: rule.caretPath,
            instanceOf: instance.resourceType
          });
        }
        // the relevant inline resource paths for the current rule are rules with:
        // - the same path
        // - a caret path that is an ancestor of the current rule's path
        // - and also, the current rule's caret path can not be this other rule's caret path followed by "resourceType".
        const matchingInlineResourcePaths = inlineResourcePaths.filter(i => {
          return (
            rule.path == i.path &&
            rule.caretPath.startsWith(`${i.caretPath}.`) &&
            rule.caretPath !== `${i.caretPath}.resourceType`
          );
        });
        const inlineResourceTypes: string[] = [];
        // for each of those matches, we build up the inline resource types array.
        // this is a sparse array that is parallel to an array of the parts of the current rule's caret path.
        // this will usually only have one defined element, but may have more if a contained resource includes other assigned resources.
        // a typical case could be something like: a caret path of "contained.interpretation" which sets a value on a contained Observation,
        // and the resulting inline resource paths array being ["Observation"].
        // a case with multiple elements could be: a caret path of "contained.entry.resource.interpretation"
        // and the resulting inline resource paths array being ["Bundle", undefined, "Observation"]
        matchingInlineResourcePaths.forEach(match => {
          inlineResourceTypes[splitOnPathPeriods(match.caretPath).length - 1] = match.instanceOf;
        });
        const path = rule.path.length > 1 ? `${rule.path}.${rule.caretPath}` : rule.caretPath;
        try {
          const replacedRule = replaceReferences(rule, this.tank, this.fisher);
          const { pathParts } = codeSystemSD.validateValueAtPath(
            path,
            replacedRule.value,
            this.fisher,
            inlineResourceTypes
          );
          if (pathParts.some(part => isExtension(part.base))) {
            ruleMap.set(assembleFSHPath(pathParts).replace(/\[0+\]/g, ''), { pathParts });
          }
          return { rule: replacedRule, inlineResourceTypes };
        } catch (originalErr) {
          // if an Instance has an id that looks like a number, bigint, or boolean,
          // we may have tried to assign that value instead of an Instance.
          // try to fish up an Instance with the rule's raw value.
          // if we find one, try assigning that instead.
          if (
            originalErr instanceof MismatchedTypeError &&
            ['number', 'bigint', 'boolean'].includes(typeof rule.value)
          ) {
            const instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
            const { instance, pathParts } = validateInstanceFromRawValue(
              codeSystem,
              rule,
              instanceExporter,
              this.fisher,
              originalErr,
              inlineResourceTypes
            );
            if (instance?._instanceMeta.usage === 'Example') {
              logger.warn(
                `Contained instance "${rule.rawValue}" is an example and probably should not be included in a conformance resource.`,
                rule.sourceInfo
              );
            }
            rule.value = instance;
            if (instance != null) {
              // this rule ended up assigning an instance, so save its type in our list of inline resource paths.
              inlineResourcePaths.push({
                path: rule.path,
                caretPath: rule.caretPath,
                instanceOf: instance.resourceType
              });
            }
            if (pathParts.some(part => isExtension(part.base))) {
              ruleMap.set(assembleFSHPath(pathParts).replace(/\[0+\]/g, ''), { pathParts });
            }
            return { rule, inlineResourceTypes };
          } else {
            logger.error(originalErr.message, rule.sourceInfo);
            if (originalErr.stack) {
              logger.debug(originalErr.stack);
            }
            return null;
          }
        }
      })
      .filter(rule => rule);
    const knownSlices = determineKnownSlices(codeSystemSD, ruleMap, this.fisher);
    setImpliedPropertiesOnInstance(
      codeSystem,
      codeSystemSD,
      [...ruleMap.keys()],
      inlineResourcePaths.map(i => i.caretPath),
      this.fisher,
      knownSlices
    );

    for (const { rule, inlineResourceTypes } of successfulRulesWithInstances) {
      try {
        setPropertyOnDefinitionInstance(
          codeSystem,
          rule.path.length > 1 ? `${rule.path}.${rule.caretPath}` : rule.caretPath,
          rule.value,
          this.fisher,
          inlineResourceTypes
        );
      } catch (err) {
        logger.error(err.message, rule.sourceInfo);
        if (err.stack) {
          logger.debug(err.stack);
        }
      }
    }
  }

  private findConceptPath(codeSystem: CodeSystem, codePath: string[]): string {
    const conceptIndices: number[] = [];
    let conceptList = codeSystem.concept ?? [];
    for (const codeStep of codePath) {
      const stepIndex = conceptList.findIndex(concept => `#${concept.code}` === codeStep);
      if (stepIndex === -1) {
        throw new CannotResolvePathError(codePath.join(' '));
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

  applyInsertRules(): void {
    const codeSystems = this.tank.getAllCodeSystems();
    for (const cs of codeSystems) {
      applyInsertRules(cs, this.tank);
    }
  }

  exportCodeSystem(fshDefinition: FshCodeSystem): CodeSystem {
    if (this.pkg.codeSystems.some(cs => cs.name === fshDefinition.name)) {
      return;
    }
    const codeSystem = new CodeSystem();
    const codeSystemSD = codeSystem.getOwnStructureDefinition(this.fisher);
    this.setMetadata(codeSystem, fshDefinition);
    this.setConcepts(
      codeSystem,
      fshDefinition.rules.filter(rule => rule instanceof ConceptRule) as ConceptRule[]
    );
    this.setCaretPathRules(
      codeSystem,
      fshDefinition.rules.filter(rule => rule instanceof CaretValueRule) as CaretValueRule[],
      codeSystemSD
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
    checkForMultipleChoice(fshDefinition, codeSystem, codeSystemSD);
    this.updateCount(codeSystem, fshDefinition);
    this.pkg.codeSystems.push(codeSystem);
    this.pkg.fshMap.set(codeSystem.getFileName(), {
      ...fshDefinition.sourceInfo,
      fshName: fshDefinition.name,
      fshType: 'CodeSystem'
    });
    return codeSystem;
  }

  export(): Package {
    const codeSystems = this.tank.getAllCodeSystems();
    for (const cs of codeSystems) {
      try {
        this.exportCodeSystem(cs);
      } catch (e) {
        logger.error(e.message, cs.sourceInfo);
        if (e.stack) {
          logger.debug(e.stack);
        }
      }
    }
    if (codeSystems.length > 0) {
      logger.info(`Converted ${codeSystems.length} FHIR CodeSystems.`);
    }
    return this.pkg;
  }
}
