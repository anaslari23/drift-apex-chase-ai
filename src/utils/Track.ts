export class Track {
  width: number;
  height: number;
  trackWidth: number;
  checkpoints: Array<{ x: number, y: number }>;
  barriers: Array<{ x1: number, y1: number, x2: number, y2: number }>;
  startPosition: { x: number, y: number };
  startAngle: number;
  decorations: Array<{ x: number, y: number, type: string, size: number, rotation: number }>;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.trackWidth = 120;
    this.startPosition = { x: width / 2, y: height / 2 + 200 };
    this.startAngle = -Math.PI / 2; // Pointing upward
    
    // Define track layout
    this.checkpoints = this.generateCheckpoints();
    this.barriers = this.generateBarriers();
    this.decorations = this.generateDecorations();
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
  
  private generateDecorations() {
    const decorations = [];
    
    // Add trees, rocks, billboards around the track
    for (let i = 0; i < 50; i++) {
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
          if (dist < this.trackWidth * 1.2) {
            isValid = false;
            break;
          }
        }
      } while (!isValid);
      
      // Choose decoration type
      const types = ['tree', 'rock', 'billboard', 'tire-stack'];
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
    for (let i = 0; i < 10; i++) {
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
    
    return decorations;
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
      }
      
      ctx.restore();
    }
  }
}
