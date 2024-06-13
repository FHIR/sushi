# Contributing

We're glad you're thinking about contributing to SUSHI! We welcome all friendly contributions, including:

- bug reports
- comments and suggestions
- feature requests
- bug fixes
- feature implementations and enhancements
- documentation updates and additions

To ensure a welcoming environment, we follow the [HL7 Code of Conduct](https://www.hl7.org/legal/code-of-conduct.cfm) and expect contributors to do the same.

Before making a contribution, please familiarize yourself with this document, as well as our [LICENSE](LICENSE) and [README](README.md).

## Issues

We use GitHub issues to track bug reports, comments, suggestions, questions, and feature requests.

Before submitting a new issue, please check to make sure a similar issue isn't already open. If one is, contribute to that issue thread with your feedback.

When submitting a bug report, please try to provide as much detail as possible. This may include:

- steps to reproduce the problem
- screenshots demonstrating the problem
- the full text of error messages
- relevant outputs
- any other information you deem relevant

Please note that the GitHub issue tracker is _public_; any issues you submit are immediately visible to everyone. For this reason, do _not_ submit any information that may be considered sensitive.

## Zulip

In addition to GitHub issues, we also use the FHIR Community Chat @ https://chat.fhir.org to discuss the use of FHIR Shorthand and its associated projects. The [#shorthand stream](https://chat.fhir.org/#narrow/stream/215610-shorthand) is used for all FHIR Shorthand questions and discussion.

Before contributing to the discussion on the #shorthand stream, you will need to register for an account. The instructions to sign up can be found when you visit https://chat.fhir.org.

Before starting a new conversation, please check for earlier discussions on a similar issue or topic. If a previous conversation has been started, contribute to that thread with your feedback.

When starting a new conversation, please use a descriptive topic and include as much detail as possible.

## Code Contributions

If you are planning to work on a reported bug, suggestion, or feature request, please comment on the relevant issue to indicate your intent to work on it.
If there is no associated issue, please submit a new issue describing the feature you plan to implement or the bug you plan to fix.
This reduces the likelihood of duplicated effort and also provides the maintainers an opportunity to ask questions, provide hints, or indicate any concerns _before_ you invest your time.

### Coding Practices

Code that is contributed to this project should be done in a personal fork of this repository and follow the coding practices specified in our Best Practices documentation (coming soon!).

### Before Submitting a Pull Request

Before submitting a Pull Request for a code contribution:

- [Merge](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging) master into your branch or [rebase](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) on master if your code is out of sync with master
  - If you need help with this, submit your Pull Request without merging or rebasing and indicate you need help
- Build the code (if applicable) and ensure there are no new warnings or errors
- Run the tests with `npm test` and ensure that all tests pass
- Run the linter with `npm run lint` and ensure that there are no linter warnings or errors
- Run the Prettier formatter with `npm run prettier` and ensure that there are no formatting warnings or errors

  _Note: `npm run check` will run the `test`, `lint`, and `prettier` scripts at once_

- Ensure any new dependencies do not contain known security vulnerabilities.
  - We recommend using `npm audit` to ensure there are no new security vulnerabilities introduced on your branch

For details on how to build, test, lint, and format see the individual project README file.

### Submitting a Pull Request

Pull requests should include a summary of the work, as well as any specific guidance regarding how to test or invoke the code.

When project maintainers review the pull request, they will:

- Verify the contribution is compatible with the project's goals and mission
- Run the project's unit tests, linters, and formatters to ensure there are no violations
- Deploy the code locally to ensure it works as expected
- Review all code changes in detail, looking for:
  - potential bugs, regressions, security issues, or unintended consequences
  - edge cases that may not be properly handled
  - application of generally accepted best practices
  - adequate unit tests and documentation

### If the Pull Request Passes Review

Congratulations! Your code will be merged by a maintainer into the project's master branch!

### If the Pull Request Does Not Pass Review

If the review process uncovers any issues or concerns, a maintainer will communicate them via a Pull Request comment. In most cases, the maintainer will also suggest changes that can be made to address those concerns and eventually have the Pull Request accepted. If this happens:

- address any noted issues or concerns
- rebase or merge master (if necessary) and push your code again (may require a force push if you rebased)
- comment on the Pull Request indicating it is ready for another review

## Apache 2.0

All contributions to this project will be released under the [Apache 2.0 license](http://www.apache.org/licenses/LICENSE-2.0). By submitting a pull request, you are agreeing to comply with this license. As indicated by the license, you are also attesting that you are the copyright owner, or an individual or Legal Entity authorized to submit the contribution on behalf of the copyright owner.
