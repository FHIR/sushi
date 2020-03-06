// Generated from FSH.g4 by ANTLR 4.8
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete generic visitor for a parse tree produced by FSHParser.

function FSHVisitor() {
	antlr4.tree.ParseTreeVisitor.call(this);
	return this;
}

FSHVisitor.prototype = Object.create(antlr4.tree.ParseTreeVisitor.prototype);
FSHVisitor.prototype.constructor = FSHVisitor;

// Visit a parse tree produced by FSHParser#doc.
FSHVisitor.prototype.visitDoc = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#entity.
FSHVisitor.prototype.visitEntity = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#alias.
FSHVisitor.prototype.visitAlias = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#profile.
FSHVisitor.prototype.visitProfile = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#extension.
FSHVisitor.prototype.visitExtension = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#sdMetadata.
FSHVisitor.prototype.visitSdMetadata = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#sdRule.
FSHVisitor.prototype.visitSdRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#instance.
FSHVisitor.prototype.visitInstance = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#instanceMetadata.
FSHVisitor.prototype.visitInstanceMetadata = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#invariant.
FSHVisitor.prototype.visitInvariant = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#invariantMetadata.
FSHVisitor.prototype.visitInvariantMetadata = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#valueSet.
FSHVisitor.prototype.visitValueSet = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsMetadata.
FSHVisitor.prototype.visitVsMetadata = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#codeSystem.
FSHVisitor.prototype.visitCodeSystem = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#csMetadata.
FSHVisitor.prototype.visitCsMetadata = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#parent.
FSHVisitor.prototype.visitParent = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#id.
FSHVisitor.prototype.visitId = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#title.
FSHVisitor.prototype.visitTitle = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#description.
FSHVisitor.prototype.visitDescription = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#expression.
FSHVisitor.prototype.visitExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#xpath.
FSHVisitor.prototype.visitXpath = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#severity.
FSHVisitor.prototype.visitSeverity = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#instanceOf.
FSHVisitor.prototype.visitInstanceOf = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#cardRule.
FSHVisitor.prototype.visitCardRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#flagRule.
FSHVisitor.prototype.visitFlagRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#valueSetRule.
FSHVisitor.prototype.visitValueSetRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#fixedValueRule.
FSHVisitor.prototype.visitFixedValueRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#containsRule.
FSHVisitor.prototype.visitContainsRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#onlyRule.
FSHVisitor.prototype.visitOnlyRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#obeysRule.
FSHVisitor.prototype.visitObeysRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#caretValueRule.
FSHVisitor.prototype.visitCaretValueRule = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsComponent.
FSHVisitor.prototype.visitVsComponent = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsConceptComponent.
FSHVisitor.prototype.visitVsConceptComponent = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsFilterComponent.
FSHVisitor.prototype.visitVsFilterComponent = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsComponentFrom.
FSHVisitor.prototype.visitVsComponentFrom = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsFromSystem.
FSHVisitor.prototype.visitVsFromSystem = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsFromValueset.
FSHVisitor.prototype.visitVsFromValueset = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsFilterList.
FSHVisitor.prototype.visitVsFilterList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsFilterDefinition.
FSHVisitor.prototype.visitVsFilterDefinition = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsFilterOperator.
FSHVisitor.prototype.visitVsFilterOperator = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#vsFilterValue.
FSHVisitor.prototype.visitVsFilterValue = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#path.
FSHVisitor.prototype.visitPath = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#paths.
FSHVisitor.prototype.visitPaths = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#caretPath.
FSHVisitor.prototype.visitCaretPath = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#flag.
FSHVisitor.prototype.visitFlag = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#strength.
FSHVisitor.prototype.visitStrength = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#value.
FSHVisitor.prototype.visitValue = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#item.
FSHVisitor.prototype.visitItem = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#code.
FSHVisitor.prototype.visitCode = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#concept.
FSHVisitor.prototype.visitConcept = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#quantity.
FSHVisitor.prototype.visitQuantity = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#ratio.
FSHVisitor.prototype.visitRatio = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#reference.
FSHVisitor.prototype.visitReference = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#ratioPart.
FSHVisitor.prototype.visitRatioPart = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#bool.
FSHVisitor.prototype.visitBool = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by FSHParser#targetType.
FSHVisitor.prototype.visitTargetType = function(ctx) {
  return this.visitChildren(ctx);
};



exports.FSHVisitor = FSHVisitor;