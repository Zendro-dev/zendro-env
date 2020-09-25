const { sync }         = require('find-up');
const { readFileSync } = require('fs');
const { cwd }          = require('process');
//
require('./typings');


// Get config file path, if it exists
const configPath = sync(['.testenv.json', '.testenvrc'], {
  cwd: cwd()
});

if (!configPath) throw new Error(
  'To use the zendro-test CLI, a properly configured ".testenvrc" or' +
  ' ".testenv.json" file is required in the project folder'
);

//  config JSON object
const config = JSON.parse(
  readFileSync(configPath, { encoding: 'utf-8'})
);


/**
 * Get workspace configuration.
 * @returns {EnvConfig} custom environment configuration
 */
exports.getConfig = function () {

  return config;

};

exports.checkConfig = function () {

  // TODO: validate config file
};