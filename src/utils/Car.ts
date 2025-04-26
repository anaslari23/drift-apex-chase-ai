
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
  targetCheckpoint?: number;
  
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
    this.acceleration = 200;
    this.deceleration = 120;
    this.turnSpeed = 3.0;
    this.drifting = false;
    this.driftFactor = 0;
    this.driftTrail = [];
    this.boost = false;
    this.boostMultiplier = 1.5;
    this.targetCheckpoint = 0;
  }
  
  update(deltaTime: number) {
    // Apply improved friction and handling
    const frictionFactor = 0.97;
    this.velocity *= frictionFactor;
    
    let effectiveAngle = this.angle;
    if (this.drifting) {
      this.driftFactor = Math.min(this.driftFactor + deltaTime * 2.5, 0.9);
      if (Math.abs(this.velocity) > 50) {
        this.driftTrail.push({
          x: this.x,
          y: this.y,
          opacity: 0.8
        });
        if (this.driftTrail.length > 25) {
          this.driftTrail.shift();
        }
      }
    } else {
      this.driftFactor = Math.max(this.driftFactor - deltaTime * 4, 0);
    }
    
    this.driftTrail = this.driftTrail
      .map(point => ({ ...point, opacity: point.opacity - deltaTime }))
      .filter(point => point.opacity > 0);
    
    const driftAngle = this.driftFactor * Math.sign(this.velocity) * 0.7;
    effectiveAngle += driftAngle;
    
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
  }
  
  brake(deltaTime: number) {
    if (this.velocity > 0) {
      this.velocity = Math.max(0, this.velocity - this.deceleration * 2 * deltaTime);
    } else {
      this.velocity = Math.min(0, this.velocity + this.deceleration * 2 * deltaTime);
    }
    this.drifting = false;
  }
  
  releaseAccelerator(deltaTime: number) {
    const decelerationRate = this.deceleration * (this.drifting ? 0.5 : 1);
    if (this.velocity > 0) {
      this.velocity = Math.max(0, this.velocity - decelerationRate * deltaTime);
    } else if (this.velocity < 0) {
      this.velocity = Math.min(0, this.velocity + decelerationRate * deltaTime);
    }
  }
  
  turnLeft(deltaTime: number) {
    const turnRate = this.turnSpeed * (this.drifting ? 0.8 : 1) * deltaTime;
    const velocityFactor = Math.abs(this.velocity) / (this.maxVelocity * 0.7);
    this.angle -= turnRate * Math.min(1, velocityFactor);
  }
  
  turnRight(deltaTime: number) {
    const turnRate = this.turnSpeed * (this.drifting ? 0.8 : 1) * deltaTime;
    const velocityFactor = Math.abs(this.velocity) / (this.maxVelocity * 0.7);
    this.angle += turnRate * Math.min(1, velocityFactor);
  }
  
  handleCollision() {
    this.velocity = -this.velocity * 0.3;
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
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(217, 70, 239, ${point.opacity})`;
      ctx.fill();
    });
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    // Car shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width, this.height);
    
    // Car body
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    // Windshield
    ctx.fillStyle = '#111122';
    ctx.fillRect(-this.width / 3, -this.height / 3, (2 * this.width) / 3, this.height / 5);
    
    // Headlights
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, 4, 4);
    ctx.fillRect(this.width / 2 - 6, -this.height / 2 + 2, 4, 4);
    
    // Racing stripes for player car
    if (this.color === '#8B5CF6') {
      ctx.fillStyle = '#D946EF';
      ctx.fillRect(-this.width / 8, -this.height / 2, this.width / 4, this.height);
    }
    
    // Wheels
    ctx.fillStyle = '#000000';
    ctx.fillRect(-this.width / 2 + 1, -this.height / 2 + 4, 6, 10);
    ctx.fillRect(this.width / 2 - 7, -this.height / 2 + 4, 6, 10);
    ctx.fillRect(-this.width / 2 + 1, this.height / 2 - 14, 6, 10);
    ctx.fillRect(this.width / 2 - 7, this.height / 2 - 14, 6, 10);
    
    // Boost effect
    if (this.boost) {
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(
        0, this.height / 2 + 5, 0,
        0, this.height / 2 + 5, 15
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.2, 'rgba(249, 115, 22, 0.8)');
      gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = gradient;
      ctx.arc(0, this.height / 2 + 5, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}
