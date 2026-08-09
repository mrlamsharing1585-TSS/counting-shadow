import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  DataTexture,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  RedFormat,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLORS, hex } from '../render/palette';

/* ------------------------------------------------------------------ chung */

/**
 * Bảng chuyển sắc 3 mức cho cel-shading: ánh sáng bị chia thành các mảng
 * dứt khoát thay vì chuyển mượt, đúng kiểu hình vẽ.
 */
function toonRamp(): DataTexture {
  const tex = new DataTexture(new Uint8Array([86, 168, 245]), 3, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Nét viền đen kiểu truyện tranh: nhân bản khối, phóng to rồi chỉ vẽ mặt trong —
 * phần thừa ra quanh mép chính là nét viền.
 *
 * Phóng đều theo tỉ lệ thì khối to có nét dày, khối nhỏ gần như mất nét, mà
 * capsule còn bị kéo dài ra hai đầu. Nên tách riêng hệ số nở ngang (`r`) và nở
 * dọc trục (`a`) để nét viền dày đều nhau mà hình không bị méo.
 */
interface OutlineSpec {
  r: number;
  a?: number;
}

/**
 * Gom nhiều khối rời thành đúng 2 mesh: một lớp viền, một lớp đặc.
 *
 * Quản trò không có khớp nào cử động riêng (cả người chỉ xoay quanh trục đứng)
 * nên nướng sẵn phép biến hình của từng khối vào hình học được. Đổi lại: 26 lệnh
 * vẽ chồng lấn trên một vật thể chiếm nửa màn hình rút xuống còn 2.
 */
class PartBuilder {
  private solid: BufferGeometry[] = [];
  private shells: BufferGeometry[] = [];

  add(mesh: Mesh, spec: OutlineSpec): void {
    mesh.updateMatrix();
    this.solid.push(mesh.geometry.clone().applyMatrix4(mesh.matrix));

    const a = spec.a ?? spec.r * 0.4;
    const shell = new Mesh(mesh.geometry);
    shell.position.copy(mesh.position);
    shell.rotation.copy(mesh.rotation);
    shell.scale.set(
      mesh.scale.x * (1 + spec.r),
      mesh.scale.y * (1 + a),
      mesh.scale.z * (1 + spec.r),
    );
    shell.updateMatrix();
    this.shells.push(mesh.geometry.clone().applyMatrix4(shell.matrix));
  }

  build(skin: MeshToonMaterial, outlineMat: MeshBasicMaterial): Group {
    const g = new Group();

    const outline = new Mesh(mergeGeometries(this.shells, false), outlineMat);
    // Vẽ toàn bộ lớp viền trước rồi mới tới khối đặc, nếu không three tự sắp xếp
    // xen kẽ và nét viền nhấp nháy ở chỗ hai khối chạm nhau.
    outline.renderOrder = -1;
    outline.frustumCulled = false;

    const body = new Mesh(mergeGeometries(this.solid, false), skin);
    body.frustumCulled = false;
    // Quản trò đứng ngoài vùng phủ của shadow camera nên bóng của nó không bao
    // giờ hiện ra — bỏ hẳn khỏi lượt vẽ bóng cho nhẹ.
    body.castShadow = false;

    g.add(outline, body);
    return g;
  }
}

/* ----------------------------------------------------------- người chơi */

export interface PlayerRig {
  root: Group;
  legL: Object3D;
  legR: Object3D;
  armL: Object3D;
  armR: Object3D;
  body: Group;
}

/** Tỉ lệ chibi: đầu chiếm gần nửa chiều cao, đó là thứ làm nhân vật trông "nhí". */
const KID_HEAD_Y = 0.72;
const KID_HEAD_R = 0.2;
const HIP_Y = 0.33;
const SHOULDER_Y = 0.53;

/**
 * Bọc một khối bằng lớp viền đen. Trả về Group để dùng luôn làm khớp xoay cho
 * tay chân — viền quay theo chi thể.
 */
function outlinePart(
  geo: BufferGeometry,
  mat: Material,
  spec: OutlineSpec,
  outlineMat: MeshBasicMaterial,
): Group {
  const g = new Group();
  const shell = new Mesh(geo, outlineMat);
  const a = spec.a ?? spec.r * 0.4;
  shell.scale.set(1 + spec.r, 1 + a, 1 + spec.r);
  shell.renderOrder = -1;
  const mesh = new Mesh(geo, mat);
  mesh.castShadow = true;
  g.add(shell, mesh);
  return g;
}

/** Nhân vật chính: một đứa bé đầu to, áo xanh quần soóc, giày đỏ. */
export function buildPlayer(): PlayerRig {
  const ramp = toonRamp();
  const toon = (color: string) => new MeshToonMaterial({ color: hex(color), gradientMap: ramp });
  const skin = toon(COLORS.kidSkin);
  const hairMat = toon(COLORS.kidHair);
  const shirtMat = toon(COLORS.kidShirt);
  const shortsMat = toon(COLORS.kidShorts);
  const shoeMat = toon(COLORS.kidShoe);
  const packMat = toon(COLORS.kidPack);
  const outlineMat = new MeshBasicMaterial({ color: 0x1b1a20, side: BackSide });

  const root = new Group();
  const body = new Group();
  root.add(body);

  const add = (geo: BufferGeometry, mat: Material, spec: OutlineSpec, parent: Object3D = body) => {
    const g = outlinePart(geo, mat, spec, outlineMat);
    parent.add(g);
    return g;
  };

  // --- đầu ---
  const head = add(new SphereGeometry(KID_HEAD_R, 22, 16), skin, { r: 0.055, a: 0.055 });
  head.position.y = KID_HEAD_Y;

  // Tóc úp như cái bát, hở mặt phía trước.
  const hair = add(
    new SphereGeometry(KID_HEAD_R * 1.06, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat,
    { r: 0.05, a: 0.05 },
  );
  hair.position.y = KID_HEAD_Y;
  hair.rotation.x = -0.16;

  // Túm tóc dựng trên đỉnh cho ngộ nghĩnh.
  const tuft = new Mesh(new ConeGeometry(0.045, 0.1, 8), hairMat);
  tuft.position.set(0.03, KID_HEAD_Y + KID_HEAD_R * 1.02, -0.02);
  tuft.rotation.z = -0.35;
  body.add(tuft);

  for (const s of [-1, 1]) {
    const ear = new Mesh(new SphereGeometry(0.045, 10, 8), skin);
    ear.position.set(s * KID_HEAD_R * 0.94, KID_HEAD_Y - 0.01, 0);
    ear.scale.set(0.7, 1, 0.7);
    body.add(ear);
  }

  // --- thân: áo phông ---
  const torso = add(new CapsuleGeometry(0.105, 0.11, 4, 12), shirtMat, { r: 0.09, a: 0.05 });
  torso.position.y = (HIP_Y + SHOULDER_Y) / 2;

  // Ba lô sau lưng — camera luôn nhìn từ phía sau nên đây là chi tiết thấy rõ nhất.
  const pack = add(new SphereGeometry(0.09, 14, 12), packMat, { r: 0.1, a: 0.1 });
  pack.position.set(0, (HIP_Y + SHOULDER_Y) / 2 + 0.01, -0.115);
  pack.scale.set(1, 1.05, 0.72);

  // --- tay chân: dời hình học xuống để Group làm đúng vai trò khớp xoay ---
  const mkLimb = (
    geo: BufferGeometry,
    mat: Material,
    spec: OutlineSpec,
    x: number,
    y: number,
    drop: number,
  ) => {
    geo.translate(0, drop, 0);
    const pivot = add(geo, mat, spec);
    pivot.position.set(x, y, 0);
    return pivot;
  };

  const armL = mkLimb(new CapsuleGeometry(0.038, 0.12, 3, 8), skin, { r: 0.2, a: 0.05 }, -0.135, SHOULDER_Y, -0.098);
  const armR = mkLimb(new CapsuleGeometry(0.038, 0.12, 3, 8), skin, { r: 0.2, a: 0.05 }, 0.135, SHOULDER_Y, -0.098);
  const legL = mkLimb(new CapsuleGeometry(0.047, 0.13, 3, 8), shortsMat, { r: 0.18, a: 0.04 }, -0.062, HIP_Y, -0.105);
  const legR = mkLimb(new CapsuleGeometry(0.047, 0.13, 3, 8), shortsMat, { r: 0.18, a: 0.04 }, 0.062, HIP_Y, -0.105);

  // Giày gắn vào đầu dưới của chân nên đá theo nhịp chạy.
  for (const leg of [legL, legR]) {
    const shoe = new Mesh(new SphereGeometry(0.058, 12, 10), shoeMat);
    shoe.position.set(0, -0.2, 0.018);
    shoe.scale.set(1, 0.68, 1.35);
    shoe.castShadow = true;
    leg.add(shoe);
  }

  return { root, body, legL, legR, armL, armR };
}

/* -------------------------------------------------------------- quản trò */

export interface BossRig {
  /** Đặt tại tâm quả cầu đầu. */
  root: Group;
  /** Nhóm xoay — 0 là quay lưng, π là nhìn thẳng vào người chơi. */
  head: Group;
  material: MeshToonMaterial;
}

/** Bán kính đầu ở kích thước gốc — cảnh sẽ phóng to lên rất nhiều. */
const HEAD_R = 1.3;
/** Hệ số nở của nét viền quanh cái đầu — các khối khác chỉnh riêng cho dày đều. */
const OUTLINE = 0.06;

/**
 * Khuôn mặt vẽ sẵn trên canvas rồi dán lên một mảnh cầu ôm đúng độ cong của đầu.
 * Vẽ 2D thế này cho nét sắc và kiểm soát được hình dáng mắt/miệng, thay vì nặn
 * bằng khối 3D rồi ra một mớ nhoè nhoẹt.
 */
function makeFaceTexture(): CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, S, S);

  const eye = (cx: number, dir: number) => {
    const w = S * 0.15;
    const h = S * 0.115;
    g.save();
    g.translate(cx, S * 0.42);
    g.beginPath();
    // Mí trên xệ về phía sống mũi -> ánh nhìn hằn học.
    g.moveTo(-dir * w, -h * 0.75);
    g.lineTo(dir * w, h * 0.15);
    g.lineTo(dir * w, h * 0.85);
    g.lineTo(-dir * w, h * 0.55);
    g.closePath();
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineJoin = 'round';
    g.lineWidth = S * 0.028;
    g.strokeStyle = '#180404';
    g.stroke();
    g.restore();
  };
  eye(S * 0.31, 1);
  eye(S * 0.69, -1);

  // Miệng cau: cung cong xuống, nét dày.
  g.strokeStyle = '#180404';
  g.lineWidth = S * 0.055;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(S * 0.5, S * 0.78, S * 0.16, Math.PI * 1.18, Math.PI * 1.82);
  g.stroke();

  const tex = new CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Làm khối tan dần vào sương theo cao độ thế giới: phía trên `top` còn nguyên,
 * xuống tới `bottom` thì biến mất hẳn.
 *
 * Cắt bằng `clippingPlane` cho ra một vệt phẳng lì nhìn rất giả; loang dần thế
 * này mới ra cảm giác cái đầu chìm trong sương.
 */
function mistFade(mat: Material, top: number, bottom: number): void {
  mat.transparent = true;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vMistY;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvMistY = (modelMatrix * vec4(transformed, 1.0)).y;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vMistY;')
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         gl_FragColor.a *= smoothstep(${bottom.toFixed(2)}, ${top.toFixed(2)}, vMistY);`,
      );
  };
}

export interface BossFade {
  /** Trên cao độ này thì hiện nguyên vẹn. */
  top: number;
  /** Dưới cao độ này thì mất hẳn trong sương. */
  bottom: number;
}

/**
 * Quản trò chỉ còn đúng cái đầu khổng lồ nhô lên ở cuối con đường vô tận —
 * không đứng trên đường, không có thân, nửa dưới chìm dần vào sương.
 */
export function buildBoss(fade: BossFade): BossRig {
  const ramp = toonRamp();
  const skin = new MeshToonMaterial({
    color: hex(COLORS.boss),
    gradientMap: ramp,
    emissive: new Color(hex(COLORS.bossDark)),
    emissiveIntensity: 0.2,
    // Sương của cảnh phủ theo khoảng cách sẽ nhoà hết mặt nó; ở đây tự lo phần
    // hoà vào sương bằng cách loang theo cao độ.
    fog: false,
  });
  const outlineMat = new MeshBasicMaterial({
    color: 0x1a0505,
    side: BackSide,
    fog: false,
  });
  mistFade(skin, fade.top, fade.bottom);
  mistFade(outlineMat, fade.top, fade.bottom);

  const root = new Group();
  const headGroup = new Group();
  root.add(headGroup);

  const headParts = new PartBuilder();
  const head = new Mesh(new SphereGeometry(HEAD_R, 40, 30), skin);
  head.scale.set(1, 0.96, 1);
  headParts.add(head, { r: OUTLINE, a: OUTLINE });

  // Mảng sáng bóng trên trán, đúng chỗ bản vẽ đặt.
  const gloss = new Mesh(
    new SphereGeometry(0.34, 16, 12),
    new MeshBasicMaterial({ color: 0xffd9d3, transparent: true, opacity: 0.42, fog: false }),
  );
  gloss.position.set(-0.44, 0.62, 0.94);
  gloss.scale.set(1.6, 0.74, 0.35);
  gloss.rotation.z = 0.4;
  headGroup.add(gloss);

  // --- mặt: mảnh cầu ôm sát đầu, mang texture nét sắc ---
  // Đặt cao hơn xích đạo để cả mắt lẫn miệng đều nằm trong nửa đầu còn thấy được.
  const faceGeo = new SphereGeometry(
    HEAD_R * 1.022,
    56,
    40,
    Math.PI / 2 - 0.6,
    1.2,
    Math.PI * 0.16,
    Math.PI * 0.42,
  );
  const faceMat = new MeshBasicMaterial({
    map: makeFaceTexture(),
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  mistFade(faceMat, fade.top, fade.bottom);
  const face = new Mesh(faceGeo, faceMat);
  face.scale.y = 0.96;
  face.renderOrder = 2;
  headGroup.add(face);

  headGroup.add(headParts.build(skin, outlineMat));
  return { root, head: headGroup, material: skin };
}
