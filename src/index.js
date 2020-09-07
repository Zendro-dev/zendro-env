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

// Parse command-line
yargs
  .commandDir('./commands')   // add commands
  .demandCommand()            // a command must be provided
  .options(globalOpts)        // add global options
  .strict()                   // do not allow unknown options
  .wrap(120)                  // adjust stdout to 100 columns
  .parse();                   // parse and execute command handlers
