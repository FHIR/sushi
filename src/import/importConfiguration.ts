import YAML from 'yaml';
import {
  YAMLConfiguration,
  YAMLConfigurationPage,
  YAMLConfigurationMenuTree,
  YAMLConfigurationDependencyMap,
  YAMLConfigurationGlobalMap,
  YAMLConfigurationGroupMap,
  YAMLConfigurationResourceMap,
  YAMLConfigurationPageTree,
  YAMLConfigurationMeta,
  YAMLConfigurationUsageContext,
  YAMLConfigurationQuantity,
  YAMLConfigurationNarrative,
  YAMLConfigurationRange,
  YAMLConfigurationReference,
  YAMLConfigurationIdentifier
} from './YAMLConfiguration';
import {
  Configuration,
  ConfigurationGroup,
  ConfigurationResource,
  ConfigurationMenuItem,
  ConfigurationHistory,
  ConfigurationHistoryItem
} from '../fshtypes/Configuration';
import { logger } from '../utils/FSHLogger';
import { parseCodeLexeme } from './parseCodeLexeme';
import {
  ImplementationGuideGlobal,
  ImplementationGuideDefinitionPage,
  ImplementationGuideDefinitionParameter,
  ContactDetail,
  ImplementationGuideDependsOn,
  Meta,
  Coding,
  Narrative,
  ContactPoint,
  CodeableConcept,
  UsageContext,
  Quantity,
  Range,
  Identifier,
  Reference,
  ImplementationGuideDefinitionTemplate
} from '../fhirtypes';
import { FshCode } from '../fshtypes';

const MINIMAL_CONFIG_PROPERTIES = ['id', 'version', 'canonical', 'fhirVersion'];
// Properties that are only relevant when an IG is going to be generated from output, and have no informational purpose
const IG_ONLY_PROPERTIES = [
  'contained',
  'extension',
  'modifierExtension',
  'groups',
  'resources',
  'pages',
  'parameters',
  'template',
  'templates',
  'menu'
];

/**
 * Imports the YAML Configuration format (as a YAML string or already parsed JSON) and returns
 * the normalized FSH Configuration object.
 * @param {YAMLConfiguration | string} yaml - the YAML config as a string or JSON document
 * @param {string} file - the path to the configuration file (used for logging source info)
 * @returns {Configuration} - the FSH configuration representing the parsed config
 */
export function importConfiguration(yaml: YAMLConfiguration | string, file: string): Configuration {
  if (typeof yaml === 'string') {
    let parsed: YAMLConfiguration;
    try {
      parsed = YAML.parse(yaml);
    } catch (e) {
      logger.error(`Error parsing configuration: ${e.message}.`, { file });
      throw new Error('Invalid configuration YAML');
    }
    if (typeof parsed !== 'object' || parsed === null) {
      logger.error('Configuration is not a valid YAML object.', { file });
      throw new Error('Invalid configuration YAML');
    }
    return importConfiguration(parsed, file);
  }

  // There are a few properties that are absolutely required if we are to have *any* success at all
  if (
    MINIMAL_CONFIG_PROPERTIES.some(
      (p: keyof YAMLConfiguration) =>
        yaml[p] == null || (Array.isArray(yaml[p]) && (yaml[p] as any[]).length === 0)
    )
  ) {
    logger.error(
      'SUSHI minimally requires the following configuration properties to start processing FSH: ' +
        MINIMAL_CONFIG_PROPERTIES.join(', ') +
        '.',
      { file }
    );
    throw new Error('Minimal config not met');
  }

  const config: Configuration = {
    filePath: file,
    canonical: yaml.canonical, // minimum config property
    id: yaml.id, // minimum config property
    meta: parseMeta(yaml.meta, file),
    implicitRules: yaml.implicitRules,
    language: parseSimpleCode(yaml.language, 'language', file),
    text: parseText(yaml.text, file),
    contained: yaml.contained,
    extension: yaml.extension,
    modifierExtension: yaml.modifierExtension,
    url: yaml.url ?? `${yaml.canonical}/ImplementationGuide/${yaml.id}`,
    version: normalizeToString(yaml.version), // minimum config property
    name: required(yaml.name, 'name', file),
    title: yaml.title,
    status: parseCodeWithRequiredValues(
      required(yaml.status, 'status', file),
      ['draft', 'active', 'retired', 'unknown'],
      'status',
      file
    ),
    experimental: yaml.experimental,
    date: normalizeToString(yaml.date),
    publisher: normalizeToArray(yaml.publisher)?.[0]?.name,
    contact: parseContact(yaml, file),
    description: yaml.description,
    useContext: parseUsageContext(yaml.useContext, file),
    jurisdiction: parseJurisdiction(yaml.jurisdiction, file),
    copyright: yaml.copyright,
    packageId: yaml.packageId ?? yaml.id,
    license: parseSimpleCode(yaml.license, 'license', file),
    fhirVersion: normalizeToArray(yaml.fhirVersion)?.map(v =>
      parseSimpleCode(v, 'fhirVersion', file)
    ), // minimum config property
    dependencies: parseDependencies(yaml.dependencies),
    global: parseGlobal(yaml.global),
    groups: parseGroups(yaml.groups),
    resources: parseResources(yaml.resources, file),
    pages: parsePages(yaml.pages, file),
    parameters: parseParameters(yaml, yaml.FSHOnly, file),
    templates: parseTemplates(yaml.templates, file),
    template: yaml.template,
    menu: parseMenu(yaml.menu),
    history: parseHistory(yaml, file),
    indexPageContent: yaml.indexPageContent,
    FSHOnly: yaml.FSHOnly ?? false
  };

  // Remove all undefined variables (mainly helpful for test assertions)
  removeUndefinedValues(config);

  if (yaml.FSHOnly) {
    // If no IG is being generated, emit warning when IG specific properties are used in config
    const unusedProperties = Object.keys(config).filter((p: keyof Configuration) =>
      IG_ONLY_PROPERTIES.includes(p)
    );
    if (unusedProperties.length > 0) {
      logger.warn(
        `The FSHOnly property is set to true, so no output specific to IG creation will be generated. The following properties are unused and only relevant for IG creation: ${unusedProperties.join(
          ', '
        )}.`,
        { file }
      );
    }
  }

  return config;
}

function required<T>(value: T, property: string, file: string): T {
  if (value == null || (Array.isArray(value) && value.length === 0)) {
    logger.error(`Configuration missing required property: ${property}`, { file });
  }
  return value;
}

function normalizeToString(yamlValue: any): string {
  if (yamlValue == null) {
    return;
  }
  return `${yamlValue}`;
}

function normalizeToArray<T>(yamlValue?: T | T[]): T[] | null | undefined {
  if (yamlValue == null) {
    return;
  }
  return Array.isArray(yamlValue) ? yamlValue : [yamlValue];
}

function parseSimpleCode(yamlCode: string, property: string, file: string): string {
  return yamlCode?.startsWith('#') ? parseFshCode(yamlCode, property, file)?.code : yamlCode;
}

function parseFshCode(yamlCode: string, property: string, file: string): FshCode {
  // If it has a display, we need to split it out and handle it separately
  const m = yamlCode.match(/^(.*\S)(\s+"(([^"]|\\")*)")$/);
  if (m) {
    const concept = parseCodeLexeme(m[1]);
    concept.display = m[3].replace(/\\"/g, '"');
    return concept;
  }
  const concept = parseCodeLexeme(yamlCode);
  if (concept.system == null && concept.code === '') {
    logger.error(`Invalid code format for ${property}: ${yamlCode}`, { file });
    // don't return an invalid code
    return;
  }
  return concept;
}

function parseCodingArray(codings: (Coding | string)[], property: string, file: string): Coding[] {
  if (codings == null) {
    return;
  }
  const result = codings?.map(c => parseCoding(c, property, file)).filter(c => c != null);
  if (result.length === 0 && codings.length > 0) {
    // in the case that all inputs were invalid, return undefined instead of empty array
    return;
  }
  return result;
}

function parseCoding(coding: Coding | string, property: string, file: string): Coding {
  if (coding == null) {
    return;
  }
  if (typeof coding === 'string') {
    return parseFshCode(coding, property, file)?.toFHIRCoding();
  }
  // It's a coding object
  const fixed: Coding = {
    ...coding,
    version: normalizeToString(coding.version),
    code: parseSimpleCode(coding.code, property, file)
  };
  return removeUndefinedValues(fixed);
}

function parseCodeableConceptArray(
  concepts: (CodeableConcept | string)[],
  property: string,
  file: string
): CodeableConcept[] {
  if (concepts == null) {
    return;
  }
  const result = concepts?.map(c => parseCodeableConcept(c, property, file)).filter(c => c != null);
  if (result.length === 0 && concepts.length > 0) {
    // in the case that all inputs were invalid, return undefined instead of empty array
    return;
  }
  return result;
}

function parseCodeableConcept(
  concept: CodeableConcept | string,
  property: string,
  file: string
): CodeableConcept {
  if (concept == null) {
    return;
  }
  if (typeof concept === 'string') {
    const coding = parseCoding(concept, property, file);
    if (coding == null) {
      // return undefined instead of an empty concept
      return;
    }
    return {
      coding: [coding]
    };
  }
  // It's a CodeableConcept object
  const fixed: CodeableConcept = {
    ...concept,
    coding: parseCodingArray(concept.coding, property, file)
  };
  return removeUndefinedValues(fixed);
}

function parseCodeWithRequiredValues<T extends string>(
  yamlCode: string,
  allowedValues: T[],
  property: string,
  file: string
): T {
  if (yamlCode == null) {
    return;
  }

  const code = parseSimpleCode(yamlCode, property, file);
  const match = allowedValues.find(c => c === code);
  if (match) {
    return match;
  }
  logger.error(
    `Invalid ${property} value: '${code}'. Must be one of: ${allowedValues
      .map(c => `'${c}'`)
      .join(',')}.`,
    {
      file
    }
  );
}

function parseQuantity(
  yamlQuantity: YAMLConfigurationQuantity | string,
  property: string,
  file: string
): Quantity {
  if (yamlQuantity == null) {
    return;
  }
  if (typeof yamlQuantity === 'string') {
    const m = yamlQuantity.match(/^(\d*(\.\d+)?)(\s+'([^']+)')?$/);
    if (m == null) {
      logger.error(`Invalid ${property} value: ${yamlQuantity}`, { file });
      return;
    }
    const quantity: Quantity = {
      value: parseFloat(m[1])
    };
    if (m[4] && m[4].length > 0) {
      quantity.system = 'http://unitsofmeasure.org';
      quantity.code = m[4];
    }
    return quantity;
  }
  const quantity: Quantity = {
    ...yamlQuantity,
    code: parseSimpleCode(yamlQuantity.code, `${property}.code`, file),
    comparator: parseCodeWithRequiredValues(
      yamlQuantity.comparator,
      ['<', '<=', '>=', '>'],
      `${property}.comparator`,
      file
    )
  };
  removeUndefinedValues(quantity);
  return quantity;
}

function parseRange(yamlRange: YAMLConfigurationRange, property: string, file: string): Range {
  if (yamlRange == null) {
    return;
  }
  const range: Range = {
    ...yamlRange,
    low: parseQuantity(yamlRange.low, `${property}.low`, file),
    high: parseQuantity(yamlRange.high, `${property}.high`, file)
  };
  removeUndefinedValues(range);
  return range;
}

function parseReference(
  yamlReference: YAMLConfigurationReference,
  property: string,
  file: string
): Reference {
  if (yamlReference == null) {
    return;
  }
  const reference: Reference = {
    ...yamlReference,
    identifier: parseIdentifier(yamlReference.identifier, `${property}.identifier`, file)
  };
  removeUndefinedValues(reference);
  return reference;
}

function parseIdentifier(
  yamlIdentifier: YAMLConfigurationIdentifier,
  property: string,
  file: string
): Identifier {
  if (yamlIdentifier == null) {
    return;
  }
  const identifier: Identifier = {
    ...yamlIdentifier,
    use: parseCodeWithRequiredValues(
      yamlIdentifier.use,
      ['usual', 'official', 'temp', 'secondary', 'old'],
      `${property}.use`,
      file
    ),
    type: parseCodeableConcept(yamlIdentifier.type, `${property}.type`, file),
    assigner: parseReference(yamlIdentifier.assigner, `${property}.assigner`, file)
  };
  removeUndefinedValues(identifier);
  return identifier;
}

function parseMeta(yamlMeta: YAMLConfigurationMeta, file: string): Meta {
  if (yamlMeta == null) {
    return;
  }

  const fixed = {
    ...yamlMeta,
    security: parseCodingArray(yamlMeta.security, 'meta.security', file),
    tag: parseCodingArray(yamlMeta.tag, 'meta.tag', file)
  };
  return removeUndefinedValues(fixed);
}

function parseText(yamlText: YAMLConfigurationNarrative, file: string): Narrative {
  if (yamlText == null) {
    return;
  }

  const fixed: Narrative = {
    ...yamlText,
    status: parseCodeWithRequiredValues(
      yamlText.status,
      ['generated', 'extensions', 'additional', 'empty'],
      'text.status',
      file
    )
  };
  return removeUndefinedValues(fixed);
}

function parseContact(yamlConfig: YAMLConfiguration, file: string): ContactDetail[] {
  const contacts: ContactDetail[] = [];
  const publishers = normalizeToArray(yamlConfig.publisher);
  if (publishers) {
    publishers.forEach((p, i) => {
      const contact: ContactDetail = { name: p.name };
      if (p.url || p.email) {
        contact.telecom = [];
        if (p.url) {
          contact.telecom.push({ system: 'url', value: p.url });
        }
        if (p.email) {
          contact.telecom.push({ system: 'email', value: p.email });
        }
      } else if (i === 0) {
        // This was the first publisher and there was no additional contact detail, so skip it
        return;
      }
      contacts.push(contact);
    });
  }
  if (yamlConfig.contact) {
    contacts.push(
      ...normalizeToArray(yamlConfig.contact).map(yamlContact => {
        const contact: ContactDetail = {
          ...yamlContact,
          telecom: normalizeToArray(yamlContact.telecom).map(yamlTelecom => {
            const contactPoint: ContactPoint = {
              ...yamlTelecom,
              system: parseCodeWithRequiredValues(
                yamlTelecom.system,
                ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'],
                'contact.telecom.system',
                file
              ),
              use: parseCodeWithRequiredValues(
                yamlTelecom.use,
                ['home', 'work', 'temp', 'old', 'mobile'],
                'contact.telecom.use',
                file
              )
            };
            removeUndefinedValues(contactPoint);
            return contactPoint;
          })
        };
        if (contact.telecom.length === 0) {
          delete contact.telecom;
        }
        return contact;
      })
    );
  }
  if (contacts.length === 0) {
    return;
  }
  return contacts;
}

function parseUsageContext(
  yamlUsageContext: YAMLConfigurationUsageContext | YAMLConfigurationUsageContext[],
  file: string
): UsageContext[] {
  return normalizeToArray(yamlUsageContext)?.map(yaml => {
    const usageContext: UsageContext = {
      code: parseCoding(required(yaml.code, 'useContext.code', file), 'useContext.code', file),
      valueCodeableConcept: parseCodeableConcept(
        yaml.valueCodeableConcept,
        'useContext.valueCodeableConcept',
        file
      ),
      valueQuantity: parseQuantity(yaml.valueQuantity, 'useContext.valueQuantity', file),
      valueRange: parseRange(yaml.valueRange, 'useContext.valueRange', file),
      valueReference: parseReference(yaml.valueReference, 'useContext.valueReference', file)
    };
    const valueFields = [
      'valueCodeableConcept',
      'valueQuantity',
      'valueRange',
      'valueReference'
    ].filter((v: keyof UsageContext) => yaml[v] != null);
    if (valueFields.length === 0) {
      // at least one is required, so force the 'required' error
      required(undefined, 'useContext.value[x]', file);
    } else if (valueFields.length > 1) {
      // more than one value is not allowed since it is a value[x] choice
      logger.error(
        `Only one useContext.value[x] is allowed but found multiple: ${valueFields.join(', ')}`,
        {
          file
        }
      );
    }
    removeUndefinedValues(usageContext);
    return usageContext;
  });
}

function parseJurisdiction(
  yamlJurisdiction: CodeableConcept | string | (CodeableConcept | string)[],
  file: string
): CodeableConcept[] {
  return parseCodeableConceptArray(normalizeToArray(yamlJurisdiction), 'jurisdiction', file);
}

function parseDependencies(
  yamlDependencies: YAMLConfigurationDependencyMap
): ImplementationGuideDependsOn[] {
  if (yamlDependencies == null) {
    return;
  }
  return Object.entries(yamlDependencies).map(([packageId, version]) => {
    return { packageId, version: `${version}` };
  });
}

function parseGlobal(yamlGlobal: YAMLConfigurationGlobalMap): ImplementationGuideGlobal[] {
  if (yamlGlobal == null) {
    return;
  }
  const global: ImplementationGuideGlobal[] = [];
  for (const [type, profiles] of Object.entries(yamlGlobal)) {
    normalizeToArray(profiles).forEach(profile => global.push({ type, profile }));
  }
  return global;
}

function parseGroups(yamlGroups: YAMLConfigurationGroupMap): ConfigurationGroup[] {
  if (yamlGroups == null) {
    return;
  }
  return Object.entries(yamlGroups).map(([name, details]) => {
    return { name, ...details };
  });
}

function parseResources(
  yamlResources: YAMLConfigurationResourceMap,
  file: string
): ConfigurationResource[] {
  if (yamlResources == null) {
    return;
  }
  return Object.entries(yamlResources).map(([reference, details]) => {
    if (details === 'omit' || details === '#omit') {
      return { reference: { reference }, omit: true };
    }
    return {
      reference: { reference },
      ...details,
      fhirVersion: normalizeToArray(details.fhirVersion)?.map(v =>
        parseSimpleCode(v, `resource[${reference}].fhirVersion`, file)
      )
    };
  });
}

function parsePages(
  yamlPages: YAMLConfigurationPageTree,
  file: string
): ImplementationGuideDefinitionPage[] {
  if (yamlPages == null) {
    return;
  }
  return Object.entries(yamlPages).map(([nameUrl, details]) => {
    return parsePage(nameUrl, details, `pages[${nameUrl}]`, file);
  });
}

function parsePage(
  nameUrl: string,
  details: YAMLConfigurationPage,
  property: string,
  file: string
): ImplementationGuideDefinitionPage {
  const page: ImplementationGuideDefinitionPage = { nameUrl };
  if (details?.title) {
    page.title = details.title;
  }
  if (details?.generation) {
    page.generation = parseCodeWithRequiredValues(
      details.generation,
      ['html', 'markdown', 'xml', 'generated'],
      `${property}.generation`,
      file
    );
  }
  if (details != null) {
    Object.entries(details).forEach(([key, value]) => {
      if (key == 'title' || key == 'generation') {
        return;
      }
      if (page.page == null) {
        page.page = [];
      }
      page.page.push(parsePage(key, value as YAMLConfigurationPage, `${property}[${key}]`, file));
    });
  }
  return page;
}

function parseParameters(
  yamlConfig: YAMLConfiguration,
  FSHOnly: boolean,
  file: string
): ImplementationGuideDefinitionParameter[] {
  const parameters: ImplementationGuideDefinitionParameter[] = [];
  // copyrightYear and releaseLabel are only required when generating an IG
  const copyrightYear = FSHOnly
    ? yamlConfig.copyrightYear ?? yamlConfig.copyrightyear
    : required(yamlConfig.copyrightYear ?? yamlConfig.copyrightyear, 'copyrightYear', file);
  const releaseLabel = FSHOnly
    ? yamlConfig.releaseLabel ?? yamlConfig.releaselabel
    : required(yamlConfig.releaseLabel ?? yamlConfig.releaselabel, 'releaseLabel', file);
  if (copyrightYear) {
    parameters.push({
      code: 'copyrightyear',
      value: copyrightYear.toString()
    });
  }
  if (releaseLabel) {
    parameters.push({
      code: 'releaselabel',
      value: releaseLabel
    });
  }
  if (yamlConfig.parameters) {
    for (const [code, values] of Object.entries(yamlConfig.parameters)) {
      normalizeToArray(values).forEach(value => parameters.push({ code, value: `${value}` }));
    }
  } else if (parameters.length === 0) {
    return; // return undefined rather than an empty []
  }
  return parameters;
}

function parseTemplates(
  yamlTemplates: ImplementationGuideDefinitionTemplate | ImplementationGuideDefinitionTemplate[],
  file: string
): ImplementationGuideDefinitionTemplate[] {
  return normalizeToArray(yamlTemplates)?.map(t => {
    const template: ImplementationGuideDefinitionTemplate = {
      ...t,
      code: parseSimpleCode(required(t.code, 'templates.code', file), 'templates.code', file),
      source: required(t.source, 'templates.source', file)
    };
    removeUndefinedValues(template);
    return template;
  });
}

function parseMenu(yamlMenu: YAMLConfigurationMenuTree): ConfigurationMenuItem[] {
  if (yamlMenu == null) {
    return;
  }
  return Object.entries(yamlMenu).map(([name, value]) => {
    const item: ConfigurationMenuItem = { name };
    if (typeof value === 'string') {
      item.url = value;
    } else {
      item.subMenu = parseMenu(value);
    }
    return item;
  });
}

function parseHistory(yamlConfig: YAMLConfiguration, file: string): ConfigurationHistory {
  const yamlHistory = yamlConfig.history;
  if (yamlHistory == null) {
    return;
  }
  const history: ConfigurationHistory = {
    'package-id': yamlHistory['package-id'] ?? yamlConfig.packageId ?? yamlConfig.id,
    canonical: yamlHistory.canonical ?? yamlConfig.canonical,
    title: yamlHistory.title ?? yamlConfig.title,
    introduction: yamlHistory.introduction ?? yamlConfig.description,
    list: []
  };
  if (yamlHistory.current) {
    if (typeof yamlHistory.current === 'string') {
      history.list.push({
        version: 'current',
        desc: 'Continuous Integration Build (latest in version control)',
        path: yamlHistory.current,
        status: 'ci-build',
        current: true
      });
    } else {
      history.list.push({
        version: 'current',
        date: normalizeToString(yamlHistory.current.date),
        desc:
          yamlHistory.current.desc ?? 'Continuous Integration Build (latest in version control)',
        path: required(yamlHistory.current.path, 'history[current].path', file),
        changes: yamlHistory.current.changes,
        status: parseCodeWithRequiredValues(
          yamlHistory.current.status ?? 'ci-build',
          allowedHistoryStatus,
          'history[current].status',
          file
        ),
        sequence: yamlHistory.current.sequence,
        fhirversion: yamlHistory.current.fhirversion,
        current: yamlHistory.current.current ?? true
      });
    }
  }
  for (const [key, value] of Object.entries(yamlHistory)) {
    if (['package-id', 'canonical', 'title', 'introduction', 'current'].indexOf(key) !== -1) {
      continue;
    }
    const item = value as ConfigurationHistoryItem;
    history.list.push({
      version: key,
      date: required(item.date, `history[${key}].date`, file),
      desc: required(item.desc, `history[${key}].desc`, file),
      path: required(item.path, `history[${key}].path`, file),
      changes: item.changes,
      status: parseCodeWithRequiredValues(
        required(item.status, `history[${key}].status`, file),
        allowedHistoryStatus,
        `history[${key}].status`,
        file
      ),
      sequence: required(item.sequence, `history[${key}].sequence`, file),
      fhirversion: required(item.fhirversion, `history[${key}].fhirVersion`, file),
      current: item.current
    });
  }
  history.list.forEach(item => removeUndefinedValues(item));
  return history;
}

const allowedHistoryStatus: ConfigurationHistoryItem['status'][] = [
  'ci-build',
  'preview',
  'ballot',
  'trial-use',
  'update',
  'normative',
  'trial-use+normative'
];

function removeUndefinedValues<T extends object>(incoming: T): T {
  Object.keys(incoming).forEach((k: string) => {
    // @ts-ignore Element implicitly has an 'any' type
    if (typeof incoming[k] === 'undefined') {
      // @ts-ignore Element implicitly has an 'any' type
      delete incoming[k];
    }
  });
  return incoming;
}
