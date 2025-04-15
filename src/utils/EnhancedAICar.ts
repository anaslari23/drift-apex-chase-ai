import { AICar } from './AICar';
import { Track } from './Track';
import { Car } from './Car';
import { NeuralNetwork, RayCaster, BezierCurve } from './AIAlgorithms';

export class EnhancedAICar extends AICar {
  brain: NeuralNetwork;
  rayCount: number = 9;
  rayLength: number = 200;
  sensorReadings: number[] = [];
  usesNeuralNetwork: boolean = true;
  memory: Array<{
    state: number[],
    action: number,
    reward: number
  }> = [];
  
  learningRate: number = 0.01;
  explorationRate: number = 0.2;
  previousDistance: number = Infinity;
  lapProgress: number = 0;
  lastCheckpointIndex: number = 0;
  maxSpeed: number = 0;
  
  playerPerformanceHistory: Array<number> = [];
  adaptationRate: number = 0.05;
  skillLevel: number = 0.5;
  rubberbandFactor: number = 0.3;

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
    super(x, y, width, height, color, angle, track, difficulty);
    
    this.brain = new NeuralNetwork([this.rayCount + 3, 12, 4]);
    this.racingLine = this.generateOptimalRacingLine();
    
    this.skillLevel = difficulty;
    this.adaptationRate = 0.05 * (1 + difficulty);
  }

  private generateOptimalRacingLine(): Array<{x: number, y: number}> {
    const points: Array<{x: number, y: number}> = [];
    
    for (let i = 0; i < this.track.checkpoints.length; i++) {
      const checkpoint = this.track.checkpoints[i];
      const nextCheckpoint = this.track.checkpoints[(i + 1) % this.track.checkpoints.length];
      const prevCheckpoint = this.track.checkpoints[(i - 1 + this.track.checkpoints.length) % this.track.checkpoints.length];
      
      const dx1 = checkpoint.x - prevCheckpoint.x;
      const dy1 = checkpoint.y - prevCheckpoint.y;
      const dx2 = nextCheckpoint.x - checkpoint.x;
      const dy2 = nextCheckpoint.y - checkpoint.y;
      
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      const controlLen = Math.min(len1, len2) * 0.3;
      
      const controlPoint1 = {
        x: checkpoint.x - (dx1 / len1) * controlLen,
        y: checkpoint.y - (dy1 / len1) * controlLen
      };
      
      const controlPoint2 = {
        x: checkpoint.x + (dx2 / len2) * controlLen,
        y: checkpoint.y + (dy2 / len2) * controlLen
      };
      
      const curve = new BezierCurve([
        checkpoint,
        controlPoint2,
        nextCheckpoint
      ]);
      
      const curvePoints = curve.generatePoints(10);
      
      if (i === 0) {
        points.push(checkpoint);
      }
      
      points.push(...curvePoints.slice(1));
    }
    
    return points;
  }

  update(deltaTime: number, playerCar?: Car): void {
    if (playerCar) {
      this.adaptToPlayer(playerCar, deltaTime);
    }
    
    this.sensorReadings = RayCaster.castRays(
      { x: this.x, y: this.y, angle: this.angle },
      this.track,
      this.rayCount,
      this.rayLength
    );
    
    this.maxSpeed = Math.max(this.maxSpeed, this.getSpeed());
    
    if (this.usesNeuralNetwork) {
      this.makeDecisionsWithNN(deltaTime, playerCar);
    } else {
      super.update(deltaTime, playerCar);
    }
    
    super.update(deltaTime);
    
    this.updateCheckpointProgress();
    
    this.maxSpeed = Math.max(this.maxSpeed, this.getSpeed());
  }

  private adaptToPlayer(playerCar: Car, deltaTime: number): void {
    const playerSpeed = playerCar.getSpeed();
    const playerLap = playerCar.lap || 0;
    const distanceToPlayer = this.distanceToEntity(playerCar);
    
    this.playerPerformanceHistory.push(playerSpeed);
    if (this.playerPerformanceHistory.length > 100) {
      this.playerPerformanceHistory.shift();
    }
    
    const avgPlayerSpeed = this.playerPerformanceHistory.reduce((a, b) => a + b, 0) / 
                           this.playerPerformanceHistory.length;
    
    const normalizedPerformance = Math.min(1, Math.max(0, avgPlayerSpeed / 350));
    
    const targetSkill = normalizedPerformance * 0.7 + 0.3;
    const rubberbandAdjustment = Math.max(-0.2, Math.min(0.2, 
      (distanceToPlayer / 1000) * this.rubberbandFactor * (playerCar.x > this.x ? 1 : -1)
    ));
    
    this.skillLevel += (targetSkill + rubberbandAdjustment - this.skillLevel) * this.adaptationRate * deltaTime;
    this.skillLevel = Math.max(0.2, Math.min(0.95, this.skillLevel));
    
    this.maxVelocity = 280 + (this.skillLevel * 70);
    this.aggressiveness = this.skillLevel * 0.8;
    this.driftProbability = this.skillLevel * 0.5;
    
    if (distanceToPlayer > 500 && playerCar.x > this.x) {
      this.maxVelocity = Math.max(this.maxVelocity, playerSpeed * 1.2);
    }
  }

  private makeDecisionsWithNN(deltaTime: number, playerCar?: Car): void {
    const inputs: number[] = [];
    
    for (const distance of this.sensorReadings) {
      inputs.push(distance / this.rayLength);
    }
    
    inputs.push(this.getSpeed() / this.maxVelocity);
    
    if (this.targetCheckpoint !== undefined) {
      const checkpoint = this.track.checkpoints[this.targetCheckpoint];
      const dx = checkpoint.x - this.x;
      const dy = checkpoint.y - this.y;
      const targetAngle = Math.atan2(dx, -dy);
      
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      inputs.push(angleDiff / Math.PI);
    } else {
      inputs.push(0);
    }
    
    const closestLinePoint = this.findClosestRacingLinePoint();
    if (closestLinePoint) {
      const dx = closestLinePoint.x - this.x;
      const dy = closestLinePoint.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      inputs.push(Math.min(1, distance / 100));
    } else {
      inputs.push(0);
    }
    
    const outputs = this.brain.forward(inputs);
    
    const skillModifier = 0.5 + this.skillLevel * 0.5;
    
    if (outputs[0] > (0.5 / skillModifier)) {
      this.turnLeft(deltaTime * skillModifier);
    }
    
    if (outputs[1] > (0.5 / skillModifier)) {
      this.turnRight(deltaTime * skillModifier);
    }
    
    if (outputs[2] > outputs[3] && outputs[2] > (0.5 / skillModifier)) {
      this.accelerate(deltaTime * skillModifier);
      
      if (this.getSpeed() > this.maxVelocity * (0.7 - (1 - this.skillLevel) * 0.2) && 
          (outputs[0] > 0.3 || outputs[1] > 0.3)) {
        this.drifting = Math.random() < this.skillLevel;
      } else {
        this.drifting = false;
      }
    } else if (outputs[3] > (0.5 / skillModifier)) {
      this.brake(deltaTime * skillModifier);
      this.drifting = false;
    } else {
      this.releaseAccelerator(deltaTime);
      this.drifting = false;
    }
    
    const canBoost = this.sensorReadings[Math.floor(this.sensorReadings.length / 2)] > this.rayLength * 0.7;
    if (canBoost && Math.random() < this.skillLevel * 0.4) {
      this.activateBoost();
    } else {
      this.deactivateBoost();
    }
    
    this.recordExperience(inputs, outputs.indexOf(Math.max(...outputs)), this.calculateReward());
  }

  private calculateReward(): number {
    let reward = 0;
    
    reward += this.getSpeed() / this.maxVelocity;
    
    const minSensorReading = Math.min(...this.sensorReadings);
    if (minSensorReading < 30) {
      reward -= (30 - minSensorReading) / 30;
    }
    
    if (this.targetCheckpoint !== undefined) {
      const checkpoint = this.track.checkpoints[this.targetCheckpoint];
      const dx = checkpoint.x - this.x;
      const dy = checkpoint.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.previousDistance) {
        reward += 0.1;
      } else {
        reward -= 0.1;
      }
      
      this.previousDistance = distance;
    }
    
    const closestLinePoint = this.findClosestRacingLinePoint();
    if (closestLinePoint) {
      const dx = closestLinePoint.x - this.x;
      const dy = closestLinePoint.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      reward += Math.max(0, 1 - distance / 50);
    }
    
    return reward;
  }

  private recordExperience(state: number[], action: number, reward: number): void {
    this.memory.push({ state, action, reward });
    
    if (this.memory.length > 1000) {
      this.memory.shift();
    }
  }

  learn(): void {
    if (this.memory.length < 50) return;
    
    const batchSize = Math.min(32, this.memory.length);
    const batch = [];
    
    for (let i = 0; i < batchSize; i++) {
      const index = Math.floor(Math.random() * this.memory.length);
      batch.push(this.memory[index]);
    }
    
    for (const experience of batch) {
      const currentPrediction = this.brain.forward(experience.state);
      
      const targetPrediction = [...currentPrediction];
      targetPrediction[experience.action] = experience.reward;
      
      this.brain.mutate(this.learningRate * experience.reward);
    }
    
    this.explorationRate = Math.max(0.05, this.explorationRate * 0.99);
  }

  private findClosestRacingLinePoint(): { x: number, y: number } | null {
    if (this.racingLine.length === 0) return null;
    
    let closestPoint = this.racingLine[0];
    let closestDistance = Infinity;
    
    for (const point of this.racingLine) {
      const dx = point.x - this.x;
      const dy = point.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    }
    
    return closestPoint;
  }

  private updateCheckpointProgress(): void {
    if (this.targetCheckpoint === undefined) return;
    
    const checkpoint = this.track.checkpoints[this.targetCheckpoint];
    const dx = checkpoint.x - this.x;
    const dy = checkpoint.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 50) {
      this.lastCheckpointIndex = this.targetCheckpoint;
      this.targetCheckpoint = (this.targetCheckpoint + 1) % this.track.checkpoints.length;
      
      if (this.targetCheckpoint === 0) {
        this.lapProgress += 1;
        this.learn();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.sensorReadings.length > 0) {
      for (let i = 0; i < this.rayCount; i++) {
        const rayAngle = this.angle - Math.PI * 0.4 + (Math.PI * 0.8 * i / (this.rayCount - 1));
        const rayLength = this.sensorReadings[i];
        
        const rayEndX = this.x + Math.sin(rayAngle) * rayLength;
        const rayEndY = this.y - Math.cos(rayAngle) * rayLength;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(rayEndX, rayEndY);
        ctx.strokeStyle = `rgba(255, 255, 0, 0.3)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(rayEndX, rayEndY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 0, 0.5)`;
        ctx.fill();
      }
    }
    
    if (this.racingLine && this.racingLine.length > 0) {
      ctx.beginPath();
      ctx.moveTo(this.racingLine[0].x, this.racingLine[0].y);
      
      for (let i = 1; i < this.racingLine.length; i++) {
        ctx.lineTo(this.racingLine[i].x, this.racingLine[i].y);
      }
      
      ctx.strokeStyle = `rgba(0, 255, 255, 0.3)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    super.render(ctx);
  }

  private distanceToEntity(entity: {x: number, y: number}): number {
    const dx = entity.x - this.x;
    const dy = entity.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
