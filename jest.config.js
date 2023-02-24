module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/test/tsconfig.json'
    }
  },
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: {
    '^antlr4(.*)$': '<rootDir>/node_modules/antlr4/src/antlr4$1'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'ts-jest'
  },
  testMatch: ['**/test/**/*.test.(ts|js)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['jest-extended/all'],
  coveragePathIgnorePatterns: ['<rootDir>/src/import/generated/'],
  preset: 'ts-jest'
};
