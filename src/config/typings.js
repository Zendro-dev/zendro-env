/**
 * @typedef  {Object}    EnvConfig Environment configuration
 * @property {string}          cwd path to workspace folder
 * @property {Env}             env environment variables
 * @property {string}       docker path to docker-compose file
 * @property {Service[]}  services api and spa test services
 * @property {Model[]}      models codegen models
 * @property {Patch[]}     patches codegen patches
 * @property {Test[]}        tests test runners
**/

//

/**
 * @typedef  {Object<string,string|number|boolean>} Env Environment variables
**/

//

/**
 * @typedef  {Object}  Service Configured graphql-server and single-page-app services
 * @property {string}   branch parent template branch
 * @property {string}     name unique name of this service
 * @property {string} template parent repository address or local path
 * @property {string}      url public address for sending requests to this service
**/

//

/**
 * @typedef  {Object}     Model Configured model definitions
 * @property {string}   codegen code generator repository for these models
 * @property {string[]} options options array for the code-generator
 * @property {string}      path relative location of the model definitions
 * @property {string[]} targets gql- and spa-instances to which these models apply
**/

//

/**
 * @typedef  {Object}     Patch Configured patch
 * @property {string[]} options patch command arguments
 * @property {string}      path path to patch file
 * @property {string}    target target file to be patched
**/

//

/**
 * @typedef  {Object}   Test Configured test runnner
 * @property {string}   name unique name for the test
 * @property {string} runner executable name
 * @property {string} target path to a tests file or runner config directory
**/
