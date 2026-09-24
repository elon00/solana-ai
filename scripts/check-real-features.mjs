import fs from 'node:fs';
import assert from 'node:assert/strict';

const required = [
  'src/solana_ai.ts',
  'src/utils/pqcCrypto.ts',
  'src/wallets/multiWallet.ts',
  'src/conway/conwayAutomaton.ts',
  'program/src/lib.rs',
  '.github/workflows/solana-testnet-deploy.yml',
  '.github/workflows/token-launchpad-testnet.yml',
  'LAUNCHPAD.md',
  'TESTNET_DEPLOYMENT.md',
  'src/x402/protocol.ts',
  'src/x402/facilitator.ts',
  'src/x402/client.ts',
  'src/x402/resourceGate.ts',
  'src/x402/agentAction.ts',
  'tests/x402.test.mjs',
  'X402_INTEGRATION.md',
];

for (const file of required) {
  assert.ok(fs.existsSync(file), `Required real-feature artifact missing: ${file}`);
}

const pqc = fs.readFileSync('src/utils/pqcCrypto.ts', 'utf8');
assert.ok(pqc.includes('PQC-MLDSA65-v1.'), 'Full ML-DSA envelope is required');
assert.ok(pqc.includes('ml_dsa65.verify'), 'ML-DSA verification must execute');
assert.ok(!pqc.includes('ED25519-SIG-'), 'Fabricated Ed25519 signature marker is forbidden');
assert.ok(!pqc.includes('dsaSigHex.substring(0, 64)'), 'Truncated signature envelope is forbidden');

const agent = fs.readFileSync('src/solana_ai.ts', 'utf8');
assert.ok(agent.includes('registerAction'), 'Agent action registry is required');
assert.ok(agent.includes("status: 'FAIL_CLOSED'"), 'Unknown/failed agent actions must fail closed');
assert.ok(agent.includes('await handler(input)'), 'Agent must execute a registered handler before completion');
assert.ok(agent.includes("case 'bigint'"), 'Agent canonicalization must support BigInt deterministically');
assert.ok(agent.includes('Cyclic proof values are not supported'), 'Agent canonicalization must fail closed on cycles');

const program = fs.readFileSync('program/src/lib.rs', 'utf8');
assert.ok(program.includes('record_commitment'), 'On-chain proof registry is required');
assert.ok(
  program.includes("data[..REGISTRY_DATA_LEN].iter().any(|byte| *byte != 0)"),
  'Registry initialization must reject takeover/reinitialization'
);
assert.ok(!program.includes('try_borrow_mut_lamports'), 'Lamport mutation cannot be represented as token minting');

const reality = fs.readFileSync('scripts/reality-universal.ts', 'utf8');
assert.ok(
  reality.includes('authorizationVerification = verifyPqcSignature'),
  'Authorization reality gate must execute full signature verification'
);

const launchpad = fs.readFileSync('.github/workflows/token-launchpad-testnet.yml', 'utf8');
assert.ok(launchpad.includes('--program-2022'), 'Launchpad must use Token-2022');
assert.ok(launchpad.includes('UNCAPPED_WHILE_MINT_AUTHORITY_REMAINS_ACTIVE'), 'Supply policy must be explicit');
assert.ok(launchpad.includes('transactionSignatures'), 'Launch evidence must include transaction signatures');
assert.ok(launchpad.includes('Initial-issuance transaction signature missing'), 'Launchpad must fail closed if issuance evidence is missing');

const deployment = fs.readFileSync('.github/workflows/solana-testnet-deploy.yml', 'utf8');
assert.ok(deployment.includes('cargo build-sbf'), 'Deployment must build a real SBF artifact');
assert.ok(deployment.includes('solana program deploy'), 'Deployment must submit a Solana program deploy transaction');

const x402Protocol = fs.readFileSync('src/x402/protocol.ts', 'utf8');
const x402Client = fs.readFileSync('src/x402/client.ts', 'utf8');
const x402Gate = fs.readFileSync('src/x402/resourceGate.ts', 'utf8');
const x402Agent = fs.readFileSync('src/x402/agentAction.ts', 'utf8');
assert.ok(x402Protocol.includes("paymentRequired: 'PAYMENT-REQUIRED'"), 'x402 PAYMENT-REQUIRED header is required');
assert.ok(x402Protocol.includes("paymentSignature: 'PAYMENT-SIGNATURE'"), 'x402 PAYMENT-SIGNATURE header is required');
assert.ok(x402Protocol.includes("paymentResponse: 'PAYMENT-RESPONSE'"), 'x402 PAYMENT-RESPONSE header is required');
assert.ok(x402Client.includes('maxAtomicAmount'), 'x402 client must enforce a spend ceiling');
assert.ok(x402Client.includes('allowedPayTo'), 'x402 client must enforce recipient policy');
assert.ok(x402Gate.includes('facilitator.verify'), 'x402 resource gate must verify before resource execution');
assert.ok(x402Gate.includes('facilitator.settle'), 'x402 resource gate must settle payment');
assert.ok(x402Agent.includes('X402_HTTP_FETCH'), 'Agent runtime must expose the x402 paid-fetch action');

console.log('Real feature integrity checks: PASS');
console.log('External on-chain deployment/launch still require user-controlled signers and network execution.');
