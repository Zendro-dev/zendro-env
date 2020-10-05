const { join, sep, parse } = require('path');
const { getConfig } = require('./config');


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