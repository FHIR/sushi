grammar FSH;

options { tokenVocab = FSHLexer; }

doc:                entity* EOF;
entity:             alias | profile | extension | invariant | instance | valueSet | codeSystem | ruleSet | paramRuleSet | mapping;

alias:              KW_ALIAS SEQUENCE EQUAL SEQUENCE;

profile:            KW_PROFILE name sdMetadata+ sdRule*;
extension:          KW_EXTENSION name sdMetadata* sdRule*;
sdMetadata:         parent | id | title | description | mixins;
sdRule:             cardRule | flagRule | valueSetRule | fixedValueRule | containsRule | onlyRule | obeysRule | caretValueRule | insertRule;

instance:           KW_INSTANCE name instanceMetadata* instanceRule*;
instanceMetadata:   instanceOf | title | description | usage | mixins;
instanceRule:       fixedValueRule | insertRule;

invariant:          KW_INVARIANT name invariantMetadata+;
invariantMetadata:  description | expression | xpath | severity;

valueSet:           KW_VALUESET name vsMetadata* vsRule*;
vsMetadata:         id | title | description;
vsRule:             vsComponent | caretValueRule | insertRule;
codeSystem:         KW_CODESYSTEM name csMetadata* csRule*;
csMetadata:         id | title | description;
csRule:             concept | caretValueRule | insertRule;

ruleSet:            KW_RULESET RULESET_REFERENCE ruleSetRule+;
ruleSetRule:        sdRule | concept | vsComponent;

paramRuleSet:       KW_RULESET PARAM_RULESET_REFERENCE paramRuleSetContent;
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
mappingEntityRule:  mappingRule | insertRule;

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
mixins:             KW_MIXINS ((name KW_AND)* name | COMMA_DELIMITED_SEQUENCES); // deprecated
source:             KW_SOURCE name;
target:             KW_TARGET STRING;


// RULES
cardRule:           STAR path CARD flag*;
flagRule:           STAR ((path KW_AND)* path | paths) flag+;
valueSetRule:       STAR path KW_UNITS? KW_FROM name strength?;
fixedValueRule:     STAR path KW_UNITS? EQUAL value KW_EXACTLY?;
containsRule:       STAR path KW_CONTAINS item (KW_AND item)*;
onlyRule:           STAR path KW_ONLY targetType (KW_OR targetType)*;
obeysRule:          STAR path? KW_OBEYS name (KW_AND name)*;
caretValueRule:     STAR path? caretPath EQUAL value;
mappingRule:        STAR path? ARROW STRING STRING? CODE?;
insertRule:         STAR KW_INSERT (RULESET_REFERENCE | PARAM_RULESET_REFERENCE);

// VALUESET COMPONENTS
vsComponent:        STAR ( KW_INCLUDE | KW_EXCLUDE )? ( vsConceptComponent | vsFilterComponent );
vsConceptComponent: code vsComponentFrom?
                    | (code KW_AND)+ code vsComponentFrom
                    | COMMA_DELIMITED_CODES vsComponentFrom;
vsFilterComponent:  KW_CODES vsComponentFrom (KW_WHERE vsFilterList)?;
vsComponentFrom:    KW_FROM (vsFromSystem (KW_AND vsFromValueset)? | vsFromValueset (KW_AND vsFromSystem)?);
vsFromSystem:       KW_SYSTEM name;
vsFromValueset:     KW_VSREFERENCE ((name KW_AND)* name | COMMA_DELIMITED_SEQUENCES);
vsFilterList:       (vsFilterDefinition KW_AND)* vsFilterDefinition;
vsFilterDefinition: name vsFilterOperator vsFilterValue?;
vsFilterOperator:   EQUAL | SEQUENCE;
vsFilterValue:      code | KW_TRUE | KW_FALSE | REGEX | STRING;

// MISC
name:               SEQUENCE | NUMBER | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT | KW_CODES | KW_VSREFERENCE | KW_SYSTEM | KW_UNITS;
path:               SEQUENCE | KW_SYSTEM;
paths:              COMMA_DELIMITED_SEQUENCES;
caretPath:          CARET_SEQUENCE;
flag:               KW_MOD | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT;
strength:           KW_EXAMPLE | KW_PREFERRED | KW_EXTENSIBLE | KW_REQUIRED;
value:              STRING | MULTILINE_STRING | NUMBER | DATETIME | TIME | reference | canonical | code | quantity | ratio | bool | name;
item:               name (KW_NAMED name)? CARD flag*;
code:               CODE STRING?;
concept:            STAR code (STRING | MULTILINE_STRING)?;
quantity:           NUMBER (UNIT | CODE)? STRING?;
ratio:              ratioPart COLON ratioPart;
reference:          (OR_REFERENCE | PIPE_REFERENCE) STRING?;
canonical:          CANONICAL;
ratioPart:          NUMBER | quantity;
bool:               KW_TRUE | KW_FALSE;
targetType:         name | reference;
