const { commandSync }  = require('execa');
const { sync }         = require('find-up');
const { readFileSync } = require('fs');
const { platform }     = require('os');
const { cwd }          = require('process');
//
require('./typings');


// Get config file path, if it exists
const configPath = sync(['.testenv.json', '.testenvrc'], {
  cwd: cwd()
});

if (!configPath) throw new Error(
  'To use the zendro-env CLI, a properly configured ".testenvrc" or' +
  ' ".testenv.json" file is required in the project folder'
);

//  config JSON object
const config = JSON.parse(
  readFileSync(configPath, { encoding: 'utf-8'})
);


let runtimeEnv = {};
const os = platform();

try {
  const userId  = commandSync('id -u').stdout;
  const groupId = commandSync('id -g').stdout;
  runtimeEnv.UID = `${userId}:${groupId}`;
  console.log(`Starting zendro-env in ${os} as user:group ${userId}:${groupId}`);
}
catch (error) {
  console.warn(
    `Current user:group IDs could not be determined in "${os}"`,
  );
}

// update ENV
process.env = {
  ...process.env,
  ...config.env,
  ...runtimeEnv,
};


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