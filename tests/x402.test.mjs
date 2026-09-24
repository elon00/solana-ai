import test from 'node:test';
import assert from 'node:assert/strict';

import { SolanaAiOrchestrator } from '../src/solana_ai.ts';
import {
  SOLANA_DEVNET_CAIP2,
  SOLANA_DEVNET_USDC_MINT,
  X402_HEADERS,
  decodeX402Header,
  encodeX402Header,
} from '../src/x402/protocol.ts';
import { X402HttpClient } from '../src/x402/client.ts';
import { X402ResourceGate } from '../src/x402/resourceGate.ts';
import { registerX402AgentAction, X402_AGENT_ACTION } from '../src/x402/agentAction.ts';

const payTo = '8qhW8ctXX77UNLTY9kx3XoAoH8kstQXPbCghUwqu34es';
const requirement = {
  scheme: 'exact',
  network: SOLANA_DEVNET_CAIP2,
  amount: '1000',
  asset: SOLANA_DEVNET_USDC_MINT,
  payTo,
  maxTimeoutSeconds: 60,
  extra: {
    feePayer: 'FeePayer1111111111111111111111111111111111',
    paymentFlow: 'authorization',
  },
};

const paymentRequired = {
  x402Version: 2,
  error: 'PAYMENT-SIGNATURE header is required',
  resource: {
    url: 'https://api.example.test/premium',
    description: 'Paid agent resource',
    mimeType: 'application/json',
    serviceName: 'Solana AI x402',
  },
  accepts: [requirement],
  extensions: {},
};

test('x402 v2 headers round-trip as base64 JSON', () => {
  const encoded = encodeX402Header(paymentRequired);
  const decoded = decodeX402Header(encoded);
  assert.deepEqual(decoded, paymentRequired);
});

test('x402 client handles 402, enforces policy, signs, retries, and captures settlement', async () => {
  let calls = 0;
  let signerCalls = 0;

  const fakeFetch = async (request) => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: 'payment required' }), {
        status: 402,
        headers: {
          [X402_HEADERS.paymentRequired]: encodeX402Header(paymentRequired),
          'content-type': 'application/json',
        },
      });
    }

    const header = request.headers.get(X402_HEADERS.paymentSignature);
    assert.ok(header, 'paid retry must include PAYMENT-SIGNATURE');
    const payload = decodeX402Header(header);
    assert.equal(payload.x402Version, 2);
    assert.deepEqual(payload.accepted, requirement);
    assert.equal(payload.payload.transaction, 'base64-partially-signed-solana-tx');

    return new Response(JSON.stringify({ premium: true }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        [X402_HEADERS.paymentResponse]: encodeX402Header({
          success: true,
          payer: 'Buyer111111111111111111111111111111111111',
          transaction: '5x402SettlementSignature',
          network: SOLANA_DEVNET_CAIP2,
        }),
      },
    });
  };

  const client = new X402HttpClient(
    async ({ requirements }) => {
      signerCalls += 1;
      assert.equal(requirements.network, SOLANA_DEVNET_CAIP2);
      return { transaction: 'base64-partially-signed-solana-tx' };
    },
    {
      allowedNetworks: [SOLANA_DEVNET_CAIP2],
      allowedSchemes: ['exact'],
      allowedAssets: [SOLANA_DEVNET_USDC_MINT],
      allowedPayTo: [payTo],
      maxAtomicAmount: 10_000n,
      allowedHosts: ['api.example.test'],
    },
    fakeFetch,
  );

  const result = await client.request('https://api.example.test/premium');
  assert.equal(result.response.status, 200);
  assert.equal(result.settlement?.success, true);
  assert.equal(result.settlement?.transaction, '5x402SettlementSignature');
  assert.equal(calls, 2);
  assert.equal(signerCalls, 1);
});

test('x402 client fails closed before signing when price exceeds policy', async () => {
  let signerCalls = 0;
  const expensive = {
    ...paymentRequired,
    accepts: [{ ...requirement, amount: '1000000000' }],
  };

  const client = new X402HttpClient(
    async () => {
      signerCalls += 1;
      return { transaction: 'must-not-run' };
    },
    {
      allowedNetworks: [SOLANA_DEVNET_CAIP2],
      maxAtomicAmount: 10_000n,
    },
    async () =>
      new Response('', {
        status: 402,
        headers: {
          [X402_HEADERS.paymentRequired]: encodeX402Header(expensive),
        },
      }),
  );

  await assert.rejects(
    () => client.request('https://api.example.test/premium'),
    /No x402 payment requirement passed/,
  );
  assert.equal(signerCalls, 0);
});

test('resource gate executes verify -> resource -> settle and returns PAYMENT-RESPONSE', async () => {
  const order = [];
  const facilitator = {
    async supported() {
      return { kinds: [], extensions: [], signers: {} };
    },
    async verify(payload, selected) {
      order.push('verify');
      assert.deepEqual(selected, requirement);
      assert.equal(payload.payload.transaction, 'base64-partially-signed-solana-tx');
      return { isValid: true, payer: 'Buyer111111111111111111111111111111111111' };
    },
    async settle(payload, selected) {
      order.push('settle');
      assert.deepEqual(selected, requirement);
      assert.equal(payload.payload.transaction, 'base64-partially-signed-solana-tx');
      return {
        success: true,
        payer: 'Buyer111111111111111111111111111111111111',
        transaction: 'settled-on-solana',
        network: SOLANA_DEVNET_CAIP2,
      };
    },
  };

  const gate = new X402ResourceGate({
    resource: paymentRequired.resource,
    accepts: [requirement],
    facilitator,
  });

  const initial = gate.challenge();
  assert.equal(initial.status, 402);
  assert.ok(initial.headers[X402_HEADERS.paymentRequired]);

  const paymentPayload = {
    x402Version: 2,
    resource: paymentRequired.resource,
    accepted: requirement,
    payload: { transaction: 'base64-partially-signed-solana-tx' },
    extensions: {},
  };

  const paid = await gate.execute(
    encodeX402Header(paymentPayload),
    async () => {
      order.push('resource');
      return { report: 'paid result' };
    },
  );

  assert.equal(paid.status, 200);
  assert.deepEqual(order, ['verify', 'resource', 'settle']);
  assert.ok(paid.headers[X402_HEADERS.paymentResponse]);
  assert.equal(paid.body.settlement.transaction, 'settled-on-solana');
});

test('x402 paid call synchronizes into agent result and existing PQC proof', async () => {
  let calls = 0;
  const client = new X402HttpClient(
    async () => ({ transaction: 'agent-partially-signed-solana-tx' }),
    {
      allowedNetworks: [SOLANA_DEVNET_CAIP2],
      allowedSchemes: ['exact'],
      allowedAssets: [SOLANA_DEVNET_USDC_MINT],
      allowedPayTo: [payTo],
      maxAtomicAmount: 10_000n,
      allowedHosts: ['api.example.test'],
    },
    async (request) => {
      calls += 1;
      if (calls === 1) {
        return new Response('', {
          status: 402,
          headers: {
            [X402_HEADERS.paymentRequired]: encodeX402Header(paymentRequired),
          },
        });
      }
      assert.ok(request.headers.get(X402_HEADERS.paymentSignature));
      return new Response(JSON.stringify({ answer: 42 }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          [X402_HEADERS.paymentResponse]: encodeX402Header({
            success: true,
            transaction: 'agent-x402-settlement',
            network: SOLANA_DEVNET_CAIP2,
            payer: 'Buyer111111111111111111111111111111111111',
          }),
        },
      });
    },
  );

  const orchestrator = new SolanaAiOrchestrator();
  registerX402AgentAction(orchestrator, client);

  const task = await orchestrator.executeTask('PaymentAgent', X402_AGENT_ACTION, {
    url: 'https://api.example.test/premium',
  });

  assert.equal(task.status, 'COMPLETED');
  assert.equal(task.result.x402.paid, true);
  assert.equal(task.result.x402.settlement.transaction, 'agent-x402-settlement');
  assert.equal(orchestrator.verifyTaskProof(task), true);
});
