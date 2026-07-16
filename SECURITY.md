# Security Policy

This is a template repository, not a deployed service — but security issues in the
patterns it teaches (e.g. the idempotency flow, the outbox relay, input validation)
matter, because people copy them into production.

## Reporting a vulnerability

Please **do not** open a public issue for security-relevant bugs. Instead, use
GitHub's private vulnerability reporting on this repository
("Security" tab → "Report a vulnerability").

You should get a response within a few days. Once a fix is released, the report
will be disclosed publicly.

## Scope

- Flaws in the security-relevant patterns (idempotency, validation, error handling)
- Vulnerable dependency pins in `package-lock.json` that Dependabot has missed
