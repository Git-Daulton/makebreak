import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const WORLD_X = 64;
const WORLD_Y = 32;
const WORLD_Z = 64;
const WORLD_SIZE = WORLD_X * WORLD_Y * WORLD_Z;

const REACH = 6;

const PLAYER_HEIGHT = 1.75;
const PLAYER_RADIUS = 0.35;
const EYE_OFFSET = 1.62;

const GRAVITY = 24;
const MOVE_SPEED = 6.5;
const JUMP_SPEED = 8.5;

const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD: 5,
  PLANK: 6,
};

const BLOCK_NAMES = {
  1: "Grass",
  2: "Dirt",
  3: "Stone",
  4: "Sand",
  5: "Wood",
  6: "Plank",
};

const BLOCK_COLORS = {
  [BLOCK.GRASS]: 0x57a14f,
  [BLOCK.DIRT]: 0x7a5136,
  [BLOCK.STONE]: 0x888d93,
  [BLOCK.SAND]: 0xccb777,
  [BLOCK.WOOD]: 0x865b36,
  [BLOCK.PLANK]: 0xc29762,
};

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

  // Wood pillar landmarks
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

generateWorld();

const blockGroup = new THREE.Group();
scene.add(blockGroup);

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

const materials = {
  [BLOCK.GRASS]: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[BLOCK.GRASS] }),
  [BLOCK.DIRT]: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[BLOCK.DIRT] }),
  [BLOCK.STONE]: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[BLOCK.STONE] }),
  [BLOCK.SAND]: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[BLOCK.SAND] }),
  [BLOCK.WOOD]: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[BLOCK.WOOD] }),
  [BLOCK.PLANK]: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[BLOCK.PLANK] }),
};

const meshesByCell = new Map();

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function rebuildWorldMeshes() {
  for (const m of meshesByCell.values()) {
    blockGroup.remove(m);
  }
  meshesByCell.clear();

  for (let x = 0; x < WORLD_X; x++) {
    for (let y = 0; y < WORLD_Y; y++) {
      for (let z = 0; z < WORLD_Z; z++) {
        const t = getBlock(x, y, z);
        if (t !== BLOCK.AIR) {
          addMeshForBlock(x, y, z, t);
        }
      }
    }
  }
}

function addMeshForBlock(x, y, z, type) {
  const mesh = new THREE.Mesh(cubeGeometry, materials[type]);
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  mesh.userData.blockPos = { x, y, z };
  blockGroup.add(mesh);
  meshesByCell.set(key(x, y, z), mesh);
}

function removeMeshForBlock(x, y, z) {
  const k = key(x, y, z);
  const mesh = meshesByCell.get(k);
  if (!mesh) {
    return;
  }
  blockGroup.remove(mesh);
  meshesByCell.delete(k);
}

rebuildWorldMeshes();

const selectedLabel = document.getElementById("selectedBlock");
const helpPanel = document.getElementById("help");
const lockHint = document.getElementById("lockHint");

let selectedBlock = BLOCK.GRASS;

function updateSelectionHud() {
  selectedLabel.textContent = `${selectedBlock} (${BLOCK_NAMES[selectedBlock]})`;
}

updateSelectionHud();

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

  if (/^Digit[1-6]$/.test(e.code)) {
    selectedBlock = Number(e.code.slice(5));
    updateSelectionHud();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code in keys) {
    keys[e.code] = false;
  }
});

window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

const raycaster = new THREE.Raycaster();

function getTargetedBlock() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(blockGroup.children, false);

  for (const hit of hits) {
    if (hit.distance > REACH) {
      continue;
    }

    const bp = hit.object.userData.blockPos;
    if (!bp) {
      continue;
    }

    const nx = bp.x + Math.round(hit.face.normal.x);
    const ny = bp.y + Math.round(hit.face.normal.y);
    const nz = bp.z + Math.round(hit.face.normal.z);

    return {
      hit: { x: bp.x, y: bp.y, z: bp.z },
      place: { x: nx, y: ny, z: nz },
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
  if (getBlock(x, y, z) === BLOCK.AIR) {
    return;
  }

  setBlock(x, y, z, BLOCK.AIR);
  removeMeshForBlock(x, y, z);
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

  setBlock(x, y, z, selectedBlock);
  addMeshForBlock(x, y, z, selectedBlock);
}

window.addEventListener("mousedown", (e) => {
  if (!pointerLocked) {
    return;
  }

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

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);

  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const desired = new THREE.Vector3();
  if (keys.KeyW) desired.add(forward);
  if (keys.KeyS) desired.sub(forward);
  if (keys.KeyD) desired.add(right);
  if (keys.KeyA) desired.sub(right);

  if (desired.lengthSq() > 0) {
    desired.normalize().multiplyScalar(MOVE_SPEED);
  }

  player.vel.x = desired.x;
  player.vel.z = desired.z;

  player.vel.y -= GRAVITY * dt;
  if (keys.Space && player.onGround) {
    player.vel.y = JUMP_SPEED;
    player.onGround = false;
  }

  moveAndCollide(dt);
  updateCamera();

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
