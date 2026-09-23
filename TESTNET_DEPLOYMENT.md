# Solana Testnet Deployment

Status: **AUTOMATED DEPLOYMENT PATH READY; ON-CHAIN DEPLOYMENT REQUIRES USER-CONTROLLED SIGNERS**

Solana Testnet RPC:

```text
https://api.testnet.solana.com
```

The repository workflow `.github/workflows/solana-testnet-deploy.yml` performs a real Solana SBF build on pull requests and main-branch changes. A manual workflow dispatch with `deploy=true` performs the on-chain deployment when the required GitHub Actions secrets exist.

## Required one-time signer setup

Do **not** paste private keys into issues, commits, PRs, or chat messages.

Generate two dedicated Testnet-only keypairs locally:

```bash
solana-keygen new --outfile solana-testnet-deployer.json
solana-keygen new --outfile solana-testnet-program.json
```

Display the public addresses:

```bash
solana-keygen pubkey solana-testnet-deployer.json
solana-keygen pubkey solana-testnet-program.json
```

Add the full JSON-array contents of the files as GitHub Actions repository secrets:

- `SOLANA_TESTNET_DEPLOYER_KEYPAIR`
- `SOLANA_TESTNET_PROGRAM_KEYPAIR`

The program keypair fixes the Program ID across redeployments. The deployer keypair remains the upgrade authority.

Optionally set repository variable `SOLANA_TESTNET_RPC` to a trusted Testnet RPC. If absent, the workflow uses the official public RPC.

## Fund the Testnet deployer

The workflow attempts a Testnet airdrop before deployment. Airdrops can be rate-limited, so you may need to fund the deployer address separately with Testnet SOL.

## Deploy

Open **Actions → Solana Testnet Deployment → Run workflow**, set `deploy=true`, and run it.

The workflow will:

1. install the pinned Solana/Agave CLI;
2. run `cargo build-sbf`;
3. hash the SBF artifact;
4. validate the signer and Program ID;
5. attempt a Testnet airdrop;
6. deploy with `solana program deploy`;
7. verify the deployed program;
8. publish the Program ID, deployment transaction signature, SBF SHA-256, Explorer links, and a JSON evidence artifact.

A green ordinary CI run is not proof of deployment. Only a successful deployment workflow containing an on-chain Program ID and transaction signature is deployment evidence.
