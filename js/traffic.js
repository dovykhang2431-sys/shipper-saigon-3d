(function (global) {
  'use strict';

  function createTrafficManager(scene) {
    const VF = global.VoxelFactory;
    const LANES = global.GameConfig.LANES;

    // 1. Traffic Vehicles & Barriers Pool
    const specs = [
      { type: 'motorbike', halfZ: 0.95, halfX: 0.6, speedFactor: 0.48 },
      { type: 'motorbike', halfZ: 0.95, halfX: 0.6, speedFactor: 0.52 },
      { type: 'motorbike', halfZ: 0.95, halfX: 0.6, speedFactor: 0.45 },
      { type: 'motorbike', halfZ: 0.95, halfX: 0.6, speedFactor: 0.5 },
      { type: 'bus', halfZ: 2.75, halfX: 1.05, speedFactor: 0.36 },
      { type: 'bus', halfZ: 2.75, halfX: 1.05, speedFactor: 0.38 },
      { type: 'truck', halfZ: 2.5, halfX: 1.02, speedFactor: 0.38 },
      { type: 'truck', halfZ: 2.5, halfX: 1.02, speedFactor: 0.4 },
      { type: 'cont', halfZ: 4.85, halfX: 1.1, speedFactor: 0.3 },
      { type: 'cont', halfZ: 4.85, halfX: 1.1, speedFactor: 0.32 },
      { type: 'barrier', halfZ: 0.55, halfX: 0.92, speedFactor: 0.0 },
      { type: 'barrier', halfZ: 0.55, halfX: 0.92, speedFactor: 0.0 }
    ];

    const vehicles = specs.map(function (s, idx) {
      const built = VF.buildTrafficVoxel(s.type, idx);
      built.mesh.visible = false;
      scene.add(built.mesh);
      return {
        mesh: built.mesh,
        wheels: built.wheels,
        blinkerL: built.blinkerL,
        blinkerR: built.blinkerR,
        type: s.type,
        halfZ: s.halfZ,
        halfX: s.halfX,
        speedFactor: s.speedFactor,
        active: false,
        lane: 1,
        targetLane: 1,
        blinkTimer: 0,
        nearMissed: false
      };
    });

    // 2. Pickup Pads Pool (Regular Golden + VIP Express Red)
    const pickups = [];
    for (let i = 0; i < 14; i++) {
      const isVip = i < 3;
      const built = VF.buildPickupPad(isVip);
      built.group.visible = false;
      scene.add(built.group);
      pickups.push({ group: built.group, parcel: built.parcel, isVip: isVip, active: false, lane: 1 });
    }

    // 3. Drop-Off Zones Pool (Periodic Green Curb Delivery Pads)
    const dropoffs = [];
    for (let i = 0; i < 3; i++) {
      const built = VF.buildDropoffZone();
      built.group.visible = false;
      scene.add(built.group);
      dropoffs.push({ group: built.group, arrow: built.arrow, active: false, lane: 2, triggered: false });
    }

    let spawnTimer = 0.6;
    let nextDropoffDist = 220;

    function reset() {
      vehicles.forEach(function (v) { v.active = false; v.mesh.visible = false; });
      pickups.forEach(function (p) { p.active = false; p.group.visible = false; });
      dropoffs.forEach(function (d) { d.active = false; d.group.visible = false; d.triggered = false; });
      spawnTimer = 0.55;
      nextDropoffDist = 220;
    }

    function isLaneClear(lane, z, minGap) {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (v.active && (v.lane === lane || v.targetLane === lane)) {
          if (Math.abs(v.mesh.position.z - z) < v.halfZ + minGap) return false;
        }
      }
      return true;
    }

    function activateVehicle(lane, z, noCont) {
      const pool = vehicles.filter(function (v) {
        if (v.active) return false;
        if (noCont && v.type === 'cont') return false;
        return isLaneClear(lane, z, v.halfZ + 8.0);
      });
      if (!pool.length) return null;
      const v = pool[Math.floor(Math.random() * pool.length)];
      v.active = true;
      v.lane = lane;
      v.targetLane = lane;
      v.blinkTimer = 0;
      v.nearMissed = false;
      if (v.blinkerL) v.blinkerL.visible = false;
      if (v.blinkerR) v.blinkerR.visible = false;
      v.mesh.position.set(LANES[lane], 0, z);
      v.mesh.visible = true;

      if (v.type === 'motorbike' && Math.random() < 0.25) {
        const dir = lane === 0 ? 1 : lane === 2 ? -1 : (Math.random() < 0.5 ? -1 : 1);
        const dest = lane + dir;
        if (isLaneClear(dest, z, 12)) {
          v.targetLane = dest;
          v.blinkTimer = 1.6;
        }
      }
      return v;
    }

    function activatePickup(lane, z, wantVip) {
      for (let i = 0; i < pickups.length; i++) {
        const p = pickups[i];
        if (!p.active && p.isVip === wantVip) {
          p.active = true;
          p.lane = lane;
          p.group.position.set(LANES[lane], 0, z);
          p.group.visible = true;
          return true;
        }
      }
      return false;
    }

    function activateDropoff(lane, z) {
      for (let i = 0; i < dropoffs.length; i++) {
        const d = dropoffs[i];
        if (!d.active) {
          d.active = true;
          d.triggered = false;
          d.lane = lane;
          d.group.position.set(LANES[lane], 0, z);
          d.group.visible = true;
          return true;
        }
      }
      return false;
    }

    function update(dt, speed, distance, animClock, vipActive) {
      if (distance >= nextDropoffDist) {
        const curbLane = Math.random() < 0.5 ? 0 : 2;
        if (isLaneClear(curbLane, -86, 9)) {
          activateDropoff(curbLane, -86);
          nextDropoffDist = distance + 240 + Math.random() * 90;
        }
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        const safeLane = Math.floor(Math.random() * 3);
        const spawnZ = -90;
        const otherLanes = [0, 1, 2].filter(function (l) { return l !== safeLane; });
        const vA = activateVehicle(otherLanes[0], spawnZ, false);
        const isCont = vA && vA.type === 'cont';

        if (Math.random() < (isCont ? 0.35 : 0.6)) {
          activateVehicle(otherLanes[1], spawnZ - (isCont ? 7 : 3), true);
        }

        if (Math.random() < 0.88) {
          const wantVip = !vipActive && Math.random() < 0.14;
          if (!activatePickup(safeLane, spawnZ - 1.5, wantVip)) {
            activatePickup(safeLane, spawnZ - 1.5, false);
          }
        }

        const ramp = Math.min(0.45, distance / 3500);
        spawnTimer = Math.max(0.58, 1.24 - ramp) + (isCont ? 0.5 : 0);
      }

      const blinkOn = Math.floor(animClock * 8) % 2 === 0;
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (!v.active) continue;
        const relSpeed = speed * (1 - v.speedFactor);
        v.mesh.position.z += relSpeed * dt;

        if (v.lane !== v.targetLane) {
          if (v.blinkTimer > 0) {
            v.blinkTimer -= dt;
            if (v.targetLane < v.lane && v.blinkerL) v.blinkerL.visible = blinkOn;
            if (v.targetLane > v.lane && v.blinkerR) v.blinkerR.visible = blinkOn;
          } else {
            const tx = LANES[v.targetLane];
            v.mesh.position.x += (tx - v.mesh.position.x) * Math.min(1, dt * 4.5);
            if (Math.abs(tx - v.mesh.position.x) < 0.08) {
              v.mesh.position.x = tx;
              v.lane = v.targetLane;
              if (v.blinkerL) v.blinkerL.visible = false;
              if (v.blinkerR) v.blinkerR.visible = false;
            }
          }
        }

        if (v.wheels.length) {
          const spin = speed * v.speedFactor * dt * 0.85;
          for (let w = 0; w < v.wheels.length; w++) v.wheels[w].rotation.x -= spin;
        }

        if (v.mesh.position.z > 18) {
          v.active = false;
          v.mesh.visible = false;
        }
      }

      for (let i = 0; i < pickups.length; i++) {
        const p = pickups[i];
        if (!p.active) continue;
        p.group.position.z += speed * dt;
        p.parcel.rotation.y += dt * 2.5;
        p.parcel.position.y = 0.76 + Math.sin(animClock * 5 + i) * 0.1;
        if (p.group.position.z > 12) {
          p.active = false;
          p.group.visible = false;
        }
      }

      for (let i = 0; i < dropoffs.length; i++) {
        const d = dropoffs[i];
        if (!d.active) continue;
        d.group.position.z += speed * dt;
        d.arrow.position.y = Math.sin(animClock * 6) * 0.25;
        if (d.group.position.z > 16) {
          d.active = false;
          d.group.visible = false;
        }
      }
    }

    function applyGLBTraffic() {
      if (!global.ModelLoader) return;
      const mapKey = { motorbike: 'npc_bike', bus: 'bus', truck: 'truck', cont: 'cont' };
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const key = mapKey[v.type];
        if (!key) continue;
        const glb = global.ModelLoader.clone(key);
        if (!glb) continue;
        glb.visible = v.mesh.visible;
        glb.position.copy(v.mesh.position);
        scene.remove(v.mesh);
        scene.add(glb);
        v.mesh = glb;
        v.wheels = [];
        v.blinkerL = null;
        v.blinkerR = null;
      }
    }

    return {
      vehicles: vehicles,
      applyGLBTraffic: applyGLBTraffic,
      pickups: pickups,
      dropoffs: dropoffs,
      reset: reset,
      update: update
    };
  }

  global.TrafficManager = { create: createTrafficManager };
})(window);
