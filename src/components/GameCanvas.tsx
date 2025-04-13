
import { useEffect, useRef, useState } from 'react';
import { Car } from '@/utils/Car';
import { Track } from '@/utils/Track';
import { AICar } from '@/utils/AICar';
import { GameUI } from './GameUI';
import { Camera, CameraMode } from '@/utils/Camera';
import { GameMode, GameModeType } from '@/utils/GameMode';
import { useToast } from "@/components/ui/use-toast";
import { 
  Button, 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui';

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
  const [aiCar, setAiCar] = useState<AICar | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
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
  });
  const keysPressed = useRef<Record<string, boolean>>({});
  const lastTimestamp = useRef<number>(0);
  const { toast } = useToast();
  const [showModePicker, setShowModePicker] = useState<boolean>(true);

  // Initialize game
  useEffect(() => {
    if (showModePicker) return; // Don't start game until mode is selected
    
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
    
    // Create AI car with difficulty from game mode
    const newAiCar = new AICar(
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
      title: `${modeConfig.name} Ready!`,
      description: "Use arrow keys to drive, SPACE for boost, C to change camera",
    });

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameMode, cameraMode, showModePicker, toast]);

  // Handle keyboard input
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
  }, [cameraMode, camera, toast]);

  // Game loop
  useEffect(() => {
    if (!gameLoaded || !playerCar || !track || !aiCar || !camera) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get physics config from game mode
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
      
      // Check collisions with track
      const playerCollision = track.checkCollision(playerCar);
      if (playerCollision) {
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
      }));
      
      // Apply camera to context
      ctx.save();
      camera.applyToContext(ctx, canvas.width, canvas.height);
      
      // Draw track
      track.render(ctx);
      
      // Draw cars
      playerCar.render(ctx);
      aiCar.render(ctx);
      
      ctx.restore();
      
      requestRef.current = requestAnimationFrame(gameLoop);
    };
    
    requestRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoaded, playerCar, track, aiCar, camera, gameMode, toast]);

  // Handle mode selection
  const handleModeSelect = () => {
    setShowModePicker(false);
  };

  return (
    <div className="game-container">
      <canvas 
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="bg-track"
      />
      
      {showModePicker && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-center">Select Game Mode</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Game Mode</label>
                <Select 
                  value={gameMode} 
                  onValueChange={(value) => setGameMode(value as GameModeType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {GameMode.getAllModes().map(mode => (
                      <SelectItem key={mode} value={mode}>
                        {GameMode.getConfig(mode).name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {GameMode.getConfig(gameMode).description}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Starting Camera</label>
                <Select 
                  value={cameraMode} 
                  onValueChange={(value) => setCameraMode(value as CameraMode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow">Follow Camera</SelectItem>
                    <SelectItem value="chase">Chase Camera</SelectItem>
                    <SelectItem value="overhead">Overhead Camera</SelectItem>
                    <SelectItem value="cinematic">Cinematic Camera</SelectItem>
                    <SelectItem value="fixed">Fixed Camera</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Press C during gameplay to cycle between camera modes.
                </p>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleModeSelect}
              >
                Start Race
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {gameStats && showUI && !showModePicker && <GameUI gameStats={gameStats} />}
    </div>
  );
};

export default GameCanvas;
