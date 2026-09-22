# Security Policy

## Status

Solana AI is a research/prototype repository. Its cryptographic tests verify specific ML-KEM/ML-DSA integration properties; they are not independent FIPS validation, a third-party audit, or production certification.

## Reporting vulnerabilities

Do not disclose exploitable vulnerabilities, credentials, private keys, seed phrases, or proof-of-concept attacks in public issues.

Use GitHub private vulnerability reporting / a Security Advisory for this repository when available. Include the affected commit/file, reproduction steps, impact, and any proposed mitigation.

## Security rules

- Never commit private keys, seed phrases, API tokens, or production credentials.
- Keep Solana wallet/program authorities outside the repository.
- Rotate any exposed credential immediately.
- Treat generated certificates and internal scorecards as internal evidence only.
- Do not infer end-to-end quantum resistance from an application-level PQC test.
- Production use requires independent review, deployment hardening, monitoring, recovery procedures, and controlled releases.
