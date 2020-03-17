import { isEmpty, isEqual, cloneDeep, isBoolean } from 'lodash';
import sax = require('sax');
import { minify } from 'html-minifier';
import { isUri } from 'valid-url';
import { StructureDefinition } from './StructureDefinition';
import { CodeableConcept, Coding, Quantity, Ratio, Reference } from './dataTypes';
import { FshCode, FshRatio, FshQuantity, FshReference, Invariant } from '../fshtypes';
import { FixedValueType, OnlyRule } from '../fshtypes/rules';
import {
  BindingStrengthError,
  CodedTypeNotFoundError,
  CodeAlreadyFixedError,
  DisableFlagError,
  ValueAlreadyFixedError,
  NoSingleTypeError,
  MismatchedTypeError,
  InvalidCardinalityError,
  InvalidTypeError,
  SlicingDefinitionError,
  SlicingNotDefinedError,
  TypeNotFoundError,
  WideningCardinalityError,
  InvalidSumOfSliceMinsError,
  InvalidMaxOfSliceError,
  InvalidUriError,
  InvalidUnitsError,
  ExistingStandardsStatusError,
  MultipleStandardsStatusError
} from '../errors';
import { setPropertyOnDefinitionInstance } from './common';
import { Fishable, Type, Metadata, logger } from '../utils';
import { InstanceDefinition } from './InstanceDefinition';

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
  // We'll define the ones we are using, but leave the others as unspecified properties.  For now.
  fixedCode: string;
  fixedString: string;
  fixedUri: string;
  fixedUrl: string;
  fixedCanonical: string;
  fixedInstant: string;
  fixedBase64Binary: string;
  fixedDate: string;
  fixedDateTime: string;
  fixedTime: string;
  fixedOid: string;
  fixedId: string;
  fixedMarkdown: string;
  fixedUuid: string;
  fixedXhtml: string;
  fixedBoolean: boolean;
  fixedDecimal: number;
  fixedInteger: number;
  fixedUnsignedInt: number;
  fixedPositiveInt: number;
  // pattern[x] can be literally almost any field name (e.g., patternCode, patternFoo, etc.).
  // We'll define the ones we are using, but leave the others as unspecified properties.  For now.
  patternCodeableConcept: CodeableConcept;
  patternCoding: Coding;
  patternQuantity: Quantity;
  patternRatio: Ratio;
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
  mapping: ElementDefinitionMapping;
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
    this.constraint.push(constraint);
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
      e => e.id !== this.id && e.path === this.path && e.id.startsWith(this.id)
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
    if (this.max != null && this.max !== '*' && maxInt > parseInt(this.max)) {
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

      // In the case of an element type whose code is a supertype (e.g., 'Resource'), we need to
      // break that up into a new set of element types corresponding to the subtypes.  For example,
      // if a 'Resource' type is constrained to 'Condition' and 'Procedure', then in the resulting
      // StructureDefinition, there should be element types with codes 'Condition' and 'Procedure',
      // and no element type with the code 'Resource` any longer.  So... we create a special
      // map to store the current subtypes (or if not applicable, just store the original type).
      const currentTypeMatches: Map<string, ElementTypeMatchInfo[]> = new Map();
      for (const match of matches) {
        // If the original element type is a Reference, keep it a reference, otherwise take on the
        // input type's official type code (as represented in its StructureDefinition.type).
        const typeString = match.code === 'Reference' ? 'Reference' : match.metadata.sdType;
        if (!currentTypeMatches.has(typeString)) {
          currentTypeMatches.set(typeString, []);
        }
        currentTypeMatches.get(typeString).push(match);
      }

      // Iterate the elements of the current type matches, creating the new type (based on the
      // existing type) but with the constraints applied to it.
      for (const [typeCode, currentMatches] of currentTypeMatches) {
        const newType = cloneDeep(type);
        newType.code = typeCode;
        this.applyProfiles(newType, targetType, currentMatches);
        newTypes.push(newType);
      }
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
      } else if (match.code === 'Reference') {
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

  /**
   * Sets flags on this element as specified in a profile or extension.
   * Don't change a flag when the incoming argument is undefined.
   * @todo Add more complete enforcement of rules regarding when these flags can change.
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
   * @throws {DisableFlagError} when attempting to disable a flag that cannot be disabled
   */
  applyFlags(
    mustSupport: boolean,
    summary: boolean,
    modifier: boolean,
    trialUse: boolean,
    normative: boolean,
    draft: boolean
  ): void {
    const disabledFlags = [];
    if (this.mustSupport && mustSupport === false) {
      disabledFlags.push('Must Support');
    }
    if (this.isModifier && modifier === false) {
      disabledFlags.push('Is Modifier');
    }
    if (disabledFlags.length) {
      throw new DisableFlagError(disabledFlags);
    }
    let newStatusExtension: any = null;
    const currentStatusExtension = this.extension?.find(
      extension =>
        extension.url ==
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status'
    );
    if (currentStatusExtension && (trialUse || normative || draft)) {
      throw new ExistingStandardsStatusError(this.id);
    }
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
    if (isBoolean(mustSupport)) {
      this.mustSupport = mustSupport;
    }
    if (isBoolean(summary)) {
      this.isSummary = summary;
    }
    if (isBoolean(modifier)) {
      this.isModifier = modifier;
    }
    if (newStatusExtension) {
      if (this.extension) {
        this.extension.push(newStatusExtension);
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
   * @param {boolean} units - True if the units keyword is used on this rule
   * @throws {BindingStrengthError} when the binding can't be applied because it is looser than the existing binding
   * @throws {CodedTypeNotFoundError} - when the binding can't be applied because the element is the wrong type
   * @throws {InvalidUriError} when the value set uri is not valid
   * @throws {InvalidUnitsError} when the "units" keyword is used on a non-Quantity type
   */
  bindToVS(vsURI: string, strength: ElementDefinitionBindingStrength, units = false): void {
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

    // Check if this is a valid strength (if the binding.strength already exists)
    if (this.binding && this.binding.strength) {
      const strengths = ['example', 'preferred', 'extensible', 'required'];
      if (strengths.indexOf(strength) < strengths.indexOf(this.binding.strength)) {
        throw new BindingStrengthError(this.binding.strength, strength);
      }
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

    // Units error should not stop binding, but must still be logged
    if (units && !validTypes.find(t => t.code === 'Quantity')) {
      throw new InvalidUnitsError(this.id);
    }
  }

  /**
   * Fixes a value to an ElementDefinition
   * @param {FixedValueType} value - The value to fix
   * @param {boolean} units - True if the units keyword is used on this rule
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {MismatchedTypeError} when the value does not match the type of the ElementDefinition
   * @throws {InvalidUnitsError} when the "units" keyword is used on a non-Quantity type
   */
  fixValue(value: FixedValueType, units = false): void {
    if (typeof value === 'boolean') {
      this.fixBoolean(value);
    } else if (typeof value === 'number') {
      this.fixNumber(value);
    } else if (typeof value === 'string') {
      this.fixString(value);
    } else if (value instanceof FshCode) {
      this.fixFshCode(value);
    } else if (value instanceof FshQuantity) {
      this.fixFshQuantity(value);
    } else if (value instanceof FshRatio) {
      this.fixFshRatio(value);
    } else if (value instanceof FshReference) {
      this.fixFshReference(value);
    }
    // Units error should not stop fixing value, but must still be logged
    const types = this.findTypesByCode('Quantity');
    if (units && !types.find(t => t.code === 'Quantity')) {
      throw new InvalidUnitsError(this.id);
    }
  }

  /**
   * Checks if a primitive value can be fixed
   * @param {boolean | string | number} value - The value to fix
   * @param {boolean | string | number} currentElementValue - The current value of the element
   * @param {string} elementType - The type of the element as a string
   * @throws {ValueAlreadyFixedError} when the currentElementValue exists and is different than the new value
   * @returns {true | undefined} true if no value exists or the new value matches the old
   */
  private checkIfFixable(
    value: boolean | string | number,
    currentElementValue: boolean | string | number,
    elementType: string
  ): true | undefined {
    if (currentElementValue == null) {
      currentElementValue = this.fixedByAnyParent();
    }
    if (currentElementValue != null && currentElementValue !== value) {
      throw new ValueAlreadyFixedError(value, elementType, currentElementValue);
    }
    return true;
  }

  /**
   * Checks if an element is fixed by a pattern[x] on its direct parent
   * @returns {any} the value the element is fixed to by its parent, undefined if value is not fixed
   */
  fixedByDirectParent(): any {
    const parent = this.parent();
    const patternKey = parent ? Object.keys(parent).find(k => k.startsWith('pattern')) : null;
    if (patternKey) {
      const patternValue: any = parent[patternKey as keyof ElementDefinition];
      return patternValue[this.path.replace(`${parent.path}.`, '')];
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
   * Fixes a boolean to this element.
   * @see {@link fixValue}
   * @see {@link https://www.hl7.org/fhir/datatypes.html#primitive}
   * @param {boolean} value - the boolean value to fix
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {MismatchedTypeError} when the type of the ElementDefinition is not boolean
   */
  fixBoolean(value: boolean): void {
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError(typeof value);
    }
    const type = this.type[0].code;
    if (type === 'boolean' && this.checkIfFixable(value, this.fixedBoolean, type)) {
      this.fixedBoolean = value;
    } else {
      throw new MismatchedTypeError('boolean', value, type);
    }
  }

  /**
   * Fixes a number to this element.
   * @see {@link fixValue}
   * @see {@link https://www.hl7.org/fhir/datatypes.html#primitive}
   * @param {number} value - the number value to fix
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {MismatchedTypeError} when the value does not match the type of the ElementDefinition
   */
  fixNumber(value: number): void {
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError(typeof value);
    }
    const type = this.type[0].code;
    if (type === 'decimal' && this.checkIfFixable(value, this.fixedDecimal, type)) {
      this.fixedDecimal = value;
    } else if (
      type === 'integer' &&
      Number.isInteger(value) &&
      this.checkIfFixable(value, this.fixedInteger, type)
    ) {
      this.fixedInteger = value;
    } else if (
      type === 'unsignedInt' &&
      Number.isInteger(value) &&
      value >= 0 &&
      this.checkIfFixable(value, this.fixedUnsignedInt, type)
    ) {
      this.fixedUnsignedInt = value;
    } else if (
      type === 'positiveInt' &&
      Number.isInteger(value) &&
      value > 0 &&
      this.checkIfFixable(value, this.fixedPositiveInt, type)
    ) {
      this.fixedPositiveInt = value;
    } else {
      throw new MismatchedTypeError('number', value, type);
    }
  }

  /**
   * Fixes a string to this element.
   * @see {@link fixValue}
   * @see {@link https://www.hl7.org/fhir/datatypes.html#primitive}
   * @param {string} value - the string value to fix
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {TypeNotFoundError} when the value does not match the type of the ElementDefinition
   */
  fixString(value: string): void {
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError(typeof value);
    }
    const type = this.type[0].code;
    if (type === 'string' && this.checkIfFixable(value, this.fixedString, type)) {
      this.fixedString = value;
    } else if (
      type === 'uri' &&
      /^\S*$/.test(value) &&
      this.checkIfFixable(value, this.fixedUri, type)
    ) {
      this.fixedUri = value;
    } else if (
      type === 'url' &&
      /^\S*$/.test(value) &&
      this.checkIfFixable(value, this.fixedUrl, type)
    ) {
      this.fixedUrl = value;
    } else if (
      type === 'canonical' &&
      /^\S*$/.test(value) &&
      this.checkIfFixable(value, this.fixedCanonical, type)
    ) {
      this.fixedCanonical = value;
    } else if (
      type === 'base64Binary' &&
      /^(\s*([0-9a-zA-Z\+\=]){4}\s*)+$/.test(value) &&
      this.checkIfFixable(value, this.fixedBase64Binary, type)
    ) {
      this.fixedBase64Binary = value;
    } else if (
      type === 'instant' &&
      /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))$/.test(
        value
      ) &&
      this.checkIfFixable(value, this.fixedInstant, type)
    ) {
      this.fixedInstant = value;
    } else if (
      type === 'date' &&
      /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)?$/.test(
        value
      ) &&
      this.checkIfFixable(value, this.fixedDate, type)
    ) {
      this.fixedDate = value;
    } else if (
      type === 'dateTime' &&
      /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$/.test(
        value
      ) &&
      this.checkIfFixable(value, this.fixedDateTime, type)
    ) {
      this.fixedDateTime = value;
    } else if (
      type === 'time' &&
      /^([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?$/.test(value) &&
      this.checkIfFixable(value, this.fixedTime, type)
    ) {
      this.fixedTime = value;
    } else if (
      type === 'oid' &&
      /^urn:oid:[0-2](\.(0|[1-9][0-9]*))+$/.test(value) &&
      this.checkIfFixable(value, this.fixedOid, type)
    ) {
      this.fixedOid = value;
    } else if (
      type === 'id' &&
      /^[A-Za-z0-9\-\.]{1,64}$/.test(value) &&
      this.checkIfFixable(value, this.fixedId, type)
    ) {
      this.fixedId = value;
    } else if (
      type === 'markdown' &&
      /^\s*(\S|\s)*$/.test(value) &&
      this.checkIfFixable(value, this.fixedMarkdown, type)
    ) {
      this.fixedMarkdown = value;
    } else if (type === 'uuid' && this.checkIfFixable(value, this.fixedUuid, type)) {
      this.fixedUuid = value;
    } else if (
      type == 'xhtml' &&
      this.checkXhtml(value) &&
      this.checkIfFixable(value, this.fixedXhtml, type)
    ) {
      this.fixedXhtml = minify(value, { collapseWhitespace: true });
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
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {MismatchedTypeError} when the ElementDefinition is not of type Resource
   * @returns {InstanceDefinition} the input value when it can be fixed
   */
  checkFixResource(value: InstanceDefinition): InstanceDefinition {
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError('Resource');
    }
    const type = this.type[0].code;
    if (type === 'Resource') {
      return value;
    } else {
      throw new MismatchedTypeError('Resource', value.id, type);
    }
  }

  /**
   * Fixes a Quantity to this element.
   * @see {@link fixValue}
   * @param {FshQuantity} value - the Quantity value to fix
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {TypeNotFoundError} when the value does not match the type of the ElementDefinition
   */
  fixFshQuantity(value: FshQuantity): void {
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError('Quantity');
    }
    const type = this.type[0].code;
    if (type === 'Quantity') {
      if (this.patternQuantity) {
        const found = this.patternQuantity;
        const foundFshQuantity = new FshQuantity(
          found.value,
          new FshCode(found.code, found.system)
        );
        // Check if the new quantity matches the current
        if (!value.equals(foundFshQuantity)) {
          throw new ValueAlreadyFixedError(
            value.toString(),
            'Quantity',
            foundFshQuantity.toString()
          );
        }
        // if they do match, there is nothing to do, so return
        return;
      }
      if (value.unit) {
        // A FshCode has special support allowing it to be fixed to a Quantity
        this.fixFshCode(value.unit);
      } else {
        this.patternQuantity = {};
      }
      this.patternQuantity.value = value.value;
    } else {
      throw new MismatchedTypeError('Quantity', value.toString(), type);
    }
  }

  /**
   * Fixes a Ratio to this element.
   * @see {@link fixValue}
   * @param {FshRatio} value - the Ratio value to fix
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {TypeNotFoundError} when the value does not match the type of the ElementDefinition
   */
  fixFshRatio(value: FshRatio): void {
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError('Ratio');
    }
    const type = this.type[0].code;
    if (type === 'Ratio') {
      if (this.patternRatio) {
        const found = this.patternRatio;
        const foundNumerator = new FshQuantity(
          found.numerator?.value,
          new FshCode(found.numerator?.code, found.numerator?.system)
        );
        const foundDenominator = new FshQuantity(
          found.denominator?.value,
          new FshCode(found.denominator?.code, found.denominator?.system)
        );
        const foundRatio = new FshRatio(foundNumerator, foundDenominator);
        // Check if the new ratio matches the old
        if (!value.equals(foundRatio)) {
          throw new ValueAlreadyFixedError(value.toString(), 'Ratio', foundRatio.toString());
        }
        // If they do match, there is nothing more to do, so return
        return;
      }
      // There is no existing patternRatio, so create it
      this.patternRatio = {
        numerator: { value: value.numerator.value },
        denominator: { value: value.denominator.value }
      };
      // Unit is optional, so we need to check it
      if (value.numerator.unit) {
        this.patternRatio.numerator.code = value.numerator.unit.code;
        // System is optional on unit, so we need to check it
        if (value.numerator.unit.system) {
          this.patternRatio.numerator.system = value.numerator.unit.system;
        }
      }
      if (value.denominator.unit) {
        this.patternRatio.denominator.code = value.denominator.unit.code;
        if (value.denominator.unit.system) {
          this.patternRatio.denominator.system = value.denominator.unit.system;
        }
      }
    } else {
      throw new MismatchedTypeError('Ratio', value.toString(), type);
    }
  }

  /**
   * Fixes a Reference to this element.
   * @see {@link fixValue}
   * @param {FshReference} value - the Reference value to fix
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the value is already fixed to a different value
   * @throws {TypeNotFoundError} when the value does not match the type of the ElementDefinition
   */
  fixFshReference(value: FshReference): void {
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError('Reference');
    }
    const type = this.type[0].code;
    if (type === 'Reference') {
      if (this.patternReference) {
        const found = this.patternReference;
        const foundFshReference = new FshReference(found.reference, found.display);
        // Check if the new quantity matches the current
        if (!value.equals(foundFshReference, true)) {
          throw new ValueAlreadyFixedError(
            value.toString(),
            'Reference',
            foundFshReference.toString()
          );
        }
        // The original display was not set, allow it to be set if references are otherwise equal
        if (foundFshReference.display == null) {
          this.patternReference.display = value.display;
        }
        // If they do match, there is nothing to do, so return
        return;
      }
      this.patternReference = { reference: value.reference };
      if (value.display) this.patternReference.display = value.display;
    } else {
      throw new MismatchedTypeError('Reference', value.toString(), type);
    }
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
   * @param {FshCode} code - the code to fix
   * @throws {CodedTypeNotFoundError} when there is no coded type on this element
   * @throws {CodeAlreadyFixedError} where the code is already fixed to a different code
   * @throws {InvalidUriError} when the system being fixed is not a valid uri
   */
  fixFshCode(code: FshCode): void {
    // This is the element to fix it to
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError('Code');
    }
    if (code.system && !isUri(code.system.split('|')[0])) {
      throw new InvalidUriError(code.system);
    }
    const type = this.type[0].code;
    if (type === 'CodeableConcept') {
      this.fixFshCodeToCodeableConcept(code);
    } else if (type === 'Coding') {
      this.fixFshCodeToCoding(code);
    } else if (type === 'Quantity') {
      this.fixFshCodeToQuantityUnitCode(code);
    } else if (type === 'code') {
      this.fixFshCodeToCode(code);
    } else if (type === 'string') {
      this.fixFshCodeToString(code);
    } else if (type === 'uri') {
      this.fixFshCodeToUri(code);
    } else {
      throw new CodedTypeNotFoundError([type]);
    }
  }

  /**
   * Fixes a code to this element using patternCodeableConcept.
   * If a different code is already fixed, it will throw.
   * TODO: Implement more robust approach to detecting existing fixed codes.
   * @see {@link fixFshCode}
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToCodeableConcept(code: FshCode): void {
    // Check if this is already fixed to something else
    const alreadyFixedValue = this.patternCodeableConcept ?? this.fixedByAnyParent();
    if (alreadyFixedValue) {
      const fixedToSame =
        alreadyFixedValue.coding &&
        alreadyFixedValue.coding.some((c: any) => {
          return c.code == code.code && c.system == code.system;
        });
      if (!fixedToSame) {
        const found = alreadyFixedValue.coding[0];
        throw new CodeAlreadyFixedError(new FshCode(found.code, found.system), code);
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    const coding: Coding = {};
    if (code.code) {
      coding.code = code.code;
    }
    if (code.system) {
      if (code.system.indexOf('|') > -1) {
        [coding.system, coding.version] = code.system.split('|', 2);
      } else {
        coding.system = code.system;
      }
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToCoding(code: FshCode): void {
    // Check if this is already fixed to something else
    const alreadyFixedValue = this.patternCoding ?? this.fixedByAnyParent();
    if (alreadyFixedValue) {
      if (alreadyFixedValue.code != code.code || alreadyFixedValue.system != code.system) {
        throw new CodeAlreadyFixedError(
          new FshCode(alreadyFixedValue.code, alreadyFixedValue.system),
          code
        );
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    this.patternCoding = {};
    if (code.code) {
      this.patternCoding.code = code.code;
    }
    if (code.system) {
      if (code.system.indexOf('|') > -1) {
        [this.patternCoding.system, this.patternCoding.version] = code.system.split('|', 2);
      } else {
        this.patternCoding.system = code.system;
      }
    }
  }

  /**
   * Fixes a code to this element using patternQuantity (where the code represents units).
   * If a different code is already fixed, it will throw.
   * TODO: Implement more robust approach to detecting existing fixed codes.
   * @see {@link fixFshCode}
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToQuantityUnitCode(code: FshCode): void {
    // Check if this is already fixed to something else
    const alreadyFixedValue = this.patternQuantity ?? this.fixedByAnyParent();
    if (alreadyFixedValue) {
      if (alreadyFixedValue.code != code.code || alreadyFixedValue.system != code.system) {
        throw new CodeAlreadyFixedError(
          new FshCode(alreadyFixedValue.code, alreadyFixedValue.system),
          code
        );
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToCode(code: FshCode): void {
    // Check if this is already fixed to something else
    const alreadyFixedValue = this.fixedCode ?? this.fixedByAnyParent();
    if (alreadyFixedValue) {
      if (alreadyFixedValue != code.code) {
        throw new CodeAlreadyFixedError(new FshCode(alreadyFixedValue), code);
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToString(code: FshCode): void {
    // Check if this is already fixed to something else
    const alreadyFixedValue = this.fixedString ?? this.fixedByAnyParent();
    if (alreadyFixedValue) {
      if (alreadyFixedValue != code.code) {
        throw new CodeAlreadyFixedError(new FshCode(alreadyFixedValue), code);
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToUri(code: FshCode): void {
    // Check if this is already fixed to something else
    const alreadyFixedValue = this.fixedUri ?? this.fixedByAnyParent();
    if (alreadyFixedValue) {
      if (alreadyFixedValue != code.code) {
        throw new CodeAlreadyFixedError(new FshCode(alreadyFixedValue), code);
      }
      // It's already fixed, so there is nothing to do
      return;
    }

    this.fixedUri = code.code;
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

    // Capture the original so that the differential only contains changes from this point on.
    slice.captureOriginal();

    slice.sliceName = name;
    // When we slice, we do not inherit min cardinality, but rather make it 0
    // Allows multiple slices to be defined without violating cardinality of sliced element
    // Cardinality can be later narrowed by card constraints, which check validity of narrowing
    // According to https://chat.fhir.org/#narrow/stream/179239-tooling/topic/Slicing.201.2E.2E.3F.20element
    slice.min = 0;
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
interface LooseElementDefJSON {
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
