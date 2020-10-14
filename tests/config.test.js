const { join } = require('path');

const { expect, use }            = require('chai');
const { describe, before, test } = require('mocha');
const { replace, restore }       = require('sinon');

use( require('chai-as-promised') );


describe('Tool configuration', () => {

  let configObj;

  before(() => {

    /**
     * Replace the process.cwd() call to return the absolute path to the
     * mocks folder.
     *
     * This is required for the `find-up` module to find the config
     * file localted in mocks/.
     */

    const cwd = process.cwd();
    replace(process, 'cwd', () => join(cwd, './tests/mocks'));

    const { getConfig } = require('../src/config/config');
    configObj = getConfig();

  });

  describe('Config is imported', () => {

    test('01. should find the .testenv.json file', () => {

      const configJson = require('./mocks/.testenv.json');
      expect(configObj).to.deep.equal(configJson);

    });

  });

  describe('Helper `checkWorkspace` is invoked', () => {

    before(function () {

      /**
       * Mock the `stat` async function to resolve or reject the expected paths
       * as requested by the `checkWorkspace` function.
       *
       * Here we mock some folders as being present or absent (ENOENT) within the workspace.
       * An illegal exception is also thrown to test other errors than ENOENT.
       */

      replace(require('fs/promises'), 'stat', (path) => {

        const exist = [
          configObj.cwd,
          join(configObj.cwd, 'templates'),
        ];

        const notexist = [
          join(configObj.cwd, 'services'),
          join(configObj.cwd, 'node_modules'),
        ];

        if (exist.includes(path))
          return Promise.resolve(true);

        if (notexist.includes(path))
          return Promise.reject({ code: 'ENOENT'});

        throw new Error('Non-ENOENT error thrown');
      });

    });

    test('02. should correctly check the workspace integrity', async () => {

      const { checkWorkspace } = require('../src/config/helpers');
      const exists = await checkWorkspace(configObj.cwd);

      expect(exists).to.deep.equal({
        modules: false,
        services: false,
        templates: true,
        workspace: true,
      });

    });

    test('03. should throw on unexpected error', async () => {

      const { checkWorkspace } = require('../src/config/helpers');
      expect(checkWorkspace('illegal error')).to.be.rejectedWith(Error);

    });

  });

  describe('Helper `expandPath` is invoked', () => {

    test('04. should correctly expand service and template paths', () => {

      const { expandPath } = require('../src/config/helpers');

      const servicePath  = expandPath('mock_service_1');
      const templatePath = expandPath('mock-service');

      expect(servicePath).to.equal('services/mock_service_1');
      expect(templatePath).to.equal('templates/mock-service');

    });

    test('05. should return null when a service or template name does not exist', () => {

      const { expandPath } = require('../src/config/helpers');

      const missingPath = expandPath('unknown-name');

      expect(missingPath).to.be.null;

    });
  });

  after(function () {

    /**
     * Use sinon.restore() to undo all the replaced functions used within the
     * tests.
     */
    restore();
  });

});
