import type {
  X402PaymentPayload,
  X402PaymentRequirements,
  X402SettlementResponse,
  X402VerifyResponse,
} from './protocol.js';

export interface X402SupportedKind {
  x402Version: number;
  scheme: string;
  network: string;
  extra?: Record<string, unknown>;
}

export interface X402SupportedResponse {
  kinds: X402SupportedKind[];
  extensions: string[];
  signers: Record<string, string[]>;
}

export type X402Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface X402Facilitator {
  supported(): Promise<X402SupportedResponse>;
  verify(paymentPayload: X402PaymentPayload, paymentRequirements: X402PaymentRequirements): Promise<X402VerifyResponse>;
  settle(paymentPayload: X402PaymentPayload, paymentRequirements: X402PaymentRequirements): Promise<X402SettlementResponse>;
}

export class HTTPX402Facilitator implements X402Facilitator {
  private readonly baseUrl: string;

  constructor(
    baseUrl = 'https://x402.org/facilitator',
    private readonly fetchImpl: X402Fetch = fetch,
    private readonly timeoutMs = 15_000,
    allowInsecureLocalhost = false,
  ) {
    const url = new URL(baseUrl);
    const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(allowInsecureLocalhost && local)) {
      throw new Error('x402 facilitator must use HTTPS unless explicitly using localhost for tests');
    }
    this.baseUrl = url.toString().replace(/\/$/, '');
  }

  async supported(): Promise<X402SupportedResponse> {
    return this.request<X402SupportedResponse>('/supported', { method: 'GET' });
  }

  async verify(
    paymentPayload: X402PaymentPayload,
    paymentRequirements: X402PaymentRequirements,
  ): Promise<X402VerifyResponse> {
    return this.request<X402VerifyResponse>('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x402Version: 2, paymentPayload, paymentRequirements }),
    });
  }

  async settle(
    paymentPayload: X402PaymentPayload,
    paymentRequirements: X402PaymentRequirements,
  ): Promise<X402SettlementResponse> {
    return this.request<X402SettlementResponse>('/settle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x402Version: 2, paymentPayload, paymentRequirements }),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`x402 facilitator ${path} failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
