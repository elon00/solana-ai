# Contributing to Solana AI

Solana AI is a research/prototype repository for Solana, AI, and post-quantum cryptography integration work.

## Before opening a pull request

```bash
npm install --ignore-scripts
npm test
npm audit --omit=dev --audit-level=high
cargo test --manifest-path program/Cargo.toml
```

## Contribution rules

- Never commit wallet authorities, seed phrases, private keys, API tokens, or live credentials.
- Add tests for cryptographic and Solana-program changes.
- Keep algorithm-integration tests distinct from independent FIPS validation.
- Do not change the project status to production-ready without independent review and deployment evidence.
- Keep scripts portable; do not commit machine-specific absolute paths.
- Prefer pinned dependency versions and explain dependency upgrades.
- Treat internal scorecards/certificates as internal engineering artifacts only.

Report security vulnerabilities privately using `SECURITY.md`.
