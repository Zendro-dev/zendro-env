const { commandSync }            = require('execa');
const { readFileSync, statSync } = require('fs');
const { platform }               = require('os');
const { join }                   = require('path');
const { cwd }                    = require('process');

require('./typings');


/* CONFIGURATION */

// Get config file path, if it exists
const configNames = ['.testenv.json', '.testenvrc'];
let configPath;

for (const name of configNames) {

  try {
    configPath = join(cwd(), name);
    statSync(configPath);
  }
  catch (error) {
    if (error.code !== 'ENOENT')
      throw error;
    configPath = null;
  }

  if (configPath)
    break;
}

if (!configPath) throw new Error(
  'To use the zendro-env CLI, a properly configured ".testenvrc" or' +
  ' ".testenv.json" file is required in the project folder'
);
console.log(`\nLoaded configuration: "${configPath}"`);

// Read config file and set defaults
/** @type {EnvConfig} */
const config = JSON.parse(
  readFileSync(configPath, { encoding: 'utf-8'})
);

if (!config.cwd) {
  config.cwd = cwd();
}

if (!config.env) {
  config.env = {};
}


/* ENVIRONMENT */

let runtimeEnv = {};
const os = platform();

try {
  const userId  = commandSync('id -u').stdout;
  const groupId = commandSync('id -g').stdout;
  runtimeEnv.UID = `${userId}:${groupId}`;
  console.log(
    `Starting zendro-env in ${os} as user:group ${userId}:${groupId}`
  );
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


/* AUXILIARY FUNCTIONS */

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