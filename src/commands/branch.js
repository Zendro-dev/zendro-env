const Listr            = require('listr');
const VerboseRenderer  = require('listr-verbose-renderer');
const UpdaterRenderer  = require('listr-update-renderer');
const { Observable }   = require('rxjs');
const { getConfig }    = require('../config/config');
const { parseService } = require('../config/helpers');

const {
  checkoutBranch,
  cloneRepository,
  resetRepository,
} = require('../handlers/git');

const {
  resetEnvironment,
  renamePackageJson
} = require('../handlers/setup');


/* TASKS */

/**
 * Checkout a template branch.
 * @param {string}     name template name
 * @param {string}   remote upstream remote
 * @param {string}   branch target branch
 * @param {boolean} verbose global _verbose_ option
 */
const checkoutServiceBranch = (title, serviceName, branch, verbose) => ({

  title,

  task: (ctx, task) => new Observable(async observer => {

    const { cwd, services } = getConfig();

    const serviceJson = services.find(serviceJson => serviceJson.name === serviceName);

    if (!serviceJson) {
      observer.error(new Error(`service ${serviceName} is not configured`));
      observer.complete();
    }

    try {

      const { template, ...service } = await parseService(serviceJson);

      if (template.source) {
        task.skip(`source service "${service.name}" should be managed manually`);
        observer.complete();
      }

      else if (!template.installed) {
        observer.error(new Error(`cache for service "${service.name}" needs to be setup first`));
        observer.complete();
      }

      else {

        // Force checkout to target branch
        observer.next(`forcefully checkout ${branch}`);
        await checkoutBranch(cwd, template.path, branch, verbose);

        // Move branch HEAD to the latest commit
        observer.next('moving HEAD to the latest commit');
        await resetRepository(cwd, template.path, branch, verbose);

        observer.next(`removing ${service.name}`);
        await resetEnvironment(cwd, service.path);

        observer.next(`cloning ${branch} from ${template.path}`);
        await cloneRepository(cwd, {
          branch: branch,
          source: template.path,
          output: service.path,
          verbose,
        });

        observer.next(`renaming module to ${service.name}`);
        await renamePackageJson(cwd, service.path);

        observer.next(`return cache to ${service.branch}`);
      }

    }
    catch (error) {
      observer.error(error);
    }

    observer.complete();

  }),
});


/* COMMAND */

exports.command = 'branch <service> <branch>';

exports.describe = 'Checkout a service to a different branch';

exports.builder = {};

exports.branchTasks = {
  checkoutServiceBranch,
};

/**
 * Command execution handler.
 *
 * @typedef  {Object}  BranchOpts Branch command options
 * @property {string}     service name of the service
 * @property {string}      branch branch to checkout
 * @property {boolean}    verbose global _verbose_ option
 *
 * @param {BranchOpts} opts branch command options
 */
exports.handler = (opts) => {

  const { service, branch, verbose } = opts;

  const tasks = new Listr([
    checkoutServiceBranch(`Checkout ${service} to ${branch}`, service, branch, verbose),
  ], {
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });
};
