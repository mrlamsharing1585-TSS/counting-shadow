import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CFG } from '../game/config';
import type { Game } from '../game/game';
import { COLORS, hex } from '../render/palette';
import { buildBoss, buildPlayer, type BossRig, type PlayerRig } from './rigs';

/** Bao nhiêu hàng được dựng hình cùng lúc. */
/**
 * Đủ dài để con đường tan hẳn vào sương mù trước khi hết hàng — nếu không sẽ
 * lộ một mép cụt lơ lửng giữa khoảng trống dưới chân cái đầu.
 */
const VIEW_ROWS = 46;
const BEHIND_ROWS = 4;
const TILE = 0.92;
const TILE_H = 0.34;
const MAX_OBSTACLES = 70;
const MAX_ITEMS = 8;
const BRAZIERS = 5;
const BRAZIER_EVERY = 9;
const BRAZIER_X = 3.4;
const MONOLITHS = 8;

/** Nhân vật được phóng to so với ô để vẫn đọc được trên màn hình dọc. */
const PLAYER_SCALE = 1.65;
/** Bán kính cái đầu khổng lồ ở cuối đường, tính theo đơn vị ô. */
const BOSS_HEAD_R = 4.2;
const BOSS_SCALE = BOSS_HEAD_R / 1.3;
/** Cao độ tâm quả cầu đầu. */
const BOSS_HEAD_Y = 4.6;
/** Khoảng cao độ mà cái đầu loang dần vào sương: trên thì rõ, dưới thì mất hẳn. */
const BOSS_FADE_TOP = 4.15;
const BOSS_FADE_BOTTOM = 0.8;
/** Dải sương chắn ngang, đặt giữa chỗ con đường mờ đi và cái đầu. */
const MIST_AHEAD = 28;

const CAM_BACK = 10.3;
const CAM_HEIGHT = 5.4;
const CAM_LOOK_AHEAD = 4.5;
const CAM_LOOK_Y = 1.3;

const tmp = new Object3D();
const tmpColor = new Color();
const tmpVec = new Vector3();

/** Ảnh quầng sáng tròn dùng cho lửa, cầu linh hồn, đồng hồ. */
function makeGlowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.42)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function glowSprite(tex: CanvasTexture, color: string, size: number): Sprite {
  const s = new Sprite(
    new SpriteMaterial({
      map: tex,
      color: hex(color),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  s.scale.setScalar(size);
  return s;
}

interface ItemSlot {
  group: Group;
  spin: Object3D;
  glow: Sprite;
}

export class Scene3D {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(55, 1, 0.5, 260);

  private sky: Mesh;
  private skyMat: ShaderMaterial;
  private sun: DirectionalLight;
  private bossLight: PointLight;

  private mist: Mesh;
  private slab: Mesh;
  private tiles: InstancedMesh;
  private rocks: InstancedMesh;
  private trunks: InstancedMesh;
  private canopies: InstancedMesh;

  private clocks: ItemSlot[] = [];
  private orbs: ItemSlot[] = [];
  private braziers: Group[] = [];
  private monoliths: Mesh[] = [];

  private player: PlayerRig;
  private boss: BossRig;
  private glowTex = makeGlowTexture();

  private w = 1;
  private h = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(hex(COLORS.skyLow), 1);

    this.scene.fog = new Fog(hex(COLORS.skyMid), 16, 52);

    // ----- trời -----
    this.skyMat = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        cTop: { value: new Color(hex(COLORS.skyTop)) },
        cMid: { value: new Color(hex(COLORS.skyMid)) },
        cLow: { value: new Color(hex(COLORS.skyLow)) },
        cGlow: { value: new Color(hex(COLORS.skyGlow)) },
        heat: { value: 0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cLow; uniform vec3 cGlow;
        uniform float heat;
        varying vec3 vDir;
        void main() {
          float y = vDir.y;
          vec3 c = y > 0.0 ? mix(cMid, cTop, pow(y, 0.65)) : mix(cMid, cLow, pow(-y, 0.5));
          // quầng đỏ ôm lấy chân trời phía trước mặt
          float band = exp(-abs(y) * 5.0) * max(0.0, vDir.z);
          c = mix(c, cGlow, band * (0.6 + heat * 0.4));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new Mesh(new SphereGeometry(140, 24, 16), this.skyMat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // ----- đèn -----
    this.scene.add(new HemisphereLight(0x9d7ee0, 0xc9ae7c, 2.4));
    this.sun = new DirectionalLight(0xfff1d6, 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -8;
    this.sun.shadow.camera.right = 8;
    this.sun.shadow.camera.top = 10;
    this.sun.shadow.camera.bottom = -10;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 44;
    this.sun.shadow.bias = -0.002;
    this.scene.add(this.sun, this.sun.target);

    this.bossLight = new PointLight(0xff2a2a, 0, 42, 2);
    this.scene.add(this.bossLight);

    // ----- khối đá con đường -----
    const slabMat = new MeshStandardMaterial({ color: hex(COLORS.slab), roughness: 0.95 });
    this.slab = new Mesh(new BoxGeometry(3.42, 1.4, 1), slabMat);
    this.slab.receiveShadow = true;
    this.scene.add(this.slab);

    const tileGeo = new BoxGeometry(TILE, TILE_H, TILE);
    const tileMat = new MeshStandardMaterial({ roughness: 0.88, metalness: 0 });
    this.tiles = new InstancedMesh(tileGeo, tileMat, VIEW_ROWS * CFG.laneCount);
    this.tiles.receiveShadow = true;
    this.tiles.castShadow = true;
    this.tiles.frustumCulled = false;
    this.scene.add(this.tiles);

    // ----- chướng ngại vật -----
    const rockGeo = new IcosahedronGeometry(0.4, 0);
    this.rocks = new InstancedMesh(
      rockGeo,
      new MeshStandardMaterial({ color: hex(COLORS.rock), roughness: 1, flatShading: true }),
      MAX_OBSTACLES,
    );
    const trunkGeo = new CylinderGeometry(0.08, 0.12, 0.55, 7);
    trunkGeo.translate(0, 0.275, 0);
    this.trunks = new InstancedMesh(
      trunkGeo,
      new MeshStandardMaterial({ color: hex(COLORS.trunk), roughness: 1 }),
      MAX_OBSTACLES,
    );
    const canopyGeo = new IcosahedronGeometry(0.52, 0);
    this.canopies = new InstancedMesh(
      canopyGeo,
      new MeshStandardMaterial({ color: hex(COLORS.leaf), roughness: 0.95, flatShading: true }),
      MAX_OBSTACLES,
    );
    for (const m of [this.rocks, this.trunks, this.canopies]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      m.count = 0;
      this.scene.add(m);
    }

    this.buildItems();
    this.buildBraziers();
    this.buildMonoliths();

    this.player = buildPlayer();
    this.player.root.scale.setScalar(PLAYER_SCALE);
    this.scene.add(this.player.root);

    this.boss = buildBoss({ top: BOSS_FADE_TOP, bottom: BOSS_FADE_BOTTOM });
    this.boss.root.scale.setScalar(BOSS_SCALE);
    this.scene.add(this.boss.root);

    this.mist = this.buildMist();
    this.scene.add(this.mist);
  }

  // ------------------------------------------------------------ khởi tạo

  private buildItems(): void {
    const clockBody = new MeshStandardMaterial({
      color: hex(COLORS.clockBody),
      roughness: 0.4,
      emissive: new Color(hex(COLORS.clockBody)),
      emissiveIntensity: 0.35,
    });
    const faceMat = new MeshStandardMaterial({ color: hex(COLORS.clockFace), roughness: 0.5 });
    const goldMat = new MeshStandardMaterial({ color: hex(COLORS.gold), roughness: 0.3, metalness: 0.6 });

    const handMat = new MeshStandardMaterial({ color: 0x2b2118, roughness: 0.6 });
    for (let i = 0; i < MAX_ITEMS; i++) {
      const group = new Group();
      // `spin` giữ nguyên hướng mặt số về phía camera, chỉ lắc nhẹ cho sinh động.
      const spin = new Group();

      const body = new Mesh(new CylinderGeometry(0.3, 0.3, 0.14, 20), clockBody);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      const face = new Mesh(new CylinderGeometry(0.22, 0.22, 0.16, 20), faceMat);
      face.rotation.x = Math.PI / 2;

      const hourHand = new Mesh(new BoxGeometry(0.035, 0.14, 0.02), handMat);
      hourHand.position.set(0, 0.07, -0.09);
      const minHand = new Mesh(new BoxGeometry(0.035, 0.19, 0.02), handMat);
      minHand.position.set(0.07, -0.03, -0.09);
      minHand.rotation.z = 1.9;

      spin.add(body, face, hourHand, minHand);
      for (const s of [-1, 1]) {
        const bell = new Mesh(new SphereGeometry(0.11, 10, 8), goldMat);
        bell.position.set(s * 0.23, 0.24, 0);
        spin.add(bell);
      }

      const glow = glowSprite(this.glowTex, '#ffa63c', 1.6);
      group.add(spin, glow);
      group.visible = false;
      this.scene.add(group);
      this.clocks.push({ group, spin, glow });
    }

    const orbMat = new MeshStandardMaterial({
      color: hex(COLORS.orb),
      roughness: 0.15,
      metalness: 0.1,
      emissive: new Color(hex(COLORS.orb)),
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.92,
    });
    for (let i = 0; i < MAX_ITEMS; i++) {
      const group = new Group();
      const spin = new Mesh(new SphereGeometry(0.3, 18, 14), orbMat);
      const ring = new Mesh(new TorusGeometry(0.24, 0.07, 8, 18), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.26;
      spin.add(ring);
      const glow = glowSprite(this.glowTex, COLORS.orb, 1.8);
      group.add(spin, glow);
      group.visible = false;
      this.scene.add(group);
      this.orbs.push({ group, spin, glow });
    }
  }

  private buildBraziers(): void {
    const stone = new MeshStandardMaterial({ color: 0x3b3547, roughness: 1 });
    const flameMat = new MeshBasicMaterial({ color: hex(COLORS.flame), fog: false });
    for (let i = 0; i < BRAZIERS; i++) {
      const g = new Group();
      const base = new Mesh(new BoxGeometry(1.3, 1.1, 1.3), stone);
      base.position.y = -0.55;
      base.castShadow = true;
      const bowl = new Mesh(new CylinderGeometry(0.38, 0.28, 0.22, 12), stone);
      bowl.position.y = 0.11;
      const flame = new Mesh(new ConeGeometry(0.26, 0.85, 10), flameMat);
      flame.position.y = 0.62;
      flame.name = 'flame';
      const glow = glowSprite(this.glowTex, COLORS.flame, 3.4);
      glow.position.y = 0.6;
      g.add(base, bowl, flame, glow);
      g.visible = false;
      this.scene.add(g);
      this.braziers.push(g);
    }
  }

  /**
   * Dải sương chắn ngang chân trời: một tấm phẳng lớn với gradient dọc, dày ở
   * dưới và tan hết ở trên. Vừa nuốt gọn đoạn cuối con đường, vừa là cái để nửa
   * dưới quản trò chìm vào.
   */
  private buildMist(): Mesh {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const g = c.getContext('2d')!;
    // v = 1 ứng với đỉnh tấm, tức y = 0 của canvas.
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(58,36,74,0)');
    grad.addColorStop(0.2, 'rgba(58,36,74,0)');
    grad.addColorStop(0.48, 'rgba(52,30,66,0.85)');
    grad.addColorStop(1, 'rgba(30,18,44,0.96)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);

    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    const mesh = new Mesh(
      new PlaneGeometry(170, 26),
      new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }),
    );
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    return mesh;
  }

  private buildMonoliths(): void {
    const stone = new MeshStandardMaterial({ color: hex(COLORS.monolith), roughness: 1 });
    const runeMat = new MeshBasicMaterial({ color: hex(COLORS.rune), fog: false });
    for (let i = 0; i < MONOLITHS; i++) {
      const m = new Mesh(new BoxGeometry(2.6, 20, 2.6), stone);
      const rune = new Mesh(new PlaneGeometry(0.9, 0.9), runeMat);
      rune.rotation.z = Math.PI / 4;
      rune.position.set(0, 4, -1.32);
      m.add(rune);
      const glow = glowSprite(this.glowTex, COLORS.rune, 4);
      glow.position.set(0, 4, -1.5);
      m.add(glow);
      this.scene.add(m);
      this.monoliths.push(m);
    }
  }

  // ------------------------------------------------------------- vòng lặp

  resize(w: number, h: number, dpr: number): void {
    this.w = w;
    this.h = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(dpr, 2));
    this.renderer.setSize(w, h, false);
  }

  /** Đồng bộ toàn bộ cảnh với trạng thái game rồi vẽ. */
  render(game: Game): void {
    const pz = game.player.z;
    const shakeX = game.effects.offsetX * 0.012;
    const shakeY = game.effects.offsetY * 0.012;

    this.camera.position.set(shakeX, CAM_HEIGHT + shakeY, pz - CAM_BACK);
    this.camera.lookAt(0, CAM_LOOK_Y, pz + CAM_LOOK_AHEAD);
    this.sky.position.copy(this.camera.position);

    const danger = game.phase === 'playing' && game.boss.state !== 'counting' ? 1 : 0;
    this.skyMat.uniforms.heat.value += (danger - this.skyMat.uniforms.heat.value) * 0.12;

    this.sun.position.set(-7, 15, pz - 2);
    this.sun.target.position.set(0, 0, pz + 5);
    this.sun.target.updateMatrixWorld();

    this.slab.position.set(0, -TILE_H / 2 - 0.7, pz + (VIEW_ROWS - BEHIND_ROWS) / 2 - BEHIND_ROWS / 2);
    this.slab.scale.z = VIEW_ROWS + 6;

    // Tấm sương giữ nguyên khoảng cách tới người chơi, tâm đặt thấp để phần dày
    // nằm quanh mặt đường.
    this.mist.position.set(0, -3, pz + MIST_AHEAD);

    this.syncTiles(game);
    this.syncObstacles(game);
    this.syncItems(game);
    this.syncBraziers(game);
    this.syncMonoliths(pz);
    this.syncPlayer(game);
    this.syncBoss(game);

    this.renderer.render(this.scene, this.camera);
  }

  private syncTiles(game: Game): void {
    const base = Math.floor(game.player.z) - BEHIND_ROWS;
    let i = 0;
    for (let r = 0; r < VIEW_ROWS; r++) {
      const z = base + r;
      const row = game.world.row(z);
      for (let lane = 0; lane < CFG.laneCount; lane++) {
        const cell = row?.cells[lane];
        if (!cell) {
          tmp.position.set(0, -999, 0);
          tmp.scale.setScalar(0.001);
          tmp.updateMatrix();
          this.tiles.setMatrixAt(i, tmp.matrix);
          i++;
          continue;
        }

        const isHole = cell.type === 'hole';
        tmp.position.set(lane - 1, isHole ? -TILE_H / 2 - 0.9 : -TILE_H / 2, z);
        tmp.rotation.set(0, 0, 0);
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        this.tiles.setMatrixAt(i, tmp.matrix);

        if (isHole) tmpColor.set(hex(COLORS.hole));
        else if (row?.checkpoint) tmpColor.set(row.claimed ? 0xb9c9a6 : hex(COLORS.checkpoint));
        else tmpColor.set(hex((z + lane) % 2 === 0 ? COLORS.tileTop : COLORS.tileTopAlt));
        this.tiles.setColorAt(i, tmpColor);
        i++;
      }
    }
    this.tiles.instanceMatrix.needsUpdate = true;
    if (this.tiles.instanceColor) this.tiles.instanceColor.needsUpdate = true;
  }

  private syncObstacles(game: Game): void {
    const base = Math.ceil(game.player.z - 0.3);
    let rockN = 0;
    let treeN = 0;

    for (let r = 0; r < VIEW_ROWS; r++) {
      const z = base + r;
      const row = game.world.row(z);
      if (!row) continue;
      for (let lane = 0; lane < CFG.laneCount; lane++) {
        const cell = row.cells[lane];
        const x = lane - 1;
        if (cell.type === 'rock' && rockN < MAX_OBSTACLES) {
          const s = 0.78 + ((cell.seed >> 2) & 7) / 20;
          tmp.position.set(x, 0.3 * s, z);
          tmp.rotation.set(cell.seed % 3, (cell.seed >> 3) % 6, (cell.seed >> 6) % 3);
          tmp.scale.set(s, s * 0.8, s);
          tmp.updateMatrix();
          this.rocks.setMatrixAt(rockN++, tmp.matrix);
        } else if (cell.type === 'tree' && treeN < MAX_OBSTACLES) {
          const s = 0.85 + ((cell.seed >> 4) & 7) / 16;
          tmp.rotation.set(0, cell.seed % 7, 0);
          tmp.scale.set(s, s, s);
          tmp.position.set(x, 0, z);
          tmp.updateMatrix();
          this.trunks.setMatrixAt(treeN, tmp.matrix);

          tmp.position.set(x, 0.62 * s + 0.32, z);
          tmp.rotation.set(cell.seed % 2, (cell.seed >> 5) % 6, 0);
          tmp.scale.set(s, s * 1.15, s);
          tmp.updateMatrix();
          this.canopies.setMatrixAt(treeN, tmp.matrix);
          treeN++;
        }
      }
    }

    this.rocks.count = rockN;
    this.trunks.count = treeN;
    this.canopies.count = treeN;
    this.rocks.instanceMatrix.needsUpdate = true;
    this.trunks.instanceMatrix.needsUpdate = true;
    this.canopies.instanceMatrix.needsUpdate = true;
  }

  private syncItems(game: Game): void {
    const base = Math.ceil(game.player.z - 0.3);
    let ci = 0;
    let oi = 0;

    for (let r = 0; r < VIEW_ROWS && (ci < MAX_ITEMS || oi < MAX_ITEMS); r++) {
      const z = base + r;
      const row = game.world.row(z);
      if (!row) continue;
      for (let lane = 0; lane < CFG.laneCount; lane++) {
        const item = row.cells[lane].item;
        if (!item) continue;
        const pool = item === 'clock' ? this.clocks : this.orbs;
        const idx = item === 'clock' ? ci : oi;
        if (idx >= MAX_ITEMS) continue;
        const slot = pool[idx];
        slot.group.visible = true;
        slot.group.position.set(lane - 1, 0.72 + Math.sin(game.t * 2.6 + z) * 0.12, z);
        if (item === 'clock') slot.spin.rotation.z = Math.sin(game.t * 2.2 + z) * 0.22;
        else slot.spin.rotation.y = game.t * 1.8;
        if (item === 'clock') ci++;
        else oi++;
      }
    }
    for (let i = ci; i < MAX_ITEMS; i++) this.clocks[i].group.visible = false;
    for (let i = oi; i < MAX_ITEMS; i++) this.orbs[i].group.visible = false;
  }

  private syncBraziers(game: Game): void {
    const startZ = Math.ceil((game.player.z - 6) / BRAZIER_EVERY) * BRAZIER_EVERY;
    for (let i = 0; i < BRAZIERS; i++) {
      const z = startZ + i * BRAZIER_EVERY;
      const g = this.braziers[i];
      g.visible = true;
      g.position.set(((z / BRAZIER_EVERY) % 2 === 0 ? -1 : 1) * BRAZIER_X, 0.1, z);
      const flame = g.getObjectByName('flame');
      if (flame) {
        const f = 1 + Math.sin(game.t * 7 + z) * 0.18 + Math.sin(game.t * 11.3 + z * 2) * 0.1;
        flame.scale.set(1, f, 1);
        flame.rotation.y = game.t * 2;
      }
    }
  }

  private syncMonoliths(pz: number): void {
    const spacing = 26;
    const startZ = Math.floor(pz / spacing) * spacing;
    for (let i = 0; i < MONOLITHS; i++) {
      const slot = i >> 1;
      const side = i % 2 === 0 ? -1 : 1;
      const z = startZ + slot * spacing + (side > 0 ? 13 : 0);
      const m = this.monoliths[i];
      m.position.set(side * (11 + ((i * 7) % 5)), 5, z);
      m.rotation.y = side > 0 ? -0.3 : 0.3;
    }
  }

  private syncPlayer(game: Game): void {
    const p = game.player;
    const rig = this.player;
    const fall = game.deathCause === 'hole' ? game.fallT : 0;

    rig.root.position.set(p.renderLane - 1, -fall * 2.4, p.z);
    rig.root.scale.setScalar(PLAYER_SCALE * (1 - fall * 0.4));
    rig.root.visible = game.phase !== 'menu';

    const motion = game.phase === 'dying' ? 0 : p.motion(game.level);
    const swing = Math.sin(p.stride) * 0.9 * motion;
    rig.legL.rotation.x = swing;
    rig.legR.rotation.x = -swing;
    rig.armL.rotation.x = -swing * 0.8;
    rig.armR.rotation.x = swing * 0.8;
    rig.body.rotation.x = motion * 0.13;
    rig.body.position.y = Math.abs(Math.sin(p.stride)) * 0.06 * motion;
    // Nghiêng người theo hướng đang đổi làn.
    rig.root.rotation.z = (p.lane - p.renderLane) * 0.5;

    const blink = game.grace > 0 && Math.sin(game.t * 25) < -0.2;
    rig.root.visible = rig.root.visible && !blink && fall < 0.99;
  }

  private syncBoss(game: Game): void {
    const z = game.player.z + CFG.boss.distance;
    const rig = this.boss;
    rig.root.position.set(0, BOSS_HEAD_Y, z);
    // Mặt được dựng hướng +z; camera đứng ở phía -z nên xoay 180° mới là nhìn
    // thẳng vào người chơi, còn 0° là quay lưng. Chỉ cái đầu ngoái lại.
    rig.head.rotation.y = Math.PI * game.boss.turn;
    // Nghiêng đầu một chút lúc ngoái cho đỡ cứng.
    rig.head.rotation.z = Math.sin(game.boss.turn * Math.PI) * 0.12;

    const watching = game.boss.turn;
    rig.material.emissiveIntensity = 0.2 + watching * 0.5;
    // Đèn đỏ đặt trên đoạn đường phía trước chứ không ở chỗ cái đầu — nó ở quá
    // xa, để tại đó thì chẳng hắt được gì xuống mặt đường.
    this.bossLight.position.set(0, 7, game.player.z + 13);
    this.bossLight.intensity = 6 + watching * 120;
  }

  // ------------------------------------------------------------ tiện ích

  /** Toạ độ người chơi trên màn hình (px CSS) để lớp HUD 2D bám theo. */
  playerScreen(): { x: number; y: number } {
    this.player.root.getWorldPosition(tmpVec);
    tmpVec.y += 1.1;
    tmpVec.project(this.camera);
    return {
      x: ((tmpVec.x + 1) / 2) * this.w,
      y: ((1 - tmpVec.y) / 2) * this.h,
    };
  }
}
