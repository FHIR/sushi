![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/fhir/sushi/ci-workflow.yml?branch=master)
![npm](https://img.shields.io/npm/v/fsh-sushi)

# SUSHI

SUSHI (aka "SUSHI Unshortens Short Hand Inputs") is a reference implementation command-line interpreter/compiler for FHIR Shorthand (FSH).

FHIR Shorthand (FSH) is a specially-designed language for defining the content of FHIR Implementation Guides (IG). It is simple and compact, with tools to produce Fast Healthcare Interoperability Resources (FHIR) profiles, extensions and implementation guides (IG). Because it is a language, written in text statements, FHIR Shorthand encourages distributed, team-based development using conventional source code control tools such as Github.

For more information about the evolving FSH syntax see the [FHIR Shorthand Reference Manual](https://build.fhir.org/ig/HL7/fhir-shorthand/).

# Installation for SUSHI Users

SUSHI requires [Node.js](https://nodejs.org/) to be installed on the user's system. Users should install Node.js 18. Although previous versions of Node.js may work, they are not officially supported.

Once Node.js is installed, run the following command to install or update SUSHI:

```sh
$ npm install -g fsh-sushi
```

After installation, the `sushi` commandline will be available on your path:

```text
$ sushi help

Usage: sushi [options] [command]

Options:
  -v, --version                              print SUSHI version
  -h, --help                                 display help for command

Commands:
  build [options] [path-to-fsh-project]      build a SUSHI project
  init                                       initialize a SUSHI project
  update-dependencies [path-to-fsh-project]  update FHIR packages in project configuration
  help [command]                             display help for command
```

To build a SUSHI project, use the `build` command:

```text
$ sushi build --help

Usage: sushi build [options] [path-to-fsh-project]

build a SUSHI project

Options:
  -l, --log-level <level>  specify the level of log messages (default: "info") (choices: "error", "warn", "info", "debug")
  -o, --out <out>          the path to the output folder
  -p, --preprocessed       output FSH produced by preprocessing steps
  -r, --require-latest     exit with error if this is not the latest version of SUSHI (default: false)
  -s, --snapshot           generate snapshot in Structure Definition output (default: false)
  -h, --help               display help for command

Additional information:
  [path-to-fsh-project]
    Default: "."
  -o, --out <out>
    Default: "fsh-generated"
```

See the [SUSHI documentation](https://fshschool.org/docs/sushi/) for detailed information on using SUSHI.

# IG Generation

SUSHI supports publishing implementation guides via the new template-based IG Publisher. The template-based publisher is still being developed by the FHIR community. See the [Guidance for HL7 IG Creation](https://build.fhir.org/ig/FHIR/ig-guidance/) for more details.

Based on the inputs in FSH files, **sushi-config.yaml**, and the IG project directory, SUSHI populates the output directory. See the [documentation on IG Project with SUSHI](https://fshschool.org/docs/sushi/project/#ig-projects) for more information on using SUSHI to generate IGs.

# Installation for Developers

SUSHI is a [TypeScript](https://www.typescriptlang.org/) project. At a minimum, SUSHI requires [Node.js](https://nodejs.org/) to build, test, and run the CLI. Developers should install Node.js 18.

Once Node.js is installed, run the following command from this project's root folder:

```sh
$ npm install
```

# NPM tasks

The following NPM tasks are useful in development:

| Task              | Description                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| **build**         | compiles `src/**/*.ts` files to `dist/**/*.js` files using the TypeScript compiler (tsc)        |
| **build:watch**   | similar to _build_ but automatically builds when changes are detected in src files              |
| **build:grammar** | builds the ANTLR grammar from 'antlr/src/main/antlr' to 'src/import/generated'                  |
| **test**          | runs all unit tests using Jest                                                                  |
| **test:watch**    | similar to _test_, but automatically runs affected tests when changes are detected in src files |
| **lint**          | checks all src files to ensure they follow project code styles and rules                        |
| **lint:fix**      | fixes lint errors when automatic fixes are available for them                                   |
| **prettier**      | checks all src files to ensure they follow project formatting conventions                       |
| **prettier:fix**  | fixes prettier errors by rewriting files using project formatting conventions                   |
| **check**         | runs all the checks performed as part of ci (test, lint, prettier)                              |
| **regression**    | runs regression against select set of repos in regression/repos-select.txt                      |

To run any of these tasks, use `npm run`. For example:

```sh
$ npm run check
```

# Regression

The `regression/run-regression.ts` script can be used to run regression on a set of repos. It takes the following arguments:

- `repoFile`: A text file for which each line is a GitHub `{org}/{repo}#{branch}` to run regression on (e.g.,
  `HL7/fhir-mCODE-ig#master`). Comment out lines using a leading `#`. _(default: regression/repos-select.txt)_
- `version1`: The base version of SUSHI to use. Can be an NPM version number or tag, `gh:{branch}` to use a GitHub branch,
  or `local` to use the local code with `ts-node`. _(default: gh:master)_
- `version2`: The version of SUSHI under test. Can be an NPM version number or tag, `gh:{branch}` to use a GitHub branch,
  or `local` to use the local code with `ts-node`. _(default: local)_

For example:

```sh
$ ts-node regression/run-regression.ts regression/repos-all.txt 1.0.2 local
```

The regression script first installs the `version1` and `version2` SUSHIs to temporary folders (except for `local`, in which case it runs `npm install` on the local SUSHI). Then for each of the listed repositories, it does the following:

1. Downloads the repo source from GitHub, creating two copies (for the base version of SUSHI and the version under test)
2. Runs the base version of SUSHI against one copy of the repo
3. Runs the version of SUSHI under test against the other copy of the repo
4. Compares the results and generates a report of the differences

When the script is complete, it will generate and launch a top-level index file with links to the reports and logs for each repo.

# Recommended Development Environment

For the best experience, developers should use [Visual Studio Code](https://code.visualstudio.com/) with the following plugins:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - Consider configuring the formatOnSave feature in VS Code settings:
    ```json
    "[typescript]": {
        "editor.formatOnSave": true
    }
    ```
- [vscode-language-fsh](https://marketplace.visualstudio.com/items?itemName=MITRE-Health.vscode-language-fsh)

# License

Copyright 2019-2022 Health Level Seven International

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
