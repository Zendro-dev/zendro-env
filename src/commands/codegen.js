const { getConfig }     = require('../config/config');
const { LogTask }       = require('../debug/task-logger');
const {
  generateCode,
  getTemplateMain
} = require('../handlers/codegen');
//
require('../typedefs');


exports.command  = 'codegen';

exports.describe = 'Generate code for a testing environment.';

exports.builder  = {
  gql: {
    describe: 'Generate graphql-server code',
    group: 'Codegen',
    type: 'boolean',
  },
  spa: {
    describe: 'Generate single-page-app code',
    group: 'Codegen',
    type: 'boolean',
  },
};

/**
 * Command execution handler.
 * @param {CodegenOptions} opts codegen command options
 */
exports.handler = (opts) => {

  const { cwd, templates, models } = getConfig();
  const { verbose } = opts;


  LogTask.verbose = verbose;
  LogTask.groupBegin('Running code generators');

  const exec = getTemplateMain(cwd, templates);
  generateCode(exec, cwd, models, verbose);

  LogTask.groupEnd();


};