import { loadFromPath } from 'fhir-package-loader';
import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import {
  Profile,
  Extension,
  FshCanonical,
  FshCode,
  FshReference,
  Instance,
  FshValueSet,
  FshCodeSystem,
  Invariant,
  Logical,
  Resource,
  RuleSet,
  FshQuantity,
  Configuration
} from '../../src/fshtypes';
import {
  CardRule,
  FlagRule,
  OnlyRule,
  BindingRule,
  AssignmentRule,
  ContainsRule,
  CaretValueRule,
  ObeysRule,
  InsertRule,
  ConceptRule,
  AddElementRule
} from '../../src/fshtypes/rules';
import { assertCardRule, assertContainsRule, loggerSpy, TestFisher } from '../testhelpers';
import {
  ElementDefinitionType,
  StructureDefinition,
  StructureDefinitionMapping
} from '../../src/fhirtypes';
import path from 'path';
import { withDebugLogging } from '../testhelpers/withDebugLogging';
import { minimalConfig } from '../utils/minimalConfig';
import { ValidationError } from '../../src/errors';
import { readFileSync } from 'fs-extra';

describe('StructureDefinitionExporter R4', () => {
  let defs: FHIRDefinitions;
  let fisher: TestFisher;
  let doc: FSHDocument;
  let pkg: Package;
  let exporter: StructureDefinitionExporter;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    const characteristicCS = JSON.parse(
      readFileSync(
        path.join(
          __dirname,
          '..',
          'testhelpers',
          'testdefs',
          'CodeSystem-type-characteristics-code.json'
        ),
        'utf-8'
      ).trim()
    );
    defs.add(characteristicCS);
    const futurePlanet = JSON.parse(
      readFileSync(
        path.join(
          __dirname,
          '..',
          'testhelpers',
          'testdefs',
          'StructureDefinition-FuturePlanet.json'
        ),
        'utf-8'
      ).trim()
    );
    defs.add(futurePlanet);
    const pastPlanet = JSON.parse(
      readFileSync(
        path.join(
          __dirname,
          '..',
          'testhelpers',
          'testdefs',
          'StructureDefinition-PastPlanet.json'
        ),
        'utf-8'
      ).trim()
    );
    defs.add(pastPlanet);
    const typeMustSupport = JSON.parse(
      readFileSync(
        path.join(
          __dirname,
          '..',
          'testhelpers',
          'testdefs',
          'StructureDefinition-elementdefinition-type-must-support.json'
        ),
        'utf-8'
      ).trim()
    );
    defs.add(typeMustSupport);
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    const r5Defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r5-definitions', r5Defs);
    defs.addSupplementalFHIRDefinitions('hl7.fhir.r5.core#5.0.0', r5Defs);
  });

  beforeEach(() => {
    loggerSpy.reset();
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    pkg = new Package(input.config);
    fisher = new TestFisher(input, defs, pkg);
    exporter = new StructureDefinitionExporter(input, pkg, fisher);
  });

  describe('#StructureDefinition', () => {
    it('should not export duplicate structure definitions', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Patient';
      doc.profiles.set(profile.name, profile);

      const extension = new Extension('Bar');
      extension.id = 'bar';
      doc.aliases.set('barAlias', 'Bar');
      doc.extensions.set(extension.name, extension);

      const ruleBar = new ContainsRule('extension');
      ruleBar.items = [{ name: 'bar', type: 'barAlias' }];
      profile.rules.push(ruleBar);

      const pkg = exporter.export();
      expect(pkg.profiles.length).toBe(1);
      expect(pkg.extensions.length).toBe(1);
    });

    it('should warn when the structDef is a profile and title and/or description is an empty string', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Patient';
      profile.title = '';
      profile.description = '';
      doc.profiles.set(profile.name, profile);
      const exported = exporter.export();
      expect(exported.profiles.length).toBe(1);

      expect(loggerSpy.getAllMessages('warn').length).toBe(2);
      expect(loggerSpy.getFirstMessage('warn')).toMatch(
        'Profile Foo has a title field that should not be empty.'
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Profile Foo has a description field that should not be empty.'
      );
    });

    it('should warn when the structDef is an extension and title and/or description is an empty string', () => {
      const extension = new Extension('Bar');
      extension.parent = 'Extension';
      extension.title = '';
      extension.description = '';
      doc.extensions.set(extension.name, extension);
      const exported = exporter.export();

      expect(exported.extensions.length).toBe(1);

      expect(loggerSpy.getAllMessages('warn').length).toBe(2);
      expect(loggerSpy.getFirstMessage('warn')).toMatch(
        'Extension Bar has a title field that should not be empty.'
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Extension Bar has a description field that should not be empty.'
      );
    });

    it('should warn when the structDef is a logical and title and/or description is an empty string', () => {
      const logical = new Logical('BackFooTheFuture');
      logical.parent = 'Element';
      logical.title = '';
      logical.description = '';
      doc.logicals.set(logical.name, logical);
      const exported = exporter.export();

      expect(exported.logicals.length).toBe(1);

      expect(loggerSpy.getAllMessages('warn').length).toBe(2);
      expect(loggerSpy.getFirstMessage('warn')).toMatch(
        'Logical BackFooTheFuture has a title field that should not be empty.'
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Logical BackFooTheFuture has a description field that should not be empty.'
      );
    });

    it('should warn when the structDef is a resource and title and/or description is an empty string', () => {
      const resource = new Resource('SpidermanBarFromHome');
      resource.parent = 'Resource';
      resource.id = 'PatientResource';
      resource.title = '';
      resource.description = '';
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);

      expect(loggerSpy.getAllMessages('warn').length).toBe(2);
      expect(loggerSpy.getFirstMessage('warn')).toMatch(
        'Resource SpidermanBarFromHome has a title field that should not be empty.'
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Resource SpidermanBarFromHome has a description field that should not be empty.'
      );
    });

    it('should log a message when the structure definition has an invalid id', () => {
      const profile = new Profile('Wrong').withFile('Wrong.fsh').withLocation([1, 8, 4, 18]);
      profile.id = 'will?not?work';
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.id).toBe('will?not?work');
      expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR id/s);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 1 - 4\D*/s);
    });

    it('should not log a message when the structure definition overrides an invalid id with a Caret Rule', () => {
      const profile = new Profile('Wrong').withFile('Wrong.fsh').withLocation([1, 8, 4, 18]);
      profile.id = 'will?not?work';
      profile.parent = 'Patient';
      const idRule = new CaretValueRule('');
      idRule.caretPath = 'id';
      idRule.value = 'will-work';
      profile.rules.push(idRule);
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.id).toBe('will-work');
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
    });

    it('should log a message when the structure definition overrides an invalid id with an invalid Caret Rule', () => {
      const profile = new Profile('Wrong').withFile('Wrong.fsh').withLocation([1, 8, 4, 18]);
      profile.id = 'will?not?work';
      profile.parent = 'Patient';
      const idRule = new CaretValueRule('').withFile('Wrong.fsh').withLocation([3, 8, 3, 18]);
      idRule.caretPath = 'id';
      idRule.value = 'Still Wont Work!';
      profile.rules.push(idRule);
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.id).toBe('Still Wont Work!');
      expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR id/s);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 3\D*/s);
    });

    it('should log a message when the structure definition overrides an valid id with an invalid Caret Rule', () => {
      const profile = new Profile('Wrong').withFile('Wrong.fsh').withLocation([1, 8, 4, 18]);
      profile.id = 'valid-id';
      profile.parent = 'Observation';
      const idRule = new CaretValueRule('').withFile('Wrong.fsh').withLocation([3, 8, 3, 18]);
      idRule.caretPath = 'id';
      idRule.value = 'This Is Not Right!';
      profile.rules.push(idRule);
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.id).toBe('This Is Not Right!');
      expect(loggerSpy.getLastMessage()).toMatch(/does not represent a valid FHIR id/s);
      expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 3\D*/s);
    });

    it('should log a message when the structure definition has an invalid name', () => {
      const profile = new Profile('Not-good').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.name).toBe('Not-good');
      expect(loggerSpy.getLastMessage()).toMatch(
        /may not be suitable for machine processing applications such as code generation/s
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
    });

    it('should not log a message when the structure definition overrides an invalid name with a Caret Rule', () => {
      const profile = new Profile('Not-good').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
      profile.parent = 'Observation';
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'name';
      nameRule.value = 'NotGood';
      profile.rules.push(nameRule);
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.name).toBe('NotGood');
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
    });

    it('should log a message when the structure definition overrides an invalid name with an invalid Caret Rule', () => {
      const profile = new Profile('Not-good').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
      profile.parent = 'Observation';
      const nameRule = new CaretValueRule('').withFile('Wrong.fsh').withLocation([3, 8, 3, 18]);
      nameRule.caretPath = 'name';
      nameRule.value = 'Not-good';
      profile.rules.push(nameRule);
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.name).toBe('Not-good');
      expect(loggerSpy.getLastMessage()).toMatch(
        /may not be suitable for machine processing applications such as code generation/s
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 3\D*/s);
    });

    it('should log a message when the structure definition overrides a valid name with an invalid Caret Rule', () => {
      const profile = new Profile('NotGood').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
      profile.parent = 'Patient';
      const nameRule = new CaretValueRule('').withFile('Wrong.fsh').withLocation([3, 8, 3, 18]);
      nameRule.caretPath = 'name';
      nameRule.value = 'Not-good';
      profile.rules.push(nameRule);
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.name).toBe('Not-good');
      expect(loggerSpy.getLastMessage()).toMatch(
        /may not be suitable for machine processing applications such as code generation/s
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: Wrong\.fsh.*Line: 3\D*/s);
    });

    it('should sanitize the id and log a message when a valid name is used to make an invalid id', () => {
      const profile = new Profile('Not_good_id').withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
      profile.parent = 'Patient';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.name).toBe('Not_good_id');
      expect(exported.id).toBe('Not-good-id');
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /The string "Not_good_id" represents a valid FHIR name but not a valid FHIR id.*The id will be exported as "Not-good-id"/s
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
    });

    it('should sanitize the id and log a message when a long valid name is used to make an invalid id', () => {
      let longId = 'Toolong';
      while (longId.length < 65) longId += 'longer';
      const profile = new Profile(longId).withFile('Wrong.fsh').withLocation([2, 8, 5, 18]);
      profile.parent = 'Basic';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      const expectedId = longId.slice(0, 64);
      expect(exported.name).toBe(longId);
      expect(exported.id).toBe(expectedId);
      const warning = new RegExp(
        `The string "${longId}" represents a valid FHIR name but not a valid FHIR id.*The id will be exported as "${expectedId}"`,
        's'
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(warning);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Wrong\.fsh.*Line: 2 - 5\D*/s);
    });

    it('should log error messages for validation errors on the StructureDefinition', () => {
      const profile = new Profile('MyPatientProfile');
      profile.parent = 'Patient';
      profile.id = 'my-patient';
      doc.profiles.set(profile.name, profile);

      const errorsSpy = jest
        .spyOn(StructureDefinition.prototype, 'validate')
        .mockReturnValue([
          new ValidationError('issue1', 'fhirPath1'),
          new ValidationError('issue2', 'fhirPath2')
        ]);

      exporter.exportStructDef(profile);

      expect(loggerSpy.getMessageAtIndex(-1, 'error')).toMatch(/fhirPath2: issue2/);
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/fhirPath1: issue1/);

      const exported = pkg.profiles[0];
      expect(exported.name).toBe('MyPatientProfile');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Patient');

      errorsSpy.mockRestore();
    });
  });

  describe('#Parents', () => {
    it('should create a profile when the definition specifies a resource for a parent', () => {
      const profile = new Profile('MyPatientProfile');
      profile.parent = 'Patient';
      profile.id = 'my-patient';
      doc.profiles.set(profile.name, profile);

      expect(() => {
        exporter.exportStructDef(profile);
      }).not.toThrow();

      const exported = pkg.profiles[0];
      expect(exported.name).toBe('MyPatientProfile');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Patient');
    });

    it('should create a profile when the definition specifies another profile for a parent', () => {
      const profile = new Profile('MyPatientProfile');
      profile.parent = 'us-core-patient';
      profile.id = 'my-patient';
      doc.profiles.set(profile.name, profile);

      expect(() => {
        exporter.exportStructDef(profile);
      }).not.toThrow();

      const exported = pkg.profiles[0];
      expect(exported.name).toBe('MyPatientProfile');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      );
    });

    it('should create a profile when the definition specifies a complex data type for a parent', () => {
      const profile = new Profile('MyAddressProfile');
      profile.parent = 'Address';
      profile.id = 'my-address';
      doc.profiles.set(profile.name, profile);

      expect(() => {
        exporter.exportStructDef(profile);
      }).not.toThrow();

      const exported = pkg.profiles[0];
      expect(exported.name).toBe('MyAddressProfile');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Address');
    });

    it('should create a profile when the definition specifies a primitive data type for a parent', () => {
      const profile = new Profile('MyDateTimeProfile');
      profile.parent = 'dateTime';
      profile.id = 'my-datetime';
      doc.profiles.set(profile.name, profile);

      expect(() => {
        exporter.exportStructDef(profile);
      }).not.toThrow();

      const exported = pkg.profiles[0];
      expect(exported.name).toBe('MyDateTimeProfile');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/dateTime');
    });

    it('should create an extension with default parent of base Extension when the definition does not specify a parent', () => {
      const extension = new Extension('MyExtension');
      extension.id = 'my-extension';
      doc.extensions.set(extension.name, extension);

      expect(() => {
        exporter.exportStructDef(extension);
      }).not.toThrow();

      const exported = pkg.extensions[0];
      expect(exported.name).toBe('MyExtension');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Extension');
    });

    it('should create an extension when the definition specifies the base Extension for a parent', () => {
      const extension = new Extension('MyExtension');
      extension.parent = 'Extension';
      extension.id = 'my-extension';
      doc.extensions.set(extension.name, extension);

      expect(() => {
        exporter.exportStructDef(extension);
      }).not.toThrow();

      const exported = pkg.extensions[0];
      expect(exported.name).toBe('MyExtension');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Extension');
    });

    it('should create an extension when the definition specifies another extension for a parent', () => {
      const extension = new Extension('MyFamilyHistoryExtension');
      extension.parent = 'familymemberhistory-type';
      extension.id = 'my-family-history';
      doc.extensions.set(extension.name, extension);

      expect(() => {
        exporter.exportStructDef(extension);
      }).not.toThrow();

      const exported = pkg.extensions[0];
      expect(exported.name).toBe('MyFamilyHistoryExtension');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/familymemberhistory-type'
      );
    });

    it('should create a logical model with default parent of Base when the definition does not specify a parent', () => {
      const logical = new Logical('MyPatientModel');
      logical.id = 'PatientModel';
      doc.logicals.set(logical.name, logical);

      expect(() => {
        exporter.exportStructDef(logical);
      }).not.toThrow();

      const exported = pkg.logicals[0];
      expect(exported.name).toBe('MyPatientModel');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Base');
    });

    it('should create a logical model when the definition specifies Element for a parent', () => {
      const logical = new Logical('MyPatientModel');
      logical.parent = 'Element';
      logical.id = 'PatientModel';
      doc.logicals.set(logical.name, logical);

      expect(() => {
        exporter.exportStructDef(logical);
      }).not.toThrow();

      const exported = pkg.logicals[0];
      expect(exported.name).toBe('MyPatientModel');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Element');
      // When the parent is defined as Element, the Element.extension values
      // should not have been brought forward
      expect(exported.elements[0].extension).toBeUndefined();
    });

    it('should create a logical model when the definition specifies another logical model for a parent', () => {
      const logical = new Logical('MyIdentificationModel');
      logical.parent = 'AlternateIdentification';
      logical.id = 'my-identification';
      doc.logicals.set(logical.name, logical);

      expect(() => {
        exporter.exportStructDef(logical);
      }).not.toThrow();

      const exported = pkg.logicals[0];
      expect(exported.name).toBe('MyIdentificationModel');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/cda/StructureDefinition/AlternateIdentification'
      );
    });

    it('should create a resource with default parent of DomainResource when the definition does not specify a parent', () => {
      const resource = new Resource('MyPatientResource');
      resource.id = 'PatientResource';
      doc.resources.set(resource.name, resource);

      expect(() => {
        exporter.exportStructDef(resource);
      }).not.toThrow();

      const exported = pkg.resources[0];
      expect(exported.name).toBe('MyPatientResource');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/DomainResource'
      );
    });

    it('should create a resource when the definition specifies Resource for a parent', () => {
      const resource = new Resource('MyPatientResource');
      resource.parent = 'Resource';
      resource.id = 'PatientResource';
      doc.resources.set(resource.name, resource);

      expect(() => {
        exporter.exportStructDef(resource);
      }).not.toThrow();

      const exported = pkg.resources[0];
      expect(exported.name).toBe('MyPatientResource');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Resource');
    });

    it('should throw ParentNotProvidedError when parent specifies an empty parent', () => {
      const profile = new Profile('Foo');
      profile.parent = '';
      doc.profiles.set(profile.name, profile);
      expect(() => {
        exporter.exportStructDef(profile);
      }).toThrow('The definition for Foo does not include a Parent');
    });

    it('should throw ParentNotDefinedError when parent is not found', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Bar';
      doc.profiles.set(profile.name, profile);
      expect(() => {
        exporter.exportStructDef(profile);
      }).toThrow('Parent Bar not found for Foo');
    });

    it('should throw ParentNameConflictError when the parent name is shared by a valid-type FHIR resource and an invalid-type tank resource', () => {
      // This happens if a resource in the tank has the same name as a resource in the package
      const valueSet = new FshValueSet('PractitionerRole');
      doc.valueSets.set(valueSet.name, valueSet);
      const profile = new Profile('Foo');
      profile.parent = 'PractitionerRole';
      doc.profiles.set(profile.name, profile);

      expect(() => {
        exporter.exportStructDef(profile);
      }).toThrow(
        "Parent PractitionerRole for Foo is defined as a ValueSet in FSH, which can't be used as a parent. A FHIR definition also exists with this name. If you intended to use that, reference it by its URL."
      );
    });

    it('should throw ParentDeclaredAsNameError when the extension declares itself as the parent', () => {
      const extension = new Extension('Foo');
      extension.parent = 'Foo';
      doc.extensions.set(extension.name, extension);
      expect(() => {
        exporter.exportStructDef(extension);
      }).toThrow('Extension "Foo" cannot declare itself as a Parent.');
    });

    it('should throw ParentDeclaredAsIdError when a extension sets the same value for parent and id', () => {
      const parentExtension = new Extension('InitialExtension');
      parentExtension.id = 'ParentExtension';
      doc.extensions.set(parentExtension.name, parentExtension);

      const childExtension = new Extension('OverlappingExtension');
      childExtension.parent = 'InitialExtension';
      childExtension.id = 'InitialExtension';
      doc.extensions.set(childExtension.name, childExtension);

      expect(() => {
        exporter.exportStructDef(childExtension);
      }).toThrow(
        'Extension "OverlappingExtension" cannot declare "InitialExtension" as both Parent and Id.'
      );
    });

    it('should throw ParentDeclaredAsNameError when the profile declares itself as the parent', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Foo';
      doc.profiles.set(profile.name, profile);
      expect(() => {
        exporter.exportStructDef(profile);
      }).toThrow('Profile "Foo" cannot declare itself as a Parent.');
    });

    it('should throw ParentDeclaredAsNameError and suggest resource URL when the profile declares itself as the parent and it is a FHIR resource', () => {
      const profile = new Profile('Patient');
      profile.parent = 'Patient';
      doc.profiles.set(profile.name, profile);
      expect(() => {
        exporter.exportStructDef(profile);
      }).toThrow(
        'Profile "Patient" cannot declare itself as a Parent. It looks like the parent is an external resource; use its URL (e.g., http://hl7.org/fhir/StructureDefinition/Patient).'
      );
    });

    it('should throw ParentDeclaredAsIdError when a profile sets the same value for parent and id', () => {
      const parentProfile = new Profile('InitialProfile');
      parentProfile.id = 'ParentProfile';
      doc.profiles.set(parentProfile.name, parentProfile);

      const childProfile = new Profile('OverlappingProfile');
      childProfile.parent = 'InitialProfile';
      childProfile.id = 'InitialProfile';
      doc.profiles.set(childProfile.name, childProfile);

      expect(() => {
        exporter.exportStructDef(childProfile);
      }).toThrow(
        'Profile "OverlappingProfile" cannot declare "InitialProfile" as both Parent and Id.'
      );
    });

    it('should throw ParentDeclaredAsIdError and suggest resource URL when a profile sets the same value for parent and id and the parent is a FHIR resource', () => {
      const profile = new Profile('KidsFirstPatient');
      profile.parent = 'Patient';
      profile.id = 'Patient';
      doc.profiles.set(profile.name, profile);
      expect(() => {
        exporter.exportStructDef(profile);
      }).toThrow(
        'Profile "KidsFirstPatient" cannot declare "Patient" as both Parent and Id. It looks like the parent is an external resource; use its URL (e.g., http://hl7.org/fhir/StructureDefinition/Patient).'
      );
    });

    it('should throw ParentDeclaredAsNameError when the resource declares itself as the parent', () => {
      const resource = new Resource('Foo');
      resource.parent = 'Foo';
      doc.resources.set(resource.name, resource);
      expect(() => {
        exporter.exportStructDef(resource);
      }).toThrow('Resource "Foo" cannot declare itself as a Parent.');
    });

    it('should throw ParentDeclaredAsIdError when a resource sets the same value for parent and id', () => {
      const parentResource = new Resource('InitialResource');
      parentResource.id = 'ParentExtension';
      doc.resources.set(parentResource.name, parentResource);

      const childResource = new Resource('OverlappingResource');
      childResource.parent = 'InitialResource';
      childResource.id = 'InitialResource';
      doc.resources.set(childResource.name, childResource);

      expect(() => {
        exporter.exportStructDef(childResource);
      }).toThrow(
        'Resource "OverlappingResource" cannot declare "InitialResource" as both Parent and Id.'
      );
    });

    it('should throw ParentDeclaredAsNameError when the logical model declares itself as the parent', () => {
      const logical = new Logical('Foo');
      logical.parent = 'Foo';
      doc.logicals.set(logical.name, logical);
      expect(() => {
        exporter.exportStructDef(logical);
      }).toThrow('Logical "Foo" cannot declare itself as a Parent.');
    });

    it('should throw ParentDeclaredAsNameError and suggest resource URL when the logical model declares itself as the parent and it is a FHIR resource', () => {
      const logical = new Logical('Patient');
      logical.parent = 'Patient';
      doc.logicals.set(logical.name, logical);
      expect(() => {
        exporter.exportStructDef(logical);
      }).toThrow(
        'Logical "Patient" cannot declare itself as a Parent. It looks like the parent is an external resource; use its URL (e.g., http://hl7.org/fhir/StructureDefinition/Patient).'
      );
    });

    it('should throw ParentDeclaredAsIdError when a logical model sets the same value for parent and id', () => {
      const parentLogical = new Logical('InitialLogical');
      parentLogical.id = 'ParentLogical';
      doc.logicals.set(parentLogical.name, parentLogical);

      const childLogical = new Logical('OverlappingLogical');
      childLogical.parent = 'InitialLogical';
      childLogical.id = 'InitialLogical';
      doc.logicals.set(childLogical.name, childLogical);

      expect(() => {
        exporter.exportStructDef(childLogical);
      }).toThrow(
        'Logical "OverlappingLogical" cannot declare "InitialLogical" as both Parent and Id.'
      );
    });

    it('should throw ParentDeclaredAsIdError and suggest resource URL when a logical model sets the same value for parent and id and the parent is a FHIR resource', () => {
      const logical = new Logical('KidsFirstPatient');
      logical.parent = 'Patient';
      logical.id = 'Patient';
      doc.logicals.set(logical.name, logical);
      expect(() => {
        exporter.exportStructDef(logical);
      }).toThrow(
        'Logical "KidsFirstPatient" cannot declare "Patient" as both Parent and Id. It looks like the parent is an external resource; use its URL (e.g., http://hl7.org/fhir/StructureDefinition/Patient).'
      );
    });

    it('should throw InvalidExtensionParentError when an extension has a non-extension for a parent', () => {
      const extension = new Extension('MyPatientExtension');
      extension.parent = 'Patient';
      extension.id = 'PatientExt';
      doc.extensions.set(extension.name, extension);
      expect(() => {
        exporter.exportStructDef(extension);
      }).toThrow(
        'Invalid parent Patient specified for extension MyPatientExtension. The parent of an extension must be the base Extension or another defined extension.'
      );
    });

    it('should throw InvalidLogicalParentError when a logical model has a profile for a parent', () => {
      const logical = new Logical('MyGroupModel');
      logical.parent = 'actualgroup'; // Profile
      logical.id = 'GroupModel';
      doc.logicals.set(logical.name, logical);
      expect(() => {
        exporter.exportStructDef(logical);
      }).toThrow(
        'Invalid parent Actual Group specified for logical model MyGroupModel. The parent of a logical model must be Element, Base, another logical model, a resource, or a type.'
      );
    });

    it('should throw InvalidResourceParentError when a resource does not have Resource or DomainResource for a parent', () => {
      const resource = new Resource('MyCustomPatient');
      resource.parent = 'Patient';
      resource.id = 'CustomPatient';
      doc.resources.set(resource.name, resource);
      expect(() => {
        exporter.exportStructDef(resource);
      }).toThrow(
        'Invalid parent Patient specified for resource MyCustomPatient. The parent of a resource must be Resource or DomainResource.'
      );
    });
  });

  describe('#Profile', () => {
    it('should set all user-provided metadata for a profile', () => {
      const profile = new Profile('Foo');
      profile.id = 'foo';
      profile.parent = 'Observation';
      profile.title = 'Foo Profile';
      profile.description = 'foo bar foobar';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('foo');
      expect(exported.title).toBe('Foo Profile');
      expect(exported.description).toBe('foo bar foobar');
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/foo');
      expect(exported.type).toBe('Observation');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Observation');
    });

    it('should properly set/clear all metadata properties for a profile', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];

      expect(exported.id).toBe('Foo'); // defaulted from user-provided name
      expect(exported.meta).toBeUndefined();
      expect(exported.implicitRules).toBeUndefined();
      expect(exported.language).toBeUndefined();
      expect(exported.text).toBeUndefined();
      expect(exported.contained).toBeUndefined(); // inherited from Observation
      expect(exported.extension).toBeUndefined(); // uninherited extensions are filtered out
      expect(exported.modifierExtension).toBeUndefined();
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'); // constructed from canonical and id
      expect(exported.identifier).toBeUndefined();
      expect(exported.name).toBe('Foo'); // provided by user
      expect(exported.title).toBeUndefined();
      expect(exported.status).toBe('draft'); // always draft
      expect(exported.experimental).toBeUndefined();
      expect(exported.date).toBeUndefined();
      expect(exported.publisher).toBeUndefined();
      expect(exported.contact).toBeUndefined();
      expect(exported.description).toBeUndefined();
      expect(exported.useContext).toBeUndefined();
      expect(exported.jurisdiction).toBeUndefined();
      expect(exported.purpose).toBeUndefined();
      expect(exported.copyright).toBeUndefined();
      expect(exported.keyword).toBeUndefined();
      expect(exported.fhirVersion).toBe('4.0.1'); // Inherited from Observation
      expect(exported.mapping).toEqual([
        { identity: 'workflow', uri: 'http://hl7.org/fhir/workflow', name: 'Workflow Pattern' },
        {
          identity: 'sct-concept',
          uri: 'http://snomed.info/conceptdomain',
          name: 'SNOMED CT Concept Domain Binding'
        },
        { identity: 'v2', uri: 'http://hl7.org/v2', name: 'HL7 v2 Mapping' },
        { identity: 'rim', uri: 'http://hl7.org/v3', name: 'RIM Mapping' },
        { identity: 'w5', uri: 'http://hl7.org/fhir/fivews', name: 'FiveWs Pattern Mapping' },
        {
          identity: 'sct-attr',
          uri: 'http://snomed.org/attributebinding',
          name: 'SNOMED CT Attribute Binding'
        }
      ]); // inherited from Observation
      expect(exported.kind).toBe('resource'); // inherited from Observation
      expect(exported.abstract).toBe(false); // always abstract
      expect(exported.context).toBeUndefined(); // inherited from Observation
      expect(exported.contextInvariant).toBeUndefined(); // inherited from Observation
      expect(exported.type).toBe('Observation'); // inherited from Observation
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Observation'); // url for Observation
      expect(exported.derivation).toBe('constraint'); // always constraint
    });

    it('should remove inherited top-level underscore-prefixed metadata properties for a profile', () => {
      const jsonModifiedObservation = defs.fishForFHIR('Observation');
      jsonModifiedObservation.id = 'ModifiedObservation';
      jsonModifiedObservation.name = 'ModifiedObservation';
      jsonModifiedObservation.url = 'http://example.org/sd/ModifiedObservation';
      jsonModifiedObservation._baseDefinition = {
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-codegen-super',
            valueString: 'MetadataResource'
          }
        ]
      };
      pkg.resources.push(StructureDefinition.fromJSON(jsonModifiedObservation));

      const profile = new Profile('Foo');
      profile.parent = 'ModifiedObservation';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.baseDefinition).toBe('http://example.org/sd/ModifiedObservation'); // url for ModifiedObservation
      // @ts-ignore
      expect(exported._baseDefinition).toBeUndefined(); // should be stripped out
    });

    it('should only inherit inheritable extensions for a profile', () => {
      const parent = new Profile('FooParent');
      parent.parent = 'Observation';
      // Set a few uninheritable extensions
      const fmmRule = new CaretValueRule('');
      fmmRule.caretPath =
        'extension[http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm].valueInteger';
      fmmRule.value = 2;
      const wgRule = new CaretValueRule('');
      wgRule.caretPath =
        'extension[http://hl7.org/fhir/StructureDefinition/structuredefinition-wg].valueCode';
      wgRule.value = new FshCode('cds');
      // Set a few inheritable extensions
      const ancestorRule = new CaretValueRule('');
      ancestorRule.caretPath =
        'extension[http://hl7.org/fhir/StructureDefinition/structuredefinition-ancestor].valueUri';
      ancestorRule.value = 'http://example.org/some/ancestor';
      const xmlNoOrderRule = new CaretValueRule('');
      xmlNoOrderRule.caretPath =
        'extension[http://hl7.org/fhir/StructureDefinition/structuredefinition-xml-no-order].valueBoolean';
      xmlNoOrderRule.value = true;
      parent.rules.push(fmmRule, wgRule, ancestorRule, xmlNoOrderRule);
      doc.profiles.set(parent.name, parent);
      exporter.exportStructDef(parent);

      const profile = new Profile('Foo');
      profile.parent = 'FooParent';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);

      const exportedParent = pkg.profiles.find(p => p.id === 'FooParent');
      expect(exportedParent).toBeDefined();
      // The parent should have all the extensions it defined
      expect(exportedParent?.extension).toEqual([
        { url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm', valueInteger: 2 },
        { url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg', valueCode: 'cds' },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-ancestor',
          valueUri: 'http://example.org/some/ancestor'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-xml-no-order',
          valueBoolean: true
        }
      ]);

      const exported = pkg.profiles.find(p => p.id === 'Foo');
      expect(exported).toBeDefined();
      // The following extensions should be stripped out as uninherited extensions:
      // { url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm', valueInteger: 2 },
      // { url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg', valueCode: 'cds' },
      //
      // BUT the following should extensions should remain:
      expect(exported?.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-ancestor',
          valueUri: 'http://example.org/some/ancestor'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-xml-no-order',
          valueBoolean: true
        }
      ]);
    });

    it('should not overwrite metadata that is not given for a profile', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('Foo');
      expect(exported.title).toBeUndefined();
      expect(exported.description).toBeUndefined();
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');
      expect(exported.type).toBe('Observation');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Observation');
      expect(exported.derivation).toBe('constraint');
    });

    it('should allow metadata to be overwritten with caret rule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      const rule = new CaretValueRule('');
      rule.caretPath = 'status';
      rule.value = new FshCode('draft');
      profile.rules.push(rule);
      doc.profiles.set(profile.name, profile);
      exporter.exportStructDef(profile);
      const exported = pkg.profiles[0];
      expect(exported.name).toBe('Foo');
      expect(exported.status).toBe('draft');
    });

    it('should log an error when multiple profiles have the same id', () => {
      const firstProfile = new Profile('FirstProfile')
        .withFile('Profiles.fsh')
        .withLocation([2, 8, 6, 25]);
      firstProfile.id = 'my-profile';
      firstProfile.parent = 'Basic';
      const secondProfile = new Profile('SecondProfile')
        .withFile('Profiles.fsh')
        .withLocation([8, 8, 11, 25]);
      secondProfile.id = 'my-profile';
      secondProfile.parent = 'Basic';
      doc.profiles.set(firstProfile.name, firstProfile);
      doc.profiles.set(secondProfile.name, secondProfile);
      exporter.export();

      expect(pkg.profiles).toHaveLength(2);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple structure definitions with id my-profile/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Profiles\.fsh.*Line: 8 - 11\D*/s);
    });
  });

  describe('#Profile-Element', () => {
    it('should apply constraints to all instances of contentReference elements when the profile-element extension is applied', () => {
      const profile = new Profile('TestQuestionnaire');
      profile.parent = 'Questionnaire';
      profile.id = 'example-q';

      const containsRule = new ContainsRule('item.extension');
      containsRule.items = [
        {
          name: 'example-slice',
          type: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl'
        }
      ];

      const cardRule = new CardRule('item.extension[example-slice]');
      cardRule.min = 1;
      cardRule.max = '1';

      const profileRule = new CaretValueRule('item');
      profileRule.caretPath = 'type.profile';
      profileRule.value = 'http://hl7.org/fhir/us/minimal/StructureDefinition/example-q';
      const extensionRule = new CaretValueRule('item');
      extensionRule.caretPath = 'type.profile.extension.url';
      extensionRule.value =
        'http://hl7.org/fhir/StructureDefinition/elementdefinition-profile-element';
      const targetElementRule = new CaretValueRule('item');
      targetElementRule.caretPath = 'type.profile.extension.valueString';
      targetElementRule.value = 'Questionnaire.item';

      const assignmentRule = new AssignmentRule('item.item.linkId');
      assignmentRule.value = 'item-2';

      profile.rules.push(
        containsRule,
        cardRule,
        profileRule,
        extensionRule,
        targetElementRule,
        assignmentRule
      );
      doc.profiles.set(profile.name, profile);

      // The slice added to the parent element should be unfolded to the child
      const exportedProfile = exporter.export().profiles[0];
      expect(
        exportedProfile.findElement('Questionnaire.item.item.extension:example-slice')
      ).toBeDefined();
    });

    it('should apply the profile-element extension when there are several extensions in the type.profile array', () => {
      const profile = new Profile('TestQuestionnaire');
      profile.parent = 'Questionnaire';
      profile.id = 'example-q';

      const containsRule = new ContainsRule('item.extension');
      containsRule.items = [
        {
          name: 'example-slice',
          type: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl'
        }
      ];

      const cardRule = new CardRule('item.extension[example-slice]');
      cardRule.min = 1;
      cardRule.max = '1';

      const fakeProfileRule = new CaretValueRule('item');
      fakeProfileRule.caretPath = 'type.profile';
      fakeProfileRule.value = 'http://hl7.org/fhir/us/minimal/StructureDefinition/example-q';
      const fakeExtensionRule = new CaretValueRule('item');
      fakeExtensionRule.caretPath = 'type.profile.extension.url';
      fakeExtensionRule.value = 'http://hl7.org/fhir/us/minimal/StructureDefinition/FakeExtension';
      const fakeTargetElementRule = new CaretValueRule('item');
      fakeTargetElementRule.caretPath = 'type.profile.extension.valueString';
      fakeTargetElementRule.value = 'Foo';

      const profileRule = new CaretValueRule('item');
      profileRule.caretPath = 'type.profile[1]';
      profileRule.value = 'http://hl7.org/fhir/us/minimal/StructureDefinition/example-q';
      const extensionRule = new CaretValueRule('item');
      extensionRule.caretPath = 'type.profile[1].extension.url';
      extensionRule.value =
        'http://hl7.org/fhir/StructureDefinition/elementdefinition-profile-element';
      const targetElementRule = new CaretValueRule('item');
      targetElementRule.caretPath = 'type.profile[1].extension.valueString';
      targetElementRule.value = 'Questionnaire.item';

      const assignmentRule = new AssignmentRule('item.item.linkId');
      assignmentRule.value = 'item-2';

      profile.rules.push(
        containsRule,
        cardRule,
        fakeProfileRule,
        fakeExtensionRule,
        fakeTargetElementRule,
        profileRule,
        extensionRule,
        targetElementRule,
        assignmentRule
      );
      doc.profiles.set(profile.name, profile);

      // The slice added to the parent element should be unfolded to the child
      const exportedProfile = exporter.export().profiles[0];
      expect(
        exportedProfile.findElement('Questionnaire.item.item.extension:example-slice')
      ).toBeDefined();
    });

    it('should not apply constraints to all instances of contentReference elements when the profile-element extension is misapplied', () => {
      const profile = new Profile('TestQuestionnaire2');
      profile.parent = 'Questionnaire';
      profile.id = 'example-q';

      const containsRule = new ContainsRule('item.extension');
      containsRule.items = [
        {
          name: 'example-slice',
          type: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl'
        }
      ];

      const cardRule = new CardRule('item.extension[example-slice]');
      cardRule.min = 1;
      cardRule.max = '1';

      // The extension is targeting another profile
      const profileRule = new CaretValueRule('item');
      profileRule.caretPath = 'type.profile';
      profileRule.value = 'http://hl7.org/fhir/us/minimal/StructureDefinition/wrong-id';
      const extensionRule = new CaretValueRule('item');
      extensionRule.caretPath = 'type.profile.extension.url';
      extensionRule.value =
        'http://hl7.org/fhir/StructureDefinition/elementdefinition-profile-element';
      const targetElementRule = new CaretValueRule('item');
      targetElementRule.caretPath = 'type.profile.extension.valueString';
      targetElementRule.value = 'Questionnaire.item';

      const assignmentRule = new AssignmentRule('item.item.linkId');
      assignmentRule.value = 'item-2';

      profile.rules.push(
        containsRule,
        cardRule,
        profileRule,
        extensionRule,
        targetElementRule,
        assignmentRule
      );
      doc.profiles.set(profile.name, profile);

      // The slice added to the parent element should be unfolded to the child
      const exportedProfile = exporter.export().profiles[0];
      expect(
        exportedProfile.findElement('Questionnaire.item.item.extension:example-slice')
      ).not.toBeDefined();
    });
  });

  describe('#Extension', () => {
    it('should set all user-provided metadata for an extension', () => {
      const extension = new Extension('Foo');
      extension.id = 'foo';
      extension.title = 'Foo Profile';
      extension.description = 'foo bar foobar';
      extension.contexts = [
        {
          value: '(Condition | Observation).code',
          isQuoted: true
        },
        {
          value: 'http://hl7.org/fhir/StructureDefinition/cqf-library',
          isQuoted: false
        },
        {
          value: 'Address.period.start',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      exporter.exportStructDef(extension);
      const exported = pkg.extensions[0];
      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('foo');
      expect(exported.title).toBe('Foo Profile');
      expect(exported.elements[0].short).toBe('Foo Profile');
      expect(exported.description).toBe('foo bar foobar');
      expect(exported.elements[0].definition).toBe('foo bar foobar');
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/foo');
      expect(exported.type).toBe('Extension');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Extension');
      expect(exported.context).toEqual([
        {
          expression: '(Condition | Observation).code',
          type: 'fhirpath'
        },
        {
          expression: 'http://hl7.org/fhir/StructureDefinition/cqf-library',
          type: 'extension'
        },
        {
          expression: 'Address.period.start',
          type: 'element'
        }
      ]);

      // Check that Extension.url is correctly assigned
      expect(exported.elements.find(e => e.id === 'Extension.url').fixedUri).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/foo'
      );
    });

    it('should not set metadata on the root element when applyExtensionMetadataToRoot is false', () => {
      const config: Configuration = { ...minimalConfig, applyExtensionMetadataToRoot: false };
      const tank = new FSHTank([doc], config);
      const testExporter = new StructureDefinitionExporter(tank, pkg, fisher);
      const extension = new Extension('Foo');
      extension.id = 'foo';
      extension.title = 'Foo Profile';
      extension.description = 'foo bar foobar';
      doc.extensions.set(extension.name, extension);
      testExporter.exportStructDef(extension);
      const exported = pkg.extensions[0];
      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('foo');
      expect(exported.title).toBe('Foo Profile');
      expect(exported.elements[0].short).toBe('Optional Extensions Element');
      expect(exported.description).toBe('foo bar foobar');
      expect(exported.elements[0].definition).toBe(
        'Optional Extension Element - found in all resources.'
      );
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/foo');
      expect(exported.type).toBe('Extension');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Extension');

      // Check that Extension.url is correctly assigned
      expect(exported.elements.find(e => e.id === 'Extension.url').fixedUri).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/foo'
      );
    });

    it('should properly set/clear all metadata properties for an extension', () => {
      const extension = new Extension('Foo');
      extension.parent = 'patient-mothersMaidenName';
      doc.extensions.set(extension.name, extension);
      exporter.exportStructDef(extension);
      const exported = pkg.extensions[0];

      expect(exported.id).toBe('Foo'); // defaulted from user-provided name
      expect(exported.meta).toBeUndefined();
      expect(exported.implicitRules).toBeUndefined();
      expect(exported.language).toBeUndefined();
      expect(exported.text).toBeUndefined();
      expect(exported.contained).toBeUndefined(); // inherited from patient-mothersMaidenName
      expect(exported.extension).toBeUndefined(); // uninherited extensions are filtered out
      expect(exported.modifierExtension).toBeUndefined();
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'); // constructed from canonical and id
      expect(exported.identifier).toBeUndefined();
      expect(exported.version).toBeUndefined();
      expect(exported.name).toBe('Foo'); // provided by user
      expect(exported.title).toBeUndefined();
      expect(exported.status).toBe('draft'); // always draft
      expect(exported.experimental).toBeUndefined();
      expect(exported.date).toBeUndefined();
      expect(exported.publisher).toBeUndefined();
      expect(exported.contact).toBeUndefined();
      expect(exported.description).toBeUndefined();
      expect(exported.useContext).toBeUndefined();
      expect(exported.jurisdiction).toBeUndefined();
      expect(exported.purpose).toBeUndefined();
      expect(exported.copyright).toBeUndefined();
      expect(exported.keyword).toBeUndefined();
      expect(exported.fhirVersion).toBe('4.0.1'); // Inherited from patient-mothersMaidenName
      expect(exported.mapping).toEqual([
        { identity: 'v2', uri: 'http://hl7.org/v2', name: 'HL7 v2 Mapping' },
        { identity: 'rim', uri: 'http://hl7.org/v3', name: 'RIM Mapping' }
      ]); // inherited from patient-mothersMaidenName
      expect(exported.kind).toBe('complex-type'); // inherited from patient-mothersMaidenName
      expect(exported.abstract).toBe(false); // always abstract
      expect(exported.context).toEqual([{ type: 'element', expression: 'Patient' }]); // inherited from patient-mothersMaidenName
      expect(exported.contextInvariant).toBeUndefined(); // inherited from patient-mothersMaidenName
      expect(exported.type).toBe('Extension'); // inherited from patient-mothersMaidenName
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      ); // url for patient-mothersMaidenName
      expect(exported.derivation).toBe('constraint'); // always constraint

      // Check that Extension.url is correctly assigned
      // Since the parent fixed this value, it should be the same as the parent
      expect(exported.elements.find(e => e.id === 'Extension.url').fixedUri).toBe(
        'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      );
    });

    it('should remove inherited top-level underscore-prefixed metadata properties for an extension', () => {
      const jsonModifiedPatientMothersMaidenName = defs.fishForFHIR('patient-mothersMaidenName');
      jsonModifiedPatientMothersMaidenName.id = 'ModifiedPatientMothersMaidenName';
      jsonModifiedPatientMothersMaidenName.name = 'ModifiedPatientMothersMaidenName';
      jsonModifiedPatientMothersMaidenName.url =
        'http://example.org/sd/ModifiedPatientMothersMaidenName';
      jsonModifiedPatientMothersMaidenName._baseDefinition = {
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-codegen-super',
            valueString: 'MetadataResource'
          }
        ]
      };
      pkg.extensions.push(StructureDefinition.fromJSON(jsonModifiedPatientMothersMaidenName));

      const extension = new Extension('Foo');
      extension.parent = 'ModifiedPatientMothersMaidenName';
      doc.extensions.set(extension.name, extension);
      exporter.exportStructDef(extension);
      const exported = pkg.extensions[1];
      expect(exported.baseDefinition).toBe(
        'http://example.org/sd/ModifiedPatientMothersMaidenName'
      ); // url for ModifiedPatientMothersMaidenName
      // @ts-ignore
      expect(exported._baseDefinition).toBeUndefined(); // should be stripped out
    });

    it('should overwrite parent context when a new context is set', () => {
      const extension = new Extension('Foo');
      extension.parent = 'patient-mothersMaidenName';
      extension.contexts = [
        {
          value: '(Condition | Observation).code',
          isQuoted: true
        }
      ];
      doc.extensions.set(extension.name, extension);
      exporter.exportStructDef(extension);
      const exported = pkg.extensions[0];
      expect(exported.context).toEqual([
        {
          expression: '(Condition | Observation).code',
          type: 'fhirpath'
        }
      ]);
    });

    it('should not overwrite metadata that is not given for an extension', () => {
      const extension = new Extension('Foo');
      doc.extensions.set(extension.name, extension);
      exporter.exportStructDef(extension);
      const exported = pkg.extensions[0];
      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('Foo');
      expect(exported.title).toBeUndefined();
      expect(exported.elements[0].short).toBe('Optional Extensions Element');
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');
      expect(exported.elements.find(e => e.id === 'Extension.url').fixedUri).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'
      );
      expect(exported.version).toBeUndefined();
      expect(exported.context).toEqual([
        {
          type: 'element',
          expression: 'Element'
        }
      ]);
      expect(exported.type).toBe('Extension');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Extension');
      expect(exported.derivation).toBe('constraint');
    });

    it('should export sub-extensions, with similar starting names and different types', () => {
      const ruleString = new OnlyRule('extension[Foo].value[x]');
      ruleString.types = [{ type: 'string' }];
      const ruleDecimal = new OnlyRule('extension[FooBar].value[x]');
      ruleDecimal.types = [{ type: 'decimal' }];
      const exParent = new Extension('Parent');

      const FooFooCardRule = new CardRule('extension[Foo]');
      FooFooCardRule.min = 1;
      FooFooCardRule.max = '1'; // * extension[sliceB].extension 1..1

      const FooBarCardRule = new CardRule('extension[FooBar]');
      FooBarCardRule.min = 0;
      FooBarCardRule.max = '1'; // * extension[sliceB].extension 0..0

      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'Foo' }, { name: 'FooBar' }];

      exParent.rules.push(containsRule, FooFooCardRule, FooBarCardRule, ruleString, ruleDecimal);

      exporter.exportStructDef(exParent);
      const sd = pkg.extensions[0];
      const extension = sd.elements.find(e => e.id === 'Extension.extension:FooBar.value[x]');
      expect(extension.type[0].code).toBe('decimal');
    });

    it('should not hardcode in the default context if parent already had a context', () => {
      const extension = new Extension('Foo');
      extension.parent = 'http://hl7.org/fhir/StructureDefinition/patient-animal';
      doc.extensions.set(extension.name, extension);
      exporter.exportStructDef(extension);
      const exported = pkg.extensions[0];
      expect(exported.context).toEqual([
        {
          type: 'element',
          expression: 'Patient'
        }
      ]);
    });

    it('should allow metadata to be overwritten with caret rule', () => {
      const extension = new Extension('Foo');
      const rule1 = new CaretValueRule('');
      rule1.caretPath = 'status';
      rule1.value = new FshCode('draft');
      const rule2 = new CaretValueRule('');
      rule2.caretPath = 'context[0].type';
      rule2.value = new FshCode('element');
      const rule3 = new CaretValueRule('');
      rule3.caretPath = 'context[0].expression';
      rule3.value = 'Observation';
      extension.rules.push(rule1, rule2, rule3);
      doc.extensions.set(extension.name, extension);
      exporter.exportStructDef(extension);
      const exported = pkg.extensions[0];
      expect(exported.name).toBe('Foo');
      expect(exported.status).toBe('draft');
      expect(exported.context).toEqual([
        {
          type: 'element',
          expression: 'Observation'
        }
      ]);
    });

    it('should log an error when multiple extensions have the same id', () => {
      const firstExtension = new Extension('FirstExtension')
        .withFile('Extensions.fsh')
        .withLocation([3, 8, 7, 22]);
      firstExtension.id = 'my-extension';
      const secondExtension = new Extension('SecondExtension')
        .withFile('Extensions.fsh')
        .withLocation([11, 8, 15, 29]);
      secondExtension.id = 'my-extension';
      doc.extensions.set(firstExtension.name, firstExtension);
      doc.extensions.set(secondExtension.name, secondExtension);

      exporter.export();
      expect(pkg.extensions).toHaveLength(2);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple structure definitions with id my-extension/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Extensions\.fsh.*Line: 11 - 15\D*/s);
    });

    it('should log an error when a profile and an extension have the same id', () => {
      const profile = new Profile('MyProfile').withFile('Profiles.fsh').withLocation([2, 8, 5, 15]);
      profile.id = 'custom-definition';
      profile.parent = 'Basic';
      const extension = new Extension('MyExtension')
        .withFile('Extensions.fsh')
        .withLocation([3, 8, 5, 19]);
      extension.id = 'custom-definition';
      doc.profiles.set(profile.name, profile);
      doc.extensions.set(extension.name, extension);

      exporter.export();
      expect(pkg.profiles).toHaveLength(1);
      expect(pkg.extensions).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple structure definitions with id custom-definition/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Extensions\.fsh.*Line: 3 - 5\D*/s);
    });
  });

  describe('#LogicalModel', () => {
    it('should have the correct baseDefinition of Base when parent is not provided', () => {
      const logical = new Logical('Foo');
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('Foo');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Base');
    });

    it('should have the correct baseDefinition for a provided parent', () => {
      const logical = new Logical('Foo');
      logical.parent = 'AlternateIdentification';
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('Foo');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/cda/StructureDefinition/AlternateIdentification'
      );
    });

    it('should set all user-provided metadata for a logical model', () => {
      const logical = new Logical('Foo');
      logical.id = 'foo';
      logical.title = 'Logical Foo Model';
      logical.description = 'foo bar foobar';
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('foo');
      expect(exported.title).toBe('Logical Foo Model');
      expect(exported.description).toBe('foo bar foobar');
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/foo');
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/foo');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Base');
    });

    it('should properly set/clear all metadata properties for a logical model', () => {
      const logical = new Logical('Foo');
      logical.parent = 'AlternateIdentification';
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.id).toBe('Foo'); // defaulted from user-provided name
      expect(exported.meta).toBeUndefined();
      expect(exported.implicitRules).toBeUndefined();
      expect(exported.language).toBeUndefined();
      expect(exported.text).toBeUndefined();
      expect(exported.contained).toBeUndefined();
      expect(exported.modifierExtension).toBeUndefined();
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'); // constructed from canonical and id
      expect(exported.identifier).toBeUndefined();
      expect(exported.version).toBeUndefined();
      expect(exported.name).toBe('Foo'); // provided by user
      expect(exported.title).toBeUndefined();
      expect(exported.status).toBe('draft'); // always draft
      expect(exported.experimental).toBeUndefined();
      expect(exported.date).toBeUndefined();
      expect(exported.publisher).toBeUndefined();
      expect(exported.contact).toBeUndefined();
      expect(exported.description).toBeUndefined();
      expect(exported.useContext).toBeUndefined();
      expect(exported.jurisdiction).toBeUndefined();
      expect(exported.purpose).toBeUndefined();
      expect(exported.copyright).toBeUndefined();
      expect(exported.keyword).toBeUndefined();
      expect(exported.fhirVersion).toBe('4.0.1'); // Inherited from AlternateIdentification
      expect(exported.mapping).toBeUndefined(); // inherited from AlternateIdentification
      expect(exported.kind).toBe('logical'); // inherited from AlternateIdentification
      expect(exported.abstract).toBe(false); // always abstract
      expect(exported.context).toBeUndefined(); // inherited from AlternateIdentification
      expect(exported.contextInvariant).toBeUndefined(); // inherited from AlternateIdentification
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/cda/StructureDefinition/AlternateIdentification'
      ); // url for AlternateIdentification
      expect(exported.derivation).toBe('specialization'); // always specialization for logical models
    });

    it('should remove inherited top-level underscore-prefixed metadata properties for a logical model', () => {
      const jsonModifiedAltID = defs.fishForFHIR('AlternateIdentification');
      jsonModifiedAltID.id = 'ModifiedAlternateIdentification';
      jsonModifiedAltID.name = 'ModifiedAlternateIdentification';
      jsonModifiedAltID.url = 'http://example.org/sd/ModifiedAlternateIdentification';
      jsonModifiedAltID._baseDefinition = {
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-codegen-super',
            valueString: 'MetadataResource'
          }
        ]
      };
      pkg.logicals.push(StructureDefinition.fromJSON(jsonModifiedAltID));

      const logical = new Logical('Foo');
      logical.parent = 'ModifiedAlternateIdentification';
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[1];
      expect(exported.baseDefinition).toBe('http://example.org/sd/ModifiedAlternateIdentification'); // url for ModifiedObservation
      // @ts-ignore
      expect(exported._baseDefinition).toBeUndefined(); // should be stripped out
    });

    it('should not overwrite metadata that is not given for a logical model', () => {
      const logical = new Logical('Foo');
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('Foo');
      expect(exported.title).toBeUndefined();
      expect(exported.description).toBeUndefined();
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Base');
      expect(exported.derivation).toBe('specialization');
    });

    it('should allow metadata to be overwritten with caret rule', () => {
      const logical = new Logical('Foo');
      logical.parent = 'AlternateIdentification';
      const rule = new CaretValueRule('');
      rule.caretPath = 'status';
      rule.value = new FshCode('draft');
      logical.rules.push(rule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];
      expect(exported.name).toBe('Foo');
      expect(exported.status).toBe('draft');
    });

    it('should allow type to be overwritten with caret rule', () => {
      const logical = new Logical('Foo');
      logical.parent = 'AlternateIdentification';
      const rule = new CaretValueRule('');
      rule.caretPath = 'type';
      rule.value = 'MyType';
      logical.rules.push(rule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];
      expect(exported.name).toBe('Foo');
      expect(exported.type).toBe('MyType');
    });

    it('should log an error when multiple logical models have the same id', () => {
      const firstLogicalModel = new Logical('FirstLogicalModel')
        .withFile('LogicalModels.fsh')
        .withLocation([2, 8, 6, 25]);
      firstLogicalModel.id = 'my-model';
      const secondLogicalModel = new Logical('SecondLogicalModel')
        .withFile('LogicalModels.fsh')
        .withLocation([8, 8, 11, 25]);
      secondLogicalModel.id = 'my-model';
      doc.logicals.set(firstLogicalModel.name, firstLogicalModel);
      doc.logicals.set(secondLogicalModel.name, secondLogicalModel);

      exporter.export();
      expect(pkg.logicals).toHaveLength(2);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple structure definitions with id my-model/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /File: LogicalModels\.fsh.*Line: 8 - 11\D*/s
      );
    });

    it('should log an error when a profile and a logical model have the same id', () => {
      const profile = new Profile('MyProfile').withFile('Profiles.fsh').withLocation([2, 8, 5, 15]);
      profile.id = 'custom-definition';
      profile.parent = 'Basic';
      const logical = new Logical('MyModel').withFile('Logicals.fsh').withLocation([3, 8, 5, 19]);
      logical.id = 'custom-definition';
      doc.profiles.set(profile.name, profile);
      doc.logicals.set(logical.name, logical);

      exporter.export();
      expect(pkg.profiles).toHaveLength(1);
      expect(pkg.logicals).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple structure definitions with id custom-definition/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Logicals\.fsh.*Line: 3 - 5\D*/s);
    });

    it('should include added elements along with parent elements', () => {
      const logical = new Logical('MyTestModel');
      logical.parent = 'Base';
      logical.id = 'MyModel';

      const addElementRule1 = new AddElementRule('prop1');
      addElementRule1.min = 0;
      addElementRule1.max = '1';
      addElementRule1.types = [{ type: 'dateTime' }];
      addElementRule1.short = 'short of property1';
      logical.rules.push(addElementRule1);

      const addElementRule2 = new AddElementRule('prop2');
      addElementRule2.min = 0;
      addElementRule2.max = '*';
      addElementRule2.summary = true;
      addElementRule2.types = [{ type: 'string' }];
      addElementRule2.short = 'short of property2';
      logical.rules.push(addElementRule2);

      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('MyTestModel');
      expect(exported.id).toBe('MyModel');
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/MyModel');
      expect(exported.elements).toHaveLength(3); // 1 Base element + 2 added elements
    });

    it('should include added elements for BackboneElement and children', () => {
      const logical = new Logical('MyTestModel');
      logical.parent = 'Element';
      logical.id = 'MyModel';

      const addElementRule1 = new AddElementRule('backboneProp');
      addElementRule1.min = 0;
      addElementRule1.max = '*';
      addElementRule1.types = [{ type: 'BackboneElement' }];
      addElementRule1.short = 'short of backboneProp';
      logical.rules.push(addElementRule1);

      const addElementRule2 = new AddElementRule('backboneProp.name');
      addElementRule2.min = 1;
      addElementRule2.max = '1';
      addElementRule2.types = [{ type: 'HumanName' }];
      addElementRule2.short = 'short of backboneProp.name';
      logical.rules.push(addElementRule2);

      const addElementRule3 = new AddElementRule('backboneProp.address');
      addElementRule3.min = 0;
      addElementRule3.max = '*';
      addElementRule3.types = [{ type: 'Address' }];
      addElementRule3.short = 'short of backboneProp.address';
      logical.rules.push(addElementRule3);

      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('MyTestModel');
      expect(exported.id).toBe('MyModel');
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/MyModel');
      expect(exported.elements).toHaveLength(6); // 3 Element elements + 3 added elements

      const prop1 = exported.findElement('MyModel.backboneProp');
      expect(prop1.path).toBe('MyModel.backboneProp');
      const expectedType1 = new ElementDefinitionType('BackboneElement');
      expect(prop1.type).toStrictEqual([expectedType1]);

      const prop2 = exported.findElement('MyModel.backboneProp.name');
      expect(prop2.path).toBe('MyModel.backboneProp.name');
      const expectedType2 = new ElementDefinitionType('HumanName');
      expect(prop2.type).toStrictEqual([expectedType2]);

      const prop3 = exported.findElement('MyModel.backboneProp.address');
      expect(prop3.path).toBe('MyModel.backboneProp.address');
      const expectedType3 = new ElementDefinitionType('Address');
      expect(prop3.type).toStrictEqual([expectedType3]);
    });

    it('should log an error when MustSupport is true in a logical model', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1')
        .withFile('MustSupportFlag.fsh')
        .withLocation([3, 1, 8, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.mustSupport = true;
      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      exported.findElement('MyModel.prop1');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /File: MustSupportFlag\.fsh.*Line: 3 - 8\D*/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/The MustSupport flag is not permitted/s);
    });
  });

  describe('#Resource', () => {
    it('should have the correct baseDefinition of Element when parent is not provided', () => {
      const resource = new Resource('Foo');
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('Foo');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/DomainResource'
      );
    });

    it('should have the correct baseDefinition for a Resource parent', () => {
      const resource = new Resource('Foo');
      resource.parent = 'Resource';
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('Foo');
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Resource');
    });

    it('should have the correct baseDefinition for a DomainResource parent', () => {
      const resource = new Resource('Foo');
      resource.parent = 'DomainResource';
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('Foo');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/DomainResource'
      );
    });

    it('should set all user-provided metadata for a resource', () => {
      const resource = new Resource('Foo');
      resource.id = 'foo';
      resource.title = 'Custom Foo Resource';
      resource.description = 'foo bar foobar';
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('foo');
      expect(exported.title).toBe('Custom Foo Resource');
      expect(exported.description).toBe('foo bar foobar');
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/foo');
      expect(exported.version).toBeUndefined();
      expect(exported.type).toBe('foo');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/DomainResource'
      );
    });

    it('should properly set/clear all metadata properties for a resource', () => {
      const resource = new Resource('Foo');
      resource.parent = 'Resource';
      resource.title = 'Custom Foo Resource';
      resource.description = 'foo bar foobar';
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('Foo'); // defaulted from user-provided name
      expect(exported.title).toBe('Custom Foo Resource');
      expect(exported.meta).toBeUndefined();
      expect(exported.implicitRules).toBeUndefined();
      expect(exported.language).toBeUndefined();
      expect(exported.text).toBeUndefined();
      expect(exported.contained).toBeUndefined();
      expect(exported.modifierExtension).toBeUndefined();
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'); // constructed from canonical and id
      expect(exported.identifier).toBeUndefined();
      expect(exported.version).toBeUndefined();
      expect(exported.name).toBe('Foo'); // provided by user
      expect(exported.status).toBe('draft'); // always draft
      expect(exported.experimental).toBeUndefined();
      expect(exported.date).toBeUndefined();
      expect(exported.publisher).toBeUndefined();
      expect(exported.contact).toBeUndefined();
      expect(exported.description).toBe('foo bar foobar');
      expect(exported.useContext).toBeUndefined();
      expect(exported.jurisdiction).toBeUndefined();
      expect(exported.purpose).toBeUndefined();
      expect(exported.copyright).toBeUndefined();
      expect(exported.keyword).toBeUndefined();
      expect(exported.fhirVersion).toBe('4.0.1'); // Inherited from Resource
      const mapping: StructureDefinitionMapping = {
        identity: 'rim',
        uri: 'http://hl7.org/v3',
        name: 'RIM Mapping'
      };
      expect(exported.mapping).toStrictEqual([mapping]); // inherited from Resource
      expect(exported.kind).toBe('resource'); // inherited from Resource
      expect(exported.abstract).toBe(false); // always abstract
      expect(exported.context).toBeUndefined(); // inherited from Resource
      expect(exported.contextInvariant).toBeUndefined(); // inherited from Resource
      expect(exported.type).toBe('Foo'); // inherited from Resource
      expect(exported.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Resource'); // url for Resource
      expect(exported.derivation).toBe('specialization'); // always specialization for resource
    });

    it('should remove inherited top-level underscore-prefixed metadata properties for a resource', () => {
      const jsonModifiedResource = defs.fishForFHIR('Resource');
      jsonModifiedResource.id = 'ModifiedResource';
      jsonModifiedResource.name = 'ModifiedResource';
      jsonModifiedResource.url = 'http://example.org/sd/ModifiedResource';
      jsonModifiedResource._baseDefinition = {
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-codegen-super',
            valueString: 'MetadataResource'
          }
        ]
      };
      pkg.resources.push(StructureDefinition.fromJSON(jsonModifiedResource));

      const resource = new Resource('Foo');
      resource.parent = 'ModifiedResource';
      resource.title = 'Custom Foo Resource';
      resource.description = 'foo bar foobar';
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[1];
      expect(exported.baseDefinition).toBe('http://example.org/sd/ModifiedResource'); // url for ModifiedObservation
      // @ts-ignore
      expect(exported._baseDefinition).toBeUndefined(); // should be stripped out
    });

    it('should not overwrite metadata that is not given for a resource', () => {
      const resource = new Resource('Foo');
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('Foo');
      expect(exported.id).toBe('Foo');
      expect(exported.title).toBeUndefined();
      expect(exported.description).toBeUndefined();
      expect(exported.url).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');
      expect(exported.version).toBeUndefined();
      expect(exported.type).toBe('Foo');
      expect(exported.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/DomainResource'
      );
      expect(exported.derivation).toBe('specialization');
    });

    it('should allow metadata to be overwritten with caret rule', () => {
      const resource = new Resource('Foo');
      doc.resources.set(resource.name, resource);
      const rule = new CaretValueRule('');
      rule.caretPath = 'status';
      rule.value = new FshCode('draft');
      resource.rules.push(rule);
      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];
      expect(exported.name).toBe('Foo');
      expect(exported.status).toBe('draft');
    });

    it('should log an error when multiple resources have the same id', () => {
      const firstResource = new Resource('FirstResource')
        .withFile('Resources.fsh')
        .withLocation([2, 8, 6, 25]);
      firstResource.id = 'my-resource';
      const secondResource = new Resource('SecondResource')
        .withFile('Resources.fsh')
        .withLocation([8, 8, 11, 25]);
      secondResource.id = 'my-resource';
      doc.resources.set(firstResource.name, firstResource);
      doc.resources.set(secondResource.name, secondResource);

      exporter.export();
      expect(pkg.resources).toHaveLength(2);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple structure definitions with id my-resource/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Resources\.fsh.*Line: 8 - 11\D*/s);
    });

    it('should log an error when a resource and a logical model have the same id', () => {
      const resource = new Resource('MyResource')
        .withFile('Resource.fsh')
        .withLocation([2, 8, 5, 15]);
      resource.id = 'custom-id';
      doc.resources.set(resource.name, resource);

      const logical = new Logical('MyModel').withFile('Logicals.fsh').withLocation([3, 8, 5, 19]);
      logical.id = 'custom-id';
      doc.logicals.set(logical.name, logical);

      exporter.export();
      expect(pkg.resources).toHaveLength(1);
      expect(pkg.logicals).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Multiple structure definitions with id custom-id/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Resource\.fsh.*Line: 2 - 5\D*/s);
    });

    it('should include added elements along with parent root element', () => {
      const resource = new Resource('MyTestResource');
      resource.parent = 'DomainResource';
      resource.id = 'MyResource';

      const addElementRule1 = new AddElementRule('prop1');
      addElementRule1.min = 0;
      addElementRule1.max = '1';
      addElementRule1.types = [{ type: 'dateTime' }];
      addElementRule1.short = 'short of property1';
      resource.rules.push(addElementRule1);

      const addElementRule2 = new AddElementRule('prop2');
      addElementRule2.min = 0;
      addElementRule2.max = '*';
      addElementRule2.summary = true;
      addElementRule2.types = [{ type: 'string' }];
      addElementRule2.short = 'short of property2';
      resource.rules.push(addElementRule2);

      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('MyTestResource');
      expect(exported.id).toBe('MyResource');
      expect(exported.type).toBe('MyResource');
      expect(exported.elements).toHaveLength(11); // 9 - DomainResource elements + 2 AddElementRules
    });

    it('should include added elements for BackboneElement and children', () => {
      const resource = new Resource('MyTestResource');
      resource.parent = 'Resource';
      resource.id = 'MyResource';

      const addElementRule1 = new AddElementRule('backboneProp');
      addElementRule1.min = 0;
      addElementRule1.max = '*';
      addElementRule1.types = [{ type: 'BackboneElement' }];
      addElementRule1.short = 'short of backboneProp';
      resource.rules.push(addElementRule1);

      const addElementRule2 = new AddElementRule('backboneProp.name');
      addElementRule2.min = 1;
      addElementRule2.max = '1';
      addElementRule2.types = [{ type: 'HumanName' }];
      addElementRule2.short = 'short of backboneProp.name';
      resource.rules.push(addElementRule2);

      const addElementRule3 = new AddElementRule('backboneProp.address');
      addElementRule3.min = 0;
      addElementRule3.max = '*';
      addElementRule3.types = [{ type: 'Address' }];
      addElementRule3.short = 'short of backboneProp.address';
      resource.rules.push(addElementRule3);

      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('MyTestResource');
      expect(exported.id).toBe('MyResource');
      expect(exported.type).toBe('MyResource');
      expect(exported.elements).toHaveLength(8); // 5 - Resource elements + 3 AddElementRules

      const prop1 = exported.findElement('MyResource.backboneProp');
      expect(prop1.path).toBe('MyResource.backboneProp');
      const expectedType1 = new ElementDefinitionType('BackboneElement');
      expect(prop1.type).toStrictEqual([expectedType1]);

      const prop2 = exported.findElement('MyResource.backboneProp.name');
      expect(prop2.path).toBe('MyResource.backboneProp.name');
      const expectedType2 = new ElementDefinitionType('HumanName');
      expect(prop2.type).toStrictEqual([expectedType2]);

      const prop3 = exported.findElement('MyResource.backboneProp.address');
      expect(prop3.path).toBe('MyResource.backboneProp.address');
      const expectedType3 = new ElementDefinitionType('Address');
      expect(prop3.type).toStrictEqual([expectedType3]);
    });

    it('should log an error when MustSupport is true in a resource', () => {
      const resource = new Resource('MyTestResource');
      resource.id = 'MyResource';

      const addElementRule = new AddElementRule('prop1')
        .withFile('MustSupportFlag.fsh')
        .withLocation([3, 1, 8, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.mustSupport = true;
      resource.rules.push(addElementRule);
      doc.resources.set(resource.name, resource);

      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.elements).toHaveLength(10);

      exported.findElement('MyResource.prop1');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /File: MustSupportFlag\.fsh.*Line: 3 - 8\D*/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/The MustSupport flag is not permitted/s);
    });
  });

  describe('#Invariant', () => {
    it('should not warn or error on a valid Invariant using keywords', () => {
      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('warning');
      doc.invariants.set(invariant.name, invariant);

      exporter.export();
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should not warn or error on a valid Invariant using rules', () => {
      const invariant = new Invariant('MyInvariant');
      const humanRule = new AssignmentRule('human');
      humanRule.value = 'My important invariant';
      const severityRule = new AssignmentRule('severity');
      severityRule.value = new FshCode('warning');
      invariant.rules = [humanRule, severityRule];
      doc.invariants.set(invariant.name, invariant);

      exporter.export();
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should log an error when description is not provided', () => {
      const invariant = new Invariant('MyInvariant')
        .withFile('BadInvariant.fsh')
        .withLocation([4, 0, 5, 17]);
      invariant.severity = new FshCode('warning');
      doc.invariants.set(invariant.name, invariant);

      exporter.export();
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invariant MyInvariant is missing its human description\. To set the description, add the "Description:" keyword or add a rule assigning "human" to a string value\./s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadInvariant\.fsh.*Line: 4\D+5\D*/s);
    });

    it('should log an error when severity is not provided', () => {
      const invariant = new Invariant('MyInvariant')
        .withFile('BadInvariant.fsh')
        .withLocation([4, 0, 5, 34]);
      invariant.description = 'My important invariant';
      doc.invariants.set(invariant.name, invariant);

      exporter.export();
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invariant MyInvariant is missing its severity level\. To set the severity, add the "Severity:" keyword or add a rule assigning "severity" to #error or #warning\./s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadInvariant\.fsh.*Line: 4\D+5\D*/s);
    });

    it('should log an error when severity is not one of the valid values (set by keyword)', () => {
      const invariant = new Invariant('MyInvariant')
        .withFile('BadInvariant.fsh')
        .withLocation([4, 0, 6, 23]);
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('nice-to-have')
        .withFile('BadInvariant.fsh')
        .withLocation([6, 10, 6, 23]);
      doc.invariants.set(invariant.name, invariant);

      exporter.export();
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invariant MyInvariant has an invalid severity level\. Supported values are #error and #warning\./s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadInvariant\.fsh.*Line: 6\D*/s);
    });

    it('should log an error when severity is not one of the valid values (set by rule)', () => {
      const invariant = new Invariant('MyInvariant')
        .withFile('BadInvariant.fsh')
        .withLocation([4, 0, 6, 27]);
      invariant.description = 'My important invariant';
      const severityRule = new AssignmentRule('severity');
      severityRule.value = new FshCode('nice-to-have')
        .withFile('BadInvariant.fsh')
        .withLocation([6, 14, 6, 27]);
      invariant.rules = [severityRule];
      doc.invariants.set(invariant.name, invariant);

      exporter.export();
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invariant MyInvariant has an invalid severity level\. Supported values are #error and #warning\./s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadInvariant\.fsh.*Line: 6\D*/s);
    });

    it('should log a warning when severity includes a system (set by keyword)', () => {
      const invariant = new Invariant('MyInvariant')
        .withFile('BadInvariant.fsh')
        .withLocation([4, 0, 6, 46]);
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('error', 'http://hl7.org/fhir/constraint-severity')
        .withFile('BadInvariant.fsh')
        .withLocation([6, 10, 6, 46]);
      doc.invariants.set(invariant.name, invariant);

      exporter.export();
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Invariant MyInvariant has a severity level including a code system\. Remove the code system from the value\./s
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: BadInvariant\.fsh.*Line: 6\D*/s);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should log a warning when severity includes a system (set by rule)', () => {
      const invariant = new Invariant('MyInvariant')
        .withFile('BadInvariant.fsh')
        .withLocation([4, 0, 6, 50]);
      invariant.description = 'My important invariant';
      const severityRule = new AssignmentRule('severity');
      severityRule.value = new FshCode('error', 'http://hl7.org/fhir/constraint-severity')
        .withFile('BadInvariant.fsh')
        .withLocation([6, 14, 6, 50]);
      invariant.rules = [severityRule];
      doc.invariants.set(invariant.name, invariant);

      exporter.export();
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Invariant MyInvariant has a severity level including a code system. Remove the code system from the value\./s
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: BadInvariant\.fsh.*Line: 6\D*/s);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });
  });

  describe('#Rules', () => {
    it('should emit an error and continue when the path is not found', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Basic';
      const rule = new CardRule('fakePath').withFile('Foo.fsh').withLocation([3, 8, 4, 22]);
      rule.min = 0;
      rule.max = '1';
      profile.rules.push(rule);
      exporter.exportStructDef(profile);
      const structDef = pkg.profiles[0];
      expect(structDef).toBeDefined();
      expect(structDef.type).toBe('Basic');
      expect(loggerSpy.getLastMessage()).toMatch(/File: Foo\.fsh.*Line: 3 - 4\D*/s);
    });

    it('should emit an error and continue when the path for the child of a choice element is not found', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Basic';
      const rule = new AssignmentRule('value[x].comparator')
        .withFile('Foo.fsh')
        .withLocation([4, 7, 4, 22]);
      rule.value = new FshCode('>=');
      profile.rules.push(rule);
      exporter.exportStructDef(profile);
      const structDef = pkg.profiles[0];
      expect(structDef).toBeDefined();
      expect(structDef.type).toBe('Basic');
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Foo\.fsh.*Line: 4\D*/s);
    });
  });

  describe('#AddElementRule', () => {
    it('should throw an error for an invalid AddElementRule path', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('foo.bar')
        .withFile('BadPath.fsh')
        .withLocation([3, 1, 8, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'boolean' }];
      addElementRule.short = 'A bar';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);

      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadPath\.fsh.*Line: 3 - 8\D*/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /The element or path you referenced does not exist: foo.bar/s
      );
    });

    it('should add an element with a type and minimum required attributes', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'dateTime' }];
      addElementRule.short = 'brief description';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('MyTestModel');
      expect(exported.id).toBe('MyModel');
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/MyModel');
      expect(exported.elements).toHaveLength(2); // 1 for parent Base plus 1 for AddElementRule

      const prop1 = exported.findElement('MyModel.prop1');
      expect(prop1.path).toBe('MyModel.prop1');
      expect(prop1.min).toBe(0);
      expect(prop1.max).toBe('1');
      const expectedType = new ElementDefinitionType('dateTime');
      expect(prop1.type).toStrictEqual([expectedType]);
      expect(prop1.isModifier).toBeUndefined();
      expect(prop1.mustSupport).toBeUndefined();
      expect(prop1.isSummary).toBeUndefined();
      expect(prop1.extension).toBeUndefined(); // standards flags extensions
      expect(prop1.short).toBe('brief description');
      expect(prop1.definition).toBe('brief description');
      expect(prop1.base).toBeDefined();
      expect(prop1.base.path).toBe(prop1.path);
      expect(prop1.base.min).toBe(prop1.min);
      expect(prop1.base.max).toBe(prop1.max);
      expect(prop1.constraint).toBeDefined();
      expect(prop1.constraint).toHaveLength(1);
      expect(prop1.constraint[0].key).toBe('ele-1');
      expect(prop1.constraint[0].requirements).toBeUndefined();
      expect(prop1.constraint[0].severity).toBe('error');
      expect(prop1.constraint[0].human).toBe('All FHIR elements must have a @value or children');
      expect(prop1.constraint[0].expression).toBe(
        'hasValue() or (children().count() > id.count())'
      );
      expect(prop1.constraint[0].xpath).toBe('@value|f:*|h:div');
      expect(prop1.constraint[0].source).toBe('http://hl7.org/fhir/StructureDefinition/Element');
    });

    it('should add an element with a content reference and minimum required attributes', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.contentReference =
        'http://example.org/StructureDefinition/MyModel#MyModel.propOne';
      addElementRule.short = 'brief description';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('MyTestModel');
      expect(exported.id).toBe('MyModel');
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/MyModel');
      expect(exported.elements).toHaveLength(2); // 1 for parent Base plus 1 for AddElementRule

      const prop1 = exported.findElement('MyModel.prop1');
      expect(prop1.path).toBe('MyModel.prop1');
      expect(prop1.min).toBe(0);
      expect(prop1.max).toBe('1');
      expect(prop1.type).toBeUndefined();
      expect(prop1.contentReference).toBe(
        'http://example.org/StructureDefinition/MyModel#MyModel.propOne'
      );
      expect(prop1.isModifier).toBeUndefined();
      expect(prop1.mustSupport).toBeUndefined();
      expect(prop1.isSummary).toBeUndefined();
      expect(prop1.extension).toBeUndefined(); // standards flags extensions
      expect(prop1.short).toBe('brief description');
      expect(prop1.definition).toBe('brief description');
      expect(prop1.base).toBeDefined();
      expect(prop1.base.path).toBe(prop1.path);
      expect(prop1.base.min).toBe(prop1.min);
      expect(prop1.base.max).toBe(prop1.max);
      expect(prop1.constraint).toBeDefined();
      expect(prop1.constraint).toHaveLength(1);
      expect(prop1.constraint[0].key).toBe('ele-1');
      expect(prop1.constraint[0].requirements).toBeUndefined();
      expect(prop1.constraint[0].severity).toBe('error');
      expect(prop1.constraint[0].human).toBe('All FHIR elements must have a @value or children');
      expect(prop1.constraint[0].expression).toBe(
        'hasValue() or (children().count() > id.count())'
      );
      expect(prop1.constraint[0].xpath).toBe('@value|f:*|h:div');
      expect(prop1.constraint[0].source).toBe('http://hl7.org/fhir/StructureDefinition/Element');
    });

    it('should add an element with additional constraint attributes', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'brief description';
      logical.rules.push(addElementRule);

      const invariant = new Invariant('TestInvariant');
      doc.invariants.set(invariant.name, invariant);
      const constraint = new ObeysRule('prop1');
      constraint.invariant = invariant.id;
      logical.rules.push(constraint);

      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('MyTestModel');
      expect(exported.id).toBe('MyModel');
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/MyModel');
      expect(exported.elements).toHaveLength(2); // 1 for parent Base plus 1 for AddElementRule

      const prop1 = exported.findElement('MyModel.prop1');

      expect(prop1.constraint).toBeDefined();
      expect(prop1.constraint).toHaveLength(2);
      expect(prop1.constraint[0].key).toBe('ele-1');
      expect(prop1.constraint[0].requirements).toBeUndefined();
      expect(prop1.constraint[0].severity).toBe('error');
      expect(prop1.constraint[0].human).toBe('All FHIR elements must have a @value or children');
      expect(prop1.constraint[0].expression).toBe(
        'hasValue() or (children().count() > id.count())'
      );
      expect(prop1.constraint[0].xpath).toBe('@value|f:*|h:div');
      expect(prop1.constraint[0].source).toBe('http://hl7.org/fhir/StructureDefinition/Element');

      expect(prop1.constraint[1].key).toBe('TestInvariant');
      expect(prop1.constraint[1].source).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/MyModel'
      );
    });

    it('should add an element with multiple targetTypes', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('created[x]');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'instant' }, { type: 'dateTime' }, { type: 'Period' }];
      addElementRule.short = 'short definition';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      const prop1 = exported.findElement('MyModel.created[x]');
      const expectedType1 = new ElementDefinitionType('instant');
      const expectedType2 = new ElementDefinitionType('dateTime');
      const expectedType3 = new ElementDefinitionType('Period');
      expect(prop1.type).toStrictEqual([expectedType1, expectedType2, expectedType3]);
    });

    it('should add an element with all boolean flags set to true', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      // MustSupport must be false/undefined for logical models and resources;
      // otherwise, error will be thrown - tested elsewhere
      addElementRule.mustSupport = false;
      addElementRule.summary = true;
      addElementRule.modifier = true;

      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      const prop1 = exported.findElement('MyModel.prop1');
      expect(prop1.mustSupport).toBeFalsy();
      expect(prop1.isSummary).toBeTrue();
      expect(prop1.isModifier).toBeTrue();
    });

    it('should add an element with all boolean flags set to false', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.mustSupport = false;
      addElementRule.summary = false;
      addElementRule.modifier = false;

      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      const prop1 = exported.findElement('MyModel.prop1');
      // When flags are set to false, the attributes are not generated rather than set to false
      expect(prop1.mustSupport).toBeUndefined();
      expect(prop1.isSummary).toBeUndefined();
      expect(prop1.isModifier).toBeUndefined();
    });

    it('should add an element with trial use standards flag set to true', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.trialUse = true;
      addElementRule.normative = false;
      addElementRule.draft = false;

      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      const prop1 = exported.findElement('MyModel.prop1');
      // When standards flags are set to true, an extension is created
      expect(prop1.extension).toHaveLength(1);
      expect(prop1.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'trial-use'
      });
    });

    it('should add an element with normative standards flag set to true', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.trialUse = false;
      addElementRule.normative = true;
      addElementRule.draft = false;

      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      const prop1 = exported.findElement('MyModel.prop1');
      // When standards flags are set to true, an extension is created
      expect(prop1.extension).toHaveLength(1);
      expect(prop1.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'normative'
      });
    });

    it('should add an element with draft standards flag set to true', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.trialUse = false;
      addElementRule.normative = false;
      addElementRule.draft = true;

      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      const prop1 = exported.findElement('MyModel.prop1');
      // When standards flags are set to true, an extension is created
      expect(prop1.extension).toHaveLength(1);
      expect(prop1.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'draft'
      });
    });

    it('should add an element with all standards flags set to false', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.trialUse = false;
      addElementRule.normative = false;
      addElementRule.draft = false;

      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      const prop1 = exported.findElement('MyModel.prop1');
      // When standards flags are set to false, the underlying extension is not created
      expect(prop1.extension).toBeUndefined();
    });

    it('should log an error when more than one standards flag is set to true', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1')
        .withFile('MultiFlags.fsh')
        .withLocation([3, 1, 8, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'short definition';
      addElementRule.trialUse = true;
      addElementRule.normative = true;
      addElementRule.draft = true;

      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);

      const prop1 = exported.findElement('MyModel.prop1');
      // When multiple standards flags are set to true and an error is logged,
      // the underlying extension is not created
      expect(prop1.extension).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: MultiFlags\.fsh.*Line: 3 - 8\D*/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/multiple standards status/s);
    });

    it('should add an element with supported doc attributes', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';
      logical.title = 'MyTestModel title is here';
      logical.description = 'MyTestModel description is here';

      const addElementRule = new AddElementRule('prop1');
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'dateTime' }];
      addElementRule.short = 'short description for prop1';
      addElementRule.definition = 'definition for prop1';

      logical.rules.push(addElementRule);
      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.elements).toHaveLength(2);
      expect(exported.elements[0].short).toBe(logical.title);
      expect(exported.elements[0].definition).toBe(logical.description);

      const prop1 = exported.findElement('MyModel.prop1');
      expect(prop1.short).toBe('short description for prop1');
      expect(prop1.definition).toBe('definition for prop1');
    });

    it('should log an error and add an element when an element name contains a prohibited special character or is more than 64 characters long', () => {
      // Resource: MyTestResource
      // Id: MyResource
      // * some!thing 0..1 BackboneElement "some! thing"
      // * some!thing.normal 0..1 string "something normal"
      // * some!thing.strange? 0..1 boolean "something strange"
      // * some!thing.thatIsFarTooLongToBeAReasonableElementNameAccordingToTheSpecifications 0..1 string "this one is long"
      // * another 0..1 BackboneElement "another element"
      // * another.this&that 0..1 boolean "this & that"
      // * accordingToAllKnownLawsOfAviation,ThereIsNoWayABeeShouldBeAbleToFly 1..1 boolean "the bee, of course, flies anyway"
      // * acceptable[x] 0..1 string or boolean "acceptable choice element"
      // * thisSeemsLikeItMightBeTooLongButItIsActuallyJustBarelyAcceptable[x] 0..1 string or boolean "just barely short enough"
      const resource = new Resource('MyTestResource');
      resource.id = 'MyResource';

      const elementSomething = new AddElementRule('some!thing')
        .withFile('ErrorElements.fsh')
        .withLocation([3, 1, 3, 47]);
      elementSomething.min = 0;
      elementSomething.max = '1';
      elementSomething.types = [{ type: 'BackboneElement' }];
      elementSomething.short = 'some! thing';

      const elementNormal = new AddElementRule('some!thing.normal')
        .withFile('ErrorElements.fsh')
        .withLocation([4, 1, 4, 50]);
      elementNormal.min = 0;
      elementNormal.max = '1';
      elementNormal.types = [{ type: 'string' }];
      elementNormal.short = 'something normal';

      const elementStrange = new AddElementRule('some!thing.strange?')
        .withFile('ErrorElements.fsh')
        .withLocation([5, 1, 5, 54]);
      elementStrange.min = 0;
      elementStrange.max = '1';
      elementStrange.types = [{ type: 'boolean' }];
      elementStrange.short = 'something strange';

      const elementTooLong = new AddElementRule(
        'some!thing.thatIsFarTooLongToBeAReasonableElementNameAccordingToTheSpecifications'
      )
        .withFile('ErrorElements.fsh')
        .withLocation([6, 1, 6, 114]);
      elementTooLong.min = 0;
      elementTooLong.max = '1';
      elementTooLong.types = [{ type: 'string' }];
      elementTooLong.short = 'this one is long';

      const elementAnother = new AddElementRule('another')
        .withFile('ErrorElements.fsh')
        .withLocation([7, 1, 7, 48]);
      elementAnother.min = 0;
      elementAnother.max = '1';
      elementAnother.types = [{ type: 'BackboneElement' }];
      elementAnother.short = 'another element';

      const elementThisAndThat = new AddElementRule('another.this&that')
        .withFile('ErrorElements.fsh')
        .withLocation([8, 1, 8, 46]);
      elementThisAndThat.min = 0;
      elementThisAndThat.max = '1';
      elementThisAndThat.types = [{ type: 'boolean' }];
      elementThisAndThat.short = 'this & that';

      const elementBee = new AddElementRule(
        'accordingToAllKnownLawsOfAviation,ThereIsNoWayABeeShouldBeAbleToFly'
      )
        .withFile('ErrorElements.fsh')
        .withLocation([9, 1, 9, 117]);
      elementBee.min = 1;
      elementBee.max = '1';
      elementBee.types = [{ type: 'boolean' }];
      elementBee.short = 'the bee, of course, flies anyway';

      const elementAcceptable = new AddElementRule('acceptable[x]')
        .withFile('ErrorElements.fsh')
        .withLocation([10, 1, 10, 66]);
      elementAcceptable.min = 0;
      elementAcceptable.max = '1';
      elementAcceptable.types = [{ type: 'string' }, { type: 'boolean' }];
      elementAcceptable.short = 'acceptable choice element';

      const elementBarelyAcceptable = new AddElementRule(
        'thisSeemsLikeItMightBeTooLongButItIsActuallyJustBarelyAcceptable[x]'
      )
        .withFile('ErrorElements.fsh')
        .withLocation([11, 1, 11, 119]);
      elementBarelyAcceptable.min = 0;
      elementBarelyAcceptable.max = '1';
      elementBarelyAcceptable.types = [{ type: 'string' }, { type: 'boolean' }];
      elementBarelyAcceptable.short = 'just barely short enough';

      resource.rules.push(
        elementSomething,
        elementNormal,
        elementStrange,
        elementTooLong,
        elementAnother,
        elementThisAndThat,
        elementBee,
        elementAcceptable,
        elementBarelyAcceptable
      );

      doc.resources.set(resource.name, resource);
      exporter.exportStructDef(resource);
      const exported = pkg.resources[0];

      expect(exported.name).toBe('MyTestResource');
      expect(exported.id).toBe('MyResource');
      expect(exported.type).toBe('MyResource');
      expect(exported.elements).toHaveLength(18); // all nine new elements are added
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(5);
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /some!thing.*Element names cannot include some special characters.*File: ErrorElements\.fsh.*Line: 3\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(1, 'error')).toMatch(
        /some!thing\.strange\?.*Element names cannot include some special characters.*File: ErrorElements\.fsh.*Line: 5\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(2, 'error')).toMatch(
        /some!thing\.thatIsFarTooLongToBeAReasonableElementNameAccordingToTheSpecifications.*Element names must be at most 64 characters long.*File: ErrorElements\.fsh.*Line: 6\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(3, 'error')).toMatch(
        /another\.this&that.*Element names cannot include some special characters.*File: ErrorElements\.fsh.*Line: 8\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(4, 'error')).toMatch(
        /accordingToAllKnownLawsOfAviation,ThereIsNoWayABeeShouldBeAbleToFly.*Element names cannot include some special characters and must be at most 64 characters long.*File: ErrorElements\.fsh.*Line: 9\D*/s
      );
    });

    it('should log a warning and add an element when an element name is not a simple alphanumeric', () => {
      // Logical: MyTestModel
      // Id: MyModel
      // * 4 0..1 string "This element's name is four"
      // * 35 0..* BackboneElement "This complex element is three five"
      // * 35.79 1..1 boolean "This is seven nine, contained within three five"
      // * 35.extra 0..1 string "This is an extra string contained within three five"
      // * cookie 1..* BackboneElement "Cookie is mandatory"
      // * cookie.24b 1..1 integer "This is two four bee, contained within cookie"
      // * jalapeño 0..* integer "spicy and delicious"
      // * acceptable[x] 0..1 string or boolean "acceptable choice element"
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const elementFour = new AddElementRule('4')
        .withFile('NumericElements.fsh')
        .withLocation([3, 1, 3, 45]);
      elementFour.min = 0;
      elementFour.max = '1';
      elementFour.types = [{ type: 'string' }];
      elementFour.short = "This element's name is four";

      const elementThreeFive = new AddElementRule('35')
        .withFile('NumericElements.fsh')
        .withLocation([4, 1, 4, 61]);
      elementThreeFive.min = 0;
      elementThreeFive.max = '*';
      elementThreeFive.types = [{ type: 'BackboneElement' }];
      elementThreeFive.short = 'This complex element is three five';

      const elementSevenNine = new AddElementRule('35.79')
        .withFile('NumericElements.fsh')
        .withLocation([5, 1, 5, 69]);
      elementSevenNine.min = 1;
      elementSevenNine.max = '1';
      elementSevenNine.types = [{ type: 'boolean' }];
      elementSevenNine.short = 'This is seven nine, contained within three five';

      const elementExtra = new AddElementRule('35.extra')
        .withFile('NumericElements.fsh')
        .withLocation([6, 1, 6, 75]);
      elementExtra.min = 0;
      elementExtra.max = '1';
      elementExtra.types = [{ type: 'string' }];
      elementExtra.short = 'This is an extra string contained within three five';

      const elementCookie = new AddElementRule('cookie')
        .withFile('NumericElements.fsh')
        .withLocation([7, 1, 7, 49]);
      elementCookie.min = 1;
      elementCookie.max = '*';
      elementCookie.types = [{ type: 'BackboneElement' }];
      elementCookie.short = 'Cookie is mandatory';

      const elementTwoFourBee = new AddElementRule('cookie.24b')
        .withFile('NumericElements.fsh')
        .withLocation([8, 1, 8, 72]);
      elementTwoFourBee.min = 1;
      elementTwoFourBee.max = '1';
      elementTwoFourBee.types = [{ type: 'integer' }];
      elementTwoFourBee.short = 'This is two four bee, contained within cookie';

      const elementSpicy = new AddElementRule('jalapeño')
        .withFile('NumericElements.fsh')
        .withLocation([9, 1, 9, 45]);
      elementSpicy.min = 1;
      elementSpicy.max = '*';
      elementSpicy.types = [{ type: 'integer' }];
      elementSpicy.short = 'spicy and delicious';

      const elementAcceptable = new AddElementRule('acceptable[x]')
        .withFile('ErrorElements.fsh')
        .withLocation([10, 1, 10, 66]);
      elementAcceptable.min = 0;
      elementAcceptable.max = '1';
      elementAcceptable.types = [{ type: 'string' }, { type: 'boolean' }];
      elementAcceptable.short = 'acceptable choice element';

      logical.rules.push(
        elementFour,
        elementThreeFive,
        elementSevenNine,
        elementExtra,
        elementCookie,
        elementTwoFourBee,
        elementSpicy,
        elementAcceptable
      );

      doc.logicals.set(logical.name, logical);
      exporter.exportStructDef(logical);
      const exported = pkg.logicals[0];

      expect(exported.name).toBe('MyTestModel');
      expect(exported.id).toBe('MyModel');
      expect(exported.type).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/MyModel');
      expect(exported.elements).toHaveLength(9); // all eight new elements are be added
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(5);
      expect(loggerSpy.getMessageAtIndex(0, 'warn')).toMatch(
        /4.*Element names should be simple alphanumerics.*File: NumericElements\.fsh.*Line: 3\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(1, 'warn')).toMatch(
        /35.*Element names should be simple alphanumerics.*File: NumericElements\.fsh.*Line: 4\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(2, 'warn')).toMatch(
        /35\.79.*Element names should be simple alphanumerics.*File: NumericElements\.fsh.*Line: 5\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(3, 'warn')).toMatch(
        /cookie\.24b.*Element names should be simple alphanumerics.*File: NumericElements\.fsh.*Line: 8\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(4, 'warn')).toMatch(
        /jalapeño.*Element names should be simple alphanumerics.*File: NumericElements\.fsh.*Line: 9\D*/s
      );
    });

    it('should log an error when SDRule added before AddElementRule', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const caretRule = new CaretValueRule('prop1')
        .withFile('BadOrder.fsh')
        .withLocation([3, 1, 3, 45]);
      caretRule.caretPath = 'comment';
      caretRule.value = 'this is a comment';
      logical.rules.push(caretRule);

      const addElementRule = new AddElementRule('prop1')
        .withFile('BadOrder.fsh')
        .withLocation([4, 1, 9, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [{ type: 'string' }];
      addElementRule.short = 'prop1 definition';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);

      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadOrder\.fsh.*Line: 3\D*/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /No element found at path prop1 for CaretValueRule in MyTestModel, skipping rule/s
      );
    });

    it('should log an error when path does not have [x] for multiple data types in AddElementRule', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1')
        .withFile('BadPath.fsh')
        .withLocation([3, 1, 8, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'string' },
        { type: 'Annotation' },
        { type: 'DocumentReference', isReference: true }
      ];
      addElementRule.short = 'prop1 definition';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);

      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadPath\.fsh.*Line: 3 - 8\D*/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /As a FHIR choice data type, the specified prop1 for AddElementRule must end with '\[x\]'/s
      );
    });

    it('should not log an error when path does not have [x] for multiple reference types in AddElementRule', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1')
        .withFile('GoodPath.fsh')
        .withLocation([3, 1, 8, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'Organization', isReference: true },
        { type: 'Location', isReference: true }
      ];
      addElementRule.short = 'prop1 definition with multiple references';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);

      expect(loggerSpy.getLastMessage('error')).toBeUndefined();
    });

    it('should not log an error when path does not have [x] for multiple canonical types in AddElementRule', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1')
        .withFile('GoodPath.fsh')
        .withLocation([3, 1, 8, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'Organization', isCanonical: true },
        { type: 'Location', isCanonical: true }
      ];
      addElementRule.short = 'prop1 definition with multiple canonicals';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);

      expect(loggerSpy.getLastMessage('error')).toBeUndefined();
    });
  });

  describe('#CardRule', () => {
    it('should apply a correct card rule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CardRule('subject');
      rule.min = 1;
      rule.max = '1';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCard = baseStructDef.findElement('Observation.subject');
      const changedCard = sd.findElement('Observation.subject');

      expect(baseCard.min).toBe(0);
      expect(baseCard.max).toBe('1');
      expect(changedCard.min).toBe(1);
      expect(changedCard.max).toBe('1');
    });

    it('should not apply an incorrect card rule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CardRule('status').withFile('Wrong.fsh').withLocation([5, 4, 5, 11]);
      rule.min = 0;
      rule.max = '1';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCard = baseStructDef.findElement('Observation.status');
      const changedCard = sd.findElement('Observation.status');

      expect(baseCard.min).toBe(1);
      expect(baseCard.max).toBe('1');
      expect(changedCard.min).toBe(1);
      expect(changedCard.max).toBe('1');
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Wrong\.fsh.*Line: 5\D*/s);

      // This is one of the spots where we debug log a stack trace just in case the thrown error is an unexpected one
      expect(loggerSpy.getLastMessage('debug')).toMatch(
        /at ElementDefinition\.constrainCardinality/s
      );
    });

    it('should apply a card rule with only min specified', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CardRule('category');
      rule.min = 1;
      rule.max = '';
      profile.rules.push(rule); // * category 1..

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCard = baseStructDef.findElement('Observation.category');
      const changedCard = sd.findElement('Observation.category');

      expect(baseCard.min).toBe(0);
      expect(baseCard.max).toBe('*');
      expect(changedCard.min).toBe(1); // Only min cardinality is updated
      expect(changedCard.max).toBe('*'); // Max remains same as base
    });

    it('should apply a card rule with only max specified', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CardRule('category');
      rule.min = NaN;
      rule.max = '3';
      profile.rules.push(rule); // * category ..3

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCard = baseStructDef.findElement('Observation.category');
      const changedCard = sd.findElement('Observation.category');

      expect(baseCard.min).toBe(0);
      expect(baseCard.max).toBe('*');
      expect(changedCard.min).toBe(0); // Min cardinality remains unchanged
      expect(changedCard.max).toBe('3'); // Only max is changed
    });

    it('should not apply an incorrect min only card rule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CardRule('status').withFile('BadCard.fsh').withLocation([3, 4, 3, 11]);
      rule.min = 0;
      rule.max = '';
      profile.rules.push(rule); // * status 0..

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCard = baseStructDef.findElement('Observation.status');
      const changedCard = sd.findElement('Observation.status');

      expect(baseCard.min).toBe(1);
      expect(baseCard.max).toBe('1');
      expect(changedCard.min).toBe(1);
      expect(changedCard.max).toBe('1'); // Neither card changes
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadCard\.fsh.*Line: 3\D*/s);
    });

    it('should not apply an incorrect max only card rule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CardRule('status').withFile('BadCard.fsh').withLocation([3, 4, 3, 11]);
      rule.min = NaN;
      rule.max = '2';
      profile.rules.push(rule); // * status ..2

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCard = baseStructDef.findElement('Observation.status');
      const changedCard = sd.findElement('Observation.status');

      expect(baseCard.min).toBe(1);
      expect(baseCard.max).toBe('1');
      expect(changedCard.min).toBe(1);
      expect(changedCard.max).toBe('1'); // Neither card changes
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadCard\.fsh.*Line: 3\D*/s);
    });

    it('should not apply a card rule with no sides specified', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CardRule('status').withFile('BadCard.fsh').withLocation([3, 4, 3, 11]);
      rule.min = NaN;
      rule.max = '';
      profile.rules.push(rule); // * status ..

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCard = baseStructDef.findElement('Observation.status');
      const changedCard = sd.findElement('Observation.status');

      expect(baseCard.min).toBe(1);
      expect(baseCard.max).toBe('1');
      expect(changedCard.min).toBe(1);
      expect(changedCard.max).toBe('1'); // Neither card changes. Error logged on import side.
    });
  });

  describe('#FlagRule', () => {
    it('should apply a valid flag rule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'DiagnosticReport';

      const rule = new FlagRule('conclusion');
      rule.modifier = false;
      rule.mustSupport = true;
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('DiagnosticReport');

      const baseElement = baseStructDef.findElement('DiagnosticReport.conclusion');
      const changedElement = sd.findElement('DiagnosticReport.conclusion');
      expect(baseElement.isModifier).toBeFalsy();
      expect(baseElement.mustSupport).toBeFalsy();
      expect(baseElement.isSummary).toBeFalsy();
      expect(changedElement.isModifier).toBe(false);
      expect(changedElement.mustSupport).toBe(true);
      expect(baseElement.isSummary).toBeFalsy();
    });

    it('should apply a flag rule that specifies an element is trial use', () => {
      // Profile: HasTrial
      // Parent: Observation
      // * bodySite TU
      const profile = new Profile('HasTrial');
      profile.parent = 'Observation';
      const flagRule = new FlagRule('bodySite');
      flagRule.trialUse = true;
      profile.rules.push(flagRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const bodySite = sd.findElement('Observation.bodySite');
      expect(bodySite.extension).toHaveLength(1);
      expect(bodySite.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'trial-use'
      });
    });

    it('should apply a flag rule that specifies an element is normative', () => {
      // Profile: HasTrial
      // Parent: Observation
      // * method N
      const profile = new Profile('HasTrial');
      profile.parent = 'Observation';
      const flagRule = new FlagRule('method');
      flagRule.normative = true;
      profile.rules.push(flagRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const method = sd.findElement('Observation.method');
      expect(method.extension).toHaveLength(1);
      expect(method.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'normative'
      });
    });

    it('should apply a flag rule that specifies an element is a draft', () => {
      // Profile: HasDraft
      // Parent: DiagnosticReport
      // * media D
      const profile = new Profile('HasDraft');
      profile.parent = 'DiagnosticReport';
      const flagRule = new FlagRule('media');
      flagRule.draft = true;
      profile.rules.push(flagRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const media = sd.findElement('DiagnosticReport.media');
      expect(media.extension).toHaveLength(1);
      expect(media.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'draft'
      });
    });

    it('should log an error when more than one standards status flag rule is specified on an element', () => {
      // Profile: HasDraft
      // Parent: DiagnosticReport
      // * media D TU
      const profile = new Profile('HasDraft');
      profile.parent = 'DiagnosticReport';
      const flagRule = new FlagRule('media')
        .withFile('MultiStatus.fsh')
        .withLocation([3, 1, 3, 12]);
      flagRule.draft = true;
      flagRule.trialUse = true;
      profile.rules.push(flagRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const media = sd.findElement('DiagnosticReport.media');
      expect(media.extension).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: MultiStatus\.fsh.*Line: 3\D*/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/multiple standards status/s);
    });

    it('should apply a flag rule that changes the existing standards status', () => {
      // Profile: HasTrial
      // Parent: Observation
      // * focus N
      const profile = new Profile('HasTrial');
      profile.parent = 'Observation';
      const flagRule = new FlagRule('focus')
        .withFile('MultiStatus.fsh')
        .withLocation([8, 3, 8, 14]);
      flagRule.normative = true;
      profile.rules.push(flagRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const focus = sd.findElement('Observation.focus');
      const baseStructDef = fisher.fishForStructureDefinition('Observation');
      const baseFocus = baseStructDef.findElement('Observation.focus');
      expect(baseFocus.extension).toContainEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'trial-use'
      });
      expect(focus.extension).toContainEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
        valueCode: 'normative'
      });
    });
  });

  describe('#ValueSetRule', () => {
    it('should apply a correct value set rule to an unbound string', () => {
      const profile = new Profile('Junk');
      profile.parent = 'Appointment';

      const vsRule = new BindingRule('description');
      vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
      vsRule.strength = 'extensible';
      profile.rules.push(vsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Appointment');
      const baseElement = baseStructDef.findElement('Appointment.description');
      const changedElement = sd.findElement('Appointment.description');
      expect(baseElement.binding).toBeUndefined();
      expect(changedElement.binding.valueSet).toBe(
        'http://example.org/fhir/ValueSet/some-valueset'
      );
      expect(changedElement.binding.strength).toBe('extensible');
    });

    it('should apply a correct value set rule that overrides a previous binding', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const vsRule = new BindingRule('category');
      vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
      vsRule.strength = 'extensible';
      profile.rules.push(vsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');
      const baseElement = baseStructDef.findElement('Observation.category');
      const changedElement = sd.findElement('Observation.category');
      expect(baseElement.binding.valueSet).toBe(
        'http://hl7.org/fhir/ValueSet/observation-category'
      );
      expect(baseElement.binding.strength).toBe('preferred');
      expect(changedElement.binding.valueSet).toBe(
        'http://example.org/fhir/ValueSet/some-valueset'
      );
      expect(changedElement.binding.strength).toBe('extensible');
    });

    it('should apply a correct value set rule when the VS is referenced by name', () => {
      const customCategoriesVS = new FshValueSet('CustomCategories');
      customCategoriesVS.id = 'custom-categories';
      doc.valueSets.set('CustomCategories', customCategoriesVS);

      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      const vsRule = new BindingRule('category');
      vsRule.valueSet = 'CustomCategories';
      vsRule.strength = 'extensible';
      profile.rules.push(vsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const element = sd.findElement('Observation.category');
      expect(element.binding.valueSet).toBe(
        'http://hl7.org/fhir/us/minimal/ValueSet/custom-categories'
      );
      expect(element.binding.strength).toBe('extensible');
    });

    it('should apply a correct value set rule when the VS specifies a version', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const vsRule = new BindingRule('category');
      vsRule.valueSet = 'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical|4.0.1';
      vsRule.strength = 'extensible';
      profile.rules.push(vsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');
      const baseElement = baseStructDef.findElement('Observation.category');
      const changedElement = sd.findElement('Observation.category');
      expect(baseElement.binding.valueSet).toBe(
        'http://hl7.org/fhir/ValueSet/observation-category'
      );
      expect(baseElement.binding.strength).toBe('preferred');
      expect(changedElement.binding.valueSet).toBe(
        'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical|4.0.1'
      );
      expect(changedElement.binding.strength).toBe('extensible');
    });

    it('should use the url specified in a CaretValueRule when referencing a named value set', () => {
      const customCategoriesVS = new FshValueSet('CustomCategories');
      customCategoriesVS.id = 'custom-categories';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'url';
      caretValueRule.value = 'http://different-url.com/ValueSet/custom-categories';
      customCategoriesVS.rules.push(caretValueRule);
      doc.valueSets.set('CustomCategories', customCategoriesVS);

      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      const vsRule = new BindingRule('category');
      vsRule.valueSet = 'CustomCategories';
      vsRule.strength = 'extensible';
      profile.rules.push(vsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const element = sd.findElement('Observation.category');
      expect(element.binding.valueSet).toBe('http://different-url.com/ValueSet/custom-categories');
      expect(element.binding.strength).toBe('extensible');
    });

    it('should not apply a value set rule on an element that cannot support it', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const vsRule = new BindingRule('note').withFile('Codeless.fsh').withLocation([6, 9, 6, 25]);
      vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
      vsRule.strength = 'extensible';
      profile.rules.push(vsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');
      const baseElement = baseStructDef.findElement('Observation.note');
      const changedElement = sd.findElement('Observation.note');
      expect(baseElement.binding).toBeUndefined();
      expect(changedElement.binding).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Codeless\.fsh.*Line: 6\D*/s);
    });

    it('should not override a binding with a less strict binding', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const vsRule = new BindingRule('category')
        .withFile('Strict.fsh')
        .withLocation([9, 10, 9, 35]);
      vsRule.valueSet = 'http://example.org/fhir/ValueSet/some-valueset';
      vsRule.strength = 'example';
      profile.rules.push(vsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');
      const baseElement = baseStructDef.findElement('Observation.category');
      const changedElement = sd.findElement('Observation.category');
      expect(baseElement.binding.valueSet).toBe(
        'http://hl7.org/fhir/ValueSet/observation-category'
      );
      expect(baseElement.binding.strength).toBe('preferred');
      expect(changedElement.binding.valueSet).toBe(
        'http://hl7.org/fhir/ValueSet/observation-category'
      );
      expect(changedElement.binding.strength).toBe('preferred');
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Strict\.fsh.*Line: 9\D*/s);
    });
  });

  describe('#OnlyRule', () => {
    it('should apply a correct OnlyRule on a non-reference choice', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new OnlyRule('value[x]');
      rule.types = [{ type: 'string' }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValue = baseStructDef.findElement('Observation.value[x]');
      const constrainedValue = sd.findElement('Observation.value[x]');

      expect(baseValue.type).toHaveLength(11);
      expect(baseValue.type[0]).toEqual(new ElementDefinitionType('Quantity'));
      expect(baseValue.type[1]).toEqual(new ElementDefinitionType('CodeableConcept'));
      expect(baseValue.type[2]).toEqual(new ElementDefinitionType('string'));

      expect(constrainedValue.type).toHaveLength(1);
      expect(constrainedValue.type[0]).toEqual(new ElementDefinitionType('string'));
    });

    it('should apply a correct OnlyRule on a reference', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new OnlyRule('subject');
      rule.types = [{ type: 'Device', isReference: true }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseSubject = baseStructDef.findElement('Observation.subject');
      const constrainedSubject = sd.findElement('Observation.subject');

      expect(baseSubject.type).toHaveLength(1);
      expect(baseSubject.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Patient',
          'http://hl7.org/fhir/StructureDefinition/Group',
          'http://hl7.org/fhir/StructureDefinition/Device',
          'http://hl7.org/fhir/StructureDefinition/Location'
        )
      );

      expect(constrainedSubject.type).toHaveLength(1);
      expect(constrainedSubject.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Device'
        )
      );
    });

    it('should apply a correct OnlyRule on a reference to Any', () => {
      const extension = new Extension('Foo');

      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'Observation', isReference: true },
        { type: 'Condition', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(50);
      expect(baseValueX.type.find(t => t.code === 'Reference')).toEqual(
        new ElementDefinitionType('Reference')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Observation',
          'http://hl7.org/fhir/StructureDefinition/Condition'
        )
      );
    });

    it('should apply a correct OnlyRule on a canonical', () => {
      const profile = new Profile('Foo');
      profile.parent = 'PlanDefinition';

      const rule = new OnlyRule('action.definition[x]');
      rule.types = [{ type: 'Questionnaire', isCanonical: true }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('PlanDefinition');

      const baseActionDef = baseStructDef.findElement('PlanDefinition.action.definition[x]');
      const constrainedActionDef = sd.findElement('PlanDefinition.action.definition[x]');

      expect(baseActionDef.type).toHaveLength(2);
      expect(baseActionDef.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/StructureDefinition/PlanDefinition',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
      expect(baseActionDef.type[1]).toEqual(new ElementDefinitionType('uri'));

      expect(constrainedActionDef.type).toHaveLength(1);
      expect(constrainedActionDef.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
    });

    it('should apply a correct OnlyRule with a version on a canonical', () => {
      const profile = new Profile('Foo');
      profile.parent = 'PlanDefinition';

      const rule = new OnlyRule('action.definition[x]');
      rule.types = [{ type: 'Questionnaire|4.0.1', isCanonical: true }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('PlanDefinition');

      const baseActionDef = baseStructDef.findElement('PlanDefinition.action.definition[x]');
      const constrainedActionDef = sd.findElement('PlanDefinition.action.definition[x]');

      expect(baseActionDef.type).toHaveLength(2);
      expect(baseActionDef.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/StructureDefinition/PlanDefinition',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
      expect(baseActionDef.type[1]).toEqual(new ElementDefinitionType('uri'));

      expect(constrainedActionDef.type).toHaveLength(1);
      expect(constrainedActionDef.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Questionnaire|4.0.1'
        )
      );
    });

    it('should apply a correct OnlyRule on a canonical to Any', () => {
      const extension = new Extension('Foo');

      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'Observation', isCanonical: true },
        { type: 'Condition', isCanonical: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(50);
      expect(baseValueX.type.find(t => t.code === 'canonical')).toEqual(
        new ElementDefinitionType('canonical')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Observation',
          'http://hl7.org/fhir/StructureDefinition/Condition'
        )
      );
    });

    it('should apply a correct OnlyRule with a specific reference target constrained', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new OnlyRule('hasMember[Observation]');
      rule.types = [
        { type: 'http://hl7.org/fhir/StructureDefinition/bodyheight', isReference: true },
        { type: 'http://hl7.org/fhir/StructureDefinition/bodyweight', isReference: true }
      ];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseHasMember = baseStructDef.findElement('Observation.hasMember');
      const constrainedHasMember = sd.findElement('Observation.hasMember');

      expect(baseHasMember.type).toHaveLength(1);
      expect(baseHasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Observation',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );

      expect(constrainedHasMember.type).toHaveLength(1);
      expect(constrainedHasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/bodyheight',
          'http://hl7.org/fhir/StructureDefinition/bodyweight',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );
    });

    it('should apply a correct OnlyRule with a specific canonical target constrained', () => {
      const profile = new Profile('Foo');
      profile.parent = 'PlanDefinition';

      const rule = new OnlyRule('action.definitionCanonical[PlanDefinition]');
      rule.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/shareableplandefinition',
          isCanonical: true
        },
        {
          type: 'http://hl7.org/fhir/StructureDefinition/computableplandefinition',
          isCanonical: true
        }
      ];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('PlanDefinition');

      const baseActionDef = baseStructDef.findElement('PlanDefinition.action.definition[x]');
      const constrainedActionDefCan = sd.findElement(
        'PlanDefinition.action.definition[x]:definitionCanonical'
      );

      expect(baseActionDef.type).toHaveLength(2);
      expect(baseActionDef.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/StructureDefinition/PlanDefinition',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
      expect(baseActionDef.type[1]).toEqual(new ElementDefinitionType('uri'));

      expect(constrainedActionDefCan.type).toHaveLength(1);
      expect(constrainedActionDefCan.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/StructureDefinition/shareableplandefinition',
          'http://hl7.org/fhir/StructureDefinition/computableplandefinition',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
    });

    it('should apply a correct OnlyRule on a non-reference FSHy choice', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const targetProfile = new Profile('MySpecialQuantity');
      targetProfile.parent = 'Quantity';
      doc.profiles.set(targetProfile.name, targetProfile);

      const rule = new OnlyRule('value[x]');
      rule.types = [{ type: 'MySpecialQuantity' }];
      profile.rules.push(rule);

      // force-load Quantity into the cache since MySpecialQuantity declares it as parent
      fisher.fishForStructureDefinition('Quantity');

      exporter.exportStructDef(profile);
      const sd = pkg.profiles.find(d => d.name === 'Foo');
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValue = baseStructDef.findElement('Observation.value[x]');
      const constrainedValue = sd.findElement('Observation.value[x]');

      expect(baseValue.type).toHaveLength(11);
      expect(baseValue.type[0]).toEqual(new ElementDefinitionType('Quantity'));
      expect(baseValue.type[1]).toEqual(new ElementDefinitionType('CodeableConcept'));
      expect(baseValue.type[2]).toEqual(new ElementDefinitionType('string'));

      expect(constrainedValue.type).toHaveLength(1);
      expect(constrainedValue.type[0]).toEqual(
        new ElementDefinitionType('Quantity').withProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialQuantity'
        )
      );
    });

    it('should apply a correct OnlyRule on a FSHy reference', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const targetProfile = new Profile('MySpecialDevice');
      targetProfile.parent = 'Device';
      doc.profiles.set(targetProfile.name, targetProfile);

      const rule = new OnlyRule('subject');
      rule.types = [{ type: 'MySpecialDevice', isReference: true }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles.find(p => p.name === 'Foo');
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseSubject = baseStructDef.findElement('Observation.subject');
      const constrainedSubject = sd.findElement('Observation.subject');

      expect(baseSubject.type).toHaveLength(1);
      expect(baseSubject.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Patient',
          'http://hl7.org/fhir/StructureDefinition/Group',
          'http://hl7.org/fhir/StructureDefinition/Device',
          'http://hl7.org/fhir/StructureDefinition/Location'
        )
      );

      expect(constrainedSubject.type).toHaveLength(1);
      expect(constrainedSubject.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialDevice'
        )
      );
    });

    it('should apply a correct OnlyRule on a FSHy canonical', () => {
      const profile = new Profile('Foo');
      profile.parent = 'PlanDefinition';

      const targetProfile = new Profile('MySpecialPlanDefinition');
      targetProfile.parent = 'PlanDefinition';
      doc.profiles.set(targetProfile.name, targetProfile);

      const rule = new OnlyRule('action.definitionCanonical');
      rule.types = [{ type: 'MySpecialPlanDefinition', isCanonical: true }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles.find(p => p.name === 'Foo');
      const baseStructDef = fisher.fishForStructureDefinition('PlanDefinition');

      const baseActionDef = baseStructDef.findElement('PlanDefinition.action.definition[x]');
      const constrainedActionDefCan = sd.findElement(
        'PlanDefinition.action.definition[x]:definitionCanonical'
      );

      expect(baseActionDef.type).toHaveLength(2);
      expect(baseActionDef.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/StructureDefinition/PlanDefinition',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
      expect(baseActionDef.type[1]).toEqual(new ElementDefinitionType('uri'));

      expect(constrainedActionDefCan.type).toHaveLength(1);
      expect(constrainedActionDefCan.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialPlanDefinition'
        )
      );
    });

    it('should apply a correct OnlyRule with a specific target constrained to FSHy definition', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const targetProfile1 = new Profile('MySpecialObservation1');
      targetProfile1.parent = 'Observation';
      const targetProfile2 = new Profile('MySpecialObservation2');
      targetProfile2.parent = 'Observation';
      doc.profiles.set(targetProfile1.name, targetProfile1);
      doc.profiles.set(targetProfile2.name, targetProfile2);

      const rule = new OnlyRule('hasMember[Observation]');
      rule.types = [
        { type: 'MySpecialObservation1', isReference: true },
        { type: 'MySpecialObservation2', isReference: true }
      ];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles.find(p => p.name === 'Foo');
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseHasMember = baseStructDef.findElement('Observation.hasMember');
      const constrainedHasMember = sd.findElement('Observation.hasMember');

      expect(baseHasMember.type).toHaveLength(1);
      expect(baseHasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Observation',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );

      expect(constrainedHasMember.type).toHaveLength(1);
      expect(constrainedHasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialObservation1',
          'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialObservation2',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );
    });

    it('should apply a correct OnlyRule with a specific canonical target constrained to FSHy definition', () => {
      const profile = new Profile('Foo');
      profile.parent = 'PlanDefinition';

      const targetProfile1 = new Profile('MySpecialPlanDefinition1');
      targetProfile1.parent = 'PlanDefinition';
      const targetProfile2 = new Profile('MySpecialPlanDefinition2');
      targetProfile2.parent = 'PlanDefinition';
      doc.profiles.set(targetProfile1.name, targetProfile1);
      doc.profiles.set(targetProfile2.name, targetProfile2);

      const rule = new OnlyRule('action.definitionCanonical[PlanDefinition]');
      rule.types = [
        { type: 'MySpecialPlanDefinition1', isCanonical: true },
        { type: 'MySpecialPlanDefinition2', isCanonical: true }
      ];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles.find(p => p.name === 'Foo');
      const baseStructDef = fisher.fishForStructureDefinition('PlanDefinition');

      const baseActionDef = baseStructDef.findElement('PlanDefinition.action.definition[x]');
      const constrainedActionDefCan = sd.findElement(
        'PlanDefinition.action.definition[x]:definitionCanonical'
      );

      expect(baseActionDef.type).toHaveLength(2);
      expect(baseActionDef.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/StructureDefinition/PlanDefinition',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
      expect(baseActionDef.type[1]).toEqual(new ElementDefinitionType('uri'));

      expect(constrainedActionDefCan.type).toHaveLength(1);
      expect(constrainedActionDefCan.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialPlanDefinition1',
          'http://hl7.org/fhir/us/minimal/StructureDefinition/MySpecialPlanDefinition2',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
    });

    it('should apply correct OnlyRules on circular FSHy reference choices', () => {
      const profile1 = new Profile('Foo');
      profile1.parent = 'Observation';
      doc.profiles.set(profile1.name, profile1);
      const profile2 = new Profile('Bar');
      profile2.parent = 'Observation';
      doc.profiles.set(profile2.name, profile2);

      const rule1 = new OnlyRule('hasMember[Observation]');
      rule1.types = [{ type: 'Bar', isReference: true }];
      const rule2 = new OnlyRule('hasMember[Observation]');
      rule2.types = [{ type: 'Foo', isReference: true }];
      profile1.rules.push(rule1);
      profile2.rules.push(rule2);

      withDebugLogging(() => exporter.export());
      loggerSpy.getAllMessages().forEach(m => {
        expect(m).not.toMatch(/circular/i);
      });

      const sdFoo = pkg.profiles.find(def => def.id === 'Foo');
      const sdBar = pkg.profiles.find(def => def.id === 'Bar');
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseHasMember = baseStructDef.findElement('Observation.hasMember');
      const constrainedHasMemberFoo = sdFoo.findElement('Observation.hasMember');
      const constrainedHasMemberBar = sdBar.findElement('Observation.hasMember');

      expect(baseHasMember.type).toHaveLength(1);
      expect(baseHasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Observation',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );

      expect(constrainedHasMemberFoo.type).toHaveLength(1);
      expect(constrainedHasMemberFoo.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );

      expect(constrainedHasMemberBar.type).toHaveLength(1);
      expect(constrainedHasMemberBar.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );
    });

    it('should apply correct OnlyRules on circular FSHy canonical choices', () => {
      const profile1 = new Profile('Foo');
      profile1.parent = 'PlanDefinition';
      doc.profiles.set(profile1.name, profile1);
      const profile2 = new Profile('Bar');
      profile2.parent = 'PlanDefinition';
      doc.profiles.set(profile2.name, profile2);

      const rule1 = new OnlyRule('action.definitionCanonical[PlanDefinition]');
      rule1.types = [{ type: 'Bar', isCanonical: true }];
      const rule2 = new OnlyRule('action.definitionCanonical[PlanDefinition]');
      rule2.types = [{ type: 'Foo', isCanonical: true }];
      profile1.rules.push(rule1);
      profile2.rules.push(rule2);

      withDebugLogging(() => exporter.export());
      loggerSpy.getAllMessages().forEach(m => {
        expect(m).not.toMatch(/circular/i);
      });

      const sdFoo = pkg.profiles.find(def => def.id === 'Foo');
      const sdBar = pkg.profiles.find(def => def.id === 'Bar');
      const baseStructDef = fisher.fishForStructureDefinition('PlanDefinition');

      const baseActionDef = baseStructDef.findElement('PlanDefinition.action.definition[x]');
      const constrainedActionDefCan = sdFoo.findElement(
        'PlanDefinition.action.definition[x]:definitionCanonical'
      );
      const constrainedHasMemberBar = sdBar.findElement(
        'PlanDefinition.action.definition[x]:definitionCanonical'
      );

      expect(baseActionDef.type).toHaveLength(2);
      expect(baseActionDef.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/StructureDefinition/PlanDefinition',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
      expect(baseActionDef.type[1]).toEqual(new ElementDefinitionType('uri'));

      expect(constrainedActionDefCan.type).toHaveLength(1);
      expect(constrainedActionDefCan.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );

      expect(constrainedHasMemberBar.type).toHaveLength(1);
      expect(constrainedHasMemberBar.type[0]).toEqual(
        new ElementDefinitionType('canonical').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/ActivityDefinition',
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo',
          'http://hl7.org/fhir/StructureDefinition/Questionnaire'
        )
      );
    });

    it('should safely apply correct OnlyRule with circular FSHy parent', () => {
      const profile1 = new Profile('Foo');
      profile1.parent = 'Observation';
      doc.profiles.set(profile1.name, profile1);
      const profile2 = new Profile('Bar');
      profile2.parent = 'Foo';
      doc.profiles.set(profile2.name, profile2);

      const rule = new OnlyRule('hasMember[Observation]');
      rule.types = [{ type: 'Bar', isReference: true }];
      profile1.rules.push(rule);

      withDebugLogging(() => exporter.export());
      loggerSpy.getAllMessages().forEach(m => {
        expect(m).not.toMatch(/circular/i);
      });

      const sdFoo = pkg.profiles.find(def => def.id === 'Foo');
      const sdBar = pkg.profiles.find(def => def.id === 'Bar');
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      expect(sdFoo.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Observation');
      expect(sdBar.baseDefinition).toBe('http://hl7.org/fhir/us/minimal/StructureDefinition/Foo');

      const baseHasMember = baseStructDef.findElement('Observation.hasMember');
      const constrainedHasMemberFoo = sdFoo.findElement('Observation.hasMember');
      const constrainedHasMemberBar = sdBar.findElement('Observation.hasMember');

      expect(baseHasMember.type).toHaveLength(1);
      expect(baseHasMember.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Observation',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );

      expect(constrainedHasMemberFoo.type).toHaveLength(1);
      expect(constrainedHasMemberFoo.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );

      expect(constrainedHasMemberBar.type).toHaveLength(1);
      expect(constrainedHasMemberBar.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar',
          'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
          'http://hl7.org/fhir/StructureDefinition/MolecularSequence'
        )
      );
    });

    it('should apply a correct OnlyRule on a reference to a logical type defined as a reference target with the type characteristics extension', () => {
      // Logical: FutureLogic
      // * ^extension.url = "http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics"
      // * ^extension.valueCode = #has-size
      // * ^extension[1].url = "http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics",
      // * ^extension[1].valueCode = #can-be-target
      const logical = new Logical('FutureLogic');
      const hasSizeUrl = new CaretValueRule('');
      hasSizeUrl.caretPath = 'extension.url';
      hasSizeUrl.value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics';
      const hasSizeCode = new CaretValueRule('');
      hasSizeCode.caretPath = 'extension.valueCode';
      hasSizeCode.value = new FshCode('has-size');
      const canBeTargetUrl = new CaretValueRule('');
      canBeTargetUrl.caretPath = 'extension[1].url';
      canBeTargetUrl.value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics';
      const canBeTargetCode = new CaretValueRule('');
      canBeTargetCode.caretPath = 'extension[1].valueCode';
      canBeTargetCode.value = new FshCode('can-be-target');
      logical.rules.push(hasSizeUrl, hasSizeCode, canBeTargetUrl, canBeTargetCode);
      doc.logicals.set(logical.name, logical);

      // Extension: MyExtension
      // * value[x] only Reference(FutureLogic or Observation)
      const extension = new Extension('MyExtension');
      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'FutureLogic', isReference: true },
        { type: 'Observation', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(50);
      expect(baseValueX.type.find(t => t.code === 'Reference')).toEqual(
        new ElementDefinitionType('Reference')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/FutureLogic',
          'http://hl7.org/fhir/StructureDefinition/Observation'
        )
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a correct OnlyRule on a reference to a logical type defined as a reference target with the logical target extension', () => {
      // Logical: FutureLogic
      // * ^extension.url = "http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics"
      // * ^extension.valueCode = #has-size
      // * ^extension[1].url = "http://hl7.org/fhir/tools/StructureDefinition/logical-target",
      // * ^extension[1].valueBoolean = true
      const logical = new Logical('FutureLogic');
      const hasSizeUrl = new CaretValueRule('');
      hasSizeUrl.caretPath = 'extension.url';
      hasSizeUrl.value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics';
      const hasSizeCode = new CaretValueRule('');
      hasSizeCode.caretPath = 'extension.valueCode';
      hasSizeCode.value = new FshCode('has-size');
      const logicalTargetUrl = new CaretValueRule('');
      logicalTargetUrl.caretPath = 'extension[1].url';
      logicalTargetUrl.value = 'http://hl7.org/fhir/tools/StructureDefinition/logical-target';
      const logicalTargetValue = new CaretValueRule('');
      logicalTargetValue.caretPath = 'extension[1].valueBoolean';
      logicalTargetValue.value = true;
      logical.rules.push(hasSizeUrl, hasSizeCode, logicalTargetUrl, logicalTargetValue);
      doc.logicals.set(logical.name, logical);

      // Extension: MyExtension
      // * value[x] only Reference(FutureLogic or Observation)
      const extension = new Extension('MyExtension');
      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'FutureLogic', isReference: true },
        { type: 'Observation', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(50);
      expect(baseValueX.type.find(t => t.code === 'Reference')).toEqual(
        new ElementDefinitionType('Reference')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/FutureLogic',
          'http://hl7.org/fhir/StructureDefinition/Observation'
        )
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a correct OnlyRule on a reference to a FSHy logical type defined with the can-be-target characteristic', () => {
      // Logical: FutureLogic
      // Characteristics: #has-size, #can-be-target
      const logical = new Logical('FutureLogic');
      logical.characteristics = ['has-size', 'can-be-target'];
      doc.logicals.set(logical.name, logical);

      // Extension: MyExtension
      // * value[x] only Reference(FutureLogic or Observation)
      const extension = new Extension('MyExtension');
      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'FutureLogic', isReference: true },
        { type: 'Observation', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(50);
      expect(baseValueX.type.find(t => t.code === 'Reference')).toEqual(
        new ElementDefinitionType('Reference')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/FutureLogic',
          'http://hl7.org/fhir/StructureDefinition/Observation'
        )
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a correct OnlyRule on a reference to a FSHy logical type defined with the type characteristics extension', () => {
      // Logical: FutureLogic
      // * ^extension[0].url = "http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics"
      // * ^extension[0].valueCode = #can-be-target
      const logical = new Logical('FutureLogic');
      const typeCharacteristicsUrl = new CaretValueRule('');
      typeCharacteristicsUrl.caretPath = 'extension[0].url';
      typeCharacteristicsUrl.value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics';
      const typeCharacteristicsValue = new CaretValueRule('');
      typeCharacteristicsValue.caretPath = 'extension[0].valueCode';
      typeCharacteristicsValue.value = new FshCode('can-be-target');
      logical.rules.push(typeCharacteristicsUrl, typeCharacteristicsValue);
      doc.logicals.set(logical.name, logical);

      // Extension: MyExtension
      // * value[x] only Reference(FutureLogic or Observation)
      const extension = new Extension('MyExtension');
      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'FutureLogic', isReference: true },
        { type: 'Observation', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(50);
      expect(baseValueX.type.find(t => t.code === 'Reference')).toEqual(
        new ElementDefinitionType('Reference')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/FutureLogic',
          'http://hl7.org/fhir/StructureDefinition/Observation'
        )
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a correct OnlyRule on a reference to a FSHy logical type defined with the logical target extension', () => {
      // Logical: FutureLogic
      // * ^extension[0].url = "http://hl7.org/fhir/tools/StructureDefinition/logical-target"
      // * ^extension[0].valueBoolean = true
      const logical = new Logical('FutureLogic');
      const logicalTargetUrl = new CaretValueRule('');
      logicalTargetUrl.caretPath = 'extension[0].url';
      logicalTargetUrl.value = 'http://hl7.org/fhir/tools/StructureDefinition/logical-target';
      const logicalTargetValue = new CaretValueRule('');
      logicalTargetValue.caretPath = 'extension[0].valueBoolean';
      logicalTargetValue.value = true;
      logical.rules.push(logicalTargetUrl, logicalTargetValue);
      doc.logicals.set(logical.name, logical);

      // Extension: MyExtension
      // * value[x] only Reference(FutureLogic or Observation)
      const extension = new Extension('MyExtension');
      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'FutureLogic', isReference: true },
        { type: 'Observation', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(50);
      expect(baseValueX.type.find(t => t.code === 'Reference')).toEqual(
        new ElementDefinitionType('Reference')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/FutureLogic',
          'http://hl7.org/fhir/StructureDefinition/Observation'
        )
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a correct OnlyRule on a self-referential FSHy logical type with the can-be-target characteristic', () => {
      // Logical: FutureLogic
      // Characteristics: #has-size, #can-be-target
      // * alternate 0..* Reference(FutureLogic) "Reference to alternate future"
      const logical = new Logical('FutureLogic');
      logical.characteristics = ['has-size', 'can-be-target'];
      const alternateElement = new AddElementRule('alternate');
      alternateElement.min = 0;
      alternateElement.max = '*';
      alternateElement.types = [{ type: 'FutureLogic', isReference: true }];
      alternateElement.short = 'Reference to alternate future';
      logical.rules.push(alternateElement);
      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);
      const sd = pkg.logicals[0];
      const alternateDefinition = sd.findElement('FutureLogic.alternate');
      expect(alternateDefinition.type).toHaveLength(1);
      expect(alternateDefinition.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/FutureLogic'
        )
      );

      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a correct OnlyRule on a self-referential FSHy logical type with the type characteristics extension', () => {
      // Logical: FutureLogic
      // * alternate 0..* Reference(FutureLogic) "Reference to alternate future"
      // * ^extension[0].url = "http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics"
      // * ^extension[0].valueCode = #can-be-target
      const logical = new Logical('FutureLogic');
      const alternateElement = new AddElementRule('alternate');
      alternateElement.min = 0;
      alternateElement.max = '*';
      alternateElement.types = [{ type: 'FutureLogic', isReference: true }];
      alternateElement.short = 'Reference to alternate future';
      const typeCharacteristicsUrl = new CaretValueRule('');
      typeCharacteristicsUrl.caretPath = 'extension[0].url';
      typeCharacteristicsUrl.value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics';
      const typeCharacteristicsValue = new CaretValueRule('');
      typeCharacteristicsValue.caretPath = 'extension[0].valueCode';
      typeCharacteristicsValue.value = new FshCode('can-be-target');
      logical.rules.push(alternateElement, typeCharacteristicsUrl, typeCharacteristicsValue);
      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);
      const sd = pkg.logicals[0];
      const alternateDefinition = sd.findElement('FutureLogic.alternate');
      expect(alternateDefinition.type).toHaveLength(1);
      expect(alternateDefinition.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/FutureLogic'
        )
      );

      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an OnlyRule on a reference to a FSHy logical type and log a warning if it is not specified as a reference target', () => {
      // Logical: FutureLogic
      // Characteristics: #has-size, #has-length
      const logical = new Logical('FutureLogic');
      logical.characteristics = ['has-size', 'has-length'];
      doc.logicals.set(logical.name, logical);

      // Extension: MyExtension
      // * value[x] only Reference(FutureLogic or Observation)
      const extension = new Extension('MyExtension');
      const rule = new OnlyRule('value[x]').withFile('Extension.fsh').withLocation([5, 3, 5, 28]);
      rule.types = [
        { type: 'FutureLogic', isReference: true },
        { type: 'Observation', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(50);
      expect(baseValueX.type.find(t => t.code === 'Reference')).toEqual(
        new ElementDefinitionType('Reference')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/FutureLogic',
          'http://hl7.org/fhir/StructureDefinition/Observation'
        )
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Referenced type FutureLogic does not specify that it can be the target of a reference\./s
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Extension\.fsh.*Line: 5/s);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a correct OnlyRule on a reference to a defined logical type defined with the logical target extension', () => {
      // Extension: MyExtension
      // * value[x] only Reference(FuturePlanet or Location)
      const extension = new Extension('MyExtension');
      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'FuturePlanet', isReference: true },
        { type: 'Location', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const constrainedValueX = sd.findElement('Extension.value[x]');
      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/planet/logicals/StructureDefinition/FuturePlanet',
          'http://hl7.org/fhir/StructureDefinition/Location'
        )
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a correct OnlyRule on a reference to a defined logical type and log a warning if it is defined without the logical target extension', () => {
      // Extension: MyExtension
      // * value[x] only Reference(PastPlanet or Location)
      const extension = new Extension('MyExtension');
      const rule = new OnlyRule('value[x]').withFile('Extension.fsh').withLocation([4, 3, 4, 26]);
      rule.types = [
        { type: 'PastPlanet', isReference: true },
        { type: 'Location', isReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const constrainedValueX = sd.findElement('Extension.value[x]');
      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('Reference').withTargetProfiles(
          'http://hl7.org/planet/logicals/StructureDefinition/PastPlanet',
          'http://hl7.org/fhir/StructureDefinition/Location'
        )
      );
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Referenced type PastPlanet does not specify that it can be the target of a reference\./s
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Extension\.fsh.*Line: 4/s);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log a debug message when we detect a circular dependency in OnlyRules that might result in incomplete definitions', () => {
      const profile1 = new Profile('FooQuantity');
      profile1.parent = 'Quantity';
      const p1ContainsRule = new ContainsRule('extension');
      p1ContainsRule.items.push({ name: 'quantity-ext', type: 'QuantityExtension' });
      const p1OnlyRule = new OnlyRule('extension[quantity-ext].valueQuantity');
      p1OnlyRule.types = [{ type: 'BarQuantity' }];
      const p1AssignedValueRule = new AssignmentRule('extension[quantity-ext].valueQuantity.code');
      p1AssignedValueRule.value = new FshCode('mg');
      profile1.rules = [p1ContainsRule, p1OnlyRule, p1AssignedValueRule];
      doc.profiles.set(profile1.name, profile1);

      const profile2 = new Profile('BarQuantity');
      profile2.parent = 'Quantity';
      const p2ContainsRule = new ContainsRule('extension');
      p2ContainsRule.items.push({ name: 'quantity-ext', type: 'QuantityExtension' });
      const p2OnlyRule = new OnlyRule('extension[quantity-ext].valueQuantity');
      p2OnlyRule.types = [{ type: 'FooQuantity' }];
      const p2AssignedValueRule = new AssignmentRule('extension[quantity-ext].valueQuantity.code');
      p2AssignedValueRule.value = new FshCode('mg');
      profile2.rules = [p2ContainsRule, p2OnlyRule, p2AssignedValueRule];
      doc.profiles.set(profile2.name, profile2);

      const extension = new Extension('QuantityExtension');
      const extOnlyRule = new OnlyRule('value[x]');
      extOnlyRule.types = [{ type: 'Quantity' }];
      extension.rules = [extOnlyRule];
      doc.extensions.set(extension.name, extension);

      withDebugLogging(() => exporter.export());

      expect(loggerSpy.getLastMessage('debug')).toMatch(
        /Warning: Circular .* BarQuantity and FooQuantity/
      );
    });

    it('should log a warning message when we detect a circular dependency that causes an incomplete parent', () => {
      const profile1 = new Profile('FooQuantity')
        .withFile('FooQuantity.fsh')
        .withLocation([6, 7, 11, 33]);
      profile1.parent = 'BarQuantity';
      doc.profiles.set(profile1.name, profile1);

      const profile2 = new Profile('BarQuantity');
      profile2.parent = 'Quantity';
      const p2ContainsRule = new ContainsRule('extension');
      p2ContainsRule.items.push({ name: 'quantity-ext', type: 'QuantityExtension' });
      const p2OnlyRule = new OnlyRule('extension[quantity-ext].valueQuantity');
      p2OnlyRule.types = [{ type: 'FooQuantity' }];
      const p2AssignedValueRule = new AssignmentRule('extension[quantity-ext].valueQuantity.code');
      p2AssignedValueRule.value = new FshCode('mg');
      profile2.rules = [p2ContainsRule, p2OnlyRule, p2AssignedValueRule];
      doc.profiles.set(profile2.name, profile2);

      const extension = new Extension('QuantityExtension');
      const extOnlyRule = new OnlyRule('value[x]');
      extOnlyRule.types = [{ type: 'Quantity' }];
      extension.rules = [extOnlyRule];
      doc.extensions.set(extension.name, extension);

      exporter.export();

      const lastMessage = loggerSpy.getLastMessage('warn');
      expect(lastMessage).toMatch(/The definition of FooQuantity may be incomplete .* BarQuantity/);
      expect(lastMessage).toMatch(/File: FooQuantity\.fsh.*Line: 6 - 11\D*/s);
    });

    it('should apply an OnlyRule to constrain an id element', () => {
      const specialString = new Profile('SpecialString');
      specialString.parent = 'string';
      doc.profiles.set(specialString.name, specialString);
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const onlyRule = new OnlyRule('code.id');
      onlyRule.types = [{ type: 'SpecialString' }];
      profile.rules.push(onlyRule);
      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const codeId = sd.findElement('Observation.code.id');
      expect(codeId.type.length).toBe(1);
      expect(codeId.type[0].getActualCode()).toBe('http://hl7.org/fhirpath/System.String');
      expect(codeId.type[0].profile.length).toBe(1);
      expect(codeId.type[0].profile[0]).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/SpecialString'
      );
    });

    it('should apply an OnlyRule to constrain a url element', () => {
      const specialUri = new Profile('SpecialUri');
      specialUri.parent = 'uri';
      doc.profiles.set(specialUri.name, specialUri);
      const extension = new Extension('SpecialExtension');
      const onlyRule = new OnlyRule('url');
      onlyRule.types = [{ type: 'SpecialUri' }];
      extension.rules.push(onlyRule);
      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const url = sd.findElement('Extension.url');
      expect(url.type.length).toBe(1);
      expect(url.type[0].getActualCode()).toBe('http://hl7.org/fhirpath/System.String');
      expect(url.type[0].profile.length).toBe(1);
      expect(url.type[0].profile[0]).toBe(
        'http://hl7.org/fhir/us/minimal/StructureDefinition/SpecialUri'
      );
    });

    it('should not apply an incorrect OnlyRule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new OnlyRule('value[x]').withFile('Only.fsh').withLocation([10, 12, 10, 22]);
      rule.types = [{ type: 'instant' }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValue = baseStructDef.findElement('Observation.value[x]');
      const constrainedValue = sd.findElement('Observation.value[x]');

      expect(baseValue.type).toHaveLength(11);
      expect(constrainedValue.type).toHaveLength(11);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Only\.fsh.*Line: 10\D*/s);
    });

    it('should log an error when a type constraint implicitly removes a choice created in the current StructureDefinition', () => {
      const flagFirst = new Profile('FlagFirst');
      flagFirst.parent = 'Observation';
      const flagRule = new FlagRule('valueCodeableConcept')
        .withFile('FlagFirst.fsh')
        .withLocation([7, 12, 7, 31]);
      flagRule.mustSupport = true;
      const secondFlagRule = new FlagRule('valueString')
        .withFile('FlagFirst.fsh')
        .withLocation([8, 12, 8, 31]);
      secondFlagRule.mustSupport = true;
      const onlyRule = new OnlyRule('value[x]')
        .withFile('FlagFirst.fsh')
        .withLocation([9, 12, 9, 24]);
      onlyRule.types = [{ type: 'Quantity' }, { type: 'string' }];

      flagFirst.rules.push(flagRule); // * valueCodeableConcept MS
      flagFirst.rules.push(secondFlagRule); // * valueString MS
      flagFirst.rules.push(onlyRule); // value[x] only Quantity or String

      exporter.exportStructDef(flagFirst);
      const sd = pkg.profiles[0];
      const constrainedValue = sd.findElement('Observation.value[x]');
      expect(constrainedValue.type).toHaveLength(2);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: FlagFirst\.fsh.*Line: 9\D*/s);
    });

    it('should not log an error when a type constraint implicitly removes a choice that has no rules applied in the current StructureDefinition', () => {
      loggerSpy.reset();
      const parentProfile = new Profile('ParentProfile');
      parentProfile.parent = 'Observation';
      const flagRule = new FlagRule('valueCodeableConcept');
      flagRule.mustSupport = true;
      parentProfile.rules.push(flagRule); // * valueCodeableConcept MS

      const childProfile = new Profile('ChildProfile');
      childProfile.parent = 'ParentProfile';
      const onlyRule = new OnlyRule('value[x]');
      onlyRule.types = [{ type: 'Quantity' }];
      childProfile.rules.push(onlyRule); // * value[x] only Quantity
      exporter.exportStructDef(parentProfile);
      exporter.exportStructDef(childProfile);
      expect(pkg.profiles).toHaveLength(2);
      expect(loggerSpy.getAllLogs()).toHaveLength(0);
    });

    it('should not log an error when a type constraint is applied to a specific slice', () => {
      loggerSpy.reset();
      const profile = new Profile('ConstrainedObservation');
      profile.parent = 'Observation';
      // * component ^slicing.discriminator[0].type = #pattern
      // * component ^slicing.discriminator[0].path = "code"
      // * component ^slicing.rules = #open
      // * component contains FirstSlice and SecondSlice
      // * component[FirstSlice].value[x] only Quantity
      // * component[FirstSlice].valueQuantity 1..1
      // * component[SecondSlice].value[x] only string
      const slicingType = new CaretValueRule('component');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('pattern');
      const slicingPath = new CaretValueRule('component');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'code';
      const slicingRules = new CaretValueRule('component');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const componentSlices = new ContainsRule('component');
      componentSlices.items = [{ name: 'FirstSlice' }, { name: 'SecondSlice' }];
      const firstType = new OnlyRule('component[FirstSlice].value[x]');
      firstType.types = [{ type: 'Quantity' }];
      const firstCard = new CardRule('component[FirstSlice].valueQuantity');
      firstCard.min = 1;
      firstCard.max = '1';
      const secondType = new OnlyRule('component[SecondSlice].value[x]');
      secondType.types = [{ type: 'string' }];

      profile.rules.push(
        slicingType,
        slicingPath,
        slicingRules,
        componentSlices,
        firstType,
        firstCard,
        secondType
      );

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      expect(sd).toBeTruthy();
      expect(loggerSpy.getAllLogs()).toHaveLength(0);
    });

    it('should not log an error when a type constraint is applied to a slice with a name that is the prefix of another slice', () => {
      loggerSpy.reset();
      const profile = new Profile('ConstrainedObservation');
      profile.parent = 'Observation';
      // * component ^slicing.discriminator[0].type = #pattern
      // * component ^slicing.discriminator[0].path = "code"
      // * component ^slicing.rules = #open
      // * component contains GoodSlice and GoodSliceAgain
      // * component[GoodSliceAgain].value[x] only Quantity
      // * component[GoodSliceAgain].valueQuantity 1..1
      // * component[GoodSlice].value[x] only string
      const slicingType = new CaretValueRule('component');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('pattern');
      const slicingPath = new CaretValueRule('component');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'code';
      const slicingRules = new CaretValueRule('component');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const componentSlices = new ContainsRule('component');
      componentSlices.items = [{ name: 'GoodSlice' }, { name: 'GoodSliceAgain' }];
      const againType = new OnlyRule('component[GoodSliceAgain].value[x]');
      againType.types = [{ type: 'Quantity' }];
      const againCard = new CardRule('component[GoodSliceAgain].valueQuantity');
      againCard.min = 1;
      againCard.max = '1';
      const goodType = new OnlyRule('component[GoodSlice].value[x]');
      goodType.types = [{ type: 'string' }];

      profile.rules.push(
        slicingType,
        slicingPath,
        slicingRules,
        componentSlices,
        againType,
        againCard,
        goodType
      );

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      expect(sd).toBeTruthy();
      expect(loggerSpy.getAllLogs()).toHaveLength(0);
    });

    it('should log an error when extension is constrained with a modifier extension', () => {
      const extension = new Extension('StrangeExtension');
      const modifier = new FlagRule('.');
      modifier.modifier = true;
      extension.rules.push(modifier);
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('ConstrainedObservation');
      profile.parent = 'Observation';
      const onlyRule = new OnlyRule('category.extension')
        .withFile('WrongModifier.fsh')
        .withLocation([8, 3, 8, 55]);
      onlyRule.types = [{ type: 'StrangeExtension' }];
      profile.rules.push(onlyRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const categoryExtension = sd.findElement('Observation.category.extension');
      expect(categoryExtension.type).toHaveLength(1);

      expect(categoryExtension.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/StrangeExtension'
        )
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Modifier extension StrangeExtension used to constrain extension element\. Modifier extensions should only be used with modifierExtension elements\..*File: WrongModifier\.fsh.*Line: 8\D*/s
      );
    });

    it('should log an error each time a modifier extension is used to constrain an extension element', () => {
      const strangeExtension = new Extension('StrangeExtension');
      const modifier = new FlagRule('.');
      modifier.modifier = true;
      strangeExtension.rules.push(modifier);
      doc.extensions.set(strangeExtension.name, strangeExtension);

      const oddExtension = new Extension('OddExtension');
      oddExtension.rules.push(modifier);
      doc.extensions.set(oddExtension.name, oddExtension);

      const regularExtension = new Extension('RegularExtension');
      doc.extensions.set(regularExtension.name, regularExtension);

      const profile = new Profile('ConstrainedObservation');
      profile.parent = 'Observation';
      const onlyRule = new OnlyRule('category.extension')
        .withFile('WrongModifier.fsh')
        .withLocation([8, 3, 8, 55]);
      onlyRule.types = [
        { type: 'StrangeExtension' },
        { type: 'RegularExtension' },
        { type: 'OddExtension' }
      ];
      profile.rules.push(onlyRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const categoryExtension = sd.findElement('Observation.category.extension');
      expect(categoryExtension.type).toHaveLength(1);

      expect(categoryExtension.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/StrangeExtension',
          'http://hl7.org/fhir/us/minimal/StructureDefinition/RegularExtension',
          'http://hl7.org/fhir/us/minimal/StructureDefinition/OddExtension'
        )
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(2);
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /Modifier extension StrangeExtension used to constrain extension element\. Modifier extensions should only be used with modifierExtension elements\..*File: WrongModifier\.fsh.*Line: 8\D*/s
      );
      expect(loggerSpy.getMessageAtIndex(1, 'error')).toMatch(
        /Modifier extension OddExtension used to constrain extension element\. Modifier extensions should only be used with modifierExtension elements\..*File: WrongModifier\.fsh.*Line: 8\D*/s
      );
    });

    it('should not log an error when extension is constrained with a non-modifier extension', () => {
      const extension = new Extension('RegularExtension');
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('ConstrainedObservation');
      profile.parent = 'Observation';
      const onlyRule = new OnlyRule('category.extension');
      onlyRule.types = [{ type: 'RegularExtension' }];
      profile.rules.push(onlyRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const categoryExtension = sd.findElement('Observation.category.extension');
      expect(categoryExtension.type).toHaveLength(1);
      expect(categoryExtension.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/RegularExtension'
        )
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when modifierExtension is constrained with a non-modifier extension', () => {
      const extension = new Extension('OrdinaryExtension');
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('ConstrainedObservation');
      profile.parent = 'Observation';
      const onlyRule = new OnlyRule('modifierExtension')
        .withFile('WrongModifier.fsh')
        .withLocation([8, 3, 8, 55]);
      onlyRule.types = [{ type: 'OrdinaryExtension' }];
      profile.rules.push(onlyRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const categoryExtension = sd.findElement('Observation.modifierExtension');
      expect(categoryExtension.type).toHaveLength(1);

      expect(categoryExtension.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/OrdinaryExtension'
        )
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Non-modifier extension OrdinaryExtension used to constrain modifierExtension element\. Non-modifier extensions should only be used with extension elements\..*File: WrongModifier\.fsh.*Line: 8\D*/s
      );
    });

    it('should not log an error when modifierExtension is constrained with a modifier extension', () => {
      const extension = new Extension('UsefulExtension');
      const modifier = new FlagRule('.');
      modifier.modifier = true;
      extension.rules.push(modifier);
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('ConstrainedObservation');
      profile.parent = 'Observation';
      const onlyRule = new OnlyRule('modifierExtension');
      onlyRule.types = [{ type: 'UsefulExtension' }];
      profile.rules.push(onlyRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const categoryExtension = sd.findElement('Observation.modifierExtension');
      expect(categoryExtension.type).toHaveLength(1);

      expect(categoryExtension.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/UsefulExtension'
        )
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });

  describe('#AssignedValueRule', () => {
    it('should apply a correct AssignmentRule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new AssignmentRule('code');
      rule.value = new FshCode('foo', 'http://foo.com');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCode = baseStructDef.findElement('Observation.code');
      const assignedCode = sd.findElement('Observation.code');

      expect(baseCode.patternCodeableConcept).toBeUndefined();
      expect(assignedCode.patternCodeableConcept).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com' }]
      });
    });

    it('should apply a correct AssignmentRule for Quantity w/ value 0', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new AssignmentRule('valueQuantity');
      rule.value = new FshQuantity(0, new FshCode('mm', 'http://unitsofmeasure.org', 'mm'));
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const assignedValue = sd.findElement('Observation.value[x]:valueQuantity');

      expect(assignedValue.patternQuantity).toEqual({
        value: 0,
        code: 'mm',
        system: 'http://unitsofmeasure.org',
        unit: 'mm'
      });
    });

    it('should apply a Reference AssignmentRule and replace the Reference', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const instance = new Instance('Bar');
      instance.id = 'bar-id';
      instance.instanceOf = 'Patient';
      doc.instances.set(instance.name, instance);

      const rule = new AssignmentRule('subject');
      rule.value = new FshReference('Bar');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const assignedSubject = sd.findElement('Observation.subject');

      expect(assignedSubject.patternReference).toEqual({
        reference: 'Patient/bar-id'
      });
    });

    it('should apply a Reference AssignmentRule when the instance type is a logical type with the can-be-target characteristic', () => {
      // Logical: OkayTarget
      // Parent: Basic
      // Characteristics: #can-be-target
      const logical = new Logical('OkayTarget');
      logical.parent = 'Basic';
      logical.characteristics = ['can-be-target'];
      doc.logicals.set(logical.name, logical);

      // Instance: OkayTargetExample
      // InstanceOf: OkayTarget
      // * code = #okay-target
      const instance = new Instance('OkayTargetExample');
      instance.instanceOf = 'OkayTarget';
      instance.usage = 'Example';
      const instanceCode = new AssignmentRule('code');
      instanceCode.value = new FshCode('okay-target');
      instance.rules.push(instanceCode);
      doc.instances.set(instance.name, instance);

      // Profile: MyObservation
      // Parent: Observation
      // * focus = Reference(OkayTargetExample)
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const focusAssignment = new AssignmentRule('focus');
      focusAssignment.value = new FshReference('OkayTargetExample');
      profile.rules.push(focusAssignment);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedFocus = sd.findElement('Observation.focus');
      expect(assignedFocus.patternReference).toEqual({
        reference: 'http://hl7.org/fhir/us/minimal/StructureDefinition/OkayTarget/OkayTargetExample'
      });

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
    });

    it('should apply a Reference AssignmentRule and log a warning when the instance type is a logical type without the can-be-target characteristic', () => {
      // Logical: NotTarget
      // Parent: Basic
      // Characteristics: #has-size
      const logical = new Logical('NotTarget');
      logical.parent = 'Basic';
      logical.characteristics = ['has-size'];
      doc.logicals.set(logical.name, logical);

      // Instance: NotTargetExample
      // InstanceOf: NotTarget
      // * code = #not-target
      const instance = new Instance('NotTargetExample');
      instance.instanceOf = 'NotTarget';
      instance.usage = 'Example';
      const instanceCode = new AssignmentRule('code');
      instanceCode.value = new FshCode('not-target');
      instance.rules.push(instanceCode);
      doc.instances.set(instance.name, instance);

      // Profile: MyObservation
      // Parent: Observation
      // * focus = Reference(NotTargetExample)
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const focusAssignment = new AssignmentRule('focus')
        .withFile('Observation.fsh')
        .withLocation([3, 1, 3, 46]);
      focusAssignment.value = new FshReference('NotTargetExample');
      profile.rules.push(focusAssignment);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedFocus = sd.findElement('Observation.focus');
      expect(assignedFocus.patternReference).toEqual({
        reference: 'http://hl7.org/fhir/us/minimal/StructureDefinition/NotTarget/NotTargetExample'
      });

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Referenced type NotTarget for logical instance NotTargetExample does not specify that it can be the target of a reference\./s
      );
      expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Observation\.fsh.*Line: 3\D*/s);
    });

    it('should not apply a Reference AssignmentRule with invalid type and log an error', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const instance = new Instance('Bar');
      instance.id = 'bar-id';
      instance.instanceOf = 'Condition';
      doc.instances.set(instance.name, instance);

      const rule = new AssignmentRule('subject'); // subject cannot be a reference to condition
      rule.value = new FshReference('Bar');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const assignedSubject = sd.findElement('Observation.subject');

      expect(assignedSubject.patternReference).toEqual(undefined);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /The type "Reference\(Condition\)" does not match any of the allowed types\D*/s
      );
    });

    it('should apply a Code AssignmentRule and replace the local complete code system name with its url', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept');
      rule.value = new FshCode('bright', 'Visible');
      profile.rules.push(rule);

      const visibleSystem = new FshCodeSystem('Visible');
      visibleSystem.rules.push(new ConceptRule('bright'));
      doc.codeSystems.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'bright',
          system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a Code AssignmentRule and replace the local incomplete code system name with its url when the code is not in the system', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept');
      rule.value = new FshCode('bright', 'Visible');
      profile.rules.push(rule);

      const visibleSystem = new FshCodeSystem('Visible');
      visibleSystem.rules.push(new ConceptRule('disco'));
      const contentRule = new CaretValueRule('');
      contentRule.caretPath = 'content';
      contentRule.value = new FshCode('fragment');
      visibleSystem.rules.push(contentRule);
      doc.codeSystems.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'bright',
          system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a Code AssignmentRule and replace the local complete instance of CodeSystem name with its url', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept');
      rule.value = new FshCode('bright', 'Visible');
      profile.rules.push(rule);

      const visibleSystem = new Instance('Visible');
      visibleSystem.instanceOf = 'CodeSystem';
      visibleSystem.usage = 'Definition';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://hl7.org/fhir/us/minimal/Instance/Visible';
      const contentRule = new AssignmentRule('content');
      contentRule.value = new FshCode('complete');
      const brightCode = new AssignmentRule('concept[0].code');
      brightCode.value = new FshCode('bright');
      visibleSystem.rules.push(urlRule, contentRule, brightCode);
      doc.instances.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'bright',
          system: 'http://hl7.org/fhir/us/minimal/Instance/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a Code AssignmentRule and replace the local incomplete instance of CodeSystem name with its url when the code is not in the system', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept');
      rule.value = new FshCode('disco', 'Visible');
      profile.rules.push(rule);

      const visibleSystem = new Instance('Visible');
      visibleSystem.instanceOf = 'CodeSystem';
      visibleSystem.usage = 'Definition';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://hl7.org/fhir/us/minimal/Instance/Visible';
      const contentRule = new AssignmentRule('content');
      contentRule.value = new FshCode('example');
      const brightCode = new AssignmentRule('concept[0].code');
      brightCode.value = new FshCode('bright');
      visibleSystem.rules.push(urlRule, contentRule, brightCode);
      doc.instances.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'disco',
          system: 'http://hl7.org/fhir/us/minimal/Instance/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a Code AssignmentRule and replace the local complete code system name with its url when the code is added by a RuleSet', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept');
      rule.value = new FshCode('bright', 'Visible');
      profile.rules.push(rule);

      const ruleSet = new RuleSet('ExtraLightRules');
      ruleSet.rules.push(new ConceptRule('bright'));
      doc.ruleSets.set(ruleSet.name, ruleSet);

      const visibleSystem = new FshCodeSystem('Visible');
      visibleSystem.rules.push(new ConceptRule('dim'));
      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'ExtraLightRules';
      visibleSystem.rules.push(insertRule);
      doc.codeSystems.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'bright',
          system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a Code AssignmentRule and replace the local complete instance of CodeSystem name with its url when the code is added by a RuleSet', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept');
      rule.value = new FshCode('bright', 'Visible');
      profile.rules.push(rule);

      const ruleSet = new RuleSet('ExtraLightRules');
      const brightCode = new AssignmentRule('concept[+].code');
      brightCode.value = new FshCode('bright');
      ruleSet.rules.push(brightCode);
      doc.ruleSets.set(ruleSet.name, ruleSet);

      const visibleSystem = new Instance('Visible');
      visibleSystem.instanceOf = 'CodeSystem';
      visibleSystem.usage = 'Definition';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://hl7.org/fhir/us/minimal/Instance/Visible';
      const contentRule = new AssignmentRule('content');
      contentRule.value = new FshCode('complete');
      const dimCode = new AssignmentRule('concept[0].code');
      dimCode.value = new FshCode('dim');
      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'ExtraLightRules';
      visibleSystem.rules.push(urlRule, contentRule, dimCode, insertRule);
      doc.instances.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'bright',
          system: 'http://hl7.org/fhir/us/minimal/Instance/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when applying a Code AssignmentRule with a local complete code system name when the code does not exist', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept')
        .withFile('Light.fsh')
        .withLocation([8, 1, 8, 25]);
      rule.value = new FshCode('disco', 'Visible');
      profile.rules.push(rule);

      const visibleSystem = new FshCodeSystem('Visible');
      visibleSystem.rules.push(new ConceptRule('bright'));
      doc.codeSystems.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'disco',
          system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Code "disco" is not defined for system Visible.*File: Light\.fsh.*Line: 8\D*/s
      );
    });

    it('should log an error when applying a Code AssignmentRule with a local complete instance of CodeSystem name when the code does not exist', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept')
        .withFile('Light.fsh')
        .withLocation([12, 0, 12, 22]);
      rule.value = new FshCode('disco', 'Visible');
      profile.rules.push(rule);

      const visibleSystem = new Instance('Visible');
      visibleSystem.instanceOf = 'CodeSystem';
      visibleSystem.usage = 'Definition';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://hl7.org/fhir/us/minimal/Instance/Visible';
      const contentRule = new AssignmentRule('content');
      contentRule.value = new FshCode('complete');
      const brightCode = new AssignmentRule('concept[0].code');
      brightCode.value = new FshCode('bright');
      visibleSystem.rules.push(urlRule, contentRule, brightCode);
      doc.instances.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'disco',
          system: 'http://hl7.org/fhir/us/minimal/Instance/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Code "disco" is not defined for system Visible.*File: Light\.fsh.*Line: 12\D*/s
      );
    });

    it('should log an error when applying a Code AssignmentRule with a local complete code system url when the code does not exist', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept')
        .withFile('Light.fsh')
        .withLocation([8, 1, 8, 25]);
      rule.value = new FshCode('disco', 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible');
      profile.rules.push(rule);

      const visibleSystem = new FshCodeSystem('Visible');
      visibleSystem.rules.push(new ConceptRule('bright'));
      doc.codeSystems.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'disco',
          system: 'http://hl7.org/fhir/us/minimal/CodeSystem/Visible'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Code "disco" is not defined for system Visible.*File: Light\.fsh.*Line: 8\D*/s
      );
    });

    it('should apply a Code AssignmentRule and replace the id of code system (from the core version fhir or dependency) with its url', () => {
      // allergyintolerance-clinical is the id of a CodeSystem in the R4 definitions
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('category');
      rule.value = new FshCode('test-code', 'allergyintolerance-clinical'); // id
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.category');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'test-code',
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a Code AssignmentRule and replace the name of code system (from the core version fhir or dependency) with its url', () => {
      // AllergyIntoleranceClinicalStatusCodes is the name of a CodeSystem in the R4 definitions
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('category');
      rule.value = new FshCode('test-code', 'AllergyIntoleranceClinicalStatusCodes'); // name
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.category');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'test-code',
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a Code AssignmentRule and keep the url of code system (from the core version fhir or dependency) as the system url', () => {
      // http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical is the url of a CodeSystem in the R4 definitions
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('category');
      rule.value = new FshCode(
        'test-code',
        'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
      ); // url
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.category');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'test-code',
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
        }
      ]);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an AssignmentRule with a valid Canonical entity defined in FSH', () => {
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('code.coding.system');
      rule.value = new FshCanonical('VeryRealCodeSystem');
      profile.rules.push(rule);

      const realCodeSystem = new FshCodeSystem('VeryRealCodeSystem');
      doc.codeSystems.set(realCodeSystem.name, realCodeSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedSystem = sd.findElement('Observation.code.coding.system');
      expect(assignedSystem.patternUri).toEqual(
        'http://hl7.org/fhir/us/minimal/CodeSystem/VeryRealCodeSystem'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an Assignment rule with Canonical of a Questionnaire instance', () => {
      const questionnaireInstance = new Instance('MyQuestionnaire');
      questionnaireInstance.usage = 'Definition';
      const urlRule = new AssignmentRule('url');
      urlRule.value = 'http://my.awesome.questions.org/Questionnaire/MyQuestionnaire';
      questionnaireInstance.rules.push(urlRule);
      doc.instances.set(questionnaireInstance.name, questionnaireInstance);

      const profile = new Profile('MyQuestionnaireResponse');
      profile.parent = 'QuestionnaireResponse';
      const assignedValueRule = new AssignmentRule('questionnaire');
      assignedValueRule.value = new FshCanonical('MyQuestionnaire');
      profile.rules.push(assignedValueRule);
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedQ = sd.findElement('QuestionnaireResponse.questionnaire');
      expect(assignedQ.patternCanonical).toEqual(
        'http://my.awesome.questions.org/Questionnaire/MyQuestionnaire'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an Assignment rule with Canonical of an inline instance', () => {
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('code.coding.system');
      rule.value = new FshCanonical('MyCodeSystem');
      profile.rules.push(rule);

      const inlineInstance = new Instance('MyCodeSystem');
      inlineInstance.usage = 'Inline';
      doc.instances.set(inlineInstance.name, inlineInstance);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedSystem = sd.findElement('Observation.code.coding.system');
      expect(assignedSystem.patternUri).toEqual('#MyCodeSystem');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an AssignmentRule with Canonical of a FHIR entity', () => {
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('code.coding.system');
      rule.value = new FshCanonical('MedicationRequest');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedSystem = sd.findElement('Observation.code.coding.system');
      expect(assignedSystem.patternUri).toEqual(
        'http://hl7.org/fhir/StructureDefinition/MedicationRequest'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an AssignmentRule with Canonical of a FHIR entity with a given version', () => {
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('code.coding.system');
      rule.value = new FshCanonical('MedicationRequest');
      rule.value.version = '3.2.1';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedSystem = sd.findElement('Observation.code.coding.system');
      // Use the specified version instead of the version on MedicationRequest
      expect(assignedSystem.patternUri).toEqual(
        'http://hl7.org/fhir/StructureDefinition/MedicationRequest|3.2.1'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not apply an AssignmentRule with an invalid Canonical entity and log an error', () => {
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('code.coding.system');
      rule.value = new FshCanonical('FakeCodeSystem');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedSystem = sd.findElement('Observation.code.coding.system');
      expect(assignedSystem.patternUri).toEqual(undefined);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot use canonical URL of FakeCodeSystem because it does not exist.\D*/s
      );
    });

    it('should apply an instance AssignmentRule and replace the instance', () => {
      const profile = new Profile('USPatient');
      profile.parent = 'Patient';
      const rule = new AssignmentRule('address');
      rule.value = 'USPostalAddress';
      rule.isInstance = true;
      profile.rules.push(rule); // * address = USPostalAddress
      doc.profiles.set(profile.name, profile);

      const instance = new Instance('USPostalAddress');
      instance.instanceOf = 'Address';
      instance.usage = 'Inline';
      const assignCountry = new AssignmentRule('country');
      assignCountry.value = 'US';
      instance.rules.push(assignCountry); // * country = "US"
      doc.instances.set(instance.name, instance);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedAddress = sd.findElement('Patient.address');
      expect(assignedAddress.patternAddress).toEqual({ country: 'US' });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an instance AssignmentRule when the instance has a numeric id', () => {
      // Profile: USPatient
      // Parent: Patient
      // address = 00050
      const profile = new Profile('USPatient');
      profile.parent = 'Patient';
      const rule = new AssignmentRule('address');
      rule.value = 50;
      rule.rawValue = '00050';
      profile.rules.push(rule);
      doc.profiles.set(profile.name, profile);
      // Instance: 00050
      // InstanceOf: Address
      // Usage: #inline
      // country = "US"
      const instance = new Instance('00050');
      instance.instanceOf = 'Address';
      instance.usage = 'Inline';
      const assignCountry = new AssignmentRule('country');
      assignCountry.value = 'US';
      instance.rules.push(assignCountry);
      doc.instances.set(instance.name, instance);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedAddress = sd.findElement('Patient.address');
      expect(assignedAddress.patternAddress).toEqual({ country: 'US' });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an instance AssignmentRule when the instance has an id that resembles a boolean', () => {
      // Profile: USPatient
      // Parent: Patient
      // address = true
      const profile = new Profile('USPatient');
      profile.parent = 'Patient';
      const rule = new AssignmentRule('address');
      rule.value = true;
      rule.rawValue = 'true';
      profile.rules.push(rule);
      doc.profiles.set(profile.name, profile);
      // Instance: true
      // InstanceOf: Address
      // Usage: #inline
      // id = "true"
      // country = "US"
      const instance = new Instance('TrueAddress');
      instance.instanceOf = 'Address';
      instance.usage = 'Inline';
      const assignId = new AssignmentRule('id');
      assignId.value = 'true';
      const assignCountry = new AssignmentRule('country');
      assignCountry.value = 'US';
      instance.rules.push(assignId, assignCountry);
      doc.instances.set(instance.name, instance);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedAddress = sd.findElement('Patient.address');
      expect(assignedAddress.patternAddress).toEqual({ id: 'true', country: 'US' });
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not apply an instance AssignmentRule when the instance cannot be found', () => {
      const profile = new Profile('USPatient');
      profile.parent = 'Patient';
      const rule = new AssignmentRule('address');
      rule.value = 'FakeInstance';
      rule.isInstance = true;
      profile.rules.push(rule); // * address = FakeInstance
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedAddress = sd.findElement('Patient.address');
      expect(assignedAddress.patternAddress).toBeUndefined();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign Instance at path address to element of type Address.*FakeInstance\D*/s
      );
    });

    it('should use the url specified in a CaretValueRule when referencing a named code system', () => {
      const profile = new Profile('LightObservation');
      profile.parent = 'Observation';
      const rule = new AssignmentRule('valueCodeableConcept');
      rule.value = new FshCode('bright', 'Visible');
      profile.rules.push(rule);

      const visibleSystem = new FshCodeSystem('Visible');
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'url';
      caretValueRule.value = 'http://special-domain.com/CodeSystem/Visible';
      visibleSystem.rules.push(caretValueRule);
      doc.codeSystems.set(visibleSystem.name, visibleSystem);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(assignedElement.patternCodeableConcept.coding).toEqual([
        {
          code: 'bright',
          system: 'http://special-domain.com/CodeSystem/Visible'
        }
      ]);
    });

    it('should apply an AssignmentRule on the child of a choice element with constrained choices that share a type', () => {
      // Quantity is the first ancestor of Duration and Age

      // * value[x] only Duration or Age
      // * value[x].comparator = #>=

      const extension = new Extension('QuantifiedExtension');

      const onlyRule = new OnlyRule('value[x]');
      onlyRule.types = [{ type: 'Duration' }, { type: 'Age' }];
      extension.rules.push(onlyRule);

      const assignedValueRule = new AssignmentRule('value[x].comparator');
      assignedValueRule.value = new FshCode('>=');
      extension.rules.push(assignedValueRule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const assignedElement = sd.findElement('Extension.value[x].comparator');
      expect(assignedElement.patternCode).toBe('>=');
    });

    it('should apply an AssignmentRule on the child of a choice element with constrained choices that share a profile', () => {
      // Profile: CustomizedTiming
      // Parent: Timing
      // * extension contains customField 0..1
      const customizedTiming = new Profile('CustomizedTiming');
      customizedTiming.parent = 'Timing';
      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'customField' }];
      const cardRule = new CardRule('extension[customField]');
      cardRule.min = 0;
      cardRule.max = '1';
      customizedTiming.rules.push(containsRule, cardRule);
      doc.profiles.set(customizedTiming.name, customizedTiming);

      // Profile: VerifiedTiming
      // Parent: CustomizedTiming
      const verifiedTiming = new Profile('VerifiedTiming');
      verifiedTiming.parent = customizedTiming.name;
      doc.profiles.set(verifiedTiming.name, verifiedTiming);

      // Profile: ConsensusTiming
      // Parent: CustomizedTiming
      const consensusTiming = new Profile('ConsensusTiming');
      consensusTiming.parent = customizedTiming.name;
      doc.profiles.set(consensusTiming.name, consensusTiming);

      // Profile: SpecialTimingObservation
      // Parent: Observation
      // * effective[x] only VerifiedTiming or ConsensusTiming
      // * effective[x].extension[customField].id = my-special-id
      const specialTimingObservation = new Profile('SpecialTimingObservation');
      specialTimingObservation.parent = 'Observation';
      const onlyRule = new OnlyRule('effective[x]');
      onlyRule.types = [{ type: 'VerifiedTiming' }, { type: 'ConsensusTiming' }];
      const assignedValueRule = new AssignmentRule('effective[x].extension[customField].id');
      assignedValueRule.value = 'my-special-id';
      specialTimingObservation.rules.push(onlyRule, assignedValueRule);
      doc.profiles.set(specialTimingObservation.name, specialTimingObservation);

      exporter.exportStructDef(specialTimingObservation);
      const specialTimingObservationSd = pkg.profiles.find(
        resource => resource.id === 'SpecialTimingObservation'
      );
      expect(specialTimingObservationSd).toBeDefined();
      const assignedId = specialTimingObservationSd.findElement(
        'Observation.effective[x].extension:customField.id'
      );
      expect(assignedId.patternString).toBe('my-special-id');
    });

    it('should not apply an incorrect AssignmentRule', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new AssignmentRule('code').withFile('Assigned.fsh').withLocation([4, 18, 4, 28]);
      rule.value = true; // Incorrect boolean
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseCode = baseStructDef.findElement('Observation.code');
      const assignedCode = sd.findElement('Observation.code');

      expect(baseCode.patternCodeableConcept).toBeUndefined();
      expect(assignedCode.patternCodeableConcept).toBeUndefined(); // Code remains unset
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Assigned\.fsh.*Line: 4\D*/s);
    });

    it('should not apply an AssignmentRule when the value is refers to an Instance that is not found', () => {
      // Profile: USPatient
      // Parent: Patient
      // telecom = MyTelecom
      const profile = new Profile('USPatient');
      profile.parent = 'Patient';
      const rule = new AssignmentRule('telecom')
        .withFile('Assigned.fsh')
        .withLocation([5, 6, 5, 28]);
      rule.value = 'MyTelecom';
      rule.isInstance = true;
      profile.rules.push(rule);
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedTelecom = sd.findElement('Patient.telecom');
      // @ts-ignore
      expect(assignedTelecom.patternTelecom).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign Instance at path telecom to element of type ContactPoint. Definition not found for Instance: MyTelecom.*File: Assigned\.fsh.*Line: 5\D*/s
      );
    });

    it('should not apply an AssignmentRule when the value is numeric and refers to an Instance, but both types are wrong', () => {
      // Profile: USPatient
      // Parent: Patient
      // telecom = 00050
      const profile = new Profile('USPatient');
      profile.parent = 'Patient';
      const rule = new AssignmentRule('telecom')
        .withFile('Assigned.fsh')
        .withLocation([5, 6, 5, 21]);
      rule.value = 50;
      rule.rawValue = '00050';
      profile.rules.push(rule);
      doc.profiles.set(profile.name, profile);
      // Instance: 00050
      // InstanceOf: Address
      // Usage: #inline
      // country = "US"
      const instance = new Instance('00050');
      instance.instanceOf = 'Address';
      instance.usage = 'Inline';
      const assignCountry = new AssignmentRule('country');
      assignCountry.value = 'US';
      instance.rules.push(assignCountry);
      doc.instances.set(instance.name, instance);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedTelecom = sd.findElement('Patient.telecom');
      // @ts-ignore
      expect(assignedTelecom.patternTelecom).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign number value: 50\. Value does not match element type: ContactPoint.*File: Assigned\.fsh.*Line: 5\D*/s
      );
    });

    it('should not apply an AssignmentRule when the value is boolean and refers to an Instance, but both types are wrong', () => {
      // Profile: USPatient
      // Parent: Patient
      // birthDate = true
      const profile = new Profile('USPatient');
      profile.parent = 'Patient';
      const rule = new AssignmentRule('birthDate')
        .withFile('Assigned.fsh')
        .withLocation([5, 6, 5, 21]);
      rule.value = true;
      rule.rawValue = 'true';
      profile.rules.push(rule);
      doc.profiles.set(profile.name, profile);
      // Instance: true
      // InstanceOf: Address
      // Usage: #inline
      // country = "US"
      const instance = new Instance('true');
      instance.instanceOf = 'Address';
      instance.usage = 'Inline';
      const assignCountry = new AssignmentRule('country');
      assignCountry.value = 'US';
      instance.rules.push(assignCountry);
      doc.instances.set(instance.name, instance);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedTelecom = sd.findElement('Patient.birthDate');
      expect(assignedTelecom.patternDate).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign boolean value: true\. Value does not match element type: date.*File: Assigned\.fsh.*Line: 5\D*/s
      );
    });

    it('should not apply an AssignmentRule when the value is numeric and refers to an Instance, but it conflicts with an existing value', () => {
      // Profile: USPatient
      // Parent: Patient
      // address.country = "US"
      // address = 00050
      const profile = new Profile('USPatient');
      profile.parent = 'Patient';
      const countryRule = new AssignmentRule('address.country');
      countryRule.value = 'US';
      const addressRule = new AssignmentRule('address')
        .withFile('Assigned.fsh')
        .withLocation([6, 3, 6, 18]);
      addressRule.value = 50;
      addressRule.rawValue = '00050';
      profile.rules.push(countryRule, addressRule);
      doc.profiles.set(profile.name, profile);
      // Instance: 00050
      // InstanceOf: Address
      // Usage: #inline
      // country = "France"
      const instance = new Instance('00050');
      instance.instanceOf = 'Address';
      instance.usage = 'Inline';
      const assignCountry = new AssignmentRule('country');
      assignCountry.value = 'France';
      instance.rules.push(assignCountry);
      doc.instances.set(instance.name, instance);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const assignedAddress = sd.findElement('Patient.address');
      expect(assignedAddress.patternAddress).toBeUndefined();
      const assignedCountry = sd.findElement('Patient.address.country');
      expect(assignedCountry.patternString).toBe('US');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign France to this element; a different string is already assigned: "US".*File: Assigned\.fsh.*Line: 6\D*/s
      );
    });

    it('should not apply a AssignmentRule to a parent element when it would conflict with a child element', () => {
      // Profile: MyObs
      // Parent: Observation
      // * valueQuantity.value = 20
      // * valueQuantity = 10 'mm'
      const profile = new Profile('MyObs');
      profile.parent = 'Observation';
      const valueRule = new AssignmentRule('valueQuantity.value')
        .withFile('Assigned.fsh')
        .withLocation([3, 8, 3, 29]);
      valueRule.value = 20;
      const quantityRule = new AssignmentRule('valueQuantity')
        .withFile('Assigned.fsh')
        .withLocation([4, 8, 4, 27]);
      quantityRule.value = new FshQuantity(10, new FshCode('mm', 'http://unitsofmeasure.org'));
      profile.rules.push(valueRule, quantityRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const childElement = sd.findElement('Observation.value[x]:valueQuantity.value');
      const parentElement = sd.findElement('Observation.value[x]:valueQuantity');

      expect(childElement.patternDecimal).toBe(20);
      expect(parentElement.patternQuantity).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign 10 to this element.*File: Assigned\.fsh.*Line: 4\D*/s
      );
    });

    it('should not apply a AssignmentRule to a complex typed element when it would conflict with a child element present in an array in the type', () => {
      // Profile: MyObs
      // Parent: Observation
      // * valueCodeableConcept.coding.code = #pancake
      // * valueCodeableConcept = #waffle // this rule should not be applied
      const profile = new Profile('MyObs');
      profile.parent = 'Observation';
      const innerRule = new AssignmentRule('valueCodeableConcept.coding.code');
      innerRule.value = new FshCode('pancake');
      const outerRule = new AssignmentRule('valueCodeableConcept')
        .withFile('Assigned.fsh')
        .withLocation([4, 9, 4, 33]);
      outerRule.value = new FshCode('waffle');
      profile.rules.push(innerRule, outerRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const innerElement = sd.findElement('Observation.value[x]:valueCodeableConcept.coding.code');
      const outerElement = sd.findElement('Observation.value[x]:valueCodeableConcept');
      expect(innerElement.patternCode).toBe('pancake');
      expect(outerElement.patternCodeableConcept).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign waffle to this element.*File: Assigned\.fsh.*Line: 4\D*/s
      );
    });

    it('should not apply a AssignmentRule to a slice when it would conflict with a child of the list element', () => {
      // Instance: CustomPostalAddress
      // InstanceOf: Address
      // Usage: #inline
      // * period.start = "2020-04-01"
      const customPostalAddress = new Instance('CustomPostalAddress');
      customPostalAddress.instanceOf = 'Address';
      customPostalAddress.usage = 'Inline';
      const customStart = new AssignmentRule('period.start');
      customStart.value = '2020-04-01';

      customPostalAddress.rules.push(customStart);
      doc.instances.set(customPostalAddress.name, customPostalAddress);

      // Profile: MovingPatient
      // Parent: Patient
      // * address.period.start = "1998-07-04"
      // * address ^slicing.discriminator[0].type = #pattern
      // * address ^slicing.discriminator[0].path = "$this"
      // * address ^slicing.rules = #open
      // * address contains RecentAddress 1..1
      // * address[RecentAddress] = CustomPostalAddress // this rule should not be applied
      const movingPatient = new Profile('MovingPatient');
      movingPatient.parent = 'Patient';
      const movingStart = new AssignmentRule('address.period.start');
      movingStart.value = '1998-07-04';
      const slicingType = new CaretValueRule('address');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('pattern');
      const slicingPath = new CaretValueRule('address');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'code';
      const slicingRules = new CaretValueRule('address');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const recentAddress = new ContainsRule('address');
      recentAddress.items.push({ name: 'RecentAddress' });
      const recentCard = new CardRule('address[RecentAddress]');
      recentCard.min = 1;
      recentCard.max = '1';
      const recentInstance = new AssignmentRule('address[RecentAddress]')
        .withFile('Assigned.fsh')
        .withLocation([8, 9, 8, 54]);
      recentInstance.value = 'CustomPostalAddress';
      recentInstance.isInstance = true;

      movingPatient.rules.push(
        movingStart,
        slicingType,
        slicingPath,
        slicingRules,
        recentAddress,
        recentCard,
        recentInstance
      );

      exporter.exportStructDef(movingPatient);
      const sd = pkg.profiles[0];
      const periodStartElement = sd.findElement('Patient.address.period.start');
      const addressSliceElement = sd.findElement('Patient.address:RecentAddress');

      expect(periodStartElement.patternDateTime).toBe('1998-07-04');
      expect(addressSliceElement.patternAddress).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign 2020-04-01 to this element.*File: Assigned\.fsh.*Line: 8\D*/s
      );
    });

    it('should resolve soft indexing within Caret Paths on profiles', () => {
      // Profile: TestPatient
      // Parent: Patient
      // * address.line ^slicing.discriminator[+].type = #pattern
      // * address.line ^slicing.discriminator[=].path = "$this"
      // * address.line ^slicing.rules = #open
      // * address.line contains ApartmentName 0..1

      const testPatient = new Profile('TestPatient');
      testPatient.parent = 'Patient';

      const slicingTypeLine = new CaretValueRule('address.line');
      slicingTypeLine.caretPath = 'slicing.discriminator[+].type';
      slicingTypeLine.value = new FshCode('pattern');
      const slicingPathLine = new CaretValueRule('address.line');
      slicingPathLine.caretPath = 'slicing.discriminator[=].path';
      slicingPathLine.value = 'code';
      const slicingRulesLine = new CaretValueRule('address.line');
      slicingRulesLine.caretPath = 'slicing.rules';
      slicingRulesLine.value = new FshCode('open');
      const containsAddressLine = new ContainsRule('address.line');
      containsAddressLine.items.push({ name: 'ApartmentName' });
      const apartmentNameCard = new CardRule('address.line[ApartmentName]');
      apartmentNameCard.min = 0;
      apartmentNameCard.max = '1';

      testPatient.rules.push(
        slicingTypeLine,
        slicingPathLine,
        slicingRulesLine,
        containsAddressLine,
        apartmentNameCard
      );

      exporter.exportStructDef(testPatient);
      const sd = pkg.profiles[0];
      const addressLineElement = sd.findElement('Patient.address.line');
      expect(addressLineElement.slicing.discriminator[0].type).toEqual('pattern');
      expect(addressLineElement.slicing.discriminator[0].path).toEqual('code');
    });

    it('should not change slice cardinality when an AssignmentRule is applied directly on the slice', () => {
      // See: https://github.com/FHIR/sushi/issues/810
      //
      // Profile: RespRateFragment
      // Parent: Observation
      // * code.coding ^slicing.discriminator[0].type = #pattern
      // * code.coding ^slicing.discriminator[0].path = "$this"
      // * code.coding ^slicing.rules = #open
      // * code.coding contains snomed 0..*
      // * code.coding[snomed] = http://snomed.info/sct#86290005
      const profile = new Profile('RespRateFragment');
      profile.parent = 'Observation';
      const slicingTypeLine = new CaretValueRule('code.coding');
      slicingTypeLine.caretPath = 'slicing.discriminator[0].type';
      slicingTypeLine.value = new FshCode('pattern');
      const slicingPathLine = new CaretValueRule('code.coding');
      slicingPathLine.caretPath = 'slicing.discriminator[0].path';
      slicingPathLine.value = '$this';
      const slicingRulesLine = new CaretValueRule('code.coding');
      slicingRulesLine.caretPath = 'slicing.rules';
      slicingRulesLine.value = new FshCode('open');
      const containsSnomed = new ContainsRule('code.coding');
      containsSnomed.items.push({ name: 'snomed' });
      const snomedCard = new CardRule('code.coding[snomed]');
      snomedCard.min = 0;
      snomedCard.max = '*';
      const snomedAssignment = new AssignmentRule('code.coding[snomed]');
      snomedAssignment.value = new FshCode('86290005', 'http://snomed.info/sct');

      profile.rules.push(
        slicingTypeLine,
        slicingPathLine,
        slicingRulesLine,
        containsSnomed,
        snomedCard,
        snomedAssignment
      );

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const snomedElement = sd.findElement('Observation.code.coding:snomed');
      expect(snomedElement.min).toBe(0);
      expect(snomedElement.max).toBe('*');
    });

    it('should not apply a AssignmentRule to a slice when it would conflict with a child slice of the list element', () => {
      // Instance: CustomPostalAddress
      // InstanceOf: Address
      // Usage: #inline
      // * line[0] = "First part of address"
      const customPostalAddress = new Instance('CustomPostalAddress');
      customPostalAddress.instanceOf = 'Address';
      customPostalAddress.usage = 'Inline';
      const customLine = new AssignmentRule('line[0]');
      customLine.value = 'First part of address';
      customPostalAddress.rules.push(customLine);
      doc.instances.set(customPostalAddress.name, customPostalAddress);

      // Profile: CustomPatient
      // Parent: Patient
      // * address.line ^slicing.discriminator[0].type = #pattern
      // * address.line ^slicing.discriminator[0].path = "$this"
      // * address.line ^slicing.rules = #closed
      // * address.line contains SpecificLine 1..1
      // * address.line[SpecificLine] = "Specific part of address"
      // * address ^slicing.discriminator[0].type = #pattern
      // * address ^slicing.discriminator[0].path = "$this"
      // * address ^slicing.rules = #open
      // * address contains RecentAddress 1..1
      // * address[RecentAddress] = CustomPostalAddress // this rule should not be applied
      const customPatient = new Profile('CustomPatient');
      customPatient.parent = 'Patient';

      const slicingTypeLine = new CaretValueRule('address.line');
      slicingTypeLine.caretPath = 'slicing.discriminator[0].type';
      slicingTypeLine.value = new FshCode('pattern');
      const slicingPathLine = new CaretValueRule('address.line');
      slicingPathLine.caretPath = 'slicing.discriminator[0].path';
      slicingPathLine.value = 'code';
      const slicingRulesLine = new CaretValueRule('address.line');
      slicingRulesLine.caretPath = 'slicing.rules';
      slicingRulesLine.value = new FshCode('closed');
      const containsSpecificLine = new ContainsRule('address.line');
      containsSpecificLine.items.push({ name: 'SpecificLine' });
      const specificLineCard = new CardRule('address.line[SpecificLine]');
      specificLineCard.min = 1;
      specificLineCard.max = '1';
      const specificLine = new AssignmentRule('address.line[SpecificLine]');
      specificLine.value = 'Specific part of address';

      const slicingType = new CaretValueRule('address');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('pattern');
      const slicingPath = new CaretValueRule('address');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'code';
      const slicingRules = new CaretValueRule('address');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const recentAddress = new ContainsRule('address');
      recentAddress.items.push({ name: 'RecentAddress' });
      const recentCard = new CardRule('address[RecentAddress]');
      recentCard.min = 1;
      recentCard.max = '1';
      const recentInstance = new AssignmentRule('address[RecentAddress]')
        .withFile('Assigned.fsh')
        .withLocation([12, 9, 12, 54]);
      recentInstance.value = 'CustomPostalAddress';
      recentInstance.isInstance = true;

      customPatient.rules.push(
        slicingTypeLine,
        slicingPathLine,
        slicingRulesLine,
        containsSpecificLine,
        specificLineCard,
        specificLine,
        slicingType,
        slicingPath,
        slicingRules,
        recentAddress,
        recentCard,
        recentInstance
      );

      exporter.exportStructDef(customPatient);
      const sd = pkg.profiles[0];
      const addressLineElement = sd.findElement('Patient.address.line:SpecificLine');
      const addressSliceElement = sd.findElement('Patient.address:RecentAddress');
      expect(addressLineElement.patternString).toBeDefined();
      expect(addressSliceElement.patternAddress).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot assign.*First part of address.*to this element.*File: Assigned\.fsh.*Line: 12\D*/s
      );
    });
  });

  describe('#ContainsRule', () => {
    it('should apply a ContainsRule on an element with defined slicing', () => {
      const profile = new Profile('Foo');
      profile.parent = 'resprate';

      const rule = new ContainsRule('code.coding');
      rule.items = [{ name: 'barSlice' }];
      const rulesRule = new CaretValueRule('code.coding');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const typeRule = new CaretValueRule('code.coding');
      typeRule.caretPath = 'slicing.discriminator.type';
      typeRule.value = new FshCode('pattern');
      const pathRule = new CaretValueRule('code.coding');
      pathRule.caretPath = 'slicing.discriminator.path';
      pathRule.value = 'foo';
      profile.rules.push(rule, rulesRule, typeRule, pathRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('resprate');

      const barSlice = sd.elements.find(e => e.id === 'Observation.code.coding:barSlice');

      expect(sd.elements.length).toBe(baseStructDef.elements.length + 1);
      expect(barSlice).toBeDefined();
      const diff = barSlice.calculateDiff();
      expect(diff.min).toBe(0);
      expect(diff.max).toBe('*');
    });

    it('should apply a ContainsRule on a slice', () => {
      // Profile: Foo
      // Parent: resprate
      // * code.coding contains fooSlice
      // * code.coding[fooSlice] contains barReslice
      const profile = new Profile('Foo');
      profile.parent = 'resprate';

      const sliceRule = new ContainsRule('code.coding');
      sliceRule.items = [{ name: 'fooSlice' }];
      const resliceRule = new ContainsRule('code.coding[fooSlice]');
      resliceRule.items = [{ name: 'barReslice' }];
      profile.rules.push(sliceRule, resliceRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('resprate');

      const barReslice = sd.elements.find(
        e => e.id === 'Observation.code.coding:fooSlice/barReslice'
      );

      expect(sd.elements.length).toBe(baseStructDef.elements.length + 2);
      expect(barReslice).toBeDefined();
      const diff = barReslice.calculateDiff();
      expect(diff.min).toBe(0);
      expect(diff.max).toBe('*');
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should apply a ContainsRule on an extension slice', () => {
      // Extension: Foo
      // * extension contains bar
      // * extension[bar] contains barReslice
      const extension = new Extension('Foo');

      const sliceRule = new ContainsRule('extension');
      sliceRule.items = [{ name: 'bar' }];
      const resliceRule = new ContainsRule('extension[bar]');
      resliceRule.items = [{ name: 'barReslice' }];
      extension.rules.push(sliceRule, resliceRule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const barReslice = sd.elements.find(e => e.id === 'Extension.extension:bar/barReslice');

      expect(sd.elements.length).toBe(baseStructDef.elements.length + 6);
      expect(barReslice).toBeDefined();
      const diff = barReslice.calculateDiff();
      expect(diff.min).toBe(0);
      expect(diff.max).toBe('*');
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should log a warning when an element has both a slice name and slicing', () => {
      // Profile: Foo
      // Parent: resprate
      // * code.coding contains fooSlice
      // * code.coding[fooSlice] ^slicing.discriminator.type = #pattern
      // * code.coding[fooSlice] ^slicing.discriminator.path = "system"
      // * code.coding[fooSlice] ^slicing.rules = #open
      // * code.coding[fooSlice] contains barReslice
      const profile = new Profile('Foo');
      profile.parent = 'resprate';

      const sliceRule = new ContainsRule('code.coding');
      sliceRule.items = [{ name: 'fooSlice' }];
      const caretRule = new CaretValueRule('code.coding[fooSlice]');
      caretRule.caretPath = 'slicing.discriminator.type';
      caretRule.value = new FshCode('pattern');
      const pathRule = new CaretValueRule('code.coding[fooSlice]');
      pathRule.caretPath = 'slicing.discriminator.path';
      pathRule.value = 'system';
      const rulesRule = new CaretValueRule('code.coding[fooSlice]');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const resliceRule = new ContainsRule('code.coding[fooSlice]');
      resliceRule.items = [{ name: 'barReslice' }];
      profile.rules.push(sliceRule, caretRule, pathRule, rulesRule, resliceRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('resprate');

      const barReslice = sd.elements.find(
        e => e.id === 'Observation.code.coding:fooSlice/barReslice'
      );

      expect(sd.elements.length).toBe(baseStructDef.elements.length + 2);
      expect(barReslice).toBeDefined();
      const diff = barReslice.calculateDiff();
      expect(diff.min).toBe(0);
      expect(diff.max).toBe('*');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      // putting slice info on a slice is a warning-level event
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'Observation.code.coding[fooSlice]: An element with a slice name should not define its own slicing.'
      );
    });

    it('should apply a ContainsRule of a defined extension on an extension element', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new ContainsRule('extension');
      rule.items = [{ name: 'vs', type: 'valueset-expression' }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const valuesetExpression = sd.elements.find(e => e.id === 'Observation.extension:vs');

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(valuesetExpression).toBeDefined();
      expect(valuesetExpression.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/valueset-expression'
        )
      );
    });

    it('should apply a ContainsRule of a defined extension on a modifierExtension element', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new ContainsRule('modifierExtension');
      rule.items = [{ name: 'vs', type: 'valueset-expression' }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extension = sd.elements.find(e => e.id === 'Observation.modifierExtension');
      const valuesetExpression = sd.elements.find(e => e.id === 'Observation.modifierExtension:vs');

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(valuesetExpression).toBeDefined();
      expect(valuesetExpression.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/valueset-expression'
        )
      );
    });

    it('should apply a ContainsRule of an aliased extension on an extension element', () => {
      const profile = new Profile('Foo');
      const extBar = new Extension('Bar');
      const extBaz = new Extension('Baz');
      extBaz.id = 'BazId';
      profile.parent = 'Observation';

      doc.aliases.set('barAlias', 'Bar');
      doc.aliases.set('bazAlias', 'BazId');
      doc.extensions.set('Bar', extBar);
      doc.extensions.set('Baz', extBaz);

      const ruleBar = new ContainsRule('extension');
      ruleBar.items = [{ name: 'bar', type: 'barAlias' }];
      profile.rules.push(ruleBar);
      const ruleBaz = new ContainsRule('extension');
      ruleBaz.items = [{ name: 'baz', type: 'bazAlias' }];
      profile.rules.push(ruleBaz);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const bar = sd.elements.find(e => e.id === 'Observation.extension:bar');
      const baz = sd.elements.find(e => e.id === 'Observation.extension:baz');

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(bar).toBeDefined();
      expect(bar.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/Bar'
        )
      );
      expect(baz).toBeDefined();
      expect(baz.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/us/minimal/StructureDefinition/BazId'
        )
      );
    });

    it('should apply a ContainsRule of an existing aliased extension on an extension element', () => {
      const profile = new Profile('Foo');
      const ext = new Extension('VSExpression');
      profile.parent = 'Observation';

      doc.aliases.set('VSAlias', 'http://hl7.org/fhir/StructureDefinition/valueset-expression');
      doc.extensions.set('VSExpression', ext);

      const ruleBar = new ContainsRule('extension');
      ruleBar.items = [{ name: 'vs', type: 'VSAlias' }];
      profile.rules.push(ruleBar);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const VSExpression = sd.elements.find(e => e.id === 'Observation.extension:vs');

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(VSExpression).toBeDefined();
      expect(VSExpression.type[0]).toEqual(
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/valueset-expression'
        )
      );
    });

    it('should apply a ContainsRule of an inline extension to an extension element', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'my-inline-extension' }];
      profile.rules.push(containsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const extensionSlice = sd.elements.find(
        e => e.id === 'Observation.extension:my-inline-extension'
      );
      const extensionSliceUrl = sd.elements.find(
        e => e.id === 'Observation.extension:my-inline-extension.url'
      );

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSliceUrl).toBeDefined();
      expect(extensionSliceUrl.fixedUri).toBe('my-inline-extension');
    });

    it('should apply a ContainsRule of an inline extension with a name that resolves to a non-extension type', () => {
      // This tests the use case in https://github.com/FHIR/sushi/issues/83, which we originally thought
      // was an issue w/ reserved words, but was actually an issue because "code" resolves to the StructureDefinition
      // for the code type.  This test initially failed and was assigned by changing the code that handles extension
      // slices to only look for Extension resolutions (as opposed to all types).
      // NOTE: This test is mainly irrelevant now that we switched to a syntax that distinguishes slice name from type.
      const extension = new Extension('Foo');

      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'code' }];
      extension.rules.push(containsRule);

      const onlyRule = new OnlyRule('extension[code].value[x]');
      onlyRule.types = [{ type: 'Quantity' }];
      extension.rules.push(onlyRule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];

      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);

      const innerExtension = sd.elements.find(e => e.id === 'Extension.extension');
      const extensionSlice = sd.elements.find(e => e.id === 'Extension.extension:code');
      const extensionSliceUrl = sd.elements.find(e => e.id === 'Extension.extension:code.url');
      const extensionSliceValueX = sd.elements.find(
        e => e.id === 'Extension.extension:code.value[x]'
      );

      expect(innerExtension.slicing).toBeDefined();
      expect(innerExtension.slicing.discriminator.length).toBe(1);
      expect(innerExtension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSliceUrl).toBeDefined();
      expect(extensionSliceUrl.fixedUri).toBe('code');
      expect(extensionSliceValueX).toBeDefined();
      expect(extensionSliceValueX.type).toEqual([new ElementDefinitionType('Quantity')]);
    });

    it('should apply a ContainsRule of an extension with a versioned URL', () => {
      const profile = new Profile('MyFamilyHistory');
      profile.parent = 'FamilyMemberHistory';
      const containsRule = new ContainsRule('extension');
      containsRule.items = [
        {
          name: 'history',
          type: 'http://hl7.org/fhir/StructureDefinition/familymemberhistory-type|4.0.1'
        }
      ];
      profile.rules.push(containsRule);
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const extension = sd.elements.find(e => e.id === 'FamilyMemberHistory.extension');
      const extensionSlice = sd.elements.find(
        e => e.id === 'FamilyMemberHistory.extension:history'
      );
      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSlice.type).toEqual([
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/familymemberhistory-type|4.0.1'
        )
      ]);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
    });

    it('should apply a ContainsRule of an extension with a versioned URL and log a warning if the version does not match', () => {
      const profile = new Profile('MyFamilyHistory');
      profile.parent = 'FamilyMemberHistory';
      const containsRule = new ContainsRule('extension')
        .withFile('FSHyFile.fsh')
        .withLocation([3, 0, 3, 45]);
      containsRule.items = [
        {
          name: 'history',
          type: 'http://hl7.org/fhir/StructureDefinition/familymemberhistory-type|1.2.3'
        }
      ];
      profile.rules.push(containsRule);
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const extension = sd.elements.find(e => e.id === 'FamilyMemberHistory.extension');
      const extensionSlice = sd.elements.find(
        e => e.id === 'FamilyMemberHistory.extension:history'
      );
      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSlice.type).toEqual([
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/familymemberhistory-type|1.2.3'
        )
      ]);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /http:\/\/hl7\.org\/fhir\/StructureDefinition\/familymemberhistory-type\|1\.2\.3 was requested, but SUSHI found http:\/\/hl7\.org\/fhir\/StructureDefinition\/familymemberhistory-type\|4\.0\.1.*File: FSHyFile\.fsh.*Line: 3\D*/s
      );
    });

    it('should apply a ContainsRule of an extension with an overridden URL', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set('Foo', profile);

      const extBar = new Extension('Bar');
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'url';
      caretValueRule.value = 'http://different-url.com/StructureDefinition/Bar';
      extBar.rules.push(caretValueRule);
      doc.extensions.set('Bar', extBar);

      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'bar', type: 'Bar' }];
      profile.rules.push(containsRule);

      const onlyRule = new OnlyRule('extension[bar].value[x]');
      onlyRule.types = [{ type: 'Quantity' }];
      profile.rules.push(onlyRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:bar');
      const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:bar.url');
      const extensionSliceValueX = sd.elements.find(
        e => e.id === 'Observation.extension:bar.value[x]'
      );

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSliceUrl).toBeDefined();
      expect(extensionSliceUrl.fixedUri).toBe('http://different-url.com/StructureDefinition/Bar');
      expect(extensionSliceValueX).toBeDefined();
      expect(extensionSliceValueX.type).toEqual([new ElementDefinitionType('Quantity')]);
    });

    it('should apply a ContainsRule of an extension with an overridden URL by URL', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set('Foo', profile);

      const extBar = new Extension('Bar');
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'url';
      caretValueRule.value = 'http://different-url.com/StructureDefinition/Bar';
      extBar.rules.push(caretValueRule);
      doc.extensions.set('Bar', extBar);

      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'bar', type: 'Bar' }];
      profile.rules.push(containsRule);

      const onlyRule = new OnlyRule(
        'extension[http://different-url.com/StructureDefinition/Bar].value[x]'
      );
      onlyRule.types = [{ type: 'Quantity' }];
      profile.rules.push(onlyRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:bar');
      const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:bar.url');
      const extensionSliceValueX = sd.elements.find(
        e => e.id === 'Observation.extension:bar.value[x]'
      );

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSliceUrl).toBeDefined();
      expect(extensionSliceUrl.fixedUri).toBe('http://different-url.com/StructureDefinition/Bar');
      expect(extensionSliceValueX).toBeDefined();
      expect(extensionSliceValueX.type).toEqual([new ElementDefinitionType('Quantity')]);
    });

    it('should apply multiple ContainsRule on an element with defined slicing', () => {
      const profile = new Profile('Foo');
      profile.parent = 'resprate';

      const rule1 = new ContainsRule('code.coding');
      const rule2 = new ContainsRule('code.coding');
      rule1.items = [{ name: 'barSlice' }];
      rule2.items = [{ name: 'fooSlice' }];
      profile.rules.push(rule1);
      profile.rules.push(rule2);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('resprate');

      const barSlice = sd.elements.find(e => e.id === 'Observation.code.coding:barSlice');
      const fooSlice = sd.elements.find(e => e.id === 'Observation.code.coding:fooSlice');

      expect(sd.elements.length).toBe(baseStructDef.elements.length + 2);
      expect(barSlice).toBeDefined();
      expect(fooSlice).toBeDefined();
    });

    it('should apply a containsRule on the child of a choice element with a common ancestor of Element', () => {
      // Element contains extension and id
      // * value[x].extension contains my-inline-extension 0..1

      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('value[x].extension');
      containsRule.items = [{ name: 'my-inline-extension' }];
      profile.rules.push(containsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const extension = sd.elements.find(e => e.id === 'Observation.value[x].extension');
      const extensionSlice = sd.elements.find(
        e => e.id === 'Observation.value[x].extension:my-inline-extension'
      );
      const extensionSliceUrl = sd.elements.find(
        e => e.id === 'Observation.value[x].extension:my-inline-extension.url'
      );

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSliceUrl).toBeDefined();
      expect(extensionSliceUrl.fixedUri).toBe('my-inline-extension');
    });

    it('should report an error and not add the slice when a ContainsRule tries to add a slice that already exists', () => {
      // Profile: DoubleSlice
      // Parent: resprate
      // * code.coding contains onlySlice
      // * code.coding contains onlySlice and okJustOneMoreSlice

      const profile = new Profile('DoubleSlice');
      profile.parent = 'resprate';

      const rule1 = new ContainsRule('code.coding');
      rule1.items = [{ name: 'onlySlice' }];
      const rule2 = new ContainsRule('code.coding');
      rule2.items = [{ name: 'onlySlice' }, { name: 'okJustOneMoreSlice' }];
      profile.rules.push(rule1, rule2);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('resprate');
      const onlySlice = sd.elements.find(e => e.id === 'Observation.code.coding:onlySlice');
      const otherSlice = sd.elements.find(
        e => e.id === 'Observation.code.coding:okJustOneMoreSlice'
      );

      expect(sd.elements.length).toBe(baseStructDef.elements.length + 2);
      expect(onlySlice).toBeDefined();
      expect(otherSlice).toBeDefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Slice named onlySlice already exists on element Observation\.code\.coding of DoubleSlice/s
      );
    });

    it('should report an error and not add the extension when an extension ContainsRule tries to add a slice that already exists but has a different extension URL', () => {
      // Profile: DoubleConflictingExtension
      // Parent: resprate
      // * extension contains http://hl7.org/fhir/StructureDefinition/observation-precondition named precondition
      // * extension contains
      //     http://hl7.org/fhir/StructureDefinition/servicerequest-precondition named precondition and
      //     http://hl7.org/fhir/StructureDefinition/observation-sequelTo named sequelTo

      const profile = new Profile('DoubleConflictingExtension');
      profile.parent = 'resprate';

      const rule1 = new ContainsRule('extension');
      rule1.items = [
        {
          name: 'precondition',
          type: 'http://hl7.org/fhir/StructureDefinition/observation-precondition'
        }
      ];
      const rule2 = new ContainsRule('extension');
      rule2.items = [
        {
          name: 'precondition',
          type: 'http://hl7.org/fhir/StructureDefinition/servicerequest-precondition'
        },
        { name: 'sequelTo', type: 'http://hl7.org/fhir/StructureDefinition/observation-sequelTo' }
      ];
      profile.rules.push(rule1, rule2);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('resprate');
      const precondition = sd.elements.find(e => e.id === 'Observation.extension:precondition');
      const sequelTo = sd.elements.find(e => e.id === 'Observation.extension:sequelTo');

      expect(sd.elements.length).toBe(baseStructDef.elements.length + 2);
      expect(precondition).toBeDefined();
      expect(precondition.type[0].profile).toEqual([
        'http://hl7.org/fhir/StructureDefinition/observation-precondition'
      ]);
      expect(sequelTo).toBeDefined();
      expect(sequelTo.type[0].profile).toEqual([
        'http://hl7.org/fhir/StructureDefinition/observation-sequelTo'
      ]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Slice named precondition already exists on element Observation\.extension of DoubleConflictingExtension/s
      );
    });

    it('should report a warning and not re-add the extension when an extension ContainsRule tries to add a slice that already exists with a matching extension URL', () => {
      // Profile: DoubleSameExtension
      // Parent: resprate
      // * extension contains http://hl7.org/fhir/StructureDefinition/observation-precondition named precondition
      // * extension contains
      //     http://hl7.org/fhir/StructureDefinition/observation-precondition named precondition and
      //     http://hl7.org/fhir/StructureDefinition/observation-sequelTo named sequelTo

      const profile = new Profile('DoubleSameExtension');
      profile.parent = 'resprate';

      const rule1 = new ContainsRule('extension');
      rule1.items = [
        {
          name: 'precondition',
          type: 'http://hl7.org/fhir/StructureDefinition/observation-precondition'
        }
      ];
      const rule2 = new ContainsRule('extension');
      rule2.items = [
        {
          name: 'precondition',
          type: 'http://hl7.org/fhir/StructureDefinition/observation-precondition'
        },
        { name: 'sequelTo', type: 'http://hl7.org/fhir/StructureDefinition/observation-sequelTo' }
      ];
      profile.rules.push(rule1, rule2);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('resprate');
      const precondition = sd.elements.find(e => e.id === 'Observation.extension:precondition');
      const sequelTo = sd.elements.find(e => e.id === 'Observation.extension:sequelTo');

      expect(sd.elements.length).toBe(baseStructDef.elements.length + 2);
      expect(precondition).toBeDefined();
      expect(precondition.type[0].profile).toEqual([
        'http://hl7.org/fhir/StructureDefinition/observation-precondition'
      ]);
      expect(sequelTo).toBeDefined();
      expect(sequelTo.type[0].profile).toEqual([
        'http://hl7.org/fhir/StructureDefinition/observation-sequelTo'
      ]);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Slice named precondition already exists on element Observation\.extension of DoubleSameExtension/s
      );
    });

    it('should report an error and not add the slice when a ContainsRule tries to add a slice that was created on the parent', () => {
      // Profile: FirstProfile
      // Parent: resprate
      // * code.coding contains onlySlice

      // Profile: SecondProfile
      // Parent: FirstProfile
      // * code.coding contains onlySlice

      const firstProfile = new Profile('FirstProfile');
      firstProfile.parent = 'resprate';
      const firstRule = new ContainsRule('code.coding');
      firstRule.items = [{ name: 'onlySlice' }];
      firstProfile.rules.push(firstRule);
      doc.profiles.set(firstProfile.name, firstProfile);

      const secondProfile = new Profile('SecondProfile');
      secondProfile.parent = 'FirstProfile';
      const secondRule = new ContainsRule('code.coding');
      secondRule.items = [{ name: 'onlySlice' }];
      secondProfile.rules.push(secondRule);
      doc.profiles.set(secondProfile.name, secondProfile);

      exporter.exportStructDef(firstProfile);
      exporter.exportStructDef(secondProfile);
      const [firstSd, secondSd] = pkg.profiles;
      const firstSlice = firstSd.elements.find(e => e.id === 'Observation.code.coding:onlySlice');
      const secondSlice = secondSd.elements.find(e => e.id === 'Observation.code.coding:onlySlice');

      expect(firstSlice).toBeDefined();
      expect(secondSlice).toBeDefined();
      expect(firstSd.elements.length).toEqual(secondSd.elements.length);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Slice named onlySlice already exists on element Observation\.code\.coding of SecondProfile/s
      );
    });

    it('should not apply a ContainsRule on an element without defined slicing', () => {
      const profile = new Profile('Foo');
      profile.parent = 'resprate';

      const rule = new ContainsRule('identifier')
        .withFile('NoSlice.fsh')
        .withLocation([6, 3, 6, 12]);
      rule.items = [{ name: 'barSlice' }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('resprate');

      const barSlice = sd.elements.find(e => e.id === 'Observation.identifier:barSlice');

      expect(sd.elements.length).toBe(baseStructDef.elements.length);
      expect(barSlice).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: NoSlice\.fsh.*Line: 6\D*/s);
    });

    // Since previous versions of SUSHI used the slicename as a type lookup as well, we used to issue a warning when we
    // found a rule that may have been intended to work that way (essentially, a user who has not updated their fsh).
    // Time has passed since then and we no longer issue that warning.  This test proves that.
    it('should NOT report a warning if the extension slice name resolves to an external extension type and no explicit type was specified', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('extension')
        .withFile('ExternalSliceName.fsh')
        .withLocation([6, 3, 6, 12]);
      // maxSize is the id of a core FHIR extension
      containsRule.items = [{ name: 'maxSize' }];
      const cardRule = new CardRule('extension[maxSize]');
      cardRule.min = 0;
      cardRule.max = '1';
      profile.rules.push(containsRule, cardRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:maxSize');
      const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:maxSize.url');

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSliceUrl).toBeDefined();
      expect(extensionSliceUrl.fixedUri).toBe('maxSize');

      // In previous versions of this test, a warning was expected here
      expect(loggerSpy.getAllLogs('warn').length).toBe(0);
    });

    it('should NOT report a warning if the extension slice name resolves to a FSH extension and no explicit type was specified', () => {
      const extension = new Extension('MyFshExtension');
      const extCardRule = new CardRule('extension');
      extCardRule.min = 0;
      extCardRule.max = '0';
      extension.rules.push(extCardRule);
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('extension')
        .withFile('FSHSliceName.fsh')
        .withLocation([6, 3, 6, 12]);
      containsRule.items = [{ name: 'MyFshExtension' }];
      const cardRule = new CardRule('extension[MyFshExtension]');
      cardRule.min = 0;
      cardRule.max = '1';
      profile.rules.push(containsRule, cardRule);

      exporter.exportStructDef(extension);
      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extensionEl = sd.elements.find(e => e.id === 'Observation.extension');
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:MyFshExtension');
      const extensionSliceUrl = sd.elements.find(
        e => e.id === 'Observation.extension:MyFshExtension.url'
      );

      expect(extensionEl.slicing).toBeDefined();
      expect(extensionEl.slicing.discriminator.length).toBe(1);
      expect(extensionEl.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSliceUrl).toBeDefined();
      expect(extensionSliceUrl.fixedUri).toBe('MyFshExtension');

      // In previous versions of this test, a warning was expected here
      expect(loggerSpy.getAllLogs('warn').length).toBe(0);
    });

    it('should not report a warning if the extension slice name resolves to an extension type but explicit type was specified', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('extension');
      // maxSize is the id of a core FHIR extension
      containsRule.items = [{ name: 'maxSize', type: 'maxSize' }];
      const cardRule = new CardRule('extension[maxSize]');
      cardRule.min = 0;
      cardRule.max = '1';
      profile.rules.push(containsRule, cardRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:maxSize');
      const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:maxSize.url');

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSlice.type).toEqual([
        new ElementDefinitionType('Extension').withProfiles(
          'http://hl7.org/fhir/StructureDefinition/maxSize'
        )
      ]);
      expect(extensionSliceUrl).toBeUndefined();

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
    });

    it('should not report a warning if the extension slice name does not resolve to an extension type', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('extension');
      // maxSize is the id of a core FHIR extension
      containsRule.items = [{ name: 'foo' }];
      const cardRule = new CardRule('extension[foo]');
      cardRule.min = 0;
      cardRule.max = '1';
      profile.rules.push(containsRule, cardRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extension = sd.elements.find(e => e.id === 'Observation.extension');
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:foo');
      const extensionSliceUrl = sd.elements.find(e => e.id === 'Observation.extension:foo.url');

      expect(extension.slicing).toBeDefined();
      expect(extension.slicing.discriminator.length).toBe(1);
      expect(extension.slicing.discriminator[0]).toEqual({ type: 'value', path: 'url' });
      expect(extensionSlice).toBeDefined();
      expect(extensionSliceUrl).toBeDefined();
      expect(extensionSliceUrl.fixedUri).toBe('foo');

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
    });

    it('should report an error if the author specifies a slice type on a non-extension', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const slicingType = new CaretValueRule('component');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('pattern');
      const slicingPath = new CaretValueRule('component');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'code';
      const slicingRules = new CaretValueRule('component');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const containsRule = new ContainsRule('component')
        .withFile('BadSlice.fsh')
        .withLocation([6, 3, 6, 12]);
      containsRule.items = [{ name: 'offset', type: 'observation-timeOffset' }];
      profile.rules.push(slicingType, slicingPath, slicingRules, containsRule);

      exporter.exportStructDef(profile);

      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot specify type on offset slice since component is not an extension path\..*File: BadSlice\.fsh.*Line: 6\D*/s
      );

      // But it should still go ahead and create the slice
      const sd = pkg.profiles[0];
      const offsetSlice = sd.elements.find(e => e.id === 'Observation.component:offset');
      expect(offsetSlice.sliceName).toEqual('offset');
    });

    it('should report an error for an extension ContainsRule with a type that resolves to a non-extension', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('extension')
        .withFile('BadExt.fsh')
        .withLocation([6, 3, 6, 12]);
      containsRule.items = [{ name: 'condition', type: 'Condition' }];
      profile.rules.push(containsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');
      expect(sd.elements.length).toBe(baseStructDef.elements.length);

      const conditionSlice = sd.elements.find(e => e.id === 'Observation.extension:condition');
      expect(conditionSlice).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot create condition extension; unable to locate extension definition for: Condition\..*File: BadExt\.fsh.*Line: 6\D*/s
      );
    });

    it('should report an error for an extension ContainsRule with a non-modifier extension type on a modifierExtension path', () => {
      const extension = new Extension('MyExtension');
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const containsRule = new ContainsRule('modifierExtension')
        .withFile('WrongModifier.fsh')
        .withLocation([5, 3, 5, 29]);
      containsRule.items = [{ name: 'myExt', type: 'MyExtension' }];
      profile.rules.push(containsRule);
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.modifierExtension:myExt');
      expect(extensionSlice).toBeDefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Non-modifier extension MyExtension assigned to modifierExtension path\. Non-modifier extensions should only be assigned to extension paths\..*File: WrongModifier\.fsh.*Line: 5\D*/s
      );
    });

    it('should not report an error for an extension ContainsRule with a modifier extension type on a modifierExtension path', () => {
      const extension = new Extension('MyExtension');
      const modifierRule = new FlagRule('.');
      modifierRule.modifier = true;
      extension.rules.push(modifierRule);
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const containsRule = new ContainsRule('modifierExtension');
      containsRule.items = [{ name: 'myExt', type: 'MyExtension' }];
      profile.rules.push(containsRule);
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.modifierExtension:myExt');
      expect(extensionSlice).toBeDefined();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should report an error for an extension ContainsRule with a modifier extension type on an extension path', () => {
      const extension = new Extension('MyExtension');
      const modifierRule = new FlagRule('.');
      modifierRule.modifier = true;
      extension.rules.push(modifierRule);
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const containsRule = new ContainsRule('extension')
        .withFile('WrongModifier.fsh')
        .withLocation([9, 4, 9, 21]);
      containsRule.items = [{ name: 'myExt', type: 'MyExtension' }];
      profile.rules.push(containsRule);
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.extension:myExt');
      expect(extensionSlice).toBeDefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Modifier extension MyExtension assigned to extension path\. Modifier extensions should only be assigned to modifierExtension paths\..*File: WrongModifier\.fsh.*Line: 9\D*/s
      );
    });

    it('should not report an error for an extension ContainsRule with a non-modifier extension type on an extension path', () => {
      const extension = new Extension('MyExtension');
      doc.extensions.set(extension.name, extension);

      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      const containsRule = new ContainsRule('category.extension');
      containsRule.items = [{ name: 'myExt', type: 'MyExtension' }];
      profile.rules.push(containsRule);
      doc.profiles.set(profile.name, profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const extensionSlice = sd.elements.find(e => e.id === 'Observation.category.extension:myExt');
      expect(extensionSlice).toBeDefined();
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should report an error for an extension ContainsRule with a type that does not resolve', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('extension')
        .withFile('BadExt.fsh')
        .withLocation([6, 3, 6, 12]);
      containsRule.items = [{ name: 'spoon', type: 'IDoNotExist' }];
      profile.rules.push(containsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');
      expect(sd.elements.length).toBe(baseStructDef.elements.length);

      const spoonSlice = sd.elements.find(e => e.id === 'Observation.extension:spoon');
      expect(spoonSlice).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot create spoon extension; unable to locate extension definition for: IDoNotExist\..*File: BadExt\.fsh.*Line: 6\D*/s
      );
    });

    it('should report an error for a ContainsRule on a single element', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('status')
        .withFile('SingleElement.fsh')
        .withLocation([6, 3, 6, 12]);
      containsRule.items = [{ name: 'test' }];
      profile.rules.push(containsRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');
      expect(sd.elements.length).toBe(baseStructDef.elements.length);

      const slice = sd.elements.find(e => e.id === 'Observation.status:test');
      expect(slice).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot slice element 'status'.*File: SingleElement\.fsh.*Line: 6\D*/s
      );
    });
  });

  describe('#CaretValueRule', () => {
    it('should apply a CaretValueRule on an element with a path', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CaretValueRule('status');
      rule.caretPath = 'short';
      rule.value = 'foo';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const status = sd.findElement('Observation.status');
      expect(status.short).toBe('foo');
    });

    it('should not apply an invalid CaretValueRule on an element with a path', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CaretValueRule('status')
        .withFile('InvalidValue.fsh')
        .withLocation([6, 3, 6, 12]);
      rule.caretPath = 'short';
      rule.value = true;
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const status = sd.findElement('Observation.status');
      const baseStatus = baseStructDef.findElement('Observation.status');

      expect(status.short).toBe(baseStatus.short);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: InvalidValue\.fsh.*Line: 6\D*/s);
    });

    it('should apply a CaretValueRule on the parent element', () => {
      // Profile: ShortObservation
      // Parent: Observation
      // * . ^ short = "This one is not so tall."
      const profile = new Profile('ShortObservation');
      profile.parent = 'Observation';

      const rule = new CaretValueRule('.');
      rule.caretPath = 'short';
      rule.value = 'This one is not so tall.';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const observation = sd.findElement('Observation');
      expect(observation.short).toBe('This one is not so tall.');
    });

    it('should apply a CaretValueRule on an element without a path', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CaretValueRule('');
      rule.caretPath = 'description';
      rule.value = 'foo';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      expect(sd.description).toBe('foo');
    });

    it('should apply a CaretValueRule on the child of a primitive element without a path', () => {
      const profile = new Profile('SpecialUrlId');
      profile.parent = 'Observation';

      const rule = new CaretValueRule('');
      rule.caretPath = 'url.id';
      rule.value = 'my-id';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      expect(sd).toHaveProperty('_url', { id: 'my-id' });
    });

    it('should apply a CaretValueRule on an extension of a primitive element without a path', () => {
      // Extension: MyBooleanExtension
      // * value[x] only boolean
      const extension = new Extension('MyBooleanExtension');
      const onlyBoolean = new OnlyRule('value[x]');
      onlyBoolean.types.push({ type: 'boolean' });
      extension.rules.push(onlyBoolean);
      doc.extensions.set(extension.name, extension);
      // Profile: ExtensionOnPublisher
      // Parent: Patient
      // * ^publisher.extension[MyBooleanExtension].valueBoolean = true
      const profile = new Profile('ExtensionOnPublisher');
      profile.parent = 'Patient';
      const rule = new CaretValueRule('');
      rule.caretPath = 'publisher.extension[MyBooleanExtension].valueBoolean';
      rule.value = true;
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      expect(sd).toHaveProperty('_publisher', {
        extension: [
          {
            url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/MyBooleanExtension',
            valueBoolean: true
          }
        ]
      });
    });

    it('should apply a CaretValueRule on an extension on ElementDefinition', () => {
      // Extension: MyBooleanExtension
      // * value[x] only boolean
      const extension = new Extension('MyBooleanExtension');
      const onlyBoolean = new OnlyRule('value[x]');
      onlyBoolean.types.push({ type: 'boolean' });
      extension.rules.push(onlyBoolean);
      doc.extensions.set(extension.name, extension);
      // Profile: ExtensionOnName
      // Parent: Patient
      // * name ^extension[MyBooleanExtension].valueBoolean = true
      const profile = new Profile('ExtensionOnName');
      profile.parent = 'Patient';
      const rule = new CaretValueRule('name');
      rule.caretPath = 'extension[MyBooleanExtension].valueBoolean';
      rule.value = true;
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const name = sd.findElement('Patient.name');
      expect(name.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/MyBooleanExtension',
          valueBoolean: true
        }
      ]);
    });

    it('should apply a CaretValueRule on an extension on ElementDefinition even when the extension references an allowed R5 resource in an R4 IG', () => {
      // This one caused some problems in manual testing of special R5 resources in R4 IGs

      // Instance: AD1
      // InstanceOf: ActorDefinition
      // Usage: #definition
      // * status = #active
      // * type = #server
      //
      // Profile: ExtensionOnName
      // Parent: Patient
      // * name ^extension[http://hl7.org/fhir/tools/StructureDefinition/obligation].extension[actor].valueCanonical = Canonical(AD1)
      // * name ^extension[http://hl7.org/fhir/tools/StructureDefinition/obligation].extension[code].valueCode = #SHALL

      const ad1 = new Instance('AD1');
      ad1.instanceOf = 'ActorDefinition';
      ad1.usage = 'Definition';
      const statusRule = new AssignmentRule('status');
      statusRule.value = new FshCode('active');
      const typeRule = new AssignmentRule('type');
      typeRule.value = new FshCode('server');
      ad1.rules.push(statusRule, typeRule);
      doc.instances.set('AD1', ad1);

      const profile = new Profile('ExtensionOnName');
      profile.parent = 'Patient';
      const actorRule = new CaretValueRule('name');
      actorRule.caretPath =
        'extension[http://hl7.org/fhir/tools/StructureDefinition/obligation].extension[actor].valueCanonical';
      actorRule.value = new FshCanonical('AD1');
      const codeRule = new CaretValueRule('name');
      codeRule.caretPath =
        'extension[http://hl7.org/fhir/tools/StructureDefinition/obligation].extension[code].valueCode';
      codeRule.value = new FshCode('SHALL');
      profile.rules.push(actorRule, codeRule);
      doc.profiles.set('ExtensionOnName', profile);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const name = sd.findElement('Patient.name');
      expect(name.extension).toEqual([
        {
          url: 'http://hl7.org/fhir/tools/StructureDefinition/obligation',
          extension: [
            { url: 'actor', valueCanonical: 'http://hl7.org/fhir/us/minimal/ActorDefinition/AD1' },
            { url: 'code', valueCode: 'SHALL' }
          ]
        }
      ]);
    });

    it('should not apply an invalid CaretValueRule on an element without a path', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CaretValueRule('').withFile('InvalidValue.fsh').withLocation([6, 3, 6, 12]);
      rule.caretPath = 'description';
      rule.value = new FshCode('1234');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      expect(sd.description).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: InvalidValue\.fsh.*Line: 6\D*/s);
    });

    it('should apply a CaretValueRule on an extension element without a path', () => {
      // Extension: SpecialExtension
      const extension = new Extension('SpecialExtension');
      doc.extensions.set(extension.name, extension);
      // Profile: HasSpecialExtension
      // Parent: Observation
      // * ^extension[SpecialExtension].valueString = "This is the special extension on the structure definition."
      const profile = new Profile('HasSpecialExtension');
      profile.parent = 'Observation';
      const caretValueRule = new CaretValueRule('');
      caretValueRule.caretPath = 'extension[SpecialExtension].valueString';
      caretValueRule.value = 'This is the special extension on the structure definition.';
      profile.rules.push(caretValueRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const extensionElement = sd.extension.find(
        e => e.url === 'http://hl7.org/fhir/us/minimal/StructureDefinition/SpecialExtension'
      );
      expect(extensionElement).toBeDefined();
      expect(extensionElement).toEqual({
        url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/SpecialExtension',
        valueString: 'This is the special extension on the structure definition.'
      });
    });

    it('should apply a Reference CaretValueRule on an SD and replace the Reference', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const instance = new Instance('Bar');
      instance.id = 'bar-id';
      instance.instanceOf = 'Organization';
      doc.instances.set(instance.name, instance);

      const rule = new CaretValueRule('');
      rule.caretPath = 'identifier[0].assigner';
      rule.value = new FshReference('Bar');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      expect(sd.identifier[0].assigner).toEqual({
        reference: 'Organization/bar-id'
      });
    });

    it('should apply a Reference CaretValueRule on an ED and replace the Reference', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const instance = new Instance('Bar');
      instance.id = 'bar-id';
      instance.instanceOf = 'Organization';
      doc.instances.set(instance.name, instance);

      const rule = new CaretValueRule('subject');
      rule.caretPath = 'patternReference';
      rule.value = new FshReference('Bar');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const ed = sd.elements.find(e => e.id === 'Observation.subject');

      expect(ed.patternReference).toEqual({
        reference: 'Organization/bar-id'
      });
    });

    it('should apply a CodeSystem CaretValueRule on an SD and replace the CodeSystem', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const cs = new FshCodeSystem('Bar');
      cs.id = 'bar-id';
      doc.codeSystems.set(cs.name, cs);

      const rule = new CaretValueRule('');
      rule.caretPath = 'jurisdiction';
      rule.value = new FshCode('foo', 'Bar');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      expect(sd.jurisdiction[0].coding[0]).toEqual({
        code: 'foo',
        system: 'http://hl7.org/fhir/us/minimal/CodeSystem/bar-id'
      });
    });

    it('should apply a CodeSystem CaretValueRule on an ED and replace the Reference', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const cs = new FshCodeSystem('Bar');
      cs.id = 'bar-id';
      doc.codeSystems.set(cs.name, cs);

      const rule = new CaretValueRule('subject');
      rule.caretPath = 'code';
      rule.value = new FshCode('foo', 'Bar');
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const ed = sd.elements.find(e => e.id === 'Observation.subject');

      expect(ed.code[0]).toEqual({
        code: 'foo',
        system: 'http://hl7.org/fhir/us/minimal/CodeSystem/bar-id'
      });
    });

    it('should identify existing extensions by URL when applying a CaretValueRule on a StructureDefintiion', () => {
      const parentProfile = new Profile('Foo');
      parentProfile.parent = 'Observation';

      const parentRule = new CaretValueRule('');
      parentRule.caretPath = 'extension[mothersMaidenName].valueString';
      parentRule.value = 'ParentName';
      parentProfile.rules.push(parentRule);

      const childProfile = new Profile('Bar');
      childProfile.parent = 'Foo';

      const childRule = new CaretValueRule('');
      childRule.caretPath = 'extension[mothersMaidenName].valueString';
      childRule.value = 'ChildName';
      childProfile.rules.push(childRule);

      // Profile: Foo
      // Parent: Observation
      // * ^extension[mothersMaidenName].valueString = "ParentName"
      //
      // Profile: Bar
      // Parent: Foo
      // * ^extension[mothersMaidenName].valueString = "ChildName"
      exporter.exportStructDef(parentProfile);
      exporter.exportStructDef(childProfile);

      const sd = pkg.profiles[1];

      // We should only find one copy of the extension
      expect(
        sd.extension.filter(
          e => e.url === 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
        )
      ).toHaveLength(1);
      // And it should have the correct value
      expect(
        sd.extension.find(
          e => e.url === 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
        )
      ).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName',
        valueString: 'ChildName'
      });
    });

    it('should apply CaretValueRules on the targetProfile of a type', () => {
      // Alias: $typeMS = http://hl7.org/fhir/StructureDefinition/elementdefinition-type-must-support
      doc.aliases.set(
        '$typeMS',
        'http://hl7.org/fhir/StructureDefinition/elementdefinition-type-must-support'
      );
      // Profile: MyDiagnosticReport
      // Parent: DiagnosticReport
      // * result only Reference(observation-bodyheight or observation-bodyweight)
      //   * ^type[0].targetProfile[0].extension[$typeMS].valueBoolean = true
      //   * ^type[0].targetProfile[1].extension[$typeMS].valueBoolean = true
      const profile = new Profile('MyDiagnosticReport');
      profile.parent = 'DiagnosticReport';
      const resultOnly = new OnlyRule('result');
      resultOnly.types = [
        { type: 'observation-bodyheight', isReference: true },
        { type: 'observation-bodyweight', isReference: true }
      ];
      const firstExtension = new CaretValueRule('result');
      firstExtension.caretPath = 'type[0].targetProfile[0].extension[$typeMS].valueBoolean';
      firstExtension.value = true;
      const secondExtension = new CaretValueRule('result');
      secondExtension.caretPath = 'type[0].targetProfile[1].extension[$typeMS].valueBoolean';
      secondExtension.value = true;
      profile.rules.push(resultOnly, firstExtension, secondExtension);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const ed = sd.elements.find(e => e.id === 'DiagnosticReport.result');
      expect(ed.type).toHaveLength(1);
      const expectedType = new ElementDefinitionType('Reference').withTargetProfiles(
        'http://hl7.org/fhir/StructureDefinition/bodyheight',
        'http://hl7.org/fhir/StructureDefinition/bodyweight'
      );
      expectedType._targetProfile = [
        {
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/elementdefinition-type-must-support',
              valueBoolean: true
            }
          ]
        },
        {
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/elementdefinition-type-must-support',
              valueBoolean: true
            }
          ]
        }
      ];
      expect(ed.type[0]).toEqual(expectedType);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });
  });

  describe('#ObeysRule', () => {
    it('should apply an ObeysRule at the specified path', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('error');
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('value[x]');
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule); // * value[x] obeys MyInvariant

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValueX = baseStructDef.findElement('Observation.value[x]');
      const changedValueX = sd.findElement('Observation.value[x]');

      expect(baseValueX.constraint).toHaveLength(1);
      expect(changedValueX.constraint).toHaveLength(2);
      expect(changedValueX.constraint[1]).toEqual({
        key: 'MyInvariant',
        human: 'My important invariant',
        severity: 'error',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply an ObeysRule at specified path (for Invariant with rules)', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('warning');
      const bestPracticeRule = new AssignmentRule(
        'extension[http://hl7.org/fhir/StructureDefinition/elementdefinition-bestpractice].valueBoolean'
      );
      bestPracticeRule.value = true;
      invariant.rules = [bestPracticeRule];
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('value[x]');
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule); // * value[x] obeys MyInvariant

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValueX = baseStructDef.findElement('Observation.value[x]');
      const changedValueX = sd.findElement('Observation.value[x]');

      expect(baseValueX.constraint).toHaveLength(1);
      expect(changedValueX.constraint).toHaveLength(2);
      expect(changedValueX.constraint[1]).toEqual({
        key: 'MyInvariant',
        human: 'My important invariant',
        severity: 'warning',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/elementdefinition-bestpractice',
            valueBoolean: true
          }
        ]
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply an ObeysRule at specified path (for Invariant with rules overriding keywords)', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('warning');
      invariant.expression = 'some.fhirpath';
      invariant.xpath = 'some:xpath';
      const keyRule = new AssignmentRule('key'); // BTW - super bad idea
      keyRule.value = 'MyNewKey';
      const severityRule = new AssignmentRule('severity');
      severityRule.value = new FshCode('error');
      const humanRule = new AssignmentRule('human');
      humanRule.value = 'My new description';
      const expressionRule = new AssignmentRule('expression');
      expressionRule.value = 'new.fhirpath';
      const xpathRule = new AssignmentRule('xpath');
      xpathRule.value = 'new:xpath';
      const sourceRule = new AssignmentRule('source');
      sourceRule.value = 'http://example.org/fhir/StructureDefinition/new-foo';
      const requirementsRule = new AssignmentRule('requirements');
      requirementsRule.value = 'My new requirements';
      invariant.rules = [
        keyRule,
        severityRule,
        humanRule,
        expressionRule,
        xpathRule,
        sourceRule,
        requirementsRule
      ];
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('value[x]');
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule); // * value[x] obeys MyInvariant

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValueX = baseStructDef.findElement('Observation.value[x]');
      const changedValueX = sd.findElement('Observation.value[x]');

      expect(baseValueX.constraint).toHaveLength(1);
      expect(changedValueX.constraint).toHaveLength(2);
      expect(changedValueX.constraint[1]).toEqual({
        key: 'MyNewKey',
        human: 'My new description',
        severity: 'error',
        expression: 'new.fhirpath',
        xpath: 'new:xpath',
        source: 'http://example.org/fhir/StructureDefinition/new-foo',
        requirements: 'My new requirements'
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply an ObeysRule at specified path (for Invariant with soft-indexed rules)', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('warning');
      const extension1UrlRule = new AssignmentRule('extension[+].url');
      extension1UrlRule.value = 'http://example.org/first-extension';
      const extension1ValueRule = new AssignmentRule('extension[=].valueString');
      extension1ValueRule.value = 'Hello';
      const extension2UrlRule = new AssignmentRule('extension[+].url');
      extension2UrlRule.value = 'http://example.org/second-extension';
      const extension2ValueRule = new AssignmentRule('extension[=].valueCodeableConcept');
      extension2ValueRule.value = new FshCode('bar', 'http://foo.org/codes');
      invariant.rules = [
        extension1UrlRule,
        extension1ValueRule,
        extension2UrlRule,
        extension2ValueRule
      ];
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('value[x]');
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule); // * value[x] obeys MyInvariant

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValueX = baseStructDef.findElement('Observation.value[x]');
      const changedValueX = sd.findElement('Observation.value[x]');

      expect(baseValueX.constraint).toHaveLength(1);
      expect(changedValueX.constraint).toHaveLength(2);
      expect(changedValueX.constraint[1]).toEqual({
        key: 'MyInvariant',
        human: 'My important invariant',
        severity: 'warning',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo',
        extension: [
          {
            url: 'http://example.org/first-extension',
            valueString: 'Hello'
          },
          {
            url: 'http://example.org/second-extension',
            valueCodeableConcept: {
              coding: [{ system: 'http://foo.org/codes', code: 'bar' }]
            }
          }
        ]
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply an ObeysRule at specified path (for Invariant with insert rules)', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const ruleSet = new RuleSet('BestPractice');
      const requirementsRule = new AssignmentRule('requirements');
      requirementsRule.value = 'Not required, but a really good idea.';
      const bestPracticeRule = new AssignmentRule(
        'extension[http://hl7.org/fhir/StructureDefinition/elementdefinition-bestpractice].valueBoolean'
      );
      bestPracticeRule.value = true;
      ruleSet.rules = [requirementsRule, bestPracticeRule];
      doc.ruleSets.set(ruleSet.name, ruleSet);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('warning');
      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'BestPractice';
      invariant.rules = [insertRule];
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('value[x]');
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule); // * value[x] obeys MyInvariant

      exporter.applyInsertRules();
      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValueX = baseStructDef.findElement('Observation.value[x]');
      const changedValueX = sd.findElement('Observation.value[x]');

      expect(baseValueX.constraint).toHaveLength(1);
      expect(changedValueX.constraint).toHaveLength(2);
      expect(changedValueX.constraint[1]).toEqual({
        key: 'MyInvariant',
        human: 'My important invariant',
        severity: 'warning',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo',
        requirements: 'Not required, but a really good idea.',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/elementdefinition-bestpractice',
            valueBoolean: true
          }
        ]
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply an ObeysRule at the path which does not have a constraint', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('error');
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('id');
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule); // * id obeys MyInvariant

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const basedId = baseStructDef.findElement('Observation.id');
      const changedId = sd.findElement('Observation.id');

      expect(basedId.constraint).toBeUndefined();
      expect(changedId.constraint).toHaveLength(1);
      expect(changedId.constraint[0]).toEqual({
        key: 'MyInvariant',
        human: 'My important invariant',
        severity: 'error',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply an ObeysRule to the base element when no path specified', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('error');
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('');
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule); // * obeys MyInvariant

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseElement = baseStructDef.findElement('Observation');
      const changedElement = sd.findElement('Observation');

      expect(baseElement.constraint).toHaveLength(7);
      expect(changedElement.constraint).toHaveLength(8);
      expect(changedElement.constraint[7]).toEqual({
        key: 'MyInvariant',
        human: 'My important invariant',
        severity: 'error',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo'
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply an ObeysRule to the base element when no path specified (for Invariant with rules)', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('warning');
      const bestPracticeRule = new AssignmentRule(
        'extension[http://hl7.org/fhir/StructureDefinition/elementdefinition-bestpractice].valueBoolean'
      );
      bestPracticeRule.value = true;
      invariant.rules = [bestPracticeRule];
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('');
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule); // * obeys MyInvariant

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseElement = baseStructDef.findElement('Observation');
      const changedElement = sd.findElement('Observation');

      expect(baseElement.constraint).toHaveLength(7);
      expect(changedElement.constraint).toHaveLength(8);
      expect(changedElement.constraint[7]).toEqual({
        key: 'MyInvariant',
        human: 'My important invariant',
        severity: 'warning',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Foo',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/elementdefinition-bestpractice',
            valueBoolean: true
          }
        ]
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should not apply an ObeysRule on an invariant that does not exist', () => {
      const profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyRealInvariant');
      invariant.description = 'A very real invariant';
      invariant.severity = new FshCode('error');
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('value[x]').withFile('FooProfile.fsh').withLocation([4, 7, 4, 15]);
      rule.invariant = 'MyFakeInvariant';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('Observation');

      const baseValueX = baseStructDef.findElement('Observation.value[x]');
      const changedValueX = sd.findElement('Observation.value[x]');

      expect(baseValueX.constraint).toHaveLength(1);
      expect(changedValueX.constraint).toHaveLength(1);
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getLastMessage()).toMatch(
        /Cannot apply MyFakeInvariant constraint on Foo because it was never defined./s
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: FooProfile\.fsh.*Line: 4\D*/s);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    });

    it('should log an error when applying an ObeysRule on an invariant with an invalid id', () => {
      // Profile: StrangeObservation
      // Parent: Observation
      // * category obeys strange_1
      // Invariant: strange_1
      // Severity: #error
      // Description: "This is a strange one."

      const profile = new Profile('StrangeObservation');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('strange_1');
      invariant.severity = new FshCode('error');
      invariant.description = 'This is a strange one.';
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('category').withFile('StrangeOne.fsh').withLocation([3, 8, 3, 24]);
      rule.invariant = 'strange_1';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const category = sd.findElement('Observation.category');
      expect(category.constraint).toHaveLength(2);
      expect(category.constraint[1].key).toBe(invariant.name);
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('error')).toMatch(/does not represent a valid FHIR id/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: StrangeOne\.fsh.*Line: 3\D*/s);
    });

    it('should log an error with correct tracking info when applying an ObeysRule with an invalid rule', () => {
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      const invariant = new Invariant('MyInvariant');
      invariant.description = 'My important invariant';
      invariant.severity = new FshCode('warning');
      const invalidRule = new AssignmentRule('hockey')
        .withFile('MyInvariants.fsh')
        .withLocation([5, 3, 5, 14]);
      invalidRule.value = 'stick';
      const requirementsRule = new AssignmentRule('requirements');
      requirementsRule.value = 'My requirements.';
      const bestPracticeRule = new AssignmentRule(
        'extension[http://hl7.org/fhir/StructureDefinition/elementdefinition-bestpractice].valueBoolean'
      );
      bestPracticeRule.value = true;

      invariant.rules = [requirementsRule, invalidRule, bestPracticeRule];
      doc.invariants.set(invariant.name, invariant);

      const rule = new ObeysRule('category')
        .withFile('MyObservation.fsh')
        .withLocation([3, 8, 3, 24]);
      rule.invariant = 'MyInvariant';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const category = sd.findElement('Observation.category');
      expect(category.constraint).toHaveLength(2);
      expect(category.constraint[1]).toEqual({
        key: 'MyInvariant',
        human: 'My important invariant',
        severity: 'warning',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/MyObservation',
        requirements: 'My requirements.',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/elementdefinition-bestpractice',
            valueBoolean: true
          }
        ]
      });
      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getLastMessage('error')).toMatch(/does not exist: constraint\[1]\.hockey/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/  File: MyInvariants\.fsh.*  Line: 5\D*/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /  Applied in File: MyObservation\.fsh.*  Applied on Line: 3\D*/s
      );
    });
  });

  describe('#Extension preprocessing', () => {
    it('should zero out Extension.value[x] when Extension.extension is used', () => {
      const extension = new Extension('MyInferredComplexExtension');
      extension.id = 'complex-extension';

      const cardRuleForExtension = new CardRule('extension');
      cardRuleForExtension.min = 1;
      cardRuleForExtension.max = '*';
      extension.rules.push(cardRuleForExtension);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('0');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should not zero out Extension.value[x] if Extension.extension is zeroed out', () => {
      const extension = new Extension('MyExplicitSimpleExtension');
      extension.id = 'simple-extension';

      const cardRuleForExtension = new CardRule('extension');
      cardRuleForExtension.min = 0;
      cardRuleForExtension.max = '0';
      extension.rules.push(cardRuleForExtension);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('1');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should log an error if Extension.extension and Extension.value[x] are both used but apply both rules', () => {
      const extension = new Extension('MyInvalidExtension');
      extension.id = 'my-invalid-extension';

      const onlyRuleForValueX = new OnlyRule('value[x]');
      onlyRuleForValueX.types = [{ type: 'string' }];
      extension.rules.push(onlyRuleForValueX);
      const containsRuleForExtension = new ContainsRule('extension')
        .withFile('InvalidExtension.fsh')
        .withLocation([4, 7, 4, 15]);
      containsRuleForExtension.items = [{ name: 'MySlice' }];
      extension.rules.push(containsRuleForExtension);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');
      const extensionElement = sd.findElement('Extension.extension:MySlice');

      // Both rules are applied but an error is logged
      expect(valueElement.type).toEqual([new ElementDefinitionType('string')]);
      expect(extensionElement).toBeDefined();
      expect(extensionElement.sliceName).toEqual('MySlice');
      expect(loggerSpy.getLastMessage()).toMatch(
        /Extension on MyInvalidExtension cannot have both a value and sub-extensions/s
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: InvalidExtension\.fsh.*Line: 4\D*/s);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    });

    it('should zero out Extension.extension when Extension.value[x] is used', () => {
      const extension = new Extension('MyInferredSimpleExtension');
      extension.id = 'simple-extension';

      const onlyRuleForValue = new OnlyRule('value[x]');
      onlyRuleForValue.types = [{ type: 'string' }];
      extension.rules.push(onlyRuleForValue);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const extensionElement = sd.findElement('Extension.extension');

      expect(extensionElement.min).toEqual(0);
      expect(extensionElement.max).toEqual('0');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should not zero out Extension.extension if Extension.value[x] is zeroed out', () => {
      const extension = new Extension('MyExplicitComplexExtension');
      extension.id = 'complex-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'MySlice' }];
      extension.rules.push(containsRuleForExtension);

      const cardRuleForValue = new CardRule('value[x]');
      cardRuleForValue.min = 0;
      cardRuleForValue.max = '0';
      extension.rules.push(cardRuleForValue);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const extensionElement = sd.findElement('Extension.extension');

      expect(extensionElement.min).toEqual(0);
      expect(extensionElement.max).toEqual('*');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should log an error if Extension.value[x] is changed after Extension.extension is used but apply both rules', () => {
      const extension = new Extension('MyOtherInvalidExtension');
      extension.id = 'my-invalid-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'MySlice' }];
      extension.rules.push(containsRuleForExtension);
      const onlyRuleForValueX = new OnlyRule('value[x]')
        .withFile('OtherInvalidExtension.fsh')
        .withLocation([4, 7, 4, 15]);
      onlyRuleForValueX.types = [{ type: 'string' }];
      extension.rules.push(onlyRuleForValueX);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const extensionElement = sd.findElement('Extension.extension:MySlice');
      const valueElement = sd.findElement('Extension.value[x]');

      // Both rules are applied but an error is logged
      expect(extensionElement).toBeDefined();
      expect(extensionElement.sliceName).toEqual('MySlice');
      expect(valueElement.type).toEqual([new ElementDefinitionType('string')]);
      expect(loggerSpy.getLastMessage()).toMatch(
        /Extension on MyOtherInvalidExtension cannot have both a value and sub-extensions/s
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: OtherInvalidExtension\.fsh.*Line: 4\D*/s);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    });

    it('should zero out value[x] on an extension defined inline that uses extension', () => {
      const extension = new Extension('MyExtension');
      extension.id = 'my-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'mySlice' }];
      extension.rules.push(containsRuleForExtension); // * extension contains MySlice

      const cardRule = new CardRule('extension[mySlice].extension');
      cardRule.min = 1;
      cardRule.max = '*';
      extension.rules.push(cardRule); // * extension[mySlice].extension 1..* which implies extension[mySlice].value[x] 0..0

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');
      const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('0');
      expect(mySliceValueElement.min).toEqual(0);
      expect(mySliceValueElement.max).toEqual('0');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should zero out extension on an extension defined inline that uses value[x]', () => {
      const extension = new Extension('MyExtension');
      extension.id = 'my-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'mySlice' }];
      extension.rules.push(containsRuleForExtension); // * extension contains MySlice

      const assignedValueRule = new AssignmentRule('extension[mySlice].valueBoolean');
      assignedValueRule.value = true;
      extension.rules.push(assignedValueRule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');
      const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('0');
      expect(mySliceExtensionElement.min).toEqual(0);
      expect(mySliceExtensionElement.max).toEqual('0');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should not zero out extension if value[x] is zeroed out on an extension defined inline', () => {
      const extension = new Extension('MyExtension');
      extension.id = 'my-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'mySlice' }];
      extension.rules.push(containsRuleForExtension); // * extension contains MySlice

      const cardRule = new CardRule('extension[mySlice].value[x]');
      cardRule.min = 0;
      cardRule.max = '0';
      extension.rules.push(cardRule); // * extension[mySlice].value[x] 0..0 which should not change anything on extension[mySlice].extension

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');
      const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');
      const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('0');
      expect(mySliceValueElement.min).toEqual(0);
      expect(mySliceValueElement.max).toEqual('0');
      expect(mySliceExtensionElement.min).toEqual(0);
      expect(mySliceExtensionElement.max).toEqual('*'); // extension[mySlice].extension cardinality is unchanged
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should not zero out value[x] if extension is zeroed out on an extension defined inline', () => {
      const extension = new Extension('MyExtension');
      extension.id = 'my-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'mySlice' }];
      extension.rules.push(containsRuleForExtension); // * extension contains MySlice

      const cardRule = new CardRule('extension[mySlice].extension');
      cardRule.min = 0;
      cardRule.max = '0';
      extension.rules.push(cardRule); // * extension[mySlice].extension 0..0 which should not change anything on extension[mySlice].value[x]

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');
      const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');
      const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('0');
      expect(mySliceValueElement.min).toEqual(0);
      expect(mySliceValueElement.max).toEqual('1'); // extension[mySlice].value[x] cardinality is unchanged
      expect(mySliceExtensionElement.min).toEqual(0);
      expect(mySliceExtensionElement.max).toEqual('0');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should log an error if extension is used after value[x] on an extension defined inline and apply both rules', () => {
      const extension = new Extension('MyInvalidExtension');
      extension.id = 'my-invalid-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'mySlice' }];
      extension.rules.push(containsRuleForExtension); // * extension contains MySlice

      // Contradictory rules - log an error but set both
      const valueCardRule = new CardRule('extension[mySlice].value[x]');
      valueCardRule.min = 1;
      valueCardRule.max = '1';
      extension.rules.push(valueCardRule); // * extension[mySlice].value[x] 1..1
      const extensionCardRule = new CardRule('extension[mySlice].extension')
        .withFile('InvalidInlineExtension.fsh')
        .withLocation([4, 7, 4, 15]);
      extensionCardRule.min = 1;
      extensionCardRule.max = '*';
      extension.rules.push(extensionCardRule); // * extension[mySlice].extension 1..*

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');
      const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');
      const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('0');
      expect(mySliceExtensionElement.min).toEqual(1);
      expect(mySliceExtensionElement.max).toEqual('*');
      expect(mySliceValueElement.min).toEqual(1);
      expect(mySliceValueElement.max).toEqual('1');
      expect(loggerSpy.getLastMessage()).toMatch(
        /Extension on MyInvalidExtension cannot have both a value and sub-extensions/s
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: InvalidInlineExtension\.fsh.*Line: 4\D*/s);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    });

    it('should log an error if value[x] is used after extension on an extension defined inline and apply both rules', () => {
      const extension = new Extension('MyInvalidExtension');
      extension.id = 'my-invalid-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'mySlice' }];
      extension.rules.push(containsRuleForExtension); // * extension contains MySlice

      // Contradictory rules - log an error but set both
      const extensionCardRule = new CardRule('extension[mySlice].extension');
      extensionCardRule.min = 1;
      extensionCardRule.max = '*';
      extension.rules.push(extensionCardRule); // * extension[mySlice].extension 1..*
      const valueCardRule = new CardRule('extension[mySlice].value[x]')
        .withFile('InvalidInlineExtension.fsh')
        .withLocation([5, 7, 5, 15]);
      valueCardRule.min = 1;
      valueCardRule.max = '1';
      extension.rules.push(valueCardRule); // * extension[mySlice].value[x] 1..1

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const valueElement = sd.findElement('Extension.value[x]');
      const mySliceExtensionElement = sd.findElement('Extension.extension:mySlice.extension');
      const mySliceValueElement = sd.findElement('Extension.extension:mySlice.value[x]');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('0');
      expect(mySliceExtensionElement.min).toEqual(1);
      expect(mySliceExtensionElement.max).toEqual('*');
      expect(mySliceValueElement.min).toEqual(1);
      expect(mySliceValueElement.max).toEqual('1');
      expect(loggerSpy.getLastMessage()).toMatch(
        /Extension on MyInvalidExtension cannot have both a value and sub-extensions/s
      );
      expect(loggerSpy.getLastMessage()).toMatch(/File: InvalidInlineExtension\.fsh.*Line: 5\D*/s);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    });

    it('should zero out value[x] if extension is used on an extension defined inline on a profile', () => {
      // Other combinations of inferred CardRules on profiles are covered by the extensions tests
      const patientProfile = new Profile('MyPatient');
      patientProfile.parent = 'Patient';

      const containsRule = new ContainsRule('maritalStatus.extension');
      containsRule.items = [{ name: 'maritalSlice', type: 'MaritalExtension' }];
      const sliceCardRule = new CardRule('maritalStatus.extension[maritalSlice].extension');
      sliceCardRule.min = 1;
      sliceCardRule.max = '2';
      patientProfile.rules.push(containsRule, sliceCardRule);

      const extension = new Extension('MaritalExtension');
      doc.extensions.set(extension.name, extension);

      exporter.exportStructDef(patientProfile);
      const sd = pkg.profiles[0];
      const valueElement = sd.findElement('Patient.maritalStatus.extension:maritalSlice.value[x]');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('0');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should correctly allow both extension and value[x] on profiles', () => {
      const profile = new Profile('ExtendedObservation');
      profile.parent = 'Observation';

      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'EvidenceType', type: 'EvidenceExtension' }];
      const onlyRule = new OnlyRule('value[x]');
      onlyRule.types = [{ type: 'string' }];
      profile.rules.push(containsRule, onlyRule);

      const extension = new Extension('EvidenceExtension');
      doc.extensions.set(extension.name, extension);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const valueElement = sd.findElement('Observation.value[x]');
      const extensionElement = sd.findElement('Observation.extension');

      expect(valueElement.min).toEqual(0);
      expect(valueElement.max).toEqual('1');
      expect(extensionElement.min).toEqual(0);
      expect(extensionElement.max).toEqual('*');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should not add value[x] onto non-extension elements', () => {
      const profile = new Profile('ExtendedPatient');
      profile.parent = 'Patient';

      const containsRule = new ContainsRule('extension');
      containsRule.items = [{ name: 'PatientNote', type: 'NoteExtension' }];
      const cardRule = new CardRule('extension[PatientNote].extension');
      cardRule.min = 1;
      cardRule.max = '1';
      profile.rules.push(containsRule, cardRule);

      const noteExtension = new Extension('NoteExtension');
      doc.extensions.set(noteExtension.name, noteExtension);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const extensionElement = sd.findElement('Patient.extension');
      const sliceExtensionElement = sd.findElement('Patient.extension:PatientNote.extension');
      const sliceValueElement = sd.findElement('Patient.extension:PatientNote.value[x]');

      expect(extensionElement.min).toEqual(0);
      expect(extensionElement.max).toEqual('*');
      expect(sliceExtensionElement.min).toEqual(1);
      expect(sliceExtensionElement.max).toEqual('1');
      expect(sliceValueElement.min).toEqual(0);
      expect(sliceValueElement.max).toEqual('0');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should set value[x] on nested elements of a profile without zeroing extension', () => {
      const profile = new Profile('MyObservation');
      profile.parent = 'Observation';

      const onlyRule = new OnlyRule('component.value[x]');
      onlyRule.types = [{ type: 'string' }];
      const cardRule = new CardRule('component.extension');
      cardRule.min = 1;
      cardRule.max = '1';
      profile.rules.push(onlyRule, cardRule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];

      const componentValueElement = sd.findElement('Observation.component.value[x]');
      const componentExtensionElement = sd.findElement('Observation.component.extension');

      expect(componentValueElement.type[0]).toEqual(new ElementDefinitionType('string'));
      expect(componentExtensionElement.min).toEqual(1);
      expect(componentExtensionElement.max).toEqual('1');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should not set inferred 0..0 CardRules if they were set on the FSH definition', () => {
      const extension = new Extension('MyNoInferenceExtension');
      extension.id = 'my-extension';

      const containsRuleForExtension = new ContainsRule('extension');
      containsRuleForExtension.items = [{ name: 'sliceA' }, { name: 'sliceB' }];
      extension.rules.push(containsRuleForExtension); // * extension contains sliceA, sliceB

      // Manually zero out value[x]/extension where appropriate
      const sliceAExtensionCardRule = new CardRule('extension[sliceA].extension');
      sliceAExtensionCardRule.min = 1;
      sliceAExtensionCardRule.max = '*'; // * extension[sliceA].extension 1..*
      const sliceAValueCardRule = new CardRule('extension[sliceA].value[x]');
      sliceAValueCardRule.min = 0;
      sliceAValueCardRule.max = '0'; // * extension[sliceA].value[x] 0..0

      const sliceBExtensionCardRule = new CardRule('extension[sliceB].value[x]');
      sliceBExtensionCardRule.min = 1;
      sliceBExtensionCardRule.max = '1'; // * extension[sliceB].extension 1..1
      const sliceBValueCardRule = new CardRule('extension[sliceB].extension');
      sliceBValueCardRule.min = 0;
      sliceBValueCardRule.max = '0'; // * extension[sliceB].extension 0..0

      extension.rules.push(
        sliceAExtensionCardRule,
        sliceAValueCardRule,
        sliceBExtensionCardRule,
        sliceBValueCardRule
      );

      exporter.exportStructDef(extension);
      expect(extension.rules).toHaveLength(6);
      assertContainsRule(extension.rules[0], 'extension', 'sliceA', 'sliceB');
      assertCardRule(extension.rules[1], 'extension[sliceA].extension', 1, '*');
      assertCardRule(extension.rules[2], 'extension[sliceA].value[x]', 0, '0');
      assertCardRule(extension.rules[3], 'extension[sliceB].value[x]', 1, '1');
      assertCardRule(extension.rules[4], 'extension[sliceB].extension', 0, '0');
      assertCardRule(extension.rules[5], 'value[x]', 0, '0'); // The only rule inferred
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });
  });

  describe('#RulesWithSlices', () => {
    // rules applied to slices, sliced elements, and their children
    let observationWithSlice: Profile;
    beforeEach(() => {
      // Profile: ObservationWithSlice
      // Parent: Observation
      // * category ^slicing.discriminator[0].type = #pattern
      // * category ^slicing.discriminator[0].path = "$this"
      // * category ^slicing.rules = #open
      // * category contains Procedure 0..1
      // * component ^slicing.discriminator[0].type = #pattern
      // * component ^slicing.discriminator[0].path = "$this"
      // * component ^slicing.rules = #open
      // * component contains Lab 0..1
      observationWithSlice = new Profile('ObservationWithSlice');
      observationWithSlice.parent = 'Observation';
      const categorySlicingType = new CaretValueRule('category');
      categorySlicingType.caretPath = 'slicing.discriminator[0].type';
      categorySlicingType.value = new FshCode('pattern');
      const categorySlicingPath = new CaretValueRule('category');
      categorySlicingPath.caretPath = 'slicing.discriminator[0].path';
      categorySlicingPath.value = '$this';
      const categorySlicingRules = new CaretValueRule('category');
      categorySlicingRules.caretPath = 'slicing.rules';
      categorySlicingRules.value = new FshCode('open');
      const categoryContainsProcedure = new ContainsRule('category');
      categoryContainsProcedure.items = [{ name: 'Procedure' }];
      const procedureCard = new CardRule('category[Procedure]');
      procedureCard.min = 0;
      procedureCard.max = '1';
      const componentSlicingType = new CaretValueRule('component');
      componentSlicingType.caretPath = 'slicing.discriminator[0].type';
      componentSlicingType.value = new FshCode('pattern');
      const componentSlicingPath = new CaretValueRule('component');
      componentSlicingPath.caretPath = 'slicing.discriminator[0].path';
      componentSlicingPath.value = '$this';
      const componentSlicingRules = new CaretValueRule('component');
      componentSlicingRules.caretPath = 'slicing.rules';
      componentSlicingRules.value = new FshCode('open');
      const componentContainsLab = new ContainsRule('component');
      componentContainsLab.items = [{ name: 'Lab' }];
      const labCard = new CardRule('component[Lab]');
      labCard.min = 0;
      labCard.max = '1';
      observationWithSlice.rules.push(
        categorySlicingType,
        categorySlicingPath,
        categorySlicingRules,
        categoryContainsProcedure,
        procedureCard,
        componentSlicingType,
        componentSlicingPath,
        componentSlicingRules,
        componentContainsLab,
        labCard
      );
    });

    it('should apply a CardRule that makes the cardinality of the child of a slice narrower', () => {
      loggerSpy.reset();
      // * component[Lab].interpretation 2..2
      // * component.interpretation 0..5
      const rootCard = new CardRule('component.interpretation');
      rootCard.min = 0;
      rootCard.max = '5';
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 2;
      labCard.max = '2';

      observationWithSlice.rules.push(labCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      expect(rootInterpretation.min).toBe(0);
      expect(rootInterpretation.max).toBe('5');
      expect(labInterpretation.min).toBe(2);
      expect(labInterpretation.max).toBe('2');
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should apply a CardRule that would make the cardinality of a slice smaller than the root', () => {
      loggerSpy.reset();
      // component[Lab] has card 0..1
      // * component 1..5

      const rootCard = new CardRule('component')
        .withFile('Narrower.fsh')
        .withLocation([7, 9, 7, 23]);
      rootCard.min = 1;
      rootCard.max = '5';

      observationWithSlice.rules.push(rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      expect(sd.findElement('Observation.component').max).toBe('5');
      expect(sd.findElement('Observation.component').min).toBe(1);
      expect(sd.findElement('Observation.component:Lab').min).toBe(0);
      expect(sd.findElement('Observation.component:Lab').max).toBe('1');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a CardRule that would increase the minimum cardinality of a child of a slice', () => {
      // * component[Lab].interpretation 1..5
      // * component.interpretation 2..6
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 1;
      labCard.max = '5';
      const rootCard = new CardRule('component.interpretation');
      rootCard.min = 2;
      rootCard.max = '6';

      observationWithSlice.rules.push(labCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      expect(rootInterpretation.min).toBe(2);
      expect(rootInterpretation.max).toBe('6');
      expect(labInterpretation.min).toBe(2);
      expect(labInterpretation.max).toBe('5');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a CardRule that would decrease the maximum cardinality of a child of a slice', () => {
      // * component[Lab].interpretation 1..5
      // * component.interpretation 0..3
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 1;
      labCard.max = '5';
      const rootCard = new CardRule('component.interpretation');
      rootCard.min = 0;
      rootCard.max = '3';

      observationWithSlice.rules.push(labCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      expect(rootInterpretation.min).toBe(0);
      expect(rootInterpretation.max).toBe('3');
      expect(labInterpretation.min).toBe(1);
      expect(labInterpretation.max).toBe('3');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply a CardRule that would increase the minimum cardinality and decrease the maximum cardinality of a child of a slice', () => {
      // * component[Lab].interpretation 1..5
      // * component.interpretation 2..2
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 1;
      labCard.max = '5';
      const rootCard = new CardRule('component.interpretation');
      rootCard.min = 2;
      rootCard.max = '2';

      observationWithSlice.rules.push(labCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      expect(rootInterpretation.min).toBe(2);
      expect(rootInterpretation.max).toBe('2');
      expect(labInterpretation.min).toBe(2);
      expect(labInterpretation.max).toBe('2');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not apply a CardRule that is incompatible with the existing cardinality of a child of a slice', () => {
      // * component[Lab].interpretation 1..5
      // * component.interpretation 6..10
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 1;
      labCard.max = '5';
      const rootCard = new CardRule('component.interpretation')
        .withFile('Incompatible.fsh')
        .withLocation([8, 3, 8, 25]);
      rootCard.min = 6;
      rootCard.max = '10';

      observationWithSlice.rules.push(labCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      expect(rootInterpretation.min).toBe(0);
      expect(rootInterpretation.max).toBe('*');
      expect(labInterpretation.min).toBe(1);
      expect(labInterpretation.max).toBe('5');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'Cardinality on Observation.component.interpretation cannot be narrowed'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Incompatible\.fsh.*Line: 8\D*/s);
    });

    it('should not apply a CardRule that is incompatible with the existing cardinality on some of the children of slices', () => {
      // * component contains Field 0..1
      // * component[Lab].interpretation 1..5
      // * component[Field].interpretation 0..2
      // * component.interpretation 6..10
      const containsField = new ContainsRule('component');
      containsField.items = [{ name: 'Field' }];
      const containsCard = new CardRule('component[Field]');
      containsCard.min = 0;
      containsCard.max = '1';
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 1;
      labCard.max = '5';
      const fieldCard = new CardRule('component[Field].interpretation');
      fieldCard.min = 0;
      fieldCard.max = '2';
      const rootCard = new CardRule('component.interpretation')
        .withFile('Incompatible.fsh')
        .withLocation([9, 3, 9, 23]);
      rootCard.min = 6;
      rootCard.max = '10';

      observationWithSlice.rules.push(containsField, containsCard, labCard, fieldCard, rootCard);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      const fieldInterpretation = sd.findElement('Observation.component:Field.interpretation');
      expect(rootInterpretation.min).toBe(0);
      expect(rootInterpretation.max).toBe('*');
      expect(labInterpretation.min).toBe(1);
      expect(labInterpretation.max).toBe('5');
      expect(fieldInterpretation.min).toBe(0);
      expect(fieldInterpretation.max).toBe('2');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'Cardinality on Observation.component.interpretation cannot be narrowed'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Incompatible\.fsh.*Line: 9\D*/s);
    });

    it('should apply a FlagRule on a sliced element that updates the flags on its slices', () => {
      // * component MS ?!
      // modifier should be applied to the slices, but must support is not applied to slices.
      // see https://confluence.hl7.org/display/FHIR/Guide+to+Designing+Resources
      const rootFlag = new FlagRule('component');
      rootFlag.mustSupport = true;
      rootFlag.modifier = true;

      observationWithSlice.rules.push(rootFlag);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootComponent = sd.findElement('Observation.component');
      const labComponent = sd.findElement('Observation.component:Lab');
      expect(rootComponent.mustSupport).toBe(true);
      expect(labComponent.mustSupport).toBeFalsy();
      expect(rootComponent.isModifier).toBe(true);
      expect(labComponent.isModifier).toBe(true);
    });

    it('should apply a FlagRule on the child of a sliced element that updates the flags on the child of a slice', () => {
      // * component[Lab].interpretation 0..1 // this forces the creation of the unfolded slice
      // * component.interpretation MS
      // must support is applied to children of slices, in contrast to previous test case
      // again, see https://confluence.hl7.org/display/FHIR/Guide+to+Designing+Resources
      const labCard = new CardRule('component[Lab].interpretation');
      labCard.min = 0;
      labCard.max = '1';
      const rootFlag = new FlagRule('component.interpretation');
      rootFlag.mustSupport = true;

      observationWithSlice.rules.push(labCard, rootFlag);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootInterpretation = sd.findElement('Observation.component.interpretation');
      const labInterpretation = sd.findElement('Observation.component:Lab.interpretation');
      expect(rootInterpretation.mustSupport).toBe(true);
      expect(labInterpretation.mustSupport).toBe(true);
    });

    it('should apply BindingRules on a slice, then a sliced element, with different value sets', () => {
      // * category[Procedure] from http://hl7.org/fhir/us/minimal/MediocreObservationCodes (extensible)
      // * category from http://hl7.org/fhir/us/minimal/ImportantObservationCodes (required)
      const procedureValueSet = new BindingRule('category[Procedure]');
      procedureValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes';
      procedureValueSet.strength = 'extensible';
      const rootValueSet = new BindingRule('category');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes';
      rootValueSet.strength = 'required';

      observationWithSlice.rules.push(procedureValueSet, rootValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const procedureCategory = sd.findElement('Observation.category:Procedure');
      const importantBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes',
        strength: 'required'
      };
      const mediocreBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes',
        strength: 'extensible'
      };
      expect(rootCategory.binding).toEqual(importantBinding);
      expect(procedureCategory.binding).toEqual(mediocreBinding);
    });

    it('should apply BindingRules on a sliced element, then a slice, with different value sets', () => {
      // * category from http://hl7.org/fhir/us/minimal/ImportantObservationCodes (required)
      // * category[Procedure] from http://hl7.org/fhir/us/minimal/MediocreObservationCodes (extensible)
      const rootValueSet = new BindingRule('category');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes';
      rootValueSet.strength = 'required';
      const procedureValueSet = new BindingRule('category[Procedure]');
      procedureValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes';
      procedureValueSet.strength = 'extensible';

      observationWithSlice.rules.push(rootValueSet, procedureValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const procedureCategory = sd.findElement('Observation.category:Procedure');
      const importantBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes',
        strength: 'required'
      };
      const mediocreBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes',
        strength: 'extensible'
      };
      expect(rootCategory.binding).toEqual(importantBinding);
      expect(procedureCategory.binding).toEqual(mediocreBinding);
    });

    it('should apply BindingRules on a slice, then the sliced element, with the same value set', () => {
      // * category[Procedure] from http://hl7.org/fhir/us/minimal/RegularObservationCodes (extensible)
      // * category from http://hl7.org/fhir/us/minimal/RegularObservationCodes (required)
      const procedureValueSet = new BindingRule('category[Procedure]');
      procedureValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      procedureValueSet.strength = 'extensible';
      const rootValueSet = new BindingRule('category');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      rootValueSet.strength = 'required';

      observationWithSlice.rules.push(procedureValueSet, rootValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const procedureCategory = sd.findElement('Observation.category:Procedure');
      const regularBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/RegularObservationCodes',
        strength: 'required'
      };
      expect(rootCategory.binding).toEqual(regularBinding);
      expect(procedureCategory.binding).toEqual(regularBinding);
    });

    it('should not apply a BindingRule on a sliced element that would bind it to the same value set as the root, but more weakly', () => {
      // * category from http://hl7.org/fhir/us/minimal/RegularObservationCodes (required)
      // * category[Procedure] from http://hl7.org/fhir/us/minimal/RegularObservationCodes (extensible)
      const rootValueSet = new BindingRule('category');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      rootValueSet.strength = 'required';
      const procedureValueSet = new BindingRule('category[Procedure]')
        .withFile('Weaker.fsh')
        .withLocation([4, 8, 4, 23]);
      procedureValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      procedureValueSet.strength = 'extensible';

      observationWithSlice.rules.push(rootValueSet, procedureValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const regularBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/RegularObservationCodes',
        strength: 'required'
      };
      expect(rootCategory.binding).toEqual(regularBinding);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot override required binding with extensible/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Weaker\.fsh.*Line: 4\D*/s);
    });

    it('should apply BindingRules on the child of a slice, then the child of a sliced element, with different value sets', () => {
      // * component[Lab].code from http://hl7.org/fhir/us/minimal/MediocreObservationCodes (extensible)
      // * component.code from http://hl7.org/fhir/us/minimal/ImportantObservationCodes (required)
      const labValueSet = new BindingRule('component[Lab].code');
      labValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes';
      labValueSet.strength = 'extensible';
      const rootValueSet = new BindingRule('component.code');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes';
      rootValueSet.strength = 'required';

      observationWithSlice.rules.push(labValueSet, rootValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      const labCode = sd.findElement('Observation.component:Lab.code');
      const importantBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes',
        strength: 'required'
      };
      const mediocreBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes',
        strength: 'extensible'
      };
      expect(rootCode.binding).toEqual(importantBinding);
      expect(labCode.binding).toEqual(mediocreBinding);
    });

    it('should apply BindingRules on the child of a sliced element, then the child of a slice, with different value sets', () => {
      // * component[Lab].code MS // force creation of element
      // * component.code from http://hl7.org/fhir/us/minimal/ImportantObservationCodes (required)
      // * component[Lab].code from http://hl7.org/fhir/us/minimal/MediocreObservationCodes (extensible)
      const flagRule = new FlagRule('component[Lab].code');
      flagRule.mustSupport = true;
      const rootValueSet = new BindingRule('component.code');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes';
      rootValueSet.strength = 'required';
      const labValueSet = new BindingRule('component[Lab].code');
      labValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes';
      labValueSet.strength = 'extensible';

      observationWithSlice.rules.push(flagRule, rootValueSet, labValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      const labCode = sd.findElement('Observation.component:Lab.code');
      const importantBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/ImportantObservationCodes',
        strength: 'required'
      };
      const mediocreBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/MediocreObservationCodes',
        strength: 'extensible'
      };
      expect(rootCode.binding).toEqual(importantBinding);
      expect(labCode.binding).toEqual(mediocreBinding);
    });

    it('should apply BindingRules on the child of a slice, then the child of the sliced element, with the same value set', () => {
      // * component[Lab].code from http://hl7.org/fhir/us/minimal/RegularObservationCodes (extensible)
      // * component.code from http://hl7.org/fhir/us/minimal/RegularObservationCodes (required)
      const labValueSet = new BindingRule('component[Lab].code');
      labValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      labValueSet.strength = 'extensible';
      const rootValueSet = new BindingRule('component.code');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      rootValueSet.strength = 'required';

      observationWithSlice.rules.push(labValueSet, rootValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      const labCode = sd.findElement('Observation.component:Lab.code');
      const regularBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/RegularObservationCodes',
        strength: 'required'
      };
      expect(rootCode.binding).toEqual(regularBinding);
      expect(labCode.binding).toEqual(regularBinding);
    });

    it('should not apply a BindingRule on the child of a sliced element that would bind it to the same value set as the child of the root, but more weakly', () => {
      // * component.code from http://hl7.org/fhir/us/minimal/RegularObservationCodes (required)
      // * component[Lab].code from http://hl7.org/fhir/us/minimal/RegularObservationCodes (extensible)
      const rootValueSet = new BindingRule('component.code');
      rootValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      rootValueSet.strength = 'required';
      const labValueSet = new BindingRule('component[Lab].code')
        .withFile('Weaker.fsh')
        .withLocation([9, 15, 9, 33]);
      labValueSet.valueSet = 'http://hl7.org/fhir/us/minimal/RegularObservationCodes';
      labValueSet.strength = 'extensible';

      observationWithSlice.rules.push(rootValueSet, labValueSet);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      // const labCode = sd.findElement('Observation.component:Lab.code');
      const regularBinding = {
        valueSet: 'http://hl7.org/fhir/us/minimal/RegularObservationCodes',
        strength: 'required'
      };
      expect(rootCode.binding).toEqual(regularBinding);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot override required binding with extensible/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Weaker\.fsh.*Line: 9\D*/s);
    });

    it.todo(
      'should apply a AssignmentRule on a sliced element that updates the assigned value on its slices'
    );
    it.todo(
      'should not apply a AssignmentRule on a sliced element that would invalidate the assigned value on a slice'
    );
    it.todo(
      'should apply a ContainsRule on the child of a sliced element that updates the slices on the child of a slice'
    );
    it.todo(
      'should not apply a ContainsRule on the child of a sliced element that would invalidate slices within a defined slice'
    );

    it('should apply an OnlyRule on a sliced element that updates the types on its slices', () => {
      loggerSpy.reset();
      // * component[Lab].value[x] MS // this forces the creation of the unfolded slice
      // * component.value[x] only Quantity or Ratio
      const labFlag = new FlagRule('component[Lab].value[x]');
      labFlag.mustSupport = true;
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'Quantity' }, { type: 'string' }];

      observationWithSlice.rules.push(labFlag, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeQuantity = new ElementDefinitionType('Quantity');
      const expectedTypeString = new ElementDefinitionType('string');
      expect(rootValue.type).toHaveLength(2);
      expect(rootValue.type).toContainEqual(expectedTypeQuantity);
      expect(rootValue.type).toContainEqual(expectedTypeString);
      expect(labValue.type).toHaveLength(2);
      expect(labValue.type).toContainEqual(expectedTypeQuantity);
      expect(labValue.type).toContainEqual(expectedTypeString);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an OnlyRule on a sliced element that includes more types than are allowed on its slices', () => {
      loggerSpy.reset();
      // * component[Lab].value[x] only Quantity
      // * component.value[x] only Quantity or Ratio
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }];
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'Quantity' }, { type: 'Ratio' }];

      observationWithSlice.rules.push(labOnly, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeQuantity = new ElementDefinitionType('Quantity');
      const expectedTypeRatio = new ElementDefinitionType('Ratio');
      expect(rootValue.type).toHaveLength(2);
      expect(rootValue.type).toContainEqual(expectedTypeQuantity);
      expect(rootValue.type).toContainEqual(expectedTypeRatio);
      expect(labValue.type).toHaveLength(1);
      expect(labValue.type).toContainEqual(expectedTypeQuantity);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an OnlyRule on a sliced element that removes types available on a slice', () => {
      loggerSpy.reset();
      // * component[Lab].value[x] only Quantity or Ratio
      // * component.value[x] only Quantity
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }, { type: 'Ratio' }];
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'Quantity' }];

      observationWithSlice.rules.push(labOnly, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeQuantity = new ElementDefinitionType('Quantity');
      expect(rootValue.type).toHaveLength(1);
      expect(rootValue.type).toContainEqual(expectedTypeQuantity);
      expect(labValue.type).toHaveLength(1);
      expect(labValue.type).toContainEqual(expectedTypeQuantity);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an OnlyRule using a profile on a sliced element that matches the types available on its slices', () => {
      // Profile: MyQuestionnaire
      // Parent: http://hl7.org/fhir/StructureDefinition/cqf-questionnaire
      // * extension only http://hl7.org/fhir/StructureDefinition/cqf-library
      const profile = new Profile('MyQuestionnaire');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/cqf-questionnaire';
      const onlyRule = new OnlyRule('extension');
      onlyRule.types.push({
        type: 'http://hl7.org/fhir/StructureDefinition/cqf-library'
      });
      profile.rules.push(onlyRule);
      doc.profiles.set(profile.name, profile);
      exporter.export();
      const sd = pkg.profiles[0];
      const baseExtension = sd.findElement('Questionnaire.extension');
      const extensionSlice = sd.findElement('Questionnaire.extension:library');
      const expectedType = new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/cqf-library'
      );
      expect(baseExtension.type).toHaveLength(1);
      expect(baseExtension.type).toContainEqual(expectedType);
      expect(extensionSlice.type).toHaveLength(1);
      expect(extensionSlice.type).toContainEqual(expectedType);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should apply an OnlyRule using multiple profiles on a sliced element where at least one of the profiles matches the types available on its slices', () => {
      // Profile: MyQuestionnaire
      // Parent: http://hl7.org/fhir/StructureDefinition/cqf-questionnaire
      // * extension only http://hl7.org/fhir/StructureDefinition/cqf-library or
      //   http://hl7.org/fhir/StructureDefinition/familymemberhistory-type
      const profile = new Profile('MyQuestionnaire');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/cqf-questionnaire';
      const onlyRule = new OnlyRule('extension');
      onlyRule.types.push(
        {
          type: 'http://hl7.org/fhir/StructureDefinition/cqf-library'
        },
        {
          type: 'http://hl7.org/fhir/StructureDefinition/familymemberhistory-type'
        }
      );
      profile.rules.push(onlyRule);
      doc.profiles.set(profile.name, profile);
      exporter.export();
      const sd = pkg.profiles[0];
      const baseExtension = sd.findElement('Questionnaire.extension');
      const extensionSlice = sd.findElement('Questionnaire.extension:library');
      const expectedBaseType = new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/cqf-library',
        'http://hl7.org/fhir/StructureDefinition/familymemberhistory-type'
      );
      const expectedSliceType = new ElementDefinitionType('Extension').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/cqf-library'
      );
      expect(baseExtension.type).toHaveLength(1);
      expect(baseExtension.type).toContainEqual(expectedBaseType);
      expect(extensionSlice.type).toHaveLength(1);
      expect(extensionSlice.type).toContainEqual(expectedSliceType);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not apply an OnlyRule on a sliced element that would invalidate any of its slices', () => {
      // * component[Lab].value[x] only Quantity
      // * component.value[x] only Ratio // this would remove all types from the slice!
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }];
      const rootOnly = new OnlyRule('component.value[x]')
        .withFile('RemoveType.fsh')
        .withLocation([12, 5, 12, 23]);
      rootOnly.types = [{ type: 'Ratio' }];

      observationWithSlice.rules.push(labOnly, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeQuantity = new ElementDefinitionType('Quantity');
      expect(rootValue.type).toHaveLength(11);
      expect(labValue.type).toHaveLength(1);
      expect(labValue.type).toContainEqual(expectedTypeQuantity);
      expect(loggerSpy.getLastMessage('error')).toMatch(/eliminate all types/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: RemoveType\.fsh.*Line: 12\D*/s);
    });

    it('should apply an OnlyRule on a sliced element that would remove all types from a zeroed-out slice', () => {
      // * component[Lab].value[x] only Quantity
      // * component[Lab] 0..0
      // * component.value[x] only Ratio
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }];
      const labCard = new CardRule('component[Lab]');
      labCard.min = 0;
      labCard.max = '0';
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'Ratio' }];

      observationWithSlice.rules.push(labOnly, labCard, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const expectedTypeRatio = new ElementDefinitionType('Ratio');
      expect(rootValue.type).toHaveLength(1);
      expect(rootValue.type).toContainEqual(expectedTypeRatio);
    });

    it('should apply an OnlyRule on a sliced element that constrains the types on its slices to subtypes', () => {
      loggerSpy.reset();
      // * component[Lab].value[x] only Quantity
      // * component.value[x] only SimpleQuantity or Ratio
      const labOnly = new OnlyRule('component[Lab].value[x]');
      labOnly.types = [{ type: 'Quantity' }];
      const rootOnly = new OnlyRule('component.value[x]');
      rootOnly.types = [{ type: 'SimpleQuantity' }, { type: 'Ratio' }];

      observationWithSlice.rules.push(labOnly, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      const expectedTypeRatio = new ElementDefinitionType('Ratio');
      const expectedTypeSimpleQuantity = new ElementDefinitionType('Quantity').withProfiles(
        'http://hl7.org/fhir/StructureDefinition/SimpleQuantity'
      );
      expect(rootValue.type).toHaveLength(2);
      expect(rootValue.type).toContainEqual(expectedTypeRatio);
      expect(rootValue.type).toContainEqual(expectedTypeSimpleQuantity);
      expect(labValue.type).toHaveLength(1);
      expect(labValue.type).toContainEqual(expectedTypeSimpleQuantity);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when a type constraint implicitly removes a choice on a sliced element', () => {
      // * component[Lab].valueString = "Please leave"
      // * component.value[x] only Quantity
      const labAssignedValue = new AssignmentRule('component[Lab].valueString');
      labAssignedValue.value = 'Please leave';
      const rootOnly = new OnlyRule('component.value[x]')
        .withFile('RemoveString.fsh')
        .withLocation([8, 4, 8, 23]);
      rootOnly.types = [{ type: 'Quantity' }];

      observationWithSlice.rules.push(labAssignedValue, rootOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootValue = sd.findElement('Observation.component.value[x]');
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      expect(rootValue.type).toHaveLength(1);
      expect(labValue.type).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/obsolete for choices.*valueString/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: RemoveString\.fsh.*Line: 8\D*/s);
    });

    it('should log an error when a type constraint on the child of a slice implicitly removes a choice', () => {
      // * component[Lab].valueString = "Please leave"
      // * component[Lab].value[x] only Quantity
      const labAssignedValue = new AssignmentRule('component[Lab].valueString');
      labAssignedValue.value = 'Please leave';
      const labOnly = new OnlyRule('component[Lab].value[x]')
        .withFile('RemoveString.fsh')
        .withLocation([9, 4, 9, 23]);
      labOnly.types = [{ type: 'Quantity' }];

      observationWithSlice.rules.push(labAssignedValue, labOnly);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      exporter.export();
      const sd = pkg.profiles[0];
      const labValue = sd.findElement('Observation.component:Lab.value[x]');
      expect(labValue.type).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/obsolete for choices.*valueString/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: RemoveString\.fsh.*Line: 9\D*/s);
    });

    it.todo(
      'should apply an OnlyRule on the child of a sliced element that updates the types on the children of its slices'
    );
    it.todo(
      'should not apply an OnlyRule on the child of a sliced element that would invalidate any of its slices'
    );

    it('should apply an ObeysRule on a sliced element and not update the constraints on its slices', () => {
      // NOTE: This is a change in behavior introduced in SUSHI 3.0

      // * category[Procedure] obeys ShoutingRule
      // * category obeys TalkingRule
      // Invariant: ShoutingRule
      // Description: "No shouting allowed."
      // Invariant: TalkingRule
      // Description: "Talking is prohibited."
      const shoutingRule = new ObeysRule('category[Procedure]');
      shoutingRule.invariant = 'shout-1';
      const talkingRule = new ObeysRule('category');
      talkingRule.invariant = 'talk-1';

      const shoutingInvariant = new Invariant('shout-1');
      shoutingInvariant.description = 'No shouting allowed.';
      const talkingInvariant = new Invariant('talk-1');
      talkingInvariant.description = 'Talking is prohibited.';

      observationWithSlice.rules.push(shoutingRule, talkingRule);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      doc.invariants.set(shoutingInvariant.name, shoutingInvariant);
      doc.invariants.set(talkingInvariant.name, talkingInvariant);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCategory = sd.findElement('Observation.category');
      const procedureCategory = sd.findElement('Observation.category:Procedure');
      const expectedShouting = {
        key: 'shout-1',
        human: 'No shouting allowed.',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationWithSlice'
      };
      const expectedTalking = {
        key: 'talk-1',
        human: 'Talking is prohibited.',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationWithSlice'
      };
      expect(rootCategory.constraint).toContainEqual(expectedTalking);
      expect(procedureCategory.constraint).toContainEqual(expectedShouting);
      expect(procedureCategory.constraint).not.toContainEqual(expectedTalking);
    });

    it('should apply an ObeysRule on the child of a sliced element and not update the child elements on its slices', () => {
      // NOTE: This is a change in behavior introduced in SUSHI 3.0

      // * component[Lab].code obeys RunningRule
      // * component.code obeys WalkingRule
      // Invariant: RunningRule
      // Description: "Run as fast as you can!"
      // Invariant: WalkingRule
      // Description: "Walk at your own pace."
      const runningRule = new ObeysRule('component[Lab].code');
      runningRule.invariant = 'run-1';
      const walkingRule = new ObeysRule('component.code');
      walkingRule.invariant = 'walk-1';

      const runningInvariant = new Invariant('run-1');
      runningInvariant.description = 'Run as fast as you can!';
      const walkingInvariant = new Invariant('walk-1');
      walkingInvariant.description = 'Walk at your own pace.';

      observationWithSlice.rules.push(runningRule, walkingRule);
      doc.profiles.set(observationWithSlice.name, observationWithSlice);
      doc.invariants.set(runningInvariant.name, runningInvariant);
      doc.invariants.set(walkingInvariant.name, walkingInvariant);
      exporter.export();
      const sd = pkg.profiles[0];
      const rootCode = sd.findElement('Observation.component.code');
      const labCode = sd.findElement('Observation.component:Lab.code');
      const expectedRunning = {
        key: 'run-1',
        human: 'Run as fast as you can!',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationWithSlice'
      };
      const expectedWalking = {
        key: 'walk-1',
        human: 'Walk at your own pace.',
        source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/ObservationWithSlice'
      };
      expect(rootCode.constraint).toContainEqual(expectedWalking);
      expect(labCode.constraint).toContainEqual(expectedRunning);
      expect(labCode.constraint).not.toContainEqual(expectedWalking);
    });

    it.todo('should have some tests involving slices and CaretValueRule');
  });

  describe('#toJSON', () => {
    it('should correctly generate a diff containing only changed elements', () => {
      // We already have separate tests for the differentials, so this just ensures that the
      // StructureDefinition is setup correctly to produce accurate differential elements.
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      const rule = new CardRule('subject');
      rule.min = 1;
      rule.max = '1';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const json = sd.toJSON();

      expect(json.differential.element).toHaveLength(1);
      expect(json.differential.element).toEqual([
        { id: 'Observation.subject', path: 'Observation.subject', min: 1 }
      ]);
    });

    it('should correctly generate a diff containing only changed elements when elements are unfolded', () => {
      // We already have separate tests for the differentials, so this just ensures that the
      // StructureDefinition captures originals at the right time to produce the most correct
      // differentials
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      // Create a few rules that will force complex types to be "unfolded"
      let rule = new CardRule('code.coding');
      rule.min = 1;
      rule.max = '*';
      profile.rules.push(rule);

      rule = new CardRule('code.coding.userSelected');
      rule.min = 1;
      rule.max = '1';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const json = sd.toJSON();

      expect(json.differential.element).toHaveLength(2);
      expect(json.differential.element).toEqual([
        {
          id: 'Observation.code.coding',
          path: 'Observation.code.coding',
          min: 1
        },
        {
          id: 'Observation.code.coding.userSelected',
          path: 'Observation.code.coding.userSelected',
          min: 1
        }
      ]);
    });

    it('should correctly generate a diff containing only changed elements when elements are sliced', () => {
      // We already have separate tests for the differentials, so this just ensures that the
      // StructureDefinition captures originals at the right time to produce the most correct
      // differentials
      const profile = new Profile('Foo');
      profile.parent = 'Observation';

      // Create some rules to slice component
      // * component ^slicing.discriminator[0].type = #pattern
      // * component ^slicing.discriminator[0].path = "code"
      // * component ^slicing.rules = #open
      // * component ^comment = "BP comment"
      // * component contains SystolicBP 0..1 and DiastolicBP 0..1
      // * component[SystolicBP].code = LOINC#8480-6
      // * component[SystolicBP].value[x] only Quantity
      // * component[DiastolicBP].code = LOINC#8462-4
      // * component[DiastolicBP].value[x] only Quantity
      const ruleA = new CaretValueRule('component');
      ruleA.caretPath = 'slicing.discriminator[0].type';
      ruleA.value = new FshCode('pattern');
      const ruleB = new CaretValueRule('component');
      ruleB.caretPath = 'slicing.discriminator[0].path';
      ruleB.value = 'code';
      const ruleC = new CaretValueRule('component');
      ruleC.caretPath = 'slicing.rules';
      ruleC.value = new FshCode('open');
      const ruleD = new CaretValueRule('component');
      ruleD.caretPath = 'comment';
      ruleD.value = 'BP comment';
      const rule1 = new ContainsRule('component');
      rule1.items = [{ name: 'SystolicBP' }, { name: 'DiastolicBP' }];
      const rule2 = new CardRule('component[SystolicBP]');
      rule2.max = '1';
      const rule3 = new AssignmentRule('component[SystolicBP].code');
      rule3.value = new FshCode('8480-6', 'http://loinc.org');
      const rule4 = new OnlyRule('component[SystolicBP].value[x]');
      rule4.types = [{ type: 'Quantity' }];
      const rule5 = new CardRule('component[DiastolicBP]');
      rule5.max = '1';
      const rule6 = new AssignmentRule('component[DiastolicBP].code');
      rule6.value = new FshCode('8462-4', 'http://loinc.org');
      const rule7 = new OnlyRule('component[DiastolicBP].value[x]');
      rule7.types = [{ type: 'Quantity' }];
      profile.rules.push(
        ruleA,
        ruleB,
        ruleC,
        ruleD,
        rule1,
        rule2,
        rule3,
        rule4,
        rule5,
        rule6,
        rule7
      );

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const json = sd.toJSON();

      expect(json.differential.element).toHaveLength(7);
      expect(json.differential.element).toEqual([
        {
          id: 'Observation.component',
          path: 'Observation.component',
          slicing: {
            discriminator: [{ type: 'pattern', path: 'code' }],
            rules: 'open'
          },
          comment: 'BP comment'
        },
        {
          id: 'Observation.component:SystolicBP',
          path: 'Observation.component',
          sliceName: 'SystolicBP',
          min: 0,
          max: '1'
        },
        {
          id: 'Observation.component:SystolicBP.code',
          path: 'Observation.component.code',
          patternCodeableConcept: {
            coding: [{ code: '8480-6', system: 'http://loinc.org' }]
          }
        },
        {
          id: 'Observation.component:SystolicBP.value[x]',
          path: 'Observation.component.value[x]',
          type: [{ code: 'Quantity' }]
        },
        {
          id: 'Observation.component:DiastolicBP',
          path: 'Observation.component',
          sliceName: 'DiastolicBP',
          min: 0,
          max: '1'
        },
        {
          id: 'Observation.component:DiastolicBP.code',
          path: 'Observation.component.code',
          patternCodeableConcept: {
            coding: [{ code: '8462-4', system: 'http://loinc.org' }]
          }
        },
        {
          id: 'Observation.component:DiastolicBP.value[x]',
          path: 'Observation.component.value[x]',
          type: [{ code: 'Quantity' }]
        }
      ]);
    });

    it('should include sliceName in a differential when an attribute of the slice is changed', () => {
      const profile = new Profile('MustSlice');
      profile.parent = 'resprate';
      const mustCode = new FlagRule('code.coding[RespRateCode]');
      mustCode.mustSupport = true;
      profile.rules.push(mustCode);
      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const json = sd.toJSON();
      expect(json.differential.element).toHaveLength(1);
      expect(json.differential.element).toEqual([
        {
          id: 'Observation.code.coding:RespRateCode',
          path: 'Observation.code.coding',
          sliceName: 'RespRateCode',
          mustSupport: true
        }
      ]);
    });

    it('should include mustSupport in the differential of a new slice, even if the base element is also mustSupport', () => {
      const profile = new Profile('MustSlice');
      profile.parent = 'resprate';
      const mustCode = new FlagRule('code.coding');
      mustCode.mustSupport = true;
      const codeSlice = new ContainsRule('code.coding');
      codeSlice.items = [{ name: 'OxygenCode' }];
      const mustSlice = new FlagRule('code.coding[OxygenCode]');
      mustSlice.mustSupport = true;
      profile.rules.push(mustCode, codeSlice, mustSlice);
      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const json = sd.toJSON();
      expect(json.differential.element).toContainEqual({
        id: 'Observation.code.coding:OxygenCode',
        path: 'Observation.code.coding',
        sliceName: 'OxygenCode',
        min: 0,
        max: '*',
        mustSupport: true
      });
    });

    it('should include the children of primitive elements when serializing to JSON', () => {
      const profile = new Profile('SpecialUrlId');
      profile.parent = 'Observation';

      const rule = new CaretValueRule('');
      rule.caretPath = 'url.id';
      rule.value = 'my-id';
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const json = sd.toJSON();
      expect(json).toHaveProperty('_url', { id: 'my-id' });
    });

    it.skip('should not change sliceName based on a CaretValueRule', () => {
      const profile = new Profile('NameChange');
      profile.parent = 'resprate';
      const sliceChange = new CaretValueRule('code.coding[RespRateCode]');
      sliceChange.caretPath = 'sliceName';
      sliceChange.value = 'SomeOtherCode';
      profile.rules.push(sliceChange);
      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const json = sd.toJSON();
      expect(json.differential.element).toHaveLength(1);
      expect(json.differential.element[0]).toEqual({
        id: 'Observation.code.coding:RespRateCode',
        path: 'Observation.code.coding',
        sliceName: 'RespRateCode'
      });
    });
  });

  describe('#insertRules', () => {
    let profile: Profile;
    let ruleSet: RuleSet;

    beforeEach(() => {
      profile = new Profile('Foo');
      profile.parent = 'Observation';
      doc.profiles.set(profile.name, profile);

      ruleSet = new RuleSet('Bar');
      doc.ruleSets.set(ruleSet.name, ruleSet);
    });

    it('should apply rules from an insert rule', () => {
      // RuleSet: Bar
      // * ^title = "Wow fancy"
      //
      // Profile: Foo
      // Parent: Observation
      // * insert Bar
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      ruleSet.rules.push(nameRule);

      const insertRule = new InsertRule('');
      insertRule.ruleSet = 'Bar';
      profile.rules.push(insertRule);

      exporter.applyInsertRules();
      const exported = exporter.exportStructDef(profile);
      expect(exported.title).toBe('Wow fancy');
    });

    it('should log an error and not apply rules from an invalid insert rule', () => {
      // RuleSet: Bar
      // * #lion
      // * ^title = "Wow fancy"
      //
      // Profile: Foo
      // Parent: Observation
      // * insert Bar
      const concept = new ConceptRule('bear').withFile('Concept.fsh').withLocation([1, 2, 3, 4]);
      const nameRule = new CaretValueRule('');
      nameRule.caretPath = 'title';
      nameRule.value = 'Wow fancy';
      ruleSet.rules.push(concept, nameRule);

      const insertRule = new InsertRule('').withFile('Insert.fsh').withLocation([5, 6, 7, 8]);
      insertRule.ruleSet = 'Bar';
      profile.rules.push(insertRule);

      exporter.applyInsertRules();
      const exported = exporter.exportStructDef(profile);
      // CaretRule is still applied
      expect(exported.title).toBe('Wow fancy');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /ConceptRule.*Profile.*File: Concept\.fsh.*Line: 1 - 3.*Applied in File: Insert\.fsh.*Applied on Line: 5 - 7/s
      );
    });
  });
});

describe('StructureDefinitionExporter R5', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let pkg: Package;
  let fisher: TestFisher;
  let exporter: StructureDefinitionExporter;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r5-definitions', defs);
  });

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    pkg = new Package(input.config);
    fisher = new TestFisher(input, defs, pkg, 'hl7.fhir.r5.core#5.0.0', 'r5-definitions');
    exporter = new StructureDefinitionExporter(input, pkg, fisher);
    loggerSpy.reset();
  });

  it('should apply a Reference AssignmentRule and replace the Reference on a CodeableReference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'CarePlan';

    const instance = new Instance('Bar');
    instance.id = 'bar-id';
    instance.instanceOf = 'Condition';
    doc.instances.set(instance.name, instance);

    const rule = new AssignmentRule('addresses.reference');
    rule.value = new FshReference('Bar');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const addressesReference = sd.findElement('CarePlan.addresses.reference');

    expect(addressesReference.patternReference).toEqual({
      reference: 'Condition/bar-id'
    });
  });

  it('should not apply a Reference AssignmentRule with invalid type constraints on a parent CodeableReference', () => {
    const profile = new Profile('Foo');
    profile.parent = 'CarePlan';

    const instance = new Instance('Bar');
    instance.id = 'bar-id';
    instance.instanceOf = 'Patient';
    doc.instances.set(instance.name, instance);

    const rule = new AssignmentRule('addresses.reference');
    rule.value = new FshReference('Bar');
    profile.rules.push(rule);

    exporter.exportStructDef(profile);
    const sd = pkg.profiles[0];

    const addressesReference = sd.findElement('CarePlan.addresses.reference');

    expect(addressesReference.patternReference).toEqual(undefined);
    expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /The type "Reference\(Patient\)" does not match any of the allowed types\D*/s
    );
  });

  describe('#AddElementRule', () => {
    it('should not log an error when path does not have [x] for multiple CodeableReference types in AddElementRule', () => {
      const logical = new Logical('MyTestModel');
      logical.id = 'MyModel';

      const addElementRule = new AddElementRule('prop1')
        .withFile('GoodPath.fsh')
        .withLocation([3, 1, 8, 12]);
      addElementRule.min = 0;
      addElementRule.max = '1';
      addElementRule.types = [
        { type: 'Organization', isCodeableReference: true },
        { type: 'Group', isCodeableReference: true }
      ];
      addElementRule.short = 'prop1 definition with multiple references';
      logical.rules.push(addElementRule);

      doc.logicals.set(logical.name, logical);

      exporter.exportStructDef(logical);

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });

  describe('#OnlyRule', () => {
    it('should apply a correct OnlyRule on a CodeableReference', () => {
      const profile = new Profile('Foo');
      profile.parent = 'MedicationRequest';

      const rule = new OnlyRule('reason');
      rule.types = [{ type: 'Condition', isCodeableReference: true }];
      profile.rules.push(rule);

      exporter.exportStructDef(profile);
      const sd = pkg.profiles[0];
      const baseStructDef = fisher.fishForStructureDefinition('MedicationRequest');

      const baseSubject = baseStructDef.findElement('MedicationRequest.reason');
      const constrainedSubject = sd.findElement('MedicationRequest.reason');

      expect(baseSubject.type).toHaveLength(1);
      expect(baseSubject.type[0]).toEqual(
        new ElementDefinitionType('CodeableReference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Condition',
          'http://hl7.org/fhir/StructureDefinition/Observation'
        )
      );

      expect(constrainedSubject.type).toHaveLength(1);
      expect(constrainedSubject.type[0]).toEqual(
        new ElementDefinitionType('CodeableReference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Condition'
        )
      );
    });

    it('should apply a correct OnlyRule on a CodeableReference reference to Any', () => {
      const extension = new Extension('Foo');

      const rule = new OnlyRule('value[x]');
      rule.types = [
        { type: 'Observation', isCodeableReference: true },
        { type: 'Condition', isCodeableReference: true }
      ];
      extension.rules.push(rule);

      exporter.exportStructDef(extension);
      const sd = pkg.extensions[0];
      const baseStructDef = fisher.fishForStructureDefinition('Extension');

      const baseValueX = baseStructDef.findElement('Extension.value[x]');
      const constrainedValueX = sd.findElement('Extension.value[x]');

      expect(baseValueX.type).toHaveLength(54);
      expect(baseValueX.type.find(t => t.code === 'CodeableReference')).toEqual(
        new ElementDefinitionType('CodeableReference')
      );

      expect(constrainedValueX.type).toHaveLength(1);
      expect(constrainedValueX.type[0]).toEqual(
        new ElementDefinitionType('CodeableReference').withTargetProfiles(
          'http://hl7.org/fhir/StructureDefinition/Observation',
          'http://hl7.org/fhir/StructureDefinition/Condition'
        )
      );
    });
  });
});
