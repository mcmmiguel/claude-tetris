"use strict";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - light blue
  "#ffb74d", // L - orange
  "#b0bec5", // N - nut (tuerca), gris metálico
  "#fff176", // power-up (pieza especial)
  "#f06292", // comodín (resultado del Tinte)
  "#4db6ac", // + - pentominó cruz, teal
  "#9575cd", // U - pentominó, violeta
  "#ff8a65", // Y - pentominó, coral
  "#aed581", // single 1×1 (recompensa tras un Tetris)
];
const POWERUP_TYPE = 9;
const WILDCARD = 10;
const SINGLE_TYPE = 14;

const PIECES = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N - tuerca (centro vacío)
  [[9]], // power-up (1×1)
  [
    [0, 11, 0],
    [11, 11, 11],
    [0, 11, 0],
  ], // + - pentominó cruz
  [
    [12, 0, 12],
    [12, 12, 12],
    [0, 0, 0],
  ], // U - pentominó
  [
    [0, 13, 0, 0],
    [13, 13, 13, 13],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // Y - pentominó
  [[14]], // single 1×1 (recompensa)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_SCORES = [400, 800, 1200, 1600]; // T-spin con 0/1/2/3 líneas
const COMBO_BONUS = 50; // puntos por nivel de combo (× level)
const B2B_MULTIPLIER = 1.5; // Tetris / T-spin consecutivos
const PERFECT_CLEAR_BONUS = 1000; // × level
const EFFECT_MS = 1200; // duración del mensaje de efecto
const NUT_CHANCE = 0.05; // probabilidad de que salga la tuerca (pieza reto)
// probabilidad de cada pentominó (tipo → probabilidad); el resto del sorteo son las 7 estándar
const PENTOMINO_CHANCE = { 11: 0.03, 12: 0.03, 13: 0.03 };
const POWERUP_EVERY_LINES = 10; // cada cuántas líneas aparece un power-up
const FREEZE_MS = 5000;         // duración del power-up Congelar
const ENERGY_MAX = 100;
const ENERGY_PER_LINES = [0, 20, 40, 70, 100]; // energía según líneas limpiadas a la vez
const QUEUE_SIZE = 5;
const PEEK_MS = 10000;  // duración de la vista de las siguientes 5 piezas
const SLOW_MS = 10000;  // duración de Ralentizar
const SLOW_FACTOR = 2.5;
const SWAP_OPTIONS = 3; // piezas ofrecidas por Intercambiar
const PIECE_NAMES = [null, 'I', 'O', 'T', 'S', 'Z', 'J', 'L', 'N'];
const POWERUPS = ['bomb', 'lightning', 'dye', 'gravity', 'freeze'];
const POWERUP_ICONS = { bomb: '💣', lightning: '⚡', dye: '🎨', gravity: '⬇', freeze: '❄' };
const FREEZE_MS = 5000; // duración del power-up Congelar
const POWERUPS = ["bomb", "lightning", "dye", "gravity", "freeze"];
const POWERUP_ICONS = { bomb: "💣", lightning: "⚡", dye: "🎨", gravity: "⬇", freeze: "❄" };
// depuración: index.html?powerup=bomb fuerza el tipo de power-up
const FORCED_POWERUP = new URLSearchParams(location.search).get('powerup');

// modos de desafío; 'classic' es el modo infinito original
const CHALLENGES = {
  classic: { name: 'Clásico' },
  sprint:  { name: 'Sprint', goalLines: 40, timeLimit: 120000, goal: 'Limpia 40 líneas en 2:00' },
  garbage: { name: 'Basura', garbageEvery: 10000, goal: 'Sobrevive: sube basura cada 10s' },
  preset:  { name: 'Obstáculos', presetRows: 6, goal: 'Tablero con bloques fijos' },
  ghost:   { name: 'Invisibles', hideLocked: true, goal: 'Las piezas se ocultan al caer' },
  reverse: { name: 'Inversa', reverseFromLevel: 5, goal: 'Rotación inversa desde nivel 5' },
};
const GARBAGE_COLOR = 8;
const REVEAL_MS = 700; // en "Invisibles", tiempo que se ve el tablero tras fijar una pieza

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeBtn = document.getElementById('theme-toggle');
const freezeEl = document.getElementById('freeze-indicator');
const slowEl = document.getElementById('slow-indicator');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const peekCanvas = document.getElementById('peek-canvas');
const peekCtx = peekCanvas.getContext('2d');
const energyBar = document.getElementById('energy-bar');
const energyFill = document.getElementById('energy-fill');
const energyHint = document.getElementById('energy-hint');
const abilityMenu = document.getElementById('ability-menu');
const abilityList = document.getElementById('ability-list');
const abilityMsg = document.getElementById('ability-msg');

let board, current, queue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let nextPowerupAt, powerupPending, freezeRemaining;
let energy, holdPiece, snapshot, slowRemaining, peekRemaining, menuOpen, menuItems;
const modeSelect = document.getElementById('mode-select');
const challengeEl = document.getElementById('challenge-info');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let nextPowerupAt, powerupPending, freezeRemaining;
let challenge, elapsed, garbageTimer, revealRemaining;
const FORCED_POWERUP = new URLSearchParams(location.search).get("powerup");

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next-canvas");
const nextCtx = nextCanvas.getContext("2d");
const holdCanvas = document.getElementById("hold-canvas");
const holdCtx = holdCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayScore = document.getElementById("overlay-score");
const restartBtn = document.getElementById("restart-btn");
const themeBtn = document.getElementById("theme-toggle");
const freezeEl = document.getElementById("freeze-indicator");
const comboEl = document.getElementById("combo");
const muteBtn = document.getElementById("mute-toggle");

let board, current, next, held, holdUsed, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let nextPowerupAt, powerupPending, freezeRemaining;
let combo, backToBack, lastMoveWasRotation, effectTimer;
let audioCtx = null;
let muted = false;
let gridColor, highlightColor;

function createBoard() {
  const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  if (challenge.presetRows) {
    for (let r = ROWS - challenge.presetRows; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++)
        if (Math.random() < 0.6) b[r][c] = Math.floor(Math.random() * 7) + 1;
      // nunca una línea completa desde el inicio
      if (b[r].every(v => v !== 0)) b[r][Math.floor(Math.random() * COLS)] = 0;
    }
  }
  return b;
}

function addGarbageRow() {
  const overflow = board[0].some(v => v !== 0);
  board.shift();
  const row = new Array(COLS).fill(GARBAGE_COLOR);
  row[Math.floor(Math.random() * COLS)] = 0;
  board.push(row);
  if (overflow) { endGame(); return; }
  // la pieza activa sube si la basura la alcanza
  while (current.y > 0 && collide(current.shape, current.x, current.y)) current.y--;
  if (collide(current.shape, current.x, current.y)) endGame();
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function reverseActive() {
  return challenge.reverseFromLevel && level >= challenge.reverseFromLevel;
}

// crea una pieza con rotación y posición iniciales (current.shape se muta al rotar)
function makePiece(type, powerup) {
  const shape = PIECES[type].map((row) => [...row]);
  const piece = { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
  if (powerup) piece.powerup = powerup;
  return piece;
}

function randomPiece() {
  if (powerupPending) {
    powerupPending = false;
    const powerup = POWERUPS.includes(FORCED_POWERUP) ? FORCED_POWERUP : POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    return makePiece(POWERUP_TYPE, powerup);
  }
  return makePiece(Math.random() < NUT_CHANCE ? 8 : Math.floor(Math.random() * 7) + 1);
}

// pieza nueva en posición de aparición; `powerup` solo aplica al tipo POWERUP_TYPE
function makePiece(type, powerup) {
  if (type === POWERUP_TYPE) return { type, powerup, shape: [[POWERUP_TYPE]], x: Math.floor(COLS / 2), y: 0 };
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
  const type = Math.random() < NUT_CHANCE ? 8 : Math.floor(Math.random() * 7) + 1;
  return makePiece(type);
}

function holdPiece() {
  if (holdUsed) return;
  const stored = makePiece(current.type, current.powerup);
  if (held) {
    if (collide(held.shape, held.x, held.y)) return; // no cabe: rechazar el intercambio
    current = held;
  } else {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) endGame();
    drawNext();
  }
  held = stored;
  holdUsed = true;
  dropAccum = 0;
  drawHold();
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length,
    cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCCW(shape) {
  return rotateCW(rotateCW(rotateCW(shape)));
}

function tryRotate() {
  const rotated = reverseActive() ? rotateCCW(current.shape) : rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastMoveWasRotation = true;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++) for (let c = 0; c < current.shape[r].length; c++) if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
}

// T-spin: pieza T, última acción una rotación y al menos 3 de las 4 esquinas
// del cuadro 3x3 ocupadas (paredes y suelo cuentan como ocupados)
function detectTSpin() {
  if (current.type !== 3 || !lastMoveWasRotation) return false;
  let filled = 0;
  for (const [dy, dx] of [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ]) {
    const x = current.x + dx,
      y = current.y + dy;
    if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x])) filled++;
  }
  return filled >= 3;
}

function clearLines(tSpin) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  const labels = [];
  if (cleared) {
    combo++;
    lines += cleared;
    while (lines >= nextPowerupAt) {
      powerupPending = true;
      nextPowerupAt += POWERUP_EVERY_LINES;
    }
    let base = tSpin ? TSPIN_SCORES[Math.min(cleared, 3)] : LINE_SCORES[cleared] || 0;
    const difficult = tSpin || cleared === 4;
    if (difficult && backToBack) {
      base = Math.floor(base * B2B_MULTIPLIER);
      labels.push("B2B");
    }
    backToBack = difficult;
    if (tSpin) labels.push("T-SPIN");
    if (cleared === 4) labels.push("TETRIS");
    score += base * level;
    if (combo > 0) {
      score += COMBO_BONUS * combo * level;
      labels.push(`COMBO x${combo + 1}`);
    }
    // el Perfect Clear se evalúa después de eliminar las filas
    if (board.every((row) => row.every((v) => v === 0))) {
      score += PERFECT_CLEAR_BONUS * level;
      labels.push("PERFECT CLEAR");
    }
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    energy = Math.min(ENERGY_MAX, energy + (ENERGY_PER_LINES[cleared] || ENERGY_MAX));
    updateEnergyUI();
    showEffect(labels, combo);
    updateHUD();
    if (challenge.goalLines && lines >= challenge.goalLines) endGame(true);
  } else {
    // sin líneas: rompe el combo pero conserva el B2B
    combo = -1;
    if (tSpin) {
      score += TSPIN_SCORES[0] * level;
      showEffect(["T-SPIN"], 0);
      updateHUD();
    }
  }
}

function playTone(freq, duration, delay = 0) {
  if (muted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime + delay;
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) {
    /* audio no disponible: el juego sigue sin sonido */
  }
}

function showEffect(labels, comboCount) {
  comboEl.textContent = labels.join(" · ");
  comboEl.classList.remove("hidden", "pop");
  void comboEl.offsetWidth; // reinicia la animación
  comboEl.classList.add("pop");
  clearTimeout(effectTimer);
  effectTimer = setTimeout(() => comboEl.classList.add("hidden"), EFFECT_MS);
  // tono creciente según el combo
  const base = 440 * Math.pow(2, Math.min(Math.max(comboCount, 0), 12) / 12);
  playTone(base, 0.12);
  if (labels.length > 1 || comboCount > 0) playTone(base * 1.5, 0.15, 0.1);
  if (labels.includes("PERFECT CLEAR")) playTone(base * 2, 0.3, 0.2);
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastMoveWasRotation = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function applyPowerup(piece) {
  const px = piece.x,
    py = piece.y;
  switch (piece.powerup) {
    case "bomb":
      for (let r = py - 1; r <= py + 1; r++) for (let c = px - 1; c <= px + 1; c++) if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
      break;
    case "lightning":
      board[py].fill(0);
      break;
    case "dye": {
      // tiñe el color del bloque sobre el que aterrizó; sin bloque debajo no hace nada
      const target = py + 1 < ROWS ? board[py + 1][px] : 0;
      if (target && target !== WILDCARD) for (const row of board) for (let c = 0; c < COLS; c++) if (row[c] === target) row[c] = WILDCARD;
      break;
    }
    case "gravity":
      for (let c = 0; c < COLS; c++) {
        const col = [];
        for (let r = 0; r < ROWS; r++) if (board[r][c]) col.push(board[r][c]);
        for (let r = ROWS - 1; r >= 0; r--) board[r][c] = col.pop() || 0;
      }
      break;
    case "freeze":
      freezeRemaining = FREEZE_MS;
      updateFreezeIndicator();
      break;
  }
}

function updateFreezeIndicator() {
  freezeEl.classList.toggle("hidden", freezeRemaining <= 0);
  freezeEl.textContent = `❄ ${Math.ceil(freezeRemaining / 1000)}s`;
}

function lockPiece() {
  // estado previo a colocar la pieza, para la habilidad Deshacer
  snapshot = {
    board: board.map(row => [...row]),
    score, lines, level, dropInterval, nextPowerupAt, powerupPending, freezeRemaining,
    type: current.type, powerup: current.powerup,
  };
  let tSpin = false;
  if (current.powerup) applyPowerup(current);
  else merge();
  if (challenge.hideLocked) revealRemaining = REVEAL_MS;
  clearLines();
  if (gameOver) return;
  else {
    tSpin = detectTSpin();
    merge();
  }
  clearLines(tSpin);
  spawn();
}

function spawn() {
  current = queue.shift();
  queue.push(randomPiece());
  holdUsed = false;
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
  drawPeek();
  drawHold();
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const styles = getComputedStyle(root);
  gridColor = styles.getPropertyValue("--grid").trim();
  highlightColor = styles.getPropertyValue("--highlight").trim();
  const isLight = theme === "light";
  themeBtn.textContent = isLight ? "Modo oscuro" : "Modo claro";
  themeBtn.setAttribute("aria-pressed", String(isLight));
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {
    /* almacenamiento no disponible */
  }
  // el loop se detiene en pausa y game over: repintar manualmente
  if (current && queue) { draw(); drawNext(); drawHold(); drawPeek(); }
  if (current && next) {
    draw();
    drawNext();
    drawHold();
  }
}

function loadTheme() {
  try {
    return localStorage.getItem("theme") === "light" ? "light" : "dark";
  } catch (e) {
    return "dark";
  }
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  updateChallengeInfo();
}

function updateChallengeInfo() {
  const parts = [];
  if (challenge.goal) parts.push(challenge.goal);
  if (challenge.goalLines) {
    parts.push(`Faltan ${Math.max(0, challenge.goalLines - lines)} líneas`);
    parts.push(`Tiempo: ${formatTime(challenge.timeLimit - elapsed)}`);
  } else if (challenge.id !== 'classic') {
    parts.push(`Tiempo: ${formatTime(elapsed)}`);
  }
  if (reverseActive()) parts.push('¡Rotación invertida!');
  challengeEl.textContent = parts.join(' · ');
  challengeEl.classList.toggle('hidden', challenge.id === 'classic');
}

function drawBlock(context, x, y, colorIndex, size, alpha, icon) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = highlightColor;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (icon) {
    context.fillStyle = "#000";
    context.font = `${size * 0.6}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(icon, x * size + size / 2, y * size + size / 2 + 1);
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  if (!challenge.hideLocked || revealRemaining > 0)
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, c, r, board[r][c], BLOCK);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

  // en game over la pieza actual no cupo: no dibujarla encima del tablero
  if (gameOver) return;

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2, current.powerup && POWERUP_ICONS[current.powerup]);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++) drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK, 1, current.powerup && POWERUP_ICONS[current.powerup]);
}

// dibuja una pieza centrada en una cuadrícula de 4×4 bloques de tamaño `size`
function drawPiece(context, piece, size, oy = 0) {
  const shape = piece.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = oy + Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], size, 1, piece.powerup && POWERUP_ICONS[piece.powerup]);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawPiece(nextCtx, queue[0], 30);
}

function drawHold() {
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (holdPiece) drawPiece(holdCtx, holdPiece, 30);
}

function drawPeek() {
  const active = peekRemaining > 0;
  peekCanvas.classList.toggle('hidden', !active);
  if (!active) return;
  peekCtx.clearRect(0, 0, peekCanvas.width, peekCanvas.height);
  queue.slice(0, QUEUE_SIZE).forEach((piece, i) => drawPiece(peekCtx, piece, 12, i * 4));
}

function updateEnergyUI() {
  const full = energy >= ENERGY_MAX;
  energyFill.style.width = `${(energy / ENERGY_MAX) * 100}%`;
  energyFill.classList.toggle('full', full);
  energyBar.setAttribute('aria-valuenow', String(Math.round(energy)));
  energyHint.textContent = full ? 'Pulsa E para elegir habilidad' : '';
}

function updateSlowIndicator() {
  slowEl.classList.toggle('hidden', slowRemaining <= 0);
  slowEl.textContent = `🐢 ${Math.ceil(slowRemaining / 1000)}s`;
}

// --- Habilidades ---
// Cada habilidad devuelve true si se aplicó (consume la energía) o un texto de error.

function abilityPeek() {
  peekRemaining = PEEK_MS;
  drawPeek();
  return true;
}

function abilitySlow() {
  slowRemaining = SLOW_MS;
  updateSlowIndicator();
  return true;
}

function abilityUndo() {
  if (!snapshot) return 'No hay colocación que deshacer';
  const placed = makePiece(snapshot.type, snapshot.powerup);
  board = snapshot.board;
  ({ score, lines, level, dropInterval, nextPowerupAt, powerupPending, freezeRemaining } = snapshot);
  // la pieza en juego vuelve al inicio de la cola; la colocada reaparece
  queue.unshift(makePiece(current.type, current.powerup));
  queue.pop();
  current = placed;
  snapshot = null;
  dropAccum = 0;
  updateFreezeIndicator();
  updateHUD();
  drawNext();
  drawPeek();
  return true;
}

function abilityHold() {
  const stored = makePiece(current.type, current.powerup);
  const incoming = holdPiece || queue[0];
  if (collide(incoming.shape, incoming.x, incoming.y)) return 'No cabe la pieza reservada';
  if (holdPiece) {
    current = holdPiece;
  } else {
    current = queue.shift();
    queue.push(randomPiece());
  }
  holdPiece = stored;
  dropAccum = 0;
  drawNext();
  drawHold();
  drawPeek();
  return true;
}

function abilitySwap(type) {
  const piece = makePiece(type);
  const spawnX = piece.x;
  piece.x = current.x;
  piece.y = current.y;
  if (collide(piece.shape, piece.x, piece.y)) {
    piece.x = spawnX;
    if (collide(piece.shape, piece.x, piece.y)) return 'La pieza no cabe aquí';
  }
  current = piece;
  return true;
}

function openSwapMenu() {
  const pool = [1, 2, 3, 4, 5, 6, 7].filter(t => t !== current.type);
  const options = [];
  while (options.length < SWAP_OPTIONS && pool.length)
    options.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  showMenu(options.map(t => ({ label: `Pieza ${PIECE_NAMES[t]}`, run: () => abilitySwap(t) })));
}

function mainMenuItems() {
  return [
    { label: 'Ver siguientes 5 piezas', run: abilityPeek },
    { label: 'Intercambiar pieza', run: openSwapMenu, submenu: true },
    { label: 'Ralentizar tiempo 10s', run: abilitySlow },
    { label: 'Deshacer última colocación', run: abilityUndo },
    { label: 'Reservar pieza (hold)', run: abilityHold },
  ];
}

function showMenu(items) {
  menuItems = items;
  abilityMsg.textContent = '';
  abilityList.replaceChildren(...items.map((item, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${i + 1}. ${item.label}`;
    btn.addEventListener('click', () => { btn.blur(); chooseAbility(i); });
    li.appendChild(btn);
    return li;
  }));
}

function chooseAbility(i) {
  const item = menuItems[i];
  if (!item) return;
  const result = item.run();
  if (item.submenu) return;
  if (result !== true) { abilityMsg.textContent = result; return; }
  energy = 0;
  updateEnergyUI();
  closeMenu();
  draw();
}

function openMenu() {
  if (menuOpen || paused || gameOver || energy < ENERGY_MAX) return;
  menuOpen = true;
  cancelAnimationFrame(animId);
  showMenu(mainMenuItems());
  abilityMenu.classList.remove('hidden');
}

function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  abilityMenu.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
function drawPreview(context, previewCanvas, piece) {
  const NB = 30;
  context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  if (!piece) return;
  const shape = piece.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) drawBlock(context, offX + c, offY + r, shape[r][c], NB, 1, piece.powerup && POWERUP_ICONS[piece.powerup]);
}

function drawNext() {
  drawPreview(nextCtx, nextCanvas, next);
}

function drawHold() {
  holdCanvas.classList.toggle("hold-locked", !!holdUsed);
  drawPreview(holdCtx, holdCanvas, held);
}

function endGame(won = false) {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = won ? '¡DESAFÍO COMPLETADO!' : 'GAME OVER';
  overlayTitle.textContent = "GAME OVER";
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove("hidden");
}

function togglePause() {
  if (gameOver || menuOpen) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = "PAUSA";
    overlayScore.textContent = "";
    overlay.classList.remove("hidden");
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  elapsed += dt;
  if (revealRemaining > 0) revealRemaining -= dt;
  if (challenge.goalLines && elapsed >= challenge.timeLimit) {
    elapsed = challenge.timeLimit;
    updateChallengeInfo();
    draw();
    endGame();
    return;
  }
  if (challenge.garbageEvery) {
    garbageTimer += dt;
    if (garbageTimer >= challenge.garbageEvery) {
      garbageTimer -= challenge.garbageEvery;
      addGarbageRow();
      if (gameOver) { draw(); return; }
    }
  }
  updateChallengeInfo();
  if (freezeRemaining > 0) {
    // el tiempo se descuenta por frame, así que la pausa no lo consume
    freezeRemaining = Math.max(0, freezeRemaining - dt);
    updateFreezeIndicator();
  } else {
    dropAccum += dt;
  }
  if (slowRemaining > 0) {
    slowRemaining = Math.max(0, slowRemaining - dt);
    updateSlowIndicator();
  }
  if (peekRemaining > 0) {
    peekRemaining = Math.max(0, peekRemaining - dt);
    if (peekRemaining === 0) drawPeek();
  }
  if (dropAccum >= dropInterval * (slowRemaining > 0 ? SLOW_FACTOR : 1)) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      lastMoveWasRotation = false;
    } else {
      lockPiece();
    }
  }
  draw();
  // endGame() puede ocurrir dentro de lockPiece(); su cancelAnimationFrame no detiene
  // el frame en curso, así que no hay que reprogramar el loop
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init() {
  const id = CHALLENGES[modeSelect.value] ? modeSelect.value : 'classic';
  challenge = { id, ...CHALLENGES[id] };
  elapsed = 0;
  garbageTimer = 0;
  revealRemaining = 0;
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  held = null;
  holdUsed = false;
  nextPowerupAt = POWERUP_EVERY_LINES;
  powerupPending = false;
  singlePending = false;
  freezeRemaining = 0;
  energy = 0;
  holdPiece = null;
  snapshot = null;
  slowRemaining = 0;
  peekRemaining = 0;
  menuOpen = false;
  abilityMenu.classList.add('hidden');
  combo = -1;
  backToBack = false;
  lastMoveWasRotation = false;
  clearTimeout(effectTimer);
  comboEl.classList.add("hidden");
  updateFreezeIndicator();
  updateSlowIndicator();
  updateEnergyUI();
  lastTime = performance.now();
  queue = Array.from({ length: QUEUE_SIZE + 1 }, randomPiece);
  spawn();
  drawHold();
  updateHUD();
  overlay.classList.add("hidden");
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (menuOpen) {
    if (e.code === 'Escape' || e.code === 'KeyE') closeMenu();
    else if (/^(Digit|Numpad)[1-9]$/.test(e.code)) chooseAbility(Number(e.code.slice(-1)) - 1);
    return;
  }
  if (e.code === 'KeyP') { togglePause(); return; }
document.addEventListener("keydown", (e) => {
  if (e.code === "KeyP") {
    togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.code) {
    case "ArrowLeft":
      if (!collide(current.shape, current.x - 1, current.y)) {
        current.x--;
        lastMoveWasRotation = false;
      }
      break;
    case "ArrowRight":
      if (!collide(current.shape, current.x + 1, current.y)) {
        current.x++;
        lastMoveWasRotation = false;
      }
      break;
    case "ArrowDown":
      softDrop();
      break;
    case "ArrowUp":
    case "KeyX":
      tryRotate();
      break;
    case 'KeyE':
      openMenu();
      break;
    case 'Space':
    case "Space":
      e.preventDefault();
      hardDrop();
      break;
    case "KeyC":
    case "ShiftLeft":
    case "ShiftRight":
      if (!e.repeat) holdPiece();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener("click", init);

muteBtn.addEventListener("click", () => {
  muted = !muted;
  muteBtn.textContent = muted ? "Sonido: off" : "Sonido: on";
  muteBtn.setAttribute("aria-pressed", String(muted));
  muteBtn.blur(); // evita que Space/Enter vuelvan a activar el botón
});

modeSelect.addEventListener('change', () => {
  modeSelect.blur(); // evita que las flechas cambien el modo durante la partida
  init();
});

themeBtn.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
themeBtn.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  themeBtn.blur(); // evita que Space/Enter vuelvan a activar el botón
});

applyTheme(loadTheme());

init();
