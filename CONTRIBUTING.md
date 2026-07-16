# Contributing

Thanks for your interest in the JouwPrivacy app. This is the real source of our
shipping customer app, published so anyone can audit our privacy claims.

## Ground rules (non-negotiable)

This is a **privacy-first** app. Contributions must keep it that way:

- **No tracking, analytics, ads, crash reporters, or fingerprinting** - ever.
- **No new network destinations.** The app talks only to the JouwPrivacy BFF
  (`api.jouwprivacy.com`) and first-party web links. Don't add calls to other
  hosts, CDNs, or third-party APIs.
- **No over-the-air / remote code execution.** `expo-updates` and equivalents
  stay out - what we build is what runs (this also keeps F-Droid compliance).
- **No secrets in the repo.** Tokens, keys, signing material, and `.env` files
  never get committed. Use `.env.example` for config shape.

## Development

```bash
npm install
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm test              # jest
```

The app always talks to a real backend over HTTPS - there is no mock, demo, or
offline mode. Point a dev build at a staging or local BFF with
`EXPO_PUBLIC_API_URL` (see `.env.example`); it defaults to `api.jouwprivacy.com`.
Tests focus on the security-critical paths (the auth/lock state machine and the
2FA gate) and the HTTP client; please keep those green and add coverage for new
behaviour.

## Pull requests

- Keep changes focused; describe the user-visible effect.
- Run `npm run typecheck && npm run lint && npm test` before opening the PR.
- New source files should carry the SPDX header:
  `// SPDX-License-Identifier: Apache-2.0`
- By submitting a contribution you agree it is licensed under Apache-2.0
  (see `LICENSE`).

## Branding

Don't add or modify JouwPrivacy/Overnight Technology branding in a fork - the
name, logo, and icons are trade names and brand assets, not licensed for reuse
(see `NOTICE`).
