import assert from 'node:assert/strict';
import { generatePqcKeyPair, createPqcHybridSignature, verifyPqcSignature } from '../src/utils/pqcCrypto.ts';
import { SolanaAiOrchestrator } from '../src/solana_ai.ts';
import { AutomationEngine } from '../src/automation/engine.ts';
import { createGrid, nextGeneration, population } from '../src/game/conway.ts';
import { MultiWalletManager } from '../src/wallets/multiWallet.ts';
import { LaunchpadRegistry, SAIC_UNCAPPED_SUPPLY_POLICY } from '../src/launchpad/registry.ts';

async function run() {
  const pqc = generatePqcKeyPair('ML-DSA-65');
  const sig = createPqcHybridSignature('feature-test', pqc, 1, 'platform');
  assert.ok(sig.hybridSignature.startsWith('PQC-MLDSA65.'));
  assert.equal(verifyPqcSignature(sig.hybridSignature, 'feature-test', pqc.publicKey, 1, 'platform').valid, true);
  const tampered = sig.hybridSignature.slice(0, -1) + (sig.hybridSignature.endsWith('0') ? '1' : '0');
  assert.equal(verifyPqcSignature(tampered, 'feature-test', pqc.publicKey, 1, 'platform').valid, false);

  const orchestrator = new SolanaAiOrchestrator();
  let executed = 0;
  orchestrator.registerAction('CONWAY_STEP', async (input) => {
    executed += 1;
    const next = nextGeneration(input);
    return { output: next, evidence: { population: population(next) } };
  });

  const grid = createGrid(5, 5, [[2, 1], [2, 2], [2, 3]]);
  const task = await orchestrator.executeTask('ConwayAgent', 'CONWAY_STEP', grid);
  assert.equal(task.status, 'COMPLETED');
  assert.equal(executed, 1);
  assert.deepEqual(task.output, createGrid(5, 5, [[1, 2], [2, 2], [3, 2]]));
  assert.equal(orchestrator.verifyTaskProof(task), true);

  const blocked = await orchestrator.executeTask('GuardAgent', 'DEPLOY_WITHOUT_HANDLER', {});
  assert.equal(blocked.status, 'FAIL_CLOSED');

  const automation = new AutomationEngine();
  let runs = 0;
  automation.register('healthcheck', 1000, async () => { runs += 1; }, 100);
  assert.equal((await automation.runDue(99)).length, 0);
  assert.equal((await automation.runDue(100)).length, 1);
  assert.equal(runs, 1);

  const providers = new Map();
  for (const name of ['Phantom', 'Solflare', 'Backpack']) {
    const address = `${name}-test-address`;
    providers.set(name, {
      publicKey: { toString: () => address },
      async connect() { return { publicKey: this.publicKey }; },
      async disconnect() {},
    });
  }
  const wallets = new MultiWalletManager(providers);
  assert.deepEqual(wallets.listAvailable().sort(), ['Backpack', 'Phantom', 'Solflare']);
  await wallets.connect('Phantom');
  await wallets.connect('Solflare');
  assert.equal(wallets.listConnected().length, 2);
  await wallets.disconnectAll();
  assert.equal(wallets.listConnected().length, 0);

  const launchpad = new LaunchpadRegistry();
  const launch = launchpad.create(SAIC_UNCAPPED_SUPPLY_POLICY);
  assert.equal(launch.symbol, 'SAIC');
  assert.equal(launch.supplyCap, null);
  assert.equal(launch.mintAuthorityRetained, true);

  console.log('Platform feature reality tests: PASS');
}

await run();
