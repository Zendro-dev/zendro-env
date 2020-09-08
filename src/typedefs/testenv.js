/**
 * @typedef  {Object} TestEnvConfig Testing environment configuration
 * @property {string}        cwd       path to workspace
 * @property {TestInstances} instances testing instances
 * @property {EnvModels}     models    codegen models
 * @property {EnvPatches}    patches   codegen patches
 * @property {TestTemplates} templates repository templates
**/

//

/**
 * @typedef  {Object} TestInstances Testing environment instances
 * @property {string[]} gql graphql-server instance definitions
 * @property {string[]} spa single-page-app instance definitions
**/

//

/**
 * @typedef  {ModelDef[]} EnvModels Environment models
**/

/**
 * @typedef  {Object} ModelDef Environment model definition
 * @property {string}   path  relative location of the model definitions
 * @property {string[]} gql   gql-server instances to which these models apply
 * @property {string[]} spa   spa instances to which these models apply
**/

//

/**
 * @typedef  {PatchDef[]} EnvPatches Environment patches configuration
**/

/**
 * @typedef  {Object} PatchDef Patch definition object
 * @property {string} name instance name
 * @property {string} src patch source file path
 * @property {string} dest file to be patched
**/

//

/**
 * @typedef  {Object} TestTemplates Testing environment templates
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
