
import { useEffect, useRef, useState } from 'react';
import { Car } from '@/utils/Car';
import { Track } from '@/utils/Track';
import { AICar } from '@/utils/AICar';
import { GameUI } from './GameUI';
import { useToast } from "@/components/ui/use-toast";

const GAME_WIDTH = 1600;
const GAME_HEIGHT = 1200;

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [playerCar, setPlayerCar] = useState<Car | null>(null);
  const [aiCar, setAiCar] = useState<AICar | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [gameLoaded, setGameLoaded] = useState<boolean>(false);
  const [gameStats, setGameStats] = useState({
    speed: 0,
    lap: 0,
    bestLapTime: Infinity,
    currentLapTime: 0,
    raceTime: 0,
    boost: 100,
  });
  const keysPressed = useRef<Record<string, boolean>>({});
  const lastTimestamp = useRef<number>(0);
  const { toast } = useToast();

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create track
    const newTrack = new Track(GAME_WIDTH, GAME_HEIGHT);
    
    // Create player car
    const newPlayerCar = new Car(
      newTrack.startPosition.x,
      newTrack.startPosition.y,
      30, // width
      50, // height
      '#8B5CF6', // color
      newTrack.startAngle
    );

    // Create AI car
    const newAiCar = new AICar(
      newTrack.startPosition.x + 40,
      newTrack.startPosition.y,
      30, // width
      50, // height
      '#F97316', // color
      newTrack.startAngle,
      newTrack
    );

    setTrack(newTrack);
    setPlayerCar(newPlayerCar);
    setAiCar(newAiCar);
    setGameLoaded(true);

    // Show welcome toast
    toast({
      title: "Race Ready!",
      description: "Use arrow keys to drive, SPACE for boost",
    });

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [toast]);

  // Handle keyboard input
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

  // Game loop
  useEffect(() => {
    if (!gameLoaded || !playerCar || !track || !aiCar) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      
      // Boost
      if (keys[' '] && gameStats.boost > 0) {
        playerCar.activateBoost();
        setGameStats(prev => ({
          ...prev,
          boost: Math.max(0, prev.boost - 1),
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
        }
      }
      
      // Update game stats
      setGameStats(prev => ({
        ...prev,
        speed: Math.round(playerCar.getSpeed() * 3.6), // Convert to km/h
        currentLapTime: prev.currentLapTime + deltaTime,
        raceTime: prev.raceTime + deltaTime,
      }));
      
      // Calculate viewport offset for camera following player
      const viewportX = canvas.width / 2 - playerCar.x;
      const viewportY = canvas.height / 2 - playerCar.y;
      
      // Render game
      ctx.save();
      ctx.translate(viewportX, viewportY);
      
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
  }, [gameLoaded, playerCar, track, aiCar, toast]);

  return (
    <div className="game-container">
      <canvas 
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="bg-track"
      />
      {gameStats && <GameUI gameStats={gameStats} />}
    </div>
  );
};

export default GameCanvas;
