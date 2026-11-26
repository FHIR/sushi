import * as fshtypes from '../fshtypes';
import * as rules from '../fshtypes/rules';
import * as importModule from '../import';
import * as fhirtypes from '../fhirtypes';
import { ClassRegistry, buildClassRegistry } from './serialize';

let definitions: ClassRegistry;
let packageObjects: ClassRegistry;

/** Classes that FSH definitions (and the documents that hold them) are made of. */
export function definitionRegistry(): ClassRegistry {
  definitions = definitions ?? buildClassRegistry(fshtypes, rules, importModule);
  return definitions;
}

/** Classes that exported FHIR objects (ValueSets, CodeSystems, Instances) are made of. */
export function packageRegistry(): ClassRegistry {
  packageObjects = packageObjects ?? buildClassRegistry(fshtypes, rules, importModule, fhirtypes);
  return packageObjects;
}
