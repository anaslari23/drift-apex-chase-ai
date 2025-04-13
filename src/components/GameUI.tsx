
import { useState, useEffect } from 'react';

interface GameUIProps {
  gameStats: {
    speed: number;
    lap: number;
    bestLapTime: number;
    currentLapTime: number;
    raceTime: number;
    boost: number;
  };
}

export const GameUI = ({ gameStats }: GameUIProps) => {
  const [showControls, setShowControls] = useState(true);
  
  // Hide controls after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Format time to mm:ss.ms
  const formatTime = (timeInSeconds: number) => {
    if (!isFinite(timeInSeconds)) return "--:--:--";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 100);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Speedometer */}
      <div className="fixed bottom-6 left-6 bg-card/80 backdrop-blur-sm p-4 rounded-lg text-foreground">
        <h2 className="text-4xl font-bold">
          {gameStats.speed} <span className="text-lg">km/h</span>
        </h2>
      </div>
      
      {/* Lap counter and timer */}
      <div className="fixed top-6 left-6 bg-card/80 backdrop-blur-sm p-4 rounded-lg text-foreground">
        <div className="space-y-2">
          <div className="flex justify-between gap-4">
            <span>LAP:</span>
            <span className="font-bold">{gameStats.lap}/3</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>TIME:</span>
            <span className="font-bold">{formatTime(gameStats.currentLapTime)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>BEST:</span>
            <span className="font-bold">{formatTime(gameStats.bestLapTime)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>TOTAL:</span>
            <span className="font-bold">{formatTime(gameStats.raceTime)}</span>
          </div>
        </div>
      </div>
      
      {/* Boost meter */}
      <div className="fixed bottom-6 right-6 bg-card/80 backdrop-blur-sm p-4 rounded-lg text-foreground">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>BOOST</span>
            <span className="font-bold">{Math.round(gameStats.boost)}%</span>
          </div>
          <div className="w-48 h-4 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full ${gameStats.boost > 20 ? 'bg-accent' : 'bg-destructive'} transition-all ${gameStats.boost < 20 ? 'animate-pulse-boost' : ''}`}
              style={{ width: `${gameStats.boost}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Controls help overlay */}
      {showControls && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-card/90 backdrop-blur-md p-6 rounded-lg text-foreground max-w-md">
            <h2 className="text-2xl font-bold mb-4">Controls</h2>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>Accelerate:</span>
                <span className="font-mono bg-secondary px-2 rounded">↑ or W</span>
              </li>
              <li className="flex justify-between">
                <span>Brake/Reverse:</span>
                <span className="font-mono bg-secondary px-2 rounded">↓ or S</span>
              </li>
              <li className="flex justify-between">
                <span>Turn Left:</span>
                <span className="font-mono bg-secondary px-2 rounded">← or A</span>
              </li>
              <li className="flex justify-between">
                <span>Turn Right:</span>
                <span className="font-mono bg-secondary px-2 rounded">→ or D</span>
              </li>
              <li className="flex justify-between">
                <span>Boost:</span>
                <span className="font-mono bg-secondary px-2 rounded">SPACE</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default GameUI;
