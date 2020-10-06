const Listr                = require('listr');
const VerboseRenderer      = require('listr-verbose-renderer');
const UpdaterRenderer      = require('listr-update-renderer');
const { getConfig }        = require('../config/config');
const { resetEnvironment } = require('../handlers/setup');
const { destroyDockerEnv } = require('../handlers/docker');


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
    {
      title: 'Remove docker containers, images, and volumes',
      task: () => destroyDockerEnv(cwd, docker, verbose),
      enabled: () => compose || defaultRun,
    },
    {
      title: 'Remove services',
      task: () => resetEnvironment(cwd, 'services', false),
      enabled: () => service || defaultRun,
    },
    {
      title: 'Remove templates',
      task: () => resetEnvironment(cwd, 'templates', false),
      enabled: () => template || defaultRun,
    },
    {
      title: 'Remove node modules',
      task: () => resetEnvironment(cwd, 'node_modules', false),
      enabled: () => modules || defaultRun,
    }
  ], {
    collapse: false,
    concurrent: verbose ? false : true,
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
  });

  tasks.run().catch(err => { /* console.error */ });

  // TODO: Check if `cwd` is empty, if so delete

};