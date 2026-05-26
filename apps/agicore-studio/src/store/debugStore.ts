// Debug session state — currently just the breakpoint set, but other
// debug concerns (pause-on-error, replay-from-node) will land here.
//
// Breakpoints are session-only for now. Persisting them per file as a
// sidecar entry is a later polish — for the first cut, keeping them
// in memory means a fresh Studio run starts unbreakpointed, which
// matches the user's expectation that breakpoints are an active
// debugging concern rather than a property of the workflow.

import { create } from 'zustand';

interface DebugStore {
  breakpoints: Set<string>;
  toggleBreakpoint: (nodeId: string) => void;
  setBreakpoint: (nodeId: string, on: boolean) => void;
  clearAllBreakpoints: () => void;
  hasBreakpoint: (nodeId: string) => boolean;
}

export const useDebugStore = create<DebugStore>((set, get) => ({
  breakpoints: new Set(),

  toggleBreakpoint: (nodeId) =>
    set((s) => {
      const next = new Set(s.breakpoints);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { breakpoints: next };
    }),

  setBreakpoint: (nodeId, on) =>
    set((s) => {
      const next = new Set(s.breakpoints);
      if (on) next.add(nodeId);
      else next.delete(nodeId);
      return { breakpoints: next };
    }),

  clearAllBreakpoints: () => set({ breakpoints: new Set() }),

  hasBreakpoint: (nodeId) => get().breakpoints.has(nodeId),
}));

/** Selector hook — boolean per node id. Cheap to subscribe to per node. */
export function useHasBreakpoint(nodeId: string): boolean {
  return useDebugStore((s) => s.breakpoints.has(nodeId));
}
