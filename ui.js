/* =============================================
   BilimBattle — ui.js
   Screen navigation, toast, particle canvas
   ============================================= */

/* ---- Show screen ---- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = 'block';
    requestAnimationFrame(() => target.classList.add('active'));
  }

  // side-effects per screen
  if (id === 'screen-quizzes')   loadQuizzesLibrary();
  if (id === 'screen-dashboard') loadRecentQuizzes();
  if (id === 'screen-editor' && !editingQuizId) openEditor(null);
}

/* ---- Toast ---- */
let toastTimeout = null;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 400);
  }, 3000);
  setTimeout(() => el.classList.remove('hidden'), 10);
}

/* ---- Particle canvas background ---- */
(function initBgCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  const particles = [];
  const N = 60;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < N; i++) {
    particles.push({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      r:  Math.random() * 1.5 + 0.5,
      vx: (Math.random()-0.5) * 0.3,
      vy: (Math.random()-0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(150,160,255,${p.alpha})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---- Input shake animation ---- */
document.head.insertAdjacentHTML('beforeend', `<style>
  @keyframes shakeInput {
    0%,100% { transform: translateX(0); }
    20%,60% { transform: translateX(-8px); }
    40%,80% { transform: translateX(8px); }
  }
  .shake-input { animation: shakeInput 0.4s ease; }
</style>`);
