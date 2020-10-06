const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');

const { getConfig }        = require('../config/config');
const { resetEnvironment } = require('../handlers/setup');
const { downContainers }   = require('../handlers/docker');

const { destroyTasks } = require('./destroy');
const { dockerTasks }  = require('./docker');
const { codegenTasks } = require('./codegen');
const { setupTasks }   = require('./setup');
const { testTasks }    = require('./test');


exports.command = '* [testNames...]';

exports.describe = 'Default run to create a full environment and run tests';

exports.builder = {
  // b: {
  //   alias: 'branch',
  //   describe: 'Checkout all services to a different feature branch',
  //   group: 'Default',
  //   requiresArg: true,
  //   type: 'string',
  // },
  c: {
    alias: 'cleanup',
    describe: 'Remove the full testing environment',
    group: 'Default',
    type: 'boolean',
    conflicts: [ 'b', 'C', 'g', 'k', 't', 'T' ],
  },
  C: {
    alias: 'soft-cleanup',
    describe: 'Reset docker-compose and delete generated code',
    group: 'Default',
    type: 'boolean',
    conflicts: [ 'b', 'c', 'g', 'k', 't', 'T' ],
  },
  g: {
    alias: 'generate-code',
    describe: 'Generate code and apply patches',
    group: 'Default',
    type: 'boolean',
    conflicts: [ 't', 'T' ]
  },
  k: {
    alias: 'keep-running',
    describe: 'Keep containers running',
    group: 'Default',
    type: 'boolean',
  },
  t: {
    alias: 'run-tests-only',
    describe: 'Run tests',
    group: 'Default',
    type: 'boolean',
    conflicts: [ 'g', 'T' ],
  },
  T: {
    alias: 'generate-code-and-run-tests',
    describe: 'Regenerate code, apply patches, and run tests',
    group: 'Default',
    type: 'boolean',
    conflicts: [ 'g', 't' ],
  },
};

/**
 * @typedef  {Object}   DefaultOpts Default command options
 * @property {string[]}   testNames positional argument with test names to run (optional)
 * @property {boolean}            c remove full testing environment
 * @property {boolean}            C reset docker and services
 * @property {boolean}            g generate code and apply patches
 * @property {boolean}            k keep docker containers running
 * @property {boolean}            t run test suites
 * @property {boolean}            T regenerate code, apply patches, and run tests
 * @property {boolean}            v global _verbose_ option
 *
 * @param {DefaultOpts} opts default command options
 */
exports.handler = async (opts) => {

  const {
    cwd, docker, models, patches, services, templates, tests,
  } = getConfig();

  /**
   * Only runs with:
   *    -k, --keep-running
   *    -v, --verbose
   */
  const defaultRun = !opts.c && !opts.C && !opts.g && !opts.t && !opts.T;

  const tasks = new Listr([
    // default: setup the environment and run tests
    {
      title: 'Default testing run',
      task: () => new Listr([
        setupTasks.setupTemplates(
          'Clone upstream templates',
          cwd, templates, opts.v,
        ),
        setupTasks.setupServices(
          'Clone services from templates',
          cwd, services, opts.v,
        ),
        setupTasks.setupModules(
          'Install yarn workspace',
          cwd, opts.v,
        ),
        codegenTasks.resetServices(
          'Reset service repositories',
          cwd, services, opts.v,
        ),
        codegenTasks.generateServices(
          'Generate code',
          cwd, models, services, templates, opts.v,
        ),
        codegenTasks.applyPatches(
          'Apply patches',
          cwd, patches, opts.v,
        ),
        dockerTasks.upDockerContainers(
          'Start docker containers, renew volumes, and remove orphans',
          cwd, docker, opts.v,
        ),
        dockerTasks.checkDockerServiceConnections(
          'Check service connections',
          services, opts.v,
        ),
      ]),
      enabled: () => defaultRun,
    },

    // -c, --cleanup
    {
      title: 'Clean up testing environment',
      task: () => new Listr([
        destroyTasks.destroyDocker(
          'Remove docker environment',
          cwd, docker, opts.v,
        ),
        {
          title: 'Remove work environment',
          task: () => resetEnvironment(cwd, null, false),
        },
      ]),
      enabled: () => opts.c,
    },

    // -C, --soft-cleanup
    {
      title: 'Reset testing environment',
      task: () => new Listr([
        dockerTasks.downDockerContainers(
          'Stop services, remove containers and volumes',
          cwd, docker, opts.v
        ),
        codegenTasks.resetServices(
          'Remove generated code',
          cwd, services, opts.v,
        ),
      ]),
      enabled: () => opts.C
    },

    // -g, --generate-code || -T, --generate-code-and-run-tests
    {
      title: 'Re-generate code and patches',
      task: () => new Listr([
        codegenTasks.resetServices(
          'Reset service repositories',
          cwd, services, opts.v,
        ),
        codegenTasks.generateServices(
          'Generate code',
          cwd, models, services, templates, opts.v,
        ),
        codegenTasks.applyPatches(
          'Apply patches',
          cwd, patches, opts.v,
        ),
      ]),
      enabled: () => opts.g || opts.T
    },

  ], {
    renderer: opts.v ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  await tasks.run().catch(err => { /* console.error */ });

  // -t, --run-tests-only || -T, --generate-code-and-run-tests
  if (opts.t || opts.T || defaultRun)
    await testTasks.runTests(cwd, tests, opts.testNames);

  // default && _not_ -k, keep-running
  if (defaultRun && !opts.k)
    await downContainers(cwd, docker, true);
};