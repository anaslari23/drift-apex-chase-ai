
export class Track {
  width: number;
  height: number;
  trackWidth: number;
  checkpoints: Array<{ x: number, y: number }>;
  barriers: Array<{ x1: number, y1: number, x2: number, y2: number }>;
  startPosition: { x: number, y: number };
  startAngle: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.trackWidth = 120;
    this.startPosition = { x: width / 2, y: height / 2 + 200 };
    this.startAngle = -Math.PI / 2; // Pointing upward
    
    // Define track layout
    this.checkpoints = this.generateCheckpoints();
    this.barriers = this.generateBarriers();
  }
  
  private generateCheckpoints() {
    // Create track checkpoints with a race circuit layout
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = 400;
    
    const points = [];
    
    // Start/finish line
    points.push({ x: centerX, y: centerY + radius / 2 });
    
    // First turn
    points.push({ x: centerX - radius / 3, y: centerY });
    
    // Back straight
    points.push({ x: centerX - radius, y: centerY - radius / 3 });
    
    // Second turn
    points.push({ x: centerX - radius / 2, y: centerY - radius });
    
    // Third turn
    points.push({ x: centerX + radius / 2, y: centerY - radius / 2 });
    
    // Fourth turn
    points.push({ x: centerX + radius, y: centerY });
    
    // Final straight leading back to start
    points.push({ x: centerX + radius / 2, y: centerY + radius / 3 });
    
    return points;
  }
  
  private generateBarriers() {
    // Create track barriers based on checkpoint positions
    const barriers = [];
    const innerOffset = this.trackWidth / 2;
    const outerOffset = this.trackWidth / 2;
    
    // Connect the checkpoints with barriers
    for (let i = 0; i < this.checkpoints.length; i++) {
      const current = this.checkpoints[i];
      const next = this.checkpoints[(i + 1) % this.checkpoints.length];
      
      // Calculate direction vector between checkpoints
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // Normalize
      const nx = dx / length;
      const ny = dy / length;
      
      // Perpendicular vector
      const px = -ny;
      const py = nx;
      
      // Inner barrier
      barriers.push({
        x1: current.x + px * innerOffset,
        y1: current.y + py * innerOffset,
        x2: next.x + px * innerOffset,
        y2: next.y + py * innerOffset
      });
      
      // Outer barrier
      barriers.push({
        x1: current.x - px * outerOffset,
        y1: current.y - py * outerOffset,
        x2: next.x - px * outerOffset,
        y2: next.y - py * outerOffset
      });
    }
    
    return barriers;
  }
  
  checkCollision(car: any): boolean {
    // Simple collision detection with barriers
    for (const barrier of this.barriers) {
      // Check if car is close to this barrier segment
      // Simple approximation - check distance from center of car to line segment
      const d = this.distanceToLineSegment(
        car.x, car.y,
        barrier.x1, barrier.y1,
        barrier.x2, barrier.y2
      );
      
      if (d < car.width / 2) {
        return true;
      }
    }
    
    return this.isPointOutOfBounds(car.x, car.y);
  }
  
  isPointOutOfBounds(x: number, y: number): boolean {
    // Check if a point is outside the track boundaries
    // This is a simplification - we should ideally check if the point is between
    // the inner and outer barriers, but for simplicity we'll just check if it's
    // close to any barrier
    for (const barrier of this.barriers) {
      const d = this.distanceToLineSegment(
        x, y,
        barrier.x1, barrier.y1,
        barrier.x2, barrier.y2
      );
      
      if (d < 10) {
        return true;
      }
    }
    
    // Also check if car is way outside the track area
    if (
      x < 0 || x > this.width ||
      y < 0 || y > this.height
    ) {
      return true;
    }
    
    return false;
  }
  
  checkCheckpoint(car: any): string | null {
    // Check if car has passed a checkpoint
    for (let i = 0; i < this.checkpoints.length; i++) {
      const checkpoint = this.checkpoints[i];
      
      const d = Math.sqrt(
        Math.pow(car.x - checkpoint.x, 2) +
        Math.pow(car.y - checkpoint.y, 2)
      );
      
      if (d < 50) {
        // Return 'finish' for the first checkpoint which is also the finish line
        return i === 0 ? 'finish' : 'checkpoint';
      }
    }
    
    return null;
  }
  
  private distanceToLineSegment(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    // Calculates the minimum distance between point (px, py) and line segment (x1, y1) - (x2, y2)
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) {
      param = dot / len_sq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  render(ctx: CanvasRenderingContext2D) {
    // Draw track background
    ctx.fillStyle = '#F2FCE2'; // Grass
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw track
    ctx.save();
    ctx.beginPath();
    
    // Draw track by connecting checkpoints with wide lines
    const first = this.checkpoints[0];
    ctx.moveTo(first.x, first.y);
    
    for (let i = 1; i <= this.checkpoints.length; i++) {
      const checkpoint = this.checkpoints[i % this.checkpoints.length];
      ctx.lineTo(checkpoint.x, checkpoint.y);
    }
    
    ctx.closePath();
    ctx.lineWidth = this.trackWidth;
    ctx.strokeStyle = '#1A1A1A'; // Track color
    ctx.stroke();
    
    // Draw track barriers
    for (const barrier of this.barriers) {
      ctx.beginPath();
      ctx.moveTo(barrier.x1, barrier.y1);
      ctx.lineTo(barrier.x2, barrier.y2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#F97316'; // Barrier color
      ctx.stroke();
    }
    
    // Draw checkpoints
    for (let i = 0; i < this.checkpoints.length; i++) {
      const checkpoint = this.checkpoints[i];
      
      ctx.beginPath();
      ctx.arc(checkpoint.x, checkpoint.y, 10, 0, Math.PI * 2);
      
      // Start/finish is different color
      if (i === 0) {
        ctx.fillStyle = '#F97316'; // Finish line color
      } else {
        ctx.fillStyle = '#1EAEDB'; // Checkpoint color
      }
      
      ctx.fill();
    }
    
    // Draw start line
    const startDir = { x: Math.sin(this.startAngle), y: -Math.cos(this.startAngle) };
    const perpDir = { x: -startDir.y, y: startDir.x };
    
    ctx.beginPath();
    ctx.moveTo(
      this.startPosition.x + perpDir.x * this.trackWidth / 2,
      this.startPosition.y + perpDir.y * this.trackWidth / 2
    );
    ctx.lineTo(
      this.startPosition.x - perpDir.x * this.trackWidth / 2,
      this.startPosition.y - perpDir.y * this.trackWidth / 2
    );
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white';
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
  }
}
