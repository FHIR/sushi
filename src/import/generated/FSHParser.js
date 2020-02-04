// Generated from FSH.g4 by ANTLR 4.7.2
// jshint ignore: start
var antlr4 = require('antlr4/index');
var FSHListener = require('./FSHListener').FSHListener;
var FSHVisitor = require('./FSHVisitor').FSHVisitor;

var grammarFileName = "FSH.g4";


var serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964",
    "\u0003;\u01d9\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004\t",
    "\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t\u0007\u0004",
    "\b\t\b\u0004\t\t\t\u0004\n\t\n\u0004\u000b\t\u000b\u0004\f\t\f\u0004",
    "\r\t\r\u0004\u000e\t\u000e\u0004\u000f\t\u000f\u0004\u0010\t\u0010\u0004",
    "\u0011\t\u0011\u0004\u0012\t\u0012\u0004\u0013\t\u0013\u0004\u0014\t",
    "\u0014\u0004\u0015\t\u0015\u0004\u0016\t\u0016\u0004\u0017\t\u0017\u0004",
    "\u0018\t\u0018\u0004\u0019\t\u0019\u0004\u001a\t\u001a\u0004\u001b\t",
    "\u001b\u0004\u001c\t\u001c\u0004\u001d\t\u001d\u0004\u001e\t\u001e\u0004",
    "\u001f\t\u001f\u0004 \t \u0004!\t!\u0004\"\t\"\u0004#\t#\u0004$\t$\u0004",
    "%\t%\u0004&\t&\u0004\'\t\'\u0004(\t(\u0004)\t)\u0004*\t*\u0004+\t+\u0004",
    ",\t,\u0004-\t-\u0004.\t.\u0004/\t/\u00040\t0\u00041\t1\u00042\t2\u0004",
    "3\t3\u00044\t4\u00045\t5\u00046\t6\u00047\t7\u00048\t8\u00049\t9\u0003",
    "\u0002\u0007\u0002t\n\u0002\f\u0002\u000e\u0002w\u000b\u0002\u0003\u0002",
    "\u0003\u0002\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0003\u0005\u0003\u0082\n\u0003\u0003\u0004\u0003",
    "\u0004\u0003\u0004\u0003\u0004\u0003\u0004\u0003\u0005\u0003\u0005\u0003",
    "\u0005\u0006\u0005\u008c\n\u0005\r\u0005\u000e\u0005\u008d\u0003\u0005",
    "\u0007\u0005\u0091\n\u0005\f\u0005\u000e\u0005\u0094\u000b\u0005\u0003",
    "\u0006\u0003\u0006\u0003\u0006\u0007\u0006\u0099\n\u0006\f\u0006\u000e",
    "\u0006\u009c\u000b\u0006\u0003\u0006\u0007\u0006\u009f\n\u0006\f\u0006",
    "\u000e\u0006\u00a2\u000b\u0006\u0003\u0007\u0003\u0007\u0003\u0007\u0003",
    "\u0007\u0005\u0007\u00a8\n\u0007\u0003\b\u0003\b\u0003\b\u0003\b\u0003",
    "\b\u0003\b\u0003\b\u0003\b\u0005\b\u00b2\n\b\u0003\t\u0003\t\u0003\t",
    "\u0007\t\u00b7\n\t\f\t\u000e\t\u00ba\u000b\t\u0003\t\u0007\t\u00bd\n",
    "\t\f\t\u000e\t\u00c0\u000b\t\u0003\n\u0003\n\u0005\n\u00c4\n\n\u0003",
    "\u000b\u0003\u000b\u0003\u000b\u0006\u000b\u00c9\n\u000b\r\u000b\u000e",
    "\u000b\u00ca\u0003\f\u0003\f\u0003\f\u0003\f\u0005\f\u00d1\n\f\u0003",
    "\r\u0003\r\u0003\r\u0007\r\u00d6\n\r\f\r\u000e\r\u00d9\u000b\r\u0003",
    "\r\u0003\r\u0007\r\u00dd\n\r\f\r\u000e\r\u00e0\u000b\r\u0003\u000e\u0003",
    "\u000e\u0003\u000e\u0005\u000e\u00e5\n\u000e\u0003\u000f\u0003\u000f",
    "\u0003\u000f\u0007\u000f\u00ea\n\u000f\f\u000f\u000e\u000f\u00ed\u000b",
    "\u000f\u0003\u000f\u0007\u000f\u00f0\n\u000f\f\u000f\u000e\u000f\u00f3",
    "\u000b\u000f\u0003\u0010\u0003\u0010\u0003\u0010\u0005\u0010\u00f8\n",
    "\u0010\u0003\u0011\u0003\u0011\u0003\u0011\u0003\u0012\u0003\u0012\u0003",
    "\u0012\u0003\u0013\u0003\u0013\u0003\u0013\u0003\u0014\u0003\u0014\u0003",
    "\u0014\u0003\u0015\u0003\u0015\u0003\u0015\u0003\u0016\u0003\u0016\u0003",
    "\u0016\u0003\u0017\u0003\u0017\u0003\u0017\u0003\u0018\u0003\u0018\u0003",
    "\u0018\u0003\u0019\u0003\u0019\u0003\u0019\u0003\u0019\u0007\u0019\u0116",
    "\n\u0019\f\u0019\u000e\u0019\u0119\u000b\u0019\u0003\u001a\u0003\u001a",
    "\u0003\u001a\u0005\u001a\u011e\n\u001a\u0003\u001a\u0006\u001a\u0121",
    "\n\u001a\r\u001a\u000e\u001a\u0122\u0003\u001b\u0003\u001b\u0003\u001b",
    "\u0003\u001b\u0003\u001b\u0005\u001b\u012a\n\u001b\u0003\u001c\u0003",
    "\u001c\u0003\u001c\u0003\u001c\u0003\u001c\u0003\u001d\u0003\u001d\u0003",
    "\u001d\u0003\u001d\u0003\u001d\u0003\u001d\u0007\u001d\u0137\n\u001d",
    "\f\u001d\u000e\u001d\u013a\u000b\u001d\u0003\u001e\u0003\u001e\u0003",
    "\u001e\u0003\u001e\u0003\u001e\u0003\u001e\u0007\u001e\u0142\n\u001e",
    "\f\u001e\u000e\u001e\u0145\u000b\u001e\u0003\u001f\u0003\u001f\u0005",
    "\u001f\u0149\n\u001f\u0003\u001f\u0003\u001f\u0003\u001f\u0003\u001f",
    "\u0007\u001f\u014f\n\u001f\f\u001f\u000e\u001f\u0152\u000b\u001f\u0003",
    " \u0003 \u0005 \u0156\n \u0003 \u0003 \u0003 \u0003 \u0003!\u0003!\u0005",
    "!\u015e\n!\u0003!\u0003!\u0005!\u0162\n!\u0003\"\u0003\"\u0005\"\u0166",
    "\n\"\u0003\"\u0003\"\u0005\"\u016a\n\"\u0003#\u0003#\u0003#\u0003#\u0005",
    "#\u0170\n#\u0003$\u0003$\u0003$\u0003$\u0005$\u0176\n$\u0003$\u0003",
    "$\u0003$\u0005$\u017b\n$\u0005$\u017d\n$\u0003%\u0003%\u0003%\u0003",
    "&\u0003&\u0003&\u0003\'\u0003\'\u0003\'\u0007\'\u0188\n\'\f\'\u000e",
    "\'\u018b\u000b\'\u0003\'\u0003\'\u0003(\u0003(\u0003(\u0005(\u0192\n",
    "(\u0003)\u0003)\u0003*\u0003*\u0003*\u0003*\u0003*\u0005*\u019b\n*\u0003",
    "+\u0003+\u0003,\u0003,\u0003-\u0003-\u0003.\u0003.\u0003/\u0003/\u0003",
    "0\u00030\u00030\u00030\u00030\u00030\u00030\u00030\u00030\u00030\u0005",
    "0\u01b1\n0\u00031\u00031\u00031\u00071\u01b6\n1\f1\u000e1\u01b9\u000b",
    "1\u00032\u00032\u00052\u01bd\n2\u00033\u00033\u00033\u00053\u01c2\n",
    "3\u00034\u00034\u00034\u00035\u00035\u00035\u00035\u00036\u00036\u0005",
    "6\u01cd\n6\u00037\u00037\u00057\u01d1\n7\u00038\u00038\u00039\u0003",
    "9\u00059\u01d7\n9\u00039\u0002\u0002:\u0002\u0004\u0006\b\n\f\u000e",
    "\u0010\u0012\u0014\u0016\u0018\u001a\u001c\u001e \"$&(*,.02468:<>@B",
    "DFHJLNPRTVXZ\\^`bdfhjlnp\u0002\b\u0003\u0002*+\u0003\u000278\u0004\u0002",
    "&&88\u0003\u0002\u0012\u0014\u0003\u0002\u0016\u0019\u0003\u0002\u001f",
    " \u0002\u01eb\u0002u\u0003\u0002\u0002\u0002\u0004\u0081\u0003\u0002",
    "\u0002\u0002\u0006\u0083\u0003\u0002\u0002\u0002\b\u0088\u0003\u0002",
    "\u0002\u0002\n\u0095\u0003\u0002\u0002\u0002\f\u00a7\u0003\u0002\u0002",
    "\u0002\u000e\u00b1\u0003\u0002\u0002\u0002\u0010\u00b3\u0003\u0002\u0002",
    "\u0002\u0012\u00c3\u0003\u0002\u0002\u0002\u0014\u00c5\u0003\u0002\u0002",
    "\u0002\u0016\u00d0\u0003\u0002\u0002\u0002\u0018\u00d2\u0003\u0002\u0002",
    "\u0002\u001a\u00e4\u0003\u0002\u0002\u0002\u001c\u00e6\u0003\u0002\u0002",
    "\u0002\u001e\u00f7\u0003\u0002\u0002\u0002 \u00f9\u0003\u0002\u0002",
    "\u0002\"\u00fc\u0003\u0002\u0002\u0002$\u00ff\u0003\u0002\u0002\u0002",
    "&\u0102\u0003\u0002\u0002\u0002(\u0105\u0003\u0002\u0002\u0002*\u0108",
    "\u0003\u0002\u0002\u0002,\u010b\u0003\u0002\u0002\u0002.\u010e\u0003",
    "\u0002\u0002\u00020\u0111\u0003\u0002\u0002\u00022\u011a\u0003\u0002",
    "\u0002\u00024\u0124\u0003\u0002\u0002\u00026\u012b\u0003\u0002\u0002",
    "\u00028\u0130\u0003\u0002\u0002\u0002:\u013b\u0003\u0002\u0002\u0002",
    "<\u0146\u0003\u0002\u0002\u0002>\u0153\u0003\u0002\u0002\u0002@\u015b",
    "\u0003\u0002\u0002\u0002B\u0169\u0003\u0002\u0002\u0002D\u016b\u0003",
    "\u0002\u0002\u0002F\u0171\u0003\u0002\u0002\u0002H\u017e\u0003\u0002",
    "\u0002\u0002J\u0181\u0003\u0002\u0002\u0002L\u0189\u0003\u0002\u0002",
    "\u0002N\u018e\u0003\u0002\u0002\u0002P\u0193\u0003\u0002\u0002\u0002",
    "R\u019a\u0003\u0002\u0002\u0002T\u019c\u0003\u0002\u0002\u0002V\u019e",
    "\u0003\u0002\u0002\u0002X\u01a0\u0003\u0002\u0002\u0002Z\u01a2\u0003",
    "\u0002\u0002\u0002\\\u01a4\u0003\u0002\u0002\u0002^\u01b0\u0003\u0002",
    "\u0002\u0002`\u01b2\u0003\u0002\u0002\u0002b\u01ba\u0003\u0002\u0002",
    "\u0002d\u01be\u0003\u0002\u0002\u0002f\u01c3\u0003\u0002\u0002\u0002",
    "h\u01c6\u0003\u0002\u0002\u0002j\u01ca\u0003\u0002\u0002\u0002l\u01d0",
    "\u0003\u0002\u0002\u0002n\u01d2\u0003\u0002\u0002\u0002p\u01d6\u0003",
    "\u0002\u0002\u0002rt\u0005\u0004\u0003\u0002sr\u0003\u0002\u0002\u0002",
    "tw\u0003\u0002\u0002\u0002us\u0003\u0002\u0002\u0002uv\u0003\u0002\u0002",
    "\u0002vx\u0003\u0002\u0002\u0002wu\u0003\u0002\u0002\u0002xy\u0007\u0002",
    "\u0002\u0003y\u0003\u0003\u0002\u0002\u0002z\u0082\u0005\u0006\u0004",
    "\u0002{\u0082\u0005\b\u0005\u0002|\u0082\u0005\n\u0006\u0002}\u0082",
    "\u0005\u0014\u000b\u0002~\u0082\u0005\u0010\t\u0002\u007f\u0082\u0005",
    "\u0018\r\u0002\u0080\u0082\u0005\u001c\u000f\u0002\u0081z\u0003\u0002",
    "\u0002\u0002\u0081{\u0003\u0002\u0002\u0002\u0081|\u0003\u0002\u0002",
    "\u0002\u0081}\u0003\u0002\u0002\u0002\u0081~\u0003\u0002\u0002\u0002",
    "\u0081\u007f\u0003\u0002\u0002\u0002\u0081\u0080\u0003\u0002\u0002\u0002",
    "\u0082\u0005\u0003\u0002\u0002\u0002\u0083\u0084\u0007\u0003\u0002\u0002",
    "\u0084\u0085\u00078\u0002\u0002\u0085\u0086\u0007&\u0002\u0002\u0086",
    "\u0087\u00078\u0002\u0002\u0087\u0007\u0003\u0002\u0002\u0002\u0088",
    "\u0089\u0007\u0004\u0002\u0002\u0089\u008b\u00078\u0002\u0002\u008a",
    "\u008c\u0005\f\u0007\u0002\u008b\u008a\u0003\u0002\u0002\u0002\u008c",
    "\u008d\u0003\u0002\u0002\u0002\u008d\u008b\u0003\u0002\u0002\u0002\u008d",
    "\u008e\u0003\u0002\u0002\u0002\u008e\u0092\u0003\u0002\u0002\u0002\u008f",
    "\u0091\u0005\u000e\b\u0002\u0090\u008f\u0003\u0002\u0002\u0002\u0091",
    "\u0094\u0003\u0002\u0002\u0002\u0092\u0090\u0003\u0002\u0002\u0002\u0092",
    "\u0093\u0003\u0002\u0002\u0002\u0093\t\u0003\u0002\u0002\u0002\u0094",
    "\u0092\u0003\u0002\u0002\u0002\u0095\u0096\u0007\u0005\u0002\u0002\u0096",
    "\u009a\u00078\u0002\u0002\u0097\u0099\u0005\f\u0007\u0002\u0098\u0097",
    "\u0003\u0002\u0002\u0002\u0099\u009c\u0003\u0002\u0002\u0002\u009a\u0098",
    "\u0003\u0002\u0002\u0002\u009a\u009b\u0003\u0002\u0002\u0002\u009b\u00a0",
    "\u0003\u0002\u0002\u0002\u009c\u009a\u0003\u0002\u0002\u0002\u009d\u009f",
    "\u0005\u000e\b\u0002\u009e\u009d\u0003\u0002\u0002\u0002\u009f\u00a2",
    "\u0003\u0002\u0002\u0002\u00a0\u009e\u0003\u0002\u0002\u0002\u00a0\u00a1",
    "\u0003\u0002\u0002\u0002\u00a1\u000b\u0003\u0002\u0002\u0002\u00a2\u00a0",
    "\u0003\u0002\u0002\u0002\u00a3\u00a8\u0005 \u0011\u0002\u00a4\u00a8",
    "\u0005\"\u0012\u0002\u00a5\u00a8\u0005$\u0013\u0002\u00a6\u00a8\u0005",
    "&\u0014\u0002\u00a7\u00a3\u0003\u0002\u0002\u0002\u00a7\u00a4\u0003",
    "\u0002\u0002\u0002\u00a7\u00a5\u0003\u0002\u0002\u0002\u00a7\u00a6\u0003",
    "\u0002\u0002\u0002\u00a8\r\u0003\u0002\u0002\u0002\u00a9\u00b2\u0005",
    "0\u0019\u0002\u00aa\u00b2\u00052\u001a\u0002\u00ab\u00b2\u00054\u001b",
    "\u0002\u00ac\u00b2\u00056\u001c\u0002\u00ad\u00b2\u00058\u001d\u0002",
    "\u00ae\u00b2\u0005:\u001e\u0002\u00af\u00b2\u0005<\u001f\u0002\u00b0",
    "\u00b2\u0005> \u0002\u00b1\u00a9\u0003\u0002\u0002\u0002\u00b1\u00aa",
    "\u0003\u0002\u0002\u0002\u00b1\u00ab\u0003\u0002\u0002\u0002\u00b1\u00ac",
    "\u0003\u0002\u0002\u0002\u00b1\u00ad\u0003\u0002\u0002\u0002\u00b1\u00ae",
    "\u0003\u0002\u0002\u0002\u00b1\u00af\u0003\u0002\u0002\u0002\u00b1\u00b0",
    "\u0003\u0002\u0002\u0002\u00b2\u000f\u0003\u0002\u0002\u0002\u00b3\u00b4",
    "\u0007\u0006\u0002\u0002\u00b4\u00b8\u00078\u0002\u0002\u00b5\u00b7",
    "\u0005\u0012\n\u0002\u00b6\u00b5\u0003\u0002\u0002\u0002\u00b7\u00ba",
    "\u0003\u0002\u0002\u0002\u00b8\u00b6\u0003\u0002\u0002\u0002\u00b8\u00b9",
    "\u0003\u0002\u0002\u0002\u00b9\u00be\u0003\u0002\u0002\u0002\u00ba\u00b8",
    "\u0003\u0002\u0002\u0002\u00bb\u00bd\u00056\u001c\u0002\u00bc\u00bb",
    "\u0003\u0002\u0002\u0002\u00bd\u00c0\u0003\u0002\u0002\u0002\u00be\u00bc",
    "\u0003\u0002\u0002\u0002\u00be\u00bf\u0003\u0002\u0002\u0002\u00bf\u0011",
    "\u0003\u0002\u0002\u0002\u00c0\u00be\u0003\u0002\u0002\u0002\u00c1\u00c4",
    "\u0005.\u0018\u0002\u00c2\u00c4\u0005$\u0013\u0002\u00c3\u00c1\u0003",
    "\u0002\u0002\u0002\u00c3\u00c2\u0003\u0002\u0002\u0002\u00c4\u0013\u0003",
    "\u0002\u0002\u0002\u00c5\u00c6\u0007\b\u0002\u0002\u00c6\u00c8\u0007",
    "8\u0002\u0002\u00c7\u00c9\u0005\u0016\f\u0002\u00c8\u00c7\u0003\u0002",
    "\u0002\u0002\u00c9\u00ca\u0003\u0002\u0002\u0002\u00ca\u00c8\u0003\u0002",
    "\u0002\u0002\u00ca\u00cb\u0003\u0002\u0002\u0002\u00cb\u0015\u0003\u0002",
    "\u0002\u0002\u00cc\u00d1\u0005&\u0014\u0002\u00cd\u00d1\u0005(\u0015",
    "\u0002\u00ce\u00d1\u0005*\u0016\u0002\u00cf\u00d1\u0005,\u0017\u0002",
    "\u00d0\u00cc\u0003\u0002\u0002\u0002\u00d0\u00cd\u0003\u0002\u0002\u0002",
    "\u00d0\u00ce\u0003\u0002\u0002\u0002\u00d0\u00cf\u0003\u0002\u0002\u0002",
    "\u00d1\u0017\u0003\u0002\u0002\u0002\u00d2\u00d3\u0007\t\u0002\u0002",
    "\u00d3\u00d7\u00078\u0002\u0002\u00d4\u00d6\u0005\u001a\u000e\u0002",
    "\u00d5\u00d4\u0003\u0002\u0002\u0002\u00d6\u00d9\u0003\u0002\u0002\u0002",
    "\u00d7\u00d5\u0003\u0002\u0002\u0002\u00d7\u00d8\u0003\u0002\u0002\u0002",
    "\u00d8\u00de\u0003\u0002\u0002\u0002\u00d9\u00d7\u0003\u0002\u0002\u0002",
    "\u00da\u00dd\u0005> \u0002\u00db\u00dd\u0005@!\u0002\u00dc\u00da\u0003",
    "\u0002\u0002\u0002\u00dc\u00db\u0003\u0002\u0002\u0002\u00dd\u00e0\u0003",
    "\u0002\u0002\u0002\u00de\u00dc\u0003\u0002\u0002\u0002\u00de\u00df\u0003",
    "\u0002\u0002\u0002\u00df\u0019\u0003\u0002\u0002\u0002\u00e0\u00de\u0003",
    "\u0002\u0002\u0002\u00e1\u00e5\u0005\"\u0012\u0002\u00e2\u00e5\u0005",
    "$\u0013\u0002\u00e3\u00e5\u0005&\u0014\u0002\u00e4\u00e1\u0003\u0002",
    "\u0002\u0002\u00e4\u00e2\u0003\u0002\u0002\u0002\u00e4\u00e3\u0003\u0002",
    "\u0002\u0002\u00e5\u001b\u0003\u0002\u0002\u0002\u00e6\u00e7\u0007\n",
    "\u0002\u0002\u00e7\u00eb\u00078\u0002\u0002\u00e8\u00ea\u0005\u001e",
    "\u0010\u0002\u00e9\u00e8\u0003\u0002\u0002\u0002\u00ea\u00ed\u0003\u0002",
    "\u0002\u0002\u00eb\u00e9\u0003\u0002\u0002\u0002\u00eb\u00ec\u0003\u0002",
    "\u0002\u0002\u00ec\u00f1\u0003\u0002\u0002\u0002\u00ed\u00eb\u0003\u0002",
    "\u0002\u0002\u00ee\u00f0\u0005d3\u0002\u00ef\u00ee\u0003\u0002\u0002",
    "\u0002\u00f0\u00f3\u0003\u0002\u0002\u0002\u00f1\u00ef\u0003\u0002\u0002",
    "\u0002\u00f1\u00f2\u0003\u0002\u0002\u0002\u00f2\u001d\u0003\u0002\u0002",
    "\u0002\u00f3\u00f1\u0003\u0002\u0002\u0002\u00f4\u00f8\u0005\"\u0012",
    "\u0002\u00f5\u00f8\u0005$\u0013\u0002\u00f6\u00f8\u0005&\u0014\u0002",
    "\u00f7\u00f4\u0003\u0002\u0002\u0002\u00f7\u00f5\u0003\u0002\u0002\u0002",
    "\u00f7\u00f6\u0003\u0002\u0002\u0002\u00f8\u001f\u0003\u0002\u0002\u0002",
    "\u00f9\u00fa\u0007\u000b\u0002\u0002\u00fa\u00fb\u00078\u0002\u0002",
    "\u00fb!\u0003\u0002\u0002\u0002\u00fc\u00fd\u0007\f\u0002\u0002\u00fd",
    "\u00fe\u00078\u0002\u0002\u00fe#\u0003\u0002\u0002\u0002\u00ff\u0100",
    "\u0007\r\u0002\u0002\u0100\u0101\u0007*\u0002\u0002\u0101%\u0003\u0002",
    "\u0002\u0002\u0102\u0103\u0007\u000e\u0002\u0002\u0103\u0104\t\u0002",
    "\u0002\u0002\u0104\'\u0003\u0002\u0002\u0002\u0105\u0106\u0007\u000f",
    "\u0002\u0002\u0106\u0107\u0007*\u0002\u0002\u0107)\u0003\u0002\u0002",
    "\u0002\u0108\u0109\u0007\u0010\u0002\u0002\u0109\u010a\u0007*\u0002",
    "\u0002\u010a+\u0003\u0002\u0002\u0002\u010b\u010c\u0007\u0011\u0002",
    "\u0002\u010c\u010d\u0007.\u0002\u0002\u010d-\u0003\u0002\u0002\u0002",
    "\u010e\u010f\u0007\u0007\u0002\u0002\u010f\u0110\u00078\u0002\u0002",
    "\u0110/\u0003\u0002\u0002\u0002\u0111\u0112\u0007\'\u0002\u0002\u0112",
    "\u0113\u0005T+\u0002\u0113\u0117\u00072\u0002\u0002\u0114\u0116\u0005",
    "Z.\u0002\u0115\u0114\u0003\u0002\u0002\u0002\u0116\u0119\u0003\u0002",
    "\u0002\u0002\u0117\u0115\u0003\u0002\u0002\u0002\u0117\u0118\u0003\u0002",
    "\u0002\u0002\u01181\u0003\u0002\u0002\u0002\u0119\u0117\u0003\u0002",
    "\u0002\u0002\u011a\u011d\u0007\'\u0002\u0002\u011b\u011e\u0005T+\u0002",
    "\u011c\u011e\u0005V,\u0002\u011d\u011b\u0003\u0002\u0002\u0002\u011d",
    "\u011c\u0003\u0002\u0002\u0002\u011e\u0120\u0003\u0002\u0002\u0002\u011f",
    "\u0121\u0005Z.\u0002\u0120\u011f\u0003\u0002\u0002\u0002\u0121\u0122",
    "\u0003\u0002\u0002\u0002\u0122\u0120\u0003\u0002\u0002\u0002\u0122\u0123",
    "\u0003\u0002\u0002\u0002\u01233\u0003\u0002\u0002\u0002\u0124\u0125",
    "\u0007\'\u0002\u0002\u0125\u0126\u0005T+\u0002\u0126\u0127\u0007\u0015",
    "\u0002\u0002\u0127\u0129\u00078\u0002\u0002\u0128\u012a\u0005\\/\u0002",
    "\u0129\u0128\u0003\u0002\u0002\u0002\u0129\u012a\u0003\u0002\u0002\u0002",
    "\u012a5\u0003\u0002\u0002\u0002\u012b\u012c\u0007\'\u0002\u0002\u012c",
    "\u012d\u0005T+\u0002\u012d\u012e\u0007&\u0002\u0002\u012e\u012f\u0005",
    "^0\u0002\u012f7\u0003\u0002\u0002\u0002\u0130\u0131\u0007\'\u0002\u0002",
    "\u0131\u0132\u0005T+\u0002\u0132\u0133\u0007\u001a\u0002\u0002\u0133",
    "\u0138\u0005`1\u0002\u0134\u0135\u0007\u001b\u0002\u0002\u0135\u0137",
    "\u0005`1\u0002\u0136\u0134\u0003\u0002\u0002\u0002\u0137\u013a\u0003",
    "\u0002\u0002\u0002\u0138\u0136\u0003\u0002\u0002\u0002\u0138\u0139\u0003",
    "\u0002\u0002\u0002\u01399\u0003\u0002\u0002\u0002\u013a\u0138\u0003",
    "\u0002\u0002\u0002\u013b\u013c\u0007\'\u0002\u0002\u013c\u013d\u0005",
    "T+\u0002\u013d\u013e\u0007\u001c\u0002\u0002\u013e\u0143\u0005p9\u0002",
    "\u013f\u0140\u0007\u001d\u0002\u0002\u0140\u0142\u0005p9\u0002\u0141",
    "\u013f\u0003\u0002\u0002\u0002\u0142\u0145\u0003\u0002\u0002\u0002\u0143",
    "\u0141\u0003\u0002\u0002\u0002\u0143\u0144\u0003\u0002\u0002\u0002\u0144",
    ";\u0003\u0002\u0002\u0002\u0145\u0143\u0003\u0002\u0002\u0002\u0146",
    "\u0148\u0007\'\u0002\u0002\u0147\u0149\u0005T+\u0002\u0148\u0147\u0003",
    "\u0002\u0002\u0002\u0148\u0149\u0003\u0002\u0002\u0002\u0149\u014a\u0003",
    "\u0002\u0002\u0002\u014a\u014b\u0007\u001e\u0002\u0002\u014b\u0150\u0007",
    "8\u0002\u0002\u014c\u014d\u0007\u001b\u0002\u0002\u014d\u014f\u0007",
    "8\u0002\u0002\u014e\u014c\u0003\u0002\u0002\u0002\u014f\u0152\u0003",
    "\u0002\u0002\u0002\u0150\u014e\u0003\u0002\u0002\u0002\u0150\u0151\u0003",
    "\u0002\u0002\u0002\u0151=\u0003\u0002\u0002\u0002\u0152\u0150\u0003",
    "\u0002\u0002\u0002\u0153\u0155\u0007\'\u0002\u0002\u0154\u0156\u0005",
    "T+\u0002\u0155\u0154\u0003\u0002\u0002\u0002\u0155\u0156\u0003\u0002",
    "\u0002\u0002\u0156\u0157\u0003\u0002\u0002\u0002\u0157\u0158\u0005X",
    "-\u0002\u0158\u0159\u0007&\u0002\u0002\u0159\u015a\u0005^0\u0002\u015a",
    "?\u0003\u0002\u0002\u0002\u015b\u015d\u0007\'\u0002\u0002\u015c\u015e",
    "\u0007!\u0002\u0002\u015d\u015c\u0003\u0002\u0002\u0002\u015d\u015e",
    "\u0003\u0002\u0002\u0002\u015e\u0161\u0003\u0002\u0002\u0002\u015f\u0162",
    "\u0005B\"\u0002\u0160\u0162\u0005D#\u0002\u0161\u015f\u0003\u0002\u0002",
    "\u0002\u0161\u0160\u0003\u0002\u0002\u0002\u0162A\u0003\u0002\u0002",
    "\u0002\u0163\u0165\u0005b2\u0002\u0164\u0166\u0005F$\u0002\u0165\u0164",
    "\u0003\u0002\u0002\u0002\u0165\u0166\u0003\u0002\u0002\u0002\u0166\u016a",
    "\u0003\u0002\u0002\u0002\u0167\u0168\u00076\u0002\u0002\u0168\u016a",
    "\u0005F$\u0002\u0169\u0163\u0003\u0002\u0002\u0002\u0169\u0167\u0003",
    "\u0002\u0002\u0002\u016aC\u0003\u0002\u0002\u0002\u016b\u016c\u0007",
    "\"\u0002\u0002\u016c\u016f\u0005F$\u0002\u016d\u016e\u0007#\u0002\u0002",
    "\u016e\u0170\u0005L\'\u0002\u016f\u016d\u0003\u0002\u0002\u0002\u016f",
    "\u0170\u0003\u0002\u0002\u0002\u0170E\u0003\u0002\u0002\u0002\u0171",
    "\u017c\u0007\u0015\u0002\u0002\u0172\u0175\u0005H%\u0002\u0173\u0174",
    "\u0007\u001b\u0002\u0002\u0174\u0176\u0005J&\u0002\u0175\u0173\u0003",
    "\u0002\u0002\u0002\u0175\u0176\u0003\u0002\u0002\u0002\u0176\u017d\u0003",
    "\u0002\u0002\u0002\u0177\u017a\u0005J&\u0002\u0178\u0179\u0007\u001b",
    "\u0002\u0002\u0179\u017b\u0005H%\u0002\u017a\u0178\u0003\u0002\u0002",
    "\u0002\u017a\u017b\u0003\u0002\u0002\u0002\u017b\u017d\u0003\u0002\u0002",
    "\u0002\u017c\u0172\u0003\u0002\u0002\u0002\u017c\u0177\u0003\u0002\u0002",
    "\u0002\u017dG\u0003\u0002\u0002\u0002\u017e\u017f\u0007%\u0002\u0002",
    "\u017f\u0180\u00078\u0002\u0002\u0180I\u0003\u0002\u0002\u0002\u0181",
    "\u0182\u0007$\u0002\u0002\u0182\u0183\t\u0003\u0002\u0002\u0183K\u0003",
    "\u0002\u0002\u0002\u0184\u0185\u0005N(\u0002\u0185\u0186\u0007\u001b",
    "\u0002\u0002\u0186\u0188\u0003\u0002\u0002\u0002\u0187\u0184\u0003\u0002",
    "\u0002\u0002\u0188\u018b\u0003\u0002\u0002\u0002\u0189\u0187\u0003\u0002",
    "\u0002\u0002\u0189\u018a\u0003\u0002\u0002\u0002\u018a\u018c\u0003\u0002",
    "\u0002\u0002\u018b\u0189\u0003\u0002\u0002\u0002\u018c\u018d\u0005N",
    "(\u0002\u018dM\u0003\u0002\u0002\u0002\u018e\u018f\u00078\u0002\u0002",
    "\u018f\u0191\u0005P)\u0002\u0190\u0192\u0005R*\u0002\u0191\u0190\u0003",
    "\u0002\u0002\u0002\u0191\u0192\u0003\u0002\u0002\u0002\u0192O\u0003",
    "\u0002\u0002\u0002\u0193\u0194\t\u0004\u0002\u0002\u0194Q\u0003\u0002",
    "\u0002\u0002\u0195\u019b\u0005b2\u0002\u0196\u019b\u0007\u001f\u0002",
    "\u0002\u0197\u019b\u0007 \u0002\u0002\u0198\u019b\u00075\u0002\u0002",
    "\u0199\u019b\u0007*\u0002\u0002\u019a\u0195\u0003\u0002\u0002\u0002",
    "\u019a\u0196\u0003\u0002\u0002\u0002\u019a\u0197\u0003\u0002\u0002\u0002",
    "\u019a\u0198\u0003\u0002\u0002\u0002\u019a\u0199\u0003\u0002\u0002\u0002",
    "\u019bS\u0003\u0002\u0002\u0002\u019c\u019d\u00078\u0002\u0002\u019d",
    "U\u0003\u0002\u0002\u0002\u019e\u019f\u00077\u0002\u0002\u019fW\u0003",
    "\u0002\u0002\u0002\u01a0\u01a1\u00074\u0002\u0002\u01a1Y\u0003\u0002",
    "\u0002\u0002\u01a2\u01a3\t\u0005\u0002\u0002\u01a3[\u0003\u0002\u0002",
    "\u0002\u01a4\u01a5\t\u0006\u0002\u0002\u01a5]\u0003\u0002\u0002\u0002",
    "\u01a6\u01b1\u0007*\u0002\u0002\u01a7\u01b1\u0007+\u0002\u0002\u01a8",
    "\u01b1\u0007,\u0002\u0002\u01a9\u01b1\u00070\u0002\u0002\u01aa\u01b1",
    "\u00071\u0002\u0002\u01ab\u01b1\u0005j6\u0002\u01ac\u01b1\u0005b2\u0002",
    "\u01ad\u01b1\u0005f4\u0002\u01ae\u01b1\u0005h5\u0002\u01af\u01b1\u0005",
    "n8\u0002\u01b0\u01a6\u0003\u0002\u0002\u0002\u01b0\u01a7\u0003\u0002",
    "\u0002\u0002\u01b0\u01a8\u0003\u0002\u0002\u0002\u01b0\u01a9\u0003\u0002",
    "\u0002\u0002\u01b0\u01aa\u0003\u0002\u0002\u0002\u01b0\u01ab\u0003\u0002",
    "\u0002\u0002\u01b0\u01ac\u0003\u0002\u0002\u0002\u01b0\u01ad\u0003\u0002",
    "\u0002\u0002\u01b0\u01ae\u0003\u0002\u0002\u0002\u01b0\u01af\u0003\u0002",
    "\u0002\u0002\u01b1_\u0003\u0002\u0002\u0002\u01b2\u01b3\u00078\u0002",
    "\u0002\u01b3\u01b7\u00072\u0002\u0002\u01b4\u01b6\u0005Z.\u0002\u01b5",
    "\u01b4\u0003\u0002\u0002\u0002\u01b6\u01b9\u0003\u0002\u0002\u0002\u01b7",
    "\u01b5\u0003\u0002\u0002\u0002\u01b7\u01b8\u0003\u0002\u0002\u0002\u01b8",
    "a\u0003\u0002\u0002\u0002\u01b9\u01b7\u0003\u0002\u0002\u0002\u01ba",
    "\u01bc\u0007.\u0002\u0002\u01bb\u01bd\u0007*\u0002\u0002\u01bc\u01bb",
    "\u0003\u0002\u0002\u0002\u01bc\u01bd\u0003\u0002\u0002\u0002\u01bdc",
    "\u0003\u0002\u0002\u0002\u01be\u01bf\u0007\'\u0002\u0002\u01bf\u01c1",
    "\u0005b2\u0002\u01c0\u01c2\u0007*\u0002\u0002\u01c1\u01c0\u0003\u0002",
    "\u0002\u0002\u01c1\u01c2\u0003\u0002\u0002\u0002\u01c2e\u0003\u0002",
    "\u0002\u0002\u01c3\u01c4\u0007,\u0002\u0002\u01c4\u01c5\u0007-\u0002",
    "\u0002\u01c5g\u0003\u0002\u0002\u0002\u01c6\u01c7\u0005l7\u0002\u01c7",
    "\u01c8\u0007(\u0002\u0002\u01c8\u01c9\u0005l7\u0002\u01c9i\u0003\u0002",
    "\u0002\u0002\u01ca\u01cc\u00073\u0002\u0002\u01cb\u01cd\u0007*\u0002",
    "\u0002\u01cc\u01cb\u0003\u0002\u0002\u0002\u01cc\u01cd\u0003\u0002\u0002",
    "\u0002\u01cdk\u0003\u0002\u0002\u0002\u01ce\u01d1\u0007,\u0002\u0002",
    "\u01cf\u01d1\u0005f4\u0002\u01d0\u01ce\u0003\u0002\u0002\u0002\u01d0",
    "\u01cf\u0003\u0002\u0002\u0002\u01d1m\u0003\u0002\u0002\u0002\u01d2",
    "\u01d3\t\u0007\u0002\u0002\u01d3o\u0003\u0002\u0002\u0002\u01d4\u01d7",
    "\u00078\u0002\u0002\u01d5\u01d7\u0005j6\u0002\u01d6\u01d4\u0003\u0002",
    "\u0002\u0002\u01d6\u01d5\u0003\u0002\u0002\u0002\u01d7q\u0003\u0002",
    "\u0002\u00021u\u0081\u008d\u0092\u009a\u00a0\u00a7\u00b1\u00b8\u00be",
    "\u00c3\u00ca\u00d0\u00d7\u00dc\u00de\u00e4\u00eb\u00f1\u00f7\u0117\u011d",
    "\u0122\u0129\u0138\u0143\u0148\u0150\u0155\u015d\u0161\u0165\u0169\u016f",
    "\u0175\u017a\u017c\u0189\u0191\u019a\u01b0\u01b7\u01bc\u01c1\u01cc\u01d0",
    "\u01d6"].join("");


var atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

var decisionsToDFA = atn.decisionToState.map( function(ds, index) { return new antlr4.dfa.DFA(ds, index); });

var sharedContextCache = new antlr4.PredictionContextCache();

var literalNames = [ null, null, null, null, null, null, null, null, null, 
                     null, null, null, null, null, null, null, "'?!'", "'MS'", 
                     "'SU'", "'from'", null, null, null, null, "'contains'", 
                     "'and'", "'only'", "'or'", "'obeys'", "'true'", "'false'", 
                     "'exclude'", "'codes'", "'where'", "'valueset'", "'system'", 
                     "'='", null, "':'", "','" ];

var symbolicNames = [ null, "KW_ALIAS", "KW_PROFILE", "KW_EXTENSION", "KW_INSTANCE", 
                      "KW_INSTANCEOF", "KW_INVARIANT", "KW_VALUESET", "KW_CODESYSTEM", 
                      "KW_PARENT", "KW_ID", "KW_TITLE", "KW_DESCRIPTION", 
                      "KW_EXPRESSION", "KW_XPATH", "KW_SEVERITY", "KW_MOD", 
                      "KW_MS", "KW_SU", "KW_FROM", "KW_EXAMPLE", "KW_PREFERRED", 
                      "KW_EXTENSIBLE", "KW_REQUIRED", "KW_CONTAINS", "KW_AND", 
                      "KW_ONLY", "KW_OR", "KW_OBEYS", "KW_TRUE", "KW_FALSE", 
                      "KW_EXCLUDE", "KW_CODES", "KW_WHERE", "KW_VSREFERENCE", 
                      "KW_SYSTEM", "EQUAL", "STAR", "COLON", "COMMA", "STRING", 
                      "MULTILINE_STRING", "NUMBER", "UNIT", "CODE", "CONCEPT_STRING", 
                      "DATETIME", "TIME", "CARD", "REFERENCE", "CARET_SEQUENCE", 
                      "REGEX", "COMMA_DELIMITED_CODES", "COMMA_DELIMITED_SEQUENCES", 
                      "SEQUENCE", "WHITESPACE", "BLOCK_COMMENT", "LINE_COMMENT" ];

var ruleNames =  [ "doc", "entity", "alias", "profile", "extension", "sdMetadata", 
                   "sdRule", "instance", "instanceMetadata", "invariant", 
                   "invariantMetadata", "valueSet", "vsMetadata", "codeSystem", 
                   "csMetadata", "parent", "id", "title", "description", 
                   "expression", "xpath", "severity", "instanceOf", "cardRule", 
                   "flagRule", "valueSetRule", "fixedValueRule", "containsRule", 
                   "onlyRule", "obeysRule", "caretValueRule", "vsComponent", 
                   "vsConceptComponent", "vsFilterComponent", "vsComponentFrom", 
                   "vsFromSystem", "vsFromValueset", "vsFilterList", "vsFilterDefinition", 
                   "vsFilterOperator", "vsFilterValue", "path", "paths", 
                   "caretPath", "flag", "strength", "value", "item", "code", 
                   "concept", "quantity", "ratio", "reference", "ratioPart", 
                   "bool", "targetType" ];

function FSHParser (input) {
	antlr4.Parser.call(this, input);
    this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
    this.ruleNames = ruleNames;
    this.literalNames = literalNames;
    this.symbolicNames = symbolicNames;
    return this;
}

FSHParser.prototype = Object.create(antlr4.Parser.prototype);
FSHParser.prototype.constructor = FSHParser;

Object.defineProperty(FSHParser.prototype, "atn", {
	get : function() {
		return atn;
	}
});

FSHParser.EOF = antlr4.Token.EOF;
FSHParser.KW_ALIAS = 1;
FSHParser.KW_PROFILE = 2;
FSHParser.KW_EXTENSION = 3;
FSHParser.KW_INSTANCE = 4;
FSHParser.KW_INSTANCEOF = 5;
FSHParser.KW_INVARIANT = 6;
FSHParser.KW_VALUESET = 7;
FSHParser.KW_CODESYSTEM = 8;
FSHParser.KW_PARENT = 9;
FSHParser.KW_ID = 10;
FSHParser.KW_TITLE = 11;
FSHParser.KW_DESCRIPTION = 12;
FSHParser.KW_EXPRESSION = 13;
FSHParser.KW_XPATH = 14;
FSHParser.KW_SEVERITY = 15;
FSHParser.KW_MOD = 16;
FSHParser.KW_MS = 17;
FSHParser.KW_SU = 18;
FSHParser.KW_FROM = 19;
FSHParser.KW_EXAMPLE = 20;
FSHParser.KW_PREFERRED = 21;
FSHParser.KW_EXTENSIBLE = 22;
FSHParser.KW_REQUIRED = 23;
FSHParser.KW_CONTAINS = 24;
FSHParser.KW_AND = 25;
FSHParser.KW_ONLY = 26;
FSHParser.KW_OR = 27;
FSHParser.KW_OBEYS = 28;
FSHParser.KW_TRUE = 29;
FSHParser.KW_FALSE = 30;
FSHParser.KW_EXCLUDE = 31;
FSHParser.KW_CODES = 32;
FSHParser.KW_WHERE = 33;
FSHParser.KW_VSREFERENCE = 34;
FSHParser.KW_SYSTEM = 35;
FSHParser.EQUAL = 36;
FSHParser.STAR = 37;
FSHParser.COLON = 38;
FSHParser.COMMA = 39;
FSHParser.STRING = 40;
FSHParser.MULTILINE_STRING = 41;
FSHParser.NUMBER = 42;
FSHParser.UNIT = 43;
FSHParser.CODE = 44;
FSHParser.CONCEPT_STRING = 45;
FSHParser.DATETIME = 46;
FSHParser.TIME = 47;
FSHParser.CARD = 48;
FSHParser.REFERENCE = 49;
FSHParser.CARET_SEQUENCE = 50;
FSHParser.REGEX = 51;
FSHParser.COMMA_DELIMITED_CODES = 52;
FSHParser.COMMA_DELIMITED_SEQUENCES = 53;
FSHParser.SEQUENCE = 54;
FSHParser.WHITESPACE = 55;
FSHParser.BLOCK_COMMENT = 56;
FSHParser.LINE_COMMENT = 57;

FSHParser.RULE_doc = 0;
FSHParser.RULE_entity = 1;
FSHParser.RULE_alias = 2;
FSHParser.RULE_profile = 3;
FSHParser.RULE_extension = 4;
FSHParser.RULE_sdMetadata = 5;
FSHParser.RULE_sdRule = 6;
FSHParser.RULE_instance = 7;
FSHParser.RULE_instanceMetadata = 8;
FSHParser.RULE_invariant = 9;
FSHParser.RULE_invariantMetadata = 10;
FSHParser.RULE_valueSet = 11;
FSHParser.RULE_vsMetadata = 12;
FSHParser.RULE_codeSystem = 13;
FSHParser.RULE_csMetadata = 14;
FSHParser.RULE_parent = 15;
FSHParser.RULE_id = 16;
FSHParser.RULE_title = 17;
FSHParser.RULE_description = 18;
FSHParser.RULE_expression = 19;
FSHParser.RULE_xpath = 20;
FSHParser.RULE_severity = 21;
FSHParser.RULE_instanceOf = 22;
FSHParser.RULE_cardRule = 23;
FSHParser.RULE_flagRule = 24;
FSHParser.RULE_valueSetRule = 25;
FSHParser.RULE_fixedValueRule = 26;
FSHParser.RULE_containsRule = 27;
FSHParser.RULE_onlyRule = 28;
FSHParser.RULE_obeysRule = 29;
FSHParser.RULE_caretValueRule = 30;
FSHParser.RULE_vsComponent = 31;
FSHParser.RULE_vsConceptComponent = 32;
FSHParser.RULE_vsFilterComponent = 33;
FSHParser.RULE_vsComponentFrom = 34;
FSHParser.RULE_vsFromSystem = 35;
FSHParser.RULE_vsFromValueset = 36;
FSHParser.RULE_vsFilterList = 37;
FSHParser.RULE_vsFilterDefinition = 38;
FSHParser.RULE_vsFilterOperator = 39;
FSHParser.RULE_vsFilterValue = 40;
FSHParser.RULE_path = 41;
FSHParser.RULE_paths = 42;
FSHParser.RULE_caretPath = 43;
FSHParser.RULE_flag = 44;
FSHParser.RULE_strength = 45;
FSHParser.RULE_value = 46;
FSHParser.RULE_item = 47;
FSHParser.RULE_code = 48;
FSHParser.RULE_concept = 49;
FSHParser.RULE_quantity = 50;
FSHParser.RULE_ratio = 51;
FSHParser.RULE_reference = 52;
FSHParser.RULE_ratioPart = 53;
FSHParser.RULE_bool = 54;
FSHParser.RULE_targetType = 55;


function DocContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_doc;
    return this;
}

DocContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
DocContext.prototype.constructor = DocContext;

DocContext.prototype.EOF = function() {
    return this.getToken(FSHParser.EOF, 0);
};

DocContext.prototype.entity = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(EntityContext);
    } else {
        return this.getTypedRuleContext(EntityContext,i);
    }
};

DocContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterDoc(this);
	}
};

DocContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitDoc(this);
	}
};

DocContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitDoc(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.DocContext = DocContext;

FSHParser.prototype.doc = function() {

    var localctx = new DocContext(this, this._ctx, this.state);
    this.enterRule(localctx, 0, FSHParser.RULE_doc);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 115;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_ALIAS) | (1 << FSHParser.KW_PROFILE) | (1 << FSHParser.KW_EXTENSION) | (1 << FSHParser.KW_INSTANCE) | (1 << FSHParser.KW_INVARIANT) | (1 << FSHParser.KW_VALUESET) | (1 << FSHParser.KW_CODESYSTEM))) !== 0)) {
            this.state = 112;
            this.entity();
            this.state = 117;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 118;
        this.match(FSHParser.EOF);
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
};


function EntityContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_entity;
    return this;
}

EntityContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
EntityContext.prototype.constructor = EntityContext;

EntityContext.prototype.alias = function() {
    return this.getTypedRuleContext(AliasContext,0);
};

EntityContext.prototype.profile = function() {
    return this.getTypedRuleContext(ProfileContext,0);
};

EntityContext.prototype.extension = function() {
    return this.getTypedRuleContext(ExtensionContext,0);
};

EntityContext.prototype.invariant = function() {
    return this.getTypedRuleContext(InvariantContext,0);
};

EntityContext.prototype.instance = function() {
    return this.getTypedRuleContext(InstanceContext,0);
};

EntityContext.prototype.valueSet = function() {
    return this.getTypedRuleContext(ValueSetContext,0);
};

EntityContext.prototype.codeSystem = function() {
    return this.getTypedRuleContext(CodeSystemContext,0);
};

EntityContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterEntity(this);
	}
};

EntityContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitEntity(this);
	}
};

EntityContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitEntity(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.EntityContext = EntityContext;

FSHParser.prototype.entity = function() {

    var localctx = new EntityContext(this, this._ctx, this.state);
    this.enterRule(localctx, 2, FSHParser.RULE_entity);
    try {
        this.state = 127;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_ALIAS:
            this.enterOuterAlt(localctx, 1);
            this.state = 120;
            this.alias();
            break;
        case FSHParser.KW_PROFILE:
            this.enterOuterAlt(localctx, 2);
            this.state = 121;
            this.profile();
            break;
        case FSHParser.KW_EXTENSION:
            this.enterOuterAlt(localctx, 3);
            this.state = 122;
            this.extension();
            break;
        case FSHParser.KW_INVARIANT:
            this.enterOuterAlt(localctx, 4);
            this.state = 123;
            this.invariant();
            break;
        case FSHParser.KW_INSTANCE:
            this.enterOuterAlt(localctx, 5);
            this.state = 124;
            this.instance();
            break;
        case FSHParser.KW_VALUESET:
            this.enterOuterAlt(localctx, 6);
            this.state = 125;
            this.valueSet();
            break;
        case FSHParser.KW_CODESYSTEM:
            this.enterOuterAlt(localctx, 7);
            this.state = 126;
            this.codeSystem();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function AliasContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_alias;
    return this;
}

AliasContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
AliasContext.prototype.constructor = AliasContext;

AliasContext.prototype.KW_ALIAS = function() {
    return this.getToken(FSHParser.KW_ALIAS, 0);
};

AliasContext.prototype.SEQUENCE = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(FSHParser.SEQUENCE);
    } else {
        return this.getToken(FSHParser.SEQUENCE, i);
    }
};


AliasContext.prototype.EQUAL = function() {
    return this.getToken(FSHParser.EQUAL, 0);
};

AliasContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterAlias(this);
	}
};

AliasContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitAlias(this);
	}
};

AliasContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitAlias(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.AliasContext = AliasContext;

FSHParser.prototype.alias = function() {

    var localctx = new AliasContext(this, this._ctx, this.state);
    this.enterRule(localctx, 4, FSHParser.RULE_alias);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 129;
        this.match(FSHParser.KW_ALIAS);
        this.state = 130;
        this.match(FSHParser.SEQUENCE);
        this.state = 131;
        this.match(FSHParser.EQUAL);
        this.state = 132;
        this.match(FSHParser.SEQUENCE);
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
};


function ProfileContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_profile;
    return this;
}

ProfileContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ProfileContext.prototype.constructor = ProfileContext;

ProfileContext.prototype.KW_PROFILE = function() {
    return this.getToken(FSHParser.KW_PROFILE, 0);
};

ProfileContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

ProfileContext.prototype.sdMetadata = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(SdMetadataContext);
    } else {
        return this.getTypedRuleContext(SdMetadataContext,i);
    }
};

ProfileContext.prototype.sdRule = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(SdRuleContext);
    } else {
        return this.getTypedRuleContext(SdRuleContext,i);
    }
};

ProfileContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterProfile(this);
	}
};

ProfileContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitProfile(this);
	}
};

ProfileContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitProfile(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ProfileContext = ProfileContext;

FSHParser.prototype.profile = function() {

    var localctx = new ProfileContext(this, this._ctx, this.state);
    this.enterRule(localctx, 6, FSHParser.RULE_profile);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 134;
        this.match(FSHParser.KW_PROFILE);
        this.state = 135;
        this.match(FSHParser.SEQUENCE);
        this.state = 137; 
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        do {
            this.state = 136;
            this.sdMetadata();
            this.state = 139; 
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        } while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_PARENT) | (1 << FSHParser.KW_ID) | (1 << FSHParser.KW_TITLE) | (1 << FSHParser.KW_DESCRIPTION))) !== 0));
        this.state = 144;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.STAR) {
            this.state = 141;
            this.sdRule();
            this.state = 146;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function ExtensionContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_extension;
    return this;
}

ExtensionContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ExtensionContext.prototype.constructor = ExtensionContext;

ExtensionContext.prototype.KW_EXTENSION = function() {
    return this.getToken(FSHParser.KW_EXTENSION, 0);
};

ExtensionContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

ExtensionContext.prototype.sdMetadata = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(SdMetadataContext);
    } else {
        return this.getTypedRuleContext(SdMetadataContext,i);
    }
};

ExtensionContext.prototype.sdRule = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(SdRuleContext);
    } else {
        return this.getTypedRuleContext(SdRuleContext,i);
    }
};

ExtensionContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterExtension(this);
	}
};

ExtensionContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitExtension(this);
	}
};

ExtensionContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitExtension(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ExtensionContext = ExtensionContext;

FSHParser.prototype.extension = function() {

    var localctx = new ExtensionContext(this, this._ctx, this.state);
    this.enterRule(localctx, 8, FSHParser.RULE_extension);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 147;
        this.match(FSHParser.KW_EXTENSION);
        this.state = 148;
        this.match(FSHParser.SEQUENCE);
        this.state = 152;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_PARENT) | (1 << FSHParser.KW_ID) | (1 << FSHParser.KW_TITLE) | (1 << FSHParser.KW_DESCRIPTION))) !== 0)) {
            this.state = 149;
            this.sdMetadata();
            this.state = 154;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 158;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.STAR) {
            this.state = 155;
            this.sdRule();
            this.state = 160;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function SdMetadataContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_sdMetadata;
    return this;
}

SdMetadataContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
SdMetadataContext.prototype.constructor = SdMetadataContext;

SdMetadataContext.prototype.parent = function() {
    return this.getTypedRuleContext(ParentContext,0);
};

SdMetadataContext.prototype.id = function() {
    return this.getTypedRuleContext(IdContext,0);
};

SdMetadataContext.prototype.title = function() {
    return this.getTypedRuleContext(TitleContext,0);
};

SdMetadataContext.prototype.description = function() {
    return this.getTypedRuleContext(DescriptionContext,0);
};

SdMetadataContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterSdMetadata(this);
	}
};

SdMetadataContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitSdMetadata(this);
	}
};

SdMetadataContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitSdMetadata(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.SdMetadataContext = SdMetadataContext;

FSHParser.prototype.sdMetadata = function() {

    var localctx = new SdMetadataContext(this, this._ctx, this.state);
    this.enterRule(localctx, 10, FSHParser.RULE_sdMetadata);
    try {
        this.state = 165;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_PARENT:
            this.enterOuterAlt(localctx, 1);
            this.state = 161;
            this.parent();
            break;
        case FSHParser.KW_ID:
            this.enterOuterAlt(localctx, 2);
            this.state = 162;
            this.id();
            break;
        case FSHParser.KW_TITLE:
            this.enterOuterAlt(localctx, 3);
            this.state = 163;
            this.title();
            break;
        case FSHParser.KW_DESCRIPTION:
            this.enterOuterAlt(localctx, 4);
            this.state = 164;
            this.description();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function SdRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_sdRule;
    return this;
}

SdRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
SdRuleContext.prototype.constructor = SdRuleContext;

SdRuleContext.prototype.cardRule = function() {
    return this.getTypedRuleContext(CardRuleContext,0);
};

SdRuleContext.prototype.flagRule = function() {
    return this.getTypedRuleContext(FlagRuleContext,0);
};

SdRuleContext.prototype.valueSetRule = function() {
    return this.getTypedRuleContext(ValueSetRuleContext,0);
};

SdRuleContext.prototype.fixedValueRule = function() {
    return this.getTypedRuleContext(FixedValueRuleContext,0);
};

SdRuleContext.prototype.containsRule = function() {
    return this.getTypedRuleContext(ContainsRuleContext,0);
};

SdRuleContext.prototype.onlyRule = function() {
    return this.getTypedRuleContext(OnlyRuleContext,0);
};

SdRuleContext.prototype.obeysRule = function() {
    return this.getTypedRuleContext(ObeysRuleContext,0);
};

SdRuleContext.prototype.caretValueRule = function() {
    return this.getTypedRuleContext(CaretValueRuleContext,0);
};

SdRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterSdRule(this);
	}
};

SdRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitSdRule(this);
	}
};

SdRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitSdRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.SdRuleContext = SdRuleContext;

FSHParser.prototype.sdRule = function() {

    var localctx = new SdRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 12, FSHParser.RULE_sdRule);
    try {
        this.state = 175;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,7,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 167;
            this.cardRule();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 168;
            this.flagRule();
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 169;
            this.valueSetRule();
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 170;
            this.fixedValueRule();
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 171;
            this.containsRule();
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 172;
            this.onlyRule();
            break;

        case 7:
            this.enterOuterAlt(localctx, 7);
            this.state = 173;
            this.obeysRule();
            break;

        case 8:
            this.enterOuterAlt(localctx, 8);
            this.state = 174;
            this.caretValueRule();
            break;

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
};


function InstanceContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_instance;
    return this;
}

InstanceContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
InstanceContext.prototype.constructor = InstanceContext;

InstanceContext.prototype.KW_INSTANCE = function() {
    return this.getToken(FSHParser.KW_INSTANCE, 0);
};

InstanceContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

InstanceContext.prototype.instanceMetadata = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(InstanceMetadataContext);
    } else {
        return this.getTypedRuleContext(InstanceMetadataContext,i);
    }
};

InstanceContext.prototype.fixedValueRule = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(FixedValueRuleContext);
    } else {
        return this.getTypedRuleContext(FixedValueRuleContext,i);
    }
};

InstanceContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterInstance(this);
	}
};

InstanceContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitInstance(this);
	}
};

InstanceContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitInstance(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.InstanceContext = InstanceContext;

FSHParser.prototype.instance = function() {

    var localctx = new InstanceContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, FSHParser.RULE_instance);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 177;
        this.match(FSHParser.KW_INSTANCE);
        this.state = 178;
        this.match(FSHParser.SEQUENCE);
        this.state = 182;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.KW_INSTANCEOF || _la===FSHParser.KW_TITLE) {
            this.state = 179;
            this.instanceMetadata();
            this.state = 184;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 188;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.STAR) {
            this.state = 185;
            this.fixedValueRule();
            this.state = 190;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function InstanceMetadataContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_instanceMetadata;
    return this;
}

InstanceMetadataContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
InstanceMetadataContext.prototype.constructor = InstanceMetadataContext;

InstanceMetadataContext.prototype.instanceOf = function() {
    return this.getTypedRuleContext(InstanceOfContext,0);
};

InstanceMetadataContext.prototype.title = function() {
    return this.getTypedRuleContext(TitleContext,0);
};

InstanceMetadataContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterInstanceMetadata(this);
	}
};

InstanceMetadataContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitInstanceMetadata(this);
	}
};

InstanceMetadataContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitInstanceMetadata(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.InstanceMetadataContext = InstanceMetadataContext;

FSHParser.prototype.instanceMetadata = function() {

    var localctx = new InstanceMetadataContext(this, this._ctx, this.state);
    this.enterRule(localctx, 16, FSHParser.RULE_instanceMetadata);
    try {
        this.state = 193;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_INSTANCEOF:
            this.enterOuterAlt(localctx, 1);
            this.state = 191;
            this.instanceOf();
            break;
        case FSHParser.KW_TITLE:
            this.enterOuterAlt(localctx, 2);
            this.state = 192;
            this.title();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function InvariantContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_invariant;
    return this;
}

InvariantContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
InvariantContext.prototype.constructor = InvariantContext;

InvariantContext.prototype.KW_INVARIANT = function() {
    return this.getToken(FSHParser.KW_INVARIANT, 0);
};

InvariantContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

InvariantContext.prototype.invariantMetadata = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(InvariantMetadataContext);
    } else {
        return this.getTypedRuleContext(InvariantMetadataContext,i);
    }
};

InvariantContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterInvariant(this);
	}
};

InvariantContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitInvariant(this);
	}
};

InvariantContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitInvariant(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.InvariantContext = InvariantContext;

FSHParser.prototype.invariant = function() {

    var localctx = new InvariantContext(this, this._ctx, this.state);
    this.enterRule(localctx, 18, FSHParser.RULE_invariant);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 195;
        this.match(FSHParser.KW_INVARIANT);
        this.state = 196;
        this.match(FSHParser.SEQUENCE);
        this.state = 198; 
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        do {
            this.state = 197;
            this.invariantMetadata();
            this.state = 200; 
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        } while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_DESCRIPTION) | (1 << FSHParser.KW_EXPRESSION) | (1 << FSHParser.KW_XPATH) | (1 << FSHParser.KW_SEVERITY))) !== 0));
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
};


function InvariantMetadataContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_invariantMetadata;
    return this;
}

InvariantMetadataContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
InvariantMetadataContext.prototype.constructor = InvariantMetadataContext;

InvariantMetadataContext.prototype.description = function() {
    return this.getTypedRuleContext(DescriptionContext,0);
};

InvariantMetadataContext.prototype.expression = function() {
    return this.getTypedRuleContext(ExpressionContext,0);
};

InvariantMetadataContext.prototype.xpath = function() {
    return this.getTypedRuleContext(XpathContext,0);
};

InvariantMetadataContext.prototype.severity = function() {
    return this.getTypedRuleContext(SeverityContext,0);
};

InvariantMetadataContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterInvariantMetadata(this);
	}
};

InvariantMetadataContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitInvariantMetadata(this);
	}
};

InvariantMetadataContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitInvariantMetadata(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.InvariantMetadataContext = InvariantMetadataContext;

FSHParser.prototype.invariantMetadata = function() {

    var localctx = new InvariantMetadataContext(this, this._ctx, this.state);
    this.enterRule(localctx, 20, FSHParser.RULE_invariantMetadata);
    try {
        this.state = 206;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_DESCRIPTION:
            this.enterOuterAlt(localctx, 1);
            this.state = 202;
            this.description();
            break;
        case FSHParser.KW_EXPRESSION:
            this.enterOuterAlt(localctx, 2);
            this.state = 203;
            this.expression();
            break;
        case FSHParser.KW_XPATH:
            this.enterOuterAlt(localctx, 3);
            this.state = 204;
            this.xpath();
            break;
        case FSHParser.KW_SEVERITY:
            this.enterOuterAlt(localctx, 4);
            this.state = 205;
            this.severity();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function ValueSetContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_valueSet;
    return this;
}

ValueSetContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ValueSetContext.prototype.constructor = ValueSetContext;

ValueSetContext.prototype.KW_VALUESET = function() {
    return this.getToken(FSHParser.KW_VALUESET, 0);
};

ValueSetContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

ValueSetContext.prototype.vsMetadata = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(VsMetadataContext);
    } else {
        return this.getTypedRuleContext(VsMetadataContext,i);
    }
};

ValueSetContext.prototype.caretValueRule = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(CaretValueRuleContext);
    } else {
        return this.getTypedRuleContext(CaretValueRuleContext,i);
    }
};

ValueSetContext.prototype.vsComponent = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(VsComponentContext);
    } else {
        return this.getTypedRuleContext(VsComponentContext,i);
    }
};

ValueSetContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterValueSet(this);
	}
};

ValueSetContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitValueSet(this);
	}
};

ValueSetContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitValueSet(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ValueSetContext = ValueSetContext;

FSHParser.prototype.valueSet = function() {

    var localctx = new ValueSetContext(this, this._ctx, this.state);
    this.enterRule(localctx, 22, FSHParser.RULE_valueSet);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 208;
        this.match(FSHParser.KW_VALUESET);
        this.state = 209;
        this.match(FSHParser.SEQUENCE);
        this.state = 213;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_ID) | (1 << FSHParser.KW_TITLE) | (1 << FSHParser.KW_DESCRIPTION))) !== 0)) {
            this.state = 210;
            this.vsMetadata();
            this.state = 215;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 220;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.STAR) {
            this.state = 218;
            this._errHandler.sync(this);
            var la_ = this._interp.adaptivePredict(this._input,14,this._ctx);
            switch(la_) {
            case 1:
                this.state = 216;
                this.caretValueRule();
                break;

            case 2:
                this.state = 217;
                this.vsComponent();
                break;

            }
            this.state = 222;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function VsMetadataContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsMetadata;
    return this;
}

VsMetadataContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsMetadataContext.prototype.constructor = VsMetadataContext;

VsMetadataContext.prototype.id = function() {
    return this.getTypedRuleContext(IdContext,0);
};

VsMetadataContext.prototype.title = function() {
    return this.getTypedRuleContext(TitleContext,0);
};

VsMetadataContext.prototype.description = function() {
    return this.getTypedRuleContext(DescriptionContext,0);
};

VsMetadataContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsMetadata(this);
	}
};

VsMetadataContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsMetadata(this);
	}
};

VsMetadataContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsMetadata(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsMetadataContext = VsMetadataContext;

FSHParser.prototype.vsMetadata = function() {

    var localctx = new VsMetadataContext(this, this._ctx, this.state);
    this.enterRule(localctx, 24, FSHParser.RULE_vsMetadata);
    try {
        this.state = 226;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_ID:
            this.enterOuterAlt(localctx, 1);
            this.state = 223;
            this.id();
            break;
        case FSHParser.KW_TITLE:
            this.enterOuterAlt(localctx, 2);
            this.state = 224;
            this.title();
            break;
        case FSHParser.KW_DESCRIPTION:
            this.enterOuterAlt(localctx, 3);
            this.state = 225;
            this.description();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function CodeSystemContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_codeSystem;
    return this;
}

CodeSystemContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
CodeSystemContext.prototype.constructor = CodeSystemContext;

CodeSystemContext.prototype.KW_CODESYSTEM = function() {
    return this.getToken(FSHParser.KW_CODESYSTEM, 0);
};

CodeSystemContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

CodeSystemContext.prototype.csMetadata = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(CsMetadataContext);
    } else {
        return this.getTypedRuleContext(CsMetadataContext,i);
    }
};

CodeSystemContext.prototype.concept = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(ConceptContext);
    } else {
        return this.getTypedRuleContext(ConceptContext,i);
    }
};

CodeSystemContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterCodeSystem(this);
	}
};

CodeSystemContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitCodeSystem(this);
	}
};

CodeSystemContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitCodeSystem(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.CodeSystemContext = CodeSystemContext;

FSHParser.prototype.codeSystem = function() {

    var localctx = new CodeSystemContext(this, this._ctx, this.state);
    this.enterRule(localctx, 26, FSHParser.RULE_codeSystem);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 228;
        this.match(FSHParser.KW_CODESYSTEM);
        this.state = 229;
        this.match(FSHParser.SEQUENCE);
        this.state = 233;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_ID) | (1 << FSHParser.KW_TITLE) | (1 << FSHParser.KW_DESCRIPTION))) !== 0)) {
            this.state = 230;
            this.csMetadata();
            this.state = 235;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 239;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.STAR) {
            this.state = 236;
            this.concept();
            this.state = 241;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function CsMetadataContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_csMetadata;
    return this;
}

CsMetadataContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
CsMetadataContext.prototype.constructor = CsMetadataContext;

CsMetadataContext.prototype.id = function() {
    return this.getTypedRuleContext(IdContext,0);
};

CsMetadataContext.prototype.title = function() {
    return this.getTypedRuleContext(TitleContext,0);
};

CsMetadataContext.prototype.description = function() {
    return this.getTypedRuleContext(DescriptionContext,0);
};

CsMetadataContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterCsMetadata(this);
	}
};

CsMetadataContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitCsMetadata(this);
	}
};

CsMetadataContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitCsMetadata(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.CsMetadataContext = CsMetadataContext;

FSHParser.prototype.csMetadata = function() {

    var localctx = new CsMetadataContext(this, this._ctx, this.state);
    this.enterRule(localctx, 28, FSHParser.RULE_csMetadata);
    try {
        this.state = 245;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_ID:
            this.enterOuterAlt(localctx, 1);
            this.state = 242;
            this.id();
            break;
        case FSHParser.KW_TITLE:
            this.enterOuterAlt(localctx, 2);
            this.state = 243;
            this.title();
            break;
        case FSHParser.KW_DESCRIPTION:
            this.enterOuterAlt(localctx, 3);
            this.state = 244;
            this.description();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function ParentContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_parent;
    return this;
}

ParentContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ParentContext.prototype.constructor = ParentContext;

ParentContext.prototype.KW_PARENT = function() {
    return this.getToken(FSHParser.KW_PARENT, 0);
};

ParentContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

ParentContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterParent(this);
	}
};

ParentContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitParent(this);
	}
};

ParentContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitParent(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ParentContext = ParentContext;

FSHParser.prototype.parent = function() {

    var localctx = new ParentContext(this, this._ctx, this.state);
    this.enterRule(localctx, 30, FSHParser.RULE_parent);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 247;
        this.match(FSHParser.KW_PARENT);
        this.state = 248;
        this.match(FSHParser.SEQUENCE);
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
};


function IdContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_id;
    return this;
}

IdContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
IdContext.prototype.constructor = IdContext;

IdContext.prototype.KW_ID = function() {
    return this.getToken(FSHParser.KW_ID, 0);
};

IdContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

IdContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterId(this);
	}
};

IdContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitId(this);
	}
};

IdContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitId(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.IdContext = IdContext;

FSHParser.prototype.id = function() {

    var localctx = new IdContext(this, this._ctx, this.state);
    this.enterRule(localctx, 32, FSHParser.RULE_id);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 250;
        this.match(FSHParser.KW_ID);
        this.state = 251;
        this.match(FSHParser.SEQUENCE);
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
};


function TitleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_title;
    return this;
}

TitleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
TitleContext.prototype.constructor = TitleContext;

TitleContext.prototype.KW_TITLE = function() {
    return this.getToken(FSHParser.KW_TITLE, 0);
};

TitleContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

TitleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterTitle(this);
	}
};

TitleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitTitle(this);
	}
};

TitleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitTitle(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.TitleContext = TitleContext;

FSHParser.prototype.title = function() {

    var localctx = new TitleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 34, FSHParser.RULE_title);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 253;
        this.match(FSHParser.KW_TITLE);
        this.state = 254;
        this.match(FSHParser.STRING);
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
};


function DescriptionContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_description;
    return this;
}

DescriptionContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
DescriptionContext.prototype.constructor = DescriptionContext;

DescriptionContext.prototype.KW_DESCRIPTION = function() {
    return this.getToken(FSHParser.KW_DESCRIPTION, 0);
};

DescriptionContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

DescriptionContext.prototype.MULTILINE_STRING = function() {
    return this.getToken(FSHParser.MULTILINE_STRING, 0);
};

DescriptionContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterDescription(this);
	}
};

DescriptionContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitDescription(this);
	}
};

DescriptionContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitDescription(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.DescriptionContext = DescriptionContext;

FSHParser.prototype.description = function() {

    var localctx = new DescriptionContext(this, this._ctx, this.state);
    this.enterRule(localctx, 36, FSHParser.RULE_description);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 256;
        this.match(FSHParser.KW_DESCRIPTION);
        this.state = 257;
        _la = this._input.LA(1);
        if(!(_la===FSHParser.STRING || _la===FSHParser.MULTILINE_STRING)) {
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
};


function ExpressionContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_expression;
    return this;
}

ExpressionContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ExpressionContext.prototype.constructor = ExpressionContext;

ExpressionContext.prototype.KW_EXPRESSION = function() {
    return this.getToken(FSHParser.KW_EXPRESSION, 0);
};

ExpressionContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

ExpressionContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterExpression(this);
	}
};

ExpressionContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitExpression(this);
	}
};

ExpressionContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitExpression(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ExpressionContext = ExpressionContext;

FSHParser.prototype.expression = function() {

    var localctx = new ExpressionContext(this, this._ctx, this.state);
    this.enterRule(localctx, 38, FSHParser.RULE_expression);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 259;
        this.match(FSHParser.KW_EXPRESSION);
        this.state = 260;
        this.match(FSHParser.STRING);
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
};


function XpathContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_xpath;
    return this;
}

XpathContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
XpathContext.prototype.constructor = XpathContext;

XpathContext.prototype.KW_XPATH = function() {
    return this.getToken(FSHParser.KW_XPATH, 0);
};

XpathContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

XpathContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterXpath(this);
	}
};

XpathContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitXpath(this);
	}
};

XpathContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitXpath(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.XpathContext = XpathContext;

FSHParser.prototype.xpath = function() {

    var localctx = new XpathContext(this, this._ctx, this.state);
    this.enterRule(localctx, 40, FSHParser.RULE_xpath);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 262;
        this.match(FSHParser.KW_XPATH);
        this.state = 263;
        this.match(FSHParser.STRING);
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
};


function SeverityContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_severity;
    return this;
}

SeverityContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
SeverityContext.prototype.constructor = SeverityContext;

SeverityContext.prototype.KW_SEVERITY = function() {
    return this.getToken(FSHParser.KW_SEVERITY, 0);
};

SeverityContext.prototype.CODE = function() {
    return this.getToken(FSHParser.CODE, 0);
};

SeverityContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterSeverity(this);
	}
};

SeverityContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitSeverity(this);
	}
};

SeverityContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitSeverity(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.SeverityContext = SeverityContext;

FSHParser.prototype.severity = function() {

    var localctx = new SeverityContext(this, this._ctx, this.state);
    this.enterRule(localctx, 42, FSHParser.RULE_severity);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 265;
        this.match(FSHParser.KW_SEVERITY);
        this.state = 266;
        this.match(FSHParser.CODE);
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
};


function InstanceOfContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_instanceOf;
    return this;
}

InstanceOfContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
InstanceOfContext.prototype.constructor = InstanceOfContext;

InstanceOfContext.prototype.KW_INSTANCEOF = function() {
    return this.getToken(FSHParser.KW_INSTANCEOF, 0);
};

InstanceOfContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

InstanceOfContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterInstanceOf(this);
	}
};

InstanceOfContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitInstanceOf(this);
	}
};

InstanceOfContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitInstanceOf(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.InstanceOfContext = InstanceOfContext;

FSHParser.prototype.instanceOf = function() {

    var localctx = new InstanceOfContext(this, this._ctx, this.state);
    this.enterRule(localctx, 44, FSHParser.RULE_instanceOf);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 268;
        this.match(FSHParser.KW_INSTANCEOF);
        this.state = 269;
        this.match(FSHParser.SEQUENCE);
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
};


function CardRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_cardRule;
    return this;
}

CardRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
CardRuleContext.prototype.constructor = CardRuleContext;

CardRuleContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

CardRuleContext.prototype.path = function() {
    return this.getTypedRuleContext(PathContext,0);
};

CardRuleContext.prototype.CARD = function() {
    return this.getToken(FSHParser.CARD, 0);
};

CardRuleContext.prototype.flag = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(FlagContext);
    } else {
        return this.getTypedRuleContext(FlagContext,i);
    }
};

CardRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterCardRule(this);
	}
};

CardRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitCardRule(this);
	}
};

CardRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitCardRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.CardRuleContext = CardRuleContext;

FSHParser.prototype.cardRule = function() {

    var localctx = new CardRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 46, FSHParser.RULE_cardRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 271;
        this.match(FSHParser.STAR);
        this.state = 272;
        this.path();
        this.state = 273;
        this.match(FSHParser.CARD);
        this.state = 277;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_MOD) | (1 << FSHParser.KW_MS) | (1 << FSHParser.KW_SU))) !== 0)) {
            this.state = 274;
            this.flag();
            this.state = 279;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function FlagRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_flagRule;
    return this;
}

FlagRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FlagRuleContext.prototype.constructor = FlagRuleContext;

FlagRuleContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

FlagRuleContext.prototype.path = function() {
    return this.getTypedRuleContext(PathContext,0);
};

FlagRuleContext.prototype.paths = function() {
    return this.getTypedRuleContext(PathsContext,0);
};

FlagRuleContext.prototype.flag = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(FlagContext);
    } else {
        return this.getTypedRuleContext(FlagContext,i);
    }
};

FlagRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterFlagRule(this);
	}
};

FlagRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitFlagRule(this);
	}
};

FlagRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitFlagRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.FlagRuleContext = FlagRuleContext;

FSHParser.prototype.flagRule = function() {

    var localctx = new FlagRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 48, FSHParser.RULE_flagRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 280;
        this.match(FSHParser.STAR);
        this.state = 283;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.SEQUENCE:
            this.state = 281;
            this.path();
            break;
        case FSHParser.COMMA_DELIMITED_SEQUENCES:
            this.state = 282;
            this.paths();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
        }
        this.state = 286; 
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        do {
            this.state = 285;
            this.flag();
            this.state = 288; 
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        } while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_MOD) | (1 << FSHParser.KW_MS) | (1 << FSHParser.KW_SU))) !== 0));
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
};


function ValueSetRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_valueSetRule;
    return this;
}

ValueSetRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ValueSetRuleContext.prototype.constructor = ValueSetRuleContext;

ValueSetRuleContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

ValueSetRuleContext.prototype.path = function() {
    return this.getTypedRuleContext(PathContext,0);
};

ValueSetRuleContext.prototype.KW_FROM = function() {
    return this.getToken(FSHParser.KW_FROM, 0);
};

ValueSetRuleContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

ValueSetRuleContext.prototype.strength = function() {
    return this.getTypedRuleContext(StrengthContext,0);
};

ValueSetRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterValueSetRule(this);
	}
};

ValueSetRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitValueSetRule(this);
	}
};

ValueSetRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitValueSetRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ValueSetRuleContext = ValueSetRuleContext;

FSHParser.prototype.valueSetRule = function() {

    var localctx = new ValueSetRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 50, FSHParser.RULE_valueSetRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 290;
        this.match(FSHParser.STAR);
        this.state = 291;
        this.path();
        this.state = 292;
        this.match(FSHParser.KW_FROM);
        this.state = 293;
        this.match(FSHParser.SEQUENCE);
        this.state = 295;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_EXAMPLE) | (1 << FSHParser.KW_PREFERRED) | (1 << FSHParser.KW_EXTENSIBLE) | (1 << FSHParser.KW_REQUIRED))) !== 0)) {
            this.state = 294;
            this.strength();
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
};


function FixedValueRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_fixedValueRule;
    return this;
}

FixedValueRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FixedValueRuleContext.prototype.constructor = FixedValueRuleContext;

FixedValueRuleContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

FixedValueRuleContext.prototype.path = function() {
    return this.getTypedRuleContext(PathContext,0);
};

FixedValueRuleContext.prototype.EQUAL = function() {
    return this.getToken(FSHParser.EQUAL, 0);
};

FixedValueRuleContext.prototype.value = function() {
    return this.getTypedRuleContext(ValueContext,0);
};

FixedValueRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterFixedValueRule(this);
	}
};

FixedValueRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitFixedValueRule(this);
	}
};

FixedValueRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitFixedValueRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.FixedValueRuleContext = FixedValueRuleContext;

FSHParser.prototype.fixedValueRule = function() {

    var localctx = new FixedValueRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 52, FSHParser.RULE_fixedValueRule);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 297;
        this.match(FSHParser.STAR);
        this.state = 298;
        this.path();
        this.state = 299;
        this.match(FSHParser.EQUAL);
        this.state = 300;
        this.value();
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
};


function ContainsRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_containsRule;
    return this;
}

ContainsRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ContainsRuleContext.prototype.constructor = ContainsRuleContext;

ContainsRuleContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

ContainsRuleContext.prototype.path = function() {
    return this.getTypedRuleContext(PathContext,0);
};

ContainsRuleContext.prototype.KW_CONTAINS = function() {
    return this.getToken(FSHParser.KW_CONTAINS, 0);
};

ContainsRuleContext.prototype.item = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(ItemContext);
    } else {
        return this.getTypedRuleContext(ItemContext,i);
    }
};

ContainsRuleContext.prototype.KW_AND = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(FSHParser.KW_AND);
    } else {
        return this.getToken(FSHParser.KW_AND, i);
    }
};


ContainsRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterContainsRule(this);
	}
};

ContainsRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitContainsRule(this);
	}
};

ContainsRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitContainsRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ContainsRuleContext = ContainsRuleContext;

FSHParser.prototype.containsRule = function() {

    var localctx = new ContainsRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 54, FSHParser.RULE_containsRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 302;
        this.match(FSHParser.STAR);
        this.state = 303;
        this.path();
        this.state = 304;
        this.match(FSHParser.KW_CONTAINS);
        this.state = 305;
        this.item();
        this.state = 310;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.KW_AND) {
            this.state = 306;
            this.match(FSHParser.KW_AND);
            this.state = 307;
            this.item();
            this.state = 312;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function OnlyRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_onlyRule;
    return this;
}

OnlyRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
OnlyRuleContext.prototype.constructor = OnlyRuleContext;

OnlyRuleContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

OnlyRuleContext.prototype.path = function() {
    return this.getTypedRuleContext(PathContext,0);
};

OnlyRuleContext.prototype.KW_ONLY = function() {
    return this.getToken(FSHParser.KW_ONLY, 0);
};

OnlyRuleContext.prototype.targetType = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(TargetTypeContext);
    } else {
        return this.getTypedRuleContext(TargetTypeContext,i);
    }
};

OnlyRuleContext.prototype.KW_OR = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(FSHParser.KW_OR);
    } else {
        return this.getToken(FSHParser.KW_OR, i);
    }
};


OnlyRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterOnlyRule(this);
	}
};

OnlyRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitOnlyRule(this);
	}
};

OnlyRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitOnlyRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.OnlyRuleContext = OnlyRuleContext;

FSHParser.prototype.onlyRule = function() {

    var localctx = new OnlyRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 56, FSHParser.RULE_onlyRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 313;
        this.match(FSHParser.STAR);
        this.state = 314;
        this.path();
        this.state = 315;
        this.match(FSHParser.KW_ONLY);
        this.state = 316;
        this.targetType();
        this.state = 321;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.KW_OR) {
            this.state = 317;
            this.match(FSHParser.KW_OR);
            this.state = 318;
            this.targetType();
            this.state = 323;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function ObeysRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_obeysRule;
    return this;
}

ObeysRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ObeysRuleContext.prototype.constructor = ObeysRuleContext;

ObeysRuleContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

ObeysRuleContext.prototype.KW_OBEYS = function() {
    return this.getToken(FSHParser.KW_OBEYS, 0);
};

ObeysRuleContext.prototype.SEQUENCE = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(FSHParser.SEQUENCE);
    } else {
        return this.getToken(FSHParser.SEQUENCE, i);
    }
};


ObeysRuleContext.prototype.path = function() {
    return this.getTypedRuleContext(PathContext,0);
};

ObeysRuleContext.prototype.KW_AND = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(FSHParser.KW_AND);
    } else {
        return this.getToken(FSHParser.KW_AND, i);
    }
};


ObeysRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterObeysRule(this);
	}
};

ObeysRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitObeysRule(this);
	}
};

ObeysRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitObeysRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ObeysRuleContext = ObeysRuleContext;

FSHParser.prototype.obeysRule = function() {

    var localctx = new ObeysRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 58, FSHParser.RULE_obeysRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 324;
        this.match(FSHParser.STAR);
        this.state = 326;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.SEQUENCE) {
            this.state = 325;
            this.path();
        }

        this.state = 328;
        this.match(FSHParser.KW_OBEYS);
        this.state = 329;
        this.match(FSHParser.SEQUENCE);
        this.state = 334;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.KW_AND) {
            this.state = 330;
            this.match(FSHParser.KW_AND);
            this.state = 331;
            this.match(FSHParser.SEQUENCE);
            this.state = 336;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function CaretValueRuleContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_caretValueRule;
    return this;
}

CaretValueRuleContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
CaretValueRuleContext.prototype.constructor = CaretValueRuleContext;

CaretValueRuleContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

CaretValueRuleContext.prototype.caretPath = function() {
    return this.getTypedRuleContext(CaretPathContext,0);
};

CaretValueRuleContext.prototype.EQUAL = function() {
    return this.getToken(FSHParser.EQUAL, 0);
};

CaretValueRuleContext.prototype.value = function() {
    return this.getTypedRuleContext(ValueContext,0);
};

CaretValueRuleContext.prototype.path = function() {
    return this.getTypedRuleContext(PathContext,0);
};

CaretValueRuleContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterCaretValueRule(this);
	}
};

CaretValueRuleContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitCaretValueRule(this);
	}
};

CaretValueRuleContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitCaretValueRule(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.CaretValueRuleContext = CaretValueRuleContext;

FSHParser.prototype.caretValueRule = function() {

    var localctx = new CaretValueRuleContext(this, this._ctx, this.state);
    this.enterRule(localctx, 60, FSHParser.RULE_caretValueRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 337;
        this.match(FSHParser.STAR);
        this.state = 339;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.SEQUENCE) {
            this.state = 338;
            this.path();
        }

        this.state = 341;
        this.caretPath();
        this.state = 342;
        this.match(FSHParser.EQUAL);
        this.state = 343;
        this.value();
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
};


function VsComponentContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsComponent;
    return this;
}

VsComponentContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsComponentContext.prototype.constructor = VsComponentContext;

VsComponentContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

VsComponentContext.prototype.vsConceptComponent = function() {
    return this.getTypedRuleContext(VsConceptComponentContext,0);
};

VsComponentContext.prototype.vsFilterComponent = function() {
    return this.getTypedRuleContext(VsFilterComponentContext,0);
};

VsComponentContext.prototype.KW_EXCLUDE = function() {
    return this.getToken(FSHParser.KW_EXCLUDE, 0);
};

VsComponentContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsComponent(this);
	}
};

VsComponentContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsComponent(this);
	}
};

VsComponentContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsComponent(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsComponentContext = VsComponentContext;

FSHParser.prototype.vsComponent = function() {

    var localctx = new VsComponentContext(this, this._ctx, this.state);
    this.enterRule(localctx, 62, FSHParser.RULE_vsComponent);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 345;
        this.match(FSHParser.STAR);
        this.state = 347;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.KW_EXCLUDE) {
            this.state = 346;
            this.match(FSHParser.KW_EXCLUDE);
        }

        this.state = 351;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.CODE:
        case FSHParser.COMMA_DELIMITED_CODES:
            this.state = 349;
            this.vsConceptComponent();
            break;
        case FSHParser.KW_CODES:
            this.state = 350;
            this.vsFilterComponent();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function VsConceptComponentContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsConceptComponent;
    return this;
}

VsConceptComponentContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsConceptComponentContext.prototype.constructor = VsConceptComponentContext;

VsConceptComponentContext.prototype.code = function() {
    return this.getTypedRuleContext(CodeContext,0);
};

VsConceptComponentContext.prototype.vsComponentFrom = function() {
    return this.getTypedRuleContext(VsComponentFromContext,0);
};

VsConceptComponentContext.prototype.COMMA_DELIMITED_CODES = function() {
    return this.getToken(FSHParser.COMMA_DELIMITED_CODES, 0);
};

VsConceptComponentContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsConceptComponent(this);
	}
};

VsConceptComponentContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsConceptComponent(this);
	}
};

VsConceptComponentContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsConceptComponent(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsConceptComponentContext = VsConceptComponentContext;

FSHParser.prototype.vsConceptComponent = function() {

    var localctx = new VsConceptComponentContext(this, this._ctx, this.state);
    this.enterRule(localctx, 64, FSHParser.RULE_vsConceptComponent);
    var _la = 0; // Token type
    try {
        this.state = 359;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.CODE:
            this.enterOuterAlt(localctx, 1);
            this.state = 353;
            this.code();
            this.state = 355;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            if(_la===FSHParser.KW_FROM) {
                this.state = 354;
                this.vsComponentFrom();
            }

            break;
        case FSHParser.COMMA_DELIMITED_CODES:
            this.enterOuterAlt(localctx, 2);
            this.state = 357;
            this.match(FSHParser.COMMA_DELIMITED_CODES);
            this.state = 358;
            this.vsComponentFrom();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function VsFilterComponentContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsFilterComponent;
    return this;
}

VsFilterComponentContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsFilterComponentContext.prototype.constructor = VsFilterComponentContext;

VsFilterComponentContext.prototype.KW_CODES = function() {
    return this.getToken(FSHParser.KW_CODES, 0);
};

VsFilterComponentContext.prototype.vsComponentFrom = function() {
    return this.getTypedRuleContext(VsComponentFromContext,0);
};

VsFilterComponentContext.prototype.KW_WHERE = function() {
    return this.getToken(FSHParser.KW_WHERE, 0);
};

VsFilterComponentContext.prototype.vsFilterList = function() {
    return this.getTypedRuleContext(VsFilterListContext,0);
};

VsFilterComponentContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsFilterComponent(this);
	}
};

VsFilterComponentContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsFilterComponent(this);
	}
};

VsFilterComponentContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsFilterComponent(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsFilterComponentContext = VsFilterComponentContext;

FSHParser.prototype.vsFilterComponent = function() {

    var localctx = new VsFilterComponentContext(this, this._ctx, this.state);
    this.enterRule(localctx, 66, FSHParser.RULE_vsFilterComponent);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 361;
        this.match(FSHParser.KW_CODES);
        this.state = 362;
        this.vsComponentFrom();
        this.state = 365;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.KW_WHERE) {
            this.state = 363;
            this.match(FSHParser.KW_WHERE);
            this.state = 364;
            this.vsFilterList();
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
};


function VsComponentFromContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsComponentFrom;
    return this;
}

VsComponentFromContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsComponentFromContext.prototype.constructor = VsComponentFromContext;

VsComponentFromContext.prototype.KW_FROM = function() {
    return this.getToken(FSHParser.KW_FROM, 0);
};

VsComponentFromContext.prototype.vsFromSystem = function() {
    return this.getTypedRuleContext(VsFromSystemContext,0);
};

VsComponentFromContext.prototype.vsFromValueset = function() {
    return this.getTypedRuleContext(VsFromValuesetContext,0);
};

VsComponentFromContext.prototype.KW_AND = function() {
    return this.getToken(FSHParser.KW_AND, 0);
};

VsComponentFromContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsComponentFrom(this);
	}
};

VsComponentFromContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsComponentFrom(this);
	}
};

VsComponentFromContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsComponentFrom(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsComponentFromContext = VsComponentFromContext;

FSHParser.prototype.vsComponentFrom = function() {

    var localctx = new VsComponentFromContext(this, this._ctx, this.state);
    this.enterRule(localctx, 68, FSHParser.RULE_vsComponentFrom);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 367;
        this.match(FSHParser.KW_FROM);
        this.state = 378;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_SYSTEM:
            this.state = 368;
            this.vsFromSystem();
            this.state = 371;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            if(_la===FSHParser.KW_AND) {
                this.state = 369;
                this.match(FSHParser.KW_AND);
                this.state = 370;
                this.vsFromValueset();
            }

            break;
        case FSHParser.KW_VSREFERENCE:
            this.state = 373;
            this.vsFromValueset();
            this.state = 376;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            if(_la===FSHParser.KW_AND) {
                this.state = 374;
                this.match(FSHParser.KW_AND);
                this.state = 375;
                this.vsFromSystem();
            }

            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function VsFromSystemContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsFromSystem;
    return this;
}

VsFromSystemContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsFromSystemContext.prototype.constructor = VsFromSystemContext;

VsFromSystemContext.prototype.KW_SYSTEM = function() {
    return this.getToken(FSHParser.KW_SYSTEM, 0);
};

VsFromSystemContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

VsFromSystemContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsFromSystem(this);
	}
};

VsFromSystemContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsFromSystem(this);
	}
};

VsFromSystemContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsFromSystem(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsFromSystemContext = VsFromSystemContext;

FSHParser.prototype.vsFromSystem = function() {

    var localctx = new VsFromSystemContext(this, this._ctx, this.state);
    this.enterRule(localctx, 70, FSHParser.RULE_vsFromSystem);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 380;
        this.match(FSHParser.KW_SYSTEM);
        this.state = 381;
        this.match(FSHParser.SEQUENCE);
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
};


function VsFromValuesetContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsFromValueset;
    return this;
}

VsFromValuesetContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsFromValuesetContext.prototype.constructor = VsFromValuesetContext;

VsFromValuesetContext.prototype.KW_VSREFERENCE = function() {
    return this.getToken(FSHParser.KW_VSREFERENCE, 0);
};

VsFromValuesetContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

VsFromValuesetContext.prototype.COMMA_DELIMITED_SEQUENCES = function() {
    return this.getToken(FSHParser.COMMA_DELIMITED_SEQUENCES, 0);
};

VsFromValuesetContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsFromValueset(this);
	}
};

VsFromValuesetContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsFromValueset(this);
	}
};

VsFromValuesetContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsFromValueset(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsFromValuesetContext = VsFromValuesetContext;

FSHParser.prototype.vsFromValueset = function() {

    var localctx = new VsFromValuesetContext(this, this._ctx, this.state);
    this.enterRule(localctx, 72, FSHParser.RULE_vsFromValueset);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 383;
        this.match(FSHParser.KW_VSREFERENCE);
        this.state = 384;
        _la = this._input.LA(1);
        if(!(_la===FSHParser.COMMA_DELIMITED_SEQUENCES || _la===FSHParser.SEQUENCE)) {
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
};


function VsFilterListContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsFilterList;
    return this;
}

VsFilterListContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsFilterListContext.prototype.constructor = VsFilterListContext;

VsFilterListContext.prototype.vsFilterDefinition = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(VsFilterDefinitionContext);
    } else {
        return this.getTypedRuleContext(VsFilterDefinitionContext,i);
    }
};

VsFilterListContext.prototype.KW_AND = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(FSHParser.KW_AND);
    } else {
        return this.getToken(FSHParser.KW_AND, i);
    }
};


VsFilterListContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsFilterList(this);
	}
};

VsFilterListContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsFilterList(this);
	}
};

VsFilterListContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsFilterList(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsFilterListContext = VsFilterListContext;

FSHParser.prototype.vsFilterList = function() {

    var localctx = new VsFilterListContext(this, this._ctx, this.state);
    this.enterRule(localctx, 74, FSHParser.RULE_vsFilterList);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 391;
        this._errHandler.sync(this);
        var _alt = this._interp.adaptivePredict(this._input,37,this._ctx)
        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
            if(_alt===1) {
                this.state = 386;
                this.vsFilterDefinition();
                this.state = 387;
                this.match(FSHParser.KW_AND); 
            }
            this.state = 393;
            this._errHandler.sync(this);
            _alt = this._interp.adaptivePredict(this._input,37,this._ctx);
        }

        this.state = 394;
        this.vsFilterDefinition();
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
};


function VsFilterDefinitionContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsFilterDefinition;
    return this;
}

VsFilterDefinitionContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsFilterDefinitionContext.prototype.constructor = VsFilterDefinitionContext;

VsFilterDefinitionContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

VsFilterDefinitionContext.prototype.vsFilterOperator = function() {
    return this.getTypedRuleContext(VsFilterOperatorContext,0);
};

VsFilterDefinitionContext.prototype.vsFilterValue = function() {
    return this.getTypedRuleContext(VsFilterValueContext,0);
};

VsFilterDefinitionContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsFilterDefinition(this);
	}
};

VsFilterDefinitionContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsFilterDefinition(this);
	}
};

VsFilterDefinitionContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsFilterDefinition(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsFilterDefinitionContext = VsFilterDefinitionContext;

FSHParser.prototype.vsFilterDefinition = function() {

    var localctx = new VsFilterDefinitionContext(this, this._ctx, this.state);
    this.enterRule(localctx, 76, FSHParser.RULE_vsFilterDefinition);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 396;
        this.match(FSHParser.SEQUENCE);
        this.state = 397;
        this.vsFilterOperator();
        this.state = 399;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(((((_la - 29)) & ~0x1f) == 0 && ((1 << (_la - 29)) & ((1 << (FSHParser.KW_TRUE - 29)) | (1 << (FSHParser.KW_FALSE - 29)) | (1 << (FSHParser.STRING - 29)) | (1 << (FSHParser.CODE - 29)) | (1 << (FSHParser.REGEX - 29)))) !== 0)) {
            this.state = 398;
            this.vsFilterValue();
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
};


function VsFilterOperatorContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsFilterOperator;
    return this;
}

VsFilterOperatorContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsFilterOperatorContext.prototype.constructor = VsFilterOperatorContext;

VsFilterOperatorContext.prototype.EQUAL = function() {
    return this.getToken(FSHParser.EQUAL, 0);
};

VsFilterOperatorContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

VsFilterOperatorContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsFilterOperator(this);
	}
};

VsFilterOperatorContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsFilterOperator(this);
	}
};

VsFilterOperatorContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsFilterOperator(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsFilterOperatorContext = VsFilterOperatorContext;

FSHParser.prototype.vsFilterOperator = function() {

    var localctx = new VsFilterOperatorContext(this, this._ctx, this.state);
    this.enterRule(localctx, 78, FSHParser.RULE_vsFilterOperator);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 401;
        _la = this._input.LA(1);
        if(!(_la===FSHParser.EQUAL || _la===FSHParser.SEQUENCE)) {
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
};


function VsFilterValueContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_vsFilterValue;
    return this;
}

VsFilterValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VsFilterValueContext.prototype.constructor = VsFilterValueContext;

VsFilterValueContext.prototype.code = function() {
    return this.getTypedRuleContext(CodeContext,0);
};

VsFilterValueContext.prototype.KW_TRUE = function() {
    return this.getToken(FSHParser.KW_TRUE, 0);
};

VsFilterValueContext.prototype.KW_FALSE = function() {
    return this.getToken(FSHParser.KW_FALSE, 0);
};

VsFilterValueContext.prototype.REGEX = function() {
    return this.getToken(FSHParser.REGEX, 0);
};

VsFilterValueContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

VsFilterValueContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterVsFilterValue(this);
	}
};

VsFilterValueContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitVsFilterValue(this);
	}
};

VsFilterValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitVsFilterValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.VsFilterValueContext = VsFilterValueContext;

FSHParser.prototype.vsFilterValue = function() {

    var localctx = new VsFilterValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 80, FSHParser.RULE_vsFilterValue);
    try {
        this.state = 408;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.CODE:
            this.enterOuterAlt(localctx, 1);
            this.state = 403;
            this.code();
            break;
        case FSHParser.KW_TRUE:
            this.enterOuterAlt(localctx, 2);
            this.state = 404;
            this.match(FSHParser.KW_TRUE);
            break;
        case FSHParser.KW_FALSE:
            this.enterOuterAlt(localctx, 3);
            this.state = 405;
            this.match(FSHParser.KW_FALSE);
            break;
        case FSHParser.REGEX:
            this.enterOuterAlt(localctx, 4);
            this.state = 406;
            this.match(FSHParser.REGEX);
            break;
        case FSHParser.STRING:
            this.enterOuterAlt(localctx, 5);
            this.state = 407;
            this.match(FSHParser.STRING);
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


function PathContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_path;
    return this;
}

PathContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PathContext.prototype.constructor = PathContext;

PathContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

PathContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterPath(this);
	}
};

PathContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitPath(this);
	}
};

PathContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitPath(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.PathContext = PathContext;

FSHParser.prototype.path = function() {

    var localctx = new PathContext(this, this._ctx, this.state);
    this.enterRule(localctx, 82, FSHParser.RULE_path);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 410;
        this.match(FSHParser.SEQUENCE);
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
};


function PathsContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_paths;
    return this;
}

PathsContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PathsContext.prototype.constructor = PathsContext;

PathsContext.prototype.COMMA_DELIMITED_SEQUENCES = function() {
    return this.getToken(FSHParser.COMMA_DELIMITED_SEQUENCES, 0);
};

PathsContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterPaths(this);
	}
};

PathsContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitPaths(this);
	}
};

PathsContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitPaths(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.PathsContext = PathsContext;

FSHParser.prototype.paths = function() {

    var localctx = new PathsContext(this, this._ctx, this.state);
    this.enterRule(localctx, 84, FSHParser.RULE_paths);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 412;
        this.match(FSHParser.COMMA_DELIMITED_SEQUENCES);
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
};


function CaretPathContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_caretPath;
    return this;
}

CaretPathContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
CaretPathContext.prototype.constructor = CaretPathContext;

CaretPathContext.prototype.CARET_SEQUENCE = function() {
    return this.getToken(FSHParser.CARET_SEQUENCE, 0);
};

CaretPathContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterCaretPath(this);
	}
};

CaretPathContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitCaretPath(this);
	}
};

CaretPathContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitCaretPath(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.CaretPathContext = CaretPathContext;

FSHParser.prototype.caretPath = function() {

    var localctx = new CaretPathContext(this, this._ctx, this.state);
    this.enterRule(localctx, 86, FSHParser.RULE_caretPath);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 414;
        this.match(FSHParser.CARET_SEQUENCE);
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
};


function FlagContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_flag;
    return this;
}

FlagContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FlagContext.prototype.constructor = FlagContext;

FlagContext.prototype.KW_MOD = function() {
    return this.getToken(FSHParser.KW_MOD, 0);
};

FlagContext.prototype.KW_MS = function() {
    return this.getToken(FSHParser.KW_MS, 0);
};

FlagContext.prototype.KW_SU = function() {
    return this.getToken(FSHParser.KW_SU, 0);
};

FlagContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterFlag(this);
	}
};

FlagContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitFlag(this);
	}
};

FlagContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitFlag(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.FlagContext = FlagContext;

FSHParser.prototype.flag = function() {

    var localctx = new FlagContext(this, this._ctx, this.state);
    this.enterRule(localctx, 88, FSHParser.RULE_flag);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 416;
        _la = this._input.LA(1);
        if(!((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_MOD) | (1 << FSHParser.KW_MS) | (1 << FSHParser.KW_SU))) !== 0))) {
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
};


function StrengthContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_strength;
    return this;
}

StrengthContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
StrengthContext.prototype.constructor = StrengthContext;

StrengthContext.prototype.KW_EXAMPLE = function() {
    return this.getToken(FSHParser.KW_EXAMPLE, 0);
};

StrengthContext.prototype.KW_PREFERRED = function() {
    return this.getToken(FSHParser.KW_PREFERRED, 0);
};

StrengthContext.prototype.KW_EXTENSIBLE = function() {
    return this.getToken(FSHParser.KW_EXTENSIBLE, 0);
};

StrengthContext.prototype.KW_REQUIRED = function() {
    return this.getToken(FSHParser.KW_REQUIRED, 0);
};

StrengthContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterStrength(this);
	}
};

StrengthContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitStrength(this);
	}
};

StrengthContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitStrength(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.StrengthContext = StrengthContext;

FSHParser.prototype.strength = function() {

    var localctx = new StrengthContext(this, this._ctx, this.state);
    this.enterRule(localctx, 90, FSHParser.RULE_strength);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 418;
        _la = this._input.LA(1);
        if(!((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_EXAMPLE) | (1 << FSHParser.KW_PREFERRED) | (1 << FSHParser.KW_EXTENSIBLE) | (1 << FSHParser.KW_REQUIRED))) !== 0))) {
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
};


function ValueContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_value;
    return this;
}

ValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ValueContext.prototype.constructor = ValueContext;

ValueContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

ValueContext.prototype.MULTILINE_STRING = function() {
    return this.getToken(FSHParser.MULTILINE_STRING, 0);
};

ValueContext.prototype.NUMBER = function() {
    return this.getToken(FSHParser.NUMBER, 0);
};

ValueContext.prototype.DATETIME = function() {
    return this.getToken(FSHParser.DATETIME, 0);
};

ValueContext.prototype.TIME = function() {
    return this.getToken(FSHParser.TIME, 0);
};

ValueContext.prototype.reference = function() {
    return this.getTypedRuleContext(ReferenceContext,0);
};

ValueContext.prototype.code = function() {
    return this.getTypedRuleContext(CodeContext,0);
};

ValueContext.prototype.quantity = function() {
    return this.getTypedRuleContext(QuantityContext,0);
};

ValueContext.prototype.ratio = function() {
    return this.getTypedRuleContext(RatioContext,0);
};

ValueContext.prototype.bool = function() {
    return this.getTypedRuleContext(BoolContext,0);
};

ValueContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterValue(this);
	}
};

ValueContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitValue(this);
	}
};

ValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ValueContext = ValueContext;

FSHParser.prototype.value = function() {

    var localctx = new ValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 92, FSHParser.RULE_value);
    try {
        this.state = 430;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,40,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 420;
            this.match(FSHParser.STRING);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 421;
            this.match(FSHParser.MULTILINE_STRING);
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 422;
            this.match(FSHParser.NUMBER);
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 423;
            this.match(FSHParser.DATETIME);
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 424;
            this.match(FSHParser.TIME);
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 425;
            this.reference();
            break;

        case 7:
            this.enterOuterAlt(localctx, 7);
            this.state = 426;
            this.code();
            break;

        case 8:
            this.enterOuterAlt(localctx, 8);
            this.state = 427;
            this.quantity();
            break;

        case 9:
            this.enterOuterAlt(localctx, 9);
            this.state = 428;
            this.ratio();
            break;

        case 10:
            this.enterOuterAlt(localctx, 10);
            this.state = 429;
            this.bool();
            break;

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
};


function ItemContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_item;
    return this;
}

ItemContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ItemContext.prototype.constructor = ItemContext;

ItemContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

ItemContext.prototype.CARD = function() {
    return this.getToken(FSHParser.CARD, 0);
};

ItemContext.prototype.flag = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(FlagContext);
    } else {
        return this.getTypedRuleContext(FlagContext,i);
    }
};

ItemContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterItem(this);
	}
};

ItemContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitItem(this);
	}
};

ItemContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitItem(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ItemContext = ItemContext;

FSHParser.prototype.item = function() {

    var localctx = new ItemContext(this, this._ctx, this.state);
    this.enterRule(localctx, 94, FSHParser.RULE_item);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 432;
        this.match(FSHParser.SEQUENCE);
        this.state = 433;
        this.match(FSHParser.CARD);
        this.state = 437;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_MOD) | (1 << FSHParser.KW_MS) | (1 << FSHParser.KW_SU))) !== 0)) {
            this.state = 434;
            this.flag();
            this.state = 439;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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
};


function CodeContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_code;
    return this;
}

CodeContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
CodeContext.prototype.constructor = CodeContext;

CodeContext.prototype.CODE = function() {
    return this.getToken(FSHParser.CODE, 0);
};

CodeContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

CodeContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterCode(this);
	}
};

CodeContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitCode(this);
	}
};

CodeContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitCode(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.CodeContext = CodeContext;

FSHParser.prototype.code = function() {

    var localctx = new CodeContext(this, this._ctx, this.state);
    this.enterRule(localctx, 96, FSHParser.RULE_code);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 440;
        this.match(FSHParser.CODE);
        this.state = 442;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,42,this._ctx);
        if(la_===1) {
            this.state = 441;
            this.match(FSHParser.STRING);

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
};


function ConceptContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_concept;
    return this;
}

ConceptContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ConceptContext.prototype.constructor = ConceptContext;

ConceptContext.prototype.STAR = function() {
    return this.getToken(FSHParser.STAR, 0);
};

ConceptContext.prototype.code = function() {
    return this.getTypedRuleContext(CodeContext,0);
};

ConceptContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

ConceptContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterConcept(this);
	}
};

ConceptContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitConcept(this);
	}
};

ConceptContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitConcept(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ConceptContext = ConceptContext;

FSHParser.prototype.concept = function() {

    var localctx = new ConceptContext(this, this._ctx, this.state);
    this.enterRule(localctx, 98, FSHParser.RULE_concept);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 444;
        this.match(FSHParser.STAR);
        this.state = 445;
        this.code();
        this.state = 447;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.STRING) {
            this.state = 446;
            this.match(FSHParser.STRING);
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
};


function QuantityContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_quantity;
    return this;
}

QuantityContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
QuantityContext.prototype.constructor = QuantityContext;

QuantityContext.prototype.NUMBER = function() {
    return this.getToken(FSHParser.NUMBER, 0);
};

QuantityContext.prototype.UNIT = function() {
    return this.getToken(FSHParser.UNIT, 0);
};

QuantityContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterQuantity(this);
	}
};

QuantityContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitQuantity(this);
	}
};

QuantityContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitQuantity(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.QuantityContext = QuantityContext;

FSHParser.prototype.quantity = function() {

    var localctx = new QuantityContext(this, this._ctx, this.state);
    this.enterRule(localctx, 100, FSHParser.RULE_quantity);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 449;
        this.match(FSHParser.NUMBER);
        this.state = 450;
        this.match(FSHParser.UNIT);
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
};


function RatioContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_ratio;
    return this;
}

RatioContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
RatioContext.prototype.constructor = RatioContext;

RatioContext.prototype.ratioPart = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(RatioPartContext);
    } else {
        return this.getTypedRuleContext(RatioPartContext,i);
    }
};

RatioContext.prototype.COLON = function() {
    return this.getToken(FSHParser.COLON, 0);
};

RatioContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterRatio(this);
	}
};

RatioContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitRatio(this);
	}
};

RatioContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitRatio(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.RatioContext = RatioContext;

FSHParser.prototype.ratio = function() {

    var localctx = new RatioContext(this, this._ctx, this.state);
    this.enterRule(localctx, 102, FSHParser.RULE_ratio);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 452;
        this.ratioPart();
        this.state = 453;
        this.match(FSHParser.COLON);
        this.state = 454;
        this.ratioPart();
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
};


function ReferenceContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_reference;
    return this;
}

ReferenceContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ReferenceContext.prototype.constructor = ReferenceContext;

ReferenceContext.prototype.REFERENCE = function() {
    return this.getToken(FSHParser.REFERENCE, 0);
};

ReferenceContext.prototype.STRING = function() {
    return this.getToken(FSHParser.STRING, 0);
};

ReferenceContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterReference(this);
	}
};

ReferenceContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitReference(this);
	}
};

ReferenceContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitReference(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.ReferenceContext = ReferenceContext;

FSHParser.prototype.reference = function() {

    var localctx = new ReferenceContext(this, this._ctx, this.state);
    this.enterRule(localctx, 104, FSHParser.RULE_reference);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 456;
        this.match(FSHParser.REFERENCE);
        this.state = 458;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.STRING) {
            this.state = 457;
            this.match(FSHParser.STRING);
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
};


function RatioPartContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_ratioPart;
    return this;
}

RatioPartContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
RatioPartContext.prototype.constructor = RatioPartContext;

RatioPartContext.prototype.NUMBER = function() {
    return this.getToken(FSHParser.NUMBER, 0);
};

RatioPartContext.prototype.quantity = function() {
    return this.getTypedRuleContext(QuantityContext,0);
};

RatioPartContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterRatioPart(this);
	}
};

RatioPartContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitRatioPart(this);
	}
};

RatioPartContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitRatioPart(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.RatioPartContext = RatioPartContext;

FSHParser.prototype.ratioPart = function() {

    var localctx = new RatioPartContext(this, this._ctx, this.state);
    this.enterRule(localctx, 106, FSHParser.RULE_ratioPart);
    try {
        this.state = 462;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,45,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 460;
            this.match(FSHParser.NUMBER);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 461;
            this.quantity();
            break;

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
};


function BoolContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_bool;
    return this;
}

BoolContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
BoolContext.prototype.constructor = BoolContext;

BoolContext.prototype.KW_TRUE = function() {
    return this.getToken(FSHParser.KW_TRUE, 0);
};

BoolContext.prototype.KW_FALSE = function() {
    return this.getToken(FSHParser.KW_FALSE, 0);
};

BoolContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterBool(this);
	}
};

BoolContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitBool(this);
	}
};

BoolContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitBool(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.BoolContext = BoolContext;

FSHParser.prototype.bool = function() {

    var localctx = new BoolContext(this, this._ctx, this.state);
    this.enterRule(localctx, 108, FSHParser.RULE_bool);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 464;
        _la = this._input.LA(1);
        if(!(_la===FSHParser.KW_TRUE || _la===FSHParser.KW_FALSE)) {
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
};


function TargetTypeContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = FSHParser.RULE_targetType;
    return this;
}

TargetTypeContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
TargetTypeContext.prototype.constructor = TargetTypeContext;

TargetTypeContext.prototype.SEQUENCE = function() {
    return this.getToken(FSHParser.SEQUENCE, 0);
};

TargetTypeContext.prototype.reference = function() {
    return this.getTypedRuleContext(ReferenceContext,0);
};

TargetTypeContext.prototype.enterRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.enterTargetType(this);
	}
};

TargetTypeContext.prototype.exitRule = function(listener) {
    if(listener instanceof FSHListener ) {
        listener.exitTargetType(this);
	}
};

TargetTypeContext.prototype.accept = function(visitor) {
    if ( visitor instanceof FSHVisitor ) {
        return visitor.visitTargetType(this);
    } else {
        return visitor.visitChildren(this);
    }
};




FSHParser.TargetTypeContext = TargetTypeContext;

FSHParser.prototype.targetType = function() {

    var localctx = new TargetTypeContext(this, this._ctx, this.state);
    this.enterRule(localctx, 110, FSHParser.RULE_targetType);
    try {
        this.state = 468;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.SEQUENCE:
            this.enterOuterAlt(localctx, 1);
            this.state = 466;
            this.match(FSHParser.SEQUENCE);
            break;
        case FSHParser.REFERENCE:
            this.enterOuterAlt(localctx, 2);
            this.state = 467;
            this.reference();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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
};


exports.FSHParser = FSHParser;
