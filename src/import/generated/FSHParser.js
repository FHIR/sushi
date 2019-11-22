// Generated from FSH.g4 by ANTLR 4.7.2
// jshint ignore: start
var antlr4 = require('antlr4/index');
var FSHListener = require('./FSHListener').FSHListener;
var FSHVisitor = require('./FSHVisitor').FSHVisitor;

var grammarFileName = "FSH.g4";


var serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964",
    "\u00031\u0135\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004\t",
    "\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t\u0007\u0004",
    "\b\t\b\u0004\t\t\t\u0004\n\t\n\u0004\u000b\t\u000b\u0004\f\t\f\u0004",
    "\r\t\r\u0004\u000e\t\u000e\u0004\u000f\t\u000f\u0004\u0010\t\u0010\u0004",
    "\u0011\t\u0011\u0004\u0012\t\u0012\u0004\u0013\t\u0013\u0004\u0014\t",
    "\u0014\u0004\u0015\t\u0015\u0004\u0016\t\u0016\u0004\u0017\t\u0017\u0004",
    "\u0018\t\u0018\u0004\u0019\t\u0019\u0004\u001a\t\u001a\u0004\u001b\t",
    "\u001b\u0004\u001c\t\u001c\u0004\u001d\t\u001d\u0004\u001e\t\u001e\u0004",
    "\u001f\t\u001f\u0004 \t \u0004!\t!\u0004\"\t\"\u0004#\t#\u0004$\t$\u0004",
    "%\t%\u0004&\t&\u0004\'\t\'\u0003\u0002\u0007\u0002P\n\u0002\f\u0002",
    "\u000e\u0002S\u000b\u0002\u0003\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0005\u0003Z\n\u0003\u0003\u0004\u0003\u0004\u0003",
    "\u0004\u0003\u0004\u0003\u0004\u0003\u0005\u0003\u0005\u0003\u0005\u0006",
    "\u0005d\n\u0005\r\u0005\u000e\u0005e\u0003\u0005\u0007\u0005i\n\u0005",
    "\f\u0005\u000e\u0005l\u000b\u0005\u0003\u0006\u0003\u0006\u0003\u0006",
    "\u0007\u0006q\n\u0006\f\u0006\u000e\u0006t\u000b\u0006\u0003\u0006\u0007",
    "\u0006w\n\u0006\f\u0006\u000e\u0006z\u000b\u0006\u0003\u0007\u0003\u0007",
    "\u0003\u0007\u0003\u0007\u0003\u0007\u0005\u0007\u0081\n\u0007\u0003",
    "\u0007\u0007\u0007\u0084\n\u0007\f\u0007\u000e\u0007\u0087\u000b\u0007",
    "\u0003\b\u0003\b\u0003\b\u0003\b\u0005\b\u008d\n\b\u0003\t\u0003\t\u0003",
    "\t\u0003\t\u0003\t\u0003\t\u0003\t\u0003\t\u0005\t\u0097\n\t\u0003\n",
    "\u0003\n\u0003\n\u0006\n\u009c\n\n\r\n\u000e\n\u009d\u0003\u000b\u0003",
    "\u000b\u0003\u000b\u0003\u000b\u0005\u000b\u00a4\n\u000b\u0003\f\u0003",
    "\f\u0003\f\u0003\r\u0003\r\u0003\r\u0003\u000e\u0003\u000e\u0003\u000e",
    "\u0003\u000f\u0003\u000f\u0003\u000f\u0003\u0010\u0003\u0010\u0003\u0010",
    "\u0003\u0011\u0003\u0011\u0003\u0011\u0003\u0012\u0003\u0012\u0003\u0012",
    "\u0003\u0013\u0003\u0013\u0003\u0013\u0003\u0013\u0007\u0013\u00bf\n",
    "\u0013\f\u0013\u000e\u0013\u00c2\u000b\u0013\u0003\u0014\u0003\u0014",
    "\u0003\u0014\u0005\u0014\u00c7\n\u0014\u0003\u0014\u0006\u0014\u00ca",
    "\n\u0014\r\u0014\u000e\u0014\u00cb\u0003\u0015\u0003\u0015\u0003\u0015",
    "\u0003\u0015\u0003\u0015\u0005\u0015\u00d3\n\u0015\u0003\u0016\u0003",
    "\u0016\u0003\u0016\u0003\u0016\u0003\u0016\u0003\u0017\u0003\u0017\u0003",
    "\u0017\u0003\u0017\u0003\u0017\u0003\u0017\u0007\u0017\u00e0\n\u0017",
    "\f\u0017\u000e\u0017\u00e3\u000b\u0017\u0003\u0018\u0003\u0018\u0003",
    "\u0018\u0003\u0018\u0003\u0018\u0003\u0018\u0007\u0018\u00eb\n\u0018",
    "\f\u0018\u000e\u0018\u00ee\u000b\u0018\u0003\u0019\u0003\u0019\u0005",
    "\u0019\u00f2\n\u0019\u0003\u0019\u0003\u0019\u0003\u0019\u0003\u0019",
    "\u0007\u0019\u00f8\n\u0019\f\u0019\u000e\u0019\u00fb\u000b\u0019\u0003",
    "\u001a\u0003\u001a\u0005\u001a\u00ff\n\u001a\u0003\u001a\u0003\u001a",
    "\u0003\u001a\u0003\u001a\u0003\u001b\u0003\u001b\u0003\u001c\u0003\u001c",
    "\u0003\u001d\u0003\u001d\u0003\u001e\u0003\u001e\u0003\u001f\u0003\u001f",
    "\u0003 \u0003 \u0003 \u0003 \u0003 \u0003 \u0003 \u0003 \u0003 \u0005",
    " \u0118\n \u0003!\u0003!\u0003!\u0007!\u011d\n!\f!\u000e!\u0120\u000b",
    "!\u0003\"\u0003\"\u0005\"\u0124\n\"\u0003#\u0003#\u0003#\u0003$\u0003",
    "$\u0003$\u0003$\u0003%\u0003%\u0005%\u012f\n%\u0003&\u0003&\u0003\'",
    "\u0003\'\u0003\'\u0002\u0002(\u0002\u0004\u0006\b\n\f\u000e\u0010\u0012",
    "\u0014\u0016\u0018\u001a\u001c\u001e \"$&(*,.02468:<>@BDFHJL\u0002\u0007",
    "\u0003\u0002#$\u0003\u0002\u0010\u0012\u0003\u0002\u0014\u0017\u0003",
    "\u0002\u001d\u001e\u0004\u0002++..\u0002\u013b\u0002Q\u0003\u0002\u0002",
    "\u0002\u0004Y\u0003\u0002\u0002\u0002\u0006[\u0003\u0002\u0002\u0002",
    "\b`\u0003\u0002\u0002\u0002\nm\u0003\u0002\u0002\u0002\f{\u0003\u0002",
    "\u0002\u0002\u000e\u008c\u0003\u0002\u0002\u0002\u0010\u0096\u0003\u0002",
    "\u0002\u0002\u0012\u0098\u0003\u0002\u0002\u0002\u0014\u00a3\u0003\u0002",
    "\u0002\u0002\u0016\u00a5\u0003\u0002\u0002\u0002\u0018\u00a8\u0003\u0002",
    "\u0002\u0002\u001a\u00ab\u0003\u0002\u0002\u0002\u001c\u00ae\u0003\u0002",
    "\u0002\u0002\u001e\u00b1\u0003\u0002\u0002\u0002 \u00b4\u0003\u0002",
    "\u0002\u0002\"\u00b7\u0003\u0002\u0002\u0002$\u00ba\u0003\u0002\u0002",
    "\u0002&\u00c3\u0003\u0002\u0002\u0002(\u00cd\u0003\u0002\u0002\u0002",
    "*\u00d4\u0003\u0002\u0002\u0002,\u00d9\u0003\u0002\u0002\u0002.\u00e4",
    "\u0003\u0002\u0002\u00020\u00ef\u0003\u0002\u0002\u00022\u00fc\u0003",
    "\u0002\u0002\u00024\u0104\u0003\u0002\u0002\u00026\u0106\u0003\u0002",
    "\u0002\u00028\u0108\u0003\u0002\u0002\u0002:\u010a\u0003\u0002\u0002",
    "\u0002<\u010c\u0003\u0002\u0002\u0002>\u0117\u0003\u0002\u0002\u0002",
    "@\u0119\u0003\u0002\u0002\u0002B\u0121\u0003\u0002\u0002\u0002D\u0125",
    "\u0003\u0002\u0002\u0002F\u0128\u0003\u0002\u0002\u0002H\u012e\u0003",
    "\u0002\u0002\u0002J\u0130\u0003\u0002\u0002\u0002L\u0132\u0003\u0002",
    "\u0002\u0002NP\u0005\u0004\u0003\u0002ON\u0003\u0002\u0002\u0002PS\u0003",
    "\u0002\u0002\u0002QO\u0003\u0002\u0002\u0002QR\u0003\u0002\u0002\u0002",
    "R\u0003\u0003\u0002\u0002\u0002SQ\u0003\u0002\u0002\u0002TZ\u0005\u0006",
    "\u0004\u0002UZ\u0005\b\u0005\u0002VZ\u0005\n\u0006\u0002WZ\u0005\u0012",
    "\n\u0002XZ\u0005\f\u0007\u0002YT\u0003\u0002\u0002\u0002YU\u0003\u0002",
    "\u0002\u0002YV\u0003\u0002\u0002\u0002YW\u0003\u0002\u0002\u0002YX\u0003",
    "\u0002\u0002\u0002Z\u0005\u0003\u0002\u0002\u0002[\\\u0007\u0003\u0002",
    "\u0002\\]\u0007.\u0002\u0002]^\u0007\u001f\u0002\u0002^_\u0007.\u0002",
    "\u0002_\u0007\u0003\u0002\u0002\u0002`a\u0007\u0004\u0002\u0002ac\u0007",
    ".\u0002\u0002bd\u0005\u000e\b\u0002cb\u0003\u0002\u0002\u0002de\u0003",
    "\u0002\u0002\u0002ec\u0003\u0002\u0002\u0002ef\u0003\u0002\u0002\u0002",
    "fj\u0003\u0002\u0002\u0002gi\u0005\u0010\t\u0002hg\u0003\u0002\u0002",
    "\u0002il\u0003\u0002\u0002\u0002jh\u0003\u0002\u0002\u0002jk\u0003\u0002",
    "\u0002\u0002k\t\u0003\u0002\u0002\u0002lj\u0003\u0002\u0002\u0002mn",
    "\u0007\u0005\u0002\u0002nr\u0007.\u0002\u0002oq\u0005\u000e\b\u0002",
    "po\u0003\u0002\u0002\u0002qt\u0003\u0002\u0002\u0002rp\u0003\u0002\u0002",
    "\u0002rs\u0003\u0002\u0002\u0002sx\u0003\u0002\u0002\u0002tr\u0003\u0002",
    "\u0002\u0002uw\u0005\u0010\t\u0002vu\u0003\u0002\u0002\u0002wz\u0003",
    "\u0002\u0002\u0002xv\u0003\u0002\u0002\u0002xy\u0003\u0002\u0002\u0002",
    "y\u000b\u0003\u0002\u0002\u0002zx\u0003\u0002\u0002\u0002{|\u0007\u0006",
    "\u0002\u0002|}\u0007.\u0002\u0002}~\u0007\u0007\u0002\u0002~\u0080\u0007",
    ".\u0002\u0002\u007f\u0081\u0005\u001a\u000e\u0002\u0080\u007f\u0003",
    "\u0002\u0002\u0002\u0080\u0081\u0003\u0002\u0002\u0002\u0081\u0085\u0003",
    "\u0002\u0002\u0002\u0082\u0084\u0005*\u0016\u0002\u0083\u0082\u0003",
    "\u0002\u0002\u0002\u0084\u0087\u0003\u0002\u0002\u0002\u0085\u0083\u0003",
    "\u0002\u0002\u0002\u0085\u0086\u0003\u0002\u0002\u0002\u0086\r\u0003",
    "\u0002\u0002\u0002\u0087\u0085\u0003\u0002\u0002\u0002\u0088\u008d\u0005",
    "\u0016\f\u0002\u0089\u008d\u0005\u0018\r\u0002\u008a\u008d\u0005\u001a",
    "\u000e\u0002\u008b\u008d\u0005\u001c\u000f\u0002\u008c\u0088\u0003\u0002",
    "\u0002\u0002\u008c\u0089\u0003\u0002\u0002\u0002\u008c\u008a\u0003\u0002",
    "\u0002\u0002\u008c\u008b\u0003\u0002\u0002\u0002\u008d\u000f\u0003\u0002",
    "\u0002\u0002\u008e\u0097\u0005$\u0013\u0002\u008f\u0097\u0005&\u0014",
    "\u0002\u0090\u0097\u0005(\u0015\u0002\u0091\u0097\u0005*\u0016\u0002",
    "\u0092\u0097\u0005,\u0017\u0002\u0093\u0097\u0005.\u0018\u0002\u0094",
    "\u0097\u00050\u0019\u0002\u0095\u0097\u00052\u001a\u0002\u0096\u008e",
    "\u0003\u0002\u0002\u0002\u0096\u008f\u0003\u0002\u0002\u0002\u0096\u0090",
    "\u0003\u0002\u0002\u0002\u0096\u0091\u0003\u0002\u0002\u0002\u0096\u0092",
    "\u0003\u0002\u0002\u0002\u0096\u0093\u0003\u0002\u0002\u0002\u0096\u0094",
    "\u0003\u0002\u0002\u0002\u0096\u0095\u0003\u0002\u0002\u0002\u0097\u0011",
    "\u0003\u0002\u0002\u0002\u0098\u0099\u0007\b\u0002\u0002\u0099\u009b",
    "\u0007.\u0002\u0002\u009a\u009c\u0005\u0014\u000b\u0002\u009b\u009a",
    "\u0003\u0002\u0002\u0002\u009c\u009d\u0003\u0002\u0002\u0002\u009d\u009b",
    "\u0003\u0002\u0002\u0002\u009d\u009e\u0003\u0002\u0002\u0002\u009e\u0013",
    "\u0003\u0002\u0002\u0002\u009f\u00a4\u0005\u001c\u000f\u0002\u00a0\u00a4",
    "\u0005\u001e\u0010\u0002\u00a1\u00a4\u0005 \u0011\u0002\u00a2\u00a4",
    "\u0005\"\u0012\u0002\u00a3\u009f\u0003\u0002\u0002\u0002\u00a3\u00a0",
    "\u0003\u0002\u0002\u0002\u00a3\u00a1\u0003\u0002\u0002\u0002\u00a3\u00a2",
    "\u0003\u0002\u0002\u0002\u00a4\u0015\u0003\u0002\u0002\u0002\u00a5\u00a6",
    "\u0007\t\u0002\u0002\u00a6\u00a7\u0007.\u0002\u0002\u00a7\u0017\u0003",
    "\u0002\u0002\u0002\u00a8\u00a9\u0007\n\u0002\u0002\u00a9\u00aa\u0007",
    ".\u0002\u0002\u00aa\u0019\u0003\u0002\u0002\u0002\u00ab\u00ac\u0007",
    "\u000b\u0002\u0002\u00ac\u00ad\u0007#\u0002\u0002\u00ad\u001b\u0003",
    "\u0002\u0002\u0002\u00ae\u00af\u0007\f\u0002\u0002\u00af\u00b0\t\u0002",
    "\u0002\u0002\u00b0\u001d\u0003\u0002\u0002\u0002\u00b1\u00b2\u0007\r",
    "\u0002\u0002\u00b2\u00b3\u0007#\u0002\u0002\u00b3\u001f\u0003\u0002",
    "\u0002\u0002\u00b4\u00b5\u0007\u000e\u0002\u0002\u00b5\u00b6\u0007#",
    "\u0002\u0002\u00b6!\u0003\u0002\u0002\u0002\u00b7\u00b8\u0007\u000f",
    "\u0002\u0002\u00b8\u00b9\u0007\'\u0002\u0002\u00b9#\u0003\u0002\u0002",
    "\u0002\u00ba\u00bb\u0007 \u0002\u0002\u00bb\u00bc\u00054\u001b\u0002",
    "\u00bc\u00c0\u0007*\u0002\u0002\u00bd\u00bf\u0005:\u001e\u0002\u00be",
    "\u00bd\u0003\u0002\u0002\u0002\u00bf\u00c2\u0003\u0002\u0002\u0002\u00c0",
    "\u00be\u0003\u0002\u0002\u0002\u00c0\u00c1\u0003\u0002\u0002\u0002\u00c1",
    "%\u0003\u0002\u0002\u0002\u00c2\u00c0\u0003\u0002\u0002\u0002\u00c3",
    "\u00c6\u0007 \u0002\u0002\u00c4\u00c7\u00054\u001b\u0002\u00c5\u00c7",
    "\u00056\u001c\u0002\u00c6\u00c4\u0003\u0002\u0002\u0002\u00c6\u00c5",
    "\u0003\u0002\u0002\u0002\u00c7\u00c9\u0003\u0002\u0002\u0002\u00c8\u00ca",
    "\u0005:\u001e\u0002\u00c9\u00c8\u0003\u0002\u0002\u0002\u00ca\u00cb",
    "\u0003\u0002\u0002\u0002\u00cb\u00c9\u0003\u0002\u0002\u0002\u00cb\u00cc",
    "\u0003\u0002\u0002\u0002\u00cc\'\u0003\u0002\u0002\u0002\u00cd\u00ce",
    "\u0007 \u0002\u0002\u00ce\u00cf\u00054\u001b\u0002\u00cf\u00d0\u0007",
    "\u0013\u0002\u0002\u00d0\u00d2\u0007.\u0002\u0002\u00d1\u00d3\u0005",
    "<\u001f\u0002\u00d2\u00d1\u0003\u0002\u0002\u0002\u00d2\u00d3\u0003",
    "\u0002\u0002\u0002\u00d3)\u0003\u0002\u0002\u0002\u00d4\u00d5\u0007",
    " \u0002\u0002\u00d5\u00d6\u00054\u001b\u0002\u00d6\u00d7\u0007\u001f",
    "\u0002\u0002\u00d7\u00d8\u0005> \u0002\u00d8+\u0003\u0002\u0002\u0002",
    "\u00d9\u00da\u0007 \u0002\u0002\u00da\u00db\u00054\u001b\u0002\u00db",
    "\u00dc\u0007\u0018\u0002\u0002\u00dc\u00e1\u0005@!\u0002\u00dd\u00de",
    "\u0007\u0019\u0002\u0002\u00de\u00e0\u0005@!\u0002\u00df\u00dd\u0003",
    "\u0002\u0002\u0002\u00e0\u00e3\u0003\u0002\u0002\u0002\u00e1\u00df\u0003",
    "\u0002\u0002\u0002\u00e1\u00e2\u0003\u0002\u0002\u0002\u00e2-\u0003",
    "\u0002\u0002\u0002\u00e3\u00e1\u0003\u0002\u0002\u0002\u00e4\u00e5\u0007",
    " \u0002\u0002\u00e5\u00e6\u00054\u001b\u0002\u00e6\u00e7\u0007\u001a",
    "\u0002\u0002\u00e7\u00ec\u0005L\'\u0002\u00e8\u00e9\u0007\u001b\u0002",
    "\u0002\u00e9\u00eb\u0005L\'\u0002\u00ea\u00e8\u0003\u0002\u0002\u0002",
    "\u00eb\u00ee\u0003\u0002\u0002\u0002\u00ec\u00ea\u0003\u0002\u0002\u0002",
    "\u00ec\u00ed\u0003\u0002\u0002\u0002\u00ed/\u0003\u0002\u0002\u0002",
    "\u00ee\u00ec\u0003\u0002\u0002\u0002\u00ef\u00f1\u0007 \u0002\u0002",
    "\u00f0\u00f2\u00054\u001b\u0002\u00f1\u00f0\u0003\u0002\u0002\u0002",
    "\u00f1\u00f2\u0003\u0002\u0002\u0002\u00f2\u00f3\u0003\u0002\u0002\u0002",
    "\u00f3\u00f4\u0007\u001c\u0002\u0002\u00f4\u00f9\u0007.\u0002\u0002",
    "\u00f5\u00f6\u0007\u0019\u0002\u0002\u00f6\u00f8\u0007.\u0002\u0002",
    "\u00f7\u00f5\u0003\u0002\u0002\u0002\u00f8\u00fb\u0003\u0002\u0002\u0002",
    "\u00f9\u00f7\u0003\u0002\u0002\u0002\u00f9\u00fa\u0003\u0002\u0002\u0002",
    "\u00fa1\u0003\u0002\u0002\u0002\u00fb\u00f9\u0003\u0002\u0002\u0002",
    "\u00fc\u00fe\u0007 \u0002\u0002\u00fd\u00ff\u00054\u001b\u0002\u00fe",
    "\u00fd\u0003\u0002\u0002\u0002\u00fe\u00ff\u0003\u0002\u0002\u0002\u00ff",
    "\u0100\u0003\u0002\u0002\u0002\u0100\u0101\u00058\u001d\u0002\u0101",
    "\u0102\u0007\u001f\u0002\u0002\u0102\u0103\u0005> \u0002\u01033\u0003",
    "\u0002\u0002\u0002\u0104\u0105\u0007.\u0002\u0002\u01055\u0003\u0002",
    "\u0002\u0002\u0106\u0107\u0007-\u0002\u0002\u01077\u0003\u0002\u0002",
    "\u0002\u0108\u0109\u0007,\u0002\u0002\u01099\u0003\u0002\u0002\u0002",
    "\u010a\u010b\t\u0003\u0002\u0002\u010b;\u0003\u0002\u0002\u0002\u010c",
    "\u010d\t\u0004\u0002\u0002\u010d=\u0003\u0002\u0002\u0002\u010e\u0118",
    "\u0007#\u0002\u0002\u010f\u0118\u0007$\u0002\u0002\u0110\u0118\u0007",
    "%\u0002\u0002\u0111\u0118\u0007(\u0002\u0002\u0112\u0118\u0007)\u0002",
    "\u0002\u0113\u0118\u0005B\"\u0002\u0114\u0118\u0005D#\u0002\u0115\u0118",
    "\u0005F$\u0002\u0116\u0118\u0005J&\u0002\u0117\u010e\u0003\u0002\u0002",
    "\u0002\u0117\u010f\u0003\u0002\u0002\u0002\u0117\u0110\u0003\u0002\u0002",
    "\u0002\u0117\u0111\u0003\u0002\u0002\u0002\u0117\u0112\u0003\u0002\u0002",
    "\u0002\u0117\u0113\u0003\u0002\u0002\u0002\u0117\u0114\u0003\u0002\u0002",
    "\u0002\u0117\u0115\u0003\u0002\u0002\u0002\u0117\u0116\u0003\u0002\u0002",
    "\u0002\u0118?\u0003\u0002\u0002\u0002\u0119\u011a\u0007.\u0002\u0002",
    "\u011a\u011e\u0007*\u0002\u0002\u011b\u011d\u0005:\u001e\u0002\u011c",
    "\u011b\u0003\u0002\u0002\u0002\u011d\u0120\u0003\u0002\u0002\u0002\u011e",
    "\u011c\u0003\u0002\u0002\u0002\u011e\u011f\u0003\u0002\u0002\u0002\u011f",
    "A\u0003\u0002\u0002\u0002\u0120\u011e\u0003\u0002\u0002\u0002\u0121",
    "\u0123\u0007\'\u0002\u0002\u0122\u0124\u0007#\u0002\u0002\u0123\u0122",
    "\u0003\u0002\u0002\u0002\u0123\u0124\u0003\u0002\u0002\u0002\u0124C",
    "\u0003\u0002\u0002\u0002\u0125\u0126\u0007%\u0002\u0002\u0126\u0127",
    "\u0007&\u0002\u0002\u0127E\u0003\u0002\u0002\u0002\u0128\u0129\u0005",
    "H%\u0002\u0129\u012a\u0007!\u0002\u0002\u012a\u012b\u0005H%\u0002\u012b",
    "G\u0003\u0002\u0002\u0002\u012c\u012f\u0007%\u0002\u0002\u012d\u012f",
    "\u0005D#\u0002\u012e\u012c\u0003\u0002\u0002\u0002\u012e\u012d\u0003",
    "\u0002\u0002\u0002\u012fI\u0003\u0002\u0002\u0002\u0130\u0131\t\u0005",
    "\u0002\u0002\u0131K\u0003\u0002\u0002\u0002\u0132\u0133\t\u0006\u0002",
    "\u0002\u0133M\u0003\u0002\u0002\u0002\u001bQYejrx\u0080\u0085\u008c",
    "\u0096\u009d\u00a3\u00c0\u00c6\u00cb\u00d2\u00e1\u00ec\u00f1\u00f9\u00fe",
    "\u0117\u011e\u0123\u012e"].join("");


var atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

var decisionsToDFA = atn.decisionToState.map( function(ds, index) { return new antlr4.dfa.DFA(ds, index); });

var sharedContextCache = new antlr4.PredictionContextCache();

var literalNames = [ null, null, null, null, null, null, null, null, null, 
                     null, null, null, null, null, "'?!'", "'MS'", "'SU'", 
                     "'from'", null, null, null, null, "'contains'", "'and'", 
                     "'only'", "'or'", "'obeys'", "'true'", "'false'", "'='", 
                     "'*'", "':'", "','" ];

var symbolicNames = [ null, "KW_ALIAS", "KW_PROFILE", "KW_EXTENSION", "KW_INSTANCE", 
                      "KW_INSTANCEOF", "KW_INVARIANT", "KW_PARENT", "KW_ID", 
                      "KW_TITLE", "KW_DESCRIPTION", "KW_EXPRESSION", "KW_XPATH", 
                      "KW_SEVERITY", "KW_MOD", "KW_MS", "KW_SU", "KW_FROM", 
                      "KW_EXAMPLE", "KW_PREFERRED", "KW_EXTENSIBLE", "KW_REQUIRED", 
                      "KW_CONTAINS", "KW_AND", "KW_ONLY", "KW_OR", "KW_OBEYS", 
                      "KW_TRUE", "KW_FALSE", "EQUAL", "STAR", "COLON", "COMMA", 
                      "STRING", "MULTILINE_STRING", "NUMBER", "UNIT", "CODE", 
                      "DATETIME", "TIME", "CARD", "REFERENCE", "CARET_SEQUENCE", 
                      "COMMA_DELIMITED_SEQUENCES", "SEQUENCE", "WHITESPACE", 
                      "BLOCK_COMMENT", "LINE_COMMENT" ];

var ruleNames =  [ "doc", "entity", "alias", "profile", "extension", "instance", 
                   "sdMetadata", "sdRule", "invariant", "invariantMetadata", 
                   "parent", "id", "title", "description", "expression", 
                   "xpath", "severity", "cardRule", "flagRule", "valueSetRule", 
                   "fixedValueRule", "containsRule", "onlyRule", "obeysRule", 
                   "caretValueRule", "path", "paths", "caretPath", "flag", 
                   "strength", "value", "item", "code", "quantity", "ratio", 
                   "ratioPart", "bool", "targetType" ];

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
FSHParser.KW_PARENT = 7;
FSHParser.KW_ID = 8;
FSHParser.KW_TITLE = 9;
FSHParser.KW_DESCRIPTION = 10;
FSHParser.KW_EXPRESSION = 11;
FSHParser.KW_XPATH = 12;
FSHParser.KW_SEVERITY = 13;
FSHParser.KW_MOD = 14;
FSHParser.KW_MS = 15;
FSHParser.KW_SU = 16;
FSHParser.KW_FROM = 17;
FSHParser.KW_EXAMPLE = 18;
FSHParser.KW_PREFERRED = 19;
FSHParser.KW_EXTENSIBLE = 20;
FSHParser.KW_REQUIRED = 21;
FSHParser.KW_CONTAINS = 22;
FSHParser.KW_AND = 23;
FSHParser.KW_ONLY = 24;
FSHParser.KW_OR = 25;
FSHParser.KW_OBEYS = 26;
FSHParser.KW_TRUE = 27;
FSHParser.KW_FALSE = 28;
FSHParser.EQUAL = 29;
FSHParser.STAR = 30;
FSHParser.COLON = 31;
FSHParser.COMMA = 32;
FSHParser.STRING = 33;
FSHParser.MULTILINE_STRING = 34;
FSHParser.NUMBER = 35;
FSHParser.UNIT = 36;
FSHParser.CODE = 37;
FSHParser.DATETIME = 38;
FSHParser.TIME = 39;
FSHParser.CARD = 40;
FSHParser.REFERENCE = 41;
FSHParser.CARET_SEQUENCE = 42;
FSHParser.COMMA_DELIMITED_SEQUENCES = 43;
FSHParser.SEQUENCE = 44;
FSHParser.WHITESPACE = 45;
FSHParser.BLOCK_COMMENT = 46;
FSHParser.LINE_COMMENT = 47;

FSHParser.RULE_doc = 0;
FSHParser.RULE_entity = 1;
FSHParser.RULE_alias = 2;
FSHParser.RULE_profile = 3;
FSHParser.RULE_extension = 4;
FSHParser.RULE_instance = 5;
FSHParser.RULE_sdMetadata = 6;
FSHParser.RULE_sdRule = 7;
FSHParser.RULE_invariant = 8;
FSHParser.RULE_invariantMetadata = 9;
FSHParser.RULE_parent = 10;
FSHParser.RULE_id = 11;
FSHParser.RULE_title = 12;
FSHParser.RULE_description = 13;
FSHParser.RULE_expression = 14;
FSHParser.RULE_xpath = 15;
FSHParser.RULE_severity = 16;
FSHParser.RULE_cardRule = 17;
FSHParser.RULE_flagRule = 18;
FSHParser.RULE_valueSetRule = 19;
FSHParser.RULE_fixedValueRule = 20;
FSHParser.RULE_containsRule = 21;
FSHParser.RULE_onlyRule = 22;
FSHParser.RULE_obeysRule = 23;
FSHParser.RULE_caretValueRule = 24;
FSHParser.RULE_path = 25;
FSHParser.RULE_paths = 26;
FSHParser.RULE_caretPath = 27;
FSHParser.RULE_flag = 28;
FSHParser.RULE_strength = 29;
FSHParser.RULE_value = 30;
FSHParser.RULE_item = 31;
FSHParser.RULE_code = 32;
FSHParser.RULE_quantity = 33;
FSHParser.RULE_ratio = 34;
FSHParser.RULE_ratioPart = 35;
FSHParser.RULE_bool = 36;
FSHParser.RULE_targetType = 37;


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
        this.state = 79;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_ALIAS) | (1 << FSHParser.KW_PROFILE) | (1 << FSHParser.KW_EXTENSION) | (1 << FSHParser.KW_INSTANCE) | (1 << FSHParser.KW_INVARIANT))) !== 0)) {
            this.state = 76;
            this.entity();
            this.state = 81;
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
        this.state = 87;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_ALIAS:
            this.enterOuterAlt(localctx, 1);
            this.state = 82;
            this.alias();
            break;
        case FSHParser.KW_PROFILE:
            this.enterOuterAlt(localctx, 2);
            this.state = 83;
            this.profile();
            break;
        case FSHParser.KW_EXTENSION:
            this.enterOuterAlt(localctx, 3);
            this.state = 84;
            this.extension();
            break;
        case FSHParser.KW_INVARIANT:
            this.enterOuterAlt(localctx, 4);
            this.state = 85;
            this.invariant();
            break;
        case FSHParser.KW_INSTANCE:
            this.enterOuterAlt(localctx, 5);
            this.state = 86;
            this.instance();
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
        this.state = 89;
        this.match(FSHParser.KW_ALIAS);
        this.state = 90;
        this.match(FSHParser.SEQUENCE);
        this.state = 91;
        this.match(FSHParser.EQUAL);
        this.state = 92;
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
        this.state = 94;
        this.match(FSHParser.KW_PROFILE);
        this.state = 95;
        this.match(FSHParser.SEQUENCE);
        this.state = 97; 
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        do {
            this.state = 96;
            this.sdMetadata();
            this.state = 99; 
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        } while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_PARENT) | (1 << FSHParser.KW_ID) | (1 << FSHParser.KW_TITLE) | (1 << FSHParser.KW_DESCRIPTION))) !== 0));
        this.state = 104;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.STAR) {
            this.state = 101;
            this.sdRule();
            this.state = 106;
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
        this.state = 107;
        this.match(FSHParser.KW_EXTENSION);
        this.state = 108;
        this.match(FSHParser.SEQUENCE);
        this.state = 112;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_PARENT) | (1 << FSHParser.KW_ID) | (1 << FSHParser.KW_TITLE) | (1 << FSHParser.KW_DESCRIPTION))) !== 0)) {
            this.state = 109;
            this.sdMetadata();
            this.state = 114;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 118;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.STAR) {
            this.state = 115;
            this.sdRule();
            this.state = 120;
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

InstanceContext.prototype.SEQUENCE = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(FSHParser.SEQUENCE);
    } else {
        return this.getToken(FSHParser.SEQUENCE, i);
    }
};


InstanceContext.prototype.KW_INSTANCEOF = function() {
    return this.getToken(FSHParser.KW_INSTANCEOF, 0);
};

InstanceContext.prototype.title = function() {
    return this.getTypedRuleContext(TitleContext,0);
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
    this.enterRule(localctx, 10, FSHParser.RULE_instance);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 121;
        this.match(FSHParser.KW_INSTANCE);
        this.state = 122;
        this.match(FSHParser.SEQUENCE);
        this.state = 123;
        this.match(FSHParser.KW_INSTANCEOF);
        this.state = 124;
        this.match(FSHParser.SEQUENCE);
        this.state = 126;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.KW_TITLE) {
            this.state = 125;
            this.title();
        }

        this.state = 131;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.STAR) {
            this.state = 128;
            this.fixedValueRule();
            this.state = 133;
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
    this.enterRule(localctx, 12, FSHParser.RULE_sdMetadata);
    try {
        this.state = 138;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_PARENT:
            this.enterOuterAlt(localctx, 1);
            this.state = 134;
            this.parent();
            break;
        case FSHParser.KW_ID:
            this.enterOuterAlt(localctx, 2);
            this.state = 135;
            this.id();
            break;
        case FSHParser.KW_TITLE:
            this.enterOuterAlt(localctx, 3);
            this.state = 136;
            this.title();
            break;
        case FSHParser.KW_DESCRIPTION:
            this.enterOuterAlt(localctx, 4);
            this.state = 137;
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
    this.enterRule(localctx, 14, FSHParser.RULE_sdRule);
    try {
        this.state = 148;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,9,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 140;
            this.cardRule();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 141;
            this.flagRule();
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 142;
            this.valueSetRule();
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 143;
            this.fixedValueRule();
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 144;
            this.containsRule();
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 145;
            this.onlyRule();
            break;

        case 7:
            this.enterOuterAlt(localctx, 7);
            this.state = 146;
            this.obeysRule();
            break;

        case 8:
            this.enterOuterAlt(localctx, 8);
            this.state = 147;
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
    this.enterRule(localctx, 16, FSHParser.RULE_invariant);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 150;
        this.match(FSHParser.KW_INVARIANT);
        this.state = 151;
        this.match(FSHParser.SEQUENCE);
        this.state = 153; 
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        do {
            this.state = 152;
            this.invariantMetadata();
            this.state = 155; 
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
    this.enterRule(localctx, 18, FSHParser.RULE_invariantMetadata);
    try {
        this.state = 161;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.KW_DESCRIPTION:
            this.enterOuterAlt(localctx, 1);
            this.state = 157;
            this.description();
            break;
        case FSHParser.KW_EXPRESSION:
            this.enterOuterAlt(localctx, 2);
            this.state = 158;
            this.expression();
            break;
        case FSHParser.KW_XPATH:
            this.enterOuterAlt(localctx, 3);
            this.state = 159;
            this.xpath();
            break;
        case FSHParser.KW_SEVERITY:
            this.enterOuterAlt(localctx, 4);
            this.state = 160;
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
    this.enterRule(localctx, 20, FSHParser.RULE_parent);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 163;
        this.match(FSHParser.KW_PARENT);
        this.state = 164;
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
    this.enterRule(localctx, 22, FSHParser.RULE_id);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 166;
        this.match(FSHParser.KW_ID);
        this.state = 167;
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
    this.enterRule(localctx, 24, FSHParser.RULE_title);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 169;
        this.match(FSHParser.KW_TITLE);
        this.state = 170;
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
    this.enterRule(localctx, 26, FSHParser.RULE_description);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 172;
        this.match(FSHParser.KW_DESCRIPTION);
        this.state = 173;
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
    this.enterRule(localctx, 28, FSHParser.RULE_expression);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 175;
        this.match(FSHParser.KW_EXPRESSION);
        this.state = 176;
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
    this.enterRule(localctx, 30, FSHParser.RULE_xpath);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 178;
        this.match(FSHParser.KW_XPATH);
        this.state = 179;
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
    this.enterRule(localctx, 32, FSHParser.RULE_severity);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 181;
        this.match(FSHParser.KW_SEVERITY);
        this.state = 182;
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
    this.enterRule(localctx, 34, FSHParser.RULE_cardRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 184;
        this.match(FSHParser.STAR);
        this.state = 185;
        this.path();
        this.state = 186;
        this.match(FSHParser.CARD);
        this.state = 190;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_MOD) | (1 << FSHParser.KW_MS) | (1 << FSHParser.KW_SU))) !== 0)) {
            this.state = 187;
            this.flag();
            this.state = 192;
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
    this.enterRule(localctx, 36, FSHParser.RULE_flagRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 193;
        this.match(FSHParser.STAR);
        this.state = 196;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case FSHParser.SEQUENCE:
            this.state = 194;
            this.path();
            break;
        case FSHParser.COMMA_DELIMITED_SEQUENCES:
            this.state = 195;
            this.paths();
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
        }
        this.state = 199; 
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        do {
            this.state = 198;
            this.flag();
            this.state = 201; 
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
    this.enterRule(localctx, 38, FSHParser.RULE_valueSetRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 203;
        this.match(FSHParser.STAR);
        this.state = 204;
        this.path();
        this.state = 205;
        this.match(FSHParser.KW_FROM);
        this.state = 206;
        this.match(FSHParser.SEQUENCE);
        this.state = 208;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_EXAMPLE) | (1 << FSHParser.KW_PREFERRED) | (1 << FSHParser.KW_EXTENSIBLE) | (1 << FSHParser.KW_REQUIRED))) !== 0)) {
            this.state = 207;
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
    this.enterRule(localctx, 40, FSHParser.RULE_fixedValueRule);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 210;
        this.match(FSHParser.STAR);
        this.state = 211;
        this.path();
        this.state = 212;
        this.match(FSHParser.EQUAL);
        this.state = 213;
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
    this.enterRule(localctx, 42, FSHParser.RULE_containsRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 215;
        this.match(FSHParser.STAR);
        this.state = 216;
        this.path();
        this.state = 217;
        this.match(FSHParser.KW_CONTAINS);
        this.state = 218;
        this.item();
        this.state = 223;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.KW_AND) {
            this.state = 219;
            this.match(FSHParser.KW_AND);
            this.state = 220;
            this.item();
            this.state = 225;
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
    this.enterRule(localctx, 44, FSHParser.RULE_onlyRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 226;
        this.match(FSHParser.STAR);
        this.state = 227;
        this.path();
        this.state = 228;
        this.match(FSHParser.KW_ONLY);
        this.state = 229;
        this.targetType();
        this.state = 234;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.KW_OR) {
            this.state = 230;
            this.match(FSHParser.KW_OR);
            this.state = 231;
            this.targetType();
            this.state = 236;
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
    this.enterRule(localctx, 46, FSHParser.RULE_obeysRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 237;
        this.match(FSHParser.STAR);
        this.state = 239;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.SEQUENCE) {
            this.state = 238;
            this.path();
        }

        this.state = 241;
        this.match(FSHParser.KW_OBEYS);
        this.state = 242;
        this.match(FSHParser.SEQUENCE);
        this.state = 247;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===FSHParser.KW_AND) {
            this.state = 243;
            this.match(FSHParser.KW_AND);
            this.state = 244;
            this.match(FSHParser.SEQUENCE);
            this.state = 249;
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
    this.enterRule(localctx, 48, FSHParser.RULE_caretValueRule);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 250;
        this.match(FSHParser.STAR);
        this.state = 252;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.SEQUENCE) {
            this.state = 251;
            this.path();
        }

        this.state = 254;
        this.caretPath();
        this.state = 255;
        this.match(FSHParser.EQUAL);
        this.state = 256;
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
    this.enterRule(localctx, 50, FSHParser.RULE_path);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 258;
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
    this.enterRule(localctx, 52, FSHParser.RULE_paths);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 260;
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
    this.enterRule(localctx, 54, FSHParser.RULE_caretPath);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 262;
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
    this.enterRule(localctx, 56, FSHParser.RULE_flag);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 264;
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
    this.enterRule(localctx, 58, FSHParser.RULE_strength);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 266;
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
    this.enterRule(localctx, 60, FSHParser.RULE_value);
    try {
        this.state = 277;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,21,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 268;
            this.match(FSHParser.STRING);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 269;
            this.match(FSHParser.MULTILINE_STRING);
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 270;
            this.match(FSHParser.NUMBER);
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 271;
            this.match(FSHParser.DATETIME);
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 272;
            this.match(FSHParser.TIME);
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 273;
            this.code();
            break;

        case 7:
            this.enterOuterAlt(localctx, 7);
            this.state = 274;
            this.quantity();
            break;

        case 8:
            this.enterOuterAlt(localctx, 8);
            this.state = 275;
            this.ratio();
            break;

        case 9:
            this.enterOuterAlt(localctx, 9);
            this.state = 276;
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
    this.enterRule(localctx, 62, FSHParser.RULE_item);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 279;
        this.match(FSHParser.SEQUENCE);
        this.state = 280;
        this.match(FSHParser.CARD);
        this.state = 284;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << FSHParser.KW_MOD) | (1 << FSHParser.KW_MS) | (1 << FSHParser.KW_SU))) !== 0)) {
            this.state = 281;
            this.flag();
            this.state = 286;
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
    this.enterRule(localctx, 64, FSHParser.RULE_code);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 287;
        this.match(FSHParser.CODE);
        this.state = 289;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===FSHParser.STRING) {
            this.state = 288;
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
    this.enterRule(localctx, 66, FSHParser.RULE_quantity);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 291;
        this.match(FSHParser.NUMBER);
        this.state = 292;
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
    this.enterRule(localctx, 68, FSHParser.RULE_ratio);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 294;
        this.ratioPart();
        this.state = 295;
        this.match(FSHParser.COLON);
        this.state = 296;
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
    this.enterRule(localctx, 70, FSHParser.RULE_ratioPart);
    try {
        this.state = 300;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,24,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 298;
            this.match(FSHParser.NUMBER);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 299;
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
    this.enterRule(localctx, 72, FSHParser.RULE_bool);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 302;
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

TargetTypeContext.prototype.REFERENCE = function() {
    return this.getToken(FSHParser.REFERENCE, 0);
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
    this.enterRule(localctx, 74, FSHParser.RULE_targetType);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 304;
        _la = this._input.LA(1);
        if(!(_la===FSHParser.REFERENCE || _la===FSHParser.SEQUENCE)) {
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


exports.FSHParser = FSHParser;
