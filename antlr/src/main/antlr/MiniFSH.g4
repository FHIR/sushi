grammar MiniFSH;

options { tokenVocab = MiniFSHLexer; }

ruleSet: someRule+ EOF;
someRule: STAR rulePart+;
rulePart: SEQUENCE | STRING | MULTILINE_STRING;
