const { cwd }  = require('process');
const { join } = require('path');


module.exports = {
  collectCoverage: true,
  setupFilesAfterEnv: ['./jest.setup.js'],
  testEnvironment: 'node',
  testMatch: [
    join(cwd(), '/tests/?(*.)+(test).js'),
  ],
  verbose: true,
};