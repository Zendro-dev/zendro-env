const { execSync } = require('child_process');
const { LogTask }  = require('../debug/task-logger');

require('../config/typings');

/**
 * Check the docker services are up and ready to take requests.
 * @param {string}       cwd     path to workspace folder
 * @param {Service} instances environment instances
 * @param {boolean}      verbose global _verbose_ option
 */
exports.checkDockerEnv = function (cwd, instances, verbose) {


};

/**
 * Destroy docker-compose containers, images, and volumes.
 * @param {string}  cwd     path to workspace folder
 * @param {string}  docker  path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.destroyDockerEnv = function (cwd, docker, verbose) {

  const flags = '-v --rmi all';

  LogTask.begin(`Destroy ${docker} environment`);

  execSync(`docker-compose -f ${docker} down ${flags}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore',
  });

  LogTask.end();

};

/**
 * Remove the docker-compose containers and volumes (not images).
 * @param {string}  cwd     path to workspace folder
 * @param {string}  docker  path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.downContainers = function (cwd, docker, verbose) {

  const flags = '-v';

  LogTask.begin(`Down ${docker}`);

  execSync(`docker-compose -f ${docker} down ${flags}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore',
  });

  LogTask.end();
};

/**
 * Run the a detached docker-compose environment, remove orphans, and recreate
 * containers.
 * @param {string}  cwd     path to workspace folder
 * @param {string}  docker  path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.upContainers = function (cwd, docker, verbose) {

  const flags = '-d --force-recreate --remove-orphans --renew-anon-volumes';


  LogTask.begin(`Up ${docker}`);

  execSync(`docker-compose -f ${docker} up ${flags}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore',
  });

  LogTask.end();

};