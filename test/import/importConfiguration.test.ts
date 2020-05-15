import path from 'path';
import fs from 'fs-extra';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { importConfiguration, YAMLConfiguration } from '../../src/import';
import { Configuration } from '../../src/fshtypes';

describe('importConfiguration', () => {
  let minYAML: YAMLConfiguration;
  beforeEach(() => {
    minYAML = {
      id: 'fhir.us.minimal',
      canonical: 'http://hl7.org/fhir/us/minimal',
      name: 'MinimalIG',
      status: 'draft',
      version: '1.0.0',
      fhirVersion: ['4.0.1'],
      copyrightYear: '2020+',
      releaseLabel: 'Build CI',
      template: 'hl7.fhir.template#0.0.5'
    };
    loggerSpy.reset();
  });

  it('should import minimal config', () => {
    const yamlPath = path.join(__dirname, 'fixtures', 'minimal-config.yaml');
    const yaml = fs.readFileSync(yamlPath, 'utf8');
    const actual = importConfiguration(yaml, yamlPath);
    const expected: Configuration = {
      filePath: yamlPath,
      id: 'fhir.us.minimal',
      canonical: 'http://hl7.org/fhir/us/minimal',
      url: 'http://hl7.org/fhir/us/minimal/ImplementationGuide/fhir.us.minimal',
      name: 'MinimalIG',
      status: 'draft',
      version: '1.0.0',
      fhirVersion: ['4.0.1'],
      parameters: [
        { code: 'copyrightyear', value: '2020+' },
        { code: 'releaselabel', value: 'Build CI' }
      ],
      template: 'hl7.fhir.template#0.0.5',
      packageId: 'fhir.us.minimal',
      FSHOnly: false
    };
    expect(actual).toEqual(expected);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should import example config', () => {
    const yamlPath = path.join(__dirname, 'fixtures', 'example-config.yaml');
    const yaml = fs.readFileSync(yamlPath, 'utf8');
    const actual = importConfiguration(yaml, yamlPath);
    const expected: Configuration = {
      filePath: yamlPath,
      id: 'fhir.us.example',
      canonical: 'http://hl7.org/fhir/us/example',
      url: 'http://hl7.org/fhir/us/example/ImplementationGuide/fhir.us.example',
      name: 'ExampleIG',
      title: 'HL7 FHIR Implementation Guide: Example IG Release 1 - US Realm | STU1',
      description: 'Example IG exercises many of the fields in a SUSHI configuration.',
      status: 'active',
      packageId: 'fhir.us.example',
      license: 'CC0-1.0',
      date: '2020-02-26',
      version: '1.0.0',
      fhirVersion: ['4.0.1'],
      template: 'hl7.fhir.template#0.0.5',
      publisher: 'HL7 FHIR Management Group',
      contact: [
        {
          name: 'HL7 FHIR Management Group',
          telecom: [
            { system: 'url', value: 'http://www.hl7.org/Special/committees/fhirmg' },
            { system: 'email', value: 'fmg@lists.HL7.org' }
          ]
        },
        {
          name: 'Bob Smith',
          telecom: [{ system: 'email', value: 'bobsmith@example.org', use: 'work' }]
        }
      ],
      jurisdiction: [
        {
          coding: [
            { code: 'US', system: 'urn:iso:std:iso:3166', display: 'United States of America' }
          ]
        }
      ],
      dependencies: [{ packageId: 'hl7.fhir.us.core', version: '3.1.0' }],
      global: [
        {
          type: 'Patient',
          profile: 'http://example.org/fhir/StructureDefinition/my-patient-profile'
        },
        {
          type: 'Encounter',
          profile: 'http://example.org/fhir/StructureDefinition/my-encounter-profile'
        }
      ],
      resources: [
        {
          reference: { reference: 'Patient/my-example-patient' },
          name: 'My Example Patient',
          description: 'An example Patient',
          exampleBoolean: true
        },
        { reference: { reference: 'Patient/bad-example' }, omit: true }
      ],
      groups: [
        {
          name: 'GroupA',
          description: 'The Alpha Group',
          resources: ['StructureDefinition/animal-patient', 'StructureDefinition/arm-procedure']
        },
        {
          name: 'GroupB',
          description: 'The Beta Group',
          resources: ['StructureDefinition/bark-control', 'StructureDefinition/bee-sting']
        }
      ],
      pages: [
        { nameUrl: 'index.md', title: 'Example Home' },
        { nameUrl: 'implementation.xml' },
        {
          nameUrl: 'examples.xml',
          title: 'Examples Overview',
          page: [{ nameUrl: 'simpleExamples.xml' }, { nameUrl: 'complexExamples.xml' }]
        }
      ],
      menu: [
        { name: 'Home', url: 'index.html' },
        {
          name: 'Artifacts',
          subMenu: [
            { name: 'Profiles', url: 'artifacts.html#2' },
            { name: 'Extensions', url: 'artifacts.html#3' },
            { name: 'Value Sets', url: 'artifacts.html#4' }
          ]
        },
        { name: 'Downloads', url: 'downloads.html' },
        { name: 'History', url: 'http://hl7.org/fhir/us/example/history.html' }
      ],
      parameters: [
        { code: 'copyrightyear', value: '2019+' },
        { code: 'releaselabel', value: 'STU1' },
        { code: 'excludettl', value: 'true' },
        { code: 'validation', value: 'allow-any-extensions' },
        { code: 'validation', value: 'no-broken-links' }
      ],
      history: {
        'package-id': 'fhir.us.example',
        canonical: 'http://hl7.org/fhir/us/example',
        title: 'HL7 FHIR Implementation Guide: Example IG Release 1 - US Realm | STU1',
        introduction: 'Example IG exercises many of the fields in a SUSHI configuration.',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://build.fhir.org/ig/HL7/example-ig/',
            status: 'ci-build',
            current: true
          },
          {
            version: '1.0.0',
            fhirversion: '4.0.1',
            date: '2020-03-06',
            desc: 'STU 1 Release',
            path: 'https://hl7.org/fhir/us/example/STU1/',
            status: 'trial-use',
            sequence: 'STU 1',
            current: true
          },
          {
            version: '0.9.1',
            fhirversion: '4.0.0',
            date: '2019-06-10',
            desc: 'Initial STU ballot (Sep 2019 Ballot)',
            path: 'https://hl7.org/fhir/us/example/2019Sep/',
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      },
      indexPageContent: 'Example Index Page Content',
      FSHOnly: false
    };
    expect(actual).toEqual(expected);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
  });

  it('should report an error and throw on an invalid YAML config', () => {
    expect(() => importConfiguration('foo', 'foo-config.yaml')).toThrow(
      'Invalid configuration YAML'
    );
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Configuration is not a valid YAML object\.\s*File: foo-config\.yaml/
    );
  });

  it('should report an error and throw on a YAML file with invalid entries', () => {
    const yamlPath = path.join(__dirname, 'fixtures', 'invalid-config.yaml');
    const invalidYaml = fs.readFileSync(yamlPath, 'utf8');
    expect(() => importConfiguration(invalidYaml, 'invalid-config.yaml')).toThrow(
      'Invalid configuration YAML'
    );
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Error parsing configuration: Map keys must be unique; "releaseLabel" is repeated\.\s*File: invalid-config\.yaml/
    );
  });

  describe('#id', () => {
    it('should import id as-is', () => {
      minYAML.id = 'my-id';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.id).toBe('my-id');
    });
    it('should report an error and throw if id is missing', () => {
      delete minYAML.id;
      expect(() => importConfiguration(minYAML, 'test-config.yaml')).toThrow(
        'Minimal config not met'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /SUSHI minimally requires the following configuration properties to start processing FSH: id, version, canonical, fhirVersion\.\s*File: test-config\.yaml/
      );
    });
  });

  describe('#meta', () => {
    it('should support fhir syntax for meta coded properties', () => {
      minYAML.meta = {
        security: [{ system: 'http://foo.org', code: 'bar', display: 'FooBar' }],
        tag: [{ system: 'http://foo.org', code: 'baz', display: 'FooBaz' }]
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.meta).toEqual({
        security: [{ system: 'http://foo.org', code: 'bar', display: 'FooBar' }],
        tag: [{ system: 'http://foo.org', code: 'baz', display: 'FooBaz' }]
      });
    });
    it('should support FSH syntax for meta coded properties', () => {
      minYAML.meta = {
        security: ['http://foo.org#bar "FooBar"'],
        tag: ['http://foo.org#baz "FooBaz"']
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.meta).toEqual({
        security: [{ system: 'http://foo.org', code: 'bar', display: 'FooBar' }],
        tag: [{ system: 'http://foo.org', code: 'baz', display: 'FooBaz' }]
      });
    });
    it('should report invalid FSH syntax for meta coded properties', () => {
      minYAML.meta = {
        security: ['foobar'],
        tag: ['foobaz']
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        /Invalid code format for meta\.security: foobar\s*File: test-config\.yaml/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid code format for meta\.tag: foobaz\s*File: test-config\.yaml/
      );
      expect(config.meta).toEqual({});
    });
  });

  describe('#implicitRules', () => {
    it('should import implicitRules as-is', () => {
      minYAML.implicitRules = 'http://foo.org/bar';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.implicitRules).toBe('http://foo.org/bar');
    });
  });

  describe('#language', () => {
    it('should support string for language', () => {
      minYAML.language = 'en';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.language).toBe('en');
    });
    it('should support code syntax for language', () => {
      minYAML.language = '#en';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.language).toBe('en');
    });
  });

  describe('#text', () => {
    it('should support fhir syntax for text.status', () => {
      minYAML.text = {
        status: 'empty',
        div: '<div></div>'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.text).toEqual({
        status: 'empty',
        div: '<div></div>'
      });
    });
    it('should support FSH syntax for text.status', () => {
      minYAML.text = {
        status: '#empty',
        div: '<div></div>'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.text).toEqual({
        status: 'empty',
        div: '<div></div>'
      });
    });
    it('should report invalid text.status code', () => {
      minYAML.text = {
        // @ts-ignore Type '"whoknows"' is not assignable to type '"empty" | "generated" ...'
        status: 'whoknows',
        div: '<div></div>'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid text\.status value: 'whoknows'\. Must be one of: 'generated','extensions','additional','empty'\.\s*File: test-config\.yaml/
      );
      expect(config.text.status).toBeUndefined();
    });
  });

  describe('#contained', () => {
    // NOTE: special FSH syntax concepts/quantities aren't available in contained resources
    it('should import contained as-is', () => {
      minYAML.contained = [
        {
          resourceType: 'Patient',
          id: 'bob',
          active: true
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.contained).toEqual([
        {
          resourceType: 'Patient',
          id: 'bob',
          active: true
        }
      ]);
    });
  });

  describe('#extension', () => {
    it('should import extension as-is', () => {
      minYAML.extension = [
        {
          url: 'http://extension.org/my-extension',
          // @ts-ignore Type '{ url: string; valueBoolean: boolean; }' is not assignable ...
          valueBoolean: true
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.extension).toEqual([
        {
          url: 'http://extension.org/my-extension',
          valueBoolean: true
        }
      ]);
    });
  });

  describe('#modifierExtension', () => {
    it('should import modifierExtension as-is', () => {
      minYAML.modifierExtension = [
        {
          url: 'http://extension.org/my-modifier-extension',
          // @ts-ignore Type '{ url: string; valueBoolean: boolean; }' is not assignable ...
          valueBoolean: true
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.modifierExtension).toEqual([
        {
          url: 'http://extension.org/my-modifier-extension',
          valueBoolean: true
        }
      ]);
    });
  });

  describe('#canonical', () => {
    it('should import canonical as-is', () => {
      minYAML.canonical = 'http://foo.org/some-canonical-url';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.canonical).toBe('http://foo.org/some-canonical-url');
    });
    it('should report an error and throw if canonical is missing', () => {
      delete minYAML.canonical;
      expect(() => importConfiguration(minYAML, 'test-config.yaml')).toThrow(
        'Minimal config not met'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /SUSHI minimally requires the following configuration properties to start processing FSH: id, version, canonical, fhirVersion\.\s*File: test-config\.yaml/
      );
    });
  });

  describe('#url', () => {
    it('should import url as-is if provided', () => {
      minYAML.url = 'http://foo.org/some-url/ImplementationGuide/my.guide';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.url).toBe('http://foo.org/some-url/ImplementationGuide/my.guide');
    });
    it('should default url based on canonical if url is not provided', () => {
      delete minYAML.url;
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.url).toBe(`${config.canonical}/ImplementationGuide/${config.id}`);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });

  describe('#version', () => {
    it('should support a single-component version when YAML parses it as a number', () => {
      // @ts-ignore Type '1' is not assignable to type 'string'
      minYAML.version = 1; // YAML parse will interpret 1 as a number, not a string
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.version).toBe('1');
    });
    it('should support a two-component version when YAML parses it as a number', () => {
      minYAML.version = 1.2; // YAML parse will interpret 1.2 as a number, not a string
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.version).toBe('1.2');
    });
    it('should report an error and throw if version is missing', () => {
      delete minYAML.version;
      expect(() => importConfiguration(minYAML, 'test-config.yaml')).toThrow(
        'Minimal config not met'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /SUSHI minimally requires the following configuration properties to start processing FSH: id, version, canonical, fhirVersion\.\s*File: test-config\.yaml/
      );
    });
  });

  describe('#name', () => {
    it('should import name as-is', () => {
      minYAML.name = 'MyIG';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.name).toBe('MyIG');
    });
    it('should report an error if name is missing', () => {
      delete minYAML.name;
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: name\s*File: test-config\.yaml/
      );
      expect(config.name).toBeUndefined();
    });
  });

  describe('#title', () => {
    it('should import title as-is', () => {
      minYAML.title = 'My IG';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.title).toBe('My IG');
    });
  });

  describe('#status', () => {
    it('should support string for status', () => {
      minYAML.status = 'draft';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.status).toBe('draft');
    });
    it('should support code syntax for status', () => {
      minYAML.status = '#draft';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.status).toBe('draft');
    });
    it('should report invalid status code', () => {
      // @ts-ignore Type '"whoknows"' is not assignable to type 'YAMLConfigurationStatus'.
      minYAML.status = 'married';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid status value: 'married'\. Must be one of: 'draft','active','retired','unknown'\.\s*File: test-config\.yaml/
      );
      expect(config.status).toBeUndefined();
    });
    it('should report an error if status is missing', () => {
      delete minYAML.status;
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: status\s*File: test-config\.yaml/
      );
      expect(config.status).toBeUndefined();
    });
  });

  describe('#experimental', () => {
    it('should import experimental as-is', () => {
      minYAML.experimental = true;
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.experimental).toBe(true);
    });
  });

  describe('#date', () => {
    it('should support a year-only date when YAML parses it as a number', () => {
      // @ts-ignore Type '2000' is not assignable to type 'string'
      minYAML.date = 2000; // YAML parse will interpret 2000 as a number, not a string
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.date).toBe('2000');
    });
  });

  describe('#publisher', () => {
    it('should convert single publisher with name only to publisher only', () => {
      minYAML.publisher = { name: 'Bob' };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.publisher).toBe('Bob');
      expect(config.contact).toBeUndefined();
    });
    it('should convert single publisher with name and contact info to publisher and contact', () => {
      minYAML.publisher = { name: 'Bob', email: 'bob@example.org', url: 'http://bob.example.org' };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.publisher).toBe('Bob');
      expect(config.contact).toEqual([
        {
          name: 'Bob',
          telecom: [
            { system: 'url', value: 'http://bob.example.org' },
            { system: 'email', value: 'bob@example.org' }
          ]
        }
      ]);
    });
    it('should convert multiple publishers to publisher and contacts', () => {
      minYAML.publisher = [
        { name: 'Bob', email: 'bob@example.org', url: 'http://bob.example.org' },
        { name: 'Sue', email: 'sue@example.org', url: 'http://sue.example.org' }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.publisher).toBe('Bob');
      expect(config.contact).toEqual([
        {
          name: 'Bob',
          telecom: [
            { system: 'url', value: 'http://bob.example.org' },
            { system: 'email', value: 'bob@example.org' }
          ]
        },
        {
          name: 'Sue',
          telecom: [
            { system: 'url', value: 'http://sue.example.org' },
            { system: 'email', value: 'sue@example.org' }
          ]
        }
      ]);
    });
  });

  describe('#contact', () => {
    it('should convert single-item contact to an array', () => {
      minYAML.contact = { name: 'Bob', telecom: [{ system: 'email', value: 'bob@example.com' }] };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.contact).toEqual([
        { name: 'Bob', telecom: [{ system: 'email', value: 'bob@example.com' }] }
      ]);
    });
    it('should support contact as an array', () => {
      minYAML.contact = [{ name: 'Bob', telecom: [{ system: 'email', value: 'bob@example.com' }] }];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.contact).toEqual([
        { name: 'Bob', telecom: [{ system: 'email', value: 'bob@example.com' }] }
      ]);
    });
    it('should translate codes for contact.telecom.use/system', () => {
      minYAML.contact = {
        name: 'Bob',
        telecom: [{ system: '#email', value: 'bob@example.com', use: '#work' }]
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.contact).toEqual([
        { name: 'Bob', telecom: [{ system: 'email', value: 'bob@example.com', use: 'work' }] }
      ]);
    });
    it('should report invalid telecom codes', () => {
      minYAML.contact = {
        name: 'Bob',
        // @ts-ignore Type ... is not assignable to type ...
        telecom: [{ system: '#carrier-pidgeon', value: 'bob@example.com', use: '#whateva' }]
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        /Invalid contact\.telecom\.system value: 'carrier-pidgeon'\. Must be one of: 'phone','fax','email','pager','url','sms','other'\.\s*File: test-config\.yaml/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid contact\.telecom\.use value: 'whateva'\. Must be one of: 'home','work','temp','old','mobile'\.\s*File: test-config\.yaml/
      );
      expect(config.contact[0].telecom[0].system).toBeUndefined();
      expect(config.contact[0].telecom[0].use).toBeUndefined();
    });
    it('should put contacts after publisher contact details', () => {
      minYAML.publisher = { name: 'Bob', email: 'bob@example.org', url: 'http://bob.example.org' };
      minYAML.contact = {
        name: 'Frank',
        telecom: [{ system: 'email', value: 'frank@example.com' }]
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.publisher).toBe('Bob');
      expect(config.contact).toEqual([
        {
          name: 'Bob',
          telecom: [
            { system: 'url', value: 'http://bob.example.org' },
            { system: 'email', value: 'bob@example.org' }
          ]
        },
        { name: 'Frank', telecom: [{ system: 'email', value: 'frank@example.com' }] }
      ]);
    });
  });

  describe('#description', () => {
    it('should copy description as-is', () => {
      minYAML.description = 'This is a great IG. Really great. The best.';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.description).toBe('This is a great IG. Really great. The best.');
    });
  });

  describe('#useContext', () => {
    it('should convert single-item useContext to an array', () => {
      minYAML.useContext = {
        code: {
          system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
          code: 'gender',
          display: 'Gender'
        },
        valueCodeableConcept: {
          coding: [
            {
              system: 'http://hl7.org/fhir/administrative-gender',
              code: 'female',
              display: 'Female'
            }
          ]
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'gender',
            display: 'Gender'
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://hl7.org/fhir/administrative-gender',
                code: 'female',
                display: 'Female'
              }
            ]
          }
        }
      ]);
    });
    it('should support useContext as an array', () => {
      minYAML.useContext = [
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'gender',
            display: 'Gender'
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://hl7.org/fhir/administrative-gender',
                code: 'female',
                display: 'Female'
              }
            ]
          }
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'gender',
            display: 'Gender'
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://hl7.org/fhir/administrative-gender',
                code: 'female',
                display: 'Female'
              }
            ]
          }
        }
      ]);
    });
    it('should translate codes for code and valueCodeableConcept', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#gender "Gender"',
        valueCodeableConcept: 'http://hl7.org/fhir/administrative-gender#female "Female"'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'gender',
            display: 'Gender'
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://hl7.org/fhir/administrative-gender',
                code: 'female',
                display: 'Female'
              }
            ]
          }
        }
      ]);
    });
    it('should report invalid FSH syntax for code and valueCodeableConcept', () => {
      minYAML.useContext = {
        code: 'gender',
        valueCodeableConcept: 'female'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        /Invalid code format for useContext\.code: gender\s*File: test-config\.yaml/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid code format for useContext\.valueCodeableConcept: female\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([{}]);
    });
    it('should translate codes for valueQuantity', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#age "Age Range"',
        // technically "age" uses valueRange, but no other contexts used valueQuantity either, so...
        valueQuantity: {
          code: '#a',
          system: 'http://unitsofmeasure.org',
          value: 50,
          comparator: '#>='
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'age',
            display: 'Age Range'
          },
          valueQuantity: {
            code: 'a',
            system: 'http://unitsofmeasure.org',
            value: 50,
            comparator: '>='
          }
        }
      ]);
    });
    // useContext should support FSH quantity syntax for quantity properties
    it('should translate quantity for valueQuantity', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#age "Age Range"',
        // technically "age" uses valueRange, but no other contexts used valueQuantity either, so...
        valueQuantity: "50 'a'"
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'age',
            display: 'Age Range'
          },
          valueQuantity: {
            code: 'a',
            system: 'http://unitsofmeasure.org',
            value: 50
          }
        }
      ]);
    });
    it('should report invalid FSH syntax for quantity', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#age "Age Range"',
        // technically "age" uses valueRange, but no other contexts used valueQuantity either, so...
        valueQuantity: '50 a' // NOTE: missing '' around unit
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid useContext\.valueQuantity value: 50 a\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'age',
            display: 'Age Range'
          }
        }
      ]);
    });
    it('should report invalid quantity.comparator code', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#age "Age Range"',
        // technically "age" uses valueRange, but no other contexts used valueQuantity either, so...
        valueQuantity: {
          code: '#a',
          system: 'http://unitsofmeasure.org',
          value: 50,
          // @ts-ignore Type '"!="' is not assignable to type '"<" | "<=" | ">=" | ">" | "#<" | ...'.
          comparator: '!='
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid useContext\.valueQuantity\.comparator value: '!='\. Must be one of: '<','<=','>=','>'\.\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'age',
            display: 'Age Range'
          },
          valueQuantity: {
            code: 'a',
            system: 'http://unitsofmeasure.org',
            value: 50
          }
        }
      ]);
    });
    it('should translate codes for valueRange', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#age "Age Range"',
        valueRange: {
          low: {
            code: '#a',
            system: 'http://unitsofmeasure.org',
            value: 50
          },
          high: {
            code: '#a',
            system: 'http://unitsofmeasure.org',
            value: 65
          }
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'age',
            display: 'Age Range'
          },
          valueRange: {
            low: {
              code: 'a',
              system: 'http://unitsofmeasure.org',
              value: 50
            },
            high: {
              code: 'a',
              system: 'http://unitsofmeasure.org',
              value: 65
            }
          }
        }
      ]);
    });
    it('should translate quantity for valueQuantity', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#age "Age Range"',
        valueRange: { low: "50 'a'", high: "65 'a'" }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'age',
            display: 'Age Range'
          },
          valueRange: {
            low: {
              code: 'a',
              system: 'http://unitsofmeasure.org',
              value: 50
            },
            high: {
              code: 'a',
              system: 'http://unitsofmeasure.org',
              value: 65
            }
          }
        }
      ]);
    });
    it('should report invalid FSH syntax for range low / high quantity', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#age "Age Range"',
        valueRange: { low: '50 a', high: '65 a' }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        /Invalid useContext\.valueRange\.low value: 50 a\s*File: test-config\.yaml/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid useContext\.valueRange\.high value: 65 a\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'age',
            display: 'Age Range'
          },
          valueRange: {}
        }
      ]);
    });
    it('should translate codes for valueReference', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#venue "Clinical Venue"',
        valueReference: {
          identifier: {
            use: '#official',
            type: 'http://terminology.hl7.org/CodeSystem/v2-0203#PRN "Provider number"',
            value: '123',
            assigner: {
              identifier: {
                use: '#temp',
                type: 'http://terminology.hl7.org/CodeSystem/v2-0203#TAX "Tax ID number"',
                value: 'abc'
              }
            }
          }
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'venue',
            display: 'Clinical Venue'
          },
          valueReference: {
            identifier: {
              use: 'official',
              type: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                    code: 'PRN',
                    display: 'Provider number'
                  }
                ]
              },
              value: '123',
              assigner: {
                identifier: {
                  use: 'temp',
                  type: {
                    coding: [
                      {
                        system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                        code: 'TAX',
                        display: 'Tax ID number'
                      }
                    ]
                  },
                  value: 'abc'
                }
              }
            }
          }
        }
      ]);
    });
    it('should report invalid FSH syntax for identifier.type', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#venue "Clinical Venue"',
        valueReference: {
          identifier: {
            use: '#official',
            type: 'PRN',
            value: '123',
            assigner: {
              identifier: {
                use: '#temp',
                type: 'TAX',
                value: 'abc'
              }
            }
          }
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        /Invalid code format for useContext\.valueReference\.identifier\.type: PRN\s*File: test-config\.yaml/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid code format for useContext\.valueReference\.identifier\.assigner\.identifier\.type: TAX\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'venue',
            display: 'Clinical Venue'
          },
          valueReference: {
            identifier: {
              use: 'official',
              value: '123',
              assigner: {
                identifier: {
                  use: 'temp',
                  value: 'abc'
                }
              }
            }
          }
        }
      ]);
    });
    it('should report invalid FSH identifier.use codes', () => {
      minYAML.useContext = {
        code: 'http://terminology.hl7.org/CodeSystem/usage-context-type#venue "Clinical Venue"',
        valueReference: {
          identifier: {
            // @ts-ignore Type '"#myob"' is not assignable to type '"temp" | "old" | "#temp" | ...'.
            use: '#myob',
            value: '123',
            assigner: {
              identifier: {
                // @ts-ignore Type '"#the-usual"' is not assignable to type '"temp" | "old" | ...'.
                use: '#the-usual',
                value: 'abc'
              }
            }
          }
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        /Invalid useContext\.valueReference\.identifier\.use value: 'myob'\. Must be one of: 'usual','official','temp','secondary','old'\.\s*File: test-config\.yaml/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid useContext\.valueReference\.identifier\.assigner\.identifier\.use value: 'the-usual'\. Must be one of: 'usual','official','temp','secondary','old'\.\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'venue',
            display: 'Clinical Venue'
          },
          valueReference: {
            identifier: {
              value: '123',
              assigner: {
                identifier: {
                  value: 'abc'
                }
              }
            }
          }
        }
      ]);
    });
    it('should report an error if useContext.code is missing', () => {
      // @ts-ignore Type '...' is not assignable to type ...
      minYAML.useContext = {
        valueCodeableConcept: {
          coding: [
            {
              system: 'http://hl7.org/fhir/administrative-gender',
              code: 'female',
              display: 'Female'
            }
          ]
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: useContext\.code\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([
        {
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://hl7.org/fhir/administrative-gender',
                code: 'female',
                display: 'Female'
              }
            ]
          }
        }
      ]);
    });
    it('should report an error if useContext.value[x] is missing', () => {
      // @ts-ignore Type '...' is not assignable to type ...
      minYAML.useContext = {
        code: {
          system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
          code: 'gender',
          display: 'Gender'
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: useContext\.value\[x\]\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'gender',
            display: 'Gender'
          }
        }
      ]);
    });
    it('should report an error if there is more than one useContext.value[x]', () => {
      // @ts-ignore Type '...' is not assignable to type ...
      minYAML.useContext = {
        code: {
          system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
          code: 'gender',
          display: 'Gender'
        },
        valueCodeableConcept: 'http://hl7.org/fhir/administrative-gender#female "Female"',
        valueQuantity: "50 'a'"
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Only one useContext.value\[x\] is allowed but found multiple: valueCodeableConcept, valueQuantity\s*File: test-config\.yaml/
      );
      expect(config.useContext).toEqual([
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
            code: 'gender',
            display: 'Gender'
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://hl7.org/fhir/administrative-gender',
                code: 'female',
                display: 'Female'
              }
            ]
          },
          valueQuantity: {
            code: 'a',
            system: 'http://unitsofmeasure.org',
            value: 50
          }
        }
      ]);
    });
  });

  describe('#jurisdiction', () => {
    it('should convert single-item jurisdiction to an array', () => {
      minYAML.jurisdiction = {
        coding: [
          {
            code: 'US',
            system: 'urn:iso:std:iso:3166',
            display: 'United States of America'
          }
        ]
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.jurisdiction).toEqual([
        {
          coding: [
            { code: 'US', system: 'urn:iso:std:iso:3166', display: 'United States of America' }
          ]
        }
      ]);
    });
    it('should support jurisdiction as an array', () => {
      minYAML.jurisdiction = [
        {
          coding: [
            { code: 'US', system: 'urn:iso:std:iso:3166', display: 'United States of America' }
          ]
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.jurisdiction).toEqual([
        {
          coding: [
            { code: 'US', system: 'urn:iso:std:iso:3166', display: 'United States of America' }
          ]
        }
      ]);
    });
    it('should translate jurisdiction codes', () => {
      minYAML.jurisdiction = ['urn:iso:std:iso:3166#US "United States of America"'];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.jurisdiction).toEqual([
        {
          coding: [
            { code: 'US', system: 'urn:iso:std:iso:3166', display: 'United States of America' }
          ]
        }
      ]);
    });
    it('should report invalid FSH syntax for jurisdiction', () => {
      minYAML.jurisdiction = ['merica'];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid code format for jurisdiction: merica\s*File: test-config\.yaml/
      );
      expect(config.jurisdiction).toBeUndefined();
    });
  });

  describe('#copyright', () => {
    it('should copy copyright as-is', () => {
      minYAML.copyright = 'Copyright Scaly Productions 2020';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.copyright).toBe('Copyright Scaly Productions 2020');
    });
  });

  describe('#packageId', () => {
    it('should use the id as packageId when packageId is not provided', () => {
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.packageId).toBe('fhir.us.minimal');
    });
    it('should use the packageId when it is provided', () => {
      minYAML.packageId = 'diff.package.id';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.id).toBe('fhir.us.minimal');
      expect(config.packageId).toBe('diff.package.id');
    });
  });

  describe('#license', () => {
    // license supports string or code syntax
    it('should support string for license', () => {
      minYAML.license = 'CC0-1.0';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.license).toBe('CC0-1.0');
    });
    it('should support code syntax for license', () => {
      minYAML.license = '#CC0-1.0';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.license).toBe('CC0-1.0');
    });
  });

  describe('#fhirVersion', () => {
    it('should support fhirVersion as an array', () => {
      minYAML.fhirVersion = ['4.0.1', '3.0.2'];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.fhirVersion).toEqual(['4.0.1', '3.0.2']);
    });
    it('should convert single-item fhirVersion to an array', () => {
      minYAML.fhirVersion = '4.0.1';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.fhirVersion).toEqual(['4.0.1']);
    });
    it('should support FSH syntax for fhirVersion', () => {
      // because... fhirVersion is actually a code!
      minYAML.fhirVersion = ['#4.0.1'];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.fhirVersion).toEqual(['4.0.1']);
    });
    it('should report an error and throw if fhirVersion is missing', () => {
      delete minYAML.fhirVersion;
      expect(() => importConfiguration(minYAML, 'test-config.yaml')).toThrow(
        'Minimal config not met'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /SUSHI minimally requires the following configuration properties to start processing FSH: id, version, canonical, fhirVersion\.\s*File: test-config\.yaml/
      );
    });
    it('should report an error and throw if fhirVersion is an empty array', () => {
      minYAML.fhirVersion = [];
      expect(() => importConfiguration(minYAML, 'test-config.yaml')).toThrow(
        'Minimal config not met'
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /SUSHI minimally requires the following configuration properties to start processing FSH: id, version, canonical, fhirVersion\.\s*File: test-config\.yaml/
      );
    });
  });

  describe('#dependencies', () => {
    it('should convert the dependencies map to a list', () => {
      minYAML.dependencies = {
        foo: '1.2.3',
        bar: '4.5.6'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.dependencies).toEqual([
        { packageId: 'foo', version: '1.2.3' },
        { packageId: 'bar', version: '4.5.6' }
      ]);
    });
    it('should convert the dependencies map to a list when YAML imports version as a number', () => {
      minYAML.dependencies = {
        // @ts-ignore Type '1' is not assignable to type 'string'
        foo: 1, // YAML parse will interpret 1 as a number, not a string
        // @ts-ignore Type '2.3' is not assignable to type 'string'
        bar: 2.3 // YAML parse will interpret 2.3 as a number, not a string
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.dependencies).toEqual([
        { packageId: 'foo', version: '1' },
        { packageId: 'bar', version: '2.3' }
      ]);
    });
  });

  describe('#global', () => {
    it('should convert the global map to a list', () => {
      minYAML.global = {
        Patient: 'http://example.org/fhir/StructureDefinition/my-patient-profile',
        Encounter: 'http://example.org/fhir/StructureDefinition/my-encounter-profile'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.global).toEqual([
        {
          type: 'Patient',
          profile: 'http://example.org/fhir/StructureDefinition/my-patient-profile'
        },
        {
          type: 'Encounter',
          profile: 'http://example.org/fhir/StructureDefinition/my-encounter-profile'
        }
      ]);
    });
    it('should convert the global array values to a list items', () => {
      minYAML.global = {
        Patient: [
          'http://example.org/fhir/StructureDefinition/my-patient-profile',
          'http://example.org/fhir/StructureDefinition/my-other-patient-profile'
        ],
        Encounter: [
          'http://example.org/fhir/StructureDefinition/my-encounter-profile',
          'http://example.org/fhir/StructureDefinition/my-other-encounter-profile'
        ]
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.global).toEqual([
        {
          type: 'Patient',
          profile: 'http://example.org/fhir/StructureDefinition/my-patient-profile'
        },
        {
          type: 'Patient',
          profile: 'http://example.org/fhir/StructureDefinition/my-other-patient-profile'
        },
        {
          type: 'Encounter',
          profile: 'http://example.org/fhir/StructureDefinition/my-encounter-profile'
        },
        {
          type: 'Encounter',
          profile: 'http://example.org/fhir/StructureDefinition/my-other-encounter-profile'
        }
      ]);
    });
  });

  describe('#groups', () => {
    it('should convert the groups map to a list', () => {
      minYAML.groups = {
        GroupA: {
          description: 'The Alpha Group',
          resources: ['StructureDefinition/animal-patient', 'StructureDefinition/arm-procedure']
        },
        GroupB: {
          description: 'The Beta Group',
          resources: ['StructureDefinition/bark-control', 'StructureDefinition/bee-sting']
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.groups).toEqual([
        {
          name: 'GroupA',
          description: 'The Alpha Group',
          resources: ['StructureDefinition/animal-patient', 'StructureDefinition/arm-procedure']
        },
        {
          name: 'GroupB',
          description: 'The Beta Group',
          resources: ['StructureDefinition/bark-control', 'StructureDefinition/bee-sting']
        }
      ]);
    });
  });

  describe('#resources', () => {
    it('should convert the resources map to a list', () => {
      minYAML.resources = {
        'Patient/my-example-patient': {
          name: 'My Example Patient',
          description: 'An example Patient',
          exampleBoolean: true
        },
        'Patient/my-other-example-patient': {
          name: 'My Other Example Patient',
          description: 'Another example Patient',
          exampleBoolean: true
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.resources).toEqual([
        {
          reference: { reference: 'Patient/my-example-patient' },
          name: 'My Example Patient',
          description: 'An example Patient',
          exampleBoolean: true
        },
        {
          reference: { reference: 'Patient/my-other-example-patient' },
          name: 'My Other Example Patient',
          description: 'Another example Patient',
          exampleBoolean: true
        }
      ]);
    });
    it('should support resources.[name].fhirVersion as an array', () => {
      minYAML.resources = {
        'Patient/my-example-patient': {
          fhirVersion: ['4.0.1']
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.resources).toEqual([
        {
          reference: { reference: 'Patient/my-example-patient' },
          fhirVersion: ['4.0.1']
        }
      ]);
    });
    it('should convert single-item resources.[name].fhirVersion to an array', () => {
      minYAML.resources = {
        'Patient/my-example-patient': {
          fhirVersion: '4.0.1'
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.resources).toEqual([
        {
          reference: { reference: 'Patient/my-example-patient' },
          fhirVersion: ['4.0.1']
        }
      ]);
    });
    it('should support FSH syntax for resource.fhirVersions', () => {
      minYAML.resources = {
        'Patient/my-example-patient': {
          fhirVersion: ['#4.0.1']
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.resources).toEqual([
        {
          reference: { reference: 'Patient/my-example-patient' },
          fhirVersion: ['4.0.1']
        }
      ]);
    });
    it('should convert omitted resources correctly', () => {
      minYAML.resources = {
        'Patient/my-bad-example-patient': 'omit',
        'Patient/my-other-bad-example-patient': '#omit'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.resources).toEqual([
        {
          reference: { reference: 'Patient/my-bad-example-patient' },
          omit: true
        },
        {
          reference: { reference: 'Patient/my-other-bad-example-patient' },
          omit: true
        }
      ]);
    });
  });

  describe('#pages', () => {
    it('should convert the pages map to a list', () => {
      minYAML.pages = {
        'index.md': {
          title: 'Example Home'
        },
        'implementation.xml': null,
        'examples.xml': {
          title: 'Examples Overview',
          'simpleExamples.xml': null,
          'complexExamples.xml': null
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.pages).toEqual([
        { nameUrl: 'index.md', title: 'Example Home' },
        { nameUrl: 'implementation.xml' },
        {
          nameUrl: 'examples.xml',
          title: 'Examples Overview',
          page: [{ nameUrl: 'simpleExamples.xml' }, { nameUrl: 'complexExamples.xml' }]
        }
      ]);
    });
    it('should support FSH syntax for pages.[name].generation', () => {
      minYAML.pages = {
        'index.md': {
          title: 'Example Home'
        },
        'examples.xml': {
          title: 'Examples',
          generation: '#html'
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.pages).toEqual([
        { nameUrl: 'index.md', title: 'Example Home' },
        {
          nameUrl: 'examples.xml',
          title: 'Examples',
          generation: 'html'
        }
      ]);
    });
    it('should report invalid generation codes', () => {
      minYAML.pages = {
        'index.md': {
          title: 'Example Home',
          // @ts-ignore Type '"electric"' is not assignable to type '"generated" | "#generated" ...'.
          generation: 'electric'
        },
        'examples.xml': {
          title: 'Examples Overview',
          'simpleExamples.xml': {
            // @ts-ignore Type '"gas"' is not assignable to type '"generated" | "#generated" ...'.
            generation: 'gas'
          }
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(
        /Invalid pages\[index\.md\]\.generation value: 'electric'\. Must be one of: 'html','markdown','xml','generated'\.\s*File: test-config\.yaml/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid pages\[examples\.xml\]\[simpleExamples\.xml\]\.generation value: 'gas'\. Must be one of: 'html','markdown','xml','generated'\.\s*File: test-config\.yaml/
      );
      expect(config.pages).toEqual([
        { nameUrl: 'index.md', title: 'Example Home' },
        {
          nameUrl: 'examples.xml',
          title: 'Examples Overview',
          page: [{ nameUrl: 'simpleExamples.xml' }]
        }
      ]);
    });
  });

  describe('#parameters', () => {
    it('should convert the parameters map to a list', () => {
      minYAML.parameters = {
        // @ts-ignore Type 'true' is not assignable to type 'string | string[]'.
        excludettl: true,
        validation: 'allow-any-extensions'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.parameters).toEqual([
        { code: 'copyrightyear', value: '2020+' },
        { code: 'releaselabel', value: 'Build CI' },
        { code: 'excludettl', value: 'true' },
        { code: 'validation', value: 'allow-any-extensions' }
      ]);
    });
    it('should convert parameter array values to list items', () => {
      minYAML.parameters = {
        validation: ['allow-any-extensions', 'no-broken-links']
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.parameters).toEqual([
        { code: 'copyrightyear', value: '2020+' },
        { code: 'releaselabel', value: 'Build CI' },
        { code: 'validation', value: 'allow-any-extensions' },
        { code: 'validation', value: 'no-broken-links' }
      ]);
    });
  });

  describe('#templates', () => {
    it('should support template as an array', () => {
      // NOTE: I don't know what values would actually be used; I made these up.
      minYAML.templates = [
        {
          code: 'page',
          source: 'page.xml',
          scope: 'global'
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.templates).toEqual([
        {
          code: 'page',
          source: 'page.xml',
          scope: 'global'
        }
      ]);
    });
    it('should convert single-item templates to an array', () => {
      // NOTE: I don't know what values would actually be used; I made these up.
      minYAML.templates = {
        code: 'page',
        source: 'page.xml',
        scope: 'global'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.templates).toEqual([
        {
          code: 'page',
          source: 'page.xml',
          scope: 'global'
        }
      ]);
    });
    it('should translate template.code if applicable', () => {
      // NOTE: I don't know what values would actually be used; I made these up.
      minYAML.templates = [
        {
          code: '#page',
          source: 'page.xml',
          scope: 'global'
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.templates).toEqual([
        {
          code: 'page',
          source: 'page.xml',
          scope: 'global'
        }
      ]);
    });
    it('should report an error if templates.code is missing', () => {
      minYAML.templates = [
        // @ts-ignore Property 'code' is missing in type...
        {
          source: 'page.xml',
          scope: 'global'
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: templates\.code\s*File: test-config\.yaml/
      );
      expect(config.templates).toEqual([
        {
          source: 'page.xml',
          scope: 'global'
        }
      ]);
    });
    it('should report an error if templates.source is missing', () => {
      minYAML.templates = [
        // @ts-ignore Property 'source' is missing in type...
        {
          code: 'page',
          scope: 'global'
        }
      ];
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: templates\.source\s*File: test-config\.yaml/
      );
      expect(config.templates).toEqual([
        {
          code: 'page',
          scope: 'global'
        }
      ]);
    });
  });

  describe('#template', () => {
    it('should copy template as-is', () => {
      minYAML.template = 'hl7.fhir.template#0.0.5';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.template).toBe('hl7.fhir.template#0.0.5');
    });
  });

  describe('#copyrightYear', () => {
    // some of these are a little redundant due to minimal-config, but that's OK
    it('should convert copyrightYear to a parameter', () => {
      minYAML.copyrightYear = '2019+';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.parameters[0]).toEqual({ code: 'copyrightyear', value: '2019+' });
    });
    it('should convert copyrightyear to a parameter', () => {
      delete minYAML.copyrightYear;
      minYAML.copyrightyear = '2020+';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.parameters[0]).toEqual({ code: 'copyrightyear', value: '2020+' });
    });
    it('should support copyrightYear when YAML imports it as a number', () => {
      // @ts-ignore Type '2020' is not assignable to type 'string'
      minYAML.copyrightYear = 2020; // YAML parse will interpret 2020 as a number, not a string
      let config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.parameters[0]).toEqual({ code: 'copyrightyear', value: '2020' });
      // @ts-ignore Type '2020' is not assignable to type 'string'
      delete minYAML.copyrightYear;
      minYAML.copyrightyear = 2020; // YAML parse will interpret 2020 as a number, not a string
      config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.parameters[0]).toEqual({ code: 'copyrightyear', value: '2020' });
    });
    it('should report an error if copyrightYear/copyrightyear is missing and FSHOnly is false', () => {
      delete minYAML.copyrightYear;
      minYAML.FSHOnly = false;
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: copyrightYear\s*File: test-config\.yaml/
      );
      expect(config.parameters.find(p => p.code === 'copyrightYear')).toBeUndefined();
    });
    it('should not report an error if copyrightYear/copyrightyear is missing and FSHOnly is true', () => {
      delete minYAML.copyrightYear;
      minYAML.FSHOnly = true;
      importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });

  describe('#releaseLabel', () => {
    // some of these are a little redundant due to minimal-config, but that's OK
    it('should convert releaseLabel to a parameter', () => {
      minYAML.releaseLabel = 'STU1';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.parameters[1]).toEqual({ code: 'releaselabel', value: 'STU1' });
    });
    it('should convert releaselabel to a parameter', () => {
      delete minYAML.releaseLabel;
      minYAML.releaselabel = 'STU2';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.parameters[1]).toEqual({ code: 'releaselabel', value: 'STU2' });
    });
    it('should report an error if releaseLabel/releaselabel is missing and FSHOnly is false', () => {
      delete minYAML.releaseLabel;
      minYAML.FSHOnly = false;
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: releaseLabel\s*File: test-config\.yaml/
      );
      expect(config.parameters.find(p => p.code === 'releaseLabel')).toBeUndefined();
    });
    it('should not report an error if releaseLabel/releaselabel is missing and and FSHOnly is true', () => {
      delete minYAML.releaseLabel;
      minYAML.FSHOnly = true;
      importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });

  describe('#menu', () => {
    it('should convert the menu map to a list', () => {
      minYAML.menu = {
        Home: 'index.html',
        Artifacts: {
          Profiles: 'artifacts.html#2',
          Extensions: 'artifacts.html#3',
          'Value Sets': 'artifacts.html#4'
        },
        Downloads: 'downloads.html',
        History: 'http://hl7.org/fhir/us/example/history.html'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.menu).toEqual([
        { name: 'Home', url: 'index.html' },
        {
          name: 'Artifacts',
          subMenu: [
            { name: 'Profiles', url: 'artifacts.html#2' },
            { name: 'Extensions', url: 'artifacts.html#3' },
            { name: 'Value Sets', url: 'artifacts.html#4' }
          ]
        },
        { name: 'Downloads', url: 'downloads.html' },
        { name: 'History', url: 'http://hl7.org/fhir/us/example/history.html' }
      ]);
    });
  });

  describe('#history', () => {
    it('should use default values for history where applicable', () => {
      minYAML.title = 'HL7 FHIR Implementation Guide: Minimal IG Release 1 - US Realm | STU1';
      minYAML.description = 'Minimal IG exercises only required fields in a SUSHI configuration.';
      minYAML.history = {
        current: 'http://build.fhir.org/ig/HL7/minimal-ig/'
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.history).toEqual({
        'package-id': 'fhir.us.minimal',
        canonical: 'http://hl7.org/fhir/us/minimal',
        title: 'HL7 FHIR Implementation Guide: Minimal IG Release 1 - US Realm | STU1',
        introduction: 'Minimal IG exercises only required fields in a SUSHI configuration.',
        list: [
          {
            version: 'current',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://build.fhir.org/ig/HL7/minimal-ig/',
            status: 'ci-build',
            current: true
          }
        ]
      });
    });
    it('should allow mix of default and provided values for history.current', () => {
      minYAML.title = 'HL7 FHIR Implementation Guide: Minimal IG Release 1 - US Realm | STU1';
      minYAML.description = 'Minimal IG exercises only required fields in a SUSHI configuration.';
      minYAML.history = {
        current: {
          fhirversion: '4.0.1',
          date: '2020-04-01',
          path: 'http://build.fhir.org/ig/HL7/example-ig/',
          sequence: 'STU 2'
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.history).toEqual({
        'package-id': 'fhir.us.minimal',
        canonical: 'http://hl7.org/fhir/us/minimal',
        title: 'HL7 FHIR Implementation Guide: Minimal IG Release 1 - US Realm | STU1',
        introduction: 'Minimal IG exercises only required fields in a SUSHI configuration.',
        list: [
          {
            version: 'current',
            fhirversion: '4.0.1',
            date: '2020-04-01',
            desc: 'Continuous Integration Build (latest in version control)',
            path: 'http://build.fhir.org/ig/HL7/example-ig/',
            status: 'ci-build',
            sequence: 'STU 2',
            current: true
          }
        ]
      });
    });
    it('should use provided values for history where applicable', () => {
      minYAML.title = 'HL7 FHIR Implementation Guide: Minimal IG Release 1 - US Realm | STU1';
      minYAML.description = 'Minimal IG exercises only required fields in a SUSHI configuration.';
      minYAML.history = {
        'package-id': 'fhir.us.other',
        canonical: 'http://hl7.org/fhir/us/other',
        title: 'HL7 FHIR Implementation Guide: Other IG Release 1 - US Realm | STU1',
        introduction: 'Other IG is other than the other IG.',
        current: {
          fhirversion: '4.0.1',
          date: '2020-04-01',
          desc: 'CI Build Release',
          path: 'http://build.fhir.org/ig/HL7/example-ig/',
          status: 'ci-build',
          sequence: 'STU 2',
          current: true
        },
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
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.history).toEqual({
        'package-id': 'fhir.us.other',
        canonical: 'http://hl7.org/fhir/us/other',
        title: 'HL7 FHIR Implementation Guide: Other IG Release 1 - US Realm | STU1',
        introduction: 'Other IG is other than the other IG.',
        list: [
          {
            version: 'current',
            fhirversion: '4.0.1',
            date: '2020-04-01',
            desc: 'CI Build Release',
            path: 'http://build.fhir.org/ig/HL7/example-ig/',
            status: 'ci-build',
            sequence: 'STU 2',
            current: true
          },
          {
            version: '1.0.0',
            fhirversion: '4.0.1',
            date: '2020-03-06',
            desc: 'STU 1 Release',
            path: 'https://hl7.org/fhir/us/example/STU1/',
            status: 'trial-use',
            sequence: 'STU 1',
            current: true
          },
          {
            version: '0.9.1',
            fhirversion: '4.0.0',
            date: '2019-06-10',
            desc: 'Initial STU ballot (Sep 2019 Ballot)',
            path: 'https://hl7.org/fhir/us/example/2019Sep/',
            status: 'ballot',
            sequence: 'STU 1'
          }
        ]
      });
    });
    it('should report invalid history.current.status code', () => {
      minYAML.history = {
        current: {
          path: 'http://build.fhir.org/ig/HL7/example-ig/',
          // @ts-ignore Type '"OK"' is not assignable to type '"ci-build" | "preview" | ... '.
          status: 'OK'
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid history\[current\]\.status value: 'OK'\. Must be one of: 'ci-build','preview','ballot','trial-use','update','normative','trial-use\+normative'\.\s*File: test-config\.yaml/
      );
      expect(config.history.list[0]).toEqual({
        version: 'current',
        desc: 'Continuous Integration Build (latest in version control)',
        path: 'http://build.fhir.org/ig/HL7/example-ig/',
        current: true
      });
    });
    it('should report an error if history.current is an object and path is missing', () => {
      minYAML.history = {
        // @ts-ignore Type '...' is not assignable to type 'YAMLConfigurationHistoryItem'.
        current: {
          fhirversion: '4.0.1'
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: history\[current]\.path\s*File: test-config\.yaml/
      );
      expect(config.history.list[0]).toEqual({
        version: 'current',
        desc: 'Continuous Integration Build (latest in version control)',
        status: 'ci-build',
        fhirversion: '4.0.1',
        current: true
      });
    });
    it('should report invalid history.[version].status code', () => {
      minYAML.history = {
        current: 'http://build.fhir.org/ig/HL7/minimal-ig/',
        '1.0.0': {
          fhirversion: '4.0.1',
          date: '2020-03-06',
          desc: 'STU 1 Release',
          path: 'https://hl7.org/fhir/us/example/STU1/',
          // @ts-ignore Type '"ready"' is not assignable to type '"ci-build" | "preview" | ... '.
          status: 'ready',
          sequence: 'STU 1',
          current: true
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Invalid history\[1\.0\.0\]\.status value: 'ready'\. Must be one of: 'ci-build','preview','ballot','trial-use','update','normative','trial-use\+normative'\.\s*File: test-config\.yaml/
      );
      expect(config.history.list[1]).toEqual({
        version: '1.0.0',
        date: '2020-03-06',
        desc: 'STU 1 Release',
        path: 'https://hl7.org/fhir/us/example/STU1/',
        sequence: 'STU 1',
        fhirversion: '4.0.1',
        current: true
      });
    });
    it('should report an error if history.[version].date is missing', () => {
      minYAML.history = {
        current: 'http://build.fhir.org/ig/HL7/minimal-ig/',
        '1.0.0': {
          fhirversion: '4.0.1',
          desc: 'STU 1 Release',
          path: 'https://hl7.org/fhir/us/example/STU1/',
          status: 'trial-use',
          sequence: 'STU 1',
          current: true
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: history\[1\.0\.0\]\.date\s*File: test-config\.yaml/
      );
      expect(config.history.list[1]).toEqual({
        version: '1.0.0',
        desc: 'STU 1 Release',
        path: 'https://hl7.org/fhir/us/example/STU1/',
        status: 'trial-use',
        sequence: 'STU 1',
        fhirversion: '4.0.1',
        current: true
      });
    });
    it('should report an error if history.[version].desc is missing', () => {
      minYAML.history = {
        current: 'http://build.fhir.org/ig/HL7/minimal-ig/',
        '1.0.0': {
          fhirversion: '4.0.1',
          date: '2020-03-06',
          path: 'https://hl7.org/fhir/us/example/STU1/',
          status: 'trial-use',
          sequence: 'STU 1',
          current: true
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: history\[1\.0\.0\]\.desc\s*File: test-config\.yaml/
      );
      expect(config.history.list[1]).toEqual({
        version: '1.0.0',
        date: '2020-03-06',
        path: 'https://hl7.org/fhir/us/example/STU1/',
        status: 'trial-use',
        sequence: 'STU 1',
        fhirversion: '4.0.1',
        current: true
      });
    });
    it('should report an error if history.[version].path is missing', () => {
      minYAML.history = {
        current: 'http://build.fhir.org/ig/HL7/minimal-ig/',
        // @ts-ignore Type '...' is not assignable to type ...
        '1.0.0': {
          fhirversion: '4.0.1',
          date: '2020-03-06',
          desc: 'STU 1 Release',
          status: 'trial-use',
          sequence: 'STU 1',
          current: true
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: history\[1\.0\.0\]\.path\s*File: test-config\.yaml/
      );
      expect(config.history.list[1]).toEqual({
        version: '1.0.0',
        date: '2020-03-06',
        desc: 'STU 1 Release',
        status: 'trial-use',
        sequence: 'STU 1',
        fhirversion: '4.0.1',
        current: true
      });
    });
    it('should report an error if history.[version].status is missing', () => {
      minYAML.history = {
        current: 'http://build.fhir.org/ig/HL7/minimal-ig/',
        '1.0.0': {
          fhirversion: '4.0.1',
          date: '2020-03-06',
          desc: 'STU 1 Release',
          path: 'https://hl7.org/fhir/us/example/STU1/',
          sequence: 'STU 1',
          current: true
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: history\[1\.0\.0\]\.status\s*File: test-config\.yaml/
      );
      expect(config.history.list[1]).toEqual({
        version: '1.0.0',
        date: '2020-03-06',
        desc: 'STU 1 Release',
        path: 'https://hl7.org/fhir/us/example/STU1/',
        sequence: 'STU 1',
        fhirversion: '4.0.1',
        current: true
      });
    });
    it('should report an error if history.[version].sequence is missing', () => {
      minYAML.history = {
        current: 'http://build.fhir.org/ig/HL7/minimal-ig/',
        '1.0.0': {
          fhirversion: '4.0.1',
          date: '2020-03-06',
          desc: 'STU 1 Release',
          path: 'https://hl7.org/fhir/us/example/STU1/',
          status: 'trial-use',
          current: true
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: history\[1\.0\.0\]\.sequence\s*File: test-config\.yaml/
      );
      expect(config.history.list[1]).toEqual({
        version: '1.0.0',
        date: '2020-03-06',
        desc: 'STU 1 Release',
        path: 'https://hl7.org/fhir/us/example/STU1/',
        status: 'trial-use',
        fhirversion: '4.0.1',
        current: true
      });
    });
    it('should report an error if history.[version].fhirVersion is missing', () => {
      minYAML.history = {
        current: 'http://build.fhir.org/ig/HL7/minimal-ig/',
        '1.0.0': {
          date: '2020-03-06',
          desc: 'STU 1 Release',
          path: 'https://hl7.org/fhir/us/example/STU1/',
          status: 'trial-use',
          sequence: 'STU 1',
          current: true
        }
      };
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Configuration missing required property: history\[1\.0\.0\]\.fhirVersion\s*File: test-config\.yaml/
      );
      expect(config.history.list[1]).toEqual({
        version: '1.0.0',
        date: '2020-03-06',
        desc: 'STU 1 Release',
        path: 'https://hl7.org/fhir/us/example/STU1/',
        status: 'trial-use',
        sequence: 'STU 1',
        current: true
      });
    });
  });

  describe('#indexPageContent', () => {
    it('should copy indexPageContent as-is', () => {
      minYAML.indexPageContent = 'This is a great index. Really great. The best.';
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.indexPageContent).toBe('This is a great index. Really great. The best.');
    });
  });

  describe('#FSHOnly', () => {
    it('should copy FSHOnly as-is', () => {
      minYAML.FSHOnly = true;
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.FSHOnly).toBe(true);
    });

    it('should default FSHOnly to false when not specified', () => {
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(config.FSHOnly).toBe(false);
    });

    it('should report a warning if FSHOnly is true and unused properties are given', () => {
      minYAML.menu = { Home: 'index.html' };
      minYAML.contained = [{ resourceType: 'Patient' }];
      minYAML.FSHOnly = true;
      const config = importConfiguration(minYAML, 'test-config.yaml');
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /The following properties are unused and only relevant for IG creation: contained, parameters, template, menu.*File: test-config.yaml/s
      );
      expect(config.FSHOnly).toBe(true);
    });
  });
});
