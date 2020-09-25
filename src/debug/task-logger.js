const { stdout } = require('process');
//
const { gray, green, red, yellow,  } = require('chalk');


module.exports.LogTask = class LogTask {

  static wrapBegin = '\n---------------------------------------\n';
  static wrapEnd   = '\n---------------------------------------\n\n'

  static _verbose = false;
  static get verbose () {
    return this._verbose;
  }
  static set verbose (val) {
    this._verbose = val;
  }

  static begin (msg) {

    if (this._verbose)
      stdout.write(yellow(`${msg} ... \n\n`));
    else
      stdout.write(`${msg} ... `);

  }

  static end () {

    if (this._verbose)
      stdout.write(green('\ndone\n\n'));
    else
      stdout.write(green('done\n'));

  }

  static groupBegin (msg) {

    stdout.write( gray(this.wrapBegin, `START: ${msg}`, this.wrapEnd) );

  }

  static groupEnd (msg) {

    stdout.write( gray(this.wrapBegin, `END: ${msg}`, this.wrapEnd) );

  }

};