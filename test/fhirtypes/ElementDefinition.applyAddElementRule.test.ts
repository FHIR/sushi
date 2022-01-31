import path from 'path';
import { loadFromPath } from 'fhir-package-load';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { ElementDefinition, ElementDefinitionType, StructureDefinition } from '../../src/fhirtypes';
import { loggerSpy, TestFisher } from '../testhelpers';
import { AddElementRule } from '../../src/fshtypes/rules';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let alternateIdentification: StructureDefinition;
  let fisher: TestFisher;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
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

    it('should throw an error for an invalid AddElementRule path', () => {
      const addElementRule = new AddElementRule('foo.bar');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'boolean' }];
      addElementRule.short = 'A bar';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);

      expect(() => {
        newElement.applyAddElementRule(addElementRule, fisher);
      }).toThrow('The element or path you referenced does not exist: foo.bar');
    });

    it('should apply AddElementRule with minimum required attributes', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'provide some comments';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      expect(newElement.min).toBe(0);
      expect(newElement.max).toBe('1');
      const expectedType = new ElementDefinitionType('string');
      expect(newElement.type).toStrictEqual([expectedType]);
      expect(newElement.isModifier).toBeUndefined();
      expect(newElement.mustSupport).toBeUndefined();
      expect(newElement.isSummary).toBeUndefined();
      expect(newElement.extension).toBeUndefined(); // standards flags extensions
      expect(newElement.short).toBe('provide some comments');
      expect(newElement.definition).toBe('provide some comments');
      expect(newElement.base).toBeDefined();
      expect(newElement.base.path).toBe(newElement.path);
      expect(newElement.base.min).toBe(newElement.min);
      expect(newElement.base.max).toBe(newElement.max);
      expect(newElement.constraint).toBeDefined();
      expect(newElement.constraint).toHaveLength(1);
      expect(newElement.constraint[0].key).toBe('ele-1');
      expect(newElement.constraint[0].requirements).toBeUndefined();
      expect(newElement.constraint[0].severity).toBe('error');
      expect(newElement.constraint[0].human).toBe(
        'All FHIR elements must have a @value or children'
      );
      expect(newElement.constraint[0].expression).toBe(
        'hasValue() or (children().count() > id.count())'
      );
      expect(newElement.constraint[0].xpath).toBe('@value|f:*|h:div');
      expect(newElement.constraint[0].source).toBe(
        'http://hl7.org/fhir/StructureDefinition/Element'
      );
    });

    it('should apply AddElementRule with multiple targetTypes', () => {
      const addElementRule = new AddElementRule('created[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'instant' }, { type: 'dateTime' }, { type: 'Period' }];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.created[x]');
      const expectedType1 = new ElementDefinitionType('instant');
      const expectedType2 = new ElementDefinitionType('dateTime');
      const expectedType3 = new ElementDefinitionType('Period');
      expect(newElement.type).toStrictEqual([expectedType1, expectedType2, expectedType3]);
    });

    it('should apply AddElementRule with multiple targetTypes including a reference', () => {
      const addElementRule = new AddElementRule('entity[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'string' },
        { type: 'uri' },
        { type: 'Organization', isReference: true }
      ];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.entity[x]');
      const expectedType1 = new ElementDefinitionType('string');
      const expectedType2 = new ElementDefinitionType('uri');
      const expectedType3 = new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Organization'
      );
      expect(newElement.type).toStrictEqual([expectedType1, expectedType2, expectedType3]);
    });

    it('should apply AddElementRule with single Reference targetType', () => {
      const addElementRule = new AddElementRule('org');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'Organization', isReference: true }];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.org');
      const expectedType = new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Organization'
      );
      expect(newElement.type).toStrictEqual([expectedType]);
    });

    it('should apply AddElementRule with multiple Reference targetType', () => {
      const addElementRule = new AddElementRule('org[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'Organization', isReference: true },
        { type: 'Practitioner', isReference: true }
      ];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.org[x]');
      const expectedType = new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Organization',
        'http://hl7.org/fhir/StructureDefinition/Practitioner'
      );
      expect(newElement.type).toStrictEqual([expectedType]);
    });

    it('should apply AddElementRule with multiple targetTypes including a canonical', () => {
      const addElementRule = new AddElementRule('entity[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'string' },
        { type: 'uri' },
        { type: 'Organization', isCanonical: true }
      ];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.entity[x]');
      const expectedType1 = new ElementDefinitionType('string');
      const expectedType2 = new ElementDefinitionType('uri');
      const expectedType3 = new ElementDefinitionType('canonical').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Organization'
      );
      expect(newElement.type).toStrictEqual([expectedType1, expectedType2, expectedType3]);
    });

    it('should apply AddElementRule with single canonical targetType', () => {
      const addElementRule = new AddElementRule('org');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'Organization', isCanonical: true }];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.org');
      const expectedType = new ElementDefinitionType('canonical').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Organization'
      );
      expect(newElement.type).toStrictEqual([expectedType]);
    });

    it('should apply AddElementRule with multiple canonical targetType', () => {
      const addElementRule = new AddElementRule('org[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'Organization', isCanonical: true },
        { type: 'Practitioner', isCanonical: true }
      ];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.org[x]');
      const expectedType = new ElementDefinitionType('canonical').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Organization',
        'http://hl7.org/fhir/StructureDefinition/Practitioner'
      );
      expect(newElement.type).toStrictEqual([expectedType]);
    });

    it('should log a warning when adding duplicate targetTypes', () => {
      const addElementRule = new AddElementRule('created[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'instant' }, { type: 'instant' }, { type: 'Period' }];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.created[x]');
      expect(newElement.type).toHaveLength(2);
      const expectedType1 = new ElementDefinitionType('instant');
      const expectedType2 = new ElementDefinitionType('Period');
      expect(newElement.type).toStrictEqual([expectedType1, expectedType2]);

      expect(loggerSpy.getLastMessage('warn')).toBe(
        'created[x] includes duplicate types. Duplicates have been ignored.'
      );
    });

    it('should not log a duplicate warning when adding multiple Reference and canonical targetTypes', () => {
      const addElementRule = new AddElementRule('prop1[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'string' },
        { type: 'uri' },
        { type: 'Organization', isReference: true },
        { type: 'Practitioner', isReference: true },
        { type: 'Organization', isCanonical: true },
        { type: 'Practitioner', isCanonical: true }
      ];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);

      expect(newElement.path).toBe('AlternateIdentification.prop1[x]');
      const expectedType1 = new ElementDefinitionType('string');
      const expectedType2 = new ElementDefinitionType('uri');
      const expectedType3 = new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Organization',
        'http://hl7.org/fhir/StructureDefinition/Practitioner'
      );
      const expectedType4 = new ElementDefinitionType('canonical').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/Organization',
        'http://hl7.org/fhir/StructureDefinition/Practitioner'
      );
      expect(newElement.type).toStrictEqual([
        expectedType1,
        expectedType2,
        expectedType3,
        expectedType4
      ]);
    });

    it('should throw an error when invalid path for multiple targetTypes', () => {
      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }, { type: 'Annotation' }];
      addElementRule.short = 'prop1 definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);

      expect(() => {
        newElement.applyAddElementRule(addElementRule, fisher);
      }).toThrow(
        "As a FHIR choice data type, the specified prop1 for AddElementRule must end with '[x]'."
      );
    });

    it('should apply AddElementRule with single Profile targetType using the profile id', () => {
      const addElementRule = new AddElementRule('patient');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'us-core-patient' }];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.patient');
      const expectedType = new ElementDefinitionType('Patient').withProfiles(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      );
      expect(newElement.type).toStrictEqual([expectedType]);
    });

    it('should apply AddElementRule with single Profile targetType using the profile name', () => {
      const addElementRule = new AddElementRule('patient');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'USCorePatientProfile' }];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.patient');
      const expectedType = new ElementDefinitionType('Patient').withProfiles(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      );
      expect(newElement.type).toStrictEqual([expectedType]);
    });

    it('should apply AddElementRule with single Logical Model targetType using the model id', () => {
      const addElementRule = new AddElementRule('serviceModel');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'eLTSSServiceModel' }];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.serviceModel');
      const expectedType = new ElementDefinitionType('eLTSSServiceModel');
      expect(newElement.type).toStrictEqual([expectedType]);
    });

    it('should apply AddElementRule with single Logical Model targetType using the model name', () => {
      const addElementRule = new AddElementRule('serviceModel');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'ELTSSServiceModel' }];
      addElementRule.short = 'short definition';

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.serviceModel');
      const expectedType = new ElementDefinitionType('eLTSSServiceModel');
      expect(newElement.type).toStrictEqual([expectedType]);
    });

    it('should apply AddElementRule with all boolean flags set to true', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.summary = true;
      addElementRule.modifier = true;
      // MustSupport must be false/undefined for logical models and resources;
      // otherwise, error will be thrown - tested elsewhere

      const newElement: ElementDefinition = alternateIdentification.newElement(addElementRule.path);
      newElement.applyAddElementRule(addElementRule, fisher);

      expect(newElement.path).toBe('AlternateIdentification.comments');
      expect(newElement.mustSupport).toBeFalsy();
      expect(newElement.isSummary).toBeTrue();
      expect(newElement.isModifier).toBeTrue();
      expect(newElement.extension).toBeUndefined(); // standards flags extensions
    });

    it('should apply AddElementRule with all boolean flags set to false', () => {
      const addElementRule = new AddElementRule('comments');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
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
      addElementRule.short = 'short definition';
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
      addElementRule.short = 'short definition';
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
      addElementRule.short = 'short definition';
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
      addElementRule.short = 'short definition';
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
      addElementRule.short = 'short definition';
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
      // definition gets defaulted to short
      expect(newElement2.definition).toBe(addElementRule2.short);
    });
  });
});
