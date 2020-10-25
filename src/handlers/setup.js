const {
  command
} = require('execa');
const {
  mkdir,
  readFile,
  rmdir,
  writeFile,
} = require('fs/promises');
const {
  join,
  parse,
  resolve,
} = require('path');


/**
 * Install modules for all workspace packages.
 * @param {string} cwd path to workspace
 */
exports.installModules = async function (cwd, verbose) {

  return await command('yarn install', {
    cwd,
    stdio: verbose ? 'inherit' : 'pipe'
  });

};

/**
 * Create a `yarn workspace` package.json file. Only services and the
 * environment cache will be added to the workspace.
 * @param {string}        cwd path to working directory
 * @param {string[]} packages package names
 */
exports.makeEnvPackage = async function (cwd, packages) {

  const packageJson = JSON.stringify({
    private: true,
    name: parse(cwd).base,
    workspaces: packages,
  }, null, 2);

  await writeFile(join(cwd, 'package.json'), packageJson, { encoding: 'utf8' });

};

/**
 * Renames the package.json #name property to match the module folder name.
 * Unique package names are required by yarn workspaces to install the shared
 * modules.
 * @param {string} cwd path to working directory
 * @param {string} modulePath relative path to the module
 */
exports.renamePackageJson = async function (cwd, modulePath) {

  // Read package.json
  const packageJsonPath = join(resolve(cwd, modulePath), 'package.json');

  const jsonString = await readFile(packageJsonPath, {
    encoding: 'utf-8',
  });
  const packageJson = JSON.parse(jsonString);

  // Edit package.json#name
  const packageName = parse(modulePath).name;
  packageJson.name = packageName;
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), {
    encoding: 'utf-8'
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

  const pathToReset = folderPath ? join(cwd, folderPath) : cwd;

  await rmdir(pathToReset, { recursive: true });

  if (recreate) {
    await mkdir(`${pathToReset}`, { recursive: true });
  }

};
