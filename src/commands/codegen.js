const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { Observable }  = require('rxjs');

const { getConfig }      = require('../config/config');
const {
  checkWorkspace,
  composeOptionsString,
  expandPath,
  getPackageMain,
} = require('../config/helpers');
const {
  applyPatch,
  generateCode,
  resetService,
} = require('../handlers/codegen');
const { isFalsy } = require('../utils/type-guards');


/* TASKS */

/**
 * Restores services repositories to their original state.
 * @param {string}           title task title
 * @param {string}             cwd path to working directory
 * @param {Service[]}     services list of services
 * @param {boolean}        verbose global _verbose_option
 * @param {() => boolean}  enabled whether the task is enabled
 */
const resetServices = async (title, verbose) => {

  const { cwd, services } = getConfig();

  const exists = await checkWorkspace(cwd);

  return {

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

    enabled: () => exists.services
  };

};

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
const generateServicesCode = (title, verbose) => {

  const { cwd, models } = getConfig();

  return {

    title,

    task: () => new Listr(
      models.reduce((acc, model) => {

        const codegen = getPackageMain(model.codegen);
        const options = composeOptionsString(model.options);

        model.target.forEach(targetService => {

          const servicePath = expandPath(targetService);

          acc.push({
            title: targetService,
            task: () => new Observable(async observer => {

              try {
                observer.next(`Generating code for ${targetService}`);
                await generateCode(cwd, await codegen, model.path, servicePath, options, verbose);
              }
              catch (error) {
                if (verbose)
                  observer.next(error.message);
                observer.error(error.message);
              }

              observer.complete();

            })
          });

        });

        return acc;

      }, []),
      {
        concurrent: !verbose,
      }
    ),

    skip: () => isFalsy(models) && 'No models have been configured',

  };
};

/**
 * Apply patches to their target services.
 * @param {string}          title task title
 * @param {string}            cwd path to working directory
 * @param {Patch[]}       patches list of patches
 * @param {boolean}       verbose global _verbose_ option
 * @param {() => boolean} enabled enabler function
 */
const applyPatches = (title, verbose) => {

  const { cwd, patches } = getConfig();

  return {

    title,

    task: () => new Listr(
      patches.map(patch => {

        const target  = expandPath(patch.target);
        const options = patch.options ? composeOptionsString(patch.options) : '';

        return {
          title: patch.path,
          task: () => applyPatch(cwd, patch.path, target, options, verbose),
        };
      })
    ),

    skip: () => isFalsy(patches) && 'No patches are configured',
  };
};


/* COMMAND */

exports.command  = 'codegen';

exports.describe = 'Generate code for a testing environment.';

exports.builder  = {
  clean: {
    describe: 'Clean generated code and patches',
    group: 'Codegen',
    type: 'boolean',
    conflicts: [ 'code', 'patch' ]
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
  generateServices: generateServicesCode,
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
exports.handler = async (opts) => {

  const { clean, code, patch, verbose } = opts;

  const defaultRun = !clean && !code && !patch;

  const tasks = new Listr({
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  // --clean
  if (clean || code || defaultRun) tasks.add( await resetServices('Reset services', verbose) );

  // --code
  if (code || defaultRun) tasks.add( generateServicesCode('Generate code', verbose) );

  // --patch
  if (patch || defaultRun) tasks.add( applyPatches('Apply patches', verbose) );


  tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });

};
