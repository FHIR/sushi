import { isEmpty, isEqual, cloneDeep, isBoolean } from 'lodash';
import { StructureDefinition } from './StructureDefinition';
import { CodeableConcept, Coding, Quantity, Ratio } from './dataTypes';
import { FshCode, FshRatio, FshQuantity } from '../fshtypes';
import { FixedValueType } from '../fshtypes/rules';
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
  WideningCardinalityError
} from '../errors';

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
   * @see {@link http://hl7.org/fhir/R4/conformance-rules.html#cardinality}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.min}
   * @see {@link http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.max}
   * @param {number} min - the minimum cardinality
   * @param {number|string} max - the maximum cardinality
   * @throws {InvalidCardinalityError} when min > max
   * @throws {WideningCardinalityError} when new cardinality is wider than existing cardinality
   */
  constrainCardinality(min: number, max: string): void {
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
   * @param {{ type: string; isReference?: boolean }[]} types - the set of constrained types,
   *   identified by id/type/url strings and an optional reference flag (defaults false)
   * @param {ResolveFn} resolve - a function that can resolve a type to a StructureDefinition instance
   * @param {string} [target] - a specific target type to constrain.  If supplied, will attempt to
   *   constrain only that type without affecting other types (in a choice or reference to a choice).
   * @throws {TypeNotFoundError} when a passed in type's definition cannot be found
   * @throws {InvalidTypeError} when a passed in type or the targetType doesn't match any existing
   *   types
   */
  constrainType(
    types: { type: string; isReference?: boolean }[],
    resolve: ResolveFn,
    target?: string
  ): void {
    // Establish the target types (if applicable)
    const targetType = this.getTargetType(target, resolve);
    const targetTypes: ElementDefinitionType[] = targetType ? [targetType] : this.type;

    // Setup a map to store how each existing element type maps to the input types
    const typeMatches: Map<string, ElementTypeMatchInfo[]> = new Map();
    targetTypes.forEach(t => typeMatches.set(t.code, []));

    // Loop through the input types and associate them to the element types in the map
    for (const type of types) {
      const typeMatch = this.findTypeMatch(type, targetTypes, resolve);
      typeMatches.get(typeMatch.code).push(typeMatch);
    }

    // Loop through the existing element types building the new set of element types w/ constraints
    const newTypes: ElementDefinitionType[] = [];
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
        const typeString = match.code === 'Reference' ? 'Reference' : match.structDef.type;
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

    // Finally, reset this element's types to the new types
    this.type = newTypes;
  }

  /**
   * Given a string representing a type or profile, will return this element's matching type, if
   * found -- with all other profiles or targetProfiles (e.g. references) removed from the type.
   * @param {string} target - the target to find a matching type for
   * @param {ResolveFn} resolve - a function that can resolve a type to a StructureDefinition instance
   * @returns {ElementDefinitionType} the element's type that matches the target
   * @throws {TypeNotFoundError} when the target's definition cannot be found
   * @throws {InvalidTypeError} when the target doesn't match any existing types
   */
  private getTargetType(target: string, resolve: ResolveFn): ElementDefinitionType {
    let targetType: ElementDefinitionType;
    if (target) {
      const targetSD = resolve(target);
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
   * @param {ResolveFn} resolve - a function that can resolve a type to a StructureDefinition instance
   * @param {string} [target] - a specific target type to constrain.  If supplied, will attempt to
   *   constrain only that type without affecting other types (in a choice or reference to a choice).
   * @returns {ElementTypeMatchInfo} the information about the match
   * @throws {TypeNotFoundError} when the type's definition cannot be found
   * @throws {InvalidTypeError} when the type doesn't match any of the targetTypes
   */
  private findTypeMatch(
    type: { type: string; isReference?: boolean },
    targetTypes: ElementDefinitionType[],
    resolve: ResolveFn
  ): ElementTypeMatchInfo {
    let matchedType: ElementDefinitionType;

    // Get the lineage (type hierarchy) so we can walk up it when attempting to match
    const lineage = this.getTypeLineage(type.type, resolve);
    if (isEmpty(lineage)) {
      throw new TypeNotFoundError(type.type);
    }

    // Walk up the lineage, one StructureDefinition at a time.  We can potentially match on the
    // type itself or any of its parents.  For example, a BloodPressure profile could match on
    // an Observation already having a BP profile, an Observation type w/ no profiles, a
    // DomainResource type w/ no profiles, or a Resource type w/ no profiles.
    for (const sd of lineage) {
      if (type.isReference) {
        // References always have a code 'Reference' w/ the referenced type's defining URL set as
        // one of the targetProfiles
        matchedType = targetTypes.find(
          t2 => t2.code === 'Reference' && t2.targetProfile?.includes(sd.url)
        );
      } else {
        // Look for exact match on the code (w/ no profile) or a match on the same base type with
        // a matching profile
        matchedType = targetTypes.find(t2 => {
          const matchesUnprofiledResource = t2.code === sd.id && isEmpty(t2.profile);
          const matchesProfile = t2.code === sd.type && t2.profile?.includes(sd.url);
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
      structDef: lineage[0],
      code: matchedType.code
    };
  }

  /**
   * Gets the full lineage of the type, w/ the item at index 0 being the type's own StructureDefinition,
   * the item at index 1 being its parent's, 2 being its grandparent's, etc.  If a definition can't be
   * found, it stops and returns as much lineage as its found thus far.
   * @param {string} type - the type to get the lineage for
   * @param {ResolveFn} resolve - a function that can resolve a type to a StructureDefinition instance
   * @returns {StructureDefinition[]} representing the lineage of the type
   */
  private getTypeLineage(type: string, resolve: ResolveFn): StructureDefinition[] {
    const results: StructureDefinition[] = [];

    // Start with the current type and walk up the base definitions.
    // Stop when we can't find a definition or the base definition is blank.
    let currentType = type;
    while (currentType != null) {
      const result = resolve(currentType);
      if (result) {
        results.push(result);
      }
      currentType = result?.baseDefinition;
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
      if (match.structDef.id === newType.code) {
        continue;
      } else if (match.code === 'Reference') {
        matchedTargetProfiles.push(match.structDef.url);
      } else {
        matchedProfiles.push(match.structDef.url);
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
   * @param mustSupport - whether to make this element a Must Support element
   * @param summary - whether to include this element when querying for a summary
   * @param modifier - whether this element acts as a modifier on the resource
   * @throws {DisableFlagError} when attempting to disable a flag that cannot be disabled
   */
  applyFlags(mustSupport: boolean, summary: boolean, modifier: boolean): void {
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
    if (isBoolean(mustSupport)) {
      this.mustSupport = mustSupport;
    }
    if (isBoolean(summary)) {
      this.isSummary = summary;
    }
    if (isBoolean(modifier)) {
      this.isModifier = modifier;
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

  fixValue(value: FixedValueType): void {
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
    }
  }

  private checkIfFixable(
    value: boolean | string | number,
    currentElementValue: boolean | string | number,
    elementType: string
  ): boolean {
    if (currentElementValue != null && currentElementValue !== value) {
      throw new ValueAlreadyFixedError(value, elementType, currentElementValue);
    }
    return true;
  }

  /**
   * Fixes a boolean to this element.
   * @see {@link fixValue}
   * @param {boolean} value - the boolean value to fix
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the code is already fixed to a different code
   * @throws {TypeNotFoundError} when the type of the ElementDefinition is not boolean
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
   * @param {boolean} value - the number value to fix
   * @throws {NoSingleTypeError} when the ElementDefinition does not have a single type
   * @throws {ValueAlreadyFixedError} when the code is already fixed to a different code
   * @throws {TypeNotFoundError} when the type of the ElementDefinition is not integer or decimal
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
    } else {
      throw new MismatchedTypeError('string', value, type);
    }
  }

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
        if (!value.equals(foundFshQuantity)) {
          throw new ValueAlreadyFixedError(
            value.toString(),
            'Quantity',
            foundFshQuantity.toString()
          );
        }
        return;
      }
      this.fixFshCode(value.unit);
      this.patternQuantity.value = value.value;
    } else {
      throw new MismatchedTypeError('Quantity', value.toString(), type);
    }
  }

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
        if (!value.equals(foundRatio)) {
          throw new ValueAlreadyFixedError(value.toString(), 'Ratio', foundRatio.toString());
        }
      }
      this.patternRatio = {};
      this.patternRatio.numerator = {};
      this.patternRatio.denominator = {};
      this.patternRatio.numerator.value = value.numerator.value;
      this.patternRatio.denominator.value = value.denominator.value;
      if (value.numerator.unit) {
        this.patternRatio.numerator.code = value.numerator.unit.code;
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
   */
  fixFshCode(code: FshCode): void {
    // This is the element to fix it to
    if (!this.hasSingleType()) {
      throw new NoSingleTypeError('Code');
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToCoding(code: FshCode): void {
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToQuantityUnitCode(code: FshCode): void {
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToCode(code: FshCode): void {
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToString(code: FshCode): void {
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
   * @param {FshCode} code - the code to fix
   * @throws {CodeAlreadyFixedError} when the code is already fixed to a different code
   */
  private fixFshCodeToUri(code: FshCode): void {
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
    if (
      this.type.length === 1 &&
      (this.type[0].profile == null || this.type[0].profile.length <= 1)
    ) {
      // If it has a profile, use that, otherwise use the code
      const type = this.type[0].profile?.[0] ?? this.type[0].code;
      const def = resolve(type);
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
    delete slice.slicing;
    slice.id = `${this.id}:${name}`;
    slice.sliceName = name;
    // When a choice is sliced, we do not inherit min cardinality, but rather make it 0
    // According to https://chat.fhir.org/#narrow/stream/179239-tooling/topic/Slicing.201.2E.2E.3F.20element
    if (this.id.endsWith('[x]')) {
      slice.min = 0;
    }
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

export type ResolveFn = (type: string) => StructureDefinition | undefined;

/**
 * A barebones and lenient definition of ElementDefinition JSON
 */
interface LooseElementDefJSON {
  type?: ElementDefinitionType[];
  binding?: ElementDefinitionBinding;
  // [key: string]: any;
}

interface ElementTypeMatchInfo {
  code: string;
  structDef: StructureDefinition;
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
