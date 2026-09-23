# Solana AI

## Project links

- GitHub: https://github.com/elon00/solana-ai
- Solana Testnet Program: https://explorer.solana.com/address/Bnpd9YGaVxMAwdxFoVA3SQP1Vhfwv7jnJ67QNcyAVKq3?cluster=testnet
- Testnet deployment transaction: https://explorer.solana.com/tx/5DKkhtQWdPBZvxUokeoDYnhKuCXEtM2UMa2pgFdCgJyS9VLTTVz9MPCqc368gHMvvBLqtwsy2nbVQJF9dqGqgxDN?cluster=testnet
- Deployment workflow evidence: https://github.com/elon00/solana-ai/actions/runs/35848403836
- Windows one-click redeploy helper: `ONE-CLICK-TESTNET-DEPLOY.bat`

Solana-focused blockchain and AI research project with post-quantum cryptography experiments, Rust/Solana program work, and reproducible cryptographic verification scripts.

## Current status

**Status: RESEARCH / PROTOTYPE — NOT INDEPENDENTLY PRODUCTION-CERTIFIED**

The repository contains working cryptographic test code and a Solana program implementation. Recent GitHub CI is passing, including portability fixes for the PQC/reality scripts. However, repository-defined scorecards and certificates are internal engineering artifacts; they are **not** a third-party security audit, NIST certification, or proof of a production deployment.

### What is currently evidenced

- ML-KEM-768 and full ML-DSA-65 sign/verify integration using `@noble/post-quantum`
- adversarial/tamper rejection with fail-closed signature verification
- registered AI-agent action execution; unknown actions fail closed
- deterministic Conway Game of Life engine with reproducible state hashing
- non-custodial injected multi-wallet manager for Phantom, Solflare, Backpack, Brave and Coinbase-compatible providers
- Rust/Solana authority-bound proof-registry program
- real `cargo build-sbf` verification and successful Solana Testnet deployment with independently verified executable Program account
- guarded Token-2022 Testnet launchpad workflow with metadata and uncapped mint-authority supply policy
- repository CI, RustSec and CodeQL security gates

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
npm run test:agentic
npm run audit:crypto
npm run check:real-features
npm run reality:universal
```

A passing test demonstrates the behavior covered by that test only. It does not turn an application into a FIPS-validated cryptographic module or independently audited production service.

## Repository layout

- `src/` — application and cryptographic integration code
- `program/` — Rust/Solana on-chain program work
- `tests/` — PQC and invariant tests
- `scripts/` — audit and evidence-generation tooling
- `REALITY_MANIFEST.json` — internal project status/scorecard; not an external certification

## Agentic / wallet / Web4-style feature layer

The repository now has a concrete wallet-first agentic architecture rather than placeholder deployment claims:

- `src/solana_ai.ts` — registered action runtime; completion happens only after the handler executes.
- `src/wallets/multiWallet.ts` — connects real injected Solana wallet providers without handling private keys.
- `src/conway/conwayAutomaton.ts` — Conway cellular automaton engine callable by agents.
- `src/utils/pqcCrypto.ts` — complete ML-DSA-65 signature envelopes and cryptographic verification.
- `program/src/lib.rs` — on-chain authority-bound proof commitment registry.
- `.github/workflows/solana-testnet-deploy.yml` — SBF build + guarded Testnet deployment.
- `.github/workflows/token-launchpad-testnet.yml` — real Token-2022 Testnet mint/metadata/issuance workflow.

"Web 4.0" is not treated as a standardized protocol claim. See [WEB4_ARCHITECTURE.md](WEB4_ARCHITECTURE.md) for the exact implemented meaning.

### Create a local Testnet wallet

Install the Agave/Solana CLI, then run:

```bash
npm run wallet:create:testnet
```

The private key is written only under the git-ignored `.secrets/` directory; the repository never stores or uploads it.

### Token supply / launchpad

The launchpad supports **uncapped issuance while mint authority remains active**. A literally infinite on-chain supply does not exist because token amounts are integer-bounded. See [LAUNCHPAD.md](LAUNCHPAD.md).

### Testnet deployment

See [TESTNET_DEPLOYMENT.md](TESTNET_DEPLOYMENT.md). The current live Testnet Program ID is `Bnpd9YGaVxMAwdxFoVA3SQP1Vhfwv7jnJ67QNcyAVKq3`, with deployment transaction `5DKkhtQWdPBZvxUokeoDYnhKuCXEtM2UMa2pgFdCgJyS9VLTTVz9MPCqc368gHMvvBLqtwsy2nbVQJF9dqGqgxDN`.

## Colosseum Copilot and hackathon readiness

This repository includes a safe one-click helper for Colosseum Copilot plus a current submission-readiness checklist.

1. Set your Colosseum environment variables without committing the token:

```bash
export COLOSSEUM_COPILOT_API_BASE="https://copilot.colosseum.com/api/v1"
export COLOSSEUM_COPILOT_PAT="YOUR_PAT"
```

2. Install the skill for Codex, Claude Code, and OpenClaw and verify authentication:

```bash
npm run colosseum:setup
```

3. Re-check the repository-side requirements:

```bash
npm run colosseum:check
```

See [COLOSSEUM_READINESS.md](COLOSSEUM_READINESS.md) for the live Crypto World's Fair checklist, the human/external steps that cannot be completed by CI, and the judging-alignment notes.

## Production-readiness requirements

Before production use, this project still needs deployment-specific threat modeling, independent security review, secrets/key-management design, observability, incident response, backup/recovery procedures, load testing, release controls, and verified deployment evidence.

## License

Apache-2.0.
