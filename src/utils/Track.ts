export class Track {
  width: number;
  height: number;
  trackWidth: number;
  checkpoints: Array<{ x: number, y: number }>;
  barriers: Array<{ x1: number, y1: number, x2: number, y2: number }>;
  startPosition: { x: number, y: number };
  startAngle: number;
  decorations: Array<{ x: number, y: number, type: string, size: number, rotation: number }>;
  obstacles: Array<{ x: number, y: number, width: number, height: number }>;
  
  constructor(width: number, height: number) {
    this.width = width * 1.5; // Make track 50% bigger
    this.height = height * 1.5;
    this.trackWidth = 180; // Wider track for better racing
    this.startPosition = { x: this.width / 2, y: this.height / 2 + 400 };
    this.startAngle = -Math.PI / 2;
    
    this.checkpoints = this.generateCheckpoints();
    this.barriers = this.generateBarriers();
    this.decorations = this.generateDecorations();
    this.obstacles = this.generateObstacles();
  }
  
  private generateCheckpoints() {
    // Create track checkpoints with a more interesting race circuit layout
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radiusX = 500;
    const radiusY = 350;
    
    const points = [];
    
    // Start/finish line
    points.push({ x: centerX, y: centerY + radiusY });
    
    // First corner (hairpin)
    points.push({ x: centerX - 100, y: centerY + radiusY * 0.7 });
    points.push({ x: centerX - radiusX * 0.7, y: centerY + radiusY * 0.3 });
    
    // Back straight
    points.push({ x: centerX - radiusX * 0.9, y: centerY - radiusY * 0.2 });
    
    // Chicane
    points.push({ x: centerX - radiusX * 0.5, y: centerY - radiusY * 0.5 });
    points.push({ x: centerX - radiusX * 0.2, y: centerY - radiusY * 0.7 });
    
    // Long curve
    points.push({ x: centerX + radiusX * 0.2, y: centerY - radiusY * 0.8 });
    points.push({ x: centerX + radiusX * 0.6, y: centerY - radiusY * 0.6 });
    
    // Final corner
    points.push({ x: centerX + radiusX * 0.8, y: centerY - radiusY * 0.2 });
    points.push({ x: centerX + radiusX * 0.7, y: centerY + radiusY * 0.3 });
    
    // Final straight leading back to start
    points.push({ x: centerX + radiusX * 0.4, y: centerY + radiusY * 0.7 });
    
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
      
      // Add corner supports for more visual interest
      if (i % 2 === 0) {
        // Add perpendicular barriers at some points for "kerbs"
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        
        // Inner kerb
        barriers.push({
          x1: midX + px * innerOffset,
          y1: midY + py * innerOffset,
          x2: midX + px * (innerOffset - 10),
          y2: midY + py * (innerOffset - 10)
        });
        
        // Outer kerb
        barriers.push({
          x1: midX - px * outerOffset,
          y1: midY - py * outerOffset,
          x2: midX - px * (outerOffset - 10),
          y2: midY - py * (outerOffset - 10)
        });
      }
    }
    
    return barriers;
  }
  
  private generateDecorations() {
    const decorations = [];
    
    // Add trees, rocks, billboards around the track
    for (let i = 0; i < 80; i++) {
      // Avoid placing decorations on the track
      let x, y, isValid;
      do {
        x = Math.random() * this.width;
        y = Math.random() * this.height;
        isValid = true;
        
        // Check distance to track centerlines
        for (let j = 0; j < this.checkpoints.length; j++) {
          const cp1 = this.checkpoints[j];
          const cp2 = this.checkpoints[(j + 1) % this.checkpoints.length];
          
          const dist = this.distanceToLineSegment(x, y, cp1.x, cp1.y, cp2.x, cp2.y);
          if (dist < this.trackWidth * 1.5) {
            isValid = false;
            break;
          }
        }
      } while (!isValid);
      
      // Choose decoration type
      const types = ['tree', 'rock', 'billboard', 'tire-stack', 'flag'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      // Varied sizes
      const size = Math.random() * 20 + 15;
      
      // Random rotation for variety
      const rotation = Math.random() * Math.PI * 2;
      
      decorations.push({ x, y, type, size, rotation });
    }
    
    // Add more dense decorations in specific areas
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Add grandstands near start/finish
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI / 4 - Math.PI / 8 + Math.PI / 2;
      const distance = Math.random() * 100 + 300;
      const x = this.startPosition.x + Math.cos(angle) * distance;
      const y = this.startPosition.y + Math.sin(angle) * distance;
      
      decorations.push({
        x,
        y,
        type: 'grandstand',
        size: 50 + Math.random() * 30,
        rotation: angle + Math.PI / 2
      });
    }
    
    // Add starting lights at the start/finish line
    decorations.push({
      x: this.startPosition.x,
      y: this.startPosition.y - 50,
      type: 'start-lights',
      size: 60,
      rotation: this.startAngle
    });
    
    // Add advertising billboards around the track
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      const nextCp = this.checkpoints[(i + 1) % this.checkpoints.length];
      
      const dx = nextCp.x - cp.x;
      const dy = nextCp.y - cp.y;
      const angle = Math.atan2(dy, dx);
      
      // Add billboards perpendicular to the track
      decorations.push({
        x: cp.x + Math.cos(angle + Math.PI/2) * (this.trackWidth + 30),
        y: cp.y + Math.sin(angle + Math.PI/2) * (this.trackWidth + 30),
        type: 'billboard',
        size: 80,
        rotation: angle
      });
      
      // Add billboards on the other side too
      decorations.push({
        x: cp.x + Math.cos(angle - Math.PI/2) * (this.trackWidth + 30),
        y: cp.y + Math.sin(angle - Math.PI/2) * (this.trackWidth + 30),
        type: 'billboard',
        size: 80,
        rotation: angle + Math.PI
      });
    }
    
    return decorations;
  }
  
  private generateObstacles(): Array<{ x: number, y: number, width: number, height: number }> {
    const obstacles = [];
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Add static obstacles around the track
    for (let i = 0; i < this.checkpoints.length; i++) {
      const checkpoint = this.checkpoints[i];
      const nextCheckpoint = this.checkpoints[(i + 1) % this.checkpoints.length];
      
      // Calculate midpoint between checkpoints
      const midX = (checkpoint.x + nextCheckpoint.x) / 2;
      const midY = (checkpoint.y + nextCheckpoint.y) / 2;
      
      // Add random small obstacles
      if (Math.random() > 0.5) {
        obstacles.push({
          x: midX + (Math.random() - 0.5) * this.trackWidth * 0.5,
          y: midY + (Math.random() - 0.5) * this.trackWidth * 0.5,
          width: 20 + Math.random() * 20,
          height: 20 + Math.random() * 20
        });
      }
    }
    
    return obstacles;
  }
  
  checkCollision(car: any): boolean {
    // Check collision with obstacles
    for (const obstacle of this.obstacles) {
      const dx = car.x - obstacle.x;
      const dy = car.y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < (car.width + obstacle.width) / 2) {
        return true;
      }
    }
    
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
    // Draw track background with texture pattern
    const createGrassPattern = () => {
      const patternCanvas = document.createElement('canvas');
      const patternContext = patternCanvas.getContext('2d');
      if (!patternContext) return null;
      
      patternCanvas.width = 20;
      patternCanvas.height = 20;
      
      // Base color
      patternContext.fillStyle = '#F2FCE2';
      patternContext.fillRect(0, 0, 20, 20);
      
      // Add texture dots
      patternContext.fillStyle = '#D9FCB1';
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * 20;
        const y = Math.random() * 20;
        const size = Math.random() * 3 + 1;
        patternContext.beginPath();
        patternContext.arc(x, y, size, 0, Math.PI * 2);
        patternContext.fill();
      }
      
      return ctx.createPattern(patternCanvas, 'repeat');
    };
    
    const grassPattern = createGrassPattern();
    ctx.fillStyle = grassPattern || '#F2FCE2';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw decorations behind the track
    this.renderDecorations(ctx, false);
    
    // Draw track with asphalt texture
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
    
    // Create asphalt texture pattern
    const createAsphaltPattern = () => {
      const patternCanvas = document.createElement('canvas');
      const patternContext = patternCanvas.getContext('2d');
      if (!patternContext) return null;
      
      patternCanvas.width = 40;
      patternCanvas.height = 40;
      
      // Base dark color
      patternContext.fillStyle = '#1A1A1A';
      patternContext.fillRect(0, 0, 40, 40);
      
      // Add texture variations
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 40;
        const y = Math.random() * 40;
        const size = Math.random() * 2 + 0.5;
        const shade = Math.floor(Math.random() * 30) + 30;
        patternContext.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        patternContext.beginPath();
        patternContext.arc(x, y, size, 0, Math.PI * 2);
        patternContext.fill();
      }
      
      return ctx.createPattern(patternCanvas, 'repeat');
    };
    
    const asphaltPattern = createAsphaltPattern();
    ctx.strokeStyle = asphaltPattern || '#1A1A1A';
    ctx.stroke();
    
    // Draw racing lane markings
    this.drawTrackMarkings(ctx);
    
    // Draw track barriers with enhanced visuals
    for (const barrier of this.barriers) {
      ctx.beginPath();
      ctx.moveTo(barrier.x1, barrier.y1);
      ctx.lineTo(barrier.x2, barrier.y2);
      ctx.lineWidth = 5;
      
      // Create gradient for barrier
      const gradientLength = Math.sqrt(
        Math.pow(barrier.x2 - barrier.x1, 2) + 
        Math.pow(barrier.y2 - barrier.y1, 2)
      );
      
      const gradient = ctx.createLinearGradient(
        barrier.x1, barrier.y1,
        barrier.x2, barrier.y2
      );
      
      // Create red and white striped barrier
      for (let i = 0; i <= 10; i++) {
        const color = i % 2 === 0 ? '#F97316' : '#FFFFFF';
        gradient.addColorStop(i / 10, color);
      }
      
      ctx.strokeStyle = gradient;
      ctx.stroke();
    }
    
    // Draw checkpoints with improved visuals
    for (let i = 0; i < this.checkpoints.length; i++) {
      const checkpoint = this.checkpoints[i];
      
      ctx.beginPath();
      ctx.arc(checkpoint.x, checkpoint.y, 10, 0, Math.PI * 2);
      
      // Start/finish is different color with pulsing effect
      if (i === 0) {
        ctx.fillStyle = '#F97316'; // Finish line color
        
        // Add pulses around finish line
        const now = Date.now();
        const pulseSize = 15 + Math.sin(now / 500) * 5;
        ctx.beginPath();
        ctx.arc(checkpoint.x, checkpoint.y, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1EAEDB'; // Checkpoint color
      }
      
      ctx.fill();
    }
    
    // Draw start line with enhanced visuals
    this.drawStartLine(ctx);
    
    // Draw decorations in front of the track
    this.renderDecorations(ctx, true);
    
    // Draw obstacles
    for (const obstacle of this.obstacles) {
      ctx.save();
      ctx.translate(obstacle.x, obstacle.y);
      
      // Create obstacle gradient
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, obstacle.width / 2);
      gradient.addColorStop(0, '#F97316');
      gradient.addColorStop(1, '#EA580C');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Add warning stripes
      ctx.strokeStyle = '#FFDD00';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.restore();
    }
    
    ctx.restore();
  }
  
  private drawTrackMarkings(ctx: CanvasRenderingContext2D) {
    // Draw center lines on the track
    for (let i = 0; i < this.checkpoints.length; i++) {
      const current = this.checkpoints[i];
      const next = this.checkpoints[(i + 1) % this.checkpoints.length];
      
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Normalize direction
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Draw dashed line down the center
      ctx.beginPath();
      ctx.setLineDash([10, 10]);
      ctx.moveTo(current.x, current.y);
      ctx.lineTo(next.x, next.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw small markings along the track edge
      const markingCount = Math.floor(distance / 50);
      for (let j = 0; j < markingCount; j++) {
        const t = j / markingCount;
        const markX = current.x + t * dx;
        const markY = current.y + t * dy;
        
        // Perpendicular direction
        const px = -ny;
        const py = nx;
        
        // Draw small rectangles on track edges
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(
          markX + px * this.trackWidth * 0.4, 
          markY + py * this.trackWidth * 0.4, 
          3, 3
        );
        ctx.fillRect(
          markX - px * this.trackWidth * 0.4, 
          markY - py * this.trackWidth * 0.4, 
          3, 3
        );
      }
    }
  }
  
  private drawStartLine(ctx: CanvasRenderingContext2D) {
    const startDir = { x: Math.sin(this.startAngle), y: -Math.cos(this.startAngle) };
    const perpDir = { x: -startDir.y, y: startDir.x };
    
    // Draw checkered pattern
    const squareSize = 10;
    const totalSquares = Math.floor(this.trackWidth / squareSize);
    
    for (let i = 0; i < totalSquares; i++) {
      const offset = i * squareSize - this.trackWidth / 2;
      const startX = this.startPosition.x + perpDir.x * offset;
      const startY = this.startPosition.y + perpDir.y * offset;
      
      ctx.fillStyle = i % 2 === 0 ? 'white' : 'black';
      
      ctx.beginPath();
      ctx.moveTo(
        startX + startDir.x * squareSize / 2,
        startY + startDir.y * squareSize / 2
      );
      ctx.lineTo(
        startX - startDir.x * squareSize / 2,
        startY - startDir.y * squareSize / 2
      );
      ctx.lineTo(
        startX - startDir.x * squareSize / 2 + perpDir.x * squareSize,
        startY - startDir.y * squareSize / 2 + perpDir.y * squareSize
      );
      ctx.lineTo(
        startX + startDir.x * squareSize / 2 + perpDir.x * squareSize,
        startY + startDir.y * squareSize / 2 + perpDir.y * squareSize
      );
      ctx.closePath();
      ctx.fill();
    }
  }
  
  private renderDecorations(ctx: CanvasRenderingContext2D, foreground: boolean) {
    for (const decoration of this.decorations) {
      // Skip based on foreground/background positioning
      const isForeground = decoration.y < this.height / 2;
      if (foreground !== isForeground) continue;
      
      ctx.save();
      ctx.translate(decoration.x, decoration.y);
      ctx.rotate(decoration.rotation);
      
      switch (decoration.type) {
        case 'tree':
          // Draw tree trunk
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(-decoration.size / 8, -decoration.size / 2, decoration.size / 4, decoration.size / 2);
          
          // Draw tree top
          ctx.beginPath();
          ctx.moveTo(-decoration.size / 2, -decoration.size / 3);
          ctx.lineTo(0, -decoration.size);
          ctx.lineTo(decoration.size / 2, -decoration.size / 3);
          ctx.closePath();
          ctx.fillStyle = '#228B22';
          ctx.fill();
          break;
          
        case 'rock':
          // Draw rock
          ctx.beginPath();
          ctx.ellipse(0, 0, decoration.size / 2, decoration.size / 3, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#888888';
          ctx.fill();
          break;
          
        case 'billboard':
          // Draw billboard post
          ctx.fillStyle = '#555555';
          ctx.fillRect(-decoration.size / 10, -decoration.size / 2, decoration.size / 5, decoration.size / 2);
          
          // Draw billboard
          ctx.fillStyle = '#DDDDDD';
          ctx.fillRect(-decoration.size / 2, -decoration.size, decoration.size, decoration.size / 2);
          
          // Draw text/ad on billboard
          ctx.fillStyle = '#FF3333';
          ctx.font = `${decoration.size / 4}px Arial`;
          ctx.fillText("RACE", -decoration.size / 3, -decoration.size * 0.75);
          break;
          
        case 'tire-stack':
          // Draw stack of tires
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, -i * decoration.size / 5, decoration.size / 4, 0, Math.PI * 2);
            ctx.fillStyle = '#333333';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -i * decoration.size / 5, decoration.size / 6, 0, Math.PI * 2);
            ctx.fillStyle = '#555555';
            ctx.fill();
          }
          break;
          
        case 'grandstand':
          // Draw grandstand
          const rows = 5;
          const width = decoration.size;
          const rowHeight = decoration.size / 10;
          
          // Draw platforms
          for (let i = 0; i < rows; i++) {
            ctx.fillStyle = '#777777';
            ctx.fillRect(
              -width / 2, 
              -i * rowHeight, 
              width, 
              rowHeight
            );
            
            // Draw crowd (dots)
            ctx.fillStyle = '#FFCCAA';
            for (let j = 0; j < width / 5; j++) {
              if (Math.random() > 0.3) {
                const x = -width / 2 + j * 5 + Math.random() * 3;
                const y = -i * rowHeight - rowHeight / 2 + Math.random() * 3;
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          
          // Draw supports
          ctx.fillStyle = '#555555';
          ctx.fillRect(-width / 2, 0, width / 10, rowHeight * 2);
          ctx.fillRect(width / 2 - width / 10, 0, width / 10, rowHeight * 2);
          break;
          
        case 'start-lights':
          // Draw start lights
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(-decoration.size / 2, -decoration.size / 2, decoration.size, decoration.size);
          ctx.beginPath();
          ctx.arc(-decoration.size / 2, -decoration.size / 2, decoration.size / 4, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          break;
      }
      
      ctx.restore();
    }
  }
}
