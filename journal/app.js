'use strict';

const STORAGE_KEY = 'journal_entries';
const THEME_KEY   = 'journal_theme';

// ===== State =====
let entries = loadEntries();
let pendingDeleteId = null;
let filter = { keyword: '', dateFrom: '', dateTo: '', tag: '' };

// ===== DOM refs =====
const dateInput         = document.getElementById('dateInput');
const titleInput        = document.getElementById('titleInput');
const bodyInput         = document.getElementById('bodyInput');
const tagInput          = document.getElementById('tagInput');
const tagPreview        = document.getElementById('tagPreview');
const saveBtn           = document.getElementById('saveBtn');
const clearBtn          = document.getElementById('clearBtn');
const darkModeBtn       = document.getElementById('darkModeBtn');
const darkModeIcon      = document.getElementById('darkModeIcon');
const exportBtn         = document.getElementById('exportBtn');

const searchInput       = document.getElementById('searchInput');
const filterDateFrom    = document.getElementById('filterDateFrom');
const filterDateTo      = document.getElementById('filterDateTo');
const clearDateFilterBtn= document.getElementById('clearDateFilterBtn');
const tagFilterRow      = document.getElementById('tagFilterRow');
const tagFilterChips    = document.getElementById('tagFilterChips');
const entriesList       = document.getElementById('entriesList');

const deleteModal       = document.getElementById('deleteModal');
const cancelDeleteBtn   = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn  = document.getElementById('confirmDeleteBtn');

const exportModal       = document.getElementById('exportModal');
const cancelExportBtn   = document.getElementById('cancelExportBtn');
const exportJsonBtn     = document.getElementById('exportJsonBtn');
const exportTextBtn     = document.getElementById('exportTextBtn');

const modalOverlay      = document.getElementById('modalOverlay');

// ===== Init =====
dateInput.value = todayStr();
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
renderTagFilter();
renderEntries();

// ===== Auto-resize textarea =====
bodyInput.addEventListener('input', () => {
  bodyInput.style.height = 'auto';
  bodyInput.style.height = bodyInput.scrollHeight + 'px';
});

// ===== Tag preview while typing =====
tagInput.addEventListener('input', () => {
  renderTagPreview(parseTags(tagInput.value));
});

// ===== Editor events =====
saveBtn.addEventListener('click', saveEntry);
clearBtn.addEventListener('click', clearEditor);

// ===== Filter events =====
searchInput.addEventListener('input', () => {
  filter.keyword = searchInput.value.trim();
  renderEntries();
});

filterDateFrom.addEventListener('change', () => {
  filter.dateFrom = filterDateFrom.value;
  renderEntries();
});

filterDateTo.addEventListener('change', () => {
  filter.dateTo = filterDateTo.value;
  renderEntries();
});

clearDateFilterBtn.addEventListener('click', () => {
  filterDateFrom.value = '';
  filterDateTo.value = '';
  filter.dateFrom = '';
  filter.dateTo = '';
  renderEntries();
});

// ===== Dark mode =====
darkModeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

// ===== Export =====
exportBtn.addEventListener('click', () => {
  exportModal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
});
cancelExportBtn.addEventListener('click', closeExportModal);
exportJsonBtn.addEventListener('click', () => { doExport('json'); closeExportModal(); });
exportTextBtn.addEventListener('click', () => { doExport('text'); closeExportModal(); });

// ===== Delete modal =====
cancelDeleteBtn.addEventListener('click', closeDeleteModal);
confirmDeleteBtn.addEventListener('click', () => {
  if (pendingDeleteId !== null) {
    entries = entries.filter(e => e.id !== pendingDeleteId);
    saveEntries();
    renderTagFilter();
    renderEntries();
    closeDeleteModal();
  }
});

modalOverlay.addEventListener('click', () => {
  closeDeleteModal();
  closeExportModal();
});

// ===== Core functions =====

function saveEntry() {
  const date  = dateInput.value;
  const title = titleInput.value.trim();
  const body  = bodyInput.value.trim();
  const tags  = parseTags(tagInput.value);

  if (!date) {
    dateInput.focus();
    return;
  }
  if (!body) {
    bodyInput.focus();
    bodyInput.style.border = '1px solid #c0392b';
    setTimeout(() => { bodyInput.style.border = ''; }, 1500);
    return;
  }

  entries.unshift({ id: Date.now(), date, title, body, tags, createdAt: new Date().toISOString() });
  saveEntries();
  renderTagFilter();
  renderEntries();
  clearEditor();
}

function clearEditor() {
  dateInput.value = todayStr();
  titleInput.value = '';
  bodyInput.value = '';
  bodyInput.style.height = 'auto';
  tagInput.value = '';
  tagPreview.innerHTML = '';
  titleInput.focus();
}

function renderTagPreview(tags) {
  tagPreview.innerHTML = tags.map(t =>
    `<span class="tag-chip"># ${escapeHtml(t)}</span>`
  ).join('');
}

// ===== Filter & Render =====

function getFilteredEntries() {
  return entries.filter(e => {
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      if (!e.title.toLowerCase().includes(kw) &&
          !e.body.toLowerCase().includes(kw) &&
          !e.tags.some(t => t.toLowerCase().includes(kw))) return false;
    }
    if (filter.dateFrom && e.date < filter.dateFrom) return false;
    if (filter.dateTo   && e.date > filter.dateTo)   return false;
    if (filter.tag && !e.tags.includes(filter.tag))  return false;
    return true;
  });
}

function renderEntries() {
  const filtered = getFilteredEntries();

  if (filtered.length === 0) {
    const hasFilter = filter.keyword || filter.dateFrom || filter.dateTo || filter.tag;
    const msg = hasFilter
      ? '条件に一致する日記はありません。'
      : 'まだ日記がありません。最初の一言を書いてみましょう！';
    entriesList.innerHTML = `<p class="empty-message">${escapeHtml(msg)}</p>`;
    return;
  }

  entriesList.innerHTML = filtered.map(entry => {
    const dateFmt = formatDateDisplay(entry.date);
    const title   = entry.title ? `<div class="entry-title">${escapeHtml(entry.title)}</div>` : '';
    const preview = escapeHtml(entry.body.slice(0, 80)) + (entry.body.length > 80 ? '…' : '');
    const fullBody= escapeHtml(entry.body);
    const tagsHtml= entry.tags.length
      ? `<div class="entry-tags">${entry.tags.map(t =>
          `<span class="tag-chip"># ${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    return `
      <div class="entry-card" data-id="${entry.id}">
        <div class="entry-meta">${dateFmt}</div>
        ${title}
        <div class="entry-preview">${preview}</div>
        <div class="entry-body">${fullBody}</div>
        ${tagsHtml}
        <button class="entry-delete-btn" data-delete-id="${entry.id}" title="削除" aria-label="削除">✕</button>
      </div>
    `;
  }).join('');

  entriesList.querySelectorAll('.entry-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.entry-delete-btn') || e.target.closest('.tag-chip')) return;
      card.classList.toggle('expanded');
    });
  });

  entriesList.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const tag = chip.textContent.replace(/^#\s*/, '').trim();
      filter.tag = filter.tag === tag ? '' : tag;
      renderTagFilter();
      renderEntries();
    });
  });

  entriesList.querySelectorAll('.entry-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openDeleteModal(Number(btn.dataset.deleteId));
    });
  });
}

function renderTagFilter() {
  const allTags = [...new Set(entries.flatMap(e => e.tags))].sort();

  if (allTags.length === 0) {
    tagFilterRow.classList.add('hidden');
    return;
  }

  tagFilterRow.classList.remove('hidden');
  tagFilterChips.innerHTML = allTags.map(tag => {
    const active = filter.tag === tag ? 'active' : '';
    return `<span class="tag-chip ${active}" data-tag="${escapeHtml(tag)}"># ${escapeHtml(tag)}</span>`;
  }).join('');

  tagFilterChips.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag;
      filter.tag = filter.tag === tag ? '' : tag;
      renderTagFilter();
      renderEntries();
    });
  });
}

// ===== Export =====

function doExport(format) {
  const data = getFilteredEntries();
  if (data.length === 0) return;

  let content, mime, ext;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    mime = 'application/json';
    ext = 'json';
  } else {
    content = data.map(e => {
      const tags = e.tags.length ? `タグ: ${e.tags.join(', ')}\n` : '';
      return `# ${e.date}${e.title ? ' ' + e.title : ''}\n${tags}\n${e.body}\n`;
    }).join('\n---\n\n');
    mime = 'text/plain';
    ext = 'txt';
  }

  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `journal_${todayStr()}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Modals =====

function openDeleteModal(id) {
  pendingDeleteId = id;
  deleteModal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

function closeExportModal() {
  exportModal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

// ===== Theme =====

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  darkModeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ===== Helpers =====

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function parseTags(raw) {
  return raw.split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function loadEntries() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    // 旧データに date フィールドがない場合は createdAt から補完
    return data.map(e => ({
      ...e,
      tags: e.tags || [],
      date: e.date || (e.createdAt ? e.createdAt.slice(0, 10) : todayStr()),
    }));
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
