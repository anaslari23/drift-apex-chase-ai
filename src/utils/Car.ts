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
  carTexture?: string;
  
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    angle: number = 0,
    carTexture?: string
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
    this.carTexture = carTexture;
    this.targetCheckpoint = 0;
  }
  
  update(deltaTime: number) {
    const frictionFactor = 0.98;
    this.velocity *= frictionFactor;
    
    let effectiveAngle = this.angle;
    if (this.drifting) {
      this.driftFactor = Math.min(this.driftFactor + deltaTime * 2, 0.8);
      if (Math.abs(this.velocity) > 50) {
        this.driftTrail.push({
          x: this.x,
          y: this.y,
          opacity: 0.7
        });
        if (this.driftTrail.length > 20) {
          this.driftTrail.shift();
        }
      }
    } else {
      this.driftFactor = Math.max(this.driftFactor - deltaTime * 3, 0);
    }
    
    this.driftTrail = this.driftTrail
      .map(point => ({ ...point, opacity: point.opacity - deltaTime * 1.5 }))
      .filter(point => point.opacity > 0);
    
    const driftAngle = this.driftFactor * Math.sign(this.velocity) * 0.6;
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
    
    if (Math.abs(this.velocity) > this.maxVelocity * 0.7) {
      this.drifting = true;
    }
  }
  
  brake(deltaTime: number) {
    if (this.velocity > 0) {
      this.velocity = Math.max(0, this.velocity - this.deceleration * 2 * deltaTime);
    } else if (this.velocity <= 0) {
      this.velocity = Math.max(-this.maxVelocity / 2, this.velocity - this.acceleration * 0.5 * deltaTime);
    }
    
    if (Math.abs(this.velocity) < this.maxVelocity * 0.4) {
      this.drifting = false;
    }
  }
  
  releaseAccelerator(deltaTime: number) {
    if (this.velocity > 0) {
      this.velocity = Math.max(0, this.velocity - this.deceleration * deltaTime);
    } else if (this.velocity < 0) {
      this.velocity = Math.min(0, this.velocity + this.deceleration * deltaTime);
    }
    
    if (Math.abs(this.velocity) < this.maxVelocity * 0.5) {
      this.drifting = false;
    }
  }
  
  turnLeft(deltaTime: number) {
    const turnRate = this.turnSpeed * (this.drifting ? 0.7 : 1) * deltaTime;
    const velocityFactor = Math.abs(this.velocity) / (this.maxVelocity * 0.8);
    this.angle -= turnRate * Math.min(1, velocityFactor);
  }
  
  turnRight(deltaTime: number) {
    const turnRate = this.turnSpeed * (this.drifting ? 0.7 : 1) * deltaTime;
    const velocityFactor = Math.abs(this.velocity) / (this.maxVelocity * 0.8);
    this.angle += turnRate * Math.min(1, velocityFactor);
  }
  
  handleCollision() {
    this.velocity = -this.velocity * 0.5;
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
    this.driftTrail.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(217, 70, 239, ${point.opacity})`;
      ctx.fill();
    });
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width, this.height);
    
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    ctx.fillStyle = '#111122';
    ctx.fillRect(-this.width / 3, -this.height / 3, (2 * this.width) / 3, this.height / 5);
    
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, 4, 4);
    ctx.fillRect(this.width / 2 - 6, -this.height / 2 + 2, 4, 4);
    
    if (this.color === '#8B5CF6') {
      ctx.fillStyle = '#D946EF';
      ctx.fillRect(-this.width / 8, -this.height / 2, this.width / 4, this.height);
    }
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(-this.width / 2 + 1, -this.height / 2 + 4, 6, 10);
    ctx.fillRect(this.width / 2 - 7, -this.height / 2 + 4, 6, 10);
    ctx.fillRect(-this.width / 2 + 1, this.height / 2 - 14, 6, 10);
    ctx.fillRect(this.width / 2 - 7, this.height / 2 - 14, 6, 10);
    
    if (this.boost) {
      const drawFlame = (radius: number, color: string, opacity: number) => {
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          0, this.height / 2 + 5,
          0,
          0, this.height / 2 + 5,
          radius
        );
        gradient.addColorStop(0, `rgba(${color}, ${opacity})`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.arc(0, this.height / 2 + 5, radius, 0, Math.PI * 2);
        ctx.fill();
      };
      
      drawFlame(5, '255, 255, 255', 0.9);
      drawFlame(8, '249, 115, 22', 0.8);
      drawFlame(12, '220, 38, 38', 0.5);
      
      for (let i = 0; i < 3; i++) {
        const particleSize = Math.random() * 3 + 1;
        const distFromCenter = Math.random() * 6 - 3;
        const distBehind = this.height / 2 + 5 + Math.random() * 8 + 4;
        
        ctx.beginPath();
        ctx.arc(distFromCenter, distBehind, particleSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 160, 0, 0.7)';
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}
