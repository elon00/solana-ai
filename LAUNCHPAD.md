# Real Token-2022 Launchpad

The launchpad uses Solana's Token-2022 program and the `spl-token` CLI bundled with the pinned Agave/Solana CLI. It does **not** pretend that custom lamport mutation is token minting.

## Supply model

Solana token supply is integer-bounded on chain, so a literally infinite supply does not exist. The supported policy is:

**UNCAPPED_WHILE_MINT_AUTHORITY_REMAINS_ACTIVE**

That means the mint authority can continue issuing additional units until the authority is permanently disabled or transferred. This is the technically correct equivalent of an "unlimited/uncapped" issuance policy.

## Launch on Testnet

The workflow is:

`.github/workflows/token-launchpad-testnet.yml`

It requires the repository secret:

`SOLANA_TESTNET_DEPLOYER_KEYPAIR`

Open **Actions → Token-2022 Testnet Launchpad → Run workflow** and provide:

- token name;
- symbol;
- decimals;
- initial supply;
- a public HTTPS metadata JSON URI.

The workflow creates a real Token-2022 mint, initializes metadata, creates the authority's token account, mints the requested initial amount, reads the resulting supply, and publishes the transaction signature for every state-changing step plus a JSON evidence artifact and Solana Explorer links.

## Authority safety

The workflow intentionally keeps mint authority active for uncapped issuance. If a fixed supply is desired later, the authority can be disabled permanently with:

```bash
spl-token --url testnet --program-2022 authorize <MINT_ADDRESS> mint --disable
```

Disabling mint authority is irreversible. Do not do this until the desired tokenomics are final.
