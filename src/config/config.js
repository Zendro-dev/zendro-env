const { sync }         = require('find-up');
const { readFileSync } = require('fs');
const { cwd }          = require('process');


/* TYPES */

/**
 * @typedef  {Object} InstanceDef Testing environment instance
 * @property {string} branch name of the branch to clone
 * @property {string[]} names name of each instance
**/

/**
 * @typedef  {Object} TestInstances Testing environment instances
 * @property {InstanceDef} gql graphql-server instance definitions
 * @property {InstanceDef} spa single-page-app instance definitions
**/

/**
 * @typedef  {Object} TemplateDef Testing environment template definition.
 * @property {string} branch name of the branch to clone
 * @property {boolean} source use this element as source (do _not_ clone)
 * @property {string} url address to local or remote .git repository
**/

/**
 * @typedef  {Object} TestTemplates Testing environment templates
 * @property {TemplateDef} gql graphql-server template
 * @property {TemplateDef} gql-codegen graphql-server-model-codegen template
 * @property {TemplateDef} spa single-page-app template
 * @property {TemplateDef} spa-codegen single-page-app-codegen template
**/

/**
 * @typedef  {Object} TestEnvConfig oDesc
 * @property {string} cwd path to workspace
 * @property {TestInstances} instances testing environment instances
 * @property {TestTemplates} templates testing environment templates
**/


/* CONFIG */

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
 * @returns {TestEnvConfig} custom environment configuration
 */
exports.getConfig = function () {

  return config;

};

exports.checkConfig = function () {

  // TODO: validate config file
};