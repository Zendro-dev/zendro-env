const Listr                = require('listr');
const VerboseRenderer      = require('listr-verbose-renderer');
const UpdaterRenderer      = require('listr-update-renderer');
const { getConfig }        = require('../config/config');
const { resetEnvironment } = require('../handlers/setup');
const { deleteDockerEnv }  = require('../handlers/docker');


/* TASKS */

/**
 * Destroy containers, images, and volumes.
 * @param {string}          title task title
 * @param {string}            cwd path to working directory
 * @param {string}         docker path to docker-compose file
 * @param {boolean}       verbose global _verbose_option
 * @param {() => boolean} enabled whether the task is enabled
 */
const destroyDockerEnv = (title, cwd, docker, verbose, enabled) => ({
  title,
  task: () => deleteDockerEnv(cwd, docker, verbose),
  enabled,
});


/**
 * Fully or partially destroy the working environment.
 * @param {string}             title task title
 * @param {string}               cwd path to working directory
 * @param {string}        folderName workspace subfolder
 * @param {() => boolean}    enabled whether the task is enabled
 */
const destroyWorkEnv = (title, cwd, folderName, enabled) => ({
  title,
  task: () => resetEnvironment(cwd, folderName, false),
  enabled,
});


/* COMMAND */

exports.command = 'destroy';

exports.describe = 'Remove a testing environment.';

exports.builder = {
  compose: {
    describe: 'Delete docker containers, images, and volumes',
    group: 'Destroy',
    type: 'boolean'
  },
  modules: {
    describe: 'Delete installed node modules',
    group: 'Destroy',
    type: 'boolean'
  },
  service: {
    describe: 'Delete installed services',
    group: 'Destroy',
    type: 'boolean'
  },
  template: {
    describe: 'Delete cloned templates',
    group: 'Destroy',
    type: 'boolean'
  },
};

exports.destroyTasks = {
  destroyDockerEnv,
  destroyWorkEnv,
};

/**
 * Destroy command execution handler.
 *
 * @typedef  {Object} DestroyOpts
 * @property {boolean}  compose delete docker-compose containers, images, and volumes
 * @property {boolean}  modules delete installed node modules
 * @property {boolean}  service delete cloned services
 * @property {boolean} template delete cloned templates
 * @property {boolean}  verbose global _verbose_ option
 *
 * @param {DestroyOpts} opts setup command options
 */
exports.handler = (opts) => {

  const { cwd, docker } = getConfig();
  const { compose, modules, service, template, verbose } = opts;

  const defaultRun = !compose && !service && !template;

  const tasks = new Listr([
    destroyDockerEnv(
      'Remove docker containers, images, and volumes',
      cwd, docker, verbose,
      () => compose || defaultRun,
    ),
    destroyWorkEnv(
      'Remove services',
      cwd, 'services',
      () => service || defaultRun
    ),
    destroyWorkEnv(
      'Remove templates',
      cwd, 'templates',
      () => template || defaultRun
    ),
    destroyWorkEnv(
      'Remove node modules',
      cwd, 'node_modules',
      () => modules || defaultRun
    ),
  ], {
    collapse: false,
    concurrent: !verbose,
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
  });

  tasks.run().catch(err => { /* console.error */ });

  // TODO: Check if `cwd` is empty, if so delete

};