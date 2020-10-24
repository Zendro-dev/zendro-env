const Listr                = require('listr');
const VerboseRenderer      = require('listr-verbose-renderer');
const UpdaterRenderer      = require('listr-update-renderer');
const { getConfig }        = require('../config/config');
const { resetEnvironment } = require('../handlers/setup');
const { deleteDockerEnv }  = require('../handlers/docker');


/* TASKS */

/**
 * Destroy containers, images, and volumes.
 * @param {string}    title task title
 * @param {boolean} verbose global _verbose_option
 */
const destroyDockerEnv = (title, verbose) => {

  const { cwd, docker } = getConfig();

  return {
    title,
    task: () => deleteDockerEnv(cwd, docker, verbose),
  };
};

/**
 * Fully or partially destroy the working environment.
 * @param {string}      title task title
 * @param {string} folderName workspace subfolder
 */
const destroyWorkEnv = (title, folderName) => {

  const { cwd } = getConfig();

  return {
    title,
    task: () => resetEnvironment(cwd, folderName, false),
  };
};


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

  const { compose, modules, service, template, verbose } = opts;

  const defaultRun = !compose && !service && !template;

  const tasks = new Listr({
    collapse: false,
    concurrent: !verbose,
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
  });

  if (compose || defaultRun) tasks.add(
    destroyDockerEnv('Remove docker containers, images, and volumes', verbose)
  );

  if (service || defaultRun) tasks.add(
    destroyWorkEnv('Remove all services', 'services', verbose)
  );

  if (template || defaultRun) tasks.add(
    destroyWorkEnv('Remove all templates', 'templates', verbose)
  );

  if (modules || defaultRun) tasks.add(
    destroyWorkEnv('Remove all templates', 'node_modules', verbose)
  );

  tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });

  // TODO: Check if `cwd` is empty, if so delete

};