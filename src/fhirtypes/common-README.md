# Details on `common.ts` functions

## Explanation of `setImpliedPropertiesOnInstance`

Arguments to `setImpliedPropertiesOnInstance`:

- `assignedResourcePaths` is a list of paths from our rules where the value being assigned is an instance. This is useful to know because if an instance is being assigned at a path, this function does _not_ perform any checks for implied properties on the children of that path.
- `knownSlices` is a map where the keys are element paths and the values are the number of times an element with that path will appear. In manual slice ordering mode, this map is created by `createUsefulSlices`. Otherwise, this map is created by `determineKnownSlices`. For example, a key of `component[Foo]` with a value of `2` means that the instance will have two `Foo` slices on its `component` element.
- `manualSliceOrdering` is the boolean from the configuration that controls how slices are ordered.

The approach in `setImpliedPropertiesOnInstance` is to iterate through the elements on a StructureDefinition breadth-first, checking for assigned values on those elements. However, it is not enough to just have the ElementDefinition. In order to maintain enough context to assign values correctly, some additional values are needed. This is the motivation for the existence of the `ElementTrace` type. It is named because it keeps track of all of the information needed to trace the path that started at the StructureDefinition's root and ends at a given value within the Instance. The fields on this type are:

- def: ElementDefinition. The ElementDefinition class contains all of the information that the StructureDefinition maintains about this element.
- history: string[]. This array contains each step of the path through the Instance that has led to the current value within the instance. When I say "actual path", I mean that if you were to join it together with "." characters, you'd get a valid FSH path. It includes slice names and numeric indices. The ElementTrace for top-level elements will have an empty history. Keeping track of the specific history is necessary to ensure correct behavior in cases where there are values assigned on children of array elements.
- ghost: boolean. An element is considered a "ghost" if it does not appear on the Instance being exported, but its assigned values (or assigned values on its children) may need to appear. This arises in cases where a sliced element is required, but its cardinality is completely fulfilled by slices.
- requirementRoot: string. The id of the element (with the StructureDefinition name omitted) that, if present, means that this element must also be present. This helps to answer questions about whether a given element will actually appear on the exported instance. As examples:
  - A top-level required element has a requirementRoot of "", since it is always required.
  - An optional element has a requirementRoot of itself. It will only appear on the instance if it is present in a rule path.
  - A required element with an unbroken chain of required parents up to the top level has a requirementRoot of "", since it is always required.
  - A required element that has an optional element somewhere in its ancestry has a requirementRoot of the optional ancestor nearest to it. For example, if "foo" is required, "foo.bar" is optional, and "foo.bar.baz" is required, then the requirementRoot for "foo.bar.baz" will be "foo.bar". If "foo" is instead optional, the requirementRoot will still be "foo.bar".

The initial list of ElementTrace objects is built using the StructureDefinition's top-level elements. The steps for processing an ElementTrace are as follows.

First, some preliminary calculations and storage operations.

- Remove the first element of the ElementTrace list. This is the current ElementTrace for further operations.
- Determine the effective minimum for this element.
  - A map of known effective minimums is maintained while exporting the Instance. If the element is in the map, use the value in the map.
  - If the element is not in the map, calculate its effective minimum along with the effective minimums of all of its slices. Store those minimums in the map.
- Find the first rule on the Instance that mentions this element, if such a rule exists.
- Check if this element has an assigned value.
  - If the ElementDefinition in the current ElementTrace has an assigned value, that value is used. Furthermore, for each connected element, store this assigned value for later use. Connected elements are found by `ElementDefinition.findConnectedElements()`.
  - If the ElementDefinition does not have an assigned value, check the assigned value storage for a previously stored value.

Then, based on those calculations, determine what values to assign what new ElementTrace objects to create and add to the list for processing.

- If the effective minimum is greater than 0,
  - If there is an assigned value, and the current ElementTrace is not a ghost, add this ElementTrace's path and value to the map of values to set (sdRuleMap) for each time it will appear. For example, if the effective minimum is two, there will be two entries added to sdRuleMap.
  - For each of this ElementTrace's definition's children, create a new ElementTrace for each time this element appears on the instance. For example, if the ElementDefinition has four children, and effectiveMin is two, then eight new ElementTrace objects will be created. Add these ElementTrace objects to the list for processing.
- If the effective minimum is 0, but there is a matching rule OR the minimum on the ElementDefinition is greater than 0,
  - If there was a matching rule, an assigned value, and the current ElementTrace is not a ghost, add an entry to sdRuleMap.
  - If the matching rule is not a rule that assigns a resource, unfold the definition on the ElementTrace so that it will have child elements available.
  - For each of this ElementTrace's definition's children, create a new ElementTrace. If there was no matching rule, mark these ElementTrace objects as being ghosts.
  
Once the list of ElementTrace objects is empty, the function is done checking element definitions. The paths that will be used for assignment have a sort applied for safety to ensure that the deepest elements are set first. This sort usually has no effect, but it can help in cases where complex types are assigned. If manual slice ordering is not enabled, one more sort takes place in order to produce the path ordering that would be created by the old implementation of `setImpliedPropertiesOnInstance`. After that, the paths are used in order to set properties on the instance.
