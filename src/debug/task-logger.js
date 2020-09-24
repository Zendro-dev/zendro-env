const { stdout } = require('process');
//
const { gray, green, red, yellow } = require('chalk');


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

    stdout.write(`  ${msg} ... `);

  }

  static end (msg) {

    stdout.write(green('done\n'));

  }

  static groupBegin (msg) {

    stdout.write( gray(this.wrapBegin, `START: ${msg}`, this.wrapEnd) );

  }

  static groupEnd (msg) {

    stdout.write( gray(this.wrapBegin, `END: ${msg}`, this.wrapEnd) );

  }

};