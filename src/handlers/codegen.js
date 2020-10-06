const { command }              = require('execa');
const { readFile }             = require('fs/promises');
const { join, parse, resolve } = require('path');
const { Observable }           = require('rxjs');
const { expandPath }           = require('../config/helpers');


/**
 *
 * @param {string}      cwd path to workspace folder
 * @param {Patch}     patch patch definition
 * @param {boolean} verbose global _verbose_ option
 */
exports.applyPatch = async function (cwd, patch, verbose) {

  // Wrap patch options in quotes if they contain whitespaces
  const resolvedArgs = patch.opts
    .map(arg => {

      if (/\s/g.test(arg))
        return `\\"${arg}\\"`;

      return arg;
    })
    .join(' ');

  // Expand destination path, if needed
  const dest = expandPath(patch.dest) ?? patch.dest;

  await command(`patch ${resolvedArgs} ${dest} ${patch.src}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore'
  }).catch(error => { throw error; });

};

/**
 * Generate code for a target service.
 * @param {string}       cwd path to workspace folder
 * @param {Model}      model code-generator model definition
 * @param {Service}  service target service
 * @param {Template} codegen code-generator template
 * @param {boolean}  verbose global _verbose_ option
 */
exports.generateCode = async function (cwd, model, service, codegen, verbose) {

  return new Observable(async observer => {

    /* GET CODE-GENERATOR MAIN EXECUTABLE */

    observer.next(`Reading ${codegen.name} <main>.js path`);

    // Path to the code-generator template
    const templatePath = codegen.source
      ? parse(codegen.url).dir
      : join('templates', codegen.name);

    // Read code-generator package.json
    const codegenJsonPath = resolve(cwd, join(templatePath, 'package.json'));
    const json = await readFile(codegenJsonPath).catch(error => {
      observer.error(error);
      observer.complete();
      return;
    });
    const packageJson = JSON.parse(json);

    // Compose path to code-generator main *.js file
    // Will be "null" if main is not defined in package.json
    const { main } = packageJson;
    if (!main) {
      observer.error(new Error(`${codegen.name} <main> is not defined in its package.json`));
      observer.complete();
      return;
    }
    const codegenMain = join(templatePath, main);


    /* RUN CODE-GENERATOR */

    observer.next(`Generating code for ${service.name}`);

    // Assign codegen input/output paths
    const inPath  = model.path;
    const outPath = join('services', service.name);

    // Compose codegen options if provided
    const opts = model.opts
      ? model.opts.join(' ')
      : '';

    // Generate code
    await command(`node ${codegenMain} -f ${inPath} -o ${outPath} ${opts}`, {
      cwd,
      stdio: verbose ? 'inherit' : 'pipe',
    }).catch(error => observer.error(error));

    observer.complete();

  });

};

/**
 *
 * @param {string}      cwd path to working directory
 * @param {Service} service service to reset
 * @param {boolean} verbose global _verbose_ option
 */
exports.resetService = async function (cwd, service, verbose) {

  // Discard changed files
  await command('git reset --hard HEAD', {
    cwd: join(cwd, 'services', service.name),
    stdio: verbose ? 'inherit' : 'pipe',
  });

  // Clean untracked files
  await command('git clean -fd', {
    cwd: join(cwd, 'services', service.name),
    stdio: verbose ? 'inherit' : 'pipe',
  });
};
