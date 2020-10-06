const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');
const { getConfig }   = require('../config/config');
const {
  cloneTemplate,
  cloneService,
  installWorkspace,
  resetEnvironment,
} = require('../handlers/setup');

/* TASKS */

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
      title: 'Remove templates folder',
      task: () => resetEnvironment(cwd, 'templates'),
    },
    {
      title: 'Clone templates from upstream',
      task: () => new Listr(
        templates.map(template => ({
          title: template.name,
          task: () => cloneTemplate(cwd, template, verbose),
          skip: () => template.source
            ? `Using ${template.name} as source.`
            : false
        })),
        {
          concurrent: verbose ? false : true,
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
      title: 'Remove services folder',
      task: () => resetEnvironment(cwd, 'services'),
    },
    {
      title: 'Clone services from templates',
      task: () => new Listr(
        services.map(({ template, name }) => ({
          title: name,
          task: () => cloneService(cwd, template, name, verbose),
        })),
        {
          concurrent: verbose ? false : true,
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
