const { getConfig } = require('./config');


/**
 * Get the path of a given instance name
 * @param {string}    name name of the instance
 * @returns {string?} path to the instance name or null
 */
exports.getInstancePath = (name) => {

  const { instances } = getConfig();

  const type = Object
    .keys(instances)
    .find(key => instances[key].includes(name));

  return type ? `instances/${name}` : null;
};