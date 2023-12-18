/*
 * MiniFSH.g4: A minimal ANTLR v4 parser representation useful only in the context of certain
 * functions within SUSHI. See FSH.g4 for a more complete FSH parser grammar.
 */
grammar MiniFSH;

options { tokenVocab = MiniFSHLexer; }

ruleSet: someRule+ EOF;
someRule: STAR rulePart+;
rulePart: SEQUENCE | STRING | MULTILINE_STRING;
