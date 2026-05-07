import React, { useEffect, useRef } from 'react';
import { useWriterStore } from '../store/writerStore';

const SOUND_DEFS: { id: string; label: string; icon: string; color: string }[] = [
  { id: 'rain', label: 'Rain', icon: '🌧', color: 'bg-blue-500' },
  { id: 'coffee-shop', label: 'Coffee Shop', icon: '☕', color: 'bg-amber-600' },
  { id: 'forest', label: 'Forest', icon: '🌲', color: 'bg-green-500' },
  { id: 'fireplace', label: 'Fireplace', icon: '🔥', color: 'bg-orange-500' },
  { id: 'ocean', label: 'Ocean', icon: '🌊', color: 'bg-cyan-500' },
  { id: 'night', label: 'Night', icon: '🌙', color: 'bg-indigo-500' },
];

// Audio element cache (module-level so it persists across re-renders)
const audioElements: Map<string, HTMLAudioElement> = new Map();

function getAudioElement(id: string): HTMLAudioElement | null {
  if (audioElements.has(id)) return audioElements.get(id)!;

  // Try to load from assets directory
  try {
    const audio = new Audio(`./sounds/${id}.mp3`);
    audio.loop = true;
    audio.preload = 'auto';
    audioElements.set(id, audio);
    return audio;
  } catch {
    return null;
  }
}

export default function AmbientSoundsPanel() {
  const {
    setShowAmbientSounds,
    ambientSounds,
    ambientMasterVolume,
    setAmbientSoundPlaying,
    setAmbientSoundVolume,
    setAmbientMasterVolume,
    stopAllSounds,
  } = useWriterStore();

  const panelRef = useRef<HTMLDivElement>(null);

  // Sync audio playback with state
  useEffect(() => {
    for (const sound of ambientSounds) {
      const audio = getAudioElement(sound.id);
      if (!audio) continue;
      audio.volume = sound.volume * ambientMasterVolume;
      if (sound.playing && audio.paused) {
        audio.play().catch(() => {
          // Audio file not found or blocked — silently fail
        });
      } else if (!sound.playing && !audio.paused) {
        audio.pause();
      }
    }
  }, [ambientSounds, ambientMasterVolume]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowAmbientSounds(false);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const playingCount = ambientSounds.filter(s => s.playing).length;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-14 left-4 z-50 w-[280px] bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg shadow-xl"
    >
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-200 font-semibold">Ambient Sounds</span>
          {playingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary-600/30 text-primary-300 rounded">
              {playingCount} active
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAmbientSounds(false)}
          className="text-surface-500 hover:text-surface-300 text-xs"
        >
          x
        </button>
      </div>

      {/* Master volume */}
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2">
        <span className="text-[10px] text-surface-500 w-12 shrink-0">Master</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          className="flex-1 h-1 accent-primary-500"
          value={ambientMasterVolume}
          onChange={e => setAmbientMasterVolume(Number(e.target.value))}
        />
        <span className="text-[10px] text-surface-500 w-8 text-right">
          {Math.round(ambientMasterVolume * 100)}%
        </span>
      </div>

      {/* Sound cards */}
      <div className="p-2 space-y-1">
        {SOUND_DEFS.map(def => {
          const sound = ambientSounds.find(s => s.id === def.id);
          if (!sound) return null;
          return (
            <div
              key={def.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                sound.playing ? 'bg-primary-600/10' : 'hover:bg-white/5'
              }`}
            >
              {/* Play/Pause toggle */}
              <button
                onClick={() => setAmbientSoundPlaying(def.id, !sound.playing)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  sound.playing
                    ? `${def.color}/20 text-white`
                    : 'bg-[var(--bg-page)] text-surface-400 hover:text-surface-200'
                }`}
                title={sound.playing ? 'Pause' : 'Play'}
              >
                {sound.playing ? (
                  <span className="text-sm">
                    {def.icon}
                  </span>
                ) : (
                  <span className="text-xs opacity-60">{def.icon}</span>
                )}
              </button>

              {/* Label */}
              <span className={`text-xs w-16 shrink-0 ${sound.playing ? 'text-surface-200' : 'text-surface-400'}`}>
                {def.label}
              </span>

              {/* Volume slider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="flex-1 h-1 accent-primary-500"
                value={sound.volume}
                onChange={e => setAmbientSoundVolume(def.id, Number(e.target.value))}
              />

              {/* Animated indicator */}
              {sound.playing && (
                <div className="flex items-end gap-px h-3">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-0.5 ${def.color} rounded-full animate-pulse`}
                      style={{
                        height: `${4 + Math.random() * 8}px`,
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: `${0.5 + Math.random() * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {playingCount > 0 && (
        <div className="px-3 py-2 border-t border-[var(--border)]">
          <button
            onClick={stopAllSounds}
            className="w-full py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
          >
            Stop All
          </button>
        </div>
      )}
    </div>
  );
}
