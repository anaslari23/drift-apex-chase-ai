
import { Car } from './Car';
import { Track } from './Track';

export class AICar extends Car {
  private track: Track;
  private difficulty: number;
  private reactionTime: number;
  private lastDecision: number;
  
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    angle: number,
    track: Track
  ) {
    super(x, y, width, height, color, angle);
    this.track = track;
    this.targetCheckpoint = 0;
    this.difficulty = 0.85; // 0-1, higher is more challenging
    this.maxVelocity = 280; // Slightly slower than player
    this.reactionTime = 0.2; // Time in seconds between AI decisions
    this.lastDecision = 0;
  }
  
  // Override the update method to include playerCar
  update(deltaTime: number, playerCar?: Car): void {
    // Implement basic AI logic
    this.lastDecision += deltaTime;
    
    if (this.lastDecision >= this.reactionTime && playerCar) {
      this.lastDecision = 0;
      this.makeDecisions(playerCar);
    }
    
    // Update physics
    super.update(deltaTime);
    
    // Check if we've reached the current target checkpoint
    const distance = this.distanceToCheckpoint();
    if (distance < 50) {
      this.targetCheckpoint = (this.targetCheckpoint + 1) % this.track.checkpoints.length;
    }
  }
  
  private makeDecisions(playerCar: Car) {
    // Find direction to next checkpoint
    const checkpoint = this.track.checkpoints[this.targetCheckpoint];
    const dx = checkpoint.x - this.x;
    const dy = checkpoint.y - this.y;
    const targetAngle = Math.atan2(dx, -dy);
    
    // Normalize angle difference to range -PI to PI
    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Steering
    if (angleDiff > 0.1) {
      this.turnRight(this.reactionTime);
    } else if (angleDiff < -0.1) {
      this.turnLeft(this.reactionTime);
    }
    
    // Check for collisions ahead
    const hasCollisionAhead = this.checkCollisionAhead();
    
    // Throttle control
    if (!hasCollisionAhead && Math.abs(angleDiff) < 0.8) {
      this.accelerate(this.reactionTime);
      
      // Apply occasional boost to make AI more competitive
      // More likely to boost if behind player
      const isAheadOfPlayer = this.isAheadOf(playerCar);
      if (!isAheadOfPlayer && Math.random() < this.difficulty * 0.1) {
        this.activateBoost();
      } else {
        this.deactivateBoost();
      }
    } else {
      // Brake if pointing wrong way or collision ahead
      this.brake(this.reactionTime);
      this.deactivateBoost();
    }
  }
  
  private distanceToCheckpoint(): number {
    if (this.targetCheckpoint === undefined) return 1000;
    
    const checkpoint = this.track.checkpoints[this.targetCheckpoint];
    const dx = checkpoint.x - this.x;
    const dy = checkpoint.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private checkCollisionAhead(): boolean {
    // Project a point ahead of the car
    const lookAheadDistance = 50;
    const projectedX = this.x + Math.sin(this.angle) * lookAheadDistance;
    const projectedY = this.y - Math.cos(this.angle) * lookAheadDistance;
    
    // Check if that point is on track
    return this.track.isPointOutOfBounds(projectedX, projectedY);
  }
  
  private isAheadOf(otherCar: Car): boolean {
    // Simple check - further ahead in the checkpoint sequence or closer to next checkpoint
    if (this.targetCheckpoint === undefined || otherCar.targetCheckpoint === undefined) {
      return false;
    }
    
    if (this.targetCheckpoint > otherCar.targetCheckpoint) {
      return true;
    } else if (this.targetCheckpoint === otherCar.targetCheckpoint) {
      const myDistance = this.distanceToCheckpoint();
      // We would need to get otherCar's distance to its target
      // This is a simplification:
      const dx = this.track.checkpoints[this.targetCheckpoint].x - otherCar.x;
      const dy = this.track.checkpoints[this.targetCheckpoint].y - otherCar.y;
      const otherDistance = Math.sqrt(dx * dx + dy * dy);
      
      return myDistance < otherDistance;
    }
    
    return false;
  }
}
