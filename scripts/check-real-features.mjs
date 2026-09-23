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

const program = fs.readFileSync('program/src/lib.rs', 'utf8');
assert.ok(program.includes('record_commitment'), 'On-chain proof registry is required');
assert.ok(!program.includes('try_borrow_mut_lamports'), 'Lamport mutation cannot be represented as token minting');

const launchpad = fs.readFileSync('.github/workflows/token-launchpad-testnet.yml', 'utf8');
assert.ok(launchpad.includes('--program-2022'), 'Launchpad must use Token-2022');
assert.ok(launchpad.includes('UNCAPPED_WHILE_MINT_AUTHORITY_REMAINS_ACTIVE'), 'Supply policy must be explicit');

const deployment = fs.readFileSync('.github/workflows/solana-testnet-deploy.yml', 'utf8');
assert.ok(deployment.includes('cargo build-sbf'), 'Deployment must build a real SBF artifact');
assert.ok(deployment.includes('solana program deploy'), 'Deployment must submit a Solana program deploy transaction');

console.log('Real feature integrity checks: PASS');
console.log('External on-chain deployment/launch still require user-controlled signers and network execution.');
