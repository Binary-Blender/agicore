// Telemetry store — the opt-in flag is persisted to localStorage; the
// event buffer is session-only. The flag persists because users will
// be annoyed if they have to opt back in every launch; events do not
// persist because there is no transmission contract yet and an old
// buffer hanging around through a crash isn't useful.

import { create } from 'zustand';
import {
  MAX_EVENTS,
  scrubProps,
  type TelemetryEvent,
  type TelemetryEventName,
  type TelemetryProps,
} from '../lib/telemetry';

const ENABLED_STORAGE_KEY = 'agicore-studio.telemetry.enabled';

function loadEnabled(): boolean {
  try {
    return window.localStorage.getItem(ENABLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveEnabled(v: boolean): void {
  try {
    window.localStorage.setItem(ENABLED_STORAGE_KEY, v ? 'true' : 'false');
  } catch {
    // localStorage can be unavailable (sandboxed contexts, disk full).
    // Telemetry remains in-memory for the session — not worth surfacing.
  }
}

interface TelemetryStore {
  /** Master switch. Default false; persists across sessions. */
  enabled: boolean;
  /** Ring buffer of session events, oldest first. Capped at MAX_EVENTS. */
  events: TelemetryEvent[];
  /** Aggregate counters, keyed by event name. Cheap to read for the
   *  preview summary line. */
  counters: Record<TelemetryEventName, number>;

  setEnabled: (v: boolean) => void;
  /** Append an event. No-op when disabled. */
  record: (name: TelemetryEventName, props: TelemetryProps) => void;
  /** Clear the session buffer without changing the enabled flag. */
  clear: () => void;
}

const EMPTY_COUNTERS = {} as Record<TelemetryEventName, number>;

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  enabled: loadEnabled(),
  events: [],
  counters: { ...EMPTY_COUNTERS },

  setEnabled: (v) => {
    saveEnabled(v);
    set({ enabled: v });
  },

  record: (name, props) => {
    if (!get().enabled) return;
    const event: TelemetryEvent = {
      ts: Date.now(),
      name,
      props: scrubProps(props),
    };
    set((s) => {
      const events = s.events.length >= MAX_EVENTS
        ? [...s.events.slice(1), event]
        : [...s.events, event];
      const counters = { ...s.counters, [name]: (s.counters[name] ?? 0) + 1 };
      return { events, counters };
    });
  },

  clear: () => set({ events: [], counters: { ...EMPTY_COUNTERS } }),
}));
