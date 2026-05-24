import React from 'react';
import { useAppStore } from '../store/appStore';

const VerdictBanner: React.FC = () => {
  const { lastVerdict, activeLesson } = useAppStore();

  if (!lastVerdict || !activeLesson) {
    return <div className="h-12" />;
  }

  if (lastVerdict === 'success') {
    return (
      <div className="h-12 flex items-center px-3 rounded bg-emerald-950 border border-emerald-700 text-emerald-200 text-sm">
        <span className="font-mono mr-3">[ OK ]</span>
        Lesson complete. {activeLesson.title} — debugged.
      </div>
    );
  }
  if (lastVerdict === 'wrong_output') {
    return (
      <div className="h-12 flex items-center px-3 rounded bg-amber-950 border border-amber-700 text-amber-100 text-sm">
        <span className="font-mono mr-3">[ ?? ]</span>
        Program ran. Output is not what the lesson expects. Re-read the magazine carefully.
      </div>
    );
  }
  return (
    <div className="h-12 flex items-center px-3 rounded bg-red-950 border border-red-700 text-red-200 text-sm">
      <span className="font-mono mr-3">[ ERR ]</span>
      Program errored. Find the line, find the fault.
    </div>
  );
};

export default VerdictBanner;
