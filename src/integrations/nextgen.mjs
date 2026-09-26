/**
 * Dependency-free next-generation integration primitives.
 * These are deliberately transport adapters, not claims of live settlement/deployment.
 */

export function createMcpRuntime({ name, version = '1.0.0', tools = [] }) {
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

  return {
    async handle(message) {
      if (!message || message.jsonrpc !== '2.0' || !message.method) {
        return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid Request' } };
      }

      if (message.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: message.id ?? null,
          result: {
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name, version },
          },
        };
      }

      if (message.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: message.id ?? null,
          result: {
            tools: tools.map(({ name, description = '', inputSchema = { type: 'object' } }) => ({
              name,
              description,
              inputSchema,
            })),
          },
        };
      }

      if (message.method === 'tools/call') {
        const tool = toolMap.get(message.params?.name);
        if (!tool) {
          return { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32601, message: 'Unknown tool' } };
        }
        try {
          const value = await tool.execute(message.params?.arguments ?? {});
          return {
            jsonrpc: '2.0',
            id: message.id ?? null,
            result: { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] },
          };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id: message.id ?? null,
            error: { code: -32000, message: error instanceof Error ? error.message : String(error) },
          };
        }
      }

      return { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32601, message: 'Method not found' } };
    },
  };
}

export function createSolanaActionMetadata({
  title,
  icon,
  description,
  label = 'Continue',
  disabled = false,
  error,
}) {
  if (!title || !icon || !description || !label) throw new Error('Incomplete Solana Action metadata');
  return {
    type: 'action',
    title,
    icon,
    description,
    label,
    disabled,
    ...(error ? { error: { message: error } } : {}),
  };
}

export function createBlinkUrl(actionUrl) {
  const url = new URL(actionUrl);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Blink action URL must be HTTP(S)');
  return `solana-action:${url.toString()}`;
}

export function createRealtimeSolanaSubscriber({
  endpoint,
  WebSocketImpl = globalThis.WebSocket,
}) {
  if (!endpoint) throw new Error('WebSocket endpoint is required');
  if (!WebSocketImpl) throw new Error('WebSocket implementation is unavailable');

  return {
    subscribe(method, params, onNotification) {
      if (!method.endsWith('Subscribe')) throw new Error('Solana subscription method must end with Subscribe');
      const ws = new WebSocketImpl(endpoint);
      let subscriptionId = null;
      let requestId = 1;

      ws.addEventListener?.('open', () => {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }));
      });

      ws.addEventListener?.('message', (event) => {
        const data = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
        if (data.id === requestId && data.result !== undefined) {
          subscriptionId = data.result;
          return;
        }
        if (data.method?.endsWith('Notification')) onNotification?.(data.params);
      });

      return {
        close() {
          if (subscriptionId !== null && ws.readyState === 1) {
            const unsubscribeMethod = method.replace(/Subscribe$/, 'Unsubscribe');
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              id: ++requestId,
              method: unsubscribeMethod,
              params: [subscriptionId],
            }));
          }
          ws.close();
        },
      };
    },
  };
}

export const realityPolicy = Object.freeze({
  sourceCodeIsDeploymentProof: false,
  passingTestsAreIndependentAudit: false,
  applicationPqcMeansL1QuantumResistance: false,
  x402CodeMeansSettledPayment: false,
  documentationMentionMeansIntegration: false,
});
