import { Car } from './Car';
import { Track } from './Track';

export class AICar extends Car {
  protected track: Track;
  protected difficulty: number;
  protected reactionTime: number;
  protected lastDecision: number;
  protected avoidanceSensors: Array<{angle: number, distance: number}>;
  protected racingLine: Array<{x: number, y: number}>;
  protected aggressiveness: number;
  protected driftProbability: number;
  protected preferredSpeed: number;
  
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    angle: number,
    track: Track,
    difficulty: number = 0.85
  ) {
    super(x, y, width, height, color, angle);
    this.track = track;
    this.targetCheckpoint = 0;
    this.difficulty = difficulty;
    this.maxVelocity = 300 + (difficulty * 50);
    this.reactionTime = 0.15 - (difficulty * 0.1);
    this.lastDecision = 0;
    this.avoidanceSensors = [
      { angle: -0.8, distance: 120 },
      { angle: -0.4, distance: 150 },
      { angle: 0, distance: 180 },
      { angle: 0.4, distance: 150 },
      { angle: 0.8, distance: 120 }
    ];
    this.racingLine = this.calculateRacingLine();
    this.aggressiveness = difficulty * 0.9;
    this.driftProbability = difficulty * 0.4;
    this.preferredSpeed = 250 + (difficulty * 100);
  }
  
  private calculateRacingLine(): Array<{x: number, y: number}> {
    const points = [];
    
    for (let i = 0; i < this.track.checkpoints.length; i++) {
      const checkpoint = this.track.checkpoints[i];
      const nextCheckpoint = this.track.checkpoints[(i + 1) % this.track.checkpoints.length];
      
      const dx = nextCheckpoint.x - checkpoint.x;
      const dy = nextCheckpoint.y - checkpoint.y;
      
      const length = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / length;
      const ny = dy / length;
      
      const px = -ny;
      const py = nx;
      
      const segments = 5;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const curveFactor = Math.sin(t * Math.PI) * 30;
        
        points.push({
          x: checkpoint.x + dx * t + px * curveFactor,
          y: checkpoint.y + dy * t + py * curveFactor
        });
      }
    }
    
    return points;
  }
  
  private getTargetRacingPoint(): {x: number, y: number} {
    let closestPoint = this.racingLine[0];
    let closestDist = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < this.racingLine.length; i++) {
      const point = this.racingLine[i];
      const dx = point.x - this.x;
      const dy = point.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = point;
        closestIndex = i;
      }
    }
    
    const lookAheadIndex = (closestIndex + 10) % this.racingLine.length;
    return this.racingLine[lookAheadIndex];
  }
  
  update(deltaTime: number, playerCar?: Car): void {
    this.lastDecision += deltaTime;
    
    if (this.lastDecision >= this.reactionTime && playerCar) {
      this.lastDecision = 0;
      this.makeDecisions(playerCar);
    }
    
    super.update(deltaTime);
    
    const distance = this.distanceToCheckpoint();
    if (distance < 50) {
      this.targetCheckpoint = (this.targetCheckpoint + 1) % this.track.checkpoints.length;
    }
  }
  
  private makeDecisions(playerCar: Car) {
    const racingTarget = this.getTargetRacingPoint();
    let dx = racingTarget.x - this.x;
    let dy = racingTarget.y - this.y;
    let targetAngle = Math.atan2(dx, -dy);
    
    const sensorReadings = this.checkSensors();
    const hasCollisionAhead = sensorReadings.some(r => r < 0.8);
    
    if (hasCollisionAhead) {
      const leftSide = sensorReadings.slice(0, 2).reduce((a, b) => a + b, 0);
      const rightSide = sensorReadings.slice(3).reduce((a, b) => a + b, 0);
      
      if (leftSide > rightSide) {
        targetAngle -= 0.5;
      } else {
        targetAngle += 0.5;
      }
    }
    
    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    const steeringFactor = hasCollisionAhead ? 2.0 : 1.0;
    if (angleDiff > 0.1) {
      this.turnRight(this.reactionTime * steeringFactor);
    } else if (angleDiff < -0.1) {
      this.turnLeft(this.reactionTime * steeringFactor);
    }
    
    const shouldSlowDown = hasCollisionAhead || Math.abs(angleDiff) > 1.0;
    if (!shouldSlowDown && this.getSpeed() < this.preferredSpeed) {
      this.accelerate(this.reactionTime);
      
      if (Math.abs(angleDiff) < 0.3 && this.getSpeed() > this.preferredSpeed * 0.7) {
        this.activateBoost();
      } else {
        this.deactivateBoost();
      }
    } else if (shouldSlowDown) {
      this.brake(this.reactionTime);
      this.deactivateBoost();
    }
    
    if (Math.abs(angleDiff) > 0.6 && this.getSpeed() > this.preferredSpeed * 0.6 && 
        Math.random() < this.driftProbability) {
      this.drifting = true;
    } else {
      this.drifting = false;
    }
    
    const distanceToPlayer = this.distanceToPlayer(playerCar);
    if (distanceToPlayer < 150) {
      this.aggressiveness = Math.min(1.0, this.aggressiveness + 0.2);
      this.preferredSpeed = Math.max(this.preferredSpeed, playerCar.getSpeed() * 1.1);
    } else {
      this.aggressiveness = this.difficulty * 0.9;
      this.preferredSpeed = 250 + (this.difficulty * 100);
    }
  }
  
  private checkSensors(): number[] {
    return this.avoidanceSensors.map(sensor => {
      const sensorAngle = this.angle + sensor.angle;
      const projectedX = this.x + Math.sin(sensorAngle) * sensor.distance;
      const projectedY = this.y - Math.cos(sensorAngle) * sensor.distance;
      
      const isOutOfBounds = this.track.isPointOutOfBounds(projectedX, projectedY);
      
      if (!isOutOfBounds) return 1.0;
      
      return 0.5;
    });
  }
  
  private distanceToPlayer(playerCar: Car): number {
    const dx = playerCar.x - this.x;
    const dy = playerCar.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private distanceToCheckpoint(): number {
    if (this.targetCheckpoint === undefined) return 1000;
    
    const checkpoint = this.track.checkpoints[this.targetCheckpoint];
    const dx = checkpoint.x - this.x;
    const dy = checkpoint.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private checkCollisionAhead(): boolean {
    const centralSensor = this.checkSensors()[1];
    return centralSensor < 0.8;
  }
  
  private isAheadOf(otherCar: Car): boolean {
    if (this.targetCheckpoint === undefined || otherCar.targetCheckpoint === undefined) {
      return false;
    }
    
    if (this.targetCheckpoint > otherCar.targetCheckpoint) {
      return true;
    } else if (this.targetCheckpoint === otherCar.targetCheckpoint) {
      const myDistance = this.distanceToCheckpoint();
      const dx = this.track.checkpoints[this.targetCheckpoint].x - otherCar.x;
      const dy = this.track.checkpoints[this.targetCheckpoint].y - otherCar.y;
      const otherDistance = Math.sqrt(dx * dx + dy * dy);
      
      return myDistance < otherDistance;
    }
    
    return false;
  }
}
