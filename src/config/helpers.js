const { join, sep } = require('path');
const { getConfig } = require('./config');


/**
 * Expand the first segment of a path if it matches the name of a known
 * service.
 * @param {string}    relativePath name of the instance
 * @returns {string?} path to the instance name or null
 */
exports.expandPath = function (relativePath) {

  const { services } = getConfig();

  // First segment of the path to expand
  const serviceName  = relativePath.split(sep)[0];

  // Search for the segment name in known services
  const match = services.find(service => service.name === serviceName);

  return match
    ? relativePath.replace(serviceName, join('services', serviceName))
    : null;

};