const STORAGE_KEYS = {
  bestScore: 'save-the-earth.best-score',
  playerProfile: 'save-the-earth.player-profile',
};

const TRASH_TYPES = ['glass', 'plastic', 'paper', 'organic'];

const TRASH_CONFIG = {
  glass: { label: 'GLASS', icon: '\u{1F37E}', toneClass: 'is-glass' },
  plastic: { label: 'PLASTIC', icon: '\u{1F9F4}', toneClass: 'is-plastic' },
  paper: { label: 'PAPER', icon: '\u{1F4C4}', toneClass: 'is-paper' },
  organic: { label: 'ORGANIC', icon: '\u{1F34E}', toneClass: 'is-organic' },
};

const AVATARS = [
  { id: 'explorer', label: 'Explorer', icon: '\u{1F9D2}' },
  { id: 'guardian', label: 'Guardian', icon: '\u{1F9D1}\u200D\u{1F33E}' },
  { id: 'panda', label: 'Panda', icon: '\u{1F43C}' },
  { id: 'fox', label: 'Fox', icon: '\u{1F98A}' },
];

const LEVELS = {
  1: { duration: 45, baseSpeed: 0.6, speedRamp: 0.85, spawnRate: 1450, goal: 10, label: 'Park Cleanup' },
  2: { duration: 60, baseSpeed: 0.9, speedRamp: 0.95, spawnRate: 1050, goal: 18, label: 'River Rescue' },
};

const PLAYER_WIDTH = 15;
const PLAYER_START_X = 42.5;
const CATCH_ZONE_TOP = 78;
const CATCH_ZONE_BOTTOM = 94;
const ITEM_COLLISION_WIDTH = 6;
const root = document.getElementById('app');

const state = {
  phase: 'start',
  score: 0,
  bestScore: readStoredBestScore(),
  timeLeft: LEVELS[1].duration,
  level: 1,
  targetType: pickRandomTrashType(),
  items: [],
  playerX: PLAYER_START_X,
  playerData: readStoredProfile(),
  feedback: null,
  streak: 0,
};

const runtime = {
  animationFrameId: 0,
  timerId: 0,
  feedbackTimerId: 0,
  lastSpawnTime: 0,
  lastGameTargetType: null,
  refs: {},
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return map[character];
  });
}

function readStoredProfile() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.playerProfile);
    if (!raw) return { name: '', age: '', avatar: AVATARS[0].id };

    const parsed = JSON.parse(raw);
    const avatarIsValid = AVATARS.some((avatar) => avatar.id === parsed.avatar);

    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      age: typeof parsed.age === 'string' ? parsed.age : '',
      avatar: avatarIsValid ? parsed.avatar : AVATARS[0].id,
    };
  } catch {
    return { name: '', age: '', avatar: AVATARS[0].id };
  }
}

function readStoredBestScore() {
  const raw = Number(window.localStorage.getItem(STORAGE_KEYS.bestScore) || '0');
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

function saveProfile() {
  window.localStorage.setItem(STORAGE_KEYS.playerProfile, JSON.stringify(state.playerData));
}

function saveBestScore() {
  window.localStorage.setItem(STORAGE_KEYS.bestScore, String(state.bestScore));
}

function pickRandomTrashType(exclude) {
  const pool = exclude ? TRASH_TYPES.filter((type) => type !== exclude) : TRASH_TYPES;
  return pool[Math.floor(Math.random() * pool.length)] || TRASH_TYPES[0];
}

function getRoundProgress() {
  const levelConfig = LEVELS[state.level];
  const elapsedRatio = 1 - state.timeLeft / levelConfig.duration;
  return Math.max(0, Math.min(1, elapsedRatio));
}

function createTrashItem(levelConfig, progress) {
  const speedMultiplier = levelConfig.baseSpeed + levelConfig.speedRamp * progress;

  return {
    id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: pickRandomTrashType(),
    x: Math.random() * 88,
    y: -12,
    speed: (0.95 + Math.random() * 0.75) * speedMultiplier,
    rotation: Math.random() * 360,
  };
}

function getActiveAvatar() {
  return AVATARS.find((avatar) => avatar.id === state.playerData.avatar) || AVATARS[0];
}

function getAchievement(score) {
  if (score >= LEVELS[2].goal) return 'Eco Legend';
  if (score >= LEVELS[1].goal) return 'Recycling Ranger';
  return 'Seedling Saver';
}

function getResultMessage() {
  const safeName = state.playerData.name || 'Player';
  if (state.score >= LEVELS[2].goal) return `${safeName}, you turned the whole city into a cleaner place.`;
  if (state.score >= LEVELS[1].goal) return `${safeName}, your sorting skills are getting seriously strong.`;
  return `${safeName}, every clean-up starts with a few good catches.`;
}

function updateBestScore() {
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    saveBestScore();
  }
}

function clearFeedbackTimer() {
  if (runtime.feedbackTimerId) {
    window.clearTimeout(runtime.feedbackTimerId);
    runtime.feedbackTimerId = 0;
  }
}

function setFeedback(type) {
  clearFeedbackTimer();
  state.feedback = { type, id: Date.now() };
  runtime.feedbackTimerId = window.setTimeout(() => {
    state.feedback = null;
    syncPlayingUI();
  }, 650);
}

function stopGameLoops() {
  if (runtime.animationFrameId) {
    window.cancelAnimationFrame(runtime.animationFrameId);
    runtime.animationFrameId = 0;
  }

  if (runtime.timerId) {
    window.clearInterval(runtime.timerId);
    runtime.timerId = 0;
  }

  clearFeedbackTimer();
}

function startGame() {
  if (!state.playerData.name.trim()) return;

  const startingTargetType = pickRandomTrashType(runtime.lastGameTargetType || undefined);

  stopGameLoops();
  state.phase = 'playing';
  state.score = 0;
  state.timeLeft = LEVELS[1].duration;
  state.level = 1;
  state.targetType = startingTargetType;
  state.items = [];
  state.playerX = PLAYER_START_X;
  state.feedback = null;
  state.streak = 0;
  runtime.lastSpawnTime = 0;
  runtime.lastGameTargetType = startingTargetType;

  renderApp();
  startTimer();
  startAnimationLoop();
}

function moveToLevelTwo() {
  state.level = 2;
  state.timeLeft = LEVELS[2].duration;
  state.items = [];
  state.streak = 0;
  state.targetType = pickRandomTrashType(state.targetType);
  state.feedback = null;
  runtime.lastSpawnTime = 0;
  syncPlayingUI();
}

function endGame() {
  stopGameLoops();
  state.phase = 'gameover';
  renderApp();
}

function startTimer() {
  runtime.timerId = window.setInterval(() => {
    state.timeLeft = Math.max(0, state.timeLeft - 1);

    if (state.timeLeft === 0) {
      if (state.level === 1 && state.score >= LEVELS[1].goal) {
        moveToLevelTwo();
        return;
      }

      endGame();
      return;
    }

    syncPlayingUI();
  }, 1000);
}

function startAnimationLoop() {
  const frame = (timestamp) => {
    const levelConfig = LEVELS[state.level];
    const progress = getRoundProgress();

    if (timestamp - runtime.lastSpawnTime >= levelConfig.spawnRate) {
      state.items.push(createTrashItem(levelConfig, progress));
      runtime.lastSpawnTime = timestamp;
    }

    const nextItems = [];

    for (const item of state.items) {
      const previousY = item.y;
      const nextY = item.y + item.speed;
      const itemCenterX = item.x + ITEM_COLLISION_WIDTH / 2;
      const catchZoneReached = previousY <= CATCH_ZONE_BOTTOM && nextY >= CATCH_ZONE_TOP;
      const insidePlayerWidth =
        itemCenterX >= state.playerX - 1 &&
        itemCenterX <= state.playerX + PLAYER_WIDTH + 1;
      const caught = catchZoneReached && insidePlayerWidth;

      item.y = nextY;

      if (caught) {
        const isCorrect = item.type === state.targetType;

        if (isCorrect) {
          state.score += 1;
          state.streak += 1;
          setFeedback('correct');
        } else {
          state.score = Math.max(0, state.score - 1);
          state.streak = 0;
          setFeedback('wrong');
        }

        updateBestScore();
        continue;
      }

      if (item.y < 105) nextItems.push(item);
    }

    state.items = nextItems;
    syncPlayingUI();
    runtime.animationFrameId = window.requestAnimationFrame(frame);
  };

  runtime.animationFrameId = window.requestAnimationFrame(frame);
}

function handleKeyboardMove(event) {
  if (state.phase !== 'playing') return;

  if (event.key === 'ArrowLeft') {
    state.playerX = Math.max(0, state.playerX - 5);
    syncPlayingUI();
  }

  if (event.key === 'ArrowRight') {
    state.playerX = Math.min(100 - PLAYER_WIDTH, state.playerX + 5);
    syncPlayingUI();
  }
}

function handlePointerMove(event) {
  if (state.phase !== 'playing') return;
  if (!runtime.refs.gameContainer) return;
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest('.game-container')) return;

  const bounds = runtime.refs.gameContainer.getBoundingClientRect();
  const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100;
  state.playerX = Math.max(0, Math.min(100 - PLAYER_WIDTH, relativeX - PLAYER_WIDTH / 2));
  syncPlayingUI();
}

function renderStartView() {
  const activeAvatar = getActiveAvatar();

  return `
    <section class="scene scene-start">
      <div class="card hero-card">
        <div class="eyebrow"><span class="eyebrow-icon">${'\u{1F33F}'}</span>Eco Arcade</div>
        <div class="hero-top">
          <div>
            <div class="hero-planet">${'\u{1F30E}'}</div>
            <h1>Save the Earth</h1>
            <p class="hero-subtitle">Choose your hero and start the clean-up.</p>
          </div>
          <div class="score-card">
            <span>Best Score</span>
            <strong>${state.bestScore}</strong>
          </div>
        </div>
      </div>

      <div class="card setup-card">
        <div class="setup-top">
          <div>
            <div class="section-title">Player Setup</div>
            <h2>Pick your hero</h2>
          </div>
          <div class="avatar-preview" data-role="avatar-preview">${activeAvatar.icon}</div>
        </div>

        <label class="field">
          <span>Name</span>
          <input data-field="name" type="text" maxlength="20" placeholder="Your name" value="${escapeHtml(state.playerData.name)}" />
        </label>

        <label class="field">
          <span>Age</span>
          <input data-field="age" type="number" min="1" max="120" placeholder="Optional" value="${escapeHtml(state.playerData.age)}" />
        </label>

        <div class="avatar-grid">
          ${AVATARS.map(
            (avatar) => `
              <button class="avatar-card${avatar.id === state.playerData.avatar ? ' is-selected' : ''}" type="button" data-action="choose-avatar" data-avatar="${avatar.id}">
                <span class="avatar-icon">${avatar.icon}</span>
                <span class="avatar-label">${avatar.label}</span>
              </button>
            `,
          ).join('')}
        </div>
      </div>

      <button class="primary-button" type="button" data-action="start-game" ${state.playerData.name.trim() ? '' : 'disabled'}>
        Start Mission
      </button>
    </section>
  `;
}

function renderPlayingView() {
  const activeAvatar = getActiveAvatar();
  const target = TRASH_CONFIG[state.targetType];

  return `
    <section class="scene scene-playing">
      <div class="hud card">
        <div class="hud-top">
          <div>
            <div class="mini-label" data-role="mission-label">${LEVELS[state.level].label}</div>
            <div class="player-badge"><span class="player-badge-icon">${activeAvatar.icon}</span><span>${escapeHtml(state.playerData.name)}</span></div>
          </div>

          <div class="score-grid">
            <div class="mini-card"><span>Score</span><strong data-role="score-value">${state.score}</strong></div>
            <div class="mini-card"><span>Best</span><strong data-role="best-value">${state.bestScore}</strong></div>
          </div>
        </div>

        <div class="hud-bottom">
          <div class="target-panel">
            <div class="mini-label"><span>${'\u{1F3AF}'}</span>Catch This</div>
            <div class="target-pill ${target.toneClass}" data-role="target-pill">
              <span class="target-icon">${target.icon}</span>
              <span data-role="target-label">${target.label}</span>
            </div>
            <p data-role="target-hint">${state.level === 1 ? `This level stays on ${target.label.toLowerCase()}. Reach ${LEVELS[1].goal} points to unlock the river rescue.` : `This level stays on ${target.label.toLowerCase()}. The pace is faster now.`}</p>
          </div>

          <div class="timer-panel">
            <div class="timer-row">
              <span class="mini-label"><span>${'\u{23F1}'}</span>Timer</span>
              <strong data-role="time-value">${state.timeLeft}s</strong>
            </div>
            <div class="progress-track"><div class="progress-fill" data-role="timer-fill"></div></div>
            <div class="progress-meta" data-role="goal-copy"></div>
            <div class="progress-track progress-track-small" data-role="goal-track">
              <div class="progress-fill progress-fill-goal" data-role="goal-fill"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="feedback-popup hidden" data-role="feedback-popup"></div>
      <div class="items-layer" data-role="items-layer"></div>
      <div class="ground-strip"></div>
      <div class="player" data-role="player">
        <div class="player-catcher"></div>
        <div class="player-avatar">${activeAvatar.icon}</div>
      </div>
    </section>
  `;
}

function renderGameOverView() {
  const trophyIcon = state.score >= LEVELS[2].goal ? '\u{1F3C6}' : '\u{1F331}';

  return `
    <section class="scene scene-gameover">
      <div class="card result-card">
        <div class="result-icon">${trophyIcon}</div>
        <div class="eyebrow result-badge">${getAchievement(state.score)}</div>
        <h2>Mission Complete</h2>
        <p>${escapeHtml(getResultMessage())}</p>

        <div class="result-grid">
          <div class="mini-card big"><span>Final Score</span><strong>${state.score}</strong></div>
          <div class="mini-card big"><span>Best Score</span><strong>${state.bestScore}</strong></div>
          <div class="mini-card big"><span>Reached</span><strong>Level ${state.level}</strong></div>
          <div class="mini-card big"><span>Player</span><strong>${escapeHtml(state.playerData.name)}${state.playerData.age ? `, ${escapeHtml(state.playerData.age)}` : ''}</strong></div>
        </div>
      </div>

      <button class="primary-button" type="button" data-action="play-again">Play Again</button>
    </section>
  `;
}

function cacheRefs() {
  runtime.refs = {
    gameContainer: root.querySelector('.game-container'),
    avatarPreview: root.querySelector('[data-role="avatar-preview"]'),
    avatarButtons: [...root.querySelectorAll('[data-action="choose-avatar"]')],
    startButton: root.querySelector('[data-action="start-game"]'),
    scoreValue: root.querySelector('[data-role="score-value"]'),
    bestValue: root.querySelector('[data-role="best-value"]'),
    missionLabel: root.querySelector('[data-role="mission-label"]'),
    targetPill: root.querySelector('[data-role="target-pill"]'),
    targetLabel: root.querySelector('[data-role="target-label"]'),
    targetHint: root.querySelector('[data-role="target-hint"]'),
    timeValue: root.querySelector('[data-role="time-value"]'),
    timerFill: root.querySelector('[data-role="timer-fill"]'),
    goalCopy: root.querySelector('[data-role="goal-copy"]'),
    goalTrack: root.querySelector('[data-role="goal-track"]'),
    goalFill: root.querySelector('[data-role="goal-fill"]'),
    feedbackPopup: root.querySelector('[data-role="feedback-popup"]'),
    itemsLayer: root.querySelector('[data-role="items-layer"]'),
    player: root.querySelector('[data-role="player"]'),
  };
}

function syncStartUI() {
  if (state.phase !== 'start') return;

  const activeAvatar = getActiveAvatar();
  if (runtime.refs.avatarPreview) runtime.refs.avatarPreview.textContent = activeAvatar.icon;

  for (const button of runtime.refs.avatarButtons || []) {
    button.classList.toggle('is-selected', button.dataset.avatar === state.playerData.avatar);
  }

  if (runtime.refs.startButton) {
    runtime.refs.startButton.disabled = !state.playerData.name.trim();
  }
}

function syncPlayingUI() {
  if (state.phase !== 'playing') return;

  const levelConfig = LEVELS[state.level];
  const target = TRASH_CONFIG[state.targetType];
  const timerProgress = (state.timeLeft / levelConfig.duration) * 100;
  const levelProgress = Math.min((state.score / LEVELS[1].goal) * 100, 100);

  if (runtime.refs.scoreValue) runtime.refs.scoreValue.textContent = String(state.score);
  if (runtime.refs.bestValue) runtime.refs.bestValue.textContent = String(state.bestScore);
  if (runtime.refs.missionLabel) runtime.refs.missionLabel.textContent = levelConfig.label;
  if (runtime.refs.targetPill) runtime.refs.targetPill.className = `target-pill ${target.toneClass}`;
  if (runtime.refs.targetLabel) runtime.refs.targetLabel.textContent = target.label;

  if (runtime.refs.targetPill) {
    const iconElement = runtime.refs.targetPill.querySelector('.target-icon');
    if (iconElement) iconElement.textContent = target.icon;
  }

  if (runtime.refs.targetHint) {
    runtime.refs.targetHint.textContent =
      state.level === 1
        ? `This level stays on ${target.label.toLowerCase()}. Reach ${LEVELS[1].goal} points to unlock the river rescue.`
        : `This level stays on ${target.label.toLowerCase()}. The pace is faster now.`;
  }

  if (runtime.refs.timeValue) runtime.refs.timeValue.textContent = `${state.timeLeft}s`;

  if (runtime.refs.timerFill) {
    runtime.refs.timerFill.style.width = `${Math.max(0, timerProgress)}%`;
    runtime.refs.timerFill.classList.toggle('is-danger', state.timeLeft <= 10);
  }

  if (runtime.refs.goalCopy) {
    runtime.refs.goalCopy.textContent =
      state.level === 1
        ? `Goal progress: ${Math.min(state.score, LEVELS[1].goal)} / ${LEVELS[1].goal}`
        : `Streak bonus energy: ${state.streak}`;
  }

  if (runtime.refs.goalTrack) runtime.refs.goalTrack.classList.toggle('hidden', state.level !== 1);
  if (runtime.refs.goalFill) runtime.refs.goalFill.style.width = `${levelProgress}%`;

  if (runtime.refs.feedbackPopup) {
    if (!state.feedback) {
      runtime.refs.feedbackPopup.classList.add('hidden');
    } else {
      runtime.refs.feedbackPopup.className = `feedback-popup ${state.feedback.type === 'correct' ? 'is-success' : 'is-error'}`;
      runtime.refs.feedbackPopup.textContent = state.feedback.type === 'correct' ? '+1 Nice Catch' : '-1 Wrong Bin';
    }
  }

  if (runtime.refs.itemsLayer) {
    runtime.refs.itemsLayer.innerHTML = state.items
      .map((item) => `<div class="trash-item" style="left:${item.x}%; top:${item.y}%; transform: rotate(${item.rotation}deg);">${TRASH_CONFIG[item.type].icon}</div>`)
      .join('');
  }

  if (runtime.refs.player) {
    runtime.refs.player.style.left = `${state.playerX}%`;
    runtime.refs.player.classList.toggle('is-celebrating', state.feedback?.type === 'correct');
    runtime.refs.player.classList.toggle('is-shaking', state.feedback?.type === 'wrong');
  }
}

function renderApp() {
  root.innerHTML = `
    <div class="app-shell">
      <main class="game-container">
        <div class="sky-overlay"></div>
        ${state.phase === 'start' ? renderStartView() : ''}
        ${state.phase === 'playing' ? renderPlayingView() : ''}
        ${state.phase === 'gameover' ? renderGameOverView() : ''}
      </main>
    </div>
  `;

  cacheRefs();
  if (state.phase === 'start') syncStartUI();
  if (state.phase === 'playing') syncPlayingUI();
}

root.addEventListener('click', (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;

  if (actionTarget.dataset.action === 'choose-avatar') {
    state.playerData.avatar = actionTarget.dataset.avatar;
    saveProfile();
    syncStartUI();
  }

  if (actionTarget.dataset.action === 'start-game') startGame();
  if (actionTarget.dataset.action === 'play-again') startGame();
});

root.addEventListener('input', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;

  if (input.dataset.field === 'name') {
    state.playerData.name = input.value.slice(0, 20);
    saveProfile();
    syncStartUI();
  }

  if (input.dataset.field === 'age') {
    const digits = input.value.replace(/\D/g, '').slice(0, 3);
    state.playerData.age = digits;
    input.value = digits;
    saveProfile();
  }
});

root.addEventListener('pointerdown', handlePointerMove);
root.addEventListener('pointermove', handlePointerMove);
window.addEventListener('keydown', handleKeyboardMove);

renderApp();
