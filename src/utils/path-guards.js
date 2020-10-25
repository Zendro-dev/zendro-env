const { stat } = require('fs/promises');


/**
 * Check whether an input string is formatted as a valid URL or git
 * SSH remote.
 * @param {string} input string to check
 */
exports.isRemote = function (input) {

  /**
   * Match against common git repository patterns
   */
  const sshRemote = input.match(/^git@\w+.com:[\w-]+\/[\w-]+.git/) !== null;

  /**
   * Attempt to parse the input as a valid URL
   */
  let httpRemote;
  try {
    new URL(input);
    httpRemote = true;
  }
  catch (error) {
    if (error.code !== 'ERR_INVALID_URL')
      throw error;
    httpRemote = false;
  }

  return sshRemote || httpRemote;

};

/**
 * Check whether an input path exists in the local file system.
 * @param {string} path input path
 */
exports.pathExists = async function (path) {

  let exists;
  try {
    await stat(path);
    exists = true;
  }
  catch (error) {
    if (error.code !== 'ENOENT')
      throw error;
    exists = false;
  }

  return exists;
};