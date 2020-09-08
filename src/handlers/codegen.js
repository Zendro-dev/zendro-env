const { execSync }             = require('child_process');
const { readFileSync }         = require('fs');
const { join, parse, resolve } = require('path');
//
const { LogTask } = require('../debug/task-logger');
//
require('../typedefs');


/**
 *
 * @param {string}     cwd     path to workspace
 * @param {EnvPatches} patches config object for patches
 * @param {boolean}    verbose global _verbose_ option
 */
exports.applyPatches = function (cwd, patches, verbose) {

  patches.forEach(({ name, src, dest }) => {

    LogTask.begin(`Applying patch for ${name}`);

    const resolvedSrc = resolve(cwd, src);
    const resolvedDest = resolve(cwd, 'instances', name, dest);
    execSync(`patch ${resolvedDest} ${resolvedSrc}`, {
      cwd,
      stdio: verbose ? 'inherit' : 'ignore'
    });

    LogTask.end();

  });

};

/**
 * Get the executable paths of the testing environment generators.
 * @param {string}        cwd       path to workspace
 * @param {string[]}      keys      template keys to retrieve the bin for
 * @param {TestTemplates} templates template environment in the .testenv config
 * @returns {TemplateMain} object of { key: 'path/to/main } values
 */
exports.getTemplateMain = function (cwd, templates) {

  /**
   * Reducer function to return the main file of each package.
   * @param {Object<string,string>} acc      accumulator object
   * @param {[string, TemplateDef]} template entry array of [key, TemplateDef]
   */
  const reducer = (acc, template) => {

    const [ key, { source, url } ] = template;

    // Resolve path to module repository
    const modulePath = source
      ? resolve(cwd, parse(url).dir)
      : resolve(cwd, 'templates', key);

    // Read module package.json
    const packageJson = JSON.parse(
      readFileSync( join(modulePath, 'package.json') )
    );

    // Compose main path ("undefined" if main is not defined in package.json)
    const { main } = packageJson;
    const mainPath = main
      ? join(modulePath, packageJson.main)
      : undefined;

    // Return a "{ key: 'path/to/main' }" object
    return Object.assign(acc, { [key]: mainPath });
  };

  return Object.entries(templates).reduce(reducer, {});

};

/**
 *
 * @param {TemplateMain} execs  paths to template executable files
 * @param {string}       cwd    path to workspace
 * @param {EnvModels}    models code-generator model definitions
 * @param {boolean}      verbose global _verbose_ option
 */
exports.generateCode = function (exec, cwd, models, verbose) {

  const {
    'gql-codegen': gqlCodegen,
    'spa-codegen': spaCodegen
  } = exec;

  models.forEach(({ path, gql, spa }) => {

    gql.forEach(name => {

      LogTask.begin(`Generating code for ${name}`);

      const inPath = path;
      const outPath = join('instances', name);
      execSync(`node ${gqlCodegen} -f ${inPath} -o ${outPath}`, {
        cwd,
        stdio: verbose ? 'inherit' : 'ignore',
      });

      LogTask.end('Generated code');

    });

    spa.forEach(name => {

      LogTask.begin(`Generating code for ${name}`);

      const inPath = path;
      const outPath = join('instances', name);
      execSync(`node ${spaCodegen} -f ${inPath} -o ${outPath} -P -D`, {
        cwd,
        stdio: verbose ? 'inherit' : 'ignore',
      });

      LogTask.end();

    });

  });

};
