As of Apr 16, 2026:

The `npm outdated` command reports some dependencies as outdated. They are not being updated at this time for the reasons given below:

- `@types/node`: stay on v22 until we are ready to move to v24. Currently, Node 24 segfaults during tests on macos in GitHub Actions.
- `chalk`: major version 5 is an esmodule.
- `commander`: major version 14 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `del-cli`: major version 7 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `html-minifier-terser` / `@types/html-minifier-terser`: major version 6 changes the functions we use to become async, which would require changing more or less the entirety of SUSHI's export functions to async.
- `https-proxy-agent`: major version 8 is an esmodule.
- `ini`: major version 6 requires Node 20 and higher. Wait until community has had sufficient time to move off Node 18.
- `junk`: major version 4 is an esmodule.
- `title-case`: major version 4 is an esmodule.
- `typescript`: jest-mock-extended declares `typescript@"^3.0.0 || ^4.0.0 || ^5.0.0"` as a peer-dependecy.
- `yaml`: changes to `Document.toString()` behavior makes the comments in the config file produced by `sushi init` move around a bunch.

## Temporary npm audit overrides

Jest and its coverage tooling depend on affected versions of `glob` ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)), and `test-exclude` also depends on an affected version of `minimatch` ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). The overrides select patched versions for these development dependencies without downgrading Jest or changing the `glob` 7 used by `temp`. Remove each override when the upstream dependencies resolve to patched versions on their own.
