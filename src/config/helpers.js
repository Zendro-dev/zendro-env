const { readFile }                  = require('fs/promises');
const { join, sep, parse, resolve } = require('path');
const { getConfig }                 = require('./config');
const { pathExists, isRemote }      = require('../utils/path-guards');


/**
 * Check whether expected workspace folders exist.
 * @param {string}        cwd path to working directory
 * @param {string} folderName subfolder to check
 */
exports.checkWorkspace = async function () {

  const { cwd } = getConfig();

  let exists = {};

  exists.workspace = await pathExists(cwd);

  if (exists.workspace) {

    exists.cache    = await pathExists(join(cwd, 'cache'));
    exists.modules  = await pathExists(join(cwd, 'node_modules'));
    exists.services = await pathExists(join(cwd, 'services'));

  }

  return exists;
};

/**
 * Return a normalized joined string from a given options array.
 *
 * - Elements in the array are joined into a single space-separated string.
 * - Elements are joined in the same order as the original array.
 * - Any whitespace-containing string in the array is wrapped in quotes before being joined.
 *
 * @param {string[]} options list of option strings
 */
exports.composeOptionsString = function (options) {

  return options
    .map(arg => {

      if (/\s/g.test(arg))
        return `\\"${arg}\\"`;

      return arg;
    })
    .join(' ');
};

/**
 * Get the path to a service repository from the given name or path.
 *
 * - If the "path" parameter is a service name, the service folder path
 *   will be returned.
 *
 * - If the "path" parameter is an actual path, the first segment of the
 *   path will be expanded to the service folder path.
 *
 * @param   {string}  path name of the service or template
 * @returns {string?} path to the service folder from the `cwd`
 */
exports.servicePath = function (path) {

  const { services } = getConfig();

  // First segment of the path to expand
  const name = path.split(sep).shift();

  // Search for the segment in known services
  let service = services.find(service => service.name === name);

  // Replace segment in the original path with the expanded path
  return service
    ? path.replace(name, join('services', service.name))
    : null;
};

/**
 * Resolve a service properties to their actual object values.
 * @param {Service} service configured service object
 */
exports.parseService = async function (service) {

  const path = exports.servicePath(service.name);
  const template = await exports.parseTemplate(service.template);

  return {
    ...service,
    path,
    template,
  };

};

/**
 * Resolve a template object from its repository address.
 * @param {string} repository url or path to the template repository
 */
exports.parseTemplate = async function (repository) {

  const { cwd } = getConfig();

  /**
   * Determine whether the template is "source" or "remote".
   *
   * - A source template is a local path defined by the user and should always exist.
   * - A remote template is a user-defined upstream and will be saved to an internal cache
   *   within the `cwd` * folder.
   */
  const source = isRemote(repository)
    ? false
    : true;

  /**
   * Determine the real path to the template repository.
   *
   * - A source template will always resolve to the user-defined path.
   * - A remote template will be stored in the "cache" folder within the `cwd`
   */
  const path = source ? repository : join('cache', parse(repository).name);

  /**
   * Determine whether the repository is already installed in the cache.
   */
  const installed = await pathExists( resolve(cwd, path) );

  /**
   * Get the path to the repository main entry file.
   *
   * - If the template is not installed, main should be "null"
   * - If the template is installed but main is not defined in package.json,
   *   main should be "undefined"
   */
  const main = installed
    ? await exports.getModuleMain(path)
    : null;

  return {
    installed,
    main,
    path,
    source,
  };
};

/**
 * Get the path to a module main entry file as specified in its package.json file.
 * @param   {string} name path to the module folder
 * @returns {Promise<string|undefined} path to the main entry file
 */
exports.getModuleMain = async function (path) {

  const { cwd } = getConfig();

  // Read module package.json
  const modulePath = resolve(cwd, path);
  const jsonPath   = join(modulePath, 'package.json');
  const jsonObject = JSON.parse(await readFile(jsonPath));

  // Will be "undefined" if it is not defined in package.json
  const { main } = jsonObject;

  // Return path to main .js file
  return main
    ? join(modulePath, main)
    : undefined;
};
