const { getConfig } = require('../config/config');
const { LogTask }   = require('../debug/task-logger');
//
const {
  cloneTemplates,
  cloneInstances,
  installWorkspace,
  renamePackages,
  resetEnvironment,
} = require('../handlers/setup');
//
require('../typedefs');


/* COMMAND */

exports.command = 'setup';

exports.describe = 'Setup a testing environment workspace.';

exports.builder = {
  install: {
    describe: 'Install modules (requires instances)',
    group: 'Setup',
    type: 'boolean',
  },
  instance: {
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
 * @param {SetupConfig} opts setup command options
 */
exports.handler = (opts) => {

  const { cwd, instances, templates } = getConfig();
  const { install, template, instance, verbose } = opts;

  LogTask.verbose = verbose;
  LogTask.groupBegin('Setting up the workspace');

  const defaultRun = !install && !instance && !template;

  // Clone template repositories
  if (template || defaultRun) {
    resetEnvironment(cwd, 'templates');
    cloneTemplates(templates, cwd, verbose);
  }

  // Setup instance repositories
  if (instance || defaultRun) {
    resetEnvironment(cwd, 'instances');
    Object
      .entries(instances)
      .forEach(([key, names]) => {

        // Clone from templates
        cloneInstances(cwd, names, key, verbose);

        // Edit package.json#name (yarn workspaces requires unique names)
        renamePackages(cwd, names);

      });
  }

  // Install the yarn-workspace
  if (install || defaultRun) {
    installWorkspace(cwd, verbose);
  }

  LogTask.groupEnd('Completed workspace setup');

};
