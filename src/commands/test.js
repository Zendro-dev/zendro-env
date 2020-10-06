const { getConfig }   = require('../config/config');
const { runTest }     = require('../handlers/test');


exports.command = 'test [names...]';

exports.describe = 'Launch a configured test runner';

exports.builder = {};

/**
 * Command execution handler.
 *
 * @typedef  {Object} TestOpts
 * @property {string[]}   names
 * @property {boolean}  verbose
 *
 * @param {TestOpts} opts test command options
 */
exports.handler = async (opts) => {

  const { cwd, tests }     = getConfig();
  const { names, verbose } = opts;

  // tests
  //   .filter(test => names === undefined || names.includes(test.name))
  //   .forEach(async test => await runTest(cwd, test, verbose));

  for (const test of tests) {

    // Skip test if name arguments are provided and the test name is not included
    if (names && !names.includes(test.name))
      continue;

    await runTest(cwd, test, verbose);

  }

};