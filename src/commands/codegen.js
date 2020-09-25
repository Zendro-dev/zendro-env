const { getConfig } = require('../config/config');
const { LogTask }   = require('../debug/task-logger');
const {
  applyPatches,
  generateCode,
  getTemplateMain
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

  const { cwd, instances, models, patches, templates } = getConfig();
  const { code, patch, verbose } = opts;

  const defaultRun = !code && !patch;

  LogTask.verbose = verbose;
  LogTask.groupBegin('Generating instances code');

  if (code || defaultRun) {

    const exec = getTemplateMain(cwd, templates);
    generateCode(exec, cwd, instances, models, verbose);

  }

  if (patch || defaultRun) {

    applyPatches(cwd, patches, verbose);

  }

  LogTask.groupEnd('Generated instances code');

};