(function (global) {
  'use strict';

  const CONFIG = {
    STORAGE_KEY: 'shipper_saigon_voxel_v1',
    LANES: [-2.6, 0, 2.6],
    MAX_STACK: 14,

    // 5 Unlockable Voxel Vehicles (purely cosmetic/feel, zero stat upgrades)
    VEHICLES: [
      { id: 0, name: 'Xe Đạp Thồ Thép', short: 'Xe Đạp', cost: 0, img: 'assets/veh_0.jpg', rackY: 0.92, rackZ: 0.88, widthHit: 0.85, horn: 'bell' },
      { id: 1, name: 'Honda Wave Xanh', short: 'Wave', cost: 1500, img: 'assets/veh_1.jpg', rackY: 0.95, rackZ: 0.90, widthHit: 0.95, horn: 'wave' },
      { id: 2, name: 'Honda Vision Đỏ', short: 'Vision', cost: 3500, img: 'assets/veh_2.jpg', rackY: 0.95, rackZ: 0.90, widthHit: 0.95, horn: 'scooter' },
      { id: 3, name: 'Xe Ba Gác Máy Xanh', short: 'Ba Gác', cost: 7000, img: 'assets/veh_3.jpg', rackY: 0.98, rackZ: 1.00, widthHit: 1.15, horn: 'bagac' },
      { id: 4, name: 'Xe Tải Mini Carry', short: 'Tải Mini', cost: 12000, img: 'assets/veh_4.jpg', rackY: 1.04, rackZ: 1.08, widthHit: 1.2, horn: 'truck' }
    ],

    // 5 Unlockable Voxel Characters (mix & match freely with any vehicle)
    CHARACTERS: [
      { id: 0, name: 'Tài Xế Tân Binh', short: 'Tân Binh', cost: 0, img: 'assets/char_0.jpg', jacket: 0x16a34a, helmet: 0x15803d, accent: 0xe2e8f0, mask: true },
      { id: 1, name: 'Cô Nàng Trà Sữa', short: 'Trà Sữa', cost: 2000, img: 'assets/char_1.jpg', jacket: 0xf472b6, helmet: 0xf8fafc, accent: 0xfde047, ponytail: true },
      { id: 2, name: 'Chú Ba Chợ Lớn', short: 'Chú Ba', cost: 4500, img: 'assets/char_2.jpg', jacket: 0x93c5fd, helmet: 0x94a3b8, accent: 0xf8fafc, mustache: true },
      { id: 3, name: 'Sinh Viên Chạy Đêm', short: 'Sinh Viên', cost: 8000, img: 'assets/char_3.jpg', jacket: 0x1e3a8a, helmet: 0x334155, accent: 0xfacc15, backpack: true },
      { id: 4, name: 'Vua Đường Phố', short: 'Vua Phố', cost: 15000, img: 'assets/char_4.jpg', jacket: 0x18181b, helmet: 0x09090b, accent: 0xfacc15, fullface: true }
    ],

    // Dynamic Saigon weather & time-of-day milestones inside a single endless run
    WEATHER_CYCLE: [
      { label: '☀️ Sáng Sài Gòn', sky: 0x93c5fd, fog: 0xfef3c7, sun: 0xfff7ed, sunInt: 0.95, hemi: 0xfffbeb, hemiInt: 0.95, lampOn: false, rain: false },
      { label: '🌇 Hoàng Hôn Tan Tầm', sky: 0xf97316, fog: 0xfdba74, sun: 0xfde047, sunInt: 1.0, hemi: 0xffedd5, hemiInt: 0.86, lampOn: true, rain: false },
      { label: '🌙 Sài Gòn Lên Đèn', sky: 0x0f172a, fog: 0x1e293b, sun: 0x93c5fd, sunInt: 0.58, hemi: 0x64748b, hemiInt: 0.62, lampOn: true, rain: false },
      { label: '🌧️ Mưa Rào Bất Chợt', sky: 0x334155, fog: 0x475569, sun: 0xcbd5e1, sunInt: 0.65, hemi: 0x94a3b8, hemiInt: 0.72, lampOn: true, rain: true }
    ],

    loadSave: function () {
      const def = {
        points: 0,
        bestScore: 0,
        bestDist: 0,
        unlockedVehicles: [0],
        unlockedChars: [0],
        selectedVehicle: 0,
        selectedChar: 0
      };
      try {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          def.points = Number(p.points) || 0;
          def.bestScore = Number(p.bestScore) || 0;
          def.bestDist = Number(p.bestDist) || 0;
          if (Array.isArray(p.unlockedVehicles) && p.unlockedVehicles.length) def.unlockedVehicles = p.unlockedVehicles;
          if (Array.isArray(p.unlockedChars) && p.unlockedChars.length) def.unlockedChars = p.unlockedChars;
          if (typeof p.selectedVehicle === 'number' && def.unlockedVehicles.indexOf(p.selectedVehicle) !== -1) def.selectedVehicle = p.selectedVehicle;
          if (typeof p.selectedChar === 'number' && def.unlockedChars.indexOf(p.selectedChar) !== -1) def.selectedChar = p.selectedChar;
        }
      } catch (e) {}
      return def;
    },

    writeSave: function (data) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
      } catch (e) {}
    }
  };

  global.GameConfig = CONFIG;
})(window);
