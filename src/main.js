const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const speedEl = document.getElementById('speed');
const overlay = document.getElementById('overlay');
const overlayMessage = document.getElementById('overlay-message');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');

const GRID_SIZE = 22;
const TILE_COUNT = canvas.width / GRID_SIZE; // 20
const BASE_SPEED = 160; // milliseconds per step

let snake;
let direction;
let nextDirection;
let food;
let score;
let bestScore = Number(localStorage.getItem('snake-best-score') ?? 0);
let speedMultiplier;
let loopId;
let lastUpdate = 0;
let paused = false;
let running = false;

bestScoreEl.textContent = bestScore;

const sounds = {
  eat: new Audio(
    'data:audio/wav;base64,UklGRvQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YbzAAACAgICAgICAgP8BAgMDAwQEBAQFBQUFBgYGBwcHBwgICAkJCQsLCwwMDQ0NDg4ODw8PEBAQERERERISEhITExMTExQUFBQUFRUVFRYWFhYWFxgYGBgYGRkZGhoaGhsbGxwcHBwcHR0dHR4eHh4eHyAgICAgISEhISIiIiMjIyMkJCQkJSUlJSYmJiY='
  ),
  crash: new Audio(
    'data:audio/wav;base64,UklGRmIAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YYIAAAB/f399fHyAgH9/f39+fn5+f35+fn59fX18fHx8fHt7e3t6enp6eXl5eXh4eHd3d3d2dnZ2dXV1dXR0dHNzc3NycXBwb25ubm1tbGxra2praGdnZmZmZWVlZGRjY2NjYmJiYmFhYWFgYF9fX15eXl1dXVxcXFtbW1ra2toaGdmZmVlZWJjY2FfX15eXl1dXVxcXFtbW2dnZ2RjY2FfX15eXV1dXFxcbGxsa2toZ2dlZWNjY2FfX15eXV1dXFxcXFtbW2dnZ2VlZWNjY2JiYmJiYWFhYGBgYF9fX19fX19fX19fXw=='
  ),
};

function resetGame() {
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  food = randomFoodPosition();
  score = 0;
  speedMultiplier = 1;
  scoreEl.textContent = score;
  speedEl.textContent = `${speedMultiplier.toFixed(1)}x`;
  paused = false;
}

function randomFoodPosition() {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT),
    };
  } while (snake && snake.some((segment) => segment.x === position.x && segment.y === position.y));
  return position;
}

function update(timestamp) {
  if (!running || paused) return;
  if (timestamp - lastUpdate < BASE_SPEED / speedMultiplier) {
    loopId = requestAnimationFrame(update);
    return;
  }
  lastUpdate = timestamp;

  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // wall collision
  if (head.x < 0 || head.y < 0 || head.x >= TILE_COUNT || head.y >= TILE_COUNT) {
    return handleGameOver();
  }

  // self collision
  if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
    return handleGameOver();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    speedMultiplier = Math.min(3.5, 1 + snake.length * 0.03);
    scoreEl.textContent = score;
    speedEl.textContent = `${speedMultiplier.toFixed(1)}x`;
    food = randomFoodPosition();
    playSound('eat');
    updateBestScore();
  } else {
    snake.pop();
  }

  draw();
  loopId = requestAnimationFrame(update);
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= TILE_COUNT; i++) {
    ctx.beginPath();
    ctx.moveTo(i * GRID_SIZE, 0);
    ctx.lineTo(i * GRID_SIZE, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * GRID_SIZE);
    ctx.lineTo(canvas.width, i * GRID_SIZE);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const intensity = 0.4 + (index / snake.length) * 0.6;
    ctx.fillStyle = `rgba(113, 247, 159, ${intensity})`;
    ctx.fillRect(segment.x * GRID_SIZE + 2, segment.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
  });
}

function drawFood() {
  ctx.fillStyle = '#ff4d6d';
  ctx.shadowColor = '#ff4d6d';
  ctx.shadowBlur = 20;
  drawRoundedRect(food.x * GRID_SIZE + 4, food.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8, 6);
  ctx.shadowBlur = 0;
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawBackground() {
  const gradient = ctx.createRadialGradient(220, 220, 20, 220, 220, 320);
  gradient.addColorStop(0, '#050c11');
  gradient.addColorStop(1, '#020308');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  drawBackground();
  drawGrid();
  drawSnake();
  drawFood();
}

function setDirection({ key }) {
  if (!running) startGame();
  const controls = {
    ArrowUp: { x: 0, y: -1 },
    KeyW: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    KeyS: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    KeyA: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    KeyD: { x: 1, y: 0 },
  };

  const newDirection = controls[key];
  if (!newDirection) return;

  const isOpposite = newDirection.x === -direction.x && newDirection.y === -direction.y;
  if (isOpposite && snake.length > 1) return;

  nextDirection = newDirection;
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? '继续' : '暂停';
  overlayMessage.textContent = paused ? '游戏已暂停' : '';
  overlay.classList.toggle('hidden', !paused);
}

function startGame() {
  if (running) return;
  resetGame();
  running = true;
  overlay.classList.add('hidden');
  pauseBtn.textContent = '暂停';
  loopId = requestAnimationFrame(update);
}

function restartGame(autoStart = false) {
  cancelAnimationFrame(loopId);
  running = false;
  paused = false;
  pauseBtn.textContent = '暂停';
  resetGame();
  draw();
  overlayMessage.textContent = autoStart ? '' : '按空格开始';
  overlay.classList.toggle('hidden', autoStart);
  if (autoStart) {
    running = true;
    loopId = requestAnimationFrame(update);
  }
}

function handleGameOver() {
  playSound('crash');
  running = false;
  overlayMessage.textContent = '失败啦！再来一次？';
  overlay.classList.remove('hidden');
}

function updateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('snake-best-score', bestScore);
    bestScoreEl.textContent = bestScore;
  }
}

function playSound(name) {
  const sound = sounds[name];
  if (!sound) return;
  sound.currentTime = 0;
  sound.volume = 0.3;
  sound.play().catch(() => {});
}

function bindEvents() {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (!running) {
        startGame();
      } else {
        togglePause();
      }
      return;
    }
    setDirection(event);
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', () => restartGame(true));
}

function init() {
  resetGame();
  draw();
  overlayMessage.textContent = '按空格开始';
  overlay.classList.remove('hidden');
  bindEvents();
}

init();
