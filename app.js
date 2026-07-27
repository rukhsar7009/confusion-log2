// ---------- Config ----------
const STORAGE_KEY = 'confusionLog.entries.v1';
const STYLE_ORDER = ['Analogy', 'Plain English', 'Worked Example', 'Real-World Scenario', 'Socratic Questions'];

// ---------- State ----------
let entries = loadEntries();
let activeFilter = 'all';
let activeCourse = '';
let openEntryId = null;

// ---------- Storage ----------
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Could not read saved entries', e);
    return [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Could not save entries', e);
  }
}

function makeId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// ---------- DOM refs ----------
const addForm = document.getElementById('add-form');
const entriesList = document.getElementById('entries-list');
const emptyState = document.getElementById('empty-state');
const statOpen = document.getElementById('stat-open');
const statResolved = document.getElementById('stat-resolved');
const courseFilterSelect = document.getElementById('course-filter');
const tabs = document.querySelectorAll('.tab');

const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');
const modalTopic = document.getElementById('modal-topic');
const modalCourse = document.getElementById('modal-course');
const modalNotes = document.getElementById('modal-notes');
const explainBtn = document.getElementById('explain-btn');
const resolveBtn = document.getElementById('resolve-btn');
const reopenBtn = document.getElementById('reopen-btn');
const deleteBtn = document.getElementById('delete-btn');
const aiError = document.getElementById('ai-error');
const explanationsList = document.getElementById('explanations-list');
const noExplanations = document.getElementById('no-explanations');

// ---------- Rendering ----------
function render() {
  renderStats();
  renderCourseOptions();
  renderEntries();
}

function renderStats() {
  const open = entries.filter(e => !e.resolved).length;
  const resolved = entries.filter(e => e.resolved).length;
  statOpen.textContent = open;
  statResolved.textContent = resolved;
}

function renderCourseOptions() {
  const courses = Array.from(new Set(entries.map(e => e.course).filter(Boolean))).sort();
  const current = courseFilterSelect.value;
  courseFilterSelect.innerHTML = '<option value="">All courses</option>' +
    courses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (courses.includes(current)) courseFilterSelect.value = current;
}

function getFilteredEntries() {
  return entries
    .filter(e => {
      if (activeFilter === 'open') return !e.resolved;
      if (activeFilter === 'resolved') return e.resolved;
      return true;
    })
    .filter(e => !activeCourse || e.course === activeCourse)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function renderEntries() {
  const list = getFilteredEntries();
  entriesList.innerHTML = '';

  if (entries.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = 'Nothing logged yet — add the first thing that confused you today.';
    return;
  }
  if (list.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = 'No entries match this filter.';
    return;
  }
  emptyState.hidden = true;

  list.forEach(entry => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'entry-card' + (entry.resolved ? ' is-resolved' : '');
    card.setAttribute('data-id', entry.id);

    const dots = Array.from({ length: Math.min(entry.explanations.length, 5) })
      .map(() => '<span class="dust-dot"></span>').join('');

    card.innerHTML = `
      ${entry.course ? `<p class="entry-course">${escapeHtml(entry.course)}</p>` : ''}
      <h3 class="entry-topic">${escapeHtml(entry.topic)}</h3>
      <p class="entry-notes">${escapeHtml(entry.notes)}</p>
      <div class="entry-meta">
        <span class="dust-dots">${dots}</span>
        <span>${entry.resolved ? '<span class="badge-resolved">clicked ✓</span>' : (entry.explanations.length + ' attempt' + (entry.explanations.length === 1 ? '' : 's'))}</span>
      </div>
    `;
    card.addEventListener('click', () => openEntry(entry.id));
    entriesList.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ---------- Add entry ----------
addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const topic = document.getElementById('topic').value.trim();
  const course = document.getElementById('course').value.trim();
  const notes = document.getElementById('notes').value.trim();

  if (!topic || !notes) return;

  entries.push({
    id: makeId(),
    topic,
    course,
    notes,
    createdAt: Date.now(),
    resolved: false,
    explanations: []
  });

  saveEntries();
  addForm.reset();
  document.getElementById('topic').focus();
  render();
});

// ---------- Filters ----------
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    activeFilter = tab.getAttribute('data-filter');
    renderEntries();
  });
});

courseFilterSelect.addEventListener('change', () => {
  activeCourse = courseFilterSelect.value;
  renderEntries();
});

// ---------- Modal ----------
function findEntry(id) {
  return entries.find(e => e.id === id);
}

function openEntry(id) {
  openEntryId = id;
  const entry = findEntry(id);
  if (!entry) return;

  modalCourse.textContent = entry.course || 'General';
  modalTopic.textContent = entry.topic;
  modalNotes.textContent = entry.notes;
  aiError.hidden = true;
  aiError.textContent = '';

  resolveBtn.hidden = entry.resolved;
  reopenBtn.hidden = !entry.resolved;

  renderExplanations(entry);

  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  openEntryId = null;
}

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalBackdrop.hidden) closeModal();
});

function renderExplanations(entry) {
  explanationsList.innerHTML = '';
  if (!entry.explanations.length) {
    explanationsList.appendChild(noExplanations);
    noExplanations.hidden = false;
    return;
  }
  noExplanations.hidden = true;

  entry.explanations.slice().reverse().forEach(exp => {
    const item = document.createElement('div');
    item.className = 'explanation-item';
    item.innerHTML = `
      <p class="explanation-style">${escapeHtml(exp.style)}</p>
      <p class="explanation-text">${escapeHtml(exp.explanation)}</p>
    `;
    explanationsList.appendChild(item);
  });
}

// ---------- AI feature: explain differently ----------
explainBtn.addEventListener('click', async () => {
  const entry = findEntry(openEntryId);
  if (!entry) return;

  aiError.hidden = true;
  explainBtn.disabled = true;
  const originalLabel = explainBtn.textContent;
  explainBtn.textContent = 'Thinking of a new way to explain this…';

  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: entry.topic,
        course: entry.course,
        notes: entry.notes,
        triedStyles: entry.explanations.map(e => e.style)
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'The AI tutor could not respond right now.');
    }

    entry.explanations.push({
      style: data.style || 'Explanation',
      explanation: data.explanation,
      createdAt: Date.now()
    });
    saveEntries();
    renderExplanations(entry);
    renderEntries();
  } catch (err) {
    console.error(err);
    aiError.hidden = false;
    aiError.textContent = 'Could not reach the AI tutor — check your connection and try again. (' + err.message + ')';
  } finally {
    explainBtn.disabled = false;
    explainBtn.textContent = originalLabel;
  }
});

// ---------- Resolve / reopen / delete ----------
resolveBtn.addEventListener('click', () => {
  const entry = findEntry(openEntryId);
  if (!entry) return;
  entry.resolved = true;
  saveEntries();
  resolveBtn.hidden = true;
  reopenBtn.hidden = false;
  render();
});

reopenBtn.addEventListener('click', () => {
  const entry = findEntry(openEntryId);
  if (!entry) return;
  entry.resolved = false;
  saveEntries();
  resolveBtn.hidden = false;
  reopenBtn.hidden = true;
  render();
});

deleteBtn.addEventListener('click', () => {
  if (!openEntryId) return;
  if (!confirm('Delete this entry and all its explanations? This cannot be undone.')) return;
  entries = entries.filter(e => e.id !== openEntryId);
  saveEntries();
  closeModal();
  render();
});

// ---------- Init ----------
render();
