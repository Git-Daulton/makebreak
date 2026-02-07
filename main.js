import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const WORLD_X = 64;
const WORLD_Y = 32;
const WORLD_Z = 64;
const WORLD_SIZE = WORLD_X * WORLD_Y * WORLD_Z;

const CHUNK_SIZE = 16;
const CHUNK_X = WORLD_X / CHUNK_SIZE;
const CHUNK_Y = WORLD_Y / CHUNK_SIZE;
const CHUNK_Z = WORLD_Z / CHUNK_SIZE;

const REACH = 6;

const PLAYER_HEIGHT = 1.75;
const PLAYER_RADIUS = 0.35;
const EYE_OFFSET = 1.62;

const GRAVITY = 30;
const MAX_FALL_SPEED = 30;
const JUMP_SPEED = 9.2;
const MAX_MOVE_SPEED = 7.2;
const GROUND_ACCEL = 55;
const AIR_ACCEL = 16;
const GROUND_FRICTION = 12;
const AIR_FRICTION = 1.6;

const FPS_SAMPLE_COUNT = 30;
const HUD_UPDATE_INTERVAL = 0.15;

const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD: 5,
  PLANK: 6,
  BRICK: 7,
  LEAF: 8,
  CLAY: 9,
  SNOW: 10,
};

const BLOCK_NAMES = {
  1: "Grass",
  2: "Dirt",
  3: "Stone",
  4: "Sand",
  5: "Wood",
  6: "Plank",
  7: "Brick",
  8: "Leaf",
  9: "Clay",
  10: "Snow",
};

const BLOCK_COLORS = {
  [BLOCK.GRASS]: 0x57a14f,
  [BLOCK.DIRT]: 0x7a5136,
  [BLOCK.STONE]: 0x888d93,
  [BLOCK.SAND]: 0xccb777,
  [BLOCK.WOOD]: 0x865b36,
  [BLOCK.PLANK]: 0xc29762,
  [BLOCK.BRICK]: 0xa24b43,
  [BLOCK.LEAF]: 0x3d7c3e,
  [BLOCK.CLAY]: 0xad776f,
  [BLOCK.SNOW]: 0xe8f1f5,
};

const BREAK_SOUND_PROFILE = {
  [BLOCK.GRASS]: { cutoff: 1400, q: 0.7, gain: 0.055, decay: 0.08 },
  [BLOCK.DIRT]: { cutoff: 900, q: 0.7, gain: 0.045, decay: 0.1 },
  [BLOCK.STONE]: { cutoff: 2600, q: 1.2, gain: 0.07, decay: 0.055 },
  [BLOCK.SAND]: { cutoff: 800, q: 0.6, gain: 0.04, decay: 0.11 },
  [BLOCK.WOOD]: { cutoff: 1700, q: 1.0, gain: 0.06, decay: 0.07 },
  [BLOCK.PLANK]: { cutoff: 1800, q: 1.0, gain: 0.06, decay: 0.075 },
  [BLOCK.BRICK]: { cutoff: 2200, q: 1.1, gain: 0.065, decay: 0.06 },
  [BLOCK.LEAF]: { cutoff: 700, q: 0.5, gain: 0.03, decay: 0.12 },
  [BLOCK.CLAY]: { cutoff: 1200, q: 0.8, gain: 0.05, decay: 0.09 },
  [BLOCK.SNOW]: { cutoff: 600, q: 0.5, gain: 0.028, decay: 0.13 },
};

const FACE_DEFS = [
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b7db);
scene.fog = new THREE.Fog(0x87b7db, 30, 120);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("app").appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xddeeff, 0x5f6a54, 0.75);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.position.set(35, 55, 15);
scene.add(sun);

const world = new Uint8Array(WORLD_SIZE);

function inBounds(x, y, z) {
  return x >= 0 && x < WORLD_X && y >= 0 && y < WORLD_Y && z >= 0 && z < WORLD_Z;
}

function idx(x, y, z) {
  return x + WORLD_X * (z + WORLD_Z * y);
}

function getBlock(x, y, z) {
  if (!inBounds(x, y, z)) {
    return BLOCK.AIR;
  }
  return world[idx(x, y, z)];
}

function setBlock(x, y, z, type) {
  if (!inBounds(x, y, z)) {
    return;
  }
  world[idx(x, y, z)] = type;
}

function terrainHeight(x, z) {
  const sx = Math.sin(x * 0.19) * 3.0;
  const cz = Math.cos(z * 0.17) * 2.4;
  const cross = Math.sin((x + z) * 0.09) * 2.1;
  const ramp = (x - z) * 0.03;
  const h = 10 + sx + cz + cross + ramp;
  return Math.max(1, Math.min(WORLD_Y - 2, Math.floor(h)));
}

function generateWorld() {
  for (let x = 0; x < WORLD_X; x++) {
    for (let z = 0; z < WORLD_Z; z++) {
      const h = terrainHeight(x, z);

      for (let y = 0; y <= h; y++) {
        let t;
        if (y === h) {
          t = h <= 8 ? BLOCK.SAND : BLOCK.GRASS;
        } else if (y >= h - 3) {
          t = BLOCK.DIRT;
        } else {
          t = BLOCK.STONE;
        }
        setBlock(x, y, z, t);
      }

      if (h <= 8 && ((x + z) % 7 === 0 || Math.abs(Math.sin(x * 0.31 + z * 0.27)) > 0.92)) {
        setBlock(x, h, z, BLOCK.SAND);
      }
    }
  }

  const pillars = [
    [10, 10],
    [22, 48],
    [45, 18],
    [55, 52],
  ];

  for (const [px, pz] of pillars) {
    const base = terrainHeight(px, pz);
    const pillarHeight = 4 + ((px + pz) % 3);
    for (let y = base + 1; y <= Math.min(WORLD_Y - 1, base + pillarHeight); y++) {
      setBlock(px, y, pz, BLOCK.WOOD);
    }
  }
}

function chunkCoord(v) {
  return Math.floor(v / CHUNK_SIZE);
}

function chunkIndex(cx, cy, cz) {
  return cx + CHUNK_X * (cz + CHUNK_Z * cy);
}

function chunkKey(cx, cy, cz) {
  return `${cx},${cy},${cz}`;
}

function chunkOrigin(cx, cy, cz) {
  return {
    x: cx * CHUNK_SIZE,
    y: cy * CHUNK_SIZE,
    z: cz * CHUNK_SIZE,
  };
}

function validChunk(cx, cy, cz) {
  return cx >= 0 && cx < CHUNK_X && cy >= 0 && cy < CHUNK_Y && cz >= 0 && cz < CHUNK_Z;
}

function parseChunkKey(key) {
  const [cx, cy, cz] = key.split(",").map(Number);
  return { cx, cy, cz };
}

const chunkGroup = new THREE.Group();
scene.add(chunkGroup);

const chunkMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const chunkMeshes = new Array(CHUNK_X * CHUNK_Y * CHUNK_Z).fill(null);

const colorScratch = new THREE.Color();

function buildChunkGeometry(cx, cy, cz) {
  const { x: startX, y: startY, z: startZ } = chunkOrigin(cx, cy, cz);
  const endX = Math.min(startX + CHUNK_SIZE, WORLD_X);
  const endY = Math.min(startY + CHUNK_SIZE, WORLD_Y);
  const endZ = Math.min(startZ + CHUNK_SIZE, WORLD_Z);

  const positions = [];
  const colors = [];
  const indices = [];
  let vertexCount = 0;

  for (let y = startY; y < endY; y++) {
    for (let z = startZ; z < endZ; z++) {
      for (let x = startX; x < endX; x++) {
        const type = getBlock(x, y, z);
        if (type === BLOCK.AIR) {
          continue;
        }

        colorScratch.setHex(BLOCK_COLORS[type]);

        for (const face of FACE_DEFS) {
          const nx = x + face.normal[0];
          const ny = y + face.normal[1];
          const nz = z + face.normal[2];
          if (getBlock(nx, ny, nz) !== BLOCK.AIR) {
            continue;
          }

          for (const corner of face.corners) {
            positions.push(x + corner[0], y + corner[1], z + corner[2]);
            colors.push(colorScratch.r, colorScratch.g, colorScratch.b);
          }

          indices.push(
            vertexCount,
            vertexCount + 1,
            vertexCount + 2,
            vertexCount,
            vertexCount + 2,
            vertexCount + 3
          );
          vertexCount += 4;
        }
      }
    }
  }

  if (vertexCount === 0) {
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function rebuildChunk(cx, cy, cz) {
  if (!validChunk(cx, cy, cz)) {
    return;
  }

  const ci = chunkIndex(cx, cy, cz);
  const oldMesh = chunkMeshes[ci];
  if (oldMesh) {
    chunkGroup.remove(oldMesh);
    oldMesh.geometry.dispose();
    chunkMeshes[ci] = null;
  }

  const geometry = buildChunkGeometry(cx, cy, cz);
  if (!geometry) {
    return;
  }

  const mesh = new THREE.Mesh(geometry, chunkMaterial);
  mesh.name = `chunk-${cx}-${cy}-${cz}`;
  mesh.userData.chunk = { cx, cy, cz };
  chunkGroup.add(mesh);
  chunkMeshes[ci] = mesh;
}

function rebuildAllChunks() {
  for (let cy = 0; cy < CHUNK_Y; cy++) {
    for (let cz = 0; cz < CHUNK_Z; cz++) {
      for (let cx = 0; cx < CHUNK_X; cx++) {
        rebuildChunk(cx, cy, cz);
      }
    }
  }
}

function addDirtyChunk(dirtySet, cx, cy, cz) {
  if (validChunk(cx, cy, cz)) {
    dirtySet.add(chunkKey(cx, cy, cz));
  }
}

function markChunkDirtyForBlock(x, y, z, dirtySet) {
  const cx = chunkCoord(x);
  const cy = chunkCoord(y);
  const cz = chunkCoord(z);

  addDirtyChunk(dirtySet, cx, cy, cz);

  const lx = x % CHUNK_SIZE;
  const ly = y % CHUNK_SIZE;
  const lz = z % CHUNK_SIZE;

  if (lx === 0) addDirtyChunk(dirtySet, cx - 1, cy, cz);
  if (lx === CHUNK_SIZE - 1) addDirtyChunk(dirtySet, cx + 1, cy, cz);
  if (ly === 0) addDirtyChunk(dirtySet, cx, cy - 1, cz);
  if (ly === CHUNK_SIZE - 1) addDirtyChunk(dirtySet, cx, cy + 1, cz);
  if (lz === 0) addDirtyChunk(dirtySet, cx, cy, cz - 1);
  if (lz === CHUNK_SIZE - 1) addDirtyChunk(dirtySet, cx, cy, cz + 1);
}

function applyBlockChange(x, y, z, newType) {
  if (!inBounds(x, y, z)) {
    return false;
  }

  const cell = idx(x, y, z);
  if (world[cell] === newType) {
    return false;
  }

  world[cell] = newType;

  const dirtySet = new Set();
  markChunkDirtyForBlock(x, y, z, dirtySet);
  for (const key of dirtySet) {
    const { cx, cy, cz } = parseChunkKey(key);
    rebuildChunk(cx, cy, cz);
  }

  return true;
}

generateWorld();
rebuildAllChunks();

const selectedLabel = document.getElementById("selectedBlock");
const fpsLabel = document.getElementById("fpsValue");
const audioMutedLabel = document.getElementById("audioMuted");
const volumeValueLabel = document.getElementById("volumeValue");
const volumeSlider = document.getElementById("volumeSlider");
const helpPanel = document.getElementById("help");
const lockHint = document.getElementById("lockHint");

let selectedBlock = BLOCK.GRASS;

function updateSelectionHud() {
  selectedLabel.textContent = `${selectedBlock} (${BLOCK_NAMES[selectedBlock]})`;
}

let audioContext = null;
let masterGain = null;
let noiseBuffer = null;
let muted = false;
let volume = 0.8;
const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

function updateAudioHud() {
  audioMutedLabel.textContent = muted ? "Muted" : "Unmuted";
  volumeValueLabel.textContent = `${Math.round(volume * 100)}%`;
  volumeSlider.value = String(Math.round(volume * 100));
}

function createNoiseBuffer(ctx) {
  const duration = 0.2;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function updateMasterGain() {
  if (!masterGain || !audioContext) {
    return;
  }
  const target = muted ? 0 : volume;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setTargetAtTime(target, audioContext.currentTime, 0.01);
}

function initializeAudioOnGesture() {
  if (!AudioContextCtor) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    noiseBuffer = createNoiseBuffer(audioContext);
    updateMasterGain();
    return;
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function setMuted(nextMuted) {
  muted = nextMuted;
  updateMasterGain();
  updateAudioHud();
}

function toggleMute() {
  setMuted(!muted);
}

function setVolume(nextVolume) {
  volume = Math.min(1, Math.max(0, nextVolume));
  updateMasterGain();
  updateAudioHud();
}

function playPlaceSound(type) {
  if (!audioContext || !masterGain || muted) {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  const base = 150 + type * 16;
  osc.type = "triangle";
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * 0.7, now + 0.07);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.1);
}

function playBreakSound(type) {
  if (!audioContext || !masterGain || !noiseBuffer || muted) {
    return;
  }

  const now = audioContext.currentTime;
  const src = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  const profile = BREAK_SOUND_PROFILE[type] || BREAK_SOUND_PROFILE[BLOCK.STONE];

  src.buffer = noiseBuffer;

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(profile.cutoff, now);
  filter.Q.setValueAtTime(profile.q, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(profile.gain, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.decay);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  src.start(now);
  src.stop(now + profile.decay + 0.02);
}

updateSelectionHud();
updateAudioHud();

volumeSlider.addEventListener("input", (e) => {
  initializeAudioOnGesture();
  setVolume(Number(e.target.value) / 100);
});

const player = {
  pos: new THREE.Vector3(8, WORLD_Y - 2, 8),
  vel: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  pitch: 0,
  onGround: false,
};

function findSpawn() {
  const sx = Math.floor(WORLD_X * 0.5);
  const sz = Math.floor(WORLD_Z * 0.5);
  let top = 1;

  for (let y = WORLD_Y - 1; y >= 0; y--) {
    if (getBlock(sx, y, sz) !== BLOCK.AIR) {
      top = y;
      break;
    }
  }

  player.pos.set(sx + 0.5, top + PLAYER_HEIGHT + 1.0, sz + 0.5);
}

findSpawn();

function updateCamera() {
  camera.position.set(player.pos.x, player.pos.y - PLAYER_HEIGHT + EYE_OFFSET, player.pos.z);
  camera.rotation.order = "YXZ";
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

updateCamera();

const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  Space: false,
};

let pointerLocked = false;

renderer.domElement.addEventListener("click", () => {
  initializeAudioOnGesture();
  renderer.domElement.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
  lockHint.style.display = pointerLocked ? "none" : "block";
});

document.addEventListener("mousemove", (e) => {
  if (!pointerLocked) {
    return;
  }

  const sens = 0.0024;
  player.yaw -= e.movementX * sens;
  player.pitch -= e.movementY * sens;

  const maxPitch = Math.PI / 2 - 0.02;
  if (player.pitch > maxPitch) {
    player.pitch = maxPitch;
  }
  if (player.pitch < -maxPitch) {
    player.pitch = -maxPitch;
  }
});

window.addEventListener("keydown", (e) => {
  if (e.code in keys) {
    keys[e.code] = true;
  }

  if (e.code === "KeyH") {
    helpPanel.classList.toggle("hidden");
  }

  if (e.code === "KeyM") {
    initializeAudioOnGesture();
    toggleMute();
  }

  if (/^Digit[0-9]$/.test(e.code)) {
    const digit = Number(e.code.slice(5));
    selectedBlock = digit === 0 ? 10 : digit;
    updateSelectionHud();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code in keys) {
    keys[e.code] = false;
  }
});

renderer.domElement.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

const raycaster = new THREE.Raycaster();
raycaster.far = REACH;
const centerScreen = new THREE.Vector2(0, 0);

function getTargetedBlock() {
  raycaster.setFromCamera(centerScreen, camera);
  const hits = raycaster.intersectObjects(chunkGroup.children, false);

  for (const hit of hits) {
    if (hit.distance > REACH || !hit.face) {
      continue;
    }

    const n = hit.face.normal;
    const p = hit.point;
    const epsilon = 0.001;

    const hx = Math.floor(p.x - n.x * epsilon);
    const hy = Math.floor(p.y - n.y * epsilon);
    const hz = Math.floor(p.z - n.z * epsilon);

    if (!inBounds(hx, hy, hz) || getBlock(hx, hy, hz) === BLOCK.AIR) {
      continue;
    }

    const px = Math.floor(p.x + n.x * epsilon);
    const py = Math.floor(p.y + n.y * epsilon);
    const pz = Math.floor(p.z + n.z * epsilon);

    return {
      hit: { x: hx, y: hy, z: hz },
      place: { x: px, y: py, z: pz },
    };
  }

  return null;
}

function intersectsPlayer(x, y, z) {
  const minX = x;
  const maxX = x + 1;
  const minY = y;
  const maxY = y + 1;
  const minZ = z;
  const maxZ = z + 1;

  const pMinX = player.pos.x - PLAYER_RADIUS;
  const pMaxX = player.pos.x + PLAYER_RADIUS;
  const pMinY = player.pos.y - PLAYER_HEIGHT;
  const pMaxY = player.pos.y;
  const pMinZ = player.pos.z - PLAYER_RADIUS;
  const pMaxZ = player.pos.z + PLAYER_RADIUS;

  return (
    pMaxX > minX &&
    pMinX < maxX &&
    pMaxY > minY &&
    pMinY < maxY &&
    pMaxZ > minZ &&
    pMinZ < maxZ
  );
}

function tryBreakBlock() {
  const target = getTargetedBlock();
  if (!target) {
    return;
  }

  const { x, y, z } = target.hit;
  const existingType = getBlock(x, y, z);
  if (existingType === BLOCK.AIR) {
    return;
  }

  if (applyBlockChange(x, y, z, BLOCK.AIR)) {
    playBreakSound(existingType);
  }
}

function tryPlaceBlock() {
  const target = getTargetedBlock();
  if (!target) {
    return;
  }

  const { x, y, z } = target.place;
  if (!inBounds(x, y, z)) {
    return;
  }
  if (getBlock(x, y, z) !== BLOCK.AIR) {
    return;
  }
  if (intersectsPlayer(x, y, z)) {
    return;
  }

  if (applyBlockChange(x, y, z, selectedBlock)) {
    playPlaceSound(selectedBlock);
  }
}

window.addEventListener("mousedown", (e) => {
  if (!pointerLocked) {
    return;
  }

  initializeAudioOnGesture();

  if (e.button === 0) {
    tryBreakBlock();
  } else if (e.button === 2) {
    tryPlaceBlock();
  }
});

function overlapSolid(minX, minY, minZ, maxX, maxY, maxZ) {
  const x0 = Math.floor(minX);
  const x1 = Math.floor(maxX - 0.0001);
  const y0 = Math.floor(minY);
  const y1 = Math.floor(maxY - 0.0001);
  const z0 = Math.floor(minZ);
  const z1 = Math.floor(maxZ - 0.0001);

  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        if (getBlock(x, y, z) !== BLOCK.AIR) {
          return true;
        }
      }
    }
  }
  return false;
}

function moveAndCollide(delta) {
  const minY = player.pos.y - PLAYER_HEIGHT;
  const maxY = player.pos.y;

  player.pos.x += player.vel.x * delta;
  if (
    overlapSolid(
      player.pos.x - PLAYER_RADIUS,
      minY,
      player.pos.z - PLAYER_RADIUS,
      player.pos.x + PLAYER_RADIUS,
      maxY,
      player.pos.z + PLAYER_RADIUS
    )
  ) {
    if (player.vel.x > 0) {
      player.pos.x = Math.floor(player.pos.x + PLAYER_RADIUS) - PLAYER_RADIUS - 0.001;
    } else if (player.vel.x < 0) {
      player.pos.x = Math.floor(player.pos.x - PLAYER_RADIUS + 1) + PLAYER_RADIUS + 0.001;
    }
    player.vel.x = 0;
  }

  player.pos.z += player.vel.z * delta;
  if (
    overlapSolid(
      player.pos.x - PLAYER_RADIUS,
      minY,
      player.pos.z - PLAYER_RADIUS,
      player.pos.x + PLAYER_RADIUS,
      maxY,
      player.pos.z + PLAYER_RADIUS
    )
  ) {
    if (player.vel.z > 0) {
      player.pos.z = Math.floor(player.pos.z + PLAYER_RADIUS) - PLAYER_RADIUS - 0.001;
    } else if (player.vel.z < 0) {
      player.pos.z = Math.floor(player.pos.z - PLAYER_RADIUS + 1) + PLAYER_RADIUS + 0.001;
    }
    player.vel.z = 0;
  }

  player.onGround = false;

  player.pos.y += player.vel.y * delta;
  const updatedMinY = player.pos.y - PLAYER_HEIGHT;
  const updatedMaxY = player.pos.y;

  if (
    overlapSolid(
      player.pos.x - PLAYER_RADIUS,
      updatedMinY,
      player.pos.z - PLAYER_RADIUS,
      player.pos.x + PLAYER_RADIUS,
      updatedMaxY,
      player.pos.z + PLAYER_RADIUS
    )
  ) {
    if (player.vel.y > 0) {
      player.pos.y = Math.floor(player.pos.y) - 0.001;
    } else if (player.vel.y < 0) {
      player.pos.y = Math.floor(player.pos.y - PLAYER_HEIGHT + 1) + PLAYER_HEIGHT;
      player.onGround = true;
    }
    player.vel.y = 0;
  }

  if (player.pos.y < 0) {
    findSpawn();
    player.vel.set(0, 0, 0);
  }
}

const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const desiredDir = new THREE.Vector3();

const fpsSamples = [];
let fpsSampleSum = 0;
let hudTimer = 0;

function updateFps(dt) {
  fpsSamples.push(dt);
  fpsSampleSum += dt;
  if (fpsSamples.length > FPS_SAMPLE_COUNT) {
    fpsSampleSum -= fpsSamples.shift();
  }

  const fps = fpsSamples.length > 0 && fpsSampleSum > 0 ? fpsSamples.length / fpsSampleSum : 0;
  return fps;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(-forward.z, 0, forward.x);

  desiredDir.set(0, 0, 0);
  if (keys.KeyW) desiredDir.add(forward);
  if (keys.KeyS) desiredDir.sub(forward);
  if (keys.KeyD) desiredDir.add(right);
  if (keys.KeyA) desiredDir.sub(right);

  if (desiredDir.lengthSq() > 0) {
    desiredDir.normalize();
  }

  const accel = player.onGround ? GROUND_ACCEL : AIR_ACCEL;
  player.vel.x += desiredDir.x * accel * dt;
  player.vel.z += desiredDir.z * accel * dt;

  const friction = player.onGround ? GROUND_FRICTION : AIR_FRICTION;
  const frictionScale = Math.max(0, 1 - friction * dt);
  player.vel.x *= frictionScale;
  player.vel.z *= frictionScale;

  const hSpeed = Math.hypot(player.vel.x, player.vel.z);
  if (hSpeed > MAX_MOVE_SPEED) {
    const clamp = MAX_MOVE_SPEED / hSpeed;
    player.vel.x *= clamp;
    player.vel.z *= clamp;
  }

  if (keys.Space && player.onGround) {
    player.vel.y = JUMP_SPEED;
    player.onGround = false;
  }

  player.vel.y -= GRAVITY * dt;
  if (player.vel.y < -MAX_FALL_SPEED) {
    player.vel.y = -MAX_FALL_SPEED;
  }

  moveAndCollide(dt);
  updateCamera();

  const fps = updateFps(dt);
  hudTimer += dt;
  if (hudTimer >= HUD_UPDATE_INTERVAL) {
    fpsLabel.textContent = fps.toFixed(1);
    hudTimer = 0;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
