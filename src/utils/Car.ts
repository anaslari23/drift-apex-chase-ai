
export class Car {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  angle: number;
  velocity: number;
  maxVelocity: number;
  acceleration: number;
  deceleration: number;
  turnSpeed: number;
  drifting: boolean;
  driftFactor: number;
  driftTrail: Array<{ x: number, y: number, opacity: number }>;
  boost: boolean;
  boostMultiplier: number;
  
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    angle: number = 0
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.angle = angle;
    this.velocity = 0;
    this.maxVelocity = 300;
    this.acceleration = 150;
    this.deceleration = 80;
    this.turnSpeed = 2.5;
    this.drifting = false;
    this.driftFactor = 0;
    this.driftTrail = [];
    this.boost = false;
    this.boostMultiplier = 1.5;
  }
  
  update(deltaTime: number) {
    // Apply physics
    const frictionFactor = 0.98;
    this.velocity *= frictionFactor;
    
    // Calculate drift effect
    let effectiveAngle = this.angle;
    if (this.drifting) {
      this.driftFactor = Math.min(this.driftFactor + deltaTime * 2, 0.8);
      // Add drift trail
      if (Math.abs(this.velocity) > 50) {
        this.driftTrail.push({
          x: this.x,
          y: this.y,
          opacity: 0.7
        });
        
        // Limit trail length
        if (this.driftTrail.length > 20) {
          this.driftTrail.shift();
        }
      }
    } else {
      this.driftFactor = Math.max(this.driftFactor - deltaTime * 3, 0);
    }
    
    // Reduce drift trail opacity over time
    this.driftTrail = this.driftTrail
      .map(point => ({ ...point, opacity: point.opacity - deltaTime * 1.5 }))
      .filter(point => point.opacity > 0);
    
    // Apply drift to effective angle
    const driftAngle = this.driftFactor * Math.sign(this.velocity) * 0.6;
    effectiveAngle += driftAngle;
    
    // Move car
    const moveX = Math.sin(effectiveAngle) * this.velocity * deltaTime;
    const moveY = -Math.cos(effectiveAngle) * this.velocity * deltaTime;
    
    this.x += moveX;
    this.y += moveY;
  }
  
  accelerate(deltaTime: number) {
    const accelerationRate = this.acceleration * (this.boost ? this.boostMultiplier : 1);
    this.velocity = Math.min(
      this.velocity + accelerationRate * deltaTime,
      this.maxVelocity * (this.boost ? this.boostMultiplier : 1)
    );
    
    // Check for drift conditions
    if (Math.abs(this.velocity) > this.maxVelocity * 0.7) {
      this.drifting = true;
    }
  }
  
  brake(deltaTime: number) {
    // Apply brakes
    if (this.velocity > 0) {
      this.velocity = Math.max(0, this.velocity - this.deceleration * 2 * deltaTime);
    } else if (this.velocity <= 0) {
      // Reverse
      this.velocity = Math.max(-this.maxVelocity / 2, this.velocity - this.acceleration * 0.5 * deltaTime);
    }
    
    // Stop drifting when braking hard
    if (Math.abs(this.velocity) < this.maxVelocity * 0.4) {
      this.drifting = false;
    }
  }
  
  releaseAccelerator(deltaTime: number) {
    // Natural deceleration
    if (this.velocity > 0) {
      this.velocity = Math.max(0, this.velocity - this.deceleration * deltaTime);
    } else if (this.velocity < 0) {
      this.velocity = Math.min(0, this.velocity + this.deceleration * deltaTime);
    }
    
    // Stop drifting gradually
    if (Math.abs(this.velocity) < this.maxVelocity * 0.5) {
      this.drifting = false;
    }
  }
  
  turnLeft(deltaTime: number) {
    const turnRate = this.turnSpeed * (this.drifting ? 0.7 : 1) * deltaTime;
    // Scale turn rate with velocity for better handling
    const velocityFactor = Math.abs(this.velocity) / (this.maxVelocity * 0.8);
    this.angle -= turnRate * Math.min(1, velocityFactor);
  }
  
  turnRight(deltaTime: number) {
    const turnRate = this.turnSpeed * (this.drifting ? 0.7 : 1) * deltaTime;
    // Scale turn rate with velocity for better handling
    const velocityFactor = Math.abs(this.velocity) / (this.maxVelocity * 0.8);
    this.angle += turnRate * Math.min(1, velocityFactor);
  }
  
  handleCollision() {
    // Bounce back from collision
    this.velocity = -this.velocity * 0.5;
    
    // Stop drifting
    this.drifting = false;
    this.driftFactor = 0;
  }
  
  activateBoost() {
    this.boost = true;
  }
  
  deactivateBoost() {
    this.boost = false;
  }
  
  getSpeed() {
    return Math.abs(this.velocity);
  }
  
  render(ctx: CanvasRenderingContext2D) {
    // Render drift trail
    this.driftTrail.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(217, 70, 239, ${point.opacity})`;
      ctx.fill();
    });
    
    // Render car
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    // Car body
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    // Car details (windows)
    ctx.fillStyle = '#111';
    ctx.fillRect(-this.width / 3, -this.height / 3, (2 * this.width) / 3, this.height / 5);
    
    // Boost effect
    if (this.boost) {
      ctx.beginPath();
      const glowRadius = 10;
      const gradient = ctx.createRadialGradient(
        0, this.height / 2 + 5,
        0,
        0, this.height / 2 + 5,
        glowRadius
      );
      gradient.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
      gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = gradient;
      ctx.arc(0, this.height / 2 + 5, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}
