(function (global) {
  'use strict';

  // Exact file mapping inside /models/ folder
  // Drop any .glb exported from Tripo3D / Meshy here -> auto-loaded, auto-scaled, auto-grounded!
  // NOTE (voxel .glb, 2026-11-21): the voxel models are side-view reliefs,
  // so a vehicle's length lies along X with its front wheel at +X.
  // rotY = PI/2 turns that into the game's forward axis (-Z), matching the
  // built-in voxel fallback (front wheel at -Z). Characters stay at PI
  // (front face -> -Z, seen from behind like the fallback rider).
  const MODEL_MANIFEST = {
    veh_0:    { path: 'models/veh_0.glb',    targetLength: 1.9,  rotY: Math.PI / 2 },
    veh_1:    { path: 'models/veh_1.glb',    targetLength: 2.0,  rotY: Math.PI / 2 },
    veh_2:    { path: 'models/veh_2.glb',    targetLength: 1.95, rotY: Math.PI / 2 },
    veh_3:    { path: 'models/veh_3.glb',    targetLength: 2.6,  rotY: Math.PI / 2 },
    veh_4:    { path: 'models/veh_4.glb',    targetLength: 3.1,  rotY: Math.PI / 2 },
    char_0:   { path: 'models/char_0.glb',   targetHeight: 1.45, rotY: Math.PI },
    char_1:   { path: 'models/char_1.glb',   targetHeight: 1.42, rotY: Math.PI },
    char_2:   { path: 'models/char_2.glb',   targetHeight: 1.45, rotY: Math.PI },
    char_3:   { path: 'models/char_3.glb',   targetHeight: 1.45, rotY: Math.PI },
    char_4:   { path: 'models/char_4.glb',   targetHeight: 1.48, rotY: Math.PI },
    npc_bike: { path: 'models/npc_bike.glb', targetLength: 1.95, rotY: Math.PI / 2 },
    bus:      { path: 'models/bus.glb',      targetLength: 5.5,  rotY: Math.PI / 2 },
    truck:    { path: 'models/truck.glb',    targetLength: 5.0,  rotY: Math.PI / 2 },
    cont:     { path: 'models/cont.glb',     targetLength: 10.2, rotY: Math.PI / 2 },
    house_0:  { path: 'models/house_0.glb',  targetHeight: 7.2,  rotY: 0 },
    house_1:  { path: 'models/house_1.glb',  targetHeight: 6.8,  rotY: 0 },
    house_2:  { path: 'models/house_2.glb',  targetHeight: 6.4,  rotY: 0 }
  };

  const cache = {};
  const _box = new THREE.Box3();
  const _size = new THREE.Vector3();
  const _center = new THREE.Vector3();

  function normalizeModel(root, spec) {
    const wrapper = new THREE.Group();
    if (spec.rotY) root.rotation.y = spec.rotY;
    root.updateMatrixWorld(true);

    _box.setFromObject(root);
    _box.getSize(_size);
    _box.getCenter(_center);

    // Auto-scale to exact target real-world dimension
    let scale = 1;
    if (spec.targetLength && _size.z > 0.001) {
      scale = spec.targetLength / Math.max(_size.z, _size.x);
    } else if (spec.targetHeight && _size.y > 0.001) {
      scale = spec.targetHeight / _size.y;
    }
    root.scale.setScalar(scale);
    root.updateMatrixWorld(true);

    // Recompute bounds and snap bottom cleanly to y = 0, centered on X/Z
    _box.setFromObject(root);
    _box.getCenter(_center);
    root.position.set(-_center.x, -_box.min.y, -_center.z);

    root.traverse(function (node) {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    wrapper.add(root);
    return wrapper;
  }

  function preloadAll(onDone) {
    if (typeof THREE.GLTFLoader !== 'function') {
      if (onDone) onDone(0);
      return;
    }
    const loader = new THREE.GLTFLoader();
    const keys = Object.keys(MODEL_MANIFEST);
    let pending = keys.length;
    let loadedCount = 0;

    function finishOne() {
      pending--;
      if (pending <= 0 && onDone) onDone(loadedCount);
    }

    keys.forEach(function (key) {
      const spec = MODEL_MANIFEST[key];
      loader.load(
        spec.path,
        function (gltf) {
          cache[key] = normalizeModel(gltf.scene, spec);
          loadedCount++;
          finishOne();
        },
        undefined,
        function () {
          // File not placed in models/ yet -> silently fall back to built-in Voxel mesh
          finishOne();
        }
      );
    });
  }

  function clone(key) {
    return cache[key] ? cache[key].clone(true) : null;
  }

  function has(key) {
    return !!cache[key];
  }

  global.ModelLoader = {
    MANIFEST: MODEL_MANIFEST,
    preloadAll: preloadAll,
    clone: clone,
    has: has
  };
})(window);
