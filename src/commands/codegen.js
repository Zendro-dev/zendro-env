const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');

const { getConfig }                              = require('../config/config');
const { applyPatch, generateCode, resetService } = require('../handlers/codegen');


/* TASKS */

/**
 * Restores services repositories to their original state.
 * @param {string}           title task title
 * @param {string}             cwd path to working directory
 * @param {Service[]}     services list of services
 * @param {boolean}        verbose global _verbose_option
 * @param {() => boolean}  enabled whether the task is enabled
 */
const resetServices = (title, cwd, services, verbose, enabled) => ({

  title,

  task: () => new Listr(
    services.map(service => ({
      title: service.name,
      task: (ctx, task) => resetService(cwd, service, verbose)
        .catch(error => {
          if (error.code === 'ENOENT')
            task.skip('Service is not installed');
        }),
    })),
    {
      concurrent: !verbose,
    }
  ),

  enabled,
});

/**
 * Generate code for all services.
 * @param {string}            title task title
 * @param {string}              cwd path to working directory
 * @param {Model[]}          models list of models
 * @param {Service[]}      services list of services
 * @param {Template[]}    templates list of templates
 * @param {boolean}         verbose global _verbose_ option
 * @param {() => boolean}   enabled enabler function
 */
const generateServices = (title, cwd, models, services, templates, verbose, enabled) => ({

  title,

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
      concurrent: !verbose,
    }
  ),

  enabled,
});

/**
 * Apply patches to their target services.
 * @param {string}          title task title
 * @param {string}            cwd path to working directory
 * @param {Patch[]}       patches list of patches
 * @param {boolean}       verbose global _verbose_ option
 * @param {() => boolean} enabled enabler function
 */
const applyPatches = (title, cwd, patches, verbose, enabled) => ({

  title,

  task: () => new Listr(
    patches.map(p => ({
      title: p.src,
      task: () => applyPatch(cwd, p, verbose),
    }))
  ),

  enabled,
});


/* COMMAND */

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

exports.codegenTasks = {
  applyPatches,
  generateServices,
  resetServices,
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
    resetServices(
      'Reset service repositories',
      cwd, services, verbose,
      () => clean || code || defaultRun
    ),
    generateServices(
      'Generate code',
      cwd, models, services, templates, verbose,
      () => code || defaultRun
    ),
    applyPatches(
      'Apply patches',
      cwd, patches, verbose,
      () => patch || defaultRun
    )
  ], {
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  tasks.run().catch(err => { /* console.error */ });

};
