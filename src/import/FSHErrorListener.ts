import { TextLocation } from '../fshtypes';
import { logger } from '../utils/FSHLogger';
import { Recognizer, Token } from 'antlr4';
import { ErrorListener } from 'antlr4/error';

export class FSHErrorListener extends ErrorListener {
  constructor(readonly file: string) {
    super();
  }

  syntaxError(
    recognizer: Recognizer,
    offendingSymbol: Token,
    line: number,
    column: number,
    msg: string
  ): void {
    let message = msg;
    let location: TextLocation = {
      startLine: line,
      startColumn: column + 1,
      endLine: line,
      endColumn: column + offendingSymbol.text.length
    };

    // Now attempt to detect known patterns and improve the error messages
    const previousToken = getPreviousNonWsToken(recognizer, offendingSymbol);

    // ########################################################################
    // # Missing space around =                                               #
    // ########################################################################

    // Alias: MyAlias =http://myserver.com/
    // > missing '=' at '=http://myserver.com/'
    if (/^missing '='/.test(msg) && /^=/.test(offendingSymbol.text)) {
      message =
        "Alias declarations must include at least one space both before and after the '=' sign";
    }

    // Alias: MyAlias= http://myserver.com/
    // > missing '=' at 'http://myserver.com/'
    else if (/^missing '='/.test(msg) && /=$/.test(previousToken.text)) {
      message =
        "Alias declarations must include at least one space both before and after the '=' sign";
      // Need to adjust the location to match the previous token (where '=' is)
      location = getTokenLocation(previousToken);
    }

    // Alias: MyAlias=http://myserver.com/
    // > msg => mismatched input '<EOF>' expecting '='
    else if (/^mismatched input .+ expecting '='$/.test(msg)) {
      message =
        "Alias declarations must include at least one space both before and after the '=' sign";
      // Need to adjust the location to match the previous token (where '=' is)
      location = getTokenLocation(previousToken);
    }

    // * active= true
    // > no viable alternative at input '* active= true'
    // * active =true
    // > no viable alternative at input '* active =true'
    // * active=true
    // > no viable alternative at input '* active=true'
    else if (/^no viable alternative at input '.*((\S=)|(=\S))/.test(msg)) {
      message =
        "Assignment rules must include at least one space both before and after the '=' sign";
    }

    // ########################################################################
    // # Missing spaces around ->                                             #
    // ########################################################################

    // * identifier ->"Patient.identifier"
    // > mismatched input '->\"Patient.identifier\"' expecting '->'
    // * identifier->"Patient.identifier"
    // > mismatched input '<EOF>' expecting '->'
    else if (/^mismatched input .+ expecting '->'$/.test(msg)) {
      message =
        "Mapping rules must include at least one space both before and after the '->' operator";
      // Need to adjust the location to match the previous token (where '=' is)
      location = getTokenLocation(previousToken);
    }

    // * identifier-> "Patient.identifier"
    // > missing '->' at '"Patient.identifier"'
    else if (/^missing '->'/.test(msg) && /->$/.test(previousToken.text)) {
      message =
        "Mapping rules must include at least one space both before and after the '->' operator";
      // Need to adjust the location to match the previous token (where '=' is)
      location = getTokenLocation(previousToken);
    }

    // ########################################################################
    // # Missing space after *                                                #
    // ########################################################################

    // *active = true
    // > extraneous input '*component' expecting {<EOF>, KW_ALIAS, KW_PROFILE, KW_EXTENSION,
    // > KW_INSTANCE, KW_INVARIANT, KW_VALUESET, KW_CODESYSTEM, KW_RULESET, KW_MAPPING}
    else if (/^extraneous input '\*\S/.test(msg)) {
      message = "Rules must start with a '*' symbol followed by at least one space";
    }

    logger.error(message, { file: this.file, location });
  }
}

/**
 * Gets the previous non-whitespace token, which may be needed to help interpret the error
 * @param recognizer - the Recognizer instance provided by ANTLR
 * @param offendingSymbol - the token that triggered the error
 * @returns the previous non-WS token or undefined if there is no previous non-WS token
 */
function getPreviousNonWsToken(recognizer: Recognizer, offendingSymbol: Token): Token | undefined {
  for (let i = offendingSymbol.tokenIndex - 1; i >= 0; i--) {
    // @ts-ignore _input is private, but we need it
    const token = recognizer._input.tokens[i];
    if (/\S/.test(token.text)) {
      return token;
    }
  }
}

function getTokenLocation(token: Token): TextLocation {
  return {
    startLine: token.line,
    startColumn: token.column + 1,
    endLine: token.line,
    endColumn: token.column + token.text.length
  };
}
