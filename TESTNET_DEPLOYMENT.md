# Solana Testnet Deployment

Status: **LIVE ON SOLANA TESTNET — VERIFIED**

## Current live deployment

- **RPC:** `https://api.testnet.solana.com`
- **Program ID:** `Bnpd9YGaVxMAwdxFoVA3SQP1Vhfwv7jnJ67QNcyAVKq3`
- **ProgramData address:** `DhJKKEatbJZCRavF3hiSUGWfLP1K43adh2LLCkGR8CLn`
- **Upgrade authority:** `8qhW8ctXX77UNLTY9kx3XoAoH8kstQXPbCghUwqu34es`
- **Latest deployment transaction:** `5DKkhtQWdPBZvxUokeoDYnhKuCXEtM2UMa2pgFdCgJyS9VLTTVz9MPCqc368gHMvvBLqtwsy2nbVQJF9dqGqgxDN`
- **SBF SHA-256:** `10692ba989aba95df0de26f5268eded6bbddc5d4c4c21ba3be9baeb5891d71f3`
- **Source commit deployed:** `16bceedd561effdaa4fcefc2be81aaf8273cda1a`
- **Successful deployment workflow:** `35848403836`

Explorer:

- Program: https://explorer.solana.com/address/Bnpd9YGaVxMAwdxFoVA3SQP1Vhfwv7jnJ67QNcyAVKq3?cluster=testnet
- Transaction: https://explorer.solana.com/tx/5DKkhtQWdPBZvxUokeoDYnhKuCXEtM2UMa2pgFdCgJyS9VLTTVz9MPCqc368gHMvvBLqtwsy2nbVQJF9dqGqgxDN?cluster=testnet
- Workflow evidence: https://github.com/elon00/solana-ai/actions/runs/35848403836

The successful workflow performed a real `cargo build-sbf`, signed deployment, explicit-signer `solana program show`, independent JSON-RPC executable-account verification, and uploaded a `solana-ai-testnet-deployment-evidence` artifact.

## One-click redeployment

Repository secrets already supply the user-controlled Testnet deployer and program keypairs. For a manual redeploy:

1. Open **Actions**.
2. Select **Solana Testnet Deployment**.
3. Click **Run workflow**.
4. Set **deploy = true**.
5. Click **Run workflow**.

A successful run produces a fresh transaction signature while retaining the same Program ID because the same program keypair is used.

## Security boundary

Never put private keys, seed phrases, or keypair JSON in README files, issues, commits, pull requests, or chat. The workflow reads the keypairs only from encrypted GitHub Actions secrets.

## Evidence rule

A source-code hash alone is not deployment proof. Deployment is considered verified only when the workflow records the on-chain Program ID, signed transaction signature, SBF hash, and successful independent Testnet account verification.
