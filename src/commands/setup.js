const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { Observable }  = require('rxjs');

const { getConfig } = require('../config/config');

const {
  checkWorkspace,
  parseService,
  parseTemplate,
  getTemplates,
} = require('../config/helpers');

const {
  installModules,
  makeEnvPackage,
  renamePackageJson,
  resetEnvironment,
} = require('../handlers/setup');

const {
  checkoutBranch,
  cloneStaged,
  cloneRepository,
  fetchAll,
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

  const { cwd, services } = getConfig();

  if (isFalsy(services))
    throw new Error('Services are not configured');

  const templates = getTemplates();

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

            else if (!template.source && template.installed) {
              task.skip('Repository already in cache, use "setup --update" to refresh');
              observer.complete();
            }

            else if (template.source && !template.installed) {
              observer.error(new Error('Source repository does not exist'));
              observer.complete();
            }

            else {
              observer.next(`cloning ${repository}`);
              await cloneRepository(cwd, {
                source: repository,
                output: template.path,
                verbose,
              });
            }

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

          const { template, ...service } = await parseService(serviceJson);

          try {

            // Force repository cache to checkout the target branch
            if (!template.source) {
              observer.next(`checkout ${template.branch}`);
              await checkoutBranch(cwd, template.path, service.branch, verbose);
            }

            observer.next(`removing ${service.name}`);
            await resetEnvironment(cwd, service.path, false);

            observer.next(`cloning from ${template.path}`);
            await cloneRepository(cwd, {
              branch: template.source ? null : service.branch,
              source: template.path,
              output: service.path,
              verbose,
            });

            if (template.source) {

              observer.next('patching staged changes');
              await cloneStaged(cwd, template.path, service.path, verbose);
            }

            observer.next(`renaming ${service.name} package.json`);
            await renamePackageJson(cwd, service.path);

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

/**
 * Update the internal repository cache with the latest remote changes.
 * @param {string} title task title
 * @param {boolean} verbose global _verbose_ option
 */
const updateCache = (title, verbose) => {

  const { cwd } = getConfig();
  const templates = getTemplates();

  return ({
    title,
    task: () => new Listr(
      templates.map(templateName => ({

        title: templateName,

        task: (ctx, task) => new Observable(async observer => {

          const template = await parseTemplate(templateName);

          if (template.source) {
            task.skip('source repositories are managed manually');
          }

          else if (!template.installed) {
            task.skip(`repository ${template.name} not installed in cache`);
          }

          else {

            try {
              observer.next('fetching latest changes from remote');
              await fetchAll(cwd, template.path, verbose);
            }
            catch (error) {
              observer.error(error);
            }
          }

          observer.complete();

        })

      })), {
        concurrent: !verbose,
      }
    )
  });
};

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
  },
  update: {
    describe: 'Update remotes in the internal cache',
    group: 'Setup',
    type: 'boolean',
  }
};

exports.setupTasks = {
  createWorkspace,
  setupModules,
  setupServices,
  setupTemplates,
  updateCache,
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

  const { modules, services, update, verbose } = opts;

  const defaultRun = !modules && !services && !update;

  const tasks = new Listr({
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  tasks.add( await createWorkspace('Create workspace') );

  // always check the cache
  if (defaultRun) tasks.add(
    setupTemplates('Check repository cache', verbose)
  );

  // --update
  if (update) tasks.add(
    updateCache('Update repository cache', verbose)
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
