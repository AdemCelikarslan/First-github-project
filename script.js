/* Pomodoro - sidebar + center-focused layout
   LocalStorage keys and behaviors implemented
*/

const LS = {
  settings: 'pomodoro_settings_v2',
  stats: 'pomodoro_stats_v2',
  note: 'pomodoro_note_v2',
  theme: 'pomodoro_theme_v2',
  history: 'pomodoro_history_v2'
};

// DOM
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');


const workInput = document.getElementById('work-time');
const breakInput = document.getElementById('break-time');
const longBreakInput = document.getElementById('long-break-time');
const longBreakEveryInput = document.getElementById('long-break-every');
const setTimeBtn = document.getElementById('set-time');
const resetSettingsBtn = document.getElementById('reset-settings');

const quickNote = document.getElementById('quick-note');
const saveNoteBtn = document.getElementById('save-note');
const clearNoteBtn = document.getElementById('clear-note');

const breakSuggestionEl = document.getElementById('break-suggestion');
const newSugBtn = document.getElementById('new-suggestion');

const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

const presetSelect = document.getElementById('preset');
const themeSelect = document.getElementById('theme');

const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const resetBtn = document.getElementById('reset');
const skipBtn = document.getElementById('skip');
const modeToggleBtn = document.getElementById('mode-toggle');
const nextActionEl = document.getElementById('next-action');
const phaseLabel = document.getElementById('phase-label');
const pomodoroCountEl = document.getElementById('pomodoro-count');

const musicFileInput = document.getElementById('music-file');
const musicToggleBtn = document.getElementById('music-toggle');

const progressCircle = document.querySelector('.progress-ring__circle');

// State
let workMinutes = 25;
let breakMinutes = 5;
let longBreakMinutes = 15;
let longBreakEvery = 4;

let phase = 'work'; // 'work' or 'break'
let minutes = workMinutes;
let seconds = 0;
let timer = null;
let isRunning = false;

let completedPomos = 0;
let cyclePomos = 0; // counts pomodoros within cycle
let todayCompleted = 0;

let history = [];

let musicAudio = null;

// progress circle setup
const R = 94;
const CIRC = 2 * Math.PI * R;
if (progressCircle) {
  progressCircle.style.strokeDasharray = `${CIRC} ${CIRC}`;
  progressCircle.style.strokeDashoffset = CIRC;
}

// suggestions
const suggestions = [
  "Kısa bir esneme: omuzlarını yukarı kaldırıp indir.",
  "20/20/20: 20 saniye, 20 adım uzağa bak.",
  "Derin nefes egzersizi: 4-4-4 nefes al.",
  "Bir bardak su iç.",
  "Ayakta yürüyüp bacaklarını aç.",
  "Boyun esnetmeleri: başı sağa/sola çevir."
];

// ---------- LocalStorage load/save ----------
function loadSettings() {
  const s = JSON.parse(localStorage.getItem(LS.settings) || '{}');
  if (s.work) workMinutes = s.work;
  if (s.break) breakMinutes = s.break;
  if (s.longBreak) longBreakMinutes = s.longBreak;
  if (s.longEvery) longBreakEvery = s.longEvery;
  workInput.value = workMinutes;
  breakInput.value = breakMinutes;
  longBreakInput.value = longBreakMinutes;
  longBreakEveryInput.value = longBreakEvery;
}

function loadStats() {
  const st = JSON.parse(localStorage.getItem(LS.stats) || '{}');
  completedPomos = st.totalPomos || 0;
  todayCompleted = st.today || 0;
  pomodoroCountEl.textContent = `Pomodoro: ${completedPomos}`;
}

function saveStats(addPomos = 0, addMinutes = 0) {
  const st = JSON.parse(localStorage.getItem(LS.stats) || '{}');
  st.totalPomos = (st.totalPomos || 0) + addPomos;
  st.totalMinutes = (st.totalMinutes || 0) + addMinutes;
  const todayKey = new Date().toISOString().slice(0, 10);
  if (st.lastDate !== todayKey) {
    st.today = addPomos;
    st.lastDate = todayKey;
  } else {
    st.today = (st.today || 0) + addPomos;
  }
  localStorage.setItem(LS.stats, JSON.stringify(st));
  completedPomos = st.totalPomos;
  todayCompleted = st.today;
  pomodoroCountEl.textContent = `Pomodoro: ${completedPomos}`;
}

function loadNote() {
  quickNote.value = localStorage.getItem(LS.note) || '';
}
function saveNote() {
  localStorage.setItem(LS.note, quickNote.value);
}
function loadTheme() {
  const t = localStorage.getItem(LS.theme) || 'dark';
  applyTheme(t);
  themeSelect.value = t;
}
function saveHistoryItem(type, duration) {
  const h = JSON.parse(localStorage.getItem(LS.history) || '[]');
  h.unshift({ date: new Date().toLocaleString(), type, duration });
  if (h.length > 120) h.pop();
  localStorage.setItem(LS.history, JSON.stringify(h));
  history = h;
  renderHistory();
}
function loadHistory() {
  history = JSON.parse(localStorage.getItem(LS.history) || '[]');
  renderHistory();
}
function renderHistory() {
  if (!historyList) return; // Guard clause for null element
  historyList.innerHTML = '';
  history.slice(0, 60).forEach(it => {
    const li = document.createElement('li');
    li.textContent = `${it.date} — ${it.type === 'work' ? 'Çalışma' : 'Mola'} (${it.duration} dk)`;
    historyList.appendChild(li);
  });
}

// ---------- UI behaviors ----------
function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.remove('hidden');
  sidebar.setAttribute('aria-hidden', 'false');
  overlay.focus();
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.add('hidden');
  sidebar.setAttribute('aria-hidden', 'true');
}
sidebarToggle.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
const overlay = document.getElementById('overlay');

// Close sidebar on overlay click
if (overlay) {
  overlay.addEventListener('click', () => {
    closeSidebar();
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSidebar();
  }
});

// theme apply
function applyTheme(name) {
  document.body.classList.remove('light', 'neon', 'pastel');
  if (name === 'light') document.body.classList.add('light');
  else if (name === 'neon') document.body.classList.add('neon');
  else if (name === 'pastel') document.body.classList.add('pastel');
  localStorage.setItem(LS.theme, name);
  themeSelect.value = name;
}
themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));

// ---------- Timer display ----------
function updateDisplay() {
  minutesEl.textContent = String(minutes).padStart(2, '0');
  secondsEl.textContent = String(seconds).padStart(2, '0');
  phaseLabel.textContent = phase === 'work' ? 'Çalışma' : 'Mola';

  // progress
  const total = (phase === 'work') ? workMinutes * 60 : (isLongBreakNow() ? longBreakMinutes * 60 : breakMinutes * 60);
  const elapsed = total - (minutes * 60 + seconds);
  let fraction = total > 0 ? (elapsed / total) : 0;
  fraction = Math.max(0, Math.min(1, fraction));
  const offset = CIRC - fraction * CIRC;
  progressCircle.style.strokeDashoffset = offset;

  // color change as it progresses
  if (phase === 'break') {
    // Force break color (handled by CSS variable mostly, but we override specific progress colors)
    progressCircle.style.stroke = 'var(--accent)';
  } else {
    // Work phase: change color based on progress
    if (fraction < 0.6) progressCircle.style.stroke = 'var(--accent)';
    else if (fraction < 0.9) progressCircle.style.stroke = 'orange';
    else progressCircle.style.stroke = 'crimson';
  }

  pomodoroCountEl.textContent = `Pomodoro: ${completedPomos}`;
  nextActionEl.textContent = phase === 'work' ? `Sonraki: Mola (${breakMinutes} dk)` : `Sonraki: Çalışma (${workMinutes} dk)`;

  // Toggle buton metnini güncelle
  if (modeToggleBtn) {
    modeToggleBtn.textContent = phase === 'work' ? 'Mola Moduna Geç' : 'Çalışma Moduna Geç';
  }

  // Body class toggle for break mode
  if (phase === 'break') document.body.classList.add('break-mode');
  else document.body.classList.remove('break-mode');
}

// ---------- Timer mechanics ----------
function isLongBreakNow() {
  return cyclePomos > 0 && (cyclePomos % longBreakEvery === 0);
}

function beep() {
  try {
    const audio = new Audio('alarm.mp4');
    audio.play().catch(e => console.warn('Audio play failed:', e));
  } catch (e) { console.warn(e); }
}

function requestNotif() {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
}
function notify(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  requestNotif();
  timer = setInterval(() => {
    if (seconds > 0) {
      seconds--;
    } else if (minutes > 0) {
      minutes--;
      seconds = 59;
    }

    if (minutes === 0 && seconds === 0) {
      updateDisplay(); // 00:00'ı göster (güvenlik için)
      clearInterval(timer);
      isRunning = false;

      // Hata yakalama ile period sonu
      try {
        onPeriodEnd();
      } catch (e) {
        alert("Sayaç hatası: " + e.message);
        console.error(e);
      }
      return;
    }

    updateDisplay();
  }, 1000);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  isRunning = false;
}

function resetTimer(full = false) {
  stopTimer();
  if (full) {
    phase = 'work';
    cyclePomos = 0;
    minutes = workMinutes;
  } else {
    // Current phase reset
    if (phase === 'work') {
      minutes = workMinutes;
    } else {
      minutes = isLongBreakNow() ? longBreakMinutes : breakMinutes;
    }
  }
  seconds = 0;
  updateDisplay();
}

function onPeriodEnd(isSkip = false) {
  if (!isSkip) {
    try { beep(); } catch (e) { }
  }

  if (phase === 'work') {
    completedPomos++;
    cyclePomos++;
    saveStats(1, workMinutes);
    saveHistoryItem('work', workMinutes);

    if (!isSkip) {
      try { notify('Pomodoro tamamlandı', 'Kısa mola zamanı.'); } catch (e) { }
    }

    // set break
    const long = isLongBreakNow();
    phase = 'break';
    minutes = long ? longBreakMinutes : breakMinutes;
    seconds = 0;
    updateDisplay();

    // Otomatik mola başlat (İPTAL EDİLDİ)
    // startTimer();

    // Basit uyarı (sesin duyulması için gecikmeli)
    if (!isSkip) {
      setTimeout(() => {
        alert('Çalışma bitti!');
      }, 1000);
    }
  } else {
    // mola bitti
    saveHistoryItem('break', (isLongBreakNow() ? longBreakMinutes : breakMinutes));

    if (!isSkip) {
      try { notify('Mola bitti', 'Şimdi tekrar çalışmaya başla.'); } catch (e) { }
    }

    // if it was long break reset cycle
    if (isLongBreakNow()) {
      cyclePomos = 0;
    }
    phase = 'work';
    minutes = workMinutes;
    seconds = 0;
    updateDisplay();

    // otomatik çalışma başlat (İPTAL EDİLDİ)
    // startTimer();

    // Basit uyarı (sesin duyulması için gecikmeli)
    if (!isSkip) {
      setTimeout(() => {
        alert('Mola bitti!');
      }, 1000);
    }
  }
}

// ---------- Controls binding ----------
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', () => resetTimer(false));
skipBtn.addEventListener('click', () => {
  if (isRunning) stopTimer();
  onPeriodEnd(true);
});

if (modeToggleBtn) {
  modeToggleBtn.addEventListener('click', () => {
    stopTimer();
    if (phase === 'work') {
      phase = 'break';
      minutes = breakMinutes;
    } else {
      phase = 'work';
      minutes = workMinutes;
    }
    seconds = 0;
    updateDisplay();
  });
}

// ---------- Settings bind ----------
setTimeBtn.addEventListener('click', () => {
  workMinutes = Math.max(1, parseInt(workInput.value) || 25);
  breakMinutes = Math.max(1, parseInt(breakInput.value) || 5);
  longBreakMinutes = Math.max(1, parseInt(longBreakInput.value) || 15);
  longBreakEvery = Math.max(1, parseInt(longBreakEveryInput.value) || 4);
  localStorage.setItem(LS.settings, JSON.stringify({ work: workMinutes, break: breakMinutes, longBreak: longBreakMinutes, longEvery: longBreakEvery }));
  resetTimer(true);
});
resetSettingsBtn.addEventListener('click', () => {
  localStorage.removeItem(LS.settings);
  workMinutes = 25; breakMinutes = 5; longBreakMinutes = 15; longBreakEvery = 4;
  workInput.value = workMinutes; breakInput.value = breakMinutes; longBreakInput.value = longBreakMinutes; longBreakEveryInput.value = longBreakEvery;
  resetTimer(true);
});

// presets
presetSelect.addEventListener('change', (e) => {
  const v = e.target.value;
  if (v === 'classic') { workMinutes = 25; breakMinutes = 5; longBreakMinutes = 15; }
  else if (v === 'deep') { workMinutes = 50; breakMinutes = 10; longBreakMinutes = 20; }
  workInput.value = workMinutes; breakInput.value = breakMinutes; longBreakInput.value = longBreakMinutes;
  resetTimer(true);
});

// ---------- Notes ----------
saveNoteBtn.addEventListener('click', () => { saveNote(); alert('Not kaydedildi.'); });
clearNoteBtn.addEventListener('click', () => { quickNote.value = ''; localStorage.removeItem(LS.note); });

// auto save quick note
quickNote.addEventListener('input', () => {
  localStorage.setItem(LS.note, quickNote.value);
});

// ---------- Suggestions & History ----------
newSugBtn.addEventListener('click', () => {
  breakSuggestionEl.textContent = suggestions[Math.floor(Math.random() * suggestions.length)];
});

clearHistoryBtn && clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Geçmiş temizlensin mi?')) {
    localStorage.removeItem(LS.history);
    history = []; renderHistory();
  }
});

// ---------- Music ----------
musicFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (musicAudio) { musicAudio.pause(); musicAudio.src = ''; musicAudio = null; }
  const url = URL.createObjectURL(file);
  musicAudio = new Audio(url);
  musicAudio.loop = true; musicAudio.volume = 0.5;
  musicAudio.play();
  musicToggleBtn.textContent = 'Duraklat';
});
musicToggleBtn.addEventListener('click', () => {
  if (!musicAudio) { alert('Önce bir müzik dosyası seçin.'); return; }
  if (musicAudio.paused) { musicAudio.play(); musicToggleBtn.textContent = 'Duraklat'; }
  else { musicAudio.pause(); musicToggleBtn.textContent = 'Çal'; }
});

// ---------- Theme load and other init ----------
function init() {
  loadSettings();
  loadStats();
  loadNote();
  loadHistory();
  loadTheme();
  resetTimer(true);
  // initial suggestion
  breakSuggestionEl.textContent = suggestions[Math.floor(Math.random() * suggestions.length)];
  requestNotif();
}
init();

// close sidebar on unload
window.addEventListener('beforeunload', () => {
  if (musicAudio) musicAudio.pause();
});
