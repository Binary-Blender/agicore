import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';

const C64Shell: React.FC = () => {
  const { shellOutput, running, needsInput } = useAppStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [shellOutput]);

  return (
    <div className="c64-screen relative">
      {shellOutput}
      {!running && !needsInput && <span className="c64-cursor" />}
      <div ref={endRef} />
      <div className="c64-scanlines" />
    </div>
  );
};

export default C64Shell;
