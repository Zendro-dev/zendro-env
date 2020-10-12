jest.mock('process', () => {
  const { join } = require('path');
  return {
    cwd: () => join('tests', 'mocks')
  };
});

jest.mock('console', () => ({
  debug: console.debug,
  info:  console.info,
  log:   jest.fn(),     // disable console.log in tests
  error: console.error,
  warn:  console.warn,
}));