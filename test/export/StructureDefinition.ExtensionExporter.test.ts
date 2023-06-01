import fs from 'fs-extra';
import { loadFromPath } from 'fhir-package-loader';
import { StructureDefinitionExporter, Package } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { Extension, Instance, FshCode, Profile } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { TestFisher } from '../testhelpers';
import path from 'path';
import { minimalConfig } from '../utils/minimalConfig';
import { ContainsRule, AssignmentRule } from '../../src/fshtypes/rules';

describe('ExtensionExporter', () => {
  let defs: FHIRDefinitions;
  let doc: FSHDocument;
  let exporter: StructureDefinitionExporter;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    const myComplexExtension = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../testhelpers/testdefs/mvc-extension.json'), 'utf-8')
    );
    defs.add(myComplexExtension);
  });

  beforeEach(() => {
    loggerSpy.reset();
    doc = new FSHDocument('fileName');
    const input = new FSHTank([doc], minimalConfig);
    const pkg = new Package(input.config);
    const fisher = new TestFisher(input, defs, pkg);
    exporter = new StructureDefinitionExporter(input, pkg, fisher);
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export().extensions;
    expect(exported).toEqual([]);
  });

  it('should export a single extension', () => {
    const extension = new Extension('Foo');
    doc.extensions.set(extension.name, extension);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(1);
  });

  it('should export multiple extensions', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(2);
  });

  it('should still export extensions if one fails', () => {
    const extensionFoo = new Extension('Foo');
    extensionFoo.parent = 'Baz';
    const extensionBar = new Extension('Bar');
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('Bar');
  });

  it('should log a message with source information when the parent is not found', () => {
    const extension = new Extension('Wrong').withFile('Wrong.fsh').withLocation([14, 8, 24, 17]);
    extension.parent = 'DoesNotExist';
    doc.extensions.set(extension.name, extension);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Wrong\.fsh.*Line: 14 - 24\D*/s);
  });

  it('should log a message with source information when the parent is not an extension', () => {
    const extension = new Extension('Wrong').withFile('Wrong.fsh').withLocation([14, 8, 24, 17]);
    extension.parent = 'Patient';
    doc.extensions.set(extension.name, extension);
    exporter.export();
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /The parent of an extension must be the base Extension or another defined extension.*File: Wrong\.fsh.*Line: 14 - 24\D*/s
    );
  });

  it('should export extensions with FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Foo';
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(2);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[1].baseDefinition).toBe(exported[0].url);
    const parentFixedUri = exported[0].findElement('Extension.url').fixedUri;
    const childFixedUri = exported[1].findElement('Extension.url').fixedUri;
    expect(parentFixedUri).toBe(childFixedUri);
  });

  it('should export extensions with the same FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Foo';
    const extensionBaz = new Extension('Baz');
    extensionBaz.parent = 'Foo';
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    doc.extensions.set(extensionBaz.name, extensionBaz);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[0].url);
  });

  it('should export extensions with deep FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Foo';
    const extensionBaz = new Extension('Baz');
    extensionBaz.parent = 'Bar';
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    doc.extensions.set(extensionBaz.name, extensionBaz);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Foo');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Baz');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[1].url);
  });

  it('should export extensions with out-of-order FSHy parents', () => {
    const extensionFoo = new Extension('Foo');
    extensionFoo.parent = 'Bar';
    const extensionBar = new Extension('Bar');
    extensionBar.parent = 'Baz';
    const extensionBaz = new Extension('Baz');
    doc.extensions.set(extensionFoo.name, extensionFoo);
    doc.extensions.set(extensionBar.name, extensionBar);
    doc.extensions.set(extensionBaz.name, extensionBaz);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(3);
    expect(exported[0].name).toBe('Baz');
    expect(exported[1].name).toBe('Bar');
    expect(exported[2].name).toBe('Foo');
    expect(exported[1].baseDefinition === exported[0].url);
    expect(exported[2].baseDefinition === exported[1].url);
  });

  it('should not log an error when an inline extension is used', () => {
    loggerSpy.reset();
    const extension = new Extension('MyExtension');
    const containsRule = new ContainsRule('extension')
      .withFile('MyExtension.fsh')
      .withLocation([3, 8, 3, 25]);
    containsRule.items.push({
      name: 'SomeExtension'
    });
    extension.rules.push(containsRule);
    doc.extensions.set(extension.name, extension);
    exporter.export();

    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should export extensions with extension instance parents', () => {
    const parentExtensionInstance = new Instance('ParentExtension');
    parentExtensionInstance.instanceOf = 'StructureDefinition';
    parentExtensionInstance.usage = 'Definition';
    const parentName = new AssignmentRule('name');
    parentName.value = 'ParentExtension';
    const parentStatus = new AssignmentRule('status');
    parentStatus.value = new FshCode('active');
    const parentKind = new AssignmentRule('kind');
    parentKind.value = new FshCode('resource');
    const parentAbstract = new AssignmentRule('abstract');
    parentAbstract.value = false;
    const parentType = new AssignmentRule('type');
    parentType.value = 'Extension';
    const parentDerivation = new AssignmentRule('derivation');
    parentDerivation.value = new FshCode('constraint');
    const parentBaseDefinition = new AssignmentRule('baseDefinition');
    parentBaseDefinition.value = 'http://hl7.org/fhir/StructureDefinition/Extension';
    const parentElementId = new AssignmentRule('snapshot.element[0].id');
    parentElementId.value = 'Extension';
    const parentElementPath = new AssignmentRule('snapshot.element[0].path');
    parentElementPath.value = 'Extension';
    const parentUrlId = new AssignmentRule('snapshot.element[1].id');
    parentUrlId.value = 'Extension.url';
    const parentUrlPath = new AssignmentRule('snapshot.element[1].path');
    parentUrlPath.value = 'Extension.url';
    parentExtensionInstance.rules.push(
      parentName,
      parentStatus,
      parentKind,
      parentAbstract,
      parentType,
      parentDerivation,
      parentBaseDefinition,
      parentElementId,
      parentElementPath,
      parentUrlId,
      parentUrlPath
    );
    doc.instances.set(parentExtensionInstance.name, parentExtensionInstance);

    const childExtension = new Extension('ChildExtension');
    childExtension.parent = 'ParentExtension';
    doc.extensions.set(childExtension.name, childExtension);
    const exported = exporter.export().extensions;
    expect(exported.length).toBe(1);
    expect(exported[0].name).toBe('ChildExtension');
    expect(exported[0].baseDefinition).toBe(
      'http://hl7.org/fhir/us/minimal/StructureDefinition/ParentExtension'
    );
    expect(loggerSpy.getAllMessages('error').length).toBe(0);
  });

  describe('#context', () => {
    it('should set extension context by a quoted string', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'some.fhirpath.expression',
          isQuoted: true
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'fhirpath',
          expression: 'some.fhirpath.expression'
        }
      ]);
    });

    it('should set extension context for an extension by url', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'http://hl7.org/fhir/StructureDefinition/cqf-library',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'extension',
          expression: 'http://hl7.org/fhir/StructureDefinition/cqf-library'
        }
      ]);
    });

    it('should set extension context for an extension by name', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'library',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'extension',
          expression: 'http://hl7.org/fhir/StructureDefinition/cqf-library'
        }
      ]);
    });

    it('should set extension context for an extension by id', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'cqf-library',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'extension',
          expression: 'http://hl7.org/fhir/StructureDefinition/cqf-library'
        }
      ]);
    });

    it('should set extension context for a base resource root element by id/name', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'Observation',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'element',
          expression: 'Observation'
        }
      ]);
    });

    it('should set extension context for a base resource root element by url', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'http://hl7.org/fhir/StructureDefinition/Observation',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'element',
          expression: 'Observation'
        }
      ]);
    });

    it('should set extension context for a base resource by id with a FSH path', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'Observation.component.valueQuantity',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'element',
          expression: 'Observation.component.value[x]:valueQuantity'
        }
      ]);
    });

    it('should set extension context for a base resource by url with a FSH path', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'http://hl7.org/fhir/StructureDefinition/Observation#component.valueQuantity',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'element',
          expression: 'Observation.component.value[x]:valueQuantity'
        }
      ]);
    });

    it('should set extension context with type "extension" when the path is part of a complex extension by name', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'proficiency.extension[level]',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'extension',
          expression: 'http://hl7.org/fhir/StructureDefinition/patient-proficiency#level'
        }
      ]);
    });

    it('should set extension context with type "extension" when the path is part of a complex extension by url', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'http://hl7.org/fhir/StructureDefinition/patient-proficiency#extension[level]',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'extension',
          expression: 'http://hl7.org/fhir/StructureDefinition/patient-proficiency#level'
        }
      ]);
    });

    it('should set extension context with type "extension" when the path is a deep part of a complex extension by name', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'MyVeryComplexExtension#extension[foo].extension[bigFoo]',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'extension',
          expression: 'http://example.org/StructureDefinition/mvc-extension#foo.bigFoo'
        }
      ]);
    });

    it('should set extension context with type "element" when the path is a deep part of a complex extension, but contains non-extension elements', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'MyVeryComplexExtension#extension[bar].value[x].extension[secretBar]',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'element',
          expression:
            'http://example.org/StructureDefinition/mvc-extension#Extension.extension:bar.value[x].extension:secretBar'
        }
      ]);
    });

    it('should set extension context when an alias is used for a resource URL', () => {
      doc.aliases.set('$PROF', 'http://hl7.org/fhir/StructureDefinition/patient-proficiency');
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: '$PROF#extension[level]',
          isQuoted: false
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toEqual([
        {
          type: 'extension',
          expression: 'http://hl7.org/fhir/StructureDefinition/patient-proficiency#level'
        }
      ]);
    });

    it('should log an error when no extension or resource can be found with the provided value', () => {
      const extension = new Extension('MyExtension');
      extension.contexts = [
        {
          value: 'MysteryExtension',
          isQuoted: false,
          sourceInfo: {
            file: 'Context.fsh',
            location: {
              startLine: 8,
              startColumn: 7,
              endLine: 8,
              endColumn: 25
            }
          }
        }
      ];
      doc.extensions.set(extension.name, extension);
      const exported = exporter.exportStructDef(extension);
      expect(exported.context).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'Could not find resource MysteryExtension to use as extension context.'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Context\.fsh.*Line: 8\D*/s);
    });

    describe('#withCustomResource', () => {
      beforeEach(() => {
        const myObservation = new Profile('MyObservation');
        myObservation.parent = 'Observation';
        myObservation.id = 'my-obs';
        doc.profiles.set(myObservation.name, myObservation);
      });

      it('should set extension context for a custom resource root element by id', () => {
        const extension = new Extension('MyExtension');
        extension.contexts = [
          {
            value: 'my-obs',
            isQuoted: false
          }
        ];
        doc.extensions.set(extension.name, extension);
        const exported = exporter.exportStructDef(extension);
        expect(exported.context).toEqual([
          {
            type: 'element',
            expression: 'http://hl7.org/fhir/us/minimal/StructureDefinition/my-obs#Observation'
          }
        ]);
      });

      it('should set extension context for a custom resource root element by name', () => {
        const extension = new Extension('MyExtension');
        extension.contexts = [
          {
            value: 'MyObservation',
            isQuoted: false
          }
        ];
        doc.extensions.set(extension.name, extension);
        const exported = exporter.exportStructDef(extension);
        expect(exported.context).toEqual([
          {
            type: 'element',
            expression: 'http://hl7.org/fhir/us/minimal/StructureDefinition/my-obs#Observation'
          }
        ]);
      });

      it('should set extension context for a custom resource root element by url', () => {
        const extension = new Extension('MyExtension');
        extension.contexts = [
          {
            value: 'http://hl7.org/fhir/us/minimal/StructureDefinition/my-obs',
            isQuoted: false
          }
        ];
        doc.extensions.set(extension.name, extension);
        const exported = exporter.exportStructDef(extension);
        expect(exported.context).toEqual([
          {
            type: 'element',
            expression: 'http://hl7.org/fhir/us/minimal/StructureDefinition/my-obs#Observation'
          }
        ]);
      });

      it('should set extension context for a custom resource by id with a FSH path', () => {
        const extension = new Extension('MyExtension');
        extension.contexts = [
          {
            value: 'my-obs.component.valueQuantity',
            isQuoted: false
          }
        ];
        doc.extensions.set(extension.name, extension);
        const exported = exporter.exportStructDef(extension);
        expect(exported.context).toEqual([
          {
            type: 'element',
            expression:
              'http://hl7.org/fhir/us/minimal/StructureDefinition/my-obs#Observation.component.value[x]:valueQuantity'
          }
        ]);
      });

      it('should set extension context for a custom resource by name with a FSH path', () => {
        const extension = new Extension('MyExtension');
        extension.contexts = [
          {
            value: 'MyObservation.component.valueQuantity',
            isQuoted: false
          }
        ];
        doc.extensions.set(extension.name, extension);
        const exported = exporter.exportStructDef(extension);
        expect(exported.context).toEqual([
          {
            type: 'element',
            expression:
              'http://hl7.org/fhir/us/minimal/StructureDefinition/my-obs#Observation.component.value[x]:valueQuantity'
          }
        ]);
      });

      it('should set extension context for a custom resource by url with a FSH path', () => {
        const extension = new Extension('MyExtension');
        extension.contexts = [
          {
            value:
              'http://hl7.org/fhir/us/minimal/StructureDefinition/my-obs#component.valueQuantity',
            isQuoted: false
          }
        ];
        doc.extensions.set(extension.name, extension);
        const exported = exporter.exportStructDef(extension);
        expect(exported.context).toEqual([
          {
            type: 'element',
            expression:
              'http://hl7.org/fhir/us/minimal/StructureDefinition/my-obs#Observation.component.value[x]:valueQuantity'
          }
        ]);
      });

      it('should log an error when a custom resource element is specified with an invalid FSH path', () => {
        const extension = new Extension('MyExtension');
        extension.contexts = [
          {
            value: 'MyObservation.component.valueToast',
            isQuoted: false,
            sourceInfo: {
              file: 'Context.fsh',
              location: {
                startLine: 19,
                startColumn: 40,
                endLine: 19,
                endColumn: 77
              }
            }
          }
        ];
        doc.extensions.set(extension.name, extension);
        const exported = exporter.exportStructDef(extension);
        expect(exported.context).toBeUndefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          'Could not find element component.valueToast on resource MyObservation to use as extension context.'
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Context\.fsh.*Line: 19\D*/s);
      });
    });
  });
});
