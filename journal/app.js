'use strict';

const STORAGE_KEY = 'journal_entries';

// --- State ---
let entries = loadEntries();
let pendingDeleteId = null;
let searchQuery = '';

// --- DOM refs ---
const currentDateEl = document.getElementById('currentDate');
const titleInput = document.getElementById('titleInput');
const bodyInput = document.getElementById('bodyInput');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const entriesList = document.getElementById('entriesList');
const searchInput = document.getElementById('searchInput');
const deleteModal = document.getElementById('deleteModal');
const modalOverlay = document.getElementById('modalOverlay');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// --- Init ---
updateCurrentDate();
renderEntries();

// Auto-resize textarea
bodyInput.addEventListener('input', () => {
  bodyInput.style.height = 'auto';
  bodyInput.style.height = bodyInput.scrollHeight + 'px';
});

// --- Event Listeners ---
saveBtn.addEventListener('click', saveEntry);
clearBtn.addEventListener('click', clearEditor);
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  renderEntries();
});

cancelDeleteBtn.addEventListener('click', closeDeleteModal);
modalOverlay.addEventListener('click', closeDeleteModal);
confirmDeleteBtn.addEventListener('click', () => {
  if (pendingDeleteId !== null) {
    deleteEntry(pendingDeleteId);
    closeDeleteModal();
  }
});

// --- Functions ---

function updateCurrentDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  currentDateEl.textContent = now.toLocaleDateString('ja-JP', options);
}

function saveEntry() {
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!body) {
    bodyInput.focus();
    bodyInput.placeholder = '内容を入力してください';
    setTimeout(() => { bodyInput.placeholder = '今日はどんな一日でしたか？'; }, 2000);
    return;
  }

  const entry = {
    id: Date.now(),
    title: title,
    body: body,
    createdAt: new Date().toISOString(),
  };

  entries.unshift(entry);
  saveEntries();
  renderEntries();
  clearEditor();
}

function clearEditor() {
  titleInput.value = '';
  bodyInput.value = '';
  bodyInput.style.height = 'auto';
  titleInput.focus();
}

function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  saveEntries();
  renderEntries();
}

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

function renderEntries() {
  const filtered = searchQuery
    ? entries.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  if (filtered.length === 0) {
    const msg = searchQuery
      ? `「${searchQuery}」に一致する日記は見つかりませんでした。`
      : 'まだ日記がありません。最初の一言を書いてみましょう！';
    entriesList.innerHTML = `<p class="empty-message">${escapeHtml(msg)}</p>`;
    return;
  }

  entriesList.innerHTML = filtered.map(entry => {
    const date = formatDate(entry.createdAt);
    const title = entry.title ? escapeHtml(entry.title) : '';
    const preview = escapeHtml(entry.body.slice(0, 80)) + (entry.body.length > 80 ? '…' : '');
    const fullBody = escapeHtml(entry.body);

    return `
      <div class="entry-card" data-id="${entry.id}" role="article">
        <div class="entry-meta">${date}</div>
        ${title ? `<div class="entry-title">${title}</div>` : ''}
        <div class="entry-preview">${preview}</div>
        <div class="entry-body">${fullBody}</div>
        <button class="entry-delete-btn" data-delete-id="${entry.id}" title="削除" aria-label="削除">✕</button>
      </div>
    `;
  }).join('');

  // Attach click handlers
  entriesList.querySelectorAll('.entry-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.entry-delete-btn')) return;
      card.classList.toggle('expanded');
    });
  });

  entriesList.querySelectorAll('.entry-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteModal(Number(btn.dataset.deleteId));
    });
  });
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
