export function TitleBar() {
  return (
    <div
      className="h-9 bg-[var(--bg-titlebar)] flex items-center px-3 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <span className="text-sm font-medium">NovaSyn Chat</span>
    </div>
  );
}
