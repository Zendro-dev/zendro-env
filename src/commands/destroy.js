const Listr                = require('listr');
const VerboseRenderer      = require('listr-verbose-renderer');
const UpdaterRenderer      = require('listr-update-renderer');
const { getConfig }        = require('../config/config');
const { resetEnvironment } = require('../handlers/setup');
const { deleteDockerEnv }  = require('../handlers/docker');
const { Observable }       = require('rxjs');


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
    task: async (ctx, task) => {

      await deleteDockerEnv(cwd, docker, verbose)
        .catch(error => {
          if (verbose)
            console.error(
              'Please, verify that docker and docker-compose are installed',
              'and docker is running.'
            );
          task.skip('Could not execute "docker-compose"');
        });

    }
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

/**
 * Destroy installed yarn workspace.
 *
 * - node_modules
 * - package.json
 * - yarn.lock
 *
 * @param {string} title task title
 */
const destroyWorkspaces = (title) => {

  const { cwd } = getConfig();

  return {
    title,
    task: () => new Observable(async observer => {

      try {
        observer.next('removing node modules');
        await resetEnvironment(cwd, 'node_modules', false);

        observer.next('removing package.json');
        await resetEnvironment(cwd, 'package.json', false);

        observer.next('removing yarn.lock');
        await resetEnvironment(cwd, 'yarn.lock', false);
      }
      catch (error) {
        observer.error(error.message);
      }
      observer.complete();

    })
  };
};


/* COMMAND */

exports.command = 'destroy';

exports.describe = 'Remove a testing environment.';

exports.builder = {
  cache: {
    describe: 'Delete environment cache',
    group: 'Destroy',
    type: 'boolean'
  },
  docker: {
    describe: 'Delete docker containers, images, and volumes',
    group: 'Destroy',
    type: 'boolean'
  },
  modules: {
    describe: 'Delete installed node modules',
    group: 'Destroy',
    type: 'boolean'
  },
  services: {
    describe: 'Delete installed services',
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
 * @property {boolean}    cache delete environment cache
 * @property {boolean}   docker delete docker-compose containers, images, and volumes
 * @property {boolean}  modules delete installed node modules
 * @property {boolean} services delete cloned services
 * @property {boolean}  verbose global _verbose_ option
 *
 * @param {DestroyOpts} opts setup command options
 */
exports.handler = (opts) => {

  const { cache, docker, modules, services, verbose } = opts;

  const defaultRun = !cache && !docker && !services;

  const tasks = new Listr({
    collapse: false,
    concurrent: !verbose,
    exitOnError: false,
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
  });

  if (docker || defaultRun) tasks.add(
    destroyDockerEnv('Remove docker containers, images, and volumes', verbose)
  );

  if (cache || defaultRun) tasks.add(
    destroyWorkEnv('Remove environment cache', 'cache', verbose)
  );

  if (modules || defaultRun) tasks.add(
    destroyWorkspaces('Remove installed workspace')
  );

  if (services || defaultRun) tasks.add(
    destroyWorkEnv('Remove all services', 'services', verbose)
  );

  tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });

  // TODO: Check if `cwd` is empty, if so delete

};