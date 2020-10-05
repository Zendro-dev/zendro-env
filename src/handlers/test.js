const { command }        = require('execa');
const { statSync }       = require('fs');
const { parse, resolve } = require('path');
const { exit }           = require('process');
const { expandPath }     = require('../config/helpers');


/**
 * Launch an environment test runner.
 * @param {string}      cwd path to environment folder
 * @param {Test}       test environment test runner
 * @param {boolean} verbose global verbose option
 */
exports.runTest = async function (cwd, test, verbose) {

  const { target, options, runner } = test;

  // Expand target path if needed
  const targetPath = resolve(cwd, expandPath(target));

  // Determine runner working directory
  const { dir: testFileCwd, base: testFile } = parse(targetPath);

  // Check whether the path exists and a test file is specified
  let isFile = false;
  try {
    isFile = statSync(targetPath).isFile();
  }
  catch (err) {
    console.log(err.message);
    exit(err.errno);
  }

  // Launch the test-runner
  await command(`npx ${runner} ${isFile ? `${testFile} --no-config` : ''} ${options ?? ''}`, {
    cwd: isFile ? testFileCwd : targetPath,
    stdio: 'inherit'
  });

};