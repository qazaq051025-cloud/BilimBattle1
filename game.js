/* =============================================
   BilimBattle — game.js  (v2 — updated)
   ============================================= */

const GameState = {
  mode: null,
  quiz: null,
  teams: [],
  timerOn: true,
  timerSecs: 20,
  roomCode: null,
  currentQ: 0,
  activeTeam: 0,
  timerInterval: null,
  timeLeft: 0,
  shuffledQuestions: [],
};

/* ---- Mode labels ---- */
const MODE_LABELS = {
  bamboozle: '🃏 BilimBattle (Топтық)',
  monster:   '👾 Monster Raid (Топтық)',
  kahoot:    '⚡ Жеке Жарыс (Solo)',
  map:       '🗺️ Территория',
  roulette:  '🎰 Рулетка',
};

/* =============================================================
   SETUP SCREEN
   ============================================================= */
function pickMode(mode, quizId = null) {
  GameState.mode = mode;
  document.getElementById('setup-mode-title').textContent = MODE_LABELS[mode] || '⚙️ Баптау';

  const isTeam = (mode === 'bamboozle' || mode === 'monster');
  const isSolo = (mode === 'kahoot');

  // Quiz list
  const list = document.getElementById('setup-quiz-list');
  const quizzes = DB.getQuizzesBy(currentUser.login);
  if (quizzes.length === 0) {
    list.innerHTML = '<p style="color:var(--text2);font-size:14px">Тест жоқ. Алдымен жасаңыз.</p>';
  } else {
    list.innerHTML = quizzes.map(q => `
      <div class="setup-quiz-item ${quizId===q.id?'selected':''}" id="sq-${q.id}"
        onclick="selectSetupQuiz('${q.id}')">
        <span>${escHtml(q.title)}</span>
        <span style="font-size:12px;color:var(--text2)">${q.questions.length} сұрақ</span>
      </div>`).join('');
  }
  if (quizId) selectSetupQuiz(quizId);

  // Team setup visibility
  document.getElementById('team-setup').style.display = isTeam ? '' : 'none';
  // QR/code panel — only for solo
  document.getElementById('setup-qr-side').style.display = isSolo ? '' : 'none';
  document.getElementById('setup-solo-info').style.display = isTeam ? '' : 'none';

  if (isTeam) setTeamCount(GameState.teams.length || 2);

  // Timer
  document.getElementById('timer-on').checked = GameState.timerOn;
  document.getElementById('timer-options').style.display = GameState.timerOn ? '' : 'none';
  document.getElementById('timer-on').onchange = function() {
    GameState.timerOn = this.checked;
    document.getElementById('timer-options').style.display = this.checked ? '' : 'none';
  };

  // Solo: generate room code
  if (isSolo) {
    GameState.roomCode = genRoomCode();
    document.getElementById('room-code-display').textContent = GameState.roomCode;
  }

  SFX.click();
  showScreen('screen-setup');
}

function selectSetupQuiz(id) {
  document.querySelectorAll('.setup-quiz-item').forEach(el => el.classList.remove('selected'));
  document.getElementById('sq-' + id)?.classList.add('selected');
  GameState.quiz = DB.getQuizById(id);
}

function setTeamCount(n) {
  GameState.teams = Array.from({length: n}, (_, i) => ({
    name: TEAM_DEFAULT_NAMES[i],
    color: TEAM_COLORS[i],
    score: 0,
    streak: 0,
  }));
  document.querySelectorAll('.count-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === n);
  });
  renderTeamNames();
}

function renderTeamNames() {
  const wrap = document.getElementById('team-names');
  wrap.innerHTML = GameState.teams.map((t, i) => `
    <div class="team-name-row">
      <div class="team-color-dot" style="background:${t.color}"></div>
      <input type="text" class="input-field" value="${escHtml(t.name)}"
        oninput="GameState.teams[${i}].name=this.value"
        style="padding:10px 14px" />
    </div>`).join('');
}

function setTimer(secs) {
  GameState.timerSecs = secs;
  document.querySelectorAll('.time-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === secs);
  });
}

/* =============================================================
   START GAME
   ============================================================= */
function startGame() {
  if (!GameState.quiz) { showToast('⚠️ Тест таңдаңыз', 'error'); return; }
  if (GameState.quiz.questions.length < 2) { showToast('⚠️ Тест бос', 'error'); return; }

  GameState.teams.forEach(t => { t.score = 0; t.streak = 0; });
  GameState.currentQ  = 0;
  GameState.activeTeam = 0;
  GameState.shuffledQuestions = [...GameState.quiz.questions].sort(() => Math.random() - 0.5);

  SFX.gameStart();

  if (GameState.mode === 'monster') startMonsterRaid();
  else if (GameState.mode === 'kahoot') startSoloMode(GameState.quiz.id);
  else startBamboozle();
}

/* =============================================================
   BAMBOOZLE MODE
   ============================================================= */
function startBamboozle() {
  showScreen('screen-game-bamboozle');
  renderBBScores();
  nextBBQuestion();
}

function renderBBScores() {
  const bar = document.getElementById('bb-scores');
  bar.innerHTML = GameState.teams.map((t, i) => `
    <div class="score-chip ${i===GameState.activeTeam?'active':''}" id="sc-${i}">
      <span>${t.name}</span>
      <span class="chip-pts">${t.score}</span>
      ${t.streak>=3?`<span class="streak-badge">🔥${t.streak}</span>`:''}
    </div>`).join('');
}

function nextBBQuestion() {
  const questions = GameState.shuffledQuestions;
  if (GameState.currentQ >= questions.length) { endGame(); return; }

  const q = questions[GameState.currentQ];
  document.getElementById('bb-q-num').textContent = `Сұрақ ${GameState.currentQ+1}/${questions.length}`;
  document.getElementById('bb-topic').textContent = GameState.quiz.title || '';
  document.getElementById('bb-question-text').textContent = q.text;

  SFX.reveal();
  renderBBCards(q);
  if (GameState.timerOn) startBBTimer();
}

/* ---- BONUS CARD TYPES ---- */
const BONUS_TYPES = [
  {
    id: 'mystery',
    label: '🎴 ЖАСЫРЫН',
    desc: 'Не шығатыны белгісіз!',
    bg: 'linear-gradient(135deg,#4a148c,#880e4f)',
    border: '#e040fb',
    reveal: (team) => {
      const outcomes = [
        { label: '+50 ұпай',     fn: t => t.score += 50,  emoji: '⭐' },
        { label: '+100 ұпай',    fn: t => t.score += 100, emoji: '💰' },
        { label: '+30 ұпай',     fn: t => t.score += 30,  emoji: '🎁' },
        { label: 'x2 ұпай!',    fn: t => t.score *= 2,   emoji: '🔥' },
        { label: 'Ештеңе жоқ 😅', fn: () => {}, emoji: '🫙' },
        { label: '-20 ұпай 😱',  fn: t => t.score = Math.max(0,t.score-20), emoji: '💀' },
      ];
      const pick = outcomes[Math.floor(Math.random()*outcomes.length)];
      pick.fn(team);
      return pick;
    },
  },
  {
    id: 'streak',
    label: '🔥 STREAK',
    desc: 'Streak +1 бонус!',
    bg: 'linear-gradient(135deg,#b71c1c,#e65100)',
    border: '#ff6d00',
    reveal: (team) => {
      team.streak++;
      return { label: `Streak → ${team.streak}! 🔥`, emoji: '🔥' };
    },
  },
  {
    id: 'double',
    label: '✌️ ЕКІЛІК',
    desc: 'Келесі дұрыс жауап x2!',
    bg: 'linear-gradient(135deg,#1565c0,#0d47a1)',
    border: '#42a5f5',
    reveal: (team) => {
      team._doubleNext = true;
      return { label: 'Келесі жауап x2 болады!', emoji: '✌️' };
    },
  },
];

function renderBBCards() {
  const area     = document.getElementById('bb-cards-area');
  const curQ     = GameState.shuffledQuestions[GameState.currentQ];
  const letters  = ['A','B','C','D'];

  // Build card list with possible bonus slot
  const cards    = [];
  const hasBonus = Math.random() < 0.4;
  const bonusAt  = Math.floor(Math.random() * 5);
  const bonusType= BONUS_TYPES[Math.floor(Math.random()*BONUS_TYPES.length)];

  for (let i = 0; i < 4; i++) {
    if (hasBonus && i === bonusAt) cards.push({ type:'bonus', bt: bonusType });
    cards.push({ type:'answer', idx: i });
  }
  if (hasBonus && bonusAt >= 4) cards.push({ type:'bonus', bt: bonusType });

  area.innerHTML = cards.map((card, ci) => {
    if (card.type === 'bonus') {
      return `<div class="bb-card bonus-mystery"
        style="background:${card.bt.bg};border-color:${card.bt.border};animation-delay:${ci*0.06}s"
        onclick="pickBonusCard('${card.bt.id}')">
        <div class="bb-card-front">
          <span style="font-size:36px">?</span>
          <div class="card-label">БОНУС</div>
        </div>
      </div>`;
    }
    return `<div class="bb-card c${card.idx}" style="animation-delay:${ci*0.06}s"
      onclick="pickAnswerCard(${card.idx})">
      <div class="bb-letter">${letters[card.idx]}</div>
      <div class="card-label">${escHtml((curQ.answers[card.idx]||'').substring(0,22))}</div>
    </div>`;
  }).join('');
}

function pickAnswerCard(ansIdx) {
  stopTimer();
  SFX.cardFlip();

  const q       = GameState.shuffledQuestions[GameState.currentQ];
  const correct = ansIdx === q.correct;
  const team    = GameState.teams[GameState.activeTeam];

  // Disable all cards visually
  document.querySelectorAll('.bb-card').forEach(c => c.style.pointerEvents='none');

  if (correct) {
    let pts = calcPoints();
    if (team._doubleNext) { pts *= 2; team._doubleNext = false; }
    team.score += pts;
    team.streak++;
    if (team.streak >= 3) SFX.streak();
    else SFX.correct();
    const mem = randPick(MEMES_CORRECT);
    showMem(mem, true, `+${pts} ұпай`);
    showParticles();
  } else {
    team.streak = 0;
    team._doubleNext = false;
    SFX.wrong();
    const mem = randPick(MEMES_WRONG);
    showMem(mem, false, `Дұрыс жауап: ${String.fromCharCode(65+q.correct)}) ${q.answers[q.correct]}`);
  }
}

function pickBonusCard(bonusId) {
  stopTimer();
  SFX.bonus();

  const bt   = BONUS_TYPES.find(b => b.id === bonusId);
  const team = GameState.teams[GameState.activeTeam];

  // Reveal animation then show outcome
  const bonusEl = document.querySelector('.bonus-mystery');
  if (bonusEl) {
    bonusEl.innerHTML = `<div class="bb-card-front">
      <span style="font-size:36px">${bt.label.split(' ')[0]}</span>
      <div class="card-label">${bt.desc}</div>
    </div>`;
    bonusEl.style.animation = 'bounceIn 0.4s ease';
  }

  setTimeout(() => {
    const result = bt.reveal(team);
    showBonusRevealPopup(result, team.name);
    SFX.bonus();
    showParticles();
  }, 500);
}

function showBonusRevealPopup(result, teamName) {
  const popup = document.getElementById('bb-result-popup');
  popup.className = 'result-popup';
  popup.innerHTML = `<div class="result-popup-inner correct">
    <span class="result-emoji">${result.emoji}</span>
    <h2>БОНУС АШЫЛДЫ!</h2>
    <p style="font-size:20px;font-weight:800;color:var(--accent2)">${result.label}</p>
    <p style="color:var(--text2)">${teamName}</p>
    <button class="btn-primary" onclick="advanceBBTurn()">Жалғастыру →</button>
  </div>`;
}

function showMem(mem, isCorrect, subtext) {
  const popup = document.getElementById('bb-result-popup');
  popup.className = 'result-popup';
  popup.innerHTML = `<div class="result-popup-inner ${isCorrect?'correct':'wrong'}">
    <span class="result-emoji">${mem.emoji}</span>
    <h2>${mem.title}</h2>
    <p>${mem.text}</p>
    <p style="font-size:13px;color:var(--text2);margin-top:8px">${subtext}</p>
    <button class="btn-primary" onclick="advanceBBTurn()">Жалғастыру →</button>
  </div>`;
}

function advanceBBTurn() {
  document.getElementById('bb-result-popup').className = 'result-popup hidden';
  GameState.currentQ++;
  GameState.activeTeam = (GameState.activeTeam + 1) % GameState.teams.length;
  renderBBScores();
  nextBBQuestion();
}

/* ---- BB Timer ---- */
function startBBTimer() {
  GameState.timeLeft = GameState.timerSecs;
  updateTimerDisplay(GameState.timerSecs);
  clearInterval(GameState.timerInterval);
  let lastTick = 6;
  GameState.timerInterval = setInterval(() => {
    GameState.timeLeft--;
    updateTimerDisplay(GameState.timeLeft);
    if (GameState.timeLeft <= 5 && GameState.timeLeft !== lastTick) {
      SFX.timerTick();
      lastTick = GameState.timeLeft;
    }
    if (GameState.timeLeft <= 0) {
      clearInterval(GameState.timerInterval);
      onTimerEnd();
    }
  }, 1000);
}

function stopTimer() { clearInterval(GameState.timerInterval); }

function updateTimerDisplay(secs) {
  const el   = document.getElementById('bb-timer');
  const wrap = document.getElementById('bb-timer-wrap');
  if (el)   el.textContent = secs;
  if (wrap) wrap.classList.toggle('danger', secs <= 5);
}

function onTimerEnd() {
  SFX.timerEnd();
  GameState.teams[GameState.activeTeam].streak = 0;
  showMem(randPick(MEMES_TIMEOUT), false, 'Уақыт бітті!');
}

function calcPoints() {
  const base        = 100;
  const timeBonus   = GameState.timerOn ? Math.floor(GameState.timeLeft * 3) : 0;
  const streakBonus = GameState.teams[GameState.activeTeam].streak >= 3 ? 50 : 0;
  return base + timeBonus + streakBonus;
}

/* =============================================================
   END GAME
   ============================================================= */
function endGame() {
  stopTimer();
  SFX.victory();
  showResults();
}

function showResults() {
  const sorted  = [...GameState.teams].sort((a,b) => b.score - a.score);
  const medals  = ['🥇','🥈','🥉',''];
  const podium  = document.getElementById('podium');
  const top3    = sorted.slice(0,3);
  const podiumOrder = top3.length >= 2 ? [top3[1],top3[0],top3[2]].filter(Boolean) : top3;

  podium.innerHTML = podiumOrder.map((t, pi) => {
    const rank = sorted.indexOf(t);
    return `<div class="podium-place" style="animation:podiumRise 0.6s ${pi*0.15}s ease both">
      <div class="podium-medal">${medals[rank]||''}</div>
      <div class="podium-name">${escHtml(t.name)}</div>
      <div class="podium-pts">${t.score} ұпай</div>
      <div class="podium-bar" style="
        height:${[120,160,90][pi]||70}px;
        background:${['linear-gradient(180deg,#c0c0c0,#808080)','linear-gradient(180deg,var(--accent2),#ff8c00)','linear-gradient(180deg,#cd7f32,#8b4513)'][pi]}
      ">${t.score}</div>
    </div>`;
  }).join('');

  document.getElementById('all-scores').innerHTML =
    `<h3 style="margin-bottom:16px;font-family:var(--font-display)">📊 Нәтижелер</h3>` +
    sorted.map((t,i) => `
      <div class="score-row">
        <span>${medals[i]||(i+1)+'.'} ${escHtml(t.name)}</span>
        <span style="font-family:var(--font-display);color:var(--accent2)">${t.score} ұпай</span>
      </div>`).join('');

  showScreen('screen-results');
  launchConfetti();
}

function restartGame() {
  if (GameState.mode && GameState.quiz) pickMode(GameState.mode, GameState.quiz.id);
  else showScreen('screen-dashboard');
}

/* ---- Confetti ---- */
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces  = Array.from({length:130}, () => ({
    x:  Math.random()*canvas.width,
    y:  Math.random()*-200,
    r:  Math.random()*8+4,
    color: ['#ffd700','#ff4d8b','#5b6ef5','#00e676','#ff6d00'][Math.floor(Math.random()*5)],
    vx: (Math.random()-0.5)*3,
    vy: Math.random()*3+2,
    rot:  Math.random()*360,
    vrot: (Math.random()-0.5)*6,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.5);
      ctx.restore();
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vrot;
      if (p.y>canvas.height) { p.y=-20; p.x=Math.random()*canvas.width; }
    });
    frame++;
    if (frame<300) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

/* ---- Particles ---- */
function showParticles() {
  for (let i=0;i<12;i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;pointer-events:none;z-index:999;
      left:${40+Math.random()*20}%;top:${40+Math.random()*20}%;
      font-size:${20+Math.random()*20}px;
      --tx:${(Math.random()-0.5)*200}px;
      --ty:${-50-Math.random()*150}px;
      animation:particle 0.8s ease forwards;
    `;
    el.textContent = ['⭐','✨','💥','🎉','🔥'][Math.floor(Math.random()*5)];
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),900);
  }
}
