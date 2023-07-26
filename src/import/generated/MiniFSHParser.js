// Generated from MiniFSH.g4 by ANTLR 4.13.0
// jshint ignore: start
import antlr4 from 'antlr4';
import MiniFSHListener from './MiniFSHListener.js';
import MiniFSHVisitor from './MiniFSHVisitor.js';

const serializedATN = [4,1,6,22,2,0,7,0,2,1,7,1,2,2,7,2,1,0,4,0,8,8,0,11,
0,12,0,9,1,0,1,0,1,1,1,1,4,1,16,8,1,11,1,12,1,17,1,2,1,2,1,2,0,0,3,0,2,4,
0,1,1,0,2,4,20,0,7,1,0,0,0,2,13,1,0,0,0,4,19,1,0,0,0,6,8,3,2,1,0,7,6,1,0,
0,0,8,9,1,0,0,0,9,7,1,0,0,0,9,10,1,0,0,0,10,11,1,0,0,0,11,12,5,0,0,1,12,
1,1,0,0,0,13,15,5,1,0,0,14,16,3,4,2,0,15,14,1,0,0,0,16,17,1,0,0,0,17,15,
1,0,0,0,17,18,1,0,0,0,18,3,1,0,0,0,19,20,7,0,0,0,20,5,1,0,0,0,2,9,17];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

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



	ruleSet() {
	    let localctx = new RuleSetContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, MiniFSHParser.RULE_ruleSet);
	    var _la = 0;
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
	        } while(_la===1);
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
	    var _la = 0;
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
	        } while((((_la) & ~0x1f) === 0 && ((1 << _la) & 28) !== 0));
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
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 19;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 28) !== 0))) {
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
