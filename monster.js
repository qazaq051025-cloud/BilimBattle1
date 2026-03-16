/* =============================================
   BilimBattle — monster.js
   Monster Raid boss battle mode
   ============================================= */

const MonsterState = {
  monster: null,
  maxHp: 500,
  currentHp: 500,
  teamDamageBase: 60,
  currentQ: 0,
  activeTeam: 0,
  answered: false,
  timerInterval: null,
  timeLeft: 0,
};

function startMonsterRaid() {
  const subj = GameState.quiz.subject || '';
  MonsterState.monster = detectMonster(subj);
  MonsterState.maxHp   = MonsterState.monster.hp;
  MonsterState.currentHp = MonsterState.monster.hp;
  MonsterState.currentQ  = 0;
  MonsterState.activeTeam = 0;
  MonsterState.answered = false;

  // render monster
  document.getElementById('boss-name').textContent = MonsterState.monster.name;
  updateHpBar();

  document.getElementById('monster-svg-wrap').innerHTML =
    getMonsterSVG(MonsterState.monster.svgId, MonsterState.monster.color);

  renderMonsterScores();
  showScreen('screen-game-monster');
  nextMonsterQuestion();
}

function renderMonsterScores() {
  const bar = document.getElementById('monster-scores');
  bar.innerHTML = GameState.teams.map((t, i) => `
    <div class="score-chip ${i === MonsterState.activeTeam ? 'active':''}" id="msc-${i}">
      <span>${t.name}</span>
      <span class="chip-pts">${t.score}</span>
      ${t.streak >= 3 ? `<span class="streak-badge">🔥${t.streak}</span>` : ''}
    </div>`).join('');
}

function updateHpBar() {
  const pct = Math.max(0, (MonsterState.currentHp / MonsterState.maxHp) * 100);
  document.getElementById('boss-hp-bar').style.width = pct + '%';
  document.getElementById('boss-hp-text').textContent =
    `${Math.max(0, MonsterState.currentHp)} / ${MonsterState.maxHp} HP`;

  // color shift
  if (pct < 25) {
    document.getElementById('boss-hp-bar').style.background = 'linear-gradient(90deg,#b71c1c,#e53935)';
  } else if (pct < 50) {
    document.getElementById('boss-hp-bar').style.background = 'linear-gradient(90deg,#ff6d00,#ffa726)';
  }
}

function nextMonsterQuestion() {
  const qs = GameState.shuffledQuestions;
  if (MonsterState.currentQ >= qs.length || MonsterState.currentHp <= 0) {
    endGame();
    return;
  }

  MonsterState.answered = false;
  const q = qs[MonsterState.currentQ];

  document.getElementById('monster-q-num').textContent =
    `${MonsterState.currentQ+1} / ${qs.length}`;
  document.getElementById('monster-question-text').textContent = q.text;

  renderMonsterAnswers(q);
  if (GameState.timerOn) startMonsterTimer();
}

function renderMonsterAnswers(q) {
  const grid  = document.getElementById('monster-answers');
  const letters = ['A','B','C','D'];
  grid.innerHTML = q.answers.map((a, i) => `
    <button class="monster-ans-btn ${letters[i]}"
      style="animation-delay:${i*0.06}s"
      onclick="monsterAnswer(${i})"
      id="mab-${i}">
      <span style="opacity:0.7;font-size:12px">${letters[i]})</span> ${escHtml(a)}
    </button>`).join('');
}

function monsterAnswer(ansIdx) {
  if (MonsterState.answered) return;
  MonsterState.answered = true;
  stopMonsterTimer();

  const q       = GameState.shuffledQuestions[MonsterState.currentQ];
  const correct = ansIdx === q.correct;
  const team    = GameState.teams[MonsterState.activeTeam];

  // highlight
  document.querySelectorAll('.monster-ans-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    else if (i === ansIdx && !correct) btn.classList.add('wrong');
  });

  if (correct) {
    team.streak++;
    const isCrit = team.streak >= 3;
    const dmg    = calcMonsterDamage(isCrit);
    team.score  += isCrit ? 150 : 100;
    MonsterState.currentHp -= dmg;
    updateHpBar();

    // animate monster hit
    const sprite = document.getElementById('monster-svg-wrap');
    sprite.classList.add('hit-effect');
    setTimeout(() => sprite.classList.remove('hit-effect'), 500);
    showDamageNumber(dmg, isCrit);

    const mem = randPick(MEMES_CORRECT);
    showMonsterResult(mem, true, isCrit ? `CRITICAL HIT! -${dmg} HP ⚡` : `-${dmg} HP`);
  } else {
    team.streak = 0;
    // monster attacks back
    const penalty = 20;
    team.score   = Math.max(0, team.score - penalty);
    const mem = randPick(MEMES_WRONG);
    showMonsterResult(mem, false, `Монстр шабуыл жасады! -${penalty} ұпай`);
  }

  renderMonsterScores();

  if (MonsterState.currentHp <= 0) {
    setTimeout(monsterDefeated, 1800);
    return;
  }

  setTimeout(() => {
    hideMonsterResult();
    MonsterState.currentQ++;
    MonsterState.activeTeam = (MonsterState.activeTeam + 1) % GameState.teams.length;
    renderMonsterScores();
    nextMonsterQuestion();
  }, 2500);
}

function calcMonsterDamage(isCrit) {
  const base = MonsterState.teamDamageBase;
  const timeBonus = GameState.timerOn ? Math.floor(MonsterState.timeLeft * 2) : 0;
  const crit = isCrit ? 2 : 1;
  return Math.floor((base + timeBonus) * crit);
}

function showDamageNumber(dmg, isCrit) {
  const arena = document.querySelector('.monster-arena');
  const el = document.createElement('div');
  el.className = `damage-number ${isCrit ? 'crit' : ''}`;
  el.textContent = `-${dmg}`;
  el.style.left = `${20 + Math.random()*15}%`;
  el.style.top  = `${30 + Math.random()*20}%`;
  arena.appendChild(el);
  setTimeout(() => el.remove(), 1300);

  if (isCrit) {
    const critEl = document.createElement('div');
    critEl.style.cssText = `
      position:absolute;left:50%;top:20%;transform:translate(-50%,-50%);
      font-family:var(--font-display);font-size:32px;font-weight:900;
      color:var(--accent2);text-shadow:0 0 20px rgba(255,215,0,0.8);
      z-index:60;pointer-events:none;animation:criticalHit 0.6s ease;
    `;
    critEl.textContent = '⚡ CRITICAL!';
    arena.appendChild(critEl);
    setTimeout(() => critEl.remove(), 700);
  }
}

function showMonsterResult(mem, ok, sub) {
  const popup = document.getElementById('monster-result-popup');
  popup.className = 'result-popup';
  popup.innerHTML = `<div class="result-popup-inner ${ok ? 'correct':'wrong'}">
    <span class="result-emoji">${mem.emoji}</span>
    <h2>${mem.title}</h2>
    <p>${mem.text}</p>
    <p style="font-size:13px;color:var(--text2);margin-top:8px">${sub}</p>
  </div>`;
}

function hideMonsterResult() {
  document.getElementById('monster-result-popup').className = 'result-popup hidden';
}

function monsterDefeated() {
  const sprite = document.getElementById('monster-svg-wrap');
  sprite.style.animation = 'monsterDeath 0.8s ease forwards';
  setTimeout(() => {
    // give bonus to all teams
    GameState.teams.forEach(t => { t.score += 200; });
    showToast('🏆 МОНСТР ЖЕҢІЛДІ! Барлық топқа +200 ұпай!', 'success');
    setTimeout(endGame, 1500);
  }, 1000);
}

/* ---- Monster timer ---- */
function startMonsterTimer() {
  const secs = GameState.timerSecs;
  MonsterState.timeLeft = secs;
  updateMonsterTimerBar(secs, secs);
  clearInterval(MonsterState.timerInterval);
  MonsterState.timerInterval = setInterval(() => {
    MonsterState.timeLeft--;
    updateMonsterTimerBar(MonsterState.timeLeft, secs);
    if (MonsterState.timeLeft <= 0) {
      clearInterval(MonsterState.timerInterval);
      onMonsterTimerEnd();
    }
  }, 1000);
}

function stopMonsterTimer() {
  clearInterval(MonsterState.timerInterval);
}

function updateMonsterTimerBar(left, total) {
  const pct = (left / total) * 100;
  const bar = document.getElementById('monster-timer-bar');
  if (!bar) return;
  bar.style.width = pct + '%';
  bar.className = 'timer-bar' +
    (pct < 25 ? ' danger' : pct < 50 ? ' warning' : '');
}

function onMonsterTimerEnd() {
  if (MonsterState.answered) return;
  MonsterState.answered = true;
  GameState.teams[MonsterState.activeTeam].streak = 0;
  const mem = randPick(MEMES_TIMEOUT);
  showMonsterResult(mem, false, 'Уақыт бітті! Монстр шабуыл жасады!');
  setTimeout(() => {
    hideMonsterResult();
    MonsterState.currentQ++;
    MonsterState.activeTeam = (MonsterState.activeTeam + 1) % GameState.teams.length;
    renderMonsterScores();
    nextMonsterQuestion();
  }, 2500);
}
