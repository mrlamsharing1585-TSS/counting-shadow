import { Rng } from '../core/rng';
import { CFG, levelFor, obstacleBumpFor } from './config';
import type { Cell, CellType, Row } from './types';

const EMPTY_CELL = (seed: number): Cell => ({ type: 'empty', item: null, seed });

/**
 * Bản đồ vô tận sinh ngẫu nhiên theo hàng.
 *
 * Vì nhân vật chạy liên tục nên bộ sinh phải bảo đảm 3 điều:
 *  1. Luôn có một "làn an toàn" chạy xuyên suốt, mỗi hàng chỉ lệch tối đa 1 làn.
 *  2. Khi làn an toàn đổi hướng thì ô rẽ ở hàng ngay trước cũng được dọn trống.
 *  3. Các cụm chướng ngại vật cách nhau tối thiểu `minGapRows` hàng để người chơi
 *     kịp nhìn và vuốt.
 */
export class World {
  private rows = new Map<number, Row>();
  private pathLane = 1;
  private rowsSinceObstacle = 99;
  private generatedTo = -1;

  constructor(private readonly rng: Rng) {
    this.ensureAhead(0);
  }

  reset(): void {
    this.rows.clear();
    this.pathLane = 1;
    this.rowsSinceObstacle = 99;
    this.generatedTo = -1;
    this.ensureAhead(0);
  }

  row(z: number): Row | undefined {
    return this.rows.get(z);
  }

  cell(z: number, lane: number): Cell | undefined {
    return this.rows.get(z)?.cells[lane];
  }

  /** Ô có chạy qua được không. Đá, cây và hố đều chặn — chạm vào là thua. */
  isFree(z: number, lane: number): boolean {
    if (lane < 0 || lane >= CFG.laneCount) return false;
    return this.cell(z, lane)?.type === 'empty';
  }

  takeItem(z: number, lane: number): Cell['item'] {
    const c = this.cell(z, lane);
    if (!c || !c.item) return null;
    const item = c.item;
    c.item = null;
    return item;
  }

  /** Sinh thêm hàng phía trước và xoá hàng đã đi qua. */
  ensureAhead(playerZ: number): void {
    const target = Math.floor(playerZ) + CFG.world.aheadRows;
    while (this.generatedTo < target) {
      this.generatedTo++;
      this.rows.set(this.generatedTo, this.generateRow(this.generatedTo));
      this.ensureEscapes(this.generatedTo - 1);
    }
    const cutoff = Math.floor(playerZ) - CFG.world.behindRows;
    for (const z of this.rows.keys()) {
      if (z < cutoff) this.rows.delete(z);
    }
  }

  /** Duyệt các hàng trong tầm nhìn, từ xa về gần (thứ tự vẽ). */
  *visible(fromZ: number, toZ: number): Generator<Row> {
    for (let z = Math.ceil(toZ); z >= Math.floor(fromZ); z--) {
      const r = this.rows.get(z);
      if (r) yield r;
    }
  }

  private generateRow(z: number): Row {
    const seedBase = this.rng.int(0, 1 << 20);
    const cells: [Cell, Cell, Cell] = [
      EMPTY_CELL(seedBase),
      EMPTY_CELL(seedBase * 7 + 1),
      EMPTY_CELL(seedBase * 13 + 2),
    ];
    const checkpoint = z > 0 && z % CFG.world.checkpointEvery === 0;
    const row: Row = { z, cells, checkpoint, claimed: false };

    // Vùng khởi động và hàng checkpoint để trống hoàn toàn.
    if (z <= CFG.world.safeRows || checkpoint) {
      this.rowsSinceObstacle++;
      return row;
    }

    // Hàng đệm giữa hai cụm chướng ngại vật: không có vật cản nhưng vẫn có thể
    // rơi vật phẩm, nhờ vậy đồng hồ không phải lúc nào cũng nằm cạnh cục đá.
    if (this.rowsSinceObstacle < CFG.spawn.minGapRows) {
      this.rowsSinceObstacle++;
      this.rollItems(row);
      return row;
    }

    if (this.rng.chance(0.4)) {
      const dir = this.rng.chance(0.5) ? -1 : 1;
      const next = this.pathLane + dir;
      if (next >= 0 && next < CFG.laneCount) {
        // Đổi làn an toàn: dọn sẵn ô rẽ ở hàng ngay trước.
        this.clearCell(z - 1, next);
        this.pathLane = next;
      }
    }

    const bump = obstacleBumpFor(levelFor(z));
    let placed = false;
    for (let lane = 0; lane < CFG.laneCount; lane++) {
      if (lane === this.pathLane) continue;
      const type = this.rollObstacle(bump);
      cells[lane].type = type;
      if (type !== 'empty') placed = true;
    }

    this.rowsSinceObstacle = placed ? 0 : this.rowsSinceObstacle + 1;
    this.rollItems(row);
    return row;
  }

  /**
   * Bảo đảm không có ngõ cụt: từ bất kỳ ô nào người chơi đứng được,
   * luôn còn ít nhất một nước — sang trái, sang phải, hoặc chạy thẳng.
   */
  private ensureEscapes(z: number): void {
    const row = this.rows.get(z);
    if (!row || z <= CFG.world.safeRows) return;

    for (let lane = 0; lane < CFG.laneCount; lane++) {
      if (row.cells[lane].type !== 'empty') continue;
      const escapes = [this.cell(z, lane - 1), this.cell(z, lane + 1), this.cell(z + 1, lane)];
      if (escapes.some((c) => c?.type === 'empty')) continue;
      this.clearCell(z + 1, lane);
    }
  }

  /** Dọn một đoạn đường thẳng — dùng sau khi hồi sinh để không chết lại ngay. */
  clearPath(z: number, lane: number, rows: number): void {
    for (let i = 0; i <= rows; i++) this.clearCell(z + i, lane);
  }

  /** Dọn trống một ô đã sinh trước đó (dùng để bảo đảm lối đi luôn thông). */
  private clearCell(z: number, lane: number): void {
    const cell = this.rows.get(z)?.cells[lane];
    if (cell && cell.type !== 'empty') cell.type = 'empty';
  }

  private rollObstacle(bump: number): CellType {
    const r = this.rng.next();
    const hole = CFG.spawn.hole + bump;
    const rock = hole + CFG.spawn.rock + bump;
    const tree = rock + CFG.spawn.tree + bump;
    if (r < hole) return 'hole';
    if (r < rock) return 'rock';
    if (r < tree) return 'tree';
    return 'empty';
  }

  private rollItems(row: Row): void {
    for (const cell of row.cells) {
      if (cell.type !== 'empty') continue;
      if (this.rng.chance(CFG.spawn.heart)) cell.item = 'heart';
      else if (this.rng.chance(CFG.spawn.clock)) cell.item = 'clock';
    }
  }
}
