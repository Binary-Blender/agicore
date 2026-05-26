// Per-session test run state. Keyed by test name (tests have unique
// names in .agi). Cleared when a fresh run starts.

import { create } from 'zustand';
import type { TestExpectResult, TestRunRecord, TestStatus } from '../types/test';

interface TestStore {
  records: Record<string, TestRunRecord>;
  runningAny: boolean;

  startTest: (name: string) => void;
  ingestAssert: (name: string, result: TestExpectResult) => void;
  finishTest: (record: TestRunRecord) => void;
  startBatch: () => void;
  endBatch: () => void;
  reset: () => void;
  statusOf: (name: string) => TestStatus;
}

export const useTestStore = create<TestStore>((set, get) => ({
  records: {},
  runningAny: false,

  startTest: (name) =>
    set((s) => ({
      records: {
        ...s.records,
        [name]: {
          test_name: name,
          status: 'running',
          started_at: Date.now(),
          finished_at: null,
          results: [],
        },
      },
    })),

  ingestAssert: (name, result) =>
    set((s) => {
      const prev = s.records[name];
      if (!prev) return s;
      return {
        records: {
          ...s.records,
          [name]: {
            ...prev,
            results: [...prev.results, result],
          },
        },
      };
    }),

  finishTest: (record) =>
    set((s) => ({
      records: { ...s.records, [record.test_name]: record },
    })),

  startBatch: () => set({ runningAny: true }),
  endBatch: () => set({ runningAny: false }),

  reset: () => set({ records: {}, runningAny: false }),

  statusOf: (name) => get().records[name]?.status ?? 'idle',
}));
