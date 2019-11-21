import { ParserRuleContext } from 'antlr4';

export interface DocContext extends ParserRuleContext {
  entity(): EntityContext[];
}

export interface EntityContext extends ParserRuleContext {
  alias(): AliasContext;
  profile(): ProfileContext;
  extension(): ExtensionContext;
  //invariant(): InvariantContext;
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

export interface SdRuleContext extends ParserRuleContext {
  cardRule(): CardRuleContext;
  flagRule(): FlagRuleContext;
  valueSetRule(): ValueSetRuleContext;
  fixedValueRule(): FixedValueRuleContext;
  containsRule(): ContainsRuleContext;
  onlyRule(): OnlyRuleContext;
  // obeysRule(): ObeysRuleContext;
  // caretValueRule(): CaretValueRuleContext;
}

export interface PathContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
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
  code(): CodeContext;
  quantity(): QuantityContext;
  ratio(): RatioContext;
  bool(): BoolContext;
}

export interface CodeContext extends ParserRuleContext {
  CODE(): ParserRuleContext;
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

export interface BoolContext extends ParserRuleContext {
  KW_TRUE(): ParserRuleContext;
  KW_FALSE(): ParserRuleContext;
}

export interface ContainsRuleContext extends ParserRuleContext {
  path(): PathContext;
  item(): ItemContext[];
}

export interface ItemContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  CARD(): ParserRuleContext;
  flag(): FlagContext[];
}

export interface OnlyRuleContext extends ParserRuleContext {
  path(): PathContext;
  targetType(): TargetTypeContext[];
}

export interface TargetTypeContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  REFERENCE(): ParserRuleContext;
}
