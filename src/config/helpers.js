const { stat }             = require('fs/promises');
const { join, sep, parse } = require('path');
const { getConfig }        = require('./config');


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

/**
 * Check whether expected workspace folders exist.
 * @param {string}        cwd path to working directory
 * @param {string} folderName subfolder to check
 */
exports.checkWorkspace = async function (cwd) {

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
