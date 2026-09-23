import test from 'node:test';
import assert from 'node:assert/strict';

import { SolanaAiOrchestrator } from '../src/solana_ai.ts';
import { runConway, stepConway, conwayStateHash } from '../src/conway/conwayAutomaton.ts';

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
