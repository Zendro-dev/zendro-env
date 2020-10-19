const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { Observable }  = require('rxjs');
const { getConfig }   = require('../config/config');
const {
  buildImages,
  checkConnection,
  downContainers,
  upContainers,
} = require('../handlers/docker');


/* TASKS */

/**
 * Rebuild docker images.
 * @param {string} title task title
 * @param {boolean} verbose global _verbose_ option
 */
const buildDockerImages = (title, verbose) => {

  const { cwd, docker } = getConfig();

  return {
    title,
    task: () => buildImages(cwd, docker, verbose),
  };
};

/**
 * Checks whether docker services are ready to accept requests.
 * @param {string}          title task title
 * @param {boolean}       verbose global _verbose_option
 */
const checkDockerServiceConnections = (title, verbose) => {

  const { promisify } = require('util');
  const sleep = promisify(setTimeout);

  const { services } = getConfig();

  return {
    title,
    task: () => new Listr(
      services.map(server => {

        const { name, url } = server;

        return {

          title: `${server.name}`,
          task: () => new Observable(async observer => {

            observer.next(`Connecting to ${name}`);

            let response;
            let attempts = 0;
            const maxAttempts = 10;

            while (!response && attempts <= maxAttempts+1) {
              try {
                response = await checkConnection(url);
              }
              catch (error) {
                attempts++;
                if (attempts > maxAttempts) {
                  observer.error(error);
                }
                else {
                  await sleep(2000);
                  observer.next(`Waiting for "${name}" -- attempt ${attempts}/${maxAttempts}`);
                }
              }
            }

            if (response)
              observer.next(`Connected to ${name} @ ${url}`);

            observer.complete();
          }),
          skip: () => !server.url && 'Service does not have a configured URL'

        };
      }),
      {
        concurrent: true,
        exitOnError: false,
      }
    ),
  };
};

/**
 * Stop services, remove containers and volumes.
 * @param {string}          title task title
 * @param {() => boolean} enabled whether the task is enabled
 */
const downDockerContainers = (title, verbose) => {

  const { cwd, docker } = getConfig();

  return {
    title,
    task: () => downContainers(cwd, docker, verbose),
  };
};

/**
 * Recreate containers, renew volumes, and remove orphans.
 * @param {string}          title task title
 * @param {boolean}       verbose global _verbose_option
 */
const upDockerContainers = (title, verbose) => {

  const { cwd, docker } = getConfig();

  return {
    title,
    task: () => upContainers(cwd, docker, verbose),
  };
};


/* COMMAND */

exports.command = 'docker';

exports.describe = 'Manage the docker configuration';

exports.builder = {
  build: {
    describe: 'Build docker images',
    group: 'Docker',
    type: 'boolean',
  },
  check: {
    describe: 'Check that services are ready to take requests',
    group: 'Docker',
    type: 'boolean',
  },
  down: {
    describe: 'Down docker containers',
    group: 'Docker',
    type: 'boolean',
    conflicts: [ 'build', 'check', 'up' ],
  },
  up: {
    describe: 'Up docker containers',
    group: 'Docker',
    type: 'boolean',
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

  const { build, check, down, up, verbose } = opts;

  const defaultRun = !build && !check && !down && !up;

  const tasks = new Listr({
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  if (build || defaultRun) tasks.add(
    buildDockerImages('Build docker images', verbose)
  );

  if (up || defaultRun) tasks.add(
    upDockerContainers('Up docker containers', verbose)
  );

  if (check || defaultRun) tasks.add(
    checkDockerServiceConnections('Check service connections', verbose)
  );

  if (down) tasks.add(
    downDockerContainers('Down docker containers', verbose)
  );

  tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });

};
