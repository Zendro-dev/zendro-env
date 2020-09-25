const { getConfig } = require('../config/config');
const { LogTask }   = require('../debug/task-logger');
const {
  upContainers,
  downContainers
} = require('../handlers/docker');


exports.command = 'docker';

exports.describe = 'Manage the docker configuration';

exports.builder = {
  up: {
    describe: 'Up docker containers',
    group: 'Docker',
    type: 'boolean',
    conflicts: 'down',
  },
  down: {
    describe: 'Down docker containers',
    group: 'Docker',
    type: 'boolean',
    conflicts: 'up',
  },
};

/**
 * Command execution handler.
 *
 * @typedef {Object} DockerOpts
 * @property {boolean} up   launch up docker containers (conflicts: down)
 * @property {boolean} down take down docker containers (conflicts: up)
 *
 * @param {DockerOpts} opts docker command options
 */
exports.handler = (opts) => {

  const { cwd, docker }       = getConfig();
  const { down, up, verbose } = opts;

  LogTask.verbose = opts.verbose;
  LogTask.groupBegin('Executing docker commands');

  const defaultRun = !down && !up;

  if (up || defaultRun) {
    upContainers(cwd, docker, verbose);
  }

  if (down) {
    downContainers(cwd, docker, verbose);
  }


  LogTask.groupEnd('Executed docker commands');


};
