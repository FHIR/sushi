import { isEmpty, isEqual, isMatch, cloneDeep, upperFirst, intersectionWith } from 'lodash';
import sax = require('sax');
import { minify } from 'html-minifier';
import { isUri } from 'valid-url';
import { StructureDefinition } from './StructureDefinition';
import { CodeableConcept, Coding, Quantity, Ratio, Reference } from './dataTypes';
import { FshCanonical, FshCode, FshRatio, FshQuantity, FshReference, Invariant } from '../fshtypes';
import { FixedValueType, OnlyRule } from '../fshtypes/rules';
import {
  BindingStrengthError,
  CodedTypeNotFoundError,
  ValueAlreadyFixedError,
  NoSingleTypeError,
  MismatchedTypeError,
  InvalidCanonicalUrlError,
  InvalidCardinalityError,
  InvalidTypeError,
  SlicingDefinitionError,
  SlicingNotDefinedError,
  TypeNotFoundError,
  WideningCardinalityError,
  InvalidSumOfSliceMinsError,
  InvalidMaxOfSliceError,
  NarrowingRootCardinalityError,
  SliceTypeRemovalError,
  InvalidUriError,
  FixedToPatternError,
  MultipleStandardsStatusError,
  InvalidMappingError,
  InvalidFHIRIdError,
  DuplicateSliceError,
  NonAbstractParentOfSpecializationError
} from '../errors';
import { setPropertyOnDefinitionInstance, splitOnPathPeriods } from './common';
import { Fishable, Type, Metadata, logger } from '../utils';
import { InstanceDefinition } from './InstanceDefinition';
import { idRegex } from './primitiveTypes';

export class ElementDefinitionType {
  private _code: string;
  profile?: string[];
  targetProfile?: string[];
  aggregation?: string[];
  versioning?: string;
  extension?: ElementDefinitionExtension[];

  constructor(code: string) {
    this._code = code;
  }

  /**
   * Element.id, Extension.url, and primitive types are specified in the valueUrl of an extension.
   * This function returns the fhir-type extension's valueUrl if available, else returns the code.
   * @see {@link http://hl7.org/fhir/extension-structuredefinition-fhir-type.html}
   */
  get code(): string {
    const fhirTypeExtension = this.extension?.find(
      ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type'
    );
    return fhirTypeExtension?.valueUrl ?? this._code;
  }

  set code(c: string) {
    this._code = c;
  }

  getActualCode(): string {
    return this._code;
  }

  withProfiles(...profiles: string[]): this {
    this.profile = profiles;
    return this;
  }

  withTargetProfiles(...targetProfiles: string[]): this {
    this.targetProfile = targetProfiles;
    return this;
  }

  toJSON(): ElementDefinitionTypeJSON {
    // Remove the _code key specific to ElementDefinitionType
    const elDefTypeClone = cloneDeep(this);
    delete elDefTypeClone._code;

    // Create ElementDefinitionTypeJSON with a code and any properties present on the ElementDefinitionType
    const elDefTypeJSON: ElementDefinitionTypeJSON = {
      code: this.getActualCode(),
      ...elDefTypeClone
    };
    return elDefTypeJSON;
  }

  static fromJSON(json: any): ElementDefinitionType {
    const elDefType = new ElementDefinitionType(json.code);

    elDefType.profile = json.profile;
    elDefType.targetProfile = json.targetProfile;
    elDefType.aggregation = json.aggregation;
    elDefType.versioning = json.versioning;
    elDefType.extension = json.extension;
    return elDefType;
  }
}

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
  // pattern[x] can be literally almost any field name (e.g., patternCoding, patternFoo, etc.).
  // We'll define the ones we are using, but leave the others as unspecified properties.  For now.
  fixedCode: string;
  patternCode: string;
  fixedString: string;
  patternString: string;
  fixedUri: string;
  patternUri: string;
  fixedUrl: string;
  patternUrl: string;
  fixedCanonical: string;
  patternCanonical: string;
  fixedInstant: string;
  patternInstant: string;
  fixedBase64Binary: string;
  patternBase64Binary: string;
  fixedDate: string;
  patternDate: string;
  fixedDateTime: string;
  patternDateTime: string;
  fixedTime: string;
  patternTime: string;
  fixedOid: string;
  patternOid: string;
  fixedId: string;
  patternId: string;
  fixedMarkdown: string;
  patternMarkdown: string;
  fixedUuid: string;
  patternUuid: string;
  fixedXhtml: string;
  patternXhtml: string;
  fixedBoolean: boolean;
  patternBoolean: boolean;
  fixedDecimal: number;
  patternDecimal: number;
  fixedInteger: number;
  patternInteger: number;
  fixedUnsignedInt: number;
  patternUnsignedInt: number;
  fixedPositiveInt: number;
  patternPositiveInt: number;
  fixedCodeableConcept: CodeableConcept;
  patternCodeableConcept: CodeableConcept;
  fixedCoding: Coding;
  patternCoding: Coding;
  fixedQuantity: Quantity;
  patternQuantity: Quantity;
  fixedAge: Quantity;
  patternAge: Quantity;
  fixedAddress: InstanceDefinition;
  patternAddress: InstanceDefinition;
  fixedPeriod: InstanceDefinition;
  patternPeriod: InstanceDefinition;
  fixedRatio: Ratio;
  patternRatio: Ratio;
  fixedReference: Reference;
  patternReference: Reference;
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
  mapping: ElementDefinitionMapping[];
  structDef: StructureDefinition;
  private _original: ElementDefinition;
  private _edStructureDefinition: StructureDefinition;

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
        // Usually the path part is just the name without the slice.
        const [name] = s.split(':', 2);
        // The spec is unclear on if there is an exception in parts representing
        // a specific choice type, in which case, the path is the slice name (e.g., ) if the id is
        // Observation.value[x]:valueQuantity, then path is Observation.valueQuantity.
        // The code to make the exception is commented below, and will remain until we can clarify
        // const [name, slice] = s.split(':', 2);
        // if (
        //   slice &&
        //   name.endsWith('[x]') &&
        //   this.type &&
        //   this.type.some(t => slice === `${name.slice(0, -3)}${capitalize(t.code)}`)
        // ) {
        //   return slice;
        // }
        return name;
      })
      .join('.');
  }

  getPathWithoutBase(): string {
    return this.path.slice(this.structDef.type.length + 1);
  }

  /**
   * Get the StructureDefinition for ElementDefinition
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @returns {StructureDefinition} the StructureDefinition of ElementDefinition
   */
  getOwnStructureDefinition(fisher: Fishable): StructureDefinition {
    if (this._edStructureDefinition == null) {
      this._edStructureDefinition = StructureDefinition.fromJSON(
        fisher.fishForFHIR('ElementDefinition', Type.Type)
      );
    }
    return this._edStructureDefinition;
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
    return (
      PROPS.some(prop => {
        if (prop.endsWith('[x]')) {
          const re = new RegExp(`^${prop.slice(0, -3)}[A-Z].*$`);
          prop = Object.keys(this).find(p => re.test(p));
          if (prop == null) {
            prop = Object.keys(original).find(p => re.test(p));
          }
        }
        // @ts-ignore
        return prop && !isEqual(this[prop], original[prop]);
      }) ||
      // When a slice or a sliced element has children that changed, we must treat the slice or sliced element
      // as if it differs from the original. The IG Publisher requires slices or sliced elements with changed
      // children to be in the differential, or the snapshot is incorrectly generated
      ((this.sliceName || this.getSlices().length > 0) && this.children().some(c => c.hasDiff()))
    );
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
    // Set the diff id, which may be different than snapshot id in the case of choices (e.g., value[x] -> valueString)
    // NOTE: The path also gets set automatically when setting id
    diff.id = diff.diffId();
    // If the snapshot is a choice (e.g., value[x]), but the diff is a specific choice (e.g., valueString), then
    // remove the slicename property from the diff (it is implied and not required in the diff)
    // If the snapshot is not a choice, the diff needs to have a sliceName, so use the original.
    if (this.path.endsWith('[x]') && !diff.path.endsWith('[x]')) {
      delete diff.sliceName;
    } else if (original.sliceName && diff.sliceName == null) {
      diff.sliceName = original.sliceName;
    }
    return diff;
  }
  /**
   * Gets the id of an element on the differential using the shortcut syntax described here
   * https://blog.fire.ly/2019/09/13/type-slicing-in-fhir-r4/
   * @returns {string} the id for the differential
   */
  diffId(): string {
    return this.id
      .split('.')
      .map(p => {
        const i = p.indexOf('[x]:');
        return i > -1 ? p.slice(i + 4) : p;
      })
      .join('.');
  }

  /**
   * Apply invariant to the Element.constraint
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.constraint}
   * @param invariant The invariant to be applied to the constraint
   * @param source Source URL for the constraint
   */
  applyConstraint(invariant: Invariant, source?: string): void {
    const constraint: ElementDefinitionConstraint = {
      ...(invariant.name && { key: invariant.name }),
      ...(invariant.severity && { severity: invariant.severity.code }),
      ...(invariant.description && { human: invariant.description }),
      ...(invariant.expression && { expression: invariant.expression }),
      ...(invariant.xpath && { xpath: invariant.xpath }),
      ...(source && { source })
    };
    if (this.constraint) {
      this.constraint.push(constraint);
    } else {
      this.constraint = [constraint];
    }
    this.findConnectedElements().forEach(ce => ce.applyConstraint(invariant, source));
  }

  /**
   * This function sets an instance property of an ED if possible
   * @param {string} path - The path to the ElementDefinition to fix
   * @param {any} value - The value to fix
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   */
  setInstancePropertyByPath(path: string, value: any, fisher: Fishable): void {
    setPropertyOnDefinitionInstance(this, path, value, fisher);
  }

  getSlices() {
    return this.structDef.elements.filter(
      e => e.id !== this.id && e.path === this.path && e.id.startsWith(`${this.id}:`)
    );
  }

  /**
   * Constrains the cardinality of this element.  Cardinality constraints can only narrow
   * cardinality.  Attempts to constrain to a wider cardinality will throw.
   * @see {@link http://hl7.org/fhir/R4/profiling.html#cardinality}
   * @see {@link http://hl7.org/fhir/R4/conformance-rules.html#cardinality}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.min}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.max}
   * @param {number} min - the minimum cardinality
   * @param {number|string} max - the maximum cardinality
   * @throws {InvalidCardinalityError} when min > max
   * @throws {WideningCardinalityError} when new cardinality is wider than existing cardinality
   * @throws {InvalidSumOfSliceMinsError} when the mins of slice elements > max of sliced element
   * @throws {InvalidMaxOfSliceError} when a sliced element's max is < an individual slice's max
   * @throws {NarrowingRootCardinalityError} when the new cardinality on an element is narrower than
   *   the cardinality on a connected element
   */
  constrainCardinality(min: number, max: string): void {
    // If only one side of the cardinality is set by the rule, use element's current cardinality
    if (isNaN(min)) min = this.min;
    if (max === '') max = this.max;

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
    if (this.max != null && this.max !== '*' && (maxInt > parseInt(this.max) || isUnbounded)) {
      throw new WideningCardinalityError(this.min, this.max, min, max);
    }

    // Sliced elements and slices have special card rules described here:
    // http://www.hl7.org/fhiR/profiling.html#slice-cardinality
    // If element is slice definition
    if (this.slicing) {
      // Check that new max >= sum of mins of children
      this.checkSumOfSliceMins(max);
      // Check that new max >= every individual child max
      const slices = this.getSlices();
      const overMaxChild = slices.find(child => child.max === '*' || parseInt(child.max) > maxInt);
      if (!isUnbounded && overMaxChild) {
        throw new InvalidMaxOfSliceError(overMaxChild.max, overMaxChild.sliceName, max);
      }
    }

    const connectedElements = this.findConnectedElements();
    if (connectedElements.length > 0) {
      // check to see if the card constraint would actually be a problem for the connected element
      // that is to say, if the new card is narrower than the connected card
      connectedElements
        .filter(ce => !(ce.path === this.path && ce.id.startsWith(this.id)))
        // Filter out elements that are directly slices of this, since they may have min < this.min
        // Children of slices however must have min >= this.min
        .forEach(ce => {
          if (ce.min != null && ce.min < min) {
            throw new NarrowingRootCardinalityError(
              this.path,
              ce.id,
              min,
              max,
              ce.min,
              ce.max ?? '*'
            );
          }
        });
      connectedElements.forEach(ce => {
        // if the connected element's max is not null and is not *, we can't make the max smaller than its max
        if (ce.max != null && ce.max != '*' && maxInt != null && maxInt < parseInt(ce.max)) {
          throw new NarrowingRootCardinalityError(this.path, ce.id, min, max, ce.min ?? 0, ce.max);
        }
      });
    }

    // If element is a slice
    const slicedElement = this.slicedElement();
    if (slicedElement) {
      // Check that slicedElement max >= new sum of mins
      const sumOfMins = slicedElement.checkSumOfSliceMins(slicedElement.max, min - this.min);
      // If new sum of mins > slicedElement min, increase slicedElement min
      if (sumOfMins > slicedElement.min) {
        slicedElement.min = sumOfMins;
      }
    }

    [this.min, this.max] = [min, max];
  }

  /**
   * Tries to find all connected elements based on slicing.
   * When an element that has children is sliced, there can be constraints on that element's children,
   * as well as the children of any defined slices. Depending on the order that slices and rules are
   * defined, a rule may be applied to an element after slices of that element have already been
   * created. Therefore, to determine the full effect of that rule, the elements that are inside
   * slices must be found. The rule's path may contain many sliced elements, so it is necessary
   * to recursively search the StructureDefinition for ancestors of the element on the rule's path
   * that contain slice definitions. These sliced ancestors may in turn contain child elements that
   * match the rule's path.
   * In summary: find elements that have the same path, but are slicier.
   * @param {string} postPath The path to append to the parent in order to try to find a connected element
   * @returns {ElementDefinition[]} The elements at or inside of slices whose path matches the original element
   */
  private findConnectedElements(postPath = ''): ElementDefinition[] {
    const connectedElements = this.getSlices()
      .filter(e => e.max !== '0') // we don't need zeroed-out slices
      .map(slice => {
        return this.structDef.findElement(`${slice.id}${postPath}`);
      })
      .filter(e => e);
    if (this.parent()) {
      const [parentPath] = splitOnPathPeriods(this.path).slice(-1);
      return connectedElements.concat(
        this.parent().findConnectedElements(`.${parentPath}${postPath}`)
      );
    } else {
      return connectedElements;
    }
  }

  findConnectedSliceElement(postPath = ''): ElementDefinition {
    const slicingRoot = this.slicedElement();
    if (slicingRoot) {
      return this.structDef.findElement(`${slicingRoot.id}${postPath}`);
    } else if (this.parent()) {
      return this.parent().findConnectedSliceElement(
        `.${this.path.split('.').slice(-1)[0]}${postPath}`
      );
    }
  }

  /**
   * Checks if the sum of slice mins exceeds the max of sliced element, and returns
   * the sum if so.
   * @param {string} slicedElementMax - The max of the sliced element
   * @param {number} newSliceMin - An optional new minimum if the minimum of this is being constrained
   * @returns {number} the sum of the mins of the slices, or 0 if the sum is less than the sliced max
   * @throws {InvalidSumOfSliceMinsError} when the sum of mins of the slices exceeds max of sliced element
   */
  private checkSumOfSliceMins(newSlicedElementMax: string, sliceMinIncrease = 0) {
    const slices = this.getSlices();
    const sumOfMins = sliceMinIncrease + slices.reduce((prev, curr) => (prev += curr.min), 0);
    if (newSlicedElementMax !== '*' && sumOfMins > parseInt(newSlicedElementMax)) {
      throw new InvalidSumOfSliceMinsError(sumOfMins, newSlicedElementMax, this.id);
    } else {
      return sumOfMins;
    }
  }

  /**
   * Constrains the type of this element to the requested type(s).  When this element's type is a
   * choice, this function will reduce the choice to only those types provided -- unless a
   * targetType is provided, in which case, only that type will be affected and other options in
   * the choice will be left unchanged.  This function should allow the following scenarios:
   * - constrain a choice of types to a smaller subset of types (including a single type)
   * - constrain a type to one or more profiles on that type
   * - constrain a supertype (e.g., Resource) to one or more subtypes (e.g., Condition)
   * - constrain a reference of multiple types to a reference of a smaller subset of types
   * - constrain a reference of a type or profile to one or more profiles of that type/profile
   * - constrain a reference of a supertype to one or more references of subtypes
   * - any combinaton of the above
   * This function will throw when:
   * - attempting to add a base type (e.g., `type.code`) that wasn't already a choice in the type
   * - attempting to add a profile that doesn't match any of the existing types
   * - attempting to add a base reference that wasn't already a reference
   * - attempting to add a reference to a profile that doesn't match any of the existing references
   * - specifying a target that does not match any of the existing type choices
   * - specifying types or a target whose definition cannot be found
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.type}
   * @param {OnlyRule} rule - The rule specifying the types to apply
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @param {string} [target] - a specific target type to constrain.  If supplied, will attempt to
   *   constrain only that type without affecting other types (in a choice or reference to a choice).
   * @throws {TypeNotFoundError} when a passed in type's definition cannot be found
   * @throws {InvalidTypeError} when a passed in type or the targetType doesn't match any existing
   *   types
   * @throws {SliceTypeRemovalError} when a rule would eliminate all types on a slice
   */
  constrainType(rule: OnlyRule, fisher: Fishable, target?: string): void {
    const types = rule.types;
    // Establish the target types (if applicable)
    const targetType = this.getTargetType(target, fisher);
    const targetTypes: ElementDefinitionType[] = targetType ? [targetType] : this.type;

    // Setup a map to store how each existing element type maps to the input types
    const typeMatches: Map<string, ElementTypeMatchInfo[]> = new Map();
    targetTypes.forEach(t => typeMatches.set(t.code, []));

    // Loop through the input types and associate them to the element types in the map
    for (const type of types) {
      const typeMatch = this.findTypeMatch(type, targetTypes, fisher);
      typeMatches.get(typeMatch.code).push(typeMatch);
    }

    // Loop through the existing element types building the new set of element types w/ constraints
    const newTypes: ElementDefinitionType[] = [];
    const oldTypes: ElementDefinitionType[] = [];
    for (const type of this.type) {
      // If the typeMatches map doesn't have the type code at all, this means that a target was
      // specified, and this element type wasn't the target.  In this case, we want to keep it.
      if (!typeMatches.has(type.code)) {
        newTypes.push(cloneDeep(type));
        continue;
      }

      // Get the associated input type matches.  If no input types matched against it, then this
      // element type should be filtered out of the results, so just skip to the next one.
      const matches = typeMatches.get(type.code);
      if (isEmpty(matches)) {
        oldTypes.push(type);
        continue;
      }
      newTypes.push(...this.applyTypeIntersection(type, targetType, matches));
    }

    // Let user know if other rules have been made obsolete
    const obsoleteChoices = this.structDef.findObsoleteChoices(this, oldTypes);
    if (obsoleteChoices.length > 0) {
      logger.error(
        `Type constraint on ${this.path} makes rules in ${
          this.structDef.name
        } obsolete for choices: ${obsoleteChoices.join(', ')}`,
        rule.sourceInfo
      );
    }

    // new types for this element have been determined
    // if there are any connected elements, make sure that nothing invalid will happen
    let connectedElements = this.findConnectedElements();
    // however, we don't need to apply this to elements representing a choice of types
    // for example, if this is being applied to value[x], and valueString exists, we can remove the string type.
    if (this.path.endsWith('[x]')) {
      connectedElements = connectedElements.filter(ce => ce.id.endsWith('[x]'));
    }
    if (connectedElements.length > 0) {
      // if all connected elements have a non-empty intersection, we can safely apply the rule
      const connectedTypeChanges: Map<ElementDefinition, ElementDefinitionType[]> = new Map();
      connectedElements.forEach(ce => {
        const intersection = this.findTypeIntersection(newTypes, ce.type, targetType, fisher);
        if (intersection.length > 0) {
          connectedTypeChanges.set(ce, intersection);
        } else {
          const obsoleteConnections = ce.structDef.findObsoleteChoices(ce, oldTypes);
          if (obsoleteConnections.length > 0) {
            logger.error(
              `Type constraint on ${rule.path} makes rules in ${
                ce.structDef.name
              } obsolete for choices: ${obsoleteConnections.join(', ')}`,
              rule.sourceInfo
            );
          } else {
            throw new SliceTypeRemovalError(rule.path, ce.id);
          }
        }
      });
      if (connectedElements.length == connectedTypeChanges.size) {
        connectedTypeChanges.forEach((ceType, ce) => (ce.type = ceType));
      }
    }

    // Finally, reset this element's types to the new types
    this.type = newTypes;
  }

  /**
   * Given a string representing a type or profile, will return this element's matching type, if
   * found -- with all other profiles or targetProfiles (e.g. references) removed from the type.
   * @param {string} target - the target to find a matching type for
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @returns {ElementDefinitionType} the element's type that matches the target
   * @throws {TypeNotFoundError} when the target's definition cannot be found
   * @throws {InvalidTypeError} when the target doesn't match any existing types
   */
  private getTargetType(target: string, fisher: Fishable): ElementDefinitionType {
    let targetType: ElementDefinitionType;
    if (target) {
      const targetSD = fisher.fishForMetadata(
        target,
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension
      );
      if (targetSD == null) {
        throw new TypeNotFoundError(target);
      }
      // Try to match on types by an exact match on the code (applies to resources),
      // the profiles (applies to profiles), or targetProfiles (applies to references).
      // Clone it since we will filter out the non-target profiles/targetProfiles.
      targetType = cloneDeep(
        this.type.find(
          t =>
            t.code === targetSD.id ||
            t.profile?.includes(targetSD.url) ||
            t.targetProfile?.includes(targetSD.url)
        )
      );

      if (!targetType) {
        throw new InvalidTypeError(target, this.type);
      }

      // Re-assign the targetProfiles/profiles as appopriate to remove non-targets
      if (targetType.profile?.includes(targetSD.url)) {
        targetType.profile = [targetSD.url];
      } else if (targetType.targetProfile?.includes(targetSD.url)) {
        targetType.targetProfile = [targetSD.url];
      }
    }
    return targetType;
  }

  /**
   * Given an input type (the constraint) and a set of target types (the things to potentially
   * constrain), find the match and return information about it.
   * @param {{ type: string; isReference?: boolean }} type - the constrained types, identified by
   *   id/type/url string and an optional reference flag (defaults false)
   * @param {ElementDefinitionType[]} targetTypes - the element types that the constrained type
   *   can be potentially applied to
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @param {string} [target] - a specific target type to constrain.  If supplied, will attempt to
   *   constrain only that type without affecting other types (in a choice or reference to a choice).
   * @returns {ElementTypeMatchInfo} the information about the match
   * @throws {TypeNotFoundError} when the type's definition cannot be found
   * @throws {InvalidTypeError} when the type doesn't match any of the targetTypes
   */
  private findTypeMatch(
    type: { type: string; isReference?: boolean },
    targetTypes: ElementDefinitionType[],
    fisher: Fishable
  ): ElementTypeMatchInfo {
    let matchedType: ElementDefinitionType;

    // Get the lineage (type hierarchy) so we can walk up it when attempting to match
    const lineage = this.getTypeLineage(type.type, fisher);
    if (isEmpty(lineage)) {
      throw new TypeNotFoundError(type.type);
    }

    // Walk up the lineage, one StructureDefinition at a time.  We can potentially match on the
    // type itself or any of its parents.  For example, a BloodPressure profile could match on
    // an Observation already having a BP profile, an Observation type w/ no profiles, a
    // DomainResource type w/ no profiles, or a Resource type w/ no profiles.
    let specializationOfNonAbstractType = false;
    for (const md of lineage) {
      if (type.isReference) {
        // References always have a code 'Reference' w/ the referenced type's defining URL set as
        // one of the targetProfiles.  If the targetProfile property is null, that means any
        // reference is allowed.
        matchedType = targetTypes.find(
          t2 =>
            t2.code === 'Reference' &&
            (t2.targetProfile == null || t2.targetProfile.includes(md.url))
        );
      } else {
        // Look for exact match on the code (w/ no profile) or a match on the same base type with
        // a matching profile
        matchedType = targetTypes.find(t2 => {
          const matchesUnprofiledResource = t2.code === md.id && isEmpty(t2.profile);
          const matchesProfile = t2.code === md.sdType && t2.profile?.includes(md.url);
          // True if we match an unprofiled type that is not abstract, is a parent, and that we are
          // specializing (the type does not match the sdType of the type to match)
          specializationOfNonAbstractType =
            matchesUnprofiledResource &&
            !md.abstract &&
            md.id !== lineage[0].id &&
            md.id !== lineage[0].sdType;
          return matchesUnprofiledResource || matchesProfile;
        });
      }

      if (matchedType) {
        break;
      }
    }

    if (!matchedType) {
      throw new InvalidTypeError(
        type.isReference ? `Reference(${type.type})` : type.type,
        targetTypes
      );
    } else if (specializationOfNonAbstractType) {
      throw new NonAbstractParentOfSpecializationError(type.type, matchedType.code);
    }

    return {
      metadata: lineage[0],
      code: matchedType.code
    };
  }

  /**
   * Gets the full lineage of the type, w/ the item at index 0 being the type's own Metadata,
   * the item at index 1 being its parent's, 2 being its grandparent's, etc.  If a definition can't be
   * found, it stops and returns as much lineage as is found thus far.
   * @param {string} type - the type to get the lineage for
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @returns {Metadata[]} representing the lineage of the type
   */
  private getTypeLineage(type: string, fisher: Fishable): Metadata[] {
    const results: Metadata[] = [];

    // Start with the current type and walk up the base definitions.
    // Stop when we can't find a definition or the base definition is blank.
    let currentType = type;
    while (currentType != null) {
      const result = fisher.fishForMetadata(currentType);
      if (result) {
        results.push(result);
      }
      currentType = result?.parent;
    }

    return results;
  }

  /**
   * Given a new ElementTypeDefinition (based on the existing one), will apply the matching
   * profiles and targetProfiles as appropriate.  If a targetType was specified, will filter out
   * the other profiles or targetProfiles.
   * @param {ElementDefinitionType} newType - the new type to apply the profiles/targetProfiles to
   * @param {ElementDefinitionType} [targetType] - the (potentially null) target type for the
   *   type constraint
   * @param {ElementTypeMatchInfo[]} matches - the information about how type constraints map
   *   to element types
   */
  private applyProfiles(
    newType: ElementDefinitionType,
    targetType: ElementDefinitionType,
    matches: ElementTypeMatchInfo[]
  ): void {
    const matchedProfiles: string[] = [];
    const matchedTargetProfiles: string[] = [];
    for (const match of matches) {
      if (match.metadata.id === newType.code) {
        continue;
      } else if (match.code === 'Reference' && match.metadata.sdType !== 'Reference') {
        matchedTargetProfiles.push(match.metadata.url);
      } else {
        matchedProfiles.push(match.metadata.url);
      }
    }
    if (targetType) {
      if (!isEmpty(matchedTargetProfiles)) {
        const targetIdx = newType.targetProfile?.indexOf(targetType.targetProfile[0]);
        if (targetIdx != null && targetIdx > -1) {
          newType.targetProfile.splice(targetIdx, 1, ...matchedTargetProfiles);
        } else {
          newType.targetProfile = newType.profile ?? [];
          newType.targetProfile.push(...matchedTargetProfiles);
        }
      }
      if (!isEmpty(matchedProfiles)) {
        const targetIdx = newType.profile?.indexOf(targetType.profile[0]);
        if (targetIdx != null && targetIdx > -1) {
          newType.profile.splice(targetIdx, 1, ...matchedProfiles);
        } else {
          newType.profile = newType.profile ?? [];
          newType.profile.push(...matchedProfiles);
        }
      }
    } else {
      if (!isEmpty(matchedTargetProfiles)) {
        newType.targetProfile = matchedTargetProfiles;
      }
      if (!isEmpty(matchedProfiles)) {
        newType.profile = matchedProfiles;
      }
    }
  }

  private findTypeIntersection(
    leftTypes: ElementDefinitionType[],
    rightTypes: ElementDefinitionType[],
    targetType: ElementDefinitionType,
    fisher: Fishable
  ): ElementDefinitionType[] {
    const intersection: ElementDefinitionType[] = [];
    let match: ElementTypeMatchInfo;
    leftTypes.forEach(left => {
      const matches: ElementTypeMatchInfo[] = [];
      try {
        match = this.findTypeMatch({ type: left.code }, rightTypes, fisher);
        matches.push(match);
      } catch (ex) {
        // it's okay if a given type doesn't have any matches.
      }
      intersection.push(...this.applyTypeIntersection(left, targetType, matches));
    });

    return intersection;
  }

  // In the case of an element type whose code is a supertype (e.g., 'Resource'), we need to
  // break that up into a new set of element types corresponding to the subtypes.  For example,
  // if a 'Resource' type is constrained to 'Condition' and 'Procedure', then in the resulting
  // StructureDefinition, there should be element types with codes 'Condition' and 'Procedure',
  // and no element type with the code 'Resource` any longer.  So... we create a special
  // map to store the current subtypes (or if not applicable, just store the original type).
  private applyTypeIntersection(
    type: ElementDefinitionType,
    targetType: ElementDefinitionType,
    matches: ElementTypeMatchInfo[]
  ) {
    const intersection: ElementDefinitionType[] = [];
    const currentTypeMatches: Map<string, ElementTypeMatchInfo[]> = new Map();
    for (const match of matches) {
      // If the original element type is a Reference, keep it a reference, otherwise take on the
      // input type's type code (as represented in its StructureDefinition.type).
      const typeString = match.code === 'Reference' ? 'Reference' : match.metadata.sdType;
      if (!currentTypeMatches.has(typeString)) {
        currentTypeMatches.set(typeString, []);
      }
      currentTypeMatches.get(typeString).push(match);
    }
    for (const [typeCode, currentMatches] of currentTypeMatches) {
      const newType = cloneDeep(type);
      newType.code = typeCode;
      this.applyProfiles(newType, targetType, currentMatches);
      intersection.push(newType);
    }
    return intersection;
  }

  /**
   * Sets flags on this element as specified in a profile or extension.
   * Don't change a flag when the incoming argument is undefined or false.
   * @see {@link http://hl7.org/fhir/R4/profiling.html#mustsupport}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.mustSupport}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.isSummary}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.isModifier}
   * @see {@link http://hl7.org/fhir/R4/versions.html#std-process}
   * @see {@link http://hl7.org/fhir/extension-structuredefinition-standards-status.html}
   * @see {@link http://hl7.org/fhir/valueset-standards-status.html}
   * @param mustSupport - whether to make this element a Must Support element
   * @param summary - whether to include this element when querying for a summary
   * @param modifier - whether this element acts as a modifier on the resource
   * @param trialUse - indicates a standards status of "Trial Use" for this element
   * @param normative - indicates a standards status of "Normative" for this element
   * @param draft - indicates a standards status of "Draft" for this element
   */
  applyFlags(
    mustSupport: boolean,
    summary: boolean,
    modifier: boolean,
    trialUse: boolean,
    normative: boolean,
    draft: boolean
  ): void {
    let newStatusExtension: any = null;
    if (trialUse) {
      newStatusExtension = {
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'trial-use'
      };
    }
    if (normative) {
      if (newStatusExtension) {
        throw new MultipleStandardsStatusError(this.id);
      }
      newStatusExtension = {
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'normative'
      };
    }
    if (draft) {
      if (newStatusExtension) {
        throw new MultipleStandardsStatusError(this.id);
      }
      newStatusExtension = {
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'draft'
      };
    }

    const connectedElements = this.findConnectedElements();
    if (mustSupport === true) {
      this.mustSupport = mustSupport;
      connectedElements.forEach(ce => (ce.mustSupport = mustSupport || ce.mustSupport));
    }
    if (summary === true) {
      this.isSummary = summary;
      connectedElements.forEach(ce => (ce.isSummary = summary));
    }
    if (modifier === true) {
      this.isModifier = modifier;
      connectedElements.forEach(ce => (ce.isModifier = modifier || ce.isModifier));
    }
    if (newStatusExtension) {
      if (this.extension) {
        const oldStatus = this.extension.findIndex(
          extension =>
            extension.url ==
            'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status'
        );
        if (oldStatus > -1) {
          this.extension[oldStatus] = newStatusExtension;
        } else {
          this.extension.push(newStatusExtension);
        }
      } else {
        this.extension = [newStatusExtension];
      }
    }
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
   * @throws {InvalidUriError} when the value set uri is not valid
   */
  bindToVS(vsURI: string, strength: ElementDefinitionBindingStrength): void {
    // Check if this is a valid type to be bound against
    const validTypes = this.findTypesByCode(
      'code',
      'Coding',
      'CodeableConcept',
      'Quantity',
      'string',
      'uri'
    );
    if (isEmpty(validTypes)) {
      throw new CodedTypeNotFoundError(this.type ? this.type.map(t => t.code) : []);
    }
    const strengths = ['example', 'preferred', 'extensible', 'required'];
    // Check if this is a valid strength (if the binding.strength already exists)
    if (this.binding && this.binding.strength) {
      if (strengths.indexOf(strength) < strengths.indexOf(this.binding.strength)) {
        throw new BindingStrengthError(this.binding.strength, strength);
      }
    }

    const connectedElements = this.findConnectedElements();
    connectedElements.forEach(ce => {
      if (vsURI == ce.binding?.valueSet) {
        try {
          ce.bindToVS(vsURI, strength);
        } catch (ex) {
          // receiving a BindingStrengthError on a slice is not a problem, because
          // it is fine if the slice has a stronger binding than the list element.
        }
      }
    });
    // check to make sure we are not applying an explicitly weaker binding of the same value set of a slice's list element
    const listElement = this.slicedElement();
    if (
      listElement?.binding?.valueSet == vsURI &&
      strengths.indexOf(strength) < strengths.indexOf(listElement?.binding?.strength)
    ) {
      throw new BindingStrengthError(listElement?.binding?.strength, strength);
    }
    // Canonical URLs may include | to specify version: https://www.hl7.org/fhir/references.html#canonical
    if (!isUri(vsURI.split('|')[0])) {
      throw new InvalidUriError(vsURI);
    }

    // We're good.  Bind it.
    this.binding = {
      strength,
      valueSet: vsURI
    };
  }

  /**
   * Fixes a value to an ElementDefinition
   * @param {FixedValueType} value - The value to fix
   * @param {exactly} boolean - True if if fixed[x] should be used, otherwise pattern[x] is used
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {MismatchedTypeError} when the value does not match the type of the ElementDefinition
   */
  fixValue(value: FixedValueType, exactly = false, fisher?: Fishable): void {
    let type: string;
    if (value instanceof FshCode) {
      type = 'Code';
    } else if (value instanceof FshQuantity) {
      type = 'Quantity';
    } else if (value instanceof FshRatio) {
      type = 'Ratio';
    } else if (value instanceof FshReference) {
      type = 'Reference';
    } else if (value instanceof FshCanonical) {
      type = 'Canonical';
    } else if (value instanceof InstanceDefinition) {
      type = 'InstanceDefinition';
    } else {
      type = typeof value;
    }

    // We can only fix elements that have a single type, else it is ambiguous
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError(type);
    }

    // If fixing by pattern, ensure that it's not already fixed by fixed[x], because We can't overrided
    // fixed[x] with pattern[x] since pattern[x] is looser
    if (!exactly) {
      const fixedField = Object.entries(this).find(e => e[0].startsWith('fixed') && e[1] != null);
      if (fixedField) {
        throw new FixedToPatternError(fixedField[0]);
      }
    }

    // The approach to fixing may differ based on type...
    switch (type) {
      case 'boolean':
        this.fixFHIRValue(value.toString(), value, exactly, 'boolean');
        break;
      case 'number':
        this.fixNumber(value as number, exactly);
        break;
      case 'string':
        this.fixString(value as string, exactly);
        break;
      case 'Code':
        this.fixFshCode(value as FshCode, exactly);
        break;
      case 'Quantity':
        value = value as FshQuantity;
        // Special case quantity to support compatible specializations (like Age), but try to do it
        // in a flexible way (without hard-coding every specialization here).
        let providedType = 'Quantity';
        const actualType = this.type[0].code;
        if (actualType !== 'Quantity') {
          const actualTypeSD = fisher?.fishForFHIR(actualType, Type.Type);
          if (actualTypeSD?.baseDefinition === 'http://hl7.org/fhir/StructureDefinition/Quantity') {
            // We treat every quantity instance as compatible w/ every specialization. This is not
            // strictly true, but in order to validate it, we'd need to either support/process the
            // FHIRPath rules or hard-code a bunch of special case logic here. Instead, let the IG
            // Publisher deal with this extra validation and just pass it through here.
            providedType = actualType;
          }
        }
        this.fixFHIRValue(value.toString(), value.toFHIRQuantity(), exactly, providedType);
        break;
      case 'Ratio':
        value = value as FshRatio;
        this.fixFHIRValue(value.toString(), value.toFHIRRatio(), exactly, 'Ratio');
        break;
      case 'Reference':
        value = value as FshReference;
        // If no targetProfile is present, there is nothing to check the value against, so just fix it
        if (value.sdType && this.type[0].targetProfile) {
          const validTypes: string[] = [];
          this.type[0].targetProfile.forEach(tp => {
            const tpType = fisher.fishForMetadata(tp)?.sdType;
            if (tpType) {
              validTypes.push(tpType);
            }
          });

          const referenceLineage = this.getTypeLineage(value.sdType, fisher);
          if (!referenceLineage.some(md => validTypes.includes(md.sdType))) {
            throw new InvalidTypeError(`Reference(${value.sdType})`, this.type);
          }
        }
        this.fixFHIRValue(value.toString(), value.toFHIRReference(), exactly, 'Reference');
        break;
      case 'Canonical':
        value = value as FshCanonical;
        // Get the canonical url of the entity
        let canonicalUrl = fisher.fishForMetadata(
          value.entityName,
          Type.Resource,
          Type.Type,
          Type.Profile,
          Type.Extension,
          Type.ValueSet,
          Type.CodeSystem,
          Type.Instance
        )?.url;
        if (!canonicalUrl) {
          throw new InvalidCanonicalUrlError(value.entityName);
        }
        if (value.version) {
          canonicalUrl += `|${value.version}`;
        }
        this.fixString(canonicalUrl, exactly);
        break;
      case 'InstanceDefinition':
        value = value as InstanceDefinition;
        const stringVal = JSON.stringify(value);
        this.fixFHIRValue(
          stringVal,
          value.toJSON(),
          exactly,
          value._instanceMeta.sdType ?? value.resourceType
        );
        break;
      default:
        type = (typeof value === 'object' && value.constructor?.name) ?? type;
        throw new MismatchedTypeError(type, value, this.type[0].code);
    }

    // If the element is found in a discriminator.path, then we enforce that it has minimum cardinality 1
    // since its value is fixed
    const parentSlices = [this, ...this.getAllParents().reverse()].filter(el => el.sliceName);
    parentSlices.forEach(parentSlice => {
      const slicedElement = parentSlice.slicedElement();
      if (
        slicedElement.slicing.discriminator?.some(
          d =>
            `${slicedElement.path}${d.path === '$this' ? '' : `.${d.path}`}` === this.path &&
            ['value', 'pattern'].includes(d.type)
        ) &&
        this.min === 0
      ) {
        this.constrainCardinality(1, '');
      }
    });
  }

  /**
   * Checks if a FHIR value can be fixed and then fixes it if so. A FHIR value can be fixed on an element if:
   * - the element isn't already fixed to something else (by fixed[x], pattern[x], or from a parent)
   * - or the element is already fixed to something that is the same or a subset of the new value
   *   - e.g., you can fix { code: 'Foo', system: 'http://bar.com' } to an element already fixed to
   *     { system: 'http://bar.com } because the new value contains the old value (with no conflicts).
   *     This does not work the other way around, however.
   * @param {string} fshValue - The FSH-syntax-formatted value (usually the FSH class .toString())
   * @param {object} fhirValue - The FHIR representation of the FSH value
   * @param {boolean} exactly - Set to true if fixed[x] should be used, otherwise pattern[x] is used
   * @param {string} type - The FHIR type that is being fixed; will be used to construct fixed[x] and pattern[x] names
   * @throws {ValueAlreadyFixedError} when the currentElementValue exists and is different than the new value
   * @throws {MismatchedTypeError} when the value does not match the type of the ElementDefinition
   */
  private fixFHIRValue(fshValue: string, fhirValue: any, exactly: boolean, type: string) {
    if (this.type[0].code !== type) {
      throw new MismatchedTypeError(type, fshValue, this.type[0].code);
    }

    // Find the fixed[x] and pattern[x] variables to use
    const fixedX = `fixed${upperFirst(type)}` as keyof ElementDefinition;
    const patternX = `pattern${upperFirst(type)}` as keyof ElementDefinition;

    // Find any currently fixed values
    const currentElementValue = this[fixedX] ?? this[patternX] ?? this.fixedByAnyParent();
    // For complex types, use isMatch to check if they are a subset, otherwise use isEqual
    const compareFn = typeof fhirValue === 'object' ? isMatch : isEqual;
    if (currentElementValue != null && !compareFn(fhirValue, currentElementValue)) {
      // It's a different value and not a compatible subset (e.g., the new value doesn't contain the old)
      throw new ValueAlreadyFixedError(fshValue, type, JSON.stringify(currentElementValue));
    }

    // Children of elements with complex types such as Quantity may already have fixed values
    this.children().forEach(child => this.checkChildFixedValue(child, fhirValue));

    // if this is a slice, make sure that nothing on this.slicedElement() is being violated
    const slicedElement = this.slicedElement();
    if (slicedElement) {
      slicedElement
        .children()
        .forEach(child => slicedElement.checkChildFixedValue(child, fhirValue));
    }

    // If we made it this far, fix the value using fixed[x] or pattern[x] as appropriate
    if (exactly) {
      // @ts-ignore: Type 'any' is not assignable to type 'never'
      this[fixedX] = fhirValue;
      delete this[patternX];
    } else {
      // @ts-ignore: Type 'any' is not assignable to type 'never'
      this[patternX] = fhirValue;
      // NOTE: No need to delete fixed[x], as changing from fixed[x] to pattern[x] is not allowed
    }
  }

  private checkChildFixedValue(child: ElementDefinition, fhirValue: any) {
    const childType = child.type[0].code;
    const fixedX = `fixed${upperFirst(childType)}` as keyof ElementDefinition;
    const patternX = `pattern${upperFirst(childType)}` as keyof ElementDefinition;
    const currentChildValue = child[fixedX] ?? child[patternX];
    if (currentChildValue != null) {
      // find the element on fhirValue that would get assigned to the child
      const childPath = child.id.replace(`${this.id}.`, '').split('.');
      let newChildValue = fhirValue;
      for (const pathPart of childPath) {
        if (newChildValue != null) {
          newChildValue = newChildValue[pathPart];
        }
      }
      if (newChildValue != null) {
        const childCompareFn = typeof newChildValue === 'object' ? isMatch : isEqual;
        if (!childCompareFn(newChildValue, currentChildValue)) {
          throw new ValueAlreadyFixedError(
            newChildValue,
            childType,
            JSON.stringify(currentChildValue)
          );
        }
      }
    }
  }

  /**
   * Checks if an element is fixed by a fixed[x] or pattern[x] on its direct parent
   * @returns {any} the value the element is fixed to by its parent, undefined if value is not fixed
   */
  fixedByDirectParent(): any {
    const parent = this.parent();
    const fixedKey = parent
      ? Object.keys(parent).find(k => k.startsWith('fixed') || k.startsWith('pattern'))
      : null;
    if (fixedKey) {
      const fixedValue: any = parent[fixedKey as keyof ElementDefinition];
      return fixedValue[this.path.replace(`${parent.path}.`, '')];
    }
  }

  /**
   * Checks if an element is fixed by a pattern[x] on any of its parents
   * @returns {any} the value the element is fixed to by its parent, undefined if value is not fixed
   */
  fixedByAnyParent(): any {
    const parent = this.parent();
    if (parent == null) {
      return;
    } else {
      let fixedValue = this.fixedByDirectParent();
      if (fixedValue == null) {
        // Get the value from the parent, and index into that value
        const parentValue = parent.fixedByAnyParent();
        const childIndex = this.path.replace(`${parent.path}.`, '');
        if (Array.isArray(parentValue)) {
          // If the value is an array, there are two cases
          // 1 - All the fixed values in the array match => return the value
          // 2 - The fixed values in the array don't match => return [val1, val2]
          // since values do exist, but they conflict so no value should be allowed to be set
          // and for any value [val1, val2] != value
          fixedValue =
            parentValue.every(pv => pv[childIndex] === parentValue[0][childIndex]) &&
            parentValue.length > 0
              ? parentValue[0][childIndex]
              : parentValue.map(pv => pv[childIndex]);
        } else {
          fixedValue = parentValue?.[childIndex];
        }
      }
      return fixedValue;
    }
  }

  /**
   * Fixes a number to this element.
   * @see {@link fixValue}
   * @see {@link https://www.hl7.org/fhir/datatypes.html#primitive}
   * @param {number} value - the number value to fix
   * @param {exactly} boolean - True if if fixed[x] should be used, otherwise pattern[x] is used
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {MismatchedTypeError} when the value does not match the type of the ElementDefinition
   */
  private fixNumber(value: number, exactly = false): void {
    const type = this.type[0].code;
    if (
      type === 'decimal' ||
      (type === 'integer' && Number.isInteger(value)) ||
      (type === 'unsignedInt' && Number.isInteger(value) && value >= 0) ||
      (type === 'positiveInt' && Number.isInteger(value) && value > 0)
    ) {
      this.fixFHIRValue(value.toString(), value, exactly, type);
    } else {
      throw new MismatchedTypeError('number', value, type);
    }
  }

  /**
   * Fixes a string to this element.
   * @see {@link fixValue}
   * @see {@link https://www.hl7.org/fhir/datatypes.html#primitive}
   * @param {string} value - the string value to fix
   * @param {exactly} boolean - True if if fixed[x] should be used, otherwise pattern[x] is used
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {TypeNotFoundError} when the value does not match the type of the ElementDefinition
   */
  private fixString(value: string, exactly = false): void {
    const type = this.type[0].code;
    if (
      type === 'string' ||
      (type === 'uri' && /^\S*$/.test(value)) ||
      (type === 'url' && /^\S*$/.test(value)) ||
      (type === 'canonical' && /^\S*$/.test(value)) ||
      (type === 'base64Binary' && /^(\s*([0-9a-zA-Z\+\/=]){4}\s*)+$/.test(value)) ||
      (type === 'instant' &&
        /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))$/.test(
          value
        )) ||
      (type === 'date' &&
        /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)?$/.test(
          value
        )) ||
      (type === 'dateTime' &&
        /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$/.test(
          value
        )) ||
      (type === 'time' &&
        /^([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?$/.test(value)) ||
      (type === 'oid' && /^urn:oid:[0-2](\.(0|[1-9][0-9]*))+$/.test(value)) ||
      (type === 'id' && /^[A-Za-z0-9\-\.]{1,64}$/.test(value)) ||
      (type === 'markdown' && /^\s*(\S|\s)*$/.test(value)) ||
      type === 'uuid'
    ) {
      this.fixFHIRValue(`"${value}"`, value, exactly, type);
    } else if (type == 'xhtml' && this.checkXhtml(value)) {
      this.fixFHIRValue(`"${value}"`, value, exactly, type);
      // If we got here, the fixed value is valid. Replace the XML with a minimized version.
      this[exactly ? 'fixedXhtml' : 'patternXhtml'] = minify(value, { collapseWhitespace: true });
    } else {
      throw new MismatchedTypeError('string', value, type);
    }
  }

  private checkXhtml(value: string): boolean {
    try {
      return sax.parser(true).write(value).error == null;
    } catch (ex) {
      return false;
    }
  }

  /**
   * Checks if a resource can be fixed to this element
   * @param {InstanceDefinition} value - The resource to fix
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @throws {MismatchedTypeError} when the ElementDefinition is not of type Resource
   * @returns {InstanceDefinition} the input value when it can be fixed
   */
  checkFixInlineInstance(value: InstanceDefinition, fisher: Fishable): InstanceDefinition {
    const inlineInstanceType = value.resourceType ?? value._instanceMeta.sdType;
    const lineage = this.getTypeLineage(inlineInstanceType, fisher).map(
      metadata => metadata.sdType
    );
    if (this.type?.some(t => lineage.includes(t.code))) {
      return value;
    } else {
      // In this case neither the type of the inline instance nor the type of any of its parents matches the
      // ED.type, so we cannot fix the inline instance to this ED.
      throw new MismatchedTypeError(
        inlineInstanceType,
        value.id,
        this.type?.map(t => t.code).join(', ')
      );
    }
  }

  /**
   * Fixes a code to this element, formatting it in the way the element expects for the type.
   * If the element is not a code-ish type or a different code is already fixed, it will throw.
   * TODO: Determine if it is valid to fix the code on a choice element (e.g., value[x]).
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_}
   * @param {FshCode} code - the code to fix
   * @param {exactly} boolean - True if if fixed[x] should be used, otherwise pattern[x] is used
   * @throws {CodedTypeNotFoundError} when there is no coded type on this element
   * @throws {ValueAlreadyFixedError} when the code is already fixed to a different code
   * @throws {InvalidUriError} when the system being fixed is not a valid uri
   */
  private fixFshCode(code: FshCode, exactly = false): void {
    if (code.system && !isUri(code.system.split('|')[0])) {
      throw new InvalidUriError(code.system);
    }

    const type = this.type[0].code;
    if (type === 'code' || type === 'string' || type === 'uri') {
      this.fixFHIRValue(code.toString(), code.code, exactly, type);
    } else if (type === 'CodeableConcept') {
      this.fixFHIRValue(code.toString(), code.toFHIRCodeableConcept(), exactly, 'CodeableConcept');
    } else if (type === 'Coding') {
      this.fixFHIRValue(code.toString(), code.toFHIRCoding(), exactly, 'Coding');
    } else if (type === 'Quantity') {
      // Since code only maps to part of Quantity, we want to ensure that if there are other (non-code) parts
      // already fixed, we take them on too -- as we don't want to overwrite them with blanks.
      const existing = this.fixedQuantity ?? this.patternQuantity ?? this.fixedByAnyParent();
      const quantity = code.toFHIRQuantity();
      if (existing?.value != null) {
        quantity.value = existing.value;
      }
      if (existing?.comparator != null) {
        quantity.comparator = existing.comparator;
      }
      this.fixFHIRValue(code.toString(), quantity, exactly, 'Quantity');
    } else {
      throw new CodedTypeNotFoundError([type]);
    }
  }

  /**
   * Checks if a the ElementDefinition has exactly one type
   * @returns {boolean} - true if there is exactly one type
   */
  private hasSingleType() {
    const types = this.type ?? [];
    return types.length === 1;
  }

  /**
   * Sets mapping on an element
   * @see {@link https://www.hl7.org/fhir/elementdefinition-definitions.html#ElementDefinition.mapping}
   * @param {string} identity - value for mapping.identity
   * @param {string} map - value for mapping.map
   * @param {string} comment - value for mapping.comment
   * @param {FshCode} language - language.code is value for mapping.language
   * @throws {InvalidMappingError} when attempting to set mapping with identity or map undefined
   * @throws {InvalidFHIRIdError} when setting mapping.identity to an invalid FHIR ID
   */
  applyMapping(identity: string, map: string, comment: string, language: FshCode): void {
    if (identity == null || map == null) {
      throw new InvalidMappingError();
    }
    if (!idRegex.test(identity)) {
      throw new InvalidFHIRIdError(identity);
    }
    const mapping = {
      identity,
      map,
      ...(comment && { comment }),
      ...(language && { language: language.code })
    };
    if (this.mapping) {
      this.mapping.push(mapping);
    } else {
      this.mapping = [mapping];
    }
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
   * Finds and returns all parent elements.  For example, the parent elements of `Foo.bar.one` are [`Foo.bar`, `Foo`].
   * @returns {ElementDefinition[]} the array of parents, empty if no parents
   */
  getAllParents(): ElementDefinition[] {
    const parents = [];
    let parent = this.parent();
    while (parent) {
      parents.push(parent);
      parent = parent.parent();
    }
    return parents;
  }

  /**
   * Finds and returns all child elements of this element.  For example, the children of `Foo.bar` might be the
   * elements `Foo.bar.one`, `Foo.bar.two`, and `Foo.bar.two.a`.  This will not "expand" or "unroll" elements; it
   * only returns those child elements that already exist in the structure definition.
   * @param {boolean} directOnly - If true, only direct children of the element are returned
   * @returns {ElementDefinition[]} the child elements of this element
   */
  children(directOnly = false): ElementDefinition[] {
    return this.structDef.elements.filter(e => {
      return (
        e !== this &&
        e.id.startsWith(`${this.id}.`) &&
        (!directOnly || e.path.split('.').length === this.path.split('.').length + 1)
      );
    });
  }
  /**
   * Finds and returns all fixable descendents of the element. A fixable descendent is a direct child of the
   * element that has minimum cardinality greater than 0, and all fixable descendents of such children
   * @returns {ElementDefinition[]} the fixable descendents of this element
   */
  getFixableDescendents(): ElementDefinition[] {
    const fixableChildren = this.children(true).filter(e => e.min > 0);
    let fixableDescendents: ElementDefinition[] = [];
    fixableChildren.forEach(fc => {
      fixableDescendents = fixableDescendents.concat(fc.getFixableDescendents());
    });
    return [...fixableChildren, ...fixableDescendents];
  }

  /**
   * Finds and returns the elemnent being sliced
   * @returns {ElementDefinition | undefined} the sliced element or undefined if the element is not a slice
   */
  slicedElement(): ElementDefinition | undefined {
    if (this.sliceName) {
      return this.structDef.elements.find(e => e.id === this.id.slice(0, this.id.lastIndexOf(':')));
    }
  }

  /**
   * If the element has a single type, graft the type's elements into this StructureDefinition as child elements.
   * If the element is sliced, unfold from the sliced element on the StructureDefinition
   * If the elemnet is a content reference, unfold from the referenced element on the StructureDefintion
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   * @returns {ElementDefinition[]} the unfolded elements or an empty array if the type is multi-value or type can't
   *   be resolved.
   */
  unfold(fisher: Fishable): ElementDefinition[] {
    if (
      (this.type?.length === 1 && (this.type[0].profile ?? []).length <= 1) ||
      this.contentReference
    ) {
      let newElements: ElementDefinition[] = [];
      if (this.contentReference) {
        // If the element is a content reference, we need to unfold from the referenced element
        // Get the original resource JSON so we unfold unconstrained reference
        const type = this.structDef.type;
        const json = fisher.fishForFHIR(type, Type.Resource);
        if (json) {
          const def = StructureDefinition.fromJSON(json);
          // Content references start with #, slice that off to id of referenced element
          const referencedElement = def.findElement(this.contentReference.slice(1));
          newElements = referencedElement?.children().map(e => {
            const eClone = e.clone();
            eClone.id = eClone.id.replace(referencedElement.id, this.id);
            eClone.structDef = this.structDef;
            eClone.captureOriginal();
            return eClone;
          });
          if (newElements.length > 0) {
            // If we successfully unfolded, this element is no longer a content reference
            this.type = referencedElement.type;
            delete this.contentReference;
          }
        }
      } else if (this.sliceName) {
        // If the element is sliced, we first try to unfold from the SD itself
        const slicedElement = this.slicedElement();
        newElements = slicedElement.children().map(e => {
          const eClone = e.clone();
          eClone.id = eClone.id.replace(slicedElement.id, this.id);
          eClone.structDef = this.structDef;
          eClone.captureOriginal();
          return eClone;
        });
      }
      if (newElements.length === 0) {
        // If it has a profile, use that, otherwise use the code
        const type = this.type[0].profile?.[0] ?? this.type[0].code;
        const json = fisher.fishForFHIR(
          type,
          Type.Resource,
          Type.Type,
          Type.Profile,
          Type.Extension
        );
        if (json) {
          const def = StructureDefinition.fromJSON(json);
          if (def.inProgress) {
            logger.debug(
              `Warning: Circular relationship detected between ${this.structDef?.name} and ${def.name}. As a result, it is possible that the definition of ${this.structDef?.name} may be based on incomplete components of ${def.name}.`
            );
          }
          newElements = def.elements.slice(1).map(e => {
            const eClone = e.clone();
            eClone.id = eClone.id.replace(def.type, `${this.id}`);
            eClone.structDef = this.structDef;
            // Capture the original so that diffs only show what changed *after* unfolding
            eClone.captureOriginal();
            return eClone;
          });
        }
      }
      if (newElements.length > 0) {
        this.structDef.addElements(newElements);
        return newElements;
      }
    }
    return [];
  }

  /**
   * Unfolds a choice element's typed choices. The elements added to this element's
   * structure definition are those that are on the common ancestor of the available types.
   * All types have a common ancestor of Element, so if all else fails, Element's
   * elements are used.
   *
   * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
   */
  unfoldChoiceElementTypes(fisher: Fishable): ElementDefinition[] {
    const allTypes: string[] = [];
    this.type.forEach(t => {
      if (t.profile?.length) {
        allTypes.push(...t.profile);
      } else {
        allTypes.push(t.code);
      }
    });
    const allTypeAncestry = allTypes.map(t => this.getTypeLineage(t, fisher).map(l => l.url));
    const sharedAncestry = intersectionWith(...allTypeAncestry);
    if (sharedAncestry.length > 0) {
      const commonAncestor = StructureDefinition.fromJSON(fisher.fishForFHIR(sharedAncestry[0]));
      const newElements = commonAncestor.elements.slice(1).map(e => {
        const eClone = e.clone();
        eClone.id = eClone.id.replace(commonAncestor.type, `${this.id}`);
        eClone.structDef = this.structDef;
        // Capture the original so that diffs only show what changed *after* unfolding
        eClone.captureOriginal();
        return eClone;
      });
      this.structDef.addElements(newElements);
      return newElements;
    } else {
      // this should not be reachable if the rest of the software is working correctly
      logger.error(`Could not unfold choice element ${this.id}: choices have no common ancestor.`);
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
   * TODO: Handle re-slicing?
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
    delete slice.slicing;
    slice.id = `${this.id}:${name}`;

    // if a slice with the same id already exists, don't add it again
    const existingSlice = this.structDef.findElement(slice.id);
    if (existingSlice) {
      throw new DuplicateSliceError(this.structDef.name, this.id, name);
    }

    // On a new slice, delete slice.min and slice.max and then reset them
    // so that they are always captured in diff
    const originalMax = slice.max;
    delete slice.min;
    delete slice.max;

    // Capture the original so that the differential only contains changes from this point on.
    slice.captureOriginal();

    slice.sliceName = name;
    // When we slice, we do not inherit min cardinality, but rather make it 0
    // Allows multiple slices to be defined without violating cardinality of sliced element
    // Cardinality can be later narrowed by card constraints, which check validity of narrowing
    // According to https://chat.fhir.org/#narrow/stream/179239-tooling/topic/Slicing.201.2E.2E.3F.20element
    slice.min = 0;
    slice.max = originalMax;
    if (type) {
      slice.type = [type];
    }
    this.structDef.addElement(slice);
    return slice;
  }

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
        if (prop === 'type') {
          j.type = this.type.map(t => t.toJSON());
        } else {
          // @ts-ignore
          j[prop] = cloneDeep(this[prop]);
        }
      }
    }

    return j;
  }

  /**
   * Instantiates a new ElementDefinition from a FHIR-conformant JSON representation
   * @param {Object} json - the FHIR-conformant JSON representation of the ElementDefinition to instantiate
   * @param {captureOriginal} - indicate if original element should be captured for purposes of detecting
   *   differential.  Defaults to true.
   * @returns {ElementDefinition} the ElementDefinition representing the data passed in
   */
  static fromJSON(json: LooseElementDefJSON, captureOriginal = true): ElementDefinition {
    const ed = new ElementDefinition();
    for (let prop of PROPS) {
      if (prop.endsWith('[x]')) {
        const re = new RegExp(`^${prop.slice(0, -3)}[A-Z].*$`);
        prop = Object.keys(json).find(p => re.test(p));
      }
      // @ts-ignore
      if (prop && json[prop] !== undefined) {
        if (prop === 'type') {
          ed.type = json[prop].map(type => ElementDefinitionType.fromJSON(type));
        } else {
          // @ts-ignore
          ed[prop] = cloneDeep(json[prop]);
        }
      }
    }
    if (captureOriginal) {
      ed.captureOriginal();
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

export type ElementDefinitionTypeJSON = {
  code: string;
  profile?: string[];
  targetProfile?: string[];
  aggregation?: string[];
  versioning?: string;
  extension?: ElementDefinitionExtension[];
};

export type ElementDefinitionExtension = {
  url: string;
  // TODO: support all the value[x]
  valueUrl?: string;
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
export interface LooseElementDefJSON {
  id?: string;
  path?: string;
  slicing?: ElementDefinitionSlicing;
  type?: ElementDefinitionTypeJSON[];
  binding?: ElementDefinitionBinding;
  // [key: string]: any;
}

interface ElementTypeMatchInfo {
  code: string;
  metadata: Metadata;
}

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
