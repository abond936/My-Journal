const fs = require('fs');
const path = require('path');

const REPORT_JSON =
  'C:/Users/alanb/my-journal/.codex-tmp/reports/zmomdadpics-x-files-missing-from-media-2026-05-27.json';
const REPORT_HTML =
  'C:/Users/alanb/my-journal/.codex-tmp/reports/zmomdadpics-x-files-missing-from-media-gallery-2026-05-28.html';
const ROOT_PICTURES = 'C:/Users/alanb/OneDrive/Pictures';

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return 'file:///' + normalized.split('/').map(encodeURIComponent).join('/');
}

const report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));
const files = (report.files || []).map((relPath) => {
  const abs = path.join(ROOT_PICTURES, relPath).replace(/\\/g, '/');
  return {
    relPath,
    label: relPath.replace(/^zMomDadPics\//, ''),
    abs,
    url: fileUrl(abs),
  };
});

const cards = files
  .map((file) => {
    const safeRel = esc(file.relPath);
    const safeLabel = esc(file.label);
    const safeAbs = esc(file.abs);
    const safeUrl = esc(file.url);
    const safeKey = esc(file.relPath.toLowerCase());
    return `
    <article class="card" data-path="${safeKey}" data-rel="${safeRel}">
      <label class="pick">
        <input class="pickbox" type="checkbox" data-rel="${safeRel}">
        <span>Keep</span>
      </label>
      <a class="thumb-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
        <img loading="lazy" src="${safeUrl}" alt="${safeLabel}">
      </a>
      <div class="meta">
        <div class="path">${safeLabel}</div>
        <div class="abs">${safeAbs}</div>
      </div>
    </article>`;
  })
  .join('');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Missing zMomDadPics _X Media</title>
  <style>
    :root {
      --bg: #f4f1ea;
      --panel: #fffaf2;
      --ink: #2d241d;
      --muted: #6f6257;
      --line: #d7ccbf;
      --accent: #8f5a2a;
      --accent-soft: rgba(143, 90, 42, 0.14);
      --thumb: 240px;
      --gap: 18px;
      --shadow: 0 8px 24px rgba(61, 43, 29, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(143,90,42,0.10), transparent 28%),
        linear-gradient(180deg, #f8f4ed 0%, var(--bg) 100%);
    }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(10px);
      background: rgba(248, 244, 237, 0.94);
      border-bottom: 1px solid var(--line);
      padding: 16px 20px;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 28px;
      line-height: 1.1;
    }
    .summary {
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 14px;
    }
    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .controls input[type="search"] {
      width: min(460px, 100%);
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: white;
      font: inherit;
      color: inherit;
    }
    .controls label.toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      font-size: 14px;
    }
    .controls button {
      padding: 9px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: white;
      color: var(--ink);
      font: inherit;
      cursor: pointer;
    }
    .controls button:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .count {
      color: var(--muted);
      font-size: 14px;
    }
    .status {
      margin-top: 10px;
      min-height: 18px;
      color: var(--muted);
      font-size: 13px;
    }
    main {
      padding: 18px 20px 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--thumb), 1fr));
      gap: var(--gap);
      align-items: start;
    }
    .card {
      position: relative;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--shadow);
      transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
    }
    .card.is-picked {
      border-color: var(--accent);
      box-shadow: 0 12px 28px rgba(143, 90, 42, 0.18);
      transform: translateY(-1px);
    }
    .pick {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(255, 250, 242, 0.94);
      border: 1px solid rgba(143, 90, 42, 0.24);
      box-shadow: 0 4px 12px rgba(45, 36, 29, 0.10);
      font-size: 13px;
      cursor: pointer;
      user-select: none;
    }
    .pick input {
      margin: 0;
      inline-size: 16px;
      block-size: 16px;
      accent-color: var(--accent);
    }
    .thumb-link {
      display: block;
      background: #e8dfd2;
    }
    img {
      display: block;
      width: 100%;
      height: auto;
      min-height: 180px;
      max-height: 280px;
      object-fit: contain;
      background: #e8dfd2;
    }
    .meta {
      padding: 10px 12px 12px;
    }
    .path {
      font-size: 13px;
      line-height: 1.35;
      word-break: break-word;
    }
    .abs {
      margin-top: 6px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
      word-break: break-all;
    }
    .hidden {
      display: none;
    }
    .export-panel {
      margin-top: 14px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.58);
    }
    .export-panel textarea {
      width: 100%;
      min-height: 120px;
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: white;
      color: var(--ink);
      font: 12px/1.4 Consolas, 'Courier New', monospace;
      resize: vertical;
    }
    .export-help {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }
    @media (max-width: 680px) {
      header, main { padding-left: 14px; padding-right: 14px; }
      h1 { font-size: 24px; }
      .pick { top: 8px; left: 8px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Missing zMomDadPics _X Media</h1>
    <p class="summary">${esc(report.missingCount)} files missing from the current media database. Thumbnails are 240px wide. Click any image to open the source file. “Keep” selections stay in this browser.</p>
    <div class="controls">
      <input id="filter" type="search" placeholder="Filter by folder or filename">
      <label class="toggle"><input id="selectedOnly" type="checkbox"> Show only Keep</label>
      <button id="copySelected" type="button">Copy selected paths</button>
      <button id="clearSelected" type="button">Clear selected</button>
      <div class="count"><span id="visibleCount">${esc(report.missingCount)}</span> visible</div>
      <div class="count"><span id="selectedCount">0</span> selected</div>
    </div>
    <div id="status" class="status"></div>
    <div class="export-panel">
      <div class="export-help">Selected paths appear here so we can use them later as the restore/import list.</div>
      <textarea id="selectedPaths" readonly spellcheck="false"></textarea>
    </div>
  </header>
  <main>
    <section id="grid" class="grid">${cards}
    </section>
  </main>
  <script>
    const STORAGE_KEY = 'missing-media-keep-selection-v1';
    const filterInput = document.getElementById('filter');
    const selectedOnlyInput = document.getElementById('selectedOnly');
    const visibleCount = document.getElementById('visibleCount');
    const selectedCount = document.getElementById('selectedCount');
    const status = document.getElementById('status');
    const selectedPaths = document.getElementById('selectedPaths');
    const copyButton = document.getElementById('copySelected');
    const clearButton = document.getElementById('clearSelected');
    const cards = Array.from(document.querySelectorAll('.card'));
    let selected = new Set();

    const allPaths = cards.map((card) => card.dataset.rel).filter(Boolean);

    function loadSelection() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set(allPaths);
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((item) => typeof item === 'string'));
      } catch (error) {
        console.warn('Failed to load selection:', error);
        return new Set(allPaths);
      }
    }

    function saveSelection() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selected).sort()));
    }

    function refreshSelectedPanel() {
      const list = Array.from(selected).sort();
      selectedCount.textContent = String(list.length);
      selectedPaths.value = list.join('\\n');
    }

    function applyFilter() {
      const query = filterInput.value.trim().toLowerCase();
      const selectedOnly = selectedOnlyInput.checked;
      let visible = 0;
      for (const card of cards) {
        const rel = card.dataset.rel;
        const matchesQuery = !query || card.dataset.path.includes(query);
        const isSelected = rel && selected.has(rel);
        const matchesSelected = !selectedOnly || isSelected;
        const show = matchesQuery && matchesSelected;
        card.classList.toggle('hidden', !show);
        if (show) visible += 1;
      }
      visibleCount.textContent = String(visible);
    }

    function syncCard(card) {
      const rel = card.dataset.rel;
      const checkbox = card.querySelector('.pickbox');
      const isSelected = Boolean(rel && selected.has(rel));
      checkbox.checked = isSelected;
      card.classList.toggle('is-picked', isSelected);
    }

    function syncAll() {
      cards.forEach(syncCard);
      refreshSelectedPanel();
      applyFilter();
    }

    function setStatus(message) {
      status.textContent = message;
      if (!message) return;
      window.clearTimeout(setStatus.timeoutId);
      setStatus.timeoutId = window.setTimeout(() => {
        status.textContent = '';
      }, 2200);
    }

    selected = loadSelection();
    syncAll();

    cards.forEach((card) => {
      const checkbox = card.querySelector('.pickbox');
      checkbox.addEventListener('change', (event) => {
        event.stopPropagation();
        const rel = card.dataset.rel;
        if (!rel) return;
        if (checkbox.checked) selected.add(rel);
        else selected.delete(rel);
        saveSelection();
        syncAll();
      });
    });

    filterInput.addEventListener('input', applyFilter);
    selectedOnlyInput.addEventListener('change', applyFilter);

    copyButton.addEventListener('click', async () => {
      const text = selectedPaths.value;
      if (!text.trim()) {
        setStatus('No selected paths yet.');
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        setStatus('Selected paths copied.');
      } catch (error) {
        selectedPaths.focus();
        selectedPaths.select();
        setStatus('Selected list highlighted for manual copy.');
      }
    });

    clearButton.addEventListener('click', () => {
      if (!selected.size) {
        setStatus('No selected paths to clear.');
        return;
      }
      selected.clear();
      saveSelection();
      syncAll();
      setStatus('Selections cleared.');
    });
  </script>
</body>
</html>`;

fs.writeFileSync(REPORT_HTML, html, 'utf8');
console.log(JSON.stringify({ htmlPath: REPORT_HTML, count: files.length }, null, 2));
