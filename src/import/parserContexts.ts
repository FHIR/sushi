import { ParserRuleContext } from 'antlr4';
import { TerminalNode } from 'antlr4/tree/Tree';

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
  ruleSet(): RuleSetContext;
  paramRuleSet(): ParamRuleSetContext;
  mapping(): MappingContext;
  logical(): LogicalContext;
  resource(): ResourceContext;
}

export interface AliasContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext[];
  CODE(): ParserRuleContext;
}

export interface ProfileContext extends ParserRuleContext {
  name(): NameContext;
  sdMetadata(): SdMetadataContext[];
  sdRule(): SdRuleContext[];
}

export interface ExtensionContext extends ParserRuleContext {
  name(): NameContext;
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
  name(): NameContext;
  instanceMetadata(): InstanceMetadataContext[];
  instanceRule(): InstanceRuleContext[];
}

export interface InstanceMetadataContext extends ParserRuleContext {
  instanceOf(): InstanceOfContext;
  title(): TitleContext;
  description(): DescriptionContext;
  usage(): UsageContext;
}

export interface InstanceRuleContext extends ParserRuleContext {
  fixedValueRule(): FixedValueRuleContext;
  insertRule(): InsertRuleContext;
  pathRule(): PathRuleContext;
}

export interface ValueSetContext extends ParserRuleContext {
  name(): NameContext;
  vsMetadata(): VsMetadataContext[];
  vsRule(): VsRuleContext[];
}

export interface VsMetadataContext extends ParserRuleContext {
  id(): IdContext;
  title(): TitleContext;
  description(): DescriptionContext;
}

export interface VsRuleContext extends ParserRuleContext {
  vsComponent(): VsComponentContext;
  caretValueRule(): CaretValueRuleContext;
  insertRule(): InsertRuleContext;
}

export interface CodeSystemContext extends ParserRuleContext {
  name(): NameContext;
  csMetadata(): CsMetadataContext[];
  csRule(): CsRuleContext[];
}

export interface CsMetadataContext extends ParserRuleContext {
  id(): IdContext;
  title(): TitleContext;
  description(): DescriptionContext;
}

export interface CsRuleContext extends ParserRuleContext {
  concept(): ConceptContext;
  codeCaretValueRule(): CodeCaretValueRuleContext;
  codeInsertRule(): CodeInsertRuleContext;
}

export interface InvariantContext extends ParserRuleContext {
  name(): NameContext;
  invariantMetadata(): InvariantMetadataContext[];
}

export interface InvariantMetadataContext extends ParserRuleContext {
  description(): DescriptionContext;
  expression(): ExpressionContext;
  xpath(): XpathContext;
  severity(): SeverityContext;
}

export interface RuleSetContext extends ParserRuleContext {
  RULESET_REFERENCE(): ParserRuleContext;
  ruleSetRule(): RuleSetRuleContext[];
}

export interface RuleSetRuleContext extends ParserRuleContext {
  sdRule(): SdRuleContext;
  vsComponent(): VsComponentContext;
  concept(): ConceptContext;
  addElementRule(): AddElementRuleContext;
  addCRElementRule(): AddCRElementRuleContext;
  codeCaretValueRule(): CodeCaretValueRuleContext;
  codeInsertRule(): CodeInsertRuleContext;
  mappingRule(): MappingRuleContext;
}

export interface ParamRuleSetContext extends ParserRuleContext {
  KW_RULESET(): ParserRuleContext;
  paramRuleSetRef(): ParamRuleSetRefContext;
  paramRuleSetContent(): ParamRuleSetContentContext;
}

export interface ParamRuleSetRefContext extends ParserRuleContext {
  PARAM_RULESET_REFERENCE(): ParserRuleContext;
  parameter(): ParameterContext[];
  lastParameter(): LastParameterContext;
}

export interface ParameterContext extends ParserRuleContext {
  BRACKETED_PARAM(): ParserRuleContext;
  PLAIN_PARAM(): ParserRuleContext;
}

export interface LastParameterContext extends ParserRuleContext {
  LAST_BRACKETED_PARAM(): ParserRuleContext;
  LAST_PLAIN_PARAM(): ParserRuleContext;
}

export interface ParamRuleSetContentContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
}

export interface MappingContext extends ParserRuleContext {
  name(): NameContext;
  mappingMetadata(): MappingMetadataContext[];
  mappingEntityRule(): MappingEntityRuleContext[];
}

export interface MappingMetadataContext extends ParserRuleContext {
  id(): IdContext;
  description(): DescriptionContext;
  source(): SourceContext;
  target(): TargetContext;
  title(): TitleContext;
}

export interface MappingEntityRuleContext extends ParserRuleContext {
  mappingRule(): MappingRuleContext;
  insertRule(): InsertRuleContext;
  pathRule(): PathRuleContext;
}

export interface LogicalContext extends ParserRuleContext {
  name(): NameContext;
  sdMetadata(): SdMetadataContext[];
  lrRule(): LrRuleContext[];
}

export interface ResourceContext extends ParserRuleContext {
  name(): NameContext;
  sdMetadata(): SdMetadataContext[];
  lrRule(): LrRuleContext[];
}

export interface LrRuleContext extends ParserRuleContext {
  sdRule(): SdRuleContext;
  addElementRule(): AddElementRuleContext;
  addCRElementRule(): AddCRElementRuleContext;
}

export interface ParentContext extends ParserRuleContext {
  name(): NameContext;
}

export interface IdContext extends ParserRuleContext {
  name(): NameContext;
}

export interface TitleContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
}

export interface DescriptionContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
  MULTILINE_STRING(): ParserRuleContext;
}

export interface UsageContext extends ParserRuleContext {
  CODE(): ParserRuleContext;
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
  name(): NameContext;
}

export interface SourceContext extends ParserRuleContext {
  name(): NameContext;
}

export interface TargetContext extends ParserRuleContext {
  STRING(): ParserRuleContext;
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
  insertRule(): InsertRuleContext;
  pathRule(): PathRuleContext;
}

// NameContext can be so many things, but we really only care about its text,
// so just supporting getText() should be sufficient (thus ParserRuleContext)
export type NameContext = ParserRuleContext;

export interface PathContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  KW_SYSTEM(): ParserRuleContext;
  NUMBER(): ParserRuleContext;
}

export interface CaretPathContext extends ParserRuleContext {
  CARET_SEQUENCE(): ParserRuleContext;
}

export interface CardRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  CARD(): ParserRuleContext;
  flag(): FlagContext[];
}

export interface FlagRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext[];
  flag(): FlagContext[];
}

export interface FlagContext extends ParserRuleContext {
  KW_MOD(): ParserRuleContext;
  KW_MS(): ParserRuleContext;
  KW_SU(): ParserRuleContext;
  KW_TU(): ParserRuleContext;
  KW_NORMATIVE(): ParserRuleContext;
  KW_DRAFT(): ParserRuleContext;
}

export interface ValueSetRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  name(): NameContext;
  strength(): StrengthContext;
}

export interface StrengthContext extends ParserRuleContext {
  KW_EXAMPLE(): ParserRuleContext;
  KW_PREFERRED(): ParserRuleContext;
  KW_EXTENSIBLE(): ParserRuleContext;
  KW_REQUIRED(): ParserRuleContext;
}

export interface FixedValueRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  value(): ValueContext;
  KW_EXACTLY(): ParserRuleContext;
}

export interface ValueContext extends ParserRuleContext {
  name(): NameContext;
  STRING(): ParserRuleContext;
  MULTILINE_STRING(): ParserRuleContext;
  NUMBER(): ParserRuleContext;
  DATETIME(): ParserRuleContext;
  TIME(): ParserRuleContext;
  reference(): ReferenceContext;
  canonical(): CanonicalContext;
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
  STAR(): ParserRuleContext;
  CODE(): ParserRuleContext[];
  STRING(): ParserRuleContext[];
  MULTILINE_STRING(): ParserRuleContext;
}

export interface QuantityContext extends ParserRuleContext {
  NUMBER(): ParserRuleContext;
  CODE(): ParserRuleContext;
  UNIT(): ParserRuleContext;
  STRING(): ParserRuleContext;
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

export interface ReferenceTypeContext extends ParserRuleContext {
  REFERENCE(): ParserRuleContext;
}

export interface CanonicalContext extends ParserRuleContext {
  CANONICAL(): ParserRuleContext;
}

export interface BoolContext extends ParserRuleContext {
  KW_TRUE(): ParserRuleContext;
  KW_FALSE(): ParserRuleContext;
}

export interface ContainsRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  item(): ItemContext[];
}

export interface ItemContext extends ParserRuleContext {
  name(): NameContext[];
  KW_NAMED(): ParserRuleContext;
  CARD(): ParserRuleContext;
  flag(): FlagContext[];
}

export interface OnlyRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  targetType(): TargetTypeContext[];
}

export interface TargetTypeContext extends ParserRuleContext {
  name(): NameContext;
  referenceType(): ReferenceTypeContext;
  canonical(): CanonicalContext;
}

export interface ObeysRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  name(): NameContext[];
}

export interface CaretValueRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  caretPath(): CaretPathContext;
  value(): ValueContext;
}

export interface CodeCaretValueRuleContext extends ParserRuleContext {
  CODE(): ParserRuleContext[];
  caretPath(): CaretPathContext;
  value(): ValueContext;
}

export interface InsertRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  RULESET_REFERENCE(): ParserRuleContext;
  paramRuleSetRef(): ParamRuleSetRefContext;
}

export interface CodeInsertRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  CODE(): ParserRuleContext[];
  RULESET_REFERENCE(): ParserRuleContext;
  paramRuleSetRef(): ParamRuleSetRefContext;
}

export interface InsertRuleParamsContext extends ParserRuleContext {
  PARAMETER_LIST(): ParserRuleContext;
  PARAM_CONTENT(): ParserRuleContext;
  END_PARAM_LIST(): ParserRuleContext;
}

export interface MappingRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  STRING(): ParserRuleContext[];
  CODE(): ParserRuleContext;
}

export interface PathRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
}

export interface AddElementRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  CARD(): ParserRuleContext;
  flag(): FlagContext[];
  targetType(): TargetTypeContext[];
  STRING(): ParserRuleContext[];
  MULTILINE_STRING(): ParserRuleContext;
}

export interface AddCRElementRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  path(): PathContext;
  KW_CONTENTREFERENCE(): ParserRuleContext;
  SEQUENCE(): ParserRuleContext;
  CODE(): ParserRuleContext;
  CARD(): ParserRuleContext;
  flag(): FlagContext[];
  STRING(): ParserRuleContext[];
  MULTILINE_STRING(): ParserRuleContext;
}

export interface VsComponentContext extends ParserRuleContext {
  STAR(): ParserRuleContext;
  KW_EXCLUDE(): ParserRuleContext;
  vsConceptComponent(): VsConceptComponentContext;
  vsFilterComponent(): VsFilterComponentContext;
}

export interface VsConceptComponentContext extends ParserRuleContext {
  code(): CodeContext[];
  vsComponentFrom(): VsComponentFromContext;
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
  name(): NameContext;
}

export interface VsFromValuesetContext extends ParserRuleContext {
  KW_VSREFERENCE(): ParserRuleContext;
  name(): NameContext[];
}

export interface VsFilterListContext extends ParserRuleContext {
  vsFilterDefinition(): VsFilterDefinitionContext[];
}

export interface VsFilterDefinitionContext extends ParserRuleContext {
  name(): NameContext;
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

export function isStarContext(ctx: ParserRuleContext): ctx is StarContext {
  return (ctx as any).STAR != null;
}
export interface StarContext extends ParserRuleContext {
  STAR(): ParserRuleContext & TerminalNode;
}

export function containsPathContext(ctx: ParserRuleContext) {
  return (ctx as any).path != null;
}

export function containsCodePathContext(ctx: ParserRuleContext) {
  // A code path comes from a concept, codeCaretValueRule, or codeInsertRule
  // So, detect a concept (with a non-empty CODE() list)
  // or a codeCaretValueRule (with a caretPath)
  // or a codeInsertRule (with a RULESET_REFERENCE or PARAM_RULESET_REFERENCE)
  return (
    ((ctx as any).CODE != null && // If we have CODE,
      Array.isArray((ctx as any).CODE()) && // and it's a list,
      (ctx as any).CODE().length > 0) || // and the list is not empty, or
    ((ctx as any).caretPath != null && (ctx as any).caretPath() != null) || // we have a non-null caretPath, or
    ((ctx as any).RULESET_REFERENCE != null && (ctx as any).RULESET_REFERENCE() != null) || // we have a non-null RULESET_REFERENCE, or
    ((ctx as any).PARAM_RULESET_REFERENCE != null && (ctx as any).PARAM_RULESET_REFERENCE() != null) // we have a non-null PARAM_RULESET_REFERENCE
  );
}

export function hasPathRule(ctx: ParserRuleContext) {
  return (ctx as any).pathRule != null && (ctx as any).pathRule() != null;
}
