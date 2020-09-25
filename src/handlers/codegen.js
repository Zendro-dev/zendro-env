const { execSync }             = require('child_process');
const { readFileSync }         = require('fs');
const { join, parse, resolve } = require('path');
const { LogTask }              = require('../debug/task-logger');


/**
 *
 * @param {string}   cwd     path to workspace
 * @param {string}   src     path to patch source file
 * @param {string}   dest    path to patch destination file
 * @param {string[]} opts    array of patch options
 * @param {boolean}  verbose global _verbose_ option
 */
exports.applyPatches = function (cwd, src, dest, opts, verbose) {

  LogTask.begin(`Applying patch: ${src}`);

  // Wrap patch options in quotes if they contain whitespaces
  const resolvedArgs = opts
    .map(arg => {

      if (/\s/g.test(arg))
        return `\\"${arg}\\"`;

      return arg;
    })
    .join(' ');

  execSync(`patch ${resolvedArgs} ${dest} ${src}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore'
  });

  LogTask.end();

};

/**
 *
 * @param {string}      cwd      path to workspace folder
 * @param {TemplateDef} template path to template folder
 */
exports.getTemplateMain = function (cwd, template) {

  // Resolve template path
  const templatePath = template.source
    ? parse(template.url).dir
    : join('templates', template.name);

  // Read module package.json
  const packageJson = JSON.parse(
    readFileSync( resolve(cwd, join(templatePath, 'package.json')) )
  );

  // Compose main path ("null" if main is not defined in package.json)
  const { main } = packageJson;
  const mainPath = main
    ? join(templatePath, packageJson.main)
    : null;

  return mainPath;
};

/**
 * Generate code for a target service.
 * @param {string}   cwd           path to workspace folder
 * @param {string}   modelPath     path to code-generator model definitions folder
 * @param {string[]} targetService path to target service folder
 * @param {string}   codegenMain   path to code-generator main .js file
 * @param {string}   codegenOpts   additional code-generator options
 * @param {boolean}  verbose       global _verbose_ option
 */
exports.generateCode = function (
  cwd, modelPath, targetService, codegenMain, codegenOpts, verbose
) {

  LogTask.begin(`Generating code for ${targetService}`);

  // Assign codegen input-output paths
  const inPath  = modelPath;
  const outPath = join('services', targetService);

  // Compose codegen options if provided
  const opts = codegenOpts
    ? codegenOpts.join(' ')
    : '';

  // Generate code
  execSync(`node ${codegenMain} -f ${inPath} -o ${outPath} ${opts}`, {
    cwd,
    stdio: verbose ? 'inherit' : 'ignore',
  });

  LogTask.end('Generated code');

};
