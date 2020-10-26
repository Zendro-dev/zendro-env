const { command }              = require('execa');
const { stat }                 = require('fs/promises');
const { join, parse, resolve } = require('path');


/**
 * Recursively remove untracked files and directories.
 * @param {string} cwd path to working directory
 * @param {string} path relative repository path from `cwd`
 * @param {boolean} verbose global _verbose_ option
 */
exports.cleanRepository = async function (cwd, path, verbose) {

  const repository = join(cwd, path);

  await command('git clean -fd', {
    cwd: repository,
    stdio: verbose ? 'inherit' : 'pipe',
  });

};

/**
 * Clone a repository.
 *
 * @typedef  {Object} CloneTemplateOpts
 * @property {string?}  branch remote branch to clone instead of the default HEAD
 * @property {string?}  output path to destination folder
 * @property {string}   source path, url, or ssh to source repository
 * @property {boolean?} verbose whether to `inherit` (true) or `pipe` (false) standard I/O
 *
 * @param {string}            cwd path to working directory
 * @param {CloneTemplateOpts} options clone options
 */
exports.cloneRepository = async function (cwd, options) {

  const branch = options.branch ? `--branch ${options.branch}` : '';
  const output = options.output || '';

  return await command(
    `git clone ${branch} ${options.source} ${output}`, {
      cwd,
      stdio: options.verbose ? 'inherit' : 'pipe',
    });
};

/**
 * Patch a target repository with the _staged_ changes from another repository.
 * This strategy applies _git diff_ and _git apply_ to patch the changes.
 * @param {string}      cwd path to working directory
 * @param {string}   source path to source repository
 * @param {string}   target path to target repository
 * @param {boolean} verbose global _verbose_ option
 */
exports.cloneStaged = async function (cwd, source, target, verbose) {

  // Create a temporary patch file in the service folder
  const patchName = `${parse(source).base}.patch`;
  const patchPath = resolve(cwd, target, patchName);

  // Create the patch file from only staged changes and save it as a file in the service folder
  await command(`git diff --patch --staged --output ${patchPath}`, {
    cwd: join(cwd, source),
    stdio: verbose ? 'inherit' : 'pipe'
  });

  // Verify that the patch file is not empty and apply the patch
  const { size } = await stat(patchPath);
  if (size > 0) {
    await command(`git apply ${patchName}`, {
      cwd: join(cwd, target),
      stdio: verbose ? 'inherit' : 'pipe',
    });
  }
};

/**
 * Checkout a repository to the target branch
 * @param {string}      cwd path to working directory
 * @param {string}     path relative repository path from `cwd`
 * @param {string}   branch target branch
 * @param {boolean} verbose global _verbose_ option
 */
exports.checkoutBranch = async function (cwd, path, branch, verbose) {

  const repository = join(cwd, path);

  await command(`git checkout --force ${branch}`, {
    cwd: repository,
    stdio: verbose ? 'inherit' : 'pipe',
  });

};

/**
 * Fetch all changes from the remote.
 * @param {string}      cwd path to working directory
 * @param {string}     path relative repository path from `cwd`
 * @param {boolean} verbose global _verbose_ option
 */
exports.fetchAll = async function (cwd, path, verbose) {

  const repository = join(cwd, path);

  await command('git fetch --all', {
    cwd: repository,
    stdio: verbose ? 'inherit' : 'pipe',
  });

};

/**
 * Reset a repository to its HEAD position.
 * @param {string}      cwd path to working directory
 * @param {string}     path relative repository path from `cwd`
 * @param {string}   remote name of the upstream remote
 * @param {string}   branch target branch
 * @param {boolean} verbose global _verbose_ option
 */
exports.resetRepository = async function (cwd, path, branch, verbose) {

  const repository = join(cwd, path);

  await command(`git reset --hard ${branch || ''}`, {
    cwd: repository,
    stdio: verbose ? 'inherit' : 'pipe',
  });

};
