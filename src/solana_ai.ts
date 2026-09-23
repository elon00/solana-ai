/**
 * Solana AI agent runtime.
 *
 * Tasks only reach COMPLETED after a registered action handler actually runs.
 * Unknown actions and handler errors fail closed.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import {
  generatePqcKeyPair,
  createPqcHybridSignature,
  verifyPqcSignature,
  bytesToHex,
} from './utils/pqcCrypto.js';
import { PqcKeyPair, SolanaAiAgentTask } from './types.js';

export type AgentActionHandler = (input: unknown) => unknown | Promise<unknown>;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(',')}}`;
}

function hashObject(value: unknown): string {
  return bytesToHex(sha256(new TextEncoder().encode(canonicalize(value))));
}

export class SolanaAiOrchestrator {
  private agentKeyPair: PqcKeyPair;
  private readonly actions = new Map<string, AgentActionHandler>();

  constructor(keyPair?: PqcKeyPair) {
    this.agentKeyPair = keyPair || generatePqcKeyPair('ML-DSA-65');
  }

  public getAgentPublicKey(): string {
    return this.agentKeyPair.publicKey;
  }

  public registerAction(action: string, handler: AgentActionHandler): void {
    if (!action.trim()) throw new Error('Action name is required');
    if (this.actions.has(action)) throw new Error(`Action already registered: ${action}`);
    this.actions.set(action, handler);
  }

  public listActions(): string[] {
    return [...this.actions.keys()].sort();
  }

  public async executeTask(
    agentName: string,
    action: string,
    input?: unknown
  ): Promise<SolanaAiAgentTask> {
    const executionTimestamp = new Date().toISOString();
    const taskId = `task_${hashObject({ agentName, action, input, executionTimestamp }).slice(0, 24)}`;
    const handler = this.actions.get(action);

    if (!handler) {
      return {
        taskId,
        agentName,
        action,
        input,
        error: `Unregistered action: ${action}`,
        status: 'FAIL_CLOSED',
        executionTimestamp,
      };
    }

    try {
      const result = await handler(input);
      const proofSubject = hashObject({
        taskId,
        agentName,
        action,
        input,
        result,
        status: 'COMPLETED',
        executionTimestamp,
      });
      const proof = createPqcHybridSignature(proofSubject, this.agentKeyPair, 0, agentName);

      return {
        taskId,
        agentName,
        action,
        input,
        result,
        proofSubject,
        status: 'COMPLETED',
        pqcSignature: proof.hybridSignature,
        executionTimestamp,
      };
    } catch (error) {
      return {
        taskId,
        agentName,
        action,
        input,
        error: error instanceof Error ? error.message : String(error),
        status: 'FAIL_CLOSED',
        executionTimestamp,
      };
    }
  }

  public verifyTaskProof(task: SolanaAiAgentTask): boolean {
    if (task.status !== 'COMPLETED' || !task.pqcSignature || !task.proofSubject) return false;

    const expectedSubject = hashObject({
      taskId: task.taskId,
      agentName: task.agentName,
      action: task.action,
      input: task.input,
      result: task.result,
      status: task.status,
      executionTimestamp: task.executionTimestamp,
    });

    if (expectedSubject !== task.proofSubject) return false;

    return verifyPqcSignature(
      task.pqcSignature,
      task.proofSubject,
      this.agentKeyPair.publicKey,
      0,
      task.agentName
    ).valid;
  }
}
