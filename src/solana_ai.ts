/**
 * Solana AI agent runtime.
 *
 * Tasks only reach COMPLETED after a registered action handler actually runs.
 * Unknown actions, non-canonicalizable data, and handler errors fail closed.
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

function canonicalize(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return 'null:null';

  switch (typeof value) {
    case 'undefined':
      return 'undefined:';
    case 'string':
      return `string:${JSON.stringify(value)}`;
    case 'boolean':
      return `boolean:${value ? 'true' : 'false'}`;
    case 'bigint':
      return `bigint:${value.toString(10)}`;
    case 'number':
      if (!Number.isFinite(value)) throw new Error('Non-finite numbers cannot be proof-canonicalized');
      return `number:${Object.is(value, -0) ? '-0' : value.toString()}`;
    case 'function':
    case 'symbol':
      throw new Error(`Unsupported proof value type: ${typeof value}`);
    case 'object':
      break;
    default:
      throw new Error('Unsupported proof value');
  }

  const object = value as object;
  if (seen.has(object)) throw new Error('Cyclic proof values are not supported');
  seen.add(object);

  try {
    if (value instanceof Uint8Array) {
      return `uint8array:${bytesToHex(value)}`;
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) throw new Error('Invalid Date cannot be proof-canonicalized');
      return `date:${value.toISOString()}`;
    }
    if (Array.isArray(value)) {
      return `array:[${value.map((item) => canonicalize(item, seen)).join(',')}]`;
    }

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error('Only plain objects are supported in proof values');
    }

    const record = value as Record<string, unknown>;
    return `object:{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key], seen)}`)
      .join(',')}}`;
  } finally {
    seen.delete(object);
  }
}

function hashObject(value: unknown): string {
  return bytesToHex(sha256(new TextEncoder().encode(canonicalize(value))));
}

export class SolanaAiOrchestrator {
  private agentKeyPair: PqcKeyPair;
  private readonly actions = new Map<string, AgentActionHandler>();

  constructor(keyPair?: PqcKeyPair) {
    this.agentKeyPair = keyPair || generatePqcKeyPair('ML-DSA-65');
    if (this.agentKeyPair.algorithm !== 'ML-DSA-65') {
      throw new Error('Agent proof signing requires an ML-DSA-65 key pair');
    }
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
    const fallbackTaskId = `task_${hashObject({ agentName, action, executionTimestamp }).slice(0, 24)}`;
    let taskId = fallbackTaskId;

    try {
      const inputHash = hashObject(input);
      taskId = `task_${hashObject({ agentName, action, inputHash, executionTimestamp }).slice(0, 24)}`;

      const handler = this.actions.get(action);
      if (!handler) throw new Error(`Unregistered action: ${action}`);

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

    try {
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
    } catch {
      return false;
    }
  }
}
