/* =============================================
   BilimBattle — data.js
   localStorage helpers + initial seed data
   ============================================= */

const DB = {
  /* ---- keys ---- */
  USERS:   'bb_users',
  QUIZZES: 'bb_quizzes',
  SESSION: 'bb_session',

  /* ---- get / set ---- */
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; }
    catch { return null; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  /* ---- Users ---- */
  getUsers() { return this.get(this.USERS) || []; },
  saveUsers(users) { this.set(this.USERS, users); },

  getUserByLogin(login) {
    return this.getUsers().find(u => u.login.toLowerCase() === login.toLowerCase()) || null;
  },

  addUser(user) {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  },

  updateUser(login, patch) {
    const users = this.getUsers().map(u =>
      u.login.toLowerCase() === login.toLowerCase() ? { ...u, ...patch } : u
    );
    this.saveUsers(users);
  },

  deleteUser(login) {
    const users = this.getUsers().filter(u =>
      u.login.toLowerCase() !== login.toLowerCase()
    );
    this.saveUsers(users);
  },

  /* ---- Quizzes ---- */
  getQuizzes() { return this.get(this.QUIZZES) || []; },
  saveQuizzes(q) { this.set(this.QUIZZES, q); },

  getQuizzesBy(teacherLogin) {
    return this.getQuizzes().filter(q => q.owner === teacherLogin);
  },

  getQuizById(id) {
    return this.getQuizzes().find(q => q.id === id) || null;
  },

  addQuiz(quiz) {
    const all = this.getQuizzes();
    all.push(quiz);
    this.saveQuizzes(all);
  },

  updateQuiz(id, patch) {
    const all = this.getQuizzes().map(q =>
      q.id === id ? { ...q, ...patch } : q
    );
    this.saveQuizzes(all);
  },

  deleteQuiz(id) {
    const all = this.getQuizzes().filter(q => q.id !== id);
    this.saveQuizzes(all);
  },

  /* ---- Session ---- */
  getSession() { return this.get(this.SESSION); },
  setSession(user) { this.set(this.SESSION, user); },
  clearSession() { localStorage.removeItem(this.SESSION); },
};

/* ---- Seed admin if not exists ---- */
(function seedAdmin() {
  if (!DB.getUserByLogin('ERS')) {
    DB.addUser({
      login: 'ERS',
      password: '0525',
      role: 'admin',
      name: 'Администратор',
      subject: '',
      createdAt: new Date().toISOString(),
    });
  }
})();

/* ---- Team colors ---- */
const TEAM_COLORS = ['#e53935', '#1565c0', '#2e7d32', '#f57f17'];
const TEAM_DEFAULT_NAMES = ['🔴 Қызыл', '🔵 Көк', '🟢 Жасыл', '🟡 Сары'];

/* ---- Memes data ---- */
const MEMES_CORRECT = [
  { emoji: '🧠', title: 'GENIUS MODE!', text: 'Миы бар адам екен!' },
  { emoji: '🚀', title: 'TO THE MOON!', text: 'Эйнштейн мақтан тұтар!' },
  { emoji: '🔥', title: 'ON FIRE!', text: 'Тоқтата алмайсың!' },
  { emoji: '💎', title: 'DIAMOND MIND!', text: 'Энциклопедия ме?!' },
  { emoji: '⚡', title: 'LIGHTNING FAST!', text: 'Секундта жауап берді!' },
  { emoji: '👑', title: 'KING OF BILIM!', text: 'Таққа лайық!' },
  { emoji: '🎯', title: 'PERFECT AIM!', text: 'Нәтижелі білім!' },
  { emoji: '🌟', title: 'SUPERSTAR!', text: 'Класстың жұлдызы!' },
];

const MEMES_WRONG = [
  { emoji: '🤡', title: 'CLOWN ALERT!', text: 'Цирк дарынды табылды...' },
  { emoji: '😭', title: 'ЖЫЛАМА!', text: 'Ата-анаңа не дейсің?' },
  { emoji: '🙈', title: 'Сабаққа бармаған-ба?', text: 'Кітаппен дос бол!' },
  { emoji: '😴', title: 'ZZZZZ...', text: 'Сабақта ұйықтап па ед?' },
  { emoji: '🫠', title: 'MELTING...', text: 'Ыстықтан ба, білімсіздіктен бе?' },
  { emoji: '🪦', title: 'RIP Ұпай', text: 'Командаңа кешір...' },
  { emoji: '🧌', title: 'ТРОЛЛЬ!', text: 'Қасқа жауап бергенің не?' },
  { emoji: '💀', title: 'СЕНСІЗ ЖАҚСЫРАҚ!', text: 'Кетіп қалсаң да болады 😅' },
];

const MEMES_TIMEOUT = [
  { emoji: '⌛', title: 'Уақыт аяусыз...', text: 'Тым баяу ойлайсың!' },
  { emoji: '⏰', title: 'ТОК!', text: 'Таймер күтпейді!' },
  { emoji: '🐢', title: 'ТАСБАҚА MODE', text: 'Жылдамырақ бол!' },
];

/* ---- Monsters data by subject ---- */
const MONSTERS = {
  math:    { name: '🐉 Сан Айдаһары',   hp: 500, emoji: '🐉', color: '#e53935', svgId: 'dragon'   },
  history: { name: '👑 Патша Рухы',      hp: 450, emoji: '👑', color: '#7b1fa2', svgId: 'king'     },
  biology: { name: '🦠 Вирус Патшасы',  hp: 400, emoji: '🦠', color: '#388e3c', svgId: 'virus'    },
  physics: { name: '⚡ Кванттық Жын',   hp: 480, emoji: '⚡', color: '#1565c0', svgId: 'quantum'  },
  chem:    { name: '☣️ Токсин Жыланы',  hp: 460, emoji: '☣️', color: '#f57f17', svgId: 'snake'    },
  default: { name: '💀 Білімсіздік',     hp: 500, emoji: '💀', color: '#b71c1c', svgId: 'skull'    },
};

function detectMonster(subject = '') {
  const s = subject.toLowerCase();
  if (s.includes('матем') || s.includes('алгебр') || s.includes('геометр')) return MONSTERS.math;
  if (s.includes('тарих') || s.includes('история')) return MONSTERS.history;
  if (s.includes('биол')) return MONSTERS.biology;
  if (s.includes('физик')) return MONSTERS.physics;
  if (s.includes('хим')) return MONSTERS.chem;
  return MONSTERS.default;
}

/* ---- SVG monster templates ---- */
function getMonsterSVG(type, color) {
  const c = color || '#e53935';
  const svgs = {
    dragon: `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="140" rx="60" ry="50" fill="${c}" opacity="0.9"/>
      <circle cx="100" cy="80" r="40" fill="${c}"/>
      <ellipse cx="80" cy="72" rx="12" ry="16" fill="#fff" opacity="0.9"/>
      <ellipse cx="120" cy="72" rx="12" ry="16" fill="#fff" opacity="0.9"/>
      <circle cx="80" cy="72" r="6" fill="#111"/>
      <circle cx="120" cy="72" r="6" fill="#111"/>
      <circle cx="82" cy="70" r="2" fill="#fff"/>
      <circle cx="122" cy="70" r="2" fill="#fff"/>
      <path d="M85,95 Q100,108 115,95" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect x="92" y="97" width="6" height="10" rx="3" fill="#ff1744"/>
      <rect x="102" y="97" width="6" height="10" rx="3" fill="#ff1744"/>
      <polygon points="70,40 60,10 80,35" fill="${c}"/>
      <polygon points="130,40 140,10 120,35" fill="${c}"/>
      <path d="M40,130 Q20,110 30,160 Q50,150 60,140" fill="${c}" opacity="0.8"/>
      <path d="M160,130 Q180,110 170,160 Q150,150 140,140" fill="${c}" opacity="0.8"/>
      <ellipse cx="100" cy="160" rx="25" ry="15" fill="${c}" opacity="0.6"/>
    </svg>`,

    skull: `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="90" rx="65" ry="70" fill="${c}" opacity="0.9"/>
      <rect x="60" y="150" width="80" height="30" rx="6" fill="${c}" opacity="0.8"/>
      <rect x="65" y="155" width="18" height="22" rx="4" fill="#111" opacity="0.9"/>
      <rect x="91" y="155" width="18" height="22" rx="4" fill="#111" opacity="0.9"/>
      <rect x="117" y="155" width="18" height="22" rx="4" fill="#111" opacity="0.9"/>
      <ellipse cx="75" cy="80" rx="22" ry="26" fill="#111" opacity="0.85"/>
      <ellipse cx="125" cy="80" rx="22" ry="26" fill="#111" opacity="0.85"/>
      <circle cx="75" cy="80" r="10" fill="${c}" opacity="0.8"/>
      <circle cx="125" cy="80" r="10" fill="${c}" opacity="0.8"/>
      <path d="M85,120 Q100,132 115,120" stroke="#111" stroke-width="3" fill="none"/>
    </svg>`,

    virus: `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="110" r="55" fill="${c}" opacity="0.9"/>
      ${[0,45,90,135,180,225,270,315].map((a,i) => {
        const r=55, x=100+Math.cos(a*Math.PI/180)*r, y=110+Math.sin(a*Math.PI/180)*r;
        const x2=100+Math.cos(a*Math.PI/180)*85, y2=110+Math.sin(a*Math.PI/180)*85;
        return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
        <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="8" fill="${c}"/>`;
      }).join('')}
      <circle cx="82" cy="100" r="14" fill="#fff" opacity="0.9"/>
      <circle cx="118" cy="100" r="14" fill="#fff" opacity="0.9"/>
      <circle cx="82" cy="100" r="7" fill="#111"/>
      <circle cx="118" cy="100" r="7" fill="#111"/>
      <path d="M82,120 Q100,132 118,120" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>`,

    default: `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="50" width="140" height="130" rx="20" fill="${c}" opacity="0.9"/>
      <ellipse cx="70" cy="90" rx="20" ry="22" fill="#fff" opacity="0.9"/>
      <ellipse cx="130" cy="90" rx="20" ry="22" fill="#fff" opacity="0.9"/>
      <circle cx="70" cy="90" r="10" fill="#111"/>
      <circle cx="130" cy="90" r="10" fill="#111"/>
      <circle cx="73" cy="87" r="3" fill="#fff"/>
      <circle cx="133" cy="87" r="3" fill="#fff"/>
      <path d="M75,130 L85,120 L95,130 L105,120 L115,130 L125,120" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect x="55" y="30" width="20" height="30" rx="10" fill="${c}"/>
      <rect x="125" y="30" width="20" height="30" rx="10" fill="${c}"/>
    </svg>`,
  };
  return svgs[type] || svgs.default;
}

/* ---- ID generator ---- */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---- Room code generator ---- */
function genRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ---- Random pick ---- */
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
