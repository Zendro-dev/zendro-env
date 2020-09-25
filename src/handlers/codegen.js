const { execSync }                  = require('child_process');
const { existsSync, readFileSync }              = require('fs');
const { join, parse, resolve, sep, relative } = require('path');
//
const { getInstancePath } = require('../config/helpers');
const { LogTask }         = require('../debug/task-logger');


/**
 *
 * @param {string}     cwd     path to workspace
 * @param {PatchDef[]} patches config object for patches
 * @param {boolean}    verbose global _verbose_ option
 */
exports.applyPatches = function (cwd, patches, verbose) {

  patches.forEach(({ args, src, dest }) => {

    LogTask.begin(`Applying patch: ${src}`);

    // Expand instance path if present
    const rootDest     = dest.split(sep)[0];
    const expandedPath = getInstancePath(rootDest);
    const resolvedDest = expandedPath
      ? dest.replace(rootDest, expandedPath)
      : dest;

    // Wrap _patch_ arguments in quotes if they contain whitespaces
    const resolvedArgs = args
      .map(arg => {

        if (/\s/g.test(arg))
          return `\\"${arg}\\"`;

        return arg;
      })
      .join(' ');

    execSync(`patch ${resolvedArgs} ${resolvedDest} ${src}`, {
      cwd,
      stdio: verbose ? 'inherit' : 'ignore'
    });

    LogTask.end();

  });

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
