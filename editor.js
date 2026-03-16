/* =============================================
   BilimBattle — editor.js
   Quiz creation, editing, saving, importing
   ============================================= */

let editingQuizId = null;
let currentQuestions = [];

/* ---- Open editor (new or existing) ---- */
function openEditor(quizId = null) {
  editingQuizId = quizId;
  currentQuestions = [];

  if (quizId) {
    const quiz = DB.getQuizById(quizId);
    if (!quiz) return;
    document.getElementById('quiz-title').value   = quiz.title   || '';
    document.getElementById('quiz-subject').value = quiz.subject || '';
    document.getElementById('quiz-grade').value   = quiz.grade   || '';
    document.getElementById('quiz-lang').value    = quiz.lang    || 'kk';
    currentQuestions = JSON.parse(JSON.stringify(quiz.questions || []));
  } else {
    document.getElementById('quiz-title').value   = '';
    document.getElementById('quiz-subject').value = currentUser?.subject || '';
    document.getElementById('quiz-grade').value   = '';
    document.getElementById('quiz-lang').value    = 'kk';
  }

  renderQuestions();
  showScreen('screen-editor');
}

/* ---- Add blank question ---- */
function addQuestion(data = null) {
  const q = data || {
    id: genId(),
    text: '',
    answers: ['', '', '', ''],
    correct: 0,
  };
  currentQuestions.push(q);
  renderQuestions();
  // scroll to last
  setTimeout(() => {
    const list = document.getElementById('questions-list');
    list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* ---- Remove question ---- */
function removeQuestion(id) {
  currentQuestions = currentQuestions.filter(q => q.id !== id);
  renderQuestions();
}

/* ---- Render all questions ---- */
function renderQuestions() {
  const list = document.getElementById('questions-list');
  document.getElementById('q-count-badge').textContent = currentQuestions.length;

  if (currentQuestions.length === 0) {
    list.innerHTML = '<p style="color:var(--text2);text-align:center;padding:40px">Сұрақтар жоқ. «+ Сұрақ қосу» батырмасын басыңыз немесе AI генераторды пайдаланыңыз.</p>';
    return;
  }

  list.innerHTML = currentQuestions.map((q, idx) => `
    <div class="question-item" id="qi-${q.id}">
      <div class="q-header">
        <span class="q-num">${idx + 1}.</span>
        <input type="text" class="q-text-input" placeholder="Сұрақ мәтінін жазыңыз..."
          value="${escHtml(q.text)}"
          onchange="updateQText('${q.id}', this.value)" />
        <button class="btn-del-q" onclick="removeQuestion('${q.id}')">✕</button>
      </div>
      <div class="answers-grid">
        ${['A','B','C','D'].map((letter, ai) => `
          <div class="answer-item">
            <div class="answer-letter ${letter} ${q.correct === ai ? 'correct' : ''}"
              title="Дұрыс деп белгілеу"
              onclick="setCorrect('${q.id}', ${ai})">${letter}</div>
            <input type="text" class="answer-input" placeholder="${letter} жауабы..."
              value="${escHtml(q.answers[ai] || '')}"
              onchange="updateAnswer('${q.id}', ${ai}, this.value)" />
          </div>
        `).join('')}
      </div>
      <p class="q-correct-hint">✅ Дұрыс жауапты белгілеу үшін әріпке басыңыз</p>
    </div>
  `).join('');
}

function updateQText(id, val) {
  const q = currentQuestions.find(q => q.id === id);
  if (q) q.text = val;
}

function updateAnswer(id, ai, val) {
  const q = currentQuestions.find(q => q.id === id);
  if (q) q.answers[ai] = val;
}

function setCorrect(id, ai) {
  const q = currentQuestions.find(q => q.id === id);
  if (!q) return;
  q.correct = ai;
  // re-render just the answer letters
  const item = document.getElementById(`qi-${id}`);
  if (!item) return;
  item.querySelectorAll('.answer-letter').forEach((el, i) => {
    el.classList.toggle('correct', i === ai);
  });
}

/* ---- Save quiz ---- */
function saveQuiz() {
  const title   = document.getElementById('quiz-title').value.trim();
  const subject = document.getElementById('quiz-subject').value.trim();
  const grade   = document.getElementById('quiz-grade').value;
  const lang    = document.getElementById('quiz-lang').value;

  if (!title) { showToast('⚠️ Тест атауын жазыңыз', 'error'); return; }
  if (currentQuestions.length < 2) { showToast('⚠️ Кем дегенде 2 сұрақ болу керек', 'error'); return; }

  // validate
  for (const q of currentQuestions) {
    if (!q.text.trim()) { showToast('⚠️ Барлық сұрақ мәтінін толтырыңыз', 'error'); return; }
    if (q.answers.some(a => !a.trim())) { showToast('⚠️ Барлық жауаптарды толтырыңыз', 'error'); return; }
  }

  const quiz = {
    id: editingQuizId || genId(),
    title, subject, grade, lang,
    owner: currentUser.login,
    questions: currentQuestions,
    createdAt: editingQuizId
      ? (DB.getQuizById(editingQuizId)?.createdAt || new Date().toISOString())
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (editingQuizId) {
    DB.updateQuiz(editingQuizId, quiz);
    showToast('✅ Тест жаңартылды!', 'success');
  } else {
    DB.addQuiz(quiz);
    showToast('✅ Тест сақталды!', 'success');
  }

  editingQuizId = quiz.id;
  loadRecentQuizzes();
}

/* ---- Load quizzes library ---- */
function loadQuizzesLibrary() {
  const grid = document.getElementById('quizzes-grid');
  const quizzes = DB.getQuizzesBy(currentUser.login);

  if (quizzes.length === 0) {
    grid.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text2)">
      <div style="font-size:64px;margin-bottom:16px">📭</div>
      <p>Тесттер жоқ. Жаңа тест жасаңыз!</p>
    </div>`;
    return;
  }

  grid.innerHTML = quizzes.sort((a,b)=> b.updatedAt > a.updatedAt ? 1 : -1).map(q => `
    <div class="quiz-card">
      <div class="quiz-card-title">${escHtml(q.title)}</div>
      <div class="quiz-card-meta">
        <span>📚 ${escHtml(q.subject || 'Пән жоқ')}</span>
        <span>🎓 ${escHtml(q.grade || '—')}</span>
        <span>❓ ${q.questions.length} сұрақ</span>
      </div>
      <div class="quiz-card-actions">
        <button class="btn-sm" onclick="pickMode('bamboozle','${q.id}')">🃏 Іске қос</button>
        <button class="btn-sm" onclick="openEditor('${q.id}')">✏️ Өңдеу</button>
        <button class="btn-sm danger" onclick="deleteQuiz('${q.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function deleteQuiz(id) {
  if (!confirm('Тестті өшіру?')) return;
  DB.deleteQuiz(id);
  loadQuizzesLibrary();
  showToast('🗑️ Тест өшірілді', 'info');
}

function loadRecentQuizzes() {
  const list = document.getElementById('recent-list');
  const quizzes = DB.getQuizzesBy(currentUser?.login || '')
    .sort((a,b)=> b.updatedAt > a.updatedAt ? 1 : -1)
    .slice(0, 4);

  if (quizzes.length === 0) {
    list.innerHTML = '<p style="color:var(--text2);font-size:14px">Тесттер жоқ. Алдымен жасаңыз.</p>';
    return;
  }
  list.innerHTML = quizzes.map(q => `
    <div class="quiz-mini-item">
      <div>
        <div class="q-title">${escHtml(q.title)}</div>
        <div class="q-meta">${escHtml(q.subject || '—')} · ${q.questions.length} сұрақ</div>
      </div>
      <div class="q-actions">
        <button class="btn-sm" onclick="pickMode('bamboozle','${q.id}')">▶ Бастау</button>
        <button class="btn-sm" onclick="openEditor('${q.id}')">✏️</button>
      </div>
    </div>
  `).join('');
}

/* ---- Import from TXT/CSV ---- */
function importFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const parsed = parseTxtQuestions(text);
    if (parsed.length === 0) {
      showToast('⚠️ Форматты тексеріңіз', 'error');
      return;
    }
    parsed.forEach(q => addQuestion(q));
    showToast(`✅ ${parsed.length} сұрақ жүктелді!`, 'success');
  };
  reader.readAsText(file, 'UTF-8');
  event.target.value = '';
}

function parseTxtQuestions(text) {
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result = [];
  let i = 0;

  while (i < lines.length) {
    // look for question line (doesn't start with A) B) C) D) Дұрыс:)
    const qLine = lines[i];
    if (/^[ABCD]\)/.test(qLine) || /^Дұрыс:/i.test(qLine)) { i++; continue; }

    const answers = [];
    let correctIdx = 0;
    let j = i + 1;

    while (j < lines.length && answers.length < 4) {
      const m = lines[j].match(/^([ABCD])\)\s*(.+)/i);
      if (m) { answers.push(m[2].trim()); j++; }
      else break;
    }

    // look for correct answer marker
    if (j < lines.length) {
      const cm = lines[j].match(/^Дұрыс\s*:\s*([ABCD])/i);
      if (cm) {
        correctIdx = 'ABCD'.indexOf(cm[1].toUpperCase());
        j++;
      }
    }

    if (answers.length === 4) {
      result.push({
        id: genId(),
        text: qLine.replace(/^\d+[\.\)]\s*/, ''),
        answers,
        correct: correctIdx,
      });
    }
    i = j;
  }
  return result;
}

/* ---- Escape html ---- */
function escHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
