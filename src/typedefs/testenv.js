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