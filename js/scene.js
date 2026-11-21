(function (global) {
  'use strict';

  function makeVoxelRoadTex() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#3f4959';
    g.fillRect(0, 0, 256, 256);
    // Crisp voxel-pixel asphalt tiles & subtle tire tracks
    for (let y = 0; y < 256; y += 8) {
      for (let x = 0; x < 256; x += 8) {
        const v = ((x * 7 + y * 13) % 11) - 5;
        g.fillStyle = v > 1 ? 'rgba(255,255,255,0.035)' : v < -1 ? 'rgba(0,0,0,0.055)' : 'transparent';
        g.fillRect(x, y, 8, 8);
      }
    }
    // Tire lane grooves
    g.fillStyle = 'rgba(15, 23, 42, 0.16)';
    [44, 128, 212].forEach(function (cx) {
      g.fillRect(cx - 22, 0, 14, 256);
      g.fillRect(cx + 8, 0, 14, 256);
    });
    // Crisp yellow road shoulders
    g.fillStyle = '#facc15';
    g.fillRect(4, 0, 6, 256);
    g.fillRect(246, 0, 6, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 14);
    return tex;
  }

  function makeSidewalkTex() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#e7e5e4';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#a8a29e';
    g.lineWidth = 3;
    for (let y = 0; y < 128; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke();
    }
    for (let x = 0; x < 128; x += 32) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 28);
    return tex;
  }

  function makeSkyGradient(topHex, midHex, botHex) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, topHex);
    grad.addColorStop(0.55, midHex);
    grad.addColorStop(1, botHex);
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 256);
    return new THREE.CanvasTexture(c);
  }

  function createSaigonScene(stageEl) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const VF = global.VoxelFactory;

    const skyTextures = [
      makeSkyGradient('#38bdf8', '#bae6fd', '#fef3c7'), // Morning golden horizon
      makeSkyGradient('#7c2d12', '#f97316', '#fde047'), // Sunset
      makeSkyGradient('#020617', '#0f172a', '#1e293b'), // Night
      makeSkyGradient('#1e293b', '#475569', '#94a3b8')  // Saigon Rain
    ];

    const scene = new THREE.Scene();
    scene.background = skyTextures[0];
    scene.fog = new THREE.Fog(0xfef3c7, 42, 118);

    const camera = new THREE.PerspectiveCamera(52, 9 / 16, 0.5, 140);
    const camBase = new THREE.Vector3(0, 5.0, 7.8);
    camera.position.copy(camBase);
    camera.lookAt(0, 1.5, -10);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: 'high-performance',
      precision: isMobile ? 'mediump' : 'highp',
      stencil: false,
      depth: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    // Enable crisp MagicaVoxel-style directional sun shadows!
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stageEl.insertBefore(renderer.domElement, stageEl.firstChild);

    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x64748b, 0.72);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffe8b6, 1.15);
    sunLight.position.set(18, 26, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = isMobile ? 1024 : 1536;
    sunLight.shadow.mapSize.height = isMobile ? 1024 : 1536;
    sunLight.shadow.camera.near = 4;
    sunLight.shadow.camera.far = 95;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 38;
    sunLight.shadow.camera.bottom = -16;
    sunLight.shadow.bias = -0.0008;
    scene.add(sunLight);

    const roadTex = makeVoxelRoadTex();
    const sideTex = makeSidewalkTex();

    // Ground, Textured Voxel Road & Tiled Sidewalks (receiving real sun shadows!)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 165),
      new THREE.MeshLambertMaterial({ color: 0x65a30d })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.06, -55);
    ground.receiveShadow = true;
    ground.matrixAutoUpdate = false;
    ground.updateMatrix();
    scene.add(ground);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 165),
      new THREE.MeshLambertMaterial({ map: roadTex })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -55);
    road.receiveShadow = true;
    road.matrixAutoUpdate = false;
    road.updateMatrix();
    scene.add(road);

    const curbMat = new THREE.MeshLambertMaterial({ map: sideTex });
    [-5.8, 5.8].forEach(function (xPos) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.26, 165), curbMat);
      curb.position.set(xPos, 0.13, -55);
      curb.receiveShadow = true;
      curb.matrixAutoUpdate = false;
      curb.updateMatrix();
      scene.add(curb);
    });

    // Properly Proportioned Distant Voxel Landmark 81 & Saigon Skyline (1 Draw Call!)
    const skyVB = new VF.VoxelBuilder();
    // Landmark 81 stepped tapered Voxel spire
    skyVB.add(5.0, 18, 5.0, 6.5, 9, -112, 0xcbd5e1);
    skyVB.add(3.6, 26, 3.6, 6.5, 13, -112, 0xdbeafe);
    skyVB.add(2.2, 34, 2.2, 6.5, 17, -112, 0xe2e8f0);
    skyVB.add(0.9, 41, 0.9, 6.5, 20.5, -112, 0xf8fafc);
    // Surrounding Binh Thanh skyline towers
    skyVB.add(4.2, 16, 4.0, -1.5, 8, -114, 0x94a3b8);
    skyVB.add(4.6, 14, 4.0, 13.5, 7, -114, 0x94a3b8);
    skyVB.add(4.0, 20, 4.0, -8.5, 10, -112, 0xb0c4de);
    skyVB.add(3.8, 12, 3.8, -14.5, 6, -114, 0x94a3b8);
    const skylineMesh = skyVB.build(false, false);
    scene.add(skylineMesh);

    // InstancedMesh: Lane Dashes (1 Draw Call)
    const DASH_ROWS = 20;
    const dashGeo = new THREE.PlaneGeometry(0.18, 2.4);
    dashGeo.rotateX(-Math.PI / 2);
    const dashInst = new THREE.InstancedMesh(dashGeo, new THREE.MeshBasicMaterial({ color: 0xf8fafc }), DASH_ROWS * 2);
    scene.add(dashInst);

    // Overhead Saigon Power Cables (2 thin continuous wires along utility poles)
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    [-5.1, 5.1].forEach(function (cx) {
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 150), cableMat);
      c1.position.set(cx, 3.65, -52);
      c1.matrixAutoUpdate = false; c1.updateMatrix();
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 150), cableMat);
      c2.position.set(cx, 3.35, -52);
      c2.matrixAutoUpdate = false; c2.updateMatrix();
      scene.add(c1, c2);
    });

    // Scrolling Voxel Saigon Shophouses (1 Draw Call per house, casting real sun shadows!)
    const houses = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const hMesh = VF.buildVoxelShophouse(i % 3, side);
      hMesh.position.set(side * 9.2, 0, -(Math.floor(i / 2) * 12.2) + 12);
      scene.add(hMesh);
      houses.push(hMesh);
    }

    // Scrolling Voxel Trees & Utility Poles
    const trees = [];
    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const tMesh = VF.buildVoxelTree();
      tMesh.position.set(side * 5.9, 0, -(Math.floor(i / 2) * 18) + 8);
      scene.add(tMesh);
      trees.push(tMesh);
    }

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const poles = [];
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const pMesh = VF.buildVoxelPole(side, bulbMat);
      pMesh.position.set(side * 5.1, 0, -(Math.floor(i / 2) * 20) + 2);
      scene.add(pMesh);
      poles.push(pMesh);
    }

    // Lightweight Voxel Rain Streaks (InstancedMesh)
    const RAIN_COUNT = 80;
    const rainGeo = new THREE.BoxGeometry(0.04, 0.78, 0.04);
    const rainMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.65 });
    const rainInst = new THREE.InstancedMesh(rainGeo, rainMat, RAIN_COUNT);
    rainInst.visible = false;
    scene.add(rainInst);
    const rainDrops = [];
    for (let i = 0; i < RAIN_COUNT; i++) {
      rainDrops.push({
        x: (Math.random() - 0.5) * 16,
        y: Math.random() * 14,
        z: -Math.random() * 35 + 6
      });
    }

    const _dummy = new THREE.Object3D();
    let scrollOffset = 0;
    let isRaining = false;

    function applyWeather(wDef, wIndex) {
      scene.background = skyTextures[wIndex] || skyTextures[0];
      scene.fog.color.setHex(wDef.fog);
      sunLight.color.setHex(wDef.sun);
      sunLight.intensity = wDef.sunInt * 1.15;
      hemiLight.color.setHex(wDef.hemi);
      hemiLight.intensity = wDef.hemiInt * 0.78;
      bulbMat.color.setHex(wDef.lampOn ? 0xfef08a : 0x94a3b8);
      isRaining = !!wDef.rain;
      rainInst.visible = isRaining;
    }

    function updateEnvironment(dt, speed) {
      const step = speed * dt;
      scrollOffset = (scrollOffset + step) % 6;
      roadTex.offset.y = (roadTex.offset.y + step * 0.09) % 1;
      sideTex.offset.y = (sideTex.offset.y + step * 0.16) % 1;

      let idx = 0;
      for (let i = 0; i < DASH_ROWS; i++) {
        const z = -i * 6 + scrollOffset + 8;
        _dummy.position.set(-1.32, 0.02, z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        dashInst.setMatrixAt(idx++, _dummy.matrix);

        _dummy.position.set(1.32, 0.02, z);
        _dummy.updateMatrix();
        dashInst.setMatrixAt(idx++, _dummy.matrix);
      }
      dashInst.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < houses.length; i++) {
        houses[i].position.z += step;
        if (houses[i].position.z > 18) houses[i].position.z -= (houses.length / 2) * 12.2;
      }
      for (let i = 0; i < trees.length; i++) {
        trees[i].position.z += step;
        if (trees[i].position.z > 16) trees[i].position.z -= (trees.length / 2) * 18;
      }
      for (let i = 0; i < poles.length; i++) {
        poles[i].position.z += step;
        if (poles[i].position.z > 16) poles[i].position.z -= (poles.length / 2) * 20;
      }

      if (isRaining) {
        for (let i = 0; i < RAIN_COUNT; i++) {
          const r = rainDrops[i];
          r.y -= 26 * dt;
          r.z += step * 0.6;
          if (r.y < 0 || r.z > 10) {
            r.y = 12 + Math.random() * 4;
            r.z = -Math.random() * 35 + 4;
          }
          _dummy.position.set(r.x, r.y, r.z);
          _dummy.updateMatrix();
          rainInst.setMatrixAt(i, _dummy.matrix);
        }
        rainInst.instanceMatrix.needsUpdate = true;
      }
    }

    function resize() {
      const w = stageEl.clientWidth || window.innerWidth;
      const h = stageEl.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function applyGLBHouses() {
      if (!global.ModelLoader) return;
      for (let i = 0; i < houses.length; i++) {
        const key = 'house_' + (i % 3);
        const glb = global.ModelLoader.clone(key);
        if (!glb) continue;
        const side = i % 2 === 0 ? -1 : 1;
        glb.position.copy(houses[i].position);
        glb.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
        scene.remove(houses[i]);
        scene.add(glb);
        houses[i] = glb;
      }
    }

    return {
      scene: scene,
      applyGLBHouses: applyGLBHouses,
      camera: camera,
      camBase: camBase,
      renderer: renderer,
      applyWeather: applyWeather,
      updateEnvironment: updateEnvironment,
      resize: resize
    };
  }

  global.SaigonScene = { create: createSaigonScene };
})(window);
