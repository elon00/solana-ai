/**
 * Solana AI Ecosystem Engine
 *
 * Executes only registered actions. Unknown actions fail closed instead of
 * being labelled complete. Successful receipts are signed with ML-DSA-65.
 */

import { generatePqcKeyPair } from './utils/pqcCrypto.js';
import type { PqcKeyPair, SolanaAiAgentTask } from './types.js';
import { AgentActionRuntime, type AgentAction } from './agentics/actionRuntime.js';

export class SolanaAiOrchestrator {
  private readonly agentKeyPair: PqcKeyPair;
  private readonly runtime: AgentActionRuntime;

  constructor(keyPair?: PqcKeyPair) {
    this.agentKeyPair = keyPair || generatePqcKeyPair('ML-DSA-65');
    this.runtime = new AgentActionRuntime(this.agentKeyPair);
  }

  public getAgentPublicKey(): string {
    return this.agentKeyPair.publicKey;
  }

  public registerAction(name: string, action: AgentAction): void {
    this.runtime.register(name, action);
  }

  public async executeTask(
    agentName: string,
    action: string,
    input?: unknown
  ): Promise<SolanaAiAgentTask> {
    const executionTimestamp = new Date().toISOString();

    try {
      const receipt = await this.runtime.execute(action, input);
      if (receipt.status !== 'COMPLETED') {
        return {
          taskId: receipt.actionId,
          agentName,
          instruction: action,
          status: 'FAIL_CLOSED',
          executionTimestamp,
          error: receipt.error,
        };
      }

      return {
        taskId: receipt.actionId,
        agentName,
        instruction: action,
        status: 'COMPLETED',
        pqcSignature: receipt.pqcSignature,
        executionTimestamp: receipt.completedAt,
        output: receipt.output,
        evidence: receipt.evidence,
      };
    } catch (error) {
      return {
        taskId: `blocked_${Date.now()}`,
        agentName,
        instruction: action,
        status: 'FAIL_CLOSED',
        executionTimestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public verifyTaskProof(task: SolanaAiAgentTask): boolean {
    return task.status === 'COMPLETED' && Boolean(task.pqcSignature);
  }
}
