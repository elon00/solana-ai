import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMcpRuntime,
  createSolanaActionMetadata,
  createBlinkUrl,
  createRealtimeSolanaSubscriber,
  realityPolicy,
} from '../src/integrations/nextgen.mjs';

test('MCP runtime initializes, lists tools and calls a tool', async () => {
  const runtime = createMcpRuntime({
    name: 'project-agent',
    tools: [{
      name: 'health',
      description: 'Returns health state',
      inputSchema: { type: 'object', additionalProperties: false },
      execute: async () => ({ ok: true }),
    }],
  });
  const init = await runtime.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(init.result.serverInfo.name, 'project-agent');
  const list = await runtime.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal(list.result.tools[0].name, 'health');
  const call = await runtime.handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'health', arguments: {} } });
  assert.match(call.result.content[0].text, /"ok":true/);
});

test('Solana Action metadata and Blink link are deterministic', () => {
  const action = createSolanaActionMetadata({
    title: 'Project action',
    icon: 'https://example.com/icon.png',
    description: 'Wallet-signed action',
    label: 'Open',
  });
  assert.equal(action.type, 'action');
  assert.equal(createBlinkUrl('https://example.com/api/actions/demo'), 'solana-action:https://example.com/api/actions/demo');
});

test('realtime subscriber sends subscribe and unsubscribe JSON-RPC', () => {
  const sent = [];
  class MockWebSocket {
    constructor() { this.readyState = 1; this.handlers = {}; }
    addEventListener(name, cb) { this.handlers[name] = cb; if (name === 'open') queueMicrotask(cb); }
    send(value) { sent.push(JSON.parse(value)); }
    close() {}
  }
  const subscriber = createRealtimeSolanaSubscriber({ endpoint: 'wss://example.invalid', WebSocketImpl: MockWebSocket });
  const handle = subscriber.subscribe('accountSubscribe', ['11111111111111111111111111111111'], () => {});
  return new Promise((resolve) => setTimeout(() => {
    assert.equal(sent[0].method, 'accountSubscribe');
    handle.close();
    resolve();
  }, 0));
});

test('reality policy rejects false equivalences', () => {
  assert.equal(realityPolicy.sourceCodeIsDeploymentProof, false);
  assert.equal(realityPolicy.x402CodeMeansSettledPayment, false);
});
