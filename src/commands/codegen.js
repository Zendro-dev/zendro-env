const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { getConfig }   = require('../config/config');
const {
  applyPatches,
  generateCode,
  resetService,
} = require('../handlers/codegen');


exports.command  = 'codegen';

exports.describe = 'Generate code for a testing environment.';

exports.builder  = {
  clean: {
    describe: 'Clean generated code and patches',
    group: 'Codegen',
    type: 'boolean',
  },
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
 * @typedef  {Object}  CodegenOpts Codegen command options
 * @property {boolean}       clean clean generated code and patches
 * @property {boolean}        code generate code only
 * @property {boolean}       patch apply patches only
 * @property {boolean}     verbose global _verbose_ option
 *
 * @param {CodegenOpts} opts codegen command options
 */
exports.handler = (opts) => {

  const { cwd, services, models, patches, templates } = getConfig();
  const { clean, code, patch, verbose } = opts;

  const defaultRun = !clean && !code && !patch;

  const tasks = new Listr([
    {
      title: 'Reset service repository',
      task: () => new Listr(
        services.map(service => ({
          title: service.name,
          task: () => resetService(cwd, service, verbose),
        })),
        {
          concurrent: verbose ? false : true,
        }
      ),
      enabled: () => clean || code || defaultRun,
    },
    {
      title: 'Generate code',
      task: () => new Listr(
        models.reduce((acc, model) => {

          model.target.forEach(targetService => {

            const service = services.find(service => service.name === targetService);
            const codegen = templates.find(({ name }) => name === service.codegen);

            acc.push({
              title: targetService,
              task: () => generateCode(cwd, model, service, codegen, verbose),
            });

          });

          return acc;

        }, []),
        {
          concurrent: verbose ? false : true,
        }
      ),
      enabled: () => code || defaultRun,
    },
    {
      title: 'Apply patches',
      task: () => new Listr(
        patches.map(p => ({
          title: p.src,
          task: () => applyPatches(cwd, p, verbose),
        }))
      ),
      enabled: () => patch || defaultRun,
    }
  ], {
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  tasks.run().catch(err => { /* console.error */ });

};