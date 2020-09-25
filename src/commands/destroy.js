const { getConfig }        = require('../config/config');
const { resetEnvironment } = require('../handlers/setup');
const { destroyDockerEnv } = require('../handlers/docker');


exports.command = 'destroy';

exports.describe = 'Remove a testing environment.';

exports.builder = {
  image: {
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

/**
 * Destroy command execution handler.
 *
 * @typedef  {Object} DestroyOpts
 * @property {boolean} image
 * @property {boolean} modules
 * @property {boolean} service
 * @property {boolean} template
 * @property {boolean} verbose
 *
 * @param {DestroyOpts} opts setup command options
 */
exports.handler = (opts) => {

  const { cwd, docker } = getConfig();
  const { image, modules, service, template, verbose } = opts;

  const defaultRun = !image && !service && !template;

  // Remove docker containers, images, and volumes
  if (image || defaultRun) {
    destroyDockerEnv(cwd, docker, verbose);
  }

  // Remove the services folder
  if (service || defaultRun) {
    resetEnvironment(cwd, 'services', false);
  }

  // Remove the templates folder
  if (template || defaultRun) {
    resetEnvironment(cwd, 'templates', false);
  }

  // Destroy the node_modules folder
  if (modules || defaultRun) {
    resetEnvironment(cwd, 'node_modules', false);
  }

  // TODO: Check if `cwd` is empty, if so delete

};