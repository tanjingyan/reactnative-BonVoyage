module.exports = {
  testEnvironment: 'node',

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          types: ['jest', 'node'],
        },
      },
    ],
  },

  testMatch: [
    '**/__tests__/**/*.test.ts',
  ],
};