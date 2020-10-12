const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');

const { getConfig }  = require('../config/config');
const { expandPath } = require('../config/helpers');
const {
  checkWorkspace,
  cloneTemplate,
  cloneService,
  installWorkspace,
  resetEnvironment,
} = require('../handlers/setup');


/* TASKS */

/**
 * Create a workspace folder if it does not exist.
 * @param {string} title task title
 * @param {string}   cwd path to working directory
 */
const createWorkspace = (title, cwd) => ({
  title,
  task: () => resetEnvironment(cwd, null, true),
  skip: async () => await checkWorkspace(cwd) ? 'Workspace folder exists' : false,
});

/**
 * Re-generate upstream templates.
 * @param {string}         title task title
 * @param {string}           cwd path to working directory
 * @param {Template[]} templates list of templates
 * @param {boolean}      verbose global _verbose_ option
 * @param {()=>boolean}  enabled task enabler
 */
const setupTemplates = (title, cwd, templates, verbose, enabled) => ({
  title,
  task: () => new Listr([
    {
      title: 'Remove existing templates',
      task: () => resetEnvironment(cwd, 'templates'),
      skip: async () => await checkWorkspace(cwd, 'templates') ? false : 'No templates to remove',
    },
    {
      title: 'Clone templates',
      task: () => new Listr(
        templates.map(template => ({
          title: template.name,
          task: () => cloneTemplate(cwd, template, verbose),
          skip: () => template.source
            ? `Using ${template.name} as source.`
            : false
        })),
        {
          concurrent: !verbose,
        },
      )
    }
  ]),
  enabled,
});

/**
 * Re-create services.
 * @param {string}        title task title
 * @param {string}          cwd path to working directory
 * @param {Service[]}  services list of services
 * @param {boolean}     verbose global _verbose_ option
 * @param {()=>boolean} enabled task enabler
 */
const setupServices = (title, cwd, services, verbose, enabled) => ({
  title,
  task: () => new Listr([
    {
      title: 'Remove existing services',
      task: () => resetEnvironment(cwd, 'services'),
      skip: async () => await checkWorkspace(cwd, 'services') ? false : 'No services to remove',
    },
    {
      title: 'Clone services from templates',
      task: () => new Listr(
        services.map(({ template, name }) => ({
          title: name,
          task: () => cloneService(cwd, expandPath(template), expandPath(name), verbose),
        })),
        {
          concurrent: !verbose,
        }
      )
    }
  ]),
  enabled,
});

/**
 * Create `yarn workspaces` and install node modules.
 * @param {string}        title task title
 * @param {string}          cwd path to working directory
 * @param {boolean}     verbose global _verbose_ option
 * @param {()=>boolean} enabled task enabler
 */
const setupModules = (title, cwd, verbose, enabled) => ({
  title,
  task: () => installWorkspace(cwd, verbose),
  enabled,
});

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
exports.handler = (opts) => {

  const { cwd, services, templates } = getConfig();
  const { install, template, service, verbose } = opts;

  const defaultRun = !install && !service && !template;

  const tasks = new Listr([
    createWorkspace(
      'Create workspace',
      cwd,
    ),
    setupTemplates(
      'Set up templates',
      cwd, templates, verbose,
      () => template || defaultRun
    ),
    setupServices(
      'Set up new services',
      cwd, services, verbose,
      () => service || defaultRun,
    ),
    setupModules(
      'Install yarn workspace',
      cwd, verbose,
      () => install || defaultRun,
    )
  ],
  {
    renderer: verbose ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  tasks.run().catch(err => { /* console.error */ });

};
