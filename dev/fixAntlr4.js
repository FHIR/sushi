/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * The purpose of this script is to modify the configuration.
 * of the antlr4 dependency. This is necessary as a workaround
 * in order to avoid performance problems from antlr4.
 * The fix is taken from https://github.com/antlr/antlr4/pull/4323
 * This script can be removed when the fix is available as part of
 * a published NPM package.
 */

const fs = require('fs-extra');
const path = require('path');

const antlr4BabelPath = path.join(__dirname, '..', 'node_modules', 'antlr4', '.babelrc');
const babelContents = {
  presets: ['@babel/preset-env'],
  targets: 'defaults'
};
fs.writeJSONSync(antlr4BabelPath, babelContents);
