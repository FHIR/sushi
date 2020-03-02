import { ParserRuleContext } from 'antlr4';

export interface DocContext extends ParserRuleContext {
  entity(): EntityContext[];
}

export interface EntityContext extends ParserRuleContext {
  alias(): AliasContext;
  profile(): ProfileContext;
  extension(): ExtensionContext;
  instance(): InstanceContext;
  valueSet(): ValueSetContext;
  codeSystem(): CodeSystemContext;
  invariant(): InvariantContext;
}

export interface AliasContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext[];
}

export interface ProfileContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  sdMetadata(): SdMetadataContext[];
  sdRule(): SdRuleContext[];
}

export interface ExtensionContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  sdMetadata(): SdMetadataContext[];
  sdRule(): SdRuleContext[];
}

export interface SdMetadataContext extends ParserRuleContext {
  parent(): ParentContext;
  id(): IdContext;
  title(): TitleContext;
  description(): DescriptionContext;
}

export interface InstanceContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  instanceMetadata(): InstanceMetadataContext[];
  fixedValueRule(): FixedValueRuleContext[];
}

export interface InstanceMetadataContext extends ParserRuleContext {
  instanceOf(): InstanceOfContext;
  title(): TitleContext;
  description(): DescriptionContext;
  type(): TypeContext;
}

export interface ValueSetContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  vsMetadata(): VsMetadataContext[];
  vsComponent(): VsComponentContext[];
  caretValueRule(): CaretValueRuleContext[];
}

export interface VsMetadataContext extends ParserRuleContext {
  id(): IdContext;
  title(): TitleContext;
  description(): DescriptionContext;
}

export interface CodeSystemContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  csMetadata(): CsMetadataContext[];
  concept(): ConceptContext[];
  caretValueRule(): CaretValueRuleContext[];
}

export interface CsMetadataContext extends ParserRuleContext {
  id(): IdContext;
  title(): TitleContext;
  description(): DescriptionContext;
}

export interface InvariantContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  invariantMetadata(): InvariantMetadataContext[];
}

export interface InvariantMetadataContext extends ParserRuleContext {
  description(): DescriptionContext;
  expression(): ExpressionContext;
  xpath(): XpathContext;
  severity(): SeverityContext;
}

export interface ParentContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
}

export interface IdContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
}

export interface TitleContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
}

export interface DescriptionContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
  MULTILINE_STRING(): ParserRuleContext;
}

export interface TypeContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
}

export interface ExpressionContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
}

export interface XpathContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
}

export interface SeverityContext extends ParserRuleContext {
  CODE(): ParserRuleContext;
}

export interface InstanceOfContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
}

export interface SdRuleContext extends ParserRuleContext {
  cardRule(): CardRuleContext;
  flagRule(): FlagRuleContext;
  valueSetRule(): ValueSetRuleContext;
  fixedValueRule(): FixedValueRuleContext;
  containsRule(): ContainsRuleContext;
  onlyRule(): OnlyRuleContext;
  obeysRule(): ObeysRuleContext;
  caretValueRule(): CaretValueRuleContext;
}

export interface PathContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
}

export interface CaretPathContext extends ParserRuleContext {
  CARET_SEQUENCE(): ParserRuleContext;
}

export interface PathsContext extends ParserRuleContext {
  COMMA_DELIMITED_SEQUENCES(): ParserRuleContext;
}

export interface CardRuleContext extends ParserRuleContext {
  path(): PathContext;
  CARD(): ParserRuleContext;
  flag(): FlagContext[];
}

export interface FlagRuleContext extends ParserRuleContext {
  path(): PathContext;
  paths(): PathsContext;
  flag(): FlagContext[];
}

export interface FlagContext extends ParserRuleContext {
  KW_MOD(): ParserRuleContext;
  KW_MS(): ParserRuleContext;
  KW_SU(): ParserRuleContext;
}

export interface ValueSetRuleContext extends ParserRuleContext {
  path(): PathContext;
  SEQUENCE(): ParserRuleContext;
  strength(): StrengthContext;
}

export interface StrengthContext extends ParserRuleContext {
  KW_EXAMPLE(): ParserRuleContext;
  KW_PREFERRED(): ParserRuleContext;
  KW_EXTENSIBLE(): ParserRuleContext;
  KW_REQUIRED(): ParserRuleContext;
}

export interface FixedValueRuleContext extends ParserRuleContext {
  path(): PathContext;
  value(): ValueContext;
}

export interface ValueContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
  MULTILINE_STRING(): ParserRuleContext;
  NUMBER(): ParserRuleContext;
  DATETIME(): ParserRuleContext;
  TIME(): ParserRuleContext;
  reference(): ReferenceContext;
  code(): CodeContext;
  quantity(): QuantityContext;
  ratio(): RatioContext;
  bool(): BoolContext;
}

export interface CodeContext extends ParserRuleContext {
  CODE(): ParserRuleContext;
  STRING(): ParserRuleContext;
}

export interface ConceptContext extends ParserRuleContext {
  code(): CodeContext;
  STRING(): ParserRuleContext;
}

export interface QuantityContext extends ParserRuleContext {
  NUMBER(): ParserRuleContext;
  UNIT(): ParserRuleContext;
}

export interface RatioContext extends ParserRuleContext {
  ratioPart(): RatioPartContext[];
}

export interface RatioPartContext extends ParserRuleContext {
  NUMBER(): ParserRuleContext;
  quantity(): QuantityContext;
}
export interface ReferenceContext extends ParserRuleContext {
  REFERENCE(): ParserRuleContext;
  STRING(): ParserRuleContext;
}

export interface BoolContext extends ParserRuleContext {
  KW_TRUE(): ParserRuleContext;
  KW_FALSE(): ParserRuleContext;
}

export interface ContainsRuleContext extends ParserRuleContext {
  path(): PathContext;
  item(): ItemContext[];
}

export interface ItemContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext[];
  KW_NAMED(): ParserRuleContext;
  CARD(): ParserRuleContext;
  flag(): FlagContext[];
}

export interface OnlyRuleContext extends ParserRuleContext {
  path(): PathContext;
  targetType(): TargetTypeContext[];
}

export interface TargetTypeContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  reference(): ReferenceContext;
}

export interface ObeysRuleContext extends ParserRuleContext {
  path(): PathContext;
  SEQUENCE(): ParserRuleContext[];
}

export interface CaretValueRuleContext extends ParserRuleContext {
  path(): PathContext;
  caretPath(): CaretPathContext;
  value(): ValueContext;
}

export interface VsComponentContext extends ParserRuleContext {
  KW_EXCLUDE(): ParserRuleContext;
  vsConceptComponent(): VsConceptComponentContext;
  vsFilterComponent(): VsFilterComponentContext;
}

export interface VsConceptComponentContext extends ParserRuleContext {
  code(): CodeContext;
  vsComponentFrom(): VsComponentFromContext;
  COMMA_DELIMITED_CODES(): ParserRuleContext;
}

export interface VsFilterComponentContext extends ParserRuleContext {
  KW_CODES(): ParserRuleContext;
  vsComponentFrom(): VsComponentFromContext;
  KW_WHERE(): ParserRuleContext;
  vsFilterList(): VsFilterListContext;
}

export interface VsComponentFromContext extends ParserRuleContext {
  KW_FROM(): ParserRuleContext;
  vsFromSystem(): VsFromSystemContext;
  vsFromValueset(): VsFromValuesetContext;
}

export interface VsFromSystemContext extends ParserRuleContext {
  KW_SYSTEM(): ParserRuleContext;
  SEQUENCE(): ParserRuleContext;
}

export interface VsFromValuesetContext extends ParserRuleContext {
  KW_VSREFERENCE(): ParserRuleContext;
  SEQUENCE(): ParserRuleContext;
  COMMA_DELIMITED_SEQUENCES(): ParserRuleContext;
}

export interface VsFilterListContext extends ParserRuleContext {
  vsFilterDefinition(): VsFilterDefinitionContext[];
}

export interface VsFilterDefinitionContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  vsFilterOperator(): VsFilterOperatorContext;
  vsFilterValue(): VsFilterValueContext;
}

export interface VsFilterOperatorContext extends ParserRuleContext {
  EQUAL(): ParserRuleContext;
  SEQUENCE(): ParserRuleContext;
}

export interface VsFilterValueContext extends ParserRuleContext {
  code(): CodeContext;
  KW_TRUE(): ParserRuleContext;
  KW_FALSE(): ParserRuleContext;
  REGEX(): ParserRuleContext;
  STRING(): ParserRuleContext;
}
