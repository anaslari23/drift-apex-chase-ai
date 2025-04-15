import { useEffect, useRef, useState } from 'react';
import { Car } from '@/utils/Car';
import { Track } from '@/utils/Track';
import { AICar } from '@/utils/AICar';
import { EnhancedAICar } from '@/utils/EnhancedAICar';
import { GameUI } from './GameUI';
import { Camera, CameraMode } from '@/utils/Camera';
import { GameMode, GameModeType } from '@/utils/GameMode';
import { useToast } from "@/components/ui/use-toast";
import { 
  Button, 
} from "@/components/ui/button";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";
import { RayCaster } from '@/utils/AIAlgorithms';
import { Game3DRenderer } from './Game3DRenderer';

// Let's use the game mode to determine track size
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
  const [showModePicker, setShowModePicker] = useState<boolean>(false);
  const playerSensorReadings = useRef<number[]>([]);
  const [render3D, setRender3D] = useState<boolean>(true);

  useEffect(() => {
    if (!gameLoaded && !showModePicker) {
      startGame();
    }
  }, []);

  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const trackSize = getTrackSize(gameMode);
    
    // Create track with size from game mode
    const newTrack = new Track(trackSize.width, trackSize.height);
    
    // Create player car
    const newPlayerCar = new Car(
      newTrack.startPosition.x,
      newTrack.startPosition.y,
      30, // width
      50, // height
      '#8B5CF6', // color
      newTrack.startAngle
    );

    // Apply physics from game mode
    const modeConfig = GameMode.getConfig(gameMode);
    newPlayerCar.maxVelocity = 300 * modeConfig.physics.boostMultiplier;
    
    // Create enhanced AI car with difficulty from game mode
    const newAiCar = new EnhancedAICar(
      newTrack.startPosition.x + 40,
      newTrack.startPosition.y,
      30, // width
      50, // height
      '#F97316', // color
      newTrack.startAngle,
      newTrack,
      modeConfig.difficultyMultiplier
    );
    
    // Create camera
    const newCamera = new Camera();
    newCamera.setMode(cameraMode);
    
    // Set fixed camera positions based on track checkpoints
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

    // Show welcome toast
    toast({
      title: `3D Racing Game Ready!`,
      description: "Use arrow keys to drive, SPACE for boost, C to change camera",
    });
  };

  useEffect(() => {
    if (!gameLoaded || !playerCar || !track || !aiCar || !camera) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Skip 2D rendering if using 3D mode
    if (render3D) {
      const gameLoop = (timestamp: number) => {
        const deltaTime = lastTimestamp.current ? (timestamp - lastTimestamp.current) / 1000 : 0.016;
        lastTimestamp.current = timestamp;
        
        // Update player car based on input
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
        
        // Apply game mode physics to player car
        const modeConfig = GameMode.getConfig(gameMode);
        playerCar.maxVelocity = 300 * modeConfig.physics.boostMultiplier;
        playerCar.boostMultiplier = modeConfig.physics.boostMultiplier;
        playerCar.driftFactor = modeConfig.physics.driftFactor;
        
        // Calculate player sensor readings for improved collision detection
        playerSensorReadings.current = RayCaster.castRays(
          { x: playerCar.x, y: playerCar.y, angle: playerCar.angle },
          track,
          7, // Number of rays
          150, // Ray length
          Math.PI * 0.6 // Ray spread
        );
        
        // Boost with custom stats tracking
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

        // Update positions and physics
        playerCar.update(deltaTime);
        aiCar.update(deltaTime, playerCar);
        
        // Track drift distance for challenges
        if (playerCar.drifting) {
          const driftAmount = playerCar.getSpeed() * deltaTime;
          setGameStats(prev => ({
            ...prev,
            driftDistance: prev.driftDistance + driftAmount
          }));
        }
        
        // Update camera
        camera.update(deltaTime, playerCar, track.width, track.height);
        
        // Check collisions with track using improved detection
        const minSensorReading = Math.min(...playerSensorReadings.current);
        if (minSensorReading < 15) {
          playerCar.handleCollision();
          toast({
            title: "Crash!",
            description: "Careful with those barriers!",
            variant: "destructive",
          });
        }
        
        // Check if crossed checkpoint or finish line
        const playerCheckpoint = track.checkCheckpoint(playerCar);
        if (playerCheckpoint) {
          if (playerCheckpoint === 'finish') {
            // Completed a lap
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
            
            // Check challenge completion for challenge mode
            if (gameMode === 'challenge') {
              const challenges = modeConfig.challenges;
              if (challenges) {
                // Check time challenge
                const timeChallenge = challenges.find(c => c.type === 'time');
                if (timeChallenge && lapTime <= timeChallenge.target) {
                  toast({
                    title: "Challenge Complete!",
                    description: `Completed lap in under ${timeChallenge.target}s`,
                  });
                }
                
                // Check drift challenge
                const driftChallenge = challenges.find(c => c.type === 'drift');
                if (driftChallenge && gameStats.driftDistance >= driftChallenge.target) {
                  toast({
                    title: "Challenge Complete!",
                    description: `Drifted for ${Math.floor(gameStats.driftDistance)}m`,
                  });
                }
                
                // Check boost challenge
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
        
        // Update game stats
        setGameStats(prev => ({
          ...prev,
          speed: Math.round(playerCar.getSpeed() * 3.6), // Convert to km/h
          currentLapTime: prev.currentLapTime + deltaTime,
          raceTime: prev.raceTime + deltaTime,
          sensorReadings: [...playerSensorReadings.current]
        }));
        
        requestRef.current = requestAnimationFrame(gameLoop);
      };
      
      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const modeConfig = GameMode.getConfig(gameMode);
      const physics = modeConfig.physics;

      const gameLoop = (timestamp: number) => {
        const deltaTime = lastTimestamp.current ? (timestamp - lastTimestamp.current) / 1000 : 0.016;
        lastTimestamp.current = timestamp;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update player car based on input
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
        
        // Apply game mode physics to player car
        playerCar.maxVelocity = 300 * physics.boostMultiplier;
        playerCar.boostMultiplier = physics.boostMultiplier;
        playerCar.driftFactor = physics.driftFactor;
        
        // Calculate player sensor readings for improved collision detection
        playerSensorReadings.current = RayCaster.castRays(
          { x: playerCar.x, y: playerCar.y, angle: playerCar.angle },
          track,
          7, // Number of rays
          150, // Ray length
          Math.PI * 0.6 // Ray spread
        );
        
        // Boost with custom stats tracking
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

        // Update positions and physics
        playerCar.update(deltaTime);
        aiCar.update(deltaTime, playerCar);
        
        // Track drift distance for challenges
        if (playerCar.drifting) {
          const driftAmount = playerCar.getSpeed() * deltaTime;
          setGameStats(prev => ({
            ...prev,
            driftDistance: prev.driftDistance + driftAmount
          }));
        }
        
        // Update camera
        camera.update(deltaTime, playerCar, track.width, track.height);
        
        // Check collisions with track using improved detection
        const minSensorReading = Math.min(...playerSensorReadings.current);
        if (minSensorReading < 15) {
          playerCar.handleCollision();
          toast({
            title: "Crash!",
            description: "Careful with those barriers!",
            variant: "destructive",
          });
        }
        
        // Check if crossed checkpoint or finish line
        const playerCheckpoint = track.checkCheckpoint(playerCar);
        if (playerCheckpoint) {
          if (playerCheckpoint === 'finish') {
            // Completed a lap
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
            
            // Check challenge completion for challenge mode
            if (gameMode === 'challenge') {
              const challenges = modeConfig.challenges;
              if (challenges) {
                // Check time challenge
                const timeChallenge = challenges.find(c => c.type === 'time');
                if (timeChallenge && lapTime <= timeChallenge.target) {
                  toast({
                    title: "Challenge Complete!",
                    description: `Completed lap in under ${timeChallenge.target}s`,
                  });
                }
                
                // Check drift challenge
                const driftChallenge = challenges.find(c => c.type === 'drift');
                if (driftChallenge && gameStats.driftDistance >= driftChallenge.target) {
                  toast({
                    title: "Challenge Complete!",
                    description: `Drifted for ${Math.floor(gameStats.driftDistance)}m`,
                  });
                }
                
                // Check boost challenge
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
        
        // Update game stats
        setGameStats(prev => ({
          ...prev,
          speed: Math.round(playerCar.getSpeed() * 3.6), // Convert to km/h
          currentLapTime: prev.currentLapTime + deltaTime,
          raceTime: prev.raceTime + deltaTime,
          sensorReadings: [...playerSensorReadings.current]
        }));
        
        ctx.save();
        camera.applyToContext(ctx, canvas.width, canvas.height);
        
        // Draw track
        track.render(ctx);
        
        // Draw cars
        playerCar.render(ctx);
        aiCar.render(ctx);
        
        // Draw sensor rays for player if enabled
        if (showUI) {
          for (let i = 0; i < playerSensorReadings.current.length; i++) {
            const rayAngle = playerCar.angle - Math.PI * 0.3 + (Math.PI * 0.6 * i / (playerSensorReadings.current.length - 1));
            const rayLength = playerSensorReadings.current[i];
            
            const rayEndX = playerCar.x + Math.sin(rayAngle) * rayLength;
            const rayEndY = playerCar.y - Math.cos(rayAngle) * rayLength;
            
            ctx.beginPath();
            ctx.moveTo(playerCar.x, playerCar.y);
            ctx.lineTo(rayEndX, rayEndY);
            ctx.strokeStyle = `rgba(200, 0, 255, 0.3)`;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(rayEndX, rayEndY, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 0, 255, 0.5)`;
            ctx.fill();
          }
        }
        
        ctx.restore();
        
        requestRef.current = requestAnimationFrame(gameLoop);
      };
      
      requestRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoaded, playerCar, track, aiCar, camera, gameMode, toast, showUI, render3D]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      
      // Camera change on 'c' press
      if (e.key === 'c' && !keysPressed.current.cAlreadyPressed) {
        keysPressed.current.cAlreadyPressed = true;
        
        // Cycle through camera modes
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
      
      // Toggle UI with 'u' key
      if (e.key === 'u') {
        setShowUI(prev => !prev);
      }
      
      // Next fixed camera position with 'v' key
      if (e.key === 'v' && camera && cameraMode === 'fixed') {
        camera.cycleFixedPosition();
      }

      // Toggle AI type with 'a' key
      if (e.key === 'a') {
        setGameStats(prev => ({
          ...prev,
          aiType: prev.aiType === 'basic' ? 'enhanced' : 'basic'
        }));

        if (track && aiCar) {
          // Create new AI car based on selected type
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
      
      // Add toggle for 2D/3D mode with '2' key for debugging
      if (e.key === '2') {
        setRender3D(prev => !prev);
        toast({
          title: "View Changed",
          description: `Switched to ${!render3D ? '3D' : '2D'} view`,
        });
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
  }, [cameraMode, camera, toast, track, aiCar, gameStats.aiType, render3D]);

  return (
    <div className="game-container">
      {render3D ? (
        <div className="game-3d-container w-full h-full">
          {gameLoaded && playerCar && track && aiCar && camera ? (
            <Game3DRenderer
              playerCar={playerCar}
              aiCar={aiCar}
              track={track}
              cameraMode={cameraMode}
              cameraPosition={camera.getPosition()}
            />
          ) : (
            <div className="flex items-center justify-center h-screen bg-black">
              <div className="text-white text-lg">Loading 3D Racing Game...</div>
            </div>
          )}
        </div>
      ) : (
        <canvas 
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight}
          className="bg-track"
        />
      )}
      
      {gameStats && showUI && !showModePicker && <GameUI gameStats={gameStats} />}
      
      {gameLoaded && !showModePicker && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="outline"
            onClick={() => setRender3D(prev => !prev)}
            className="bg-black/50 text-white border border-white/20"
          >
            {render3D ? "Switch to 2D" : "Switch to 3D"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
