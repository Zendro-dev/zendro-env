const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { Observable }  = require('rxjs');

const { getConfig } = require('../config/config');
const {
  checkWorkspace,
  composeOptionsString,
  parseService,
  parseTemplate,
  servicePath,
} = require('../config/helpers');

const {
  cleanRepository,
  cloneStaged,
  resetRepository,
} = require('../handlers/git');
const {
  applyPatch,
  generateCode,
} = require('../handlers/codegen');

const { isFalsy } = require('../utils/type-guards');


/* TASKS */

/**
 * Apply patches to their target services.
 * @param {string}    title task title
 * @param {boolean} verbose global _verbose_ option
 */
const applyPatches = (title, verbose) => {

  const { cwd, patches } = getConfig();

  return {

    title,

    task: () => new Listr(
      patches.map(patch => ({
        title: patch.path,
        task: () => new Observable(observer => {

          const target = servicePath(patch.target);
          if (!target) {
            observer.error(new Error(`could not find service "${patch.target}"`));
          }

          try {
            const options = patch.options ? composeOptionsString(patch.options) : '';
            applyPatch(cwd, patch.path, target, options, verbose);
          }
          catch (error) {
            observer.error(error);
          }

          observer.complete();

        })}
      ))
    ),

    skip: () => isFalsy(patches) && 'No patches are configured',
  };
};

/**
 * Generate code for all services.
 * @param {string}    title task title
 * @param {boolean} verbose global _verbose_ option
 */
const generateServicesCode = async (title, verbose) => {

  const { cwd, models, services } = getConfig();

  /** @type {import('listr').ListrTask[]} */
  const tasks = [];

  for (const modelJson of models) {

    const options = modelJson.options
      ? composeOptionsString(modelJson.options)
      : '';

    for (const serviceName of modelJson.targets) {

      tasks.push({
        title: serviceName,
        task: (ctx, task) => new Observable(async observer => {

          try {

            const serviceJson = services.find(service => service.name === serviceName);

            if (!serviceJson) {
              observer.error(new Error(`service ${serviceName} not found`));
              observer.complete();
            }

            const codegen = await parseTemplate(modelJson.codegen);
            if (!codegen.installed) {
              observer.error(new Error(`codegen ${codegen.path} is not installed`));
              observer.complete();
            }

            else {
              const service = await parseService(serviceJson);
              observer.next(`Generating code for ${service.name}`);
              await generateCode(
                cwd, codegen.main, modelJson.path, service.path, options, verbose
              );
            }

            observer.complete();
          }
          catch (error) {
            observer.error(error);
          }
          observer.complete();

        })

      });

    }

  }

  return {

    title,

    task: () => new Listr(tasks, {
      concurrent: !verbose,
    }),

    skip: () => isFalsy(models) && 'No models have been configured',

  };
};

/**
 * Restores services repositories to their original state.
 * @param {string}    title task title
 * @param {boolean} verbose global _verbose_option
 */
const resetServices = async (title, verbose) => {

  const { cwd, services } = getConfig();

  return {

    title,

    task: () => new Listr(
      services.map(serviceJson => {

        return {

          title: serviceJson.name,

          task: (ctx, task) => new Observable(async observer => {

            const { template, ...service } = await parseService(serviceJson);

            try {
              observer.next('Resetting repository to its current HEAD');
              await resetRepository(cwd, service.path, null, verbose);

              observer.next('Removing untracked files');
              await cleanRepository(cwd, service.path, verbose);

            }
            catch (error) {
              if (error.code === 'ENOENT')
                task.skip('Service is not installed');
              observer.error(error);
            }

            if (template.source) {
              observer.next('Applying staged source changes');
              await cloneStaged(cwd, template.path, service.path, verbose);
            }

            observer.complete();

          })

        };
      }),
      {
        concurrent: !verbose,
      }
    ),

    skip: async () => {
      const exists = await checkWorkspace(cwd);
      return !exists.services && 'No services are installed';
    }
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
  generateServicesCode,
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
  if (code || defaultRun) tasks.add( await generateServicesCode('Generate code', verbose) );

  // // --patch
  if (patch || defaultRun) tasks.add( applyPatches('Apply patches', verbose) );


  tasks.run().catch(error => {
    if (verbose)
      console.error(error.message);
    process.exit(error.errno);
  });

};
