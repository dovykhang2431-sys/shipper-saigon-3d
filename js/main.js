(function () {
  'use strict';

  const CFG = window.GameConfig;
  const FX = window.AudioFX;
  const VF = window.VoxelFactory;

  // --- DOM References ---
  const stageEl = document.getElementById('stage');
  const hudScore = document.getElementById('hud-score');
  const hudDist = document.getElementById('hud-dist');
  const hudSpeed = document.getElementById('hud-speed');
  const hudBoxes = document.getElementById('hud-boxes');
  const hudWeightState = document.getElementById('hud-weight-state');
  const weightFill = document.getElementById('weight-fill');
  const hudMult = document.getElementById('hud-mult');
  const vipBanner = document.getElementById('vip-banner');
  const vipTimerEl = document.getElementById('vip-timer');
  const perfBadge = document.getElementById('perf-badge');
  const weatherBadge = document.getElementById('weather-badge');
  const touchHint = document.getElementById('touch-hint');
  const feedbackLayer = document.getElementById('feedback-layer');

  const overlayLobby = document.getElementById('overlay-lobby');
  const overlayPause = document.getElementById('overlay-pause');
  const overlayGameOver = document.getElementById('overlay-gameover');

  const lobbyPoints = document.getElementById('lobby-points');
  const lobbyBestScore = document.getElementById('lobby-best-score');
  const lobbyBestDist = document.getElementById('lobby-best-dist');
  const selectedVehName = document.getElementById('selected-veh-name');
  const selectedCharName = document.getElementById('selected-char-name');
  const vehicleStrip = document.getElementById('vehicle-strip');
  const characterStrip = document.getElementById('character-strip');

  const goScore = document.getElementById('go-score');
  const goDist = document.getElementById('go-dist');
  const goDelivered = document.getElementById('go-delivered');
  const goDesc = document.getElementById('go-desc');

  const btnPlay = document.getElementById('btn-play');
  const btnHorn = document.getElementById('btn-horn');
  const btnMute = document.getElementById('btn-mute');
  const icoSoundOn = document.getElementById('ico-sound-on');
  const icoSoundOff = document.getElementById('ico-sound-off');
  const btnPause = document.getElementById('btn-pause');
  const btnResume = document.getElementById('btn-resume');
  const btnRestartPause = document.getElementById('btn-restart-pause');
  const btnLobbyPause = document.getElementById('btn-lobby-pause');
  const btnRetry = document.getElementById('btn-retry');
  const btnLobbyGo = document.getElementById('btn-lobby-go');

  // --- Initialize Scene & Traffic ---
  const world = window.SaigonScene.create(stageEl);
  const traffic = window.TrafficManager.create(world.scene);

  // --- Player Rig ---
  const playerGroup = new THREE.Group();
  world.scene.add(playerGroup);

  const bikeTiltGroup = new THREE.Group();
  playerGroup.add(bikeTiltGroup);

  const vehSlot = new THREE.Group();
  const charSlot = new THREE.Group();
  bikeTiltGroup.add(vehSlot, charSlot);

  let activeWheels = [];
  const stackBoxes = [];
  for (let i = 0; i < CFG.MAX_STACK; i++) {
    const b = VF.buildVoxelParcel(false);
    b.visible = false;
    bikeTiltGroup.add(b);
    stackBoxes.push(b);
  }

  // --- State ---
  const save = CFG.loadSave();
  let gameState = 'lobby';
  let distance = 0;
  let runScore = 0;
  let deliveredTotal = 0;
  let stackCount = 0;
  let currentSpeed = 18;
  let targetLane = 1;
  let playerX = 0;
  let playerVX = 0;
  let weatherIdx = 0;
  let vipTimer = 0;
  let shakeTimer = 0;
  let hasMoved = false;
  let rafId = null;

  function getVeh() { return CFG.VEHICLES[save.selectedVehicle] || CFG.VEHICLES[0]; }
  function getChar() { return CFG.CHARACTERS[save.selectedChar] || CFG.CHARACTERS[0]; }

  function rebuildPlayerModel() {
    while (vehSlot.children.length) vehSlot.remove(vehSlot.children[0]);
    while (charSlot.children.length) charSlot.remove(charSlot.children[0]);

    // Player vehicle + rider: always the built-in 3D voxel models, NOT the
    // .glb reliefs. The .glb vehicles are flat side-view reliefs (frame and
    // wheels edge-on and invisible from the chase camera), and the .glb
    // characters are flat front-view reliefs — from behind you see the
    // rider's mirrored FRONT, standing straight and holding a parcel, which
    // reads as standing on the cargo box. The fallback models are true 3D:
    // the rider sits with hands on the handlebar, back to the camera, and
    // the bike has a wide handlebar, rack and real 3D wheels. The .glb
    // models still show up as traffic, houses and (via the menu art) the
    // character/vehicle portraits. (2026-11-21, after three live playtests.)
    const builtVeh = VF.buildPlayerVehicle(save.selectedVehicle);
    vehSlot.add(builtVeh.group);
    activeWheels = builtVeh.wheels;

    if (save.selectedVehicle !== 4) {
      const zOff = save.selectedVehicle === 3 ? -0.32 : -0.14;
      const yOff = save.selectedVehicle === 3 ? 1.2 : 1.15;
      charSlot.add(VF.buildVoxelCharacter(getChar(), yOff, zOff));
    }
  }

  function showToast(text, color) {
    const el = document.createElement('div');
    el.className = 'float-msg';
    el.style.color = color || '#fde047';
    el.textContent = text;
    feedbackLayer.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 900);
  }

  function getStackMultiplier(count) {
    if (count >= 10) return 5;
    if (count >= 7) return 3;
    if (count >= 4) return 2;
    return 1;
  }

  function refreshCargoUI() {
    for (let i = 0; i < CFG.MAX_STACK; i++) {
      stackBoxes[i].visible = i < stackCount;
    }
    hudBoxes.textContent = String(stackCount);
    const pct = Math.min(100, (stackCount / CFG.MAX_STACK) * 100);
    weightFill.style.width = pct.toFixed(0) + '%';
    hudMult.textContent = 'x' + getStackMultiplier(stackCount);

    if (stackCount <= 2) {
      hudWeightState.textContent = 'Nhẹ tay';
      hudWeightState.style.color = '#86efac';
    } else if (stackCount <= 6) {
      hudWeightState.textContent = 'Đầm lái';
      hudWeightState.style.color = '#fde047';
    } else {
      hudWeightState.textContent = 'Rất nặng!';
      hudWeightState.style.color = '#f87171';
    }
  }

  function renderLobby() {
    lobbyPoints.textContent = String(save.points);
    lobbyBestScore.textContent = String(save.bestScore);
    lobbyBestDist.textContent = save.bestDist + 'm';
    selectedVehName.textContent = getVeh().name;
    selectedCharName.textContent = getChar().name;

    vehicleStrip.innerHTML = '';
    CFG.VEHICLES.forEach(function (v) {
      const unlocked = save.unlockedVehicles.indexOf(v.id) !== -1;
      const selected = save.selectedVehicle === v.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sel-item' + (selected ? ' selected' : '') + (!unlocked ? ' locked' : '');
      btn.setAttribute('data-veh', String(v.id));
      btn.innerHTML =
        '<img src="' + v.img + '" alt="' + v.name + '" />' +
        '<div class="sel-tag">' + (selected ? 'Đang dùng' : unlocked ? v.short : '🔒 ' + v.cost) + '</div>';
      vehicleStrip.appendChild(btn);
    });

    characterStrip.innerHTML = '';
    CFG.CHARACTERS.forEach(function (c) {
      const unlocked = save.unlockedChars.indexOf(c.id) !== -1;
      const selected = save.selectedChar === c.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sel-item' + (selected ? ' selected' : '') + (!unlocked ? ' locked' : '');
      btn.setAttribute('data-char', String(c.id));
      btn.innerHTML =
        '<img src="' + c.img + '" alt="' + c.name + '" />' +
        '<div class="sel-tag">' + (selected ? 'Đang dùng' : unlocked ? c.short : '🔒 ' + c.cost) + '</div>';
      characterStrip.appendChild(btn);
    });
  }

  vehicleStrip.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-veh]');
    if (!btn) return;
    FX.unlock();
    const id = Number(btn.getAttribute('data-veh'));
    const v = CFG.VEHICLES[id];
    if (!v) return;
    if (save.unlockedVehicles.indexOf(id) !== -1) {
      save.selectedVehicle = id;
      CFG.writeSave(save);
      FX.horn(v.horn);
      rebuildPlayerModel();
      renderLobby();
    } else if (save.points >= v.cost) {
      save.points -= v.cost;
      save.unlockedVehicles.push(id);
      save.selectedVehicle = id;
      CFG.writeSave(save);
      FX.unlockItem();
      showToast('Đã mở khóa ' + v.name + '!', '#fde047');
      rebuildPlayerModel();
      renderLobby();
    } else {
      FX.deny();
      showToast('Cần thêm ' + (v.cost - save.points) + ' điểm!', '#fca5a5');
    }
  });

  characterStrip.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-char]');
    if (!btn) return;
    FX.unlock();
    const id = Number(btn.getAttribute('data-char'));
    const c = CFG.CHARACTERS[id];
    if (!c) return;
    if (save.unlockedChars.indexOf(id) !== -1) {
      save.selectedChar = id;
      CFG.writeSave(save);
      FX.lane();
      rebuildPlayerModel();
      renderLobby();
    } else if (save.points >= c.cost) {
      save.points -= c.cost;
      save.unlockedChars.push(id);
      save.selectedChar = id;
      CFG.writeSave(save);
      FX.unlockItem();
      showToast('Đã mở khóa ' + c.name + '!', '#86efac');
      rebuildPlayerModel();
      renderLobby();
    } else {
      FX.deny();
      showToast('Cần thêm ' + (c.cost - save.points) + ' điểm!', '#fca5a5');
    }
  });

  function resetRun() {
    distance = 0;
    runScore = 0;
    deliveredTotal = 0;
    stackCount = 1;
    currentSpeed = 18;
    targetLane = 1;
    playerX = 0;
    playerVX = 0;
    weatherIdx = 0;
    vipTimer = 0;
    shakeTimer = 0;
    hasMoved = false;

    playerGroup.position.set(0, 0, 0);
    bikeTiltGroup.rotation.set(0, 0, 0);
    traffic.reset();

    world.applyWeather(CFG.WEATHER_CYCLE[0], 0);
    weatherBadge.textContent = CFG.WEATHER_CYCLE[0].label;
    vipBanner.classList.add('hidden');
    touchHint.classList.remove('hidden');

    hudScore.textContent = '0';
    hudDist.textContent = '0m';
    hudSpeed.textContent = '36 km/h';
    refreshCargoUI();
  }

  function startRun() {
    FX.unlock();
    resetRun();
    gameState = 'playing';
    overlayLobby.classList.add('hidden');
    overlayPause.classList.add('hidden');
    overlayGameOver.classList.add('hidden');
  }

  function openLobby() {
    gameState = 'lobby';
    resetRun();
    rebuildPlayerModel();
    renderLobby();
    overlayLobby.classList.remove('hidden');
    overlayPause.classList.add('hidden');
    overlayGameOver.classList.add('hidden');
  }

  function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    overlayPause.classList.remove('hidden');
  }

  function resumeGame() {
    if (gameState !== 'paused') return;
    FX.unlock();
    gameState = 'playing';
    overlayPause.classList.add('hidden');
  }

  function triggerGameOver(hitType) {
    gameState = 'gameover';
    FX.crash();
    shakeTimer = 0.35;

    const finalDist = Math.floor(distance);
    const totalRunPoints = Math.floor(runScore + finalDist * 0.2);
    save.points += totalRunPoints;
    if (totalRunPoints > save.bestScore) save.bestScore = totalRunPoints;
    if (finalDist > save.bestDist) save.bestDist = finalDist;
    CFG.writeSave(save);

    const names = {
      motorbike: 'xe máy phía trước',
      bus: 'xe buýt SaigonBus',
      truck: 'xe tải thùng kín',
      cont: 'xe đầu kéo Container 40ft',
      barrier: 'rào chắn công trình'
    };
    goDesc.textContent = 'Bạn đã va phải ' + (names[hitType] || 'vật cản') + ' khi đang chở ' + stackCount + ' thùng hàng.';
    goScore.textContent = '+' + totalRunPoints;
    goDist.textContent = finalDist + 'm';
    goDelivered.textContent = String(deliveredTotal);
    overlayGameOver.classList.remove('hidden');
  }

  function moveLane(dir) {
    if (gameState !== 'playing') return;
    const next = Math.max(0, Math.min(2, targetLane + dir));
    if (next !== targetLane) {
      targetLane = next;
      FX.lane();
      if (!hasMoved) {
        hasMoved = true;
        touchHint.classList.add('hidden');
      }
    }
  }

  let pointerDown = false;
  let startX = 0;
  let swiped = false;

  world.renderer.domElement.addEventListener('pointerdown', function (e) {
    if (gameState !== 'playing') return;
    FX.unlock();
    pointerDown = true;
    startX = e.clientX;
    swiped = false;
  });

  window.addEventListener('pointermove', function (e) {
    if (!pointerDown || gameState !== 'playing') return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) >= 32 && !swiped) {
      moveLane(dx > 0 ? 1 : -1);
      startX = e.clientX;
      swiped = true;
    }
  });

  window.addEventListener('pointerup', function (e) {
    if (!pointerDown) return;
    if (!swiped && gameState === 'playing') {
      const rect = stageEl.getBoundingClientRect();
      const rx = e.clientX - rect.left;
      if (rx < rect.width * 0.42) moveLane(-1);
      else if (rx > rect.width * 0.58) moveLane(1);
    }
    pointerDown = false;
  });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLane(-1);
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveLane(1);
    else if (e.key === 'h' || e.key === 'H') FX.horn(getVeh().horn);
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (gameState === 'playing') pauseGame();
      else if (gameState === 'paused') resumeGame();
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (gameState === 'lobby' || gameState === 'gameover') startRun();
    }
  });

  btnPlay.addEventListener('click', startRun);
  btnRetry.addEventListener('click', startRun);
  btnHorn.addEventListener('click', function () { FX.horn(getVeh().horn); });
  btnPause.addEventListener('click', function () {
    if (gameState === 'playing') pauseGame();
    else if (gameState === 'paused') resumeGame();
  });
  btnResume.addEventListener('click', resumeGame);
  btnRestartPause.addEventListener('click', startRun);
  btnLobbyPause.addEventListener('click', openLobby);
  btnLobbyGo.addEventListener('click', openLobby);
  btnMute.addEventListener('click', function () {
    FX.muted = !FX.muted;
    icoSoundOn.style.display = FX.muted ? 'none' : 'inline-block';
    icoSoundOff.style.display = FX.muted ? 'inline-block' : 'none';
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && gameState === 'playing') pauseGame();
  });

  window.addEventListener('resize', world.resize);

  let lastTime = performance.now();
  let fpsFrames = 0;
  let fpsTimer = 0;
  let animClock = 0;

  function animate(now) {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    animClock += dt;

    fpsFrames++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      const fps = Math.round(fpsFrames / fpsTimer);
      perfBadge.textContent = fps + ' FPS · ' + world.renderer.info.render.calls + ' calls';
      fpsFrames = 0;
      fpsTimer = 0;
    }

    const veh = getVeh();

    if (gameState === 'playing') {
      currentSpeed = Math.min(36, 18 + distance * 0.0048);
      distance += currentSpeed * dt;

      hudDist.textContent = Math.floor(distance) + 'm';
      hudSpeed.textContent = Math.round(currentSpeed * 2.1) + ' km/h';

      const nextW = Math.floor(distance / 500) % CFG.WEATHER_CYCLE.length;
      if (nextW !== weatherIdx) {
        weatherIdx = nextW;
        const wDef = CFG.WEATHER_CYCLE[weatherIdx];
        world.applyWeather(wDef, weatherIdx);
        weatherBadge.textContent = wDef.label;
        showToast(wDef.label, '#7dd3fc');
      }

      if (vipTimer > 0) {
        vipTimer -= dt;
        vipTimerEl.textContent = Math.ceil(Math.max(0, vipTimer)) + 's';
        if (vipTimer <= 0) {
          vipBanner.classList.add('hidden');
          showToast('Hết giờ Đơn Hỏa Tốc!', '#fca5a5');
        }
      }

      world.updateEnvironment(dt, currentSpeed);
      traffic.update(dt, currentSpeed, distance, animClock, vipTimer > 0);

      const rainSlip = CFG.WEATHER_CYCLE[weatherIdx].rain ? 0.78 : 1.0;
      const steerResponsiveness = Math.max(4.2, (13.5 - stackCount * 0.72) * rainSlip);
      const targetX = CFG.LANES[targetLane];
      const prevX = playerX;
      playerX += (targetX - playerX) * Math.min(1, dt * steerResponsiveness);
      playerVX = (playerX - prevX) / Math.max(dt, 0.001);
      playerGroup.position.x = playerX;

      const leanTarget = -playerVX * (0.028 + stackCount * 0.0022);
      bikeTiltGroup.rotation.z += (leanTarget - bikeTiltGroup.rotation.z) * Math.min(1, dt * 12);
      bikeTiltGroup.position.y = Math.abs(Math.sin(animClock * 18)) * 0.035;

      for (let w = 0; w < activeWheels.length; w++) {
        activeWheels[w].rotation.x -= currentSpeed * dt * 0.9;
      }

      for (let i = 0; i < stackCount; i++) {
        const box = stackBoxes[i];
        const sway = -playerVX * (0.015 + stackCount * 0.0015) * (i + 1) +
          Math.sin(animClock * 6.5 + i * 0.55) * 0.014 * i;
        box.position.set(sway, veh.rackY + i * 0.44, veh.rackZ);
        box.rotation.z = -sway * 0.34;
      }

      for (let i = 0; i < traffic.pickups.length; i++) {
        const p = traffic.pickups[i];
        if (!p.active) continue;
        if (Math.abs(p.group.position.z) < 1.35 && Math.abs(p.group.position.x - playerX) < 1.2) {
          p.active = false;
          p.group.visible = false;
          if (stackCount < CFG.MAX_STACK) {
            stackCount++;
            refreshCargoUI();
          } else {
            runScore += 40;
          }
          if (p.isVip) {
            vipTimer = 15;
            vipBanner.classList.remove('hidden');
            FX.pickup(stackCount, true);
            showToast('⚡ Nhận ĐƠN HỎA TỐC x3!', '#fde047');
          } else {
            FX.pickup(stackCount, false);
            showToast('+1 Thùng (Nặng hơn!)', '#fde047');
          }
          hudScore.textContent = String(Math.floor(runScore));
        }
      }

      for (let i = 0; i < traffic.dropoffs.length; i++) {
        const d = traffic.dropoffs[i];
        if (!d.active || d.triggered) continue;
        if (Math.abs(d.group.position.z) < 3.2 && Math.abs(d.group.position.x - playerX) < 1.35) {
          d.triggered = true;
          if (stackCount > 0) {
            const mult = getStackMultiplier(stackCount);
            const vipMult = vipTimer > 0 ? 3 : 1;
            const gained = stackCount * 100 * mult * vipMult;
            runScore += gained;
            deliveredTotal += stackCount;
            stackCount = 0;
            if (vipTimer > 0) {
              vipTimer = 0;
              vipBanner.classList.add('hidden');
            }
            refreshCargoUI();
            hudScore.textContent = String(Math.floor(runScore));
            FX.deliver();
            showToast('GIAO XONG +' + gained + ' ĐIỂM!', '#4ade80');
          }
        }
      }

      for (let i = 0; i < traffic.vehicles.length; i++) {
        const v = traffic.vehicles[i];
        if (!v.active) continue;
        const dz = Math.abs(v.mesh.position.z);
        const dx = Math.abs(v.mesh.position.x - playerX);

        if (dz < v.halfZ + 0.8 && dx < (v.halfX + veh.widthHit * 0.55)) {
          triggerGameOver(v.type);
          break;
        }

        if (!v.nearMissed && v.mesh.position.z > 0.5 && v.mesh.position.z < 3.5 && dx < 2.25 && dx >= (v.halfX + veh.widthHit * 0.55)) {
          v.nearMissed = true;
          runScore += 50;
          hudScore.textContent = String(Math.floor(runScore));
          FX.nearMiss();
          showToast('Lách lụa +50!', '#38bdf8');
        }
      }
    } else {
      world.updateEnvironment(dt * 0.3, 18);
      bikeTiltGroup.position.y = Math.sin(animClock * 4) * 0.03;
      for (let i = 0; i < stackCount; i++) {
        stackBoxes[i].position.set(0, veh.rackY + i * 0.44, veh.rackZ);
        stackBoxes[i].rotation.z = 0;
      }
    }

    const camX = playerX * 0.38;
    let shakeX = 0;
    let shakeY = 0;
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      shakeX = (Math.random() - 0.5) * 0.5;
      shakeY = (Math.random() - 0.5) * 0.4;
    }
    world.camera.position.set(camX + shakeX, world.camBase.y + shakeY, world.camBase.z);
    world.camera.lookAt(playerX * 0.25, 1.5, -10);

    world.renderer.render(world.scene, world.camera);
  }

  window.onload = function () {
    world.resize();
    if (window.ModelLoader) {
      window.ModelLoader.preloadAll(function (count) {
        if (count > 0) {
          rebuildPlayerModel();
          if (world.applyGLBHouses) world.applyGLBHouses();
          if (traffic.applyGLBTraffic) traffic.applyGLBTraffic();
        }
      });
    }
    rebuildPlayerModel();
    renderLobby();
    resetRun();
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = performance.now();
    rafId = requestAnimationFrame(animate);
  };
})();
