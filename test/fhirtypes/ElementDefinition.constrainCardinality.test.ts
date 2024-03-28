import { loadFromPath } from 'fhir-package-loader';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher, loggerSpy } from '../testhelpers';
import omit from 'lodash/omit';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let respRate: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    loggerSpy.reset();
    observation = fisher.fishForStructureDefinition('Observation');
    respRate = fisher.fishForStructureDefinition('resprate');
  });

  describe('#constrainCardinality()', () => {
    it('should allow cardinality to be constrained to same cardinality', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      identifier.constrainCardinality(0, '*');
      expect(identifier.min).toBe(0);
      expect(identifier.max).toBe('*');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      issued.constrainCardinality(0, '1');
      expect(issued.min).toBe(0);
      expect(issued.max).toBe('1');
    });

    it('should allow cardinality to be constrained to higher min', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to 1..*
      identifier.constrainCardinality(1, '*');
      expect(identifier.min).toBe(1);
      expect(identifier.max).toBe('*');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      // constrain 0..1 to 1..1
      issued.constrainCardinality(1, '1');
      expect(issued.min).toBe(1);
      expect(issued.max).toBe('1');
    });

    it('should allow cardinality to be constrained to lower max', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to 0..5
      identifier.constrainCardinality(0, '5');
      expect(identifier.min).toBe(0);
      expect(identifier.max).toBe('5');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      // constrain 0..1 to 0..0
      issued.constrainCardinality(0, '0');
      expect(issued.min).toBe(0);
      expect(issued.max).toBe('0');
    });

    it('should allow cardinality to be constrained to higher min and lower max at same time', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to 1..2
      identifier.constrainCardinality(1, '2');
      expect(identifier.min).toBe(1);
      expect(identifier.max).toBe('2');
    });

    it('should use elements current cardinality if no min specified', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to ..5
      identifier.constrainCardinality(NaN, '5'); // Unspecified min
      expect(identifier.min).toBe(0);
      expect(identifier.max).toBe('5');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      // constrain 0..1 to ..0
      issued.constrainCardinality(NaN, '0'); // Unspecified min
      expect(issued.min).toBe(0);
      expect(issued.max).toBe('0');
    });

    it('should use elements current cardinality if no max specified', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to 2..
      identifier.constrainCardinality(2, ''); // Unspecified max
      expect(identifier.min).toBe(2);
      expect(identifier.max).toBe('*');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      // constrain 0..1 to 1..
      issued.constrainCardinality(1, ''); // Unspecified max
      expect(issued.min).toBe(1);
      expect(issued.max).toBe('1');
    });

    it('should use elements current cardinality if no min and no max specified', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      // constrain 0..* to ..
      identifier.constrainCardinality(NaN, ''); // Unspecified min and max
      expect(identifier.min).toBe(0);
      expect(identifier.max).toBe('*');
      const issued = observation.elements.find(e => e.id === 'Observation.issued');
      // constrain 0..1 to ..0
      issued.constrainCardinality(NaN, ''); // Unspecified min and max
      expect(issued.min).toBe(0);
      expect(issued.max).toBe('1');
    });

    it('should throw InvalidCardinalityError when min > max', () => {
      const identifier = observation.elements.find(e => e.id === 'Observation.identifier');
      const clone = identifier.clone(false);
      expect(() => {
        clone.constrainCardinality(2, '1');
      }).toThrow(/min 2 is > max 1\./);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(identifier, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ConstrainingCardinalityError when min < original min', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = status.clone(false);
      expect(() => {
        // constrain 1..1 to 0..1
        clone.constrainCardinality(0, '1');
      }).toThrow(/0..1, as it does not fit within the original 1..1/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(status, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ConstrainingCardinalityError when max > original max', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = status.clone(false);
      expect(() => {
        // constrain 1..1 to 1..2
        clone.constrainCardinality(1, '2');
      }).toThrow(/1..2, as it does not fit within the original 1..1/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(status, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ConstrainingCardinalityError when min < original min and max > original max at the same time', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = status.clone(false);
      expect(() => {
        // constrain 1..1 to 0..2
        clone.constrainCardinality(0, '2');
      }).toThrow(/0..2, as it does not fit within the original 1..1/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(status, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ConstrainingCardinalityError when max is * and original max is not *', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = status.clone(false);
      expect(() => {
        // constrain 1..1 to 1..*
        clone.constrainCardinality(1, '*');
      }).toThrow(/1..\*, as it does not fit within the original 1..1/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(status, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    // Slice Handling
    it('should update sliced element min when sum of slice mins is constrainted greater than it', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const fooSlice = category.addSlice('FooSlice');
      fooSlice.constrainCardinality(2, '2');
      expect(fooSlice.min).toBe(2);
      expect(fooSlice.max).toBe('2');
      expect(category.min).toBe(3);
    });

    it('should not change the sliced element min when a slice is resliced with the same min', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const vsCat = respRate.elements.find(e => e.id === 'Observation.category:VSCat');
      // apply slicing to vsCat
      vsCat.sliceIt('value', 'coding.code');
      // * category[VSCat] contains FooSlice 1..1
      const fooSlice = vsCat.addSlice('FooSlice');
      fooSlice.constrainCardinality(1, '1');
      expect(category.min).toBe(1);
      expect(vsCat.min).toBe(1);
    });

    it('should update the min for the sliced element and the parent slice when the sum of reslice mins is constrained greater than them', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const parentSlice = category.addSlice('ParentSlice');
      parentSlice.constrainCardinality(1, '*');
      parentSlice.sliceIt('value', 'coding.code');
      const childSlice = parentSlice.addSlice('ChildSlice');
      childSlice.constrainCardinality(2, '2');
      expect(parentSlice.min).toBe(2); // contains 2 ChildSlice
      expect(category.min).toBe(3); // contains 2 ParentSlice/ChildSlice + 1 VSCat
    });

    it('should update the min for the sliced element and ancestor slices, but not other slices', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const parentOne = category.addSlice('ParentOne');
      parentOne.sliceIt('value', 'coding.code');
      const childOne = parentOne.addSlice('ChildOne');
      const childTwo = parentOne.addSlice('ChildTwo');
      const parentTwo = category.addSlice('ParentTwo');
      parentTwo.sliceIt('value', 'coding.code');
      const childThree = parentTwo.addSlice('ChildThree');
      const childFour = parentTwo.addSlice('ChildFour');

      childOne.constrainCardinality(1, '*');
      childTwo.constrainCardinality(2, '*');
      childThree.constrainCardinality(3, '*');
      childFour.constrainCardinality(4, '*');

      // the children should be unchanged from the values that were set
      expect(childOne.min).toBe(1);
      expect(childTwo.min).toBe(2);
      expect(childThree.min).toBe(3);
      expect(childFour.min).toBe(4);
      // the parents should be the sums of only their children, regardless of other slices
      expect(parentOne.min).toBe(3);
      expect(parentTwo.min).toBe(7);
      // the sliced element should be the sum of VSCat + ParentOne + ParentTwo = 1 + 3 + 7 = 11
      expect(category.min).toBe(11);
    });

    it('should throw InvalidSumOfSliceMinsError when sliced element max is constrained less than sum of slice mins', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const fooSlice = category.addSlice('FooSlice');
      fooSlice.min = 1;
      const clone = category.clone(false);
      expect(() => {
        category.constrainCardinality(1, '1');
      }).toThrow(/\(2\) > max \(1\) of Observation.category\./);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(category, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should log a warning and reduce slice cardinality when sliced element max is constrained less than any individual slice max', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const fooSlice = category.addSlice('FooSlice');
      fooSlice.max = '2';
      category.constrainCardinality(1, '1');
      expect(loggerSpy.getAllMessages('warn')).toContain(
        'At least one slice of Observation.category has a max greater than the overall element max. The max of the following slice(s) has been reduced to match the max of Observation.category: FooSlice'
      );
      expect(category.max).toEqual('1');
      expect(category.min).toEqual(1);
      expect(fooSlice.max).toEqual('1');
    });

    it('should throw InvalidSumOfSliceMinsError when sum of slice mins is constrained greater than sliced element max', () => {
      const category = respRate.elements.find(e => e.id === 'Observation.category');
      const fooSlice = category.addSlice('FooSlice');
      category.max = '2';
      const clone = fooSlice.clone(false);
      expect(() => {
        fooSlice.constrainCardinality(2, '2');
      }).toThrow(/\(3\) > max \(2\) of Observation.category\./);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(fooSlice, ['structDef', 'treeParent', 'treeChildren'])
      );
    });
  });
});
