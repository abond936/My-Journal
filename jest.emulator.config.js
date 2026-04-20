module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-dnd|@react-dnd|dnd-core|react-dnd-html5-backend)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  testEnvironment: 'node',
  // Keep emulator/integration tests isolated from browser-focused setup.
  setupFilesAfterEnv: [],
};
