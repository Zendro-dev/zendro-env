const { command }                                           = require('execa');
const { copyFile, readFile, mkdir, rmdir, stat, writeFile } = require('fs/promises');
const { join, resolve }                                     = require('path');
const { Observable }                                        = require('rxjs');


/**
 * Check workspace folder integrity.
 * @param {string}        cwd path to working directory
 * @param {string} folderName subfolder to check
 */
exports.checkWorkspace = async function (cwd, folderName) {

  let exists = true;
  const path = folderName ? join(cwd, folderName) : cwd;

  await stat(path).catch(error => {
    if (error.code === 'ENOENT')
      exists = false;
    else
      throw error;
  });

  return exists;
};

/**
 * Clone Zendro repository templates required to install the workspace.
 * @param {string}        cwd path to working directory
 * @param {Template} template object containing branch and url information
 */
exports.cloneTemplate = async function (cwd, template, verbose) {

  return new Observable(async observer => {

    const { branch, name, url } = template;

    observer.next(`cloning ${url}`);

    try {
      await command(
        `git clone --branch ${branch || 'master'} ${url} ./templates/${name}`, {
          cwd,
          stdio: verbose ? 'inherit' : 'pipe',
        });
    }
    catch (error) {
      if (verbose) observer.next(error.message);
      observer.error(new Error(`Failed cloning ${url}`));
    }

    observer.complete();

  });

};

/**
 * Clone a new environment service.
 * @param {string}       cwd path to workspace folder
 * @param {string}  template template to clone from
 * @param {string}      name unique name of the service
 * @param {boolean}  verbose global verbose option
 */
exports.cloneService = async function (cwd, template, name, verbose) {

  return new Observable(async observer => {

    const src = `./templates/${template}/.git`;
    const dest = `services/${name}`;

    observer.next(`cloning ${src}`);

    try {
      await command(`git clone ${src} ${dest}`, {
        cwd,
        stdio: verbose ? 'inherit' : 'pipe'
      });
    }
    catch (err) {
      if (verbose) {
        observer.next(err.message);
      }
      observer.error(new Error(`Failed cloning ${src}`));
    }

    /**
     * Edit package.json#name. Unique package names are required by
     * yarn workspaces to install the shared modules.
     */

    // Read package.json
    const packageJsonPath = `${cwd}/services/${name}/package.json`;
    observer.next(`reading ${packageJsonPath}`);

    const jsonString = await readFile(packageJsonPath, {
      encoding: 'utf-8'
    });
    const packageJson = JSON.parse(jsonString);

    // Edit package.json#name
    observer.next(`renaming ${packageJson.name} -> ${name}`);
    packageJson.name = name;
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), {
      encoding: 'utf-8'
    });

    observer.complete();

  });

};

/**
 * Install modules for all workspace packages.
 * @param {string} cwd path to workspace
 */
exports.installWorkspace = async function (cwd, verbose) {

  return new Observable(async observer => {

    try {
      observer.next(`Creating package.json in ${cwd}`);
      await copyFile(
        resolve(__dirname, '../config/workspace.json'),
        `${cwd}/package.json`,
      );

      observer.next('Installing node modules');
      await command('yarn install', {
        cwd,
        stdio: verbose ? 'inherit' : 'pipe'
      });

    }
    catch (error) {
      observer.error(error);
    }

    observer.complete();

  });

};

/**
 * Destroy and optionally recreate any folder, including root, of the work environment.
 *
 * WARNING: The worspace folder or the given subfolder path contents will be lost.
 *
 * @param {string}         cwd path to working directory
 * @param {string?} folderPath path to a workspace subfolder
 * @param {boolean}   recreate recreate as empty folder
 */
exports.resetEnvironment = async function (cwd, folderPath, recreate = true) {

  return new Observable(async observer => {

    const pathToReset = folderPath ? join(cwd, folderPath) : cwd;

    try {
      observer.next(`Removing ${pathToReset}`);
      await rmdir(pathToReset, { recursive: true });

      if (recreate) {
        observer.next(`Recreating ${pathToReset}`);
        await mkdir(`${pathToReset}`, { recursive: true });
      }
    } catch (error) {
      observer.error(error);
    }

    observer.complete();

  });

};
