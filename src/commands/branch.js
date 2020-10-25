const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { Observable }  = require('rxjs');

const { getConfig }                   = require('../config/config');
const { expandPath, checkWorkspace }  = require('../config/helpers');

const {
  checkoutBranch,
  fetchAll,
  resetRepository,
} = require('../handlers/branch');
const {
  resetEnvironment,
  cloneService
} = require('../handlers/setup');


/* TASKS */

/**
 * Checkout a template branch.
 * @param {string}     name template name
 * @param {string}   remote upstream remote
 * @param {string}   branch target branch
 * @param {boolean} verbose global _verbose_ option
 */
const checkoutTemplateBranch = (title, name, remote, branch, verbose) => {

  const { cwd, templates } = getConfig();

  // Template matching the given name
  const template = templates.find(template => template.name === name);

  return {

    title,

    task: () => new Observable(async observer => {

      const templatePath = expandPath(template.name);

      try {

        // Fetch latest changes from remote
        observer.next('Fetching all from remote');
        await fetchAll(cwd, templatePath, verbose);

        // Force checkout to target branch
        observer.next(`Forcefully checking ${branch}`);
        await checkoutBranch(cwd, templatePath, branch, verbose);

        // Move branch HEAD to the latest commit
        observer.next('Moving HEAD to the latest commit');
        await resetRepository(cwd, templatePath, remote, branch, verbose);

      }
      catch (error) {
        observer.error(error);
      }

      observer.complete();

    }),

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

    skip: async () => {
      const exists = await checkWorkspace();

      if (!exists.services)
        return 'No services installed';

      if (!services)
        return `No services are associated with ${template.name}`;
    },

    task: () => new Listr(
      services.map(service => {

        const serviceCwdPath = expandPath(service.name);

        return {

          title: `${service.name}`,

          skip: async () => await checkWorkspace(cwd, serviceCwdPath)
            ? false
            : 'Service is not installed',

          task: () => new Listr([
            {
              title: 'Remove existing service',
              task: () => resetEnvironment(cwd, serviceCwdPath),
            },
            {
              title: 'Clone service',
              task: () => cloneService(cwd, expandPath(template.name), serviceCwdPath, verbose)
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

exports.describe = 'Checkout a new repository branch';

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

  tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });
};
