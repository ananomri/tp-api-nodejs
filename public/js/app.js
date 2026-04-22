// ============================================
// État & config
// ============================================
const API = '/api/etudiants';
const FILIERE_COLORS = {
  'Informatique':   '#3a86ff',
  'Génie Civil':    '#fb8500',
  'Électronique':   '#8338ec',
  'Mécanique':      '#06a77d',
};

const state = {
  students: [],
  view: 'active',          // 'active' | 'archived'
  filiere: '',             // '' = all
  search: '',
  editingId: null,
};

// ============================================
// Utils
// ============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slide-in 200ms ease-out reverse';
    setTimeout(() => el.remove(), 200);
  }, 3000);
}

function getMention(moy) {
  if (moy == null) return { label: '—', cls: 'none' };
  if (moy >= 16) return { label: 'Très Bien', cls: 'tres-bien' };
  if (moy >= 14) return { label: 'Bien', cls: 'bien' };
  if (moy >= 12) return { label: 'Assez Bien', cls: 'assez-bien' };
  if (moy >= 10) return { label: 'Passable', cls: 'passable' };
  return { label: 'Insuffisant', cls: 'insuffisant' };
}

// Animate count from current to target
function animateNumber(el, target, decimals = 0) {
  const current = parseFloat(el.textContent) || 0;
  const duration = 600;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = current + (target - current) * eased;
    el.firstChild.nodeValue = decimals
      ? value.toFixed(decimals)
      : Math.round(value).toString();
    if (t < 1) requestAnimationFrame(tick);
  };
  // Make sure first child is a text node
  if (!el.firstChild || el.firstChild.nodeType !== 3) {
    el.insertBefore(document.createTextNode('0'), el.firstChild);
  }
  requestAnimationFrame(tick);
}

// ============================================
// API calls
// ============================================
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function fetchStudents() {
  $('#loading-state').classList.remove('hidden');
  try {
    const path = state.view === 'archived' ? '/inactive' : '';
    const data = await api(path);
    state.students = data.data || [];
    setStatus(true);
  } catch (err) {
    toast(`Erreur de chargement : ${err.message}`, 'error');
    setStatus(false);
    state.students = [];
  } finally {
    $('#loading-state').classList.add('hidden');
    render();
  }
}

async function createStudent(payload) {
  const data = await api('', { method: 'POST', body: JSON.stringify(payload) });
  return data;
}

async function updateStudent(id, payload) {
  const data = await api(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  return data;
}

async function deleteStudent(id) {
  return api(`/${id}`, { method: 'DELETE' });
}

async function reactivateStudent(id) {
  return api(`/${id}`, { method: 'PUT', body: JSON.stringify({ actif: true }) });
}

// ============================================
// Rendering
// ============================================
function setStatus(ok) {
  const dot = $('#api-status .status-dot');
  const text = $('#api-status span:last-child');
  dot.classList.remove('connected', 'error');
  if (ok) {
    dot.classList.add('connected');
    text.textContent = 'connected';
  } else {
    dot.classList.add('error');
    text.textContent = 'error';
  }
  $('#footer-status').textContent = ok
    ? `${state.students.length} record${state.students.length !== 1 ? 's' : ''} · live`
    : 'connection failed';
}

function getFiltered() {
  const q = state.search.toLowerCase().trim();
  return state.students.filter((s) => {
    if (state.filiere && s.filiere !== state.filiere) return false;
    if (q) {
      const hay = `${s.prenom} ${s.nom} ${s.email}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderStats() {
  const active = state.students.filter((s) => s.actif !== false);
  const archived = state.view === 'archived'
    ? state.students.length
    : null; // we only know archived count when viewing it

  // Total
  animateNumber($('#stat-total'), state.view === 'archived' ? 0 : active.length);
  $('#stat-archived').textContent = archived ?? '—';

  // Average grade (only count students with a moyenne)
  const withGrade = active.filter((s) => typeof s.moyenne === 'number');
  const avg = withGrade.length
    ? withGrade.reduce((a, s) => a + s.moyenne, 0) / withGrade.length
    : 0;

  const avgEl = $('#stat-avg');
  // Preserve the /20 suffix span
  const suffix = '<span class="text-stone text-2xl">/20</span>';
  avgEl.innerHTML = `${avg.toFixed(2)}${suffix}`;

  // Filières actives
  const fset = new Set(active.map((s) => s.filiere));
  $('#stat-filieres').textContent = fset.size;
}

function renderFiliereBar() {
  const active = state.students.filter((s) => s.actif !== false);
  const counts = {};
  active.forEach((s) => { counts[s.filiere] = (counts[s.filiere] || 0) + 1; });
  const total = active.length || 1;

  const bar = $('#filiere-bar');
  const legend = $('#filiere-legend');
  bar.innerHTML = '';
  legend.innerHTML = '';

  Object.entries(FILIERE_COLORS).forEach(([fil, color]) => {
    const count = counts[fil] || 0;
    const pct = (count / total) * 100;
    if (pct > 0) {
      const seg = document.createElement('div');
      seg.style.width = `${pct}%`;
      seg.style.background = color;
      seg.title = `${fil} : ${count}`;
      bar.appendChild(seg);
    }
    const item = document.createElement('div');
    item.className = 'flex items-center gap-2 text-stone';
    item.innerHTML = `
      <span class="w-2 h-2 inline-block" style="background:${color}"></span>
      <span>${fil}</span>
      <span class="text-chalk tabular-nums">${count}</span>
    `;
    legend.appendChild(item);
  });
}

function renderRows() {
  const rows = getFiltered();
  const tbody = $('#students-tbody');
  const empty = $('#empty-state');

  tbody.innerHTML = '';
  if (rows.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  rows.forEach((s, i) => {
    const mention = getMention(s.moyenne);
    const color = FILIERE_COLORS[s.filiere] || '#5a5550';
    const tr = document.createElement('tr');
    tr.classList.add('reveal');
    tr.style.animationDelay = `${Math.min(i * 30, 400)}ms`;

    const isArchived = s.actif === false;

    tr.innerHTML = `
      <td class="font-mono text-xs text-stone">${String(i + 1).padStart(3, '0')}</td>
      <td>
        <div class="font-medium ${isArchived ? 'text-stone line-through' : 'text-paper'}">${escapeHtml(s.prenom)} ${escapeHtml(s.nom)}</div>
        <div class="text-xs text-stone font-mono mt-0.5">${s._id?.slice(-8) || ''}</div>
      </td>
      <td class="font-mono text-xs text-chalk">${escapeHtml(s.email)}</td>
      <td>
        <span class="filiere-tag" style="border-color:${color}; color:${color}">${escapeHtml(s.filiere)}</span>
      </td>
      <td class="font-mono text-sm text-chalk">${s.annee}<sup class="text-stone">e</sup></td>
      <td class="font-mono text-sm tabular-nums ${s.moyenne >= 10 ? 'text-paper' : 'text-stone'}">
        ${s.moyenne != null ? s.moyenne.toFixed(2) : '—'}
      </td>
      <td><span class="mention ${mention.cls}">${mention.label}</span></td>
      <td class="text-right">
        <div class="flex justify-end gap-2">
          ${isArchived
            ? `<button class="action-btn success" data-action="restore" data-id="${s._id}">Restaurer</button>`
            : `
              <button class="action-btn" data-action="edit" data-id="${s._id}">Éditer</button>
              <button class="action-btn danger" data-action="delete" data-id="${s._id}">Archiver</button>
            `}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function render() {
  if (state.view === 'active') {
    renderStats();
    renderFiliereBar();
  }
  renderRows();
  setStatus(true);
}

// ============================================
// Modal
// ============================================
function openModal(student = null) {
  state.editingId = student?._id || null;
  $('#modal-tag').textContent = student ? '// édition' : '// nouveau';
  $('#modal-title').textContent = student ? 'Modifier l\'étudiant' : 'Nouvel étudiant';
  $('#form-id').value = student?._id || '';
  $('#form-prenom').value = student?.prenom || '';
  $('#form-nom').value = student?.nom || '';
  $('#form-email').value = student?.email || '';
  $('#form-filiere').value = student?.filiere || '';
  $('#form-annee').value = student?.annee || '';
  $('#form-moyenne').value = student?.moyenne ?? '';
  $('#modal').classList.remove('hidden');
  setTimeout(() => $('#form-prenom').focus(), 50);
}

function closeModal() {
  $('#modal').classList.add('hidden');
  state.editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const payload = {
    prenom: $('#form-prenom').value.trim(),
    nom: $('#form-nom').value.trim(),
    email: $('#form-email').value.trim(),
    filiere: $('#form-filiere').value,
    annee: parseInt($('#form-annee').value, 10),
  };
  const moy = $('#form-moyenne').value;
  if (moy !== '') payload.moyenne = parseFloat(moy);

  try {
    if (state.editingId) {
      await updateStudent(state.editingId, payload);
      toast('Étudiant mis à jour.', 'success');
    } else {
      await createStudent(payload);
      toast('Étudiant créé.', 'success');
    }
    closeModal();
    await fetchStudents();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ============================================
// Event handlers
// ============================================
function bindEvents() {
  // Add button
  $('#add-btn').addEventListener('click', () => openModal());

  // Modal
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#student-form').addEventListener('submit', handleSubmit);
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) closeModal();
  });

  // Search
  const onSearch = debounce(() => {
    state.search = $('#search-input').value;
    renderRows();
  }, 200);
  $('#search-input').addEventListener('input', onSearch);

  // Filière filters
  $$('#filiere-filters .filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#filiere-filters .filter-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const color = btn.dataset.color;
      if (color) btn.style.setProperty('--pill-color', color);
      state.filiere = btn.dataset.filiere;
      renderRows();
    });
  });

  // View toggles
  $('#view-active').addEventListener('click', () => {
    if (state.view === 'active') return;
    state.view = 'active';
    $('#view-active').classList.add('active');
    $('#view-archived').classList.remove('active');
    fetchStudents();
  });
  $('#view-archived').addEventListener('click', () => {
    if (state.view === 'archived') return;
    state.view = 'archived';
    $('#view-archived').classList.add('active');
    $('#view-active').classList.remove('active');
    fetchStudents();
  });

  // Row actions (event delegation)
  $('#students-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    const student = state.students.find((s) => s._id === id);

    if (action === 'edit') {
      openModal(student);
    } else if (action === 'delete') {
      if (!confirm(`Archiver ${student.prenom} ${student.nom} ?`)) return;
      try {
        await deleteStudent(id);
        toast('Étudiant archivé.', 'success');
        await fetchStudents();
      } catch (err) {
        toast(err.message, 'error');
      }
    } else if (action === 'restore') {
      try {
        await reactivateStudent(id);
        toast('Étudiant restauré.', 'success');
        await fetchStudents();
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });
}

// ============================================
// Boot
// ============================================
bindEvents();
fetchStudents();
