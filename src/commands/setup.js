const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { Observable }  = require('rxjs');

const { getConfig } = require('../config/config');
const {
  checkWorkspace,
  parseService,
  parseTemplate,
} = require('../config/helpers');
const {
  installModules,
  makeEnvPackage,
  renamePackageJson,
  resetEnvironment,
} = require('../handlers/setup');
const {
  cloneStaged,
  cloneRepository,
} = require('../handlers/git');

const { isFalsy } = require('../utils/type-guards');


/* TASKS */

/**
 * Create a workspace folder if it does not exist.
 * @param {string} title task title
 */
const createWorkspace = async (title) => {

  const { cwd } = getConfig();
  const exists  = await checkWorkspace();

  return {
    title,
    task: () => resetEnvironment(cwd, null, true),
    enabled: () => !exists.workspace,
  };

};

/**
 * Verify cache.
 * @param {string}    title task title
 * @param {boolean} verbose global _verbose_ option
 */
const setupTemplates = (title, verbose) => {

  const { cwd, services, models } = getConfig();

  if (isFalsy(services))
    throw new Error('Services are not configured');

  // Get an array of unique template addresses
  const templateSet = new Set();
  services.forEach(service =>  templateSet.add(service.template));
  models.forEach(model => templateSet.add(model.codegen));
  const templates = Array.from(templateSet);

  return {
    title,
    task: () => new Listr(
      templates.map(repository => ({

        title: repository,

        task: (ctx, task) => new Observable(async observer => {

          try {

            observer.next('checking cache');
            const template = await parseTemplate(repository);

            if (template.source && template.installed) {
              task.skip('Source repositories are managed manually');
              observer.complete();
            }

            if (!template.source && template.installed) {
              task.skip('Repository already in cache, use "setup --update" to refresh');
              observer.complete();
            }

            if (template.source && !template.installed) {
              observer.error(new Error('Source repository does not exist'));
              observer.complete();
            }

            observer.next(`cloning ${repository}`);
            await cloneRepository(cwd, {
              source: repository,
              output: template.path,
              verbose,
            });

          }
          catch (error) {

            if (verbose) observer.next(error.message);
            observer.error(error);

          }

          observer.complete();
        }),

      })), {
        concurrent: !verbose,
      },
    )
  };
};

/**
 * Re-create services.
 * @param {string}    title task title
 * @param {boolean} verbose global _verbose_ option
 */
const setupServices = (title, verbose) => {

  const { cwd, services } = getConfig();

  if (isFalsy(services))
    throw new Error('Services must be configured to setup services');

  return {
    title,
    task: () => new Listr(
      services.map(serviceJson => ({

        title: serviceJson.name,

        task: () => new Observable(async observer => {

          const { branch, name, path, template } = await parseService(serviceJson);

          try {

            observer.next(`removing ${name}`);
            await resetEnvironment(cwd, path);

            observer.next(`cloning from ${template.path}`);
            await cloneRepository(cwd, {
              branch: branch,
              source: template.path,
              output: path,
              verbose,
            });

            if (template.source) {

              observer.next('patching staged changes');
              await cloneStaged(cwd, template.path, path, verbose);
            }

            observer.next(`renaming ${name} package.json`);
            await renamePackageJson(cwd, path);

          }
          catch (error) {

            if (verbose)
              observer.next(error.message);
            observer.error(error);

          }

          observer.complete();
        })

      })), {
        concurrent: !verbose,
      }
    )
  };
};

/**
 * Create `yarn workspaces` and install node modules.
 * @param {string}        title task title
 * @param {boolean}     verbose global _verbose_ option
 * @param {()=>boolean} enabled task enabler
 */
const setupModules = (title, verbose) => ({
  title,
  task: () => new Observable(async observer => {

    const { cwd, services } = getConfig();

    try {

      observer.next('reading packages');
      const packages = await services.reduce(
        async (asyncSet, serviceJson) => {

          const { path, template } = await parseService(serviceJson);

          const pkgs = await asyncSet;

          pkgs.add(path);
          if (!template.source)
            pkgs.add(template.path);

          return pkgs;

        },
        Promise.resolve(new Set()),
      )
 ;
      observer.next('creating environment package');
      await makeEnvPackage(cwd, Array.from(packages));

      observer.next(`installing node_modules in ${cwd}`);
      await installModules(cwd, verbose);
    }
    catch (error) {
      if (verbose)
        observer.next(error.message);
      observer.error(error);
    }

    observer.complete();

  }),
  skip: async () => {
    const { cache, services } = await checkWorkspace();
    return !( cache || services) && 'Neither cache nor services exist in the workspace';
  }
});

/* COMMAND */

exports.command = 'setup';

exports.describe = 'Setup a testing environment workspace.';

exports.builder = {
  modules: {
    describe: 'Install node modules',
    group: 'Setup',
    type: 'boolean',
  },
  services: {
    describe: 'Setup configured services',
    group: 'Setup',
    type: 'boolean',
  }
};

exports.setupTasks = {
  createWorkspace,
  setupModules,
  setupServices,
  setupTemplates,
};

/**
 * Command execution handler.
 *
 * @typedef  {Object} SetupOpts Setup command options.
 * @property {boolean}  modules install node modules
 * @property {boolean} services clone services
 * @property {boolean}  verbose global _verbose_ option
 *
 * @param {SetupOpts} opts setup command options
 */
exports.handler = async (opts) => {

  const { modules, services, verbose } = opts;

  const defaultRun = !modules && !services;

  const tasks = new Listr({
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  tasks.add( await createWorkspace('Create workspace') );

  if (defaultRun) tasks.add(
    setupTemplates('Check repository cache', verbose)
  );

  // --services
  if (services || defaultRun) tasks.add(
    setupServices('Setup services', verbose)
  );

  // --modules
  if (modules || services || defaultRun) tasks.add(
    setupModules( 'Install node modules', verbose)
  );

  tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });

};
