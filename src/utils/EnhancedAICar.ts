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
  protected override racingLine: Array<{x: number, y: number}>;
  learningRate: number = 0.01;
  explorationRate: number = 0.2;
  previousDistance: number = Infinity;
  lapProgress: number = 0;
  lastCheckpointIndex: number = 0;
  maxSpeed: number = 0;

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
    
    // Create neural network with layers [inputs, hidden, outputs]
    // Inputs: ray distances + speed + angle to next checkpoint + distance to racing line
    // Outputs: steer left, steer right, accelerate, brake
    this.brain = new NeuralNetwork([this.rayCount + 3, 12, 4]);
    
    // Generate optimized racing line using bezier curves
    this.racingLine = this.generateOptimalRacingLine();
  }

  private generateOptimalRacingLine(): Array<{x: number, y: number}> {
    // Create a smooth racing line through checkpoints using bezier curves
    const points: Array<{x: number, y: number}> = [];
    
    for (let i = 0; i < this.track.checkpoints.length; i++) {
      const checkpoint = this.track.checkpoints[i];
      const nextCheckpoint = this.track.checkpoints[(i + 1) % this.track.checkpoints.length];
      const prevCheckpoint = this.track.checkpoints[(i - 1 + this.track.checkpoints.length) % this.track.checkpoints.length];
      
      // Calculate control points for smooth curve
      const dx1 = checkpoint.x - prevCheckpoint.x;
      const dy1 = checkpoint.y - prevCheckpoint.y;
      const dx2 = nextCheckpoint.x - checkpoint.x;
      const dy2 = nextCheckpoint.y - checkpoint.y;
      
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      const controlLen = Math.min(len1, len2) * 0.3;
      
      // Offset control points inwards for smooth turns
      const controlPoint1 = {
        x: checkpoint.x - (dx1 / len1) * controlLen,
        y: checkpoint.y - (dy1 / len1) * controlLen
      };
      
      const controlPoint2 = {
        x: checkpoint.x + (dx2 / len2) * controlLen,
        y: checkpoint.y + (dy2 / len2) * controlLen
      };
      
      // Create bezier curve through control points
      const curve = new BezierCurve([
        checkpoint,
        controlPoint2,
        nextCheckpoint
      ]);
      
      // Sample points along the curve
      const curvePoints = curve.generatePoints(10);
      
      // Add points to racing line
      if (i === 0) {
        points.push(checkpoint);
      }
      
      points.push(...curvePoints.slice(1));
    }
    
    return points;
  }

  update(deltaTime: number, playerCar?: Car): void {
    // Update sensor readings
    this.sensorReadings = RayCaster.castRays(
      { x: this.x, y: this.y, angle: this.angle },
      this.track,
      this.rayCount,
      this.rayLength
    );
    
    // Track max speed for performance metrics
    this.maxSpeed = Math.max(this.maxSpeed, this.getSpeed());
    
    // Use neural network for decision making
    if (this.usesNeuralNetwork) {
      this.makeDecisionsWithNN(deltaTime, playerCar);
    } else {
      // Fallback to regular decision making
      super.update(deltaTime, playerCar);
    }
    
    // Update position with physics
    super.update(deltaTime);
    
    // Check for checkpoint progress
    this.updateCheckpointProgress();
    
    // Record maximum speed
    this.maxSpeed = Math.max(this.maxSpeed, this.getSpeed());
  }

  private makeDecisionsWithNN(deltaTime: number, playerCar?: Car): void {
    // Prepare input data for neural network
    const inputs: number[] = [];
    
    // Normalize ray distances
    for (const distance of this.sensorReadings) {
      inputs.push(distance / this.rayLength);
    }
    
    // Add speed (normalized)
    inputs.push(this.getSpeed() / this.maxVelocity);
    
    // Add angle to next checkpoint
    if (this.targetCheckpoint !== undefined) {
      const checkpoint = this.track.checkpoints[this.targetCheckpoint];
      const dx = checkpoint.x - this.x;
      const dy = checkpoint.y - this.y;
      const targetAngle = Math.atan2(dx, -dy);
      
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      // Normalize angle difference to [-1, 1]
      inputs.push(angleDiff / Math.PI);
    } else {
      inputs.push(0);
    }
    
    // Add distance to racing line (normalized)
    const closestLinePoint = this.findClosestRacingLinePoint();
    if (closestLinePoint) {
      const dx = closestLinePoint.x - this.x;
      const dy = closestLinePoint.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      inputs.push(Math.min(1, distance / 100)); // Normalize, max 100 units
    } else {
      inputs.push(0);
    }
    
    // Get outputs from neural network
    const outputs = this.brain.forward(inputs);
    
    // Apply decisions based on neural network outputs
    if (outputs[0] > 0.5) { // Steer left
      this.turnLeft(deltaTime);
    }
    
    if (outputs[1] > 0.5) { // Steer right
      this.turnRight(deltaTime);
    }
    
    if (outputs[2] > outputs[3] && outputs[2] > 0.5) { // Accelerate
      this.accelerate(deltaTime);
      
      // Enable drifting at high speeds and turns
      if (this.getSpeed() > this.maxVelocity * 0.7 && 
          (outputs[0] > 0.3 || outputs[1] > 0.3)) {
        this.drifting = true;
      } else {
        this.drifting = false;
      }
    } else if (outputs[3] > 0.5) { // Brake
      this.brake(deltaTime);
      this.drifting = false;
    } else {
      this.releaseAccelerator(deltaTime);
      this.drifting = false;
    }
    
    // Boost decision based on straight path and no obstacles ahead
    const canBoost = this.sensorReadings[Math.floor(this.sensorReadings.length / 2)] > this.rayLength * 0.7;
    if (canBoost && Math.random() < this.difficulty * 0.3) {
      this.activateBoost();
    } else {
      this.deactivateBoost();
    }
    
    // Store state for learning
    this.recordExperience(inputs, outputs.indexOf(Math.max(...outputs)), this.calculateReward());
  }

  private calculateReward(): number {
    let reward = 0;
    
    // Reward for speed
    reward += this.getSpeed() / this.maxVelocity;
    
    // Reward for staying on track (not too close to barriers)
    const minSensorReading = Math.min(...this.sensorReadings);
    if (minSensorReading < 30) {
      reward -= (30 - minSensorReading) / 30;
    }
    
    // Reward for checkpoint progress
    if (this.targetCheckpoint !== undefined) {
      const checkpoint = this.track.checkpoints[this.targetCheckpoint];
      const dx = checkpoint.x - this.x;
      const dy = checkpoint.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Reward for getting closer to checkpoint
      if (distance < this.previousDistance) {
        reward += 0.1;
      } else {
        reward -= 0.1;
      }
      
      this.previousDistance = distance;
    }
    
    // Add reward for staying close to racing line
    const closestLinePoint = this.findClosestRacingLinePoint();
    if (closestLinePoint) {
      const dx = closestLinePoint.x - this.x;
      const dy = closestLinePoint.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Higher reward for staying on racing line
      reward += Math.max(0, 1 - distance / 50);
    }
    
    return reward;
  }

  private recordExperience(state: number[], action: number, reward: number): void {
    this.memory.push({ state, action, reward });
    
    // Limit memory size
    if (this.memory.length > 1000) {
      this.memory.shift();
    }
  }

  learn(): void {
    // Simple reinforcement learning update
    if (this.memory.length < 50) return;
    
    // Sample batch of experiences
    const batchSize = Math.min(32, this.memory.length);
    const batch = [];
    
    for (let i = 0; i < batchSize; i++) {
      const index = Math.floor(Math.random() * this.memory.length);
      batch.push(this.memory[index]);
    }
    
    // Update neural network based on experiences
    for (const experience of batch) {
      // Get current prediction
      const currentPrediction = this.brain.forward(experience.state);
      
      // Modify the action that was taken
      const targetPrediction = [...currentPrediction];
      targetPrediction[experience.action] = experience.reward;
      
      // Update weights (simplified)
      this.brain.mutate(this.learningRate * experience.reward);
    }
    
    // Decrease exploration rate over time
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
    
    // Check if passed current target checkpoint
    const checkpoint = this.track.checkpoints[this.targetCheckpoint];
    const dx = checkpoint.x - this.x;
    const dy = checkpoint.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 50) {
      // Mark checkpoint as passed
      this.lastCheckpointIndex = this.targetCheckpoint;
      this.targetCheckpoint = (this.targetCheckpoint + 1) % this.track.checkpoints.length;
      
      // Update lap progress
      if (this.targetCheckpoint === 0) {
        this.lapProgress += 1;
        this.learn(); // Learn after completing a lap
      }
    }
  }

  // Override to visualize rays
  render(ctx: CanvasRenderingContext2D): void {
    // Draw rays for visualization
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
        
        // Draw endpoint
        ctx.beginPath();
        ctx.arc(rayEndX, rayEndY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 0, 0.5)`;
        ctx.fill();
      }
    }
    
    // Draw racing line
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
    
    // Call super to draw the car
    super.render(ctx);
  }
}
