import * as pc from './parserContexts';
import { FSHDocument } from './FSHDocument';
import { RawFSH } from './RawFSH';
import { FSHErrorListener } from './FSHErrorListener';
import { FSHVisitor } from './generated/FSHVisitor';
import { FSHLexer } from './generated/FSHLexer';
import { FSHParser } from './generated/FSHParser';
import {
  Profile,
  Extension,
  FshCanonical,
  FshCode,
  FshQuantity,
  FshRatio,
  FshReference,
  TextLocation,
  Instance,
  InstanceUsage,
  FshValueSet,
  ValueSetComponentFrom,
  ValueSetFilter,
  VsOperator,
  ValueSetFilterValue,
  FshCodeSystem,
  Invariant,
  RuleSet,
  ParamRuleSet,
  Mapping,
  isInstanceUsage
} from '../fshtypes';
import {
  CardRule,
  FlagRule,
  BindingRule,
  AssignmentRule,
  AssignmentValueType,
  OnlyRule,
  ContainsRule,
  ContainsRuleItem,
  CaretValueRule,
  ObeysRule,
  MappingRule,
  InsertRule,
  ConceptRule,
  ValueSetComponentRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule,
  SdRule
} from '../fshtypes/rules';
import { ParserRuleContext, InputStream, CommonTokenStream } from 'antlr4';
import { logger, switchToSecretLogger, LoggerData, restoreMainLogger } from '../utils/FSHLogger';
import { TerminalNode } from 'antlr4/tree/Tree';
import {
  RequiredMetadataError,
  ValueSetFilterOperatorError,
  ValueSetFilterValueTypeError,
  ValueSetFilterMissingValueError
} from '../errors';
import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';
import upperFirst from 'lodash/upperFirst';
import { parseCodeLexeme } from './parseCodeLexeme';
import { EOL } from 'os';

enum SdMetadataKey {
  Id = 'Id',
  Parent = 'Parent',
  Title = 'Title',
  Description = 'Description',
  Mixins = 'Mixins',
  Unknown = 'Unknown'
}

enum InstanceMetadataKey {
  InstanceOf = 'InstanceOf',
  Title = 'Title',
  Description = 'Description',
  Usage = 'Usage',
  Mixins = 'Mixins',
  Unknown = 'Unknown'
}

enum VsMetadataKey {
  Id = 'Id',
  Title = 'Title',
  Description = 'Description',
  Unknown = 'Unknown'
}

enum CsMetadataKey {
  Id = 'Id',
  Title = 'Title',
  Description = 'Description',
  Unknown = 'Unknown'
}

enum InvariantMetadataKey {
  Description = 'Description',
  Expression = 'Expression',
  XPath = 'XPath',
  Severity = 'Severity',
  Unknown = 'Unknown'
}

enum MappingMetadataKey {
  Id = 'Id',
  Source = 'Source',
  Target = 'Target',
  Description = 'Description',
  Title = 'Title',
  Unknown = 'Unknown'
}

enum Flag {
  MustSupport,
  Summary,
  Modifier,
  TrialUse,
  Normative,
  Draft,
  Unknown
}

/**
 * FSHImporter handles the parsing of FSH documents, constructing the data into FSH types.
 * FSHImporter uses a visitor pattern approach with some accomodations due to the ANTLR4
 * implementation and TypeScript requirements.  For example, the `accept` functions that
 * each `ctx` has cannot be used because their signatures return `void` by default. Instead,
 * we must call the explicit visitX functions.
 */
export class FSHImporter extends FSHVisitor {
  private currentFile: string;
  private currentDoc: FSHDocument;
  private allAliases: Map<string, string>;
  paramRuleSets: Map<string, ParamRuleSet>;
  private topLevelParse: boolean;

  constructor() {
    super();
    this.paramRuleSets = new Map();
    this.topLevelParse = true;
  }

  import(rawFSHes: RawFSH[]): FSHDocument[] {
    this.allAliases = new Map();
    const docs: FSHDocument[] = [];
    const contexts: pc.DocContext[] = [];

    // Preprocess the FSH files
    rawFSHes.forEach(rawFSH => {
      // Create and store doc for main import process
      const doc = new FSHDocument(rawFSH.path);
      docs.push(doc);
      this.currentDoc = doc;
      this.currentFile = this.currentDoc.file ?? '';

      // Create and store context for main import process
      // We are appending a newline to the file content if there is not one there already.
      // This is being done because we discovered a syntax error that occurs if a comments
      // ends a file, and there is no newline after it. Comments are only tokenized in our
      // grammar if a newline follows it. In order to prevent this error from occurring,
      // we add a newline to the content before we parse it so comments at EOF can be tokenized.
      const content = rawFSH.content.endsWith('\n') ? rawFSH.content : rawFSH.content + '\n';
      const ctx = this.parseDoc(content, rawFSH.path);
      contexts.push(ctx);

      // Collect the aliases and store in global map
      ctx.entity().forEach(e => {
        if (e.alias()) {
          const [name, value] = e
            .alias()
            .SEQUENCE()
            .map(s => s.getText());
          if (this.allAliases.has(name) && this.allAliases.get(name) !== value) {
            logger.error(
              `Alias ${name} cannot be redefined to ${value}; it is already defined as ${this.allAliases.get(
                name
              )}.`,
              { file: doc.file ?? '', location: this.extractStartStop(e.alias()) }
            );
            // don't set it -- just keep the original definition
          } else {
            this.allAliases.set(name, value);
            doc.aliases.set(name, value);
          }
        }
        if (e.paramRuleSet()) {
          this.visitParamRuleSet(e.paramRuleSet());
        }
      });
      this.currentDoc = null;
      this.currentFile = null;
    });
    logger.info(`Preprocessed ${docs.length} documents with ${this.allAliases.size} aliases.`);

    // Now do the main import
    contexts.forEach((context, index) => {
      this.currentDoc = docs[index];
      this.currentFile = this.currentDoc.file ?? '';
      this.visitDoc(context);
      this.currentDoc = null;
      this.currentFile = null;
    });

    let [definitions, instances] = [0, 0];
    docs.forEach(doc => {
      definitions +=
        doc.codeSystems.size + doc.extensions.size + doc.profiles.size + doc.valueSets.size;
      instances += doc.instances.size;
    });
    logger.info(`Imported ${definitions} definitions and ${instances} instances.`);

    return docs;
  }

  visitDoc(ctx: pc.DocContext): void {
    ctx.entity().forEach(e => {
      try {
        this.visitEntity(e);
      } catch (err) {
        const sourceInfo = { location: this.extractStartStop(e), file: this.currentFile };
        logger.error(`Error in parsing: ${err.message}`, sourceInfo);
      }
    });
  }

  visitEntity(ctx: pc.EntityContext): void {
    if (ctx.profile()) {
      this.visitProfile(ctx.profile());
    }

    if (ctx.extension()) {
      this.visitExtension(ctx.extension());
    }

    if (ctx.instance()) {
      this.visitInstance(ctx.instance());
    }

    if (ctx.valueSet()) {
      this.visitValueSet(ctx.valueSet());
    }

    if (ctx.codeSystem()) {
      this.visitCodeSystem(ctx.codeSystem());
    }

    if (ctx.invariant()) {
      this.visitInvariant(ctx.invariant());
    }

    if (ctx.ruleSet()) {
      this.visitRuleSet(ctx.ruleSet());
    }

    if (ctx.mapping()) {
      this.visitMapping(ctx.mapping());
    }
  }

  visitProfile(ctx: pc.ProfileContext) {
    const profile = new Profile(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.currentDoc.profiles.has(profile.name)) {
      logger.error(`Skipping Profile: a Profile named ${profile.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      this.parseProfileOrExtension(profile, ctx.sdMetadata(), ctx.sdRule());
      this.currentDoc.profiles.set(profile.name, profile);
    }
  }

  visitExtension(ctx: pc.ExtensionContext) {
    const extension = new Extension(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.currentDoc.extensions.has(extension.name)) {
      logger.error(`Skipping Extension: an Extension named ${extension.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      this.parseProfileOrExtension(extension, ctx.sdMetadata(), ctx.sdRule());
      this.currentDoc.extensions.set(extension.name, extension);
    }
  }

  private parseProfileOrExtension(
    def: Profile | Extension,
    metaCtx: pc.SdMetadataContext[] = [],
    ruleCtx: pc.SdRuleContext[] = []
  ): void {
    const seenPairs: Map<SdMetadataKey, string | string[]> = new Map();
    metaCtx
      .map(sdMeta => ({ ...this.visitSdMetadata(sdMeta), context: sdMeta }))
      .forEach(pair => {
        if (seenPairs.has(pair.key)) {
          logger.error(
            `Metadata field '${pair.key}' already declared with value '${seenPairs.get(
              pair.key
            )}'.`,
            { file: this.currentFile, location: this.extractStartStop(pair.context) }
          );
          return;
        }
        seenPairs.set(pair.key, pair.value);
        if (pair.key === SdMetadataKey.Id) {
          def.id = pair.value as string;
        } else if (pair.key === SdMetadataKey.Parent) {
          def.parent = pair.value as string;
        } else if (pair.key === SdMetadataKey.Title) {
          def.title = pair.value as string;
        } else if (pair.key === SdMetadataKey.Description) {
          def.description = pair.value as string;
        } else if (pair.key === SdMetadataKey.Mixins) {
          def.mixins = pair.value as string[];
        }
      });
    ruleCtx.forEach(sdRule => {
      def.rules.push(...this.visitSdRule(sdRule));
    });
  }

  visitInstance(ctx: pc.InstanceContext) {
    const instance = new Instance(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.currentDoc.instances.has(instance.name)) {
      logger.error(`Skipping Instance: an Instance named ${instance.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      try {
        this.parseInstance(instance, ctx.instanceMetadata(), ctx.instanceRule());
        this.currentDoc.instances.set(instance.name, instance);
      } catch (e) {
        logger.error(e.message, instance.sourceInfo);
      }
    }
  }

  private parseInstance(
    instance: Instance,
    metaCtx: pc.InstanceMetadataContext[] = [],
    ruleCtx: pc.InstanceRuleContext[] = []
  ): void {
    const seenPairs: Map<InstanceMetadataKey, string | string[]> = new Map();
    metaCtx
      .map(instanceMetadata => ({
        ...this.visitInstanceMetadata(instanceMetadata),
        context: instanceMetadata
      }))
      .forEach(pair => {
        if (seenPairs.has(pair.key)) {
          logger.error(
            `Metadata field '${pair.key}' already declared with value '${seenPairs.get(
              pair.key
            )}'.`,
            { file: this.currentFile, location: this.extractStartStop(pair.context) }
          );
          return;
        }
        seenPairs.set(pair.key, pair.value);
        if (pair.key === InstanceMetadataKey.InstanceOf) {
          instance.instanceOf = pair.value as string;
        } else if (pair.key === InstanceMetadataKey.Title) {
          instance.title = pair.value as string;
        } else if (pair.key === InstanceMetadataKey.Description) {
          instance.description = pair.value as string;
        } else if (pair.key === InstanceMetadataKey.Usage) {
          instance.usage = pair.value as InstanceUsage;
        } else if (pair.key === InstanceMetadataKey.Mixins) {
          instance.mixins = pair.value as string[];
        }
      });
    if (!instance.instanceOf) {
      throw new RequiredMetadataError('InstanceOf', 'Instance', instance.name);
    }
    ruleCtx.forEach(instanceRule => {
      const rule = this.visitInstanceRule(instanceRule);
      if (rule) {
        instance.rules.push(rule);
      }
    });
  }

  visitValueSet(ctx: pc.ValueSetContext) {
    const valueSet = new FshValueSet(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.currentDoc.valueSets.has(valueSet.name)) {
      logger.error(`Skipping ValueSet: a ValueSet named ${valueSet.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      this.parseValueSet(valueSet, ctx.vsMetadata(), ctx.vsRule());
      this.currentDoc.valueSets.set(valueSet.name, valueSet);
    }
  }

  private parseValueSet(
    valueSet: FshValueSet,
    metaCtx: pc.VsMetadataContext[] = [],
    vsRuleCtx: pc.VsRuleContext[] = []
  ) {
    const seenPairs: Map<VsMetadataKey, string> = new Map();
    metaCtx
      .map(vsMetadata => ({
        ...this.visitVsMetadata(vsMetadata),
        context: vsMetadata
      }))
      .forEach(pair => {
        if (seenPairs.has(pair.key)) {
          logger.error(
            `Metadata field '${pair.key}' already declared with value '${seenPairs.get(
              pair.key
            )}'.`,
            { file: this.currentFile, location: this.extractStartStop(pair.context) }
          );
          return;
        }
        seenPairs.set(pair.key, pair.value);
        if (pair.key === VsMetadataKey.Id) {
          valueSet.id = pair.value;
        } else if (pair.key === VsMetadataKey.Title) {
          valueSet.title = pair.value;
        } else if (pair.key === VsMetadataKey.Description) {
          valueSet.description = pair.value;
        }
      });
    vsRuleCtx.forEach(vsRule => {
      const rule = this.visitVsRule(vsRule);
      // if rule is a concept component,
      // we may be able to merge its concepts into an existing concept component.
      if (rule instanceof ValueSetConceptComponentRule) {
        const matchedComponent = valueSet.rules.find(existingComponent => {
          return (
            existingComponent instanceof ValueSetConceptComponentRule &&
            rule.inclusion == existingComponent.inclusion &&
            rule.from.system == existingComponent.from.system &&
            isEqual(sortBy(rule.from.valueSets), sortBy(existingComponent.from.valueSets))
          );
        }) as ValueSetConceptComponentRule;
        if (matchedComponent) {
          matchedComponent.concepts.push(...rule.concepts);
        } else {
          valueSet.rules.push(rule);
        }
      } else if (rule) {
        valueSet.rules.push(rule);
      }
    });
  }

  visitCodeSystem(ctx: pc.CodeSystemContext) {
    const codeSystem = new FshCodeSystem(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.currentDoc.codeSystems.has(codeSystem.name)) {
      logger.error(`Skipping code system: a code system named ${codeSystem.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      this.parseCodeSystem(codeSystem, ctx.csMetadata(), ctx.csRule());
      this.currentDoc.codeSystems.set(codeSystem.name, codeSystem);
    }
  }

  private parseCodeSystem(
    codeSystem: FshCodeSystem,
    metaCtx: pc.CsMetadataContext[] = [],
    csRuleCtx: pc.CsRuleContext[] = []
  ) {
    const seenPairs: Map<CsMetadataKey, string> = new Map();
    metaCtx
      .map(csMetadata => ({
        ...this.visitCsMetadata(csMetadata),
        context: csMetadata
      }))
      .forEach(pair => {
        if (seenPairs.has(pair.key)) {
          logger.error(
            `Metadata field '${pair.key}' already declared with value '${seenPairs.get(
              pair.key
            )}'.`,
            { file: this.currentFile, location: this.extractStartStop(pair.context) }
          );
          return;
        }
        seenPairs.set(pair.key, pair.value);
        if (pair.key === CsMetadataKey.Id) {
          codeSystem.id = pair.value;
        } else if (pair.key === CsMetadataKey.Title) {
          codeSystem.title = pair.value;
        } else if (pair.key === CsMetadataKey.Description) {
          codeSystem.description = pair.value;
        }
      });
    csRuleCtx.forEach(ruleCtx => {
      const rule = this.visitCsRule(ruleCtx);
      if (rule instanceof ConceptRule) {
        try {
          codeSystem.addConcept(rule);
        } catch (e) {
          logger.error(e.message, rule.sourceInfo);
        }
      } else if (rule) {
        codeSystem.rules.push(rule);
      }
    });
  }

  visitInvariant(ctx: pc.InvariantContext) {
    const invariant = new Invariant(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.currentDoc.invariants.has(invariant.name)) {
      logger.error(`Skipping Invariant: an Invariant named ${invariant.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      this.parseInvariant(invariant, ctx.invariantMetadata());
      if (invariant.description == null) {
        logger.error(`Invariant ${invariant.name} must have a Description.`, invariant.sourceInfo);
      }
      if (invariant.severity == null) {
        logger.error(`Invariant ${invariant.name} must have a Severity.`, invariant.sourceInfo);
      }
      this.currentDoc.invariants.set(invariant.name, invariant);
    }
  }

  private parseInvariant(invariant: Invariant, metaCtx: pc.InvariantMetadataContext[] = []) {
    const seenPairs: Map<InvariantMetadataKey, string | FshCode> = new Map();
    metaCtx
      .map(invariantMetadata => ({
        ...this.visitInvariantMetadata(invariantMetadata),
        context: invariantMetadata
      }))
      .forEach(pair => {
        if (seenPairs.has(pair.key)) {
          logger.error(
            `Metadata field '${pair.key}' already declared with value '${seenPairs.get(
              pair.key
            )}'.`,
            { file: this.currentFile, location: this.extractStartStop(pair.context) }
          );
          return;
        }
        seenPairs.set(pair.key, pair.value);
        if (pair.key === InvariantMetadataKey.Description) {
          invariant.description = pair.value as string;
        } else if (pair.key === InvariantMetadataKey.Expression) {
          invariant.expression = pair.value as string;
        } else if (pair.key === InvariantMetadataKey.Severity) {
          invariant.severity = pair.value as FshCode;
        } else if (pair.key === InvariantMetadataKey.XPath) {
          invariant.xpath = pair.value as string;
        }
      });
  }

  visitRuleSet(ctx: pc.RuleSetContext): void {
    const ruleSet = new RuleSet(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.currentDoc.ruleSets.has(ruleSet.name)) {
      logger.error(`Skipping RuleSet: a RuleSet named ${ruleSet.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      this.parseRuleSet(ruleSet, ctx.ruleSetRule());
      this.currentDoc.ruleSets.set(ruleSet.name, ruleSet);
    }
  }

  parseRuleSet(ruleSet: RuleSet, rules: pc.RuleSetRuleContext[]) {
    rules.forEach(rule => {
      if (rule.sdRule()) {
        ruleSet.rules.push(...this.visitSdRule(rule.sdRule()));
      } else if (rule.vsComponent()) {
        ruleSet.rules.push(this.visitVsComponent(rule.vsComponent()));
      } else if (rule.concept()) {
        ruleSet.rules.push(this.visitConcept(rule.concept()));
      }
    });
  }

  visitParamRuleSet(ctx: pc.ParamRuleSetContext): void {
    const paramRuleSet = new ParamRuleSet(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.paramRuleSets.has(paramRuleSet.name)) {
      logger.error(`Skipping RuleSet: a RuleSet named ${paramRuleSet.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      paramRuleSet.parameters = ctx
        .PARAMETER_DEF_LIST()
        .getText()
        .replace(/(^\()|(\)$)/g, '')
        .split(',')
        .map(param => param.trim());
      paramRuleSet.contents = this.visitParamRuleSetContent(ctx.paramRuleSetContent());
      const unusedParameters = paramRuleSet.getUnusedParameters();
      if (unusedParameters.length > 0) {
        logger.warn(
          `RuleSet ${paramRuleSet.name} contains unused parameter${
            unusedParameters.length > 1 ? 's' : ''
          }: ${unusedParameters.join(', ')}`,
          paramRuleSet.sourceInfo
        );
      }
      this.paramRuleSets.set(paramRuleSet.name, paramRuleSet);
    }
  }

  visitParamRuleSetContent(ctx: pc.ParamRuleSetContentContext): string {
    return ctx.start.getInputStream().getText(ctx.start.start, ctx.stop.stop);
  }

  visitMapping(ctx: pc.MappingContext): void {
    const mapping = new Mapping(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (this.currentDoc.mappings.has(mapping.name)) {
      logger.error(`Skipping Mapping: a Mapping named ${mapping.name} already exists.`, {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
    } else {
      this.parseMapping(mapping, ctx.mappingMetadata(), ctx.mappingEntityRule());
      this.currentDoc.mappings.set(mapping.name, mapping);
    }
  }

  parseMapping(
    mapping: Mapping,
    metaCtx: pc.MappingMetadataContext[] = [],
    ruleCtx: pc.MappingEntityRuleContext[] = []
  ): void {
    const seenPairs: Map<MappingMetadataKey, string> = new Map();
    metaCtx
      .map(mapMeta => ({ ...this.visitMappingMetadata(mapMeta), context: mapMeta }))
      .forEach(pair => {
        if (seenPairs.has(pair.key)) {
          logger.error(
            `Metadata field '${pair.key}' already declared with value '${seenPairs.get(
              pair.key
            )}'.`,
            { file: this.currentFile, location: this.extractStartStop(pair.context) }
          );
          return;
        }
        seenPairs.set(pair.key, pair.value);
        if (pair.key === MappingMetadataKey.Id) {
          mapping.id = pair.value;
        } else if (pair.key === MappingMetadataKey.Source) {
          mapping.source = pair.value;
        } else if (pair.key === MappingMetadataKey.Target) {
          mapping.target = pair.value;
        } else if (pair.key === MappingMetadataKey.Description) {
          mapping.description = pair.value;
        } else if (pair.key === MappingMetadataKey.Title) {
          mapping.title = pair.value;
        }
      });
    ruleCtx.forEach(mappingRule => {
      const rule = this.visitMappingEntityRule(mappingRule);
      if (rule) {
        mapping.rules.push(rule);
      }
    });
  }

  visitSdMetadata(ctx: pc.SdMetadataContext): { key: SdMetadataKey; value: string | string[] } {
    if (ctx.id()) {
      return { key: SdMetadataKey.Id, value: this.visitId(ctx.id()) };
    } else if (ctx.parent()) {
      return { key: SdMetadataKey.Parent, value: this.visitParent(ctx.parent()) };
    } else if (ctx.title()) {
      return { key: SdMetadataKey.Title, value: this.visitTitle(ctx.title()) };
    } else if (ctx.description()) {
      return { key: SdMetadataKey.Description, value: this.visitDescription(ctx.description()) };
    } else if (ctx.mixins()) {
      return { key: SdMetadataKey.Mixins, value: this.visitMixins(ctx.mixins()) };
    }
    return { key: SdMetadataKey.Unknown, value: ctx.getText() };
  }

  visitInstanceMetadata(
    ctx: pc.InstanceMetadataContext
  ): { key: InstanceMetadataKey; value: string | string[] } {
    if (ctx.instanceOf()) {
      return { key: InstanceMetadataKey.InstanceOf, value: this.visitInstanceOf(ctx.instanceOf()) };
    } else if (ctx.title()) {
      return { key: InstanceMetadataKey.Title, value: this.visitTitle(ctx.title()) };
    } else if (ctx.description()) {
      return {
        key: InstanceMetadataKey.Description,
        value: this.visitDescription(ctx.description())
      };
    } else if (ctx.usage()) {
      return {
        key: InstanceMetadataKey.Usage,
        value: this.visitUsage(ctx.usage())
      };
    } else if (ctx.mixins()) {
      return { key: InstanceMetadataKey.Mixins, value: this.visitMixins(ctx.mixins()) };
    }
    return { key: InstanceMetadataKey.Unknown, value: ctx.getText() };
  }

  visitVsMetadata(ctx: pc.VsMetadataContext): { key: VsMetadataKey; value: string } {
    if (ctx.id()) {
      return { key: VsMetadataKey.Id, value: this.visitId(ctx.id()) };
    } else if (ctx.title()) {
      return { key: VsMetadataKey.Title, value: this.visitTitle(ctx.title()) };
    } else if (ctx.description()) {
      return { key: VsMetadataKey.Description, value: this.visitDescription(ctx.description()) };
    }
    return { key: VsMetadataKey.Unknown, value: ctx.getText() };
  }

  visitCsMetadata(ctx: pc.CsMetadataContext): { key: CsMetadataKey; value: string } {
    if (ctx.id()) {
      return { key: CsMetadataKey.Id, value: this.visitId(ctx.id()) };
    } else if (ctx.title()) {
      return { key: CsMetadataKey.Title, value: this.visitTitle(ctx.title()) };
    } else if (ctx.description()) {
      return { key: CsMetadataKey.Description, value: this.visitDescription(ctx.description()) };
    }
    return { key: CsMetadataKey.Unknown, value: ctx.getText() };
  }

  visitInvariantMetadata(
    ctx: pc.InvariantMetadataContext
  ): { key: InvariantMetadataKey; value: string | FshCode } {
    if (ctx.description()) {
      return {
        key: InvariantMetadataKey.Description,
        value: this.visitDescription(ctx.description())
      };
    } else if (ctx.expression()) {
      return {
        key: InvariantMetadataKey.Expression,
        value: this.visitExpression(ctx.expression())
      };
    } else if (ctx.xpath()) {
      return {
        key: InvariantMetadataKey.XPath,
        value: this.visitXpath(ctx.xpath())
      };
    } else if (ctx.severity()) {
      return {
        key: InvariantMetadataKey.Severity,
        value: this.visitSeverity(ctx.severity())
      };
    }
    return {
      key: InvariantMetadataKey.Unknown,
      value: ctx.getText()
    };
  }

  visitMappingMetadata(ctx: pc.MappingMetadataContext): { key: MappingMetadataKey; value: string } {
    if (ctx.id()) {
      return { key: MappingMetadataKey.Id, value: this.visitId(ctx.id()) };
    } else if (ctx.source()) {
      return { key: MappingMetadataKey.Source, value: this.visitSource(ctx.source()) };
    } else if (ctx.target()) {
      return { key: MappingMetadataKey.Target, value: this.visitTarget(ctx.target()) };
    } else if (ctx.description()) {
      return {
        key: MappingMetadataKey.Description,
        value: this.visitDescription(ctx.description())
      };
    } else if (ctx.title()) {
      return { key: MappingMetadataKey.Title, value: this.visitTitle(ctx.title()) };
    }
    return { key: MappingMetadataKey.Unknown, value: ctx.getText() };
  }

  visitId(ctx: pc.IdContext): string {
    return ctx.SEQUENCE().getText();
  }

  visitParent(ctx: pc.ParentContext): string {
    return this.aliasAwareValue(ctx.SEQUENCE());
  }

  visitTitle(ctx: pc.TitleContext): string {
    return this.extractString(ctx.STRING());
  }

  visitDescription(ctx: pc.DescriptionContext): string {
    if (ctx.STRING()) {
      return this.extractString(ctx.STRING());
    }

    // it must be a multiline string
    return this.extractMultilineString(ctx.MULTILINE_STRING());
  }

  visitInstanceOf(ctx: pc.InstanceOfContext): string {
    return this.aliasAwareValue(ctx.SEQUENCE());
  }

  visitMixins(ctx: pc.MixinsContext): string[] {
    let mixins: string[];
    if (ctx.COMMA_DELIMITED_SEQUENCES()) {
      mixins = ctx
        .COMMA_DELIMITED_SEQUENCES()
        .getText()
        .split(/\s*,\s*/);
    } else {
      mixins = ctx.SEQUENCE().map(sequence => sequence.getText());
    }
    mixins = mixins.filter((m, i) => {
      const duplicated = mixins.indexOf(m) !== i;
      if (duplicated) {
        logger.warn(`Detected duplicated Mixin: ${m}. Ignoring duplicates.`, {
          location: this.extractStartStop(ctx),
          file: this.currentFile
        });
      }
      return !duplicated;
    });
    return mixins;
  }

  visitUsage(ctx: pc.UsageContext): InstanceUsage {
    const usageConcept = this.parseCodeLexeme(ctx.CODE().getText(), ctx.CODE())
      .withLocation(this.extractStartStop(ctx.CODE()))
      .withFile(this.currentFile);
    if (usageConcept.system?.length > 0) {
      logger.warn('Do not specify a system for instance Usage.', usageConcept.sourceInfo);
    }
    let usage = upperFirst(usageConcept.code);
    if (!isInstanceUsage(usage)) {
      logger.error(
        'Invalid Usage. Supported usage codes are "#example", "#definition", and "#inline". Instance will be treated as an example.',
        usageConcept.sourceInfo
      );
      usage = 'Example';
    }
    return usage as InstanceUsage;
  }

  visitExpression(ctx: pc.ExpressionContext): string {
    return this.extractString(ctx.STRING());
  }

  visitXpath(ctx: pc.XpathContext): string {
    return this.extractString(ctx.STRING());
  }

  visitSeverity(ctx: pc.SeverityContext): FshCode {
    const concept = this.parseCodeLexeme(ctx.CODE().getText(), ctx.CODE())
      .withLocation(this.extractStartStop(ctx.CODE()))
      .withFile(this.currentFile);
    if (concept.system?.length > 0) {
      logger.warn('Do not specify a system for invariant severity.', concept.sourceInfo);
    }
    if (concept.code != 'error' && concept.code != 'warning') {
      logger.error(
        'Invalid invariant severity code: code must be "#error" or "#warning".',
        concept.sourceInfo
      );
    }
    return concept;
  }

  visitSource(ctx: pc.SourceContext): string {
    return this.aliasAwareValue(ctx.SEQUENCE());
  }

  visitTarget(ctx: pc.TargetContext): string {
    return this.extractString(ctx.STRING());
  }

  private parseCodeLexeme(conceptText: string, parentCtx: ParserRuleContext): FshCode {
    const concept = parseCodeLexeme(conceptText);
    if (concept.system?.length > 0) {
      concept.system = this.aliasAwareValue(parentCtx, concept.system);
    }
    return concept;
  }

  visitSdRule(ctx: pc.SdRuleContext): SdRule[] {
    if (ctx.cardRule()) {
      return this.visitCardRule(ctx.cardRule());
    } else if (ctx.flagRule()) {
      return this.visitFlagRule(ctx.flagRule());
    } else if (ctx.valueSetRule()) {
      return [this.visitValueSetRule(ctx.valueSetRule())];
    } else if (ctx.fixedValueRule()) {
      const rule = this.visitFixedValueRule(ctx.fixedValueRule());
      return [rule];
    } else if (ctx.onlyRule()) {
      return [this.visitOnlyRule(ctx.onlyRule())];
    } else if (ctx.containsRule()) {
      return this.visitContainsRule(ctx.containsRule());
    } else if (ctx.caretValueRule()) {
      return [this.visitCaretValueRule(ctx.caretValueRule())];
    } else if (ctx.obeysRule()) {
      return this.visitObeysRule(ctx.obeysRule());
    } else if (ctx.insertRule()) {
      const rule = this.visitInsertRule(ctx.insertRule());
      return rule ? [rule] : [];
    }
    logger.warn(`Unsupported rule: ${ctx.getText()}`, {
      file: this.currentFile,
      location: this.extractStartStop(ctx)
    });
    return [];
  }

  visitInstanceRule(ctx: pc.InstanceRuleContext): AssignmentRule | InsertRule {
    if (ctx.fixedValueRule()) {
      return this.visitFixedValueRule(ctx.fixedValueRule());
    } else if (ctx.insertRule()) {
      return this.visitInsertRule(ctx.insertRule());
    }
  }

  visitVsRule(ctx: pc.VsRuleContext): ValueSetComponentRule | CaretValueRule | InsertRule {
    if (ctx.vsComponent()) {
      return this.visitVsComponent(ctx.vsComponent());
    }
    if (ctx.caretValueRule()) {
      const rule = this.visitCaretValueRule(ctx.caretValueRule());
      if (rule.path) {
        logger.error(
          'Caret rule on ValueSet cannot contain path before ^, skipping rule.',
          rule.sourceInfo
        );
      } else {
        return this.visitCaretValueRule(ctx.caretValueRule());
      }
    } else if (ctx.insertRule()) {
      return this.visitInsertRule(ctx.insertRule());
    }
  }

  visitCsRule(ctx: pc.CsRuleContext): ConceptRule | CaretValueRule | InsertRule {
    if (ctx.concept()) {
      return this.visitConcept(ctx.concept());
    } else if (ctx.caretValueRule()) {
      const rule = this.visitCaretValueRule(ctx.caretValueRule());
      if (rule.path) {
        logger.error(
          'Caret rule on CodeSystem cannot contain path before ^, skipping rule.',
          rule.sourceInfo
        );
      } else {
        return this.visitCaretValueRule(ctx.caretValueRule());
      }
    } else if (ctx.insertRule()) {
      return this.visitInsertRule(ctx.insertRule());
    }
  }

  visitMappingEntityRule(ctx: pc.MappingEntityRuleContext): MappingRule | InsertRule {
    if (ctx.mappingRule()) {
      return this.visitMappingRule(ctx.mappingRule());
    } else if (ctx.insertRule()) {
      return this.visitInsertRule(ctx.insertRule());
    }
  }

  visitPath(ctx: pc.PathContext): string {
    if (ctx.KW_SYSTEM()) {
      return ctx.KW_SYSTEM().getText();
    }
    return ctx.SEQUENCE().getText();
  }

  visitCaretPath(ctx: pc.CaretPathContext): string {
    return ctx.CARET_SEQUENCE().getText();
  }

  visitPaths(ctx: pc.PathsContext): string[] {
    return ctx
      .COMMA_DELIMITED_SEQUENCES()
      .getText()
      .split(/\s*,\s*/);
  }

  visitCardRule(ctx: pc.CardRuleContext): (CardRule | FlagRule)[] {
    const rules: (CardRule | FlagRule)[] = [];

    const cardRule = new CardRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    const card = this.parseCard(ctx.CARD().getText(), cardRule);
    cardRule.min = card.min;
    cardRule.max = card.max;
    rules.push(cardRule);

    if (ctx.flag() && ctx.flag().length > 0) {
      const flagRule = new FlagRule(cardRule.path)
        .withLocation(this.extractStartStop(ctx))
        .withFile(this.currentFile);
      this.parseFlags(flagRule, ctx.flag());
      rules.push(flagRule);
    }
    return rules;
  }

  private parseCard(card: string, rule: CardRule): { min: number; max: string } {
    const parts = card.split('..', 2);
    if (parts[0] === '' && parts[1] === '') {
      logger.error(
        `Neither side of the cardinality was specified on path "${rule.path}". A min, max, or both need to be specified.`,
        rule.sourceInfo
      );
    }
    return {
      min: parseInt(parts[0]),
      max: parts[1]
    };
  }

  visitFlagRule(ctx: pc.FlagRuleContext): FlagRule[] {
    let paths: string[];
    if (ctx.path().length > 0) {
      paths = ctx.path().map(path => this.visitPath(path));
    } else if (ctx.paths()) {
      logger.warn('Using "," to list paths is deprecated. Please use "and" to list paths.', {
        file: this.currentFile,
        location: this.extractStartStop(ctx.paths())
      });
      paths = this.visitPaths(ctx.paths());
    }

    return paths.map(path => {
      const flagRule = new FlagRule(path)
        .withLocation(this.extractStartStop(ctx))
        .withFile(this.currentFile);
      this.parseFlags(flagRule, ctx.flag());
      return flagRule;
    });
  }

  private parseFlags(flagRule: FlagRule, flagContext: pc.FlagContext[]): void {
    const flags = flagContext.map(f => this.visitFlag(f));
    if (flags.includes(Flag.MustSupport)) {
      flagRule.mustSupport = true;
    }
    if (flags.includes(Flag.Summary)) {
      flagRule.summary = true;
    }
    if (flags.includes(Flag.Modifier)) {
      flagRule.modifier = true;
    }
    if (flags.includes(Flag.TrialUse)) {
      flagRule.trialUse = true;
    }
    if (flags.includes(Flag.Normative)) {
      flagRule.normative = true;
    }
    if (flags.includes(Flag.Draft)) {
      flagRule.draft = true;
    }
  }

  visitFlag(ctx: pc.FlagContext): Flag {
    if (ctx.KW_MS()) {
      return Flag.MustSupport;
    } else if (ctx.KW_SU()) {
      return Flag.Summary;
    } else if (ctx.KW_MOD()) {
      return Flag.Modifier;
    } else if (ctx.KW_TU()) {
      return Flag.TrialUse;
    } else if (ctx.KW_NORMATIVE()) {
      return Flag.Normative;
    } else if (ctx.KW_DRAFT()) {
      return Flag.Draft;
    }
    return Flag.Unknown;
  }

  visitValueSetRule(ctx: pc.ValueSetRuleContext): BindingRule {
    const vsRule = new BindingRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    vsRule.valueSet = this.aliasAwareValue(ctx.SEQUENCE());
    vsRule.strength = ctx.strength() ? this.visitStrength(ctx.strength()) : 'required';
    if (ctx.KW_UNITS()) {
      logger.warn(
        'The "units" keyword is deprecated and has no effect. Support will be removed entirely in a future release.',
        vsRule.sourceInfo
      );
    }
    return vsRule;
  }

  visitStrength(ctx: pc.StrengthContext): string {
    if (ctx.KW_EXAMPLE()) {
      return 'example';
    } else if (ctx.KW_PREFERRED()) {
      return 'preferred';
    } else if (ctx.KW_EXTENSIBLE()) {
      return 'extensible';
    }
    return 'required';
  }

  visitFixedValueRule(ctx: pc.FixedValueRuleContext): AssignmentRule {
    const assignmentRule = new AssignmentRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    assignmentRule.value = this.visitValue(ctx.value());
    assignmentRule.exactly = ctx.KW_EXACTLY() != null;
    if (ctx.KW_UNITS()) {
      logger.warn(
        'The "units" keyword is deprecated and has no effect. Support will be removed entirely in a future release.',
        assignmentRule.sourceInfo
      );
    }
    assignmentRule.isInstance =
      ctx.value().SEQUENCE() != null && !this.allAliases.has(ctx.value().SEQUENCE().getText());
    return assignmentRule;
  }

  visitValue(ctx: pc.ValueContext): AssignmentValueType {
    // In cases where the parser encounters an error, ctx might be null
    if (ctx == null) {
      return;
    }

    if (ctx.SEQUENCE()) {
      return this.aliasAwareValue(ctx, ctx.SEQUENCE().getText());
    }

    if (ctx.STRING()) {
      return this.extractString(ctx.STRING());
    }

    if (ctx.MULTILINE_STRING()) {
      return this.extractMultilineString(ctx.MULTILINE_STRING());
    }

    if (ctx.NUMBER()) {
      return parseFloat(ctx.NUMBER().getText());
    }

    if (ctx.DATETIME()) {
      // for now, treat datetime like a string
      return ctx.DATETIME().getText();
    }

    if (ctx.TIME()) {
      // for now, treat datetime like a string
      return ctx.TIME().getText();
    }

    if (ctx.reference()) {
      return this.visitReference(ctx.reference());
    }

    if (ctx.canonical()) {
      return this.visitCanonical(ctx.canonical());
    }

    if (ctx.code()) {
      return this.visitCode(ctx.code());
    }

    if (ctx.quantity()) {
      return this.visitQuantity(ctx.quantity());
    }

    if (ctx.ratio()) {
      return this.visitRatio(ctx.ratio());
    }

    if (ctx.bool()) {
      return this.visitBool(ctx.bool());
    }
  }

  visitCode(ctx: pc.CodeContext): FshCode {
    const concept = this.parseCodeLexeme(ctx.CODE().getText(), ctx.CODE())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (ctx.STRING()) {
      concept.display = this.extractString(ctx.STRING());
    }
    return concept;
  }

  visitConcept(ctx: pc.ConceptContext): ConceptRule {
    const codePart = this.visitCode(ctx.code());
    const concept = new ConceptRule(codePart.code, codePart.display)
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (codePart.system) {
      logger.error(
        'Do not include the system when listing concepts for a code system.',
        concept.sourceInfo
      );
      // If this is on a ruleset, and if this rule is then used on a ValueSet, this could actually
      // be a ValueSetConceptComponent, and not a ConceptRule, in which case we should carry through
      // the system
      concept.system = codePart.system;
    }
    if (ctx.STRING()) {
      concept.definition = this.extractString(ctx.STRING());
    } else if (ctx.MULTILINE_STRING()) {
      concept.definition = this.extractMultilineString(ctx.MULTILINE_STRING());
    }
    return concept;
  }

  visitQuantity(ctx: pc.QuantityContext): FshQuantity {
    const value = parseFloat(ctx.NUMBER().getText());
    const delimitedUnit = ctx.UNIT().getText(); // e.g., 'mm'
    let displayUnit: string;
    if (ctx.STRING()) {
      displayUnit = this.extractString(ctx.STRING());
    }
    // the literal version of quantity always assumes UCUM code system
    const unit = new FshCode(delimitedUnit.slice(1, -1), 'http://unitsofmeasure.org', displayUnit)
      .withLocation(this.extractStartStop(ctx.UNIT()))
      .withFile(this.currentFile);
    const quantity = new FshQuantity(value, unit)
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    return quantity;
  }

  visitRatio(ctx: pc.RatioContext): FshRatio {
    const ratio = new FshRatio(
      this.visitRatioPart(ctx.ratioPart()[0]),
      this.visitRatioPart(ctx.ratioPart()[1])
    )
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    return ratio;
  }

  visitRatioPart(ctx: pc.RatioPartContext): FshQuantity {
    if (ctx.NUMBER()) {
      const quantity = new FshQuantity(parseFloat(ctx.NUMBER().getText()))
        .withLocation(this.extractStartStop(ctx.NUMBER()))
        .withFile(this.currentFile);
      return quantity;
    }
    return this.visitQuantity(ctx.quantity());
  }

  // This function is called when fixing a value, and a value can only be set
  // to a specific reference, not a choice of references.
  visitReference(ctx: pc.ReferenceContext): FshReference {
    let ref: FshReference;
    let parsedReferences: string[];
    if (ctx.OR_REFERENCE()) {
      parsedReferences = this.parseOrReference(ctx.OR_REFERENCE().getText());
      ref = new FshReference(this.aliasAwareValue(ctx.OR_REFERENCE(), parsedReferences[0]));
    } else {
      parsedReferences = this.parsePipeReference(ctx.PIPE_REFERENCE().getText());
      ref = new FshReference(this.aliasAwareValue(ctx.PIPE_REFERENCE(), parsedReferences[0]));
      logger.warn(
        'Using "|" to list references is deprecated. Please use "or" to list references.',
        {
          file: this.currentFile,
          location: this.extractStartStop(ctx)
        }
      );
    }
    if (parsedReferences.length > 1) {
      logger.error(
        'Multiple choices of references are not allowed when setting a value. Only the first choice will be used.',
        {
          file: this.currentFile,
          location: this.extractStartStop(ctx)
        }
      );
    }
    ref.withLocation(this.extractStartStop(ctx)).withFile(this.currentFile);
    if (ctx.STRING()) {
      ref.display = this.extractString(ctx.STRING());
    }
    return ref;
  }

  private parseOrReference(reference: string): string[] {
    return reference
      .slice(reference.indexOf('(') + 1, reference.length - 1)
      .split(/\s+or\s+/)
      .map(r => r.trim());
  }

  private parsePipeReference(reference: string): string[] {
    return reference
      .slice(reference.indexOf('(') + 1, reference.length - 1)
      .split(/\s*\|\s*/)
      .map(r => r.trim());
  }

  visitCanonical(ctx: pc.CanonicalContext): FshCanonical {
    const [canonicalText, versionText] = this.parseCanonical(ctx.CANONICAL().getText());
    const fshCanonical = new FshCanonical(canonicalText)
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    if (versionText) {
      fshCanonical.version = versionText;
    }
    return fshCanonical;
  }

  private parseCanonical(canonical: string): string[] {
    return canonical
      .slice(canonical.indexOf('(') + 1, canonical.length - 1)
      .split(/\s*\|\s*(.+)/)
      .map(str => str.trim());
  }

  visitBool(ctx: pc.BoolContext): boolean {
    return ctx.KW_TRUE() != null;
  }

  visitOnlyRule(ctx: pc.OnlyRuleContext): OnlyRule {
    const onlyRule = new OnlyRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    ctx.targetType().forEach(t => {
      if (t.reference()) {
        let referenceToken: ParserRuleContext;
        let references: string[];
        if (t.reference().OR_REFERENCE()) {
          referenceToken = t.reference().OR_REFERENCE();
          references = this.parseOrReference(referenceToken.getText());
        } else {
          referenceToken = t.reference().PIPE_REFERENCE();
          references = this.parsePipeReference(referenceToken.getText());
          logger.warn(
            'Using "|" to list references is deprecated. Please use "or" to list references.',
            {
              file: this.currentFile,
              location: this.extractStartStop(ctx)
            }
          );
        }
        references.forEach(r =>
          onlyRule.types.push({
            type: this.aliasAwareValue(referenceToken, r),
            isReference: true
          })
        );
      } else {
        onlyRule.types.push({ type: this.aliasAwareValue(t.SEQUENCE()) });
      }
    });
    return onlyRule;
  }

  visitContainsRule(ctx: pc.ContainsRuleContext): (ContainsRule | CardRule | FlagRule)[] {
    const rules: (ContainsRule | CardRule | FlagRule)[] = [];
    const containsRule = new ContainsRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);

    rules.push(containsRule);
    ctx.item().forEach(i => {
      let item: ContainsRuleItem;
      if (i.KW_NAMED()) {
        item = {
          type: this.aliasAwareValue(i.SEQUENCE()[0], i.SEQUENCE()[0].getText()),
          name: i.SEQUENCE()[1].getText()
        };
      } else {
        item = {
          name: i.SEQUENCE()[0].getText()
        };
      }
      containsRule.items.push(item);

      const cardRule = new CardRule(`${containsRule.path}[${item.name}]`)
        .withLocation(this.extractStartStop(i))
        .withFile(this.currentFile);
      const card = this.parseCard(i.CARD().getText(), cardRule);
      cardRule.min = card.min;
      cardRule.max = card.max;
      rules.push(cardRule);

      if (i.flag() && i.flag().length > 0) {
        const flagRule = new FlagRule(`${containsRule.path}[${item.name}]`)
          .withLocation(this.extractStartStop(i))
          .withFile(this.currentFile);
        this.parseFlags(flagRule, i.flag());
        rules.push(flagRule);
      }
    });
    return rules;
  }

  visitCaretValueRule(ctx: pc.CaretValueRuleContext): CaretValueRule {
    const path = ctx.path() ? this.visitPath(ctx.path()) : '';
    const caretValueRule = new CaretValueRule(path)
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);

    // Get the caret path, but slice off the starting ^
    caretValueRule.caretPath = this.visitCaretPath(ctx.caretPath()).slice(1);
    caretValueRule.value = this.visitValue(ctx.value());
    caretValueRule.isInstance =
      ctx.value()?.SEQUENCE() != null && !this.allAliases.has(ctx.value().SEQUENCE().getText());
    return caretValueRule;
  }

  visitObeysRule(ctx: pc.ObeysRuleContext): ObeysRule[] {
    const rules: ObeysRule[] = [];
    const path = ctx.path() ? this.visitPath(ctx.path()) : '';
    ctx.SEQUENCE().forEach(invariant => {
      const obeysRule = new ObeysRule(path)
        .withLocation(this.extractStartStop(ctx))
        .withFile(this.currentFile);
      obeysRule.invariant = invariant.getText();
      rules.push(obeysRule);
    });
    return rules;
  }

  visitInsertRule(ctx: pc.InsertRuleContext): InsertRule {
    const insertRule = new InsertRule()
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    const [rulesetName, ruleParams] = this.parseRulesetReference(ctx.RULESET_REFERENCE().getText());
    insertRule.ruleSet = rulesetName;
    if (ruleParams) {
      insertRule.params = this.parseInsertRuleParams(ruleParams);
      const ruleSet = this.paramRuleSets.get(insertRule.ruleSet);
      if (ruleSet) {
        const ruleSetIdentifier = JSON.stringify([ruleSet.name, ...insertRule.params]);
        if (ruleSet.parameters.length === insertRule.params.length) {
          // no need to create the appliedRuleSet again if we already have it
          if (!this.currentDoc.appliedRuleSets.has(ruleSetIdentifier)) {
            // create a new document with the substituted parameters
            const appliedFsh = `RuleSet: ${ruleSet.name}${EOL}${ruleSet.applyParameters(
              insertRule.params
            )}${EOL}`;
            const appliedRuleSet = this.parseGeneratedRuleSet(
              appliedFsh,
              ruleSet.name,
              ctx,
              insertRule
            );
            if (appliedRuleSet) {
              this.currentDoc.appliedRuleSets.set(ruleSetIdentifier, appliedRuleSet);
              return insertRule;
            } else {
              logger.error(
                `Failed to parse RuleSet ${
                  insertRule.ruleSet
                } with provided parameters (${insertRule.params.join(', ')})`,
                insertRule.sourceInfo
              );
            }
          }
        } else {
          logger.error(
            `Incorrect number of parameters applied to RuleSet ${insertRule.ruleSet}`,
            insertRule.sourceInfo
          );
        }
      } else {
        logger.error(
          `Could not find parameterized RuleSet named ${insertRule.ruleSet}`,
          insertRule.sourceInfo
        );
      }
    } else {
      return insertRule;
    }
  }

  private parseRulesetReference(reference: string): [string, string] {
    const paramListStart = reference.indexOf('(');
    if (paramListStart === -1) {
      return [reference.trim(), null];
    } else {
      return [reference.slice(0, paramListStart).trim(), reference.slice(paramListStart)];
    }
  }

  private parseInsertRuleParams(ruleText: string): string[] {
    // first, trim parentheses
    const ruleNoParens = ruleText.slice(1, ruleText.length - 1);
    // since backslash is the escape character, deal with literal backslash first
    const splitBackslash = ruleNoParens.split(/\\\\/g);
    // then, split the parameters apart with unescaped commas
    const splitComma = splitBackslash.map(substrBackslash => {
      return substrBackslash.split(/(?<!\\),/g).map(substrComma => {
        // then, make all the replacements: closing parenthesis and comma
        return substrComma.replace(/\\\)/g, ')').replace(/\\,/g, ',');
      });
    });
    const paramList: string[] = [];
    // if splitComma has more than one list, that means we split on literal backslash
    // so to rejoin all the strings, the last string joins the first string in the next sublist
    splitComma.forEach((list, index) => {
      list.forEach((paramPart, subIndex) => {
        if (index > 0 && subIndex === 0) {
          // join with \\ on the last param
          paramList.push(`${paramList.pop()}\\\\${paramPart}`);
        } else {
          // push a new param
          paramList.push(paramPart);
        }
      });
    });
    // trim whitespace from each parameter, since it may be formatted for readability
    return paramList.map(param => param.trim());
  }

  private parseGeneratedRuleSet(
    input: string,
    name: string,
    ctx: pc.InsertRuleContext,
    insertRule: InsertRule
  ) {
    // define a temporary document that will contain this RuleSet
    const tempDocument = new FSHDocument(this.currentFile);
    // save the currentDoc so it can be restored after parsing this RuleSet
    const parentDocument = this.currentDoc;
    this.currentDoc = tempDocument;
    // errors should be collected, not printed, when parsing generated documents
    // we should only retrieve errors if we are currently in the top-level parse
    let topLevelInfo: LoggerData;
    if (this.topLevelParse) {
      this.topLevelParse = false;
      topLevelInfo = switchToSecretLogger();
    }
    try {
      const subContext = this.parseDoc(input);
      this.visitDoc(subContext);
    } finally {
      // be sure to restore parentDocument
      this.currentDoc = parentDocument;
    }
    // if tempDocument has appliedRuleSets, merge them in
    tempDocument.appliedRuleSets.forEach((ruleSet, identifier) =>
      this.currentDoc.appliedRuleSets.set(identifier, ruleSet)
    );
    if (topLevelInfo) {
      // exit logger collection mode, write collected errors and warnings
      const collectedMessages = restoreMainLogger(topLevelInfo);
      this.topLevelParse = true;
      if (collectedMessages.errors.length > 0) {
        logger.error(
          [
            `Error${
              collectedMessages.errors.length > 1 ? 's' : ''
            } parsing insert rule with parameterized RuleSet ${name}`,
            ...collectedMessages.errors.map(log => `- ${log.message}`)
          ].join(EOL),
          insertRule.sourceInfo
        );
      }
      if (collectedMessages.warnings.length > 0) {
        logger.warn(
          [
            `Warning${
              collectedMessages.warnings.length > 1 ? 's' : ''
            } parsing insert rule with parameterized RuleSet ${name}`,
            ...collectedMessages.warnings.map(log => `- ${log.message}`)
          ].join(EOL),
          insertRule.sourceInfo
        );
      }
    }
    // if the RuleSet parsed successfully, it will be on the document, and we should return it.
    return tempDocument.ruleSets.get(name);
  }

  visitMappingRule(ctx: pc.MappingRuleContext): MappingRule {
    const path = ctx.path() ? this.visitPath(ctx.path()) : '';
    const mappingRule = new MappingRule(path)
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.currentFile);
    mappingRule.map = this.extractString(ctx.STRING()[0]);
    if (ctx.STRING().length > 1) {
      mappingRule.comment = this.extractString(ctx.STRING()[1]);
    }
    if (ctx.CODE()) {
      mappingRule.language = this.parseCodeLexeme(ctx.CODE().getText(), ctx.CODE())
        .withLocation(this.extractStartStop(ctx.CODE()))
        .withFile(this.currentFile);
      if (mappingRule.language.system?.length > 0) {
        logger.warn(
          'Do not specify a system for mapping language.',
          mappingRule.language.sourceInfo
        );
      }
    }
    return mappingRule;
  }

  visitVsComponent(ctx: pc.VsComponentContext): ValueSetComponentRule {
    const inclusion = ctx.KW_EXCLUDE() == null;
    let vsComponent: ValueSetConceptComponentRule | ValueSetFilterComponentRule;
    if (ctx.vsConceptComponent()) {
      vsComponent = new ValueSetConceptComponentRule(inclusion);
      [vsComponent.concepts, vsComponent.from] = this.visitVsConceptComponent(
        ctx.vsConceptComponent()
      );
    } else if (ctx.vsFilterComponent()) {
      vsComponent = new ValueSetFilterComponentRule(inclusion);
      [vsComponent.filters, vsComponent.from] = this.visitVsFilterComponent(
        ctx.vsFilterComponent()
      );
    }
    return vsComponent;
  }

  visitVsConceptComponent(ctx: pc.VsConceptComponentContext): [FshCode[], ValueSetComponentFrom] {
    const concepts: FshCode[] = [];
    const from: ValueSetComponentFrom = ctx.vsComponentFrom()
      ? this.visitVsComponentFrom(ctx.vsComponentFrom())
      : {};
    if (ctx.code().length === 1) {
      const singleCode = this.visitCode(ctx.code()[0]);
      if (singleCode.system && from.system) {
        logger.error(`Concept ${singleCode.code} specifies system multiple times`, {
          file: this.currentFile,
          location: this.extractStartStop(ctx)
        });
      } else if (singleCode.system) {
        from.system = singleCode.system;
        concepts.push(singleCode);
      } else if (from.system) {
        singleCode.system = from.system;
        concepts.push(singleCode);
      } else {
        logger.error(
          `Concept ${singleCode.code} must include system as "SYSTEM#CONCEPT" or "#CONCEPT from system SYSTEM"`,
          {
            file: this.currentFile,
            location: this.extractStartStop(ctx)
          }
        );
      }
    } else if (ctx.code().length > 1) {
      if (from.system) {
        ctx.code().forEach(code => {
          const newCode = this.visitCode(code);
          newCode.system = from.system;
          concepts.push(newCode);
        });
      } else {
        logger.error('System is required when listing concepts in a value set component', {
          file: this.currentFile,
          location: this.extractStartStop(ctx)
        });
      }
    } else if (ctx.COMMA_DELIMITED_CODES()) {
      logger.warn('Using "," to list concepts is deprecated. Please use "and" to list concepts.', {
        file: this.currentFile,
        location: this.extractStartStop(ctx)
      });
      if (from.system) {
        const codes = ctx
          .COMMA_DELIMITED_CODES()
          .getText()
          .split(/\s*,\s+#/);
        codes[0] = codes[0].slice(1);
        const location = this.extractStartStop(ctx.COMMA_DELIMITED_CODES());
        codes.forEach(code => {
          let codePart: string, description: string;
          if (code.charAt(0) == '"') {
            // codePart is a quoted string, just like description (if present).
            [codePart, description] = code
              .match(/"([^\s\\"]|\\"|\\\\)+(\s([^\s\\"]|\\"|\\\\)+)*"/g)
              .map(quotedString => quotedString.slice(1, -1));
          } else {
            // codePart is not a quoted string.
            // if there is a description after the code,
            // it will be separated by whitespace before the leading "
            const codeEnd = code.match(/\s+"/)?.index;
            if (codeEnd) {
              codePart = code.slice(0, codeEnd);
              description = code.slice(codeEnd).trim().slice(1, -1);
            } else {
              codePart = code.trim();
            }
          }
          concepts.push(
            new FshCode(codePart, from.system, description)
              .withLocation(location)
              .withFile(this.currentFile)
          );
        });
      } else {
        logger.error('System is required when listing concepts in a value set component', {
          file: this.currentFile,
          location: this.extractStartStop(ctx)
        });
      }
    }
    return [concepts, from];
  }

  visitVsFilterComponent(
    ctx: pc.VsFilterComponentContext
  ): [ValueSetFilter[], ValueSetComponentFrom] {
    const filters: ValueSetFilter[] = [];
    const from: ValueSetComponentFrom = ctx.vsComponentFrom()
      ? this.visitVsComponentFrom(ctx.vsComponentFrom())
      : {};
    if (ctx.vsFilterList()) {
      if (from.system) {
        ctx
          .vsFilterList()
          .vsFilterDefinition()
          .forEach(filterDefinition => {
            try {
              filters.push(this.visitVsFilterDefinition(filterDefinition));
            } catch (e) {
              logger.error(e, {
                location: this.extractStartStop(filterDefinition),
                file: this.currentFile
              });
            }
          });
      } else {
        logger.error('System is required when filtering a value set component', {
          file: this.currentFile,
          location: this.extractStartStop(ctx)
        });
      }
    }
    return [filters, from];
  }

  visitVsComponentFrom(ctx: pc.VsComponentFromContext): ValueSetComponentFrom {
    const from: ValueSetComponentFrom = {};
    if (ctx.vsFromSystem()) {
      from.system = this.aliasAwareValue(ctx.vsFromSystem().SEQUENCE());
    }
    if (ctx.vsFromValueset()) {
      if (ctx.vsFromValueset().SEQUENCE().length > 0) {
        from.valueSets = ctx
          .vsFromValueset()
          .SEQUENCE()
          .map(sequence => this.aliasAwareValue(sequence));
      } else if (ctx.vsFromValueset().COMMA_DELIMITED_SEQUENCES()) {
        logger.warn(
          'Using "," to list valuesets is deprecated. Please use "and" to list valuesets.',
          {
            file: this.currentFile,
            location: this.extractStartStop(ctx)
          }
        );
        from.valueSets = ctx
          .vsFromValueset()
          .COMMA_DELIMITED_SEQUENCES()
          .getText()
          .split(/\s*,\s*/)
          .map(fromVs =>
            this.aliasAwareValue(ctx.vsFromValueset().COMMA_DELIMITED_SEQUENCES(), fromVs.trim())
          );
      }
    }
    return from;
  }

  /**
   * The replace makes FSH permissive in regards to the official specifications,
   * which spells operator "descendant-of" as "descendent-of".
   * @see {@link http://hl7.org/fhir/valueset-filter-operator.html}
   */
  visitVsFilterDefinition(ctx: pc.VsFilterDefinitionContext): ValueSetFilter {
    const property = ctx.SEQUENCE().getText();
    const operator = ctx
      .vsFilterOperator()
      .getText()
      .toLocaleLowerCase()
      .replace('descendant', 'descendent') as VsOperator;
    if (ctx.vsFilterValue() == null && operator !== VsOperator.EXISTS) {
      throw new ValueSetFilterMissingValueError(operator);
    }
    const value = ctx.vsFilterValue() ? this.visitVsFilterValue(ctx.vsFilterValue()) : true;
    switch (operator) {
      case VsOperator.EQUALS:
      case VsOperator.IN:
      case VsOperator.NOT_IN:
        if (typeof value !== 'string') {
          throw new ValueSetFilterValueTypeError(operator, 'string');
        }
        break;
      case VsOperator.IS_A:
      case VsOperator.DESCENDENT_OF:
      case VsOperator.IS_NOT_A:
      case VsOperator.GENERALIZES:
        if (!(value instanceof FshCode)) {
          throw new ValueSetFilterValueTypeError(operator, 'code');
        }
        break;
      case VsOperator.REGEX:
        if (!(value instanceof RegExp)) {
          throw new ValueSetFilterValueTypeError(operator, 'regex');
        }
        break;
      case VsOperator.EXISTS:
        if (typeof value !== 'boolean') {
          throw new ValueSetFilterValueTypeError(operator, 'boolean');
        }
        break;
      default:
        throw new ValueSetFilterOperatorError(ctx.vsFilterOperator().getText());
    }
    return {
      property: property,
      operator: operator,
      value: value
    };
  }

  visitVsFilterValue(ctx: pc.VsFilterValueContext): ValueSetFilterValue {
    if (ctx.code()) {
      return this.visitCode(ctx.code());
    } else if (ctx.REGEX()) {
      return RegExp(ctx.REGEX().getText().slice(1, -1));
    } else if (ctx.STRING()) {
      return this.extractString(ctx.STRING());
    } else if (ctx.KW_TRUE()) {
      return true;
    } else if (ctx.KW_FALSE()) {
      return false;
    }
  }

  private validateAliasResolves(parentCtx: ParserRuleContext, value = parentCtx.getText()): void {
    const hasAlias = this.allAliases.has(value);
    if (!hasAlias && value.startsWith('$')) {
      logger.error(
        `Value ${value} does not resolve as alias, values beginning with "$" must resolve`,
        { location: this.extractStartStop(parentCtx), file: this.currentFile }
      );
    }
  }

  private aliasAwareValue(parentCtx: ParserRuleContext, value = parentCtx.getText()): string {
    this.validateAliasResolves(parentCtx, value);
    return this.allAliases.has(value) ? this.allAliases.get(value) : value;
  }

  private extractString(stringCtx: ParserRuleContext): string {
    const str = stringCtx?.getText() ?? '""'; // default to empty string if stringCtx is null
    const strNoQuotes = str.slice(1, str.length - 1); // Strip surrounding quotes

    // Replace escaped characters
    const splitBackslash = strNoQuotes.split(/\\\\/g);
    const replacedBackslash = splitBackslash.map(substrBackslash => {
      // Replace quote, newline, return, tab characters only if they were not preceded by a backslash to escape the escape character
      return substrBackslash
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    });
    return replacedBackslash.join('\\');
  }

  /**
   * Multiline strings receive special handling:
   * - if the first line contains only whitespace (including newline), toss it
   * - if the last line contains only whitespace (including newline), toss it
   * - if another line contains only whitespace, truncate it
   * - for all other non-whitespace lines, detect the shortest number of leading spaces and always trim that off;
   *   this allows authors to indent a whole block of text, but not have it indented in the output.
   */
  private extractMultilineString(mlStringCtx: ParserRuleContext): string {
    let mlstr = mlStringCtx.getText();

    // remove leading/trailing """
    mlstr = mlstr.slice(3, -3);

    // split into lines so we can process them to determine what leading spaces to trim
    let lines = mlstr.split(/\r?\n/);

    lines = lines.map(
      l => (l = l.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t'))
    );

    // if the first line is only whitespace, remove it
    if (lines[0].search(/\S/) === -1) {
      lines.shift();
    }

    // if the last line is only whitespace, remove it
    if (lines.length > 0 && lines[lines.length - 1].search(/\S/) === -1) {
      lines.pop();
    }

    lines = lines.map(l => (/^\s*$/.test(l) ? '' : l));

    // find the minimum number of spaces before the first char (ignore zero-length lines)
    let minSpaces = 0;
    lines.forEach(line => {
      const firstNonSpace = line.search(/\S|$/);
      const lineIsEmpty = /^$/.test(line);
      if (!lineIsEmpty && firstNonSpace >= 0 && (minSpaces === 0 || firstNonSpace < minSpaces)) {
        minSpaces = firstNonSpace;
      }
    });

    // consistently remove the common leading spaces and join the lines back together
    return lines.map(l => (l.length >= minSpaces ? l.slice(minSpaces) : l)).join('\n');
  }

  private extractStartStop(ctx: ParserRuleContext): TextLocation {
    if (ctx instanceof TerminalNode) {
      return {
        startLine: ctx.symbol.line,
        startColumn: ctx.symbol.column + 1,
        endLine: ctx.symbol.line,
        endColumn: ctx.symbol.stop - ctx.symbol.start + ctx.symbol.column + 1
      };
    } else {
      return {
        startLine: ctx.start.line,
        startColumn: ctx.start.column + 1,
        endLine: ctx.stop.line,
        endColumn: ctx.stop.stop - ctx.stop.start + ctx.stop.column + 1
      };
    }
  }

  // NOTE: Since the ANTLR parser/lexer is JS (not typescript), we need to use some ts-ignore here.
  private parseDoc(input: string, file?: string): pc.DocContext {
    const chars = new InputStream(input);
    const lexer = new FSHLexer(chars);
    const listener = new FSHErrorListener(file);
    // @ts-ignore
    lexer.removeErrorListeners();
    // @ts-ignore
    lexer.addErrorListener(listener);
    // @ts-ignore
    const tokens = new CommonTokenStream(lexer);
    const parser = new FSHParser(tokens);
    // @ts-ignore
    parser.removeErrorListeners();
    // @ts-ignore
    parser.addErrorListener(listener);
    // @ts-ignore
    parser.buildParseTrees = true;
    // @ts-ignore
    return parser.doc() as DocContext;
  }
}
