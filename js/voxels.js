(function (global) {
  'use strict';

  // Shared vertex-colored material (1 material for ALL voxel geometry -> massive Draw Call reduction!)
  const voxelMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const emissiveCache = {};

  function getGlowMat(hex) {
    if (!emissiveCache[hex]) {
      emissiveCache[hex] = new THREE.MeshBasicMaterial({ color: hex });
    }
    return emissiveCache[hex];
  }

  // Face shade multipliers for crisp MagicaVoxel-style baked ambient occlusion
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  const FACE_SHADE = [0.88, 0.84, 1.08, 0.68, 0.96, 0.90];
  const _baseBox = new THREE.BoxGeometry(1, 1, 1);
  const _basePos = _baseBox.attributes.position.array;
  const _baseNorm = _baseBox.attributes.normal.array;
  const _baseIdx = _baseBox.index.array;
  const _tmpCol = new THREE.Color();

  // Fast Voxel Mesh Builder: merges dozens of colored voxel blocks into 1 single Draw Call!
  function VoxelBuilder() {
    this.boxes = [];
  }

  VoxelBuilder.prototype.add = function (w, h, d, x, y, z, hex) {
    this.boxes.push([w, h, d, x, y, z, hex]);
    return this;
  };

  VoxelBuilder.prototype.build = function (castShadow, receiveShadow) {
    const count = this.boxes.length;
    const vPerBox = 24;
    const iPerBox = 36;
    const positions = new Float32Array(count * vPerBox * 3);
    const normals = new Float32Array(count * vPerBox * 3);
    const colors = new Float32Array(count * vPerBox * 3);
    const indices = new Uint32Array(count * iPerBox);

    for (let b = 0; b < count; b++) {
      const item = this.boxes[b];
      const w = item[0], h = item[1], d = item[2];
      const ox = item[3], oy = item[4], oz = item[5];
      _tmpCol.setHex(item[6]);

      const vOff = b * vPerBox;
      for (let v = 0; v < vPerBox; v++) {
        const vi3 = v * 3;
        const dst = (vOff + v) * 3;
        positions[dst] = _basePos[vi3] * w + ox;
        positions[dst + 1] = _basePos[vi3 + 1] * h + oy;
        positions[dst + 2] = _basePos[vi3 + 2] * d + oz;

        normals[dst] = _baseNorm[vi3];
        normals[dst + 1] = _baseNorm[vi3 + 1];
        normals[dst + 2] = _baseNorm[vi3 + 2];

        const faceIdx = Math.floor(v / 4);
        const shade = FACE_SHADE[faceIdx];
        colors[dst] = Math.min(1, _tmpCol.r * shade);
        colors[dst + 1] = Math.min(1, _tmpCol.g * shade);
        colors[dst + 2] = Math.min(1, _tmpCol.b * shade);
      }

      const iOff = b * iPerBox;
      for (let k = 0; k < iPerBox; k++) {
        indices[iOff + k] = _baseIdx[k] + vOff;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    const mesh = new THREE.Mesh(geo, voxelMat);
    mesh.castShadow = castShadow !== false;
    mesh.receiveShadow = receiveShadow !== false;
    return mesh;
  };

  function addGlow(parent, w, h, d, x, y, z, hex) {
    const m = new THREE.Mesh(_baseBox, getGlowMat(hex));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function makeVoxelWheel(size, width) {
    const vb = new VoxelBuilder();
    vb.add(width, size, size, 0, 0, 0, 0x1e293b);
    vb.add(width + 0.03, size * 0.62, size * 0.62, 0, 0, 0, 0x94a3b8);
    vb.add(width + 0.05, size * 0.28, size * 0.28, 0, 0, 0, 0xe2e8f0);
    return vb.build(true, false);
  }

  // --- 5 Detailed Voxel Characters (1 Draw Call each!) ---
  function buildVoxelCharacter(c, yOff, zOff) {
    const vb = new VoxelBuilder();
    const y = yOff || 1.15;
    const z = zOff || -0.14;

    // Legs + Sneakers/Sandals
    vb.add(0.18, 0.36, 0.22, -0.15, y - 0.36, z + 0.04, 0x1e293b);
    vb.add(0.18, 0.36, 0.22, 0.15, y - 0.36, z + 0.04, 0x1e293b);
    vb.add(0.19, 0.1, 0.28, -0.15, y - 0.56, z - 0.01, c.mustache ? 0x3b82f6 : 0xf1f5f9);
    vb.add(0.19, 0.1, 0.28, 0.15, y - 0.56, z - 0.01, c.mustache ? 0x3b82f6 : 0xf1f5f9);

    // Jacket Torso + Collar + Reflective Courier Stripes
    vb.add(0.58, 0.58, 0.38, 0, y, z, c.jacket);
    vb.add(0.60, 0.08, 0.40, 0, y + 0.08, z, c.accent);
    vb.add(0.60, 0.07, 0.40, 0, y - 0.08, z, c.accent);
    vb.add(0.28, 0.12, 0.26, 0, y + 0.32, z, 0x0f172a);

    // Arms + Hands gripping handlebar
    vb.add(0.16, 0.16, 0.54, -0.36, y + 0.12, z - 0.22, c.jacket);
    vb.add(0.16, 0.16, 0.54, 0.36, y + 0.12, z - 0.22, c.jacket);
    vb.add(0.13, 0.13, 0.13, -0.36, y + 0.12, z - 0.50, 0xfdba74);
    vb.add(0.13, 0.13, 0.13, 0.36, y + 0.12, z - 0.50, 0xfdba74);

    // Head + Ears
    vb.add(0.40, 0.40, 0.40, 0, y + 0.50, z, 0xfdba74);
    vb.add(0.46, 0.12, 0.12, 0, y + 0.48, z, 0xfdba74);
    // Stepped Voxel Helmet
    vb.add(0.48, 0.24, 0.48, 0, y + 0.64, z, c.helmet);
    vb.add(0.38, 0.10, 0.38, 0, y + 0.78, z, c.helmet);
    vb.add(0.44, 0.06, 0.14, 0, y + 0.56, z - 0.26, 0x0f172a); // Mỏ nón

    if (c.mask) {
      vb.add(0.42, 0.14, 0.12, 0, y + 0.39, z - 0.18, 0x334155);
    }
    if (c.ponytail) {
      vb.add(0.18, 0.32, 0.18, 0, y + 0.44, z + 0.27, 0x5c2c0c);
      vb.add(0.14, 0.14, 0.14, 0, y + 0.24, z + 0.32, 0x5c2c0c);
    }
    if (c.mustache) {
      vb.add(0.24, 0.07, 0.08, 0, y + 0.40, z - 0.22, 0x475569);
      vb.add(0.10, 0.44, 0.40, 0.24, y - 0.04, z, 0x64748b); // Dây túi chéo
    }
    if (c.backpack) {
      vb.add(0.46, 0.48, 0.30, 0, y + 0.04, z + 0.32, 0x1e3a8a);
      vb.add(0.48, 0.08, 0.32, 0, y + 0.10, z + 0.32, 0xfacc15);
    }
    if (c.fullface) {
      vb.add(0.50, 0.42, 0.50, 0, y + 0.54, z, 0x111827);
      vb.add(0.44, 0.18, 0.10, 0, y + 0.54, z - 0.24, 0x38bdf8);
    }
    return vb.build(true, true);
  }

  // --- 5 Detailed Voxel Player Vehicles (1 Draw Call body + wheels!) ---
  function buildPlayerVehicle(vehId) {
    const g = new THREE.Group();
    const vb = new VoxelBuilder();
    const wheels = [];

    if (vehId === 0) {
      // Xe Đạp Thồ Thép
      vb.add(0.14, 0.18, 1.56, 0, 0.58, 0, 0x166534);
      vb.add(0.14, 0.62, 0.14, 0, 0.72, -0.62, 0x166534);
      vb.add(0.14, 0.52, 0.14, 0, 0.66, 0.18, 0x166534);
      vb.add(0.32, 0.12, 0.38, 0, 0.94, 0.18, 0x451a03); // Yên da nâu
      vb.add(0.94, 0.08, 0.10, 0, 1.08, -0.58, 0xe2e8f0);
      vb.add(0.48, 0.34, 0.34, 0, 0.92, -0.84, 0x94a3b8); // Giỏ sắt
      vb.add(0.38, 0.24, 0.24, 0, 0.96, -0.84, 0x64748b);
      vb.add(0.88, 0.10, 0.90, 0, 0.76, 0.64, 0x475569); // Baga thép sau
      vb.add(0.16, 0.12, 0.08, 0, 0.72, 1.08, 0xef4444);
      const wF = makeVoxelWheel(0.68, 0.10); wF.position.set(0, 0.34, -0.78);
      const wR = makeVoxelWheel(0.68, 0.10); wR.position.set(0, 0.34, 0.74);
      wheels.push(wF, wR); g.add(wF, wR);
    } else if (vehId === 1) {
      // Honda Wave Xanh
      vb.add(0.66, 0.44, 1.88, 0, 0.54, 0, 0x16a34a);
      vb.add(0.74, 0.64, 0.38, 0, 0.78, -0.62, 0x1e293b);
      vb.add(0.62, 0.20, 0.74, 0, 0.80, 0.08, 0x1e293b); // Yên xe
      vb.add(0.16, 0.16, 0.92, 0.38, 0.36, 0.44, 0xcbd5e1); // Ống pô inox
      vb.add(1.04, 0.10, 0.14, 0, 1.14, -0.58, 0x1e293b);
      vb.add(0.14, 0.12, 0.08, -0.46, 1.28, -0.56, 0x0f172a); // Gương trái
      vb.add(0.14, 0.12, 0.08, 0.46, 1.28, -0.56, 0x0f172a); // Gương phải
      vb.add(0.94, 0.10, 0.94, 0, 0.80, 0.66, 0x94a3b8); // Baga sắt sau
      vb.add(0.30, 0.18, 0.06, 0, 0.52, 0.98, 0xf8fafc); // Biển số
      addGlow(g, 0.34, 0.18, 0.12, 0, 1.06, -0.80, 0xfef08a);
      addGlow(g, 0.36, 0.14, 0.08, 0, 0.72, 0.96, 0xef4444);
      const wF = makeVoxelWheel(0.64, 0.18); wF.position.set(0, 0.32, -0.78);
      const wR = makeVoxelWheel(0.64, 0.20); wR.position.set(0, 0.32, 0.74);
      wheels.push(wF, wR); g.add(wF, wR);
    } else if (vehId === 2) {
      // Honda Vision Đỏ
      vb.add(0.70, 0.48, 1.84, 0, 0.54, 0, 0xdc2626);
      vb.add(0.76, 0.70, 0.44, 0, 0.80, -0.60, 0xdc2626);
      vb.add(0.56, 0.16, 0.70, 0, 0.80, 0.06, 0x1e293b);
      vb.add(1.00, 0.10, 0.14, 0, 1.16, -0.56, 0xdc2626);
      vb.add(0.14, 0.12, 0.08, -0.44, 1.30, -0.54, 0x0f172a);
      vb.add(0.14, 0.12, 0.08, 0.44, 1.30, -0.54, 0x0f172a);
      vb.add(0.86, 0.10, 0.86, 0, 0.80, 0.66, 0x475569);
      vb.add(0.28, 0.18, 0.06, 0, 0.52, 0.94, 0xf8fafc);
      addGlow(g, 0.34, 0.20, 0.12, 0, 1.08, -0.80, 0xfef08a);
      addGlow(g, 0.36, 0.16, 0.08, 0, 0.74, 0.94, 0xef4444);
      const wF = makeVoxelWheel(0.62, 0.18); wF.position.set(0, 0.31, -0.74);
      const wR = makeVoxelWheel(0.62, 0.20); wR.position.set(0, 0.31, 0.72);
      wheels.push(wF, wR); g.add(wF, wR);
    } else if (vehId === 3) {
      // Xe Ba Gác Máy Xanh
      vb.add(0.68, 0.54, 1.04, 0, 0.56, -0.58, 0x2563eb);
      vb.add(1.48, 0.20, 1.48, 0, 0.60, 0.74, 0x1d4ed8);
      vb.add(0.12, 0.48, 1.48, -0.68, 0.88, 0.74, 0x2563eb);
      vb.add(0.12, 0.48, 1.48, 0.68, 0.88, 0.74, 0x2563eb);
      vb.add(1.48, 0.48, 0.12, 0, 0.88, 1.42, 0x2563eb);
      vb.add(1.48, 0.76, 0.10, 0, 1.04, 0.02, 0x1d4ed8);
      vb.add(1.06, 0.10, 0.12, 0, 1.18, -0.70, 0xcbd5e1);
      addGlow(g, 0.30, 0.24, 0.14, 0, 0.96, -1.08, 0xfef08a);
      addGlow(g, 0.26, 0.14, 0.08, -0.52, 0.60, 1.48, 0xef4444);
      addGlow(g, 0.26, 0.14, 0.08, 0.52, 0.60, 1.48, 0xef4444);
      const wF = makeVoxelWheel(0.66, 0.22); wF.position.set(0, 0.33, -0.94);
      const wRL = makeVoxelWheel(0.68, 0.24); wRL.position.set(-0.74, 0.34, 0.78);
      const wRR = makeVoxelWheel(0.68, 0.24); wRR.position.set(0.74, 0.34, 0.78);
      wheels.push(wF, wRL, wRR); g.add(wF, wRL, wRR);
    } else {
      // Xe Tải Mini Carry trắng-đỏ
      vb.add(1.46, 0.74, 1.16, 0, 1.24, -0.58, 0xf8fafc);
      vb.add(1.50, 0.54, 1.20, 0, 0.62, -0.58, 0xdc2626);
      vb.add(1.30, 0.46, 0.08, 0, 1.26, -1.16, 0x1e293b);
      vb.add(1.54, 0.20, 1.58, 0, 0.66, 0.80, 0xf1f5f9);
      vb.add(0.10, 0.42, 1.58, -0.72, 0.92, 0.80, 0xe2e8f0);
      vb.add(0.10, 0.42, 1.58, 0.72, 0.92, 0.80, 0xe2e8f0);
      vb.add(1.54, 0.42, 0.10, 0, 0.92, 1.56, 0xe2e8f0);
      vb.add(0.34, 0.18, 0.06, 0, 0.54, 1.62, 0xf8fafc);
      addGlow(g, 0.28, 0.16, 0.08, -0.48, 0.72, -1.20, 0xfef08a);
      addGlow(g, 0.28, 0.16, 0.08, 0.48, 0.72, -1.20, 0xfef08a);
      addGlow(g, 0.28, 0.14, 0.08, -0.54, 0.66, 1.62, 0xef4444);
      addGlow(g, 0.28, 0.14, 0.08, 0.54, 0.66, 1.62, 0xef4444);
      const wFL = makeVoxelWheel(0.64, 0.22); wFL.position.set(-0.76, 0.32, -0.64);
      const wFR = makeVoxelWheel(0.64, 0.22); wFR.position.set(0.76, 0.32, -0.64);
      const wRL = makeVoxelWheel(0.64, 0.22); wRL.position.set(-0.76, 0.32, 0.88);
      const wRR = makeVoxelWheel(0.64, 0.22); wRR.position.set(0.76, 0.32, 0.88);
      wheels.push(wFL, wFR, wRL, wRR); g.add(wFL, wFR, wRL, wRR);
    }

    g.add(vb.build(true, true));
    return { group: g, wheels: wheels };
  }

  // --- Detailed Voxel Cardboard Parcel Box (1 Draw Call!) ---
  function buildVoxelParcel(isVip) {
    const vb = new VoxelBuilder();
    const baseCol = isVip ? 0xef4444 : 0xd69a52;
    const darkCol = isVip ? 0xb91c1c : 0xb57933;
    const tapeCol = isVip ? 0xfde047 : 0xfef3c7;
    vb.add(0.78, 0.44, 0.78, 0, 0, 0, baseCol);
    vb.add(0.80, 0.06, 0.80, 0, -0.20, 0, darkCol);
    vb.add(0.80, 0.08, 0.18, 0, 0.18, 0, tapeCol);
    vb.add(0.24, 0.16, 0.80, -0.18, 0.0, 0, 0xf8fafc); // Phiếu vận đơn
    vb.add(0.81, 0.46, 0.06, 0, 0, -0.22, 0x1d4ed8); // Dây thun chằng hàng
    vb.add(0.81, 0.46, 0.06, 0, 0, 0.22, 0x1d4ed8);
    return vb.build(true, true);
  }

  // --- 3 Rich MagicaVoxel Saigon Shophouses (1 Draw Call each! Full architectural detail) ---
  function buildVoxelShophouse(styleIdx, side) {
    const vb = new VoxelBuilder();
    const faceX = -side * 2.4;

    if (styleIdx === 0) {
      // Nhà phố cổ Sài Gòn vàng kem + mái ngói đỏ bậc thang + ban công sắt + chậu cây
      vb.add(4.8, 6.8, 7.0, 0, 3.4, 0, 0xfde68a);
      vb.add(5.0, 0.35, 7.2, 0, 3.35, 0, 0xe7d39a); // Phào chỉ tầng 2
      vb.add(5.0, 0.45, 7.2, 0, 6.95, 0, 0xb45309); // Mái ngói đỏ
      vb.add(3.8, 0.45, 6.6, 0, 7.40, 0, 0xc2410c);
      vb.add(2.4, 0.40, 6.0, 0, 7.80, 0, 0xd97706);
      // Ban công + Lan can sắt + Chậu cây xanh
      vb.add(0.85, 0.22, 5.2, faceX - side * 0.35, 3.45, 0, 0xe2e8f0);
      vb.add(0.10, 0.72, 5.2, faceX - side * 0.72, 3.90, 0, 0x1e293b);
      vb.add(0.35, 0.35, 0.80, faceX - side * 0.45, 3.74, -1.6, 0x15803d);
      vb.add(0.35, 0.35, 0.80, faceX - side * 0.45, 3.74, 1.6, 0x22c55e);
      // Cửa sổ gỗ lá sách tầng 2
      [-1.5, 1.5].forEach(function (wz) {
        vb.add(0.16, 1.5, 1.2, faceX, 4.7, wz, 0xf8fafc);
        vb.add(0.20, 1.3, 0.96, faceX, 4.7, wz, 0x334155);
      });
      // Tầng trệt cửa sắt xếp + mái hiên nhỏ
      vb.add(0.16, 2.4, 3.4, faceX, 1.2, 0, 0x334155);
      vb.add(0.95, 0.16, 4.2, faceX - side * 0.42, 2.6, 0, 0x0284c7);
    } else if (styleIdx === 1) {
      // Tiệm Tạp Hóa xanh bạc hà + mái hiên sọc + bồn nước inox sân thượng + kệ hàng
      vb.add(4.8, 5.6, 7.0, 0, 2.8, 0, 0x86efac);
      vb.add(5.0, 0.40, 7.2, 0, 5.75, 0, 0x4ade80);
      vb.add(4.4, 0.45, 6.6, 0, 5.95, 0, 0x64748b); // Sân thượng
      // Bồn nước inox trên chân sắt
      vb.add(0.16, 0.65, 0.16, -0.4, 6.45, 0.2, 0x475569);
      vb.add(0.16, 0.65, 0.16, 0.4, 6.45, 0.2, 0x475569);
      vb.add(1.15, 1.35, 1.15, 0, 7.35, 0.2, 0xe2e8f0);
      vb.add(1.22, 0.26, 1.22, 0, 7.45, 0.2, 0x2563eb);
      // Mái hiên sọc xanh trắng
      for (let k = -2; k <= 2; k++) {
        vb.add(1.25, 0.18, 1.2, faceX - side * 0.56, 2.85, k * 1.22, k % 2 === 0 ? 0x15803d : 0xf8fafc);
      }
      // Biển hiệu Tạp Hóa đỏ vàng
      vb.add(0.22, 0.92, 4.2, faceX - side * 0.12, 4.15, 0, 0xfef3c7);
      vb.add(0.26, 0.52, 3.4, faceX - side * 0.15, 4.15, 0, 0xdc2626);
      // Cửa hàng + thùng hàng bày vỉa hè
      vb.add(0.16, 2.4, 4.2, faceX, 1.2, 0, 0x1e293b);
      vb.add(0.65, 0.55, 0.70, faceX - side * 0.45, 0.28, -2.0, 0xd97706);
      vb.add(0.65, 0.55, 0.70, faceX - side * 0.45, 0.28, 2.0, 0xef4444);
    } else {
      // Quán Cà Phê cam đất + cục nóng máy lạnh + bàn ghế nhựa xanh đỏ vỉa hè
      vb.add(4.8, 6.1, 7.0, 0, 3.05, 0, 0xfdba74);
      vb.add(5.0, 0.36, 7.2, 0, 6.25, 0, 0xea580c);
      // Biển hiệu Cà Phê nâu-vàng
      vb.add(0.24, 0.96, 4.0, faceX - side * 0.12, 4.2, 0, 0x78350f);
      vb.add(0.28, 0.48, 3.0, faceX - side * 0.15, 4.2, 0, 0xfde047);
      // Cục nóng máy lạnh + quạt đen
      vb.add(0.50, 0.64, 0.92, faceX - side * 0.22, 4.85, 2.4, 0xe2e8f0);
      vb.add(0.54, 0.38, 0.38, faceX - side * 0.24, 4.85, 2.4, 0x1e293b);
      // Mái hiên nâu sọc
      for (let k = -2; k <= 2; k++) {
        vb.add(1.15, 0.16, 1.2, faceX - side * 0.52, 2.8, k * 1.22, k % 2 === 0 ? 0x9a3412 : 0xfef3c7);
      }
      // Bàn ghế nhựa xanh/đỏ vỉa hè Sài Gòn
      vb.add(0.52, 0.44, 0.52, faceX - side * 0.85, 0.22, -1.8, 0x2563eb);
      vb.add(0.52, 0.44, 0.52, faceX - side * 0.85, 0.22, -0.9, 0xdc2626);
      vb.add(0.52, 0.44, 0.52, faceX - side * 0.85, 0.22, 1.6, 0x2563eb);
      vb.add(0.16, 2.4, 3.8, faceX, 1.2, 0, 0x1e293b);
    }

    return vb.build(true, true);
  }

  // --- Detailed Multi-Cluster Voxel Street Tree (1 Draw Call!) ---
  function buildVoxelTree() {
    const vb = new VoxelBuilder();
    // Bồn cây gạch vuông vỉa hè
    vb.add(1.3, 0.24, 1.3, 0, 0.12, 0, 0xcbd5e1);
    vb.add(0.95, 0.28, 0.95, 0, 0.14, 0, 0x78350f);
    // Thân cây Voxel
    vb.add(0.46, 2.0, 0.46, 0, 1.1, 0, 0x78350f);
    vb.add(0.30, 0.5, 0.30, 0.22, 1.9, -0.1, 0x78350f);
    // Tán lá Voxel 3 tầng xanh tươi
    vb.add(2.2, 0.95, 2.2, 0, 2.35, 0, 0x15803d);
    vb.add(1.8, 0.85, 1.8, -0.3, 2.95, 0.2, 0x16a34a);
    vb.add(1.5, 0.80, 1.5, 0.35, 3.25, -0.2, 0x22c55e);
    vb.add(1.0, 0.60, 1.0, 0.0, 3.75, 0.05, 0x4ade80);
    return vb.build(true, true);
  }

  // --- Detailed Voxel Utility Pole with Black Cable Coil (1 Draw Call + Bulb) ---
  function buildVoxelPole(side, bulbMat) {
    const g = new THREE.Group();
    const vb = new VoxelBuilder();
    vb.add(0.24, 5.0, 0.24, 0, 2.5, 0, 0x94a3b8);
    vb.add(0.46, 0.62, 0.46, 0, 3.3, 0, 0x0f172a); // Cuộn dây cáp đen
    vb.add(0.32, 0.40, 0.32, side * 0.24, 3.4, 0, 0x1e293b);
    vb.add(1.25, 0.12, 0.12, -side * 0.62, 4.85, 0, 0x64748b);
    g.add(vb.build(true, false));

    const bulb = new THREE.Mesh(_baseBox, bulbMat);
    bulb.scale.set(0.48, 0.14, 0.26);
    bulb.position.set(-side * 1.12, 4.78, 0);
    g.add(bulb);
    return g;
  }

  // --- 4 Detailed Voxel Saigon Traffic Vehicles + Roadwork Barrier (1-2 Draw Calls each!) ---
  function buildTrafficVoxel(type, variantIdx) {
    const g = new THREE.Group();
    const vb = new VoxelBuilder();
    const wheels = [];
    let blinkerL = null;
    let blinkerR = null;

    if (type === 'motorbike') {
      const bikeCols = [0x2563eb, 0xdc2626, 0x334155, 0xe2e8f0];
      const jackCols = [0x0284c7, 0x475569, 0xbe123c, 0xd97706];
      const bCol = bikeCols[variantIdx % bikeCols.length];
      vb.add(0.62, 0.44, 1.78, 0, 0.54, 0, bCol);
      vb.add(0.66, 0.60, 0.36, 0, 0.76, -0.60, 0x1e293b);
      vb.add(0.92, 0.08, 0.10, 0, 1.10, -0.54, 0x1e293b);
      vb.add(0.28, 0.18, 0.06, 0, 0.50, 0.92, 0xf8fafc);
      addGlow(g, 0.28, 0.14, 0.08, 0, 0.70, 0.92, 0xef4444);
      blinkerL = addGlow(g, 0.14, 0.14, 0.08, -0.28, 0.70, 0.92, 0xfbbf24);
      blinkerR = addGlow(g, 0.14, 0.14, 0.08, 0.28, 0.70, 0.92, 0xfbbf24);
      blinkerL.visible = false; blinkerR.visible = false;
      const wF = makeVoxelWheel(0.60, 0.16); wF.position.set(0, 0.30, -0.74);
      const wR = makeVoxelWheel(0.60, 0.18); wR.position.set(0, 0.30, 0.72);
      wheels.push(wF, wR); g.add(wF, wR);
      g.add(buildVoxelCharacter({ jacket: jackCols[variantIdx % 4], helmet: bCol, accent: 0xf8fafc, mask: true }, 1.10, -0.06));
    } else if (type === 'bus') {
      // Voxel SaigonBus Xanh Trắng chi tiết
      vb.add(2.08, 1.02, 5.4, 0, 0.96, 0, 0x16a34a);
      vb.add(2.08, 1.18, 5.4, 0, 2.06, 0, 0xf8fafc);
      vb.add(2.12, 0.76, 4.5, 0, 2.02, 0, 0x1e293b); // Kính hông
      // Khung chia ô kính xe buýt
      for (let wz = -1.6; wz <= 1.6; wz += 0.8) {
        vb.add(2.14, 0.78, 0.10, 0, 2.02, wz, 0xf8fafc);
      }
      vb.add(1.76, 0.78, 0.08, 0, 2.04, 2.71, 0x1e293b); // Kính hậu
      vb.add(1.16, 0.28, 2.1, 0, 2.78, -0.2, 0xe2e8f0); // Điều hòa nóc
      vb.add(0.62, 0.22, 0.06, 0, 0.78, 2.72, 0xfacc15); // Biển số vàng
      addGlow(g, 0.36, 0.36, 0.08, -0.80, 0.96, 2.72, 0xef4444);
      addGlow(g, 0.36, 0.36, 0.08, 0.80, 0.96, 2.72, 0xef4444);
      blinkerL = addGlow(g, 0.20, 0.20, 0.10, -0.94, 1.28, 2.72, 0xfbbf24);
      blinkerR = addGlow(g, 0.20, 0.20, 0.10, 0.94, 1.28, 2.72, 0xfbbf24);
      blinkerL.visible = false; blinkerR.visible = false;
      [[-1.0, -1.65], [1.0, -1.65], [-1.0, 1.65], [1.0, 1.65]].forEach(function (p) {
        const w = makeVoxelWheel(0.80, 0.24); w.position.set(p[0], 0.40, p[1]);
        wheels.push(w); g.add(w);
      });
    } else if (type === 'truck') {
      // Voxel Xe Tải Thùng Kín Inox
      vb.add(1.88, 1.64, 1.44, 0, 1.24, -1.82, 0xf8fafc);
      vb.add(1.72, 0.64, 0.08, 0, 1.56, -2.54, 0x1e293b);
      vb.add(2.06, 2.10, 3.45, 0, 1.65, 0.68, 0xe2e8f0);
      // Gân sóng thùng inox
      for (let ty = 0.85; ty <= 2.45; ty += 0.32) {
        vb.add(2.10, 0.08, 3.42, 0, ty, 0.68, 0xcbd5e1);
      }
      vb.add(2.10, 0.16, 3.48, 0, 0.66, 0.68, 0xdc2626); // Cản sọc đỏ trắng
      vb.add(0.08, 1.94, 0.08, 0, 1.65, 2.42, 0x475569);
      addGlow(g, 0.32, 0.16, 0.08, -0.72, 0.56, 2.44, 0xef4444);
      addGlow(g, 0.32, 0.16, 0.08, 0.72, 0.56, 2.44, 0xef4444);
      [[-0.94, -1.72], [0.94, -1.72], [-0.94, 1.28], [0.94, 1.28]].forEach(function (p) {
        const w = makeVoxelWheel(0.76, 0.24); w.position.set(p[0], 0.38, p[1]);
        wheels.push(w); g.add(w);
      });
    } else if (type === 'cont') {
      // Voxel Xe Đầu Kéo Container 40 Feet
      vb.add(2.04, 2.24, 2.04, 0, 1.56, -4.38, 0x2563eb);
      vb.add(1.84, 0.70, 0.08, 0, 1.92, -5.40, 0x1e293b);
      vb.add(1.98, 0.28, 7.55, 0, 0.84, 0.66, 0x1e293b);
      vb.add(2.18, 2.42, 7.36, 0, 2.18, 0.76, 0x991b1b);
      for (let rz = -2.4; rz <= 3.6; rz += 0.9) {
        vb.add(2.24, 2.34, 0.18, 0, 2.18, rz, 0x7f1d1d);
      }
      [-0.56, -0.2, 0.2, 0.56].forEach(function (rx) {
        vb.add(0.08, 2.24, 0.08, rx, 2.18, 4.46, 0xcbd5e1);
      });
      vb.add(2.06, 0.18, 0.12, 0, 0.56, 4.48, 0xfacc15);
      addGlow(g, 0.36, 0.16, 0.08, -0.78, 0.74, 4.50, 0xef4444);
      addGlow(g, 0.36, 0.16, 0.08, 0.78, 0.74, 4.50, 0xef4444);
      [-4.6, -3.1, 2.35, 3.5].forEach(function (wz) {
        const wl = makeVoxelWheel(0.84, 0.28); wl.position.set(-1.0, 0.42, wz);
        const wr = makeVoxelWheel(0.84, 0.28); wr.position.set(1.0, 0.42, wz);
        wheels.push(wl, wr); g.add(wl, wr);
      });
    } else {
      // Voxel Rào Chắn Công Trình
      vb.add(1.94, 0.58, 0.26, 0, 0.74, 0, 0xf97316);
      vb.add(1.96, 0.18, 0.28, 0, 0.74, 0, 0xf8fafc);
      vb.add(0.18, 0.74, 0.24, -0.74, 0.37, 0, 0x334155);
      vb.add(0.18, 0.74, 0.24, 0.74, 0.37, 0, 0x334155);
      addGlow(g, 0.20, 0.20, 0.20, -0.74, 1.14, 0, 0xfbbf24);
      addGlow(g, 0.20, 0.20, 0.20, 0.74, 1.14, 0, 0xfbbf24);
    }

    g.add(vb.build(true, true));
    return { mesh: g, wheels: wheels, blinkerL: blinkerL, blinkerR: blinkerR };
  }

  // --- Glowing Voxel Pickup Pad & Drop-Off Zone ---
  function buildPickupPad(isVip) {
    const g = new THREE.Group();
    const padCol = isVip ? 0xef4444 : 0xfacc15;
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.10, 2.0),
      new THREE.MeshBasicMaterial({ color: padCol, transparent: true, opacity: 0.72 })
    );
    pad.position.y = 0.05;
    const parcel = buildVoxelParcel(isVip);
    parcel.position.y = 0.76;
    g.add(pad, parcel);
    return { group: g, parcel: parcel };
  }

  function buildDropoffZone() {
    const g = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 6.4),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.58 })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.04;
    addGlow(g, 2.5, 0.12, 0.24, 0, 0.08, -3.2, 0x4ade80);
    addGlow(g, 2.5, 0.12, 0.24, 0, 0.08, 3.2, 0x4ade80);
    const arrow = new THREE.Group();
    addGlow(arrow, 0.96, 0.24, 0.24, 0, 2.3, 0, 0x4ade80);
    addGlow(arrow, 0.58, 0.24, 0.24, 0, 2.04, 0, 0x4ade80);
    addGlow(arrow, 0.24, 0.24, 0.24, 0, 1.78, 0, 0x4ade80);
    g.add(pad, arrow);
    return { group: g, arrow: arrow };
  }

  global.VoxelFactory = {
    VoxelBuilder: VoxelBuilder,
    buildVoxelCharacter: buildVoxelCharacter,
    buildPlayerVehicle: buildPlayerVehicle,
    buildVoxelParcel: buildVoxelParcel,
    buildVoxelShophouse: buildVoxelShophouse,
    buildVoxelTree: buildVoxelTree,
    buildVoxelPole: buildVoxelPole,
    buildTrafficVoxel: buildTrafficVoxel,
    buildPickupPad: buildPickupPad,
    buildDropoffZone: buildDropoffZone
  };
})(window);
