import React from 'react';
import { useAppStore } from '../store/appStore';

const BasicEditor: React.FC = () => {
  const { programSource, setProgramSource } = useAppStore();
  return (
    <textarea
      className="basic-editor"
      value={programSource}
      onChange={(e) => setProgramSource(e.target.value)}
      spellCheck={false}
      placeholder="Type your BASIC program here, one statement per line.&#10;Lines must start with a line number.&#10;&#10;Example:&#10;10 PRINT &quot;HELLO&quot;&#10;20 END"
    />
  );
};

export default BasicEditor;
