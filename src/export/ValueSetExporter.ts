import {
  ValueSet,
  ValueSetComposeIncludeOrExclude,
  ValueSetComposeConcept,
  PathPart,
  StructureDefinition
} from '../fhirtypes';
import { FSHTank } from '../import/FSHTank';
import { FshValueSet, FshCode, ValueSetFilterValue, FshCodeSystem, Instance } from '../fshtypes';
import { logger } from '../utils/FSHLogger';
import { ValueSetComposeError, InvalidUriError, MismatchedTypeError } from '../errors';
import { InstanceExporter, Package } from '.';
import { MasterFisher, Type, assembleFSHPath, resolveSoftIndexing } from '../utils';
import {
  CaretValueRule,
  ValueSetComponentRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule
} from '../fshtypes/rules';
import {
  applyInsertRules,
  listUndefinedLocalCodes,
  setPropertyOnDefinitionInstance,
  cleanResource,
  validateInstanceFromRawValue,
  determineKnownSlices,
  setImpliedPropertiesOnInstance,
  splitOnPathPeriods,
  checkForMultipleChoice
} from '../fhirtypes/common';
import { isUri } from 'valid-url';
import { flatMap, partition, xor } from 'lodash';

export class ValueSetExporter {
  constructor(
    private readonly tank: FSHTank,
    private pkg: Package,
    private fisher: MasterFisher
  ) {}

  private setMetadata(valueSet: ValueSet, fshDefinition: FshValueSet): void {
    valueSet.setName(fshDefinition);
    valueSet.setId(fshDefinition);
    if (fshDefinition.title == '') {
      logger.warn(`Value set ${fshDefinition.name} has a title field that should not be empty.`);
    }
    if (fshDefinition.description == '') {
      logger.warn(
        `Value set ${fshDefinition.name} has a description field that should not be empty.`
      );
    }
    if (fshDefinition.title) {
      valueSet.title = fshDefinition.title;
    }
    if (fshDefinition.description) {
      valueSet.description = fshDefinition.description;
    }
    if (this.tank.config.FSHOnly) {
      valueSet.version = this.tank.config.version;
    } else {
      delete valueSet.version; // deleting to allow the IG Publisher default to take hold
    }
    valueSet.status = this.tank.config.status;
    valueSet.url = `${this.tank.config.canonical}/ValueSet/${valueSet.id}`;
  }

  private setCompose(valueSet: ValueSet, components: ValueSetComponentRule[]) {
    if (components.length > 0) {
      valueSet.compose = {
        include: [],
        exclude: []
      };
      components.forEach(component => {
        const composeElement: ValueSetComposeIncludeOrExclude = {};
        if (component.from.system) {
          const systemParts = component.from.system.split('|');
          const csMetadata = this.fisher.fishForMetadata(component.from.system, Type.CodeSystem);
          // if we found metadata, use it.
          // if we didn't find any matching metadata, the code system might be defined directly on the valueset.
          let isContainedSystem: boolean;
          let systemIsInlineInstance = false;
          let systemId: string;
          if (csMetadata) {
            composeElement.system = csMetadata.url ?? systemParts[0];
            isContainedSystem = valueSet.contained?.some((resource: any) => {
              return resource?.id === csMetadata.id && resource.resourceType === 'CodeSystem';
            });
            systemIsInlineInstance = csMetadata.instanceUsage === 'Inline';
            systemId = csMetadata.id;
          } else {
            const directSystem: any = valueSet.contained?.find((resource: any) => {
              return (
                (resource?.id === component.from.system ||
                  resource?.name === component.from.system ||
                  resource?.url === component.from.system) &&
                resource?.resourceType === 'CodeSystem'
              );
            });
            if (directSystem) {
              isContainedSystem = true;
              composeElement.system = directSystem.url;
              systemId = directSystem.id;
            } else {
              isContainedSystem = false;
              composeElement.system = systemParts[0];
            }
          }
          // if the code system is also a contained resource, add the valueset-system extension
          // this zulip thread contains a discussion of the issue and an example using this extension:
          // https://chat.fhir.org/#narrow/stream/215610-shorthand/topic/Contained.20code.20system.20in.20the.20value.20set/near/424938537
          // additionally, if it's not a contained resource, and the system we found is an inline instance, that's a problem
          if (isContainedSystem) {
            composeElement._system = {
              extension: [
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/valueset-system',
                  valueCanonical: `#${systemId}`
                }
              ]
            };
          } else if (systemIsInlineInstance) {
            logger.error(
              `Can not reference CodeSystem ${component.from.system}: this CodeSystem is an inline instance, but it is not present in the list of contained resources.`,
              component.sourceInfo
            );
            return;
          }

          // if the rule specified a version, use that version.
          composeElement.version = systemParts.slice(1).join('|') || undefined;
          if (!isUri(composeElement.system)) {
            throw new InvalidUriError(composeElement.system);
          }
        }
        if (component.from.valueSets) {
          composeElement.valueSet = component.from.valueSets.map(vs => {
            return this.fisher.fishForMetadata(vs, Type.ValueSet)?.url ?? vs;
          });
          composeElement.valueSet = composeElement.valueSet.filter(vs => {
            if (vs == valueSet.url) {
              logger.error(
                `Value set with id ${valueSet.id} has component rule with self-referencing value set (by id, value set name, or url). Removing self-reference.`
              );
            }
            return vs != valueSet.url;
          });
          composeElement.valueSet.forEach(vs => {
            // Canonical URI may include | to specify version: https://www.hl7.org/fhir/references.html#canonical
            if (!isUri(vs.split('|')[0])) {
              throw new InvalidUriError(vs);
            }
          });
        }
        if (component instanceof ValueSetConceptComponentRule && component.concepts.length > 0) {
          composeElement.concept = component.concepts.map(concept => {
            const composeConcept: ValueSetComposeConcept = {
              code: concept.code
            };
            if (concept.display) {
              composeConcept.display = concept.display;
            }
            return composeConcept;
          });
          // if we can fish up the system in the tank, it's local, and we should check the listed concepts
          const codeSystem = this.tank.fish(composeElement.system, Type.CodeSystem);
          if (codeSystem instanceof FshCodeSystem || codeSystem instanceof Instance) {
            listUndefinedLocalCodes(
              codeSystem,
              composeElement.concept.map(concept => concept.code),
              this.tank,
              component
            );
          }
        } else if (
          component instanceof ValueSetFilterComponentRule &&
          component.filters.length > 0
        ) {
          composeElement.filter = component.filters.map(filter => {
            // if filter.value is a FshCode, perform the local code system check here as well
            if (filter.value instanceof FshCode) {
              const codeSystem = this.tank.fish(composeElement.system, Type.CodeSystem);
              if (codeSystem instanceof FshCodeSystem || codeSystem instanceof Instance) {
                listUndefinedLocalCodes(
                  codeSystem,
                  [(filter.value as FshCode).code],
                  this.tank,
                  component
                );
              }
            }

            return {
              property: filter.property.toString(),
              op: filter.operator.toString(),
              value: this.filterValueToString(filter.value)
            };
          });
        }
        if (component.inclusion) {
          if (composeElement.concept?.length > 0) {
            // warn the user if they have already included a concept in this component
            // concept, system, and version must all match to be considered equal
            const matchingComposeElements = valueSet.compose.include.filter(compose => {
              return (
                compose.system === composeElement.system &&
                compose.version === composeElement.version &&
                compose.concept?.length > 0
              );
            });
            const potentialMatches = flatMap(
              matchingComposeElements,
              compose => compose.concept
            ).map(concept => concept.code);
            composeElement.concept = composeElement.concept.filter(
              (concept, idx, currentConcepts) => {
                if (
                  potentialMatches.includes(concept.code) ||
                  currentConcepts
                    .slice(0, idx)
                    .some(duplicateConcept => duplicateConcept.code === concept.code)
                ) {
                  logger.warn(
                    `ValueSet ${valueSet.name} already includes ${composeElement.system}${
                      composeElement.version ? `|${composeElement.version}` : ''
                    }#${concept.code}`,
                    component.sourceInfo
                  );
                  return false;
                }
                return true;
              }
            );
            if (composeElement.concept.length > 0) {
              this.addConceptComposeElement(composeElement, valueSet.compose.include);
            }
          } else {
            if (composeElement.valueSet?.length !== 0 || composeElement.system != undefined) {
              valueSet.compose.include.push(composeElement);
            }
          }
        } else {
          this.addConceptComposeElement(composeElement, valueSet.compose.exclude);
        }
      });
      if (valueSet.compose.exclude.length == 0) {
        delete valueSet.compose.exclude;
      }
    }
  }

  private addConceptComposeElement(
    freshElement: ValueSetComposeIncludeOrExclude,
    composeList: ValueSetComposeIncludeOrExclude[]
  ): void {
    if (freshElement.concept?.length > 0) {
      const matchingFromIndex = composeList.findIndex(compose => {
        return (
          compose.system === freshElement.system &&
          compose.version === freshElement.version &&
          compose.concept?.length > 0 &&
          xor(compose.valueSet ?? [], freshElement.valueSet ?? []).length === 0
        );
      });
      if (matchingFromIndex > -1) {
        composeList[matchingFromIndex].concept.push(...freshElement.concept);
      } else {
        composeList.push(freshElement);
      }
    } else {
      composeList.push(freshElement);
    }
  }

  private setCaretRules(
    valueSet: ValueSet,
    rules: CaretValueRule[],
    valueSetSD: StructureDefinition
  ) {
    resolveSoftIndexing(rules);

    const ruleMap: Map<string, { pathParts: PathPart[] }> = new Map();
    // in order to validate rules that set values on contained resources, we need to track information from rules
    // that define the types of those resources. those types could be defined by rules on the "resourceType" element,
    // or they could be defined by the existing resource that is being assigned.
    // the path is always empty for these rules, so we don't need to track or check those.
    const inlineResourcePaths: { caretPath: string; instanceOf: string }[] = [];
    // first, collect the information we can from rules that set a resourceType
    // if instances are directly assigned, we'll get information from them when we fish up the instance.
    rules.forEach((r: CaretValueRule) => {
      if (r.caretPath.endsWith('.resourceType') && typeof r.value === 'string' && !r.isInstance) {
        inlineResourcePaths.push({
          caretPath: splitOnPathPeriods(r.caretPath).slice(0, -1).join('.'),
          instanceOf: r.value
        });
      }
    });
    const rulesWithInstances = rules
      .filter(rule => rule instanceof CaretValueRule)
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
            caretPath: rule.caretPath,
            instanceOf: instance.resourceType
          });
        }
        // the relevant inline resource paths for the current rule are rules with:
        // - a caret path that is an ancestor of the current rule's path
        // - and also, the current rule's caret path can not be this other rule's caret path followed by "resourceType".
        const matchingInlineResourcePaths = inlineResourcePaths.filter(i => {
          return (
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
        try {
          const { pathParts } = valueSetSD.validateValueAtPath(
            rule.caretPath,
            rule.value,
            this.fisher,
            inlineResourceTypes
          );
          ruleMap.set(assembleFSHPath(pathParts).replace(/\[0+\]/g, ''), { pathParts });
          return { rule, inlineResourceTypes };
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
              valueSet,
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
                caretPath: rule.caretPath,
                instanceOf: instance.resourceType
              });
            }
            ruleMap.set(assembleFSHPath(pathParts).replace(/\[0+\]/g, ''), { pathParts });
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
    const knownSlices = determineKnownSlices(valueSetSD, ruleMap, this.fisher);
    setImpliedPropertiesOnInstance(
      valueSet,
      valueSetSD,
      [...ruleMap.keys()],
      inlineResourcePaths.map(i => i.caretPath),
      this.fisher,
      knownSlices
    );

    for (const { rule, inlineResourceTypes } of rulesWithInstances) {
      try {
        setPropertyOnDefinitionInstance(
          valueSet,
          rule.caretPath,
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

  private setConceptCaretRules(
    vs: ValueSet,
    rules: CaretValueRule[],
    valueSetSD: StructureDefinition
  ) {
    resolveSoftIndexing(rules);
    const ruleMap: Map<string, { pathParts: PathPart[]; rule: CaretValueRule }> = new Map();
    for (const rule of rules) {
      const splitConcept = rule.pathArray[0].split('#');
      const system = splitConcept[0];
      const baseSystem = system?.split('|')[0];
      const version = system?.split('|')[1];
      const code = splitConcept.slice(1).join('#');
      const systemMeta = this.fisher.fishForMetadata(baseSystem, Type.CodeSystem);
      let composeIndex =
        vs.compose?.include?.findIndex(composeElement => {
          return (
            (composeElement.system === baseSystem && composeElement.version === version) ||
            (composeElement.system === systemMeta?.url && composeElement.version === version)
          );
        }) ?? -1;
      let composeArray: string;
      let composeElement: ValueSetComposeIncludeOrExclude;
      let conceptIndex = -1;
      if (composeIndex !== -1) {
        composeArray = 'include';
        composeElement = vs.compose.include[composeIndex];
        conceptIndex = composeElement?.concept?.findIndex(concept => {
          return concept.code === code;
        });
      }
      if (conceptIndex === -1) {
        composeIndex =
          vs.compose?.exclude?.findIndex(composeElement => {
            return composeElement.system === baseSystem;
          }) ?? -1;
        if (composeIndex !== -1) {
          composeArray = 'exclude';
          composeElement = vs.compose.exclude[composeIndex];
          conceptIndex = composeElement?.concept?.findIndex(concept => {
            return concept.code === code;
          });
        }
      }

      if (conceptIndex !== -1) {
        if (rule.isInstance) {
          const instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
          const instance = instanceExporter.fishForFHIR(rule.value as string);
          if (instance == null) {
            logger.error(
              `Cannot find definition for Instance: ${rule.value}. Skipping rule.`,
              rule.sourceInfo
            );
            continue;
          }
          rule.value = instance;
        }
        const fullPath = `compose.${composeArray}[${composeIndex}].concept[${conceptIndex}].${rule.caretPath}`;
        try {
          const { pathParts } = valueSetSD.validateValueAtPath(fullPath, rule.value, this.fisher);
          ruleMap.set(fullPath, { pathParts, rule });
        } catch (e) {
          logger.error(e.message, rule.sourceInfo);
          if (e.stack) {
            logger.debug(e.stack);
          }
        }
      } else {
        logger.error(
          `Could not find concept ${rule.pathArray[0]}, skipping rule.`,
          rule.sourceInfo
        );
      }
    }

    const knownSlices = determineKnownSlices(valueSetSD, ruleMap, this.fisher);
    setImpliedPropertiesOnInstance(
      vs,
      valueSetSD,
      [...ruleMap.keys()],
      [],
      this.fisher,
      knownSlices
    );

    for (const [path, { rule }] of ruleMap) {
      setPropertyOnDefinitionInstance(vs, path, rule.value, this.fisher);
    }
  }

  private filterValueToString(value: ValueSetFilterValue): string {
    if (value instanceof RegExp) {
      return value.source;
    } else if (value instanceof FshCode) {
      return value.code;
    } else {
      return value.toString();
    }
  }

  applyInsertRules(): void {
    const valueSets = this.tank.getAllValueSets();
    for (const vs of valueSets) {
      applyInsertRules(vs, this.tank);
    }
  }

  export(): Package {
    const valueSets = this.tank.getAllValueSets();
    for (const valueSet of valueSets) {
      try {
        this.exportValueSet(valueSet);
      } catch (e) {
        logger.error(e.message, valueSet.sourceInfo);
        if (e.stack) {
          logger.debug(e.stack);
        }
      }
    }
    if (valueSets.length > 0) {
      logger.info(`Converted ${valueSets.length} FHIR ValueSets.`);
    }
    return this.pkg;
  }

  exportValueSet(fshDefinition: FshValueSet): ValueSet {
    if (this.pkg.valueSets.some(vs => vs.name === fshDefinition.name)) {
      return;
    }
    const vs = new ValueSet();
    const valueSetSD = vs.getOwnStructureDefinition(this.fisher);
    this.setMetadata(vs, fshDefinition);
    const [conceptCaretRules, otherCaretRules] = partition(
      fshDefinition.rules.filter(rule => rule instanceof CaretValueRule) as CaretValueRule[],
      caretRule => {
        return caretRule.pathArray.length > 0;
      }
    );
    this.setCaretRules(vs, otherCaretRules, valueSetSD);
    this.setCompose(
      vs,
      fshDefinition.rules.filter(
        rule => rule instanceof ValueSetComponentRule
      ) as ValueSetComponentRule[]
    );
    conceptCaretRules.forEach(rule => (rule.isCodeCaretRule = true));
    this.setConceptCaretRules(vs, conceptCaretRules, valueSetSD);
    if (vs.compose && vs.compose.include.length == 0) {
      throw new ValueSetComposeError(fshDefinition.name);
    }

    // check for another value set with the same id
    // see https://www.hl7.org/fhir/resource.html#id
    if (this.pkg.valueSets.some(valueSet => vs.id === valueSet.id)) {
      logger.error(
        `Multiple value sets with id ${vs.id}. Each value set must have a unique id.`,
        fshDefinition.sourceInfo
      );
    }

    cleanResource(vs, (prop: string) => ['_sliceName', '_primitive'].includes(prop));
    checkForMultipleChoice(fshDefinition, vs, valueSetSD);
    this.pkg.valueSets.push(vs);
    this.pkg.fshMap.set(vs.getFileName(), {
      ...fshDefinition.sourceInfo,
      fshName: fshDefinition.name,
      fshType: 'ValueSet'
    });
    return vs;
  }
}
