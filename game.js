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

// el índice de cada pieza coincide con su color en COLORS
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
  null, // comodín: solo es un color de bloque, no una pieza
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
const FREEZE_MS = 5000; // duración del power-up Congelar
const ENERGY_MAX = 100;
const ENERGY_PER_LINES = [0, 20, 40, 70, 100]; // energía según líneas limpiadas a la vez
const QUEUE_SIZE = 5;
const PEEK_MS = 10000; // duración de la vista de las siguientes 5 piezas
const SLOW_MS = 10000; // duración de Ralentizar
const SLOW_FACTOR = 2.5;
const SWAP_OPTIONS = 3; // piezas ofrecidas por Intercambiar
const PIECE_NAMES = [null, "I", "O", "T", "S", "Z", "J", "L", "N", null, null, "+", "U", "Y", "1×1"];
const POWERUPS = ["bomb", "lightning", "dye", "gravity", "freeze"];
const POWERUP_ICONS = { bomb: "💣", lightning: "⚡", dye: "🎨", gravity: "⬇", freeze: "❄" };
// depuración: index.html?powerup=bomb fuerza el tipo de power-up
const FORCED_POWERUP = new URLSearchParams(location.search).get("powerup");

// modos de desafío; 'classic' es el modo infinito original
const CHALLENGES = {
  classic: { name: "Clásico" },
  sprint: { name: "Sprint", goalLines: 40, timeLimit: 120000, goal: "Limpia 40 líneas en 2:00" },
  garbage: { name: "Basura", garbageEvery: 10000, goal: "Sobrevive: sube basura cada 10s" },
  preset: { name: "Obstáculos", presetRows: 6, goal: "Tablero con bloques fijos" },
  ghost: { name: "Invisibles", hideLocked: true, goal: "Las piezas se ocultan al caer" },
  reverse: { name: "Inversa", reverseFromLevel: 5, goal: "Rotación inversa desde nivel 5" },
};
const GARBAGE_COLOR = 8;
const REVEAL_MS = 700; // en "Invisibles", tiempo que se ve el tablero tras fijar una pieza

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next-canvas");
const nextCtx = nextCanvas.getContext("2d");
const holdCanvas = document.getElementById("hold-canvas");
const holdCtx = holdCanvas.getContext("2d");
const peekCanvas = document.getElementById("peek-canvas");
const peekCtx = peekCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayScore = document.getElementById("overlay-score");
const restartBtn = document.getElementById("restart-btn");
const themeBtn = document.getElementById("theme-toggle");
const muteBtn = document.getElementById("mute-toggle");
const freezeEl = document.getElementById("freeze-indicator");
const slowEl = document.getElementById("slow-indicator");
const comboEl = document.getElementById("combo");
const energyBar = document.getElementById("energy-bar");
const energyFill = document.getElementById("energy-fill");
const energyHint = document.getElementById("energy-hint");
const abilityMenu = document.getElementById("ability-menu");
const abilityList = document.getElementById("ability-list");
const abilityMsg = document.getElementById("ability-msg");
const modeSelect = document.getElementById("mode-select");
const skinSelect = document.getElementById("skin-select");
const challengeEl = document.getElementById("challenge-info");

let board, current, queue, held, holdUsed, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let nextPowerupAt, powerupPending, singlePending, freezeRemaining;
let combo, backToBack, lastMoveWasRotation, effectTimer;
let energy, snapshot, slowRemaining, peekRemaining, menuOpen, menuItems;
let challenge, elapsed, garbageTimer, revealRemaining;
let audioCtx = null;
let muted = false;
let gridColor, highlightColor;

function createBoard() {
  const b = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  if (challenge.presetRows) {
    for (let r = ROWS - challenge.presetRows; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) if (Math.random() < 0.6) b[r][c] = Math.floor(Math.random() * 7) + 1;
      // nunca una línea completa desde el inicio
      if (b[r].every((v) => v !== 0)) b[r][Math.floor(Math.random() * COLS)] = 0;
    }
  }
  return b;
}

function addGarbageRow() {
  const overflow = board[0].some((v) => v !== 0);
  board.shift();
  const row = new Array(COLS).fill(GARBAGE_COLOR);
  row[Math.floor(Math.random() * COLS)] = 0;
  board.push(row);
  if (overflow) {
    endGame();
    return;
  }
  // la pieza activa sube si la basura la alcanza
  while (current.y > 0 && collide(current.shape, current.x, current.y)) current.y--;
  if (collide(current.shape, current.x, current.y)) endGame();
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
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

function rollType() {
  let roll = Math.random();
  if (roll < NUT_CHANCE) return 8;
  roll -= NUT_CHANCE;
  for (const [type, chance] of Object.entries(PENTOMINO_CHANCE)) {
    if (roll < chance) return Number(type);
    roll -= chance;
  }
  return Math.floor(Math.random() * 7) + 1;
}

function randomPiece() {
  if (powerupPending) {
    powerupPending = false;
    const powerup = POWERUPS.includes(FORCED_POWERUP) ? FORCED_POWERUP : POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    return makePiece(POWERUP_TYPE, powerup);
  }
  const type = singlePending ? SINGLE_TYPE : rollType();
  singlePending = false;
  return makePiece(type);
}

function holdPiece() {
  if (holdUsed) return;
  const incoming = held || queue[0];
  if (collide(incoming.shape, incoming.x, incoming.y)) return; // no cabe: rechazar el intercambio
  const stored = makePiece(current.type, current.powerup);
  if (held) {
    current = held;
  } else {
    current = queue.shift();
    queue.push(randomPiece());
  }
  held = stored;
  holdUsed = true;
  dropAccum = 0;
  lastMoveWasRotation = false;
  drawNext();
  drawHold();
  drawPeek();
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
    if (cleared === 4) singlePending = true; // recompensa tras un Tetris
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
      maxCombo = Math.max(maxCombo, combo + 1); // tabla de récords
    }
    // el Perfect Clear se evalúa después de eliminar las filas
    if (board.every((row) => row.every((v) => v === 0))) {
      score += PERFECT_CLEAR_BONUS * level;
      labels.push("PERFECT CLEAR");
    }
    level = runStartLevel + Math.floor(lines / 10);
    dropInterval = levelInterval(level);
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
    board: board.map((row) => [...row]),
    score, lines, level, dropInterval, nextPowerupAt, powerupPending, singlePending, freezeRemaining,
    combo, backToBack, holdUsed,
    type: current.type,
    powerup: current.powerup,
  };
  let tSpin = false;
  if (current.powerup) {
    applyPowerup(current);
  } else {
    tSpin = detectTSpin();
    merge();
  }
  if (challenge.hideLocked) revealRemaining = REVEAL_MS;
  clearLines(tSpin);
  if (gameOver) return; // el Sprint puede completarse al limpiar líneas
  spawn();
}

function spawn() {
  current = queue.shift();
  queue.push(randomPiece());
  holdUsed = false;
  lastMoveWasRotation = false;
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
  if (current && queue) {
    draw();
    drawNext();
    drawHold();
    drawPeek();
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
  } else if (challenge.id !== "classic") {
    parts.push(`Tiempo: ${formatTime(elapsed)}`);
  }
  if (reverseActive()) parts.push("¡Rotación invertida!");
  challengeEl.textContent = parts.join(" · ");
  challengeEl.classList.toggle("hidden", challenge.id === "classic");
}

// ---- Skins visuales: paletas y funciones de dibujo de bloques ----
// cada skin define los colores del canvas (bloques, fondo y rejilla); el tema claro/oscuro sigue definiendo la UI.
// `colors` tiene el mismo largo e índices que COLORS; `boardBg`/`grid` en null usan los del tema.

// Retro: bloques cuadrados, colores planos con franja de brillo (estilo original)
function drawRetroBlock(context, px, py, size, color) {
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.fillStyle = highlightColor;
  context.fillRect(px + 1, py + 1, size - 2, 4);
}

// Neon: relleno translúcido y borde brillante con resplandor (shadowBlur)
function drawNeonBlock(context, px, py, size, color) {
  const a = context.globalAlpha;
  context.globalAlpha = a * 0.3;
  context.fillStyle = color;
  context.fillRect(px + 2, py + 2, size - 4, size - 4);
  context.globalAlpha = a;
  context.shadowBlur = Math.max(4, size * 0.4);
  context.shadowColor = color;
  context.strokeStyle = color;
  context.lineWidth = size >= 20 ? 2 : 1;
  context.strokeRect(px + 2.5, py + 2.5, size - 5, size - 5);
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
}

// traza un rectángulo con esquinas redondeadas (arcTo funciona en todos los navegadores)
function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

// Pastel: colores suaves, esquinas redondeadas y un brillo difuso arriba
function drawPastelBlock(context, px, py, size, color) {
  const r = Math.max(2, size * 0.22);
  roundRectPath(context, px + 1, py + 1, size - 2, size - 2, r);
  context.fillStyle = color;
  context.fill();
  roundRectPath(context, px + size * 0.2, py + size * 0.12, size * 0.6, size * 0.2, size * 0.1);
  context.fillStyle = "rgba(255, 255, 255, 0.45)";
  context.fill();
}

// hash entero determinista: misma celda → misma textura en cada frame (sin parpadeo)
function pixelHash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// Pixel art: color base con una textura 4×4 de sub-píxeles claros/oscuros
function drawPixelBlock(context, px, py, size, color) {
  const inner = size - 2;
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, inner, inner);
  const cx = Math.round(px / size);
  const cy = Math.round(py / size);
  const sub = inner / 4;
  for (let i = 0; i < 16; i++) {
    const h = pixelHash(cx, cy, i) % 5;
    if (h > 1) continue;
    context.fillStyle = h === 0 ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.22)";
    context.fillRect(px + 1 + (i % 4) * sub, py + 1 + Math.floor(i / 4) * sub, Math.ceil(sub), Math.ceil(sub));
  }
  // borde inferior/derecho oscuro para dar volumen
  context.fillStyle = "rgba(0, 0, 0, 0.3)";
  context.fillRect(px + 1, py + size - 1 - sub / 2, inner, sub / 2);
  context.fillRect(px + size - 1 - sub / 2, py + 1, sub / 2, inner);
}

const SKINS = {
  retro: { name: "Retro", colors: COLORS, boardBg: null, grid: null, drawBlock: drawRetroBlock },
  neon: {
    name: "Neon",
    colors: [
      null,
      "#00f0ff", // I
      "#fff200", // O
      "#d400ff", // T
      "#39ff14", // S
      "#ff073a", // Z
      "#1f8fff", // J
      "#ff8c00", // L
      "#c0c8d0", // N / basura
      "#ffff66", // power-up
      "#ff2bd6", // comodín
      "#00ffc8", // +
      "#9d4dff", // U
      "#ff5e3a", // Y
      "#b6ff00", // single
    ],
    boardBg: "#000",
    grid: "#141420",
    drawBlock: drawNeonBlock,
  },
  pastel: {
    name: "Pastel",
    colors: [
      null,
      "#a8e6ef", // I
      "#fff1a8", // O
      "#dcc0ec", // T
      "#bfe8c4", // S
      "#f6bcbc", // Z
      "#c3dcf7", // J
      "#ffd6ad", // L
      "#d5dde2", // N / basura
      "#fff6b0", // power-up
      "#f8c0dc", // comodín
      "#a8ddd6", // +
      "#cdbdee", // U
      "#ffc9b6", // Y
      "#d6edbc", // single
    ],
    boardBg: null,
    grid: null,
    drawBlock: drawPastelBlock,
  },
  pixel: { name: "Pixel art", colors: COLORS, boardBg: null, grid: null, drawBlock: drawPixelBlock },
};
let skin = SKINS.retro;

function applySkin(id) {
  const key = Object.prototype.hasOwnProperty.call(SKINS, id) ? id : "retro";
  skin = SKINS[key];
  document.documentElement.dataset.skin = key;
  skinSelect.value = key;
  try {
    localStorage.setItem("skin", key);
  } catch (e) {
    /* almacenamiento no disponible */
  }
  // repintar sin recargar (en pausa o game over el loop no corre)
  if (current && queue) {
    draw();
    drawNext();
    drawHold();
    drawPeek();
  }
}

function loadSkin() {
  try {
    const saved = localStorage.getItem("skin");
    return Object.prototype.hasOwnProperty.call(SKINS, saved) ? saved : "retro";
  } catch (e) {
    return "retro";
  }
}
// ---- fin skins ----

function drawBlock(context, x, y, colorIndex, size, alpha, icon) {
  if (!colorIndex) return;
  context.globalAlpha = alpha ?? 1;
  // el dibujo del bloque lo delega el skin activo
  skin.drawBlock(context, x * size, y * size, size, skin.colors[colorIndex], alpha ?? 1);
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
  ctx.strokeStyle = skin.grid || gridColor;
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
  if (skin.boardBg) {
    ctx.fillStyle = skin.boardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawGrid();

  // board (en "Invisibles" solo se ve un momento tras fijar una pieza)
  if (!challenge.hideLocked || revealRemaining > 0)
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

  // en game over la pieza actual no cupo: no dibujarla encima del tablero
  if (gameOver) return;

  const icon = current.powerup && POWERUP_ICONS[current.powerup];

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2, icon);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++) drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK, 1, icon);
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
  holdCanvas.classList.toggle("hold-locked", !!holdUsed);
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (held) drawPiece(holdCtx, held, 30);
}

function drawPeek() {
  const active = peekRemaining > 0;
  peekCanvas.classList.toggle("hidden", !active);
  if (!active) return;
  peekCtx.clearRect(0, 0, peekCanvas.width, peekCanvas.height);
  queue.slice(0, QUEUE_SIZE).forEach((piece, i) => drawPiece(peekCtx, piece, 12, i * 4));
}

function updateEnergyUI() {
  const full = energy >= ENERGY_MAX;
  energyFill.style.width = `${(energy / ENERGY_MAX) * 100}%`;
  energyFill.classList.toggle("full", full);
  energyBar.setAttribute("aria-valuenow", String(Math.round(energy)));
  energyHint.textContent = full ? "Pulsa E para elegir habilidad" : "";
}

function updateSlowIndicator() {
  slowEl.classList.toggle("hidden", slowRemaining <= 0);
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
  if (!snapshot) return "No hay colocación que deshacer";
  const placed = makePiece(snapshot.type, snapshot.powerup);
  board = snapshot.board;
  ({ score, lines, level, dropInterval, nextPowerupAt, powerupPending, singlePending, freezeRemaining, combo, backToBack, holdUsed } = snapshot);
  // la pieza en juego vuelve al inicio de la cola; la colocada reaparece
  queue.unshift(makePiece(current.type, current.powerup));
  queue.pop();
  current = placed;
  snapshot = null;
  dropAccum = 0;
  lastMoveWasRotation = false;
  updateFreezeIndicator();
  updateHUD();
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
    if (collide(piece.shape, piece.x, piece.y)) return "La pieza no cabe aquí";
  }
  current = piece;
  lastMoveWasRotation = false;
  return true;
}

function openSwapMenu() {
  const pool = [1, 2, 3, 4, 5, 6, 7].filter((t) => t !== current.type);
  const options = [];
  while (options.length < SWAP_OPTIONS && pool.length) options.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  showMenu(options.map((t) => ({ label: `Pieza ${PIECE_NAMES[t]}`, run: () => abilitySwap(t) })));
}

function mainMenuItems() {
  return [
    { label: "Ver siguientes 5 piezas", run: abilityPeek },
    { label: "Intercambiar pieza", run: openSwapMenu, submenu: true },
    { label: "Ralentizar tiempo 10s", run: abilitySlow },
    { label: "Deshacer última colocación", run: abilityUndo },
  ];
}

function showMenu(items) {
  menuItems = items;
  abilityMsg.textContent = "";
  abilityList.replaceChildren(
    ...items.map((item, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${i + 1}. ${item.label}`;
      btn.addEventListener("click", () => {
        btn.blur();
        chooseAbility(i);
      });
      li.appendChild(btn);
      return li;
    }),
  );
}

function chooseAbility(i) {
  const item = menuItems[i];
  if (!item) return;
  const result = item.run();
  if (item.submenu) return;
  if (result !== true) {
    abilityMsg.textContent = result;
    return;
  }
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
  abilityMenu.classList.remove("hidden");
}

function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  abilityMenu.classList.add("hidden");
  lastTime = performance.now();
  loop(lastTime);
}

function endGame(won = false) {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = won ? "¡DESAFÍO COMPLETADO!" : "GAME OVER";
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove("hidden");
  showGameOverRecords();
}

function togglePause() {
  // con el menú abierto el teclado lo gestiona handlePauseKey(), que reanuda
  if (gameOver || menuOpen || paused) return;
  openPauseMenu();
}

// ---- Menú de pausa ----
const START_LEVEL_MAX = 15;
const START_LEVEL_KEY = "tetris-start-level";
const RESUME_INPUT_LOCK = 150; // ms en los que se ignoran inputs del juego tras reanudar
const pauseMenu = document.getElementById("pause-menu");
const pauseResumeBtn = document.getElementById("pause-resume");
const pauseRestartBtn = document.getElementById("pause-restart");
const pauseControlsBtn = document.getElementById("pause-controls-btn");
const pauseControls = document.getElementById("pause-controls");
const startLevelSelect = document.getElementById("start-level");
const pauseItems = [pauseResumeBtn, pauseRestartBtn, pauseControlsBtn, startLevelSelect];
let startLevel = loadStartLevel(); // nivel elegido para la próxima partida
let runStartLevel = 1; // nivel con el que empezó la partida en curso
let inputLockUntil = 0;
let ignoreRepeats = false; // tras reanudar, ignora autorepeticiones de teclas mantenidas desde la pausa

function levelInterval(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function clampStartLevel(n) {
  return Number.isInteger(n) ? Math.min(START_LEVEL_MAX, Math.max(1, n)) : 1;
}

function loadStartLevel() {
  try {
    return clampStartLevel(Number(localStorage.getItem(START_LEVEL_KEY)));
  } catch {
    return 1;
  }
}

function setStartLevel(n) {
  startLevel = clampStartLevel(n);
  startLevelSelect.value = String(startLevel);
  try {
    localStorage.setItem(START_LEVEL_KEY, String(startLevel));
  } catch {
    // sin localStorage el nivel solo dura la sesión
  }
}

function setPauseControlsOpen(open) {
  pauseControls.classList.toggle("hidden", !open);
  pauseControlsBtn.setAttribute("aria-expanded", String(open));
  pauseControlsBtn.textContent = open ? "Ocultar controles" : "Ver controles";
}

function hidePauseMenu() {
  if (pauseMenu.contains(document.activeElement)) document.activeElement.blur();
  pauseMenu.classList.add("hidden");
  setPauseControlsOpen(false);
}

function openPauseMenu() {
  paused = true;
  cancelAnimationFrame(animId);
  setPauseControlsOpen(false);
  pauseMenu.classList.remove("hidden");
  pauseResumeBtn.focus();
}

function resumeGame() {
  if (!paused || gameOver) return;
  paused = false;
  hidePauseMenu();
  // se ignoran inputs un instante y se reinicia la gravedad para evitar movimientos accidentales
  inputLockUntil = performance.now() + RESUME_INPUT_LOCK;
  ignoreRepeats = true;
  dropAccum = -RESUME_INPUT_LOCK; // la gravedad también espera mientras dura el bloqueo
  lastTime = performance.now();
  loop(lastTime);
}

// Teclado con el menú abierto: solo navegación, nunca llega a los controles del juego
function handlePauseKey(e) {
  const i = pauseItems.indexOf(document.activeElement);
  if (e.code === "Tab") {
    // mantiene el foco dentro del menú (evita cambiar el modo y perder la partida)
    e.preventDefault();
    const step = e.shiftKey ? -1 : 1;
    pauseItems[i === -1 ? 0 : (i + step + pauseItems.length) % pauseItems.length].focus();
    return;
  }
  if (e.repeat) {
    // ignora teclas mantenidas desde la partida (p. ej. soft drop) para no recorrer el menú sin querer
    e.preventDefault();
    return;
  }
  switch (e.code) {
    case "KeyP":
    case "Escape":
      e.preventDefault();
      resumeGame();
      break;
    case "ArrowUp":
    case "ArrowDown": {
      e.preventDefault();
      const step = e.code === "ArrowDown" ? 1 : -1;
      const next = i === -1 ? (step === 1 ? 0 : pauseItems.length - 1) : (i + step + pauseItems.length) % pauseItems.length;
      pauseItems[next].focus();
      break;
    }
    case "ArrowLeft":
    case "ArrowRight":
      e.preventDefault();
      if (document.activeElement === startLevelSelect) setStartLevel(startLevel + (e.code === "ArrowRight" ? 1 : -1));
      break;
    case "Enter":
    case "NumpadEnter":
      e.preventDefault();
      if (document.activeElement instanceof HTMLButtonElement && i !== -1) document.activeElement.click();
      break;
    case "Space":
      // sobre un elemento del menú se deja la activación nativa; si no, se evita el scroll
      if (i === -1) e.preventDefault();
      break;
  }
}

for (let n = 1; n <= START_LEVEL_MAX; n++) startLevelSelect.add(new Option(String(n), String(n)));
startLevelSelect.value = String(startLevel);
startLevelSelect.addEventListener("change", () => setStartLevel(Number(startLevelSelect.value)));
pauseResumeBtn.addEventListener("click", resumeGame);
pauseRestartBtn.addEventListener("click", init); // init() también cierra el menú
pauseControlsBtn.addEventListener("click", () => setPauseControlsOpen(pauseControls.classList.contains("hidden")));

function loop(ts) {
  if (gameOver || paused || menuOpen) return;
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
      if (gameOver) {
        draw();
        return;
      }
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
  const id = CHALLENGES[modeSelect.value] ? modeSelect.value : "classic";
  challenge = { id, ...CHALLENGES[id] };
  elapsed = 0;
  garbageTimer = 0;
  revealRemaining = 0;
  board = createBoard();
  score = 0;
  lines = 0;
  level = runStartLevel = startLevel;
  paused = false;
  hidePauseMenu();
  gameOver = false;
  dropInterval = levelInterval(level);
  dropAccum = 0;
  held = null;
  holdUsed = false;
  nextPowerupAt = POWERUP_EVERY_LINES;
  powerupPending = false;
  singlePending = false;
  freezeRemaining = 0;
  energy = 0;
  snapshot = null;
  slowRemaining = 0;
  peekRemaining = 0;
  menuOpen = false;
  abilityMenu.classList.add("hidden");
  combo = -1;
  maxCombo = 0;
  hideRecordsUI();
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
  updateHUD();
  overlay.classList.add("hidden");
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return; // escribiendo el nombre del récord
  if (menuOpen) {
    if (e.code === "Escape" || e.code === "KeyE") closeMenu();
    else if (/^(Digit|Numpad)[1-9]$/.test(e.code)) chooseAbility(Number(e.code.slice(-1)) - 1);
    return;
  }
  if (paused) {
    handlePauseKey(e);
    return;
  }
  if (e.code === "KeyP" || e.code === "Escape") {
    if (!e.repeat) togglePause();
    return;
  }
  if (!e.repeat) ignoreRepeats = false;
  if (gameOver || performance.now() < inputLockUntil || (e.repeat && ignoreRepeats)) return;
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
    case "KeyE":
      openMenu();
      break;
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

modeSelect.addEventListener("change", () => {
  modeSelect.blur(); // evita que las flechas cambien el modo durante la partida
  init();
});

skinSelect.addEventListener("change", () => {
  skinSelect.blur(); // evita que las flechas cambien el skin durante la partida
  applySkin(skinSelect.value);
});

themeBtn.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  themeBtn.blur(); // evita que Space/Enter vuelvan a activar el botón
});


// ---- Tabla de récords local ----
const RECORDS_KEY = "tetris-records";
const LAST_NAME_KEY = "tetris-last-name";
const RECORDS_MAX = 5;
const RECORD_NAME_MAX = 12;
const startScreen = document.getElementById("start-screen");
const startRecordsEl = document.getElementById("start-records");
const startPlayBtn = document.getElementById("start-play");
const recordsResetBtn = document.getElementById("records-reset");
const recordEntry = document.getElementById("record-entry");
const recordNameInput = document.getElementById("record-name");
const recordSaveBtn = document.getElementById("record-save");
const overlayRecordsEl = document.getElementById("overlay-records");
let maxCombo = 0;
let pendingRecord = null; // partida que entra en el top y aún no tiene nombre

function emptyRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function toCount(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sanitizeName(v) {
  const name = String(v == null ? "" : v).trim().slice(0, RECORD_NAME_MAX);
  return name || "Anónimo";
}

function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (!data || typeof data !== "object") return emptyRecords();
    const top = (Array.isArray(data.top) ? data.top : [])
      .filter((r) => r && typeof r === "object")
      .map((r) => ({
        name: sanitizeName(r.name),
        score: toCount(r.score),
        lines: toCount(r.lines),
        maxCombo: toCount(r.maxCombo),
        mode: CHALLENGES[r.mode] ? r.mode : "classic",
        date: typeof r.date === "string" ? r.date.slice(0, 32) : "",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, RECORDS_MAX);
    return { top, bestCombo: toCount(data.bestCombo), maxLines: toCount(data.maxLines) };
  } catch (e) {
    return emptyRecords();
  }
}

function saveRecords(data) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(data));
  } catch (e) {
    /* almacenamiento no disponible */
  }
}

function loadLastName() {
  try {
    return (localStorage.getItem(LAST_NAME_KEY) || "").slice(0, RECORD_NAME_MAX);
  } catch (e) {
    return "";
  }
}

function saveLastName(name) {
  try {
    localStorage.setItem(LAST_NAME_KEY, name);
  } catch (e) {
    /* almacenamiento no disponible */
  }
}

function qualifiesForTop(data, value) {
  if (value <= 0) return false;
  return data.top.length < RECORDS_MAX || value > data.top[data.top.length - 1].score;
}

// pinta la tabla en `container` usando solo textContent (los nombres vienen del usuario)
function renderRecords(container, data, highlightIndex = -1) {
  container.replaceChildren();
  if (data.top.length) {
    const table = document.createElement("table");
    table.className = "records-table";
    const head = table.createTHead().insertRow();
    for (const h of ["#", "Nombre", "Puntos", "Líneas", "Modo"]) {
      const th = document.createElement("th");
      th.textContent = h;
      head.appendChild(th);
    }
    const body = table.createTBody();
    data.top.forEach((r, i) => {
      const row = body.insertRow();
      if (i === highlightIndex) row.className = "record-new";
      const cells = [i + 1, r.name, r.score.toLocaleString(), r.lines, CHALLENGES[r.mode].name];
      for (const c of cells) row.insertCell().textContent = c;
      if (r.date) row.title = new Date(r.date).toLocaleString();
    });
    container.appendChild(table);
  } else {
    const empty = document.createElement("p");
    empty.className = "records-empty";
    empty.textContent = "Aún no hay récords";
    container.appendChild(empty);
  }
  const stats = document.createElement("p");
  stats.className = "records-stats";
  stats.textContent = `Mejor combo: x${data.bestCombo} · Líneas máximas: ${data.maxLines}`;
  container.appendChild(stats);
}

function showStartScreen() {
  gameOver = true; // bloquea teclado y pausa hasta la primera partida
  renderRecords(startRecordsEl, loadRecords());
  startScreen.classList.remove("hidden");
}

function hideRecordsUI() {
  // si se reinicia sin pulsar Guardar, el récord se guarda con el nombre escrito (o "Anónimo")
  savePendingRecord();
  startScreen.classList.add("hidden");
  recordEntry.classList.add("hidden");
  overlayRecordsEl.classList.add("hidden");
}

// se llama desde endGame(): actualiza estadísticas y ofrece guardar el récord
function showGameOverRecords() {
  const data = loadRecords();
  data.bestCombo = Math.max(data.bestCombo, maxCombo);
  data.maxLines = Math.max(data.maxLines, lines);
  saveRecords(data);
  if (qualifiesForTop(data, score)) {
    pendingRecord = {
      score,
      lines,
      maxCombo,
      mode: challenge.id,
      date: new Date().toISOString(),
    };
    recordNameInput.value = loadLastName();
    recordEntry.classList.remove("hidden");
    recordNameInput.focus();
    recordNameInput.select();
  } else {
    pendingRecord = null;
    recordEntry.classList.add("hidden");
  }
  renderRecords(overlayRecordsEl, data);
  overlayRecordsEl.classList.remove("hidden");
}

function savePendingRecord() {
  if (!pendingRecord) return;
  const name = sanitizeName(recordNameInput.value);
  const entry = { name, ...pendingRecord };
  pendingRecord = null;
  saveLastName(name);
  const data = loadRecords();
  data.top.push(entry);
  data.top.sort((a, b) => b.score - a.score);
  data.top = data.top.slice(0, RECORDS_MAX);
  saveRecords(data);
  recordEntry.classList.add("hidden");
  recordNameInput.blur();
  renderRecords(overlayRecordsEl, data, data.top.indexOf(entry));
}

startPlayBtn.addEventListener("click", () => {
  startPlayBtn.blur(); // evita que Space/Enter vuelvan a activar el botón
  init();
});

recordsResetBtn.addEventListener("click", () => {
  recordsResetBtn.blur();
  if (!confirm("¿Borrar todos los récords?")) return;
  try {
    localStorage.removeItem(RECORDS_KEY);
  } catch (e) {
    /* almacenamiento no disponible */
  }
  renderRecords(startRecordsEl, loadRecords());
});

recordSaveBtn.addEventListener("click", () => {
  recordSaveBtn.blur();
  savePendingRecord();
});

recordNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    savePendingRecord();
  }
});

applyTheme(loadTheme());
applySkin(loadSkin());

showStartScreen();
