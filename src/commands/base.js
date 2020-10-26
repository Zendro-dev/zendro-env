const Listr           = require('listr');
const VerboseRenderer = require('listr-verbose-renderer');
const UpdaterRenderer = require('listr-update-renderer');

const { getConfig }        = require('../config/config');

const { destroyTasks } = require('./destroy');
const { dockerTasks }  = require('./docker');
const { codegenTasks } = require('./codegen');
const { setupTasks }   = require('./setup');
const { testTasks }    = require('./test');


exports.command = '* [testNames...]';

exports.describe = 'Create a full environment and run tests';

exports.builder = {
  c: {
    alias: 'cleanup',
    describe: 'Remove the full testing environment',
    group: 'Default',
    type: 'boolean',
    conflicts: [ 'b', 'C', 'g', 'k', 't', 'T' ],
  },
  C: {
    alias: 'soft-cleanup',
    describe: 'Remove docker containers and generated code',
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

  /**
   * A default run only supports:
   *    -k, --keep-running
   *    -v, --verbose
   */
  const defaultRun = !opts.c && !opts.C && !opts.g && !opts.t && !opts.T;

  const tasks = new Listr({
    renderer: opts.v ? VerboseRenderer : UpdaterRenderer,
    collapse: false,
  });

  if (defaultRun) tasks.add([

    await setupTasks.createWorkspace('Create workspace'),
    setupTasks.setupTemplates('Set up templates', opts.v),
    setupTasks.updateCache('Updating cache', opts.v),
    setupTasks.setupServices('Set up service instances', opts.v),
    setupTasks.setupModules('Install yarn workspace', opts.v),

    await codegenTasks.generateServicesCode('Generate code', opts.v),
    codegenTasks.applyPatches('Apply patches', opts.v),

    dockerTasks.upDockerContainers('Start docker containers', opts.v),
    dockerTasks.checkDockerServiceConnections('Check service connections', opts.v),

  ]);

  if (opts.c) tasks.add([
    destroyTasks.destroyDockerEnv('Remove docker environment', opts.v),
    destroyTasks.destroyWorkEnv('Remove work environment'),
  ]);

  if (opts.C) tasks.add([
    dockerTasks.downDockerContainers('Stop docker containers', opts.v),
    await codegenTasks.resetServices('Remove generated code', opts.v),
  ]);

  if (opts.g) tasks.add([
    dockerTasks.downDockerContainers('Stop docker containers', opts.v),
    await codegenTasks.resetServices('Remove generated code', opts.v),
    await codegenTasks.generateServicesCode('Generate code', opts.v),
    codegenTasks.applyPatches('Apply patches', opts.v),
  ]);

  if (opts.T) tasks.add([
    dockerTasks.downDockerContainers('Stop docker containers', opts.v),
    await codegenTasks.resetServices('Remove generated code', opts.v),
    await codegenTasks.generateServicesCode('Generate code', opts.v),
    dockerTasks.upDockerContainers('Start docker containers', opts.v),
    dockerTasks.checkDockerServiceConnections('Check service connections', opts.v),
  ]);

  await tasks.run().catch(error => {
    console.error(error.message);
    process.exit(error.errno);
  });

  // -t, --run-tests-only || -T, --generate-code-and-run-tests
  if (opts.t || opts.T || defaultRun)
    await testTasks.runTests(opts.testNames);

  // default && _not_ -k, keep-running
  if (defaultRun && !opts.k)
    await dockerTasks.downDockerContainers('', true).task();

};