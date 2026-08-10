interface Config {
  laneCount: number;
  time: { start: number; max: number; drain: number; clockBonus: number };
  world: {
    safeRows: number;
    checkpointEvery: number;
    aheadRows: number;
    behindRows: number;
  };
  spawn: {
    hole: number;
    rock: number;
    tree: number;
    clock: number;
    heart: number;
    /** Số hàng trống tối thiểu giữa 2 cụm chướng ngại vật. */
    minGapRows: number;
  };
  player: {
    /** Tốc độ chạy lúc mới xuất phát, đơn vị ô/giây. */
    speed: number;
    /** Tốc độ tiệm cận khi đi thật xa — không bao giờ vượt qua. */
    speedLimit: number;
    /** Đi bao nhiêu cấp thì tốc độ đạt ~63% quãng từ `speed` tới `speedLimit`. */
    speedRamp: number;
    brakeTime: number;
    accelTime: number;
    stillSpeed: number;
    laneTime: number;
    reviveGrace: number;
    startShields: number;
    /**
     * Đảo chiều vuốt. Để `true` thì vuốt phải là lách sang trái — có làm game
     * khó hơn thật, nhưng người chơi sẽ đọc đó là lỗi chứ không phải thử thách,
     * nên mặc định để `false`.
     */
    invertSwipe: boolean;
  };
  boss: {
    distance: number;
    countMin: number;
    countMax: number;
    warnMin: number;
    warnMax: number;
    warnFloor: number;
    watchMin: number;
    watchMax: number;
    /** Thời gian nhìn tiệm cận tối đa. */
    watchLimit: number;
    watchRamp: number;
    turnTime: number;
    /**
     * Đầu phải xoay tới mức này mới đủ để bắt được người chơi. Luật phải khớp
     * với thứ mắt nhìn thấy: nó chưa quay hẳn lại mà đã chết thì người chơi thấy
     * oan, không hiểu mình sai ở đâu.
     */
    lethalTurn: number;
  };
  difficulty: {
    rowsPerLevel: number;
    countMaxPerLevel: number;
    warnPerLevel: number;
    /** Đồng hồ trôi nhanh dần mãi không có trần — đây là thứ kết thúc mọi ván. */
    drainPerLevel: number;
    obstacleBumpLimit: number;
    obstacleRamp: number;
  };
  score: { perRow: number; checkpoint: number; clock: number; heart: number };
}

/** Toàn bộ số liệu cân bằng game gom về một chỗ cho dễ chỉnh. */
export const CFG: Config = {
  laneCount: 3,

  time: {
    start: 20,
    max: 26,
    drain: 1,
    clockBonus: 6,
  },

  world: {
    safeRows: 8,
    checkpointEvery: 32,
    aheadRows: 48,
    behindRows: 10,
  },

  spawn: {
    hole: 0.1,
    rock: 0.13,
    tree: 0.14,
    // Xác suất tính trên từng ô trống, mỗi hàng trung bình có ~2,4 ô trống.
    // Ra khoảng 100 ô mới gặp một cái đồng hồ và 300 ô mới gặp một quả cầu hồi
    // sinh — cả ván chỉ vài lần, đúng nghĩa của hiếm.
    clock: 0.004,
    heart: 0.0013,
    minGapRows: 2,
  },

  player: {
    speed: 3.8,
    speedLimit: 7.4,
    speedRamp: 12,
    brakeTime: 0.16,
    accelTime: 0.3,
    stillSpeed: 0.12,
    laneTime: 0.14,
    reviveGrace: 1.8,
    startShields: 0,
    invertSwipe: false,
  },

  boss: {
    distance: 34,
    countMin: 1.6,
    countMax: 4.4,
    warnMin: 0.7,
    warnMax: 1.05,
    warnFloor: 0.42,
    watchMin: 1.1,
    watchMax: 2.2,
    watchLimit: 4.8,
    watchRamp: 10,
    turnTime: 0.18,
    lethalTurn: 0.92,
  },

  difficulty: {
    rowsPerLevel: 30,
    countMaxPerLevel: -0.2,
    warnPerLevel: -0.05,
    drainPerLevel: 0.05,
    obstacleBumpLimit: 0.12,
    obstacleRamp: 10,
  },

  score: {
    perRow: 1,
    checkpoint: 30,
    clock: 6,
    heart: 15,
  },
};

/**
 * Đường cong bão hoà: đi từ 0 lên `limit`, tới cấp `ramp` thì đạt ~63% quãng.
 * Dùng cho những thông số nếu tăng tuyến tính mãi sẽ khiến game không chơi nổi.
 */
function saturate(limit: number, level: number, ramp: number): number {
  return limit * (1 - Math.exp(-level / ramp));
}

/** Không có trần: đi càng xa cấp càng cao, mãi mãi. */
export function levelFor(distance: number): number {
  return Math.max(0, Math.floor(distance / CFG.difficulty.rowsPerLevel));
}

/**
 * Tốc độ tiệm cận `speedLimit`. Không cho tăng vô hạn vì một lần đổi làn mất
 * 0,14 giây — nhanh quá thì có nhìn thấy chướng ngại vật cũng không lách kịp,
 * cái chết thành ra vô lý chứ không phải do chơi dở.
 */
export function speedFor(level: number): number {
  const { speed, speedLimit, speedRamp } = CFG.player;
  return speed + saturate(speedLimit - speed, level, speedRamp);
}

/** Thời gian đếm ngắn dần nhưng phải còn đủ dài để kịp chạy được vài ô. */
export function countMaxFor(level: number): number {
  return Math.max(
    CFG.boss.countMin + 0.4,
    CFG.boss.countMax + level * CFG.difficulty.countMaxPerLevel,
  );
}

/** Cửa sổ cảnh báo hẹp dần nhưng không bao giờ ngắn hơn thời gian phản xạ người. */
export function warnRangeFor(level: number): { lo: number; hi: number } {
  const shrink = level * CFG.difficulty.warnPerLevel;
  const lo = Math.max(CFG.boss.warnFloor, CFG.boss.warnMin + shrink);
  return { lo, hi: Math.max(lo + 0.1, CFG.boss.warnMax + shrink) };
}

/** Thời gian bị nhìn dài dần — đứng im càng lâu càng tốn giờ. */
export function watchMaxFor(level: number): number {
  const { watchMax, watchLimit, watchRamp } = CFG.boss;
  return watchMax + saturate(watchLimit - watchMax, level, watchRamp);
}

/**
 * Tốc độ trôi của đồng hồ, tăng tuyến tính không giới hạn. Đây là thứ duy nhất
 * không bão hoà, nên mọi ván chắc chắn có hồi kết: tới một cấp nào đó, quãng
 * đường giữa hai checkpoint tốn nhiều giờ hơn cả thanh giờ đầy.
 */
export function drainFor(level: number): number {
  return CFG.time.drain + level * CFG.difficulty.drainPerLevel;
}

/** Chướng ngại vật dày thêm nhưng có trần, nếu không mọi hàng đều bịt kín. */
export function obstacleBumpFor(level: number): number {
  return saturate(CFG.difficulty.obstacleBumpLimit, level, CFG.difficulty.obstacleRamp);
}
