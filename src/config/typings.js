/**
 * @typedef  {Object} EnvConfig Testing environment configuration
 * @property {string}              cwd path to workspace folder
 * @property {string}           docker path to docker-compose file
 * @property {Service[]}      services api and spa test services
 * @property {ModelDef[]}       models codegen models
 * @property {PatchDef[]}      patches codegen patches
 * @property {TemplateDef[]} templates repository templates
**/

//

/**
 * @typedef  {Object} Service Testing environment instances
 * @property {string} template repository template to use
 * @property {string}     name unique name of this service
 * @property {number}      url public port for sending requests to this service
**/

//

/**
 * @typedef  {Object} ModelDef Environment model definition
 * @property {string[]}   opts options array for the code-generator
 * @property {string}     path relative location of the model definitions
 * @property {string[]} target gql- and spa-instances to which these models apply
**/

//

/**
 * @typedef  {Object} PatchDef Patch definition object
 * @property {string[]} opts patch command arguments
 * @property {string}    src patch source file path
 * @property {string}   dest file to be patched
**/

//

/**
 * @typedef  {Object} TemplateDef Testing environment template definition.
 * @property {string}    name unique name for this template
 * @property {string}  branch name of the branch to clone
 * @property {boolean} source use this template as source (do _not_ clone it)
 * @property {string}     url address to local or remote .git repository
**/
