import React from 'react';
import { useAppStore } from '../store/appStore';
import type { Platform } from '../types';

const PlatformChooser: React.FC = () => {
  const { platforms, selectPlatform } = useAppStore();

  return (
    <div className="h-full overflow-y-auto px-8 py-10">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Choose your platform
        </p>
        <h1 className="text-3xl font-bold mb-3">
          Pick the machine that will teach you.
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl mb-10 leading-relaxed">
          The systems shaped different kinds of users. Pick one to start with —
          you can play through more later. Playing two reveals the contrast,
          which is itself the meta-lesson.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {platforms.map((p) => (
            <Card key={p.id} platform={p} onSelect={selectPlatform} />
          ))}
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-10 leading-relaxed max-w-2xl">
          Three of the four platforms are awaiting community implementation —
          see CONTRIBUTING_PLATFORMS.md in the repo. The architecture is set
          up so a contributor can ship a new platform path in a weekend.
        </p>
      </div>
    </div>
  );
};

const Card: React.FC<{ platform: Platform; onSelect: (p: Platform) => void }> = ({
  platform, onSelect,
}) => {
  const isStub = !platform.isImplemented;
  return (
    <div
      className="platform-card"
      data-stub={isStub}
      onClick={() => !isStub && onSelect(platform)}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-bold">{platform.displayName}</h2>
        <span className="text-xs text-[var(--text-muted)] font-mono">{platform.releaseYear}</span>
      </div>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
        {platform.culturalLineage}
      </p>
      {isStub ? (
        <p className="text-xs text-[var(--text-muted)] italic">
          Awaiting community implementation. See CONTRIBUTING_PLATFORMS.md.
        </p>
      ) : (
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">
          Boot →
        </p>
      )}
    </div>
  );
};

export default PlatformChooser;
