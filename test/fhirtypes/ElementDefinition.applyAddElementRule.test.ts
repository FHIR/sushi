import path from 'path';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { ElementDefinition, ElementDefinitionType, StructureDefinition } from '../../src/fhirtypes';
import { loggerSpy, TestFisher } from '../testhelpers';
import { AddElementRule } from '../../src/fshtypes/rules';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let alternateIdentification: StructureDefinition;
  let fisher: TestFisher;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    fisher = new TestFisher().withFHIR(defs);
  });

  beforeEach(() => {
    alternateIdentification = fisher.fishForStructureDefinition('AlternateIdentification');
    loggerSpy.reset();
  });

  describe('#applyAddElementRule()', () => {
    // NOTE: ElementDefinition.applyAddElementRule(...) uses the following ElementDefinition
    //       methods:
    //         - constrainType(...)
    //         - constrainCardinality(...)
    //         - applyFlags(...)
    //       Those methods have their own exhaustive tests in other test suites; therefore,
    //       only minimal tests are provided for those aspects within the AddElementRule.

    it('should apply AddElementRule with minimum required attributes', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      expect(newElement.min).toBe(0);
      expect(newElement.max).toBe('1');
      const expectedType = new ElementDefinitionType('string');
      expect(newElement.type).toStrictEqual([expectedType]);
      expect(newElement.isModifier).toBeUndefined();
      expect(newElement.mustSupport).toBeUndefined();
      expect(newElement.isSummary).toBeUndefined();
      expect(newElement.extension).toBeUndefined(); // standards flags extensions
      expect(newElement.short).toBeUndefined();
      expect(newElement.definition).toBeUndefined();
      // NOTE: base attribute should be defined
      expect(newElement.base.path).toBe(newElement.path);
      expect(newElement.base.min).toBe(newElement.min);
      expect(newElement.base.max).toBe(newElement.max);
    });

    it('should apply AddElementRule with multiple targetTypes', () => {
      const addElementRule = new AddElementRule('created[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'instant' }, { type: 'dateTime' }, { type: 'Period' }];

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.created[x]');
      const expectedType1 = new ElementDefinitionType('instant');
      const expectedType2 = new ElementDefinitionType('dateTime');
      const expectedType3 = new ElementDefinitionType('Period');
      expect(newElement.type).toStrictEqual([expectedType1, expectedType2, expectedType3]);
    });

    it('should apply AddElementRule with all boolean flags set to true', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.mustSupport = true;
      addElementRule.summary = true;
      addElementRule.modifier = true;

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      expect(newElement.mustSupport).toBeTrue();
      expect(newElement.isSummary).toBeTrue();
      expect(newElement.isModifier).toBeTrue();
      expect(newElement.extension).toBeUndefined(); // standards flags extensions
    });

    it('should apply AddElementRule with all boolean flags set to false', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.mustSupport = false;
      addElementRule.summary = false;
      addElementRule.modifier = false;

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      // When flags are set to false, the attributes are not generated rather than set to false
      expect(newElement.mustSupport).toBeUndefined();
      expect(newElement.isSummary).toBeUndefined();
      expect(newElement.isModifier).toBeUndefined();
      expect(newElement.extension).toBeUndefined(); // standards flags extensions
    });

    it('should apply AddElementRule with trial use standards flag set to true', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.trialUse = true;
      addElementRule.normative = false;
      addElementRule.draft = false;

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      // When standards flags are set to true, an extension is created
      expect(newElement.extension).toHaveLength(1);
      expect(newElement.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'trial-use'
      });
    });

    it('should apply AddElementRule with normative standards flag set to true', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.trialUse = false;
      addElementRule.normative = true;
      addElementRule.draft = false;

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      // When standards flags are set to true, an extension is created
      expect(newElement.extension).toHaveLength(1);
      expect(newElement.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'normative'
      });
    });

    it('should apply AddElementRule with draft standards flag set to true', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.trialUse = false;
      addElementRule.normative = false;
      addElementRule.draft = true;

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      // When standards flags are set to true, an extension is created
      expect(newElement.extension).toHaveLength(1);
      expect(newElement.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'draft'
      });
    });

    it('should apply AddElementRule with all standards flags set to false', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.trialUse = false;
      addElementRule.normative = false;
      addElementRule.draft = false;

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      // When standards flags are set to false, the underlying extension is not created
      expect(newElement.extension).toBeUndefined();
    });

    it('should throw an error when apply AddElementRule with multiple standards flags set to true', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.trialUse = true;
      addElementRule.normative = true;
      addElementRule.draft = true;

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);

      expect(() => {
        newElement.applyAddElementRule(addElementRule, fisher);
      }).toThrow('Cannot apply multiple standards status on AlternateIdentification.comments');
    });

    it('should apply AddElementRule with supported doc attributes', () => {
      const addElementRule1 = new AddElementRule('prop1');
      addElementRule1.min = 0;
      addElementRule1.max = '1';
      addElementRule1.types = [{ type: 'string' }];
      addElementRule1.short = 'short description for prop1';
      addElementRule1.definition = 'definition for prop1';

      const addElementRule2 = new AddElementRule('prop2');
      addElementRule2.min = 0;
      addElementRule2.max = '1';
      addElementRule2.types = [{ type: 'string' }];
      addElementRule2.short = 'short description for prop2';

      const addElementRule3 = new AddElementRule('prop3');
      addElementRule3.min = 0;
      addElementRule3.max = '1';
      addElementRule3.types = [{ type: 'string' }];
      addElementRule3.definition = 'definition for prop3';

      const newElement1: ElementDefinition = alternateIdentification.newElement(
        addElementRule1.path
      );
      newElement1.applyAddElementRule(addElementRule1, fisher);

      expect(newElement1.path).toBe('AlternateIdentification.prop1');
      expect(newElement1.short).toBe(addElementRule1.short);
      expect(newElement1.definition).toBe(addElementRule1.definition);

      const newElement2: ElementDefinition = alternateIdentification.newElement(
        addElementRule2.path
      );
      newElement2.applyAddElementRule(addElementRule2, fisher);

      expect(newElement2.path).toBe('AlternateIdentification.prop2');
      expect(newElement2.short).toBe(addElementRule2.short);
      expect(newElement2.definition).toBeUndefined();

      const newElement3: ElementDefinition = alternateIdentification.newElement(
        addElementRule3.path
      );
      newElement3.applyAddElementRule(addElementRule3, fisher);

      expect(newElement3.path).toBe('AlternateIdentification.prop3');
      expect(newElement3.short).toBeUndefined();
      expect(newElement3.definition).toBe(addElementRule3.definition);
    });
  });
});
