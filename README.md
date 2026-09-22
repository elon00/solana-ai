# Solana AI

Solana-focused blockchain and AI research project with post-quantum cryptography experiments, Rust/Solana program work, and reproducible cryptographic verification scripts.

## Current status

**Status: RESEARCH / PROTOTYPE — NOT INDEPENDENTLY PRODUCTION-CERTIFIED**

The repository contains working cryptographic test code and a Solana program implementation. Recent GitHub CI is passing, including portability fixes for the PQC/reality scripts. However, repository-defined scorecards and certificates are internal engineering artifacts; they are **not** a third-party security audit, NIST certification, or proof of a production deployment.

### What is currently evidenced

- ML-KEM-768 and ML-DSA-65 integration tests using `@noble/post-quantum`
- wire-size and sign/verify invariants for the selected PQC schemes
- adversarial/tamper rejection tests
- Rust/Solana program source in `program/`
- repository CI for the maintained verification workflow

### What is not claimed

- independent FIPS validation of this application
- independent cryptographic or smart-contract audit
- production Solana mainnet deployment
- production custody certification
- independently verified market adoption, users, volume, or revenue

## Verification

Run the repository's cryptographic checks with:

```bash
npm run test:nist
npm run audit:crypto
npm run reality:universal
```

A passing test demonstrates the behavior covered by that test only. It does not turn an application into a FIPS-validated cryptographic module or independently audited production service.

## Repository layout

- `src/` — application and cryptographic integration code
- `program/` — Rust/Solana on-chain program work
- `tests/` — PQC and invariant tests
- `scripts/` — audit and evidence-generation tooling
- `REALITY_MANIFEST.json` — internal project status/scorecard; not an external certification

## Production-readiness requirements

Before production use, this project still needs deployment-specific threat modeling, independent security review, secrets/key-management design, observability, incident response, backup/recovery procedures, load testing, release controls, and verified deployment evidence.

## License

Apache-2.0.
