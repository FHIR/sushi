import fs from 'fs';
import path from 'path';
import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { ElementDefinition } from '../../src/fhirtypes/ElementDefinition';
import { getResolver } from '../utils/getResolver';

describe('StructureDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  beforeAll(() => {
    defs = load('4.0.0');
    jsonObservation = defs.findResource('Observation');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
  });
  describe('#fromJSON', () => {
    it('should load a resource properly', () => {
      // Don't test everything, but get a sample anyway
      expect(observation.id).toBe('Observation');
      expect(observation.meta.lastUpdated).toBe('2018-12-27T22:37:54.724+11:00');
      expect(observation.extension).toHaveLength(6);
      expect(observation.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
        valueString: 'Clinical.Diagnostics'
      });
      expect(observation.elements).toHaveLength(50);
      const valueX = observation.elements[21];
      expect(valueX.id).toBe('Observation.value[x]');
      expect(valueX.path).toBe('Observation.value[x]');
      expect(valueX.min).toBe(0);
      expect(valueX.max).toBe('1');
      expect(valueX.type).toEqual([
        { code: 'Quantity' },
        { code: 'CodeableConcept' },
        { code: 'string' },
        { code: 'boolean' },
        { code: 'integer' },
        { code: 'Range' },
        { code: 'Ratio' },
        { code: 'SampledData' },
        { code: 'time' },
        { code: 'dateTime' },
        { code: 'Period' }
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
    let jsonRespRate: any;
    let respRate: StructureDefinition;
    beforeAll(() => {
      jsonRespRate = defs.findResource('resprate');
    });
    beforeEach(() => {
      respRate = StructureDefinition.fromJSON(jsonRespRate);
    });

    // Simple paths (no brackets)
    it('should find an element by a path that exists', () => {
      const status = observation.findElementByPath('status', getResolver(defs));
      expect(status).toBeDefined();
      expect(status.id).toBe('Observation.status');
    });

    it('should find a choice element by a path that exists', () => {
      const valueX = observation.findElementByPath('value[x]', getResolver(defs));
      expect(valueX).toBeDefined();
      expect(valueX.id).toBe('Observation.value[x]');
    });

    it('should find an element with children by a path that exists', () => {
      const refRange = respRate.findElementByPath('referenceRange', getResolver(defs));
      expect(refRange).toBeDefined();
      expect(refRange.id).toBe('Observation.referenceRange');
    });

    it('should find a child element by a path that exists', () => {
      const refRangeLow = respRate.findElementByPath('referenceRange.low', getResolver(defs));
      expect(refRangeLow).toBeDefined();
      expect(refRangeLow.id).toBe('Observation.referenceRange.low');
    });

    it('should find the base element by an empty path', () => {
      const observationElement = observation.findElementByPath('', getResolver(defs));
      expect(observationElement).toBeDefined();
      expect(observationElement.id).toBe('Observation');
    });

    it('should not find an element by non-existent path', () => {
      const undefinedEl = observation.findElementByPath('foo', getResolver(defs));
      expect(undefinedEl).toBeUndefined();
    });

    // References
    it('should find a reference choice by path', () => {
      const basedOnNoChoice = observation.findElementByPath('basedOn', getResolver(defs));
      const basedOnChoice = observation.findElementByPath(
        'basedOn[MedicationRequest]',
        getResolver(defs)
      );
      expect(basedOnChoice).toBeDefined();
      expect(basedOnChoice.id).toBe('Observation.basedOn');
      expect(basedOnChoice).toBe(basedOnNoChoice);
    });

    it('should not find an incorrect reference choice by path', () => {
      const basedOn = observation.findElementByPath('basedOn[foo]', getResolver(defs));
      expect(basedOn).toBeUndefined();
    });

    // Slicing
    it('should find a sliced element by path', () => {
      const VSCat = respRate.findElementByPath('category[VSCat]', getResolver(defs));
      expect(VSCat).toBeDefined();
      expect(VSCat.id).toBe('Observation.category:VSCat');
    });

    it('should find a child of a sliced element by path', () => {
      const VSCatID = respRate.findElementByPath('category[VSCat].id', getResolver(defs));
      expect(VSCatID).toBeDefined();
      expect(VSCatID.id).toBe('Observation.category:VSCat.id');
    });

    it('should find a re-sliced element by path', () => {
      const jsonReslice = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../fhirdefs/testdefs/patient-telecom-reslice-profile.json'),
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
      const valueQuantity = observation.findElementByPath('valueQuantity', getResolver(defs));
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.value[x]');
      expect(valueQuantity.min).toBe(0);
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(observation.elements.length).toBe(originalLength + 1);
    });

    it('should make explicit a non-existent choice element by child path', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]');
      expect(valueX.slicing).toBeUndefined();
      const valueQuantitySystem = observation.findElementByPath(
        'valueQuantity.system',
        getResolver(defs)
      );
      expect(valueQuantitySystem).toBeDefined();
      expect(valueQuantitySystem.id).toBe('Observation.value[x]:valueQuantity.system');
      expect(valueQuantitySystem.path).toBe('Observation.value[x].system');
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(observation.elements.length).toBe(originalLength + 8);
    });

    // Unfolding
    it('should find an element that must be unfolded by path', () => {
      const originalLength = observation.elements.length;
      const codeText = observation.findElementByPath('code.text', getResolver(defs));
      expect(codeText).toBeDefined();
      expect(codeText.id).toBe('Observation.code.text');
      expect(codeText.short).toBe('Plain text representation of the concept');
      expect(observation.elements.length).toBe(originalLength + 4);
    });
  });
});
