# Web4-style Agentic Architecture

"Web 4.0" is not a single standardized Solana protocol. In this repository the term is used narrowly to describe a **wallet-first, agentic, decentralized application architecture** whose claims can be tested.

## Implemented layers

1. **Non-custodial multi-wallet layer** — `src/wallets/multiWallet.ts` discovers/connects injected Phantom, Solflare, Backpack, Brave, and Coinbase-compatible Solana providers without storing private keys.
2. **Agent action runtime** — `src/solana_ai.ts` executes only registered action handlers; unregistered actions fail closed.
3. **PQC execution proofs** — completed agent actions receive full ML-DSA-65 signatures that are verified cryptographically, not by digest matching.
4. **Conway cellular automaton** — `src/conway/conwayAutomaton.ts` provides deterministic Game of Life evolution and state hashing that agents can invoke as a real computation.
5. **On-chain proof registry** — the Rust program records authority-bound 32-byte commitments and is verified with `cargo build-sbf`.
6. **Testnet deployment automation** — a guarded workflow builds/deploys the SBF artifact using user-controlled signers.
7. **Token-2022 launchpad** — a manual Testnet workflow creates actual Token-2022 mints, initializes metadata, mints an initial supply, and preserves mint authority for uncapped issuance.

## Boundary

A repository implementation is not proof of a live network deployment. Program IDs, transaction signatures, mint addresses, and observed on-chain state are only claimed after the corresponding Testnet workflows execute successfully with funded user-controlled signers.
