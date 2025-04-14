
import React from 'react';

interface GameUIProps {
  gameStats: {
    speed: number;
    lap: number;
    bestLapTime: number;
    currentLapTime: number;
    raceTime: number;
    boost: number;
    driftDistance?: number;
    boostTime?: number;
    sensorReadings?: number[];
    aiType?: 'basic' | 'enhanced';
  };
}

export const GameUI: React.FC<GameUIProps> = ({ gameStats }) => {
  return (
    <div className="absolute top-0 left-0 p-4 text-white">
      <div className="bg-black/60 backdrop-blur-sm p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">Race Stats</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <p className="flex justify-between">
              <span>Speed:</span>
              <span className="font-mono">{gameStats.speed} km/h</span>
            </p>
            <p className="flex justify-between">
              <span>Lap:</span>
              <span className="font-mono">{gameStats.lap}</span>
            </p>
            <p className="flex justify-between">
              <span>Current Lap:</span>
              <span className="font-mono">{gameStats.currentLapTime.toFixed(2)}s</span>
            </p>
            <p className="flex justify-between">
              <span>Best Lap:</span>
              <span className="font-mono">{gameStats.bestLapTime === Infinity ? '-' : gameStats.bestLapTime.toFixed(2) + 's'}</span>
            </p>
          </div>
          <div>
            <p className="flex justify-between">
              <span>Race Time:</span>
              <span className="font-mono">{gameStats.raceTime.toFixed(1)}s</span>
            </p>
            <p className="flex justify-between">
              <span>Boost:</span>
              <div className="w-20 bg-gray-700 rounded-full h-2.5 mt-1.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${gameStats.boost}%` }}
                ></div>
              </div>
            </p>
            {gameStats.driftDistance !== undefined && (
              <p className="flex justify-between">
                <span>Drift:</span>
                <span className="font-mono">{Math.floor(gameStats.driftDistance)}m</span>
              </p>
            )}
            {gameStats.boostTime !== undefined && (
              <p className="flex justify-between">
                <span>Boost Time:</span>
                <span className="font-mono">{gameStats.boostTime.toFixed(1)}s</span>
              </p>
            )}
          </div>
        </div>

        {/* Sensor visualization (for debugging) */}
        {gameStats.sensorReadings && gameStats.sensorReadings.length > 0 && (
          <div className="mt-4">
            <p className="text-sm mb-1">Sensors:</p>
            <div className="flex justify-between h-8 gap-0.5">
              {gameStats.sensorReadings.map((reading, index) => {
                const maxReading = 150; // Max sensor reading
                const height = Math.min(1, reading / maxReading) * 100;
                const color = reading < 30 ? 'bg-red-500' : 'bg-green-500';
                
                return (
                  <div key={index} className="flex-1 bg-gray-800 relative">
                    <div 
                      className={`absolute bottom-0 left-0 right-0 ${color} transition-all duration-150`}
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI type indicator */}
        {gameStats.aiType && (
          <div className="mt-4 text-sm">
            <p className="flex justify-between">
              <span>AI Type:</span>
              <span className={`font-mono ${gameStats.aiType === 'enhanced' ? 'text-green-400' : 'text-yellow-400'}`}>
                {gameStats.aiType === 'enhanced' ? 'Enhanced (Neural Network)' : 'Basic'}
              </span>
            </p>
            <p className="text-xs mt-1 opacity-70">Press 'A' to toggle AI type</p>
          </div>
        )}
        
        <div className="mt-4 text-xs opacity-70">
          <p>Controls: Arrow keys to drive, SPACE for boost</p>
          <p>Press 'C' to change camera, 'U' to toggle UI</p>
        </div>
      </div>
    </div>
  );
};

export default GameUI;
