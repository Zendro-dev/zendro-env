const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { Observable }  = require('rxjs');

const { getConfig } = require('../config/config');
const {
  checkWorkspace,
  expandPath
} = require('../config/helpers');
const {
  cloneTemplate,
  cloneService,
  cloneStaged,
  installModules,
  renamePackageJson,
  resetEnvironment,
} = require('../handlers/setup');

const { isFalsy } = require('../utils/type-guards');


/* TASKS */

/**
 * Create a workspace folder if it does not exist.
 * @param {string} title task title
 */
const createWorkspace = (title) => {

  const { cwd } = getConfig();

  return {
    title,
    task: () => resetEnvironment(cwd, null, true),
  };

};

/**
 * Destroy any folder within the workspace. If the `folderPath` argument is not
 * specified, the entire workspace will be destroyed.
 * @param {string}       title task title
 * @param {string?} folderPath path to workspace folder
 */
const resetWorkspace = (title, folderPath, verbose) => {

  const { cwd } = getConfig();

  return {
    title,
    task: () => new Observable(async observer => {

      try {
        observer.next(`Removing ${folderPath}`);
        await resetEnvironment(cwd, folderPath);
      }
      catch (error) {
        if (verbose)
          observer.next(error.message);
        observer.error(error);
      }

      observer.complete();
    })
  };
};

/**
 * Re-generate upstream templates.
 * @param {string}    title task title
 * @param {boolean} verbose global _verbose_ option
 */
const setupTemplates = (title, verbose) => {

  const { cwd, templates } = getConfig();

  if (isFalsy(templates))
    throw new Error('Templates property is not configured');

  return {
    title,
    task: () => new Listr(
      templates.map(template => {

        const { branch, name, source, url } = template;
        const dest = expandPath(name);

        return {

          title: name,

          task: () => new Observable(async observer => {

            observer.next(`cloning ${url}`);

            try {
              await cloneTemplate(cwd, branch, url, dest, verbose);
            }
            catch (error) {
              if (verbose)
                observer.next(error.message);
              observer.error(error);
            }

            observer.complete();
          }),

          skip: () => source
            ? `Using ${name} as source.`
            : false

        };
      }), {
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

  const { cwd, services, templates } = getConfig();

  if (isFalsy(templates))
    throw new Error('Templates must be configured to setup services');

  if (isFalsy(services))
    throw new Error('Services must be configured to setup services');

  return {
    title,
    task: () => new Listr(
      services.map(service => {

        const template = templates.find(t => t.name === service.template);
        const templatePath = expandPath(service.template);
        const servicePath  = expandPath(service.name);

        return {
          title: service.name,
          task: () => new Observable(async observer => {

            try {

              observer.next(`cloning ${templatePath}`);
              await cloneService(cwd, templatePath, servicePath);

              observer.next(`renaming ${servicePath} package.json`);
              await renamePackageJson(cwd, servicePath);

              if (template.source) {

                observer.next('patching staged changes');
                await cloneStaged(cwd, templatePath, servicePath, verbose);
              }
            }
            catch (error) {
              if (verbose)
                observer.next(error.message);
              observer.error(error);
            }

            observer.complete();
          })
        };

      }), {
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
const setupModules = (title, verbose) => {

  const { cwd } = getConfig();

  return {
    title,
    task: () => new Observable(async observer => {

      try {
        observer.next(`Installing node_modules in ${cwd}`);
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
      const { services, templates } = await checkWorkspace();
      return !(templates || services) && 'Neither services nor templates exist in the workspace';
    }
  };

};

/* COMMAND */

exports.command = 'setup';

exports.describe = 'Setup a testing environment workspace.';

exports.builder = {
  install: {
    describe: 'Install modules (requires instances)',
    group: 'Setup',
    type: 'boolean',
  },
  service: {
    describe: 'Clone instances in config file (requires templates)',
    group: 'Setup',
    type: 'boolean',
  },
  template: {
    describe: 'Clone templates in the config file',
    group: 'Setup',
    type: 'boolean',
  },
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
 * @property {boolean}  install install modules (requires instances)
 * @property {boolean}  service clone services (requires templates)
 * @property {boolean} template clone templates
 * @property {boolean}  verbose global _verbose_ option
 *
 * @param {SetupOpts} opts setup command options
 */
exports.handler = async (opts) => {

  const { install, template, service, verbose } = opts;

  const defaultRun = !install && !service && !template;

  const tasks = new Listr({
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  const exists = await checkWorkspace();

  if (!exists.workspace) {
    tasks.add( createWorkspace('Create workspace') );
  }

  // --templates
  if (template || defaultRun) {

    if (exists.templates) tasks.add(
      resetWorkspace('Remove existing templates', 'templates')
    );

    tasks.add( setupTemplates('Clone templates', verbose) );
  }

  // --services
  if (service || defaultRun) {

    if (exists.services) tasks.add(
      resetWorkspace('Remove existing services', 'services')
    );

    tasks.add( setupServices('Clone services', verbose) );
  }

  // --modules
  if (install || defaultRun) tasks.add(
    setupModules( 'Install yarn workspace', verbose)
  );

  tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });

};
