const { getConfig } = require('../config/config');
const { LogTask }   = require('../debug/task-logger');
const {
  applyPatches,
  generateCode,
  getTemplateMain,
} = require('../handlers/codegen');


exports.command  = 'codegen';

exports.describe = 'Generate code for a testing environment.';

exports.builder  = {
  code: {
    describe: 'Generate code only',
    group: 'Codegen',
    type: 'boolean',
  },
  patch: {
    describe: 'Apply patches only',
    group: 'Codegen',
    type: 'boolean',
  },
};

/**
 * Command execution handler.
 *
 * @typedef  {Object} CodegenOpts Codegen command options
 * @property {boolean} code    generate code only
 * @property {boolean} patch   apply patches only
 * @property {boolean} verbose global _verbose_ option
 *
 * @param {CodegenOpts} opts codegen command options
 */
exports.handler = (opts) => {

  const { cwd, services, models, patches, templates } = getConfig();
  const { code, patch, verbose } = opts;

  const defaultRun = !code && !patch;

  LogTask.verbose = verbose;
  LogTask.groupBegin('Generating instances code');

  if (code || defaultRun) {

    models.forEach(({ path, opts, target }) => {

      target.forEach(name => {

        const { codegen } = services.find(service => service.name === name);
        const template    = templates.find(({ name }) => name === codegen);

        // Path to the code-generator main .js file
        const codegenMain = getTemplateMain(cwd, template);

        // Generate code using the appropriate generator.
        generateCode(cwd, path, target, codegenMain, opts, verbose);

      });

    });

  }

  if (patch || defaultRun) {

    applyPatches(cwd, patches, verbose);

  }

  LogTask.groupEnd('Generated instances code');

};