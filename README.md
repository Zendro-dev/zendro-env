<h1 align=center>Zendro Env</h1>

<p align=center>Testing-environment manager utility</p>


## Description

This project contains a command-line utility to configure, create, and use Zendro development and testing environments. Its primary purpose was to unify the environment code used for the integration tests in the `graphql-server-model-codegen` and `single-page-app-codegen` repositories.

This tool can be used to create an arbitrary number of Zendro `graphql-server` and `single-page-application` skeleton projects from their upstream templates, run Zendro code generators, apply patches, and integrate with test-runners.


## Usage

The tool can be installed via `npm` globally, as a `package.json` dependency, or cloned locally. It requires `yarn`, a properly configured `.testenvrc` file, and `node >= 12.x`.

It can be operated in either `default` or `command` mode.

### Help

To get information about a the available commands, run the either of the following in the terminal.

```sh
# Get all available commands, including the default command and its options
zendro-env --help

# Get information about a specific command
zendro-env <command> --help
```

### Default

In `default` mode, the tool will setup the configured environment `templates` and `services`, install a shared `node_modules` folder (using `yarn workspaces`), run `code generators`, apply `patches`, initialize and mount `docker` containers and volumes, and finally run all `tests` or only those specified by their names.

```sh
zendro-env [testNames...] [options]

Options:
  -c, --cleanup                      Remove the full testing environment                   [boolean]
  -C, --soft-cleanup                 Reset docker-compose and delete generated code        [boolean]
  -g, --generate-code                Generate code and apply patches                       [boolean]
  -k, --keep-running                 Keep containers running                               [boolean]
  -t, --run-tests-only               Run tests                                             [boolean]
  -T, --generate-code-and-run-tests  Regenerate code, apply patches, and run tests         [boolean]
```

Some options will short-circuit the `default` command steps, running only the parts that are relevant to the specified option(s).

Some options are complementary and will run in the appropriate order. When two options are not compatible, the command-line interface will exit and print the conflict.

#### Examples

```sh
# run the full circuit, but keep containers alive at the end
zendro-env -k

# generate code and exit the circuit
zendro-env -g

# generate code, apply patches, and run tests, keeping containers alive at the end
zendro-env -Tk

# only run tests and keep containers alive at the end
zendro-env -tk
```

### Commands

The CLI provides several `commands` that can be used to execute functionality in a more modular manner.

```sh
Commands:
  zendro-env branch <name> <remote> <branch>  Checkout a new repository branch.
  zendro-env codegen                          Generate code for a testing environment.
  zendro-env destroy                          Remove a testing environment.
  zendro-env docker                           Manage the docker configuration
  zendro-env setup                            Setup a testing environment workspace.
  zendro-env test [names...]                  Launch a configured test runner
```

Each command can have options only available to it. By default, commands may be configured to run one or more of their options. In most cases, not specifying an option will still execute the command.


#### Examples

```sh
# Install templates, services, and node modules
zendro-env setup

# Only install templates
zendro-env setup --template

# In the "gql-codegen" template, checkout "origin" upstream, "master" branch
# All of its dependent services will also be updated
zendro-env branch gql-codegen origin master

# Check whether configured docker services are ready to accept requests
zendro-env docker --check

# Take down docker containers and volumes
zendro-env docker --down
```

## Configuration

This tool requires a configuration file named either `.testenv.json` or `.testenvrc`. The file should be located in the current working directory, but it will also be found if placed in a parent folder.

### `.testenv.json`

This config file is necessary to create the dynamic environment and it is divided in several sections or entries: `cwd`, `docker`, `services`, `models`, `patches`, `templates`, `tests`, and `env`.

entry       | type          | mandatory | description
---         | ---           | :---:     | ---
`cwd`       | `string`      | YES       | path to the environment working directory
`docker`    | `string`      | YES       | path to the `docker-compose` file
`services`  | `Service[]`   | YES       | [`Service`](#services) definitions
`models`    | `Model[]`     | YES       | [`Model`](#models) definitions
`patches`   | `Patch[]`     | YES       | [`Patch`](#patches) definitions
`templates` | `Template[]`  | YES       | [`Template`](#templates) definitions
`tests`     | `Test[]`      | YES       | [`Test`](#tests) definitions
`env`       | `string`      | YES       | environment variables

### `cwd`

This path is used as an absolute reference for any other paths specified in the file. When using relative paths in any of the other sections, these should be relative to the `cwd` value.

Note that when referencing the path of a [`service`](#services) or [`template`](#templates), for example for [`code generation`](#models) or [`patching`](#patches), their `name` identifier will be automatically expanded to the correct file system location.

### `docker`

The `docker-compose` file must be defined separately, using the folder structure generated by this tool.

### `templates`

Each template is an upstream Zendro `graphql-server`, `graphql-server-model-codegen`, `single-page-app`, or `single-page-app-codegen` repository. Multiple copies of the same template `url` may exist. The are used to generate `service` instances.

Templates marked as `source` are not cloned by the tool, and their real location will be used for all operations, including code generation and service resetting.

entry       | type          | mandatory | description
---         | ---           | :---:     | ---
`name`      | `string`      | YES       | unique template identifier
`branch`    | `string`      | NO        | template branch (default: `master`)
`url`       | `string`      | YES       | path to `.git` URL or local folder
`source`    | `boolean`     | NO        | whether to use this template as source (`url` must be a local folder)

### `services`

Each service represents an instance of a template. Multiple services can point to a single template.

entry       | type          | mandatory | description
---         | ---           | :---:     | ---
`name`      | `string`      | YES       | unique service identifier
`template`  | `string`      | YES       | template to use for its creation
`codegen`   | `string`      | YES       | associated code-generator
`url`       | `string`      | NO        | URL used to check its connection

### `models`

Each model represents a folder containing Zendro model definitions required for one or more services.

entry       | type          | mandatory | description
---         | ---           | :---:     | ---
`opts`      | `string[]`    | NO        | options to pass to the `code-generator`
`path`      | `string`      | YES       | path to the model definitions folder
`target`    | `string[]`    | YES       | target services for which the model definitions apply

### `patches`

Patches are used to dynamically modify code files after creating the service and generating its code.

entry       | type          | mandatory | description
---         | ---           | :---:     | ---
`opts`      | `string[]`    | NO        | options to pass to the `patch` binary
`src`       | `string`      | YES       | path to the `.patch` file
`dest`      | `string`      | YES       | path to the file that should be patched

### `tests`

Tests represent the execution of one or more test-suites, using the specified test runner. Currently only `mocha` is supported.

entry       | type          | mandatory | description
---         | ---           | :---:     | ---
`name`      | `string`      | YES       | unique test identifier
`runner`    | `string`      | YES       | name of the test-runner binary (e.g. `mocha`)
`target`    | `string`      | YES       | path to the tests file to run or folder where `.mocharc.json` is located
