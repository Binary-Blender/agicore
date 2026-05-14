// Agicore Generated — DO NOT EDIT BY HAND
// Re-run `agicore generate` to regenerate.
// SPC quality tracker generated from QC declarations.

interface QCConfig {
  youngThreshold: number;
  maturingThreshold: number;
  youngPassRate: number;
  maturePassRate: number;
  maturingSampleRate: number;
  matureSampleRate: number;
}

interface QCStats {
  total: number;
  approved: number;
  rejected: number;
  passRate: number;
  samplingRate: number;
  cpk: number;
}

export interface QCReport {
  name: string;
  stats: QCStats;
  stage: "young" | "maturing" | "mature";
}

const STORAGE_KEY = "agicore_qc_stats";

function loadStats(): Map<string, QCStats> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, QCStats>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function saveStats(stats: Map<string, QCStats>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(stats)));
  } catch { /* storage unavailable */ }
}

function calculateCpk(passRate: number): number {
  const defectRate = 1 - passRate;
  if (defectRate <= 0.001) return 2.0;
  if (defectRate <= 0.005) return 1.67;
  if (defectRate <= 0.01)  return 1.33;
  if (defectRate <= 0.05)  return 1.0;
  return 0.67;
}

class QCTracker {
  private readonly configs: Map<string, QCConfig> = new Map();
  private stats: Map<string, QCStats>;

  constructor() {
    this.stats = loadStats();
    this.configs.set('response_quality', {
      youngThreshold: 50,
      maturingThreshold: 200,
      youngPassRate: 0.85,
      maturePassRate: 0.95,
      maturingSampleRate: 0.3,
      matureSampleRate: 0.05,
    });
  }

  /** Returns true if this execution should be quality-checked. */
  shouldSample(name: string): boolean {
    const config = this.configs.get(name);
    if (!config) return false;
    const s = this.stats.get(name);
    if (!s || s.total < config.youngThreshold) return true;

    if (s.total < config.maturingThreshold) {
      return s.passRate >= config.youngPassRate
        ? Math.random() < config.maturingSampleRate
        : true;
    }
    if (s.passRate >= config.maturePassRate) return Math.random() < config.matureSampleRate;
    if (s.passRate >= config.youngPassRate)  return Math.random() < config.maturingSampleRate;
    return true; // quality degraded — back to 100%
  }

  /** Record a pass or fail outcome for the named QC process. */
  recordResult(name: string, passed: boolean): void {
    if (!this.configs.has(name)) return;
    if (!this.stats.has(name)) {
      this.stats.set(name, { total: 0, approved: 0, rejected: 0, passRate: 0, samplingRate: 1.0, cpk: 0 });
    }
    const s = this.stats.get(name)!;
    s.total++;
    if (passed) s.approved++; else s.rejected++;
    s.passRate = s.approved / s.total;
    s.cpk = s.total >= 30 ? calculateCpk(s.passRate) : 0;
    s.samplingRate = this.currentSamplingRate(name, s);
    saveStats(this.stats);
  }

  private currentSamplingRate(name: string, s: QCStats): number {
    const c = this.configs.get(name)!;
    if (s.total < c.youngThreshold) return 1.0;
    if (s.total < c.maturingThreshold) return s.passRate >= c.youngPassRate ? c.maturingSampleRate : 1.0;
    if (s.passRate >= c.maturePassRate) return c.matureSampleRate;
    if (s.passRate >= c.youngPassRate)  return c.maturingSampleRate;
    return 1.0;
  }

  getStats(name: string): QCStats {
    return this.stats.get(name) ?? { total: 0, approved: 0, rejected: 0, passRate: 0, samplingRate: 1.0, cpk: 0 };
  }

  getStage(name: string): "young" | "maturing" | "mature" {
    const config = this.configs.get(name);
    if (!config) return "young";
    const s = this.stats.get(name);
    if (!s || s.total < config.youngThreshold) return "young";
    if (s.total < config.maturingThreshold) return "maturing";
    return "mature";
  }

  report(): QCReport[] {
    return [...this.configs.keys()].map(name => ({
      name,
      stats: this.getStats(name),
      stage: this.getStage(name),
    }));
  }

  /** Reset stats for a named process (or all processes if omitted). */
  reset(name?: string): void {
    if (name) {
      this.stats.delete(name);
    } else {
      this.stats.clear();
    }
    saveStats(this.stats);
  }
}

export const qc = new QCTracker();
