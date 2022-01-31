import { PackageLoadError } from 'fhir-package-load';
import { loadCustomResources, loadSupplementalFHIRPackage } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ImplementationGuideDefinitionParameter } from '../../src/fhirtypes';
import { loggerSpy } from '../testhelpers';
import path from 'path';

jest.mock('fhir-package-load', () => {
  const original = jest.requireActual('fhir-package-load');
  return {
    ...original,
    loadDependency: jest.fn(
      async (packageName: string, version: string, FHIRDefs: FHIRDefinitions) => {
        // the mock loader can find R2, R3, and R5
        if (/hl7\.fhir\.r(2|3|5).core/.test(packageName)) {
          FHIRDefs.packages.push(`${packageName}#${version}`);
          return Promise.resolve(FHIRDefs);
        } else {
          throw new PackageLoadError(`${packageName}#${version}`);
        }
      }
    )
  };
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

describe('#loadSupplementalFHIRPackage()', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  it('should load specified supplemental FHIR version', () => {
    const defs = new FHIRDefinitions();
    return loadSupplementalFHIRPackage('hl7.fhir.r3.core#3.0.2', defs).then(() => {
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
      expect(defs.packages.length).toBe(0);
      expect(defs.supplementalFHIRPackages.length).toBe(0);
      expect(defs.isSupplementalFHIRDefinitions).toBeFalsy();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Failed to load supplemental FHIR package hl7\.fhir\.r4\.core#4.0.1/s
      );
    });
  });
});
