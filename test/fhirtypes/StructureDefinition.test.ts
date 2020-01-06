import fs from 'fs-extra';
import path from 'path';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import {
  ElementDefinition,
  ElementDefinitionType,
  ResolveFn
} from '../../src/fhirtypes/ElementDefinition';
import { getResolver } from '../testhelpers/getResolver';
import { FshCode } from '../../src/fshtypes';

describe('StructureDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  let resolve: ResolveFn;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    resolve = getResolver(defs);
    // resolve observation once to ensure it is present in defs
    observation = resolve('Observation');
    jsonObservation = defs.findResource('Observation');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
  });
  describe('#fromJSON', () => {
    it('should load a resource properly', () => {
      // Don't test everything, but get a sample anyway
      expect(observation.id).toBe('Observation');
      expect(observation.meta.lastUpdated).toBe('2019-11-01T09:29:23.356+11:00');
      expect(observation.extension).toHaveLength(6);
      expect(observation.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
        valueString: 'Clinical.Diagnostics'
      });
      expect(observation.elements).toHaveLength(50);
      const valueX = observation.elements[21];
      expect(valueX.hasDiff()).toBeFalsy();
      expect(valueX.id).toBe('Observation.value[x]');
      expect(valueX.path).toBe('Observation.value[x]');
      expect(valueX.min).toBe(0);
      expect(valueX.max).toBe('1');
      expect(valueX.type).toEqual([
        new ElementDefinitionType('Quantity'),
        new ElementDefinitionType('CodeableConcept'),
        new ElementDefinitionType('string'),
        new ElementDefinitionType('boolean'),
        new ElementDefinitionType('integer'),
        new ElementDefinitionType('Range'),
        new ElementDefinitionType('Ratio'),
        new ElementDefinitionType('SampledData'),
        new ElementDefinitionType('time'),
        new ElementDefinitionType('dateTime'),
        new ElementDefinitionType('Period')
      ]);
    });

    it('should load a resource properly without capturing originals', () => {
      observation = StructureDefinition.fromJSON(jsonObservation, false);
      // Don't test everything, but get a sample anyway
      expect(observation.id).toBe('Observation');
      expect(observation.meta.lastUpdated).toBe('2019-11-01T09:29:23.356+11:00');
      expect(observation.extension).toHaveLength(6);
      expect(observation.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
        valueString: 'Clinical.Diagnostics'
      });
      expect(observation.elements).toHaveLength(50);
      const valueX = observation.elements[21];
      expect(valueX.hasDiff()).toBeTruthy();
      expect(valueX.calculateDiff()).toEqual(valueX);
      expect(valueX.id).toBe('Observation.value[x]');
      expect(valueX.path).toBe('Observation.value[x]');
      expect(valueX.min).toBe(0);
      expect(valueX.max).toBe('1');
      expect(valueX.type).toEqual([
        new ElementDefinitionType('Quantity'),
        new ElementDefinitionType('CodeableConcept'),
        new ElementDefinitionType('string'),
        new ElementDefinitionType('boolean'),
        new ElementDefinitionType('integer'),
        new ElementDefinitionType('Range'),
        new ElementDefinitionType('Ratio'),
        new ElementDefinitionType('SampledData'),
        new ElementDefinitionType('time'),
        new ElementDefinitionType('dateTime'),
        new ElementDefinitionType('Period')
      ]);
    });
  });

  describe('#toJSON', () => {
    // Skipping because the differential doesn't come back right.
    // Need to re-evaluate how we do differentials.
    it.skip('should round trip back to the original JSON', () => {
      const newJSON = observation.toJSON();
      expect(newJSON).toEqual(jsonObservation);
    });

    it('should reflect differentials for elements that changed after capturing originals', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.short = 'Special observation code';
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.min = 1;

      const json = observation.toJSON();
      expect(json.differential.element).toHaveLength(2);
      expect(json.differential.element[0]).toEqual({
        id: 'Observation.code',
        path: 'Observation.code',
        short: 'Special observation code'
      });
      expect(json.differential.element[1]).toEqual({
        id: 'Observation.value[x]',
        path: 'Observation.value[x]',
        min: 1
      });
    });
  });

  describe('#newElement', () => {
    it('should add a new element to the SD', () => {
      observation.newElement('extra');
      expect(observation.elements).toHaveLength(51);
      expect(observation.elements[50].id).toBe('Observation.extra');
      expect(observation.elements[50].path).toBe('Observation.extra');
    });
  });

  describe('#addElement', () => {
    it('should add an element in the right place', () => {
      observation.addElement(new ElementDefinition('Observation.meta.id'));
      expect(observation.elements).toHaveLength(51);
      expect(observation.elements[3].id).toBe('Observation.meta.id');
    });

    it('should add explicit choice element in the right place', () => {
      observation.addElement(new ElementDefinition('Observation.value[x]:valueQuantity'));
      expect(observation.elements).toHaveLength(51);
      expect(observation.elements[22].id).toBe('Observation.value[x]:valueQuantity');
    });
  });

  describe('#findElement', () => {
    it('should find an element by id', () => {
      const valueX = observation.findElement('Observation.value[x]');
      expect(valueX).toBeDefined();
      expect(valueX.short).toBe('Actual result');
    });
  });

  describe('#findElementByPath', () => {
    let respRate: StructureDefinition;
    beforeEach(() => {
      respRate = resolve('resprate');
    });

    // Simple paths (no brackets)
    it('should find an element by a path that exists', () => {
      const status = observation.findElementByPath('status', resolve);
      expect(status).toBeDefined();
      expect(status.id).toBe('Observation.status');
    });

    it('should find a choice element by a path that exists', () => {
      const valueX = observation.findElementByPath('value[x]', resolve);
      expect(valueX).toBeDefined();
      expect(valueX.id).toBe('Observation.value[x]');
    });

    it('should find an element with children by a path that exists', () => {
      const refRange = respRate.findElementByPath('referenceRange', resolve);
      expect(refRange).toBeDefined();
      expect(refRange.id).toBe('Observation.referenceRange');
    });

    it('should find a child element by a path that exists', () => {
      const refRangeLow = respRate.findElementByPath('referenceRange.low', resolve);
      expect(refRangeLow).toBeDefined();
      expect(refRangeLow.id).toBe('Observation.referenceRange.low');
    });

    it('should find the base element by an empty path', () => {
      const observationElement = observation.findElementByPath('', resolve);
      expect(observationElement).toBeDefined();
      expect(observationElement.id).toBe('Observation');
    });

    it('should not find an element by non-existent path', () => {
      const undefinedEl = observation.findElementByPath('foo', resolve);
      expect(undefinedEl).toBeUndefined();
    });

    // References
    it('should find a reference choice by path', () => {
      const basedOnNoChoice = observation.findElementByPath('basedOn', resolve);
      const basedOnChoice = observation.findElementByPath('basedOn[MedicationRequest]', resolve);
      expect(basedOnChoice).toBeDefined();
      expect(basedOnChoice.id).toBe('Observation.basedOn');
      expect(basedOnChoice).toBe(basedOnNoChoice);
    });

    it('should not find an incorrect reference choice by path', () => {
      const basedOn = observation.findElementByPath('basedOn[foo]', resolve);
      expect(basedOn).toBeUndefined();
    });

    // Slicing
    it('should find a sliced element by path', () => {
      const VSCat = respRate.findElementByPath('category[VSCat]', resolve);
      expect(VSCat).toBeDefined();
      expect(VSCat.id).toBe('Observation.category:VSCat');
    });

    it('should find a child of a sliced element by path', () => {
      const VSCatID = respRate.findElementByPath('category[VSCat].id', resolve);
      expect(VSCatID).toBeDefined();
      expect(VSCatID.id).toBe('Observation.category:VSCat.id');
    });

    it('should find a re-sliced element by path', () => {
      const jsonReslice = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../testhelpers/testdefs/patient-telecom-reslice-profile.json'),
          'utf-8'
        )
      );
      const reslice = StructureDefinition.fromJSON(jsonReslice);
      const emailWorkEmail = reslice.findElementByPath('telecom[email][workEmail]');
      expect(emailWorkEmail).toBeDefined();
      expect(emailWorkEmail.sliceName).toBe('email/workEmail');
    });

    // Choices
    it('should make explicit a non-existent choice element by path', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]');
      expect(valueX.slicing).toBeUndefined();
      const valueQuantity = observation.findElementByPath('valueQuantity', resolve);
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantity.slicing).toBeUndefined();
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.value[x]');
      expect(valueQuantity.min).toBe(0);
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(observation.elements.length).toBe(originalLength + 1);
    });

    it('should make explicit a non-existent choice element that must first be unfolded', () => {
      const originalLength = observation.elements.length;
      const valueQuantity = observation.findElementByPath(
        'extension.valueQuantity',
        getResolver(defs)
      );
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.extension.value[x]:valueQuantity');
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.extension.value[x]');
      expect(observation.elements.length).toBe(originalLength + 5);
    });

    it('should make explicit a non-existent choice element by child path', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]');
      expect(valueX.slicing).toBeUndefined();
      const valueQuantitySystem = observation.findElementByPath('valueQuantity.system', resolve);
      expect(valueQuantitySystem).toBeDefined();
      expect(valueQuantitySystem.id).toBe('Observation.value[x]:valueQuantity.system');
      expect(valueQuantitySystem.path).toBe('Observation.value[x].system');
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(observation.elements.length).toBe(originalLength + 8);
    });

    it('should find an already existing explicit choice element with slicing syntax', () => {
      const originalLength = respRate.elements.length;
      const valueQuantity = respRate.findElementByPath('value[x][valueQuantity]');
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(respRate.elements.length).toBe(originalLength);
    });

    it('should find an already existing explicit choice element with name replacement syntax', () => {
      const originalLength = respRate.elements.length;
      const valueQuantity = respRate.findElementByPath('valueQuantity');
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(respRate.elements.length).toBe(originalLength);
    });

    // Unfolding
    it('should find an element that must be unfolded by path', () => {
      const originalLength = observation.elements.length;
      const codeText = observation.findElementByPath('code.text', resolve);
      expect(codeText).toBeDefined();
      expect(codeText.id).toBe('Observation.code.text');
      expect(codeText.short).toBe('Plain text representation of the concept');
      expect(observation.elements.length).toBe(originalLength + 4);
    });
  });

  describe('#setInstancePropertyByPath', () => {
    let fooCode: FshCode;
    let barCode: FshCode;
    beforeEach(() => {
      fooCode = new FshCode('foo', 'http://example.com');
      barCode = new FshCode('bar', 'http://example.com');
    });

    // Simple values
    it('should set an instance property which has a value', () => {
      observation.setInstancePropertyByPath('version', '1.2.3', resolve);
      expect(observation.version).toBe('1.2.3');
    });

    it('should set an instance property which must be created', () => {
      observation.setInstancePropertyByPath('title', 'foo', resolve);
      expect(observation.title).toBe('foo');
    });

    it('should not set an instance property which is being fixed incorrectly', () => {
      expect(() => {
        observation.setInstancePropertyByPath('version', 1.2, resolve);
      }).toThrow('Cannot fix number value: 1.2. Value does not match element type: string');
      expect(observation.version).toBe('4.0.1');
    });

    // Simple values in an array
    it('should add an instance property at the end of an array', () => {
      observation.setInstancePropertyByPath('contact[2].telecom[0].value', 'foo', resolve);
      expect(observation.contact.length).toBe(3);
      expect(observation.contact[2]).toEqual({ telecom: [{ value: 'foo' }] });
    });

    it('should add an instance property in an array that must be empty filled', () => {
      observation.setInstancePropertyByPath('contact[4].telecom[0].value', 'foo', resolve);
      expect(observation.contact.length).toBe(5);
      expect(observation.contact[4]).toEqual({ telecom: [{ value: 'foo' }] });
      expect(observation.contact[3]).toBeNull();
      expect(observation.contact[2]).toBeNull();
    });

    it('should change an instance property in an array', () => {
      observation.setInstancePropertyByPath('contact[1].telecom[0].value', 'foo', resolve);
      expect(observation.contact.length).toBe(2);
      expect(observation.contact[1]).toEqual({ telecom: [{ value: 'foo', system: 'url' }] });
    });

    it('should change a part of an instance property in an array', () => {
      observation.setInstancePropertyByPath(
        'contact[0].telecom[0].period.start',
        '2019-11-25',
        resolve
      );
      expect(observation.contact.length).toBe(2);
      expect(observation.contact[0]).toEqual({
        telecom: [{ value: 'http://hl7.org/fhir', system: 'url', period: { start: '2019-11-25' } }]
      });
    });

    // Complex values
    it('should set a complex instance property on a newly created array', () => {
      observation.setInstancePropertyByPath('jurisdiction[0]', fooCode, resolve);
      expect(observation.jurisdiction.length).toBe(1);
      expect(observation.jurisdiction[0]).toEqual({
        coding: [{ code: 'foo', system: 'http://example.com' }]
      });
    });

    it('should set a complex instance property on a newly created array, with implied 0 index', () => {
      observation.setInstancePropertyByPath('jurisdiction', fooCode, resolve);
      expect(observation.jurisdiction.length).toBe(1);
      expect(observation.jurisdiction[0]).toEqual({
        coding: [{ code: 'foo', system: 'http://example.com' }]
      });
    });

    it('should set a complex instance property over a value that already exists', () => {
      observation.setInstancePropertyByPath('jurisdiction[0]', fooCode, resolve);
      observation.setInstancePropertyByPath('jurisdiction[0]', barCode, resolve);
      expect(observation.jurisdiction.length).toBe(1);
      expect(observation.jurisdiction[0]).toEqual({
        coding: [{ code: 'bar', system: 'http://example.com' }]
      });
    });

    it('should set a complex instance property on an existing array', () => {
      observation.setInstancePropertyByPath('jurisdiction[0]', fooCode, resolve);
      observation.setInstancePropertyByPath('jurisdiction[1]', barCode, resolve);
      expect(observation.jurisdiction.length).toBe(2);
      expect(observation.jurisdiction[0]).toEqual({
        coding: [{ code: 'foo', system: 'http://example.com' }]
      });
      expect(observation.jurisdiction[1]).toEqual({
        coding: [{ code: 'bar', system: 'http://example.com' }]
      });
    });

    // Children of primitives
    it('should set a child of a primitive instance property which has a value', () => {
      observation.setInstancePropertyByPath('version', 'foo', resolve);
      observation.setInstancePropertyByPath('version.id', 'bar', resolve);
      expect(observation.version).toBe('foo');
      // @ts-ignore
      expect(observation._version.id).toBe('bar');
    });

    it('should set a child of a primitive instance property array which has a value', () => {
      observation.setInstancePropertyByPath('contextInvariant[0]', 'foo', resolve);
      observation.setInstancePropertyByPath('contextInvariant[0].id', 'bar', resolve);
      expect(observation.contextInvariant.length).toBe(1);
      expect(observation.contextInvariant[0]).toBe('foo');
      // @ts-ignore
      expect(observation._contextInvariant[0].id).toBe('bar');
    });

    it('should set a child of a primitive instance property array and null fill the array', () => {
      observation.setInstancePropertyByPath('contextInvariant[1]', 'foo', resolve);
      observation.setInstancePropertyByPath('contextInvariant[1].id', 'bar', resolve);
      expect(observation.contextInvariant.length).toBe(2);
      expect(observation.contextInvariant[0]).toBeNull();
      expect(observation.contextInvariant[1]).toBe('foo');
      // @ts-ignore
      expect(observation._contextInvariant[0]).toBeNull();
      // @ts-ignore
      expect(observation._contextInvariant[1].id).toBe('bar');
    });

    // Invalid access
    it('should throw an InvalidElementAccessError when trying to access the snapshot', () => {
      expect(() => {
        observation.setInstancePropertyByPath('snapshot.element[0]', 'foo', resolve);
      }).toThrow('Cannot directly access differential or snapshot with path: snapshot.element[0]');
    });

    it('should throw an InvalidElementAccessError when trying to access the differential', () => {
      expect(() => {
        observation.setInstancePropertyByPath('differential.element[0]', 'foo', resolve);
      }).toThrow(
        'Cannot directly access differential or snapshot with path: differential.element[0]'
      );
    });
  });

  describe('#validateValueAtPath', () => {
    let structureDefinition: StructureDefinition;
    let respRate: StructureDefinition;
    let CSSPC: StructureDefinition;
    beforeEach(() => {
      structureDefinition = resolve('StructureDefinition');
      respRate = resolve('resprate');
      CSSPC = resolve('capabilitystatement-search-parameter-combination');
    });

    // Simple value
    it('should allow fixing an instance value', () => {
      const { fixedValue, pathParts } = structureDefinition.validateValueAtPath('version', '4.0.2');
      expect(fixedValue).toBe('4.0.2');
      expect(pathParts.length).toBe(1);
      expect(pathParts[0]).toEqual({ primitive: true, base: 'version' });
    });

    // Invalid paths
    it('should not allow fixing an instance value with an incorrect path', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('Version', '4.0.2');
      }).toThrow('Cannot resolve element from path: Version');
    });

    it('should not allow fixing an instance value with an incorrect value', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('version', true);
      }).toThrow('Cannot fix boolean value: true. Value does not match element type: string');
    });

    it('should not allow fixing an instance value with a 0 cardinality', () => {
      const version = structureDefinition.elements.find(
        e => e.id === 'StructureDefinition.version'
      );
      version.max = '0';
      expect(() => {
        structureDefinition.validateValueAtPath('version', '4.0.2');
      }).toThrow('Cannot resolve element from path: version');
    });

    // Arrays
    it('should allow fixing an instance value to an element in an array', () => {
      const { fixedValue, pathParts } = structureDefinition.validateValueAtPath(
        'identifier[0].value',
        'foo',
        resolve
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'identifier', brackets: ['0'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value' });
    });

    it('should allow fixing an instance value to an element in an array, with implied 0 index', () => {
      const { fixedValue, pathParts } = structureDefinition.validateValueAtPath(
        'identifier.value',
        'foo',
        resolve
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'identifier', brackets: ['0'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value' });
    });

    it('should allow fixing an instance value to an element in an array if the element was constrained from an array', () => {
      // code.coding[RespRateCode] has been constrained from 1..* to 1..1
      const { fixedValue, pathParts } = respRate.validateValueAtPath(
        'code.coding[RespRateCode].id',
        'foo',
        getResolver(defs)
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(3);
      expect(pathParts[0]).toEqual({ base: 'code' });
      expect(pathParts[1]).toEqual({ base: 'coding', brackets: ['RespRateCode', '0'] }); // 0 in path parts means value will be set in an array
      expect(pathParts[2]).toEqual({ primitive: true, base: 'id' });
    });

    it('should not allow using array brackets when an element is not an array', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('version[0]', 'foo', resolve);
      }).toThrow('Cannot resolve element from path: version[0]');
    });

    it('should not add an instance property in an array with negative index', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('contact[-1].telecom[0].value', 'foo', resolve);
      }).toThrow('Cannot resolve element from path: contact[-1].telecom[0].value');
    });

    it('should not add an instance property in an array with too large an index', () => {
      const contact = structureDefinition.elements.find(
        e => e.id === 'StructureDefinition.contact'
      );
      contact.max = '3';
      expect(() => {
        structureDefinition.validateValueAtPath('contact[4].telecom[0].value', 'foo', resolve);
      }).toThrow('Cannot resolve element from path: contact[4].telecom[0].value');
    });

    // Slices
    it('should allow fixing an instance value on a slice', () => {
      const { fixedValue, pathParts } = respRate.validateValueAtPath(
        'category[VSCat].coding[0].version',
        'foo',
        resolve
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(3);
      expect(pathParts[0]).toEqual({ base: 'category', brackets: ['VSCat', '0'] });
      expect(pathParts[1]).toEqual({ base: 'coding', brackets: ['0'] });
      expect(pathParts[2]).toEqual({ primitive: true, base: 'version' });
    });

    it('should allow fixing an instance value on a slice array', () => {
      const { fixedValue, pathParts } = CSSPC.validateValueAtPath(
        'extension[required][3].value[x]',
        'foo',
        resolve
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'extension', brackets: ['required', '3'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value[x]' });
    });

    it('should allow setting values directly on extensions by accessing indexes', () => {
      // This test also tests that we can access later indexes of an array that has been unfolded at other indexes
      // For example, extension[0].url has already been unfolded an has values fixed.
      // validateValueAtPath correctly validates values for extension[2]
      const { fixedValue, pathParts } = CSSPC.validateValueAtPath(
        'extension[2].url',
        'foo',
        getResolver(defs)
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'extension', brackets: ['2'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'url' });
    });
  });

  describe('#captureOriginalElements()', () => {
    it('should create a new starting point for diffs', () => {
      // Note: this is not as true a unit test as it should be since it is intertwined
      // with hasDiff(), but there isn't an easy way around this since _original is private.
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      observation.captureOriginalElements();
      expect(valueX.hasDiff()).toBeFalsy();
      valueX.min = 1;
      expect(valueX.hasDiff()).toBeTruthy();
    });
  });

  describe('#clearOriginalElements()', () => {
    it('should remove the starting point for diffs, making everything diff', () => {
      // Note: this is not as true a unit test as it should be since it is intertwined
      // with hasDiff(), but there isn't an easy way around this since _original is private.
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      observation.captureOriginalElements();
      expect(valueX.hasDiff()).toBeFalsy();
      valueX.clearOriginal();
      expect(valueX.hasDiff()).toBeTruthy();
    });
  });

  describe('#getReferenceName', () => {
    let basedOn: ElementDefinition;
    beforeEach(() => {
      basedOn = observation.findElement('Observation.basedOn');
    });

    it('should find the target when it exists', () => {
      const refTarget = observation.getReferenceName('basedOn[MedicationRequest]', basedOn);
      expect(refTarget).toBe('MedicationRequest');
    });

    it('should not find the target when it does not exist', () => {
      const refTarget = observation.getReferenceName('basedOn[foo]', basedOn);
      expect(refTarget).toBeUndefined();
    });

    it('should not find the target when there are no brackets', () => {
      const refTarget = observation.getReferenceName('basedOn', basedOn);
      expect(refTarget).toBeUndefined();
    });
  });
});
