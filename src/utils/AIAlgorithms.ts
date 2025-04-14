// Advanced AI algorithms for racing game

import { Car } from './Car';
import { Track } from './Track';

// Neural Network class for AI learning
export class NeuralNetwork {
  layers: number[];
  weights: number[][][];
  biases: number[][];

  constructor(layers: number[]) {
    this.layers = layers;
    this.weights = [];
    this.biases = [];
    
    // Initialize weights and biases
    for (let i = 0; i < layers.length - 1; i++) {
      const layerWeights: number[][] = [];
      const layerBiases: number[] = [];
      
      for (let j = 0; j < layers[i + 1]; j++) {
        const neuronWeights: number[] = [];
        for (let k = 0; k < layers[i]; k++) {
          neuronWeights.push(Math.random() * 2 - 1); // Random weights between -1 and 1
        }
        layerWeights.push(neuronWeights);
        layerBiases.push(Math.random() * 2 - 1); // Random bias between -1 and 1
      }
      
      this.weights.push(layerWeights);
      this.biases.push(layerBiases);
    }
  }

  // Forward propagation
  forward(inputs: number[]): number[] {
    let activations = inputs;
    
    for (let i = 0; i < this.weights.length; i++) {
      const newActivations: number[] = [];
      
      for (let j = 0; j < this.weights[i].length; j++) {
        let sum = this.biases[i][j];
        for (let k = 0; k < this.weights[i][j].length; k++) {
          sum += this.weights[i][j][k] * activations[k];
        }
        newActivations.push(this.relu(sum));
      }
      
      activations = newActivations;
    }
    
    return this.softmax(activations);
  }

  // ReLU activation function
  private relu(x: number): number {
    return Math.max(0, x);
  }

  // Softmax for output layer
  private softmax(arr: number[]): number[] {
    const exp = arr.map(x => Math.exp(x));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  }

  // Mutate the network (for genetic algorithm)
  mutate(rate: number): void {
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        for (let k = 0; k < this.weights[i][j].length; k++) {
          if (Math.random() < rate) {
            this.weights[i][j][k] += Math.random() * 0.4 - 0.2;
          }
        }
        
        if (Math.random() < rate) {
          this.biases[i][j] += Math.random() * 0.4 - 0.2;
        }
      }
    }
  }

  // Copy weights and biases from another network
  copy(otherNetwork: NeuralNetwork): void {
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        for (let k = 0; k < this.weights[i][j].length; k++) {
          this.weights[i][j][k] = otherNetwork.weights[i][j][k];
        }
        this.biases[i][j] = otherNetwork.biases[i][j];
      }
    }
  }
}

// Bezier curve utility for path planning
export class BezierCurve {
  points: { x: number, y: number }[];
  
  constructor(points: { x: number, y: number }[]) {
    this.points = points;
  }
  
  // Get point at t (0-1)
  getPoint(t: number): { x: number, y: number } {
    if (this.points.length === 1) {
      return this.points[0];
    }
    
    const newPoints: { x: number, y: number }[] = [];
    for (let i = 0; i < this.points.length - 1; i++) {
      newPoints.push({
        x: (1 - t) * this.points[i].x + t * this.points[i + 1].x,
        y: (1 - t) * this.points[i].y + t * this.points[i + 1].y
      });
    }
    
    return new BezierCurve(newPoints).getPoint(t);
  }
  
  // Generate a series of points along the curve
  generatePoints(count: number): { x: number, y: number }[] {
    const points: { x: number, y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      points.push(this.getPoint(t));
    }
    return points;
  }
}

// Ray casting for improved collision detection
export class RayCaster {
  static castRays(source: { x: number, y: number, angle: number }, 
                 track: Track, 
                 rayCount: number = 9, 
                 rayLength: number = 150, 
                 raySpread: number = Math.PI * 0.8): number[] {
    const rayDistances: number[] = [];
    
    // Cast rays at different angles
    for (let i = 0; i < rayCount; i++) {
      const rayAngle = source.angle - raySpread / 2 + (raySpread * i / (rayCount - 1));
      
      const rayEndX = source.x + Math.sin(rayAngle) * rayLength;
      const rayEndY = source.y - Math.cos(rayAngle) * rayLength;
      
      let hitDistance = rayLength;
      
      // Check intersection with all barriers
      for (const barrier of track.barriers) {
        const intersectionPoint = this.lineIntersection(
          source.x, source.y, rayEndX, rayEndY,
          barrier.x1, barrier.y1, barrier.x2, barrier.y2
        );
        
        if (intersectionPoint) {
          const dx = intersectionPoint.x - source.x;
          const dy = intersectionPoint.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < hitDistance) {
            hitDistance = distance;
          }
        }
      }
      
      rayDistances.push(hitDistance);
    }
    
    return rayDistances;
  }
  
  // Check if two line segments intersect
  static lineIntersection(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): { x: number, y: number } | null {
    // Calculate determinants
    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    
    // Lines are parallel or coincident
    if (denominator === 0) {
      return null;
    }
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    
    // Is the intersection along both line segments?
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      return null;
    }
    
    // Return the intersection point
    const x = x1 + ua * (x2 - x1);
    const y = y1 + ua * (y2 - y1);
    
    return { x, y };
  }
}

// Path optimizer using Genetic Algorithm
export class PathOptimizer {
  populationSize: number;
  mutationRate: number;
  track: Track;
  population: { path: { x: number, y: number }[], fitness: number }[];
  
  constructor(track: Track, populationSize: number = 20, mutationRate: number = 0.1) {
    this.track = track;
    this.populationSize = populationSize;
    this.mutationRate = mutationRate;
    this.population = [];
    
    this.initializePopulation();
  }
  
  // Initialize random population of paths
  private initializePopulation(): void {
    for (let i = 0; i < this.populationSize; i++) {
      const path = this.generateRandomPath();
      this.population.push({
        path,
        fitness: this.evaluatePath(path)
      });
    }
  }
  
  // Generate a random path through checkpoints
  private generateRandomPath(): { x: number, y: number }[] {
    const path: { x: number, y: number }[] = [];
    
    for (let i = 0; i < this.track.checkpoints.length; i++) {
      const checkpoint = this.track.checkpoints[i];
      const nextCheckpoint = this.track.checkpoints[(i + 1) % this.track.checkpoints.length];
      
      // Add point at checkpoint
      path.push({ x: checkpoint.x, y: checkpoint.y });
      
      // Add random control points between checkpoints
      const controlPoints = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < controlPoints; j++) {
        const t = (j + 1) / (controlPoints + 1);
        const randomOffset = 50 - Math.random() * 100;
        
        // Direction perpendicular to checkpoint line
        const dx = nextCheckpoint.x - checkpoint.x;
        const dy = nextCheckpoint.y - checkpoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / length;
        const ny = dx / length;
        
        path.push({ 
          x: checkpoint.x + dx * t + nx * randomOffset,
          y: checkpoint.y + dy * t + ny * randomOffset
        });
      }
    }
    
    return path;
  }
  
  // Evaluate fitness of a path (lower is better)
  private evaluatePath(path: { x: number, y: number }[]): number {
    let fitness = 0;
    
    // Length of path (shorter is better)
    for (let i = 0; i < path.length; i++) {
      const next = path[(i + 1) % path.length];
      const dx = next.x - path[i].x;
      const dy = next.y - path[i].y;
      fitness += Math.sqrt(dx * dx + dy * dy);
    }
    
    // Check for barrier collisions (huge penalty)
    for (let i = 0; i < path.length; i++) {
      const next = path[(i + 1) % path.length];
      for (const barrier of this.track.barriers) {
        if (RayCaster.lineIntersection(
          path[i].x, path[i].y, next.x, next.y,
          barrier.x1, barrier.y1, barrier.x2, barrier.y2
        )) {
          fitness += 10000; // Huge penalty for crossing barriers
        }
      }
    }
    
    // Smoothness of path (lower angles are better)
    for (let i = 0; i < path.length; i++) {
      const prev = path[(i - 1 + path.length) % path.length];
      const current = path[i];
      const next = path[(i + 1) % path.length];
      
      const dx1 = current.x - prev.x;
      const dy1 = current.y - prev.y;
      const dx2 = next.x - current.x;
      const dy2 = next.y - current.y;
      
      // Dot product to measure angle
      const dot = dx1 * dx2 + dy1 * dy2;
      const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      if (mag1 > 0 && mag2 > 0) {
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.min(1, Math.max(-1, cosAngle)));
        fitness += angle * 50; // Penalty for sharp turns
      }
    }
    
    return fitness;
  }
  
  // Evolve the population
  evolve(generations: number = 10): { x: number, y: number }[] {
    for (let gen = 0; gen < generations; gen++) {
      // Sort by fitness (lower is better)
      this.population.sort((a, b) => a.fitness - b.fitness);
      
      // Create new generation
      const newPopulation: { path: { x: number, y: number }[], fitness: number }[] = [];
      
      // Keep top performers
      const eliteCount = Math.max(1, Math.floor(this.populationSize * 0.2));
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push(this.population[i]);
      }
      
      // Create offspring
      while (newPopulation.length < this.populationSize) {
        // Tournament selection
        const parent1 = this.tournamentSelect();
        const parent2 = this.tournamentSelect();
        
        // Crossover
        const childPath = this.crossover(parent1.path, parent2.path);
        
        // Mutation
        this.mutate(childPath);
        
        // Add to new population
        newPopulation.push({
          path: childPath,
          fitness: this.evaluatePath(childPath)
        });
      }
      
      this.population = newPopulation;
    }
    
    // Return best path
    this.population.sort((a, b) => a.fitness - b.fitness);
    return this.population[0].path;
  }
  
  // Tournament selection
  private tournamentSelect(): { path: { x: number, y: number }[], fitness: number } {
    const tournamentSize = Math.max(2, Math.floor(this.populationSize * 0.2));
    let best = this.population[Math.floor(Math.random() * this.population.length)];
    
    for (let i = 1; i < tournamentSize; i++) {
      const contestant = this.population[Math.floor(Math.random() * this.population.length)];
      if (contestant.fitness < best.fitness) {
        best = contestant;
      }
    }
    
    return best;
  }
  
  // Crossover two paths
  private crossover(
    path1: { x: number, y: number }[], 
    path2: { x: number, y: number }[]
  ): { x: number, y: number }[] {
    // Ensure paths have the same length
    const minLength = Math.min(path1.length, path2.length);
    const maxLength = Math.max(path1.length, path2.length);
    
    // Crossover point
    const crossPoint = Math.floor(Math.random() * minLength);
    
    // Create child
    const childPath: { x: number, y: number }[] = [];
    
    // Copy segments from parents
    for (let i = 0; i < minLength; i++) {
      if (i < crossPoint) {
        childPath.push({ ...path1[i] });
      } else {
        childPath.push({ ...path2[i] });
      }
    }
    
    // If one parent is longer than the other, add remaining points
    if (path1.length > minLength) {
      for (let i = minLength; i < path1.length; i++) {
        childPath.push({ ...path1[i] });
      }
    } else if (path2.length > minLength) {
      for (let i = minLength; i < path2.length; i++) {
        childPath.push({ ...path2[i] });
      }
    }
    
    return childPath;
  }
  
  // Mutate a path
  private mutate(path: { x: number, y: number }[]): void {
    for (let i = 0; i < path.length; i++) {
      if (Math.random() < this.mutationRate) {
        // Random offset
        path[i].x += (Math.random() * 40) - 20;
        path[i].y += (Math.random() * 40) - 20;
      }
    }
  }
}
