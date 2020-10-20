const {
  command
} = require('execa');
const {
  copyFile,
  mkdir,
  readFile,
  rmdir,
  stat,
  writeFile
} = require('fs/promises');
const {
  join,
  parse,
  resolve
} = require('path');


/**
 * Clone Zendro repository templates required to install the workspace.
 * @param {string}        cwd path to working directory
 * @param {string?}    branch branch to use as HEAD
 * @param {string}        src path to source repository
 * @param {string}       dest path to output folder
 * @param {Template} template object containing branch and url information
 */
exports.cloneTemplate = async function (cwd, branch, src, dest, verbose) {

  branch = branch ? `--branch ${branch}` : '';

  return await command(
    `git clone ${branch} ${src} ${dest}`, {
      cwd,
      stdio: verbose ? 'inherit' : 'pipe',
    });
};

/**
 * Clone a new environment service.
 * @param {string}           cwd path to workspace folder
 * @param {string}  templatePath relative path to template from cwd
 * @param {string}   servicePath relative path to service from cwd
 * @param {boolean}      verbose global verbose option
 */
exports.cloneService = async function (cwd, templatePath, servicePath, verbose) {

  return await command(`git clone ${templatePath} ${servicePath}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'pipe'
  });

};

/**
 * Patch a target repository with the _staged_ changes from another repository.
 * This strategy applies _git diff_ and _git apply_ to apply the changes.
 * @param {string} cwd path to working directory
 * @param {string} source path to source repository
 * @param {string} target path to target repository
 * @param {boolean} verbose global _verbose_ option
 */
exports.cloneStaged = async function (cwd, source, target, verbose) {

  // Create a temporary patch file in the service folder
  const patchName = `${parse(source).base}-${parse(target).base}.patch`;
  const patchPath = resolve(cwd, target, patchName);

  // Create the patch file from only staged changes and save it as a file in the service folder
  await command(`git diff --patch --staged --output ${patchPath}`, {
    cwd: join(cwd, source),
    stdio: verbose ? 'inherit' : 'pipe'
  });

  // Verify that the patch file is not empty and apply the patch
  const { size } = await stat(patchPath);
  if (size > 0) {
    console.log(patchName);
    await command(`git apply ${patchName}`, {
      cwd: join(cwd, target),
      stdio: verbose ? 'inherit' : 'pipe',
    });
  }
};

/**
 * Install modules for all workspace packages.
 * @param {string} cwd path to workspace
 */
exports.installModules = async function (cwd, verbose) {

  await copyFile(
    resolve(__dirname, '../config/workspace.json'),
    join(cwd, 'package.json')
  );

  return await command('yarn install', {
    cwd,
    stdio: verbose ? 'inherit' : 'pipe'
  });

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
