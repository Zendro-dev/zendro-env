const { getConfig }      = require('../src/config/config');
const { checkWorkspace } = require('../src/config/helpers');


describe('App config', () => {

  // beforeAll(async () => {
  //   const { mkdir } = require('fs/promises');

  //   await mkdir()
  // });

  test('01. should find the .testenv.json file', () => {

    const configJson = require('./mocks/.testenv.json');
    const configObj  = getConfig();

    expect(configObj).toEqual(configJson);

  });

});
