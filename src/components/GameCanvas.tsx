
import { useEffect, useRef, useState } from 'react';
import { Car } from '@/utils/Car';
import { Track } from '@/utils/Track';
import { AICar } from '@/utils/AICar';
import { EnhancedAICar } from '@/utils/EnhancedAICar';
import { GameUI } from './GameUI';
import { Camera, CameraMode } from '@/utils/Camera';
import { GameMode, GameModeType } from '@/utils/GameMode';
import { useToast } from "@/components/ui/use-toast";
import { RayCaster } from '@/utils/AIAlgorithms';
import { Game3DRenderer } from './Game3DRenderer';
import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "@/components/ui/loader";

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
  const [aiCar, setAiCar] = useState<AICar | EnhancedAICar | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      startGame();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const startGame = () => {
    setIsLoading(true);
    
    const trackSize = getTrackSize(gameMode);
    
    // Create new track with enhanced visuals
    const newTrack = new Track(trackSize.width, trackSize.height);
    
    // Create player car
    const newPlayerCar = new Car(
      newTrack.startPosition.x,
      newTrack.startPosition.y,
      30,
      50,
      '#8B5CF6',
      newTrack.startAngle
    );

    const modeConfig = GameMode.getConfig(gameMode);
    newPlayerCar.maxVelocity = 300 * modeConfig.physics.boostMultiplier;
    
    // Create AI car with enhanced AI
    const newAiCar = new EnhancedAICar(
      newTrack.startPosition.x + 40,
      newTrack.startPosition.y,
      30,
      50,
      '#F97316',
      newTrack.startAngle,
      newTrack,
      0.9 // Set appropriate difficulty
    );
    
    // Set up camera
    const newCamera = new Camera();
    newCamera.setMode(cameraMode);
    
    const fixedPositions = newTrack.checkpoints.map(checkpoint => ({
      x: checkpoint.x,
      y: checkpoint.y,
      zoom: 0.6
    }));
    newCamera.setFixedPositions(fixedPositions);

    setTrack(newTrack);
    setPlayerCar(newPlayerCar);
    setAiCar(newAiCar);
    setCamera(newCamera);
    setGameLoaded(true);
    
    setTimeout(() => {
      setIsLoading(false);
      
      toast({
        title: `3D Racing Game Ready!`,
        description: "Race against the AI! Use arrow keys to drive, SPACE for boost, C to change camera",
      });
    }, 1000);
  };

  useEffect(() => {
    if (!gameLoaded || !playerCar || !track || !aiCar || !camera) return;

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
      
      const modeConfig = GameMode.getConfig(gameMode);
      playerCar.maxVelocity = 300 * modeConfig.physics.boostMultiplier;
      playerCar.boostMultiplier = modeConfig.physics.boostMultiplier;
      playerCar.driftFactor = modeConfig.physics.driftFactor;
      
      playerSensorReadings.current = RayCaster.castRays(
        { x: playerCar.x, y: playerCar.y, angle: playerCar.angle },
        track,
        7,
        150,
        Math.PI * 0.6
      );
      
      let boostUsed = false;
      if (keys[' '] && gameStats.boost > 0) {
        playerCar.activateBoost();
        boostUsed = true;
        setGameStats(prev => ({
          ...prev,
          boost: Math.max(0, prev.boost - 1),
          boostTime: prev.boostTime + deltaTime
        }));
      } else {
        playerCar.deactivateBoost();
        setGameStats(prev => ({
          ...prev,
          boost: Math.min(100, prev.boost + 0.2),
        }));
      }

      playerCar.update(deltaTime);
      aiCar.update(deltaTime, playerCar);
      
      if (playerCar.drifting) {
        const driftAmount = playerCar.getSpeed() * deltaTime;
        setGameStats(prev => ({
          ...prev,
          driftDistance: prev.driftDistance + driftAmount
        }));
      }
      
      camera.update(deltaTime, playerCar, track.width, track.height);
      
      const minSensorReading = Math.min(...playerSensorReadings.current);
      if (minSensorReading < 15) {
        playerCar.handleCollision();
        toast({
          title: "Crash!",
          description: "Careful with those barriers!",
          variant: "destructive",
        });
      }
      
      const playerCheckpoint = track.checkCheckpoint(playerCar);
      if (playerCheckpoint) {
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
          
          if (gameMode === 'challenge') {
            const challenges = modeConfig.challenges;
            if (challenges) {
              const timeChallenge = challenges.find(c => c.type === 'time');
              if (timeChallenge && lapTime <= timeChallenge.target) {
                toast({
                  title: "Challenge Complete!",
                  description: `Completed lap in under ${timeChallenge.target}s`,
                });
              }
              
              const driftChallenge = challenges.find(c => c.type === 'drift');
              if (driftChallenge && gameStats.driftDistance >= driftChallenge.target) {
                toast({
                  title: "Challenge Complete!",
                  description: `Drifted for ${Math.floor(gameStats.driftDistance)}m`,
                });
              }
              
              const boostChallenge = challenges.find(c => c.type === 'boost');
              if (boostChallenge && gameStats.boostTime >= boostChallenge.target) {
                toast({
                  title: "Challenge Complete!",
                  description: `Used boost for ${gameStats.boostTime.toFixed(1)}s`,
                });
              }
            }
          }
        }
      }
      
      setGameStats(prev => ({
        ...prev,
        speed: Math.round(playerCar.getSpeed() * 3.6),
        currentLapTime: prev.currentLapTime + deltaTime,
        raceTime: prev.raceTime + deltaTime,
        sensorReadings: [...playerSensorReadings.current]
      }));
      
      requestRef.current = requestAnimationFrame(gameLoop);
    };
    
    requestRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoaded, playerCar, track, aiCar, camera, gameMode, toast, showUI]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      
      if (e.key === 'c' && !keysPressed.current.cAlreadyPressed) {
        keysPressed.current.cAlreadyPressed = true;
        
        const modes: CameraMode[] = ['follow', 'chase', 'overhead', 'cinematic', 'fixed'];
        const currentIndex = modes.indexOf(cameraMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        
        setCameraMode(nextMode);
        
        if (camera) {
          camera.setMode(nextMode);
          toast({
            title: "Camera Changed",
            description: `Camera Mode: ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}`,
          });
        }
      }
      
      if (e.key === 'u') {
        setShowUI(prev => !prev);
      }
      
      if (e.key === 'v' && camera && cameraMode === 'fixed') {
        camera.cycleFixedPosition();
      }

      if (e.key === 'a') {
        setGameStats(prev => ({
          ...prev,
          aiType: prev.aiType === 'basic' ? 'enhanced' : 'basic'
        }));

        if (track && aiCar) {
          const newAiCar = gameStats.aiType === 'basic' 
            ? new EnhancedAICar(aiCar.x, aiCar.y, aiCar.width, aiCar.height, aiCar.color, aiCar.angle, track, 0.85)
            : new AICar(aiCar.x, aiCar.y, aiCar.width, aiCar.height, aiCar.color, aiCar.angle, track, 0.85);
          
          setAiCar(newAiCar);
          
          toast({
            title: "AI Type Changed",
            description: `Now using ${gameStats.aiType === 'basic' ? 'Enhanced AI' : 'Basic AI'}`,
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      
      if (e.key === 'c') {
        keysPressed.current.cAlreadyPressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cameraMode, camera, toast, track, aiCar, gameStats.aiType]);

  return (
    <div className="game-container">
      {isLoading ? (
        <div className="flex items-center justify-center h-screen bg-gradient-to-b from-indigo-900 to-black">
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-16 h-16 text-purple-500" />
            <p className="text-white text-2xl font-bold">Loading 3D Racing Game...</p>
            <div className="w-64 space-y-2">
              <Skeleton className="h-4 w-full bg-purple-900/40" />
              <Skeleton className="h-4 w-5/6 bg-purple-900/40" />
              <Skeleton className="h-4 w-4/6 bg-purple-900/40" />
            </div>
            <p className="text-gray-300 text-sm mt-2">Preparing the race track and AI opponent...</p>
          </div>
        </div>
      ) : gameLoaded && playerCar && track && aiCar && camera ? (
        <div className="game-3d-container w-full h-full">
          <Game3DRenderer
            playerCar={playerCar}
            aiCar={aiCar}
            track={track}
            cameraMode={cameraMode}
            cameraPosition={camera.getPosition()}
          />
          {gameStats && showUI && <GameUI gameStats={gameStats} />}
        </div>
      ) : (
        <div className="flex items-center justify-center h-screen bg-gradient-to-b from-indigo-900 to-black">
          <p className="text-white text-2xl">Game failed to load. Please refresh.</p>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
