const { command }    = require('execa');
const { join }       = require('path');
const { Observable } = require('rxjs');


/**
 * Checkout the given repository to a target branch
 * @param {string}      cwd path to working directory
 * @param {string}     path relative repository path from `cwd`
 * @param {string}   remote upstream remote name
 * @param {string}   branch target branch
 * @param {boolean} verbose global _verbose_ option
 */
exports.checkoutBranch = async function (cwd, path, remote, branch, verbose) {

  return new Observable(async observer => {

    const templateCwd = join(cwd, path);

    try {

      // Fetch latest changes from remote
      observer.next('Fetching all from remote');
      await command('git fetch --all', {
        cwd: templateCwd,
        stdio: verbose ? 'inherit' : 'pipe',
      });

      // Force checkout to target branch
      observer.next(`Forcefully checking ${branch}`);
      await command(`git checkout --force ${branch}`, {
        cwd: templateCwd,
        stdio: verbose ? 'inherit' : 'pipe',
      });

      // Move branch HEAD to the latest commit
      observer.next('Moving HEAD to the latest commit');
      await command(`git reset --hard ${remote}/${branch}`, {
        cwd: templateCwd,
        stdio: verbose ? 'inherit' : 'pipe',
      });

    }
    catch (error) {
      observer.error(new Error(error.message));
    }

    observer.complete();

  });
};
