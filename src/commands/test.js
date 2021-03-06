const { getConfig } = require('../config/config');
const { runTest }   = require('../handlers/test');

/* TASKS */

/**
 * Run all or a subset of tests.
 * @param {string[]} names list of test names to run
 */
const runTests = async (names) => {

  const { cwd, tests } = getConfig();
  // tests
  //   .filter(test => names === undefined || names.includes(test.name))
  //   .forEach(async test => await runTest(cwd, test, verbose));

  if (!tests) {
    console.log('No tests have been configured');
    return;
  }

  for (const test of tests) {

    // Skip test if name arguments are provided and the test name is not included
    if (names && !names.includes(test.name))
      continue;

    await runTest(cwd, test);

  }

};

/* COMMAND */

exports.command = 'test [names...]';

exports.describe = 'Launch a configured test runner';

exports.builder = {};

exports.testTasks = {
  runTests,
};

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

  const { names } = opts;

  await runTests(names);

};
