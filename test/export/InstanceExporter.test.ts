import { InstanceExporter, StructureDefinitionExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { ResolveFn } from '../../src/fhirtypes';
import { Instance, Profile, FshCode, FshReference } from '../../src/fshtypes';
import { FixedValueRule } from '../../src/fshtypes/rules';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { getResolver } from '../testhelpers/getResolver';
import { spyResolve } from '../testhelpers/spyResolve';
import path from 'path';

describe('InstanceExporter', () => {
  let defs: FHIRDefinitions;
  let resolve: ResolveFn;
  let doc: FSHDocument;
  let input: FSHTank;
  let exporter: InstanceExporter;
  let structureDefinitionExporter: StructureDefinitionExporter;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    resolve = getResolver(defs);
  });

  beforeEach(() => {
    doc = new FSHDocument('fileName');
    input = new FSHTank([doc], { name: 'test', version: '0.0.1', canonical: 'http://example.com' });
    structureDefinitionExporter = new StructureDefinitionExporter(defs, input);
    spyResolve(structureDefinitionExporter, resolve);
    exporter = new InstanceExporter(
      defs,
      input,
      structureDefinitionExporter.resolve.bind(structureDefinitionExporter)
    );
  });

  it('should output empty results with empty input', () => {
    const exported = exporter.export();
    expect(exported).toEqual([]);
  });

  it('should export a single instance', () => {
    const instance = new Instance('MyInstance');
    instance.instanceOf = 'Patient';
    doc.instances.set(instance.name, instance);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
  });

  it('should export multiple instances', () => {
    const instanceFoo = new Instance('Foo');
    instanceFoo.instanceOf = 'Patient';
    const instanceBar = new Instance('Bar');
    instanceBar.instanceOf = 'Patient';
    doc.instances.set(instanceFoo.name, instanceFoo);
    doc.instances.set(instanceBar.name, instanceBar);
    const exported = exporter.export();
    expect(exported.length).toBe(2);
  });

  it('should still export instance if one fails', () => {
    const instanceFoo = new Instance('Foo');
    instanceFoo.instanceOf = 'Baz';
    const instanceBar = new Instance('Bar');
    instanceBar.instanceOf = 'Patient';
    doc.instances.set(instanceFoo.name, instanceFoo);
    doc.instances.set(instanceBar.name, instanceBar);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].instanceName).toBe('Bar');
  });

  it('should log a message with source information when the parent is not found', () => {
    const instance = new Instance('Bogus').withFile('Bogus.fsh').withLocation([2, 9, 4, 23]);
    instance.instanceOf = 'BogusParent';
    doc.instances.set(instance.name, instance);
    exporter.export();
    expect(loggerSpy.getLastMessage()).toMatch(/File: Bogus\.fsh.*Line: 2 - 4\D/s);
  });

  it('should export instances with InstanceOf FSHy profile', () => {
    const profileFoo = new Profile('Foo');
    profileFoo.parent = 'Patient';
    const instanceBar = new Instance('Bar');
    instanceBar.instanceOf = 'Foo';
    doc.profiles.set(profileFoo.name, profileFoo);
    doc.instances.set(instanceBar.name, instanceBar);
    const exported = exporter.export();
    expect(exported.length).toBe(1); // One instance is successfully exported because profile is defined
    expect(exported[0].instanceName).toBe('Bar');
    expect(exported[0].resourceType).toBe('Patient');
  });

  it('should fix values on an instance', () => {
    const instance = new Instance('Bar');
    instance.instanceOf = 'Patient';
    const fixedValRule = new FixedValueRule('gender');
    const fixedFshCode = new FshCode('foo', 'http://foo.com');
    fixedValRule.fixedValue = fixedFshCode;
    instance.rules.push(fixedValRule);
    doc.instances.set(instance.name, instance);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].gender).toBe('foo');
  });

  describe('#exportInstance', () => {
    let patient: Profile;
    let instance: Instance;
    beforeEach(() => {
      patient = new Profile('TestPatient');
      patient.parent = 'Patient';
      doc.profiles.set(patient.name, patient);
      instance = new Instance('Bar');
      instance.instanceOf = 'TestPatient';
      doc.instances.set(instance.name, instance);
    });

    // Fixing top level elements
    it('should fix top level elements that are fixed on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const exported = exporter.exportInstance(instance);
      expect(exported.active).toEqual(true);
    });

    it('should fix top level elements that are fixed by a pattern on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const exported = exporter.exportInstance(instance);
      expect(exported.maritalStatus).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com' }]
      });
    });

    it('should fix top level choice elements that are fixed on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('deceasedBoolean');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const exported = exporter.exportInstance(instance);
      expect(exported.deceasedBoolean).toBe(true);
    });

    it('should fix an element to a value the same as the fixed value on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('active');
      instanceFixedValRule.fixedValue = true;
      instance.rules.push(instanceFixedValRule);
      const exported = exporter.exportInstance(instance);
      expect(exported.active).toEqual(true);
    });

    it('should fix an element to a value the same as the fixed pattern on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus');
      const instanceFixedFshCode = new FshCode('foo', 'http://foo.com');
      instanceFixedValRule.fixedValue = instanceFixedFshCode;
      instance.rules.push(instanceFixedValRule);
      const exported = exporter.exportInstance(instance);
      expect(exported.maritalStatus).toEqual({
        coding: [{ code: 'foo', system: 'http://foo.com' }]
      });
    });

    it('should not fix an element to a value different than the fixed value on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('active');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('active');
      instanceFixedValRule.fixedValue = false;
      instance.rules.push(instanceFixedValRule);
      expect(() => exporter.exportInstance(instance)).toThrow(
        'Cannot fix false to this element; a different boolean is already fixed: true'
      );
    });

    it('should not fix an element to a value different than the pattern value on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus');
      const instanceFixedFshCode = new FshCode('bar', 'http://bar.com');
      instanceFixedValRule.fixedValue = instanceFixedFshCode;
      instance.rules.push(instanceFixedValRule);
      expect(() => exporter.exportInstance(instance)).toThrow(
        'Cannot fix http://bar.com#bar to this element; a different code is already fixed: http://foo.com#foo.'
      );
    });

    // Nested elements
    it('should fix a nested element that has parents defined in the instance and is fixed on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('communication.preferred');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('communication[0].language');
      instanceFixedValRule.fixedValue = new FshCode('foo');
      instance.rules.push(instanceFixedValRule);
      const exported = exporter.exportInstance(instance);
      expect(exported.communication[0]).toEqual({
        preferred: true,
        language: { coding: [{ code: 'foo' }] }
      });
    });

    it('should fix a nested element that has parents and children defined in the instance and is fixed on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('communication.language.text');
      fixedValRule.fixedValue = 'foo';
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule(
        'communication[0].language.coding[0].version'
      );
      instanceFixedValRule.fixedValue = 'bar';
      instance.rules.push(instanceFixedValRule);
      const exported = exporter.exportInstance(instance);
      expect(exported.communication[0]).toEqual({
        language: { text: 'foo', coding: [{ version: 'bar' }] }
      });
    });

    it('should not fix a nested element that does not have parents defined in the instance', () => {
      const fixedValRule = new FixedValueRule('communication.preferred');
      fixedValRule.fixedValue = true;
      patient.rules.push(fixedValRule);
      const exported = exporter.exportInstance(instance);
      expect(exported.communication).toBeUndefined();
    });

    // TODO: The fixValue functions should be updated to not fix a value when a parent element sets
    // the value to something different using a pattern
    it.skip('should not fix an element to a value different than a parent pattern value on the Structure Definition', () => {
      const fixedValRule = new FixedValueRule('maritalStatus');
      const fixedFshCode = new FshCode('foo', 'http://foo.com');
      fixedValRule.fixedValue = fixedFshCode;
      patient.rules.push(fixedValRule);
      const instanceFixedValRule = new FixedValueRule('maritalStatus.coding[0].system');
      instanceFixedValRule.fixedValue = 'http://bar.com';
      instance.rules.push(instanceFixedValRule);
      expect(() => exporter.exportInstance(instance)).toThrow();
    });

    // Fixing children of primitives
    it('should fix children of primitive values on an instance', () => {
      const fixedValRule = new FixedValueRule('active.id');
      fixedValRule.fixedValue = 'foo';
      instance.rules.push(fixedValRule);
      doc.instances.set(instance.name, instance);
      const exported = exporter.exportInstance(instance);
      expect(exported._active.id).toBe('foo');
    });

    it('should fix primitive values and their children on an instance', () => {
      const fixedValRule1 = new FixedValueRule('active');
      fixedValRule1.fixedValue = true;
      instance.rules.push(fixedValRule1);
      const fixedValRule2 = new FixedValueRule('active.id');
      fixedValRule2.fixedValue = 'foo';
      instance.rules.push(fixedValRule2);
      doc.instances.set(instance.name, instance);
      const exported = exporter.exportInstance(instance);
      expect(exported.active).toBe(true);
      expect(exported._active.id).toBe('foo');
    });

    it('should fix children of primitive value arrays on an instance', () => {
      const fixedValRule = new FixedValueRule('address[0].line[1].extension[0].url');
      fixedValRule.fixedValue = 'foo';
      instance.rules.push(fixedValRule);
      doc.instances.set(instance.name, instance);
      const exported = exporter.exportInstance(instance);
      expect(exported.address.length).toBe(1);
      expect(exported.address[0]._line.length).toBe(2);
      expect(exported.address[0]._line[0]).toBeNull();
      expect(exported.address[0]._line[1].extension.length).toBe(1);
      expect(exported.address[0]._line[1].extension[0].url).toBe('foo');
    });

    it('should fix children of primitive value arrays on an instance with out of order rules', () => {
      const fixedValRule1 = new FixedValueRule('address[0].line[1].extension[0].url');
      fixedValRule1.fixedValue = 'bar';
      instance.rules.push(fixedValRule1);
      const fixedValRule2 = new FixedValueRule('address[0].line[0].extension[0].url');
      fixedValRule2.fixedValue = 'foo';
      instance.rules.push(fixedValRule2);
      doc.instances.set(instance.name, instance);
      const exported = exporter.exportInstance(instance);
      expect(exported.address.length).toBe(1);
      expect(exported.address[0]._line.length).toBe(2);
      expect(exported.address[0]._line[0].extension.length).toBe(1);
      expect(exported.address[0]._line[0].extension[0].url).toBe('foo');
      expect(exported.address[0]._line[1].extension.length).toBe(1);
      expect(exported.address[0]._line[1].extension[0].url).toBe('bar');
    });

    // Fixing References
    it('should fix a reference while resolving the Instance being referred to', () => {
      const orgInstance = new Instance('TestOrganization');
      orgInstance.instanceOf = 'Organization';
      const fixedIdRule = new FixedValueRule('id');
      fixedIdRule.fixedValue = 'org-id';
      orgInstance.rules.push(fixedIdRule);
      const fixedRefRule = new FixedValueRule('managingOrganization');
      fixedRefRule.fixedValue = new FshReference('TestOrganization');
      instance.rules.push(fixedRefRule);
      doc.instances.set(instance.name, instance);
      doc.instances.set(orgInstance.name, orgInstance);
      const exported = exporter.exportInstance(instance);
      expect(exported.managingOrganization).toEqual({
        reference: 'Organization/org-id'
      });
    });

    it('should fix a reference without replacing if the referred Instance does not exist', () => {
      const fixedRefRule = new FixedValueRule('managingOrganization');
      fixedRefRule.fixedValue = new FshReference('http://example.com');
      instance.rules.push(fixedRefRule);
      doc.instances.set(instance.name, instance);
      const exported = exporter.exportInstance(instance);
      expect(exported.managingOrganization).toEqual({
        reference: 'http://example.com'
      });
    });
  });
});
