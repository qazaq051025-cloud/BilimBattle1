/* =============================================
   BilimBattle — ai.js  (v2 — fixed status)
   ============================================= */

async function generateWithAI() {
  const topic  = document.getElementById('ai-topic').value.trim();
  const count  = parseInt(document.getElementById('ai-count').value) || 15;
  const lang   = document.getElementById('quiz-lang').value;
  const statusEl = document.getElementById('ai-status');

  if (!topic) { showToast('⚠️ Тақырыпты жазыңыз', 'error'); return; }

  const langLabels = { kk:'қазақ тілінде', ru:'на русском языке', en:'in English' };
  const langLabel  = langLabels[lang] || 'қазақ тілінде';

  // Show loading spinner
  statusEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:10px 0">
    <div class="spinner"></div>
    <span style="color:var(--text2)">AI жасап жатыр... ⏳</span>
  </div>`;

  // Disable button during generation
  const btn = document.querySelector('.btn-ai');
  if (btn) btn.disabled = true;

  const prompt = `Сен мұғалімге тест жасауға көмектесетін AI-сың.
Тақырып: "${topic}"
${count} сұрақтан тұратын тест жасашы ${langLabel}.

Жауап тек JSON массив болсын. Басқа мәтін, түсіндірме, markdown болмасын:
[{"text":"Сұрақ?","answers":["A жауабы","B жауабы","C жауабы","D жауабы"],"correct":0}]

"correct" — дұрыс жауаптың индексі: 0=A, 1=B, 2=C, 3=D.
Сұрақтар оқушыларға лайық, нақты болсын. Оңай мен қиын аралас болсын.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role:'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`API қате: ${resp.status} ${errText.slice(0,80)}`);
    }

    const data = await resp.json();
    const raw  = data.content?.find(b => b.type === 'text')?.text || '';

    // Try to extract JSON array even if there's surrounding text
    const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) throw new Error('JSON формат табылмады');

    let questions;
    try {
      questions = JSON.parse(jsonMatch[0]);
    } catch(parseErr) {
      throw new Error('JSON parse қатесі: ' + parseErr.message);
    }

    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Бос массив');

    // Add questions to editor
    let added = 0;
    questions.forEach(q => {
      if (!q.text) return;
      addQuestion({
        id: genId(),
        text: String(q.text).trim(),
        answers: (Array.isArray(q.answers) ? q.answers : ['','','','']).concat(['','','','']).slice(0,4).map(a=>String(a||'')),
        correct: typeof q.correct === 'number' ? Math.min(3, Math.max(0, q.correct)) : 0,
      });
      added++;
    });

    // Auto-fill title
    const titleEl = document.getElementById('quiz-title');
    if (!titleEl.value) titleEl.value = topic;

    statusEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--success);padding:8px 0">
      <span>✅</span>
      <span>${added} сұрақ сәтті генерацияланды!</span>
    </div>`;
    showToast(`🤖 ${added} сұрақ дайын!`, 'success');
    SFX.correct();

  } catch (err) {
    console.error('AI Error:', err);
    statusEl.innerHTML = `<div style="color:var(--danger);padding:8px 0;font-size:13px">
      ❌ Қате: ${err.message}
    </div>`;
    showToast('❌ AI генерация сәтсіз болды', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
