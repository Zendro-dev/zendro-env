const { readFile, stat }            = require('fs/promises');
const { join, sep, parse, resolve } = require('path');
const { getConfig }                 = require('./config');


/**
 * Check whether expected workspace folders exist.
 * @param {string}        cwd path to working directory
 * @param {string} folderName subfolder to check
 */
exports.checkWorkspace = async function () {

  const { cwd } = getConfig();

  let exists = {
    modules: false,
    services: false,
    templates: false,
    workspace: false,
  };

  const check = async (path, name) => await stat(path)
    .then(stats => {
      exists[name] = true;
    })
    .catch(error => {
      if (error.code !== 'ENOENT')
        throw error;
    });

  await check(cwd, 'workspace');

  if (exists.workspace) {

    const modulesPath = join(cwd, 'node_modules');
    await check(modulesPath, 'modules');

    const servicesPath = join(cwd, 'services');
    await check(servicesPath, 'services');

    const templatesPath = join(cwd, 'templates');
    await check(templatesPath, 'templates');
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
 * Expand the first segment of a path if it matches the name of a known
 * service or template.
 * @param   {string}  path name of the service or template
 * @returns {string?} path to the service or template name
 */
exports.expandPath = function (path) {

  const { services, templates } = getConfig();

  // Expanded path
  let expandedName = null;

  // First segment of the path to expand
  const name = path.split(sep)[0];

  // Search for the segment in known services
  let service = services.find(service => service.name === name);
  if (service) expandedName = join('services', service.name);

  // Search for the segment in known templates
  if (!expandedName) {

    const template = templates.find(template => template.name === name);

    if (template) {

      expandedName = template.source
        ? parse(template.url).dir
        : join('templates', template.name);

    }

  }

  // Replace segment in the original path with the expanded path
  return expandedName
    ? path.replace(name, expandedName)
    : null;
};

exports.getPackageMain = async function (name) {

  const { cwd } = getConfig();

  // Path to the service or template package.json
  const realPath = exports.expandPath(name);
  const codegenJsonPath = resolve(cwd, join(realPath, 'package.json'));

  const packageJson = JSON.parse(await readFile(codegenJsonPath));

  // Compose path to code-generator main *.js file
  // Will be "null" if main is not defined in package.json
  const { main } = packageJson;
  if (!main) {
    throw new Error(`Property "main" is not defined in ${name} package.json`);
  }

  return join(realPath, main);
};
