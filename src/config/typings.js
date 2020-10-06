/**
 * @typedef  {Object}     EnvConfig Testing environment configuration
 * @property {string}           cwd path to workspace folder
 * @property {string}        docker path to docker-compose file
 * @property {Service[]}   services api and spa test services
 * @property {Model[]}       models codegen models
 * @property {Patch[]}      patches codegen patches
 * @property {Template[]} templates repository templates
 * @property {Test[]}         tests test runners
 * @property {Env}              env environment variables
**/

//

/**
 * @typedef  {Object}  Service Service definition object
 * @property {string}  codegen name of its code generator template
 * @property {string}     name unique name of this service
 * @property {string} template repository template to use
 * @property {number}      url public port for sending requests to this service
**/

//

/**
 * @typedef  {Object}    Model Environment model definition
 * @property {string[]}   opts options array for the code-generator
 * @property {string}     path relative location of the model definitions
 * @property {string[]} target gql- and spa-instances to which these models apply
**/

//

/**
 * @typedef  {Object}  Patch Patch definition object
 * @property {string[]} opts patch command arguments
 * @property {string}    src patch source file path
 * @property {string}   dest file to be patched
**/

//

/**
 * @typedef  {Object} Template Testing environment template definition.
 * @property {string}     name unique name for this template
 * @property {string}   branch name of the branch to clone
 * @property {boolean}  source use this template as source (do _not_ clone it)
 * @property {string}      url address to local or remote .git repository
**/

//

/**
 * @typedef  {Object} Test Test runner environment definition
 * @property {string}   name test runner unique name
 * @property {string} runner test runner command
 * @property {string} target path to the tests file or config directory
**/

//

/**
 * @typedef  {Object<string,string|number|boolean>} Env Environment variables
**/
