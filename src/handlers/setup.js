const { execSync } = require('child_process');
const { resolve }  = require('path');
const {
  copyFileSync, readFileSync, mkdirSync, rmdirSync, writeFileSync
} = require('fs');
//
const { LogTask }   = require('../debug/task-logger');
//
require('../typedefs');


/**
 * Clone Zendro repository templates required to install the workspace.
 * @param {object} paths object containing branch and url information
 * @param {string} cwd path to working directory
 */
exports.cloneTemplates = function (paths, cwd, verbose) {

  Object.entries(paths).forEach(([key, { branch, url, source }]) => {

    LogTask.begin(`Cloning template: ${key}`);

    if (!source) execSync(
      `git clone --branch "${branch || 'master'}" ${url} ./templates/${key}`, {
        cwd,
        stdio: verbose ? 'inherit' : 'ignore',
      });

    LogTask.end();

  });

};

/**
 * Clone GraphQL-Server and Single-Page-App instances.
 * @param {string} cwd path to current workspace
 * @param {string[]} names instance names
 * @param {string} key name of template repository
 * @param {string} branch branch to checkout
 */
exports.cloneInstances = function (cwd, names, key, verbose) {

  names.forEach(name => {

    LogTask.begin(`Cloning instance: ${name}`);

    const src = `./templates/${key}/.git`;
    const dest = `instances/${name}`;

    execSync(`git clone ${src} ${dest}`, {
      cwd,
      stdio: verbose ? 'inherit' : 'ignore',
    });

    LogTask.end();

  });

};

/**
 * Install modules for all workspace packages.
 * @param {string} cwd path to workspace
 */
exports.installWorkspace = function (cwd, verbose) {

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

};

/**
 * Renames packages to their instance name. Unique package names are required
 * by `yarn workspaces` to install shared modules.
 * @param {string} cwd path to workspace
 * @param {string[]} names instance names
 */
exports.renamePackages = function (cwd, names) {

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

};

/**
 * Create a clean testing environment.
 * WARNING: it will destroy any existing workspace in the same path.
 * @param {string}  cwd path to working directory
 * @param {string?} opt workspace folder to reset
 */
exports.resetEnvironment = function (cwd, opt) {

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

};
