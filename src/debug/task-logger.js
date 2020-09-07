const { stdout } = require('process');
//
const { gray, green, red, yellow } = require('chalk');


module.exports.LogTask = class LogTask {

  static wrapBegin = gray('\n@@ ----------------------------');
  static wrapEnd = gray('\n\n---------------------------- @@')

  static _verbose = false;
  static get verbose () {
    return this._verbose;
  }
  static set verbose (val) {
    this._verbose = val;
  }


  static groupBegin (msg) {

    stdout.write(this.wrapBegin + '\n' + gray('@@', msg) + '\n');

  }

  static groupEnd () {

    stdout.write(this.wrapEnd + '\n');

  }

  static begin (msg) {

    stdout.write(`\n@@ ${msg} ... `);

  }

  static end (msg) {

    if (this.verbose)
      stdout.write(`\n@@ ${msg} ...`, green('done'));
    else
      stdout.write(green('done'));

  }
};