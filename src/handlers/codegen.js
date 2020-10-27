const { command } = require('execa');


/**
 *
 * @param {string}      cwd path to workspace folder
 * @param {string}    patch path to patch file
 * @param {string}   target path to target file
 * @param {string}  options concatenated options string
 * @param {boolean} verbose global _verbose_ option
 */
exports.applyPatch = async function (cwd, patch, target, options, verbose) {

  await command(`patch ${options} ${target} ${patch}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore'
  });

};

/**
 * Generate code for a target service.
 * @param {string}      cwd path to workspace folder
 * @param {string}  codegen path to code-generator executable
 * @param {string}   models path to model definitions folder
 * @param {string}  service path to target service folder
 * @param {string}  options concatenated options string
 * @param {boolean} verbose global _verbose_ option
 */
exports.generateCode = async function (cwd, codegen, models, service, options, verbose) {

  await command(`node ${codegen} -f ${models} -o ${service} ${options}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'pipe',
  });

};
