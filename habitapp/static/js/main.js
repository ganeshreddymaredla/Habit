/* ── Theme ── */
(function () {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
  // Persist to server
  fetch('/accounts/theme/', { method: 'GET' });
}

document.addEventListener('DOMContentLoaded', function () {
  const theme = localStorage.getItem('theme') || 'light';
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
});

/* ── Toast ── */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ── Motivation Popup ── */
const MOTIVATIONS = [
  { emoji: '🔥', title: 'On Fire!', msg: "You're building consistency. Keep it up!" },
  { emoji: '💪', title: 'Great Job!', msg: "Every check-in counts. You're crushing it!" },
  { emoji: '🏆', title: 'Champion!', msg: "Consistency is the key to success!" },
  { emoji: '⭐', title: 'Superstar!', msg: "Small steps every day lead to big results." },
  { emoji: '🚀', title: 'Launching!', msg: "You're building habits that last a lifetime!" },
];

function showMotivation() {
  const today = new Date().toDateString();
  const key = 'motivation_shown_' + today;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');

  const m = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
  const overlay = document.createElement('div');
  overlay.className = 'motivation-overlay';
  overlay.innerHTML = `
    <div class="motivation-box">
      <div class="motivation-emoji">${m.emoji}</div>
      <div class="motivation-title">${m.title}</div>
      <div class="motivation-msg">${m.msg}</div>
      <button class="btn btn-primary w-100" onclick="this.closest('.motivation-overlay').remove()">
        Keep Going! 🚀
      </button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

/* ── Habit Check-in ── */
function checkin(habitId, csrfToken, testDate) {
  const btn      = document.getElementById(`checkin-btn-${habitId}`);
  const streakEl = document.getElementById(`streak-${habitId}`);
  const graceEl  = document.getElementById(`grace-badge-${habitId}`);
  const card     = document.getElementById(`habit-card-${habitId}`);

  const headers = { 'X-CSRFToken': csrfToken, 'Content-Type': 'application/json' };
  if (testDate) headers['X-Test-Date'] = testDate;

  fetch(`/habits/${habitId}/checkin/`, { method: 'POST', headers })
    .then(r => r.json())
    .then(data => {
      if (data.completed) {
        btn.classList.add('done');
        btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Done';
        card.classList.add('completed-card');
        if (streakEl) streakEl.textContent = data.streak;
        if (graceEl) {
          if (data.grace_count >= 3) {
            graceEl.innerHTML = '<span class="grace-badge grace-exhausted">🚫 No grace remaining</span>';
          } else if (data.grace_count > 0) {
            graceEl.innerHTML = `<span class="grace-badge">⚡ Grace: ${data.grace_count}/3</span>`;
          } else {
            graceEl.innerHTML = '';
          }
        }
        showToast('Habit completed! 🎉', 'success');
        showMotivation();
      } else {
        btn.classList.remove('done');
        btn.innerHTML = '<i class="bi bi-check-circle"></i> Mark Done';
        card.classList.remove('completed-card');
        if (streakEl) streakEl.textContent = data.streak;
        if (graceEl) {
          if (data.grace_count > 0) {
            graceEl.innerHTML = `<span class="grace-badge">⚡ Grace: ${data.grace_count}/3</span>`;
          } else {
            graceEl.innerHTML = '';
          }
        }
        showToast('Habit unmarked.', 'info');
      }
      updateProgress();
    })
    .catch(() => showToast('Something went wrong.', 'error'));
}

/* ── Update daily progress bar ── */
function updateProgress() {
  const total = document.querySelectorAll('.habit-card').length;
  const done  = document.querySelectorAll('.habit-card.completed-card').length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar   = document.getElementById('daily-progress-bar');
  const label = document.getElementById('daily-progress-label');
  if (bar)   bar.style.width = pct + '%';
  if (label) label.textContent = `${done}/${total} habits done today (${pct}%)`;
}

/* ── Password Strength ── */
document.addEventListener('DOMContentLoaded', function () {
  const pwInput = document.getElementById('id_password');
  const bar     = document.getElementById('strength-bar');
  const text    = document.getElementById('strength-text');
  if (!pwInput || !bar || !text) return;

  pwInput.addEventListener('input', function () {
    const val = this.value;
    let score = 0;
    if (val.length >= 8)                          score++;
    if (/[A-Z]/.test(val))                        score++;
    if (/[a-z]/.test(val))                        score++;
    if (/\d/.test(val))                           score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(val))      score++;

    const levels = [
      { label: '',       color: '',          width: '0%'   },
      { label: 'Weak',   color: '#ef4444',   width: '25%'  },
      { label: 'Weak',   color: '#ef4444',   width: '40%'  },
      { label: 'Medium', color: '#f59e0b',   width: '65%'  },
      { label: 'Strong', color: '#22c55e',   width: '85%'  },
      { label: 'Strong', color: '#16a34a',   width: '100%' },
    ];
    const lvl = levels[score] || levels[0];
    bar.style.width    = lvl.width;
    bar.style.background = lvl.color;
    text.textContent   = lvl.label;
    text.style.color   = lvl.color;
  });
});

/* ── Auto-dismiss Django messages ── */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.alert-dismissible').forEach(el => {
    setTimeout(() => {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }, 4000);
  });
});
