'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - light blue
  '#ffb74d', // L - orange
  '#b0bec5', // N - nut (tuerca), gris metálico
  '#fff176', // power-up (pieza especial)
  '#f06292', // comodín (resultado del Tinte)
  '#4db6ac', // + - pentominó cruz, teal
  '#9575cd', // U - pentominó, violeta
  '#ff8a65', // Y - pentominó, coral
  '#aed581', // single 1×1 (recompensa tras un Tetris)
];
const POWERUP_TYPE = 9;
const WILDCARD = 10;
const SINGLE_TYPE = 14;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (centro vacío)
  [[9]],                                       // power-up (1×1)
  [[0,11,0],[11,11,11],[0,11,0]],             // + - pentominó cruz
  [[12,0,12],[12,12,12],[0,0,0]],             // U - pentominó
  [[0,13,0,0],[13,13,13,13],[0,0,0,0],[0,0,0,0]], // Y - pentominó
  [[14]],                                      // single 1×1 (recompensa)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const NUT_CHANCE = 0.05; // probabilidad de que salga la tuerca (pieza reto)
// probabilidad de cada pentominó (tipo → probabilidad); el resto del sorteo son las 7 estándar
const PENTOMINO_CHANCE = { 11: 0.03, 12: 0.03, 13: 0.03 };
const POWERUP_EVERY_LINES = 10; // cada cuántas líneas aparece un power-up
const FREEZE_MS = 5000;         // duración del power-up Congelar
const POWERUPS = ['bomb', 'lightning', 'dye', 'gravity', 'freeze'];
const POWERUP_ICONS = { bomb: '💣', lightning: '⚡', dye: '🎨', gravity: '⬇', freeze: '❄' };
// depuración: index.html?powerup=bomb fuerza el tipo de power-up
const FORCED_POWERUP = new URLSearchParams(location.search).get('powerup');

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

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let nextPowerupAt, powerupPending, singlePending, freezeRemaining;
let gridColor, highlightColor;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
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
    const powerup = POWERUPS.includes(FORCED_POWERUP)
      ? FORCED_POWERUP
      : POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    return { type: POWERUP_TYPE, powerup, shape: [[POWERUP_TYPE]], x: Math.floor(COLS / 2), y: 0 };
  }
  const type = singlePending ? SINGLE_TYPE : rollType();
  singlePending = false;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
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
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    if (cleared === 4) singlePending = true; // recompensa tras un Tetris
    lines += cleared;
    while (lines >= nextPowerupAt) {
      powerupPending = true;
      nextPowerupAt += POWERUP_EVERY_LINES;
    }
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
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
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function applyPowerup(piece) {
  const px = piece.x, py = piece.y;
  switch (piece.powerup) {
    case 'bomb':
      for (let r = py - 1; r <= py + 1; r++)
        for (let c = px - 1; c <= px + 1; c++)
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
      break;
    case 'lightning':
      board[py].fill(0);
      break;
    case 'dye': {
      // tiñe el color del bloque sobre el que aterrizó; sin bloque debajo no hace nada
      const target = py + 1 < ROWS ? board[py + 1][px] : 0;
      if (target && target !== WILDCARD)
        for (const row of board)
          for (let c = 0; c < COLS; c++)
            if (row[c] === target) row[c] = WILDCARD;
      break;
    }
    case 'gravity':
      for (let c = 0; c < COLS; c++) {
        const col = [];
        for (let r = 0; r < ROWS; r++) if (board[r][c]) col.push(board[r][c]);
        for (let r = ROWS - 1; r >= 0; r--) board[r][c] = col.pop() || 0;
      }
      break;
    case 'freeze':
      freezeRemaining = FREEZE_MS;
      updateFreezeIndicator();
      break;
  }
}

function updateFreezeIndicator() {
  freezeEl.classList.toggle('hidden', freezeRemaining <= 0);
  freezeEl.textContent = `❄ ${Math.ceil(freezeRemaining / 1000)}s`;
}

function lockPiece() {
  if (current.powerup) applyPowerup(current);
  else merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const styles = getComputedStyle(root);
  gridColor = styles.getPropertyValue('--grid').trim();
  highlightColor = styles.getPropertyValue('--highlight').trim();
  const isLight = theme === 'light';
  themeBtn.textContent = isLight ? 'Modo oscuro' : 'Modo claro';
  themeBtn.setAttribute('aria-pressed', String(isLight));
  try { localStorage.setItem('theme', theme); } catch (e) { /* almacenamiento no disponible */ }
  // el loop se detiene en pausa y game over: repintar manualmente
  if (current && next) { draw(); drawNext(); }
}

function loadTheme() {
  try {
    return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
  } catch (e) {
    return 'dark';
  }
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
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
    context.fillStyle = '#000';
    context.font = `${size * 0.6}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
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
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // en game over la pieza actual no cupo: no dibujarla encima del tablero
  if (gameOver) return;

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2, current.powerup && POWERUP_ICONS[current.powerup]);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK, 1, current.powerup && POWERUP_ICONS[current.powerup]);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB, 1, next.powerup && POWERUP_ICONS[next.powerup]);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeRemaining > 0) {
    // el tiempo se descuenta por frame, así que la pausa no lo consume
    freezeRemaining = Math.max(0, freezeRemaining - dt);
    updateFreezeIndicator();
  } else {
    dropAccum += dt;
  }
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
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
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  nextPowerupAt = POWERUP_EVERY_LINES;
  powerupPending = false;
  singlePending = false;
  freezeRemaining = 0;
  updateFreezeIndicator();
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

themeBtn.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  themeBtn.blur(); // evita que Space/Enter vuelvan a activar el botón
});

applyTheme(loadTheme());

init();
