
export type GameModeType = 'race' | 'challenge' | 'barriers';

export interface GameModeConfig {
  name: string;
  description: string;
  trackSize: { width: number; height: number };
  difficultyMultiplier: number;
  useBarriers: boolean;
  challenges?: {
    type: 'time' | 'drift' | 'boost';
    target: number;
    description: string;
  }[];
  physics: {
    friction: number;
    driftFactor: number;
    boostMultiplier: number;
  };
}

export class GameMode {
  private static modes: Record<GameModeType, GameModeConfig> = {
    race: {
      name: 'Race Mode',
      description: 'Standard race against AI opponents',
      trackSize: { width: 2400, height: 1800 },
      difficultyMultiplier: 1.0,
      useBarriers: true,
      physics: {
        friction: 0.98,
        driftFactor: 1.0,
        boostMultiplier: 1.5
      }
    },
    barriers: {
      name: 'Barriers Mode',
      description: 'Navigate through tight barriers',
      trackSize: { width: 2200, height: 1600 },
      difficultyMultiplier: 0.8,
      useBarriers: true,
      physics: {
        friction: 0.99,
        driftFactor: 0.8,
        boostMultiplier: 1.3
      }
    },
    challenge: {
      name: 'Challenge Mode',
      description: 'Complete specific challenges',
      trackSize: { width: 2000, height: 1500 },
      difficultyMultiplier: 0.9,
      useBarriers: false,
      challenges: [
        {
          type: 'time',
          target: 60,
          description: 'Complete a lap in 60 seconds'
        },
        {
          type: 'drift',
          target: 500,
          description: 'Drift for 500 meters'
        },
        {
          type: 'boost',
          target: 30,
          description: 'Use boost for 30 seconds total'
        }
      ],
      physics: {
        friction: 0.97,
        driftFactor: 1.2,
        boostMultiplier: 1.7
      }
    }
  };

  static getConfig(mode: GameModeType): GameModeConfig {
    return this.modes[mode];
  }

  static getAllModes(): GameModeType[] {
    return Object.keys(this.modes) as GameModeType[];
  }
}
