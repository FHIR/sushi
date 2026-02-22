As of Feb Nov 21:

The `npm outdated` command reports some dependencies as outdated. They are not being updated at this time for the reasons given below:

- `@types/node`: stay on v22 until we are ready to move to v24. Currently, Node 24 segfaults during tests on macos in GitHub Actions.
- `chalk`: major version 5 is an esmodule.
- `commander`: major version 14 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `del-cli`: major version 7 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `html-minifier-terser` / `@types/html-minifier-terser`: major version 6 changes the functions we use to become async, which would require changing more or less the entirety of SUSHI's export functions to async.
- `ini`: major version 6 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `junk`: major version 4 is an esmodule.
- `title-case`: major version 4 is an esmodule.
- `yaml`: changes to `Document.toString()` behavior makes the comments in the config file produced by `sushi init` move around a bunch.

The `npm audit` command reports two vulnerabilities that we currently cannot resolve:

- `lodash`: bundled as a dependency in `fhir` and cannot be overridden. I've asked the maintainers to update the dependency.
  See: https://github.com/lantanagroup/FHIR.js/issues/72
- `minimatch`: multiple dependencies use this (mainly dev dependencies) but have not updated yet. We cannot override because
  the API has changed and is not compatible with the dependencies that use it.
