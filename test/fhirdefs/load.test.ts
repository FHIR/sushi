import { loadFromPath, loadDependency, loadCustomResources } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { Type } from '../../src/utils';
import { TestFisher, loggerSpy } from '../testhelpers';
import path from 'path';
import fs from 'fs-extra';
import tar from 'tar';
import axios from 'axios';

describe('#loadFromPath()', () => {
  let defs: FHIRDefinitions;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'test#1.1.1',
      defs
    );
    // Run the dependency resources through TestFisher to force them into the testhelpers cache
    const fisher = new TestFisher().withFHIR(defs);
    fisher.fishForFHIR('Condition');
    fisher.fishForFHIR('boolean');
    fisher.fishForFHIR('Address');
    fisher.fishForFHIR('vitalsigns');
    fisher.fishForFHIR('patient-mothersMaidenName');
    fisher.fishForFHIR('allergyintolerance-clinical', Type.ValueSet);
    fisher.fishForFHIR('allergyintolerance-clinical', Type.CodeSystem);
  });

  it('should load base FHIR resources', () => {
    expect(defs.allResources().some(r => r.id === 'Condition')).toBeTruthy();
  });

  it('should load base FHIR primitive types', () => {
    expect(defs.allTypes().some(r => r.id === 'boolean')).toBeTruthy();
  });

  it('should load base FHIR complex types', () => {
    expect(defs.allTypes().some(r => r.id === 'Address')).toBeTruthy();
  });

  it('should load base FHIR profiles', () => {
    expect(defs.allProfiles().some(r => r.id === 'vitalsigns')).toBeTruthy();
  });

  it('should load base FHIR extensions', () => {
    expect(defs.allExtensions().some(r => r.id === 'patient-mothersMaidenName')).toBeTruthy();
  });

  it('should load base FHIR value sets', () => {
    expect(defs.allValueSets().some(r => r.id === 'allergyintolerance-clinical')).toBeTruthy();
  });

  it('should load base FHIR code sytems', () => {
    expect(defs.allCodeSystems().some(r => r.id === 'allergyintolerance-clinical')).toBeTruthy();
  });
});

describe('#loadDependency()', () => {
  let defs: FHIRDefinitions;
  let axiosSpy: jest.SpyInstance;
  let tarSpy: jest.SpyInstance;
  let ensureDirSpy: jest.SpyInstance;
  let writeSpy: jest.SpyInstance;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    axiosSpy = jest.spyOn(axios, 'get').mockImplementation((uri: string): any => {
      if (uri === 'http://build.fhir.org/ig/qas.json') {
        return {
          data: [
            {
              url: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core.r4-4.0.0',
              name: 'USCoreR4',
              'package-id': 'hl7.fhir.us.core.r4',
              'ig-ver': '4.0.0',
              date: 'Sat, 18 May, 2019 01:48:14 +0000',
              errs: 538,
              warnings: 34,
              hints: 202,
              version: '4.0.0',
              tool: '4.1.0 (3)',
              repo: 'HL7Imposter/US-Core-R4/branches/oldbranch/qa.json'
            },
            {
              url: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core.r4-4.0.0',
              name: 'USCoreR4',
              'package-id': 'hl7.fhir.us.core.r4',
              'ig-ver': '4.0.0',
              date: 'Mon, 20 Jan, 2020 19:36:43 +0000',
              errs: 1496,
              warnings: 36,
              hints: 228,
              version: '4.0.0',
              tool: '4.1.0 (3)',
              repo: 'HL7/US-Core-R4/branches/newbranch/qa.json'
            }
          ]
        };
      } else {
        return {};
      }
    });
    tarSpy = jest.spyOn(tar, 'x').mockImplementation(() => {});
    writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    ensureDirSpy = jest.spyOn(fs, 'ensureDirSync').mockImplementation(() => {});
  });

  beforeEach(() => {
    axiosSpy.mockClear();
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
    expect(axiosSpy.mock.calls.length).toBe(0);
  });

  it('should try to load a package from packages.fhir.org when a non-special package version is loaded', async () => {
    await expect(loadDependency('hl7.fhir.hspc', '1.1.1', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.hspc#1.1.1 could not be loaded locally or from the FHIR package registry'
    );
    expect(axiosSpy.mock.calls[0][0]).toBe('http://packages.fhir.org/hl7.fhir.hspc/1.1.1');
    expect(ensureDirSpy.mock.calls[0]).toEqual([path.join('foo', 'hl7.fhir.hspc#1.1.1')]);
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join('foo', 'hl7.fhir.hspc#1.1.1'));
  });

  it('should try to load the latest package from build.fhir.org when a current package version is loaded', async () => {
    await expect(loadDependency('hl7.fhir.us.core.r4', 'current', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.us.core.r4#current could not be loaded locally or from the FHIR package registry'
    );
    expect(axiosSpy.mock.calls[0][0]).toBe('http://build.fhir.org/ig/qas.json');
    expect(axiosSpy.mock.calls[1][0]).toBe('http://build.fhir.org/ig/HL7/US-Core-R4/package.tgz');
    expect(ensureDirSpy.mock.calls[0]).toEqual([path.join('foo', 'hl7.fhir.us.core.r4#current')]);
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join('foo', 'hl7.fhir.us.core.r4#current'));
  });

  it('should load the current package from build.fhir.org when a dev package is loaded and not locally cached', async () => {
    await expect(loadDependency('hl7.fhir.us.core.r4', 'dev', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.us.core.r4#current could not be loaded locally or from the FHIR package registry'
    );
    expect(
      loggerSpy
        .getAllMessages('info')
        .some(message =>
          message.match(
            /Falling back to hl7.fhir.us.core.r4#current since hl7.fhir.us.core.r4#dev is not locally cached./
          )
        )
    ).toBeTruthy();
    expect(axiosSpy.mock.calls[0][0]).toBe('http://build.fhir.org/ig/qas.json');
    expect(axiosSpy.mock.calls[1][0]).toBe('http://build.fhir.org/ig/HL7/US-Core-R4/package.tgz');
    expect(ensureDirSpy.mock.calls[0]).toEqual([path.join('foo', 'hl7.fhir.us.core.r4#current')]);
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join('foo', 'hl7.fhir.us.core.r4#current'));
  });

  it('should throw CurrentPackageLoadError when a current package is not listed', async () => {
    await expect(loadDependency('hl7.fhir.us.core', 'current', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.us.core#current is not available on http://build.fhir.org/ig/qas.json, so no current version can be loaded'
    );
    expect(axiosSpy.mock.calls.length).toBe(1);
    expect(axiosSpy.mock.calls[0][0]).toBe('http://build.fhir.org/ig/qas.json');
  });

  it('should throw CurrentPackageLoadError when http://build.fhir.org/ig/qas.json gives a bad response', async () => {
    axiosSpy.mockImplementationOnce(() => {});
    await expect(loadDependency('bad.response', 'current', defs, 'foo')).rejects.toThrow(
      'The package bad.response#current is not available on http://build.fhir.org/ig/qas.json, so no current version can be loaded'
    );
    expect(axiosSpy.mock.calls.length).toBe(1);
    expect(axiosSpy.mock.calls[0][0]).toBe('http://build.fhir.org/ig/qas.json');
  });
});

describe('#loadCustomResources', () => {
  let defs: FHIRDefinitions;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    const fixtures = path.join(__dirname, '..', 'ig', 'fixtures', 'customized-ig-with-resources');
    loadCustomResources(fixtures, defs);
  });

  it('should load custom resources', () => {
    // Only StructureDefinitions, ValueSets, and CodeSystems are loaded in
    expect(defs.size()).toBe(10);
    expect(defs.allExtensions().some(e => e.id === 'patient-birthPlace')).toBeTruthy();
    expect(defs.allProfiles().some(e => e.id === 'MyPatient')).toBeTruthy();
    expect(defs.allProfiles().some(e => e.id === 'MyTitlePatient')).toBeTruthy();
    expect(defs.allValueSets().some(e => e.id === 'MyVS')).toBeTruthy();
  });

  it('should log an error for invalid input files', () => {
    expect(loggerSpy.getMessageAtIndex(-1, 'error')).toMatch(
      /Invalid file.*resources.*XML format not supported/
    );
  });
});
