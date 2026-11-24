/**
 * Solana AI Ecosystem Engine & Post-Quantum Custody Orchestrator
 * Integrates autonomous AI agent workflows with NIST FIPS 203/204 dual hybrid signatures
 * on the Solana blockchain.
 */

import { sha256 } from '@noble/hashes/sha256.js';
import {
  generatePqcKeyPair,
  createPqcHybridSignature,
  verifyPqcSignature,
  bytesToHex
} from './utils/pqcCrypto.js';
import { PqcKeyPair, SolanaAiAgentTask } from './types.js';

export class SolanaAiOrchestrator {
  private agentKeyPair: PqcKeyPair;

  constructor(keyPair?: PqcKeyPair) {
    this.agentKeyPair = keyPair || generatePqcKeyPair('ML-DSA-65');
  }

  public getAgentPublicKey(): string {
    return this.agentKeyPair.publicKey;
  }

  public executeTask(
    agentName: string,
    instruction: string
  ): SolanaAiAgentTask {
    const rawPayload = `${agentName}:${instruction}:${Date.now()}`;
    const taskHash = bytesToHex(sha256(new TextEncoder().encode(rawPayload)));
    const taskId = `task_${taskHash.substring(0, 16)}`;

    // Generate genuine NIST FIPS 204 ML-DSA-65 hybrid signature
    const sigProof = createPqcHybridSignature(taskId, this.agentKeyPair, 0.01, agentName);

    return {
      taskId,
      agentName,
      instruction,
      status: 'COMPLETED',
      pqcSignature: sigProof.hybridSignature,
      executionTimestamp: new Date().toISOString()
    };
  }

  public verifyTaskProof(task: SolanaAiAgentTask): boolean {
    if (!task.pqcSignature) return false;
    const ver = verifyPqcSignature(
      task.pqcSignature,
      task.taskId,
      this.agentKeyPair.publicKey,
      0.01,
      task.agentName
    );
    return ver.valid;
  }
}
