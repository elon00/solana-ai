import type { SolanaAiOrchestrator } from '../solana_ai.js';
import { X402HttpClient } from './client.js';

export const X402_AGENT_ACTION = 'X402_HTTP_FETCH';

export interface X402AgentFetchInput {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export function registerX402AgentAction(
  orchestrator: SolanaAiOrchestrator,
  client: X402HttpClient,
): void {
  orchestrator.registerAction(X402_AGENT_ACTION, async (rawInput) => {
    if (!rawInput || typeof rawInput !== 'object') throw new Error('x402 fetch input is required');
    const input = rawInput as X402AgentFetchInput;
    if (!input.url) throw new Error('x402 URL is required');

    const result = await client.request(input.url, {
      method: input.method ?? 'GET',
      headers: input.headers,
      body: input.body,
    });

    const contentType = result.response.headers.get('content-type') ?? '';
    const responseBody = contentType.includes('application/json')
      ? await result.response.json()
      : await result.response.text();

    return {
      httpStatus: result.response.status,
      response: responseBody,
      x402: {
        paid: Boolean(result.paymentPayload),
        network: result.paymentPayload?.accepted.network,
        asset: result.paymentPayload?.accepted.asset,
        amount: result.paymentPayload?.accepted.amount,
        payTo: result.paymentPayload?.accepted.payTo,
        settlement: result.settlement,
      },
    };
  });
}
