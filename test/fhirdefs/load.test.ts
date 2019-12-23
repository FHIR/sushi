import { loadFromPath, loadDependency } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { getResolver } from '../testhelpers/getResolver';
import { ResolveFn } from '../../src/fhirtypes/ElementDefinition';
import path from 'path';
import fs from 'fs-extra';
import tar from 'tar';
import rp from 'request-promise-native';
import { TextEncoder } from 'util';

describe('#loadFromPath()', () => {
  let defs: FHIRDefinitions;
  let resolve: ResolveFn;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'test#1.1.1',
      defs
    );
    resolve = getResolver(defs);
    resolve('Condition');
    resolve('boolean');
    resolve('Address');
    resolve('patient-mothersMaidenName');
    resolve('allergyintolerance-clinical');
  });

  it('should load base FHIR resources', () => {
    expect(defs.allResources().some(r => r.id === 'Condition')).toBeTruthy();
    const conditionByID = defs.findResource('Condition');
    expect(conditionByID.url).toBe('http://hl7.org/fhir/StructureDefinition/Condition');
    expect(conditionByID.fhirVersion).toBe('4.0.1');
    expect(defs.findResource('http://hl7.org/fhir/StructureDefinition/Condition')).toEqual(
      conditionByID
    );
  });

  it('should load base FHIR primitive types', () => {
    expect(defs.allTypes().some(r => r.id === 'boolean')).toBeTruthy();
    const booleanByID = defs.findType('boolean');
    expect(booleanByID.url).toBe('http://hl7.org/fhir/StructureDefinition/boolean');
    expect(booleanByID.fhirVersion).toBe('4.0.1');
    expect(defs.findType('http://hl7.org/fhir/StructureDefinition/boolean')).toEqual(booleanByID);
  });

  it('should load base FHIR complex types', () => {
    expect(defs.allTypes().some(r => r.id === 'Address')).toBeTruthy();
    const addressByID = defs.findType('Address');
    expect(addressByID.url).toBe('http://hl7.org/fhir/StructureDefinition/Address');
    expect(addressByID.fhirVersion).toBe('4.0.1');
    expect(defs.findType('http://hl7.org/fhir/StructureDefinition/Address')).toEqual(addressByID);
  });

  it('should load base FHIR extensions', () => {
    expect(defs.allExtensions().some(r => r.id === 'patient-mothersMaidenName')).toBeTruthy();
    const maidenNameExtensionByID = defs.findExtension('patient-mothersMaidenName');
    expect(maidenNameExtensionByID.url).toBe(
      'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
    );
    expect(maidenNameExtensionByID.fhirVersion).toBe('4.0.1');
    expect(
      defs.findExtension('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName')
    ).toEqual(maidenNameExtensionByID);
  });

  it('should load base FHIR value sets', () => {
    expect(defs.allValueSets().some(r => r.id === 'allergyintolerance-clinical')).toBeTruthy();
    const allergyStatusValueSetByID = defs.findValueSet('allergyintolerance-clinical');
    expect(allergyStatusValueSetByID.url).toBe(
      'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
    );
    // For some reason, value sets don't specify a fhirVersion, but in this case the business
    // version is the FHIR version, so we'll verify that instead
    expect(allergyStatusValueSetByID.version).toBe('4.0.1');
    expect(defs.findValueSet('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical')).toEqual(
      allergyStatusValueSetByID
    );
  });

  it('should globally find any definition', () => {
    const conditionByID = defs.find('Condition');
    expect(conditionByID.kind).toBe('resource');
    expect(conditionByID.fhirVersion).toBe('4.0.1');
    expect(defs.find('http://hl7.org/fhir/StructureDefinition/Condition')).toEqual(conditionByID);

    const booleanByID = defs.find('boolean');
    expect(booleanByID.kind).toBe('primitive-type');
    expect(booleanByID.fhirVersion).toBe('4.0.1');
    expect(defs.find('http://hl7.org/fhir/StructureDefinition/boolean')).toEqual(booleanByID);

    const addressByID = defs.find('Address');
    expect(addressByID.kind).toBe('complex-type');
    expect(addressByID.fhirVersion).toBe('4.0.1');
    expect(defs.find('http://hl7.org/fhir/StructureDefinition/Address')).toEqual(addressByID);

    const maidenNameExtensionByID = defs.find('patient-mothersMaidenName');
    expect(maidenNameExtensionByID.type).toBe('Extension');
    expect(maidenNameExtensionByID.fhirVersion).toBe('4.0.1');
    expect(defs.find('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName')).toEqual(
      maidenNameExtensionByID
    );

    const allergyStatusValueSetByID = defs.find('allergyintolerance-clinical');
    expect(allergyStatusValueSetByID.resourceType).toBe('ValueSet');
    // For some reason, value sets don't specify a fhirVersion, but in this case the business
    // version is the FHIR version, so we'll verify that instead
    expect(allergyStatusValueSetByID.version).toBe('4.0.1');
    expect(defs.find('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical')).toEqual(
      allergyStatusValueSetByID
    );
  });
});

describe('#loadDependency()', () => {
  let defs: FHIRDefinitions;
  let requestSpy: jest.SpyInstance;
  let tarSpy: jest.SpyInstance;
  let ensureDirSpy: jest.SpyInstance;
  let writeSpy: jest.SpyInstance;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    requestSpy = jest.spyOn(rp, 'get').mockImplementation((options: any): any => {
      if (options.uri === 'http://build.fhir.org/ig/qas.json') {
        return new TextEncoder().encode(`[
            {
              "url": "http://hl7.org/fhir/hspc/ImplementationGuide/hspc",
              "name": "HSPC Implementation Guide",
              "package-id": "hl7.fhir.hspc",
              "ig-ver": "1.0",
              "date": "Thu, 11 Oct, 2018 11:00:14 -0600",
              "errs": 34,
              "warnings": 10,
              "hints": 0,
              "version": "3.0.1",
              "tool": "3.4.0-13844",
              "repo": "nrdavis1/HSPCFHIRtest/bran"
            },
            {
              "url": "http://hl7.org/fhir/hspc/ImplementationGuide/hspc",
              "name": "HSPC Implementation Guide",
              "package-id": "hl7.fhir.hspc",
              "ig-ver": "1.0",
              "date": "Tue, 05 Mar, 2019 12:02:14 -0700",
              "errs": 26980,
              "warnings": 10,
              "hints": 0,
              "version": "3.0.1",
              "tool": "3.4.0-13844",
              "repo": "nrdavis1/HSPCFHIRtest/branches"
            }
        ]`);
      } else {
        return {};
      }
    });
    tarSpy = jest.spyOn(tar, 'x').mockImplementation(() => {});
    writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    ensureDirSpy = jest.spyOn(fs, 'ensureDirSync').mockImplementation(() => {});
  });

  beforeEach(() => {
    requestSpy.mockClear();
    tarSpy.mockClear();
    writeSpy.mockClear();
    ensureDirSpy.mockClear();
  });

  it('should not try to download a package that is already in the cache', async () => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'test#1.1.1',
      defs
    );
    await expect(
      loadDependency(
        'test',
        '1.1.1',
        defs,
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package')
      )
    ).resolves.toEqual(defs);
    expect(requestSpy.mock.calls.length).toBe(0);
  });

  it('should try to load a package from packages.fhir.org when a non-special package version is loaded', async () => {
    await expect(loadDependency('hl7.fhir.hspc', '1.1.1', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.hspc#1.1.1 could not be loaded locally or from the FHIR package registry'
    );
    expect(requestSpy.mock.calls[0]).toEqual([
      {
        encoding: null,
        uri: 'http://packages.fhir.org/hl7.fhir.hspc/1.1.1'
      }
    ]);
    expect(ensureDirSpy.mock.calls[0]).toEqual([path.join('foo', 'hl7.fhir.hspc#1.1.1')]);
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join('foo', 'hl7.fhir.hspc#1.1.1'));
  });

  it('should try to load the latest package from build.fhir.org when a current package version is loaded', async () => {
    await expect(loadDependency('hl7.fhir.hspc', 'current', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.hspc#current could not be loaded locally or from the FHIR package registry'
    );
    expect(requestSpy.mock.calls[0]).toEqual([
      {
        encoding: null,
        uri: 'http://build.fhir.org/ig/qas.json'
      }
    ]);
    expect(requestSpy.mock.calls[1]).toEqual([
      {
        encoding: null,
        uri: 'http://build.fhir.org/ig/nrdavis1/HSPCFHIRtest/branches/package.tgz'
      }
    ]);
    expect(ensureDirSpy.mock.calls[0]).toEqual([path.join('foo', 'hl7.fhir.hspc#current')]);
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join('foo', 'hl7.fhir.hspc#current'));
  });

  it('should throw DevPackageLoadError when a dev package version is not locally present', async () => {
    await expect(loadDependency('test', 'dev', defs, 'somePath')).rejects.toThrow(
      'The package test#dev could not be loaded locally. Dev packages must be present in local cache'
    );
  });
});
