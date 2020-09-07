const { execSync } = require('child_process');
const {
  copyFileSync, mkdirSync, rmdirSync,
  readFileSync, writeFileSync,
} = require('fs');
const { resolve } = require('path');
//
const { getConfig } = require('../config/config');
const { LogTask }   = require('../debug/task-logger');


/* Handlers */

/**
 * Clone Zendro repository templates required to install the workspace.
 * @param {object} paths object containing branch and url information
 * @param {string} cwd path to working directory
 */
function cloneTemplateRepositories (paths, cwd, verbose) {

  Object.entries(paths).forEach(([key, { branch, url, source }]) => {

    LogTask.begin(`Cloning path: ${key}`);

    if (!source) execSync(
      `git clone --branch ${branch || 'master'} ${url} ./templates/${key}`, {
        cwd,
        stdio: verbose ? 'inherit' : 'ignore',
      });

    LogTask.end();

  });

}

/**
 * Clone GraphQL-Server and Single-Page-App instances.
 * @param {string} cwd path to current workspace
 * @param {string[]} names instance names
 * @param {string} key name of template repository
 * @param {string} branch branch to checkout
 */
function cloneInstances (cwd, names, key, branch, verbose) {

  names.forEach(name => {

    LogTask.begin(`Cloning instance: ${name}`);

    const src = `./templates/${key}/.git`;
    const dest = `instances/${name}`;

    execSync(`git clone --branch ${branch} ${src} ${dest}`, {
      cwd,
      stdio: verbose ? 'inherit' : 'ignore',
    });

    LogTask.end();

  });

}

/**
 * Install modules for all workspace packages.
 * @param {string} cwd path to workspace
 */
function installWorkspace (cwd, verbose) {

  LogTask.begin('Installing workspace modules');

  copyFileSync(
    resolve(__dirname, '../config/workspace.json'),
    `${cwd}/package.json`
  );

  execSync('yarn install', {
    cwd,
    env: {
      ...process.env,
      NODE_JQ_SKIP_INSTALL_BINARY: true
    },
    stdio: verbose ? 'inherit' : 'ignore'
  });

  LogTask.end();

}

/**
 * Renames packages to their instance name. Unique package names are required
 * by `yarn workspaces` to install shared modules.
 * @param {string} cwd path to workspace
 * @param {string[]} names instance names
 */
function renamePackages (cwd, names) {

  LogTask.begin(`Renaming packages: ${names.join(', ')}`);

  names.forEach(name => {

    // Read package.json
    const packageJsonPath = `${cwd}/instances/${name}/package.json`;
    const packageJson = JSON.parse( readFileSync(packageJsonPath, {
      encoding: 'utf-8'
    }));

    // Edit package.json#name
    packageJson.name = name;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), {
      encoding: 'utf-8'
    });

  });

  LogTask.end('Renamed packages');

}

/**
 * Create a clean testing environment.
 * WARNING: it will destroy any existing workspace in the same path.
 * @param {string}  cwd path to working directory
 * @param {string?} opt workspace folder to reset
 */
function resetTestingEnvironment (cwd, opt) {

  let pathToReset;

  switch (opt) {
  case 'templates':
    pathToReset = `${cwd}/templates`;
    break;

  case 'instances':
    pathToReset = `${cwd}/instances`;
    break;

  default:
    pathToReset = cwd;
    break;
  }

  LogTask.begin(`Removing "${pathToReset}"`);

  rmdirSync(pathToReset, { recursive: true });
  mkdirSync(`${pathToReset}`, { recursive: true });

  LogTask.end();

}


/* Command */

exports.command = 'setup';

exports.describe = 'Setup a testing environment workspace.';

exports.builder = {
  install: {
    describe: 'Install modules (requires an existing workspace).',
    group: 'Setup',
    type: 'boolean',
    default: true,
  },
  template: {
    describe: 'Clone templates in the config file.',
    group: 'Setup',
    type: 'boolean',
    default: true,
  },
  instance: {
    describe: 'Clone instances in config file.',
    group: 'Setup',
    type: 'boolean',
    default: true,
  }
};

/**
 * Function to execute for this command.
 * @param {obj} opts command options
 */
exports.handler = (opts) => {

  LogTask.verbose = opts.verbose;
  LogTask.groupBegin('Setting up the workspace');

  const { cwd, instances, templates } = getConfig();
  const { install, template, instance } = opts;

  // Clone template repositories
  if (template) {
    resetTestingEnvironment(cwd, 'templates');
    cloneTemplateRepositories(templates, cwd, opts.verbose);
  }

  // Setup instance repositories
  if (instance) {
    resetTestingEnvironment(cwd, 'instances');
    Object
      .entries(instances)
      .forEach(([key, { branch, names }]) => {

        // Clone from templates
        cloneInstances(cwd, names, key, branch, opts.verbose);

        // Edit package.json#name (yarn workspaces requires unique names)
        renamePackages(cwd, names);

      });
  }

  // Install the yarn-workspace
  if (install) {
    installWorkspace(cwd, opts.verbose);
  }

  LogTask.groupEnd();

};
