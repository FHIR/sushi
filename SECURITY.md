# Reporting security issues privately

To report a security issue privately, please [create a security advisory](https://github.com/FHIR/sushi/security/advisories) in this repository. This will allow repository administrators to review and address it privately before public disclosure. For more details about this process, see ["Privately reporting a security vulnerability"](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

# Project security practices

SUSHI uses NPM for dependency management. Dependencies with security vulnerabilities as reported by NPM's audit tool should be updated to secure versions as soon as possible. A new version of SUSHI that resolves the vulnerabilities should be released as soon as possible afterwards. Pull requests that include new dependencies should not include dependencies that contain known security vulnerabilities.

As part of reviewing pull requests, code changes will be examined for potential security issues. Security issues discovered during pull request review must be resolved before the pull request will be accepted.
