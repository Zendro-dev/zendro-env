const { command }        = require('execa');
const { default: fetch } = require('node-fetch');
const { Observable }     = require('rxjs');
const { promisify }      = require('util');

const sleep = promisify(setTimeout);


/**
 * Check the docker services are up and ready to take requests.
 * @param {string}      cwd path to workspace folder
 * @param {Service} service environment services
 * @param {boolean} verbose global _verbose_ option
 */
exports.checkDockerEnv = async function (service, maxConnectionAttempts = 5) {

  return new Observable(async observer => {

    const { name, url } = service;

    // Fetch users from the graphql-server
    // TODO: adapt "connect" for the SPA service
    const connect = () => fetch(url, {
      method: 'POST',
      body: JSON.stringify({ query: '{ users (pagination: { limit: 1 }) { id } }' }),
      headers: { 'Content-Type': 'application/json' },
    });

    // Attempt to fetch from the service
    observer.next(`Connecting to ${name}`);
    let response;
    let attempts = 0;
    while (!response && attempts <= maxConnectionAttempts) {
      try {
        response = await connect();
      }
      catch (error) {
        attempts++;
        await sleep(2000);
        observer.next(
          `Service "${name}" is not responding -- retrying (${attempts}/${maxConnectionAttempts})`
        );
      }
    }

    // Complete the observer
    if (!response) {
      observer.error(new Error(`Connection to "${name}" @ ${url} failed`));
    }
    else if (!response.ok) {
      observer.next(`Service ${name} responded with errors`);
    }
    else {
      observer.next(`Connected to ${name} @ ${url}`);
    }

    observer.complete();

  });

};

/**
 * Destroy docker-compose containers, images, and volumes.
 * @param {string}      cwd path to workspace folder
 * @param {string}   docker path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.destroyDockerEnv = async function (cwd, docker, verbose) {

  const flags = '-v --rmi all';

  await command(`docker-compose -f ${docker} down ${flags}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore',
  });

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
    stdio: verbose ? 'inherit' : 'ignore',
  });
};

/**
 * Run the a detached docker-compose environment, remove orphans, and recreate
 * containers.
 * @param {string}      cwd path to workspace folder
 * @param {string}   docker path to docker-compose.yml file
 * @param {boolean} verbose global _verbose_ option
 */
exports.upContainers = async function (cwd, docker, verbose) {

  const flags = '-d --force-recreate --remove-orphans --renew-anon-volumes';

  await command(`docker-compose -f ${docker} up ${flags}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore'
  });

};