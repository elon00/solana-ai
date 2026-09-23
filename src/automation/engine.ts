export interface AutomationJob {
  id: string;
  name: string;
  intervalMs: number;
  nextRunAt: number;
  enabled: boolean;
  runCount: number;
}

export type AutomationHandler = () => void | Promise<void>;

export class AutomationEngine {
  private readonly jobs = new Map<string, { spec: AutomationJob; handler: AutomationHandler }>();

  register(name: string, intervalMs: number, handler: AutomationHandler, startAt = Date.now()): AutomationJob {
    if (!name.trim()) throw new Error('automation name is required');
    if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000) {
      throw new Error('intervalMs must be an integer >= 1000');
    }
    const id = `automation:${name}`;
    if (this.jobs.has(id)) throw new Error(`automation already registered: ${name}`);
    const spec: AutomationJob = { id, name, intervalMs, nextRunAt: startAt, enabled: true, runCount: 0 };
    this.jobs.set(id, { spec, handler });
    return { ...spec };
  }

  list(): AutomationJob[] {
    return [...this.jobs.values()].map(({ spec }) => ({ ...spec }));
  }

  setEnabled(id: string, enabled: boolean): void {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`unknown automation: ${id}`);
    job.spec.enabled = enabled;
  }

  async runDue(now = Date.now()): Promise<AutomationJob[]> {
    const executed: AutomationJob[] = [];
    for (const { spec, handler } of this.jobs.values()) {
      if (!spec.enabled || spec.nextRunAt > now) continue;
      await handler();
      spec.runCount += 1;
      spec.nextRunAt = now + spec.intervalMs;
      executed.push({ ...spec });
    }
    return executed;
  }
}
