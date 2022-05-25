import {
  loadFromPath,
  loadDependency,
  loadCustomResources,
  cleanCachedPackage,
  loadSupplementalFHIRPackage
} from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ImplementationGuideDefinitionParameter } from '../../src/fhirtypes';
import { Type } from '../../src/utils';
import { PackageLoadError } from '../../src/errors';
import { TestFisher, loggerSpy } from '../testhelpers';
import * as loadModule from '../../src/fhirdefs/load';
import path from 'path';
import fs from 'fs-extra';
import tar from 'tar';
import axios from 'axios';

describe('#loadFromPath()', () => {
  let defs: FHIRDefinitions;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
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

  it('should load the package.json file', () => {
    expect(defs.getPackageJson('r4-definitions')).toBeDefined();
  });
});

describe('#loadDependency()', () => {
  let defs: FHIRDefinitions;
  let axiosSpy: jest.SpyInstance;
  let axiosHeadSpy: jest.SpyInstance;
  let tarSpy: jest.SpyInstance;
  let removeSpy: jest.SpyInstance;
  let moveSpy: jest.SpyInstance;
  let writeSpy: jest.SpyInstance;
  let cachePath: string;

  // Many tests check that the right package was downloaded to the right place.
  // This function encapsulates that testing logic. It's coupled more tightly to
  // the actual implementation than I'd prefer, but... at least it's in one place.
  const expectDownloadSequence = (
    sources: string | string[],
    destination: string,
    isCurrent = false,
    isCurrentFound = true
  ): void => {
    if (!Array.isArray(sources)) {
      sources = [sources];
    }
    if (isCurrent) {
      const mockCalls: any[] = [['https://build.fhir.org/ig/qas.json']];
      if (isCurrentFound) {
        mockCalls.push(
          [sources[0].replace(/package\.tgz$/, 'package.manifest.json')],
          [sources[0], { responseType: 'arraybuffer' }]
        );
      }
      expect(axiosSpy.mock.calls).toEqual(mockCalls);
    } else {
      expect(axiosSpy.mock.calls).toEqual(sources.map(s => [s, { responseType: 'arraybuffer' }]));
    }
    if (destination != null) {
      const tempTarFile = writeSpy.mock.calls[0][0];
      const tempTarDirectory = tarSpy.mock.calls[0][0].cwd;
      expect(tarSpy.mock.calls[0][0].file).toBe(tempTarFile);
      expect(moveSpy.mock.calls[0][0]).toBe(tempTarDirectory);
      expect(moveSpy.mock.calls[0][1]).toBe(destination);
    } else {
      expect(writeSpy).toHaveBeenCalledTimes(0);
      expect(tarSpy).toHaveBeenCalledTimes(0);
      expect(moveSpy).toHaveBeenCalledTimes(0);
    }
  };

  beforeAll(() => {
    axiosSpy = jest.spyOn(axios, 'get').mockImplementation((uri: string): any => {
      if (uri === 'https://build.fhir.org/ig/qas.json') {
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
              repo: 'HL7Imposter/US-Core-R4/branches/main/qa.json'
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
              repo: 'HL7/US-Core-R4/branches/main/qa.json'
            },
            {
              url: 'http://hl7.org/fhir/sushi-test-no-download/ImplementationGuide/sushi-test-no-download-0.1.0',
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
            },
            {
              url: 'http://hl7.org/fhir/sushi-no-main/ImplementationGuide/sushi-no-main-0.1.0',
              name: 'sushi-no-main',
              'package-id': 'sushi-no-main',
              'ig-ver': '0.1.0',
              repo: 'sushi/sushi-no-main/branches/feature/qa.json'
            }
          ]
        };
      } else if (
        uri === 'https://build.fhir.org/ig/HL7/US-Core-R4/branches/main/package.manifest.json' ||
        (uri.startsWith('https://build.fhir.org/ig/sushi/sushi-test') && uri.endsWith('json'))
      ) {
        return {
          data: {
            date: '20200413230227'
          }
        };
      } else if (
        uri === 'https://packages.fhir.org/sushi-test/0.2.0' ||
        uri === 'https://build.fhir.org/ig/sushi/sushi-test-old/branches/master/package.tgz' ||
        uri === 'https://build.fhir.org/ig/HL7/US-Core-R4/branches/main/package.tgz' ||
        uri === 'https://build.fhir.org/hl7.fhir.r5.core.tgz' ||
        uri === 'https://packages2.fhir.org/packages/hl7.fhir.r4b.core/4.1.0' ||
        uri === 'https://packages.fhir.org/hl7.fhir.r4b.core/4.3.0' ||
        uri === 'https://packages2.fhir.org/packages/hl7.fhir.r5.core/4.5.0' ||
        uri === 'https://packages.fhir.org/hl7.fhir.r4.core/4.0.1' ||
        uri === 'https://packages2.fhir.org/packages/fhir.dicom/2021.4.20210910'
      ) {
        return {
          data: {
            some: 'zipfile'
          }
        };
      } else if (
        uri === 'https://packages.fhir.org/hl7.fhir.r4b.core/4.1.0' ||
        uri === 'https://packages.fhir.org/hl7.fhir.r5.core/4.5.0' ||
        uri === 'https://packages.fhir.org/fhir.dicom/2021.4.20210910'
      ) {
        throw 'Not Found';
      } else {
        return {};
      }
    });
    axiosHeadSpy = jest.spyOn(axios, 'head').mockImplementation((): any => {
      throw 'Method Not Allowed';
    });
    tarSpy = jest.spyOn(tar, 'x').mockImplementation(() => {});
    writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    removeSpy = jest.spyOn(fs, 'removeSync').mockImplementation(() => {});
    moveSpy = jest.spyOn(fs, 'moveSync').mockImplementation(() => {});
    cachePath = path.join(__dirname, 'fixtures');
    delete process.env.HTTPS_PROXY;
  });

  beforeEach(() => {
    loggerSpy.reset();
    defs = new FHIRDefinitions();
    axiosSpy.mockClear();
    axiosHeadSpy.mockClear();
    tarSpy.mockClear();
    writeSpy.mockClear();
    moveSpy.mockClear();
    removeSpy.mockClear();
  });

  // Packages with numerical versions
  it('should not try to download a non-current package that is already in the cache', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(cachePath, 'sushi-test#0.1.0', expectedDefs);
    await expect(loadDependency('sushi-test', '0.1.0', defs, cachePath)).resolves.toEqual(
      expectedDefs
    );
    expect(axiosSpy.mock.calls.length).toBe(0);
  });

  it('should recognize a package in the cache with uppercase letters', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(cachePath, 'sushi-test-caps#0.1.0', expectedDefs);
    await expect(loadDependency('sushi-test-caps', '0.1.0', defs, cachePath)).resolves.toEqual(
      expectedDefs
    );
    expect(axiosSpy.mock.calls.length).toBe(0);
  });

  it('should try to load a package from packages.fhir.org when a non-current package is not cached', async () => {
    await expect(loadDependency('sushi-test', '0.2.0', defs, 'foo')).rejects.toThrow(
      'The package sushi-test#0.2.0 could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expectDownloadSequence(
      'https://packages.fhir.org/sushi-test/0.2.0',
      path.join('foo', 'sushi-test#0.2.0')
    );
  });

  it('should try to load FHIR R4 (4.0.1) from packages.fhir.org when it is not cached', async () => {
    await expect(loadDependency('hl7.fhir.r4.core', '4.0.1', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.r4.core#4.0.1 could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expectDownloadSequence(
      'https://packages.fhir.org/hl7.fhir.r4.core/4.0.1',
      path.join('foo', 'hl7.fhir.r4.core#4.0.1')
    );
  });

  it('should try to load prerelease FHIR R4B (4.1.0) from packages2.fhir.org when it is not cached', async () => {
    await expect(loadDependency('hl7.fhir.r4b.core', '4.1.0', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.r4b.core#4.1.0 could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expectDownloadSequence(
      [
        'https://packages.fhir.org/hl7.fhir.r4b.core/4.1.0',
        'https://packages2.fhir.org/packages/hl7.fhir.r4b.core/4.1.0'
      ],
      path.join('foo', 'hl7.fhir.r4b.core#4.1.0')
    );
  });

  it('should try to load FHIR R4B (4.3.0) from packages.fhir.org when it is not cached', async () => {
    await expect(loadDependency('hl7.fhir.r4b.core', '4.3.0', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.r4b.core#4.3.0 could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expectDownloadSequence(
      'https://packages.fhir.org/hl7.fhir.r4b.core/4.3.0',
      path.join('foo', 'hl7.fhir.r4b.core#4.3.0')
    );
  });

  it('should try to load prerelease FHIR R5 (4.5.0) from packages2.fhir.org when it is not cached', async () => {
    await expect(loadDependency('hl7.fhir.r5.core', '4.5.0', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.r5.core#4.5.0 could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expectDownloadSequence(
      [
        'https://packages.fhir.org/hl7.fhir.r5.core/4.5.0',
        'https://packages2.fhir.org/packages/hl7.fhir.r5.core/4.5.0'
      ],
      path.join('foo', 'hl7.fhir.r5.core#4.5.0')
    );
  });

  it('should try to load a package from packages2.fhir.org when it is not on packages.fhir.org', async () => {
    await expect(loadDependency('fhir.dicom', '2021.4.20210910', defs, 'foo')).rejects.toThrow(
      'The package fhir.dicom#2021.4.20210910 could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expectDownloadSequence(
      [
        'https://packages.fhir.org/fhir.dicom/2021.4.20210910',
        'https://packages2.fhir.org/packages/fhir.dicom/2021.4.20210910'
      ],
      path.join('foo', 'fhir.dicom#2021.4.20210910')
    );
  });

  it('should throw PackageLoadError when a package with a non-current version is not cached or available on packages.fhir.org', async () => {
    await expect(loadDependency('sushi-test', '0.3.0', defs, 'foo')).rejects.toThrow(
      'The package sushi-test#0.3.0 could not be loaded locally or from the FHIR package registry'
    );
    expect(loggerSpy.getLastMessage('info')).toMatch(
      /Unable to download most current version of sushi-test#0.3.0/
    );
    expectDownloadSequence('https://packages.fhir.org/sushi-test/0.3.0', null);
  });

  // Packages with current versions
  it('should not try to download a current package that is already in the cache and up to date', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(cachePath, 'sushi-test#current', expectedDefs);
    await expect(loadDependency('sushi-test', 'current', defs, cachePath)).resolves.toEqual(
      expectedDefs
    );
    expect(axiosSpy.mock.calls).toEqual([
      ['https://build.fhir.org/ig/qas.json'],
      ['https://build.fhir.org/ig/sushi/sushi-test/branches/master/package.manifest.json']
    ]);
  });

  it('should try to load the latest package from build.fhir.org when a current package version is not locally cached', async () => {
    await expect(loadDependency('hl7.fhir.us.core.r4', 'current', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.us.core.r4#current could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expectDownloadSequence(
      'https://build.fhir.org/ig/HL7/US-Core-R4/branches/main/package.tgz',
      path.join('foo', 'hl7.fhir.us.core.r4#current'),
      true
    );
  });

  it('should try to load the latest package from build.fhir.org when a current package version has an older version that is locally cached', async () => {
    await expect(
      loadDependency('sushi-test-old', 'current', defs, cachePath)
    ).resolves.toBeTruthy(); // Since tar is mocked, the actual cache is not updated
    expectDownloadSequence(
      'https://build.fhir.org/ig/sushi/sushi-test-old/branches/master/package.tgz',
      path.join(cachePath, 'sushi-test-old#current'),
      true
    );
    expect(removeSpy.mock.calls[0][0]).toBe(path.join(cachePath, 'sushi-test-old#current'));
  });

  it('should not try to load the latest package from build.fhir.org from a branch that is not main/master', async () => {
    await expect(loadDependency('sushi-no-main', 'current', defs, cachePath)).rejects.toThrow(
      'The package sushi-no-main#current is not available on https://build.fhir.org/ig/qas.json, so no current version can be loaded'
    );
    expectDownloadSequence(
      'https://build.fhir.org/ig/sushi/sushi-no-main/branches/master/package.tgz',
      null,
      true,
      false
    );
  });

  it('should try to load the latest FHIR R5 package from build.fhir.org when it is not locally cached', async () => {
    await expect(loadDependency('hl7.fhir.r5.core', 'current', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.r5.core#current could not be loaded locally or from the FHIR package registry'
    ); // the package is never actually added to the cache, since tar is mocked
    expectDownloadSequence(
      'https://build.fhir.org/hl7.fhir.r5.core.tgz',
      path.join('foo', 'hl7.fhir.r5.core#current'),
      false // technically not treated like other current builds (for some reason)
    );
  });

  it('should revert to an old locally cached current version when a newer current version is not available for download', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(cachePath, 'sushi-test-no-download#current', expectedDefs);
    await expect(
      loadDependency('sushi-test-no-download', 'current', defs, cachePath)
    ).resolves.toEqual(expectedDefs);
    expectDownloadSequence(
      'https://build.fhir.org/ig/sushi/sushi-test-no-download/branches/master/package.tgz',
      null,
      true
    );
    expect(removeSpy).toHaveBeenCalledTimes(0);
  });

  // Packages with dev versions
  it('should not try to download a dev package that is already in the cache', async () => {
    const expectedDefs = new FHIRDefinitions();
    loadFromPath(cachePath, 'sushi-test#dev', expectedDefs);
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
    expectDownloadSequence(
      'https://build.fhir.org/ig/sushi/sushi-test-old/branches/master/package.tgz',
      path.join(cachePath, 'sushi-test-old#current'),
      true
    );
    expect(removeSpy.mock.calls[0][0]).toBe(path.join(cachePath, 'sushi-test-old#current'));
  });

  it('should throw CurrentPackageLoadError when a current package is not listed', async () => {
    await expect(loadDependency('hl7.fhir.us.core', 'current', defs, 'foo')).rejects.toThrow(
      'The package hl7.fhir.us.core#current is not available on https://build.fhir.org/ig/qas.json, so no current version can be loaded'
    );
    expect(axiosSpy.mock.calls.length).toBe(1);
    expect(axiosSpy.mock.calls[0][0]).toBe('https://build.fhir.org/ig/qas.json');
  });

  it('should throw CurrentPackageLoadError when https://build.fhir.org/ig/qas.json gives a bad response', async () => {
    axiosSpy.mockImplementationOnce(() => {});
    await expect(loadDependency('bad.response', 'current', defs, 'foo')).rejects.toThrow(
      'The package bad.response#current is not available on https://build.fhir.org/ig/qas.json, so no current version can be loaded'
    );
    expect(axiosSpy.mock.calls.length).toBe(1);
    expect(axiosSpy.mock.calls[0][0]).toBe('https://build.fhir.org/ig/qas.json');
  });
});

describe('#loadCustomResources', () => {
  let defs: FHIRDefinitions;
  let pathToInput: string;
  beforeAll(() => {
    loggerSpy.reset();
    defs = new FHIRDefinitions();
    pathToInput = path.join(__dirname, 'fixtures', 'customized-ig-with-resources', 'input');
    const configParamater: ImplementationGuideDefinitionParameter = {
      code: 'path-resource',
      value: 'path-resource-test'
    };
    loadCustomResources(pathToInput, pathToInput, [configParamater], defs);
  });

  it('should load custom JSON and XML resources', () => {
    // Only StructureDefinitions, ValueSets, and CodeSystems are loaded in
    const profiles = defs.allProfiles();
    const valueSets = defs.allValueSets();
    const extensions = defs.allExtensions();
    expect(profiles).toHaveLength(3);
    expect(profiles[0].id).toBe('MyPatient');
    expect(profiles[2].id).toBe('MyObservation');
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
    expect(
      defs.getPredefinedResource(
        path.join(pathToInput, 'capabilities', 'CapabilityStatement-MyCS.json')
      ).id
    ).toBe('MyCS');
    expect(
      defs.getPredefinedResource(path.join(pathToInput, 'examples', 'Patient-MyPatient.json')).id
    ).toBe('MyPatient');
    expect(
      defs.getPredefinedResource(
        path.join(pathToInput, 'path-resource-test', 'StructureDefinition-MyObservation.json')
      ).id
    ).toBe('MyObservation');
    expect(
      defs.getPredefinedResource(
        path.join(pathToInput, 'examples', 'Binary-LogicalModelExample.json')
      ).id
    ).toBe('example-logical-model');
    expect(
      defs.getPredefinedResource(
        path.join(pathToInput, 'extensions', 'StructureDefinition-patient-birthPlace.json')
      ).id
    ).toBe('patient-birthPlace');
    expect(
      defs.getPredefinedResource(
        path.join(pathToInput, 'extensions', 'StructureDefinition-patient-birthPlaceXML.xml')
      ).id
    ).toBe('patient-birthPlaceXML');
    expect(
      defs.getPredefinedResource(path.join(pathToInput, 'models', 'StructureDefinition-MyLM.json'))
        .id
    ).toBe('MyLM');
    expect(
      defs.getPredefinedResource(
        path.join(pathToInput, 'operations', 'OperationDefinition-MyOD.json')
      ).id
    ).toBe('MyOD');
    expect(
      defs.getPredefinedResource(
        path.join(pathToInput, 'profiles', 'StructureDefinition-MyPatient.json')
      ).id
    ).toBe('MyPatient');
    expect(
      defs.getPredefinedResource(path.join(pathToInput, 'resources', 'Patient-BazPatient.json')).id
    ).toBe('BazPatient');
    // NOTE: It loads nested predefined resources even thought the IG Publisher doesn't handle them well
    expect(
      defs.getPredefinedResource(
        path.join(pathToInput, 'resources', 'nested', 'StructureDefinition-MyNestedPatient.json')
      ).id
    ).toBe('MyNestedPatient');

    expect(
      defs.getPredefinedResource(path.join(pathToInput, 'vocabulary', 'ValueSet-MyVS.json')).id
    ).toBe('MyVS');
  });

  it('should log an info message for non JSON or XML input files', () => {
    expect(loggerSpy.getLastMessage('info')).toMatch(
      /Found 1 file in an input\/\* resource folder that was neither XML nor JSON/
    );
  });

  it('should log an error for invalid XML files', () => {
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Loading .*InvalidFile.xml failed with the following error:/
    );
  });

  it('should not log an error for spreadsheet XML files following standard naming convention', () => {
    loggerSpy.getAllMessages('error').forEach(m => {
      expect(m).not.toMatch(/Loading resources-spreadsheet.xml failed with the following error:/);
    });
  });

  it('should not log an error for spreadsheet XML files NOT following standard naming convention', () => {
    loggerSpy.getAllMessages('error').forEach(m => {
      expect(m).not.toMatch(
        /Loading sneaky-spread-like-bread-sheet.xml failed with the following error:/
      );
    });
  });

  it('should not log an error for invalid FHIR types parsed from XML', () => {
    loggerSpy.getAllMessages('error').forEach(m => {
      expect(m).not.toMatch(/Unknown resource type:/);
    });
  });

  it('should log an info message when it finds spreadsheets', () => {
    expect(loggerSpy.getFirstMessage('info')).toMatch(/Found spreadsheets in directory/);
  });

  it('should log an error for invalid JSON files', () => {
    expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
      /Loading .*InvalidFile.json failed with the following error:/
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

describe('#loadSupplementalFHIRPackage()', () => {
  let loadDependencySpy: jest.SpyInstance;
  beforeAll(() => {
    loadDependencySpy = jest.spyOn(loadModule, 'loadDependency');
    loadDependencySpy.mockImplementation(
      async (packageName: string, version: string, FHIRDefs: FHIRDefinitions) => {
        // the mock loader can find R2, R3, and R5
        if (/hl7\.fhir\.r(2|3|5).core/.test(packageName)) {
          FHIRDefs.packages.push(`${packageName}#${version}`);
          return Promise.resolve(FHIRDefs);
        } else {
          throw new PackageLoadError(`${packageName}#${version}`);
        }
      }
    );
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  afterEach(() => {
    loadDependencySpy.mockClear();
  });

  it('should load specified supplemental FHIR version', () => {
    const defs = new FHIRDefinitions();
    return loadSupplementalFHIRPackage('hl7.fhir.r3.core#3.0.2', defs).then(() => {
      expect(loadDependencySpy).toHaveBeenCalledTimes(1);
      expect(defs.packages.length).toBe(0);
      expect(defs.supplementalFHIRPackages).toEqual(['hl7.fhir.r3.core#3.0.2']);
      expect(defs.isSupplementalFHIRDefinitions).toBeFalsy();
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });
  });

  it('should load multiple supplemental FHIR versions', () => {
    const defs = new FHIRDefinitions();
    const promises = [
      'hl7.fhir.r2.core#1.0.2',
      'hl7.fhir.r3.core#3.0.2',
      'hl7.fhir.r5.core#current'
    ].map(version => {
      return loadSupplementalFHIRPackage(version, defs);
    });
    return Promise.all(promises).then(() => {
      expect(loadDependencySpy).toHaveBeenCalledTimes(3);
      expect(defs.packages.length).toBe(0);
      expect(defs.supplementalFHIRPackages).toEqual([
        'hl7.fhir.r2.core#1.0.2',
        'hl7.fhir.r3.core#3.0.2',
        'hl7.fhir.r5.core#current'
      ]);
      expect(defs.isSupplementalFHIRDefinitions).toBeFalsy();
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });
  });

  it('should log an error when it fails to load a FHIR version', () => {
    const defs = new FHIRDefinitions();
    // Although the real one should suport R4, the mock loader does not
    return loadSupplementalFHIRPackage('hl7.fhir.r4.core#4.0.1', defs).then(() => {
      expect(loadDependencySpy).toHaveBeenCalledTimes(1);
      expect(defs.packages.length).toBe(0);
      expect(defs.supplementalFHIRPackages.length).toBe(0);
      expect(defs.isSupplementalFHIRDefinitions).toBeFalsy();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Failed to load supplemental FHIR package hl7\.fhir\.r4\.core#4.0.1/s
      );
    });
  });
});
