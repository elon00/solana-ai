# x402 V2 Integration

Status: **PROTOCOL INTEGRATED AND CI-VERIFIED; LIVE USDC SETTLEMENT EVIDENCE PENDING**

This repository now implements the x402 V2 HTTP payment flow and synchronizes paid HTTP actions with the existing Solana AI agent runtime and ML-DSA proof system.

## What is implemented

- canonical HTTP 402 challenge with base64 `PAYMENT-REQUIRED`;
- paid retry with base64 `PAYMENT-SIGNATURE`;
- successful settlement receipt via `PAYMENT-RESPONSE`;
- facilitator `GET /supported`, `POST /verify`, and `POST /settle` client;
- authorization flow ordering: **verify → execute resource → settle → respond**;
- policy controls before signing: allowed network, scheme, asset, recipient, host, and maximum atomic amount;
- Solana x402 V2 constants for Devnet/Mainnet CAIP-2 identifiers and USDC mints;
- agent action `X402_HTTP_FETCH` that captures x402 settlement metadata inside the agent result;
- existing ML-DSA-65 task proof then binds the paid action result and settlement receipt to the agent execution proof.

## Solana network boundary

The existing Solana AI smart contract is deployed on **Solana Testnet**.

x402 V2 reference documentation currently identifies:

- Solana Devnet: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- Solana Mainnet: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`

Therefore this integration defaults to **Solana Devnet for x402 testing**, rather than pretending that the current Testnet program deployment itself is an x402 payment rail.

Devnet USDC mint used by the configuration:

```text
4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

## Production roles

The x402 flow has three independent roles:

1. **Buyer / agent** receives a 402, checks payment policy, and supplies a scheme-specific signed payment payload.
2. **Resource server** verifies payment before executing protected work, settles after successful work, and returns the settlement receipt.
3. **Facilitator** verifies the signed payment and performs blockchain settlement.

The repository deliberately keeps SVM transaction construction/signing behind the `X402PaymentSigner` interface. That signer can be backed by a supported Solana wallet or the official `@x402/svm` SDK without storing private keys in this repository.

## Security properties

- no automatic payment is signed until price/network/asset/payee/host policy passes;
- payment requirement selected by the client cannot be silently changed by the signer;
- resource origin must match the URL being requested;
- unsupported payment flows fail closed;
- facilitator calls use HTTPS by default;
- a resource is not returned as paid if settlement reports failure;
- private keys remain outside source control.

## Verification

Run:

```bash
npm run test:x402
npm run check:real-features
```

These tests prove protocol handling and integration behavior. They do **not** prove a real USDC payment occurred.

## Remaining live-evidence step

To mark x402 as externally settled, execute one real Solana Devnet USDC x402 request using a funded payer wallet and compatible facilitator, then record:

- payer address;
- resource/payee;
- exact USDC amount;
- Solana Devnet settlement transaction signature;
- facilitator response;
- successful protected resource response.

Until that evidence exists, `REALITY_MANIFEST.json` must not claim a live x402 payment.
