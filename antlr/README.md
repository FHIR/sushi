# FSH Grammar

The FSH Grammar is defined using [ANTLR4](https://www.antlr.org/).

To edit the grammar, edit the file:
```
./src/main/antlr/FSH.g4
```

You may want to install the [ANTLR4 grammar syntax support](https://marketplace.visualstudio.com/items?itemName=mike-lischke.vscode-antlr4) VS Code extension to help w/ editing and debugging.


After editing, build the JavaScript parser/lexer classes:
```
./gradlew generateGrammarSource
```

This will generate the files parser/lexer files to:
```
../src/import/generated
```