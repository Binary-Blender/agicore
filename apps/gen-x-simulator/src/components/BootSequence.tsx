import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';

const CHAR_INTERVAL_MS = 12;
const POST_BOOT_DELAY_MS = 700;

const BootSequence: React.FC = () => {
  const { bootScreen, finishBoot } = useAppStore();
  const [shown, setShown] = useState('');
  const done = useRef(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setShown(bootScreen.slice(0, i));
      if (i >= bootScreen.length) {
        clearInterval(interval);
        if (!done.current) {
          done.current = true;
          setTimeout(finishBoot, POST_BOOT_DELAY_MS);
        }
      }
    }, CHAR_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [bootScreen, finishBoot]);

  return (
    <div className="h-full p-6 bg-[var(--bg-page)]">
      <div className="c64-screen h-full relative">
        {shown}
        <span className="c64-cursor" />
        <div className="c64-scanlines" />
      </div>
    </div>
  );
};

export default BootSequence;
