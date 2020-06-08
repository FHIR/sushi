import path from 'path';
import 'jest-extended';
import fs from 'fs-extra';
import YAML from 'yaml';
import { YAMLConfiguration } from '../../src/import/YAMLConfiguration';

describe('YAMLConfiguration', () => {
  describe('#yaml-parse', () => {
    it('should parse the YAML correctly', () => {
      const configYAML = fs.readFileSync(
        path.join(__dirname, 'fixtures', 'example-config.yaml'),
        'utf8'
      );
      const config: YAMLConfiguration = YAML.parse(configYAML);
      expect(config.id).toBe('fhir.us.example');
      expect(config.canonical).toBe('http://hl7.org/fhir/us/example');
      expect(config.url).toBe('http://hl7.org/fhir/us/example/ImplementationGuide/fhir.us.example');
      expect(config.name).toBe('ExampleIG');
      expect(config.title).toBe(
        'HL7 FHIR Implementation Guide: Example IG Release 1 - US Realm | STU1'
      );
      expect(config.description).toBe(
        'Example IG exercises many of the fields in a SUSHI configuration.'
      );
      expect(config.status).toBe('active');
      expect(config.license).toBe('CC0-1.0');
      expect(config.date).toBe('2020-02-26');
      expect(config.version).toBe('1.0.0');
      expect(config.fhirVersion).toBe('4.0.1');
      expect(config.template).toBe('hl7.fhir.template#0.0.5');
      expect(config.copyrightYear).toBe('2019+');
      expect(config.releaseLabel).toBe('STU1');
      expect(config.publisher).toEqual({
        name: 'HL7 FHIR Management Group',
        url: 'http://www.hl7.org/Special/committees/fhirmg',
        email: 'fmg@lists.HL7.org'
      });
      expect(config.contact).toEqual([
        {
          name: 'Bob Smith',
          telecom: [
            {
              system: 'email',
              value: 'bobsmith@example.org',
              use: 'work'
            }
          ]
        }
      ]);
      expect(config.jurisdiction).toBe('urn:iso:std:iso:3166#US "United States of America"');
      expect(config.dependencies).toEqual({
        'hl7.fhir.us.core': '3.1.0'
      });
      expect(config.global).toEqual({
        Patient: 'http://example.org/fhir/StructureDefinition/my-patient-profile',
        Encounter: 'http://example.org/fhir/StructureDefinition/my-encounter-profile'
      });
      expect(config.resources).toEqual({
        'Patient/my-example-patient': {
          name: 'My Example Patient',
          description: 'An example Patient',
          exampleBoolean: true
        },
        'Patient/bad-example': 'omit'
      });
      expect(config.groups).toEqual({
        GroupA: {
          description: 'The Alpha Group',
          resources: ['StructureDefinition/animal-patient', 'StructureDefinition/arm-procedure']
        },
        GroupB: {
          description: 'The Beta Group',
          resources: ['StructureDefinition/bark-control', 'StructureDefinition/bee-sting']
        }
      });
      expect(config.pages).toEqual({
        'index.md': {
          title: 'Example Home'
        },
        'implementation.xml': null,
        'examples.xml': {
          title: 'Examples Overview',
          'simpleExamples.xml': null,
          'complexExamples.xml': null
        }
      });
      expect(config.menu).toEqual({
        Home: 'index.html',
        Artifacts: {
          Profiles: 'artifacts.html#2',
          Extensions: 'artifacts.html#3',
          'Value Sets': 'artifacts.html#4'
        },
        Downloads: 'downloads.html',
        History: 'http://hl7.org/fhir/us/example/history.html',
        'FHIR Spec': 'new-tab external http://hl7.org/fhir/R4/index.html'
      });
      expect(config.parameters).toEqual({
        excludettl: true,
        validation: ['allow-any-extensions', 'no-broken-links']
      });
      expect(config.history).toEqual({
        current: 'http://build.fhir.org/ig/HL7/example-ig/',
        '1.0.0': {
          fhirversion: '4.0.1',
          date: '2020-03-06',
          desc: 'STU 1 Release',
          path: 'https://hl7.org/fhir/us/example/STU1/',
          status: 'trial-use',
          sequence: 'STU 1',
          current: true
        },
        '0.9.1': {
          fhirversion: '4.0.0',
          date: '2019-06-10',
          desc: 'Initial STU ballot (Sep 2019 Ballot)',
          path: 'https://hl7.org/fhir/us/example/2019Sep/',
          status: 'ballot',
          sequence: 'STU 1'
        }
      });
    });
  });
});
