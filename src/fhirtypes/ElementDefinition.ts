import isEqual from 'lodash/isEqual';
import capitalize from 'lodash/capitalize';
import cloneDeep from 'lodash/cloneDeep';
import { StructureDefinition } from './StructureDefinition';
import { CodeableConcept } from './CodeableConcept';
import { Coding } from './Coding';
import { Quantity } from './Quantity';
import { Code } from '../fshtypes/Code';
import { BindingStrengthError } from '../errors/BindingStrengthError';
import { CodedTypeNotFoundError } from '../errors/CodedTypeNotFoundError';
import { CodeAlreadyFixedError } from '../errors/CodeAlreadyFixedError';
import { InvalidCardinalityError } from '../errors/InvalidCardinalityError';
import { SlicingDefinitionError } from '../errors/SlicingDefinitionError';
import { SlicingNotDefinedError } from '../errors/SlicingNotDefinedError';
import { WideningCardinalityError } from '../errors/WideningCardinalityError';

/**
 * A class representing a FHIR R4 ElementDefinition.  For the most part, each allowable property in an ElementDefinition
 * is represented via a get/set in this class, and the value is expected to be the FHIR-compliant JSON that would go
 * in the StructureDefinition JSON file (w/ translation for R3).
 * @see {@link http://hl7.org/fhir/R4/elementdefinition.html}
 */
export class ElementDefinition {
  private _id: string;
  path: string;
  extension: any[];
  modifierExtension: any[];
  representation: string[];
  sliceName: string;
  sliceIsConstraining: boolean;
  label: string;
  code: Coding[];
  slicing: ElementDefinitionSlicing;
  short: string;
  definition: string;
  comment: string;
  requirements: string;
  alias: string[];
  min: number;
  max: string;
  base: ElementDefinitionBase;
  contentReference: string;
  type: ElementDefinitionType[];
  meaningWhenMissing: string;
  // defaultValue[x] can be literally almost any field name (e.g., defaultValueCode, etc.),
  // so we can't easily use a getter/setter.  It will be just an unspecified property.  For now.
  orderMeaning: string;
  // fixed[x] can be literally almost any field name (e.g., fixedCode, fixedFoo, etc.).
  // We'll define the ones we are using, but leave the others as unspecified properties.  For now.
  fixedCode: string;
  fixedString: string;
  fixedUri: string;
  // pattern[x] can be literally almost any field name (e.g., patternCode, patternFoo, etc.).
  // We'll define the ones we are using, but leave the others as unspecified properties.  For now.
  patternCodeableConcept: CodeableConcept;
  patternCoding: Coding;
  patternQuantity: Quantity;
  example: ElementDefinitionExample[];
  // minValue[x] can be many different field names (e.g., minValueDate, minValueQuantity, etc.),
  // so we can't easily use a getter/setter.  It will be just an unspecified property.  For now.
  // maxValue[x] can be many different field names (e.g., maxValueDate, maxValueQuantity, etc.),
  // so we can't easily use a getter/setter.  It will be just an unspecified property.  For now.
  maxLength: number;
  condition: string[];
  constraint: ElementDefinitionConstraint[];
  mustSupport: boolean;
  isModifier: boolean;
  isModifierReason: string;
  isSummary: boolean;
  binding: ElementDefinitionBinding;
  mapping: ElementDefinitionMapping;
  structDef: StructureDefinition;
  private _original: ElementDefinition;

  /**
   * Constructs a new ElementDefinition with the given ID.
   * @param {string} id - the ID of the ElementDefinition
   */
  constructor(id = '') {
    this.id = id;
  }

  get id(): string {
    return this._id;
  }

  /**
   * Sets the id of the ElementDefinition and updates the path accordingly.
   * NOTE: This does not automatically update child ids/paths.  That is currently up to the library user.
   * @param {string} id - the ElementDefinition id
   */
  set id(id: string) {
    this._id = id;
    // After setting the id, we should re-set the path, which is based on the id
    this.path = this._id
      .split('.')
      .map(s => {
        // Usually the path part is just the name without the slice. The one exception is parts representing
        // a specific choice type, in which case, the path is the slice name (e.g., ) if the id is
        // Observation.value[x]:valueQuantity, then path is Observation.valueQuantity
        const [name, slice] = s.split(':', 2);
        if (
          slice &&
          name.endsWith('[x]') &&
          this.type &&
          this.type.some(t => slice === `${name.slice(0, -3)}${capitalize(t.code)}`)
        ) {
          return slice;
        }
        return name;
      })
      .join('.');
  }

  getPathWithoutBase(): string {
    return this.path.slice(this.structDef.type.length + 1);
  }

  /**
   * Returns the Types that have the given code(s).
   * @param {string[]} codes - the codes to match Types against
   * @returns {ElementDefinitionType[]} the matched Types
   */
  findTypesByCode(...codes: string[]): ElementDefinitionType[] {
    if (!this.type) {
      return [];
    }
    return this.type.filter(t => codes.includes(t.code));
  }

  /**
   * Creates a new element with an id/path indicating it is a child of the current element.
   * Defaults to '$UNKNOWN' if no name is passed in, as it needs a value, but usually a name should be passed in.
   * NOTE: This function does not automatically add the child element to the StructureDefinition.
   * @param {string} name - the name of the child element, to be appended to the parent ID/path
   * @returns {ElementDefinition} the new child element
   */
  newChildElement(name = '$UNKNOWN'): ElementDefinition {
    const el = new ElementDefinition(`${this.id}.${name}`);
    el.structDef = this.structDef;
    return el;
  }

  /**
   * ElementDefinition is capable of producing its own differential, based on differences from a stored "original".
   * This function captures the current state as the "original", so any further changes made would be captured in
   * the generated differential.
   */
  captureOriginal(): void {
    this._original = this.clone();
  }

  /**
   * Clears the stored "original" state, resulting in every property being considered new, and reflected in the
   * generated differential.
   */
  clearOriginal(): void {
    this._original = undefined;
  }

  /**
   * Determines if the state of the current element differs from the stored "original".
   * @returns {boolean} true if the state of the current element differs from the stored "original", false otherwise
   */
  hasDiff(): boolean {
    const original = this._original ? this._original : new ElementDefinition();
    return PROPS.some(prop => {
      if (prop.endsWith('[x]')) {
        const re = new RegExp(`^${prop.slice(0, -3)}[A-Z].*$`);
        prop = Object.keys(this).find(p => re.test(p));
        if (prop == null) {
          prop = Object.keys(original).find(p => re.test(p));
        }
      }
      // @ts-ignore
      return prop && !isEqual(this[prop], original[prop]);
    });
  }

  /**
   * Calculates the differential based on changes in data from the stored "original" state and returns the differential
   * as a new ElementDefinition containing only the id, path, and changed data.
   * @returns {ElementDefinition} an ElementDefinition representing the changed data since the stored "original" state
   */
  calculateDiff(): ElementDefinition {
    const original = this._original ? this._original : new ElementDefinition();
    const diff = new ElementDefinition(this.id);
    diff.structDef = this.structDef;
    for (let prop of PROPS) {
      if (prop.endsWith('[x]')) {
        const re = new RegExp(`^${prop.slice(0, -3)}[A-Z].*$`);
        prop = Object.keys(this).find(p => re.test(p));
        if (prop == null) {
          prop = Object.keys(original).find(p => re.test(p));
        }
      }
      // @ts-ignore
      if (prop && !isEqual(this[prop], original[prop])) {
        // @ts-ignore
        diff[prop] = cloneDeep(this[prop]);
      }
    }
    return diff;
  }

  /**
   * Constrains the cardinality of this element.  Cardinality constraints can only narrow
   * cardinality.  Attempts to constrain to a wider cardinality will throw.
   * @see {@link http://hl7.org/fhir/R4/profiling.html#cardinality}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.min}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.max}
   * @param {number} min - the minimum cardinality
   * @param {number|string} max - the maximum cardinality
   * @throws {InvalidCardinalityError} when min > max
   * @throws {WideningCardinalityError} when new cardinality is wider than existing cardinality
   */
  constrainCardinality(min: number, max: string) {
    const isUnbounded = max === '*';
    const maxInt = !isUnbounded ? parseInt(max) : null;

    // Check to ensure it is valid (min <= max)
    if (!isUnbounded && min > maxInt) {
      throw new InvalidCardinalityError(min, max);
    }

    // Check to ensure min >= existing min
    if (this.min != null && min < this.min) {
      throw new WideningCardinalityError(this.min, this.max, min, max);
    }

    // Check to ensure max <= existing max
    if (this.max != null && this.max !== '*' && maxInt > parseInt(this.max)) {
      throw new WideningCardinalityError(this.min, this.max, min, max);
    }

    [this.min, this.max] = [min, max];
  }

  /**
   * Binds a value set with a specific strength to this element.  The type must be coded (code, Coding,
   * CodeableConcept, Quantity), or the data types (string, uri).  The strength must be the same or
   * stricter than the current strength (if a binding already exists).
   * TODO: Determine if it is valid to bind value set on a choice element (e.g., value[x]).
   * TODO: Determine rules for replacing existing bindings when we can't guarantee rules are followed.
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.binding}
   * @see {@link http://hl7.org/fhir/R4/terminologies.html#strength}
   * @param {string} vsURI - the value set URI to bind
   * @param {string} strength - the strength of the binding (e.g., 'required')
   * @throws {BindingStrengthError} when the binding can't be applied because it is looser than the existing binding
   * @throws {CodedTypeNotFoundError} - when the binding can't be applied because the element is the wrong type
   */
  bindToVS(vsURI: string, strength: ElementDefinitionBindingStrength) {
    // Check if this is a valid type to be bound against
    const validTypes = this.findTypesByCode(
      'code',
      'Coding',
      'CodeableConcept',
      'Quantity',
      'string',
      'uri'
    );
    if (validTypes.length === 0) {
      throw new CodedTypeNotFoundError(this.type ? this.type.map(t => t.code) : []);
    }

    // Check if this is a valid strength (if the binding.strength already exists)
    if (this.binding && this.binding.strength) {
      const strengths = ['example', 'preferred', 'extensible', 'required'];
      if (strengths.indexOf(strength) < strengths.indexOf(this.binding.strength)) {
        throw new BindingStrengthError(this.binding.strength, strength);
      }
    }

    // We're good.  Bind it.
    this.binding = {
      strength,
      valueSet: vsURI
    };
  }

  /**
   * Fixes a code to this element using the appropriate methodology based on the element type.
   * - CodeableConcept: patternCodeableConcept using code and system properties
   * - Coding: patternCoding using code and system properties
   * - Quantity: patternQuantity using code and system properties
   * - code: fixedCode using code property
   * - string: fixedString using code property
   * - uri: fixedUri using code property
   * If the element is not a code-ish type or a different code is already fixed, it will throw.
   * TODO: Determine if it is valid to fix the code on a choice element (e.g., value[x]).
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_}
   * @param {Code} code - the code to fix
   * @throws {CodedTypeNotFoundError} when there is no coded type on this element
   * @throws {CodeAlreadyFixedError} where the code is already fixed to a different code
   */
  fixFshCode(code: Code) {
    // This is the element to fix it to
    const types = this.type || [];
    if (types.some(t => t.code === 'CodeableConcept')) {
      this.fixFshCodeToCodeableConcept(code);
    } else if (types.some(t => t.code === 'Coding')) {
      this.fixFshCodeToCoding(code);
    } else if (types.some(t => t.code === 'Quantity')) {
      this.fixFshCodeToQuantityUnitCode(code);
    } else if (types.some(t => t.code === 'code')) {
      this.fixFshCodeToCode(code);
    } else if (types.some(t => t.code === 'string')) {
      this.fixFshCodeToString(code);
    } else if (types.some(t => t.code === 'uri')) {
      this.fixFshCodeToUri(code);
    } else {
      throw new CodedTypeNotFoundError(types.map(t => t.code));
    }
  }

  /**
   * Fixes a code to this element using patternCodeableConcept.
   * If a different code is already fixed, it will throw.
   * TODO: Implement more robust approach to detecting existing fixed codes.
   * @see {@link fixFshCode}
   * @param {Code} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToCodeableConcept(code: Code) {
    // Check if this is already fixed to something else
    if (this.patternCodeableConcept) {
      const fixedToSame =
        this.patternCodeableConcept.coding &&
        this.patternCodeableConcept.coding.some(c => {
          return c.code == code.code && c.system == code.system;
        });
      if (!fixedToSame) {
        const found = this.patternCodeableConcept.coding[0];
        throw new CodeAlreadyFixedError({ code: found.code, system: found.system }, code);
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    const coding: Coding = {};
    if (code.code) {
      coding.code = code.code;
    }
    if (code.system) {
      coding.system = code.system;
    }
    this.patternCodeableConcept = {
      coding: [coding]
    };
  }

  /**
   * Fixes a code to this element using patternCoding.
   * If a different code is already fixed, it will throw.
   * TODO: Implement more robust approach to detecting existing fixed codes.
   * @see {@link fixFshCode}
   * @param {Code} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToCoding(code: Code) {
    // Check if this is already fixed to something else
    if (this.patternCoding) {
      if (this.patternCoding.code != code.code || this.patternCoding.system != code.system) {
        const found = this.patternCoding;
        throw new CodeAlreadyFixedError({ code: found.code, system: found.system }, code);
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    this.patternCoding = {};
    if (code.code) {
      this.patternCoding.code = code.code;
    }
    if (code.system) {
      this.patternCoding.system = code.system;
    }
  }

  /**
   * Fixes a code to this element using patternQuantity (where the code represents units).
   * If a different code is already fixed, it will throw.
   * TODO: Implement more robust approach to detecting existing fixed codes.
   * @see {@link fixFshCode}
   * @param {Code} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToQuantityUnitCode(code: Code) {
    // Check if this is already fixed to something else
    if (this.patternQuantity) {
      if (this.patternQuantity.code != code.code || this.patternQuantity.system != code.system) {
        const found = this.patternQuantity;
        throw new CodeAlreadyFixedError({ code: found.code, system: found.system }, code);
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    this.patternQuantity = {};
    if (code.code) {
      this.patternQuantity.code = code.code;
    }
    if (code.system) {
      this.patternQuantity.system = code.system;
    }
  }

  /**
   * Fixes a code to this element using fixedCode.
   * If a different code is already fixed, it will throw.
   * @see {@link fixFshCode}
   * @param {Code} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToCode(code: Code) {
    // Check if this is already fixed to something else
    if (this.fixedCode) {
      if (this.fixedCode != code.code) {
        throw new CodeAlreadyFixedError({ code: this.fixedCode }, code);
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    this.fixedCode = code.code;
  }

  /**
   * Fixes a code to this element using fixedString.
   * If a different code is already fixed, it will throw.
   * @see {@link fixFshCode}
   * @param {Code} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToString(code: Code) {
    // Check if this is already fixed to something else
    if (this.fixedString) {
      if (this.fixedString != code.code) {
        throw new CodeAlreadyFixedError({ code: this.fixedString }, code);
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    this.fixedString = code.code;
  }

  /**
   * Fixes a code to this element using fixedUri.
   * If a different code is already fixed, it will throw.
   * @see {@link fixFshCode}
   * @param {Code} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToUri(code: Code) {
    // Check if this is already fixed to something else
    if (this.fixedUri) {
      if (this.fixedUri != code.code) {
        throw new CodeAlreadyFixedError({ code: this.fixedUri }, code);
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    this.fixedUri = code.code;
  }

  /**
   * Finds and returns the parent element.  For example, the parent element of `Foo.bar.one` is the element `Foo.bar`.
   * @returns {ElementDefinition|undefined} the parent element or undefined if this is the root element
   */
  parent(): ElementDefinition | undefined {
    const parentId = this.id.slice(0, this.id.lastIndexOf('.'));
    if (parentId !== '') {
      return this.structDef.findElement(parentId);
    }
  }

  /**
   * Finds and returns all child elements of this element.  For example, the children of `Foo.bar` might be the
   * elements `Foo.bar.one`, `Foo.bar.two`, and `Foo.bar.two.a`.  This will not "expand" or "unroll" elements; it
   * only returns those child elements that already exist in the structure definition.
   * @returns {ElementDefinition[]} the child elements of this element
   */
  children(): ElementDefinition[] {
    return this.structDef.elements.filter(e => {
      return e !== this && e.id.startsWith(`${this.id}.`);
    });
  }

  /**
   * If the element has a single type, graft the type's elements into this StructureDefinition as child elements.
   * @param {ResolveFn} resolve - a function that can resolve a type to a StructureDefinition instance
   * @returns {ElementDefinition[]} the unfolded elements or an empty array if the type is multi-value or type can't
   *   be resolved.
   */
  unfold(resolve: ResolveFn = () => undefined): ElementDefinition[] {
    if (this.type.length === 1) {
      const def = resolve(this.type[0]);
      if (def) {
        const newElements = def.elements.slice(1).map(e => {
          const eClone = e.clone();
          eClone.id = eClone.id.replace(def.type, `${this.id}`);
          eClone.structDef = this.structDef;
          return eClone;
        });
        this.structDef.addElements(newElements);
        return newElements;
      }
    }
    return [];
  }

  /**
   * Sets up slicings on an element by adding or modifying the element's `slicing`.  If a matching slicing discriminator
   * already exists, it will be used
   * @see {@link http://hl7.org/fhir/R4/profiling.html#slicing}
   * @param {string} discriminatorType - the discriminator type ('value' | 'exists' | 'pattern' | 'type' | 'profile')
   * @param {string} discriminatorPath - the dot-separated discriminator path
   * @param {boolean} [ordered] - indicates if the slices are ordered. If no value is provided, it will default to false
   * for new slicings or accept the existing value for existing slicings.
   * @param {string} [rules] - indicates if addition slices are allowed or not ('closed' | 'open' | 'openAtEnd'). If no
   * value is provided, it will default to 'open' for new slicings or accept the existing value for existing slicings.
   * @returns {ElementDefinitionSlicing} the slicing
   * @throws { SlicingDefinitionError } if ordered is changed from true to false or rules are changed from closed to
   * open/openAtEnd or openAtEnd is changed to open
   */
  sliceIt(
    discriminatorType: string,
    discriminatorPath: string,
    ordered?: boolean,
    rules?: string
  ): ElementDefinitionSlicing {
    if (!this.slicing || !this.slicing.discriminator) {
      this.slicing = {
        discriminator: [
          {
            type: discriminatorType,
            path: discriminatorPath
          }
        ],
        ordered: ordered != null ? ordered : false,
        rules: rules != null ? rules : 'open'
      };
    } else {
      // Ordered cannot be changed from true to false
      if (this.slicing.ordered && ordered === false) {
        throw new SlicingDefinitionError('ordered', true, false);
      }
      // Rules cannot be changed from closed to open/openAtEnd or openAtEnd to open
      if (
        (this.slicing.rules === 'closed' && rules !== 'closed') ||
        (this.slicing.rules === 'openAtEnd' && rules === 'open')
      ) {
        throw new SlicingDefinitionError('rules', this.slicing.rules, rules);
      }

      if (ordered != null && this.slicing.ordered !== ordered) {
        this.slicing.ordered = ordered;
      }

      if (rules != null && this.slicing.rules !== rules) {
        this.slicing.rules = rules;
      }

      if (
        !this.slicing.discriminator.some(
          d => d.type === discriminatorType && d.path === discriminatorPath
        )
      ) {
        this.slicing.discriminator.push({
          type: discriminatorType,
          path: discriminatorPath
        });
      }
    }

    return this.slicing;
  }

  /**
   * Creates a new slice on the element.
   * TODO: Should we clone the entire original element or only parts?
   * TODO: Handle re-slicing
   * @see {@link http://hl7.org/fhir/R4/profiling.html#slicing}
   * @param {string} name - the name of the new slice
   * @param { ElementDefinitionType } [type] - the type of the new slice; if undefined it copies over this element's types
   * @returns {ElementDefinition} the new element representing the slice
   */
  addSlice(name: string, type?: ElementDefinitionType): ElementDefinition {
    if (!this.slicing) {
      throw new SlicingNotDefinedError(this.id, name);
    }
    const slice = this.clone(true);
    slice.id = `${this.id}:${name}`;
    slice.sliceName = name;
    if (type) {
      slice.type = [type];
    } else {
      slice.type = cloneDeep(this.type);
    }
    this.structDef.addElement(slice);
    return slice;
  }

  // NOTE: These are functions we used previously but may not be needed in Sushi.
  // Commenting out for now, but if we still don't need them by Jan 2020, delete them!
  //
  // /**
  //  * Gets a Map of the slices associated with this element, where the key is the slice name and the value is the
  //  * ElementDefinition representing the slice.  If there are no slices, it will return an empty Map.
  //  * @returns {Map<string,ElementDefinition>} the map containing this element's slices
  //  */
  // getSliceMap(): Map<string, ElementDefinition> {
  //   const sliceMap = new Map();
  //
  //   // Find all the slice roots, iterate them, and get their children
  //   let re = new RegExp(`^${escapeRegExp(this.id)}:[^.]+$`);
  //   // TODO: For now we don't support choices that themselves are in a slice (e.g., assume choice id ends with [x])
  //   if (this.id.endsWith('[x]')) {
  //     re = new RegExp(`^${escapeRegExp(this.id.slice(0, -3))}[A-Z][^:.]*:[^.]+$`);
  //   }
  //   this.structDef.elements
  //     .filter(e => re.test(e.id))
  //     .forEach(e => {
  //       const name = e.sliceName;
  //       if (name == null) {
  //         // TODO: log an error
  //         return;
  //       }
  //       sliceMap.set(name, e);
  //     });
  //
  //   return sliceMap;
  // }
  //
  // /**
  //  * Replaces the the sliced element with a specific slice, removing all other slices.  If sliceNameToKeep is null or
  //  * undefined, it removes the discriminator from this element and removes all existing slices.  If this element is
  //  * not sliced, returns itself.
  //  * @param {string} sliceNameToKeep - the name of the slice to keep in place of this element
  //  * @returns {ElementDefinition} the remaining element after unslicing (usually corresponding to sliceNameToKeep)
  //  */
  // unSliceIt(sliceNameToKeep: string): ElementDefinition {
  //   if (!this.slicing) {
  //     return this;
  //   }
  //
  //   // Remove all slices except the one matching sliceNameToKeep
  //   const sliceMap = this.getSliceMap();
  //   for (const name of sliceMap.keys()) {
  //     if (name !== sliceNameToKeep) {
  //       sliceMap.get(name).detach();
  //     }
  //   }
  //
  //   // If sliceNameToKeep was named and exists, detach *this* slice and return kept slice
  //   if (sliceNameToKeep != null && sliceMap.has(sliceNameToKeep)) {
  //     this.detach();
  //     const keeper = sliceMap.get(sliceNameToKeep);
  //     const oldKeeperID = keeper.id;
  //     const keeperChildren = keeper.children();
  //     keeper.id = keeper.id.slice(0, keeper.id.lastIndexOf(':'));
  //     keeperChildren.forEach(c => (c.id = c.id.replace(oldKeeperID, keeper.id)));
  //     keeper.sliceName = undefined;
  //     return keeper;
  //   }
  //
  //   // No slice to keep, so keep and return this instead
  //   this.slicing = undefined;
  //   return this;
  // }
  //
  // /**
  //  * Removes this element, and optionally its children, from its StructureDefinition so it is no longer recognized as an
  //  * element of the StructureDefinition.
  //  * @param {boolean} [detachChildren=true] - indicates if this element's children should also be detached from the
  //  *   StructureDefinition
  //  * @returns {ElementDefinition[]} the array of ElementDefinitions that were detached from the StructureDefinition
  //  */
  // detach(detachChildren: boolean = true): ElementDefinition[] {
  //   const detached = [];
  //   const toDetach = [this];
  //   if (detachChildren) {
  //     // @ts-ignore
  //     toDetach.push(...this.children());
  //   }
  //   for (const el of toDetach) {
  //     const i = this.structDef.elements.findIndex(e => e === el);
  //     if (i !== -1) {
  //       detached.push(el);
  //       this.structDef.elements.splice(i, 1);
  //     }
  //   }
  //   return detached;
  // }

  /**
   * Clones the current ElementDefinition, optionally clearing the stored "original" (clears it by default)
   * @param {boolean} [clearOriginal=true] - indicates if the stored "original" should be cleared
   * @returns {ElementDefinition} the cloned ElementDefinition
   */
  clone(clearOriginal = true): ElementDefinition {
    // We don't want to clone the reference to the StructureDefinition, so temporarily save it and remove it
    const savedStructDef = this.structDef;
    this.structDef = null;
    const clone = cloneDeep(this);
    // Set the reference to the StructureDefinition again
    this.structDef = clone.structDef = savedStructDef;
    // Clear original if applicable
    if (clearOriginal) {
      clone.clearOriginal();
    }
    return clone;
  }

  /**
   * Provides the FHIR-conformant JSON representation of this ElementDefinition
   * @returns {Object} the FHIR-conformant JSON representation of this ElementDefinition
   */
  toJSON(): LooseElementDefJSON {
    const j: LooseElementDefJSON = {};
    for (let prop of PROPS) {
      if (prop.endsWith('[x]')) {
        const re = new RegExp(`^${prop.slice(0, -3)}[A-Z].*$`);
        prop = Object.keys(this).find(p => re.test(p));
      }
      // @ts-ignore
      if (prop && this[prop] !== undefined) {
        // @ts-ignore
        j[prop] = cloneDeep(this[prop]);
      }
    }

    return j;
  }

  /**
   * Instantiates a new ElementDefinition from a FHIR-conformant JSON representation
   * @param {Object} json - the FHIR-conformant JSON representation of the ElementDefinition to instantiate
   * @returns {ElementDefinition} the ElementDefinition representing the data passed in
   */
  static fromJSON(json: LooseElementDefJSON): ElementDefinition {
    const ed = new ElementDefinition();
    for (let prop of PROPS) {
      if (prop.endsWith('[x]')) {
        const re = new RegExp(`^${prop.slice(0, -3)}[A-Z].*$`);
        prop = Object.keys(json).find(p => re.test(p));
      }
      // @ts-ignore
      if (prop && json[prop] !== undefined) {
        // @ts-ignore
        ed[prop] = cloneDeep(json[prop]);
      }
    }

    return ed;
  }
}

export type ElementDefinitionSlicing = {
  discriminator?: ElementDefinitionSlicingDiscriminator[];
  description?: string;
  ordered?: boolean;
  rules: string;
};

export type ElementDefinitionSlicingDiscriminator = {
  type: string;
  path: string;
};

export type ElementDefinitionBase = {
  path: string;
  min: number;
  max: string;
};

export type ElementDefinitionType = {
  code: string;
  profile?: string[];
  targetProfile?: string[];
  aggregation?: string[];
  versioning?: string;
};

export type ElementDefinitionExample = {
  label: string;
  // TODO: support all the value[x]
  // [key: string]: any;
};

export type ElementDefinitionConstraint = {
  key: string;
  requirements?: string;
  severity: string;
  human: string;
  expression?: string;
  xpath?: string;
  source?: string;
};

export type ElementDefinitionBinding = {
  strength: ElementDefinitionBindingStrength;
  description?: string;
  valueSet?: string;
};

export type ElementDefinitionBindingStrength = 'example' | 'preferred' | 'extensible' | 'required';

export type ElementDefinitionMapping = {
  identity: string;
  language?: string;
  map: string;
  comment?: string;
};

/**
 * A barebones and lenient definition of ElementDefinition JSON
 */
interface LooseElementDefJSON {
  type?: ElementDefinitionType[];
  binding?: ElementDefinitionBinding;
  // [key: string]: any;
}

export type ResolveFn = (type: ElementDefinitionType) => StructureDefinition | undefined;

/**
 * The list of ElementDefinition properties used when importing/exporting FHIR JSON.
 */
const PROPS = [
  'id',
  'extension',
  'modifierExtension',
  'path',
  'representation',
  'sliceName',
  'sliceIsConstraining',
  'label',
  'code',
  'slicing',
  'short',
  'definition',
  'comment',
  'requirements',
  'alias',
  'min',
  'max',
  'base',
  'contentReference',
  'type',
  'defaultValue[x]',
  'meaningWhenMissing',
  'orderMeaning',
  'fixed[x]',
  'pattern[x]',
  'example',
  'minValue[x]',
  'maxValue[x]',
  'maxLength',
  'condition',
  'constraint',
  'mustSupport',
  'isModifier',
  'isModifierReason',
  'isSummary',
  'binding',
  'mapping'
];
