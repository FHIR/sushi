import path from 'path';
import {
  getPredefinedResourcePaths,
  loadPredefinedResources,
  PREDEFINED_PACKAGE_NAME,
  PREDEFINED_PACKAGE_VERSION
} from '../../src/ig';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { getTestFHIRDefinitions } from '../testhelpers';

describe('#getPredefinedResourcePaths', () => {
  it('should return all typical IG resource paths when they all exist', () => {
    const inputDir = path.join(__dirname, 'fixtures', 'customized-ig-with-resources', 'input');
    const paths = getPredefinedResourcePaths(inputDir);
    expect(paths).toEqual([
      path.join(inputDir, 'capabilities'),
      path.join(inputDir, 'extensions'),
      path.join(inputDir, 'models'),
      path.join(inputDir, 'operations'),
      path.join(inputDir, 'profiles'),
      path.join(inputDir, 'resources'),
      path.join(inputDir, 'vocabulary'),
      path.join(inputDir, 'examples')
    ]);
  });

  it('should return only the subset of typical IG resource paths that exist', () => {
    const inputDir = path.join(
      __dirname,
      'fixtures',
      'customized-ig-with-logical-model-example',
      'input'
    );
    const paths = getPredefinedResourcePaths(inputDir);
    expect(paths).toEqual([path.join(inputDir, 'models'), path.join(inputDir, 'examples')]);
  });

  it('should return no paths when none of the typical IG paths exist', () => {
    const inputDir = path.join(__dirname, 'fixtures', 'customized-ig', 'input');
    const paths = getPredefinedResourcePaths(inputDir);
    expect(paths).toBeEmpty();
  });

  it('should ignore non-standard paths when no path-resource param is passed in', () => {
    const inputDir = path.join(
      __dirname,
      'fixtures',
      'customized-ig-with-non-standard-resource-path',
      'input'
    );
    const paths = getPredefinedResourcePaths(inputDir);
    expect(paths).toEqual([path.join(inputDir, 'resources')]);
  });

  it('should return non-standard paths that are specified by path-resource param', () => {
    const projectDir = path.join(
      __dirname,
      'fixtures',
      'customized-ig-with-non-standard-resource-path'
    );
    const inputDir = path.join(projectDir, 'input');
    const paths = getPredefinedResourcePaths(inputDir, projectDir, [
      { code: 'path-resource', value: 'input/stuff' }
    ]);
    expect(paths).toEqual([path.join(inputDir, 'resources'), path.join(inputDir, 'stuff')]);
  });

  it('should not return nested folders when no path-resource param is passed in', () => {
    const inputDir = path.join(
      __dirname,
      'fixtures',
      'customized-ig-with-nested-resources',
      'input'
    );
    const paths = getPredefinedResourcePaths(inputDir);
    expect(paths).toEqual([path.join(inputDir, 'resources'), path.join(inputDir, 'examples')]);
  });

  it('should return nested folders specifically listed in the path-resource params', () => {
    const projectDir = path.join(__dirname, 'fixtures', 'customized-ig-with-nested-resources');
    const inputDir = path.join(projectDir, 'input');
    const paths = getPredefinedResourcePaths(inputDir, projectDir, [
      { code: 'path-resource', value: 'input/resources/nested1' },
      { code: 'path-resource', value: 'input/resources/nested2' }
    ]);
    expect(paths).toEqual([
      path.join(inputDir, 'resources'),
      path.join(inputDir, 'examples'),
      path.join(inputDir, 'resources', 'nested1'),
      path.join(inputDir, 'resources', 'nested2')
    ]);
  });

  it('should return all nested folders matching a wildcard directory in the path-resource params', () => {
    const projectDir = path.join(__dirname, 'fixtures', 'customized-ig-with-nested-resources');
    const inputDir = path.join(projectDir, 'input');
    const paths = getPredefinedResourcePaths(inputDir, projectDir, [
      { code: 'path-resource', value: 'input/resources/*' }
    ]);
    expect(paths).toEqual([
      path.join(inputDir, 'resources'),
      path.join(inputDir, 'examples'),
      path.join(inputDir, 'resources', 'nested1'),
      path.join(inputDir, 'resources', 'nested2'),
      path.join(inputDir, 'resources', 'path-resource-double-nest'),
      path.join(inputDir, 'resources', 'path-resource-double-nest', 'jack'),
      path.join(inputDir, 'resources', 'path-resource-double-nest', 'jack', 'examples'),
      path.join(inputDir, 'resources', 'path-resource-double-nest', 'john'),
      path.join(inputDir, 'resources', 'path-resource-nest')
    ]);
  });

  it('should ignore invalid directories in the path-resource params', () => {
    const projectDir = path.join(__dirname, 'fixtures', 'customized-ig-with-nested-resources');
    const inputDir = path.join(projectDir, 'input');
    const paths = getPredefinedResourcePaths(inputDir, projectDir, [
      { code: 'path-resource', value: 'input/i-dont-exist' }
    ]);
    expect(paths).toEqual([path.join(inputDir, 'resources'), path.join(inputDir, 'examples')]);
  });
});

describe('#loadPredefinedResources', () => {
  let defs: FHIRDefinitions;

  beforeEach(async () => {
    defs = await getTestFHIRDefinitions();
  });

  it('should load all the resources in the typical resource paths for IGs', async () => {
    const inputDir = path.join(__dirname, 'fixtures', 'customized-ig-with-resources', 'input');
    const status = await loadPredefinedResources(defs, inputDir);
    expect(status).toBe('LOADED');
    expect(defs.getPackageLoadStatus(PREDEFINED_PACKAGE_NAME, PREDEFINED_PACKAGE_VERSION)).toBe(
      'LOADED'
    );
    const all = defs.findResourceInfos('*').map(info => `${info.resourceType}-${info.id}`);
    expect(all).toEqual([
      'CapabilityStatement-MyCS',
      'Goal-GoalWithDescription',
      'Patient-BarPatient',
      'Patient-MetaExtensionPatient',
      'Patient-FooPatient',
      'TestScript-MyTestScript',
      'StructureDefinition-patient-birthPlace',
      'StructureDefinition-patient-birthPlaceXML',
      'StructureDefinition-MyLM',
      'OperationDefinition-AnotherOD',
      'OperationDefinition-MyOD',
      'StructureDefinition-MyPatient',
      'StructureDefinition-MyTitlePatient',
      'Patient-null',
      'Unknown-Patient',
      'Unknown-null',
      'Patient-MetaExtensionNotExamplePatient',
      'Patient-BazPatient',
      'ValueSet-MyVS'
    ]);
  });

  it('should load nested resources by default so it matches legacy behavior', async () => {
    const inputDir = path.join(
      __dirname,
      'fixtures',
      'customized-ig-with-nested-resources',
      'input'
    );
    const status = await loadPredefinedResources(defs, inputDir);
    expect(status).toBe('LOADED');
    expect(defs.getPackageLoadStatus(PREDEFINED_PACKAGE_NAME, PREDEFINED_PACKAGE_VERSION)).toBe(
      'LOADED'
    );
    const all = defs.findResourceInfos('*').map(info => `${info.resourceType}-${info.id}`);
    expect(all).toEqual([
      'Patient-BarPatient',
      'StructureDefinition-MyPatient',
      'StructureDefinition-MyTitlePatient',
      'ValueSet-MyVS',
      'Patient-Jack',
      'Patient-John',
      'StructureDefinition-MyCorrectlyNestedPatient'
    ]);
  });

  it('should ignore non-standard paths when no path-resource param is passed in', async () => {
    const inputDir = path.join(
      __dirname,
      'fixtures',
      'customized-ig-with-non-standard-resource-path',
      'input'
    );
    const status = await loadPredefinedResources(defs, inputDir);
    expect(status).toBe('LOADED');
    expect(defs.getPackageLoadStatus(PREDEFINED_PACKAGE_NAME, PREDEFINED_PACKAGE_VERSION)).toBe(
      'LOADED'
    );
    const all = defs.findResourceInfos('*').map(info => `${info.resourceType}-${info.id}`);
    expect(all).toEqual(['StructureDefinition-MyPatient']);
  });

  it('should load non-standard paths that are specified by path-resource param', async () => {
    const projectDir = path.join(
      __dirname,
      'fixtures',
      'customized-ig-with-non-standard-resource-path'
    );
    const inputDir = path.join(projectDir, 'input');
    const status = await loadPredefinedResources(defs, inputDir, projectDir, [
      { code: 'path-resource', value: 'input/stuff' }
    ]);
    expect(status).toBe('LOADED');
    expect(defs.getPackageLoadStatus(PREDEFINED_PACKAGE_NAME, PREDEFINED_PACKAGE_VERSION)).toBe(
      'LOADED'
    );
    const all = defs.findResourceInfos('*').map(info => `${info.resourceType}-${info.id}`);
    expect(all).toEqual(['StructureDefinition-MyPatient', 'Patient-BarPatientInStuff']);
  });
});
