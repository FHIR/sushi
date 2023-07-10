grammar FSH;

options { tokenVocab = FSHLexer; }

doc:                entity* EOF;
entity:             alias | profile | extension | invariant | instance | valueSet | codeSystem | ruleSet | paramRuleSet | mapping | logical | resource;

// The CODE token is accepted because the lexer parses URLs with fragments (ex: https://example.org#fragment) as CODEs
alias:              KW_ALIAS SEQUENCE EQUAL (SEQUENCE | CODE);

profile:            KW_PROFILE name sdMetadata+ sdRule*;
extension:          KW_EXTENSION name (sdMetadata | context)* sdRule*;
logical:            KW_LOGICAL name (sdMetadata | characteristics)* lrRule*;
resource:           KW_RESOURCE name sdMetadata* lrRule*;
sdMetadata:         parent | id | title | description;
sdRule:             cardRule | flagRule | valueSetRule | fixedValueRule | containsRule | onlyRule | obeysRule | caretValueRule | insertRule | pathRule;
lrRule:             sdRule | addElementRule | addCRElementRule;

instance:           KW_INSTANCE name instanceMetadata* instanceRule*;
instanceMetadata:   instanceOf | title | description | usage;
instanceRule:       fixedValueRule | insertRule | pathRule;

invariant:          KW_INVARIANT name invariantMetadata* invariantRule*;
invariantMetadata:  description | expression | xpath | severity;
invariantRule:      fixedValueRule | insertRule | pathRule;

valueSet:           KW_VALUESET name vsMetadata* vsRule*;
vsMetadata:         id | title | description;
vsRule:             vsComponent | caretValueRule | insertRule;
codeSystem:         KW_CODESYSTEM name csMetadata* csRule*;
csMetadata:         id | title | description;
csRule:             concept | codeCaretValueRule | codeInsertRule;

ruleSet:            KW_RULESET RULESET_REFERENCE ruleSetRule+;
ruleSetRule:        sdRule | addElementRule | addCRElementRule | concept | codeCaretValueRule | codeInsertRule | vsComponent | mappingRule;

paramRuleSet:       KW_RULESET paramRuleSetRef paramRuleSetContent;
paramRuleSetRef:    PARAM_RULESET_REFERENCE parameter* lastParameter;
parameter:          BRACKETED_PARAM | PLAIN_PARAM;
lastParameter:      LAST_BRACKETED_PARAM | LAST_PLAIN_PARAM;
paramRuleSetContent:   STAR
                    ~(KW_PROFILE
                    | KW_ALIAS
                    | KW_EXTENSION
                    | KW_INSTANCE
                    | KW_INVARIANT
                    | KW_VALUESET
                    | KW_CODESYSTEM
                    | KW_RULESET
                    | KW_MAPPING)*;

mapping:            KW_MAPPING name mappingMetadata* mappingEntityRule*;
mappingMetadata:    id | source | target | description | title;
mappingEntityRule:  mappingRule | insertRule | pathRule;

// METADATA FIELDS
parent:             KW_PARENT name;
id:                 KW_ID name;
title:              KW_TITLE STRING;
description:        KW_DESCRIPTION (STRING | MULTILINE_STRING);
expression:         KW_EXPRESSION STRING;
xpath:              KW_XPATH STRING;
severity:           KW_SEVERITY CODE;
instanceOf:         KW_INSTANCEOF name;
usage:              KW_USAGE CODE;
source:             KW_SOURCE name;
target:             KW_TARGET STRING;
context:            KW_CONTEXT contextItem* lastContextItem;
contextItem:        QUOTED_CONTEXT | UNQUOTED_CONTEXT;
lastContextItem:    LAST_QUOTED_CONTEXT | LAST_UNQUOTED_CONTEXT;
characteristics:    KW_CHARACTERISTICS CODE_ITEM* LAST_CODE_ITEM;


// RULES
cardRule:           STAR path CARD flag*;
flagRule:           STAR path (KW_AND path)* flag+;
valueSetRule:       STAR path KW_FROM name strength?;
fixedValueRule:     STAR path EQUAL value KW_EXACTLY?;
containsRule:       STAR path KW_CONTAINS item (KW_AND item)*;
onlyRule:           STAR path KW_ONLY targetType (KW_OR targetType)*;
obeysRule:          STAR path? KW_OBEYS name (KW_AND name)*;
caretValueRule:     STAR path? caretPath EQUAL value;
codeCaretValueRule: STAR CODE* caretPath EQUAL value;
mappingRule:        STAR path? ARROW STRING STRING? CODE?;
insertRule:         STAR path? KW_INSERT (RULESET_REFERENCE | paramRuleSetRef);
codeInsertRule:     STAR CODE* KW_INSERT (RULESET_REFERENCE | paramRuleSetRef);
addCRElementRule:   STAR path CARD flag* KW_CONTENTREFERENCE (SEQUENCE | CODE) STRING (STRING | MULTILINE_STRING)?;
addElementRule:     STAR path CARD flag* targetType (KW_OR targetType)* STRING (STRING | MULTILINE_STRING)?;
pathRule:           STAR path;

// VALUESET COMPONENTS
vsComponent:        STAR ( KW_INCLUDE | KW_EXCLUDE )? ( vsConceptComponent | vsFilterComponent );
vsConceptComponent: code vsComponentFrom?
                    | (code KW_AND)+ code vsComponentFrom;
vsFilterComponent:  KW_CODES vsComponentFrom (KW_WHERE vsFilterList)?;
vsComponentFrom:    KW_FROM (vsFromSystem (KW_AND vsFromValueset)? | vsFromValueset (KW_AND vsFromSystem)?);
vsFromSystem:       KW_SYSTEM name;
vsFromValueset:     KW_VSREFERENCE name (KW_AND name)*;
vsFilterList:       vsFilterDefinition (KW_AND vsFilterDefinition)*;
vsFilterDefinition: name vsFilterOperator vsFilterValue?;
vsFilterOperator:   EQUAL | SEQUENCE;
vsFilterValue:      code | KW_TRUE | KW_FALSE | REGEX | STRING;

// MISC
name:               SEQUENCE | NUMBER | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT | KW_CODES | KW_VSREFERENCE | KW_SYSTEM;
path:               SEQUENCE | NUMBER | mostAlphaKeywords;
caretPath:          CARET_SEQUENCE;
flag:               KW_MOD | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT;
strength:           KW_EXAMPLE | KW_PREFERRED | KW_EXTENSIBLE | KW_REQUIRED;
value:              STRING | MULTILINE_STRING | NUMBER | DATETIME | TIME | reference | canonical | code | quantity | ratio | bool | name;
item:               name (KW_NAMED name)? CARD flag*;
code:               CODE STRING?;
concept:            STAR CODE+ STRING? (STRING | MULTILINE_STRING)?;
quantity:           NUMBER (UNIT | CODE) STRING?;
ratio:              ratioPart COLON ratioPart;
reference:          REFERENCE STRING?;
referenceType:      REFERENCE;
codeableReferenceType: CODEABLE_REFERENCE;
canonical:          CANONICAL;
ratioPart:          NUMBER | quantity;
bool:               KW_TRUE | KW_FALSE;
targetType:         name | referenceType | canonical | codeableReferenceType;
mostAlphaKeywords:  KW_MS
                    | KW_SU
                    | KW_TU
                    | KW_NORMATIVE
                    | KW_DRAFT
                    | KW_FROM
                    | KW_CONTAINS
                    | KW_NAMED
                    | KW_AND
                    | KW_ONLY
                    | KW_OR
                    | KW_OBEYS
                    | KW_TRUE
                    | KW_FALSE
                    | KW_INCLUDE
                    | KW_EXCLUDE
                    | KW_CODES
                    | KW_WHERE
                    | KW_VSREFERENCE
                    | KW_SYSTEM
                    | KW_CONTENTREFERENCE;