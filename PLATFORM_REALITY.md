# Platform Feature Reality

This document describes concrete implemented behavior rather than marketing labels.

## Implemented and testable

- **AI agent action runtime:** registered handlers are actually invoked. Unknown actions fail closed instead of being labelled completed.
- **PQC:** ML-DSA-65 signatures are carried in full and cryptographically verified; ML-KEM-768 integration remains covered by invariant/rejection tests.
- **Multi-wallet:** browser connector supports concurrent Phantom, Solflare, and Backpack provider connections.
- **Automation:** due-job engine executes registered jobs and tracks scheduling state.
- **Conway cellular automaton:** deterministic Game of Life engine with oscillator tests.
- **Launchpad application core:** validated launch configuration registry, including an uncapped SAIC policy.
- **On-chain launch state:** the native Solana program contains an authority-controlled uncapped supply ledger, pause control, checked arithmetic, and fail-closed authorization.
- **Solana SBF:** `cargo build-sbf` passes in GitHub Actions.

## Important boundaries

- **Web 4.0** is treated as a descriptive product label, not a formal Solana protocol or certification.
- The uncapped SAIC ledger is **not yet an SPL Token mint**. “Unlimited supply” means no configured application/program supply cap; arithmetic still fails safely at the u64 boundary.
- The launchpad is **not yet a production token-sale/liquidity system**.
- Testnet is **not called deployed** until an on-chain Program ID and deployment transaction signature exist.
- Multi-wallet code requires a browser with compatible wallet providers installed; unit tests use provider interfaces only to verify connector behavior.
- No fake users, balances, transactions, deployments, liquidity, revenue, or external audit results are used as evidence.
