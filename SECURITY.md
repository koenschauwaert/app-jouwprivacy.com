# Security Policy

JouwPrivacy is a privacy-first mobile provider, and this repository is the source
of our customer app. We take security and privacy reports seriously.

## Reporting a vulnerability

Please report security issues **privately** - do not open a public GitHub issue.
Use whichever channel you prefer:

- **GitHub Private Vulnerability Reporting** - the "Report a vulnerability"
  button under this repository's **Security** tab (encrypted, private to the
  maintainers).
- **Email:** **security@jouwprivacy.com** (also reaches
  koen@overnighttechnology.com).
- Suggested subject: `SECURITY: <short summary>`
- Include: the affected version/commit, steps to reproduce, impact, and any
  proof-of-concept.
- For sensitive details, request our PGP key in your first message (or say so and
  we will arrange another encrypted channel).

We aim to acknowledge a report within **5 working days** and to keep you updated
as we investigate and ship a fix.

## Safe harbor

We consider security research and vulnerability disclosure conducted in good
faith and in line with this policy to be authorized. We will not pursue or
support legal action against researchers who follow it, and we will work with you
to understand and resolve issues quickly.

## Scope

In scope: this repository - the JouwPrivacy customer app (Expo / React Native).

Especially relevant: authentication and session handling, local secure storage
of session tokens or the app PIN, the 2FA flow, anything that could send user
data off-device, or any network call to a destination other than
`*.jouwprivacy.com`.

The JouwPrivacy backend/API and website are out of scope for *this* repository,
but you can report issues in those to the same address and we will route them
internally.

## Please do not

- Run automated scanners against our production backend.
- Access, modify, or delete data that is not your own.
- Perform denial-of-service testing or social engineering.

## Disclosure

We support coordinated disclosure. Once a fix has shipped we are happy to credit
you, if you would like. Thank you for helping keep JouwPrivacy users safe.
