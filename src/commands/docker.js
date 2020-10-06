const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { getConfig }   = require('../config/config');
const {
  checkDockerEnv,
  downContainers,
  upContainers,
} = require('../handlers/docker');

/* TASKS */

/**
 * Checks whether docker services are ready to accept requests.
 * @param {string}          title task title
 * @param {Service[]}    services list of services
 * @param {boolean}       verbose global _verbose_option
 * @param {() => boolean} enabled whether the task is enabled
 */
const checkDockerServiceConnections = (title, services, verbose, enabled) => ({
  title,
  task: () => new Listr(
    services.map(server => ({

      title: `${server.name}`,
      task: () => checkDockerEnv(server)

    })),
    {
      concurrent: verbose ? false : true,
      exitOnError: false,
    }
  ),
  enabled,
});

/**
 * Stop services, remove containers and volumes.
 * @param {string}          title task title
 * @param {string}            cwd path to working directory
 * @param {string}         docker path to docker-compose file
 * @param {boolean}       verbose global _verbose_option
 * @param {() => boolean} enabled whether the task is enabled
 */
const downDockerContainers = (title, cwd, docker, verbose, enabled) => ({
  title,
  task: () => downContainers(cwd, docker, verbose),
  enabled,
});

/**
 * Recreate containers, renew volumes, and remove orphans.
 * @param {string}          title task title
 * @param {string}            cwd path to working directory
 * @param {string}         docker path to docker-compose file
 * @param {boolean}       verbose global _verbose_option
 * @param {() => boolean} enabled whether the task is enabled
 */
const upDockerContainers = (title, cwd, docker, verbose, enabled) => ({
  title,
  task: () => upContainers(cwd, docker, verbose),
  enabled,
});


/* COMMAND */

exports.command = 'docker';

exports.describe = 'Manage the docker configuration';

exports.builder = {
  check: {
    describe: 'Check that services are ready to take requests',
    group: 'Docker',
    type: 'boolean',
  },
  down: {
    describe: 'Down docker containers',
    group: 'Docker',
    type: 'boolean',
    conflicts: 'up',
  },
  up: {
    describe: 'Up docker containers',
    group: 'Docker',
    type: 'boolean',
    conflicts: 'down',
  },
};

exports.dockerTasks = {
  checkDockerServiceConnections,
  downDockerContainers,
  upDockerContainers,
};

/**
 * Command execution handler.
 *
 * @typedef  {Object} DockerOpts
 * @property {boolean}      up
 * @property {boolean}    down
 * @property {boolean}   check
 * @property {boolean} verbose
 *
 * @param {DockerOpts} opts docker command options
 */
exports.handler = async (opts) => {

  const { cwd, docker, services }    = getConfig();
  const { check, down, up, verbose } = opts;

  const defaultRun = !check && !down && !up;

  const tasks = new Listr(
    [
      upDockerContainers(
        `Up ${docker}`,
        cwd, docker, verbose,
        () => up || defaultRun
      ),
      downDockerContainers(
        `Down ${docker}`,
        cwd, docker, verbose,
        () => down
      ),
      checkDockerServiceConnections(
        'Check service connections',
        services, verbose,
        () => check || defaultRun,
      )
    ],
    {
      renderer: verbose ? VerboseRenderer : UpdaterRenderer,
      collapse: false,
    }
  );

  tasks.run().catch(err => { /* console.error */ });

};
