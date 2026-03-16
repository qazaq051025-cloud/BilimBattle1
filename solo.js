/* =============================================
   BilimBattle — solo.js
   Жеке режим: оқушы кодпен кіреді, тест тапсырады
   Мұғалімде live рейтинг тақтасы шығады
   ============================================= */

const SoloState = {
  quiz: null,
  roomCode: null,
  teacherLogin: null,
  results: [],           // [{name, score, correct, total, time}]
  active: false,
};

/* ---- localStorage ключтары ---- */
function soloRoomKey(code) { return `bb_solo_${code}`; }

/* =============================================================
   МҰҒАЛІМ ЖАҒЫ — ойынды бастау
   ============================================================= */
function startSoloMode(quizId) {
  const quiz = DB.getQuizById(quizId);
  if (!quiz) { showToast('⚠️ Тест табылмады', 'error'); return; }
  if (quiz.questions.length < 2) { showToast('⚠️ Тест бос', 'error'); return; }

  SoloState.quiz         = quiz;
  SoloState.roomCode     = genRoomCode();
  SoloState.teacherLogin = currentUser.login;
  SoloState.results      = [];
  SoloState.active       = true;

  // Сақтау — оқушылар осы кодпен тестті табады
  const roomData = {
    code: SoloState.roomCode,
    quizId: quiz.id,
    quizTitle: quiz.title,
    questions: quiz.questions,
    timerSecs: GameState.timerSecs,
    timerOn: GameState.timerOn,
    active: true,
    results: [],
    createdAt: Date.now(),
  };
  localStorage.setItem(soloRoomKey(SoloState.roomCode), JSON.stringify(roomData));

  renderSoloLobby();
  showScreen('screen-solo-lobby');
  SFX.gameStart();

  // Live refresh every 3 sec
  SoloState._pollInterval = setInterval(refreshSoloLeaderboard, 3000);
}

function renderSoloLobby() {
  document.getElementById('solo-room-code').textContent = SoloState.roomCode;
  document.getElementById('solo-quiz-title').textContent = SoloState.quiz.title;
  document.getElementById('solo-q-count').textContent = `${SoloState.quiz.questions.length} сұрақ`;
  refreshSoloLeaderboard();
}

function refreshSoloLeaderboard() {
  const raw = localStorage.getItem(soloRoomKey(SoloState.roomCode));
  if (!raw) return;
  const data = JSON.parse(raw);

  const list = document.getElementById('solo-leaderboard');
  const results = data.results || [];
  document.getElementById('solo-participant-count').textContent = `👥 ${results.length} оқушы`;

  if (results.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text2);padding:32px">Оқушылар қосылуда...</p>';
    return;
  }

  const sorted = [...results].sort((a,b) => b.score - a.score);
  const medals = ['🥇','🥈','🥉'];

  list.innerHTML = `<div class="solo-lb-header">
    <span>#</span><span>Аты</span><span>Ұпай</span><span>Дұрыс</span><span>Уақыт</span>
  </div>` + sorted.map((r, i) => `
    <div class="solo-lb-row ${i === 0 ? 'first' : ''}">
      <span>${medals[i] || (i+1)}</span>
      <span class="lb-name">${escHtml(r.name)}</span>
      <span class="lb-score">${r.score}</span>
      <span class="lb-correct">${r.correct}/${r.total}</span>
      <span class="lb-time">${r.timeSec}с</span>
    </div>`).join('');
}

function endSoloRoom() {
  clearInterval(SoloState._pollInterval);
  // mark room as inactive
  const raw = localStorage.getItem(soloRoomKey(SoloState.roomCode));
  if (raw) {
    const data = JSON.parse(raw);
    data.active = false;
    localStorage.setItem(soloRoomKey(SoloState.roomCode), JSON.stringify(data));
  }
  SoloState.active = false;

  // show final results screen
  const raw2 = localStorage.getItem(soloRoomKey(SoloState.roomCode));
  const results = raw2 ? (JSON.parse(raw2).results || []) : [];

  // reuse main results screen but adapted
  const sorted = [...results].sort((a,b) => b.score - a.score);
  const medals = ['🥇','🥈','🥉',''];

  const podium = document.getElementById('podium');
  const top3   = sorted.slice(0,3);
  const podiumOrder = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3;

  podium.innerHTML = podiumOrder.map((r, pi) => {
    const rank = sorted.indexOf(r);
    return `<div class="podium-place">
      <div class="podium-medal">${medals[rank] || ''}</div>
      <div class="podium-name">${escHtml(r.name)}</div>
      <div class="podium-pts">${r.score} ұпай</div>
      <div class="podium-bar" style="
        height:${[120,160,90][pi]||70}px;
        background:${['linear-gradient(180deg,#c0c0c0,#808080)','linear-gradient(180deg,var(--accent2),#ff8c00)','linear-gradient(180deg,#cd7f32,#8b4513)'][pi]}
      ">${r.score}</div>
    </div>`;
  }).join('');

  document.getElementById('all-scores').innerHTML =
    `<h3 style="margin-bottom:16px;font-family:var(--font-display)">📊 Барлық нәтижелер</h3>` +
    sorted.map((r,i) => `
      <div class="score-row">
        <span>${medals[i]||(i+1)+'.'} ${escHtml(r.name)}</span>
        <span>${r.correct}/${r.total} дұрыс</span>
        <span style="font-family:var(--font-display);color:var(--accent2)">${r.score} ұпай</span>
      </div>`).join('');

  showScreen('screen-results');
  SFX.victory();
  launchConfetti();
}

/* =============================================================
   ОҚУШЫ ЖАҒЫ
   ============================================================= */
let StudentQuiz = {
  name: '',
  questions: [],
  currentQ: 0,
  score: 0,
  correct: 0,
  startTime: 0,
  timerOn: false,
  timerSecs: 20,
  timeLeft: 0,
  timerInterval: null,
  roomCode: '',
  answered: false,
};

function studentJoinByCode() {
  const code = document.getElementById('join-code').value.trim();
  const name = document.getElementById('join-name').value.trim();

  if (code.length !== 6) { showToast('⚠️ 6 цифрлы код енгізіңіз', 'error'); return; }
  if (!name) { showToast('⚠️ Атыңызды жазыңыз', 'error'); return; }

  const raw = localStorage.getItem(soloRoomKey(code));
  if (!raw) { showToast('❌ Код табылмады. Мұғалімнен сұраңыз.', 'error'); return; }

  const data = JSON.parse(raw);
  if (!data.active) { showToast('❌ Ойын аяқталды немесе әлі басталмаған', 'error'); return; }

  StudentQuiz.name      = name;
  StudentQuiz.questions = [...data.questions].sort(() => Math.random() - 0.5);
  StudentQuiz.currentQ  = 0;
  StudentQuiz.score     = 0;
  StudentQuiz.correct   = 0;
  StudentQuiz.startTime = Date.now();
  StudentQuiz.timerOn   = data.timerOn;
  StudentQuiz.timerSecs = data.timerSecs || 20;
  StudentQuiz.roomCode  = code;
  StudentQuiz.answered  = false;

  document.getElementById('student-quiz-title').textContent = data.quizTitle;

  SFX.gameStart();
  showScreen('screen-student-quiz');
  renderStudentQuestion();
}

function renderStudentQuestion() {
  const qs = StudentQuiz.questions;
  if (StudentQuiz.currentQ >= qs.length) {
    finishStudentQuiz();
    return;
  }

  StudentQuiz.answered = false;
  const q = qs[StudentQuiz.currentQ];
  const total = qs.length;

  document.getElementById('sq-progress').style.width =
    `${(StudentQuiz.currentQ / total) * 100}%`;
  document.getElementById('sq-q-num').textContent =
    `${StudentQuiz.currentQ + 1} / ${total}`;
  document.getElementById('sq-question-text').textContent = q.text;

  const grid = document.getElementById('sq-answers');
  const letters = ['A','B','C','D'];
  grid.innerHTML = q.answers.map((a, i) => `
    <button class="sq-ans-btn ${letters[i]}"
      style="animation-delay:${i*0.05}s"
      onclick="studentAnswer(${i})"
      id="sqb-${i}">
      <span class="sq-letter">${letters[i]}</span>
      <span class="sq-ans-text">${escHtml(a)}</span>
    </button>`).join('');

  if (StudentQuiz.timerOn) startStudentTimer();
}

function studentAnswer(idx) {
  if (StudentQuiz.answered) return;
  StudentQuiz.answered = true;
  clearInterval(StudentQuiz.timerInterval);

  const q       = StudentQuiz.questions[StudentQuiz.currentQ];
  const correct = idx === q.correct;

  // highlight
  document.querySelectorAll('.sq-ans-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    else if (i === idx && !correct) btn.classList.add('wrong');
  });

  if (correct) {
    StudentQuiz.correct++;
    const pts = 100 + (StudentQuiz.timerOn ? StudentQuiz.timeLeft * 3 : 0);
    StudentQuiz.score += pts;
    SFX.correct();
    showStudentFeedback(true, `+${pts} ұпай! ✅`);
  } else {
    SFX.wrong();
    showStudentFeedback(false, `Дұрыс жауап: ${String.fromCharCode(65+q.correct)}) ${q.answers[q.correct]}`);
  }

  setTimeout(() => {
    hideStudentFeedback();
    StudentQuiz.currentQ++;
    renderStudentQuestion();
  }, 1600);
}

function showStudentFeedback(ok, text) {
  const fb = document.getElementById('sq-feedback');
  fb.textContent = text;
  fb.className = `sq-feedback ${ok ? 'ok' : 'fail'}`;
}
function hideStudentFeedback() {
  document.getElementById('sq-feedback').className = 'sq-feedback hidden';
}

function startStudentTimer() {
  StudentQuiz.timeLeft = StudentQuiz.timerSecs;
  updateStudentTimerBar(StudentQuiz.timerSecs, StudentQuiz.timerSecs);
  clearInterval(StudentQuiz.timerInterval);
  let lastTick = 6; // tick sound threshold
  StudentQuiz.timerInterval = setInterval(() => {
    StudentQuiz.timeLeft--;
    updateStudentTimerBar(StudentQuiz.timeLeft, StudentQuiz.timerSecs);
    if (StudentQuiz.timeLeft <= 5 && StudentQuiz.timeLeft !== lastTick) {
      SFX.timerTick();
      lastTick = StudentQuiz.timeLeft;
    }
    if (StudentQuiz.timeLeft <= 0) {
      clearInterval(StudentQuiz.timerInterval);
      onStudentTimerEnd();
    }
  }, 1000);
}

function updateStudentTimerBar(left, total) {
  const pct = (left / total) * 100;
  const bar = document.getElementById('sq-timer-bar');
  if (!bar) return;
  bar.style.width = pct + '%';
  bar.className = 'sq-timer-bar' + (pct < 25 ? ' danger' : pct < 50 ? ' warning' : '');
  const num = document.getElementById('sq-timer-num');
  if (num) { num.textContent = left; num.className = left <= 5 ? 'sq-timer-num danger' : 'sq-timer-num'; }
}

function onStudentTimerEnd() {
  if (StudentQuiz.answered) return;
  StudentQuiz.answered = true;
  SFX.timerEnd();
  // mark all disabled
  document.querySelectorAll('.sq-ans-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === StudentQuiz.questions[StudentQuiz.currentQ].correct) btn.classList.add('correct');
  });
  showStudentFeedback(false, '⌛ Уақыт бітті!');
  setTimeout(() => {
    hideStudentFeedback();
    StudentQuiz.currentQ++;
    renderStudentQuestion();
  }, 1600);
}

function finishStudentQuiz() {
  clearInterval(StudentQuiz.timerInterval);
  const timeSec = Math.floor((Date.now() - StudentQuiz.startTime) / 1000);

  // Save result to shared room
  const raw = localStorage.getItem(soloRoomKey(StudentQuiz.roomCode));
  if (raw) {
    const data = JSON.parse(raw);
    // remove old entry from this name if exists
    data.results = (data.results || []).filter(r => r.name !== StudentQuiz.name);
    data.results.push({
      name: StudentQuiz.name,
      score: StudentQuiz.score,
      correct: StudentQuiz.correct,
      total: StudentQuiz.questions.length,
      timeSec,
    });
    localStorage.setItem(soloRoomKey(StudentQuiz.roomCode), JSON.stringify(data));
  }

  SFX.soloComplete();
  renderStudentResults();
  showScreen('screen-student-result');
}

function renderStudentResults() {
  const pct = Math.round((StudentQuiz.correct / StudentQuiz.questions.length) * 100);
  const grade = pct >= 90 ? '5' : pct >= 70 ? '4' : pct >= 50 ? '3' : '2';
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '⭐' : pct >= 50 ? '👍' : '😔';

  document.getElementById('sr-name').textContent = StudentQuiz.name;
  document.getElementById('sr-score').textContent = StudentQuiz.score;
  document.getElementById('sr-correct').textContent = `${StudentQuiz.correct} / ${StudentQuiz.questions.length}`;
  document.getElementById('sr-pct').textContent = `${pct}%`;
  document.getElementById('sr-grade').textContent = grade;
  document.getElementById('sr-emoji').textContent = emoji;

  if (pct >= 70) { SFX.victory(); showParticlesStudent(); }
}

function showParticlesStudent() {
  for (let i = 0; i < 12; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;pointer-events:none;z-index:999;
      left:${30+Math.random()*40}%;top:${30+Math.random()*30}%;
      font-size:${20+Math.random()*20}px;
      --tx:${(Math.random()-0.5)*200}px;
      --ty:${-60-Math.random()*150}px;
      animation:particle 0.9s ease forwards;
    `;
    el.textContent = ['⭐','✨','💥','🎉','🔥','🏆'][Math.floor(Math.random()*6)];
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
}
