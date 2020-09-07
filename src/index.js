const yargs = require('yargs');
const { checkConfig } = require('./config/config');

// Validate config file
checkConfig();

// Declare global options
const globalOpts = {
  v: {
    alias: 'verbose',
    describe: 'Print extra debug information to STDOUT.',
    group: 'Global:',
    type: 'boolean'
  },
};

// Declare use message
const usage = `
Zendro integration-tests environment manager utility.

USAGE:

  # To execute a default integration-test run
  $ ./zendro-test

  # To exert control over each step in the setup process
  $ ./zendro-test <command>

  # To get specific help for a command
  $ ./zendro-test <command> --help
`;

// Parse command-line
yargs
  .commandDir('./commands')   // add commands
  .demandCommand()            // a command must be provided
  .options(globalOpts)        // add global options
  .strict()                   // do not allow unknown options
  .wrap(120)                  // adjust stdout to 100 columns
  .usage(usage)               // add custom usage message
  .parse();                   // parse and execute command handlers
