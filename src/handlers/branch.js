const { command } = require('execa');
const { join }    = require('path');


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
exports.resetRepository = async function (cwd, path, remote, branch, verbose) {

  const repository = join(cwd, path);

  const upstream = remote && branch
    ? `${remote}/${branch}`
    : '';


  await command(`git reset --hard ${upstream}`, {
    cwd: repository,
    stdio: verbose ? 'inherit' : 'pipe',
  });

};
