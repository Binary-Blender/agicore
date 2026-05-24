import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import ChatView from './ChatView';
import StatsView from './StatsView';
import StartupSequence from './StartupSequence';
import VictoryScreen from './VictoryScreen';

const App: React.FC = () => {
  const {
    currentView, isStarting, gameState,
    loadConversations, completeStartup, playAgain,
  } = useAppStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  if (isStarting) {
    return <StartupSequence onComplete={completeStartup} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-page)]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'chat' ? <ChatView /> : <StatsView />}
        </main>
      </div>

      {gameState?.isWon && (
        <VictoryScreen
          turnCount={gameState.turnCount}
          layer={gameState.layer}
          winMethod={gameState.winMethod ?? 'Unknown'}
          easterEggsFound={gameState.easterEggsFound}
          totalEasterEggs={gameState.totalEasterEggs}
          startTime={gameState.startTime ?? Date.now()}
          onPlayAgain={playAgain}
        />
      )}
    </div>
  );
};

export default App;
