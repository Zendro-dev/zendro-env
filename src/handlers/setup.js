const { execSync }       = require('child_process');
const { join, resolve }  = require('path');
const {
  copyFileSync, readFileSync, mkdirSync, rmdirSync, writeFileSync
} = require('fs');
//
const { LogTask }   = require('../debug/task-logger');


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
 * Clone a new environment service.
 * @param {string}  cwd      path to workspace folder
 * @param {string}  template template to clone from
 * @param {string}  name     unique name of the service
 * @param {boolean} verbose  global verbose option
 */
exports.cloneService = function (cwd, template, name, verbose) {

  LogTask.begin(`Cloning instance: ${name}`);

  const src = `./templates/${template}/.git`;
  const dest = `services/${name}`;

  execSync(`git clone ${src} ${dest}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore',
  });

  LogTask.end();

};

/**
 * Install modules for all workspace packages.
 * @param {string} cwd path to workspace
 */
exports.installWorkspace = function (cwd, verbose) {

  LogTask.begin('Installing workspace modules');

  copyFileSync(
    resolve(__dirname, '../config/workspace.json'),
    `${cwd}/package.json`,
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
 * Rename package to the provided name.
 * @param {string} cwd path to workspace folder
 * @param {string} name unique service name
 */
exports.renamePackage = function (cwd, name) {

  LogTask.begin(`Renaming package: ${name}`);

  // Read package.json
  const packageJsonPath = `${cwd}/services/${name}/package.json`;
  const packageJson = JSON.parse( readFileSync(packageJsonPath, {
    encoding: 'utf-8'
  }));

  // Edit package.json#name
  packageJson.name = name;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), {
    encoding: 'utf-8'
  });

  LogTask.end('Renamed packages');
};

/**
 * Fully or partially reset the testing environment.
 *
 * WARNING: The worspace folder, or the given subfolder name, will be removed and recreated anew.
 *
 * @param {string}  cwd path to working directory
 * @param {string?} sub workspace folder to reset
 */
exports.resetEnvironment = function (cwd, sub, recreate = true) {

  const pathToReset = sub ? join(cwd, sub) : cwd;

  LogTask.begin(`Removing "${pathToReset}"`);

  rmdirSync(pathToReset, { recursive: true });

  if (recreate) {
    mkdirSync(`${pathToReset}`, { recursive: true });
  }

  LogTask.end();

};
