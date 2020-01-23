# SUSHI (WORK IN PROGRESS)

SUSHI (aka "SUSHI Unshortens Short Hand Inputs") is a reference implementation command-line interpreter/compiler for FHIR Shorthand (FSH).

FHIR Shorthand (FSH) is a specially-designed language for defining the content of FHIR Implementation Guides (IG). It is simple and compact, with tools to produce Fast Healthcare Interoperability Resources (FHIR) profiles, extensions and implementation guides (IG). Because it is a language, written in text statements, FHIR Shorthand encourages distributed, team-based development using conventional source code control tools such as Github.

For more information about the evolving FSH syntax see the [FHIR Shorthand Reference Manual](https://build.fhir.org/ig/HL7/fhir-shorthand/).

# Installation for SUSHI Users

SUSHI requires [Node.js](https://nodejs.org/) to be installed on the user's system.  Users should install Node.js 12 (LTS), although earlier LTS versions (8, 10) are also expected to work.

Once Node.js is installed, run the following command to install or update SUSHI:

```sh
$ npm install -g fsh-sushi
```

After installation, the `sushi` commandline will be available on your path:

```sh
$ sushi --help
Usage: sushi <path-to-fsh-defs> [options]

Options:
  -o, --out <out>  the path to the output folder (default: "build")
  -d, --debug      output extra debugging information
  -v, --version    print SUSHI version
  -h, --help       output usage information
```

# IG Generation

SUSHI supports publishing implementation guides via the new template-based IG Publisher.  The template-based publisher is still being developed by the FHIR community.  See the [Guidance for HL7 IG Creation](https://build.fhir.org/ig/FHIR/ig-guidance/) for more details.

If the input folder (i.e., "FSH Tank") contains a sub-folder named "ig-data", then SUSHI will generate a basic Implementation Guide project that can be built using the template-based IG Publisher.  SUSHI currently supports very limited customization of the IG via the following files:

* `ig-data/ig.ini`: If present, the user-provided igi.ini values will be merged with SUSHI-generated ig.ini.
* `ig-data/package-list.json`: If present, it will be used instead of a generated package-list.json.
* `ig-data/input/pagecontent/index.md`: If present, it will provide the content for the IG's main page.

After running SUSHI, change to the output folder and run the `_updatePublisher` and `_genonce` scripts.

If the input folder does not contain a sub-folder named "ig-data", then only the resources (e.g., profiles, extensions, etc.) will be generated.

# Installation for Developers

SUSHI is a [TypeScript](https://www.typescriptlang.org/) project.  At a minimum, SUSHI requires [Node.js](https://nodejs.org/) to build, test, and run the CLI.  Developers should install Node.js 12 (LTS), although earlier LTS versions (8, 10) are also expected to work.

Once Node.js is installed, run the following command from this project's root folder:

```sh
$ npm install
```

# NPM tasks

The following NPM tasks are useful in development:

| Task | Description |
| ---- | ----------- |
| **build** | compiles `src/**/*.ts` files to `dist/**/*.js` files using the TypeScript compiler (tsc) |
| **build:watch** | similar to _build_ but automatically builds when changes are detected in src files |
| **build:grammar** | builds the ANTLR grammar from 'antlr/src/main/antlr' to 'src/import/generated' |
| **test** | runs all unit tests using Jest |
| **test:watch** | similar to _test_, but automatically runs affected tests when changes are detected in src files |
| **lint** | checks all src files to ensure they follow project code styles and rules |
| **lint:fix** | fixes lint errors when automatic fixes are available for them |
| **prettier** | checks all src files to ensure they follow project formatting conventions |
| **prettier:fix** | fixes prettier errors by rewriting files using project formatting conventions |
| **check** | runs all the checks performed as part of ci (test, lint, prettier) |

To run any of these tasks, use `npm run`.  For example:

```sh
$ npm run check
```

# Recommended Development Environment

For the best experience, developers should use [Visual Studio Code](https://code.visualstudio.com/) with the following plugins:

* [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  * Consider configuring the formatOnSave feature in VS Code settings:
    ```json
    "[typescript]": {
        "editor.formatOnSave": true
    }
    ```
* [vscode-language-fsh](https://marketplace.visualstudio.com/items?itemName=kmahalingam.vscode-language-fsh)

# License

Copyright 2019 Health Level Seven International

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.