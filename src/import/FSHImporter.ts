import * as pc from './parserContexts';
import { FSHDocument } from './FSHDocument';
import { FSHVisitor } from './generated/FSHVisitor';
import { Profile, Extension, Code, Quantity, Ratio } from '../fshtypes';
import {
  Rule,
  CardRule,
  FlagRule,
  ValueSetRule,
  FixedValueRule,
  FixedValueType,
  OnlyRule
} from '../fshtypes/rules';
import { ParserRuleContext } from 'antlr4';

enum SdMetadataKey {
  Id,
  Parent,
  Title,
  Description,
  Unknown
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
      console.error('FSHImporter cannot be re-used. Construct a new instance.');
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
  }

  visitAlias(ctx: pc.AliasContext): void {
    this.doc.aliases.set(ctx.SEQUENCE()[0].getText(), ctx.SEQUENCE()[1].getText());
  }

  visitProfile(ctx: pc.ProfileContext) {
    const profile = new Profile(ctx.SEQUENCE().getText());
    this.parseProfileOrExtension(profile, ctx.sdMetadata(), ctx.sdRule());
    this.doc.profiles.set(profile.name, profile);
  }

  visitExtension(ctx: pc.ExtensionContext) {
    const extension = new Extension(ctx.SEQUENCE().getText());
    this.parseProfileOrExtension(extension, ctx.sdMetadata(), ctx.sdRule());
    this.doc.extensions.set(extension.name, extension);
  }

  private parseProfileOrExtension(
    def: Profile | Extension,
    metaCtx: pc.SdMetadataContext[] = [],
    ruleCtx: pc.SdRuleContext[] = []
  ): void {
    metaCtx
      .map(sdMeta => this.visitSdMetadata(sdMeta))
      .forEach(pair => {
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
    }
    console.log('Unsupported rule: ', ctx.getText());
    return [];
  }

  visitPath(ctx: pc.PathContext): string {
    return ctx.SEQUENCE().getText();
  }

  visitPaths(ctx: pc.PathsContext): string[] {
    return ctx
      .COMMA_DELIMITED_SEQUENCES()
      .getText()
      .split(/,\s+/);
  }

  visitCardRule(ctx: pc.CardRuleContext): (CardRule | FlagRule)[] {
    const rules: (CardRule | FlagRule)[] = [];

    const cardRule = new CardRule(this.visitPath(ctx.path()));
    const card = this.parseCard(ctx.CARD().getText());
    cardRule.min = card.min;
    cardRule.max = card.max;
    rules.push(cardRule);

    if (ctx.flag() && ctx.flag().length > 0) {
      const flagRule = new FlagRule(cardRule.path);
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
      const flagRule = new FlagRule(path);
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
    const vsRule = new ValueSetRule(this.visitPath(ctx.path()));
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
    const fixedValueRule = new FixedValueRule(this.visitPath(ctx.path()));
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

  visitCode(ctx: pc.CodeContext): Code {
    const [system, code] = ctx
      .CODE()
      .getText()
      .split('#', 2);
    const concept = new Code(code);
    if (system && system.length > 0) {
      concept.system = this.aliasAwareValue(system);
    }
    if (ctx.STRING()) {
      concept.display = this.extractString(ctx.STRING());
    }
    return concept;
  }

  visitQuantity(ctx: pc.QuantityContext): Quantity {
    const value = parseFloat(ctx.NUMBER().getText());
    const delimitedUnit = ctx.UNIT().getText(); // e.g., 'mm'
    // the literal version of quantity always assumes UCUM code system
    const unit = new Code(delimitedUnit.slice(1, -1), 'http://unitsofmeasure.org');
    return new Quantity(value, unit);
  }

  visitRatio(ctx: pc.RatioContext): Ratio {
    return new Ratio(
      this.visitRatioPart(ctx.ratioPart()[0]),
      this.visitRatioPart(ctx.ratioPart()[1])
    );
  }

  visitRatioPart(ctx: pc.RatioPartContext): Quantity {
    if (ctx.NUMBER()) {
      return new Quantity(parseFloat(ctx.NUMBER().getText()));
    }
    return this.visitQuantity(ctx.quantity());
  }

  visitBool(ctx: pc.BoolContext): boolean {
    return ctx.KW_TRUE() != null;
  }

  visitOnlyRule(ctx: pc.OnlyRuleContext): OnlyRule {
    const onlyRule = new OnlyRule(this.visitPath(ctx.path()));
    onlyRule.types = ctx.SEQUENCE().map(s => this.aliasAwareValue(s.getText()));
    return onlyRule;
  }

  private aliasAwareValue(value: string): string {
    return this.doc.aliases.has(value) ? this.doc.aliases.get(value) : value;
  }

  private extractString(stringCtx: ParserRuleContext): string {
    const str = stringCtx.getText();
    return str.slice(1, str.length - 1);
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
}
