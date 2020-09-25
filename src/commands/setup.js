const { getConfig } = require('../config/config');
const { LogTask }   = require('../debug/task-logger');
//
const {
  cloneTemplates,
  cloneService,
  installWorkspace,
  renamePackage,
  resetEnvironment,
} = require('../handlers/setup');


/* COMMAND */

exports.command = 'setup';

exports.describe = 'Setup a testing environment workspace.';

exports.builder = {
  install: {
    describe: 'Install modules (requires instances)',
    group: 'Setup',
    type: 'boolean',
  },
  service: {
    describe: 'Clone instances in config file (requires templates)',
    group: 'Setup',
    type: 'boolean',
  },
  template: {
    describe: 'Clone templates in the config file',
    group: 'Setup',
    type: 'boolean',
  },
};

/**
 * Command execution handler.
 *
 * @typedef  {Object} SetupOpts Setup command options.
 * @property {boolean} install  install modules (requires instances)
 * @property {boolean} service  clone services (requires templates)
 * @property {boolean} template clone templates
 * @property {boolean} verbose  global _verbose_ option
 *
 * @param {SetupOpts} opts setup command options
 */
exports.handler = (opts) => {

  const { cwd, services, templates } = getConfig();
  const { install, template, service, verbose } = opts;

  LogTask.verbose = verbose;
  LogTask.groupBegin('Setting up the workspace');

  const defaultRun = !install && !service && !template;

  // Clone template repositories
  if (template || defaultRun) {
    resetEnvironment(cwd, 'templates');
    cloneTemplates(templates, cwd, verbose);
  }

  // Setup service repositories
  if (service || defaultRun) {

    // Remove the services folder
    resetEnvironment(cwd, 'services');

    // Setup new services
    services.forEach(({ name, template }) => {

      // Clone from template
      cloneService(cwd, template, name, verbose);

      // Edit package.json#name. Unique package names are required by
      // `yarn workspaces` to install the shared modules.
      renamePackage(cwd, name);

    });
  }

  // Install the yarn-workspace
  if (install || defaultRun) {
    installWorkspace(cwd, verbose);
  }

  LogTask.groupEnd('Completed workspace setup');

};
