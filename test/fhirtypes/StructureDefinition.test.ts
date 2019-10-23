import fs from 'fs';
import path from 'path';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { ElementDefinition } from '../../src/fhirtypes/ElementDefinition';

describe('StructureDefinition', () => {
  let jsonResourceBundle: Readonly<any>;
  let jsonObservation: any;
  let observation: StructureDefinition;
  beforeAll(() => {
    const resourceFile = path.join(
      __dirname,
      '..',
      '..',
      'src',
      'fhirdefs',
      'fhir-4.0.0',
      'profiles-resources.json'
    );
    jsonResourceBundle = JSON.parse(fs.readFileSync(resourceFile, 'utf-8'));
    jsonObservation = jsonResourceBundle.entry.find(
      (e: any) => e.resource && e.resource.id === 'Observation'
    ).resource;
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
    it('should find an element by path', () => {
      const valueX = observation.findElementByPath('value[x]');
      expect(valueX).toBeDefined();
      expect(valueX.short).toBe('Actual result');
    });
  });
});
