import omit from 'lodash/omit';
import { TestFisher, getTestFHIRDefinitions, loggerSpy, testDefsPath } from '../testhelpers';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshCode } from '../../src/fshtypes/FshCode';
import { ElementDefinitionType } from '../../src/fhirtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let condition: StructureDefinition;
  let fooBarCode: FshCode;
  let barFooCode: FshCode;
  let versionedCode: FshCode;
  let codeWithDisplay: FshCode;
  let fisher: TestFisher;
  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    condition = fisher.fishForStructureDefinition('Condition');
    fooBarCode = new FshCode('bar', 'http://foo.com');
    barFooCode = new FshCode('foo', 'http://bar.com');
    versionedCode = new FshCode('versioned', 'http://versioned.com|7.6.5');
    codeWithDisplay = new FshCode('bar', 'http://foo.com', 'Foo Bar');
    loggerSpy.reset();
  });

  describe('#assignFshCode()', () => {
    it('should assign a code to a CodeableConcept', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.assignValue(fooBarCode);
      expect(concept.patternCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com' }]
      });
      expect(concept.fixedCodeableConcept).toBeUndefined();
    });

    it('should assign a code to a CodeableConcept (exactly)', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.assignValue(fooBarCode, true);
      expect(concept.fixedCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com' }]
      });
      expect(concept.patternCodeableConcept).toBeUndefined();
    });

    it('should assign a code with a version to a CodeableConcept', () => {
      const concept = observation.findElementByPath('code', fisher);
      concept.assignValue(versionedCode);
      expect(concept.patternCodeableConcept).toEqual({
        coding: [
          {
            code: 'versioned',
            system: 'http://versioned.com',
            version: '7.6.5'
          }
        ]
      });
      expect(concept.fixedCodeableConcept).toBeUndefined();
    });

    it('should assign a code with a version to a CodeableConcept (exactly)', () => {
      const concept = observation.findElementByPath('code', fisher);
      concept.assignValue(versionedCode, true);
      expect(concept.fixedCodeableConcept).toEqual({
        coding: [
          {
            code: 'versioned',
            system: 'http://versioned.com',
            version: '7.6.5'
          }
        ]
      });
      expect(concept.patternCodeableConcept).toBeUndefined();
    });

    it('should assign a code with a display to a CodeableConcept', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.assignValue(codeWithDisplay);
      expect(concept.patternCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com', display: 'Foo Bar' }]
      });
      expect(concept.fixedCodeableConcept).toBeUndefined();
    });

    it('should assign a code with a display to a CodeableConcept (exacty)', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.assignValue(codeWithDisplay, true);
      expect(concept.fixedCodeableConcept).toEqual({
        coding: [{ code: 'bar', system: 'http://foo.com', display: 'Foo Bar' }]
      });
      expect(concept.patternCodeableConcept).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a CodeableConcept assigned to a different code by pattern[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      // Setup original assigned code
      concept.assignValue(fooBarCode);
      const clone = concept.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(concept, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a CodeableConcept assigned to a different code by fixed[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      // Setup original assigned code
      concept.assignValue(fooBarCode, true);
      const clone = concept.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(concept, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a CodeableConcept assigned to a different code by a parent by pattern[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically pattern[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.patternBackboneElement = { type: { coding: [{ system: 'http://foo.com', code: 'bar' }] } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      const clone = rrType.clone(false);
      expect(() => {
        rrType.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(() => {
        rrType.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(rrType, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a CodeableConcept assigned to a different code by a parent by fixed[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically fixed[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.fixedBackboneElement = {
        type: { coding: [{ system: 'http://foo.com', code: 'bar' }] }
      };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      const clone = rrType.clone(false);
      expect(() => {
        rrType.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(() => {
        rrType.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*CodeableConcept.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(rrType, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      // Setup original assigned code
      concept.assignValue(fooBarCode, true);
      const clone = concept.clone(false);
      expect(() => {
        clone.assignValue(fooBarCode);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedCodeableConcept.'
      );
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(concept, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw InvalidUriError when assigning a code with a non-URI value', () => {
      const category = observation.elements.find(e => e.id === 'Observation.category');
      const clone = category.clone(false);
      expect(() => {
        clone.assignValue(new FshCode('code', 'notAUri'));
      }).toThrow(/notAUri/);
      expect(() => {
        clone.assignValue(new FshCode('code', 'notAUri'), true);
      }).toThrow(/notAUri/);
    });

    it('should NOT throw InvalidUriError when assigning a code with a non-URI value to a primitive code', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = status.clone(false);
      clone.assignValue(new FshCode('code', 'notAUri'));
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /code notAUri#code is invalid.*specified system is not a URI/
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/Observation.status is a code/);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /specifying a code only \(e\.g\., #code\)\./
      );
      clone.assignValue(new FshCode('code', 'notAUri'), true);
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(2);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /code notAUri#code is invalid.*specified system is not a URI/
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/Observation.status is a code/);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /specifying a code only \(e\.g\., #code\)\./
      );
    });

    it('should throw MismatchedBindingTypeError when assigning a code with a ValueSet as a system', () => {
      const category = observation.elements.find(e => e.id === 'Observation.category');
      const clone = category.clone(false);
      expect(() => {
        clone.assignValue(
          new FshCode('code', 'http://hl7.org/fhir/ValueSet/observation-category'),
          false,
          fisher
        );
      }).toThrow(/CodeSystem/);
      expect(() => {
        clone.assignValue(
          new FshCode('code', 'http://hl7.org/fhir/ValueSet/observation-category'),
          true,
          fisher
        );
      }).toThrow(/CodeSystem/);
    });

    it('should throw MismatchedBindingTypeError when assigning a code with a ValueSet as a system when provided with a version', () => {
      const category = observation.elements.find(e => e.id === 'Observation.category');
      const clone = category.clone(false);
      expect(() => {
        clone.assignValue(
          new FshCode('code', 'http://hl7.org/fhir/ValueSet/observation-category|5.0.0'),
          false,
          fisher
        );
      }).toThrow(/CodeSystem/);
      expect(() => {
        clone.assignValue(
          new FshCode('code', 'http://hl7.org/fhir/ValueSet/observation-category|5.0.0'),
          true,
          fisher
        );
      }).toThrow(/CodeSystem/);
    });

    it('should NOT throw MismatchedBindingTypeError when assigning a code with a ValueSet as a system to a primitive code', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const clone = status.clone(false);
      clone.assignValue(
        new FshCode('final', 'http://hl7.org/fhir/ValueSet/observation-status'),
        false,
        fisher
      );
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /code http:\/\/hl7\.org\/fhir\/ValueSet\/observation-status#final is invalid.*specified system is a ValueSet/
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/Observation.status is a code/);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /specifying a code only \(e\.g\., #final\)\./
      );
      clone.assignValue(
        new FshCode('final', 'http://hl7.org/fhir/ValueSet/observation-status'),
        true,
        fisher
      );
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(2);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /code http:\/\/hl7\.org\/fhir\/ValueSet\/observation-status#final is invalid.*specified system is a ValueSet/
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/Observation.status is a code/);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /specifying a code only \(e\.g\., #final\)\./
      );
    });

    it('should assign a code to a Coding', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.assignValue(fooBarCode);
      expect(coding.patternCoding).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(coding.fixedCoding).toBeUndefined();
    });

    it('should assign a code to a Coding (exactly)', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.assignValue(fooBarCode, true);
      expect(coding.fixedCoding).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(coding.patternCoding).toBeUndefined();
    });

    it('should assign a code with a version to a Coding', () => {
      const coding = observation.findElementByPath('code.coding', fisher);
      coding.assignValue(versionedCode);
      expect(coding.patternCoding).toEqual({
        code: 'versioned',
        system: 'http://versioned.com',
        version: '7.6.5'
      });
      expect(coding.fixedCoding).toBeUndefined();
    });

    it('should assign a code with a version to a Coding (exactly)', () => {
      const coding = observation.findElementByPath('code.coding', fisher);
      coding.assignValue(versionedCode, true);
      expect(coding.fixedCoding).toEqual({
        code: 'versioned',
        system: 'http://versioned.com',
        version: '7.6.5'
      });
      expect(coding.patternCoding).toBeUndefined();
    });

    it('should assign a code with a display to a Coding', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.assignValue(codeWithDisplay);
      expect(coding.patternCoding).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        display: 'Foo Bar'
      });
      expect(coding.fixedCoding).toBeUndefined();
    });

    it('should assign a code with a display to a Coding (exactly)', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.assignValue(codeWithDisplay, true);
      expect(coding.fixedCoding).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        display: 'Foo Bar'
      });
      expect(coding.patternCoding).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a Coding assigned to a different code by pattern[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      // Setup original assigned code
      coding.assignValue(fooBarCode);
      const clone = coding.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(coding, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a Coding assigned to a different code by fixed[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      // Setup original assigned code
      coding.assignValue(fooBarCode, true);
      const clone = coding.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(coding, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a Coding assigned to a different code by a parent by pattern[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically pattern[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.patternBackboneElement = { type: { coding: { system: 'http://foo.com', code: 'bar' } } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      rrType.unfold(fisher);
      const rrTypeCoding = observation.elements.find(
        e => e.id === 'Observation.referenceRange.type.coding'
      );
      const clone = rrTypeCoding.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(rrTypeCoding, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a Coding assigned to a different code by a parent by fixed[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically fixed[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.fixedBackboneElement = { type: { coding: { system: 'http://foo.com', code: 'bar' } } };
      const rrType = observation.elements.find(e => e.id === 'Observation.referenceRange.type');
      rrType.unfold(fisher);
      const rrTypeCoding = observation.elements.find(
        e => e.id === 'Observation.referenceRange.type.coding'
      );
      const clone = rrTypeCoding.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Coding.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(rrTypeCoding, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw AssignedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const concept = observation.elements.find(e => e.id === 'Observation.code');
      concept.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      // Setup original assigned code
      coding.assignValue(fooBarCode, true);
      const clone = coding.clone(false);
      expect(() => {
        clone.assignValue(fooBarCode);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedCoding.'
      );
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(coding, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should assign a code to a code', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      code.assignValue(fooBarCode);
      expect(code.patternCode).toBe('bar');
      expect(code.fixedCode).toBeUndefined();
    });

    it('should assign a code to a code (exactly)', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      code.assignValue(fooBarCode, true);
      expect(code.fixedCode).toBe('bar');
      expect(code.patternCode).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a code assigned to a different code by pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      // Setup original assigned code
      code.assignValue(fooBarCode);
      const clone = code.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(code, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a code assigned to a different code by fixed[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.status');
      // Setup original assigned code
      code.assignValue(fooBarCode, true);
      const clone = code.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(code, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a code assigned to a different code by a parent by pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const codeCodingCode = observation.elements.find(
        e => e.id === 'Observation.code.coding.code'
      );
      // Setup original assigned code
      code.assignValue(fooBarCode);
      const clone = codeCodingCode.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(codeCodingCode, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a code assigned to a different code by a parent by fixed[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const codeCodingCode = observation.elements.find(
        e => e.id === 'Observation.code.coding.code'
      );
      // Setup original assigned code
      code.assignValue(fooBarCode, true);
      const clone = codeCodingCode.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(codeCodingCode, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.unfold(fisher);
      const coding = observation.elements.find(e => e.id === 'Observation.code.coding');
      coding.unfold(fisher);
      const codeCodingCode = observation.elements.find(
        e => e.id === 'Observation.code.coding.code'
      );
      // Setup original assigned code
      codeCodingCode.assignValue(fooBarCode, true);
      const clone = codeCodingCode.clone(false);
      expect(() => {
        clone.assignValue(fooBarCode);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedCode.'
      );
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(codeCodingCode, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should assign a code to a Quantity', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.assignValue(fooBarCode);
      expect(quantity.patternQuantity).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(quantity.fixedQuantity).toBeUndefined();
    });

    it('should assign a code to a Quantity (exactly)', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.assignValue(fooBarCode, true);
      expect(quantity.fixedQuantity).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(quantity.patternQuantity).toBeUndefined();
    });

    it('should assign a code to an Age', () => {
      const onsetX = condition.elements.find(e => e.id === 'Condition.onset[x]');
      onsetX.type = [new ElementDefinitionType('Age')];
      onsetX.assignValue(fooBarCode, false, fisher);
      expect(onsetX.patternAge).toEqual({ code: 'bar', system: 'http://foo.com' });
      expect(onsetX.fixedAge).toBeUndefined();
    });

    it('should assign a code to an Age (exactly)', () => {
      const onsetX = condition.elements.find(e => e.id === 'Condition.onset[x]');
      onsetX.type = [new ElementDefinitionType('Age')];
      onsetX.assignValue(fooBarCode, true, fisher);
      expect(onsetX.patternAge).toBeUndefined();
      expect(onsetX.fixedAge).toEqual({ code: 'bar', system: 'http://foo.com' });
    });

    it('should assign a code with a display to an Age', () => {
      const onsetX = condition.elements.find(e => e.id === 'Condition.onset[x]');
      onsetX.type = [new ElementDefinitionType('Age')];
      onsetX.assignValue(codeWithDisplay, false, fisher);
      expect(onsetX.patternAge).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        unit: 'Foo Bar'
      });
      expect(onsetX.fixedAge).toBeUndefined();
    });

    it('should assign a code with a display to an Age (exactly)', () => {
      const onsetX = condition.elements.find(e => e.id === 'Condition.onset[x]');
      onsetX.type = [new ElementDefinitionType('Age')];
      onsetX.assignValue(codeWithDisplay, true, fisher);
      expect(onsetX.patternAge).toBeUndefined();
      expect(onsetX.fixedAge).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        unit: 'Foo Bar'
      });
    });

    it('should assign a code with a display to a Quantity', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.assignValue(codeWithDisplay);
      expect(quantity.patternQuantity).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        unit: 'Foo Bar'
      });
      expect(quantity.fixedQuantity).toBeUndefined();
    });

    it('should assign a code with a display to a Quantity (exactly)', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      quantity.assignValue(codeWithDisplay, true);
      expect(quantity.fixedQuantity).toEqual({
        code: 'bar',
        system: 'http://foo.com',
        unit: 'Foo Bar'
      });
      expect(quantity.patternQuantity).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a Quantity assigned to a different code by pattern[x]', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      // Setup original assigned code
      quantity.assignValue(fooBarCode);
      const clone = quantity.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(quantity, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a Quantity assigned to a different code by fixed[x]', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      // Setup original assigned code
      quantity.assignValue(fooBarCode, true);
      const clone = quantity.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(quantity, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a Quantity assigned to a different code by a parent be pattern[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically pattern[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.patternBackboneElement = { low: { system: 'http://foo.com', code: 'bar' } };
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      const clone = rrLow.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(rrLow, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a Quantity assigned to a different code by a parent be fixed[x]', () => {
      const rr = observation.elements.find(e => e.id === 'Observation.referenceRange');
      // @ts-ignore (technically fixed[x] doesn't allow BackboneElement, but this is ok for the purpose of this test)
      rr.fixedBackboneElement = { low: { system: 'http://foo.com', code: 'bar' } };
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      const clone = rrLow.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*Quantity.*"code":"bar"/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(rrLow, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw AssignedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const quantity = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      // Setup original assigned code
      quantity.assignValue(fooBarCode, true);
      const clone = quantity.clone(false);
      expect(() => {
        clone.assignValue(fooBarCode);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedQuantity.'
      );
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(quantity, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should assign a code to a string', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      string.assignValue(fooBarCode);
      expect(string.patternString).toBe('bar');
      expect(string.fixedString).toBeUndefined();
    });

    it('should assign a code to a string (exactly)', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      string.assignValue(fooBarCode, true);
      expect(string.fixedString).toBe('bar');
      expect(string.patternString).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a string assigned to a different string by pattern[x]', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      // Setup original assigned code
      string.assignValue(fooBarCode);
      const clone = string.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(string, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a string assigned to a different string by fixed[x]', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      // Setup original assigned code
      string.assignValue(fooBarCode, true);
      const clone = string.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(string, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a string assigned to a different string by a parent by pattern[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.patternCodeableConcept = { text: 'http://foo.com#bar' };
      code.unfold(fisher);
      const string = observation.elements.find(e => e.id === 'Observation.code.text');
      // Setup original assigned code
      const clone = string.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(string, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a string assigned to a different string by a parent by fixed[x]', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.fixedCodeableConcept = { text: 'http://foo.com#bar' };
      code.unfold(fisher);
      const string = observation.elements.find(e => e.id === 'Observation.code.text');
      // Setup original assigned code
      const clone = string.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(string, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const string = observation.elements.find(e => e.id === 'Observation.referenceRange.text');
      // Setup original assigned code
      string.assignValue(fooBarCode, true);
      const clone = string.clone(false);
      expect(() => {
        clone.assignValue(fooBarCode);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedString.'
      );
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(string, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should assign a code to a uri', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      uri.assignValue(fooBarCode);
      expect(uri.patternUri).toBe('bar');
      expect(uri.fixedUri).toBeUndefined();
    });

    it('should assign a code to a uri (exactly)', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      uri.assignValue(fooBarCode, true);
      expect(uri.fixedUri).toBe('bar');
      expect(uri.patternUri).toBeUndefined();
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a uri assigned to a different uri by pattern[x]', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      // Setup original assigned code
      uri.assignValue(fooBarCode);
      const clone = uri.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(uri, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a uri assigned to a different uri by fixed[x]', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      // Setup original assigned code
      uri.assignValue(fooBarCode, true);
      const clone = uri.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(uri, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a uri assigned to a different uri by a parent by pattern[x]', () => {
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      rrLow.patternQuantity = { system: 'http://foo.com#bar' };
      rrLow.unfold(fisher);
      const uri = observation.elements.find(e => e.id === 'Observation.referenceRange.low.system');
      const clone = uri.clone(false);
      expect(() => {
        clone.assignValue(barFooCode);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(uri, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a code to a uri assigned to a different uri by a parent by fixed[x]', () => {
      const rrLow = observation.elements.find(e => e.id === 'Observation.referenceRange.low');
      rrLow.patternQuantity = { system: 'http://foo.com#bar' };
      rrLow.unfold(fisher);
      const uri = observation.elements.find(e => e.id === 'Observation.referenceRange.low.system');
      const clone = uri.clone(false);
      expect(() => {
        clone.assignValue(barFooCode, true);
      }).toThrow(/http:\/\/bar.com#foo.*#bar/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(uri, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const uri = observation.elements.find(e => e.id === 'Observation.implicitRules');
      // Setup original assigned code
      uri.assignValue(fooBarCode, true);
      const clone = uri.clone(false);
      expect(() => {
        clone.assignValue(fooBarCode);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedUri.'
      );
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(uri, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw CodedTypeNotFoundError when binding to an unsupported type', () => {
      const instant = observation.elements.find(e => e.id === 'Observation.issued');
      const clone = instant.clone(false);
      expect(() => {
        clone.assignValue(fooBarCode);
      }).toThrow(/instant/);
      expect(() => {
        clone.assignValue(fooBarCode, true);
      }).toThrow(/instant/);
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(instant, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.assignValue(fooBarCode);
      }).toThrow(
        'Cannot assign Code value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.assignValue(fooBarCode, true);
      }).toThrow(
        'Cannot assign Code value on this element since this element does not have a single type'
      );
    });

    describe('R5 CodeableReference', () => {
      let r5Defs: FHIRDefinitions;
      let r5Fisher: TestFisher;
      let carePlan: StructureDefinition;

      beforeAll(async () => {
        r5Defs = await getTestFHIRDefinitions(false, testDefsPath('r5-definitions'));
        r5Fisher = new TestFisher().withFHIR(r5Defs);
      });

      beforeEach(() => {
        carePlan = r5Fisher.fishForStructureDefinition('CarePlan');
        loggerSpy.reset();
      });

      it('should assign a code to a CodeableReference', () => {
        const addresses = carePlan.elements.find(e => e.id === 'CarePlan.addresses');
        addresses.assignValue(fooBarCode);

        expect(addresses.patternCodeableReference).toEqual({
          concept: {
            coding: [{ code: 'bar', system: 'http://foo.com' }]
          }
        });

        expect(addresses.fixedCodeableReference).toBeUndefined();
      });

      it('should assign a code to a CodeableReference (exactly)', () => {
        const addresses = carePlan.elements.find(e => e.id === 'CarePlan.addresses');
        addresses.assignValue(fooBarCode, true);

        expect(addresses.fixedCodeableReference).toEqual({
          concept: {
            coding: [{ code: 'bar', system: 'http://foo.com' }]
          }
        });

        expect(addresses.patternCodeableReference).toBeUndefined();
      });
    });
  });
});
