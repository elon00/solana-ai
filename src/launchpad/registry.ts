export interface LaunchpadConfig {
  symbol: string;
  name: string;
  decimals: number;
  supplyCap: bigint | null;
  mintAuthorityRetained: boolean;
}

export class LaunchpadRegistry {
  private readonly launches = new Map<string, LaunchpadConfig>();

  create(config: LaunchpadConfig): LaunchpadConfig {
    if (!/^[A-Z0-9]{2,10}$/.test(config.symbol)) throw new Error('symbol must be 2-10 uppercase alphanumeric characters');
    if (!config.name.trim()) throw new Error('name is required');
    if (!Number.isInteger(config.decimals) || config.decimals < 0 || config.decimals > 9) throw new Error('decimals must be 0-9');
    if (config.supplyCap !== null && config.supplyCap <= 0n) throw new Error('supply cap must be positive');
    if (this.launches.has(config.symbol)) throw new Error(`launch already exists: ${config.symbol}`);
    const stored = { ...config };
    this.launches.set(config.symbol, stored);
    return { ...stored };
  }

  get(symbol: string): LaunchpadConfig | undefined {
    const found = this.launches.get(symbol);
    return found ? { ...found } : undefined;
  }
}

export const SAIC_UNCAPPED_SUPPLY_POLICY: LaunchpadConfig = {
  symbol: 'SAIC',
  name: 'Solana AI Coin',
  decimals: 9,
  supplyCap: null,
  mintAuthorityRetained: true,
};
