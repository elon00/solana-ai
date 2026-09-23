import test from 'node:test';
import assert from 'node:assert/strict';

import { SolanaAiOrchestrator } from '../src/solana_ai.ts';
import { runConway, stepConway, conwayStateHash } from '../src/conway/conwayAutomaton.ts';
import { MultiWalletManager } from '../src/wallets/multiWallet.ts';
import { createPqcHybridSignature, generatePqcKeyPair } from '../src/utils/pqcCrypto.ts';

test('Conway blinker evolves deterministically', () => {
  const start = [
    [false, false, false, false, false],
    [false, false, true, false, false],
    [false, false, true, false, false],
    [false, false, true, false, false],
    [false, false, false, false, false],
  ];

  const expected = [
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, true, true, true, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
  ];

  assert.deepEqual(stepConway(start), expected);
  assert.deepEqual(runConway(start, 2), start);
  assert.notEqual(conwayStateHash(start), conwayStateHash(expected));
});

test('agent executes registered Conway action before issuing PQC proof', async () => {
  const orchestrator = new SolanaAiOrchestrator();
  orchestrator.registerAction('CONWAY_STEP', (input) => {
    if (!Array.isArray(input)) throw new Error('grid required');
    return stepConway(input);
  });

  const grid = [
    [false, true, false],
    [false, true, false],
    [false, true, false],
  ];

  const task = await orchestrator.executeTask('ConwayAgent', 'CONWAY_STEP', grid);
  assert.equal(task.status, 'COMPLETED');
  assert.ok(task.pqcSignature);
  assert.equal(orchestrator.verifyTaskProof(task), true);

  const tampered = { ...task, result: [[true]] };
  assert.equal(orchestrator.verifyTaskProof(tampered), false);
});

test('agent fails closed for unregistered actions', async () => {
  const orchestrator = new SolanaAiOrchestrator();
  const task = await orchestrator.executeTask('GuardAgent', 'DEPLOY_WITHOUT_HANDLER', {});
  assert.equal(task.status, 'FAIL_CLOSED');
  assert.equal(task.pqcSignature, undefined);
  assert.match(task.error ?? '', /Unregistered action/);
});


test('agent canonicalization preserves distinct array values and supports BigInt', async () => {
  const orchestrator = new SolanaAiOrchestrator();
  orchestrator.registerAction('ECHO', (input) => input);

  const bigintTask = await orchestrator.executeTask('CanonicalAgent', 'ECHO', 9007199254740993n);
  assert.equal(bigintTask.status, 'COMPLETED');
  assert.equal(orchestrator.verifyTaskProof(bigintTask), true);

  const undefinedArrayTask = await orchestrator.executeTask('CanonicalAgent', 'ECHO', [undefined]);
  assert.equal(undefinedArrayTask.status, 'COMPLETED');
  assert.equal(orchestrator.verifyTaskProof(undefinedArrayTask), true);

  const collisionAttempt = { ...undefinedArrayTask, input: [] };
  assert.equal(orchestrator.verifyTaskProof(collisionAttempt), false);
});

test('agent fails closed when proof input cannot be canonicalized', async () => {
  const orchestrator = new SolanaAiOrchestrator();
  let handlerRan = false;
  orchestrator.registerAction('ECHO', (input) => {
    handlerRan = true;
    return input;
  });

  const task = await orchestrator.executeTask('CanonicalAgent', 'ECHO', () => 'unsupported');
  assert.equal(task.status, 'FAIL_CLOSED');
  assert.equal(handlerRan, false);
  assert.match(task.error ?? '', /Unsupported proof value type/);
});

test('wallet provider cannot be replaced while its connection is active', async () => {
  const providerA = {
    publicKey: 'WalletAddressA',
    async connect() { return { publicKey: 'WalletAddressA' }; },
    async disconnect() {},
    async signTransaction(transaction) { return transaction; },
  };
  const providerB = {
    publicKey: 'WalletAddressB',
    async connect() { return { publicKey: 'WalletAddressB' }; },
    async disconnect() {},
  };

  const manager = new MultiWalletManager(new Map([['TestWallet', providerA]]));
  await manager.connect('TestWallet');
  assert.throws(
    () => manager.register('TestWallet', providerB),
    /Disconnect TestWallet before replacing/
  );
});

test('ML-KEM key material cannot be used for ML-DSA signing', () => {
  const kemPair = generatePqcKeyPair('ML-KEM-768');
  assert.throws(
    () => createPqcHybridSignature('subject', kemPair, 0, 'agent'),
    /ML-DSA-65 signing requires an ML-DSA-65 key pair/
  );
});
