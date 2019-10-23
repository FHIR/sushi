import capitalize from 'lodash/capitalize';
import cloneDeep from 'lodash/cloneDeep';
import { CodeableConcept } from './CodeableConcept';
import { Coding } from './Coding';
import { ElementDefinition } from './ElementDefinition';

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
  meta: any;
  implicitRules: string;
  language: string;
  text: any;
  contained: any[];
  extension: any[];
  modifierExtension: any[];
  url: string;
  identifier: any[];
  version: string;
  name: string;
  title: string;
  status: string;
  experimental: boolean;
  date: string;
  publisher: string;
  contact: any[];
  description: string;
  useContext: any[];
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
  derivation: string;

  /**
   * The StructureDefinition's elements.  The returned array should not be pushed to directly.  Instead, use
   * the {@link addElement} or {@link addElements} function
   */
  elements: ElementDefinition[];

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
      if (element.id.startsWith(currentId)) {
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
   * TODO: Finish implementation. Currently doesn't support slices, reference selections, etc.
   * @param {string} path
   * @returns {ElementDefinition} the found element (or undefined if it is not found)
   */
  findElementByPath(path: string): ElementDefinition {
    if (!path) {
      return;
    }
    let match = this.elements.find(e => {
      if (e.path === `${this.type}.${path}`) {
        return true;
      }
    });
    if (match == null && /[a-z0-9]+[A-Z].*/.test(path)) {
      match = this.elements.find(e => {
        if (e.path.endsWith('[x]')) {
          for (const t of e.type) {
            if (`${e.path.slice(0, -3)}${capitalize(t.code)}` === `${this.type}.${path}`) {
              return true;
            }
          }
        }
      });
    }
    return match;
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
   * @returns {StructureDefinition} a new StructureDefinition instance representing the passed in JSON
   */
  static fromJSON(json: LooseStructDefJSON): StructureDefinition {
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
        const ed = ElementDefinition.fromJSON(el);
        ed.structDef = sd;
        sd.elements.push(ed);
      }
    }
    return sd;
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

/**
 * A barebones and lenient definition of StructureDefinition JSON
 */
interface LooseStructDefJSON {
  resourceType: string;
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
