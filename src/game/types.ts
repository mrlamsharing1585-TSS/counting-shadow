export type CellType = 'empty' | 'rock' | 'tree' | 'hole';
export type ItemType = 'clock' | 'heart';

export interface Cell {
  type: CellType;
  item: ItemType | null;
  /** Hạt giống riêng cho từng ô để vẽ cây/đá không bị rung khi camera đổi. */
  seed: number;
}

export interface Row {
  z: number;
  cells: [Cell, Cell, Cell];
  checkpoint: boolean;
  /** Checkpoint đã được ăn chưa. */
  claimed: boolean;
}

/** Trạng thái của quản trò (bóng đen). */
export type BossState = 'counting' | 'warning' | 'watching';

export type Phase = 'menu' | 'playing' | 'dying' | 'gameover';

export type DeathCause = 'caught' | 'hole' | 'crash' | 'timeout';
