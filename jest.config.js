module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^antlr4(.*)$': '<rootDir>/node_modules/antlr4/src/antlr4$1'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'ts-jest'
  },
  testMatch: ['**/test/**/*.test.(ts|js)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['jest-extended'],
  coveragePathIgnorePatterns: ['<rootDir>/src/import/generated/']
};
