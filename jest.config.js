module.exports = {
  moduleFileExtensions: ['js', 'ts'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/test/tsconfig.json'
      }
    ]
  },
  testMatch: ['**/test/**/*.test.(ts|js)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['jest-extended/all'],
  coveragePathIgnorePatterns: ['<rootDir>/src/import/generated/'],
  preset: 'ts-jest',
  maxWorkers: '50%'
};
