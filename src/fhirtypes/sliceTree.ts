import { sumBy } from 'lodash';
import { ElementDefinition } from './ElementDefinition';

/**
 * Some notable information about Slice Trees:
 *
 * When a sliced element has a minimum greater than 0, it is possible that some or all
 * of those required elements exist in the form of reslices. In this case, we can consider the
 * "effective minimum" of the sliced element to be lower than its actual minimum, and use that
 * effective minimum to decide how many elements need to be created in order to fulfill the
 * cardinality constraint. To help with this, build a tree that organizes the slices (or reslices)
 * of the current element. Each node in the tree corresponds to an ElementDefinition, and the children
 * of a node are the slices of that ElementDefinition. This can continue downwards for reslices.
 * For example, a tree might look like this:
 * - component
 *   - component[Foo]
 *     - component[Foo][ReFoo]
 *   - component[Bar]
 * In this example, component[Foo] may have its minimum completely or partially satisfied by the
 * existence of component[Foo][ReFoo] elements. And, component may have its minimum completely or
 * partially satisfied by the existence of a combination of component[Foo], component[Foo][ReFoo],
 * and component[Bar] elements.
 */

type SliceNode = {
  element: ElementDefinition;
  children: SliceNode[];
  count?: number;
};

export function buildSliceTree(parent: ElementDefinition): SliceNode {
  const root: SliceNode = {
    element: parent,
    children: []
  };
  const slicesToUse = parent.getSlices();
  slicesToUse.forEach(slice => {
    insertIntoSliceTree(root, slice);
  });
  return root;
}

function insertIntoSliceTree(parent: SliceNode, elementToAdd: ElementDefinition): void {
  const nextParent = parent.children.find(child =>
    elementToAdd.sliceName.startsWith(`${child.element.sliceName}/`)
  );
  if (nextParent != null) {
    insertIntoSliceTree(nextParent, elementToAdd);
  } else {
    parent.children.push({ element: elementToAdd, children: [] });
  }
}

export function calculateSliceTreeCounts(
  node: SliceNode,
  knownSlices: Map<string, number>,
  keyStart: string
): void {
  node.children.forEach(child => calculateSliceTreeCounts(child, knownSlices, keyStart));
  const elementMin = node.element.min - sumBy(node.children, getSliceTreeSum);
  const slicePath =
    keyStart +
    node.element.id
      .split('.')
      .slice(-1)[0]
      .replace(/:(.*)$/, '[$1]')
      .replace(/\//g, '][');
  const sliceMin = knownSlices.has(slicePath) ? knownSlices.get(slicePath) : 0;
  node.count = Math.max(elementMin, sliceMin);
}

function getSliceTreeSum(node: SliceNode): number {
  return node.count + sumBy(node.children, getSliceTreeSum);
}
