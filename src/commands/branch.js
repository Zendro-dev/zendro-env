const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');

const { getConfig }      = require('../config/config');
const { expandPath }     = require('../config/helpers');
const { checkoutBranch } = require('../handlers/branch');
const {
  checkWorkspace,
  resetEnvironment,
  cloneService
} = require('../handlers/setup');


/* TASKS */

/**
 * Checkout a template branch.
 * @param {string}       name template name
 * @param {string}     remote upstream remote
 * @param {string}     branch target branch
 * @param {boolean}   verbose global _verbose_ option
 */
const checkoutTemplateBranch = (title, name, remote, branch, verbose) => {

  const { cwd, ...config } = getConfig();

  // Matching template definition
  const template = config.templates.find(template => template.name === name);

  // Listr task
  return {
    title,
    task: () => checkoutBranch(cwd, expandPath(template.name), remote, branch, verbose),
    skip: () => {
      if (!template)
        return `Template ${name} does not exist`;

      if (template.source)
        return 'Source templates must be managed manually.';
    },
  };
};


/**
 * Recreate template dependencies.
 * @param {string}    title task title
 * @param {string}     name template name
 * @param {boolean} verbose global _verbose_ option
 */
const updateTemplateDependencies = (title, name, verbose) => {

  const { cwd, ...config } = getConfig();

  // Matching template definition
  const template = config.templates.find(template => template.name === name);

  // Associated services
  const services = config.services.filter(service => service.template === name);

  // Listr task
  return {
    title,

    enabled: () => template && !template.source,

    skip: async () => await checkWorkspace(cwd, 'services')
      ? false
      : 'No services installed',

    task: () => new Listr(
      services.map(service => {

        const serviceRelativePath = expandPath(service.name);

        return {

          title: `${service.name}`,

          skip: async () => await checkWorkspace(cwd, serviceRelativePath)
            ? false
            : 'Service is not installed',

          task: () => new Listr([
            {
              title: 'Remove existing service',
              task: () => resetEnvironment(cwd, serviceRelativePath),
            },
            {
              title: 'Clone service',
              task: () => cloneService(cwd, template.name, service.name, verbose)
            },
          ]),

        };
      }), {
        concurrent: !verbose
      }
    )
  };
};


/* COMMAND */

exports.command = 'branch <name> <remote> <branch>';

exports.describe = `Checkout a template and all of its services to a target repository branch.
                    -   name: template in the config file
                    - remote: upstream remote (usually "origin")
                    - branch: target branch to checkout into`;

exports.builder = {};

exports.branchTasks = {
  checkoutTemplateBranch,
  updateTemplateDependencies,
};

/**
 * Command execution handler.
 *
 * @typedef  {Object}  BranchOpts Branch command options
 * @property {string}        name name of the template
 * @property {string}      remote name of the upstream remote
 * @property {string}      branch name of the target branch
 * @property {boolean}    verbose global _verbose_ option
 *
 * @param {BranchOpts} opts branch command options
 */
exports.handler = (opts) => {

  const { name, remote, branch, verbose } = opts;

  const tasks = new Listr([
    checkoutTemplateBranch(`Checkout ${name} to ${branch}`, name, remote, branch, verbose),
    updateTemplateDependencies(`Update ${name} associated dependencies`, name, verbose)
  ], {
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  tasks.run().catch(err => {/**/});
};
