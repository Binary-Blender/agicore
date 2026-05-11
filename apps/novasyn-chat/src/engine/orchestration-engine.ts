// Agicore Generated Orchestration Runtime
// App: novasyn_chat
// Pipeline engine with BFS parallel execution and SPC quality control
// --- SPC Controller (Statistical Process Control) ---
// Progressive sampling: 100% -> 50% -> 5% as AI proves reliable
// Based on manufacturing quality control (TPS Jidoka principle)

interface ProcessStats {
  total: number;
  approved: number;
  rejected: number;
  passRate: number;
  samplingRate: number;
  cpk: number;
}

interface SPCConfig {
  youngThreshold: number;
  maturingThreshold: number;
  youngPassRate: number;
  maturePassRate: number;
  maturingSampleRate: number;
  matureSampleRate: number;
}

export class SPCController {
  private configs: Map<string, SPCConfig> = new Map();
  private stats: Map<string, ProcessStats> = new Map();

  constructor() {
    this.configs.set('response_quality', {
      youngThreshold: 50,
      maturingThreshold: 200,
      youngPassRate: 0.85,
      maturePassRate: 0.95,
      maturingSampleRate: 0.3,
      matureSampleRate: 0.05,
    });
  }

  shouldRequireQC(processName: string): boolean {
    const config = this.configs.get(processName);
    if (!config) return true;
    const stats = this.stats.get(processName);
    if (!stats) return true;

    const { total, passRate } = stats;

    // Phase 1: Young process — 100% inspection
    if (total < config.youngThreshold) {
      stats.samplingRate = 1.0;
      return true;
    }

    // Phase 2: Maturing process
    if (total < config.maturingThreshold) {
      if (passRate >= config.youngPassRate) {
        stats.samplingRate = config.maturingSampleRate;
        return Math.random() < config.maturingSampleRate;
      }
      stats.samplingRate = 1.0;
      return true;
    }

    // Phase 3: Mature process
    if (passRate >= config.maturePassRate) {
      stats.samplingRate = config.matureSampleRate;
      return Math.random() < config.matureSampleRate;
    }
    if (passRate >= config.youngPassRate) {
      stats.samplingRate = config.maturingSampleRate;
      return Math.random() < config.maturingSampleRate;
    }

    // Quality degraded — back to 100%
    stats.samplingRate = 1.0;
    return true;
  }

  recordResult(processName: string, passed: boolean): void {
    if (!this.stats.has(processName)) {
      this.stats.set(processName, { total: 0, approved: 0, rejected: 0, passRate: 0, samplingRate: 1.0, cpk: 0 });
    }
    const stats = this.stats.get(processName)!;
    stats.total++;
    if (passed) stats.approved++; else stats.rejected++;
    stats.passRate = stats.total > 0 ? stats.approved / stats.total : 0;
    stats.cpk = this.calculateCpk(stats);
  }

  private calculateCpk(stats: ProcessStats): number {
    if (stats.total < 30) return 0;
    const defectRate = 1 - stats.passRate;
    if (defectRate <= 0.001) return 2.0;
    if (defectRate <= 0.005) return 1.67;
    if (defectRate <= 0.01) return 1.33;
    if (defectRate <= 0.05) return 1.0;
    return 0.67;
  }

  getStats(processName: string): ProcessStats {
    return this.stats.get(processName) ?? { total: 0, approved: 0, rejected: 0, passRate: 0, samplingRate: 1.0, cpk: 0 };
  }

  getCostSavings(processName: string, costPerQC: number = 0.50): { total: number; qcPerformed: number; savings: number; savingsPercent: number } {
    const stats = this.getStats(processName);
    const qcPerformed = Math.round(stats.total * stats.samplingRate);
    const costWithout = stats.total * costPerQC;
    const costWith = qcPerformed * costPerQC;
    return { total: stats.total, qcPerformed, savings: costWithout - costWith, savingsPercent: costWithout > 0 ? ((costWithout - costWith) / costWithout) * 100 : 0 };
  }
}
