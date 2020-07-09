declare const FSHParser_base: typeof import("antlr4").Parser;
declare class FSHParser extends FSHParser_base {
    constructor(input: any);
    _interp: any;
    ruleNames: string[];
    literalNames: string[];
    symbolicNames: string[];
    doc(): DocContext;
    entity(): EntityContext;
    alias(): AliasContext;
    profile(): ProfileContext;
    extension(): ExtensionContext;
    sdMetadata(): SdMetadataContext;
    sdRule(): SdRuleContext;
    instance(): InstanceContext;
    instanceMetadata(): InstanceMetadataContext;
    instanceRule(): InstanceRuleContext;
    invariant(): InvariantContext;
    invariantMetadata(): InvariantMetadataContext;
    valueSet(): ValueSetContext;
    vsMetadata(): VsMetadataContext;
    vsRule(): VsRuleContext;
    codeSystem(): CodeSystemContext;
    csMetadata(): CsMetadataContext;
    csRule(): CsRuleContext;
    ruleSet(): RuleSetContext;
    ruleSetRule(): RuleSetRuleContext;
    mapping(): MappingContext;
    mappingMetadata(): MappingMetadataContext;
    mappingEntityRule(): MappingEntityRuleContext;
    parent(): ParentContext;
    id(): IdContext;
    title(): TitleContext;
    description(): DescriptionContext;
    expression(): ExpressionContext;
    xpath(): XpathContext;
    severity(): SeverityContext;
    instanceOf(): InstanceOfContext;
    usage(): UsageContext;
    mixins(): MixinsContext;
    source(): SourceContext;
    target(): TargetContext;
    cardRule(): CardRuleContext;
    flagRule(): FlagRuleContext;
    valueSetRule(): ValueSetRuleContext;
    fixedValueRule(): FixedValueRuleContext;
    containsRule(): ContainsRuleContext;
    onlyRule(): OnlyRuleContext;
    obeysRule(): ObeysRuleContext;
    caretValueRule(): CaretValueRuleContext;
    mappingRule(): MappingRuleContext;
    insertRule(): InsertRuleContext;
    vsComponent(): VsComponentContext;
    vsConceptComponent(): VsConceptComponentContext;
    vsFilterComponent(): VsFilterComponentContext;
    vsComponentFrom(): VsComponentFromContext;
    vsFromSystem(): VsFromSystemContext;
    vsFromValueset(): VsFromValuesetContext;
    vsFilterList(): VsFilterListContext;
    vsFilterDefinition(): VsFilterDefinitionContext;
    vsFilterOperator(): VsFilterOperatorContext;
    vsFilterValue(): VsFilterValueContext;
    path(): PathContext;
    paths(): PathsContext;
    caretPath(): CaretPathContext;
    flag(): FlagContext;
    strength(): StrengthContext;
    value(): ValueContext;
    item(): ItemContext;
    code(): CodeContext;
    concept(): ConceptContext;
    quantity(): QuantityContext;
    ratio(): RatioContext;
    reference(): ReferenceContext;
    ratioPart(): RatioPartContext;
    bool(): BoolContext;
    targetType(): TargetTypeContext;
        get atn(): any;
}
declare namespace FSHParser {
    export const EOF: number;
    export const KW_ALIAS: number;
    export const KW_PROFILE: number;
    export const KW_EXTENSION: number;
    export const KW_INSTANCE: number;
    export const KW_INSTANCEOF: number;
    export const KW_INVARIANT: number;
    export const KW_VALUESET: number;
    export const KW_CODESYSTEM: number;
    export const KW_RULESET: number;
    export const KW_MAPPING: number;
    export const KW_MIXINS: number;
    export const KW_PARENT: number;
    export const KW_ID: number;
    export const KW_TITLE: number;
    export const KW_DESCRIPTION: number;
    export const KW_EXPRESSION: number;
    export const KW_XPATH: number;
    export const KW_SEVERITY: number;
    export const KW_USAGE: number;
    export const KW_SOURCE: number;
    export const KW_TARGET: number;
    export const KW_MOD: number;
    export const KW_MS: number;
    export const KW_SU: number;
    export const KW_TU: number;
    export const KW_NORMATIVE: number;
    export const KW_DRAFT: number;
    export const KW_FROM: number;
    export const KW_EXAMPLE: number;
    export const KW_PREFERRED: number;
    export const KW_EXTENSIBLE: number;
    export const KW_REQUIRED: number;
    export const KW_CONTAINS: number;
    export const KW_NAMED: number;
    export const KW_AND: number;
    export const KW_ONLY: number;
    export const KW_OR: number;
    export const KW_OBEYS: number;
    export const KW_TRUE: number;
    export const KW_FALSE: number;
    export const KW_INCLUDE: number;
    export const KW_EXCLUDE: number;
    export const KW_CODES: number;
    export const KW_WHERE: number;
    export const KW_VSREFERENCE: number;
    export const KW_SYSTEM: number;
    export const KW_UNITS: number;
    export const KW_EXACTLY: number;
    export const KW_INSERT: number;
    export const EQUAL: number;
    export const STAR: number;
    export const COLON: number;
    export const COMMA: number;
    export const ARROW: number;
    export const STRING: number;
    export const MULTILINE_STRING: number;
    export const NUMBER: number;
    export const UNIT: number;
    export const CODE: number;
    export const CONCEPT_STRING: number;
    export const DATETIME: number;
    export const TIME: number;
    export const CARD: number;
    export const OR_REFERENCE: number;
    export const PIPE_REFERENCE: number;
    export const CARET_SEQUENCE: number;
    export const REGEX: number;
    export const COMMA_DELIMITED_CODES: number;
    export const COMMA_DELIMITED_SEQUENCES: number;
    export const SEQUENCE: number;
    export const WHITESPACE: number;
    export const BLOCK_COMMENT: number;
    export const LINE_COMMENT: number;
    export const RULE_doc: number;
    export const RULE_entity: number;
    export const RULE_alias: number;
    export const RULE_profile: number;
    export const RULE_extension: number;
    export const RULE_sdMetadata: number;
    export const RULE_sdRule: number;
    export const RULE_instance: number;
    export const RULE_instanceMetadata: number;
    export const RULE_instanceRule: number;
    export const RULE_invariant: number;
    export const RULE_invariantMetadata: number;
    export const RULE_valueSet: number;
    export const RULE_vsMetadata: number;
    export const RULE_vsRule: number;
    export const RULE_codeSystem: number;
    export const RULE_csMetadata: number;
    export const RULE_csRule: number;
    export const RULE_ruleSet: number;
    export const RULE_ruleSetRule: number;
    export const RULE_mapping: number;
    export const RULE_mappingMetadata: number;
    export const RULE_mappingEntityRule: number;
    export const RULE_parent: number;
    export const RULE_id: number;
    export const RULE_title: number;
    export const RULE_description: number;
    export const RULE_expression: number;
    export const RULE_xpath: number;
    export const RULE_severity: number;
    export const RULE_instanceOf: number;
    export const RULE_usage: number;
    export const RULE_mixins: number;
    export const RULE_source: number;
    export const RULE_target: number;
    export const RULE_cardRule: number;
    export const RULE_flagRule: number;
    export const RULE_valueSetRule: number;
    export const RULE_fixedValueRule: number;
    export const RULE_containsRule: number;
    export const RULE_onlyRule: number;
    export const RULE_obeysRule: number;
    export const RULE_caretValueRule: number;
    export const RULE_mappingRule: number;
    export const RULE_insertRule: number;
    export const RULE_vsComponent: number;
    export const RULE_vsConceptComponent: number;
    export const RULE_vsFilterComponent: number;
    export const RULE_vsComponentFrom: number;
    export const RULE_vsFromSystem: number;
    export const RULE_vsFromValueset: number;
    export const RULE_vsFilterList: number;
    export const RULE_vsFilterDefinition: number;
    export const RULE_vsFilterOperator: number;
    export const RULE_vsFilterValue: number;
    export const RULE_path: number;
    export const RULE_paths: number;
    export const RULE_caretPath: number;
    export const RULE_flag: number;
    export const RULE_strength: number;
    export const RULE_value: number;
    export const RULE_item: number;
    export const RULE_code: number;
    export const RULE_concept: number;
    export const RULE_quantity: number;
    export const RULE_ratio: number;
    export const RULE_reference: number;
    export const RULE_ratioPart: number;
    export const RULE_bool: number;
    export const RULE_targetType: number;
    export { DocContext };
    export { EntityContext };
    export { AliasContext };
    export { ProfileContext };
    export { ExtensionContext };
    export { SdMetadataContext };
    export { SdRuleContext };
    export { InstanceContext };
    export { InstanceMetadataContext };
    export { InstanceRuleContext };
    export { InvariantContext };
    export { InvariantMetadataContext };
    export { ValueSetContext };
    export { VsMetadataContext };
    export { VsRuleContext };
    export { CodeSystemContext };
    export { CsMetadataContext };
    export { CsRuleContext };
    export { RuleSetContext };
    export { RuleSetRuleContext };
    export { MappingContext };
    export { MappingMetadataContext };
    export { MappingEntityRuleContext };
    export { ParentContext };
    export { IdContext };
    export { TitleContext };
    export { DescriptionContext };
    export { ExpressionContext };
    export { XpathContext };
    export { SeverityContext };
    export { InstanceOfContext };
    export { UsageContext };
    export { MixinsContext };
    export { SourceContext };
    export { TargetContext };
    export { CardRuleContext };
    export { FlagRuleContext };
    export { ValueSetRuleContext };
    export { FixedValueRuleContext };
    export { ContainsRuleContext };
    export { OnlyRuleContext };
    export { ObeysRuleContext };
    export { CaretValueRuleContext };
    export { MappingRuleContext };
    export { InsertRuleContext };
    export { VsComponentContext };
    export { VsConceptComponentContext };
    export { VsFilterComponentContext };
    export { VsComponentFromContext };
    export { VsFromSystemContext };
    export { VsFromValuesetContext };
    export { VsFilterListContext };
    export { VsFilterDefinitionContext };
    export { VsFilterOperatorContext };
    export { VsFilterValueContext };
    export { PathContext };
    export { PathsContext };
    export { CaretPathContext };
    export { FlagContext };
    export { StrengthContext };
    export { ValueContext };
    export { ItemContext };
    export { CodeContext };
    export { ConceptContext };
    export { QuantityContext };
    export { RatioContext };
    export { ReferenceContext };
    export { RatioPartContext };
    export { BoolContext };
    export { TargetTypeContext };
}
declare const DocContext_base: typeof import("antlr4").ParserRuleContext;
declare class DocContext extends DocContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    EOF(): import("antlr4").Token;
    entity(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const EntityContext_base: typeof import("antlr4").ParserRuleContext;
declare class EntityContext extends EntityContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    alias(): any;
    profile(): any;
    extension(): any;
    invariant(): any;
    instance(): any;
    valueSet(): any;
    codeSystem(): any;
    ruleSet(): any;
    mapping(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const AliasContext_base: typeof import("antlr4").ParserRuleContext;
declare class AliasContext extends AliasContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_ALIAS(): import("antlr4").Token;
    SEQUENCE(i: any): import("antlr4").Token | import("antlr4").Token[];
    EQUAL(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ProfileContext_base: typeof import("antlr4").ParserRuleContext;
declare class ProfileContext extends ProfileContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_PROFILE(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    sdMetadata(i: any): any;
    sdRule(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ExtensionContext_base: typeof import("antlr4").ParserRuleContext;
declare class ExtensionContext extends ExtensionContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_EXTENSION(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    sdMetadata(i: any): any;
    sdRule(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const SdMetadataContext_base: typeof import("antlr4").ParserRuleContext;
declare class SdMetadataContext extends SdMetadataContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    parent(): any;
    id(): any;
    title(): any;
    description(): any;
    mixins(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const SdRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class SdRuleContext extends SdRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    cardRule(): any;
    flagRule(): any;
    valueSetRule(): any;
    fixedValueRule(): any;
    containsRule(): any;
    onlyRule(): any;
    obeysRule(): any;
    caretValueRule(): any;
    insertRule(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const InstanceContext_base: typeof import("antlr4").ParserRuleContext;
declare class InstanceContext extends InstanceContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_INSTANCE(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    instanceMetadata(i: any): any;
    instanceRule(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const InstanceMetadataContext_base: typeof import("antlr4").ParserRuleContext;
declare class InstanceMetadataContext extends InstanceMetadataContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    instanceOf(): any;
    title(): any;
    description(): any;
    usage(): any;
    mixins(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const InstanceRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class InstanceRuleContext extends InstanceRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    fixedValueRule(): any;
    insertRule(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const InvariantContext_base: typeof import("antlr4").ParserRuleContext;
declare class InvariantContext extends InvariantContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_INVARIANT(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    invariantMetadata(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const InvariantMetadataContext_base: typeof import("antlr4").ParserRuleContext;
declare class InvariantMetadataContext extends InvariantMetadataContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    description(): any;
    expression(): any;
    xpath(): any;
    severity(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ValueSetContext_base: typeof import("antlr4").ParserRuleContext;
declare class ValueSetContext extends ValueSetContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_VALUESET(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    vsMetadata(i: any): any;
    vsRule(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsMetadataContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsMetadataContext extends VsMetadataContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    id(): any;
    title(): any;
    description(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsRuleContext extends VsRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    vsComponent(): any;
    caretValueRule(): any;
    insertRule(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const CodeSystemContext_base: typeof import("antlr4").ParserRuleContext;
declare class CodeSystemContext extends CodeSystemContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_CODESYSTEM(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    csMetadata(i: any): any;
    csRule(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const CsMetadataContext_base: typeof import("antlr4").ParserRuleContext;
declare class CsMetadataContext extends CsMetadataContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    id(): any;
    title(): any;
    description(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const CsRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class CsRuleContext extends CsRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    concept(): any;
    caretValueRule(): any;
    insertRule(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const RuleSetContext_base: typeof import("antlr4").ParserRuleContext;
declare class RuleSetContext extends RuleSetContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_RULESET(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    ruleSetRule(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const RuleSetRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class RuleSetRuleContext extends RuleSetRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    sdRule(): any;
    concept(): any;
    vsComponent(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const MappingContext_base: typeof import("antlr4").ParserRuleContext;
declare class MappingContext extends MappingContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_MAPPING(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    mappingMetadata(i: any): any;
    mappingEntityRule(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const MappingMetadataContext_base: typeof import("antlr4").ParserRuleContext;
declare class MappingMetadataContext extends MappingMetadataContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    id(): any;
    source(): any;
    target(): any;
    description(): any;
    title(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const MappingEntityRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class MappingEntityRuleContext extends MappingEntityRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    mappingRule(): any;
    insertRule(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ParentContext_base: typeof import("antlr4").ParserRuleContext;
declare class ParentContext extends ParentContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_PARENT(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const IdContext_base: typeof import("antlr4").ParserRuleContext;
declare class IdContext extends IdContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_ID(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const TitleContext_base: typeof import("antlr4").ParserRuleContext;
declare class TitleContext extends TitleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_TITLE(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const DescriptionContext_base: typeof import("antlr4").ParserRuleContext;
declare class DescriptionContext extends DescriptionContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_DESCRIPTION(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    MULTILINE_STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ExpressionContext_base: typeof import("antlr4").ParserRuleContext;
declare class ExpressionContext extends ExpressionContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_EXPRESSION(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const XpathContext_base: typeof import("antlr4").ParserRuleContext;
declare class XpathContext extends XpathContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_XPATH(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const SeverityContext_base: typeof import("antlr4").ParserRuleContext;
declare class SeverityContext extends SeverityContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_SEVERITY(): import("antlr4").Token;
    CODE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const InstanceOfContext_base: typeof import("antlr4").ParserRuleContext;
declare class InstanceOfContext extends InstanceOfContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_INSTANCEOF(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const UsageContext_base: typeof import("antlr4").ParserRuleContext;
declare class UsageContext extends UsageContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_USAGE(): import("antlr4").Token;
    CODE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const MixinsContext_base: typeof import("antlr4").ParserRuleContext;
declare class MixinsContext extends MixinsContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_MIXINS(): import("antlr4").Token;
    SEQUENCE(i: any): import("antlr4").Token | import("antlr4").Token[];
    COMMA_DELIMITED_SEQUENCES(): import("antlr4").Token;
    KW_AND(i: any): import("antlr4").Token | import("antlr4").Token[];
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const SourceContext_base: typeof import("antlr4").ParserRuleContext;
declare class SourceContext extends SourceContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_SOURCE(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const TargetContext_base: typeof import("antlr4").ParserRuleContext;
declare class TargetContext extends TargetContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_TARGET(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const CardRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class CardRuleContext extends CardRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    path(): any;
    CARD(): import("antlr4").Token;
    flag(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const FlagRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class FlagRuleContext extends FlagRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    path(i: any): any;
    paths(): any;
    flag(i: any): any;
    KW_AND(i: any): import("antlr4").Token | import("antlr4").Token[];
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ValueSetRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class ValueSetRuleContext extends ValueSetRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    path(): any;
    KW_FROM(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    KW_UNITS(): import("antlr4").Token;
    strength(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const FixedValueRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class FixedValueRuleContext extends FixedValueRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    path(): any;
    EQUAL(): import("antlr4").Token;
    value(): any;
    KW_UNITS(): import("antlr4").Token;
    KW_EXACTLY(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ContainsRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class ContainsRuleContext extends ContainsRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    path(): any;
    KW_CONTAINS(): import("antlr4").Token;
    item(i: any): any;
    KW_AND(i: any): import("antlr4").Token | import("antlr4").Token[];
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const OnlyRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class OnlyRuleContext extends OnlyRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    path(): any;
    KW_ONLY(): import("antlr4").Token;
    targetType(i: any): any;
    KW_OR(i: any): import("antlr4").Token | import("antlr4").Token[];
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ObeysRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class ObeysRuleContext extends ObeysRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    KW_OBEYS(): import("antlr4").Token;
    SEQUENCE(i: any): import("antlr4").Token | import("antlr4").Token[];
    path(): any;
    KW_AND(i: any): import("antlr4").Token | import("antlr4").Token[];
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const CaretValueRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class CaretValueRuleContext extends CaretValueRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    caretPath(): any;
    EQUAL(): import("antlr4").Token;
    value(): any;
    path(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const MappingRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class MappingRuleContext extends MappingRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    ARROW(): import("antlr4").Token;
    STRING(i: any): import("antlr4").Token | import("antlr4").Token[];
    path(): any;
    CODE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const InsertRuleContext_base: typeof import("antlr4").ParserRuleContext;
declare class InsertRuleContext extends InsertRuleContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    KW_INSERT(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsComponentContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsComponentContext extends VsComponentContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    vsConceptComponent(): any;
    vsFilterComponent(): any;
    KW_INCLUDE(): import("antlr4").Token;
    KW_EXCLUDE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsConceptComponentContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsConceptComponentContext extends VsConceptComponentContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    code(i: any): any;
    vsComponentFrom(): any;
    KW_AND(i: any): import("antlr4").Token | import("antlr4").Token[];
    COMMA_DELIMITED_CODES(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsFilterComponentContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsFilterComponentContext extends VsFilterComponentContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_CODES(): import("antlr4").Token;
    vsComponentFrom(): any;
    KW_WHERE(): import("antlr4").Token;
    vsFilterList(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsComponentFromContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsComponentFromContext extends VsComponentFromContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_FROM(): import("antlr4").Token;
    vsFromSystem(): any;
    vsFromValueset(): any;
    KW_AND(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsFromSystemContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsFromSystemContext extends VsFromSystemContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_SYSTEM(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsFromValuesetContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsFromValuesetContext extends VsFromValuesetContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_VSREFERENCE(): import("antlr4").Token;
    SEQUENCE(i: any): import("antlr4").Token | import("antlr4").Token[];
    COMMA_DELIMITED_SEQUENCES(): import("antlr4").Token;
    KW_AND(i: any): import("antlr4").Token | import("antlr4").Token[];
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsFilterListContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsFilterListContext extends VsFilterListContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    vsFilterDefinition(i: any): any;
    KW_AND(i: any): import("antlr4").Token | import("antlr4").Token[];
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsFilterDefinitionContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsFilterDefinitionContext extends VsFilterDefinitionContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    SEQUENCE(): import("antlr4").Token;
    vsFilterOperator(): any;
    vsFilterValue(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsFilterOperatorContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsFilterOperatorContext extends VsFilterOperatorContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    EQUAL(): import("antlr4").Token;
    SEQUENCE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const VsFilterValueContext_base: typeof import("antlr4").ParserRuleContext;
declare class VsFilterValueContext extends VsFilterValueContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    code(): any;
    KW_TRUE(): import("antlr4").Token;
    KW_FALSE(): import("antlr4").Token;
    REGEX(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const PathContext_base: typeof import("antlr4").ParserRuleContext;
declare class PathContext extends PathContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    SEQUENCE(): import("antlr4").Token;
    KW_SYSTEM(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const PathsContext_base: typeof import("antlr4").ParserRuleContext;
declare class PathsContext extends PathsContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    COMMA_DELIMITED_SEQUENCES(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const CaretPathContext_base: typeof import("antlr4").ParserRuleContext;
declare class CaretPathContext extends CaretPathContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    CARET_SEQUENCE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const FlagContext_base: typeof import("antlr4").ParserRuleContext;
declare class FlagContext extends FlagContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_MOD(): import("antlr4").Token;
    KW_MS(): import("antlr4").Token;
    KW_SU(): import("antlr4").Token;
    KW_TU(): import("antlr4").Token;
    KW_NORMATIVE(): import("antlr4").Token;
    KW_DRAFT(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const StrengthContext_base: typeof import("antlr4").ParserRuleContext;
declare class StrengthContext extends StrengthContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_EXAMPLE(): import("antlr4").Token;
    KW_PREFERRED(): import("antlr4").Token;
    KW_EXTENSIBLE(): import("antlr4").Token;
    KW_REQUIRED(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ValueContext_base: typeof import("antlr4").ParserRuleContext;
declare class ValueContext extends ValueContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    SEQUENCE(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    MULTILINE_STRING(): import("antlr4").Token;
    NUMBER(): import("antlr4").Token;
    DATETIME(): import("antlr4").Token;
    TIME(): import("antlr4").Token;
    reference(): any;
    code(): any;
    quantity(): any;
    ratio(): any;
    bool(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ItemContext_base: typeof import("antlr4").ParserRuleContext;
declare class ItemContext extends ItemContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    SEQUENCE(i: any): import("antlr4").Token | import("antlr4").Token[];
    CARD(): import("antlr4").Token;
    KW_NAMED(): import("antlr4").Token;
    flag(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const CodeContext_base: typeof import("antlr4").ParserRuleContext;
declare class CodeContext extends CodeContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    CODE(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ConceptContext_base: typeof import("antlr4").ParserRuleContext;
declare class ConceptContext extends ConceptContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    STAR(): import("antlr4").Token;
    code(): any;
    STRING(): import("antlr4").Token;
    MULTILINE_STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const QuantityContext_base: typeof import("antlr4").ParserRuleContext;
declare class QuantityContext extends QuantityContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    NUMBER(): import("antlr4").Token;
    UNIT(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const RatioContext_base: typeof import("antlr4").ParserRuleContext;
declare class RatioContext extends RatioContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    ratioPart(i: any): any;
    COLON(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const ReferenceContext_base: typeof import("antlr4").ParserRuleContext;
declare class ReferenceContext extends ReferenceContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    OR_REFERENCE(): import("antlr4").Token;
    PIPE_REFERENCE(): import("antlr4").Token;
    STRING(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const RatioPartContext_base: typeof import("antlr4").ParserRuleContext;
declare class RatioPartContext extends RatioPartContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    NUMBER(): import("antlr4").Token;
    quantity(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const BoolContext_base: typeof import("antlr4").ParserRuleContext;
declare class BoolContext extends BoolContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    KW_TRUE(): import("antlr4").Token;
    KW_FALSE(): import("antlr4").Token;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
declare const TargetTypeContext_base: typeof import("antlr4").ParserRuleContext;
declare class TargetTypeContext extends TargetTypeContext_base {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    SEQUENCE(): import("antlr4").Token;
    reference(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
    }
export { FSHParser };
