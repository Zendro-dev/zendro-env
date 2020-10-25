const { command }        = require('execa');
const { default: fetch } = require('node-fetch');

/**
 * Rebuild the docker-compose environment images.
 * @param {string}      cwd path to workspace folder
 * @param {string}   docker path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.buildImages = async function (cwd, dockerfile, verbose) {

  await command(`docker-compose -f ${dockerfile} build`, {
    cwd,
    stdio: verbose ? 'inherit' : 'pipe'
  });

};

/**
 * Check that a remote resource is up and ready to take requests.
 * @param {string} url resource URL
 */
exports.checkConnection = async function (url) {

  return await fetch(url);

};

/**
 * Destroy docker-compose containers, images, and volumes.
 * @param {string}      cwd path to workspace folder
 * @param {string}   docker path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.deleteDockerEnv = async function (cwd, docker, verbose) {

  const flags = '-v --rmi all';

  await command(`docker-compose -f ${docker} down ${flags}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'pipe',
  }).catch(error => { throw error; });

};

/**
 * Remove the docker-compose containers and volumes (not images).
 * @param {string}      cwd path to workspace folder
 * @param {string}   docker path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.downContainers = async function (cwd, docker, verbose) {

  const flags = '-v';

  await command(`docker-compose -f ${docker} down ${flags}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'pipe',
  }).catch(error => { throw error; });
};

/**
 * Run the a detached docker-compose environment, remove orphans, and recreate
 * containers.
 * @param {string}      cwd path to workspace folder
 * @param {string}   docker path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.upContainers = async function (cwd, dockerfile, verbose) {

  const flags = '-d --force-recreate --remove-orphans --renew-anon-volumes';

  await command(`docker-compose -f ${dockerfile} up ${flags}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'pipe'
  });

};
