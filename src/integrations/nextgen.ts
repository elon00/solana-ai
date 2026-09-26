export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
};

export function createMcpRuntime(opts: { name: string; version?: string; tools?: McpTool[] }) {
  const { name, version = '1.0.0', tools = [] } = opts;
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
  return {
    async handle(message: any) {
      if (!message || message.jsonrpc !== '2.0' || !message.method) {
        return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid Request' } };
      }
      if (message.method === 'initialize') {
        return { jsonrpc: '2.0', id: message.id ?? null, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name, version } } };
      }
      if (message.method === 'tools/list') {
        return { jsonrpc: '2.0', id: message.id ?? null, result: { tools: tools.map(({ name, description = '', inputSchema = { type: 'object' } }) => ({ name, description, inputSchema })) } };
      }
      if (message.method === 'tools/call') {
        const tool = toolMap.get(message.params?.name);
        if (!tool) return { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32601, message: 'Unknown tool' } };
        try {
          const value = await tool.execute(message.params?.arguments ?? {});
          return { jsonrpc: '2.0', id: message.id ?? null, result: { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] } };
        } catch (error) {
          return { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } };
        }
      }
      return { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32601, message: 'Method not found' } };
    },
  };
}

export function createSolanaActionMetadata(input: {
  title: string;
  icon: string;
  description: string;
  label?: string;
  disabled?: boolean;
  error?: string;
}) {
  const { title, icon, description, label = 'Continue', disabled = false, error } = input;
  if (!title || !icon || !description || !label) throw new Error('Incomplete Solana Action metadata');
  return { type: 'action', title, icon, description, label, disabled, ...(error ? { error: { message: error } } : {}) };
}

export function createBlinkUrl(actionUrl: string) {
  const url = new URL(actionUrl);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Blink action URL must be HTTP(S)');
  return `solana-action:${url.toString()}`;
}
