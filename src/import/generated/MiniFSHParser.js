// Generated from MiniFSH.g4 by ANTLR 4.9.3
// jshint ignore: start
import antlr4 from 'antlr4';
import MiniFSHListener from './MiniFSHListener.js';
import MiniFSHVisitor from './MiniFSHVisitor.js';


const serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786",
    "\u5964\u0003\b\u0018\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004",
    "\t\u0004\u0003\u0002\u0006\u0002\n\n\u0002\r\u0002\u000e\u0002\u000b",
    "\u0003\u0002\u0003\u0002\u0003\u0003\u0003\u0003\u0006\u0003\u0012\n",
    "\u0003\r\u0003\u000e\u0003\u0013\u0003\u0004\u0003\u0004\u0003\u0004",
    "\u0002\u0002\u0005\u0002\u0004\u0006\u0002\u0003\u0003\u0002\u0004\u0006",
    "\u0002\u0016\u0002\t\u0003\u0002\u0002\u0002\u0004\u000f\u0003\u0002",
    "\u0002\u0002\u0006\u0015\u0003\u0002\u0002\u0002\b\n\u0005\u0004\u0003",
    "\u0002\t\b\u0003\u0002\u0002\u0002\n\u000b\u0003\u0002\u0002\u0002\u000b",
    "\t\u0003\u0002\u0002\u0002\u000b\f\u0003\u0002\u0002\u0002\f\r\u0003",
    "\u0002\u0002\u0002\r\u000e\u0007\u0002\u0002\u0003\u000e\u0003\u0003",
    "\u0002\u0002\u0002\u000f\u0011\u0007\u0003\u0002\u0002\u0010\u0012\u0005",
    "\u0006\u0004\u0002\u0011\u0010\u0003\u0002\u0002\u0002\u0012\u0013\u0003",
    "\u0002\u0002\u0002\u0013\u0011\u0003\u0002\u0002\u0002\u0013\u0014\u0003",
    "\u0002\u0002\u0002\u0014\u0005\u0003\u0002\u0002\u0002\u0015\u0016\t",
    "\u0002\u0002\u0002\u0016\u0007\u0003\u0002\u0002\u0002\u0004\u000b\u0013"].join("");


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.PredictionContextCache();

export default class MiniFSHParser extends antlr4.Parser {

    static grammarFileName = "MiniFSH.g4";
    static literalNames = [  ];
    static symbolicNames = [ null, "STAR", "STRING", "MULTILINE_STRING", 
                             "SEQUENCE", "WHITESPACE", "LINE_COMMENT" ];
    static ruleNames = [ "ruleSet", "someRule", "rulePart" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = MiniFSHParser.ruleNames;
        this.literalNames = MiniFSHParser.literalNames;
        this.symbolicNames = MiniFSHParser.symbolicNames;
    }

    get atn() {
        return atn;
    }



	ruleSet() {
	    let localctx = new RuleSetContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, MiniFSHParser.RULE_ruleSet);
	    var _la = 0; // Token type
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 7; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 6;
	            this.someRule();
	            this.state = 9; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===MiniFSHParser.STAR);
	        this.state = 11;
	        this.match(MiniFSHParser.EOF);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	someRule() {
	    let localctx = new SomeRuleContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, MiniFSHParser.RULE_someRule);
	    var _la = 0; // Token type
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 13;
	        this.match(MiniFSHParser.STAR);
	        this.state = 15; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 14;
	            this.rulePart();
	            this.state = 17; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << MiniFSHParser.STRING) | (1 << MiniFSHParser.MULTILINE_STRING) | (1 << MiniFSHParser.SEQUENCE))) !== 0));
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	rulePart() {
	    let localctx = new RulePartContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, MiniFSHParser.RULE_rulePart);
	    var _la = 0; // Token type
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 19;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << MiniFSHParser.STRING) | (1 << MiniFSHParser.MULTILINE_STRING) | (1 << MiniFSHParser.SEQUENCE))) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


}

MiniFSHParser.EOF = antlr4.Token.EOF;
MiniFSHParser.STAR = 1;
MiniFSHParser.STRING = 2;
MiniFSHParser.MULTILINE_STRING = 3;
MiniFSHParser.SEQUENCE = 4;
MiniFSHParser.WHITESPACE = 5;
MiniFSHParser.LINE_COMMENT = 6;

MiniFSHParser.RULE_ruleSet = 0;
MiniFSHParser.RULE_someRule = 1;
MiniFSHParser.RULE_rulePart = 2;

class RuleSetContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = MiniFSHParser.RULE_ruleSet;
    }

	EOF() {
	    return this.getToken(MiniFSHParser.EOF, 0);
	};

	someRule = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(SomeRuleContext);
	    } else {
	        return this.getTypedRuleContext(SomeRuleContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof MiniFSHListener ) {
	        listener.enterRuleSet(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof MiniFSHListener ) {
	        listener.exitRuleSet(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof MiniFSHVisitor ) {
	        return visitor.visitRuleSet(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class SomeRuleContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = MiniFSHParser.RULE_someRule;
    }

	STAR() {
	    return this.getToken(MiniFSHParser.STAR, 0);
	};

	rulePart = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(RulePartContext);
	    } else {
	        return this.getTypedRuleContext(RulePartContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof MiniFSHListener ) {
	        listener.enterSomeRule(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof MiniFSHListener ) {
	        listener.exitSomeRule(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof MiniFSHVisitor ) {
	        return visitor.visitSomeRule(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class RulePartContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = MiniFSHParser.RULE_rulePart;
    }

	SEQUENCE() {
	    return this.getToken(MiniFSHParser.SEQUENCE, 0);
	};

	STRING() {
	    return this.getToken(MiniFSHParser.STRING, 0);
	};

	MULTILINE_STRING() {
	    return this.getToken(MiniFSHParser.MULTILINE_STRING, 0);
	};

	enterRule(listener) {
	    if(listener instanceof MiniFSHListener ) {
	        listener.enterRulePart(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof MiniFSHListener ) {
	        listener.exitRulePart(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof MiniFSHVisitor ) {
	        return visitor.visitRulePart(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}




MiniFSHParser.RuleSetContext = RuleSetContext; 
MiniFSHParser.SomeRuleContext = SomeRuleContext; 
MiniFSHParser.RulePartContext = RulePartContext; 
