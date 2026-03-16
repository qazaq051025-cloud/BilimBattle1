/* =============================================
   BilimBattle — auth.js
   Login / Register / Logout
   ============================================= */

let currentUser = null;

function doLogin() {
  const login = document.getElementById('login-user').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const err   = document.getElementById('login-error');

  if (!login || !pass) { err.textContent = '⚠️ Логин мен парольді толтырыңыз'; return; }

  const user = DB.getUserByLogin(login);
  if (!user || user.password !== pass) {
    err.textContent = '❌ Логин немесе пароль қате';
    document.getElementById('login-pass').classList.add('shake-input');
    setTimeout(() => document.getElementById('login-pass').classList.remove('shake-input'), 600);
    return;
  }

  err.textContent = '';
  currentUser = user;
  DB.setSession(user);
  afterLogin(user);
}

function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const login = document.getElementById('reg-user').value.trim();
  const subj  = document.getElementById('reg-subject').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const err   = document.getElementById('reg-error');

  if (!name || !login || !pass || !pass2) { err.textContent = '⚠️ Барлық өрістерді толтырыңыз'; return; }
  if (pass !== pass2) { err.textContent = '❌ Парольдар сәйкес емес'; return; }
  if (pass.length < 4) { err.textContent = '❌ Пароль кем дегенде 4 таңба'; return; }
  if (login.toLowerCase() === 'ers') { err.textContent = '❌ Бұл никнеймді пайдалануға болмайды'; return; }
  if (DB.getUserByLogin(login)) { err.textContent = '❌ Бұл никнейм бос емес'; return; }

  const user = {
    login, name, subject: subj, password: pass,
    role: 'teacher',
    createdAt: new Date().toISOString(),
  };
  DB.addUser(user);
  currentUser = user;
  DB.setSession(user);
  showToast('✅ Тіркелу сәтті!', 'success');
  afterLogin(user);
}

function doLogout() {
  currentUser = null;
  DB.clearSession();
  showScreen('screen-splash');
}

function afterLogin(user) {
  if (user.role === 'admin') {
    loadAdminPanel();
    showScreen('screen-admin');
  } else {
    document.getElementById('nav-teacher-name').textContent = user.name;
    document.getElementById('dash-teacher-name').textContent = user.name.split(' ')[0];
    loadRecentQuizzes();
    showScreen('screen-dashboard');
  }
}

function restoreSession() {
  const s = DB.getSession();
  if (s) {
    // re-fetch from db in case updated
    const fresh = DB.getUserByLogin(s.login);
    if (fresh) {
      currentUser = fresh;
      afterLogin(fresh);
      return;
    }
    DB.clearSession();
  }
}

/* ===== Admin ===== */
function loadAdminPanel() {
  const wrap = document.getElementById('admin-teachers-list');
  const teachers = DB.getUsers().filter(u => u.role !== 'admin');
  if (teachers.length === 0) {
    wrap.innerHTML = '<p style="padding:24px;color:var(--text2)">Мұғалімдер жоқ</p>';
    return;
  }
  wrap.innerHTML = `<table class="admin-table">
    <thead><tr><th>#</th><th>Никнейм</th><th>Аты-жөні</th><th>Пән</th><th>Тіркелген</th><th>Тесттер</th><th>Әрекет</th></tr></thead>
    <tbody>
    ${teachers.map((t,i) => {
      const qCount = DB.getQuizzesBy(t.login).length;
      const date   = new Date(t.createdAt).toLocaleDateString('kk-KZ');
      return `<tr>
        <td>${i+1}</td>
        <td><strong>${t.login}</strong></td>
        <td>${t.name}</td>
        <td>${t.subject || '—'}</td>
        <td>${date}</td>
        <td>${qCount}</td>
        <td>
          <button class="btn-reset" onclick="adminResetPwd('${t.login}')">🔑 Пароль</button>
          <button class="btn-delete" onclick="adminDeleteUser('${t.login}')">🗑️ Өшіру</button>
        </td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}

function adminResetPwd(login) {
  const newPwd = prompt(`"${login}" үшін жаңа пароль:`);
  if (!newPwd) return;
  DB.updateUser(login, { password: newPwd });
  showToast(`✅ ${login} парольі өзгертілді`, 'success');
}

function adminDeleteUser(login) {
  if (!confirm(`"${login}" мұғалімін өшіру?`)) return;
  DB.deleteUser(login);
  // also remove their quizzes
  DB.getQuizzesBy(login).forEach(q => DB.deleteQuiz(q.id));
  loadAdminPanel();
  showToast(`🗑️ ${login} өшірілді`, 'info');
}

/* ===== Switch login/register tabs ===== */
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
  event.currentTarget.classList.add('active');
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.getElementById('login-error').textContent = '';
  document.getElementById('reg-error').textContent = '';
}

function showStudentJoin() {
  showScreen('screen-student');
}

/* enter key support */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const active = document.querySelector('.auth-form:not(.hidden)');
  if (!active) return;
  if (active.id === 'tab-login') doLogin();
  else doRegister();
});
