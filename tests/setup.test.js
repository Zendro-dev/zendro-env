const { getConfig }                  = require('../src/config/config');
const { checkWorkspace, expandPath } = require('../src/config/helpers');

const {
  cloneTemplate, cloneService, installModules, renamePackageJson,
} = require('../src/handlers/setup');


describe('Setup handlers', () => {

  const { cwd, services, templates } = getConfig();

  beforeEach(async () => {
    const { rmdir } = require('fs/promises');
    const { mkdir } = require('fs/promises');
    await rmdir(cwd, { recursive: true });
    await mkdir(cwd, { recursive: true });
  });

  afterEach(async () => {
    const { rmdir } = require('fs/promises');
    await rmdir(cwd, { recursive: true });
  });

  test('01. should clone templates from upstream remotes', async () => {

    const template = templates.find(template => template.name === 'gql');

    const dest = expandPath(template.name);

    const cmd = await cloneTemplate(cwd, 'master', template.url, dest);
    expect(cmd.failed).toBe(false);

    const exists = await checkWorkspace(cwd);
    expect(exists.templates).toBe(true);
  });

  test('02. should clone services from templates', async () => {

    const template = templates.find(template => template.name === 'gql');
    const service = services.find(service => service.name === 'gql_server1');

    const templatePath = expandPath(service.template);
    const servicePath  = expandPath(service.name);

    await cloneTemplate(cwd, 'master', template.url, templatePath);

    const cmd = await cloneService(cwd, templatePath, servicePath);
    const exists = await checkWorkspace(cwd);

    expect(cmd.failed).toBe(false);
    expect(exists.services).toBe(true);

  });

  test('03. should rename package.json #name property', async () => {

    const { readFile } = require('fs/promises');
    const { join }     = require('path');

    const template = templates.find(template => template.name === 'gql');
    const service = services.find(service => service.name === 'gql_server1');

    const templatePath = expandPath(service.template);
    const servicePath  = expandPath(service.name);

    await cloneTemplate(cwd, 'master', template.url, templatePath);
    await cloneService(cwd, templatePath, servicePath);
    await renamePackageJson(cwd, servicePath);

    const jsonFile = await readFile(join(cwd, servicePath, 'package.json'), {
      encoding: 'utf8'
    });
    const { name } = JSON.parse(jsonFile);
    expect(name).toEqual(service.name);

  });

  // test('04. should install node modules', async () => {

  //   const template = templates.find(template => template.name === 'gql');
  //   const service = services.find(service => service.name === 'gql_server1');

  //   const templatePath = expandPath(template.name);
  //   const servicePath  = expandPath(service.name);

  //   await cloneTemplate(cwd, 'master', template.url, templatePath);
  //   await cloneService(cwd, templatePath, servicePath);

  //   const cmd = await installModules(cwd);
  //   expect(cmd.failed).toBe(false);

  //   const exists = await checkWorkspace(cwd);
  //   expect(exists.modules).toBe(true);

  // });

});
