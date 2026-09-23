# Testnet Wallets

These public addresses were generated specifically for Solana Testnet on 2026-09-23.

- Testnet deployer / upgrade authority: `A9MmkaJrEC8nURgKhpR6XDGn4JErJGJA66owjHAVdjDk`
- Stable Testnet program keypair / intended Program ID: `G8psSQ47tMQX1zh9STk24NtmNrwzB43uHBbrXaWHMBxk`

Status:

- funded: **not yet verified**
- deployed: **not yet verified**
- deployment transaction: **not yet created**

The private keypair files are intentionally **not committed** to this repository. They must be stored as GitHub Actions secrets before the guarded deployment workflow can use them:

- `SOLANA_TESTNET_DEPLOYER_KEYPAIR`
- `SOLANA_TESTNET_PROGRAM_KEYPAIR`

Never reuse these keys for Mainnet funds.
