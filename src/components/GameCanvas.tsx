import { useEffect, useRef, useState } from 'react';
import { Car } from '@/utils/Car';
import { Track } from '@/utils/Track';
import { AICar } from '@/utils/AICar';
import { EnhancedAICar } from '@/utils/EnhancedAICar';
import { GameUI } from './GameUI';
import { GameMode, GameModeType } from '@/utils/GameMode';
import { useToast } from "@/components/ui/use-toast";
import { RayCaster } from '@/utils/AIAlgorithms';

const getTrackSize = (mode: GameModeType) => {
  const config = GameMode.getConfig(mode);
  return {
    width: config.trackSize.width,
    height: config.trackSize.height
  };
};

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [playerCar, setPlayerCar] = useState<Car | null>(null);
  const [aiCars, setAiCars] = useState<(AICar | EnhancedAICar)[]>([]);
  const [track, setTrack] = useState<Track | null>(null);
  const [gameMode, setGameMode] = useState<GameModeType>('race');
  const [gameLoaded, setGameLoaded] = useState<boolean>(false);
  const [showUI, setShowUI] = useState<boolean>(true);
  const [gameStats, setGameStats] = useState({
    speed: 0,
    lap: 0,
    bestLapTime: Infinity,
    currentLapTime: 0,
    raceTime: 0,
    boost: 100,
    driftDistance: 0,
    boostTime: 0,
    sensorReadings: [] as number[],
    aiType: 'enhanced' as 'basic' | 'enhanced'
  });
  
  const keysPressed = useRef<Record<string, boolean>>({});
  const lastTimestamp = useRef<number>(0);
  const { toast } = useToast();
  const playerSensorReadings = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const trackSize = getTrackSize(gameMode);
    const newTrack = new Track(trackSize.width, trackSize.height);
    
    const newPlayerCar = new Car(
      newTrack.startPosition.x,
      newTrack.startPosition.y,
      30,
      50,
      '#8B5CF6',
      newTrack.startAngle
    );
    
    const newAiCars = [
      new EnhancedAICar(
        newTrack.startPosition.x + 40,
        newTrack.startPosition.y,
        30,
        50,
        '#F97316',
        newTrack.startAngle,
        newTrack,
        0.9
      ),
      new AICar(
        newTrack.startPosition.x - 40,
        newTrack.startPosition.y,
        30,
        50,
        '#EA580C',
        newTrack.startAngle,
        newTrack,
        0.8
      ),
      new AICar(
        newTrack.startPosition.x,
        newTrack.startPosition.y + 60,
        30,
        50,
        '#FB923C',
        newTrack.startAngle,
        newTrack,
        0.7
      )
    ];
    
    setTrack(newTrack);
    setPlayerCar(newPlayerCar);
    setAiCars(newAiCars);
    setGameLoaded(true);
    
    toast({
      title: "Race Ready!",
      description: "Use arrow keys to drive, SPACE for boost, SHIFT for drift",
    });
  }, [gameMode, toast]);

  useEffect(() => {
    if (!gameLoaded || !playerCar || !track || aiCars.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = lastTimestamp.current ? (timestamp - lastTimestamp.current) / 1000 : 0.016;
      lastTimestamp.current = timestamp;
      
      const keys = keysPressed.current;
      
      if (keys['ArrowUp'] || keys['w']) {
        playerCar.accelerate(deltaTime);
      } else if (keys['ArrowDown'] || keys['s']) {
        playerCar.brake(deltaTime);
      } else {
        playerCar.releaseAccelerator(deltaTime);
      }
      
      if (keys['ArrowLeft'] || keys['a']) {
        playerCar.turnLeft(deltaTime);
      }
      if (keys['ArrowRight'] || keys['d']) {
        playerCar.turnRight(deltaTime);
      }
      
      playerCar.drifting = keys['Shift'];
      
      if (keys[' '] && gameStats.boost > 0) {
        playerCar.activateBoost();
        setGameStats(prev => ({
          ...prev,
          boost: Math.max(0, prev.boost - 1),
          boostTime: prev.boostTime + deltaTime
        }));
      } else {
        playerCar.deactivateBoost();
        setGameStats(prev => ({
          ...prev,
          boost: Math.min(100, prev.boost + 0.2)
        }));
      }

      aiCars.forEach(aiCar => {
        aiCar.update(deltaTime, playerCar);
      });
      
      if (playerCar.drifting) {
        setGameStats(prev => ({
          ...prev,
          driftDistance: prev.driftDistance + playerCar.getSpeed() * deltaTime
        }));
      }
      
      playerSensorReadings.current = RayCaster.castRays(
        { x: playerCar.x, y: playerCar.y, angle: playerCar.angle },
        track,
        7,
        150,
        Math.PI * 0.6
      );
      
      const minSensorReading = Math.min(...playerSensorReadings.current);
      if (minSensorReading < 15) {
        playerCar.handleCollision();
        toast({
          title: "Crash!",
          description: "Watch out for the barriers!",
          variant: "destructive",
        });
      }
      
      const playerCheckpoint = track.checkCheckpoint(playerCar);
      if (playerCheckpoint === 'finish') {
        const lapTime = gameStats.currentLapTime;
        const newLap = gameStats.lap + 1;
        
        setGameStats(prev => ({
          ...prev,
          lap: newLap,
          bestLapTime: lapTime < prev.bestLapTime ? lapTime : prev.bestLapTime,
          currentLapTime: 0,
        }));
        
        toast({
          title: `Lap ${newLap} Complete!`,
          description: `Time: ${lapTime.toFixed(2)}s`,
        });
      }
      
      setGameStats(prev => ({
        ...prev,
        speed: Math.round(playerCar.getSpeed() * 3.6),
        currentLapTime: prev.currentLapTime + deltaTime,
        raceTime: prev.raceTime + deltaTime,
        sensorReadings: [...playerSensorReadings.current]
      }));
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(canvas.width / 2 - playerCar.x, canvas.height / 2 - playerCar.y);
      
      track.render(ctx);
      
      playerCar.render(ctx);
      aiCars.forEach(aiCar => {
        aiCar.render(ctx);
      });
      
      ctx.restore();
      
      requestRef.current = requestAnimationFrame(gameLoop);
    };
    
    requestRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoaded, playerCar, track, aiCars, toast, gameStats.boost, gameMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-gray-900"
        style={{ touchAction: 'none' }}
      />
      {gameStats && showUI && <GameUI gameStats={gameStats} />}
    </div>
  );
};

export default GameCanvas;
