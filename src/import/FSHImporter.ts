import * as pc from './parserContexts';
import { FSHDocument } from './FSHDocument';
import { FSHVisitor } from './generated/FSHVisitor';
import {
  Profile,
  Extension,
  FshCode,
  FshQuantity,
  FshRatio,
  TextLocation,
  Instance,
  ValueSet,
  ValueSetComponent,
  ValueSetConceptComponent,
  VsProperty,
  ValueSetFilterComponent,
  ValueSetComponentFrom,
  ValueSetFilter,
  VsOperator
} from '../fshtypes';
import {
  Rule,
  CardRule,
  FlagRule,
  ValueSetRule,
  FixedValueRule,
  FixedValueType,
  OnlyRule,
  ContainsRule,
  CaretValueRule
} from '../fshtypes/rules';
import { ParserRuleContext } from 'antlr4';
import { logger } from '../utils/FSHLogger';
import { TerminalNode } from 'antlr4/tree/Tree';
import {
  RequiredMetadataError,
  ValueSetFilterPropertyError,
  ValueSetFilterOperatorError,
  ValueSetFilterValueTypeError,
  ValueSetFilterMissingValueError
} from '../errors';

enum SdMetadataKey {
  Id = 'Id',
  Parent = 'Parent',
  Title = 'Title',
  Description = 'Description',
  Unknown = 'Unknown'
}

enum InstanceMetadataKey {
  InstanceOf = 'InstanceOf',
  Title = 'Title',
  Unknown = 'Unknown'
}

enum VsMetadataKey {
  Id = 'Id',
  Title = 'Title',
  Description = 'Description',
  Unknown = 'Unknown'
}

enum Flag {
  MustSupport,
  Summary,
  Modifier,
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
  private used = false;
  private readonly doc: FSHDocument;

  constructor(public readonly file: string = '') {
    super();
    this.doc = new FSHDocument(file);
  }

  visitDoc(ctx: pc.DocContext): FSHDocument {
    if (this.used) {
      logger.error('FSHImporter cannot be re-used. Construct a new instance.');
      return;
    }
    this.used = true;

    // First collect the aliases
    ctx.entity().forEach(e => {
      if (e.alias()) {
        this.visitAlias(e.alias());
      }
    });

    // Now process the rest of the document
    ctx.entity().forEach(e => {
      this.visitEntity(e);
    });

    return this.doc;
  }

  visitEntity(ctx: pc.EntityContext): void {
    if (ctx.alias()) {
      this.visitAlias(ctx.alias());
    }

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
  }

  visitAlias(ctx: pc.AliasContext): void {
    this.doc.aliases.set(ctx.SEQUENCE()[0].getText(), ctx.SEQUENCE()[1].getText());
  }

  visitProfile(ctx: pc.ProfileContext) {
    const profile = new Profile(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    this.parseProfileOrExtension(profile, ctx.sdMetadata(), ctx.sdRule());
    this.doc.profiles.set(profile.name, profile);
  }

  visitExtension(ctx: pc.ExtensionContext) {
    const extension = new Extension(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    this.parseProfileOrExtension(extension, ctx.sdMetadata(), ctx.sdRule());
    this.doc.extensions.set(extension.name, extension);
  }

  private parseProfileOrExtension(
    def: Profile | Extension,
    metaCtx: pc.SdMetadataContext[] = [],
    ruleCtx: pc.SdRuleContext[] = []
  ): void {
    const seenPairs: Map<SdMetadataKey, string> = new Map();
    metaCtx
      .map(sdMeta => ({ ...this.visitSdMetadata(sdMeta), context: sdMeta }))
      .forEach(pair => {
        if (seenPairs.has(pair.key)) {
          logger.error(
            `Metadata field '${pair.key}' already declared with value '${seenPairs.get(
              pair.key
            )}'.`,
            { file: this.file, location: this.extractStartStop(pair.context) }
          );
          return;
        }
        seenPairs.set(pair.key, pair.value);
        if (pair.key === SdMetadataKey.Id) {
          def.id = pair.value;
        } else if (pair.key === SdMetadataKey.Parent) {
          def.parent = pair.value;
        } else if (pair.key === SdMetadataKey.Title) {
          def.title = pair.value;
        } else if (pair.key === SdMetadataKey.Description) {
          def.description = pair.value;
        }
      });
    ruleCtx.forEach(sdRule => {
      def.rules.push(...this.visitSdRule(sdRule));
    });
  }

  visitInstance(ctx: pc.InstanceContext) {
    const instance = new Instance(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    try {
      this.parseInstance(instance, ctx.instanceMetadata(), ctx.fixedValueRule());
      this.doc.instances.set(instance.name, instance);
    } catch (e) {
      logger.error(e.message, instance.sourceInfo);
    }
  }

  private parseInstance(
    instance: Instance,
    metaCtx: pc.InstanceMetadataContext[] = [],
    ruleCtx: pc.FixedValueRuleContext[] = []
  ): void {
    const seenPairs: Map<InstanceMetadataKey, string> = new Map();
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
            { file: this.file, location: this.extractStartStop(pair.context) }
          );
          return;
        }
        seenPairs.set(pair.key, pair.value);
        if (pair.key === InstanceMetadataKey.InstanceOf) {
          instance.instanceOf = pair.value;
        } else if (pair.key === InstanceMetadataKey.Title) {
          instance.title = pair.value;
        }
      });
    if (!instance.instanceOf) {
      throw new RequiredMetadataError('InstanceOf', 'Instance', instance.name);
    }
    ruleCtx.forEach(fvRule => {
      instance.rules.push(this.visitFixedValueRule(fvRule));
    });
  }

  visitValueSet(ctx: pc.ValueSetContext) {
    const valueSet = new ValueSet(ctx.SEQUENCE().getText())
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    this.parseValueSet(valueSet, ctx.vsMetadata(), ctx.vsComponent());
    this.doc.valueSets.set(valueSet.name, valueSet);
  }

  private parseValueSet(
    valueSet: ValueSet,
    metaCtx: pc.VsMetadataContext[] = [],
    componentCtx: pc.VsComponentContext[] = []
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
            { file: this.file, location: this.extractStartStop(pair.context) }
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
    componentCtx
      .map(vsComponentCtx => this.visitVsComponent(vsComponentCtx))
      .forEach(vsComponent => {
        valueSet.components.push(vsComponent);
      });
  }

  visitSdMetadata(ctx: pc.SdMetadataContext): { key: SdMetadataKey; value: string } {
    if (ctx.id()) {
      return { key: SdMetadataKey.Id, value: this.visitId(ctx.id()) };
    } else if (ctx.parent()) {
      return { key: SdMetadataKey.Parent, value: this.visitParent(ctx.parent()) };
    } else if (ctx.title()) {
      return { key: SdMetadataKey.Title, value: this.visitTitle(ctx.title()) };
    } else if (ctx.description()) {
      return { key: SdMetadataKey.Description, value: this.visitDescription(ctx.description()) };
    }
    return { key: SdMetadataKey.Unknown, value: ctx.getText() };
  }

  visitInstanceMetadata(
    ctx: pc.InstanceMetadataContext
  ): { key: InstanceMetadataKey; value: string } {
    if (ctx.instanceOf()) {
      return { key: InstanceMetadataKey.InstanceOf, value: this.visitInstanceOf(ctx.instanceOf()) };
    } else if (ctx.title()) {
      return { key: InstanceMetadataKey.Title, value: this.visitTitle(ctx.title()) };
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

  visitId(ctx: pc.IdContext): string {
    return ctx.SEQUENCE().getText();
  }

  visitParent(ctx: pc.ParentContext): string {
    return this.aliasAwareValue(ctx.SEQUENCE().getText());
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
    return this.aliasAwareValue(ctx.SEQUENCE().getText());
  }

  visitSdRule(ctx: pc.SdRuleContext): Rule[] {
    if (ctx.cardRule()) {
      return this.visitCardRule(ctx.cardRule());
    } else if (ctx.flagRule()) {
      return this.visitFlagRule(ctx.flagRule());
    } else if (ctx.valueSetRule()) {
      return [this.visitValueSetRule(ctx.valueSetRule())];
    } else if (ctx.fixedValueRule()) {
      return [this.visitFixedValueRule(ctx.fixedValueRule())];
    } else if (ctx.onlyRule()) {
      return [this.visitOnlyRule(ctx.onlyRule())];
    } else if (ctx.containsRule()) {
      return this.visitContainsRule(ctx.containsRule());
    } else if (ctx.caretValueRule()) {
      return [this.visitCaretValueRule(ctx.caretValueRule())];
    }
    logger.warn(`Unsupported rule: ${ctx.getText()}`, {
      file: this.file,
      location: this.extractStartStop(ctx)
    });
    return [];
  }

  visitPath(ctx: pc.PathContext): string {
    return ctx.SEQUENCE().getText();
  }

  visitCaretPath(ctx: pc.CaretPathContext): string {
    return ctx.CARET_SEQUENCE().getText();
  }

  visitPaths(ctx: pc.PathsContext): string[] {
    return ctx
      .COMMA_DELIMITED_SEQUENCES()
      .getText()
      .split(/,\s+/);
  }

  visitCardRule(ctx: pc.CardRuleContext): (CardRule | FlagRule)[] {
    const rules: (CardRule | FlagRule)[] = [];

    const cardRule = new CardRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    const card = this.parseCard(ctx.CARD().getText());
    cardRule.min = card.min;
    cardRule.max = card.max;
    rules.push(cardRule);

    if (ctx.flag() && ctx.flag().length > 0) {
      const flagRule = new FlagRule(cardRule.path)
        .withLocation(this.extractStartStop(ctx))
        .withFile(this.file);
      this.parseFlags(flagRule, ctx.flag());
      rules.push(flagRule);
    }
    return rules;
  }

  private parseCard(card: string): { min: number; max: string } {
    const parts = card.split('..', 2);
    return {
      min: parseInt(parts[0]),
      max: parts[1]
    };
  }

  visitFlagRule(ctx: pc.FlagRuleContext): FlagRule[] {
    let paths: string[];
    if (ctx.path()) {
      paths = [this.visitPath(ctx.path())];
    } else if (ctx.paths()) {
      paths = this.visitPaths(ctx.paths());
    }

    return paths.map(path => {
      const flagRule = new FlagRule(path)
        .withLocation(this.extractStartStop(ctx))
        .withFile(this.file);
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
  }

  visitFlag(ctx: pc.FlagContext): Flag {
    if (ctx.KW_MS()) {
      return Flag.MustSupport;
    } else if (ctx.KW_SU()) {
      return Flag.Summary;
    } else if (ctx.KW_MOD()) {
      return Flag.Modifier;
    }
    return Flag.Unknown;
  }

  visitValueSetRule(ctx: pc.ValueSetRuleContext): ValueSetRule {
    const vsRule = new ValueSetRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    vsRule.valueSet = this.aliasAwareValue(ctx.SEQUENCE().getText());
    vsRule.strength = ctx.strength() ? this.visitStrength(ctx.strength()) : 'required';
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

  visitFixedValueRule(ctx: pc.FixedValueRuleContext): FixedValueRule {
    const fixedValueRule = new FixedValueRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    fixedValueRule.fixedValue = this.visitValue(ctx.value());
    return fixedValueRule;
  }

  visitValue(ctx: pc.ValueContext): FixedValueType {
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
    const conceptText = ctx
      .CODE()
      .getText()
      .split('#', 2);
    const system = conceptText[0];
    let code = conceptText[1];
    if (code.startsWith('"')) {
      code = code
        .slice(1, code.length - 1)
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"');
    }
    const concept = new FshCode(code).withLocation(this.extractStartStop(ctx)).withFile(this.file);
    if (system && system.length > 0) {
      concept.system = this.aliasAwareValue(system);
    }
    if (ctx.STRING()) {
      concept.display = this.extractString(ctx.STRING());
    }
    return concept;
  }

  visitQuantity(ctx: pc.QuantityContext): FshQuantity {
    const value = parseFloat(ctx.NUMBER().getText());
    const delimitedUnit = ctx.UNIT().getText(); // e.g., 'mm'
    // the literal version of quantity always assumes UCUM code system
    const unit = new FshCode(delimitedUnit.slice(1, -1), 'http://unitsofmeasure.org')
      .withLocation(this.extractStartStop(ctx.UNIT()))
      .withFile(this.file);
    const quantity = new FshQuantity(value, unit)
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    return quantity;
  }

  visitRatio(ctx: pc.RatioContext): FshRatio {
    const ratio = new FshRatio(
      this.visitRatioPart(ctx.ratioPart()[0]),
      this.visitRatioPart(ctx.ratioPart()[1])
    )
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    return ratio;
  }

  visitRatioPart(ctx: pc.RatioPartContext): FshQuantity {
    if (ctx.NUMBER()) {
      const quantity = new FshQuantity(parseFloat(ctx.NUMBER().getText()))
        .withLocation(this.extractStartStop(ctx.NUMBER()))
        .withFile(this.file);
      return quantity;
    }
    return this.visitQuantity(ctx.quantity());
  }

  visitBool(ctx: pc.BoolContext): boolean {
    return ctx.KW_TRUE() != null;
  }

  visitOnlyRule(ctx: pc.OnlyRuleContext): OnlyRule {
    const onlyRule = new OnlyRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);
    ctx.targetType().forEach(t => {
      if (t.REFERENCE()) {
        const text = t.REFERENCE().getText();
        const references = text.slice(text.indexOf('(') + 1, text.length - 1).split(/\s*\|\s*/);
        references.forEach(r =>
          onlyRule.types.push({ type: this.aliasAwareValue(r), isReference: true })
        );
      } else {
        onlyRule.types.push({ type: this.aliasAwareValue(t.SEQUENCE().getText()) });
      }
    });
    return onlyRule;
  }

  visitContainsRule(ctx: pc.ContainsRuleContext): (ContainsRule | CardRule | FlagRule)[] {
    const rules: (ContainsRule | CardRule | FlagRule)[] = [];
    const containsRule = new ContainsRule(this.visitPath(ctx.path()))
      .withLocation(this.extractStartStop(ctx))
      .withFile(this.file);

    rules.push(containsRule);
    ctx.item().forEach(i => {
      const item = i.SEQUENCE().getText();
      containsRule.items.push(item);

      const cardRule = new CardRule(`${containsRule.path}[${item}]`)
        .withLocation(this.extractStartStop(i))
        .withFile(this.file);
      const card = this.parseCard(i.CARD().getText());
      cardRule.min = card.min;
      cardRule.max = card.max;
      rules.push(cardRule);

      if (i.flag() && i.flag().length > 0) {
        const flagRule = new FlagRule(`${containsRule.path}[${item}]`)
          .withLocation(this.extractStartStop(i))
          .withFile(this.file);
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
      .withFile(this.file);

    // Get the caret path, but slice off the starting ^
    caretValueRule.caretPath = this.visitCaretPath(ctx.caretPath()).slice(1);
    caretValueRule.value = this.visitValue(ctx.value());
    return caretValueRule;
  }

  visitVsComponent(ctx: pc.VsComponentContext): ValueSetComponent {
    const inclusion = ctx.KW_EXCLUDE() == null;
    let vsComponent: ValueSetConceptComponent | ValueSetFilterComponent;
    if (ctx.vsConceptComponent()) {
      vsComponent = new ValueSetConceptComponent(inclusion);
      [vsComponent.concepts, vsComponent.from] = this.visitVsConceptComponent(
        ctx.vsConceptComponent()
      );
    } else if (ctx.vsFilterComponent()) {
      vsComponent = new ValueSetFilterComponent(inclusion);
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
    if (ctx.code()) {
      const singleCode = this.visitCode(ctx.code());
      if (singleCode.system && from.system) {
        logger.error(`Concept ${singleCode.code} specifies system multiple times`, {
          file: this.file,
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
            file: this.file,
            location: this.extractStartStop(ctx)
          }
        );
      }
    } else if (ctx.COMMA_DELIMITED_CODES()) {
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
            description = code
              .slice(codeEnd)
              .trim()
              .slice(1, -1);
          } else {
            codePart = code.trim();
          }
        }
        concepts.push(
          new FshCode(codePart, from.system, description).withLocation(location).withFile(this.file)
        );
      });
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
      ctx
        .vsFilterList()
        .vsFilterDefinition()
        .forEach(filterDefinition => {
          try {
            filters.push(this.visitVsFilterDefinition(filterDefinition));
          } catch (e) {
            logger.error(e, {
              location: this.extractStartStop(filterDefinition),
              file: this.file
            });
          }
        });
    }
    return [filters, from];
  }

  visitVsComponentFrom(ctx: pc.VsComponentFromContext): ValueSetComponentFrom {
    const from: ValueSetComponentFrom = {};
    if (ctx.vsFromSystem()) {
      from.system = ctx
        .vsFromSystem()
        .SEQUENCE()
        .getText();
    }
    if (ctx.vsFromValueset()) {
      if (ctx.vsFromValueset().SEQUENCE()) {
        from.valueSets = [
          ctx
            .vsFromValueset()
            .SEQUENCE()
            .getText()
        ];
      } else if (ctx.vsFromValueset().COMMA_DELIMITED_SEQUENCES()) {
        from.valueSets = ctx
          .vsFromValueset()
          .COMMA_DELIMITED_SEQUENCES()
          .getText()
          .split(',')
          .map(fromVs => fromVs.trim());
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
    const property = ctx
      .SEQUENCE()
      .getText()
      .toLocaleLowerCase() as VsProperty;
    if (Object.values(VsProperty).indexOf(property) < 0) {
      throw new ValueSetFilterPropertyError(ctx.SEQUENCE().getText());
    }
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

  visitVsFilterValue(ctx: pc.VsFilterValueContext): string | RegExp | boolean | FshCode {
    if (ctx.code()) {
      return this.visitCode(ctx.code());
    } else if (ctx.REGEX()) {
      return RegExp(
        ctx
          .REGEX()
          .getText()
          .slice(1, -1)
      );
    } else if (ctx.STRING()) {
      return this.extractString(ctx.STRING());
    } else if (ctx.KW_TRUE()) {
      return true;
    } else if (ctx.KW_FALSE()) {
      return false;
    }
  }

  private aliasAwareValue(value: string): string {
    return this.doc.aliases.has(value) ? this.doc.aliases.get(value) : value;
  }

  private extractString(stringCtx: ParserRuleContext): string {
    const str = stringCtx.getText();
    return str
      .slice(1, str.length - 1)
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"');
  }

  /**
   * Multiline strings receive special handling:
   * - if the first line contains only a newline, toss it
   * - if the last line contains only whitespace (including newline), toss it
   * - for all other lines, detect the shortest number of leading spaces and always trim that off;
   *   this allows authors to indent a whole block of text, but not have it indented in the output.
   */
  private extractMultilineString(mlStringCtx: ParserRuleContext): string {
    let mlstr = mlStringCtx.getText();

    // first remove leading/trailing """ and leading newline (if applicable)
    mlstr = mlstr.slice(mlstr[3] === '\n' ? 4 : 3, -3);

    // split into lines so we can process them to determine what leading spaces to trim
    const lines = mlstr.split('\n');

    // if the last line is only whitespace, remove it
    if (lines[lines.length - 1].search(/\S/) === -1) {
      lines.pop();
    }

    // find the minimum number of spaces before the first char (ignore zero-length lines)
    let minSpaces = 0;
    lines.forEach(line => {
      const firstNonSpace = line.search(/\S|$/);
      if (firstNonSpace > 0 && (minSpaces === 0 || firstNonSpace < minSpaces)) {
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
}
