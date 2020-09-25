/**
 * @typedef  {Object} EnvConfig Testing environment configuration
 * @property {string}       cwd       path to workspace folder
 * @property {string}       docker    path to docker-compose file
 * @property {Service[]}    services  api and spa test services
 * @property {ModelDef[]}   models    codegen models
 * @property {PatchDef[]}   patches   codegen patches
 * @property {EnvTemplates} templates repository templates
**/

//

/**
 * @typedef  {Object} Service Testing environment instances
 * @property {string} template repository template to use
 * @property {string} name     unique name of this service
 * @property {number} port     public port for sending requests to this service
**/

//

/**
 * @typedef  {Object} ModelDef Environment model definition
 * @property {string}   path   relative location of the model definitions
 * @property {string[]} target gql- and spa-instances to which these models apply
**/

//

/**
 * @typedef  {Object} PatchDef Patch definition object
 * @property {string[]} args patch command arguments
 * @property {string}   src  patch source file path
 * @property {string}   dest file to be patched
**/

//

/**
 * @typedef  {Object} EnvTemplates Testing environment templates
 * @property {TemplateDef} gql         graphql-server template
 * @property {TemplateDef} gql-codegen graphql-server-model-codegen template
 * @property {TemplateDef} spa         single-page-app template
 * @property {TemplateDef} spa-codegen single-page-app-codegen template
**/

/**
 * @typedef  {Object} TemplateDef Testing environment template definition.
 * @property {string}  branch name of the branch to clone
 * @property {boolean} source use this element as source (do _not_ clone)
 * @property {string}  url    address to local or remote .git repository
**/