import {
  loadFromPath,
  loadDependency,
  loadCustomResources,
  cleanCachedPackage
} from '../../src/fhirdefs/load';
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
  let cachePath: string;
  beforeAll(() => {
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
            },
            {
              url:
                'http://hl7.org/fhir/sushi-test-no-download/ImplementationGuide/sushi-test-no-download-0.1.0',
              name: 'sushi-test-no-download',
              'package-id': 'sushi-test-no-download',
              'ig-ver': '0.1.0',
              repo: 'sushi/sushi-test-no-download/branches/master/qa.json'
            },
            {
              url: 'http://hl7.org/fhir/sushi-test-old/ImplementationGuide/sushi-test-old-0.1.0',
              name: 'sushi-test-old',
              'package-id': 'sushi-test-old',
              'ig-ver': '0.1.0',
              repo: 'sushi/sushi-test-old/branches/master/qa.json'
            },
            {
              url: 'http://hl7.org/fhir/sushi-test/ImplementationGuide/sushi-test-0.1.0',
              name: 'sushi-test',
              'package-id': 'sushi-test',
              'ig-ver': '0.1.0',
              repo: 'sushi/sushi-test/branches/master/qa.json'
            }
          ]
        };
      } else if (
        uri === 'http://build.fhir.org/ig/HL7/US-Core-R4/package.manifest.json' ||
        (uri.startsWith('http://build.fhir.org/ig/sushi/sushi-test') && uri.endsWith('json'))
      ) {
        return {
          data: {
            date: '20200413230227'
          }
        };
      } else if (
        uri === 'http://packages.fhir.org/sushi-test/0.2.0' ||
        uri === 'http://build.fhir.org/ig/sushi/sushi-test-old/package.tgz' ||
        uri === 'http://build.fhir.org/ig/HL7/US-Core-R4/package.tgz'
      ) {
        return {
          data: {
            some: 'zipfile'
          }
        };
      } else {
        return {};
      }
    });
    tarSpy = jest.spyOn(tar, 'x').mockImplementation(() => {});
    writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    ensureDirSpy = jest.spyOn(fs, 'ensureDirSync').mockImplementation(() => {});
    cachePath = path.join(__dirname, 'fixtures');
  });

  beforeEach(() => {
    loggerSpy.reset();
    defs = new FHIRDefinitions();
    axiosSpy.mockClear();
    tarSpy.mockClear();
    writeSpy.mockClear();
    ensureDirSpy.mockClear();
  });

  // Packages with numerical versions
  it('should not try to download a non-current package that is already in the cache', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(
      path.join(cachePath, 'sushi-test#0.1.0', 'package'),
      'sushi-test#0.1.0',
      expectedDefs
    );
    await expect(loadDependency('sushi-test', '0.1.0', defs, cachePath)).resolves.toEqual(
      expectedDefs
    );
    expect(axiosSpy.mock.calls.length).toBe(0);
  });

  it('should try to load a package from packages.fhir.org when a non-current package is not cached', async () => {
    await expect(loadDependency('sushi-test', '0.2.0', defs, 'foo')).rejects.toThrow(
      'The package sushi-test#0.2.0 could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expect(axiosSpy.mock.calls).toEqual([
      ['http://packages.fhir.org/sushi-test/0.2.0', { responseType: 'arraybuffer' }]
    ]);
    expect(ensureDirSpy.mock.calls[0]).toEqual([path.join('foo', 'sushi-test#0.2.0')]);
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join('foo', 'sushi-test#0.2.0'));
  });

  it('should throw PackageLoadError when a package with a non-current version is not cached or available on packages.fhir.org', async () => {
    await expect(loadDependency('sushi-test', '0.3.0', defs, 'foo')).rejects.toThrow(
      'The package sushi-test#0.3.0 could not be loaded locally or from the FHIR package registry'
    );
    expect(loggerSpy.getLastMessage('info')).toMatch(
      /Unable to download most current version of sushi-test#0.3.0/
    );
    expect(axiosSpy.mock.calls).toEqual([
      ['http://packages.fhir.org/sushi-test/0.3.0', { responseType: 'arraybuffer' }]
    ]);
    expect(ensureDirSpy.mock.calls).toHaveLength(0);
    expect(tarSpy.mock.calls).toHaveLength(0);
  });

  // Packages with current versions
  it('should not try to download a current package that is already in the cache and up to date', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(
      path.join(cachePath, 'sushi-test#current', 'package'),
      'sushi-test#current',
      expectedDefs
    );
    await expect(loadDependency('sushi-test', 'current', defs, cachePath)).resolves.toEqual(
      expectedDefs
    );
    expect(axiosSpy.mock.calls).toEqual([
      ['http://build.fhir.org/ig/qas.json'],
      ['http://build.fhir.org/ig/sushi/sushi-test/package.manifest.json']
    ]);
  });

  it('should try to load the latest package from build.fhir.org when a current package version is not locally cached', async () => {
    await expect(loadDependency('hl7.fhir.us.core.r4', 'current', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.us.core.r4#current could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expect(axiosSpy.mock.calls).toEqual([
      ['http://build.fhir.org/ig/qas.json'],
      ['http://build.fhir.org/ig/HL7/US-Core-R4/package.manifest.json'],
      ['http://build.fhir.org/ig/HL7/US-Core-R4/package.tgz', { responseType: 'arraybuffer' }]
    ]);
    expect(ensureDirSpy.mock.calls[0]).toEqual([path.join('foo', 'hl7.fhir.us.core.r4#current')]);
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join('foo', 'hl7.fhir.us.core.r4#current'));
  });

  it('should try to load the latest package from build.fhir.org when a current package version has an older version that is locally cached', async () => {
    await expect(
      loadDependency('sushi-test-old', 'current', defs, cachePath)
    ).resolves.toBeTruthy(); // Since tar is mocked, the actual cache is not updated
    expect(axiosSpy.mock.calls).toEqual([
      ['http://build.fhir.org/ig/qas.json'],
      ['http://build.fhir.org/ig/sushi/sushi-test-old/package.manifest.json'],
      ['http://build.fhir.org/ig/sushi/sushi-test-old/package.tgz', { responseType: 'arraybuffer' }]
    ]);
    expect(ensureDirSpy.mock.calls[0][0]).toEqual(path.join(cachePath, 'sushi-test-old#current'));
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join(cachePath, 'sushi-test-old#current'));
  });

  it('should revert to an old locally cached current version when a newer current version is not available for download', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(
      path.join(cachePath, 'sushi-test-no-download#current', 'package'),
      'sushi-test-no-download#current',
      expectedDefs
    );
    await expect(
      loadDependency('sushi-test-no-download', 'current', defs, cachePath)
    ).resolves.toEqual(expectedDefs);
    expect(axiosSpy.mock.calls).toEqual([
      ['http://build.fhir.org/ig/qas.json'],
      ['http://build.fhir.org/ig/sushi/sushi-test-no-download/package.manifest.json'],
      [
        'http://build.fhir.org/ig/sushi/sushi-test-no-download/package.tgz',
        { responseType: 'arraybuffer' }
      ]
    ]);
    expect(ensureDirSpy.mock.calls).toHaveLength(0);
    expect(tarSpy.mock.calls).toHaveLength(0);
  });

  // Packages with dev versions
  it('should not try to download a dev package that is already in the cache', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(path.join(cachePath, 'sushi-test#dev', 'package'), 'sushi-test#dev', expectedDefs);
    await expect(loadDependency('sushi-test', 'dev', defs, cachePath)).resolves.toEqual(
      expectedDefs
    );
    expect(axiosSpy.mock.calls).toHaveLength(0);
  });

  it('should load the current package from build.fhir.org when a dev package is loaded and not locally cached', async () => {
    await expect(loadDependency('sushi-test-old', 'dev', defs, cachePath)).resolves.toBeTruthy();
    expect(
      loggerSpy
        .getAllMessages('info')
        .some(message =>
          message.match(
            /Falling back to sushi-test-old#current since sushi-test-old#dev is not locally cached./
          )
        )
    ).toBeTruthy();
    expect(axiosSpy.mock.calls).toEqual([
      ['http://build.fhir.org/ig/qas.json'],
      ['http://build.fhir.org/ig/sushi/sushi-test-old/package.manifest.json'],
      ['http://build.fhir.org/ig/sushi/sushi-test-old/package.tgz', { responseType: 'arraybuffer' }]
    ]);
    expect(ensureDirSpy.mock.calls[0]).toEqual([path.join(cachePath, 'sushi-test-old#current')]);
    expect(tarSpy.mock.calls[0][0].cwd).toBe(path.join(cachePath, 'sushi-test-old#current'));
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
    const fixtures = path.join(
      __dirname,
      'fixtures',
      'customized-ig-with-resources',
      'ig-data',
      'input'
    );
    loadCustomResources(fixtures, defs);
  });

  it('should load custom JSON and XML resources', () => {
    // Only StructureDefinitions, ValueSets, and CodeSystems are loaded in
    const profiles = defs.allProfiles();
    const valueSets = defs.allValueSets();
    const extensions = defs.allExtensions();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe('MyPatient');
    expect(valueSets).toHaveLength(1);
    expect(valueSets[0].id).toBe('MyVS');
    // Each extension has 3 entries, one for url, one for id, and one for name
    expect(extensions).toHaveLength(6);
    const birthPlace = extensions.find(e => e.id === 'patient-birthPlace');
    const birthPlaceFromXML = extensions.find(e => e.id === 'patient-birthPlaceXML');
    // The extension converted from xml should match the native json extension
    // except for the identifying fields
    Object.keys(birthPlaceFromXML).forEach(key => {
      let expectedValue = birthPlace[key];
      if (key === 'id' || key === 'url' || key === 'name') {
        expectedValue += 'XML';
      }
      expect(birthPlaceFromXML[key]).toEqual(expectedValue);
    });
  });

  it('should add all predefined resources to the FHIRDefs with file information', () => {
    expect(defs.getPredefinedResource('CapabilityStatement-MyCS.json').id).toBe('MyCS');
    expect(defs.getPredefinedResource('Patient-MyPatient.json').id).toBe('MyPatient');
    expect(defs.getPredefinedResource('StructureDefinition-patient-birthPlace.json').id).toBe(
      'patient-birthPlace'
    );
    expect(defs.getPredefinedResource('StructureDefinition-patient-birthPlaceXML.xml').id).toBe(
      'patient-birthPlaceXML'
    );
    expect(defs.getPredefinedResource('StructureDefinition-MyLM.json').id).toBe('MyLM');
    expect(defs.getPredefinedResource('OperationDefinition-MyOD.json').id).toBe('MyOD');
    expect(defs.getPredefinedResource('StructureDefinition-MyPatient.json').id).toBe('MyPatient');
    expect(defs.getPredefinedResource('Patient-BazPatient.json').id).toBe('BazPatient');
    expect(defs.getPredefinedResource('ValueSet-MyVS.json').id).toBe('MyVS');
  });

  it('should log an error for non JSON or XML input files', () => {
    expect(loggerSpy.getMessageAtIndex(-1, 'error')).toMatch(/Invalid file.*resources/);
  });

  it('should log an error for invalid XML files', () => {
    expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
      /Loading InvalidFile.xml failed with the following error:/
    );
  });

  it('should log an error for invalid JSON files', () => {
    expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(
      /Loading InvalidFile.json failed with the following error:/
    );
  });
});

describe('#cleanCachedPackage', () => {
  let renameSpy: jest.SpyInstance;
  let cachePath: string;

  beforeAll(() => {
    renameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => {});
    cachePath = path.join(__dirname, 'fixtures');
  });

  beforeEach(() => {
    renameSpy.mockClear();
  });

  it('should move all contents of a package into the "package" folder', () => {
    const packagePath = path.join(cachePath, 'sushi-test-wrong-format#current');
    cleanCachedPackage(packagePath);
    expect(renameSpy.mock.calls.length).toBe(2);
    expect(renameSpy.mock.calls).toContainEqual([
      path.join(packagePath, 'other'),
      path.join(packagePath, 'package', 'other')
    ]);
    expect(renameSpy.mock.calls).toContainEqual([
      path.join(packagePath, 'StructureDefinition-MyPatient.json'),
      path.join(packagePath, 'package', 'StructureDefinition-MyPatient.json')
    ]);
  });

  it('should do nothing if the package does not have a "package" folder', () => {
    const packagePath = path.join(cachePath, 'sushi-test-no-package#current');
    cleanCachedPackage(packagePath);
    expect(renameSpy.mock.calls.length).toBe(0);
  });

  it('should do nothing if the package is correctly structured', () => {
    const packagePath = path.join(cachePath, 'sushi-test#current');
    cleanCachedPackage(packagePath);
    expect(renameSpy.mock.calls.length).toBe(0);
  });
});
