const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { getConfig }   = require('../config/config');
const {
  checkDockerEnv,
  downContainers,
  upContainers,
} = require('../handlers/docker');



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
      {
        title: `Up ${docker}`,
        task: () => upContainers(cwd, docker, verbose),
        enabled: () => up || defaultRun,
      },
      {
        title: `Down ${docker}`,
        task: () => downContainers(cwd, docker, verbose),
        enabled: () => down,
      },
      {
        title: 'Check service connections',
        task: () => new Listr(
          services.map(server => ({

            title: `${server.name}`,
            task: () => checkDockerEnv(server)

          })),
          {
            concurrent: true,
            exitOnError: false,
          }
        ),
        enabled: () => check || defaultRun,
      },
    ],
    {
      renderer: verbose ? VerboseRenderer : UpdaterRenderer,
      collapse: false,
    }
  );

  tasks.run().catch(err => { /* console.error */ });

};
