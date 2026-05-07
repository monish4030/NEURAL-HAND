/* ============================================
   NEURAL HAND v3 — Gesture Control Engine
   Made by Monish Paramasivam
   7 Hand Gestures · Three.js · MediaPipe
   ============================================ */

'use strict';

// ─── COLOUR THEMES ────────────────────────────────────────────────────────────
const THEMES = [
  { name:'CYAN',    orb:0x00f5ff, inner:0x00f5ff, ring1:0x00f5ff, ring2:0x7700ff, css:'#00f5ff' },
  { name:'MAGENTA', orb:0xff00aa, inner:0xff00aa, ring1:0xff00aa, ring2:0xff6600, css:'#ff00aa' },
  { name:'PURPLE',  orb:0x9900ff, inner:0xbb00ff, ring1:0x9900ff, ring2:0x00f5ff, css:'#9900ff' },
  { name:'GREEN',   orb:0x00ff88, inner:0x00ff88, ring1:0x00ff88, ring2:0xffee00, css:'#00ff88' },
  { name:'GOLD',    orb:0xffcc00, inner:0xffee00, ring1:0xffcc00, ring2:0xff6600, css:'#ffcc00' },
];

// ─── STATE ────────────────────────────────────────────────────────────────────
const S = {
  // orb
  orbTarget:    { x:0, y:0 },
  orbCurrent:   { x:0, y:0 },
  scaleTarget:  1.0,
  scaleCurrent: 1.0,
  openness:     0,
  // tracking
  isTracking:   false,
  frameCount:   0,
  lastFpsTime:  performance.now(),
  fps:          0,
  gestureLabel: 'NO HAND',
  // gesture flags
  currentGesture: 'none',
  prevGesture:    'none',
  gestureTimer:   0,          // frames gesture must persist
  // feature toggles
  rotationFrozen: false,
  wireframeMode:  false,
  themeIndex:     0,
  // laser
  laserActive:    false,
  laserTarget:    { x:0, y:0 },
  // explosion
  exploding:      false,
  explosionTimer: 0,
  // peace cooldown (prevent rapid cycling)
  peaceCooldown:  0,
  thumbCooldown:  0,
};

// ─── THREE GLOBALS ─────────────────────────────────────────────────────────────
let scene, camera, renderer, clock;
let orb, orbInner, orbRing1, orbRing2;
let particleSystem, pPositions, pVelocities, pColors;
let energyWaves = [];
let laserBeam, laserGlow;
let handCanvas, handCtx;
const PC = 1800;

// ─── INIT THREE ───────────────────────────────────────────────────────────────
function initThree() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x020408, 1);
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  buildLights();
  buildOrb();
  buildParticles();
  buildStars();
  buildLaser();

  // Hand skeleton canvas
  handCanvas = document.getElementById('hand-canvas');
  handCanvas.width  = window.innerWidth;
  handCanvas.height = window.innerHeight;
  handCtx = handCanvas.getContext('2d');

  window.addEventListener('resize', onResize);
  animate();
}

function buildLights() {
  scene.add(new THREE.HemisphereLight(0x00f5ff, 0x7700ff, 0.3));
  const pA = new THREE.PointLight(0x00f5ff, 2.0, 12);
  pA.position.set(0, 0, 3);
  scene.add(pA);
  const pB = new THREE.PointLight(0xff00aa, 1.5, 10);
  pB.position.set(3, 2, 2);
  scene.add(pB);
}

function buildOrb() {
  const t = THEMES[0];

  orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 64, 64),
    new THREE.MeshStandardMaterial({
      color: t.orb, emissive: new THREE.Color(t.orb),
      emissiveIntensity:0.6, roughness:0.1, metalness:0.8,
      transparent:true, opacity:0.25,
    })
  );
  scene.add(orb);

  orbInner = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 32),
    new THREE.MeshStandardMaterial({
      color:0xffffff, emissive:new THREE.Color(t.inner),
      emissiveIntensity:2.5, roughness:0, metalness:1,
    })
  );
  orb.add(orbInner);

  orbRing1 = mkRing(0.75, t.ring1, 0.6);
  orbRing2 = mkRing(0.90, t.ring2, 0.4);
  orbRing2.rotation.x = Math.PI / 3;
  scene.add(orbRing1);
  scene.add(orbRing2);

  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.01, 4, 64),
      new THREE.MeshBasicMaterial({ color:t.orb, transparent:true, opacity:0 })
    );
    w.userData = { phase: i * 0.25, speed: 0.8 + i * 0.1 };
    scene.add(w);
    energyWaves.push(w);
  }
}

function mkRing(r, color, opacity) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.008, 4, 96),
    new THREE.MeshBasicMaterial({ color, transparent:true, opacity })
  );
}

function buildParticles() {
  const geo  = new THREE.BufferGeometry();
  pPositions = new Float32Array(PC * 3);
  pColors    = new Float32Array(PC * 3);
  pVelocities = [];

  const palette = [
    new THREE.Color(0x00f5ff), new THREE.Color(0xff00aa),
    new THREE.Color(0x7700ff), new THREE.Color(0x00ff88),
  ];

  for (let i = 0; i < PC; i++) {
    const r = 1.5 + Math.random() * 4.5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pPositions[i*3]   = r * Math.sin(ph) * Math.cos(th);
    pPositions[i*3+1] = r * Math.sin(ph) * Math.sin(th);
    pPositions[i*3+2] = r * Math.cos(ph) - 1;

    const c = palette[Math.floor(Math.random() * palette.length)];
    pColors[i*3]=c.r; pColors[i*3+1]=c.g; pColors[i*3+2]=c.b;

    pVelocities.push({
      x:(Math.random()-.5)*.004, y:(Math.random()-.5)*.004, z:(Math.random()-.5)*.003,
      orbit:Math.random()*Math.PI*2, orbitSpeed:0.002+Math.random()*.006,
    });
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(pColors, 3));

  particleSystem = new THREE.Points(geo, new THREE.PointsMaterial({
    size:0.035, vertexColors:true, transparent:true, opacity:0.75,
    sizeAttenuation:true, blending:THREE.AdditiveBlending, depthWrite:false,
  }));
  scene.add(particleSystem);
}

function buildStars() {
  const n = 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i*3]=(Math.random()-.5)*30; pos[i*3+1]=(Math.random()-.5)*30; pos[i*3+2]=-8-Math.random()*10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color:0x88ccff, size:0.025, transparent:true, opacity:0.5,
    blending:THREE.AdditiveBlending, depthWrite:false,
  })));
}

function buildLaser() {
  const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,5,0)];
  const geo  = new THREE.BufferGeometry().setFromPoints(pts);
  laserBeam  = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color:0x00f5ff, transparent:true, opacity:0, linewidth:2,
  }));
  scene.add(laserBeam);

  // glow tube
  laserGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 5, 8),
    new THREE.MeshBasicMaterial({ color:0x00f5ff, transparent:true, opacity:0, blending:THREE.AdditiveBlending })
  );
  scene.add(laserGlow);
}

// ─── ANIMATION LOOP ───────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Smooth position / scale
  S.orbCurrent.x  += (S.orbTarget.x  - S.orbCurrent.x)  * 0.12;
  S.orbCurrent.y  += (S.orbTarget.y  - S.orbCurrent.y)  * 0.12;
  S.scaleCurrent  += (S.scaleTarget  - S.scaleCurrent)   * 0.08;

  orb.position.set(S.orbCurrent.x, S.orbCurrent.y, 0);
  orb.scale.setScalar(S.scaleCurrent);
  orbRing1.position.copy(orb.position);
  orbRing2.position.copy(orb.position);
  orbRing1.scale.setScalar(S.scaleCurrent);
  orbRing2.scale.setScalar(S.scaleCurrent);

  // Rotation (unless frozen)
  if (!S.rotationFrozen) {
    orb.rotation.y     = t * 0.4;
    orb.rotation.x     = Math.sin(t * 0.3) * 0.2;
    orbRing1.rotation.y = t * 0.7;
    orbRing1.rotation.x = t * 0.5;
    orbRing2.rotation.z = t * 0.6;
  }

  // Pulse
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
  orb.material.emissiveIntensity = 0.3 + pulse * 0.5 * S.scaleCurrent;
  orb.material.opacity = 0.15 + 0.2 * S.scaleCurrent;
  orbInner.material.emissiveIntensity = 1.8 + pulse * 1.5;
  orbRing1.material.opacity = 0.3 + S.openness * 0.5;
  orbRing2.material.opacity = 0.2 + S.openness * 0.4;

  // Energy waves
  energyWaves.forEach(w => {
    w.userData.phase += w.userData.speed * 0.008;
    const p = w.userData.phase % 1;
    w.position.copy(orb.position);
    w.scale.setScalar(S.scaleCurrent * (1 + p * 2.5));
    w.material.opacity = (1 - p) * 0.3 * S.openness;
    w.rotation.x = orbRing1.rotation.x;
    w.rotation.y = orbRing1.rotation.y;
  });

  // Explosion effect
  if (S.exploding) {
    S.explosionTimer--;
    if (S.explosionTimer <= 0) S.exploding = false;
  }

  // Particles
  for (let i = 0; i < PC; i++) {
    const v = pVelocities[i];
    v.orbit += v.orbitSpeed;

    pPositions[i*3]   += v.x + Math.cos(v.orbit) * 0.001;
    pPositions[i*3+1] += v.y + Math.sin(v.orbit) * 0.001;
    pPositions[i*3+2] += v.z;

    if (S.exploding) {
      // Blast outward from orb
      const dx = pPositions[i*3]   - orb.position.x;
      const dy = pPositions[i*3+1] - orb.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy) + 0.01;
      const force = 0.018 / dist;
      pPositions[i*3]   += dx * force;
      pPositions[i*3+1] += dy * force;
    } else if (S.openness > 0.3) {
      // Attract
      const dx = orb.position.x - pPositions[i*3];
      const dy = orb.position.y - pPositions[i*3+1];
      const dist = Math.sqrt(dx*dx + dy*dy) + 0.01;
      pPositions[i*3]   += dx * (S.openness * 0.0002) / dist;
      pPositions[i*3+1] += dy * (S.openness * 0.0002) / dist;
    } else if (S.currentGesture === 'fist') {
      // Repel
      const dx = pPositions[i*3]   - orb.position.x;
      const dy = pPositions[i*3+1] - orb.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy) + 0.01;
      if (dist < 2.0) {
        pPositions[i*3]   += dx * 0.003 / dist;
        pPositions[i*3+1] += dy * 0.003 / dist;
      }
    }

    // Bounds
    const mag = Math.sqrt(pPositions[i*3]**2 + pPositions[i*3+1]**2 + pPositions[i*3+2]**2);
    if (mag > 7 || mag < 0.4) {
      const r  = 1.8 + Math.random() * 3.5;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pPositions[i*3]   = r * Math.sin(ph) * Math.cos(th);
      pPositions[i*3+1] = r * Math.sin(ph) * Math.sin(th);
      pPositions[i*3+2] = r * Math.cos(ph) - 1;
    }
  }
  particleSystem.geometry.attributes.position.needsUpdate = true;
  particleSystem.rotation.y = t * 0.025;

  // Laser beam animation
  if (S.laserActive) {
    const ox = orb.position.x, oy = orb.position.y;
    const tx = S.laserTarget.x, ty = S.laserTarget.y;
    const pts = laserBeam.geometry.attributes.position;
    pts.setXYZ(0, ox, oy, 0);
    pts.setXYZ(1, tx * 4, ty * 3, 0);
    pts.needsUpdate = true;
    laserBeam.material.opacity = 0.5 + 0.5 * Math.sin(t * 20);
    laserGlow.material.opacity = 0.15 + 0.1 * Math.sin(t * 20);

    // Position glow tube between orb and screen edge
    const mx = (ox + tx * 4) / 2, my = (oy + ty * 3) / 2;
    laserGlow.position.set(mx, my, 0);
    const ang = Math.atan2(ty * 3 - oy, tx * 4 - ox);
    laserGlow.rotation.z = ang + Math.PI / 2;
    const len = Math.hypot(tx * 4 - ox, ty * 3 - oy);
    laserGlow.scale.y = len / 5;
  } else {
    laserBeam.material.opacity = THREE.MathUtils.lerp(laserBeam.material.opacity, 0, 0.15);
    laserGlow.material.opacity  = THREE.MathUtils.lerp(laserGlow.material.opacity,  0, 0.15);
  }

  // FPS
  S.frameCount++;
  const now = performance.now();
  if (now - S.lastFpsTime >= 1000) {
    document.getElementById('fps-display').textContent = S.frameCount + ' FPS';
    S.frameCount = 0;
    S.lastFpsTime = now;
  }

  // Cooldowns
  if (S.peaceCooldown > 0) S.peaceCooldown--;
  if (S.thumbCooldown > 0) S.thumbCooldown--;

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  handCanvas.width  = window.innerWidth;
  handCanvas.height = window.innerHeight;
}

// ─── THEME / COLOUR ───────────────────────────────────────────────────────────
function applyTheme(idx) {
  const t = THEMES[idx];
  orb.material.color.setHex(t.orb);
  orb.material.emissive.setHex(t.orb);
  orbInner.material.emissive.setHex(t.inner);
  orbRing1.material.color.setHex(t.ring1);
  orbRing2.material.color.setHex(t.ring2);
  energyWaves.forEach(w => w.material.color.setHex(t.orb));
  laserBeam.material.color.setHex(t.orb);
  laserGlow.material.color.setHex(t.orb);

  document.documentElement.style.setProperty('--accent', t.css);
  document.getElementById('color-display').textContent = t.name;
  document.getElementById('color-display').style.color = t.css;
  document.getElementById('color-display').style.textShadow = `0 0 8px ${t.css}`;
}

// ─── GESTURE RECOGNITION ──────────────────────────────────────────────────────
function classifyGesture(lm) {
  // Finger tip / pip landmark indices
  // Tips:  4(thumb) 8(index) 12(mid) 16(ring) 20(pinky)
  // PIPs:  3        6        10      14       18
  // MCPs:  2        5        9       13       17
  // Wrist: 0

  const tipIds = [8, 12, 16, 20];
  const pipIds = [6, 10, 14, 18];

  // Is finger extended? tip.y < pip.y (screen coords, y increases downward)
  const extended = tipIds.map((tip, i) => lm[tip].y < lm[pipIds[i]].y - 0.02);
  const extCount = extended.filter(Boolean).length;

  // Thumb: compare tip x vs mcp x (works for right hand mirrored)
  const thumbExt = Math.abs(lm[4].x - lm[2].x) > 0.05;

  // Pinch: thumb tip close to index tip
  const pinchDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
  const pinching  = pinchDist < 0.065;

  // Point: only index extended, rest curled
  const pointing = extended[0] && !extended[1] && !extended[2] && !extended[3] && !thumbExt;

  // Peace/V: index + middle extended, rest curled
  const peace = extended[0] && extended[1] && !extended[2] && !extended[3] && !thumbExt;

  // Three fingers: index + middle + ring
  const three = extended[0] && extended[1] && extended[2] && !extended[3] && !thumbExt;

  // Thumbs up: thumb extended, all fingers curled
  const thumbsUp = thumbExt && extCount === 0;

  // Fist: nothing extended
  const fist = extCount === 0 && !thumbExt;

  // Open hand: 4 fingers extended
  const open = extCount >= 3;

  // Openness metric for continuous orb scale
  const wrist = lm[0], mid = lm[12];
  const rawDist = Math.hypot(mid.x - wrist.x, mid.y - wrist.y);
  const openness = THREE.MathUtils.clamp((rawDist - 0.18) / 0.35, 0, 1);

  // Priority order
  let gesture = 'open';
  if      (pinching)  gesture = 'pinch';
  else if (pointing)  gesture = 'point';
  else if (peace)     gesture = 'peace';
  else if (three)     gesture = 'three';
  else if (thumbsUp)  gesture = 'thumbsUp';
  else if (fist)      gesture = 'fist';
  else if (open)      gesture = 'open';

  return { gesture, openness, extCount };
}

// ─── GESTURE ACTIONS ──────────────────────────────────────────────────────────
const GESTURE_HOLD_FRAMES = 8; // must hold this many frames before triggering

function handleGesture(gesture, lm) {
  const changed = gesture !== S.prevGesture;
  if (changed) { S.gestureTimer = 0; }
  S.prevGesture = gesture;
  S.gestureTimer++;

  const confirmed = S.gestureTimer >= GESTURE_HOLD_FRAMES;
  if (!confirmed && changed) return; // still warming up

  const prev = S.currentGesture;
  S.currentGesture = gesture;

  // ── Per-gesture effects ──
  switch (gesture) {

    case 'open':
      S.laserActive = false;
      break;

    case 'fist':
      S.laserActive = false;
      break;

    case 'point':
      S.laserActive = true;
      // Aim at index fingertip
      const aspect = window.innerWidth / window.innerHeight;
      S.laserTarget.x =  (0.5 - lm[8].x) * aspect;
      S.laserTarget.y = -(lm[8].y - 0.5);
      break;

    case 'peace':
      S.laserActive = false;
      if (prev !== 'peace' && S.peaceCooldown === 0) {
        S.themeIndex = (S.themeIndex + 1) % THEMES.length;
        applyTheme(S.themeIndex);
        flashGesture('COLOR: ' + THEMES[S.themeIndex].name);
        S.peaceCooldown = 60; // 1 sec at 60fps
      }
      break;

    case 'three':
      S.laserActive = false;
      if (prev !== 'three') {
        triggerExplosion();
        flashGesture('PARTICLE BURST!');
      }
      break;

    case 'pinch':
      S.laserActive = false;
      if (prev !== 'pinch') {
        S.rotationFrozen = !S.rotationFrozen;
        flashGesture(S.rotationFrozen ? 'ROTATION FROZEN' : 'ROTATION LIVE');
        document.getElementById('mode-display').textContent = S.rotationFrozen ? 'FROZEN' : 'NORMAL';
      }
      break;

    case 'thumbsUp':
      S.laserActive = false;
      if (prev !== 'thumbsUp' && S.thumbCooldown === 0) {
        S.wireframeMode = !S.wireframeMode;
        orb.material.wireframe     = S.wireframeMode;
        orbInner.material.wireframe = S.wireframeMode;
        flashGesture(S.wireframeMode ? 'WIREFRAME ON' : 'WIREFRAME OFF');
        document.getElementById('mode-display').textContent = S.wireframeMode ? 'WIREFRAME' : (S.rotationFrozen ? 'FROZEN' : 'NORMAL');
        S.thumbCooldown = 60;
      }
      break;
  }
}

function triggerExplosion() {
  S.exploding = true;
  S.explosionTimer = 40;
}

let flashTimeout;
function flashGesture(msg) {
  const el = document.getElementById('gesture-flash');
  el.textContent = msg;
  el.classList.remove('show');
  void el.offsetWidth; // reflow
  el.classList.add('show');
  clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => el.classList.remove('show'), 900);
}

// ─── LEGEND STATE ─────────────────────────────────────────────────────────────
const GESTURE_TO_ROW = {
  open:'lg-open', fist:'lg-fist', point:'lg-point',
  peace:'lg-peace', three:'lg-three', pinch:'lg-pinch', thumbsUp:'lg-thumb',
};
const STATE_TO_DOT = {
  open:'st-open', fist:'st-fist', point:'st-point',
  peace:'st-peace', three:'st-three', pinch:'st-pinch', thumbsUp:'st-thumb',
};

function updateLegend(gesture) {
  Object.values(GESTURE_TO_ROW).forEach(id => document.getElementById(id)?.classList.remove('active'));
  if (GESTURE_TO_ROW[gesture]) document.getElementById(GESTURE_TO_ROW[gesture])?.classList.add('active');
}

// ─── HAND SKELETON DRAW ───────────────────────────────────────────────────────
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

function drawHandSkeleton(lm) {
  const ctx = handCtx;
  const W = handCanvas.width, H = handCanvas.height;
  ctx.clearRect(0, 0, W, H);

  const t = THEMES[S.themeIndex];
  const col = t.css;
  const glow = t.css;

  // Connections
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = glow;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.55;

  CONNECTIONS.forEach(([a, b]) => {
    const ax = (1 - lm[a].x) * W;
    const ay = lm[a].y * H;
    const bx = (1 - lm[b].x) * W;
    const by = lm[b].y * H;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  });

  // Joints
  lm.forEach((p, i) => {
    const x = (1 - p.x) * W;
    const y = p.y * H;
    ctx.beginPath();
    ctx.arc(x, y, i === 0 ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#ffffff' : col;
    ctx.globalAlpha = 0.8;
    ctx.shadowBlur = 16;
    ctx.fill();
  });

  ctx.restore();
}

function clearHandSkeleton() {
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
}

// ─── MEDIAPIPE ────────────────────────────────────────────────────────────────
function initHands() {
  const videoEl = document.getElementById('webcam');

  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence:  0.6,
  });
  hands.onResults(onResults);

  const cam = new Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 320, height: 240,
  });
  cam.start();
}

function onResults(res) {
  if (!res.multiHandLandmarks || res.multiHandLandmarks.length === 0) {
    S.isTracking    = false;
    S.scaleTarget   = 0.7;
    S.gestureLabel  = 'NO HAND';
    S.currentGesture = 'none';
    S.laserActive   = false;
    clearHandSkeleton();
    updateHUD();
    return;
  }

  S.isTracking = true;
  const lm = res.multiHandLandmarks[0];

  // Palm position → orb target
  const aspect = window.innerWidth / window.innerHeight;
  S.orbTarget.x =  (0.5 - lm[9].x) * aspect * 4.5;
  S.orbTarget.y = -(lm[9].y - 0.5) * 3.5;

  // Classify
  const { gesture, openness } = classifyGesture(lm);
  S.openness = openness;

  // Scale
  if (gesture === 'fist') S.scaleTarget = 0.45;
  else if (gesture === 'open') S.scaleTarget = 0.5 + openness * 1.5;
  else S.scaleTarget = 0.9;

  // Labels
  const labels = {
    open:'OPEN PALM', fist:'CLOSED FIST', point:'POINTING',
    peace:'PEACE SIGN', three:'THREE FINGERS', pinch:'PINCH',
    thumbsUp:'THUMBS UP',
  };
  S.gestureLabel = labels[gesture] || gesture.toUpperCase();

  handleGesture(gesture, lm);
  updateLegend(gesture);
  drawHandSkeleton(lm);
  updateHUD();
}

// ─── HUD UPDATE ───────────────────────────────────────────────────────────────
function updateHUD() {
  const dot = document.getElementById('tracking-dot');
  if (S.isTracking) {
    dot.classList.add('active');
    document.getElementById('tracking-status').textContent = 'TRACKING';
  } else {
    dot.classList.remove('active');
    document.getElementById('tracking-status').textContent = 'SEARCHING';
  }
  document.getElementById('gesture-display').textContent  = S.gestureLabel;
  document.getElementById('openness-display').textContent = Math.round(S.openness * 100) + '%';
  document.getElementById('energy-fill').style.height     = (20 + S.openness * 80) + '%';
}

// ─── LEGEND TOGGLE ────────────────────────────────────────────────────────────
document.getElementById('legend-toggle')?.addEventListener('click', () => {
  const body = document.getElementById('legend-body');
  const btn  = document.getElementById('legend-toggle');
  if (body.style.display === 'none') {
    body.style.display = '';
    btn.textContent = '▲ HIDE';
  } else {
    body.style.display = 'none';
    btn.textContent = '▼ SHOW';
  }
});

// ─── BOOT ────────────────────────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', async () => {
  const btn = document.getElementById('start-btn');
  btn.querySelector('.btn-text').textContent = 'REQUESTING ACCESS…';
  btn.disabled = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const videoEl = document.getElementById('webcam');
    videoEl.srcObject = stream;
    await videoEl.play();

    document.getElementById('permission-screen').style.transition = 'opacity 0.8s ease';
    document.getElementById('permission-screen').style.opacity   = '0';
    setTimeout(() => {
      document.getElementById('permission-screen').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
    }, 800);

    initThree();
    applyTheme(0);

    setTimeout(() => {
      initHands();
      document.getElementById('tracking-status').textContent = 'CONNECTING';
    }, 600);

  } catch (err) {
    btn.querySelector('.btn-text').textContent = 'ACCESS DENIED — RETRY';
    btn.disabled = false;
    console.error(err);
  }
});
