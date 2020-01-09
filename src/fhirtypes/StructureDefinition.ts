import upperFirst from 'lodash/upperFirst';
import cloneDeep from 'lodash/cloneDeep';
import { ElementDefinition, ElementDefinitionType } from './ElementDefinition';
import { Meta } from './specialTypes';
import { Identifier, CodeableConcept, Coding, Narrative, Resource, Extension } from './dataTypes';
import { ContactDetail, UsageContext } from './metaDataTypes';
import { CannotResolvePathError, InvalidElementAccessError } from '../errors';
import { getArrayIndex, setPropertyOnDefinitionInstance } from './common';
import { Fishable, Type } from '../utils/Fishable';

/**
 * A class representing a FHIR R4 StructureDefinition.  For the most part, each allowable property in a StructureDefinition
 * is represented via a get/set in this class, and the value is expected to be the FHIR-compliant JSON that would go
 * in the StructureDefinition JSON file (w/ translation for R3).
 *
 * The snapshot and differential, however, do not have their own properties, but rather are represented as an
 * `elements` get/set property, whose value is a list of `ElementDefinition` instances.
 *
 * @see {@link http://hl7.org/fhir/R4/structuredefinition.html|FHIR StructureDefinition}
 */
export class StructureDefinition {
  id: string;
  meta: Meta;
  implicitRules: string;
  language: string;
  text: Narrative;
  contained: Resource[];
  extension: Extension[];
  modifierExtension: Extension[];
  url: string;
  identifier: Identifier[];
  version: string;
  name: string;
  title: string;
  status: string;
  experimental: boolean;
  date: string;
  publisher: string;
  contact: ContactDetail[];
  description: string;
  useContext: UsageContext[];
  jurisdiction: CodeableConcept[];
  purpose: string;
  copyright: string;
  keyword: Coding[];
  fhirVersion: string;
  mapping: StructureDefinitionMapping[];
  kind: string;
  abstract: boolean;
  context: StructureDefinitionContext[];
  contextInvariant: string[];
  type: string;
  baseDefinition: string;
  derivation: 'specialization' | 'constraint';

  /**
   * The StructureDefinition's elements.  The returned array should not be pushed to directly.  Instead, use
   * the {@link addElement} or {@link addElements} function
   */
  elements: ElementDefinition[];

  private _sdStructureDefinition: StructureDefinition;

  public complete: boolean;

  /**
   * Constructs a StructureDefinition with a root element.
   */
  constructor() {
    // Every structure definition needs a root element
    const root = new ElementDefinition('');
    root.structDef = this;
    root.min = 0;
    root.max = '*';
    root.mustSupport = false;
    root.isModifier = false;
    root.isSummary = false;
    this.elements = [root];
    this.complete = false;
  }

  /**
   * Get the file name for serializing to disk.
   * @returns {string} the filename
   */
  getFileName(): string {
    return `StructureDefinition-${this.id}.json`;
  }

  /**
   * Get the Structure Definition for Structure Definition
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @returns {StructureDefinition} the StructureDefinition of StructureDefinition
   */
  getOwnStructureDefinition(fisher: Fishable): StructureDefinition {
    if (this._sdStructureDefinition == null) {
      this._sdStructureDefinition = StructureDefinition.fromJSON(
        fisher.fishForFHIR('StructureDefinition', Type.Resource)
      );
    }
    return this._sdStructureDefinition;
  }

  /**
   * Adds an ElementDefinition to the StructureDefinition's elements, inserting it into the proper location based
   * on its ID.  This should be used rather than pushing directly to the elements array.
   * @param {ElementDefinition} element - the ElementDefinition to add
   */
  addElement(element: ElementDefinition) {
    let i = 0;
    let lastMatchId = '';
    for (; i < this.elements.length; i++) {
      const currentId = this.elements[i].id;
      if (element.id.startsWith(`${currentId}.`) || element.id.startsWith(`${currentId}:`)) {
        lastMatchId = currentId;
      } else if (!currentId.startsWith(lastMatchId)) {
        break;
      }
    }
    this.elements.splice(i, 0, element);
  }

  /**
   * Adds an array of ElementDefinitions to the StructureDefinition, inserting each one into the proper location based
   * on its ID.  This should be used rather than pushing directly to the elements array.
   * @param {ElementDefinition[]} elements - the array of ElementDefinitions to add
   */
  addElements(elements: ElementDefinition[] = []) {
    elements.forEach(e => this.addElement(e));
  }

  /**
   * Finds an element by its id.
   * @param {string} id
   * @returns {ElementDefinition} the found element (or undefined if it is not found)
   */
  findElement(id: string): ElementDefinition {
    if (!id) {
      return;
    }
    return this.elements.find(e => e.id === id);
  }

  /**
   * Finds an element by a FSH-compatible path
   * @param {string} path - The FSH path
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @returns {ElementDefinition} - The found element (or undefined if it is not found)
   */
  findElementByPath(path: string, fisher: Fishable): ElementDefinition {
    // If the path already exists, get it and return the match
    // If !path just return the base parent element
    const fullPath = path ? `${this.type}.${path}` : this.type;
    const match = this.elements.find(e => e.path === fullPath && !e.id.includes(':'));
    if (match != null) {
      return match;
    }

    // Parse the FSH Path into a form we can work with
    const parsedPath = this.parseFSHPath(path);

    let fhirPathString = this.type;
    let matchingElements = this.elements;
    let newMatchingElements: ElementDefinition[] = [];
    // Iterate over the path, filtering out elements that do not match
    for (const pathPart of parsedPath) {
      // Add the next part to the path, and see if we have matches on it
      fhirPathString += `.${pathPart.base}`;
      newMatchingElements = matchingElements.filter(
        e =>
          e.path.startsWith(`${fhirPathString}.`) ||
          e.path.startsWith(`${fhirPathString}:`) ||
          e.path === fhirPathString
      );

      // TODO: If path is A.B.C, and we unfold B, but C is invalid, the unfolded
      // elements are still on the structDef. We may want to change this to remove the elements
      // upon error
      // Array for tracking newly added unfolded elements
      let unfoldedElements: ElementDefinition[] = [];
      if (newMatchingElements.length === 0 && matchingElements.length === 1) {
        // If there was previously only one match,
        // we want to unfold that match and dig deeper into it
        unfoldedElements = matchingElements[0].unfold(fisher);
        if (unfoldedElements.length > 0) {
          // Only get the children that match our path
          newMatchingElements = unfoldedElements.filter(e => e.path.startsWith(fhirPathString));
        }
      }

      if (newMatchingElements.length === 0) {
        // If we fail to find any matches, try to find the appropriate [x] element
        // from previous matches or from newly unfolded elements
        // Ex: valueString -> value[x]
        const matchingSlice = this.sliceMatchingValueX(fhirPathString, [
          ...matchingElements,
          ...unfoldedElements
        ]);
        if (matchingSlice) {
          newMatchingElements.push(matchingSlice, ...matchingSlice.children());
          fhirPathString = matchingSlice.path;
        }
      }

      if (newMatchingElements.length > 0) {
        // We succeeded in finding some matches, set them and keep going
        matchingElements = newMatchingElements;
      } else {
        // We got to a point where we couldn't find any matches, just return
        return;
      }

      // After getting matches based on the 'base' part, we now filter according to 'brackets'
      if (pathPart.brackets) {
        const sliceElement = this.findMatchingSlice(pathPart, matchingElements);
        if (sliceElement) {
          matchingElements = [sliceElement, ...sliceElement.children()];
        } else {
          // If we didn't find a matching sliceElement, there must be a reference
          const matchingRefElement = this.findMatchingRef(pathPart, matchingElements);
          if (matchingRefElement) {
            matchingElements = [matchingRefElement, ...matchingRefElement.children()];
          } else {
            // The bracket parts couldn't be resolved to a slice or a ref, so we failed to find an element
            return;
          }
        }
      }

      // If there are no brackets, remove any slices that don't match exactly
      if (!pathPart.brackets) {
        matchingElements = matchingElements.filter(
          e =>
            e.id.includes(`${fhirPathString}:${pathPart.base}`) ||
            !e.id.includes(`${fhirPathString}:`)
        );
      }
    }

    // We could still have child elements that are matching, if so filter them out now
    matchingElements = matchingElements.filter(e => e.path === fhirPathString);
    // If we have one and only one match, return it, else return undefined
    return matchingElements.length === 1 ? matchingElements[0] : undefined;
  }

  /**
   * This function sets an instance property of an SD if possible
   * @param {string} path - The path to the ElementDefinition to fix
   * @param {any} value - The value to fix
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   */
  setInstancePropertyByPath(path: string, value: any, fisher: Fishable): void {
    if (path.startsWith('snapshot') || path.startsWith('differential')) {
      throw new InvalidElementAccessError(path);
    }
    setPropertyOnDefinitionInstance(this, path, value, fisher);
  }

  /**
   * Creates a new element and adds it to the StructureDefinition elements.
   * @param {string} name - the name of the element to create (which will be appended to the element ID)
   * @returns {ElementDefinition} the new ElementDefinition
   */
  newElement(name = '$UNKNOWN'): ElementDefinition {
    const el = this.elements[0].newChildElement(name);
    this.addElement(el);
    return el;
  }

  /**
   * Each ElementDefinition is capable of producing its own differential, based on differences
   * from a stored "original".  This function captures the current state of each element as the
   * "original", so any further changes made would be captured in the generated differentials.
   */
  captureOriginalElements(): void {
    this.elements.forEach(e => e.captureOriginal());
  }

  /**
   * Clears the stored "original" state for each ElementDefnition, resulting in every property
   * being considered new, and reflected in the generated differentials.
   */
  clearOriginalElements(): void {
    this.elements.forEach(e => e.clearOriginal());
  }

  /**
   * Exports the StructureDefinition to a properly formatted FHIR JSON representation.
   * @returns {any} the FHIR JSON representation of the StructureDefinition
   */
  toJSON(): any {
    const j: LooseStructDefJSON = { resourceType: 'StructureDefinition' };
    // First handle properties that are just straight translations to JSON
    for (const prop of PROPS) {
      // @ts-ignore
      if (this[prop] !== undefined) {
        // @ts-ignore
        j[prop] = cloneDeep(this[prop]);
      }
    }

    // Now handle snapshot and differential
    j.snapshot = { element: this.elements.map(e => e.toJSON()) };
    j.differential = {
      element: this.elements.filter(e => e.hasDiff()).map(e => e.calculateDiff().toJSON())
    };

    return j;
  }

  /**
   * Constructs a new StructureDefinition representing the passed in JSON.  The JSON that is passed in must be a
   * properly formatted FHIR 3.0.1 StructureDefinition JSON.
   * @param {any} json - the FHIR 3.0.1 JSON representation of a StructureDefinition to construct
   * @param {captureOriginalElements} - indicate if original elements should be captured for purposes of
   *   detecting differentials.  Defaults to true.
   * @returns {StructureDefinition} a new StructureDefinition instance representing the passed in JSON
   */
  static fromJSON(json: LooseStructDefJSON, captureOriginalElements = true): StructureDefinition {
    const sd = new StructureDefinition();
    // First handle properties that are just straight translations from JSON
    for (const prop of PROPS) {
      // @ts-ignore
      if (json[prop] !== undefined) {
        // @ts-ignore
        sd[prop] = cloneDeep(json[prop]);
      }
    }
    // Now handle the snapshots and (for now) just throw away the differential
    sd.elements.length = 0;
    if (json.snapshot && json.snapshot.element) {
      for (const el of json.snapshot.element) {
        const ed = ElementDefinition.fromJSON(el, captureOriginalElements);
        ed.structDef = sd;
        sd.elements.push(ed);
      }
    }
    return sd;
  }

  /**
   * This function tests if it is possible to fix value to a path, but does not actually fix it
   * @param {string} path - The path to the ElementDefinition to fix
   * @param {any} value - The value to fix
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @throws {CannotResolvePathError} when the path cannot be resolved to an element
   * @returns {any} - The object or value to fix
   */
  validateValueAtPath(
    path: string,
    value: any,
    fisher: Fishable
  ): { fixedValue: any; pathParts: PathPart[] } {
    const pathParts = this.parseFSHPath(path);
    let currentPath = '';
    let currentElement: ElementDefinition;
    for (const pathPart of pathParts) {
      // Construct the path up to this point
      currentPath += `${currentPath ? '.' : ''}${pathPart.base}`;
      // If we are indexing into an array, the last bracket should be numeric
      const arrayIndex = getArrayIndex(pathPart);
      if (arrayIndex != null) {
        // If it is a number, add all bracket info besides it back to path
        pathPart.brackets.slice(0, -1).forEach(p => (currentPath += `[${p}]`));
      } else {
        // If it is not a number, then add all bracket info back to path
        pathPart.brackets?.forEach(p => (currentPath += `[${p}]`));
      }
      currentElement = this.findElementByPath(currentPath, fisher);

      // If the element has a base.max that is greater than 1, but the element has been constrained, still set properties in an array
      const nonArrayElementIsBasedOnArray =
        currentElement?.base?.max !== '0' &&
        currentElement?.base?.max !== '1' &&
        (currentElement?.max === '0' || currentElement?.max === '1');
      if (
        !currentElement ||
        currentElement.max === '0' ||
        (arrayIndex != null &&
          currentElement.max !== '*' &&
          (arrayIndex >= parseInt(currentElement.max) || currentElement.max === '1'))
      ) {
        // We throw an error if the currentElement doesn't exist, has been zeroed out,
        // or is being incorrectly accessed as an array
        throw new CannotResolvePathError(path);
      } else if (
        (arrayIndex == null &&
          currentElement.max != null &&
          currentElement.max !== '0' &&
          currentElement.max !== '1') ||
        nonArrayElementIsBasedOnArray
      ) {
        // Modify the path to have 0 indices
        if (!pathPart.brackets) pathPart.brackets = [];
        pathPart.brackets.push('0');
      }
      // Primitive and only primitives have a lower case first letter
      if (
        currentElement.type?.length === 1 &&
        currentElement.type[0].code.charAt(0) ===
          currentElement.type[0].code.charAt(0).toLowerCase()
      ) {
        pathPart.primitive = true;
      }
    }
    const clone = currentElement.clone();
    // fixValue will throw if it fails
    clone.fixValue(value);
    // If there is a fixedValue or patternValue, find it and return it
    const key = Object.keys(clone).find(k => k.startsWith('pattern') || k.startsWith('fixed'));
    let fixedValue;
    if (key != null) fixedValue = clone[key as keyof ElementDefinition];
    return { fixedValue, pathParts };
  }

  /**
   * Parses a FSH Path into a more easily usable form
   * @param {string} fshPath - A syntactically valid path in FSH
   * @returns {PathPart[]} an array of PathParts that is easier to work with
   */
  private parseFSHPath(fshPath: string): PathPart[] {
    const pathParts: PathPart[] = [];
    const splitPath = fshPath.split('.');
    for (const pathPart of splitPath) {
      const splitPathPart = pathPart.split('[');
      if (splitPathPart.length === 1 || pathPart.endsWith('[x]')) {
        // There are no brackets, or the brackets are for a choice, so just push on the name
        pathParts.push({ base: pathPart });
      } else {
        // We have brackets, let's  save the bracket info
        let fhirPathBase = splitPathPart[0];
        // Get the bracket elements and slice off the trailing ']'
        let brackets = splitPathPart.slice(1).map(s => s.slice(0, -1));
        // Get rid of any remaining [x] elements in the brackets
        if (brackets[0] === 'x') {
          fhirPathBase += '[x]';
          brackets = brackets.slice(1);
        }
        pathParts.push({ base: fhirPathBase, brackets: brackets });
      }
    }
    return pathParts;
  }

  /**
   * Looks for a matching choice element. If the choice has no existing slice, we slice it and
   * add to the existing StructureDefinition. If the choice has an existing slice, we return that.
   * @param {string} fhirPath - The path in FHIR to match with
   * @param {ElementDefinition[]} elements - The set of elements to search through
   * @returns {ElementDefinition} - The new slice element if found, else undefined
   */
  private sliceMatchingValueX(fhirPath: string, elements: ElementDefinition[]): ElementDefinition {
    let matchingType: ElementDefinitionType;
    const matchingXElements = elements.filter(e => {
      if (e.path.endsWith('[x]')) {
        for (const t of e.type) {
          if (`${e.path.slice(0, -3)}${upperFirst(t.code)}` === fhirPath) {
            matchingType = t;
            return true;
          }
        }
      }
    });
    if (matchingXElements.length > 0) {
      const sliceName = fhirPath.slice(fhirPath.lastIndexOf('.') + 1);
      const matchingSlice = matchingXElements.find(c => c.sliceName === sliceName);
      // if we have already have a matching slice, we want to return it
      if (matchingSlice) {
        return matchingSlice;
      } else {
        // if we do not have a matching slice, we want to slice the first match
        const matchingXElement = matchingXElements[0];
        // If we find a matching [x] element, we need to slice it to create the child element
        // NOTE: The spec is somewhat incosistent on handling choice slicing, we decided on this
        // approach per consistency with 4.0.1 observation-vitalsigns profiles and per this post
        // https://blog.fire.ly/2019/09/13/type-slicing-in-fhir-r4/.
        matchingXElement.sliceIt('type', '$this', false, 'open');
        // Get the sliceName for the new element
        const newSlice = matchingXElement.addSlice(sliceName, matchingType);
        return newSlice;
      }
    }
    return;
  }

  /**
   * Looks for a slice within the set of elements that matches the fhirPath
   * @param {PathPart} pathPart - The path to match sliceName against
   * @param {ElementDefinition[]} elements - The set of elements to search through
   * @returns {ElementDefinition} - The sliceElement if found, else undefined
   */
  private findMatchingSlice(pathPart: PathPart, elements: ElementDefinition[]): ElementDefinition {
    // NOTE: This function will assume the 'brackets' field contains information about slices. Even
    // if you search for foo[sliceName][refName], this will try to find a re-slice
    // sliceName/refName. To find the matching element for foo[sliceName][refName], you must
    // use the findMatchingRef function. Be aware of this ambiguity in the bracket path syntax.
    return elements.find(e => e.sliceName === pathPart.brackets.join('/'));
  }

  /**
   * Looks for a Reference type element within the set of elements that matches the fhirPath
   * @param {PathPart} pathPart - The path to match the Reference type elements against
   * @param {ElementDefinition[]} elements - The set of elements to search through
   * @returns {ElementDefinition} - The Reference type element if found, else undefined
   */
  private findMatchingRef(pathPart: PathPart, elements: ElementDefinition[]): ElementDefinition {
    const matchingRefElement = elements.find(e => {
      // If we have foo[a][b][c], and c is the ref, we need to find an element with sliceName = a/b
      if (
        pathPart.brackets.length === 1 ||
        e.sliceName === pathPart.brackets.slice(0, -1).join('/')
      ) {
        for (const t of e.type) {
          return (
            t.code === 'Reference' &&
            t.targetProfile &&
            t.targetProfile.find(tp => {
              const refName = pathPart.brackets.slice(-1)[0];
              // Slice to get last part of url
              // http://hl7.org/fhir/us/core/StructureDefinition/profile|3.0.0 -> profile|3.0.0
              let tpRefName = tp.split('/').slice(-1)[0];
              // Slice to get rid of version, profile|3.0.0 -> profile
              tpRefName = tpRefName.split('|')[0];
              return tpRefName === refName;
            })
          );
        }
      }
    });
    return matchingRefElement;
  }

  /**
   * Gets the specific reference being referred to by a path with brackets
   * @param {string} path - The path
   * @param {ElementDefinition} element - The element that may contain the reference
   * @returns {string} - The name of the reference if it exists, else undefined
   */
  getReferenceName(path: string, element: ElementDefinition): string {
    const parsedPath = this.parseFSHPath(path);
    const pathEnd = parsedPath.slice(-1)[0];
    if (pathEnd.brackets) {
      const refElement = this.findMatchingRef(pathEnd, [element]);
      if (refElement) {
        return pathEnd.brackets.slice(-1)[0];
      }
    }
    return;
  }
}

export type StructureDefinitionMapping = {
  identity: string;
  uri?: string;
  name?: string;
  comment?: string;
};

export type StructureDefinitionContext = {
  type: string;
  expression: string;
};

export type PathPart = {
  base: string;
  brackets?: string[];
  primitive?: boolean;
};

/**
 * A barebones and lenient definition of StructureDefinition JSON
 */
interface LooseStructDefJSON {
  resourceType: string;
  derivation?: string;
  snapshot?: { element: any[] };
  differential?: { element: any[] };
  // [key: string]: any;
}

/**
 * The list of StructureDefinition properties used when importing/exporting FHIR JSON.
 */
const PROPS = [
  'id',
  'meta',
  'implicitRules',
  'language',
  'text',
  'contained',
  'extension',
  'modifierExtension',
  'url',
  'identifier',
  'version',
  'name',
  'title',
  'status',
  'experimental',
  'date',
  'publisher',
  'contact',
  'description',
  'useContext',
  'jurisdiction',
  'purpose',
  'copyright',
  'keyword',
  'fhirVersion',
  'mapping',
  'kind',
  'abstract',
  'context',
  'contextInvariant',
  'type',
  'baseDefinition',
  'derivation'
];
