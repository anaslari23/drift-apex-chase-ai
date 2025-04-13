
import { Car } from './Car';

export type CameraMode = 'follow' | 'chase' | 'overhead' | 'cinematic' | 'fixed';

export class Camera {
  private x: number;
  private y: number;
  private targetX: number;
  private targetY: number;
  private mode: CameraMode;
  private smoothFactor: number;
  private zoom: number;
  private rotation: number;
  private fixedPositions: Array<{x: number, y: number, zoom: number}>;
  private currentFixedPosition: number;
  private cinematicTimer: number;
  
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.mode = 'follow';
    this.smoothFactor = 0.1; // 0-1, higher is more responsive
    this.zoom = 1.0;
    this.rotation = 0;
    this.fixedPositions = [];
    this.currentFixedPosition = 0;
    this.cinematicTimer = 0;
  }
  
  setMode(mode: CameraMode): void {
    this.mode = mode;
    
    // Set appropriate defaults for each mode
    switch (mode) {
      case 'follow':
        this.smoothFactor = 0.1;
        this.zoom = 1.0;
        this.rotation = 0;
        break;
      case 'chase':
        this.smoothFactor = 0.15;
        this.zoom = 1.2;
        break;
      case 'overhead':
        this.smoothFactor = 0.05;
        this.zoom = 0.7;
        this.rotation = 0;
        break;
      case 'cinematic':
        this.smoothFactor = 0.03;
        this.zoom = 1.3;
        this.cinematicTimer = 0;
        break;
      case 'fixed':
        this.smoothFactor = 0.15;
        break;
    }
  }
  
  setFixedPositions(positions: Array<{x: number, y: number, zoom: number}>): void {
    this.fixedPositions = positions;
    this.currentFixedPosition = 0;
  }
  
  cycleFixedPosition(): void {
    if (this.fixedPositions.length > 0) {
      this.currentFixedPosition = (this.currentFixedPosition + 1) % this.fixedPositions.length;
    }
  }
  
  update(deltaTime: number, playerCar: Car, trackWidth: number, trackHeight: number): void {
    switch (this.mode) {
      case 'follow':
        // Simple follow camera
        this.targetX = playerCar.x;
        this.targetY = playerCar.y;
        this.rotation = 0;
        break;
        
      case 'chase':
        // Chase camera follows behind car
        const distance = 150;
        this.targetX = playerCar.x - Math.sin(playerCar.angle) * distance;
        this.targetY = playerCar.y + Math.cos(playerCar.angle) * distance;
        this.rotation = playerCar.angle;
        break;
        
      case 'overhead':
        // Overhead camera shows more of the track
        this.targetX = playerCar.x;
        this.targetY = playerCar.y;
        break;
        
      case 'cinematic':
        // Cinematic camera that alternates between different views
        this.cinematicTimer += deltaTime;
        if (this.cinematicTimer > 5) {
          // Switch to a new random view every 5 seconds
          this.cinematicTimer = 0;
          const cinematicModes = ['follow', 'chase', 'overhead'];
          const randomMode = cinematicModes[Math.floor(Math.random() * cinematicModes.length)] as CameraMode;
          this.setMode(randomMode);
        }
        
        // Default to follow behavior
        this.targetX = playerCar.x;
        this.targetY = playerCar.y;
        break;
        
      case 'fixed':
        // Fixed position cameras
        if (this.fixedPositions.length > 0) {
          const pos = this.fixedPositions[this.currentFixedPosition];
          this.targetX = pos.x;
          this.targetY = pos.y;
          this.zoom = pos.zoom;
        } else {
          // Default to track center if no positions defined
          this.targetX = trackWidth / 2;
          this.targetY = trackHeight / 2;
        }
        break;
    }
    
    // Smooth camera movement
    this.x += (this.targetX - this.x) * this.smoothFactor;
    this.y += (this.targetY - this.y) * this.smoothFactor;
  }
  
  applyToContext(
    ctx: CanvasRenderingContext2D, 
    canvasWidth: number, 
    canvasHeight: number
  ): void {
    ctx.save();
    
    // Center and zoom
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.rotate(this.rotation);
    ctx.translate(-this.x, -this.y);
  }
  
  getPosition(): {x: number, y: number} {
    return {x: this.x, y: this.y};
  }
  
  getZoom(): number {
    return this.zoom;
  }
  
  getRotation(): number {
    return this.rotation;
  }
}
