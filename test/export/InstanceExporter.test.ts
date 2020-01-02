import { InstanceExporter, ProfileExporter } from '../../src/export';
import { FSHTank, FSHDocument } from '../../src/import';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { ResolveFn } from '../../src/fhirtypes';
import { Instance, Profile, FshCode } from '../../src/fshtypes';
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
  let profileExporter: ProfileExporter;

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
    profileExporter = new ProfileExporter(defs, input);
    spyResolve(profileExporter, resolve);
    exporter = new InstanceExporter(defs, input, profileExporter.resolve.bind(profileExporter));
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

  it('should fix values on an instance if the value is fixed on the Structure Definition', () => {
    const patient = new Profile('TestPatient');
    patient.parent = 'Patient';
    doc.profiles.set(patient.name, patient);
    const instance = new Instance('Bar');
    instance.instanceOf = 'TestPatient';
    doc.instances.set(instance.name, instance);
    const fixedValRule = new FixedValueRule('active');
    fixedValRule.fixedValue = true;
    patient.rules.push(fixedValRule);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].active).toBe(true);
  });

  it('should fix values on an instance if the value is fixed by a pattern on the Structure Definition', () => {
    const patient = new Profile('TestPatient');
    patient.parent = 'Patient';
    doc.profiles.set(patient.name, patient);
    const instance = new Instance('Bar');
    instance.instanceOf = 'TestPatient';
    doc.instances.set(instance.name, instance);
    const fixedValRule = new FixedValueRule('maritalStatus');
    const fixedFshCode = new FshCode('foo', 'http://foo.com');
    fixedValRule.fixedValue = fixedFshCode;
    patient.rules.push(fixedValRule);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].maritalStatus).toEqual({
      coding: [{ code: 'foo', system: 'http://foo.com' }]
    });
  });

  it('should fix choice values on an instance if the value is fixed on the Structure Definition', () => {
    const patient = new Profile('TestPatient');
    patient.parent = 'Patient';
    doc.profiles.set(patient.name, patient);
    const instance = new Instance('Bar');
    instance.instanceOf = 'TestPatient';
    doc.instances.set(instance.name, instance);
    const fixedValRule = new FixedValueRule('deceasedBoolean');
    fixedValRule.fixedValue = true;
    patient.rules.push(fixedValRule);
    const exported = exporter.export();
    expect(exported.length).toBe(1);
    expect(exported[0].deceasedBoolean).toBe(true);
  });
});
