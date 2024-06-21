# Best Practices

We're glad you're considering contributing to SUSHI! Below are a few best practices that we recommend for all contributions.

## Before Contributing

Before contributing a feature or a bugfix, we recommend creating a GitHub issue if one does not exist. This allows the community to provide feedback on why an issue may be occurring or provide additional insight into a suggested feature. See the [Contribution Policy](CONTRIBUTING.md#issues) to learn more about creating issues. It may also be useful, but is not required, to start a Zulip conversation around the feature or bug. See the [Contribution Policy](CONTRIBUTING.md#zulip) to learn more about Zulip.

If a GitHub issue already exists for what you are planning to contribute, we recommend commenting on the issue to indicate that you are working on an implementation to avoid duplication of work.

## Coding Practices

We recommend the following coding practices for high quality contributions:

- Make all changes in a personal [fork](https://help.github.com/articles/fork-a-repo/) of this repository.
- Use descriptive commit messages.
- Prefer self-explanatory code as much as possible, but provide helpful comments for complex expressions and code blocks.
- Add unit tests for any new or changed functionality, and update any existing tests that are impacted by your changes.
  - SUSHI uses [Jest](https://jestjs.io/) as a testing framework.
  - To run the full test suite, run `npm test`.
  - To review the test coverage report, run `npm run coverage` after running the full test suite.
  - Ensure all tests are passing. Ensure that code coverage of the new code is complete.
- Follow the code style and conventions as enforced by the lint configuration and as evidenced by the existing code.
  - SUSHI uses [ESLint](https://eslint.org/) for code linting.
  - To run the linter on all code, run `npm run lint`.
  - To automatically fix as many issues as possible, run `npm run lint:fix`. This uses ESLint's [--fix](https://eslint.org/docs/latest/use/command-line-interface#fix-problems) option.
  - Ensure there are no issues reported.
- Follow the code formatting as enforced by the formatter configuration.
  - SUSHI uses [Prettier](https://prettier.io/) for code formatting.
  - To run Prettier on all code, run `npm run prettier`.
  - To automatically rewrite files in order to resolve formatting issues, run `npm run prettier:fix`. This uses Prettier's [--write](https://prettier.io/docs/en/cli.html#--write) option.
  - Ensure there are no issues reported.
- Ensure any new dependencies use the latest published version.
  - If a new dependency is required but the latest published version cannot be used, add the dependency and reason for not updating to [DEPENDENCY-NOTES.md](DEPENDENCY-NOTES.md).
  - To check the latest published version, check the versions of the package on [npm](https://www.npmjs.com/) or use [npm-outdated](https://docs.npmjs.com/cli/v10/commands/npm-outdated). Run `npm outdated` and check that the new dependency is not listed in the output.
- Ensure any new dependencies do not contain any known security vulnerabilities
  - To check for known security vulnerabilities, we recommend using [npm-audit](https://docs.npmjs.com/cli/v10/commands/npm-audit). Run `npm audit` and ensure there are no new issues on your branch.
- Update documentation to reflect any user-facing changes.
  - Documentation updates may include, but are not limited to, the project [README](README.md) and [FSH School](https://fshschool.org/).
  - If changes are required to FSH School, follow the instructions for contributing in the [project repository](https://github.com/FSHSchool/site).

## Making a Pull Request

We recommend the following best practices for creating a high quality pull request:

- Review your own PR before marking it as ready for review by others. Ensure the only code changes included are ones relevant to the feature or bugfix and that they follow the coding practices outlined above.
- Ensure your branch is up to date with master. There are a few ways you can update your branch:
  - Use the "Update branch" button available once you make your PR. This is the recommended approach if you are not comfortable with merging or rebasing.
  - [Merge](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging) master into your branch.
  - [Rebase](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) your branch on master. We only recommend this approach if you are very comfortable with rebasing.
- Update the title of the PR to provide a short, descriptive summary of the PR.
  - Keep the title up to date with any changes made during the review process. The title will be used in the commit message and in the release notes, so it is important that it accurately reflects the current state of the PR.
- Follow the pull request template to create a detailed PR description.
  - Include a detailed description of the changes made in the PR.
  - Include instructions for how to test the PR. You may want to include a link to sample FSH in FSH Online to demonstrate a bug or attach a sample project that highlights new or improved behavior.
  - [Link the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) that the PR addresses.
- Follow up on any discussion on your PR. If changes are requested, make any necessary updates and comment indicating your PR is ready for re-review.
- If your PR is approved, it will be merged to master using the "[squash and merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges#squash-and-merge-your-commits)" strategy.
