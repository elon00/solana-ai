import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, signPqcMessage, verifyPqcMessage } from '../utils/pqcCrypto.js';
import type { PqcKeyPair } from '../types.js';

export interface AgentActionResult {
  output: unknown;
  evidence?: Record<string, unknown>;
}

export type AgentAction = (input: unknown) => AgentActionResult | Promise<AgentActionResult>;

export interface ExecutedAgentAction {
  actionId: string;
  action: string;
  status: 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt: string;
  output?: unknown;
  evidence?: Record<string, unknown>;
  error?: string;
  pqcSignature?: string;
}

export class AgentActionRuntime {
  private readonly actions = new Map<string, AgentAction>();

  constructor(private readonly keyPair: PqcKeyPair) {}

  register(name: string, action: AgentAction): void {
    if (!name.trim()) throw new Error('action name is required');
    if (this.actions.has(name)) throw new Error(`action already registered: ${name}`);
    this.actions.set(name, action);
  }

  async execute(name: string, input: unknown): Promise<ExecutedAgentAction> {
    const action = this.actions.get(name);
    if (!action) throw new Error(`unregistered action: ${name}`);

    const startedAt = new Date().toISOString();
    const digest = bytesToHex(sha256(new TextEncoder().encode(JSON.stringify({ name, input, startedAt }))));
    const actionId = `action_${digest.slice(0, 20)}`;

    try {
      const result = await action(input);
      const completedAt = new Date().toISOString();
      const receipt = JSON.stringify({ actionId, name, input, result, startedAt, completedAt });
      const signed = signPqcMessage(this.keyPair.keyId, receipt);
      return {
        actionId,
        action: name,
        status: 'COMPLETED',
        startedAt,
        completedAt,
        output: result.output,
        evidence: result.evidence,
        pqcSignature: signed.signature,
      };
    } catch (error) {
      return {
        actionId,
        action: name,
        status: 'FAILED',
        startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
