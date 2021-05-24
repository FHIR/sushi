import path from 'path';
import fs from 'fs-extra';
import temp from 'temp';
import YAML from 'yaml';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { ensureConfiguration } from '../../src/import';

describe('ensureConfigurationFile', () => {
  // Track temp files/folders for cleanup
  temp.track();

  afterAll(() => {
    temp.cleanupSync();
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  it('should return the path to a pre-existing sushi-config.yaml', () => {
    const tank = path.join(__dirname, 'fixtures', 'existing-sushi-config-yaml');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    // Generating a config causes a warning, so there should be NO warnings in this case
    expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
  });

  it('should return the path to a pre-existing sushi-config.yml', () => {
    const tank = path.join(__dirname, 'fixtures', 'existing-sushi-config-yml');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yml'));
    // Generating a config causes a warning, so there should be NO warnings in this case
    expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
  });

  it('should log an error and not return a path if there is a pre-existing config.yaml (deprecated)', () => {
    const tank = path.join(__dirname, 'fixtures', 'existing-config-yaml');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(undefined);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(/Use of config\.yaml is deprecated/);
  });

  it('should log an error and not return a path if there is a pre-existing config.yml (deprecated', () => {
    const tank = path.join(__dirname, 'fixtures', 'existing-config-yml');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(undefined);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(/Use of config\.yml is deprecated/);
  });

  it('should return undefined on an empty folder when fromScratch is false', () => {
    const tank = temp.mkdirSync('sushi-test');
    const configPath = ensureConfiguration(tank, false);
    expect(configPath).toBeUndefined();
    // Generating a config causes a warning, so there should be NO warnings in this case
    expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
  });

  it('should generate a default config on an empty folder when fromScratch is true', () => {
    const tank = temp.mkdirSync('sushi-test');
    const configPath = ensureConfiguration(tank, true);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getLastMessage('warn')).toBe(
      `Generated new configuration file: ${configPath}. Please review to ensure configuration is correct.`
    );
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);
    // Test the formal YAML contents
    expect(configJSON).toEqual({
      id: 'example-ig',
      canonical: 'http://example.org/fhir',
      version: '0.0.1',
      name: 'ExampleIG',
      title: 'Example IG',
      status: 'active',
      publisher: {
        name: 'Example Publisher',
        url: 'http://example.org/committee',
        email: 'publisher@example.org'
      },
      description:
        'This is an example IG description. You should uncomment and replace it with your own.',
      license: 'CC0-1.0',
      fhirVersion: '4.0.1',
      parameters: {
        'show-inherited-invariants': false
      },
      copyrightYear: `${new Date().getFullYear()}+`,
      releaseLabel: 'CI Build',
      menu: {
        'IG Home': 'index.html',
        'Table of Contents': 'toc.html',
        'Artifact Index': 'artifacts.html',
        Support: {
          'FHIR Spec': 'new-tab http://hl7.org/fhir/R4/index.html'
        }
      },
      indexPageContent:
        'This is an example IG description. You should uncomment and replace it with your own.'
    });
    // Test at least one of the comments
    expect(configText).toMatch(
      'ACTION REQUIRED: EDIT THIS FILE TO ENSURE IT ACCURATELY REFLECTS YOUR PROJECT!'
    );
    expect(configText).toMatch(
      'To use a provided ig-data/input/includes/menu.xml file, delete the "menu" property below.'
    );
  });

  it('should generate an appropriate config for a tank w/ only a package.json', () => {
    // Copy the fixture to a temp folder since we actually create files in the tank
    const tank = temp.mkdirSync('sushi-test');
    fs.copySync(path.join(__dirname, 'fixtures', 'package-json-only'), tank);
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getLastMessage('warn')).toBe(
      `Generated new configuration file: ${configPath}. Please review to ensure configuration is correct.`
    );
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);

    // Test the formal YAML contents
    expect(configJSON).toEqual({
      id: 'sushi-test',
      canonical: 'http://hl7.org/fhir/sushi-test',
      version: '0.1.0',
      name: 'FSHTestIG',
      title: 'FSH Test IG',
      status: 'active',
      publisher: {
        name: 'James Tuna',
        url: 'https://tunafish.org/',
        email: 'tuna@reef.gov'
      },
      description: 'Provides a simple example of how FSH can be used to create an IG',
      license: 'CC0-1.0',
      fhirVersion: '4.0.1',
      dependencies: { 'hl7.fhir.us.core': '3.1.0', 'hl7.fhir.uv.vhdir': 'current' },
      parameters: { 'show-inherited-invariants': false },
      copyrightYear: '2021+',
      releaseLabel: 'CI Build',
      menu: {
        'IG Home': 'index.html',
        'Table of Contents': 'toc.html',
        'Artifact Index': 'artifacts.html',
        Support: { 'FHIR Spec': 'new-tab http://hl7.org/fhir/R4/index.html' }
      },
      indexPageContent: 'Provides a simple example of how FSH can be used to create an IG',
      FSHOnly: true
    });

    // Test at least one of the comments
    expect(configText).toMatch(
      'ACTION REQUIRED: REVIEW AND EDIT THIS FILE TO ENSURE IT ACCURATELY REFLECTS YOUR PROJECT!'
    );
    expect(configText).toMatch(
      'To use a provided ig-data/input/includes/menu.xml file, delete the "menu" property below.'
    );
  });

  it('should generate an appropriate config for a tank w/ minimal package.json', () => {
    // Copy the fixture to a temp folder since we actually create files in the tank
    const tank = temp.mkdirSync('sushi-test');
    fs.copySync(path.join(__dirname, 'fixtures', 'package-json-only'), tank);

    // Tweak the JSON to remove optional fields
    const packageJSON = fs.readJsonSync(path.join(tank, 'package.json'));
    delete packageJSON.url;
    delete packageJSON.title;
    delete packageJSON.description;
    delete packageJSON.dependencies;
    delete packageJSON.author;
    delete packageJSON.maintainers;
    delete packageJSON.license;
    fs.writeJsonSync(path.join(tank, 'package.json'), packageJSON);

    // ensureConfiguration
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getLastMessage('warn')).toBe(
      `Generated new configuration file: ${configPath}. Please review to ensure configuration is correct.`
    );
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);

    // Test the formal YAML contents
    expect(configJSON).toEqual({
      id: 'sushi-test',
      canonical: 'http://hl7.org/fhir/sushi-test',
      version: '0.1.0',
      name: 'sushitest', // now based on package.name
      title: 'sushi-test', // now based on package.name
      status: 'active',
      // No longer any publisher, description, license, dependencies
      fhirVersion: '4.0.1',
      parameters: { 'show-inherited-invariants': false },
      copyrightYear: '2021+',
      releaseLabel: 'CI Build',
      menu: {
        'IG Home': 'index.html',
        'Table of Contents': 'toc.html',
        'Artifact Index': 'artifacts.html',
        Support: { 'FHIR Spec': 'new-tab http://hl7.org/fhir/R4/index.html' }
      },
      indexPageContent: '',
      FSHOnly: true
    });
  });

  it('should generate an appropriate config for a tank w/ multiple maintainers in package.json', () => {
    // Copy the fixture to a temp folder since we actually create files in the tank
    const tank = temp.mkdirSync('sushi-test');
    fs.copySync(path.join(__dirname, 'fixtures', 'package-json-only'), tank);

    // Tweak the JSON to change the first maintainer to not match publisher and add others
    const packageJSON = fs.readJsonSync(path.join(tank, 'package.json'));
    packageJSON.maintainers = [
      {
        name: 'Bill Cod',
        email: 'cod@reef.gov',
        url: 'https://capecodfishermen.org/'
      },
      {
        name: 'Mack Mackeral',
        email: 'mackeral@reef.gov',
        url: 'https://mackdaddy.org/'
      }
    ];
    fs.writeJsonSync(path.join(tank, 'package.json'), packageJSON);

    // ensureConfiguration
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getLastMessage('warn')).toBe(
      `Generated new configuration file: ${configPath}. Please review to ensure configuration is correct.`
    );
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);

    // Test the formal YAML contents
    expect(configJSON).toEqual({
      id: 'sushi-test',
      canonical: 'http://hl7.org/fhir/sushi-test',
      version: '0.1.0',
      name: 'FSHTestIG',
      title: 'FSH Test IG',
      status: 'active',
      publisher: 'James Tuna', // No url or email since no maintainer matched the name
      contact: [
        // new contacts based on maintainers
        {
          name: 'Bill Cod',
          telecom: [
            {
              system: 'url',
              value: 'https://capecodfishermen.org/'
            },
            {
              system: 'email',
              value: 'cod@reef.gov'
            }
          ]
        },
        {
          name: 'Mack Mackeral',
          telecom: [
            {
              system: 'url',
              value: 'https://mackdaddy.org/'
            },
            {
              system: 'email',
              value: 'mackeral@reef.gov'
            }
          ]
        }
      ],
      description: 'Provides a simple example of how FSH can be used to create an IG',
      license: 'CC0-1.0',
      fhirVersion: '4.0.1',
      dependencies: { 'hl7.fhir.us.core': '3.1.0', 'hl7.fhir.uv.vhdir': 'current' },
      parameters: { 'show-inherited-invariants': false },
      copyrightYear: '2021+',
      releaseLabel: 'CI Build',
      menu: {
        'IG Home': 'index.html',
        'Table of Contents': 'toc.html',
        'Artifact Index': 'artifacts.html',
        Support: { 'FHIR Spec': 'new-tab http://hl7.org/fhir/R4/index.html' }
      },
      indexPageContent: 'Provides a simple example of how FSH can be used to create an IG',
      FSHOnly: true
    });
  });

  it('should generate an appropriate config for a tank w/ R5 package.json', () => {
    // Copy the fixture to a temp folder since we actually create files in the tank
    const tank = temp.mkdirSync('sushi-test');
    fs.copySync(path.join(__dirname, 'fixtures', 'package-json-only'), tank);

    // Tweak the JSON to remove optional fields
    const packageJSON = fs.readJsonSync(path.join(tank, 'package.json'));
    delete packageJSON.url;
    delete packageJSON.title;
    delete packageJSON.description;
    delete packageJSON.dependencies;
    delete packageJSON.author;
    delete packageJSON.maintainers;
    delete packageJSON.license;
    packageJSON.dependencies = { 'hl7.fhir.r5.core': '4.5.0' };
    fs.writeJsonSync(path.join(tank, 'package.json'), packageJSON);

    // ensureConfiguration
    const configPath = ensureConfiguration(tank);
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);

    // We've tested most of this already.  We only care about the fhirVersion.
    expect(configJSON.fhirVersion).toEqual('4.5.0');
  });

  it('should generate an appropriate config for a tank w/ a package.json and legacy ig.ini', () => {
    // Copy the fixture to a temp folder since we actually create files in the tank
    const tank = temp.mkdirSync('sushi-test');
    fs.copySync(path.join(__dirname, 'fixtures', 'package-json-and-ig-ini'), tank);
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getLastMessage('warn')).toBe(
      `Generated new configuration file: ${configPath}. Please review to ensure configuration is correct.`
    );
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);

    // Test the formal YAML contents
    expect(configJSON).toEqual({
      id: 'sushi-test',
      canonical: 'http://hl7.org/fhir/sushi-test',
      version: '0.1.0',
      name: 'FSHTestIG',
      title: 'FSH Test IG',
      status: 'active',
      publisher: {
        name: 'James Tuna',
        url: 'https://tunafish.org/',
        email: 'tuna@reef.gov'
      },
      description: 'Provides a simple example of how FSH can be used to create an IG',
      license: 'CC0-1.0',
      fhirVersion: '4.0.1',
      dependencies: { 'hl7.fhir.us.core': '3.1.0', 'hl7.fhir.uv.vhdir': 'current' },
      parameters: {
        'usage-stats-opt-out': true, // usage-stats-opt-out from ig.ini
        'show-inherited-invariants': false
      },
      copyrightYear: '2018+', // from ig-ini
      releaseLabel: 'STU1', // from ig-ini
      // no template because the ig.ini should be used directly
      menu: {
        'IG Home': 'index.html',
        'Table of Contents': 'toc.html',
        'Artifact Index': 'artifacts.html',
        Support: { 'FHIR Spec': 'new-tab http://hl7.org/fhir/R4/index.html' }
      },
      indexPageContent: 'Provides a simple example of how FSH can be used to create an IG'
    });

    expect(configText).toMatch(
      'To use a provided ig-data/input/includes/menu.xml file, delete the "menu" property below.'
    );
  });

  it('should generate an appropriate config for a tank w/ a package.json and minimal ig.ini', () => {
    // Copy the fixture to a temp folder since we actually create files in the tank
    const tank = temp.mkdirSync('sushi-test');
    fs.copySync(path.join(__dirname, 'fixtures', 'package-json-and-ig-ini'), tank);

    // Tweak the ig.ini to contain just the currently supported properties (ig and template)
    const igIni = fs.readFileSync(path.join(tank, 'ig-data', 'ig.ini'), 'utf8');
    const newIgIni = igIni.split('\n').slice(0, 4).join('\n');
    fs.writeFileSync(path.join(tank, 'ig-data', 'ig.ini'), newIgIni, 'utf8');

    // ensureConfiguration
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getLastMessage('warn')).toBe(
      `Generated new configuration file: ${configPath}. Please review to ensure configuration is correct.`
    );
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);

    // Test the formal YAML contents
    expect(configJSON).toEqual({
      id: 'sushi-test',
      canonical: 'http://hl7.org/fhir/sushi-test',
      version: '0.1.0',
      name: 'FSHTestIG',
      title: 'FSH Test IG',
      status: 'active',
      publisher: {
        name: 'James Tuna',
        url: 'https://tunafish.org/',
        email: 'tuna@reef.gov'
      },
      description: 'Provides a simple example of how FSH can be used to create an IG',
      license: 'CC0-1.0',
      fhirVersion: '4.0.1',
      dependencies: { 'hl7.fhir.us.core': '3.1.0', 'hl7.fhir.uv.vhdir': 'current' },
      parameters: { 'show-inherited-invariants': false }, // no more extra parameter
      copyrightYear: '2021+', // back to default copyrightYear
      releaseLabel: 'CI Build', // backto default CI Build
      menu: {
        'IG Home': 'index.html',
        'Table of Contents': 'toc.html',
        'Artifact Index': 'artifacts.html',
        Support: { 'FHIR Spec': 'new-tab http://hl7.org/fhir/R4/index.html' }
      },
      indexPageContent: 'Provides a simple example of how FSH can be used to create an IG'
    });
    // No properties from ig.ini used (ig or template)
  });

  it('should generate an appropriate config for a tank w/ package.json and menu.xml', () => {
    // Copy the fixture to a temp folder since we actually create files in the tank
    const tank = temp.mkdirSync('sushi-test');
    fs.copySync(path.join(__dirname, 'fixtures', 'package-json-and-menu-xml'), tank);
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getLastMessage('warn')).toBe(
      `Generated new configuration file: ${configPath}. Please review to ensure configuration is correct.`
    );
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);

    // Test the formal YAML contents
    expect(configJSON).toEqual({
      id: 'sushi-test',
      canonical: 'http://hl7.org/fhir/sushi-test',
      version: '0.1.0',
      name: 'FSHTestIG',
      title: 'FSH Test IG',
      status: 'active',
      publisher: {
        name: 'James Tuna',
        url: 'https://tunafish.org/',
        email: 'tuna@reef.gov'
      },
      description: 'Provides a simple example of how FSH can be used to create an IG',
      license: 'CC0-1.0',
      fhirVersion: '4.0.1',
      dependencies: { 'hl7.fhir.us.core': '3.1.0', 'hl7.fhir.uv.vhdir': 'current' },
      parameters: { 'show-inherited-invariants': false },
      copyrightYear: '2021+',
      releaseLabel: 'CI Build',
      // menu should no longer exist since the provided menu.xml is used
      indexPageContent: 'Provides a simple example of how FSH can be used to create an IG'
    });

    // menu should be commented out since we use the one from ig.ini
    expect(configText).toMatch('# menu:');
    expect(configText).toMatch(
      'To control the menu.xml using this config, uncomment and set the "menu" property.'
    );

    // The commented out menu should correspond to the generated menu based on provided menu.xml
    const configTextLines = configText.split('\n');
    const start = configTextLines.findIndex(l => l.startsWith('# menu:'));
    const end = configTextLines.length - 1; // menu is the last property so get the last line
    const menuText = configTextLines
      .slice(start, end)
      .map(l => l.replace(/^# /, ''))
      .join('\n');
    const menuJSON = YAML.parse(menuText);
    expect(menuJSON.menu).toEqual({
      'IG Home': 'index.html',
      'Table of Contents': 'toc.html',
      'MyIg Background': {
        Background: 'background.html'
      },
      Specification: {
        'Detailed Specification': 'spec.html'
      },
      'Artifact Index': 'artifacts.html',
      Support: {
        'FHIR Spec': 'new-tab {{site.data.fhir.path}}index.html',
        Downloads: 'downloads.html'
      }
    });
  });

  it('should generate an appropriate config for a tank w/ package.json and index.md', () => {
    // Copy the fixture to a temp folder since we actually create files in the tank
    const tank = temp.mkdirSync('sushi-test');
    fs.copySync(path.join(__dirname, 'fixtures', 'package-json-and-index-md'), tank);
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getLastMessage('warn')).toBe(
      `Generated new configuration file: ${configPath}. Please review to ensure configuration is correct.`
    );
    const configText = fs.readFileSync(configPath, 'utf8');
    const configJSON = YAML.parse(configText);

    // Test the formal YAML contents
    expect(configJSON).toEqual({
      id: 'sushi-test',
      canonical: 'http://hl7.org/fhir/sushi-test',
      version: '0.1.0',
      name: 'FSHTestIG',
      title: 'FSH Test IG',
      status: 'active',
      publisher: {
        name: 'James Tuna',
        url: 'https://tunafish.org/',
        email: 'tuna@reef.gov'
      },
      description: 'Provides a simple example of how FSH can be used to create an IG',
      license: 'CC0-1.0',
      fhirVersion: '4.0.1',
      dependencies: { 'hl7.fhir.us.core': '3.1.0', 'hl7.fhir.uv.vhdir': 'current' },
      parameters: { 'show-inherited-invariants': false },
      copyrightYear: '2021+',
      releaseLabel: 'CI Build',
      menu: {
        'IG Home': 'index.html',
        'Table of Contents': 'toc.html',
        'Artifact Index': 'artifacts.html',
        Support: { 'FHIR Spec': 'new-tab http://hl7.org/fhir/R4/index.html' }
      }
      // indexPageContent should not exist since the provided index.md is used
    });

    // Nothing is added as a commented pair to the sushi-config.yaml because there is not configuration equivalent
  });
});
