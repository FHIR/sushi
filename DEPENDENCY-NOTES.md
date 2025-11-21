As of 2025 Mar 28:

The `npm outdated` command reports some dependencies as outdated. They are not being updated at this time for the reasons given below:
- `chalk`: major version 5 is an esmodule.
- `commander`: major version 14 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `del-cli`: major version 7 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `html-minifier-terser` / `@types/html-minifier-terser`: major version 6 changes the functions we use to become async, which would require changing more or less the entirety of SUSHI's export functions to async.
- `ini`: major version 6 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `junk`: major version 4 is an esmodule.
- `title-case`: major version 4 is an esmodule.
- `yaml`: changes to `Document.toString()` behavior makes the comments in the config file produced by `sushi init` move around a bunch.
