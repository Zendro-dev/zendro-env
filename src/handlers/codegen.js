const { execSync }                  = require('child_process');
const { readFileSync }              = require('fs');
const { join, parse, resolve, sep } = require('path');
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
 * Get the executable paths of the testing environment generators.
 *
 * @typedef {Object} TemplateMain
 * @property {string?} gql-codegen
 * @property {string?} spa-codegen
 *
 * @param {string}         cwd       path to workspace
 * @param {string[]}       keys      template keys to retrieve the bin for
 * @param {EnvTemplates}   templates template environment in the .testenv config
 * @returns {TemplateMain} object of { key: 'path/to/main } values
 */
exports.getTemplateMain = function (cwd, templates) {

  /**
   * Reducer function to return the main file of each package.
   * @param {Object<string,string>} acc      accumulator object
   * @param {[string, TemplateDef]} template entry array of [key, TemplateDef]
   */
  const pathReducer = (acc, template) => {

    const [ key, { source, url } ] = template;

    // Resolve path to module repository
    const modulePath = source
      ? resolve(cwd, parse(url).dir)
      : resolve(cwd, 'templates', key);

    // Read module package.json
    const packageJson = JSON.parse(
      readFileSync( join(modulePath, 'package.json') )
    );

    // Compose main path ("null" if main is not defined in package.json)
    const { main } = packageJson;
    const mainPath = main
      ? join(modulePath, packageJson.main)
      : null;

    // Return a "{ key: 'path/to/main' }" object
    return Object.assign(acc, { [key]: mainPath });
  };

  return Object.entries(templates).reduce(pathReducer, {});

};

/**
 *
 * @param {TemplateMain} exec      paths to template executable files
 * @param {string}       cwd       path to workspace
 * @param {EnvInstances} instances environment instances object
 * @param {ModelDef[]}   models    code-generator model definitions
 * @param {boolean}      verbose   global _verbose_ option
 */
exports.generateCode = function (exec, cwd, instances, models, verbose) {

  console.log(cwd);

  models.forEach(({ path, target }) => {

    target.forEach(name => {

      LogTask.begin(`Generating code for ${name}`);

      // Assign codegen input-output paths
      const inPath = path;
      const outPath = join('instances', name);

      // Compose codegen command depending on whether it is a graphql-server
      // or single-page-app instance.
      const cmd = instances['gql'].includes(name)
        ? `node ${exec['gql-codegen']} -f ${inPath} -o ${outPath}`
        : `node ${exec['spa-codegen']} -f ${inPath} -o ${outPath} -P -D`;

      // Generate code
      execSync(cmd, {
        cwd,
        stdio: verbose ? 'inherit' : 'ignore',
      });

      LogTask.end('Generated code');

    });

  });

};
