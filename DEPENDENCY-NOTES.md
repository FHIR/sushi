As of 2025 Mar 28:

The `npm outdated` command reports some dependencies as outdated. They are not being updated at this time for the reasons given below:

- `@types/node`: Versions after 20.19.1 cause errors compiling transitive dependency `agent-base`.
- `chalk`: major version 5 causes problems for jest. Keep updated to latest 4.x release.
- `html-minifier-terser` / `@types/html-minifier-terser`: major version 6 changes the functions we use to become async, which would require changing more or less the entirety of SUSHI's export functions to async.
- `junk`: major version 4 is an esmodule.
- `title-case`: major version 4 is an esmodule.
- `yaml`: changes to `Document.toString()` behavior makes the comments in the config file produced by `sushi init` move around a bunch.
